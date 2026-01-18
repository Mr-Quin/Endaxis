import type { ResolvedTimeline } from "@/types/timeline.ts";
import type {
  SimEvent,
  SimEventType,
  SimulationContext,
  SimLogEntry,
  EventHookContext,
} from "../../types/simulation.ts";
import { PriorityQueue } from "@/simulation/engine/PriorityQueue.ts";
import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import { GameState } from "@/simulation/state/GameState.ts";

type SimEventHook = (event: SimEvent, ctx: EventHookContext) => void;

export class SimulationEngine {
  private queue = new PriorityQueue<SimEvent>();
  private handlers = new Map<SimEventType, EventHandler<SimEvent>>();
  private listeners = new Set<SimEventHook>();
  private state: GameState;
  private simLog = new PriorityQueue<SimLogEntry>();

  constructor(initialState: GameState, private timeline: ResolvedTimeline) {
    this.state = initialState;
  }

  getState() {
    return this.state;
  }

  registerHandler<E extends SimEvent>(
    type: E["type"],
    handler: EventHandler<E>
  ) {
    this.handlers.set(type, handler);
  }

  subscribe(listener: SimEventHook): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  enqueue(event: SimEvent) {
    this.queue.enqueue(event);
  }

  getAction(id: string) {
    return this.timeline.actionMap.get(id);
  }

  getSimLog(): SimLogEntry[] {
    return this.simLog.toArray();
  }

  run() {
    const ctx: SimulationContext = {
      state: this.state,
      queue: { enqueue: this.enqueue.bind(this) },
      simLog: (entry: SimLogEntry) => {
        this.simLog.enqueue(entry);
      },
      getAction: this.getAction.bind(this),
    };

    while (!this.queue.isEmpty()) {
      const event = this.queue.dequeue()!;

      if (event.time > this.state.getCurrentTime()) {
        const dt = event.time - this.state.getCurrentTime();
        this.state.advanceTime(dt);
        // TODO: may need emit simLog events for state changes
      }

      const handler = this.handlers.get(event.type);
      if (handler) {
        handler.handle(event, ctx);
      } else {
        throw new Error(`No handler for event type: ${event.type}`);
      }
    }

    return this.state;
  }
}
