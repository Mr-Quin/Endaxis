import { expect, test } from "vitest";
import { compileScenario } from "../compiler/compileScenario";
import { scenario } from "./scenario-1-arc-perlica";
import { simulate } from "../simulator";
import { formatSimLogEntry } from "../formatSimLogEntry";

test("scenario-1-arc-perlica", () => {
  const { timeline, teamConfig, enemyConfig, actors } =
    compileScenario(scenario);
  const { simLog } = simulate(timeline, teamConfig, enemyConfig, actors);

  simLog.forEach((entry) => {
    console.log(formatSimLogEntry(entry));
  });

  expect(simLog).toMatchSnapshot();
});
