import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { SimulationContext, SpChangeEvent } from "@/types/simulation.ts";

export class SpChangeHandler implements EventHandler<SpChangeEvent> {
  handle(e: SpChangeEvent, ctx: SimulationContext) {
    ctx.state.team.modifySp(e.payload.spChange);

    ctx.simLog({
      type: "SP_CHANGE",
      time: e.time,
      payload: {
        sp: ctx.state.team.sp,
        change: e.payload.spChange,
        sourceId: e.payload.sourceId,
        reason: e.payload.reason,
      },
    });
  }
}
