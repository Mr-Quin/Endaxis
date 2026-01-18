import {
  DamagePipeline,
  type DamageSnapshot,
  type StaggerSnapshot,
} from "@/simulation/pipeline/pipeline.ts";
import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { DamageTickEvent, SimulationContext } from "@/types/simulation.ts";

const damagePipeline = new DamagePipeline();

export class DamageHandler implements EventHandler<DamageTickEvent> {
  handle(e: DamageTickEvent, ctx: SimulationContext) {
    const baseDamage = e.payload.damage;
    const baseStagger = e.payload.tickData ? e.payload.tickData.stagger : 0;

    const action = ctx.getAction(e.payload.actionId);

    const snapshot: DamageSnapshot = {
      baseDamage,
      finalDamage: baseDamage,
      staggerDamage: baseStagger,
      isCrit: false,
      tags: [],
      sourceId: e.payload.sourceId || "",
      targetId: e.payload.targetId,
      action: action,
      tick: e.payload.tickData,
    };

    // TODO: 伤害计算
    const dmgResult = damagePipeline.calculate(snapshot, ctx.state);

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

    if (e.payload.tickData && e.payload.tickData.sp > 0) {
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
