import type {
  ActionNode,
  ResolvedAction,
  ResolvedEffect,
  Anomaly,
  Action,
} from "../types/timeline";

export interface CompileOptions {
  // Optional config if needed for future generic usage
  connections?: Array<{
    id: string;
    fromEffectId?: string;
    toEffectId?: string;
    from?: string; // actionId
    to?: string; // actionId
    isConsumption?: boolean;
    consumptionOffset?: number;
  }>;
}

interface ShiftContext {
  shift: number;
  amount: number;
  physicalStart: number;
  physicalEnd: number;
}

interface TimeExtension {
  time: number; // logical time of the source
  gameTime: number; // game time relative to cumulative
  amount: number;
  sourceId: string;
  logicalTime: number;
  cumulativeFreezeTime: number;
}

interface ResolvedTimeline {
  actions: ResolvedAction[];
  timeExtensions: TimeExtension[];
  meta: {
    totalDuration: number;
    totalDamage: number;
  };
}

function round(num: number, factor: number = 1000): number {
  return Math.round(num * factor) / factor;
}

export function compileTimeline(
  actions: ActionNode[],
  options: CompileOptions = {}
): ResolvedTimeline {
  // 1. Prepare working configuration
  // Deep clone or just map to avoid mutations?
  // We will build ResolvedActions. `actions` input is Readonly ideally.

  // Sort actions by Game Time (logical start time)
  // Input actions.node.startTime IS the logical/game time as per new architecture (Store uses startTime as physical?
  // Wait, in store refreshAllActionShifts:
  // "if (a.logicalStartTime === undefined) action.logicalStartTime = action.startTime"
  // "a.startTime = ... physical ..."
  // So input `ActionNode.node.startTime` should be treated as Logical/Game Time.
  const sortedActions = [...actions].sort(
    (a, b) => a.node.startTime - b.node.startTime
  );

  // 2. Refresh Shifts / Calculate Real Time
  // Logic ported from refreshAllActionShifts & globalExtensions
  // We need to determine "Stop Sources" (Freezes)

  const stopSources = sortedActions.filter((item) => {
    const a = item.node;
    // Check if valid freezer
    // Assuming no "isDisabled" in ActionNode for now, or we check it if it exists
    // The type `Action` doesn't explicitly have `isDisabled` in my definition?
    // Let's assume enabled.
    const hasWindow = (a.triggerWindow || 0) >= 0;
    return (a.type === "link" || a.type === "ultimate") && hasWindow;
  });

  const sourceShiftMap = new Map<string, ShiftContext>();
  let lastPhysicalEnd = 0;

  // We also need a linear list of extensions for `getShiftedEndTime` logic
  const globalExtensions: TimeExtension[] = [];
  let cumulativeFreezeTime = 0;

  stopSources.forEach((sourceItem, index) => {
    const source = sourceItem.node;
    const nextSourceItem = stopSources[index + 1];
    const nextSource = nextSourceItem?.node;

    const logicalStart = source.startTime;
    const physicalStart = round(Math.max(logicalStart, lastPhysicalEnd)); // This might need correction.
    // In store: Math.max(source.logicalStartTime, lastPhysicalEnd)
    // Here source.startTime IS logical.

    let amount = 0;
    if (source.type === "ultimate") {
      amount = source.animationTime || 1.5;
    } else {
      // Link logic
      if (nextSource) {
        const gap = nextSource.startTime - source.startTime;
        amount = Math.min(0.5, Math.max(0.1, round(gap)));
      } else {
        amount = 0.5;
      }
    }

    const shift = round(physicalStart - logicalStart);

    // Record for action shifting
    sourceShiftMap.set(sourceItem.id, {
      shift,
      amount,
      physicalStart,
      physicalEnd: round(physicalStart + amount),
    });

    // Record for global duration shifting
    // The store's "globalExtensions" is computed slightly differently but serves similar purpose.
    // Store globalExtensions uses `logicalTime`.
    globalExtensions.push({
      time: logicalStart,
      gameTime: logicalStart, // Approximate?
      amount,
      sourceId: sourceItem.id,
      logicalTime: logicalStart,
      cumulativeFreezeTime: cumulativeFreezeTime,
    });

    cumulativeFreezeTime = round(cumulativeFreezeTime + amount);
    lastPhysicalEnd = round(physicalStart + amount);
  });

  // Helper to shift a time point (duration extension)
  // Ported from `getShiftedEndTime`
  function getShiftedTime(
    startTime: number,
    duration: number,
    excludeActionId: string | null = null
  ): number {
    let currentTimeLimit = startTime + duration;
    const processedExtensions = new Set<string>();
    let changed = true;

    // In store, `getShiftedEndTime` takes (startTime, duration).
    // It shifts the *endpoint*.
    // The `startTime` passed to it is usually the *Real Start Time* of the action/effect?
    // Store: `const end = getShiftedEndTime(action.node.startTime, ...)` where startTime is PHYSICAL if already shifted?
    // Wait, in store `getShiftedEndTime` iterates `globalExtensions`.
    // `ext.time` in store is PHYSICAL start time?
    // Store: `logicalTime: action.logicalStartTime`, `startTime: action.startTime`.
    // And `refreshAllActionShifts` sets `startTime` to physical.
    // `globalExtensions` uses `action.startTime` (Physical).

    // So `getShiftedEndTime` works in Physical Domain?
    // "ext.time >= startTime && ext.time < currentTimeLimit"
    // If input `startTime` is physical, then yes.

    // In our compiler, we need to be careful.
    // We first convert Action Start Time to Real Time.

    while (changed) {
      changed = false;
      // We need to iterate our calculated extensions.
      // But our `globalExtensions` above were based on Logical Time?
      // We need extensions with Physical Time.

      // Let's re-map extensions to use the calculated physical times.
      // Or just lookup sourceShiftMap.

      for (const sourceItem of stopSources) {
        if (sourceItem.id === excludeActionId) continue;
        if (processedExtensions.has(sourceItem.id)) continue;

        const shiftCtx = sourceShiftMap.get(sourceItem.id);
        if (!shiftCtx) continue;

        // The freeze happens at `shiftCtx.physicalStart`.
        const freezeTime = shiftCtx.physicalStart;
        const freezeAmount = shiftCtx.amount;

        if (freezeTime >= startTime && freezeTime < currentTimeLimit) {
          currentTimeLimit = round(currentTimeLimit + freezeAmount);
          processedExtensions.add(sourceItem.id);
          changed = true;
        }
      }
    }
    return currentTimeLimit;
  }

  // 3. Resolve Actions
  const resolvedActions: ResolvedAction[] = sortedActions.map((item) => {
    const a = item.node;
    const logicalStartTime = a.startTime;

    let realStartTime = logicalStartTime;
    // Apply shift
    // Find active source (latest source where source.logical <= a.logical)
    // Store: `activeSource = [...stopSources].reverse().find(...)`.

    // Filter out self if self is a source?
    // Store logic: `if (a.instanceId === activeSource.instanceId) ... else ...`

    const activeSourceItem = [...stopSources]
      .reverse()
      .find((s) => s.node.startTime <= logicalStartTime);

    if (activeSourceItem) {
      const ctx = sourceShiftMap.get(activeSourceItem.id)!;
      if (item.id === activeSourceItem.id) {
        // Self is the freezer
        realStartTime = round(ctx.physicalStart);
      } else {
        // Shifted by predecessor
        const normalShifted = logicalStartTime + ctx.shift;
        // Ensure we don't start before the freezer ends?
        // "Math.max(normalShiftedTime, ctx.physicalEnd)"
        realStartTime = round(Math.max(normalShifted, ctx.physicalEnd));
      }
    } else {
      // No prior freeze
      realStartTime = logicalStartTime;
    }

    // Now calculate Real Duration
    // Store: `end = getShiftedEndTime(realStartTime, duration, id)`
    const realEndTime = getShiftedTime(realStartTime, a.duration, item.id);
    const realDuration = round(realEndTime - realStartTime);

    // 4. Resolve Effects (Physical Anomaly)
    const resolvedEffects: ResolvedEffect[] = [];

    if (a.physicalAnomaly && a.physicalAnomaly.length > 0) {
      // Handle nested array
      const rows = a.physicalAnomaly; // Anomaly[][]

      let globalFlatIndex = 0;
      rows.forEach((row, rowIndex) => {
        row.forEach((effect, colIndex) => {
          const uniqueId = effect._id; // Ensure ID exists? Assume yes from RawAction
          const flatIndex = globalFlatIndex++;

          const originalOffset = Number(effect.offset) || 0;

          // Effect Start Time (Physical)
          // Offset is relative to action start (Logical? Or Physical?).
          // Store: `shiftedStartTimestamp = getShiftedEndTime(action.node.startTime, originalOffset, action.id)`
          // Note: The store's `startTime` is PHYSICAL.
          // So it applies shifts to (PhysicalStart + Offset)?
          // Actually `getShiftedEndTime` takes a start time and adds duration (offset).
          // It expands if it crosses a freeze.
          // So: EffectRealStart = getShiftedTime(ActionRealStart, Offset, ActionID)

          const effectRealStartTime = getShiftedTime(
            realStartTime,
            originalOffset,
            item.id
          );

          // Effect Duration
          // "finalDuration = getShiftedEndTime(shiftedStartTimestamp, effect.duration, action.id) - shiftedStartTimestamp"
          // Initially expanded by freeezes
          let effectRealEndTime = getShiftedTime(
            effectRealStartTime,
            effect.duration,
            item.id
          );
          let displayDuration = round(effectRealEndTime - effectRealStartTime);

          let isConsumed = false;

          // Consumption Logic
          if (options.connections) {
            // Find consumption connection targeting this effect
            // Store looks up via effectId OR `${actionId}_${flatIndex}`

            const conn = options.connections.find(
              (c) =>
                c.isConsumption &&
                (c.fromEffectId === uniqueId ||
                  (c.from === item.id && false)) /* TODO handles index-based? */ // Store fallback?
              // Store: `consumptionMap.get(effectId) || consumptionMap.get("${action.id}_${myEffectIndex}")`
              // We should ideally rely on IDs.
            );
            // Wait, checking the store logic again:
            // `conn.isConsumption` check.

            if (conn && conn.to) {
              // Find target action (consumer)
              const consumer = sortedActions.find((sa) => sa.id === conn.to);
              // We need consumer's REAL start time.
              // We might not have calculated it yet if consumer is later in the list?
              // But we are in a map loop. We calculated `realStartTime` for `item` (Producer).
              // We need `consumer.realStartTime`.
              // Since we depend on *all* actions to calculate shifts, we can pre-calculate all action realStartTimes first?
              // Or just re-calculate/lookup.

              // Better approach: Two passes.
              // Pass 1: Calculate RealStartTime for all actions.
              // Pass 2: Resolve Effects.
            }
          }

          // We will split the loop.
          resolvedEffects.push({
            id: uniqueId,
            uniqueId: `${uniqueId}_${flatIndex}`, // Just to start
            realStartTime: effectRealStartTime,
            displayDuration: displayDuration, // Temporary, will update in Pass 2
            isConsumed,
            rowIndex,
            colIndex,
          });
        });
      });
    }

    return {
      id: item.id,
      trackIndex: item.trackIndex,
      gameStartTime: logicalStartTime,
      realStartTime,
      realDuration,
      isInterrupted: false, // Placeholder
      effects: resolvedEffects,
      triggerWindow: {
        hasWindow: (a.triggerWindow || 0) >= 0,
        startTime: 0, // TODO: calculate window absolute time?
        duration: Math.abs(a.triggerWindow || 0),
      },
    };
  });

  // Pass 2: Resolve Consumption (requires all RealStartTimes known)
  // We can just iterate resolvedActions and update effects.

  if (options.connections) {
    resolvedActions.forEach((producer) => {
      producer.effects.forEach((effect) => {
        // Find connection
        const conn = options.connections!.find(
          (c) => c.isConsumption && c.fromEffectId === effect.id
        );
        if (conn && conn.to) {
          const consumer = resolvedActions.find((a) => a.id === conn.to);
          if (consumer) {
            const consumptionOffset = conn.consumptionOffset || 0;
            const consumptionTime = consumer.realStartTime - consumptionOffset; // Is offset in real time? Store logic: `startTime - offset`.

            // Store: `targetAction.startTime - (conn.consumptionOffset || 0)`
            // Store startTime is Real.

            const cutDuration = consumptionTime - effect.realStartTime;
            // Store: `snappedCutDuration`.
            const snappedCut = round(cutDuration);

            if (snappedCut >= 0) {
              effect.displayDuration = Math.min(
                effect.displayDuration,
                snappedCut
              );
              effect.isConsumed = true;
            }
          }
        }
      });
    });
  }

  // Calculate Meta
  const totalDuration = resolvedActions.reduce(
    (max, a) => Math.max(max, round(a.realStartTime + a.realDuration)),
    0
  );

  return {
    actions: resolvedActions,
    timeExtensions: globalExtensions,
    meta: {
      totalDuration,
      totalDamage: 0,
    },
  };
}
