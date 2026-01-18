import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type {
  SimulationContext,
  SpRegenPauseEvent,
} from "@/types/simulation.ts";

export class SpRegenPauseHandler implements EventHandler<SpRegenPauseEvent> {
  handle(e: SpRegenPauseEvent, ctx: SimulationContext) {
    ctx.simLog({
      type: "SP_REGEN_PAUSE",
      time: e.time,
      payload: {
        sourceId: e.payload.sourceId,
        duration: e.payload.duration,
        sp: ctx.state.team.sp,
      },
    });
    ctx.state.team.pauseSpRegen(e.payload.duration);
  }
}
