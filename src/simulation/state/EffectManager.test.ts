import { describe, it, expect, beforeEach } from "vitest";
import { EffectManager } from "./EffectManager";
import { EffectDefinition } from "../effects/Effect";

describe("EffectManager", () => {
  let manager: EffectManager;

  beforeEach(() => {
    manager = new EffectManager({ id: "owner", type: "PLAYER" });
  });

  it("添加状态", () => {
    const effect = new EffectDefinition({
      id: "test_buff",
      name: "Test Buff",
      tags: ["ELEMENT_HEAT"],
    });

    manager.add(effect, { id: "source", type: "PLAYER" }, 0);

    expect(manager.getAll().length).toBe(1);
    expect(manager.hasTag("ELEMENT_HEAT")).toBe(true);
  });

  it("叠加状态", () => {
    const effect1 = new EffectDefinition({
      id: "stacking_buff",
      name: "Stacking Buff",
      tags: ["ELEMENT_HEAT"],
      maxStacks: 4,
    });

    const effect2 = new EffectDefinition({
      id: "stacking_buff",
      name: "Stacking Buff",
      tags: ["ELEMENT_HEAT"],
      maxStacks: 4,
    });

    manager.add(effect1, { id: "source", type: "PLAYER" }, 0);
    expect(manager.getAll()[0]?.currentStacks).toBe(1);

    manager.add(effect2, { id: "source", type: "PLAYER" }, 1);
    expect(manager.getAll()).toHaveLength(1);
    expect(manager.getAll()[0]?.currentStacks).toBe(2);
  });

  it("移除状态", () => {
    const effect = new EffectDefinition({
      id: "temp_buff",
      name: "Temp Buff",
      tags: ["ELEMENT_HEAT"],
    });

    const inst = manager.add(effect, { id: "source", type: "PLAYER" }, 0);
    expect(manager.hasTag("ELEMENT_HEAT")).toBe(true);

    manager.remove(inst.id);
    expect(manager.getAll().length).toBe(0);
    expect(manager.hasTag("ELEMENT_HEAT")).toBe(false);
  });
});
