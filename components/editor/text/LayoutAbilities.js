// CFV hide-explanations and SEC UI v1
import { ParseTokens } from "./ParseTokens.js";
import { filterExplanationTokens } from "../../../utils/AbilityExplanations.js";
import { JustifyLine } from "./JustifyLine.js";
import { getTextWidth, getFontStyle } from "./TextMeasure.js";

/**
 * Pure row assembly. Measurements are injectable for tests; production uses the
 * same canvas measurement, word splitting and justification as the uploaded code.
 * All rows are returned. maxLines is an overflow budget, not permission to delete text.
 */
export function layoutAbilities({
  text = "", ICON_CONFIG, iconWidths = {}, dark = false,
  font, lightFont, fontSize, bodyScaleX = 1, letterSpacing = 0,
  bodyWordSpacing = 0, bodyJustify = true, MAX_WIDTH = 370,
  measureText = getTextWidth,
  hideExplanations = false,
}) {
  const measureTextForJustify = (wordText, currentFontSize) =>
    measureText(wordText, currentFontSize, getFontStyle(false, dark), font);
    if (!text.trim()) return { lines: [], lineCount: 0, widthOverflow: false };
    const rawParagraphs = text.replace(/\r\n?/g, "\n").split("\n");

    let lines = [];
    let currentLine = [];
    let offsetX = 0;
    let nodeCounter = 0;

    const justifyKoreanLine = (line) => {
      if (!bodyJustify || line.length === 0) {
        return line;
      }

      const totalWidth = line.reduce(
        (sum, node) => sum + (node.width || 0),
        0
      );

      const remainingWidth = MAX_WIDTH - totalWidth;

      if (remainingWidth <= 0) {
        return line;
      }

      // 일반 문자 사이 간격의 개수
      const letterGapCount = line.reduce((sum, node) => {
        if (
          node.type !== "text" ||
          /^\s+$/.test(node.text)
        ) {
          return sum;
        }

        return sum + Math.max(0, node.text.length - 1);
      }, 0);

      // 띄어쓰기 노드 개수
      const spaceCount = line.reduce((sum, node) => {
        if (
          node.type === "text" &&
          /^\s+$/.test(node.text)
        ) {
          return sum + 1;
        }

        return sum;
      }, 0);

      // 띄어쓰기는 일반 자간보다 여유를 조금 더 받게 함
      const spaceWeight = 2.0;

      const totalWeight =
        letterGapCount + (spaceCount * spaceWeight);

      if (totalWeight <= 0) {
        return line;
      }

      // 실제 화면상 추가되는 기본 간격
      const extraPerWeight =
        remainingWidth / totalWeight;

      // scaleX를 적용하기 전 Konva letterSpacing 값
      const extraLetterSpacing =
        extraPerWeight / bodyScaleX;

      // 공백 하나당 추가 폭
      const extraSpaceWidth =
        extraPerWeight * spaceWeight;

      let currentX = 0;

      return line.map((node) => {
        const isSpace =
          node.type === "text" &&
          /^\s+$/.test(node.text);

        let finalWidth = node.width || 0;
        let justifyLetterSpacing = 0;

        if (isSpace) {
          finalWidth += extraSpaceWidth;
        } else if (
          node.type === "text" &&
          node.text.length > 1
        ) {
          justifyLetterSpacing = extraLetterSpacing;

          finalWidth +=
            extraLetterSpacing *
            (node.text.length - 1) *
            bodyScaleX;
        }

        const newNode = {
          ...node,
          x: currentX,
          width: finalWidth,
          justifyLetterSpacing
        };

        currentX += finalWidth;

        return newNode;
      });
    };

    const pushLine = (
        forceJustify = false,
        isParagraphEnd = false
      ) => {
      if (!currentLine.length) {
        return;
      }

      while (
        currentLine.length &&
        currentLine[currentLine.length - 1].type === "text" &&
        /^\s+$/.test(currentLine[currentLine.length - 1].text)
      ) {
        currentLine.pop();
      }

      if (!currentLine.length) return;

      if (
        bodyJustify &&
        (!isParagraphEnd || forceJustify)
      ) {
        lines.push(
          justifyKoreanLine(currentLine)
        );
      } else {
        lines.push(
          forceJustify
            ? JustifyLine(
                currentLine,
                MAX_WIDTH,
                fontSize,
                measureTextForJustify
              )
            : [...currentLine]
        );
      }

      currentLine = [];
      offsetX = 0;
    };

    for (const paraRaw of rawParagraphs) {

      const isForce = paraRaw.includes("\\j");
      const para = paraRaw.replace(/\\j/g, "");
      if (!para.trim()) {
        lines.push([]);
        continue;
      }

      const tokens = filterExplanationTokens(ParseTokens(
        para,
        ICON_CONFIG,
        dark
      ), hideExplanations);

      for (const token of tokens) {

        if (["dynamic_icon", "plain_icon", "icon"].includes(token.type)) {
          const key =
            token.type === "icon"
              ? `${token.src}_${token.meta.iconHeight || 11}`
              : token.type === "plain_icon"
                ? `plain_${token.prefix}_${token.meta?.iconHeight || token.height || 11}`
                : `${token.prefix}_${token.value}_${token.meta?.iconHeight || token.height || 11}`;

          const rawWidth = iconWidths[key] ?? 20;
          const configuredBefore =
            token.meta?.iconSpacingBefore
            ?? token.config?.iconSpacingBefore;
          const configuredAfter =
            token.meta?.iconSpacingAfter
            ?? token.config?.iconSpacingAfter;

          // Margins are logical layout units, not part of the PNG's measured width.
          // New icons inherit 1 on each side; explicit zero remains valid.
          const iconSpacingBefore = Number.isFinite(configuredBefore)
            ? configuredBefore
            : 1;
          const iconSpacingAfter = Number.isFinite(configuredAfter)
            ? configuredAfter
            : 1;

          const width = Math.max(
            0.01,
            iconSpacingBefore + rawWidth + iconSpacingAfter
          );

          if (offsetX + width > MAX_WIDTH) {
            pushLine();
          }

          currentLine.push({
            ...token,
            id: `${token.type}-${nodeCounter}`,
            // x stays the slot's left edge, including the leading margin.
            // RenderLine offsets the image inside the slot AFTER justification.
            x: offsetX,
            width,
            iconSpacingBefore,
            iconSpacingAfter,
            cacheKey: key
          });

          offsetX += width;
          nodeCounter++;
          continue;
        }

        if (token.type === "text") {
          for (const p of token.parts) {
            const isAnnotation =
              p.annotation;

            const style = isAnnotation
              ? "normal"
              : getFontStyle(
                  p.italic,
                  dark
                );

            const measureFont =
              isAnnotation && lightFont
                ? lightFont
                : font;

            // Preserve punctuation/kerning by splitting only at whitespace.
            const words = p.text.split(/(\s+)/);

            for (const word of words) {
              if (!word) continue;

              const isSpace = /^\s+$/.test(word);

              const baseWidth = measureText(
                word,
                fontSize,
                style,
                measureFont
              );

              const effectiveLetterSpacing =
                (p.letterSpacing || 0) + letterSpacing;

              const w = isSpace
                ? (baseWidth * bodyScaleX) + bodyWordSpacing
                : (
                    baseWidth
                    + effectiveLetterSpacing * Math.max(0, word.length - 1)
                  ) * bodyScaleX;

              if (offsetX + w > MAX_WIDTH) {
                if (isSpace) {
                  pushLine();
                } else {
                  pushLine();
                  currentLine.push({
                    ...p,
                    id: `node-${nodeCounter}`,
                    type: "text",
                    text: word,
                    x: 0,
                    width: w
                  });
                  offsetX = w;
                }
              } else {
                if (offsetX === 0 && isSpace) {
                  continue;
                }

                currentLine.push({
                  ...p,
                  id: `node-${nodeCounter}`,
                  type: "text",
                  text: word,
                  x: offsetX,
                  width: w
                });

                offsetX += w;
              }

              nodeCounter++;
            }
          }
        }
      }

      pushLine(isForce, true);
    }

    if (hideExplanations && lines.every((line) => line.length === 0)) {
      return { lines: [], lineCount: 0, widthOverflow: false };
    }
    const widthOverflow = lines.some((line) => line.some((node) =>
      !Number.isFinite(node.x) || !Number.isFinite(node.width) ||
      node.width < 0 || node.x + node.width > MAX_WIDTH + 0.01));
    return { lines, lineCount: lines.length, widthOverflow };
}
