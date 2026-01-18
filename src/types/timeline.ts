import type { TimeContext } from "../simulation/time-context";

export interface Anomaly {
  _id: string;
  offset: number;
  duration: number;
  type: string;
  sp?: number;
  stagger?: number;
  stacks: number;
}

export interface DamageTick {
  offset: number;
  sp: number;
  stagger: number;
  boundEffects?: string[];
}
export interface ResolvedDamageTick extends DamageTick {
  realTime: number;
  realOffset: number;
  time: number;
}

export type ActionType =
  | "execution" // 处决
  | "skill" // 技能
  | "link" // 连携
  | "ultimate" // 终结技
  | "attack"; // 重击

export interface Action {
  id: string;
  instanceId: string;
  type: ActionType;
  name: string;
  startTime: number;
  logicalStartTime: number;
  cooldown: number;
  spCost: number;
  spGain?: number;
  element: string;
  librarySource?: string;
  icon?: string;
  gaugeCost: number;
  gaugeGain: number;
  teamGaugeGain: number;
  enhancementTime: number;
  duration: number;
  triggerWindow?: number;
  animationTime?: number;
  isDisabled?: boolean;
  weaponId?: string | null;
  sourceWeaponId?: string | null;
  allowedTypes: string[];
  damageTicks: DamageTick[];
  physicalAnomaly: Anomaly[][];
}

export interface ActionNode {
  type: "action";
  id: string;
  trackIndex: number;
  trackId: string;
  node: Action;
}

export interface AnomalyNode {
  type: "effect";
  id: string;
  actionId: string;
  colIndex: number;
  rowIndex: number;
  flatIndex: number;
  node: Anomaly;
}

export interface ResolvedEffect extends AnomalyNode {
  uniqueId: string;
  realDuration: number;
  realStartTime: number;
  displayDuration: number;
  isConsumed: boolean;
  extensionAmount: number;
}

export interface ResolvedAction extends ActionNode {
  startTime: number;
  realStartTime: number;
  duration: number;
  realDuration: number;
  isInterrupted: boolean;
  effects: ResolvedEffect[];
  triggerWindow: {
    hasWindow: boolean;
    startTime: number;
    duration: number;
  };
  resolvedDamageTicks: ResolvedDamageTick[];
  extensionAmount: number;
  freezeDuration?: number;
}

export interface TimeExtension {
  time: number;
  gameTime: number;
  amount: number;
  sourceId: string;
  logicalTime: number;
  cumulativeFreezeTime: number;
}

export interface ResolvedTimeline {
  actions: ResolvedAction[];
  actionMap: Map<string, ResolvedAction>;
  effectMap: Map<string, ResolvedEffect>;
  timeExtensions: TimeExtension[];
  timeContext: TimeContext;
  meta: {
    totalDuration: number;
    totalDamage: number;
  };
}
