import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { SpChangeEvent } from "@/simulation/events/event.types.ts";
import type { SimulationContext } from "@/simulation/engine/SimulationContext.ts";

export class SpChangeHandler implements EventHandler<SpChangeEvent> {
  handle(e: SpChangeEvent, ctx: SimulationContext) {
    // TODO: run sp change through calculation pipeline

    ctx.state.team.modifySp(e.payload.spChange);

    ctx.simLog({
      type: "SP_CHANGE",
      time: e.time,
      payload: {
        sp: ctx.state.team.getSp(),
        change: e.payload.spChange,
        sourceId: e.payload.sourceId,
        reason: e.payload.reason,
      },
    });
  }
}
