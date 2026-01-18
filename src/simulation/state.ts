import type {
  EnemyStateConfig,
  TeamStateConfig,
  ActorState,
} from "../types/simulation";

export class TeamState {
  sp: number;
  gauge: number;
  private isSpRegenPaused: boolean = false;
  private spRegenPauseDuration: number = 0;

  constructor(readonly config: TeamStateConfig) {
    this.sp = config.initialSp || 0;
    this.gauge = 0;
  }

  advanceTime(dt: number, currentTime: number) {
    this.regenSp(dt, currentTime);
  }

  modifySp(amount: number): number {
    if (amount === 0) {
      return this.sp;
    }
    this.sp = Math.min(Math.max(0, this.sp + amount), this.config.maxSp);
    return this.sp;
  }

  pauseSpRegen(duration: number) {
    this.isSpRegenPaused = true;
    this.spRegenPauseDuration += duration;
  }

  private regenSp(dt: number, currentTime: number) {
    let effectiveDuration = dt;

    if (this.isSpRegenPaused) {
      if (dt < this.spRegenPauseDuration) {
        this.spRegenPauseDuration -= dt;
        return;
      }
      console.log(
        `spRegenPauseEnd ${this.spRegenPauseDuration} -> ${currentTime}`
      );
      effectiveDuration -= this.spRegenPauseDuration;
      this.isSpRegenPaused = false;
      this.spRegenPauseDuration = 0;
    }

    console.log("spRegenPauseDuration", effectiveDuration);

    if (this.sp < this.config.maxSp) {
      const gain = effectiveDuration * this.config.spRegenRate;
      console.log(
        "regen",
        `effective duration: ${effectiveDuration}`,
        `regen rate: ${this.config.spRegenRate}`,
        `gain: ${gain}`
      );
      this.modifySp(gain);
    }
  }
}

export class EnemyState {
  private stagger: number = 0;

  isLocked: boolean = false;
  lockEndTime: number = 0;

  constructor(readonly config: EnemyStateConfig) {}

  addStagger(
    amount: number,
    currentTime: number
  ): { broken: boolean; breakEnd?: number } {
    if (amount <= 0) return { broken: false };

    if (this.isLocked) {
      if (currentTime < this.lockEndTime) {
        return { broken: false };
      } else {
        this.isLocked = false;
      }
    }

    this.stagger = Math.max(0, this.stagger + amount);

    if (this.stagger >= this.config.maxStagger) {
      this.stagger = 0;
      this.isLocked = true;
      const breakDuration = this.config.staggerBreakDuration;
      this.lockEndTime = currentTime + breakDuration;
      return { broken: true, breakEnd: this.lockEndTime };
    }

    return { broken: false };
  }

  getStagger() {
    return this.stagger;
  }

  advanceTime(dt: number, currentTime: number) {
    if (this.isLocked && this.lockEndTime < currentTime) {
      this.isLocked = false;
    }
  }
}

export class GameState {
  team: TeamState;
  enemy: EnemyState;
  actors: Map<string, ActorState> = new Map();
  private currentTime: number = 0;

  constructor(teamConfig: TeamStateConfig, enemyConfig: EnemyStateConfig) {
    this.team = new TeamState(teamConfig);
    this.enemy = new EnemyState(enemyConfig);
  }

  advanceTime(deltaTime: number) {
    console.log(
      `advanceTime ${this.currentTime} -> ${this.currentTime + deltaTime}`
    );
    this.currentTime += deltaTime;
    this.team.advanceTime(deltaTime, this.currentTime);
    this.enemy.advanceTime(deltaTime, this.currentTime);
  }

  getCurrentTime() {
    return this.currentTime;
  }
}
