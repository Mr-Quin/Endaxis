import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type {
  SimulationContext,
  StaggerChangeEvent,
} from "@/types/simulation.ts";
import { StaggerPipeline } from "@/simulation/pipeline/pipeline.ts";

const staggerPipeline = new StaggerPipeline();

export class StaggerChangeHandler implements EventHandler<StaggerChangeEvent> {
  handle(e: StaggerChangeEvent, ctx: SimulationContext) {
    const { snapshot } = e.payload;

    const amount = staggerPipeline.calculate(snapshot, ctx.state);

    if (amount <= 0) return;

    const startStagger = ctx.state.enemy.getStagger();
    ctx.state.enemy.addStagger(amount, ctx.state.getCurrentTime());

    ctx.log(
      e,
      `Stagger Change: ${startStagger} -> ${ctx.state.enemy.getStagger()} (+${amount})${
        ctx.state.enemy.isBroken ? " (BROKEN)" : ""
      }`
    );
  }
}
