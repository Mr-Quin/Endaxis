import type { ResolvedTimeline } from "../types/timeline";
import type {
  TeamStateConfig,
  EnemyStateConfig,
  SimLogEntry,
} from "../types/simulation";
import { SimulationEngine } from "./engine";
import {
  DamageHandler,
  ActionStartHandler,
  handleTimeAdvance,
  ActionEndHandler,
  SpChangeHandler,
} from "./handlers";
import { GameState } from "./state";

const DEFAULT_TEAM_CONFIG: TeamStateConfig = {
  maxSp: 200,
  initialSp: 200,
  spRegenRate: 1.0,
  skillSpCostDefault: 0,
  linkCdReduction: 0,
};

const DEFAULT_ENEMY_CONFIG: EnemyStateConfig = {
  maxStagger: 100,
  staggerNodeCount: 0,
  staggerNodeDuration: 2,
  staggerBreakDuration: 10,
  executionRecovery: 25,
};

export function simulate(
  timeline: ResolvedTimeline,
  systemConstants: any = {}
) {
  // 1. Initialize State
  const teamConfig: TeamStateConfig = {
    maxSp: Number(systemConstants.maxSp) || DEFAULT_TEAM_CONFIG.maxSp,
    initialSp:
      Number(systemConstants.initialSp) || DEFAULT_TEAM_CONFIG.initialSp,
    spRegenRate:
      Number(systemConstants.spRegenRate) || DEFAULT_TEAM_CONFIG.spRegenRate,
    skillSpCostDefault: 0,
    linkCdReduction: 0,
  };

  const enemyConfig: EnemyStateConfig = {
    maxStagger:
      Number(systemConstants.maxStagger) || DEFAULT_ENEMY_CONFIG.maxStagger,
    staggerNodeCount: Number(systemConstants.staggerNodeCount) || 0,
    staggerNodeDuration: Number(systemConstants.staggerNodeDuration) || 2,
    staggerBreakDuration: Number(systemConstants.staggerBreakDuration) || 10,
    executionRecovery: Number(systemConstants.executionRecovery) || 25,
  };

  const gameState = new GameState(teamConfig, enemyConfig);
  const engine = new SimulationEngine(gameState);

  // 2. Register Handlers
  engine.registerHandler("DAMAGE_TICK", new DamageHandler());
  engine.registerHandler("ACTION_START", new ActionStartHandler());
  engine.registerHandler("ACTION_END", new ActionEndHandler());
  engine.registerHandler("SP_CHANGE", new SpChangeHandler());

  // enqueue base events
  timeline.actions.forEach((action) => {
    engine.enqueue({
      type: "ACTION_START",
      time: action.realStartTime,
      payload: {
        skillId: action.node.id || "",
        actionId: action.id,
        spCost: action.node.spCost,
        actorId: action.trackId,
        type: action.node.type,
        freezeDuration: action.freezeDuration,
      },
    });

    engine.enqueue({
      type: "ACTION_END",
      time: action.realStartTime + action.realDuration,
      payload: {
        skillId: action.node.id || "",
        actionId: action.id,
        spGain: action.node.spGain,
        actorId: action.trackId,
        type: action.node.type,
      },
    });

    action.resolvedDamageTicks.forEach((tick) => {
      engine.enqueue({
        type: "DAMAGE_TICK",
        time: tick.realTime,
        payload: {
          sourceId: action.trackId,
          targetId: "boss",
          damage: 0,
          stagger: tick.stagger,
          tickData: tick,
        },
      });
    });
  });

  // 4. Run & Capture Data Points
  const spData: { time: number; value: number }[] = [];
  const staggerData: { time: number; value: number }[] = [];

  // Capture loop
  // Note: SimulationEngine loop doesn't have a "post-tick" hook other than subscribe.
  // We want to capture state at every event processing.

  // Initial Point
  spData.push({ time: 0, value: gameState.team.sp });
  staggerData.push({ time: 0, value: 0 });
  const simLog: SimLogEntry[] = [];

  engine.subscribe((event, ctx) => {
    switch (event.type) {
      case "ACTION_START":
        simLog.push({
          type: "SP_ANCHOR",
          time: event.time,
          payload: {
            sp: ctx.state.team.sp,
            regenRate: ctx.state.team.config.spRegenRate,
          },
        });
        break;
      case "ACTION_END":
        break;
      case "DAMAGE_TICK":
        break;
      case "SP_CHANGE":
        simLog.push({
          type: "SP_CHANGE",
          time: event.time,
          payload: {
            sp: ctx.state.team.sp,
            change: event.payload.spChange,
            sourceId: event.payload.sourceId,
            reason: event.payload.reason,
          },
        });
        simLog.push({
          type: "SP_ANCHOR",
          time: event.time,
          payload: {
            sp: ctx.state.team.sp,
            regenRate: ctx.state.team.config.spRegenRate,
          },
        });
        break;
      default:
        break;
    }
    const s = ctx.state as GameState;
    if (s.team.sp !== spData.at(-1)?.value) {
      spData.push({ time: s.getCurrentTime(), value: s.team.sp });
    }
    staggerData.push({ time: s.getCurrentTime(), value: s.enemy.getStagger() });
  });

  const finalState = engine.run(); // finalState is GameState

  // Final Point
  spData.push({
    time: finalState.getCurrentTime(),
    value: finalState.team.sp,
  });

  return {
    state: finalState,
    simLog,
    series: {
      sp: spData,
      stagger: staggerData,
    },
  };
}
