// CFV ride-deck explanations control v1
// CFV hide-explanations and SEC UI v1
import { createDefaultGradeNumberStyle } from "../GradeNumberStyle";
import { createAbilityBlock, reconcileAbilityBlocks, getLegacyAbilityText } from "../AbilityBlocks";
import React, { createContext, useContext, useReducer, useCallback } from "react";



const CardContext = createContext();

export const initialState = {
  selectedNation: 'none.png',
  selectedType: 'base_normal.png',
  subOrderType: 'Subtype',
  isSubType: false,
  selectedPassive: 'boost.png',
  selectedTrigger: 'draw.png',
  clan: 'race.png',
  imageSrc: null,
  imageConfig: { scale: 1, x: 0, y: 0 },
  addition: "",
  exportPreset: 'standard',
  exportTrigger: 0,
  cardName: 'Card Name',
  illust: '',
  flavor: '',
  abilities: '',
  abilityBlocksVersion: 1,
  abilityBlocks: [createAbilityBlock('ability-1')],
  abilityLayoutStatus: { ready: true, overflow: false, totalLines: 0 },
  abilitySpacingAdjust: 0,
  rideDeckHideExplanations: false,
  grade: 0,
  gradeNumberStyle: createDefaultGradeNumberStyle(),
  power: 6000,
  raceText: 'Race',
  raceCheck: false,
  shield: 5000,
  shieldCheck: true,
  isFullArt: false,
  isSec: false,
  showGlobe: true,
  showClan: false,
  baseColorTint: { enabled: false, color: '#00b9ff' },

  solidColor: "#0600ff",
  customNationEnabled: false,
  customNationName: 'Nation Name',

  cardNameGradient: ["#6fa8ff", "#ffffff"],
  nationGradient: ["#005eec", "#3d8bff", "#81b3ff"],

  isLocked: false,
  isSaved: true,
  importPreview: null,
  showImportModal: false,
  isImporting: false,
  tempImageSrc: null,
  isImportingPreview: false,
  customLayers: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ABILITY_BLOCKS': {
      const abilityBlocks = reconcileAbilityBlocks(state.abilityBlocks, typeof action.blocks === "function" ? action.blocks(state.abilityBlocks) : action.blocks);
      if (abilityBlocks === state.abilityBlocks) return state;
      return { ...state, abilityBlocks, abilities: getLegacyAbilityText(abilityBlocks), isSaved: false };
    }
    case 'SET_FIELD':
      // Backward-compatible callers may edit one string, but never split it here.
      if (action.field === 'abilities') {
        const abilityBlocks = [createAbilityBlock(state.abilityBlocks[0].id, action.value ?? '')];
        return { ...state, abilityBlocks, abilities: getLegacyAbilityText(abilityBlocks) };
      }
      if (Object.is(state[action.field], action.value)) return state;
      if (action.field === 'abilityLayoutStatus' && state.abilityLayoutStatus && action.value &&
          Object.keys(action.value).length === Object.keys(state.abilityLayoutStatus).length &&
          Object.keys(action.value).every((key) => Object.is(action.value[key], state.abilityLayoutStatus[key]))) {
        return state;
      }
      return { ...state, [action.field]: action.value };
    case 'SET_MULTIPLE':
      return { ...state, ...action.payload };
    case 'SET_IMAGE_CONFIG':
      const isSame =
        state.imageConfig.scale === action.payload.scale &&
        state.imageConfig.x === action.payload.x &&
        state.imageConfig.y === action.payload.y;
      if (isSame) return state;
      return {
        ...state,
        imageConfig: {
          ...state.imageConfig,
          ...action.payload,
        },
      };
    default:
      return state;
  }
}

export function CardProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setAbilityBlocks = useCallback((blocks) => dispatch({ type: 'SET_ABILITY_BLOCKS', blocks }), []);
  const setField = useCallback((field, value) => dispatch({ type: 'SET_FIELD', field, value }), []);
  const setMultiple = useCallback((payload) => dispatch({ type: 'SET_MULTIPLE', payload }), []);
  const setImageConfig = useCallback((payload) => dispatch({ type: 'SET_IMAGE_CONFIG', payload }), []);

  const value = {
    state,
    setField,
    setMultiple,
    setImageConfig,
    setAbilityBlocks,
  };

  return <CardContext.Provider value={value}>{children}</CardContext.Provider>;
}

export function useCardState() {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error("useCardState must be used within a CardProvider");
  }
  return context;
}