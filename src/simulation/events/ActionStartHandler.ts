import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { ActionStartEvent } from "@/simulation/events/event.types.ts";
import type { SimulationContext } from "@/simulation/engine/SimulationContext.ts";
import { SKILL_EFFECT_MAP } from "../effects/skillEffectMap";
import { assert } from "@/utils/assert";

export class ActionStartHandler implements EventHandler<ActionStartEvent> {
  handle(e: ActionStartEvent, ctx: SimulationContext) {
    ctx.simLog({
      type: "ACTION_START",
      time: e.time,
      payload: {
        skillId: e.payload.skillId,
        actionId: e.payload.actionId,
        type: e.payload.type,
        spCost: e.payload.spCost,
      },
    });

    const action = ctx.getAction(e.payload.actionId);

    assert(action !== undefined, "Action not found");

    const skillEffects = SKILL_EFFECT_MAP[e.payload.skillId];
    if (skillEffects) {
      for (const effect of skillEffects) {
        ctx.queue.enqueue({
          type: "EFFECT_START",
          time: e.time,
          source: { id: e.payload.actorId, type: "PLAYER" },
          target: { id: e.payload.actorId, type: "PLAYER" },
          payload: {
            actorId: e.payload.actorId,
            actionId: e.payload.actionId,
            targetId: e.payload.actorId,
            effect: effect,
          },
        });
      }
    }

    const spFreezeDuration = this.getSpFreezeDuration(e);
    if (spFreezeDuration > 0) {
      // 暂停SP再生
      ctx.queue.enqueue({
        type: "SP_REGEN_PAUSE",
        time: ctx.state.getCurrentTime(),
        source: { id: e.payload.actorId, type: "PLAYER" },
        target: { id: e.payload.actorId, type: "PLAYER" },
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
        source: { id: e.payload.actorId, type: "PLAYER" },
        target: { id: e.payload.actorId, type: "PLAYER" },
        payload: {
          actorId: e.payload.actorId,
          spChange: -e.payload.spCost,
          reason: "skill",
          sourceId: e.payload.actionId,
          parent: e,
        },
      });
    }

    action.resolvedDamageTicks.forEach((tick) => {
      ctx.queue.enqueue({
        type: "DAMAGE_TICK",
        time: tick.realTime,
        source: { id: action.trackId, type: "PLAYER" },
        target: { id: "boss", type: "ENEMY" },
        payload: {
          actorId: action.trackId,
          targetId: "boss",
          damage: 0,
          stagger: tick.stagger,
          actionId: action.id,
          sp: tick.sp,
        },
      });
    });
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
