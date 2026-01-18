import type {
  ActionType,
  ResolvedAction,
  ResolvedDamageTick,
  ResolvedEffect,
} from "./timeline";
import {GameState} from "@/simulation/state/GameState.ts";

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

export interface TeamSnapshot {
  sp: number;
  gauge: number;
  isSpRegenPaused: boolean;
  spRegenPauseDuration: number;
}

export interface EnemyStateConfig {
  maxStagger: number;
  staggerNodeCount: number;
  staggerNodeDuration: number;
  staggerBreakDuration: number;
  executionRecovery: number;
}

export interface EnemySnapshot {
  stagger: number;
  isLocked: boolean;
  lockEndTime: number;
}

export interface GameConfig {
  team: TeamStateConfig;
  enemy: EnemyStateConfig;
}

export interface GameSnapshot {
  team: TeamSnapshot;
  enemy: EnemySnapshot;
}

export type SimEventType = SimEvent["type"];

type SimBaseEvent<Name extends string, Data = {}> = {
  // real time
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
    actionId: string;
  }
>;

export type SpChangeEvent = SimBaseEvent<
  "SP_CHANGE",
  {
    actorId: string;
    spChange: number;
    reason: string;
    sourceId: string;
    parent: SimEvent;
  }
>;

export type SpRegenPauseEvent = SimBaseEvent<
  "SP_REGEN_PAUSE",
  {
    sourceId: string;
    duration: number;
  }
>;

export type SimEvent =
  | ActionStartEvent
  | ActionEndEvent
  | DamageTickEvent
  | SpChangeEvent
  | SpRegenPauseEvent;

export type SimLogEntryBase<Name extends string, Data = {}> = {
  type: Name;
  time: number;
  beforeSnapshot: GameSnapshot;
  afterSnapshot: GameSnapshot;
  payload: Data;
};

export type SimLogEntry =
  | SimLogEntryBase<
      "SP_REGEN_PAUSE",
      {
        sourceId: string;
        duration: number;
      }
    >
  | SimLogEntryBase<
      "SP_CHANGE",
      {
        sp: number;
        change: number;
        sourceId: string;
        reason: string;
      }
    >
  | SimLogEntryBase<
      "STAGGER",
      {
        actorId: string;
        actionId: string;
        amount: number;
        stagger: number;
      }
    >
  | SimLogEntryBase<"DAMAGE">
  | SimLogEntryBase<"STATE_SNAPSHOT">;

export interface SimulationContext {
  state: GameState;
  queue: {
    enqueue: (event: SimEvent) => void;
  };
  log: (e: SimEvent, msg: string) => void;
  getAction: (id: string) => ResolvedAction | undefined;
}

export interface EventHookContext extends SimulationContext {
  beforeSnapshot: GameSnapshot;
  afterSnapshot: GameSnapshot;
}
