import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutAbilities } from '../components/editor/text/LayoutAbilities.js';
import { ParseTokens } from '../components/editor/text/ParseTokens.js';
import { filterExplanationTokens } from '../utils/AbilityExplanations.js';
import { createAbilityBlock, normalizeAbilityBlocks, reconcileAbilityBlocks } from '../utils/AbilityBlocks.js';
import { getAbilityBlockLayout, getAbilityFlavorY } from '../utils/AbilityBlockLayout.js';
import { normalizeCardData } from '../utils/CardFormat.js';
import { isSecMode, normalizeSecPreference } from '../utils/SecMode.js';
const config = {exact:{AUTO:{src:'/assets/icon/AUTO.png',iconHeight:11,iconSpacingBefore:0.25,iconSpacingAfter:0.4},'{':{src:'/assets/icon/[.png'},'}':{src:'/assets/icon/].png'}},prefixes:{CB:{allowPlain:true,baseSrc:'/assets/icon/cost/CB.png',valueRange:{min:1,max:5},iconSpacingBefore:0.15,iconSpacingAfter:0.25}}};
const opts={ICON_CONFIG:config,font:'Bold',lightFont:'Regular',fontSize:11,bodyScaleX:1,bodyWordSpacing:0,letterSpacing:0,bodyJustify:false,MAX_WIDTH:100,measureText:(s,size,style,font)=>Array.from(s).reduce((w,c)=>w+(c===' '?3:font==='Regular'?5:6),0)};
const lay=(text,overrides={})=>layoutAbilities({...opts,text,...overrides});
const textOf=(result)=>result.lines.map(line=>line.filter(n=>n.type==='text').map(n=>n.text).join('')).join('\n');
const freeze=(x)=>{if(x&&typeof x==='object'){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};

test('Hide defaults to false and raw text is preserved during normalization',()=>{
 const raw='앞 *주석* 뒤\n\n__밑줄__'; const b=createAbilityBlock('a',raw);
 assert.equal(b.hideExplanations,false);
 const [hidden]=normalizeAbilityBlocks([{...b,hideExplanations:true}]);
 assert.equal(hidden.text,raw); assert.equal(hidden.hideExplanations,true);
 assert.throws(()=>normalizeAbilityBlocks([{...b,hideExplanations:'true'}]),/hideExplanations/);
});
for(const markup of ['*주석*','*__밑줄 주석__*','__*밑줄 주석*__','/**빨간 주석**/']){
 test(`Hide recognizes existing annotation tokens: ${markup}`,()=>{
  const result=lay(`앞${markup}뒤`,{hideExplanations:true});
  assert.equal(textOf(result),'앞뒤');
  assert.deepEqual(result,lay('앞뒤'));
 });
}
test('Normal red markup, plain parentheses and plain text are NOT explanations',()=>{
 const source='/*강조*/ (괄호) 글자';
 assert.deepEqual(lay(source,{hideExplanations:true}),lay(source));
 assert.equal(textOf(lay(source,{hideExplanations:true})),'강조 (괄호) 글자');
});
test('A red paragraph can contain a hidden annotation without losing red text',()=>{
 const out=lay('/*앞*주석*뒤*/',{hideExplanations:true});
 assert.equal(textOf(out),'앞뒤');assert.ok(out.lines.flat().every(n=>n.color==='#ff0000'));
});
test('Only completed existing annotation markup is filtered; unmatched star remains',()=>{
 assert.deepEqual(lay('앞*닫지않음',{hideExplanations:true}),lay('앞*닫지않음'));
});
test('Icons and their underline inside a hidden explanation consume no width',()=>{
 const source='AUTO *{CB(1) __CB__}* 뒤';
 const out=lay(source,{hideExplanations:true});
 const icons=out.lines.flat().filter(n=>n.type!=='text');
 assert.equal(icons.length,1);assert.equal(icons[0].keyword,'AUTO');
 assert.equal(icons[0].iconSpacingBefore,0.25);assert.equal(icons[0].iconSpacingAfter,0.4);
 assert.ok(out.lines.flat().every(n=>!n.annotation));
});
test('Hidden content is excluded before measuring and wrapping',()=>{
 const measured=[];
 const result=lay('앞 *주석주석주석주석주석주석* 뒤',{hideExplanations:true,MAX_WIDTH:60,measureText:(s)=>{measured.push(s);return s.length*6;}});
 assert.ok(measured.every(s=>!s.includes('주석')));assert.equal(result.lineCount,1);
 assert.ok(lay('앞 *주석주석주석주석주석주석* 뒤',{MAX_WIDTH:60}).lineCount>1);
});
test('Explanation-only rows disappear; authored internal blank rows remain',()=>{
 const out=lay('첫째\n*주석*\n\n둘째',{hideExplanations:true});
 assert.equal(out.lineCount,3);assert.deepEqual(out.lines[1],[]);
 assert.equal(textOf(out),'첫째\n\n둘째');
});
for(const source of ['*주석*','\n*주석*\n','*주석*\n\n','*주석*\n/**다른 주석**/']) {
 test(`Explanation-only window has zero rows: ${JSON.stringify(source)}`,()=>{
  assert.deepEqual(lay(source,{hideExplanations:true}),{lines:[],lineCount:0,widthOverflow:false});
 });
}
test('Filtering is immutable and returns unchanged tokens if disabled or no annotations',()=>{
 const tokens=freeze(ParseTokens('앞*주석*뒤',config));
 const snapshot=JSON.stringify(tokens);
 assert.equal(filterExplanationTokens(tokens),tokens);
 filterExplanationTokens(tokens,true);assert.equal(JSON.stringify(tokens),snapshot);
 const plain=ParseTokens('보통 AUTO',config);assert.equal(filterExplanationTokens(plain,true),plain);
});
test('Only the selected window changes; other block objects keep identity',()=>{
 const blocks=[createAbilityBlock('a','가 *주석*'),createAbilityBlock('b','나 *주석*')];
 const changed=reconcileAbilityBlocks(blocks,blocks.map(b=>b.id==='a'?{...b,hideExplanations:true}:b));
 assert.notEqual(changed[0],blocks[0]);assert.equal(changed[1],blocks[1]);
 assert.equal(changed[0].text,blocks[0].text);assert.equal(changed[1].hideExplanations,false);
});
test('Measurement identity invalidates on hide mode, including zero-to-visible restore',()=>{
 const shown=createAbilityBlock('a','*주석*');const hidden={...shown,hideExplanations:true};
 const measure={a:{text:shown.text,lineCount:1,hideExplanations:false,widthOverflow:false}};
 const waiting=getAbilityBlockLayout([hidden],measure,{isUnit:true});
 assert.equal(waiting.ready,false);assert.equal(waiting.items[0].lineCount,1);
 const done={a:{text:shown.text,lineCount:0,hideExplanations:true,widthOverflow:false}};
 const hiddenLayout=getAbilityBlockLayout([hidden],done,{isUnit:true});
 assert.equal(hiddenLayout.ready,true);assert.equal(hiddenLayout.items.length,0);
 const restored=getAbilityBlockLayout([shown],done,{isUnit:true});
 assert.equal(restored.ready,false);assert.equal(restored.items.length,1);
});
test('Top-only flavor gap follows the remaining visible window after hiding one',()=>{
 const a={...createAbilityBlock('a','*note*'),hideExplanations:true},b=createAbilityBlock('b','body');
 const m={a:{text:a.text,lineCount:0,hideExplanations:true},b:{text:b.text,lineCount:1}};
 const result=getAbilityBlockLayout([a,b],m,{isUnit:true});assert.equal(result.topWindowId,'b');
 assert.equal(result.items[0].shift,0);
 assert.equal(getAbilityFlavorY(result,{flavorBoxHeight:20,flavorGap:13}),result.top-33);
});
test('Hide is independent of fullArt / local SP; existing red styles and raw source survive',()=>{
 const text='__앞__ *주석* /*빨강*/';const expected=lay(text,{hideExplanations:true});
 for(const fullArt of [false,true])for(const useSpTextStyle of [false,true]){
  assert.deepEqual(lay(text,{hideExplanations:true,fullArt,useSpTextStyle}),expected);
 }
});
for(const mode of [{isFullArt:false,isSec:false},{isFullArt:false,isSec:true},{isFullArt:true,isSec:false},{isFullArt:true,isSec:true}]) {
 test(`SEC effective state ${JSON.stringify(mode)}`,()=>assert.equal(isSecMode(mode),mode.isFullArt&&mode.isSec));
}
test('SEC old templates default off and invalid metadata is rejected',()=>{
 assert.equal(normalizeCardData({abilities:'old'}).isSec,false);
 assert.equal(normalizeSecPreference(undefined),false);assert.equal(normalizeSecPreference(null),false);
 assert.throws(()=>normalizeSecPreference('true'),/isSec/);
});
test('Hide flag, SEC preference and raw text round-trip without altering other state',()=>{
 const source={isFullArt:true,isSec:true,customNationEnabled:true,selectedNation:'green.png',solidColor:'#81cca2',
  abilitySpacingAdjust:-1,gradeNumberStyle:{mode:'nation'},imageConfig:{x:3,y:-4,scale:1.2},
  abilityBlocks:[{...createAbilityBlock('a','/*강조*/ *주석*'),hideExplanations:true},createAbilityBlock('b','두번째')]};
 const out=normalizeCardData(source),again=normalizeCardData(JSON.parse(JSON.stringify(out)));
 assert.deepEqual(again,out);assert.equal(out.abilityBlocks[0].text,source.abilityBlocks[0].text);
 assert.equal(out.customNationEnabled,true);assert.equal(out.solidColor,source.solidColor);
 assert.equal(out.abilitySpacingAdjust,-1);assert.deepEqual(out.gradeNumberStyle,{mode:'nation'});
 const spOff={...out,isFullArt:false};assert.equal(isSecMode(spOff),false);assert.equal(spOff.isSec,true);
 assert.equal(isSecMode({...spOff,isFullArt:true}),true);
});
