import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { EffectEndEvent } from "@/simulation/events/event.types.ts";
import type { SimulationContext } from "@/simulation/engine/SimulationContext.ts";

export class EffectEndHandler implements EventHandler<EffectEndEvent> {
  handle(event: EffectEndEvent, ctx: SimulationContext) {
    const { effectId } = event.payload;

    ctx.state.enemy.removeEffect(effectId);

    ctx.simLog({
      type: "EFFECT_END",
      time: event.time,
      payload: {
        effectId: event.payload.effectId,
        targetId: event.payload.targetId,
        type: event.payload.type,
      },
    });
  }
}
