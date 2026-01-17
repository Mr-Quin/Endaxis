import type { TimeContext } from "../simulation/time-context";

export interface Anomaly {
  _id: string;
  offset: number;
  duration: number;
  type: string;
  sp?: number;
  stagger?: number;
}

export interface DamageTick {
  offset: number;
  sp: number;
  stagger: number;
}
export interface ResolvedDamageTick extends DamageTick {
  realTime: number;
  realOffset: number;
}
export interface Action {
  instanceId: string;
  type: string;
  name: string;
  startTime: number;
  cooldown: number;
  spCost: number;
  gaugeCost: number;
  gaugeGain: number;
  teamGaugeGain: number;
  duration: number;
  triggerWindow?: number;
  animationTime?: number;
  isDisabled?: boolean;
  allowedTypes: string[];
  damageTicks: DamageTick[];
  physicalAnomaly: Anomaly[][];
}

export interface ActionNode {
  type: "action";
  id: string;
  trackIndex: number;
  skillId: string;
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
  realStartTime: number;
  displayDuration: number;
  isConsumed: boolean;
  extensionAmount: number;
}

export interface ResolvedAction extends ActionNode {
  gameStartTime: number;
  realStartTime: number;
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
