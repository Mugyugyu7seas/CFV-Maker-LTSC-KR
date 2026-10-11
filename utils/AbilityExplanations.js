/**
 * Remove only parts marked as annotations by the existing card markup parser.
 * No regex over '*' is used: red-only /* ... *\/ and normal text stay intact.
 * The caller filters BEFORE measuring, wrapping and drawing.
 */
export function filterExplanationTokens(tokens, hideExplanations = false) {
  if (!hideExplanations) return tokens;
  const hasAnnotations = tokens.some((token) => token.annotation === true ||
    (token.type === "text" && token.parts.some((part) => part.annotation === true)));
  if (!hasAnnotations) return tokens;

  const sameStyle = (a, b) => {
    const keysA = Object.keys(a).filter((key) => key !== "text");
    const keysB = Object.keys(b).filter((key) => key !== "text");
    return keysA.length === keysB.length &&
      keysA.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]));
  };
  const visible = [];
  for (const token of tokens) {
    if (token.annotation === true) continue;
    if (token.type !== "text") {
      visible.push(token);
      continue;
    }
    for (const part of token.parts) {
      if (part.annotation === true || !part.text) continue;
      const lastToken = visible.at(-1);
      const lastPart = lastToken?.type === "text" ? lastToken.parts.at(-1) : null;
      // Restore a single text run across removed inline explanations, but never
      // merge through an icon or a different markup style. Source is immutable.
      if (lastPart && sameStyle(lastPart, part)) {
        lastToken.parts[lastToken.parts.length - 1] = {
          ...lastPart, text: lastPart.text + part.text,
        };
      } else if (lastToken?.type === "text") {
        lastToken.parts.push({ ...part });
      } else {
        visible.push({ ...token, parts: [{ ...part }] });
      }
    }
  }
  return visible;
}
