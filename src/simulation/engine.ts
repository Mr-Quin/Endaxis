import type {
  SimEvent,
  // WorldState,
  SimulationContext,
  SimEventType,
} from "../types/simulation";
import { GameState } from "./state";

export interface EventHandler<E extends SimEvent> {
  handle(event: E, ctx: SimulationContext): void;
}

export type EventHook = (event: SimEvent, ctx: SimulationContext) => void;

class PriorityQueue<T extends { time: number }> {
  private items: T[] = [];

  enqueue(item: T) {
    this.items.push(item);
    this.items.sort((a, b) => a.time - b.time);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  peek(): T | undefined {
    return this.items[0];
  }
}

export class SimulationEngine {
  private queue = new PriorityQueue<SimEvent>();
  private handlers = new Map<SimEventType, EventHandler<SimEvent>>();
  private listeners = new Set<EventHook>();
  private state: GameState;

  // Function called when time advances (for regen, dots, etc.)
  private onTimeAdvance?: (dt: number, ctx: SimulationContext) => void;

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  registerHandler<E extends SimEvent>(
    type: E["type"],
    handler: EventHandler<E>
  ) {
    this.handlers.set(type, handler);
  }

  subscribe(listener: EventHook) {
    this.listeners.add(listener);
  }

  setTimeAdvanceCallback(cb: (dt: number, ctx: SimulationContext) => void) {
    this.onTimeAdvance = cb;
  }

  enqueue(event: SimEvent) {
    this.queue.enqueue(event);
  }

  run() {
    const ctx: SimulationContext = {
      state: this.state,
      queue: { enqueue: this.enqueue.bind(this) },
      log: (e: SimEvent, msg: string) => {
        console.log(
          `[${this.state.getCurrentTime().toFixed(3)}] [${e.type}] ${msg}`
        );
      },
    };

    while (!this.queue.isEmpty()) {
      const event = this.queue.dequeue()!;

      // 1. Advance Time
      if (event.time > this.state.getCurrentTime()) {
        const dt = event.time - this.state.getCurrentTime();
        this.state.advanceTime(dt);
      }

      // 2. Handle Event
      const handler = this.handlers.get(event.type);
      if (handler) {
        handler.handle(event, ctx);
      } else {
        throw new Error(`No handler for event type: ${event.type}`);
      }

      // 3. Notify Listeners
      this.listeners.forEach((listener) => listener(event, ctx));
    }

    return this.state;
  }
}
