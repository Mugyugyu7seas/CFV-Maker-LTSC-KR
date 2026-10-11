import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAbilityBlock, reconcileAbilityBlocks, normalizeAbilityBlocks,
} from '../utils/AbilityBlocks.js';
import { getCurrentWordInfo, getSuggestionIndex, findSuggestions } from '../utils/EditorSuggestions.js';
import { getCurrentWordInfo as oldWord, getSuggestionsList, filterSuggestions } from './fixtures/original-editor-suggestions.mjs';
import { getAbilityRemovalFocusId, captureAbilityFocus, restoreAbilityFocus } from '../utils/AbilityEditorFocus.js';

const config = { exact: Object.fromEntries(['AUTO','ACT','CONT','COST','{','}','VC','RC','GC','[Divine Skill]','C.+','[Odd]','low','Low'].map(k=>[k,{}])),
  prefixes: { CB:{allowPlain:true,valueRange:{min:1,max:5}}, SB:{allowPlain:true,valueRange:{min:1,max:10}}, GB:{allowPlain:false,valueRange:{min:1,max:8}} }};
const tag = {allow:{COST:['red'],'{':true,'}':true,'C.+':true, Low:['red']},preset:{red:{},gray:{},green:{}}};
const initial = () => normalizeAbilityBlocks([1,2,3,4,5].map(i=>createAbilityBlock(`id-${i}`,`내용 ${i}`)));

test('One edit retains all four untouched window identities',()=>{
 const old=initial(); const next=reconcileAbilityBlocks(old,old.map((b,i)=>i===2?{...b,text:'새 내용'}:b));
 assert.notEqual(next,old); assert.notEqual(next[2],old[2]);
 for (const i of [0,1,3,4]) assert.equal(next[i],old[i]);
 assert.equal(old[2].text,'내용 3');
});
test('No-op events do not dirty the array',()=>{
 const a=initial(); assert.equal(reconcileAbilityBlocks(a,a),a);
 assert.equal(reconcileAbilityBlocks(a,JSON.parse(JSON.stringify(a))),a);
});
test('Reordering/deletion retains IDs, colours and SP flags',()=>{
 const a=initial(); a[1]={...a[1],useSpTextStyle:true,background:{mode:'custom',presetId:null,color:'#123456'}};
 const moved=reconcileAbilityBlocks(a,[a[4],a[1],a[0],a[2],a[3]]);
 assert.equal(moved[0],a[4]); assert.equal(moved[1],a[1]);
 const deleted=reconcileAbilityBlocks(moved,moved.filter(b=>b.id!==a[0].id));
 assert.equal(deleted[1].background.color,'#123456'); assert.equal(deleted[1].useSpTextStyle,true);
});
test('Normalization guards and unknown fields are preserved',()=>{
 const a=initial();
 assert.throws(()=>reconcileAbilityBlocks(a,[...a,createAbilityBlock('six')]),/maximum/);
 const b=reconcileAbilityBlocks(a,a.map((b,i)=>i?b:{...b,text:'A\r\nB',future:{keep:true}}));
 assert.equal(b[0].text,'A\nB'); assert.deepEqual(b[0].future,{keep:true});
 assert.notEqual(b[0],a[0]);
});
test('Autocomplete catalogue reused across windows, invalidated by new snapshots',()=>{
 const a=getSuggestionIndex(config,tag); assert.equal(a,getSuggestionIndex(config,tag));
 assert.notEqual(a,getSuggestionIndex({...config},tag));
 assert.notEqual(a,getSuggestionIndex(config,{...tag}));
});
test('Autocomplete output equals original code across tokens, case, prefixes and colour syntax',()=>{
 const originalList=getSuggestionsList(config), index=getSuggestionIndex(config,tag);
 const queries=new Set(['','한글','공백 ','[','{','}','NOT','C.+','C.+@[red]x']);
 for(const term of originalList) for(const form of [term,term.toLowerCase(),term.toUpperCase(),`${term}@[red]`,`${term}@[`,`${term}@[g`,`${term}@[gray]after`]) {
  for(let n=0;n<=form.length;n++) queries.add(form.slice(0,n));
 }
 for(const query of queries) assert.deepEqual(findSuggestions(query,index),filterSuggestions(query,originalList,tag),query);
});
test('Candidate ordering, duplicate elimination and 11-item cap are unchanged',()=>{
 const c={...config,exact:{...config.exact,...Object.fromEntries(Array.from({length:250},(_,i)=>[`X-${i}`,{}]))}};
 const i=getSuggestionIndex(c,tag), old=getSuggestionsList(c);
 for(const q of ['X','x-','x-2','C','[','']) assert.deepEqual(findSuggestions(q,i),filterSuggestions(q,old,tag));
 assert.equal(findSuggestions('X',i).length,11);
});
test('Caret token extraction stays byte-for-byte equivalent in mixed Korean markup',()=>{
 const strings=['AUTO:이 유닛이 어택했을 때','/**{RC}**/ __CB(1)__','POWER@[red]','한글\n[Divine Skill]','*주석*','{}[]()'];
 for (const s of strings) for(let i=0;i<=s.length;i++) assert.deepEqual(getCurrentWordInfo(s,i),oldWord(s,i));
});
test('Delete focus: following window, previous at end, no deletion of the last one',()=>{
 const b=initial(); assert.equal(getAbilityRemovalFocusId(b,'id-1'),'id-2');
 assert.equal(getAbilityRemovalFocusId(b,'id-3'),'id-4');
 assert.equal(getAbilityRemovalFocusId(b,'id-5'),'id-4');
 assert.equal(getAbilityRemovalFocusId([b[0]],'id-1'),null); assert.equal(getAbilityRemovalFocusId(b,'missing'),null);
});
test('DOM focus helper preserves a selection and rejects detached/foreign inputs',()=>{
 const doc={activeElement:null}; const e={value:'abcdef',selectionStart:2,selectionEnd:4,selectionDirection:'backward',isConnected:true,
  focus(){doc.activeElement=this;},setSelectionRange(s,en,d){this.selectionStart=s;this.selectionEnd=en;this.selectionDirection=d;}};
 doc.getElementById=id=>id==='ability-text-id'?e:null;
 const root={ownerDocument:doc,contains:el=>el===e};
 const saved=captureAbilityFocus(root,'id'); assert.equal(restoreAbilityFocus(root,saved),true);
 assert.equal(e.selectionStart,2); assert.equal(e.selectionEnd,4); assert.equal(e.selectionDirection,'backward');
 e.value='a'; restoreAbilityFocus(root,saved); assert.equal(e.selectionEnd,1);
 e.isConnected=false; assert.equal(restoreAbilityFocus(root,saved),false);
 e.isConnected=true; e.disabled=true; assert.equal(restoreAbilityFocus(root,saved),false);
 assert.equal(restoreAbilityFocus(null,saved),false);
});
