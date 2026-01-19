import type { ActorSnapshot } from "@/types/simulation";
import type { BaseGameState } from "./BaseGameState";

export class ActorState implements BaseGameState<ActorSnapshot> {
  constructor(snapshot: ActorSnapshot) {}
}
