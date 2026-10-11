# CFV Maker LTSC — Korean-layout branch

## Current scope

This branch renders Korean cards only. The old UI/card language providers,
singleton language stores, language selectors, and English/Thai/Japanese card
layout presets have been removed. Do not reintroduce `lang` props or `useLang`.

The existing English menu/help text and automatically supplied card text have
not been translated in this step. `utils/store/Text.js` now contains static
strings, not language-indexed objects. English/Japanese characters can still
be entered as card content; a Korean layout does not impose an input filter.

Nation, clan, and dual-nation template conversion is NOT implemented yet.
Keep their asset IDs, filenames, and current rendering behavior unchanged.
The next feature is single-nation/clan presets using shared templates;
dual-nation work is explicitly deferred.

## Stack and entry points

Read `package.json` for exact versions and commands. The uploaded project uses
Next.js, React, Electron, Konva/react-konva, use-image, and JSZip.

- `src/app/layout.js`: theme, Electron title bar, application shell.
- `src/app/page.js`: card state, import confirmation, close/save flow.
- `src/app/components/`: navigation, property panels, canvas workspace.
- `components/editor/CardEditor.jsx`: composition and image export.
- `components/editor/AbilitiesOutput.jsx`: Korean text layout and rendering.
- `components/editor/text/`: parser, text measurement, justification.
- `components/editor/icon/`: built-in and custom icon rendering.
- `utils/store/Typography.js`: one `CARD_TYPOGRAPHY` object.
- `utils/PathHelper.js`: fixed Korean paths and shared-asset exceptions.
- `utils/CardFormat.js`: file metadata normalization only.
- `utils/CardIO.js`: template ZIP import, preview, and export.

## Preservation requirements

Preserve the uploaded Korean typography values unless explicitly asked to
change them. In particular, retain `VGKRBody` for body text, `VGKRBodyLight`
for regular annotations, the red annotation rule, `bodyScaleX = 0.95`, and
`bodyLightYOffset = -1.5`. Do not rename `lightFont` merely because it refers
to the regular face. The corrected CSS source for that family is
`/fonts/HakgyoansimBareondotumR.otf`.

The previous Korean branch still used some shared fonts (`Anton`, `Sirin`,
`PSLxImperial`, etc.) and shared image assets. They are intentionally retained.
Do not delete an asset or font based only on its apparent language of origin.
Do not redistribute font binaries in patches.

Keep `selectedNation`, `clan`, custom nation settings, image transforms,
ability spacing, and custom-layer metadata intact. Legacy input language
metadata must not switch runtime rendering. `lang` and `cardLang` in exported
ZIP metadata are both `ko`; they are not application state. Exported files
are intended for this branch, not guaranteed to restore correctly in an old
multilingual editor.

## Verification

Run `node --test tests/ko-contract.test.mjs` for the dependency-free contract
checks. Also run `npm run build` and test `npm run electron:dev` in a complete
local environment. Verify template import/export, normal/full-art/encounter
cards, annotations, custom icons, layers, image positioning, and PNG export.

`KO_REFACTOR.md` records what was actually tested and what remains unverified.
Isolated render-tree tests are not a substitute for a full Electron/Next.js
run or a full-card screenshot comparison.

## Git and change policy

Do not commit, pull, push, change package versions, replace dependencies,
or delete caches/assets unless the owner explicitly requests it. Make small,
scoped changes and report evidence and remaining uncertainty.
