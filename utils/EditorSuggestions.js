const EMPTY = Object.freeze({});
const catalogues = new WeakMap();

export const getCurrentWordInfo = (text, cursorPosition) => {
  const match = text.substring(0, cursorPosition).match(/[a-zA-Z0-9_/@[\](){}-]+$/);
  return !match ? { word: "", start: cursorPosition }
    : { word: match[0], start: cursorPosition - match[0].length };
};

/** Build once per icon/tag snapshot, not once per key or once per input field. */
export function getSuggestionIndex(iconConfig, colorTagConfig) {
  const config = iconConfig && typeof iconConfig === "object" ? iconConfig : EMPTY;
  const tag = colorTagConfig && typeof colorTagConfig === "object" ? colorTagConfig : EMPTY;
  let byTag = catalogues.get(config);
  if (!byTag) { byTag = new WeakMap(); catalogues.set(config, byTag); }
  if (byTag.has(tag)) return byTag.get(tag);
  const terms = Object.keys(config.exact || {});
  for (const [prefix, value] of Object.entries(config.prefixes || {})) {
    if (value.allowPlain === true) terms.push(prefix);
    if (value.valueRange && typeof value.valueRange.min === "number" && typeof value.valueRange.max === "number") {
      for (let i = value.valueRange.min; i <= value.valueRange.max; i++) terms.push(`${prefix}(${i})`);
    }
  }
  const unique = Array.from(new Set(terms));
  const variantParents = new Set();
  for (const term of unique) {
    const low = term.toLowerCase();
    for (let i = low.indexOf("("); i !== -1; i = low.indexOf("(", i + 1)) variantParents.add(low.slice(0, i));
  }
  const colorNames = Object.keys(tag.preset || {});
  const index = unique.map((term) => {
    const low = term.toLowerCase();
    const allowed = tag.allow?.[term];
    const allowColors = allowed === true || (Array.isArray(allowed) && allowed.length > 0);
    const escaped = low.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return {
      term, low, hasVariants: variantParents.has(low), allowColors,
      inner: term.startsWith("[") && term.endsWith("]") ? term.slice(1, -1) : null,
      completed: new RegExp(`^${escaped}@\\[[^\\]]+\\](?:.+)?$`),
      partial: new RegExp(`^${escaped}@\\[[^\\]]*$`),
      colors: allowColors ? colorNames.filter((name) => !Array.isArray(allowed) || allowed.includes(name)) : [],
    };
  });
  byTag.set(tag, index);
  return index;
}

/** Preserve the old candidate order and 11-item limit. */
export function findSuggestions(word, index) {
  if (!word) return [];
  const low = word.toLowerCase();
  const out = new Set();
  for (const entry of index) {
    if ((entry.term === word && !entry.hasVariants && !entry.allowColors) || entry.completed.test(low)) continue;
    let match = entry.allowColors && entry.partial.test(low);
    if (!match) match = entry.low.startsWith(low);
    if (!match && entry.inner != null) {
      match = !(entry.inner === word && !entry.allowColors) && entry.inner.toLowerCase().startsWith(low);
    }
    if (!match) continue;
    out.add(entry.term);
    for (const color of entry.colors) out.add(`${entry.term}@[${color}]`);
    if (out.size >= 11) break;
  }
  return Array.from(out).slice(0, 11);
}
