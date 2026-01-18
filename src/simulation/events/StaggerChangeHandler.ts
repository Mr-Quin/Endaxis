import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import type {
  SimulationContext,
  StaggerChangeEvent,
} from "@/types/simulation.ts";
import {
  CalculationPipeline,
  OriginiumArtsModifier,
} from "../calculation/CalculationPipeline";
import type { StaggerContext } from "../calculation/type";

export class StaggerChangeHandler implements EventHandler<StaggerChangeEvent> {
  private pipeline = new CalculationPipeline<StaggerContext>();

  constructor() {
    this.pipeline.add(OriginiumArtsModifier);
  }

  handle(e: StaggerChangeEvent, ctx: SimulationContext) {
    const { stagger, sourceId } = e.payload;

    const staggerCtx: StaggerContext = {
      source: {} as any,
      target: ctx.state.enemy,
      baseValue: stagger,
      tags: [],
      state: ctx.state,
    };

    const result = this.pipeline.execute(staggerCtx, stagger);

    if (result.finalValue <= 0) {
      return;
    }

    const wasBroken = ctx.state.enemy.isBroken;
    ctx.state.enemy.addStagger(result.finalValue, ctx.state.getCurrentTime());
    const isBroken = ctx.state.enemy.isBroken;

    ctx.simLog({
      type: "STAGGER",
      time: e.time,
      payload: {
        actorId: e.payload.targetId,
        actionId: "",
        amount: result.finalValue,
        stagger: ctx.state.enemy.getStagger(),
        isBroken: !wasBroken && isBroken,
      },
    });
  }
}
