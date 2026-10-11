import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getAbilityBlockLayout } from '../utils/AbilityBlockLayout.js';
import { layoutAbilities } from '../components/editor/text/LayoutAbilities.js';

const box = (id, text='가나다 '.repeat(40)) => ({id, text, background: {mode:'default'}});
const metric = (block, lineCount, extra={}) => ({text:block.text, lineCount, widthOverflow:false, ...extra});
const config = {exact:{},prefixes:{}};
const rows = (text) => layoutAbilities({text, ICON_CONFIG:config, fontSize:10,
 font:'test', lightFont:'test-regular', MAX_WIDTH:100, bodyScaleX:1,
 letterSpacing:0, bodyWordSpacing:0, bodyJustify:true,
 measureText:word=>[...word].reduce((sum,char)=>sum+(char===' '?3:8),0)});

// Compare only geometry; freshness is intentionally false during edits.
const geometry = x => ({lines:x.totalLines, slots:x.slotHeight, flavor:x.flavorEquivalentLines,
 windows:x.items.map(i=>({id:i.block.id, rows:i.lineCount, height:i.slotHeight,
  shift:i.shift, backgroundY:i.backgroundY, textY:i.textY}))});

test('Flicker: an edited 8-row paragraph remains 8 rows while awaiting measurement', () => {
 const before=box('one', '가나다 '.repeat(23)); const after={...before,text:before.text+'가'};
 assert.equal(rows(before.text).lineCount,8); assert.equal(rows(after.text).lineCount,8);
 const old={one:metric(before,8)};
 const steady=getAbilityBlockLayout([before],old,{isUnit:true});
 const pending=getAbilityBlockLayout([after],old,{isUnit:true});
 const done=getAbilityBlockLayout([after],{one:metric(after,8)},{isUnit:true});
 assert.deepEqual([steady.items[0].lineCount,pending.items[0].lineCount,done.items[0].lineCount],[8,8,8]);
 assert.deepEqual(geometry(steady),geometry(pending)); assert.deepEqual(geometry(done),geometry(steady));
 assert.equal(pending.ready,false); assert.equal(done.ready,true);
});

test('Flicker: real row growth/shrink uses latest measured count, never frozen indefinitely', () => {
 const a=box('a'); const b={...a,text:a.text+'추가'};
 const pending=getAbilityBlockLayout([b],{a:metric(a,8)});
 assert.equal(pending.items[0].lineCount,8); assert.equal(pending.ready,false);
 for(const next of [7,9,1,14]) {
  const done=getAbilityBlockLayout([b],{a:metric(b,next)});
  assert.equal(done.items[0].lineCount,next); assert.equal(done.ready,true);
 }
});

test('Flicker: retained rows preserve neighbours and flavour across 1-5 windows and orientations', () => {
 let checked=0;
 for(const flags of [{isUnit:true},{},{isCrest:true}]) {
  for(let count=1;count<=5;count++) {
   const before=Array.from({length:count},(_,i)=>box('b'+i));
   const old=Object.fromEntries(before.map((b,i)=>[b.id,metric(b,i+1)]));
   const base=geometry(getAbilityBlockLayout(before,old,flags));
   for(let edit=0;edit<count;edit++) {
    const after=before.map((b,i)=> i===edit?{...b,text:b.text+'X'}:b);
    const result=getAbilityBlockLayout(after,old,flags);
    assert.deepEqual(geometry(result),base); assert.equal(result.ready,false); checked++;
   }
  }
 }
 assert.equal(checked,45);
});

test('Flicker: genuine empty/new windows do not reuse a deleted window count', () => {
 const a=box('a'); const m={a:metric(a,8)};
 assert.equal(getAbilityBlockLayout([{...a,text:''}],m).items.length,0);
 const b=box('b','새 창\n두 줄'); const result=getAbilityBlockLayout([b],m);
 assert.equal(result.items[0].lineCount,2); assert.equal(result.ready,false);
});

test('Flicker: Enter/blank rows retain old geometry only until new measurement arrives', () => {
 const a=box('a','가\n\n나'); const old={a:metric(a,rows(a.text).lineCount)};
 assert.equal(old.a.lineCount,3);
 const b={...a,text:a.text+'\n\n다'};
 const pending=getAbilityBlockLayout([b],old);
 assert.equal(pending.items[0].lineCount,3); assert.equal(pending.ready,false);
 const next=rows(b.text); assert.equal(next.lineCount,5);
 assert.equal(getAbilityBlockLayout([b],{a:metric(b,next.lineCount)}).items[0].lineCount,5);
});

test('Flicker: pending current background cannot pass PNG export readiness', () => {
 const a=box('a');
 const pending=getAbilityBlockLayout([a],{a:metric(a,8,{backgroundReady:false})});
 assert.equal(pending.items[0].lineCount,8); assert.equal(pending.ready,false);
 const done=getAbilityBlockLayout([a],{a:metric(a,8,{backgroundReady:true})});
 assert.deepEqual(geometry(pending),geometry(done)); assert.equal(done.ready,true);
});

test('Flicker: pending background does not suppress an already measured width overflow', () => {
 const a=box('a'); const state={a:metric(a,8,{widthOverflow:true,backgroundReady:false})};
 const result=getAbilityBlockLayout([a],state);
 assert.equal(result.ready,false); assert.equal(result.overflow,true);
});

test('Flicker: existing measurements without new optional readiness field still work', () => {
 const a=box('a'); assert.equal(getAbilityBlockLayout([a],{a:metric(a,8)}).ready,true);
});

test('Flicker: rapid same-height text edits never collapse to manual-line count', () => {
 let text='가나다 '.repeat(20); let block=box('rapid',text);
 let previous=rows(text); let m={rapid:metric(block,previous.lineCount)};
 for(let i=0;i<60;i++) {
  text=text.endsWith('라')?text.slice(0,-1):text+'라';
  block={...block,text}; const pending=getAbilityBlockLayout([block],m);
  assert.equal(pending.items[0].lineCount,previous.lineCount);
  assert.equal(pending.ready,false);
  previous=rows(text); m={rapid:metric(block,previous.lineCount)};
  assert.equal(getAbilityBlockLayout([block],m).ready,true);
 }
});

test('Flicker: measurement reporting is pre-paint; layout and icon measurement algorithms untouched', () => {
 const output=readFileSync(new URL('../components/editor/AbilitiesOutput.jsx',import.meta.url),'utf8');
 assert.match(output,/useLayoutEffect\(\(\) => \{\s*onLayoutChange\?\./);
 assert.match(output,/const w = normalizeWidth\(width\);/);
 assert.doesNotMatch(output,/useEffect\(\(\) => \{\s*onLayoutChange\?\./);
});
