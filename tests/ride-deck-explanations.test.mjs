import test from 'node:test';
import assert from 'node:assert/strict';
import { createRideDeckAbilityBlocks, normalizeRideDeckHideExplanations } from '../utils/RideDeckAbilities.js';
import { normalizeCardData } from '../utils/CardFormat.js';
import { createAbilityBlock, normalizeAbilityBlocks } from '../utils/AbilityBlocks.js';
import { layoutAbilities } from '../components/editor/text/LayoutAbilities.js';
import { getAbilityBlockLayout } from '../utils/AbilityBlockLayout.js';

const config = {
  exact: { AUTO: { src:'/assets/icon/AUTO.png', iconHeight:11, iconSpacingBefore:0.3, iconSpacingAfter:0.4 } },
  prefixes: { CB: { allowPlain:true, baseSrc:'/assets/icon/cost/CB.png', valueRange:{ min:1, max:5 } } },
};
const opts = { ICON_CONFIG:config, font:'Bold', lightFont:'Regular', fontSize:11,
  bodyJustify:false, MAX_WIDTH:370, measureText:(text)=>[...text].length*6 };
const render = (block, extra={}) => layoutAbilities({ ...opts, text:block.text,
  hideExplanations:block.hideExplanations, ...extra });
const textOf = (result) => result.lines.map(line=>line.filter(n=>n.type==='text').map(n=>n.text).join('')).join('\n');
const template = '*(첫 번째 설명)*\nAUTO:본문 *추가 설명* 끝.\n/*빨간 강조*/\n(일반 괄호)';

for (const value of [undefined, null, false]) {
  test(`missing/off ride-deck preference is false: ${value}`,()=>assert.equal(normalizeRideDeckHideExplanations(value),false));
}
test('true remains true; invalid imported values are rejected rather than coerced',()=>{
  assert.equal(normalizeRideDeckHideExplanations(true),true);
  for(const bad of ['false','true',0,1,{},[]])assert.throws(()=>normalizeRideDeckHideExplanations(bad),/rideDeckHideExplanations/);
});
test('fixed template is one stable-ID block with default background and unchanged source',()=>{
  const a=createRideDeckAbilityBlocks(template,false),b=createRideDeckAbilityBlocks(template,true);
  assert.equal(a.length,1);assert.equal(b.length,1);assert.equal(a[0].id,b[0].id);
  assert.equal(a[0].text,template);assert.equal(b[0].text,template);
  assert.equal(a[0].useSpTextStyle,false);assert.equal(a[0].background.mode,'default');
  assert.deepEqual(normalizeAbilityBlocks(a),a);
});
test('invalid template type does not silently destroy the fixed text',()=>{
  assert.throws(()=>createRideDeckAbilityBlocks({}),/must be a string/);
  assert.equal(createRideDeckAbilityBlocks()[0].text,'');
});
test('Hide off preserves old non-SP layout with identical typography/spacing settings',()=>{
  const block=createRideDeckAbilityBlocks(template,false)[0];
  assert.deepEqual(render(block),layoutAbilities({...opts,text:template}));
});
for(const fullArt of [false,true])for(const isSec of [false,true]){
  test(`SP=${fullArt}, SEC=${isSec} do not hide explanations by themselves`,()=>{
    const shown=render(createRideDeckAbilityBlocks(template,false)[0],{fullArt,isSec});
    const hidden=render(createRideDeckAbilityBlocks(template,true)[0],{fullArt,isSec});
    assert.match(textOf(shown),/첫 번째 설명/);assert.match(textOf(shown),/추가 설명/);
    assert.doesNotMatch(textOf(hidden),/설명/);
    assert.match(textOf(hidden),/빨간 강조/);assert.match(textOf(hidden),/일반 괄호/);
    assert.equal(hidden.lineCount,3);assert.equal(shown.lineCount,4);
    assert.deepEqual(hidden,render(createRideDeckAbilityBlocks(template,true)[0]));
  });
}
test('all existing annotation styles use the shared filter; ordinary red remains',()=>{
  for(const note of ['*해설*','*(해설)*','*__해설__*','/**해설**/']){
    const b=createRideDeckAbilityBlocks(`앞${note}뒤 /*강조*/`,true)[0];
    assert.equal(textOf(render(b)),'앞뒤 강조');
    assert.ok(render(b).lines.flat().some(n=>n.text==='강조'&&n.color==='#ff0000'));
  }
});
test('hidden explanation icons and underlines consume no width; neighbouring icons remain',()=>{
  const b=createRideDeckAbilityBlocks('AUTO 앞*__CB(1)__*뒤',true)[0];
  const out=render(b),icons=out.lines.flat().filter(n=>n.type!=='text');
  assert.equal(icons.length,1);assert.equal(icons[0].keyword,'AUTO');
  assert.equal(icons[0].iconSpacingBefore,0.3);assert.equal(icons[0].iconSpacingAfter,0.4);
  assert.equal(textOf(out),' 앞뒤');
});
test('Hide changes measured height, while authored blank lines stay in the same fixed window',()=>{
  const b=createRideDeckAbilityBlocks('첫째\n*해설*\n\n둘째',true)[0];
  assert.equal(render(b).lineCount,3);assert.deepEqual(render(b).lines[1],[]);
  const only=createRideDeckAbilityBlocks('*해설*',true)[0];
  assert.equal(render(only).lineCount,0);
});
test('same source with a new hide preference invalidates cached measurement',()=>{
  const b=createRideDeckAbilityBlocks(template,false)[0];
  const m={ [b.id]:{text:b.text,hideExplanations:false,lineCount:4,widthOverflow:false,backgroundReady:true} };
  const next=createRideDeckAbilityBlocks(template,true);
  assert.equal(getAbilityBlockLayout(next,m,{isCrest:true}).ready,false);
  m[b.id]={...m[b.id],hideExplanations:true,lineCount:3};
  assert.equal(getAbilityBlockLayout(next,m,{isCrest:true}).ready,true);
});
test('deriving the ride-deck window does not overwrite ordinary windows, text, spacing or CN',()=>{
  const normal={selectedType:'base_normal.png',abilitySpacingAdjust:-1,customNationEnabled:true,
    abilityBlocks:[{...createAbilityBlock('a','보통 *설명*'),hideExplanations:false}],rideDeckHideExplanations:false};
  const before=JSON.stringify(normal),ref=normal.abilityBlocks;
  const fixed=createRideDeckAbilityBlocks(template,true);
  assert.equal(fixed[0].hideExplanations,true);assert.equal(normal.abilityBlocks,ref);
  assert.equal(JSON.stringify(normal),before);
});
test('JSON save/import preserves the preference independently of each ordinary window',()=>{
  const card={selectedType:'base_crest.png/ride_deck',isFullArt:true,isSec:true,
    abilitySpacingAdjust:-1,rideDeckHideExplanations:true,
    abilityBlocks:[{...createAbilityBlock('a','보통 *설명*'),hideExplanations:false}]};
  const saved=normalizeCardData(card),out=normalizeCardData(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(out,saved);assert.equal(out.rideDeckHideExplanations,true);
  assert.equal(out.abilityBlocks[0].hideExplanations,false);assert.equal(out.abilitySpacingAdjust,-1);
  assert.equal(out.abilityBlocks[0].text,'보통 *설명*');
});
test('old template without the field resets it to false, not the previous card preference',()=>{
  const loaded=normalizeCardData({selectedType:'base_crest.png/ride_deck',isFullArt:true,abilities:'old'});
  const previous={rideDeckHideExplanations:true};
  assert.equal({...previous,...loaded}.rideDeckHideExplanations,false);
  assert.equal(loaded.isFullArt,true);
});
