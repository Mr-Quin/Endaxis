import type { ResolvedTimeline } from "../types/timeline";
import type { TeamStateConfig, EnemyStateConfig } from "../types/simulation";
import { createEngine } from "./engine/createEngine.ts";
import { formatSimLogEntry } from "./formatSimLogEntry.ts";

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

  const engine = createEngine(teamConfig, enemyConfig, timeline);
  const gameState = engine.getState();

  if (Array.isArray(systemConstants.tracks)) {
    systemConstants.tracks.forEach((track: any) => {
      if (!track.id) return;
      const originiumArtsPower = Number(track.originiumArtsPower) || 0;
      gameState.setActor({
        id: track.id,
        stats: {
          atk: 0,
          def: 0,
          hpMax: 0,
          spMax: 0,
          spRegen: 0,
          critRate: 0,
          critDmg: 0,
          originiumArtsPower,
        },
        resources: { hp: 0, gauge: 0 },
        cooldowns: new Map(),
        activeBuffs: [],
        isCasting: false,
        castEndTime: 0,
      });
    });
  }

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
          actionId: action.id,
        },
      });
    });

    action.effects.forEach((effect) => {
      engine.enqueue({
        type: "EFFECT_START",
        time: effect.realStartTime,
        payload: {
          effectId: effect.uniqueId,
          targetId: "boss",
          type: effect.node.type,
        },
      });
      engine.enqueue({
        type: "EFFECT_END",
        time: effect.realStartTime + effect.realDuration,
        payload: {
          effectId: effect.uniqueId,
          targetId: "boss",
        },
      });
    });
  });

  const state = engine.run();

  const simLog = engine.getSimLog();

  simLog.forEach((entry) => {
    console.log(formatSimLogEntry(entry));
  });

  return {
    state,
    simLog,
  };
}
