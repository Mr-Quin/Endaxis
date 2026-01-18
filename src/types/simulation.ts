import type { GameState } from "@/simulation/state";
import type {
  ActionType,
  ResolvedDamageTick,
  ResolvedEffect,
} from "./timeline";

export interface StatBlock {
  atk: number;
  def: number;
  hpMax: number;
  spMax: number;
  spRegen: number;
  critRate: number;
  critDmg: number;
  [key: string]: number;
}

export interface ActorState {
  id: string;
  stats: StatBlock;
  resources: {
    hp: number;
    // ultimate gauge
    gauge: number;
  };
  cooldowns: Map<string, number>;
  activeBuffs: ResolvedEffect[];
  isCasting: boolean;
  castEndTime: number;
}

export interface TeamStateConfig {
  maxSp: number;
  initialSp: number;
  spRegenRate: number;
  skillSpCostDefault: number;
  linkCdReduction: number;
}

export interface TeamResources {
  sp: number;
  gauge: number;
}

export interface EnemyStateConfig {
  maxStagger: number;
  staggerNodeCount: number;
  staggerNodeDuration: number;
  staggerBreakDuration: number;
  executionRecovery: number;
}

export interface EnemyResources {
  stagger: number;
}

export interface GameConfig {
  team: TeamStateConfig;
  enemy: EnemyStateConfig;
}

export type SimEventType = SimEvent["type"];

type SimBaseEvent<Name extends string, Data = {}> = {
  // game time
  time: number;
  type: Name;
  payload: Data;
};

export type ActionStartEvent = SimBaseEvent<
  "ACTION_START",
  {
    skillId: string;
    actionId: string;
    spCost?: number;
    actorId: string;
    type: ActionType;
    freezeDuration?: number;
  }
>;

export type ActionEndEvent = SimBaseEvent<
  "ACTION_END",
  {
    skillId: string;
    actionId: string;
    spGain?: number;
    actorId: string;
    type: ActionType;
  }
>;

export type DamageTickEvent = SimBaseEvent<
  "DAMAGE_TICK",
  {
    targetId: string;
    sourceId: string;
    damage: number;
    stagger: number;
    tickData: ResolvedDamageTick;
  }
>;

export type SpChangeEvent = SimBaseEvent<
  "SP_CHANGE",
  {
    actorId: string;
    spChange: number;
    reason: string;
  }
>;

export type SimEvent =
  | ActionStartEvent
  | ActionEndEvent
  | DamageTickEvent
  | SpChangeEvent;

export interface SimulationContext {
  state: GameState;
  queue: {
    enqueue: (event: SimEvent) => void;
  };
  log: (e: SimEvent, msg: string) => void;
}
