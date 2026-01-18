import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type { EffectEndEvent, SimulationContext } from "@/types/simulation.ts";

export class EffectEndHandler implements EventHandler<EffectEndEvent> {
  handle(event: EffectEndEvent, ctx: SimulationContext) {
    const { effectId } = event.payload;
    ctx.state.enemy.removeEffect(effectId);
    ctx.log(event, `Effect End: ${effectId}`);
  }
}
