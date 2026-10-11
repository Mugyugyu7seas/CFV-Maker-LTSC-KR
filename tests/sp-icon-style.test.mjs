import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  SP_ABILITY_TEXT_STYLE, usesSpAbilityText, getAbilityTextColor,
  getAbilityTextOutline, getAbilityUnderlineOutline,
  getAbilityIconAppearance, getAbilityIconOutline,
} from '../utils/AbilityTextStyle.js';
import { ParseTokens } from '../components/editor/text/ParseTokens.js';
import { layoutAbilities } from '../components/editor/text/LayoutAbilities.js';

// The registries are static constants; evaluate only those declarations.
// No React, DOM, installed font, or PNG is replaced by a purported visual test.
const source = readFileSync(new URL('../utils/store/IconConfig.js', import.meta.url), 'utf8');
const declarations = source.slice(source.indexOf('export const ICON_CONFIG_BASE'), source.indexOf('function emit()'));
const registry = vm.runInNewContext(declarations.replaceAll('export const ', 'const ') + '\n({ ICON_CONFIG_BASE, COLOR_TAG_BASE })');
const config = registry.ICON_CONFIG_BASE;
const colorTag = registry.COLOR_TAG_BASE;
const inputs = Object.keys(config.exact);
for (const [prefix, c] of Object.entries(config.prefixes)) {
  if (c.allowPlain) inputs.push(prefix);
  for (let n = c.valueRange.min; n <= c.valueRange.max; n++) inputs.push(`${prefix}(${n})`);
}
for (const [key, allow] of Object.entries(colorTag.allow)) {
  for (const color of Object.keys(colorTag.preset)) {
    if (allow === true || (Array.isArray(allow) && allow.includes(color))) inputs.push(`${key}@[${color}]`);
  }
}

for (const dark of [false, true]) for (const fullArt of [false, true]) for (const local of [false, true]) {
  test(`Unified SP policy: Encounter=${dark}, card SP=${fullArt}, SP text=${local}`, () => {
    const spText = usesSpAbilityText({ fullArt, useSpTextStyle: local });
    const presentation = getAbilityIconAppearance({ dark, spText });
    assert.equal(spText, fullArt || local);
    assert.equal(presentation.dark, dark || spText);
    assert.equal(getAbilityTextColor({ color: dark ? 'white' : 'black' }, { dark, spText }), spText || dark ? 'white' : 'black');
    assert.equal(getAbilityIconOutline(spText)?.color ?? null, spText ? 'black' : null);
    assert.equal(getAbilityTextOutline(spText)?.stroke ?? null, spText ? 'black' : null);
  });
}

test('Icon masks, glyph strokes and underline strokes share color and opacity', () => {
  const mask = getAbilityIconOutline(true);
  const glyph = getAbilityTextOutline(true);
  const line = getAbilityUnderlineOutline(true);
  assert.equal(mask.color, glyph.stroke);
  assert.equal(line.stroke, glyph.stroke);
  assert.equal(mask.opacity, glyph.opacity);
  assert.equal(line.opacity, glyph.opacity);
  assert.equal(mask.opacity, SP_ABILITY_TEXT_STYLE.strokeOpacity);
  assert.equal(glyph.fillEnabled, false);
});

test('Explicit red and Regular-annotation font selection metadata survive SP', () => {
  for (const dark of [false, true]) {
    for (const annotation of [false, true]) {
      assert.equal(getAbilityTextColor({ color: '#ff0000', annotation }, { dark, spText: true }), '#ff0000');
      assert.equal(getAbilityTextColor({ color: '#525252', annotation }, { dark, spText: true }), 'white');
    }
  }
});

test('All 104 registered inputs still parse as one icon (plain and underlined)', () => {
  assert.equal(inputs.length, 104);
  for (const input of inputs) for (const dark of [false, true]) for (const underlined of [false, true]) {
    const tokens = ParseTokens(underlined ? `__${input}__` : input, config, dark);
    assert.equal(tokens.length, 1, input);
    assert.ok(['icon','plain_icon','dynamic_icon'].includes(tokens[0].type), input);
    assert.equal(Boolean(tokens[0].underline), underlined, input);
  }
});

test('SP flags do not change the line layout of any registered icon', () => {
  const measureText = (text) => [...text].reduce((sum, c) => sum + (c === ' ' ? 3 : 6), 0);
  for (const input of inputs) for (const dark of [false, true]) {
    const options = {
      text: `기존 본문 ${input} __밑줄__ /*강조*/ *주석*\n마지막 줄`,
      font: 'Body', lightFont: 'Regular', fontSize: 11, MAX_WIDTH: 100,
      ICON_CONFIG: config, measureText, dark, bodyJustify: true,
      bodyScaleX: 0.95, letterSpacing: -0.2, bodyWordSpacing: 0.1,
    };
    const normal = layoutAbilities(options);
    assert.deepEqual(layoutAbilities({ ...options, fullArt: true }), normal, input);
    assert.deepEqual(layoutAbilities({ ...options, useSpTextStyle: true }), normal, input);
  }
});

test('All three icon families receive the same effective SP flag as the text', () => {
  const body = readFileSync(new URL('../components/editor/AbilitiesOutput.jsx', import.meta.url), 'utf8');
  const render = body.slice(body.indexOf('const RenderLine'), body.indexOf('function AbilitiesOutput'));
  for (const family of ['IconGenerator','PlainIcon','KeywordImage']) {
    const i = render.indexOf(`<${family}`);
    assert.ok(i >= 0);
    const block = render.slice(i, render.indexOf('/>', i));
    assert.match(block, /fullArt=\{spText\}/);
    assert.doesNotMatch(block, /fullArt=\{fullArt\}/);
  }
  assert.match(render, /getAbilityTextColor\(node, \{ dark, spText \}\)/);
  assert.match(render, /getFontStyle\(node.italic, dark\)/);
});

test('SP is not a background visibility flag for a local window', () => {
  const editor = readFileSync(new URL('../components/editor/CardEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /visible=\{!isFullArt\}/);
  assert.match(editor, /fullArt=\{isFullArt\}/);
  assert.match(editor, /useSpTextStyle=\{block.useSpTextStyle \?\? false\}/);
});

test('Foreground tint/inversion cannot be overwritten by a stale animation callback', () => {
  const source = readFileSync(new URL('../components/editor/icon/KeywordImage.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /requestAnimationFrame/);
  assert.match(source, /useLayoutEffect\(\(\) => \{[\s\S]*node.clearCache\(\);[\s\S]*node.filters\(filters\)/);
});
