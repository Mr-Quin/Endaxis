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
  id: string;
  trackIndex: number;
  skillId: string;
  node: Action;
}

export interface AnomalyNode {
  id: string;
  actionId: string;
  colIndex: number;
  rowIndex: number;
  flatIndex: number;
  node: Anomaly;
}

export interface ResolvedEffect {
  id: string;
  uniqueId: string;
  realStartTime: number;
  displayDuration: number;
  isConsumed: boolean;
  rowIndex: number;
  colIndex: number;
}

export interface ResolvedAction {
  id: string;
  trackIndex: number;
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
}
