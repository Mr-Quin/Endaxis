import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { EffectStartEvent } from "@/simulation/events/event.types.ts";
import type { SimulationContext } from "@/simulation/engine/SimulationContext.ts";
import { Effect } from "@/simulation/effects/Effect";
import { ReactionRegistry } from "@/simulation/effects/reactions";

export class EffectStartHandler implements EventHandler<EffectStartEvent> {
  handle(event: EffectStartEvent, ctx: SimulationContext) {
    const { effect } = event.payload;
    const fallbackTarget =
      event.payload.targetId === "boss"
        ? { id: "boss", type: "ENEMY" }
        : { id: event.payload.targetId, type: "PLAYER" };

    const target =
      event.payload.targetId === "boss"
        ? ctx.state.enemy
        : ctx.state.getActor(event.payload.targetId);

    const incoming = new Effect(effect);

    // 检查是否触发反应
    const reaction = ReactionRegistry.check(target.effects, incoming);

    if (reaction) {
      ctx.simLog({
        type: "REACTION_OCCURRED",
        time: event.time,
        payload: {
          reactionName: reaction.name,
          actorId: event.payload.actorId,
        },
      });

      reaction.removeIds.forEach((id) => {
        ctx.queue.enqueue({
          type: "EFFECT_END",
          time: ctx.state.getCurrentTime(),
          source: event.source,
          target: event.target ?? fallbackTarget,
          rootSource: event.rootSource,
          payload: {
            effectInstanceId: id,
            type: "consumption",
          },
        });
      });

      reaction.spawnEffects.forEach((newEff) => {
        ctx.queue.enqueue({
          type: "EFFECT_START",
          time: ctx.state.getCurrentTime(),
          source: event.source,
          target: event.target ?? fallbackTarget,
          rootSource: event.rootSource,
          payload: {
            effect: newEff,
            targetId: event.payload.targetId,
            actorId: event.payload.actorId,
          },
        });
      });

      if (reaction.cancelIncoming) {
        return;
      }
    }

    const appliedInstance = target.effects.add(new Effect(effect));

    ctx.simLog({
      type: "EFFECT_START",
      time: event.time,
      payload: {
        effectSnapshot: appliedInstance.effect.snapshot(),
        targetId: event.payload.targetId,
      },
    });

    ctx.queue.enqueue({
      type: "EFFECT_END",
      time: effect.startTime + effect.duration,
      source: event.source,
      target: event.target ?? fallbackTarget,
      rootSource: event.rootSource,
      payload: {
        effectInstanceId: appliedInstance.id,
        type: "expiration",
      },
    });
  }
}
