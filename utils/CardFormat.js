// CFV ride-deck explanations control v1
// CFV hide-explanations and SEC UI v1
import { normalizeAbilityData } from "./AbilityBlocks.js";
import { normalizeRideDeckHideExplanations } from "./RideDeckAbilities.js";
import { normalizeSecPreference } from "./SecMode.js";
import { normalizeGradeNumberStyle } from "./GradeNumberStyle.js";

// File metadata only. There is no selectable runtime card language.
export const CARD_LANGUAGE = "ko";

export const normalizeCardData = (cardData) => {
  if (!cardData || typeof cardData !== "object" || Array.isArray(cardData)) {
    throw new TypeError("Invalid card data: expected an object");
  }
  const { lang, uiLang, cardLang, ...content } = cardData;
  // Normalize both historical and explicit metadata keys to the actual output layout.
  // Do not translate user text, remap nation/clan IDs, or change image settings.
  return {
    ...normalizeAbilityData(content),
    isSec: normalizeSecPreference(content.isSec),
    rideDeckHideExplanations: normalizeRideDeckHideExplanations(content.rideDeckHideExplanations),
    gradeNumberStyle: normalizeGradeNumberStyle(content.gradeNumberStyle),
    lang: CARD_LANGUAGE,
    cardLang: CARD_LANGUAGE,
  };
};
