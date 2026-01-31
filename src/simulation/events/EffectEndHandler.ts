import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { EffectEndEvent } from "@/simulation/events/event.types.ts";
import type { SimulationContext } from "@/simulation/engine/SimulationContext.ts";

export class EffectEndHandler implements EventHandler<EffectEndEvent> {
  handle(event: EffectEndEvent, ctx: SimulationContext) {
    const { effectInstanceId } = event.payload;

    const target = event.target
      ? ctx.state.getEntity(event.target)
      : ctx.state.enemy;
    const removed = target?.effects.remove(effectInstanceId);

    if (!removed) {
      // 状态已经被移除
      return;
    }

    ctx.simLog({
      type: "EFFECT_END",
      time: event.time,
      payload: {
        effectId: removed.effect.id,
        targetId: event.target?.id ?? "",
        type: event.payload.type,
      },
    });
  }
}
