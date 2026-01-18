import type { SimEvent, SimulationContext } from "@/types/simulation.ts";

export interface EventHandler<E extends SimEvent> {
  handle(event: E, ctx: SimulationContext): void;
}
