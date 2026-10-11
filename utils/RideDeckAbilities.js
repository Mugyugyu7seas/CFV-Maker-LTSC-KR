import { createAbilityBlock } from "./AbilityBlocks.js";

/** Optional template preference. Never infer it from SP or another window. */
export function normalizeRideDeckHideExplanations(value) {
  if (value != null && typeof value !== "boolean") {
    throw new TypeError("rideDeckHideExplanations must be true or false.");
  }
  return value === true;
}

/**
 * A render-only block for the fixed ride-deck template. The source is kept
 * intact; the existing annotation filter runs before text measurement.
 * Do not store this block over state.abilityBlocks or state.abilities.
 */
export function createRideDeckAbilityBlocks(templateText = "", hideExplanations = false) {
  if (typeof templateText !== "string") {
    throw new TypeError("The ride deck crest template must be a string.");
  }
  return [{
    ...createAbilityBlock("ride-deck-crest-fixed", templateText),
    hideExplanations: normalizeRideDeckHideExplanations(hideExplanations),
  }];
}
