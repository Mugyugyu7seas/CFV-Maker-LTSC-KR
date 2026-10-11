import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultGradeNumberStyle, normalizeGradeNumberStyle, getGradeNumberFill, isGradeColor,
} from '../utils/GradeNumberStyle.js';
import { validateGradeColorPresets, getGradePresetStyle, GRADE_COLOR_PRESETS } from '../utils/store/GradeColorPresets.js';
import { normalizeCardData } from '../utils/CardFormat.js';

const defaultStyle = { mode:'default', color:'#ffffff', presetId:null };
const custom = color => ({mode:'custom', color, presetId:null});
const card = (more={}) => ({grade:3, cardName:'검증 카드', selectedType:'base_normal.png',
 abilitySpacingAdjust:-0.2, abilities:'AUTO: 시험\n\n*주석*', imageConfig:{x:-15,y:0,scale:0.8}, ...more});

test('Grade color: default equals previous white foreground', () => {
 assert.deepEqual(createDefaultGradeNumberStyle(), defaultStyle);
 assert.equal(getGradeNumberFill(), 'white');
 assert.equal(getGradeNumberFill(defaultStyle), 'white');
 assert.notEqual(createDefaultGradeNumberStyle(), createDefaultGradeNumberStyle());
});
test('Grade color: missing field on old cards becomes white, never previous card color', () => {
 const a=normalizeCardData(card({gradeNumberStyle:custom('#123456')}));
 const b=normalizeCardData(card());
 assert.equal(getGradeNumberFill(a.gradeNumberStyle), '#123456');
 assert.deepEqual(b.gradeNumberStyle,defaultStyle);
 assert.deepEqual({...a,gradeNumberStyle:defaultStyle},b);
});
test('Grade color: optional malformed values fall back safely', () => {
 for (const value of [null,0,false,[],{},'red',NaN,{mode:'custom'},custom('red'),custom('#fff'),
 custom('#12GGFF'),custom('#aabbccdd'),custom('url(https://invalid)'),{mode:'future',color:'#123456'}]) {
  assert.deepEqual(normalizeGradeNumberStyle(value),defaultStyle);
  assert.equal(getGradeNumberFill(value),'white');
 }
});
test('Grade color: valid six-digit colors normalize without changing card data', () => {
 for (const color of ['#000000','#ffffff','#BB3A3A','#2369C5','#00ff00']) {
  assert.equal(isGradeColor(color),true);
  const source=card({gradeNumberStyle:custom(color)});
  const saved=normalizeCardData(source);
  assert.equal(saved.gradeNumberStyle.color,color.toLowerCase());
  assert.equal(saved.grade,source.grade); assert.equal(saved.abilitySpacingAdjust,-0.2);
  assert.deepEqual(saved.imageConfig,source.imageConfig); assert.equal(saved.cardName,source.cardName);
 }
});
test('Grade color: resetting default never retains a hidden custom fill', () => {
 assert.deepEqual(normalizeGradeNumberStyle({mode:'default',color:'#000000',presetId:'black'}),defaultStyle);
});
test('Grade color: saved snapshots survive absent or modified catalogue entries', () => {
 const preset={id:'reference-blue',label:'Reference blue',color:'#2369C5'};
 const chosen=getGradePresetStyle(preset);
 assert.deepEqual(chosen,{mode:'preset',presetId:'reference-blue',color:'#2369c5'});
 preset.color='#000000';
 assert.equal(getGradeNumberFill(chosen),'#2369c5');
 assert.deepEqual(normalizeCardData(card({gradeNumberStyle:chosen})).gradeNumberStyle,chosen);
 assert.equal(validateGradeColorPresets(GRADE_COLOR_PRESETS), GRADE_COLOR_PRESETS);
});
test('Grade color: invalid preset identifier preserves valid snapshot as custom', () => {
 for (const presetId of [null,'',{},'default','custom']) {
  assert.deepEqual(normalizeGradeNumberStyle({mode:'preset',presetId,color:'#AABBCC'}),custom('#aabbcc'));
 }
});
test('Grade color: validate future user entries before use', () => {
 const good={id:'my-blue',label:'Blue',color:'#2369c5'};
 assert.equal(validateGradeColorPresets([good])[0],good);
 for(const entries of [null,{},[null],[{...good,id:'default'}],[{...good,id:'custom'}],
  [{...good,id:' my-blue'}],[good,{...good}],[{...good,color:'#fff'}],[{...good,label:''}]]) {
  assert.throws(()=>validateGradeColorPresets(entries),TypeError);
 }
});
test('Grade color: normalization is pure and idempotent',()=>{
 const src=Object.freeze({mode:'preset',color:'#AB12CD',presetId:'my-color'});
 const out=normalizeGradeNumberStyle(src);
 assert.equal(src.color,'#AB12CD'); assert.notEqual(src,out);
 assert.deepEqual(normalizeGradeNumberStyle(out),out);
});
test('Grade color: every numeric grade retains value after JSON round-trip',()=>{
 for(let grade=0;grade<=11;grade++) {
  const normalized=normalizeCardData(card({grade,gradeNumberStyle:custom('#3366aa')}));
  const loaded=normalizeCardData(JSON.parse(JSON.stringify(normalized)));
  assert.deepEqual(loaded,normalized); assert.equal(loaded.grade,grade);
 }
});
test('Grade color: SP and subtype/nation changes never affect explicit color',()=>{
 for (const isFullArt of [false,true]) for(const selectedType of [
  'base_normal.png','base_trigger.png','base_encounter.png','base_g.png',
  'base_g.png/encounter','base_blitz.png','base_set.png','base_normal_order.png',
 ]) {
  const source=card({isFullArt,selectedType,gradeNumberStyle:custom('#1234ab'),selectedNation:'green.png'});
  const loaded=normalizeCardData(source);
  assert.equal(getGradeNumberFill(loaded.gradeNumberStyle),'#1234ab');
  assert.equal(loaded.isFullArt,isFullArt); assert.equal(loaded.selectedType,selectedType);
  assert.equal(loaded.selectedNation,'green.png');
 }
});
test('Grade color: five ability windows and their SP settings survive color round-trip',()=>{
 const abilityBlocks=Array.from({length:5},(_,i)=>({id:`b${i}`,text:`AUTO: 能力 ${i}`,
  useSpTextStyle:!!(i%2),background:{mode:'custom',color:'#bb3a3a',presetId:null}}));
 const a=normalizeCardData(card({abilityBlocks,abilityBlocksVersion:1}));
 const b=normalizeCardData({...a,gradeNumberStyle:custom('#2255ff')});
 assert.deepEqual(b.abilityBlocks,a.abilityBlocks); assert.equal(b.abilities,a.abilities);
 assert.equal(b.abilitySpacingAdjust,a.abilitySpacingAdjust);
 assert.deepEqual(normalizeCardData(JSON.parse(JSON.stringify(b))),b);
});
