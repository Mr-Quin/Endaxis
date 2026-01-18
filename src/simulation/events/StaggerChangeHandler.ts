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

    if (amount <= 0) {
      return;
    }

    const wasBroken = ctx.state.enemy.isBroken;
    ctx.state.enemy.addStagger(amount, ctx.state.getCurrentTime());
    const isBroken = ctx.state.enemy.isBroken;

    ctx.simLog({
      type: "STAGGER",
      time: e.time,
      payload: {
        actorId: e.payload.snapshot.targetId,
        actionId: "",
        amount,
        stagger: ctx.state.enemy.getStagger(),
        isBroken: !wasBroken && isBroken,
      },
    });
  }
}
