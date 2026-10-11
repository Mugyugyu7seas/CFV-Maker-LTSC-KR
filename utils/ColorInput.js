// A text field may be incomplete; a graphical color picker must always get valid HEX.
export const DEFAULT_COLOR_INPUT = "#ffffff";

export function normalizeHexColor(value, allowShort = true) {
  if (typeof value !== "string") return null;
  const hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`;
  if (allowShort && /^[0-9a-f]{3}$/i.test(hex)) {
    return `#${hex.split("").map((char) => char + char).join("").toLowerCase()}`;
  }
  return null;
}

export function createColorInputState(color) {
  const selected = normalizeHexColor(color) ?? DEFAULT_COLOR_INPUT;
  return { source: selected, selected, draft: selected, revision: 0 };
}

/** Reconcile an external value without feeding a stale effect back into the picker. */
export function syncColorInputState(state, color) {
  const source = normalizeHexColor(color) ?? DEFAULT_COLOR_INPUT;
  if (source === state.source) return state;
  // An acknowledgement of our own edit must not replace the text under the caret.
  return {
    source,
    revision: source === state.selected ? state.revision : state.revision + 1,
    selected: source,
    draft: source === state.selected ? state.draft : source,
  };
}

export function editColorInputState(state, draft) {
  // Three-digit shorthand is committed only on Enter/blur, not halfway through typing six digits.
  const selected = normalizeHexColor(draft, false) ?? state.selected;
  if (state.draft === draft && state.selected === selected) return state;
  return { ...state, draft, selected,
    revision: selected === state.selected ? state.revision : state.revision + 1 };

}
