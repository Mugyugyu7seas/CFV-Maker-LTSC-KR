// CFV hide-explanations and SEC UI v1
"use client";

import { Group, Text, Line } from "react-konva";
import React, {
  useMemo,
  useState,
  useEffect,
  useLayoutEffect,
  memo,
  useRef,
  useCallback
} from "react";

import {
  getTextWidth,
  getFontStyle
} from "./text";

import {
  IconGenerator,
  PlainIcon,
  KeywordImage
} from "./icon";

import { layoutAbilities } from "./text/LayoutAbilities";
import LRUCache from "../../utils/LRUCache";
import { CARD_TYPOGRAPHY } from "../../utils/store/Typography";
import {
  usesSpAbilityText,
  getAbilityTextColor,
  getAbilityTextOutline,
  getAbilityUnderlineOutline,
} from "../../utils/AbilityTextStyle";

const renderTextWithStroke = (textNode, spText) => {
  const outline = getAbilityTextOutline(spText);
  if (!outline) return textNode;

  return (
    <Group>
      {React.cloneElement(textNode, outline)}
      {textNode}
    </Group>
  );
};

const RenderLine = memo(({
  line,
  lineIdx,
  lineHeight,
  fontSize,
  font,
  lightFont,
  bodyLightYOffset,
  bodyScaleX,
  bodyScaleY,
  bodyYOffset,
  letterSpacing,
  dark,
  spText,
  iconWidths,
  getNodeWidth,
  handleIconWidthReady,
  ICON_CONFIG
}) => {


  const underlineOffset = fontSize - (1);
  const iconUnderlineYShift = -1;
  const underlineOutline = getAbilityUnderlineOutline(spText);

  return (
    <Group y={lineIdx * lineHeight}>
      {line.map((node, nodeIdx) => {
        const renderWidth = getNodeWidth(node);
        const elementKey = `l${lineIdx}-n${nodeIdx}`;

        const underlineLayer =
          node.underline && (
            <Group key={`u-${elementKey}`} y={0.75}>
              {underlineOutline && (
                <Line
                  points={[
                    node.x,
                    underlineOffset,
                    node.x + renderWidth,
                    underlineOffset
                  ]}
                  {...underlineOutline}
                />
              )}

              <Line
                points={[
                  node.x,
                  underlineOffset,
                  node.x + renderWidth,
                  underlineOffset
                ]}
                stroke={getAbilityTextColor(node, { dark, spText })}
                strokeWidth={1}
                listening={false}
              />
            </Group>
          );

        // Local SP text and card SP share the same effective content mode.
        // Keep dark unchanged here; each icon resolves its visual Encounter mode.
        let iconContent = null;
        // node.x is the layout slot edge. Keep the margin when justification
        // recomputes x, and move the icon plus its SP mask together.
        const iconX = node.x + (node.iconSpacingBefore ?? 0);
        const iconY =
          node.underline
            ? iconUnderlineYShift
            : (0);

        if (node.type === "dynamic_icon") {
          iconContent = (
            <Group x={iconX} y={iconY}>
              <IconGenerator
                {...node}
                dark={dark}
                fullArt={spText}
                lineHeight={lineHeight}

                onWidthReady={(w) =>
                  handleIconWidthReady(node.cacheKey, w)
                }
              />
            </Group>
          );
        } else if (node.type === "plain_icon") {
          iconContent = (
            <Group x={iconX} y={iconY}>
              <PlainIcon
                {...node}
                dark={dark}
                fullArt={spText}
                lineHeight={lineHeight}

                onWidthReady={(w) =>
                  handleIconWidthReady(node.cacheKey, w)
                }
              />
            </Group>
          );
        } else if (node.type === "icon") {
  const isBracketIcon =
  node.keyword === "{" || node.keyword === "}";

  let styledSrc = node.src;

  if (
    isBracketIcon &&
    node.color === "#ff0000"
  ) {
    const baseSrc = node.src.split("@")[0];
    styledSrc = `${baseSrc}@red`;
  }

  iconContent = (
    <Group x={iconX}>

      <KeywordImage
        src={styledSrc}
        x={0}
        y={iconY}
        tintColor={node.meta.tintColor}
        targetHeight={node.meta.iconHeight || 11}
        lineHeight={lineHeight}

        dark={dark}
        fullArt={spText}
        yOffset={node.meta.iconYOffset || 0}
        onSizeLoaded={(s) => {
          const calculatedWidth =
            s.width * ((node.meta.iconHeight || 11) / s.height);

          handleIconWidthReady(node.cacheKey, calculatedWidth);
        }}
      />
    </Group>
  );
}

        let textContent = null;

        if (node.type === "text") {
          const isAnnotation =
            node.annotation;

          const fontStyle = isAnnotation
            ? "normal"
            : getFontStyle(node.italic, dark);

          const renderFont =
            isAnnotation && lightFont
              ? lightFont
              : font;

          const renderColor = getAbilityTextColor(node, { dark, spText });

          const baseText = (
            <Text
              text={node.text}
              x={node.x}
              y={
                1 + (isAnnotation ? bodyLightYOffset : 0)
              }
              scaleX={bodyScaleX}
              scaleY={bodyScaleY}
              fontSize={fontSize}
              fontFamily={renderFont}
              fontStyle={fontStyle}
              fill={renderColor}
              letterSpacing={
                (node.letterSpacing || 0)
                + letterSpacing
                + (node.justifyLetterSpacing || 0)
              }
              width={node.isExpandedSpace ? node.width : undefined}
              perfectDrawEnabled={false}
              listening={false}
            />
          );

          textContent = renderTextWithStroke(baseText, spText);
        }
        return (
          <Group key={elementKey}>
            {underlineLayer}
            {iconContent}
            {textContent}
          </Group>
        );
      })}
    </Group>
  );
});

function AbilitiesOutput({

  text = "",
  x = 0,
  y = 0,
  font = CARD_TYPOGRAPHY.bodyFont,
  lightFont = CARD_TYPOGRAPHY.bodyLightFont,
  lineHeight = CARD_TYPOGRAPHY.bodyLineHeight,
  fontSize = CARD_TYPOGRAPHY.bodyFontSize,
  bodyScaleX = CARD_TYPOGRAPHY.bodyScaleX,
  bodyScaleY = CARD_TYPOGRAPHY.bodyScaleY,
  bodyYOffset = CARD_TYPOGRAPHY.bodyYOffset,
  bodyLightYOffset = CARD_TYPOGRAPHY.bodyLightYOffset,
  bodyWordSpacing = CARD_TYPOGRAPHY.bodyWordSpacing,
  letterSpacing = CARD_TYPOGRAPHY.bodyLetterSpacing,
  bodyJustify = CARD_TYPOGRAPHY.bodyJustify,
  onLinesChange = null,
  onLayoutChange = null,
  maxLines = CARD_TYPOGRAPHY.abilityLines,
  configVersion = 0,
  ICON_CONFIG,
  dark,
  fullArt,
  useSpTextStyle = false,
  hideExplanations = false,
  MAX_WIDTH = 370,
  isMobile = false,
  isCrest = false,
}) {



  // Appearance only: do not pass spText into text measurement or line layout.
  const spText = usesSpAbilityText({ fullArt, useSpTextStyle });

  const [iconWidths, setIconWidths] = useState({});
  const [localVersion, setLocalVersion] = useState(0);

  const iconCacheRef = useRef(new LRUCache(100));
  const pendingUpdatesRef = useRef({});
  const updateTimeoutRef = useRef(null);
  const prevLineCountRef = useRef(-1);

  useEffect(() => {
    const handleUpdate = () => {
      iconCacheRef.current.clear();
      setLocalVersion(v => v + 1);
    };

    window.addEventListener("icon-config-changed", handleUpdate);

    return () => {
      window.removeEventListener("icon-config-changed", handleUpdate);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
  }, []);

  const normalizeWidth = useCallback((v) => {
    return Math.round(v * 100) / 100;
  }, []);

  const getNodeWidth = useCallback((node) => {
    if (node.width) return node.width;
    if (node.adjustedWidth) return node.adjustedWidth;

    if (node.type === "text") {
      const style = getFontStyle(node.italic, dark);

      const base = getTextWidth(
        node.text,
        fontSize,
        style,
        font
      );

      const isSpace = /^\s+$/.test(node.text);

      const effectiveLetterSpacing =
        (node.letterSpacing || 0)
        + letterSpacing
        + (node.justifyLetterSpacing || 0);

      if (isSpace) {
        return node.width ?? ((base * bodyScaleX) + bodyWordSpacing);
      }

      return (
        base
        + effectiveLetterSpacing * Math.max(0, node.text.length - 1)
      ) * bodyScaleX;
    }

    return 0;
 }, [
  dark,
  fontSize,
  font,
  letterSpacing,
  bodyWordSpacing,
  bodyScaleX,
]);


/*  const handleIconWidthReady = useCallback((key, width) => {
    let finalWidth = fullArt ? width + 0.5 : width;
    const w = normalizeWidth(finalWidth);
    const cached = iconCacheRef.current.get(key);
*/ // 원래 SP에서 자간 0.5 더 확보하는데 정렬이랑 충돌해서 봉인, 아래 코드 2줄로 대체.
  const handleIconWidthReady = useCallback((key, width) => {
    const w = normalizeWidth(width);
    const cached = iconCacheRef.current.get(key);

    if (cached != null && Math.abs(cached - w) < 0.25) {
      return;
    }

    iconCacheRef.current.set(key, w);
    pendingUpdatesRef.current[key] = w;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    const delay = isMobile ? 32 : 16;

    updateTimeoutRef.current = setTimeout(() => {
      setIconWidths(prev => ({
        ...prev,
        ...pendingUpdatesRef.current
      }));

      pendingUpdatesRef.current = {};
    }, delay);
  }, [normalizeWidth, isMobile]);

  const layout = useMemo(() => layoutAbilities({
    text, fontSize, iconWidths, dark, ICON_CONFIG, MAX_WIDTH, hideExplanations,
    font, lightFont, bodyScaleX, letterSpacing, bodyWordSpacing, bodyJustify,
  }), [
    text, fontSize, iconWidths, dark, configVersion, localVersion, hideExplanations,
    MAX_WIDTH, ICON_CONFIG, font, lightFont, bodyScaleX,
    letterSpacing, bodyWordSpacing, bodyJustify,
  ]);
  const allLines = layout.lines;

  // Report the rows already calculated above before the next paint so the
  // background, neighbouring windows and flavour move with the new text.
  useLayoutEffect(() => {
    onLayoutChange?.({ lineCount: layout.lineCount, widthOverflow: layout.widthOverflow });
  }, [layout.lineCount, layout.widthOverflow, onLayoutChange]);

  useEffect(() => {
    if (prevLineCountRef.current !== allLines.length) {
      prevLineCountRef.current = allLines.length;
      onLinesChange?.(allLines.length);
    }
  }, [allLines.length, onLinesChange]);

  const totalHeight = allLines.length * lineHeight;

  return (
    <Group
      x={x}
      y={
        (
          isCrest
            ? y - (totalHeight / 2)
            : y - totalHeight
        ) + bodyYOffset
      }
    >
      {allLines
        .map((line, lineIdx) => (
          <RenderLine
            key={`line-${lineIdx}`}
            line={line}
            lineIdx={lineIdx}
            lineHeight={lineHeight}
            fontSize={fontSize}
            font={font}
            lightFont={lightFont}
            bodyScaleX={bodyScaleX}
            bodyScaleY={bodyScaleY}
            bodyYOffset={bodyYOffset}
            bodyLightYOffset={bodyLightYOffset}
            letterSpacing={letterSpacing}
            dark={dark}
            spText={spText}

            iconWidths={iconWidths}
            getNodeWidth={getNodeWidth}
            handleIconWidthReady={handleIconWidthReady}
            ICON_CONFIG={ICON_CONFIG}
          />
        ))}
    </Group>
  );
}

export default memo(AbilitiesOutput);