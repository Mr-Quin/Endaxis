import type { ActorSnapshot } from "@/simulation/state/types.ts";
import type { SimEvent, SimEntityId } from "@/simulation/events/event.types.ts";
import type { SimulationContext } from "@/simulation/engine/SimulationContext.ts";
import type { BaseGameState } from "./BaseGameState";
import { EffectManager } from "./EffectManager";

export class ActorState implements BaseGameState<ActorSnapshot> {
  readonly effects: EffectManager;
  readonly id: SimEntityId;

  constructor(public readonly snapshotData: ActorSnapshot) {
    this.id = { id: this.snapshotData.id, type: "PLAYER" };
    this.effects = new EffectManager(this.id);
  }

  advanceTime(_dt: number, _currentTime: number) { }

  onEvent(event: SimEvent, ctx: SimulationContext) {
    this.effects.handleEvent(event, ctx);
  }

  snapshot(): ActorSnapshot {
    return this.snapshotData;
  }
}
