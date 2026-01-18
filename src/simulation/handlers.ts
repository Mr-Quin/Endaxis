import type {
  SimulationContext,
  DamageTickEvent,
  ActionStartEvent,
  ActionEndEvent,
  SpChangeEvent,
} from "../types/simulation";
import type { EventHandler } from "./engine";
import {
  DamagePipeline,
  type DamageSnapshot,
  StaggerPipeline,
} from "./pipeline";

// Shared Pipeline Instances
const damagePipeline = new DamagePipeline();
const staggerPipeline = new StaggerPipeline();

// --- Damage Handler ---
export class DamageHandler implements EventHandler<DamageTickEvent> {
  handle(e: DamageTickEvent, ctx: SimulationContext) {
    // 1. Snapshot
    // In legacy, we might have stagger from tick.stagger
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

    // 2. Pipelines
    const dmgResult = damagePipeline.calculate(snapshot, ctx.state);
    const finalStagger = staggerPipeline.calculate(dmgResult, ctx.state);

    // 3. Apply to State
    // Stagger
    if (finalStagger > 0) {
      const startStagger = ctx.state.enemy.getStagger();
      const { broken, breakEnd } = ctx.state.enemy.addStagger(
        finalStagger,
        ctx.state.getCurrentTime()
      );
      ctx.log(
        e,
        `${
          e.payload.sourceId
        } - Stagger: ${startStagger} -> ${ctx.state.enemy.getStagger()} (${finalStagger})`
      );
    }

    if (e.payload.tickData && e.payload.tickData.sp > 0) {
      ctx.log(e, `${e.payload.sourceId} - Queueing SP Change`);
      // 击中SP恢复
      ctx.queue.enqueue({
        type: "SP_CHANGE",
        time: ctx.state.getCurrentTime(),
        payload: {
          actorId: e.payload.sourceId,
          spChange: e.payload.tickData.sp,
          reason: "damage",
          sourceId: e.payload.sourceId,
        },
      });
    }
  }
}

export class ActionStartHandler implements EventHandler<ActionStartEvent> {
  handle(e: ActionStartEvent, ctx: SimulationContext) {
    ctx.log(e, `${e.payload.actorId} - ${e.payload.type}`);
    if (e.payload.spCost && e.payload.spCost > 0) {
      //技能SP消耗
      ctx.queue.enqueue({
        type: "SP_CHANGE",
        time: ctx.state.getCurrentTime(),
        payload: {
          actorId: e.payload.actorId,
          spChange: -e.payload.spCost,
          reason: "skill",
          sourceId: e.payload.actionId,
        },
      });
    }
    // 暂停SP再生
    if (e.payload.type === "skill") {
      ctx.log(e, `${e.payload.actorId} - Pausing SP Regen for ${0.5}`);
      ctx.state.team.pauseSpRegen(0.5);
    }
    if (e.payload.type === "ultimate" || e.payload.type === "link") {
      ctx.log(
        e,
        `${e.payload.actorId} - Pausing SP Regen for ${
          e.payload.freezeDuration ?? 1.5
        }`
      );
      ctx.state.team.pauseSpRegen(e.payload.freezeDuration ?? 1.5);
    }
  }
}

export class ActionEndHandler implements EventHandler<ActionEndEvent> {
  handle(e: ActionEndEvent, ctx: SimulationContext) {
    ctx.log(e, `${e.payload.actorId} - ${e.payload.type}`);
    if (e.payload.spGain && e.payload.spGain > 0) {
      ctx.log(e, `${e.payload.actorId} - Sp Gain: ${e.payload.spGain}`);
      // 技能SP恢复
      ctx.queue.enqueue({
        type: "SP_CHANGE",
        time: ctx.state.getCurrentTime(),
        payload: {
          actorId: e.payload.actorId,
          spChange: e.payload.spGain,
          reason: "skill",
          sourceId: e.payload.actionId,
        },
      });
    } else if (e.payload.type === "execution") {
      ctx.log(
        e,
        `${e.payload.actorId} - Sp Gain: ${ctx.state.enemy.config.executionRecovery}`
      );
      // 处决SP恢复
      ctx.queue.enqueue({
        type: "SP_CHANGE",
        time: ctx.state.getCurrentTime(),
        payload: {
          actorId: e.payload.actorId,
          spChange: ctx.state.enemy.config.executionRecovery,
          reason: "execution",
          sourceId: e.payload.actionId,
        },
      });
    }
  }
}

export class SpChangeHandler implements EventHandler<SpChangeEvent> {
  handle(e: SpChangeEvent, ctx: SimulationContext) {
    const startSp = ctx.state.team.sp;
    ctx.state.team.modifySp(e.payload.spChange);
    ctx.log(
      e,
      `${e.payload.actorId} - ${e.payload.reason} - SP Change: ${startSp} -> ${ctx.state.team.sp}`
    );
  }
}

// --- Time Advance (Regen) ---
export function handleTimeAdvance(dt: number, ctx: SimulationContext) {
  // Ticks GameState
  ctx.state.advanceTime(dt);
}
