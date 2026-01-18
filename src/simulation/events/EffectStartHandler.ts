import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type {
  EffectStartEvent,
  SimulationContext,
} from "@/types/simulation.ts";

export class EffectStartHandler implements EventHandler<EffectStartEvent> {
  handle(event: EffectStartEvent, ctx: SimulationContext) {
    const { effectId, type } = event.payload;
    // TODO: handle buff/debuff/status
    ctx.state.enemy.addEffect(effectId, type);
    ctx.log(event, `Effect Start: ${type} (${effectId})`);
  }
}
