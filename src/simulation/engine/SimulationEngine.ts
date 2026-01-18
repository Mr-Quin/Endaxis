import type { ResolvedTimeline } from "@/types/timeline.ts";
import type {
  EventHookContext,
  SimEvent,
  SimEventType,
  SimulationContext,
} from "../../types/simulation.ts";
import { PriorityQueue } from "@/simulation/engine/PriorityQueue.ts";
import type { EventHandler } from "@/simulation/events/EventHandler.ts";
import {GameState} from "@/simulation/state/GameState.ts";

export type EventHook = (event: SimEvent, ctx: EventHookContext) => void;

export class SimulationEngine {
  private queue = new PriorityQueue<SimEvent>();
  private handlers = new Map<SimEventType, EventHandler<SimEvent>>();
  private listeners = new Set<EventHook>();
  private state: GameState;

  constructor(initialState: GameState, private timeline: ResolvedTimeline) {
    this.state = initialState;
  }

  registerHandler<E extends SimEvent>(
    type: E["type"],
    handler: EventHandler<E>
  ) {
    this.handlers.set(type, handler);
  }

  subscribe(listener: EventHook): () => void {
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

  run() {
    const ctx: SimulationContext = {
      state: this.state,
      queue: { enqueue: this.enqueue.bind(this) },
      log: (e: SimEvent, msg: string) => {
        console.log(
          `[${this.state.getCurrentTime().toFixed(3)}] [${e.type}] ${msg}`
        );
      },
      getAction: this.getAction.bind(this),
    };

    while (!this.queue.isEmpty()) {
      const event = this.queue.dequeue()!;
      const beforeSnapshot = this.state.snapshot();

      if (event.time > this.state.getCurrentTime()) {
        const dt = event.time - this.state.getCurrentTime();
        this.state.advanceTime(dt);
      }

      const handler = this.handlers.get(event.type);
      if (handler) {
        handler.handle(event, ctx);
      } else {
        throw new Error(`No handler for event type: ${event.type}`);
      }

      const afterSnapshot = this.state.snapshot();

      this.listeners.forEach((listener) =>
        listener(event, {
          ...ctx,
          beforeSnapshot,
          afterSnapshot,
        })
      );
    }

    return this.state;
  }
}
