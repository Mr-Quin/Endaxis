import type { BaseGameState } from "@/simulation/state/BaseGameState.ts";
import type {
  ActorState,
  EnemyStateConfig,
  GameSnapshot,
  TeamStateConfig,
} from "@/types/simulation.ts";
import { TeamState } from "@/simulation/state/TeamState.ts";
import { EnemyState } from "@/simulation/state/EnemyState.ts";

export class GameState implements BaseGameState<GameSnapshot> {
  team: TeamState;
  enemy: EnemyState;
  actors: Map<string, ActorState> = new Map();
  private currentTime: number = 0;
  private initialSnapshot: GameSnapshot;

  constructor(teamConfig: TeamStateConfig, enemyConfig: EnemyStateConfig) {
    this.team = new TeamState(teamConfig);
    this.enemy = new EnemyState(enemyConfig);
    this.initialSnapshot = this.snapshot();
  }

  advanceTime(deltaTime: number) {
    this.currentTime += deltaTime;
    this.team.advanceTime(deltaTime, this.currentTime);
    this.enemy.advanceTime(deltaTime, this.currentTime);
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getInitialSnapshot() {
    return this.initialSnapshot;
  }

  snapshot(): GameSnapshot {
    return {
      team: this.team.snapshot(),
      enemy: this.enemy.snapshot(),
    };
  }
}
