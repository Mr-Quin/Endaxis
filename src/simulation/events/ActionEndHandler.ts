import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { ActionEndEvent, SimulationContext } from "@/types/simulation.ts";

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
