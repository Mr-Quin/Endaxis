import type { TeamConfig, EnemyConfig, ActorSnapshot } from "./state/types.ts";
import { createEngine } from "./engine/createEngine.ts";
import type { ResolvedTimeline } from "./compiler/types.ts";
import { SCNEARIO_EFFECT_TYPE_MAP } from "./effects/scenarioAdapter.ts";
import { AfflictionEffectMap } from "./effects/afflictionEffectMap.ts";
import { formatSimLogEntry } from "./formatSimLogEntry.ts";

export function simulate(
  timeline: ResolvedTimeline,
  teamConfig: TeamConfig,
  enemyConfig: EnemyConfig,
  actors: ActorSnapshot[],
) {
  const engine = createEngine(teamConfig, enemyConfig, actors, timeline);

  timeline.actions.forEach((action) => {
    engine.enqueue({
      type: "ACTION_START",
      time: action.realStartTime,
      source: { id: action.trackId, type: "PLAYER" },
      target: { id: action.trackId, type: "PLAYER" },
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
      source: { id: action.trackId, type: "PLAYER" },
      target: { id: action.trackId, type: "PLAYER" },
      payload: {
        skillId: action.node.id || "",
        actionId: action.id,
        spGain: action.node.spGain,
        actorId: action.trackId,
        type: action.node.type,
      },
    });

    action.effects.forEach((resolvedEffect) => {
      const tag =
        SCNEARIO_EFFECT_TYPE_MAP[
          resolvedEffect.node.type as keyof typeof SCNEARIO_EFFECT_TYPE_MAP
        ];

      if (!tag) {
        return;
      }

      const effect = AfflictionEffectMap[tag];
      effect.startTime = resolvedEffect.realStartTime;

      engine.enqueue({
        type: "EFFECT_START",
        time: effect.startTime,
        source: { id: action.trackId, type: "PLAYER" },
        target: { id: "boss", type: "ENEMY" },
        payload: {
          actorId: action.trackId,
          actionId: action.id,
          targetId: "boss",
          effect: effect.clone(),
        },
      });
    });
  });

  const state = engine.run();

  const simLog = engine.getSimLog();

  simLog.forEach((log) => {
    console.log(formatSimLogEntry(log));
  });

  return {
    state,
    simLog,
  };
}
