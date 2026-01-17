import type {
  ActionNode,
  ResolvedTimeline,
  ResolvedAction,
  ResolvedEffect,
  TimeExtension,
} from "../types/timeline";

export interface CompileOptions {
  connections?: Array<{
    id: string;
    fromEffectId?: string;
    toEffectId?: string;
    from?: string;
    to?: string;
    isConsumption?: boolean;
    consumptionOffset?: number;
  }>;
}

interface ShiftContext {
  shift: number;
  amount: number;
  realStart: number;
  realEnd: number;
}

function round(num: number, factor: number = 1000): number {
  return Math.round(num * factor) / factor;
}

/**
 * Calculates time shifts caused by "stop sources" (Ultimates/Links).
 * Returns the map of shifts and the linear list of time extensions.
 */
function calculateTimeShifts(startSortedActions: ActionNode[]) {
  const stopSources = startSortedActions.filter((item) => {
    const a = item.node;
    const hasWindow = (a.triggerWindow || 0) >= 0;
    return (
      (a.type === "link" || a.type === "ultimate") && hasWindow && !a.isDisabled
    );
  });

  const sourceShiftMap = new Map<string, ShiftContext>();
  const timeExtensions: TimeExtension[] = [];

  let lastRealEnd = 0;
  let cumulativeFreezeTime = 0;

  stopSources.forEach((sourceItem, index) => {
    const source = sourceItem.node;
    const nextSourceItem = stopSources[index + 1];
    const nextSource = nextSourceItem?.node;

    const gameStart = source.startTime;
    const realStart = round(Math.max(gameStart, lastRealEnd));

    let amount = 0;
    if (source.type === "ultimate") {
      amount = source.animationTime || 1.5;
    } else {
      if (nextSource) {
        const gap = nextSource.startTime - source.startTime;
        amount = Math.min(0.5, Math.max(0.1, round(gap)));
      } else {
        amount = 0.5;
      }
    }

    const shift = round(realStart - gameStart);

    sourceShiftMap.set(sourceItem.id, {
      shift,
      amount,
      realStart,
      realEnd: round(realStart + amount),
    });

    timeExtensions.push({
      time: realStart,
      gameTime: gameStart,
      amount,
      sourceId: sourceItem.id,
      logicalTime: gameStart,
      cumulativeFreezeTime: cumulativeFreezeTime,
    });

    cumulativeFreezeTime = round(cumulativeFreezeTime + amount);
    lastRealEnd = round(realStart + amount);
  });

  return { stopSources, sourceShiftMap, timeExtensions };
}

/**
 * Core function to calculate the shifted end time given a starting physical time.
 * Logic extends duration if it overlaps with any freeze windows.
 */
function getShiftedTime(
  startTime: number,
  duration: number,
  excludeActionId: string | null,
  timeExtensions: TimeExtension[]
): number {
  let currentTimeLimit = startTime + duration;
  const processedExtensions = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;
    for (const ext of timeExtensions) {
      if (ext.sourceId === excludeActionId) continue;
      if (processedExtensions.has(ext.sourceId)) continue;

      if (ext.time >= startTime && ext.time < currentTimeLimit) {
        currentTimeLimit = round(currentTimeLimit + ext.amount);
        processedExtensions.add(ext.sourceId);
        changed = true;
      }
    }
  }
  return currentTimeLimit;
}

/**
 * Resolves a single action's logical/real time and its effects.
 */
function resolveAction(
  item: ActionNode,
  stopSources: ActionNode[],
  sourceShiftMap: Map<string, ShiftContext>,
  timeExtensions: TimeExtension[]
): ResolvedAction {
  const a = item.node;
  const gameStartTime = a.startTime;

  let realStartTime = gameStartTime;

  // Apply Freeze Offset
  const activeSourceItem = [...stopSources]
    .reverse()
    .find((s) => s.node.startTime <= gameStartTime);

  if (activeSourceItem) {
    const ctx = sourceShiftMap.get(activeSourceItem.id)!;
    if (item.id === activeSourceItem.id) {
      realStartTime = round(ctx.realStart);
    } else {
      const normalShifted = gameStartTime + ctx.shift;
      realStartTime = round(Math.max(normalShifted, ctx.realEnd));
    }
  } else {
    realStartTime = gameStartTime;
  }

  // Calculate Real Duration
  const realEndTime = getShiftedTime(
    realStartTime,
    a.duration,
    item.id,
    timeExtensions
  );
  const realDuration = round(realEndTime - realStartTime);

  // Resolve Effects
  const resolvedEffects: ResolvedEffect[] = [];
  if (a.physicalAnomaly && a.physicalAnomaly.length > 0) {
    let globalFlatIndex = 0;
    a.physicalAnomaly.forEach((row, rowIndex) => {
      row.forEach((effect, colIndex) => {
        const uniqueId = effect._id;
        const flatIndex = globalFlatIndex++;
        const originalOffset = Number(effect.offset) || 0;

        // Effect Start
        const effectRealStartTime = getShiftedTime(
          realStartTime,
          originalOffset,
          item.id,
          timeExtensions
        );

        // Effect Duration
        const effectRealEndTime = getShiftedTime(
          effectRealStartTime,
          effect.duration,
          item.id,
          timeExtensions
        );

        resolvedEffects.push({
          type: "effect",
          id: uniqueId,
          actionId: item.id,
          uniqueId: `${uniqueId}_${flatIndex}`,

          // Layout Data
          realStartTime: effectRealStartTime,
          displayDuration: round(effectRealEndTime - effectRealStartTime),
          isConsumed: false,

          // Inheritance
          rowIndex,
          colIndex,
          flatIndex,
          node: effect,
        });
      });
    });
  }

  // Return extended object
  return {
    ...item, // Spread ActionNode properties (id, trackIndex, etc.)
    gameStartTime: gameStartTime,
    realStartTime,
    realDuration,
    isInterrupted: false,
    effects: resolvedEffects,
    triggerWindow: {
      hasWindow: (a.triggerWindow || 0) >= 0,
      startTime: 0, // Placeholder
      duration: Math.abs(a.triggerWindow || 0),
    },
  };
}

/**
 * Resolves consumption logic (effects consumed by other actions).
 * Mutates resolvedActions in place (updates isConsumed and displayDuration).
 */
function resolveConsumption(
  resolvedActions: ResolvedAction[],
  connections: CompileOptions["connections"]
) {
  if (!connections) return;

  resolvedActions.forEach((producer) => {
    producer.effects.forEach((effect) => {
      const conn = connections.find(
        (c) => c.isConsumption && c.fromEffectId === effect.id
      );
      if (conn && conn.to) {
        const consumer = resolvedActions.find((a) => a.id === conn.to);
        if (consumer) {
          const consumptionOffset = conn.consumptionOffset || 0;
          const consumptionTime = consumer.realStartTime - consumptionOffset;
          const cutDuration = consumptionTime - effect.realStartTime;
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

export function compileTimeline(
  actions: ActionNode[],
  options: CompileOptions = {}
): ResolvedTimeline {
  // 1. Sort actions by Logical Time
  const sortedActions = [...actions].sort(
    (a, b) => a.node.startTime - b.node.startTime
  );

  // 2. Calculate Shifts
  const { stopSources, sourceShiftMap, timeExtensions } =
    calculateTimeShifts(sortedActions);

  // 3. Resolve Actions
  const resolvedActions: ResolvedAction[] = sortedActions.map((item) =>
    resolveAction(item, stopSources, sourceShiftMap, timeExtensions)
  );

  // 4. Resolve Consumption
  resolveConsumption(resolvedActions, options.connections);

  // 5. Calculate Meta
  const totalDuration = resolvedActions.reduce(
    (max, a) => Math.max(max, round(a.realStartTime + a.realDuration)),
    0
  );

  return {
    actions: resolvedActions,
    timeExtensions,
    meta: {
      totalDuration,
      totalDamage: 0,
    },
  };
}
