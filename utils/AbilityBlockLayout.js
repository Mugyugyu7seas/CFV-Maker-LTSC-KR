// CFV hide-explanations and SEC UI v1
import { ABILITY_WINDOW_SPACING } from './store/AbilityWindowSpacing.js';

// Legacy estimates are used only before a background image can be measured.
// Do not change these to tune gaps. Edit AbilityWindowSpacing.js instead.
export const ABILITY_BOX_LINE_PITCH = 17;
export const ABILITY_BOX_SLOT_PADDING = 22;
const FALLBACK_FRAME_PADDING = 4;
const FALLBACK_PORTRAIT_BOTTOM = 500;
const FALLBACK_CREST_CENTER = 200;

const finiteGap = (value, fallback) =>
  Number.isFinite(value) && value >= 0 ? value : fallback;

function validBounds(bounds, width, height) {
  return bounds && bounds.canvasWidth === width && bounds.canvasHeight === height &&
    Number.isFinite(bounds.top) && Number.isFinite(bounds.bottom) &&
    bounds.top >= 0 && bounds.bottom <= height && bounds.bottom > bounds.top;
}

export function getAbilityBlockLayout(blocks, measurements, {
  isUnit = false,
  isCrest = false,
  isEnergy = false,
  maxLines = 14,
  windowGap = ABILITY_WINDOW_SPACING.windowGap,
} = {}) {
  const gap = finiteGap(windowGap, ABILITY_WINDOW_SPACING.windowGap);
  const canvasWidth = isCrest ? 584 : 400;
  const canvasHeight = isCrest ? 400 : 584;
  const backgroundBaseY = isCrest || isUnit ? 0 : 21.5;
  const textBaseY = isCrest ? 197 : isUnit ? 492 : 513.5;
  const active = isEnergy ? [] : blocks.filter((block) => block.text.trim());
  const items = active.map((block) => {
    const m = measurements[block.id];
    const measured = !!m && m.text === block.text &&
      (m.hideExplanations === true) === (block.hideExplanations === true);
    // Preserve the last measured rows AND image bounds during an edit/load.
    // Geometry belongs to a stable window ID; its stack position does not.
    const hasPreviousLineCount = Number.isInteger(m?.lineCount) && m.lineCount > 0;
    const lineCount = measured && m.lineCount === 0 ? 0
      : hasPreviousLineCount ? m.lineCount
      : Math.max(1, block.text.split('\n').length);
    const heightEstimate = lineCount * ABILITY_BOX_LINE_PITCH + FALLBACK_FRAME_PADDING;
    const imageBounds = validBounds(m?.backgroundBounds, canvasWidth, canvasHeight)
      ? m.backgroundBounds : null;
    const rawBottom = imageBounds ? imageBounds.bottom
      : isCrest ? FALLBACK_CREST_CENTER + heightEstimate / 2 : FALLBACK_PORTRAIT_BOTTOM;
    const rawTop = imageBounds ? imageBounds.top : rawBottom - heightEstimate;
    const frameHeight = rawBottom - rawTop;
    return {
      block,
      lineCount,
      ready: measured && m.backgroundReady !== false,
      widthOverflow: measured && m.widthOverflow,
      geometrySource: imageBounds ? 'image' : 'estimate',
      rawTop,
      rawBottom,
      frameHeight,
      // Keep this legacy field for callers/tests; do not use it as a flavour gap.
      slotHeight: frameHeight + gap,
    };
  }).filter(item => item.lineCount > 0);
  const height = items.reduce((sum, item) => sum + item.frameHeight, 0) +
    Math.max(0, items.length - 1) * gap;
  const positioned = new Array(items.length);

  if (isCrest) {
    // Original crest assets are centred around a common anchor. The union of
    // their unshifted bounds is independent of insertion/reorder history, and
    // preserves the exact old placement for a single window.
    const centre = items.length
      ? (Math.min(...items.map(i => i.rawTop)) + Math.max(...items.map(i => i.rawBottom))) / 2
      : FALLBACK_CREST_CENTER;
    let top = centre - height / 2;
    items.forEach((item, index) => {
      const shift = top - item.rawTop;
      positioned[index] = {
        ...item, shift,
        backgroundY: backgroundBaseY + shift,
        textY: textBaseY + shift,
        top: top + backgroundBaseY,
        bottom: top + backgroundBaseY + item.frameHeight,
      };
      top += item.frameHeight + gap;
    });
  } else {
    // Never move the bottom window away from its existing card-name anchor.
    // Every preceding window is placed from the NEXT visible window's top.
    let nextTop = null;
    for (let index = items.length - 1; index >= 0; index--) {
      const item = items[index];
      const shift = nextTop === null ? 0
        : nextTop - gap - backgroundBaseY - item.rawBottom;
      const top = backgroundBaseY + shift + item.rawTop;
      const bottom = backgroundBaseY + shift + item.rawBottom;
      positioned[index] = {
        ...item, shift,
        backgroundY: backgroundBaseY + shift,
        textY: textBaseY + shift,
        top, bottom,
      };
      nextTop = top;
    }
  }
  const totalLines = items.reduce((sum, item) => sum + item.lineCount, 0);
  const slotHeight = items.length ? height + gap : 0;
  const availableHeight = maxLines * ABILITY_BOX_LINE_PITCH + ABILITY_BOX_SLOT_PADDING;
  return {
    items: positioned,
    totalLines,
    height,
    slotHeight,
    availableHeight,
    top: positioned[0]?.top ?? null,
    bottom: positioned.at(-1)?.bottom ?? null,
    topWindowId: positioned[0]?.block.id ?? null,
    ready: items.every(item => item.ready),
    overflow: slotHeight > availableHeight || items.some(item => item.lineCount > maxLines || item.widthOverflow),
    // Compatibility/reporting only. The flavour position no longer uses this.
    flavorEquivalentLines: totalLines + Math.max(0, items.length - 1) * 1.25,
  };
}

/**
 * The only flavour-to-ability gap is between the current visible stack top
 * and the flavour background. No window stores/inherits an extra flavour gap.
 * parentY removes the outer flavour Group's order-card offset exactly once.
 */
export function getAbilityFlavorY(layout, {
  flavorBoxHeight,
  parentY = 0,
  emptyY = 0,
  flavorGap = ABILITY_WINDOW_SPACING.flavorGap,
} = {}) {
  if (!layout?.items?.length || !Number.isFinite(layout.top)) return emptyY;
  const gap = finiteGap(flavorGap, ABILITY_WINDOW_SPACING.flavorGap);
  const boxHeight = Number.isFinite(flavorBoxHeight) ? Math.max(0, flavorBoxHeight) : 0;
  return layout.top - gap - boxHeight - parentY;
}
