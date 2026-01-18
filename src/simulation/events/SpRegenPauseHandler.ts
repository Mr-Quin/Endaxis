import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type {
  SimulationContext,
  SpRegenPauseEvent,
} from "@/types/simulation.ts";

export class SpRegenPauseHandler implements EventHandler<SpRegenPauseEvent> {
  handle(e: SpRegenPauseEvent, ctx: SimulationContext) {
    ctx.log(e, `${e.payload.sourceId} - Sp Regen Pause: ${e.payload.duration}`);
    ctx.state.team.pauseSpRegen(e.payload.duration);
  }
}
