import type {
  ActionNode,
  ResolvedTimeline,
  ResolvedAction,
  ResolvedEffect,
  ResolvedDamageTick,
  TimeExtension,
} from "../types/timeline";
import { TimeContext } from "./time-context";

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
 * Resolves a single action's logical/real time and its effects.
 */
function resolveAction(
  item: ActionNode,
  stopSources: ActionNode[],
  sourceShiftMap: Map<string, ShiftContext>,
  timeCtx: TimeContext
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
  const realEndTime = timeCtx.getShiftedEndTime(
    realStartTime,
    a.duration,
    item.id
  );
  const realDuration = round(realEndTime - realStartTime);
  const actionExtension = round(realDuration - a.duration);

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
        const effectRealStartTime = timeCtx.getShiftedEndTime(
          realStartTime,
          originalOffset,
          item.id
        );

        // Effect Duration
        const effectRealEndTime = timeCtx.getShiftedEndTime(
          effectRealStartTime,
          effect.duration,
          item.id
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
          extensionAmount: round(
            round(effectRealEndTime - effectRealStartTime) - effect.duration
          ),

          // Inheritance
          rowIndex,
          colIndex,
          flatIndex,
          node: effect,
        });
      });
    });
  }

  const resolvedDamageTicks: ResolvedDamageTick[] = a.damageTicks.map(
    (tick) => {
      const realTime = timeCtx.getShiftedEndTime(
        realStartTime,
        tick.offset || 0,
        item.id
      );

      return {
        ...tick,
        realTime,
        realOffset: realTime - realStartTime,
      };
    }
  );

  return {
    ...item,
    gameStartTime: gameStartTime,
    realStartTime,
    realDuration,
    isInterrupted: false,
    effects: resolvedEffects,
    resolvedDamageTicks,
    triggerWindow: {
      hasWindow: (a.triggerWindow || 0) >= 0,
      startTime: 0,
      duration: Math.abs(a.triggerWindow || 0),
    },
    extensionAmount: actionExtension,
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

function resolveActions(
  actions: ActionNode[],
  stopSources: ActionNode[],
  sourceShiftMap: Map<string, ShiftContext>,
  timeCtx: TimeContext
) {
  const resolvedActions: ResolvedAction[] = [];
  const actionMap = new Map<string, ResolvedAction>();
  const effectMap = new Map<string, ResolvedEffect>();
  for (const item of actions) {
    const resolvedAction = resolveAction(
      item,
      stopSources,
      sourceShiftMap,
      timeCtx
    );
    resolvedActions.push(resolvedAction);
    actionMap.set(resolvedAction.id, resolvedAction);
    resolvedAction.effects.forEach((effect) => {
      effectMap.set(effect.id, effect);
    });
  }

  return { resolvedActions, actionMap, effectMap };
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

  const timeCtx = new TimeContext(timeExtensions);

  // 3. Resolve Actions
  const { resolvedActions, actionMap, effectMap } = resolveActions(
    sortedActions,
    stopSources,
    sourceShiftMap,
    timeCtx
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
    actionMap,
    effectMap,
    timeExtensions,
    timeContext: timeCtx,
    meta: {
      totalDuration,
      totalDamage: 0,
    },
  };
}
