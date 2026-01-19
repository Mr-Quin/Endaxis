import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { EffectStartEvent } from "@/simulation/events/event.types.ts";
import type { SimulationContext } from "@/simulation/engine/SimulationContext.ts";

export class EffectStartHandler implements EventHandler<EffectStartEvent> {
  handle(event: EffectStartEvent, ctx: SimulationContext) {
    const { effectId, type } = event.payload;
    // TODO: handle buff/debuff/status
    ctx.state.enemy.addEffect(effectId, type);
    ctx.simLog({
      type: "EFFECT_START",
      time: event.time,
      payload: {
        effectId: event.payload.effectId,
        targetId: event.payload.targetId,
        type: event.payload.type,
      },
    });
  }
}
