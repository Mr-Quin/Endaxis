import type { BaseGameState } from "@/simulation/state/BaseGameState.ts";
import type { EnemySnapshot, EnemyConfig } from "@/types/simulation.ts";

export class EnemyState implements BaseGameState<EnemySnapshot> {
  private stagger: number = 0;

  isBroken: boolean = false;
  breakEndTime: number = 0;

  nodeStep: number = 0;

  // effectId -> type
  private activeEffects: Map<string, string> = new Map();

  constructor(readonly config: EnemyConfig) {
    this.nodeStep = this.config.maxStagger / (this.config.staggerNodeCount + 1);
  }

  addStagger(
    amount: number,
    currentTime: number
  ): { broken: boolean; breakEnd?: number; nodeReachedIndex?: number } {
    if (this.isBroken) return { broken: false, nodeReachedIndex: -1 };
    const oldStagger = this.stagger;
    this.stagger = Math.max(0, this.stagger + amount);

    const hasNodes = this.config.staggerNodeCount > 0;

    let nodeReachedIndex = -1;

    if (hasNodes) {
      const prevNodeIdx = Math.floor(oldStagger / this.nodeStep);
      const currNodeIdx = Math.floor(this.stagger / this.nodeStep);
      if (currNodeIdx > prevNodeIdx) {
        nodeReachedIndex = currNodeIdx;
      }
    }

    if (this.stagger >= this.config.maxStagger) {
      this.stagger = 0;
      this.isBroken = true;
      const breakDuration = this.config.staggerBreakDuration;
      this.breakEndTime = currentTime + breakDuration;
      return { broken: true, breakEnd: this.breakEndTime };
    }

    return { broken: false, nodeReachedIndex };
  }

  getStagger() {
    return this.stagger;
  }

  advanceTime(dt: number, currentTime: number) {
    if (this.isBroken && this.breakEndTime < currentTime) {
      this.isBroken = false;
    }
    // TODO: effect expiration
  }

  addEffect(effectId: string, type: string) {
    this.activeEffects.set(effectId, type);
  }

  removeEffect(id: string) {
    this.activeEffects.delete(id);
  }

  hasEffectId(id: string): boolean {
    return this.activeEffects.has(id);
  }

  getEffectType(id: string): string | undefined {
    return this.activeEffects.get(id);
  }

  hasEffectType(type: string): boolean {
    return this.activeEffects.values().some((t) => t === type);
  }

  snapshot(): EnemySnapshot {
    return {
      stagger: this.stagger,
      isBroken: this.isBroken,
      breakEndTime: this.breakEndTime,
    };
  }
}
