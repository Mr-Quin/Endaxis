import type { ResolvedTimeline } from "../types/timeline";
import type {
  TeamConfig,
  EnemyConfig,
  ActorSnapshot,
} from "../types/simulation";
import { createEngine } from "./engine/createEngine.ts";
import { formatSimLogEntry } from "./formatSimLogEntry.ts";

export function simulate(
  timeline: ResolvedTimeline,
  teamConfig: TeamConfig,
  enemyConfig: EnemyConfig,
  actors: ActorSnapshot[]
) {
  const engine = createEngine(teamConfig, enemyConfig, actors, timeline);

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
