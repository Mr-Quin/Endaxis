import type { SimulationEngine } from "@/simulation/engine/SimulationEngine.ts";
import { GameState } from "@/simulation/state/GameState.ts";
import type { SimEvent, SimLogEntry } from "@/simulation/events/event.types.ts";
import type { GameSnapshot } from "@/simulation/state/types.ts";
import type { ResolvedAction } from "../compiler/types";

export interface SimulationContext {
  engine: SimulationEngine;
  state: GameState;
  queue: {
    enqueue: (event: SimEvent) => void;
  };
  simLog: (entry: SimLogEntry) => void;
  getAction: (id: string) => ResolvedAction | undefined;
}

export interface EventHookContext extends SimulationContext {
  beforeSnapshot: GameSnapshot;
  afterSnapshot: GameSnapshot;
}
