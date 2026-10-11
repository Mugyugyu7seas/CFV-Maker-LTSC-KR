import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAbilityBlock, normalizeAbilityBlocks, normalizeAbilityData,
  migrateLegacyAbilities, getLegacyAbilityText, getAbilityBackgroundColor,
  tintAbilityImageData, MAX_ABILITY_BLOCKS,
} from '../utils/AbilityBlocks.js';
import { normalizeCardData } from '../utils/CardFormat.js';
import { getAbilityBlockLayout } from '../utils/AbilityBlockLayout.js';
import { ABILITY_WINDOW_SPACING } from '../utils/store/AbilityWindowSpacing.js';
import { layoutAbilities } from '../components/editor/text/LayoutAbilities.js';

const block = (id, text = id) => createAbilityBlock(id, text);
const config = { exact: { AUTO: { src:'/assets/icon/AUTO.png', iconHeight:11 } }, prefixes:{} };
const fakeWidth = (text, size, style, font) => [...text].reduce((sum, c) =>
  sum + (c === ' ' ? 3 : font === 'Regular' ? 5 : 6), 0);
const layout = (text, overrides = {}) => layoutAbilities({
  text, ICON_CONFIG: config, font:'Bold', lightFont:'Regular', fontSize:11.5,
  bodyScaleX:0.95, bodyJustify:true, measureText:fakeWidth, ...overrides,
});
const measured = (blocks, counts) => Object.fromEntries(blocks.map((b,i) =>
  [b.id, { text:b.text, lineCount:counts[i], widthOverflow:false }]));

for (const type of ['base_normal.png','base_trigger.png','base_g.png','base_encounter.png','base_ticket.png/marker','base_crest.png','base_crest.png/ride_deck']) {
  test(`Legacy ${type}: Enter twice does not invent a second box`, () => {
    const out = migrateLegacyAbilities('앞\n\n뒤',type);
    assert.equal(out.length,1); assert.equal(out[0].text,'앞\n\n뒤');
  });
}
for (const type of ['base_normal_order.png','base_blitz.png','base_set.png','base_set.png/token','base_trigger_o.png','base_blitz_trigger_o.png','base_set_trigger_o.png']) {
  test(`Legacy ${type}: preserve the two explicit old windows`, () => {
    const out=migrateLegacyAbilities('\n첫 줄\n두 번째 행\n  \n\n두 번째 창\n',type);
    assert.deepEqual(out.map(b=>b.text),['첫 줄\n두 번째 행','두 번째 창']);
  });
}
test('New order array: two Enter presses stay in one box after import/export',()=>{
 const out=normalizeCardData({selectedType:'base_blitz.png',abilityBlocks:[block('a','앞\n\n뒤')],abilityBlocksVersion:1});
 assert.equal(out.abilityBlocks.length,1); assert.equal(out.abilityBlocks[0].text,'앞\n\n뒤');
 assert.deepEqual(normalizeCardData(JSON.parse(JSON.stringify(out))),out);
});
test('Five coloured windows round-trip without changing unrelated card values',()=>{
 const input={selectedType:'base_blitz.png',cardName:'카드명',clan:'clan/AQ.png',imageConfig:{scale:0.81,x:-12,y:3},
   abilitySpacingAdjust:-0.25,isFullArt:true,abilityBlocks:[1,2,3,4,5].map(i=>({
     ...block(`id-${i}`,`능력 ${i}\n\n문단`),background:{mode:'custom',color:'#2A5F9B',presetId:null}}))};
 const out=normalizeCardData(input);
 assert.equal(out.abilityBlocks.length,5); assert.deepEqual(out.imageConfig,input.imageConfig);
 assert.equal(out.abilitySpacingAdjust,-0.25); assert.equal(out.isFullArt,true); assert.equal(out.clan,input.clan);
 assert.deepEqual(normalizeCardData(JSON.parse(JSON.stringify(out))),out);
});
test('Missing fields become one empty default window',()=>{
 const result=normalizeCardData({cardName:'old'}); assert.equal(result.abilityBlocks.length,1);
 assert.equal(result.abilityBlocks[0].text,''); assert.equal(result.abilityBlocks[0].background.mode,'default');
});
test('Array length limit is enforced without silently losing the sixth window',()=>{
 assert.throws(()=>normalizeAbilityBlocks(Array.from({length:6},(_,i)=>block(String(i)))),/maximum of 5/);
 assert.equal(MAX_ABILITY_BLOCKS,5);
});
test('Future schema is rejected rather than reinterpreted',()=>{
 assert.throws(()=>normalizeAbilityData({abilityBlocksVersion:2,abilityBlocks:[block('a')]}),/Unsupported/);
});
test('Version without data does not destroy text',()=>{
 assert.throws(()=>normalizeAbilityData({abilityBlocksVersion:1,abilities:'keep'}),/without an ability window list/);
});
test('Malformed blocks, colours and modes get explicit errors',()=>{
 for(const value of [null,{},'text']) assert.throws(()=>normalizeAbilityBlocks(value));
 assert.throws(()=>normalizeAbilityBlocks([{id:'x',text:2}]));
 assert.throws(()=>normalizeAbilityBlocks([{...block('a'),background:{mode:'custom',color:'bad'}}]));
 assert.throws(()=>normalizeAbilityBlocks([{...block('a'),background:{mode:'gradient',color:'#ffffff'}}]));
});
test('Empty list normalizes to one box, and duplicate IDs become stable unique IDs',()=>{
 assert.equal(normalizeAbilityBlocks([]).length,1);
 const result=normalizeAbilityBlocks([block('same'),block('same'),block('same-copy')]);
 assert.equal(new Set(result.map(b=>b.id)).size,3);
 assert.deepEqual(normalizeAbilityBlocks(result),result);
});
test('Saved preset colour does not depend on the local catalogue',()=>{
 const [b]=normalizeAbilityBlocks([{...block('a'),background:{mode:'preset',presetId:'missing-on-this-pc',color:'#123456'}}]);
 assert.equal(getAbilityBackgroundColor(b),'#123456');
 assert.equal(getAbilityBackgroundColor(block('default')),null);
});
test('Legacy fallback keeps text from all five windows but never splits into hidden third block',()=>{
 const legacy=getLegacyAbilityText([1,2,3,4,5].map(i=>block(String(i),`본문${i}\n\n설명${i}`)));
 assert.ok(!legacy.includes('\n\n'));
 for(let i=1;i<=5;i++) assert.ok(legacy.includes(`본문${i}`)&&legacy.includes(`설명${i}`));
});
test('Per-pixel colour replacement preserves alpha exactly',()=>{
 const image={data:Uint8ClampedArray.from([255,255,255,0,255,255,255,64,100,100,100,128,0,0,0,255])};
 tintAbilityImageData(image,'#123456');
 assert.deepEqual([...image.data],[18,52,86,0,18,52,86,64,18,52,86,128,18,52,86,255]);
});
for (const [type,opts,y,bg] of [
 ['unit',{isUnit:true},492,0],['order',{},513.5,21.5],['crest',{isCrest:true},197,0],
]) test(`Single ${type} retains original body/background anchors`,()=>{
 const bs=[block('a')]; const out=getAbilityBlockLayout(bs,measured(bs,[3]),opts);
 assert.equal(out.items[0].textY,y); assert.equal(out.items[0].backgroundY,bg);
 assert.equal(out.flavorEquivalentLines,3);
});
test('Two order windows retain the bottom anchor and visible frame gap',()=>{
 const bs=[block('a'),block('b')]; const out=getAbilityBlockLayout(bs,measured(bs,[3,2]));
 assert.equal(out.items[1].textY,513.5);
 assert.equal(out.items[0].textY,513.5-(2*17+4+ABILITY_WINDOW_SPACING.windowGap));
 assert.equal(out.items[1].top-out.items[0].bottom,ABILITY_WINDOW_SPACING.windowGap);
 assert.equal(out.flavorEquivalentLines,6.25);
});
for (const count of [3,5]) test(`${count} windows keep input order and separated visible frames`,()=>{
 const bs=Array.from({length:count},(_,i)=>block(`id-${i}`)); const out=getAbilityBlockLayout(bs,measured(bs,bs.map(()=>1)),{isUnit:true});
 assert.equal(out.items.length,count); assert.equal(out.overflow,false);
 assert.deepEqual(out.items.map(i=>i.block.id),bs.map(b=>b.id));
 for(let i=1;i<count;i++) {
  assert.equal(out.items[i].shift-out.items[i-1].shift,17+4+ABILITY_WINDOW_SPACING.windowGap);
  assert.equal(out.items[i].top-out.items[i-1].bottom,ABILITY_WINDOW_SPACING.windowGap);
  assert.ok(out.items[i].top>out.items[i-1].bottom);
 }
});
test('Crest windows have one common vertical centre',()=>{
 const bs=[block('a'),block('b'),block('c')]; const out=getAbilityBlockLayout(bs,measured(bs,[1,2,1]),{isCrest:true});
 const first=out.items[0],last=out.items.at(-1);
 assert.equal(first.shift-first.slotHeight/2,-out.slotHeight/2);
 assert.equal(last.shift+last.slotHeight/2,out.slotHeight/2);
});
test('Empty added UI windows occupy no card space',()=>{
 const bs=[block('a'),block('empty','\n '),block('b')]; const out=getAbilityBlockLayout(bs,measured(bs,[1,0,1]));
 assert.deepEqual(out.items.map(i=>i.block.id),['a','b']);
});
test('Overflow includes inter-window spacing and never throws away content',()=>{
 const bs=[block('a'),block('b'),block('c'),block('d'),block('e')]; const out=getAbilityBlockLayout(bs,measured(bs,[3,3,3,3,3]));
 assert.equal(out.overflow,true); assert.equal(out.totalLines,15); assert.equal(out.items.length,5);
});
test('Stale measurements do not count as ready',()=>{
 const bs=[block('a','changed')]; const out=getAbilityBlockLayout(bs,{a:{text:'old',lineCount:2,widthOverflow:false}});
 assert.equal(out.ready,false);
});
test('Energy card still suppresses ability rendering',()=>{
 const out=getAbilityBlockLayout([block('a')],{}, {isEnergy:true}); assert.equal(out.items.length,0); assert.ok(out.ready);
});
test('Blank lines including a trailing Enter remain inside the same window',()=>{
 const out=layout('가\n\n나\n'); assert.equal(out.lineCount,4); assert.deepEqual(out.lines[1],[]); assert.deepEqual(out.lines[3],[]);
});
test('All rows beyond fourteen are retained for overflow reporting',()=>{
 const out=layout(Array.from({length:20},(_,i)=>`행${i}`).join('\n')); assert.equal(out.lineCount,20);
});
test('Ordinary paragraph last line is not justified',()=>{
 const out=layout('단어 단어'); assert.ok(out.lines[0].every(n=>!n.justifyLetterSpacing));
});
test('Explicit \\j still justifies a manually ended row',()=>{
 const out=layout('단어 단어\\j'); assert.ok(out.lines[0].some(n=>n.justifyLetterSpacing>0));
 const last=out.lines[0].at(-1); assert.ok(Math.abs(last.x+last.width-370)<0.001);
});
test('Automatic rows are justified without expanding the last paragraph row',()=>{
 const out=layout('가나다 라마바 사아자 차카타 파하가 나다라',{MAX_WIDTH:60});
 assert.ok(out.lineCount>1); assert.ok(out.lines[0].some(n=>n.justifyLetterSpacing));
 assert.ok(out.lines.at(-1).every(n=>!n.justifyLetterSpacing));
});
test('Letter spacing and word spacing are both reflected in measured widths',()=>{
 const a=layout('가나다 라마',{bodyJustify:false}); const b=layout('가나다 라마',{bodyJustify:false,letterSpacing:0.5,bodyWordSpacing:0.5});
 assert.ok(b.lines[0][0].width>a.lines[0][0].width);
 assert.equal(b.lines[0][1].width-a.lines[0][1].width,0.5);
 assert.ok(b.lines[0][2].x>a.lines[0][2].x);
});
test('Regular annotation font is used for measurement and markers are preserved',()=>{
 const out=layout('일반 *주석* /*강조*/ __밑줄__',{bodyJustify:false});
 const ns=out.lines.flat(); const a=ns.find(n=>n.annotation&&n.text==='주석');
 assert.ok(a); assert.equal(a.width,2*5*0.95);
 assert.equal(ns.find(n=>n.text==='강조').color,'#ff0000'); assert.equal(ns.find(n=>n.text==='밑줄').underline,true);
});
test('SP appearance has no layout input and cannot add width',()=>{
 const a=layout('AUTO 가나다 라마바 사아자',{MAX_WIDTH:80}); const b=layout('AUTO 가나다 라마바 사아자',{MAX_WIDTH:80,fullArt:true});
 assert.deepEqual(a,b);
});
test('Overwide words are diagnosed, not discarded',()=>{
 const out=layout('가'.repeat(200)); assert.equal(out.widthOverflow,true);
 assert.equal(out.lines.flat().map(n=>n.text||'').join(''),'가'.repeat(200));
});
test('Changing one colour never changes sibling text, colour or layout',()=>{
 const a=[block('one','첫 번째'),block('two','두 번째')];
 const b=normalizeAbilityBlocks(a.map(x=>x.id==='one'?{...x,background:{mode:'custom',color:'#337799'}}:x));
 assert.deepEqual(b[1],a[1]); assert.deepEqual(layout(a[0].text),layout(b[0].text));
});
