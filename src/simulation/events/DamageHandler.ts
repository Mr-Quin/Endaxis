import {
  DamagePipeline,
  type DamageSnapshot,
  StaggerPipeline,
} from "@/simulation/pipeline/pipeline.ts";
import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { DamageTickEvent, SimulationContext } from "@/types/simulation.ts";

const damagePipeline = new DamagePipeline();
const staggerPipeline = new StaggerPipeline();

export class DamageHandler implements EventHandler<DamageTickEvent> {
  handle(e: DamageTickEvent, ctx: SimulationContext) {
    const baseDamage = e.payload.damage;
    const baseStagger = e.payload.tickData ? e.payload.tickData.stagger : 0;

    const snapshot: DamageSnapshot = {
      baseDamage,
      finalDamage: baseDamage,
      staggerDamage: baseStagger,
      isCrit: false,
      tags: [],
      sourceId: e.payload.sourceId || "",
      targetId: e.payload.targetId,
    };

    // TODO: 伤害计算
    const dmgResult = damagePipeline.calculate(snapshot, ctx.state);
    const finalStagger = staggerPipeline.calculate(snapshot, ctx.state);

    if (finalStagger > 0) {
      const startStagger = ctx.state.enemy.getStagger();
      const { broken } = ctx.state.enemy.addStagger(
        finalStagger,
        ctx.state.getCurrentTime()
      );
      ctx.log(
        e,
        `${
          e.payload.sourceId
        } - Stagger: ${startStagger} -> ${ctx.state.enemy.getStagger()} (${finalStagger})${
          broken ? " (BROKEN)" : ""
        }`
      );
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
