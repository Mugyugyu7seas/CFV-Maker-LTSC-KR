import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHexColor, createColorInputState, syncColorInputState, editColorInputState } from '../utils/ColorInput.js';

test('Color input: only six-digit valid HEX reaches live color state',()=>{
 let state=createColorInputState('#112233');
 for(const draft of ['', '#', '#1', '#12', '#123', '#1234', '#12345', '#zzzzzz','invalid']){
  state=editColorInputState(state,draft);
  assert.equal(state.draft,draft); assert.equal(state.selected,'#112233');
 }
 state=editColorInputState(state,'#AA33FF');
 assert.equal(state.selected,'#aa33ff');assert.equal(state.draft,'#AA33FF');
});
test('Color input: shorthand accepted explicitly, never half-way through six digits',()=>{
 assert.equal(normalizeHexColor('#abc'),'#aabbcc');
 assert.equal(normalizeHexColor('#abc',false),null);
 assert.equal(normalizeHexColor('  ABC  '),'#aabbcc');
 assert.equal(normalizeHexColor('123456',false),'#123456');
});
test('Color input: malformed external values are safe and do not become NaN HSV',()=>{
 for(const c of [undefined,null,0,{},[],true,'#','#zzzzzz','#12345','rgba(0,0,0,1)']){
  assert.equal(createColorInputState(c).selected,'#ffffff');
  assert.equal(normalizeHexColor(c),null);
 }
});
test('Color input: external reset replaces draft and palette without publishing',()=>{
 const initial=createColorInputState('#123456');
 const draft=editColorInputState(initial,'#aa');
 const imported=syncColorInputState(draft,'#FFFFFF');
 assert.equal(imported.selected,'#ffffff'); assert.equal(imported.draft,'#ffffff');
 assert.equal(imported.revision,1);
 assert.equal(syncColorInputState(imported,'#ffffff'),imported);
});
test('Color input: parent acknowledgement preserves typed casing and caret text',()=>{
 const state=editColorInputState(createColorInputState('#ffffff'),'#AA12BC');
 const ack=syncColorInputState(state,'#aa12bc');
 assert.equal(ack.draft,'#AA12BC');assert.equal(ack.selected,'#aa12bc');
 assert.equal(ack.revision,state.revision);
});
test('Color input: identical draft or prop is a no-op',()=>{
 const state=createColorInputState('#ffffff');
 assert.equal(editColorInputState(state,'#ffffff'),state);
 assert.equal(syncColorInputState(state,'#FFFFFF'),state);
});
test('Color input: each complete manual color gets one new picker revision',()=>{
 const a=createColorInputState('#ffffff');
 const b=editColorInputState(a,'#11');const c=editColorInputState(b,'#112233');
 assert.equal(b.revision,0);assert.equal(c.revision,1);
 assert.equal(editColorInputState(c,'#112233').revision,1);
});
