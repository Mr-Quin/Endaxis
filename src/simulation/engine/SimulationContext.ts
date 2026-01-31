import { GameState } from "@/simulation/state/GameState.ts";
import type { SimEvent, SimLogEntry } from "@/simulation/events/event.types.ts";
import type { GameSnapshot } from "@/simulation/state/types.ts";
import type { ResolvedAction } from "../compiler/types";
import type { AnyEffectTrigger } from "../effects/Effect";

export interface SimulationContext {
  state: GameState;
  queue: {
    enqueue: (event: SimEvent) => void;
  };
  trigger: {
    register: (trigger: AnyEffectTrigger) => void;
    remove: (trigger: AnyEffectTrigger) => void;
  };
  simLog: (entry: SimLogEntry) => void;
  getAction: (id: string) => ResolvedAction | undefined;
}

export interface EventHookContext extends SimulationContext {
  beforeSnapshot: GameSnapshot;
  afterSnapshot: GameSnapshot;
}
