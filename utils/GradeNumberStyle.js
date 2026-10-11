import { getNationGradePreset } from "./store/GradeColorPresets.js";

// Appearance of the grade digit only; never change grade/rules/nation data here.
export const DEFAULT_GRADE_NUMBER_COLOR = "#ffffff";

export const isGradeColor = (color) =>
  typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color);

export const createDefaultGradeNumberStyle = () => ({
  mode: "default",
  color: DEFAULT_GRADE_NUMBER_COLOR,
  presetId: null,
});

// Store the user's intent, not a cached copy of the current nation's color.
export const createNationGradeNumberStyle = () => ({ mode: "nation" });

/** Old missing fields stay white; valid older fixed-color snapshots are preserved. */
export function normalizeGradeNumberStyle(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createDefaultGradeNumberStyle();
  }
  if (value.mode === "nation") return createNationGradeNumberStyle();
  if (!["custom", "preset"].includes(value.mode) || !isGradeColor(value.color)) {
    return createDefaultGradeNumberStyle();
  }
  const presetId = typeof value.presetId === "string" ? value.presetId.trim() : "";
  const hasPreset = value.mode === "preset" && presetId &&
    !["default", "custom", "nation"].includes(presetId);
  return {
    mode: hasPreset ? "preset" : "custom",
    color: value.color.toLowerCase(),
    presetId: hasPreset ? presetId : null,
  };
}

/** Pure lookup at render time: a nation change never causes a second state/effect update. */
export function getGradeNumberFill(value, selectedNation = null, customNationEnabled = false) {
  const style = normalizeGradeNumberStyle(value);
  if (style.mode === "nation") {
    // Custom Nation retains the old selectedNation in state. Do not accidentally reuse it.
    if (customNationEnabled) return "white";
    return getNationGradePreset(selectedNation)?.color.toLowerCase() ?? "white";
  }
  return style.mode === "default" ? "white" : style.color;
}
