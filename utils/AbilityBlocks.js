// CFV hide-explanations and SEC UI v1
export const MAX_ABILITY_BLOCKS = 5;
export const ABILITY_BLOCKS_VERSION = 1;

const LEGACY_SPLIT_TYPES = new Set([
  "base_normal_order.png", "base_blitz.png", "base_set.png",
  "base_set.png/token", "base_trigger_o.png", "base_blitz_trigger_o.png",
  "base_set_trigger_o.png",
]);

export const isAbilityColor = (value) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

/** IDs are created on add/import, never during a React render. */
export const createAbilityBlock = (id = globalThis.crypto?.randomUUID?.() ??
  `ability-${Date.now()}-${Math.random().toString(36).slice(2)}`, text = "") => ({
  id,
  text,
  useSpTextStyle: false,
  hideExplanations: false,
  background: { mode: "default", presetId: null, color: "#ffffff" },
});

export function normalizeAbilityBlocks(value) {
  if (!Array.isArray(value)) throw new TypeError("Ability windows must be an array.");
  if (value.length > MAX_ABILITY_BLOCKS) {
    throw new RangeError(`A maximum of ${MAX_ABILITY_BLOCKS} ability windows is supported. Import stopped rather than discarding any of the ${value.length} windows.`);
  }
  if (!value.length) return [createAbilityBlock("ability-1")];
  const usedIds = new Set();
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || typeof raw.text !== "string") {
      throw new TypeError(`Ability window ${index + 1} must have string text.`);
    }
    if (raw.useSpTextStyle != null && typeof raw.useSpTextStyle !== "boolean") {
      throw new TypeError(`Ability window ${index + 1} useSpTextStyle must be true or false.`);
    }
    if (raw.hideExplanations != null && typeof raw.hideExplanations !== "boolean") {
      throw new TypeError(`Ability window ${index + 1} hideExplanations must be true or false.`);
    }
    let id = typeof raw.id === "string" && raw.id.trim() ? raw.id : `ability-${index + 1}`;
    while (usedIds.has(id)) id += "-copy";
    usedIds.add(id);
    const bg = raw.background ?? { mode: "default" };
    if (!bg || typeof bg !== "object" || !["default", "preset", "custom"].includes(bg.mode)) {
      throw new TypeError(`Ability window ${index + 1} has an invalid background mode.`);
    }
    if (bg.mode === "preset" && (typeof bg.presetId !== "string" || !bg.presetId.trim())) {
      throw new TypeError(`Ability window ${index + 1} is missing its preset ID.`);
    }
    if (bg.mode !== "default" && !isAbilityColor(bg.color)) {
      throw new TypeError(`Ability window ${index + 1} background color must use #RRGGBB.`);
    }
    return {
      ...raw,
      id,
      useSpTextStyle: raw.useSpTextStyle === true,
      hideExplanations: raw.hideExplanations === true,
      text: raw.text.replace(/\r\n?/g, "\n"),
      background: {
        mode: bg.mode,
        presetId: typeof bg.presetId === "string" ? bg.presetId : null,
        color: isAbilityColor(bg.color) ? bg.color.toLowerCase() : "#ffffff",
      },
    };
  });
}

/** Legacy blank-line splitting is used ONLY while reading a legacy template. */
export function migrateLegacyAbilities(abilities, selectedType) {
  const text = typeof abilities === "string" ? abilities.replace(/\r\n?/g, "\n") : "";
  if (!LEGACY_SPLIT_TYPES.has(selectedType)) {
    return [createAbilityBlock("ability-1", text)];
  }
  const parts = [];
  let current = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) {
      if (current.length) parts.push(current.join("\n"));
      current = [];
    } else current.push(line);
  }
  if (current.length) parts.push(current.join("\n"));
  return normalizeAbilityBlocks((parts.length ? parts : [""]).map((part, i) =>
    createAbilityBlock(`ability-${i + 1}`, part)));
}

/**
 * Older makers have at most two boxes. Keep all text in a single legacy field
 * without blank-line separators; only the new array preserves boxes/colours.
 */
export const getLegacyAbilityText = (blocks) => blocks
  .map((block) => block.text.split("\n").filter((line) => line.trim()).join("\n"))
  .filter(Boolean).join("\n");

export function normalizeAbilityData(card) {
  if (card.abilityBlocksVersion != null && card.abilityBlocksVersion !== ABILITY_BLOCKS_VERSION) {
    throw new TypeError(`Unsupported ability window version: ${card.abilityBlocksVersion}`);
  }
  if (card.abilityBlocksVersion != null && !Object.hasOwn(card, "abilityBlocks")) {
    throw new TypeError("An ability window version was provided without an ability window list.");
  }
  const blocks = Object.hasOwn(card, "abilityBlocks")
    ? normalizeAbilityBlocks(card.abilityBlocks)
    : migrateLegacyAbilities(card.abilities, card.selectedType);
  return {
    ...card,
    abilityBlocksVersion: ABILITY_BLOCKS_VERSION,
    abilityBlocks: blocks,
    abilities: getLegacyAbilityText(blocks),
  };
}

/** Preset colours are resolved from the saved snapshot, not from today's catalogue. */
export const getAbilityBackgroundColor = (block) =>
  block.background?.mode === "default" ? null : block.background?.color;

/** Constant RGB tint with the original per-pixel alpha untouched. */
export function tintAbilityImageData(imageData, color) {
  if (!isAbilityColor(color)) throw new TypeError("Invalid ability background colour");
  const rgb = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
  }
  return imageData;
}

/** Normalize at the state boundary, retaining references for unchanged windows. */
export function reconcileAbilityBlocks(previous, value) {
  const normalized = normalizeAbilityBlocks(value);
  const byId = new Map(previous.map((block) => [block.id, block]));
  const sameFields = (a, b, excluded = null) => {
    const keys = Object.keys(a).filter((key) => key !== excluded);
    return keys.length === Object.keys(b).filter((key) => key !== excluded).length &&
      keys.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]));
  };
  const next = normalized.map((block) => {
    const old = byId.get(block.id);
    return old && sameFields(old, block, "background") &&
      sameFields(old.background, block.background) ? old : block;
  });
  return next.length === previous.length && next.every((block, i) => block === previous[i])
    ? previous : next;
}
