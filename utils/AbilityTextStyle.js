/**
 * ONE appearance policy for card SP and the per-window "SP text" switch.
 * Text, underlines and icon masks share the outline color and opacity below.
 * SP icon art uses the existing Encounter (dark) appearance on every card.
 * This module does NOT change fonts, spacing, icon dimensions or box visibility.
 */
export const SP_ABILITY_TEXT_STYLE = Object.freeze({
  fill: "white",
  stroke: "black",
  strokeWidth: 1.5,
  strokeOpacity: 1,
  underlineStrokeWidth: 2,
});

export const usesSpAbilityText = ({ fullArt = false, useSpTextStyle = false } = {}) =>
  fullArt === true || useSpTextStyle === true;

/** Preserve explicit red markup. Annotation changes font, not the default ink. */
export function getAbilityTextColor(node, { dark = false, spText = false } = {}) {
  if (node.color === "#ff0000") return "#ff0000";
  if (spText) return SP_ABILITY_TEXT_STYLE.fill;
  if (node.annotation) return dark ? "white" : "black";
  return node.color || (dark ? "white" : "black");
}

/** A back layer with only the outline; the foreground glyph remains opaque. */
export const getAbilityTextOutline = (spText) => spText ? {
  stroke: SP_ABILITY_TEXT_STYLE.stroke,
  strokeWidth: SP_ABILITY_TEXT_STYLE.strokeWidth,
  opacity: SP_ABILITY_TEXT_STYLE.strokeOpacity,
  fillEnabled: false,
  listening: false,
  lineJoin: "round",
} : null;

export const getAbilityUnderlineOutline = (spText) => spText ? {
  stroke: SP_ABILITY_TEXT_STYLE.stroke,
  strokeWidth: SP_ABILITY_TEXT_STYLE.underlineStrokeWidth,
  opacity: SP_ABILITY_TEXT_STYLE.strokeOpacity,
  listening: false,
} : null;


/**
 * Rendering-only flag for icon asset/tint lookup. Never use this flag for
 * ParseTokens/getFontStyle/line measurement: SP must not reflow the text.
 */
export const getAbilityIconAppearance = ({ dark = false, spText = false } = {}) => ({
  dark: spText === true || dark === true,
});

/** The _s mask already supplies the outline shape; only its ink is shared. */
export const getAbilityIconOutline = (spText) => spText ? {
  color: SP_ABILITY_TEXT_STYLE.stroke,
  opacity: SP_ABILITY_TEXT_STYLE.strokeOpacity,
} : null;
