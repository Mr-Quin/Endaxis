import type { ActorState } from "@/types/simulation";
import type { EnemyState } from "../state/EnemyState";
import type { GameState } from "../state/GameState";

export interface StaggerContext {
  source: ActorState;
  target: EnemyState;
  baseValue: number;
  // ["knockup", "originium_arts"]
  tags: string[];
  state: GameState;
}

export interface CalculationResult {
  baseValue: number;
  finalValue: number;
  breakdown: BreakdownEntry[];
}

export interface BreakdownEntry {
  // name
  source: string;
  type: "BASE" | "FLAT" | "MULTIPLIER";
  value: number;
  contribution: number;
}
