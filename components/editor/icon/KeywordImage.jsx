"use client";

import { Group, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { useEffect, useLayoutEffect, useRef, useMemo, useState } from "react";
import Konva from "konva";
import { getKoreanCardIconPath } from "../../../utils/PathHelper";
import { getAbilityIconAppearance } from "../../../utils/AbilityTextStyle";
import { useAbilityIconStroke } from "./useAbilityIconStroke";
import {
  HYBRID_ICON_CONFIG,
  useIconConfig,
  useColorTag
} from "../../../utils/store/IconConfig";

export default function KeywordImage({
  src,
  x,
  y,
  targetHeight = 11,
  lineHeight = 14,
  yOffset = 0,
  onSizeLoaded,
  fullArt,
  dark
}) {
  const baseRef = useRef();
  const strokeRef = useRef();
  const [hasError, setHasError] = useState(false);

  const { dark: iconDark } = getAbilityIconAppearance({ dark, spText: fullArt });

  const ICON_CONFIG = useIconConfig();
  const COLOR_TAG = useColorTag();

  const [cleanSrc, presetName] = useMemo(() => {
    if (!src) return [null, null];

    const parts = src.split("@");

    return [
      parts[0],
      parts[1] || null
    ];
  }, [src]);

  const lookupKey = useMemo(() => {
    if (!cleanSrc) return null;
    return Object.keys(ICON_CONFIG.exact).find(
      (k) => ICON_CONFIG.exact[k].src === cleanSrc
    );
  }, [cleanSrc, ICON_CONFIG]);

  const { finalSrc, finalStrokeSrc, tint, invert } = useMemo(() => {
    const config = HYBRID_ICON_CONFIG?.icons?.[cleanSrc];
    const mode = iconDark ? config?.dark : config?.light;

    let resSrc = cleanSrc;
    let resStrokeSrc = null;
    let resTint = null;
    let resInvert = false;

    // Check exclusive path first — uses a dedicated image with no tint
    if (presetName) {
      const exclusiveKey = `${cleanSrc}@${presetName}`;
      const exclusive = HYBRID_ICON_CONFIG?.exclusivePaths?.[exclusiveKey];
      if (exclusive) {
        return {
          finalSrc: getKoreanCardIconPath(exclusive.src),
          finalStrokeSrc: exclusive.strokeSrc ? getKoreanCardIconPath(exclusive.strokeSrc) : null,
          tint: null,
          invert: false
        };
      }
    }

    const allowVal = COLOR_TAG.allow[lookupKey];
    const canTint = allowVal === true || (Array.isArray(allowVal) && allowVal.includes(presetName));

    if (presetName && lookupKey && canTint) {
      const preset = COLOR_TAG.preset[presetName];
      if (preset) {
        resTint =
          preset.dark || preset.light
            ? iconDark
              ? preset.dark
              : preset.light
            : preset;
      }
    } else if (mode) {
      if (mode.type === "path") resSrc = mode.value;
      else if (mode.type === "tint") resTint = mode.value;
      else if (mode.type === "invert") resInvert = true;
    }

    return {
      finalSrc: getKoreanCardIconPath(resSrc),
      finalStrokeSrc: resStrokeSrc
        ? getKoreanCardIconPath(resStrokeSrc)
        : null,
      tint: resTint,
      invert: resInvert
    };
  }, [cleanSrc, presetName, lookupKey, iconDark, COLOR_TAG]);

  const strokeSrc = useMemo(() => {
    if (finalStrokeSrc) return finalStrokeSrc;
    if (!finalSrc) return null;
    return finalSrc.replace(/(\.[a-z]+)$/i, "_s$1");
  }, [finalSrc, finalStrokeSrc]);

  const [baseImg] = useImage(finalSrc);
  const [strokeImg] = useImage(strokeSrc);

  useEffect(() => {
    if (baseImg && onSizeLoaded) {
      onSizeLoaded({
        width: baseImg.width,
        height: baseImg.height
      });
    }
  }, [baseImg, onSizeLoaded, targetHeight]);

  useAbilityIconStroke(strokeRef, strokeImg, fullArt, Boolean(baseImg && !hasError));

  // Apply/remove the foreground filter before paint. No queued RAF from an
  // older mode can reapply a black/inverted filter after a fast SP toggle.
  useLayoutEffect(() => {
    const node = baseRef.current;
    if (!node || !baseImg || hasError) return;

    try {
      const filters = [];
      if (tint) filters.push(Konva.Filters.RGB);
      if (invert) filters.push(Konva.Filters.Invert);

      node.clearCache();
      node.filters(filters);
      if (tint) {
        node.red(tint.red);
        node.green(tint.green);
        node.blue(tint.blue);
      }
      if (filters.length > 0) node.cache();
      node.getLayer()?.batchDraw();
    } catch (error) {
      console.warn("[CFV] Could not apply the icon color", error);
    }
  }, [baseImg, tint, invert, hasError]);

  if (!baseImg || hasError) return null;

  try {
    const scale = targetHeight / baseImg.height;
    const offsetY = (lineHeight - targetHeight) / 2 - 1 + yOffset;

    return (
      <Group x={x} y={y + offsetY}>
        {strokeImg && fullArt && (
          <KonvaImage
            ref={strokeRef}
            image={strokeImg}
            x={(baseImg.width * scale) / 2}
            y={(baseImg.height * scale) / 2}
            offsetX={strokeImg.width / 2}
            offsetY={strokeImg.height / 2}
            scaleX={scale}
            scaleY={scale}
            listening={false}
          />
        )}

        <KonvaImage
          ref={baseRef}
          image={baseImg}
          x={(baseImg.width * scale) / 2}
          y={(baseImg.height * scale) / 2}
          offsetX={baseImg.width / 2}
          offsetY={baseImg.height / 2}
          scaleX={scale}
          scaleY={scale}
          listening={false}
        />
      </Group>
    );
  } catch (e) {
    setHasError(true);
    return null;
  }
}
