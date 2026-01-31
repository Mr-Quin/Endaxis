import type { ActorSnapshot } from "@/simulation/state/types.ts";
import type { SimEvent } from "@/simulation/events/event.types.ts";
import type { SimulationContext } from "@/simulation/engine/SimulationContext.ts";
import type { BaseGameState } from "./BaseGameState";
import { EffectManager } from "./EffectManager";

export class ActorState implements BaseGameState<ActorSnapshot> {
  public effects: EffectManager;

  constructor(public readonly snapshotData: ActorSnapshot) {
    this.effects = new EffectManager(this.snapshotData.id);
  }

  get id() {
    return this.snapshotData.id;
  }

  advanceTime(_dt: number, _currentTime: number) {}

  onEvent(_event: SimEvent, _ctx: SimulationContext) {}

  snapshot(): ActorSnapshot {
    return this.snapshotData;
  }
}
