import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the functions actually used by ImportModal, without loading JSX/React.
const source = fs.readFileSync(new URL('../components/ImportModal.jsx', import.meta.url), 'utf8');
const { parseVersion, compareVersion } = vm.runInNewContext(
  source.slice(source.indexOf('function parseVersion'), source.indexOf('const ImagePreview')) +
  '\n({ parseVersion, compareVersion })'
);
const messages = Object.fromEntries(['verInvalid','verPreToRelease','verReleaseToPre','verBreaking',
  'verIncompatible','verNewer','verDiffers','verGapLarge'].map(k => [k,k]));

test('ImportModal parses supported suffix forms and rejects malformed versions', () => {
  for (const version of ['1.2.7','1.2.7K0','1.2.7-K0']) {
    assert.deepEqual(JSON.parse(JSON.stringify(parseVersion(version))), {
      major:1, minor:2, patch:7, suffix:version === '1.2.7' ? null : 'k0',
    });
  }
  for (const version of ['1.2','1.2.7-','1.2.7--K0','1.2.7-0K','1.2.7-K_0','',null,undefined,127]) {
    assert.equal(parseVersion(version),null);
  }
});

test('ImportModal keeps identical-version safety and existing compatibility warning levels', () => {
  assert.equal(compareVersion('1.2.7-K0','1.2.7-K0',messages).level,'safe');
  for (const [imported,current,level,message] of [
    ['bad','1.2.7-K0','danger','verInvalid'],
    ['2.2.7','1.2.7-K0','danger','verBreaking'],
    ['0.2.7','1.2.7-K0','danger','verIncompatible'],
    ['1.3.7-K0','1.2.7-K0','warning','verNewer'],
    ['1.1.7','1.2.7-K0','warning','verDiffers'],
    ['1.2.1','1.2.7-K0','warning','verGapLarge'],
    ['26.2.7','1.2.7-K0','warning','verPreToRelease'],
    ['1.2.7','26.2.7','warning','verReleaseToPre'],
  ]) {
    const result=compareVersion(imported,current,messages);
    assert.equal(result.level,level);assert.ok(result.message.startsWith(message));
  }
});
