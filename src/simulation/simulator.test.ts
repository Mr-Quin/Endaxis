import { describe, it, expect } from "vitest";
import { simulate } from "./simulator";
import { simulatorFixture1 } from "./fixture/simulator.fixture";
import { compileTimeline } from "./compiler/compileTimeline";
import { projectSpSeries } from "./projection/projectSpSeries";
import { projectStaggerSeries } from "./projection/projectStaggerSeries";
import { compileScenario } from "./compiler/compileScenario";
import { scenario } from "./compiler/fixture/scenario-1";

describe("SimulationEngine Integration", () => {
  it("should match SP snapshot", () => {
    const timeline = compileTimeline(simulatorFixture1.actionNode);
    const result = simulate(
      timeline,
      {
        maxSp: 300,
        initialSp: 200,
        spRegenRate: 8,
        skillSpCostDefault: 100,
        linkCdReduction: 0,
      },
      {
        maxStagger: 100,
        staggerNodeCount: 0,
        staggerNodeDuration: 2,
        staggerBreakDuration: 10,
        executionRecovery: 25,
      },
      []
    );

    const projection = projectSpSeries(
      result.simLog,
      result.state.getInitialSnapshot()
    );

    expect(projection).toMatchSnapshot();
  });

  it("should match Stagger snapshot", () => {
    const timeline = compileTimeline(simulatorFixture1.actionNode);
    const result = simulate(
      timeline,
      {
        maxSp: 300,
        initialSp: 200,
        spRegenRate: 8,
        skillSpCostDefault: 100,
        linkCdReduction: 0,
      },
      {
        maxStagger: 125,
        staggerBreakDuration: 10,
        staggerNodeDuration: 2,
        staggerNodeCount: 0,
        executionRecovery: 25,
      },
      []
    );
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

  it("runs against a scenario", () => {
    const { timeline, actors, teamConfig, enemyConfig } =
      compileScenario(scenario);

    const result = simulate(timeline, teamConfig, enemyConfig, actors);
  });
});
