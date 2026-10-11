// CFV hide-explanations and SEC UI v1
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultGradeNumberStyle, createNationGradeNumberStyle,
  normalizeGradeNumberStyle, getGradeNumberFill,
} from '../utils/GradeNumberStyle.js';
import {
  GRADE_COLOR_PRESETS, getNationGradePreset, validateGradeColorPresets,
} from '../utils/store/GradeColorPresets.js';
import { normalizeCardData } from '../utils/CardFormat.js';

const palette = [
  ['red.png','user-red-c40018','Dragon Empire','#c40018'],
  ['blue.png','user-blue-062c87','Dark States','#062c87'],
  ['gray.png','user-gray-abb3bf','Brandt Gate','#abb3bf'],
  ['yellow.png','user-yellow-fcc600','Keter Sanctuary','#fcc600'],
  ['green.png','user-green-007c36','Stoicheia','#007c36'],
  ['pink.png','user-pink-eb6c99','Lyrical Monasterio','#eb6c99'],
];

for (const [nation,id,label,color] of palette) {
  test(`Nation color: ${label} uses the exact user-supplied color`, () => {
    assert.deepEqual(getNationGradePreset(nation), {nation,id,label,color});
    assert.equal(getGradeNumberFill(createNationGradeNumberStyle(), nation), color);
    assert.equal(getGradeNumberFill(createDefaultGradeNumberStyle(), nation), 'white');
  });
}

test('Nation color: palette keys are explicit and do not depend on list order', () => {
  assert.equal(GRADE_COLOR_PRESETS.length, 6);
  assert.equal(validateGradeColorPresets(), GRADE_COLOR_PRESETS);
  for (const [nation,,,color] of palette) {
    assert.equal(getNationGradePreset(nation,[...GRADE_COLOR_PRESETS].reverse()).color,color);
  }
});

test('Nation color: an enabled style stores intent, never a stale color snapshot', () => {
  const intent = {mode:'nation'};
  assert.deepEqual(createNationGradeNumberStyle(),intent);
  assert.deepEqual(normalizeGradeNumberStyle({mode:'nation',color:'#000000',presetId:'old-blue'}),intent);
  assert.deepEqual(normalizeGradeNumberStyle(intent),intent);
  assert.notEqual(createNationGradeNumberStyle(),createNationGradeNumberStyle());
});

test('Nation color: all 36 direct nation transitions use the new nation immediately', () => {
  const intent=Object.freeze(createNationGradeNumberStyle());
  for(const [from,,,fromColor] of palette) for(const [to,,,toColor] of palette) {
    assert.equal(getGradeNumberFill(intent,from),fromColor);
    assert.equal(getGradeNumberFill(intent,to),toColor);
  }
  assert.deepEqual(intent,{mode:'nation'});
});

test('Nation color: absent, unknown, and future dual IDs remain white rather than guessing', () => {
  for(const nation of [undefined,null,'none.png','',{},[],['red.png','blue.png'],
    'Dragon Empire','/assets/base/nation/red.png','red+blue.png']) {
    assert.equal(getNationGradePreset(nation),null);
    assert.equal(getGradeNumberFill({mode:'nation'},nation),'white');
  }
});

test('Nation color: Custom Nation must not reuse the hidden previous built-in nation', () => {
  const intent={mode:'nation'};
  for(const [nation,,,color] of palette) {
    assert.equal(getGradeNumberFill(intent,nation,true),'white');
    assert.equal(getGradeNumberFill(intent,nation,false),color);
  }
  assert.deepEqual(intent,{mode:'nation'});
});

test('Nation color: missing style resets to default even after loading a colored card', () => {
  const old=normalizeCardData({selectedType:'base_normal.png',selectedNation:'red.png',abilities:'AUTO:test'});
  assert.deepEqual(old.gradeNumberStyle,createDefaultGradeNumberStyle());
  assert.equal(getGradeNumberFill(old.gradeNumberStyle,old.selectedNation),'white');
});

test('Nation color: previous custom/preset templates retain their exact saved appearance', () => {
  for(const mode of ['custom','preset']) {
    const style={mode,color:'#AB12CD',presetId:mode==='preset'?'old-preset':null};
    for(const [nation] of palette) {
      const loaded=normalizeCardData({selectedType:'base_normal.png',selectedNation:nation,gradeNumberStyle:style});
      assert.equal(loaded.gradeNumberStyle.mode,mode);
      assert.equal(getGradeNumberFill(loaded.gradeNumberStyle,nation),'#ab12cd');
      assert.equal(getGradeNumberFill(createDefaultGradeNumberStyle(),nation),'white');
      assert.equal(getGradeNumberFill(createNationGradeNumberStyle(),nation),getNationGradePreset(nation).color);
    }
  }
});

test('Nation color: JSON save/reload preserves mode and nation, not derived color', () => {
  for(const [selectedNation,,,color] of palette) {
    const source={grade:3,selectedNation,gradeNumberStyle:{mode:'nation'},selectedType:'base_blitz.png',
      abilities:'ACT: 한글 본문\n\n*주석*',abilitySpacingAdjust:-0.2,imageConfig:{scale:0.5,x:-10,y:15}};
    const normal=normalizeCardData(source);
    const loaded=normalizeCardData(JSON.parse(JSON.stringify(normal)));
    assert.deepEqual(loaded,normal);
    assert.deepEqual(loaded.gradeNumberStyle,{mode:'nation'});
    assert.equal(getGradeNumberFill(loaded.gradeNumberStyle,loaded.selectedNation),color);
    assert.equal(loaded.grade,3);assert.equal(loaded.abilitySpacingAdjust,-0.2);
    assert.deepEqual(loaded.imageConfig,source.imageConfig);
  }
});

test('Nation color: automatic modes follow edited palette values, legacy snapshots do not', () => {
  const preset=GRADE_COLOR_PRESETS.find(p=>p.nation==='red.png');
  const old=preset.color;
  try {
    preset.color='#102030';
    assert.equal(getGradeNumberFill({mode:'nation'},'red.png'),'#102030');
    assert.equal(getGradeNumberFill({mode:'preset',presetId:preset.id,color:old},'red.png'),old);
  } finally {preset.color=old;}
});

test('Nation color: invalid or duplicate nation mappings are not valid presets', () => {
  const red=GRADE_COLOR_PRESETS[0];
  for(const list of [[{...red,nation:1}],[{...red,nation:''}],
    [red,{...red,id:'different-id'}],[{...red,id:'nation'}]]) {
    assert.throws(()=>validateGradeColorPresets(list),TypeError);
  }
  assert.equal(getNationGradePreset('red.png',[{...red,color:'invalid'}]),null);
  assert.equal(getNationGradePreset('red.png',null),null);
});

test('Nation color: SP/cards of all numeric types preserve the palette and five ability windows', () => {
  const abilityBlocks=Array.from({length:5},(_,i)=>({id:`b${i}`,text:`AUTO: ability ${i}`,
    useSpTextStyle:i%2===1,hideExplanations:false,background:{mode:'custom',color:'#bb3a3a',presetId:null}}));
  for(const isFullArt of [false,true]) for(const selectedType of [
    'base_normal.png','base_trigger.png','base_g.png','base_encounter.png',
    'base_g.png/encounter','base_normal_order.png','base_blitz.png','base_set.png',
    'base_trigger_o.png','base_blitz_trigger_o.png','base_set_trigger_o.png',
  ]) {
    const source={grade:3,selectedType,selectedNation:'green.png',isFullArt,abilityBlocks,
      abilityBlocksVersion:1,abilitySpacingAdjust:0.15,gradeNumberStyle:{mode:'nation'}};
    const out=normalizeCardData(source);
    assert.equal(out.selectedType,selectedType);assert.equal(out.isFullArt,isFullArt);
    assert.equal(out.abilitySpacingAdjust,0.15);assert.deepEqual(out.abilityBlocks,abilityBlocks);
    assert.equal(getGradeNumberFill(out.gradeNumberStyle,out.selectedNation),'#007c36');
  }
});
