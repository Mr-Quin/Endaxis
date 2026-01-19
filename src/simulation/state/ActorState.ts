import type { ActorSnapshot } from "@/types/simulation";
import type { BaseGameState } from "./BaseGameState";

export class ActorState implements BaseGameState<ActorSnapshot> {
  constructor(private snapshotData: ActorSnapshot) {}

  advanceTime(_dt: number, _currentTime: number) {}

  snapshot(): ActorSnapshot {
    return this.snapshotData;
  }
}
