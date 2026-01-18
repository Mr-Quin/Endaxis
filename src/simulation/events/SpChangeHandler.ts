import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { SimulationContext, SpChangeEvent } from "@/types/simulation.ts";

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
