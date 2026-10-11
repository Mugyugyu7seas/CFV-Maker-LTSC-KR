const getCurrentWordInfo = (text, cursorPosition) => {
  const textBeforeCursor = text.substring(0, cursorPosition);
  const match = textBeforeCursor.match(/[a-zA-Z0-9_/@[\](){}-]+$/);

  return !match
    ? { word: "", start: cursorPosition }
    : { word: match[0], start: cursorPosition - match[0].length };
};

const getSuggestionsList = (iconConfig) => {
  if (!iconConfig) return [];
  const list = [];

  if (iconConfig.exact) {
    Object.keys(iconConfig.exact).forEach((key) => {
      list.push(key);
    });
  }

  if (iconConfig.prefixes) {
    Object.keys(iconConfig.prefixes).forEach((prefix) => {
      const config = iconConfig.prefixes[prefix];

      if (config.allowPlain === true) {
        list.push(prefix);
      }

      if (
        config.valueRange &&
        typeof config.valueRange.min === "number" &&
        typeof config.valueRange.max === "number"
      ) {
        const min = config.valueRange.min;
        const max = config.valueRange.max;

        for (let v = min; v <= max; v++) {
          list.push(`${prefix}(${v})`);
        }
      }
    });
  }

  return Array.from(new Set(list));
};

const filterSuggestions = (word, allSuggestions, colorTagConfig) => {
  if (!word || word.length < 1) return [];

  const w = word.toLowerCase();
  const list = [];

  allSuggestions.forEach((s) => {
    const sLow = s.toLowerCase();
    const hasVariants = allSuggestions.some(
      (x) => x !== s && x.toLowerCase().startsWith(`${sLow}(`)
    );

    const allowVal = colorTagConfig?.allow?.[s];
    const allowColorVariants = allowVal === true || (Array.isArray(allowVal) && allowVal.length > 0);
    const escaped = sLow.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const completedColorVariantRegex = new RegExp(`^${escaped}@\\[[^\\]]+\\](?:.+)?$`);
    const partialColorVariantRegex = new RegExp(`^${escaped}@\\[[^\\]]*$`);

    const isCompletedColorVariant = completedColorVariantRegex.test(w);
    const isTypingColorVariant = partialColorVariantRegex.test(w);

    let match = false;

    if ((s === word && !hasVariants && !allowColorVariants) || isCompletedColorVariant) {
      match = false;
    }
    else if (allowColorVariants && isTypingColorVariant) {
      match = true;
    }
    else if (sLow.startsWith(w)) {
      match = true;
    }
    else if (s.startsWith("[") && s.endsWith("]")) {
      const inner = s.slice(1, -1);
      const innerLow = inner.toLowerCase();

      if (inner === word && !allowColorVariants) {
        match = false;
      } else if (innerLow.startsWith(w)) {
        match = true;
      }
    }

    if (match) {
      list.push(s);

      if (allowColorVariants && colorTagConfig?.preset) {
        const allColors = Object.keys(colorTagConfig.preset);
        const colors = Array.isArray(allowVal) ? allColors.filter((c) => allowVal.includes(c)) : allColors;
        colors.forEach((color) => {
          list.push(`${s}@[${color}]`);
        });
      }
    }
  });

  return Array.from(new Set(list)).slice(0, 11);
};


export { getCurrentWordInfo, getSuggestionsList, filterSuggestions };
