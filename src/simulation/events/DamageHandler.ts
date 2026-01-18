import { type StaggerSnapshot } from "@/simulation/pipeline/pipeline.ts";
import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { DamageTickEvent, SimulationContext } from "@/types/simulation.ts";

export class DamageHandler implements EventHandler<DamageTickEvent> {
  handle(e: DamageTickEvent, ctx: SimulationContext) {
    const baseStagger = e.payload.tickData ? e.payload.tickData.stagger : 0;

    const action = ctx.getAction(e.payload.actionId);
    // const source = ctx.state.getActor(e.payload.sourceId);

    // TODO: 伤害计算
    // const dmgResult = damagePipeline.calculate(snapshot, ctx.state);

    if (e.payload.tickData) {
      ctx.simLog({
        type: "DAMAGE_TICK",
        time: e.time,
        payload: {
          targetId: e.payload.targetId,
          sourceId: e.payload.sourceId,
          damage: e.payload.damage,
          stagger: baseStagger,
          tickData: e.payload.tickData,
          actionId: e.payload.actionId,
        },
      });
    }

    // Prepare Stagger Snapshot
    // Minimal data needed for StaggerPipeline
    const staggerSnapshot: StaggerSnapshot = {
      baseStagger: baseStagger,
      finalStagger: baseStagger, // Initial value
      sourceId: e.payload.sourceId || "",
      targetId: e.payload.targetId,
      boundEffects: e.payload.tickData?.boundEffects,
    };

    if (staggerSnapshot.baseStagger > 0) {
      ctx.queue.enqueue({
        type: "STAGGER_CHANGE",
        time: ctx.state.getCurrentTime(),
        payload: {
          snapshot: staggerSnapshot,
        },
      });
    }

    if (e.payload.tickData?.sp > 0) {
      // 击中SP恢复
      ctx.queue.enqueue({
        type: "SP_CHANGE",
        time: ctx.state.getCurrentTime(),
        payload: {
          actorId: e.payload.sourceId,
          spChange: e.payload.tickData.sp,
          reason: "damage",
          sourceId: e.payload.actionId,
          parent: e,
        },
      });
    }
  }
}
