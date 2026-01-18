import type { ResolvedTimeline } from "../types/timeline";
import type {
  TeamStateConfig,
  EnemyStateConfig,
  SimLogEntry,
} from "../types/simulation";
import { PriorityQueue } from "@/simulation/engine/PriorityQueue.ts";
import { StaggerPipeline } from "@/simulation/pipeline/pipeline.ts";
import { createEngine } from "./engine/createEngine.ts";

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

  const simLog = new PriorityQueue<SimLogEntry>();

  engine.subscribe((event, ctx) => {
    switch (event.type) {
      case "ACTION_START":
        break;
      case "ACTION_END":
        break;
      case "STAGGER_CHANGE": {
        const enemyConfig = ctx.state.enemy.config;
        const nodeStep =
          enemyConfig.maxStagger / (enemyConfig.staggerNodeCount + 1);
        const prevNode = Math.floor(
          ctx.beforeSnapshot.enemy.stagger / nodeStep
        );
        const currNode = Math.floor(ctx.afterSnapshot.enemy.stagger / nodeStep);
        const nodeReachedIndex = currNode > prevNode ? currNode : undefined;
        const { snapshot } = event.payload;

        // Recalculate amount using pipeline to get the actual applied value
        // explicitly for logging purposes.
        const pipeline = new StaggerPipeline();
        const amount = pipeline.calculate(snapshot, ctx.state);

        simLog.enqueue({
          type: "STAGGER",
          time: event.time,
          beforeSnapshot: ctx.beforeSnapshot,
          afterSnapshot: ctx.afterSnapshot,
          payload: {
            actorId: snapshot.targetId,
            actionId: "", // snapshot doesn't have actionId currently, let's allow empty or add it to snapshot
            amount, // We need final.
            stagger: ctx.state.enemy.getStagger(),
            isBroken:
              !ctx.beforeSnapshot.enemy.isBroken &&
              ctx.afterSnapshot.enemy.isBroken,
            nodeReachedIndex,
          },
        });
        break;
      }
      case "SP_CHANGE":
        simLog.enqueue({
          type: "SP_CHANGE",
          time: event.time,
          beforeSnapshot: ctx.beforeSnapshot,
          afterSnapshot: ctx.afterSnapshot,
          payload: {
            sp: ctx.state.team.sp,
            change: event.payload.spChange,
            sourceId: event.payload.sourceId,
            reason: event.payload.reason,
          },
        });
        break;
      case "SP_REGEN_PAUSE":
        simLog.enqueue({
          type: "SP_REGEN_PAUSE",
          time: event.time,
          beforeSnapshot: ctx.beforeSnapshot,
          afterSnapshot: ctx.afterSnapshot,
          payload: {
            sourceId: event.payload.sourceId,
            duration: event.payload.duration,
          },
        });
        break;
      default:
        break;
    }
  });

  const state = engine.run();

  return {
    state,
    simLog,
  };
}
