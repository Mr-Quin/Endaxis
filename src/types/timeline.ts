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
  allowedTypes: string[];
  damageTicks: DamageTick[];
  physicalAnomaly: Anomaly[];
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
  uniqueId: string; // generated ID for v-for keys

  // LOGIC
  realStartTime: number;
  displayDuration: number;
  isConsumed: boolean;

  // DATA
  data: any; // The original effect object

  // GRID (Preserved for visual stacking)
  rowIndex: number;
  colIndex: number;
  // barWidth: number; // Removed: Logic layer should not know about pixels. Use displayDuration.
  extensionAmount?: number;
}

export interface ResolvedAction {
  id: string;
  trackIndex: number;

  // TIME (In Seconds)
  gameStartTime: number;
  realStartTime: number; // Includes freeze offsets
  realDuration: number;

  // LAYOUT FLAGS
  isInterrupted: boolean;

  // FLATTENED EFFECTS (No more nested arrays)
  effects: ResolvedEffect[];

  // LOGIC
  triggerWindow: {
    hasWindow: boolean;
    startTime: number;
    duration: number;
    rect?: { width: number }; // Optional layout info if needed
  };

  // Original Node Reference (for access to other props)
  originalNode: any;
}

export interface ResolvedTimeline {
  actions: ResolvedAction[];
  // Metadata for the whole fight
  meta: {
    totalDuration: number;
    totalDamage: number;
  };
  extensions: Array<{
    time: number; // Physical Start Time
    gameTime: number; // Logical Start Time
    amount: number; // Duration
    sourceId: string;
    cumulativeFreezeTime: number;
  }>;
}
