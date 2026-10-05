"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const LanguageContext = createContext(null);

let currentUiLanguage = "en";
let currentCardLanguage = "en";

export const getLanguage = () => {
  if (typeof window !== "undefined") {
    return (
      localStorage.getItem("uiLang") ||
      localStorage.getItem("lang") ||
      currentUiLanguage
    );
  }

  return currentUiLanguage;
};

export const getCardLanguage = () => {
  if (typeof window !== "undefined") {
    return (
      localStorage.getItem("cardLang") ||
      currentCardLanguage
    );
  }

  return currentCardLanguage;
};

export const setLanguageValue = (lang) => {
  currentUiLanguage = lang;

  if (typeof window !== "undefined") {
    localStorage.setItem("uiLang", lang);

    // 기존 버전과 호환하기 위해 당분간 유지
    localStorage.setItem("lang", lang);

    document.documentElement.lang = lang;
  }
};

export const setCardLanguageValue = (lang) => {
  currentCardLanguage = lang;

  if (typeof window !== "undefined") {
    localStorage.setItem("cardLang", lang);
  }
};

export function LanguageProvider({ children }) {
  const [uiLang, setUiLangState] = useState("en");
  const [cardLang, setCardLangState] = useState("en");

  useEffect(() => {
    const savedUiLang =
      localStorage.getItem("uiLang") ||
      localStorage.getItem("lang") ||
      "en";

    const savedCardLang =
      localStorage.getItem("cardLang") ||
      savedUiLang;

    currentUiLanguage = savedUiLang;
    currentCardLanguage = savedCardLang;

    setUiLangState(savedUiLang);
    setCardLangState(savedCardLang);

    document.documentElement.lang = savedUiLang;
  }, []);

  const setUiLang = (newLang) => {
    setLanguageValue(newLang);
    setUiLangState(newLang);
  };

  const setCardLang = (newLang) => {
    setCardLanguageValue(newLang);
    setCardLangState(newLang);
  };

  return (
    <LanguageContext.Provider
      value={{
        uiLang,
        setUiLang,

        cardLang,
        setCardLang,

        // 기존 코드가 아직 lang을 사용하므로 임시 호환
        lang: uiLang,
        setLang: setUiLang,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLang must be used inside LanguageProvider"
    );
  }

  return context;
};