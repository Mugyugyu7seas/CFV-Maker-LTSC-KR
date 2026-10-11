import { isAbilityColor } from "../AbilityBlocks.js";

/**
 * Add permanent, unique IDs here; do not use "default" or "custom" as an ID.
 * color: 6-digit #RRGGBB. The original box PNG still supplies its alpha.
 * useSpTextStyle: optional boolean. If omitted, keep the window's current switch.
 * Selecting a preset COPIES its color and optional text-style choice into the
 * card. Editing this catalogue does not recolor previously saved cards.
 *
 * "Red" below is #BB3A3A from the user's screenshot, NOT a verified official
 * card preset. Replace/add names and colors after comparison with references.
 */
export const ABILITY_BOX_PRESETS = [
  {
    id: "user-red-ca7b77",
    label: "Dragon Empire",
    color: "#ca7b77",
    useSpTextStyle: false,
  },
  {
    id: "user-blue-757bab",
    label: "Dark States",
    color: "#757bab",
    useSpTextStyle: false,
  },
  {
    id: "user-gray-cfd0d7",
    label: "Brandt Gate",
    color: "#cfd0d7",
    useSpTextStyle: false,
  },
  {
    id: "user-yellow-e6e17c",
    label: "Keter Sanctuary",
    color: "#e6e17c",
    useSpTextStyle: false,
  },
  {
    id: "user-green-71a590",
    label: "Stoicheia",
    color: "#71a590",
    useSpTextStyle: false,
  },
  {
    id: "user-pink-e7b2bc",
    label: "Lyrical Monasterio",
    color: "#e7b2bc",
    useSpTextStyle: false,
  },
];

/** Fail explicitly instead of storing a malformed or ambiguous preset. */
export function validateAbilityBoxPresets(presets = ABILITY_BOX_PRESETS) {
  if (!Array.isArray(presets)) throw new TypeError("Ability presets must be an array.");
  const ids = new Set(["default", "custom"]);
  for (const preset of presets) {
    if (!preset || typeof preset.id !== "string" || !preset.id.trim() || ids.has(preset.id)) {
      throw new TypeError("Ability preset IDs must be unique and cannot be 'default' or 'custom'.");
    }
    ids.add(preset.id);
    if (typeof preset.label !== "string" || !preset.label.trim() || !isAbilityColor(preset.color)) {
      throw new TypeError(`Ability preset '${preset.id}' needs a label and a #RRGGBB color.`);
    }
    if (preset.useSpTextStyle != null && typeof preset.useSpTextStyle !== "boolean") {
      throw new TypeError(`Ability preset '${preset.id}' useSpTextStyle must be true or false.`);
    }
  }
  return presets;
}

/** Save appearance snapshots rather than resolving saved cards from the catalogue. */
export function getAbilityPresetPatch(preset, block) {
  validateAbilityBoxPresets([preset]);
  return {
    background: { mode: "preset", presetId: preset.id, color: preset.color.toLowerCase() },
    useSpTextStyle: preset.useSpTextStyle ?? (block.useSpTextStyle === true),
  };
}
