import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Load dependency-free ES modules without changing the application's Next.js module resolution.
async function load(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { CARD_TYPOGRAPHY } = await load('utils/store/Typography.js');
const paths = await import(pathToFileURL(path.join(root, 'utils/PathHelper.js')).href);
const { CARD_LANGUAGE, normalizeCardData } = await import(pathToFileURL(path.join(root, 'utils/CardFormat.js')).href);
const { TextPreset } = await load('utils/store/Text.js');
const { ParseTokens } = await load('components/editor/text/ParseTokens.js');
const { getFontStyle } = await load('components/editor/text/TextMeasure.js');
const { JustifyLine } = await load('components/editor/text/JustifyLine.js');

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(full) : /\.(jsx?|mjs)$/.test(entry.name) ? [full] : [];
  });
}

test('Approved Korean typography values match the baseline', () => {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/typography-ko-baseline.json'), 'utf8'));
  assert.deepEqual(CARD_TYPOGRAPHY, baseline);
  assert.equal(CARD_TYPOGRAPHY.bodyLightFont, 'VGKRBodyLight');
  assert.equal(CARD_TYPOGRAPHY.bodyLightYOffset, 0);
});

test('Every CSS font URL resolves to an existing local font file', () => {
  const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
  const matches = [...css.matchAll(/url\(['"]?(\/fonts\/[^'"\)]+)['"]?\)/g)];
  assert.ok(matches.length >= 3);
  for (const [, url] of matches) assert.ok(fs.existsSync(path.join(root, 'public', url)), `Missing font: ${url}`);
  assert.match(css, /\/fonts\/HakgyoansimBareondotumR\.otf/);
});

test('Korean built-in asset paths retain Korean base paths and shared trigger paths', () => {
  assert.equal(paths.getBasePath('base_g.png'), '/assets/ko/base/base_g.png');
  assert.equal(paths.getBasePath('base_normal.png', false), '/assets/ko/base/base_normal.png');
  assert.equal(paths.getRacePath('race.png'), '/assets/ko/base/race.png');
  assert.equal(paths.getTriggerPath('draw.png'), '/assets/trigger/draw.png');
  assert.equal(paths.getNationPath('green.png'), '/assets/ko/base/nation/green.png');
  assert.equal(paths.getNationPath('green.png', false), '/assets/ko/base/nation/green.png');
  assert.equal(paths.getClanPath('clan/AQ.png'), '/assets/ko/base/clan/AQ.png');
  assert.equal(paths.getKoreanAssetPath('/assets/ko/icon/AUTO.png'), '/assets/ko/icon/AUTO.png');
  assert.equal(paths.getAssetPath(null), null);
});

test('Custom icon sources are not rewritten as built-in Korean assets', () => {
  assert.equal(paths.getKoreanCardIconPath('/assets/icon/AUTO.png'), '/assets/ko/icon/AUTO.png');
  for (const src of ['blob:custom-icon', 'data:image/png;base64,AA', '/custom/example.png', null, '']) {
    assert.equal(paths.getKoreanCardIconPath(src), src);
  }
});

test('Old saved languages cannot switch the Korean layout or alter card content', () => {
  assert.equal(CARD_LANGUAGE, 'ko');
  for (const lang of ['en', 'th', 'ja', 'ko', undefined]) {
    const input = {
      cardName: '한글 English 日本語', abilities: 'AUTO{VC}: *(주석)*',
      selectedNation: 'green.png', clan: 'clan/AQ.png',
      customNationEnabled: true, customNationName: '사용자 국가',
      imageConfig: { scale: 1.25, x: 7, y: -4 }, abilitySpacingAdjust: 1.5,
      lang, uiLang: 'th', cardLang: 'en', futureField: { enabled: true },
    };
    const before = structuredClone(input);
    const result = normalizeCardData(input);
    const { lang: legacyLang, uiLang, cardLang, ...content } = input;
    const {
      abilityBlocks,
      abilityBlocksVersion,
      gradeNumberStyle,
      isSec,
      rideDeckHideExplanations,
      ...normalizedContent
    } = result;

    assert.deepEqual(normalizedContent, {
      ...content,
      lang: 'ko',
      cardLang: 'ko',
    });

    assert.equal(abilityBlocksVersion, 1);
    assert.deepEqual(abilityBlocks, [{
      id: 'ability-1',
      text: content.abilities,
      background: {
        mode: 'default',
        color: '#ffffff',
        presetId: null,
      },
      useSpTextStyle: false,
      hideExplanations: false,
    }]);
    assert.deepEqual(gradeNumberStyle, {
      mode: 'default',
      color: '#ffffff',
      presetId: null,
    });
    assert.equal(isSec, false);
    assert.equal(rideDeckHideExplanations, false);
    assert.deepEqual(input, before, 'Normalization must not mutate the caller');
  }
});

test('Malformed card roots fail before entering editor state', () => {
  for (const value of [null, undefined, [], 1, 'broken']) {
    assert.throws(() => normalizeCardData(value), TypeError);
  }
});

test('UI strings are static values, not locale-indexed dictionaries', () => {
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    assert.ok(!Object.hasOwn(value, 'en') && !Object.hasOwn(value, 'th'));
    for (const child of Object.values(value)) walk(child);
  }
  walk(TextPreset);
  assert.equal(typeof TextPreset.CardOptions.n2, 'string');
  assert.equal(typeof TextPreset.EditNav.DarkMode, 'string');
});

test('No language provider, locale hooks, or obsolete typography getter remains', () => {
  assert.ok(!fs.existsSync(path.join(root, 'utils/LanguageProvider.jsx')));
  assert.ok(!fs.existsSync(path.join(root, 'utils/store/LanguageStore.js')));
  const files = ['src', 'components', 'utils'].flatMap(dir => sourceFiles(path.join(root, dir)));
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\b(useLang|setLang|getLanguage|getCardLanguage|LanguageProvider|LanguageStore|getCardTypography)\b/, file);
    assert.doesNotMatch(source, /\[lang\]|lang\s*===?\s*['"](?:en|th|ko|ja)['"]/, file);
  }
});

test('Language-free body font styles retain normal/dark behavior', () => {
  assert.equal(getFontStyle(false, false), 'bold');
  assert.equal(getFontStyle(true, false), 'italic bold');
  assert.equal(getFontStyle(false, true), '500');
  assert.equal(getFontStyle(true, true), 'italic 500');
});

test('Regular and red annotations retain parser flags', () => {
  const config = { exact: {}, prefixes: {} };
  const parts = text => ParseTokens(text, config).flatMap(token => token.parts || []);
  const normal = parts('*(수호자를 가진 카드)*');
  assert.ok(normal.length > 0 && normal.every(part => part.annotation));
  const red = parts('/**빨간 주석**/');
  assert.ok(red.length > 0 && red.every(part => part.annotation && part.color === '#ff0000'));
  const plain = parts('English 日本語 한글');
  assert.equal(plain.map(part => part.text).join(''), 'English 日本語 한글');
});

test('Explicit justification preserves text and ends within the requested width', () => {
  const line = [
    { type: 'text', text: '한글', width: 20 },
    { type: 'text', text: ' ', width: 4 },
    { type: 'text', text: 'English', width: 30 },
  ];
  const result = JustifyLine(line, 100, 11.5, text => text.length * 5);
  assert.equal(result.map(node => node.text).join(''), '한글 English');
  assert.equal(result.at(-1).x + result.at(-1).width, 100);
});
