import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAbilityBlock, normalizeAbilityBlocks, normalizeAbilityData,
  getAbilityBackgroundColor, ABILITY_BLOCKS_VERSION,
} from '../utils/AbilityBlocks.js';
import { normalizeCardData } from '../utils/CardFormat.js';
import {
  SP_ABILITY_TEXT_STYLE, usesSpAbilityText, getAbilityTextColor,
  getAbilityTextOutline, getAbilityUnderlineOutline,
} from '../utils/AbilityTextStyle.js';
import {
  ABILITY_BOX_PRESETS, validateAbilityBoxPresets, getAbilityPresetPatch,
} from '../utils/store/AbilityBoxPresets.js';
import { ABILITY_EDITOR_TEXT } from '../utils/store/AbilityEditorText.js';
import { layoutAbilities } from '../components/editor/text/LayoutAbilities.js';
import { getAbilityBlockLayout } from '../utils/AbilityBlockLayout.js';

const block = (id = 'a', text = '기존 본문\n\n주석 *주석*') => createAbilityBlock(id, text);
const config = { exact: { AUTO: { src: '/test-auto.png', iconHeight: 11 } }, prefixes: {} };
const measureText = (text) => [...text].reduce((w, c) => w + (c === ' ' ? 3 : 6), 0);
// Keep color/SP copying and saved snapshots independent of catalogue contents.
const redPreset = { id: 'user-red-bb3a3a', label: 'Red', color: '#BB3A3A', useSpTextStyle: true };

for (const fullArt of [false, true]) {
  for (const local of [false, true]) {
    test(`SP style policy fullArt=${fullArt}, local=${local}`, () => {
      const spText = usesSpAbilityText({ fullArt, useSpTextStyle: local });
      assert.equal(spText, fullArt || local);
      const ink = getAbilityTextColor({ color: 'black' }, { spText });
      assert.equal(ink, spText ? 'white' : 'black');
    });
  }
}

test('Missing or null local flag is off; existing v1 schema is retained', () => {
  for (const value of [undefined, null]) {
    const [b] = normalizeAbilityBlocks([{ ...block(), useSpTextStyle: value }]);
    assert.equal(b.useSpTextStyle, false);
  }
  assert.equal(ABILITY_BLOCKS_VERSION, 1);
  assert.equal(createAbilityBlock().useSpTextStyle, false);
});

test('Legacy and pre-toggle multi-window templates default local flags to false', () => {
  const legacy = normalizeCardData({ selectedType: 'base_blitz.png', abilities: 'one\n\ntwo' });
  assert.equal(legacy.abilityBlocks.length, 2);
  assert.ok(legacy.abilityBlocks.every(b => b.useSpTextStyle === false));
  const oldV1 = { abilityBlocksVersion: 1, abilityBlocks: [{ id: 'a', text: 'abc' }] };
  assert.equal(normalizeCardData(oldV1).abilityBlocks[0].useSpTextStyle, false);
});

test('Malformed text-style flags are rejected rather than coerced', () => {
  for (const value of ['true', 'false', 0, 1, {}, []]) {
    assert.throws(() => normalizeAbilityBlocks([{ ...block(), useSpTextStyle: value }]), /useSpTextStyle must be true or false/);
  }
});

test('All five flags, colors and strings survive serialization and normalization', () => {
  const blocks = Array.from({ length: 5 }, (_, i) => ({
    ...block(`id-${i}`, `AUTO __본문${i}__ /*강조*/\n\n*주석*`),
    useSpTextStyle: i % 2 === 0,
    background: { mode: 'custom', presetId: null, color: '#bb3a3a' },
  }));
  const data = normalizeCardData({
    abilityBlocksVersion: 1, abilityBlocks: blocks, abilitySpacingAdjust: -0.2,
    isFullArt: false, imageConfig: { scale: 0.4, x: 8, y: -3 },
  });
  assert.deepEqual(normalizeCardData(JSON.parse(JSON.stringify(data))), data);
  assert.deepEqual(data.abilityBlocks.map(b => b.useSpTextStyle), [true, false, true, false, true]);
  assert.equal(data.abilitySpacingAdjust, -0.2);
  assert.deepEqual(data.imageConfig, { scale: 0.4, x: 8, y: -3 });
});

test('SP and local mode use identical outline settings with an opaque foreground', () => {
  const global = usesSpAbilityText({ fullArt: true });
  const local = usesSpAbilityText({ useSpTextStyle: true });
  assert.deepEqual(getAbilityTextOutline(global), getAbilityTextOutline(local));
  assert.deepEqual(getAbilityUnderlineOutline(global), getAbilityUnderlineOutline(local));
  assert.equal(getAbilityTextOutline(local).fillEnabled, false);
  assert.equal(getAbilityTextOutline(local).stroke, SP_ABILITY_TEXT_STYLE.stroke);
  assert.equal(getAbilityTextOutline(local).opacity, SP_ABILITY_TEXT_STYLE.strokeOpacity);
  assert.equal(getAbilityTextOutline(false), null);
  assert.equal(getAbilityUnderlineOutline(false), null);
});

for (const dark of [false, true]) {
  test(`Red markup and annotation ink are correct on dark=${dark}`, () => {
    const options = { dark, spText: true };
    assert.equal(getAbilityTextColor({ color: '#ff0000' }, options), '#ff0000');
    assert.equal(getAbilityTextColor({ color: '#ff0000', annotation: true }, options), '#ff0000');
    assert.equal(getAbilityTextColor({ color: '#525252', annotation: true }, options), 'white');
    assert.equal(getAbilityTextColor({ color: '#525252', annotation: true }, { dark }), dark ? 'white' : 'black');
  });
}

test('One local toggle does not change siblings, background selection or card SP', () => {
  const before = [block('a'), block('b'), block('c')];
  const next = normalizeAbilityBlocks(before.map(b => b.id === 'b' ? { ...b, useSpTextStyle: true } : b));
  assert.deepEqual(next[0], before[0]);
  assert.deepEqual(next[2], before[2]);
  assert.deepEqual(next[1].background, before[1].background);
  assert.equal(getAbilityBackgroundColor(next[1]), null);
});

test('No fullArt or local text-style input participates in line-width measurement', () => {
  const common = {
    text: 'AUTO 가나다 라마바 __사아자__ *차카타* /*파하가*/\n마지막 줄',
    ICON_CONFIG: config, font: 'Body', lightFont: 'Regular', fontSize: 11,
    MAX_WIDTH: 75, measureText, bodyJustify: true, bodyScaleX: 0.95,
    letterSpacing: -0.1, bodyWordSpacing: 0.2,
  };
  const plain = layoutAbilities(common);
  assert.deepEqual(layoutAbilities({ ...common, useSpTextStyle: true }), plain);
  assert.deepEqual(layoutAbilities({ ...common, fullArt: true }), plain);
  assert.deepEqual(layoutAbilities({ ...common, useSpTextStyle: true, fullArt: true }), plain);
});

test('Window coordinates and flavor placement are unchanged by local ink style', () => {
  const bs = [block('a'), block('b'), block('c')];
  const measurements = Object.fromEntries(bs.map(b => [b.id, { text: b.text, lineCount: 2, widthOverflow: false }]));
  const before = getAbilityBlockLayout(bs, measurements);
  const after = getAbilityBlockLayout(bs.map(b => ({ ...b, useSpTextStyle: true })), measurements);
  const coordinates = (x) => ({ ...x, items: x.items.map(({ block, ...geometry }) => geometry) });
  assert.deepEqual(coordinates(before), coordinates(after));
});

test('Ability background catalogue validates its six explicit colors and ink flags', () => {
  assert.equal(validateAbilityBoxPresets(), ABILITY_BOX_PRESETS);
  assert.deepEqual(ABILITY_BOX_PRESETS, [
    { id: 'user-red-ca7b77', label: 'Dragon Empire', color: '#ca7b77', useSpTextStyle: false },
    { id: 'user-blue-757bab', label: 'Dark States', color: '#757bab', useSpTextStyle: false },
    { id: 'user-gray-cfd0d7', label: 'Brandt Gate', color: '#cfd0d7', useSpTextStyle: false },
    { id: 'user-yellow-e6e17c', label: 'Keter Sanctuary', color: '#e6e17c', useSpTextStyle: false },
    { id: 'user-green-71a590', label: 'Stoicheia', color: '#71a590', useSpTextStyle: false },
    { id: 'user-pink-e7b2bc', label: 'Lyrical Monasterio', color: '#e7b2bc', useSpTextStyle: false },
  ]);
});

test('Preset selection copies color and SP setting without touching text', () => {
  const original = block('a');
  const selected = { ...original, ...getAbilityPresetPatch(redPreset, original) };
  assert.equal(selected.background.color, '#bb3a3a');
  assert.equal(selected.background.mode, 'preset');
  assert.equal(selected.useSpTextStyle, true);
  assert.equal(selected.text, original.text);
  for (const preset of ABILITY_BOX_PRESETS) {
    const patch = getAbilityPresetPatch(preset, { ...original, useSpTextStyle: true });
    assert.deepEqual(patch, {
      background: { mode: 'preset', presetId: preset.id, color: preset.color },
      useSpTextStyle: false,
    });
  }
});

test('A preset without an ink flag preserves the user setting', () => {
  const preset = { id: 'just-color', label: 'Just color', color: '#123456' };
  for (const useSpTextStyle of [false, true]) {
    assert.equal(getAbilityPresetPatch(preset, { ...block(), useSpTextStyle }).useSpTextStyle, useSpTextStyle);
  }
});

test('Changing/removing a catalog preset does not restyle a saved card', () => {
  const original = { ...block(), ...getAbilityPresetPatch(redPreset, block()) };
  const reloaded = normalizeAbilityData({ abilityBlocksVersion: 1, abilityBlocks: [original] });
  assert.equal(reloaded.abilityBlocks[0].background.color, '#bb3a3a');
  assert.equal(reloaded.abilityBlocks[0].useSpTextStyle, true);
  const missing = normalizeAbilityBlocks([{ ...original, background: { ...original.background, presetId: 'missing' } }]);
  assert.equal(missing[0].background.color, '#bb3a3a');
  assert.equal(missing[0].useSpTextStyle, true);
});

test('Bad preset IDs, labels, colors and flag types give explicit errors', () => {
  const p = { id: 'p', label: 'Preset', color: '#123456' };
  assert.throws(() => validateAbilityBoxPresets([p, p]), /unique/);
  for (const id of ['default', 'custom', '']) assert.throws(() => validateAbilityBoxPresets([{ ...p, id }]));
  assert.throws(() => validateAbilityBoxPresets([{ ...p, label: '' }]));
  assert.throws(() => validateAbilityBoxPresets([{ ...p, color: '#RGB' }]));
  assert.throws(() => validateAbilityBoxPresets([{ ...p, useSpTextStyle: 'false' }]));
  assert.throws(() => validateAbilityBoxPresets({}));
});

test('All supplied multi-window UI strings are English; card content remains Korean', () => {
  for (const [key, value] of Object.entries(ABILITY_EDITOR_TEXT)) {
    const text = typeof value === 'function' ? value(1, 5) : value;
    assert.ok(!/[가-힣]/u.test(text), key);
  }
  assert.equal(normalizeAbilityBlocks([block()])[0].text, block().text);
});
