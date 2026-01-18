import { describe, it, expect } from "vitest";
import { simulate } from "./simulator";
import {
  simulatorFixture2,
  simulatorFixture1,
} from "./fixture/simulator.fixture";
import type {
  ResolvedTimeline,
  ResolvedAction,
  ResolvedDamageTick,
} from "../types/timeline";
import type { ActionNode } from "../types/timeline";
import { compileTimeline } from "./compiler";
import { projectSpSeries } from "./projection/projectSpSeries";

// Helper to convert ActionNode fixture to ResolvedAction
// Assuming 1:1 time mapping for simplicity as per user context
function mockResolve(nodes: ActionNode[]): ResolvedTimeline {
  return compileTimeline(nodes);
}

// Helper to deduplicate series (remove consecutive duplicates)
function cleanSeries(data: { time: number; value: number }[]) {
  if (data.length === 0) return [];
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    const last = result[result.length - 1]!; // Assert exists
    const curr = data[i]!;
    const timeSame = Math.abs(curr.time - last.time) < 0.001;
    const valSame = Math.abs(curr.value - last.value) < 0.001;

    if (timeSame && valSame) continue;
    result.push(curr);
  }
  return result;
}

describe.skip("SimulationEngine Integration", () => {
  it("should match SP fixture data", () => {
    const timeline = mockResolve(simulatorFixture1.actionNode);
    const result = simulate(timeline, {
      initialSp: 200,
      maxSp: 300,
      spRegenRate: 8,
    });

    const expected = simulatorFixture1.spData.map((p) => ({
      time: p.time,
      value: p.sp,
    }));

    const projection = projectSpSeries(
      result.simLog.getItems(),
      result.state.getInitialSnapshot()
    );
    console.log("SimLog:", JSON.stringify(result.simLog, null, 2));
    console.log("Projection:", JSON.stringify(projection, null, 2));
    console.log("Correct:", JSON.stringify(simulatorFixture1.spData, null, 2));

    for (let i = 0; i < projection.length; i++) {
      const exp = expected[i];
      const proj = projection[i];
      if (!exp || !proj) continue;

      console.log(i);
      expect(exp.value).toBeCloseTo(proj.value, 1);
    }
  });

  it.skip("should match Stagger fixture data", () => {
    const timeline = mockResolve(simulatorFixture2.actionNode);
    const result = simulate(timeline, {
      maxStagger: 100,
      staggerBreakDuration: 10,
      staggerNodeDuration: 2,
      executionRecovery: 25,
    });

    const expected = simulatorFixture2.spData.map((p) => ({
      time: p.time,
      value: p.sp,
    }));
    const actual = cleanSeries(result.series.sp);

    let actIdx = 0;
    for (let i = 0; i < expected.length; i++) {
      const exp = expected[i];
      if (!exp) continue;

      let found = false;
      while (actIdx < actual.length) {
        const act = actual[actIdx];
        if (!act) break;

        const tDiff = Math.abs(act.time - exp.time);
        const vDiff = Math.abs(act.value - exp.value);

        if (tDiff < 0.1 && vDiff < 1.0) {
          found = true;
          actIdx++;
          break;
        }
        if (act.time > exp.time + 0.2) {
          break;
        }
        actIdx++;
      }
      if (!found && actIdx > 0 && actIdx <= actual.length) {
        const prevAct = actual[actIdx - 1];
        if (prevAct) {
          const vDiffPrev = Math.abs(prevAct.value - exp.value);
          if (exp.time >= prevAct.time - 0.1 && vDiffPrev < 1.0) {
            found = true;
          }
        }
      }
      if (!found) {
        console.error(`Missing Stagger Point: Expected ${JSON.stringify(exp)}`);
        console.error(
          "Context Actual:",
          JSON.stringify(
            actual.slice(Math.max(0, actIdx - 5), actIdx + 5),
            null,
            2
          )
        );
      }
    }
  });
});
