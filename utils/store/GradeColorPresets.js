import { normalizeHexColor } from "../ColorInput.js";

/**
 * Grade digit colors supplied by the user, not inferred official color values.
 * `nation` is the stable selectedNation value from CardConstants.js, not a UI label.
 * Keep these IDs/colors when editing labels. SP text settings do not apply to grade digits.
 * Dual-nation selection/split rendering is intentionally deferred.
 */
export const GRADE_COLOR_PRESETS = [
  { nation: "red.png", id: "user-red-c40018", label: "Dragon Empire", color: "#c40018" },
  { nation: "blue.png", id: "user-blue-062c87", label: "Dark States", color: "#062c87" },
  { nation: "gray.png", id: "user-gray-abb3bf", label: "Brandt Gate", color: "#abb3bf" },
  { nation: "yellow.png", id: "user-yellow-fcc600", label: "Keter Sanctuary", color: "#fcc600" },
  { nation: "green.png", id: "user-green-007c36", label: "Stoicheia", color: "#007c36" },
  { nation: "pink.png", id: "user-pink-eb6c99", label: "Lyrical Monasterio", color: "#eb6c99" },
];

const isPresetColor = (color) =>
  typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color) &&
  normalizeHexColor(color, false) !== null;

export function validateGradeColorPresets(presets = GRADE_COLOR_PRESETS) {
  if (!Array.isArray(presets)) throw new TypeError("Grade color presets must be an array.");
  const ids = new Set(["default", "custom", "nation"]);
  const nations = new Set();
  for (const preset of presets) {
    if (!preset || typeof preset.id !== "string" || !preset.id.trim() ||
        preset.id !== preset.id.trim() || ids.has(preset.id)) {
      throw new TypeError("Grade color preset IDs must be unique and cannot be 'default', 'custom' or 'nation'.");
    }
    if (typeof preset.label !== "string" || !preset.label.trim() || !isPresetColor(preset.color)) {
      throw new TypeError(`Grade color preset '${preset.id}' needs a label and a #RRGGBB color.`);
    }
    if (preset.nation != null) {
      if (typeof preset.nation !== "string" || !preset.nation.trim() ||
          preset.nation !== preset.nation.trim() || nations.has(preset.nation)) {
        throw new TypeError("Each nation must have one unambiguous grade color preset.");
      }
      nations.add(preset.nation);
    }
    ids.add(preset.id);
  }
  return presets;
}

/** Kept for historical template/tool callers; there is no custom color picker in the new UI. */
export function getGradePresetStyle(preset) {
  validateGradeColorPresets([preset]);
  return { mode: "preset", presetId: preset.id, color: preset.color.toLowerCase() };
}

/** Resolve only an explicit nation ID; never guess by file-name color, order or translated label. */
export function getNationGradePreset(nation, presets = GRADE_COLOR_PRESETS) {
  if (typeof nation !== "string" || !Array.isArray(presets)) return null;
  return presets.find((preset) => preset?.nation === nation && isPresetColor(preset.color)) ?? null;
}
