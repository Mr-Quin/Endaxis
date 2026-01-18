import { describe, it, expect } from "vitest";
import { simulate } from "./simulator";
import { simulatorFixture1 } from "./fixture/simulator.fixture";
import { compileTimeline } from "./compiler";
import { projectSpSeries } from "./projection/projectSpSeries";
import { projectStaggerSeries } from "./projection/projectStaggerSeries";

describe("SimulationEngine Integration", () => {
  it("should match SP snapshot", () => {
    const timeline = compileTimeline(simulatorFixture1.actionNode);
    const result = simulate(timeline, {
      initialSp: 200,
      maxSp: 300,
      spRegenRate: 8,
    });

    const projection = projectSpSeries(
      result.simLog,
      result.state.getInitialSnapshot()
    );

    expect(projection).toMatchSnapshot();
  });

  it("should match Stagger snapshot", () => {
    const timeline = compileTimeline(simulatorFixture1.actionNode);
    const result = simulate(timeline, {
      maxStagger: 125,
      staggerBreakDuration: 10,
      staggerNodeDuration: 2,
      staggerNodeCount: 0,
    });
    console.log(result.state.enemy.config);
    const projection = projectStaggerSeries(
      result.simLog,
      result.state.getInitialSnapshot(),
      125,
      0,
      10
    );

    expect(projection.nodeStep).toBe(125);

    expect(projection).toMatchSnapshot();
  });
});
