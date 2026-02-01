import { EffectDefinition } from "./Effect";

export const AfflictionEffectMap = {
  PHYSICAL_VULNERABLE: EffectDefinition.PhysicalVulnerable(),
  PHYSICAL_KNOCK_DOWN: EffectDefinition.PhysicalKnockDown(),
  PHYSICAL_LIFT: EffectDefinition.PhysicalLift(),
  PHYSICAL_BREACH: EffectDefinition.PhysicalBreach(),
  PHYSICAL_CRUSH: EffectDefinition.PhysicalCrush(),
  ELEMENT_HEAT: EffectDefinition.ElementHeat(),
  ELEMENT_CRYO: EffectDefinition.ElementCryo(),
  ELEMENT_ELECTRIC: EffectDefinition.ElementElectric(),
  ELEMENT_NATURE: EffectDefinition.ElementNature(),
  ELEMENT_COMBUSTION: EffectDefinition.ElementCombustion(),
  ELEMENT_ELECTRIFICATION: EffectDefinition.ElementElectrification(),
  ELEMENT_SOLIDIFICATION: EffectDefinition.ElementSolidification(),
  ELEMENT_CORROSION: EffectDefinition.ElementCorrosion(),
  ELEMENT_HEAT_BURST: EffectDefinition.ElementHeatBurst(),
  ELEMENT_CRYO_BURST: EffectDefinition.ElementCryoBurst(),
  ELEMENT_ELECTRIC_BURST: EffectDefinition.ElementElectricBurst(),
  ELEMENT_NATURE_BURST: EffectDefinition.ElementNatureBurst(),
} as const;
