import type {
  SimulationContext,
  DamageTickEvent,
  ActionStartEvent,
  ActionEndEvent,
  SpChangeEvent,
  SpRegenPauseEvent,
} from "../types/simulation";
import type { EventHandler } from "./engine";
import {
  DamagePipeline,
  type DamageSnapshot,
  StaggerPipeline,
} from "./pipeline";

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
    const finalStagger = staggerPipeline.calculate(dmgResult, ctx.state);

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

export class ActionStartHandler implements EventHandler<ActionStartEvent> {
  handle(e: ActionStartEvent, ctx: SimulationContext) {
    ctx.log(e, `${e.payload.actorId} - ${e.payload.type}`);

    const spFreezeDuration = this.getSpFreezeDuration(e);
    if (spFreezeDuration > 0) {
      // 暂停SP再生
      ctx.queue.enqueue({
        type: "SP_REGEN_PAUSE",
        time: ctx.state.getCurrentTime(),
        payload: {
          sourceId: e.payload.actorId,
          duration: spFreezeDuration,
        },
      });
    }

    if (e.payload.spCost && e.payload.spCost > 0) {
      // 技能SP消耗
      ctx.queue.enqueue({
        type: "SP_CHANGE",
        time: ctx.state.getCurrentTime(),
        payload: {
          actorId: e.payload.actorId,
          spChange: -e.payload.spCost,
          reason: "skill",
          sourceId: e.payload.actionId,
          parent: e,
        },
      });
    }
  }

  private getSpFreezeDuration(e: ActionStartEvent) {
    if (e.payload.type === "skill") {
      return 0.5;
    }
    if (e.payload.type === "ultimate" || e.payload.type === "link") {
      return e.payload.freezeDuration ?? 1.5;
    }
    return 0;
  }
}

export class SpRegenPauseHandler implements EventHandler<SpRegenPauseEvent> {
  handle(e: SpRegenPauseEvent, ctx: SimulationContext) {
    ctx.log(e, `${e.payload.sourceId} - Sp Regen Pause: ${e.payload.duration}`);
    ctx.state.team.pauseSpRegen(e.payload.duration);
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
          parent: e,
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
          parent: e,
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
