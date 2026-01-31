import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { DamageTickEvent } from "@/simulation/events/event.types.ts";
import type { SimulationContext } from "@/simulation/engine/SimulationContext.ts";

export class DamageHandler implements EventHandler<DamageTickEvent> {
  handle(e: DamageTickEvent, ctx: SimulationContext) {
    // TODO: 伤害计算
    ctx.simLog({
      type: "DAMAGE_TICK",
      time: e.time,
      payload: {
        targetId: e.payload.targetId,
        actorId: e.payload.actorId,
        damage: e.payload.damage,
        stagger: e.payload.stagger,
        actionId: e.payload.actionId,
      },
    });

    if (e.payload.stagger > 0) {
      ctx.queue.enqueue({
        type: "STAGGER_CHANGE",
        time: ctx.state.getCurrentTime(),
        payload: {
          stagger: e.payload.stagger,
          actorId: e.payload.actorId,
          actionId: e.payload.actionId,
          targetId: e.payload.targetId,
        },
      });
    }

    if (e.payload.sp && e.payload.sp > 0) {
      // 击中SP恢复
      ctx.queue.enqueue({
        type: "SP_CHANGE",
        time: ctx.state.getCurrentTime(),
        payload: {
          actorId: e.payload.actorId,
          spChange: e.payload.sp,
          reason: "damage",
          sourceId: e.payload.actionId,
          parent: e,
        },
      });
    }
  }
}
