import type {
  ActorSnapshot,
  EnemyConfig,
  TeamConfig,
} from "@/types/simulation";
import { GameState } from "../state/GameState";
import { SimulationEngine } from "./SimulationEngine";
import type { ResolvedTimeline } from "@/types/timeline";
import { DamageHandler } from "../events/DamageHandler";
import { ActionStartHandler } from "../events/ActionStartHandler";
import { ActionEndHandler } from "../events/ActionEndHandler";
import { SpChangeHandler } from "../events/SpChangeHandler";
import { SpRegenPauseHandler } from "../events/SpRegenPauseHandler";
import { EffectStartHandler } from "../events/EffectStartHandler";
import { EffectEndHandler } from "../events/EffectEndHandler";
import { StaggerChangeHandler } from "../events/StaggerChangeHandler";

export function createEngine(
  teamConfig: TeamConfig,
  enemyConfig: EnemyConfig,
  actors: ActorSnapshot[],
  timeline: ResolvedTimeline
) {
  const engine = new SimulationEngine(
    timeline,
    teamConfig,
    enemyConfig,
    actors
  );

  engine.registerHandler("DAMAGE_TICK", new DamageHandler());
  engine.registerHandler("ACTION_START", new ActionStartHandler());
  engine.registerHandler("ACTION_END", new ActionEndHandler());
  engine.registerHandler("SP_CHANGE", new SpChangeHandler());
  engine.registerHandler("SP_REGEN_PAUSE", new SpRegenPauseHandler());
  engine.registerHandler("EFFECT_START", new EffectStartHandler());
  engine.registerHandler("EFFECT_END", new EffectEndHandler());
  engine.registerHandler("STAGGER_CHANGE", new StaggerChangeHandler());

  return engine;
}
