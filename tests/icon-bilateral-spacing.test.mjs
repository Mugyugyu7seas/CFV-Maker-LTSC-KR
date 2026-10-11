import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { layoutAbilities } from '../components/editor/text/LayoutAbilities.js';
import { ParseTokens } from '../components/editor/text/ParseTokens.js';
import { JustifyLine } from '../components/editor/text/JustifyLine.js';

const source = fs.readFileSync(new URL('../utils/store/IconConfig.js', import.meta.url),'utf8');
const declarations = source.slice(source.indexOf('export const ICON_CONFIG_BASE'),source.indexOf('function emit()'));
const registry = JSON.parse(JSON.stringify(vm.runInNewContext(declarations.replaceAll('export const ','const ')+'\n({ICON_CONFIG_BASE,COLOR_TAG_BASE})')));
const fresh = () => structuredClone(registry.ICON_CONFIG_BASE);
const measureText = text => [...text].reduce((w,c) => w + (c===' '?3:6),0);
const base = { ICON_CONFIG:fresh(), font:'Body', lightFont:'Regular',fontSize:11, MAX_WIDTH:370,bodyJustify:false,measureText };
const lay = (text,overrides={}) => layoutAbilities({...base,text,...overrides});
const icons = out => out.lines.flat().filter(n=>n.type!=='text');
const drawX = node => node.x + (node.iconSpacingBefore ?? 0);
const configWith = (key,fields) => { const c=fresh(); Object.assign(c.exact[key]||c.prefixes[key],fields);return c; };
const inputs = Object.keys(registry.ICON_CONFIG_BASE.exact);
for (const [key,c] of Object.entries(registry.ICON_CONFIG_BASE.prefixes)) {
  if(c.allowPlain) inputs.push(key);
  for(let i=c.valueRange.min;i<=c.valueRange.max;i++)inputs.push(`${key}(${i})`);
}
for (const [key,allow] of Object.entries(registry.COLOR_TAG_BASE.allow)) {
 for (const color of Object.keys(registry.COLOR_TAG_BASE.preset)) {
  if(allow===true || Array.isArray(allow)&&allow.includes(color)) inputs.push(`${key}@[${color}]`);
 }
}

test('All 104 configured inputs retain their own margins, in both card modes and with/without underline',()=>{
 assert.equal(inputs.length,104);
 for(const input of inputs) for(const dark of [false,true]) for(const underline of [false,true]) {
  const ns=icons(lay(underline?`__${input}__`:input,{dark}));
  assert.equal(ns.length,1,input);
  const token=ParseTokens(input,base.ICON_CONFIG,dark)[0];
  const settings=token.meta || token.config;
  const before=settings.iconSpacingBefore ?? 1;
  const after=settings.iconSpacingAfter ?? 1;
  const n=ns[0];assert.equal(n.x,0,input);assert.equal(drawX(n),before,input);
  assert.equal(n.width,20+before+after,input);
  assert.equal(n.iconSpacingBefore,before,input);assert.equal(n.iconSpacingAfter,after,input);
  assert.equal(Boolean(n.underline),underline);
 }
});

test('The image moves inside its slot; both margins advance the next text',()=>{
 const ns=lay('가COST나',{ICON_CONFIG:configWith('COST',{iconSpacingBefore:2,iconSpacingAfter:3})}).lines[0];
 assert.equal(ns.length,3);assert.equal(ns[0].width,6);
 assert.equal(ns[1].x,6);assert.equal(drawX(ns[1]),8);assert.equal(ns[1].width,25);
 assert.equal(ns[2].x,31);assert.equal(ns[2].x-(drawX(ns[1])+20),3);
});

test('Zero is valid for each side, not replaced with the default',()=>{
 const n=icons(lay('COST',{ICON_CONFIG:configWith('COST',{iconSpacingBefore:0,iconSpacingAfter:0})}))[0];
 assert.equal(n.width,20);assert.equal(drawX(n),0);
});

test('Symmetric custom margins of 0.3 are retained exactly',()=>{
 const n=icons(lay('COST',{ICON_CONFIG:configWith('COST',{iconSpacingBefore:0.3,iconSpacingAfter:0.3})}))[0];
 assert.equal(drawX(n),0.3);assert.ok(Math.abs(n.width-20.6)<1e-12);
});

test('A right-only COST override preserves its configured left margin',()=>{
 const n=icons(lay('COST',{ICON_CONFIG:configWith('COST',{iconSpacingAfter:0})}))[0];
 assert.equal(n.iconSpacingBefore,2);assert.equal(n.iconSpacingAfter,0);assert.equal(n.width,22);
 assert.equal(drawX(n),2);
});

test('A left-only COST override preserves its configured right margin',()=>{
 const n=icons(lay('COST',{ICON_CONFIG:configWith('COST',{iconSpacingBefore:0})}))[0];
 assert.equal(n.iconSpacingBefore,0);assert.equal(n.iconSpacingAfter,2);assert.equal(n.width,22);
 assert.equal(drawX(n),0);
});

test('Missing margins default to 1 independently for exact, plain and dynamic icons',()=>{
 // Remove settings only from a cloned fixture, never from the production registry.
 for(const fields of [{},{iconSpacingBefore:0},{iconSpacingAfter:0}]) {
  const c=fresh();
  for(const settings of [c.exact.COST,c.prefixes.CB]) {
   delete settings.iconSpacingBefore;delete settings.iconSpacingAfter;
   Object.assign(settings,fields);
  }
  for(const input of ['COST','CB','CB(1)']) {
   const n=icons(lay(input,{ICON_CONFIG:c}))[0];
   const before=fields.iconSpacingBefore ?? 1,after=fields.iconSpacingAfter ?? 1;
   assert.equal(n.iconSpacingBefore,before,input);assert.equal(n.iconSpacingAfter,after,input);
   assert.equal(n.width,20+before+after,input);assert.equal(drawX(n),before,input);
  }
 }
});

test('CB prefix overrides apply to both CB and CB(n)',()=>{
 const c=configWith('CB',{iconSpacingBefore:0.25,iconSpacingAfter:0.5});
 for(const token of ['CB','CB(1)','CB(5)']) {
  const n=icons(lay(token,{ICON_CONFIG:c}))[0];
  assert.equal(n.iconSpacingBefore,0.25);assert.equal(n.width,20.75);assert.equal(n.iconSpacingAfter,0.5);
 }
});

test('CC retains its explicit zero margins when CB settings are overridden',()=>{
 const c=configWith('CB',{iconSpacingBefore:0.25,iconSpacingAfter:0.5});
 for(const input of ['CC','CC(1)','CC(5)']) {
  const n=icons(lay(input,{ICON_CONFIG:c}))[0];
  assert.equal(n.iconSpacingBefore,0,input);assert.equal(n.iconSpacingAfter,0,input);
  assert.equal(n.width,20,input);assert.equal(drawX(n),0,input);
  assert.deepEqual(n,icons(lay(input))[0],input);
 }
});

test('Color tags and red bracket markup preserve the margin settings',()=>{
 const c=configWith('{',{iconSpacingBefore:0.1,iconSpacingAfter:0.2});
 for(const t of ['{','{@[red]','{@[gray]','/*{*/','__{__','/**{**/']) {
  const n=icons(lay(t,{ICON_CONFIG:c}))[0];assert.equal(n.iconSpacingBefore,0.1);assert.equal(n.iconSpacingAfter,0.2);
 }
});

test('A custom uploaded icon entry inherits defaults without any render-function change',()=>{
 const c=fresh();c.exact['[My Icon]']={src:'data:image/png;base64,AA==',iconHeight:12,custom:true};
 const n=icons(lay('[My Icon]',{ICON_CONFIG:c}))[0];assert.equal(n.width,22);assert.equal(drawX(n),1);
 Object.assign(c.exact['[My Icon]'],{iconSpacingBefore:0.25,iconSpacingAfter:0.75});
 const m=icons(lay('[My Icon]',{ICON_CONFIG:c}))[0];assert.equal(m.width,21);assert.equal(drawX(m),0.25);
});

test('Known measured image width is used, not the fallback width',()=>{
 const t=ParseTokens('COST',base.ICON_CONFIG)[0];
 const key=`${t.src}_${t.meta.iconHeight||11}`;
 const n=icons(lay('COST',{iconWidths:{[key]:7.5}}))[0];
 assert.equal(n.width,11.5);assert.equal(drawX(n),2);assert.equal(n.cacheKey,key);
 assert.equal(n.width-n.iconSpacingBefore-n.iconSpacingAfter,7.5);
});

test('Invalid settings fall back to finite numeric 1 on each side',()=>{
 for(const val of [null,undefined,NaN,Infinity,-Infinity,'0.3',{},true]) {
  const n=icons(lay('COST',{ICON_CONFIG:configWith('COST',{iconSpacingBefore:val,iconSpacingAfter:val})}))[0];
  assert.equal(n.width,22);
 }
});

test('Small negative margins remain explicit; icons are not rescaled',()=>{
 const n=icons(lay('COST',{ICON_CONFIG:configWith('COST',{iconSpacingBefore:-0.2,iconSpacingAfter:-0.1})}))[0];
 assert.equal(drawX(n),-0.2);assert.ok(Math.abs(n.width-19.7)<1e-12);
});

test('Two adjacent icons have the sum of the two facing margins',()=>{
 const [a,b]=icons(lay('COST{'));
 assert.equal(drawX(b)-(drawX(a)+20),2);
});

test('A real input space and bodyWordSpacing add to the margins, independently',()=>{
 const [a,b]=icons(lay('COST {',{bodyWordSpacing:0.5}));
 assert.equal(drawX(b)-(drawX(a)+20),2+3+0.5);
});

test('Both margins participate in wrap decisions including a newly started line',()=>{
 const out=lay('가COST',{MAX_WIDTH:27});
 assert.equal(out.lineCount,2);const n=icons(out)[0];assert.equal(n.x,0);assert.equal(drawX(n),2);
 assert.equal(n.width,24);
 assert.equal(out.widthOverflow,false);
 const overflow=lay('COST',{MAX_WIDTH:21});assert.equal(overflow.widthOverflow,true);
 // At 29 either margin alone would fit; their sum must cause a wrap.
 assert.equal(lay('가COST',{MAX_WIDTH:29}).lineCount,2);
 const fits=lay('가COST',{MAX_WIDTH:30});
 assert.equal(fits.lineCount,1);assert.equal(icons(fits)[0].x,6);
 assert.equal(fits.widthOverflow,false);
 assert.equal(lay('COST',{MAX_WIDTH:23}).widthOverflow,true);
 assert.equal(lay('COST',{MAX_WIDTH:24}).widthOverflow,false);
});

test('Korean justification retains the leading margin after rebuilding node x',()=>{
 const out=lay('첫 문장 COST 뒷 문장\\j',{bodyJustify:true,MAX_WIDTH:120});
 const line=out.lines[0];let x=0;
 for (const n of line) {assert.ok(Math.abs(n.x-x)<1e-9);x+=n.width;}
 assert.ok(Math.abs(x-120)<1e-9);
 const n=icons(out)[0];assert.equal(drawX(n)-n.x,2);assert.equal(n.width,24);
});

test('Legacy forced justification with/without spaces also retains leading margins',()=>{
 for(const text of ['가 COST 나\\j','COST{\\j']) {
  const out=lay(text,{bodyJustify:false,MAX_WIDTH:100});
  assert.equal(out.lineCount,1);assert.equal(out.widthOverflow,false);
  const line=out.lines[0];let x=0;
  for(const n of line) {assert.ok(Math.abs(n.x-x)<1e-9);x+=n.width+(n.extraGapAfter || 0);}
  assert.ok(Math.abs(x-100)<1e-9);
  for(const n of icons(out)) {
   const before=n.keyword==='COST'?2:0,after=n.keyword==='COST'?2:1;
   assert.equal(drawX(n)-n.x,before);assert.equal(n.iconSpacingAfter,after);
   assert.equal(n.width,20+before+after);
  }
 }
});

test('Blank lines and paragraph-end alignment are preserved',()=>{
 const out=lay('COST\n\nCB(1)',{bodyJustify:true});
 assert.equal(out.lineCount,3);assert.deepEqual(out.lines[1],[]);
 for(const n of icons(out))assert.equal(n.x,0);
});

test('Appearance flags cannot change layout: card SP and local SP text match',()=>{
 for(const input of inputs)for(const dark of [false,true]) {
  const opts={dark,bodyJustify:true,MAX_WIDTH:100,letterSpacing:-0.2,bodyWordSpacing:0.1,bodyScaleX:0.95};
  const text=`앞 문장 ${input} /*강조*/ __밑줄__ *주석*\n마지막`;
  assert.deepEqual(lay(text,{...opts,fullArt:true}),lay(text,opts));
  assert.deepEqual(lay(text,{...opts,useSpTextStyle:true}),lay(text,opts));
 }
});

test('RenderLine offsets all three icon groups and leaves text/underline slot positions intact (source check)',()=>{
 const body=fs.readFileSync(new URL('../components/editor/AbilitiesOutput.jsx',import.meta.url),'utf8');
 const render=body.slice(body.indexOf('const RenderLine'),body.indexOf('function AbilitiesOutput'));
 assert.match(render,/const iconX = node\.x \+ \(node\.iconSpacingBefore \?\? 0\);/);
 assert.equal((render.match(/<Group x=\{iconX\}/g)||[]).length,3);
 assert.doesNotMatch(render,/<Group x=\{node\.x\}/);
 assert.match(render,/<Text[\s\S]*?x=\{node\.x\}/);
 assert.equal((render.match(/node\.x \+ renderWidth/g)||[]).length,2);
 assert.equal((render.match(/fullArt=\{spText\}/g)||[]).length,3);
});
