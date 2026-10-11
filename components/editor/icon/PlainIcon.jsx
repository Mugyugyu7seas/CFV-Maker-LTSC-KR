"use client";

import { Group, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { useEffect, useRef, useMemo } from "react";
import { HYBRID_ICON_CONFIG } from "../../../utils/store/IconConfig";
import { getKoreanCardIconPath } from "../../../utils/PathHelper";
import { getAbilityIconAppearance } from "../../../utils/AbilityTextStyle";
import { useAbilityIconStroke } from "./useAbilityIconStroke";

export default function PlainIcon({
  src,
  config,
  dark,
  lineHeight,
  onWidthReady,
  fullArt
}) {
  const imgRef = useRef();
  const strokeRef = useRef();
  const { dark: iconDark } = getAbilityIconAppearance({ dark, spText: fullArt });

  const localizedSrc = getKoreanCardIconPath(src);
  const finalSrc = useMemo(() => {
    return iconDark && HYBRID_ICON_CONFIG?.darkModePaths?.[localizedSrc]
      ? HYBRID_ICON_CONFIG.darkModePaths[localizedSrc]
      : localizedSrc;
  }, [localizedSrc, iconDark]);

  const strokeSrc = useMemo(() => {
    if (!finalSrc) return null;
    return finalSrc.replace(/(\.[a-z]+)$/i, "_s$1");
  }, [finalSrc]);

  const [img] = useImage(finalSrc);
  const [strokeImg] = useImage(strokeSrc);

  const targetHeight = config.iconHeight || 11;
  const yOffset = config.iconYOffset || 0;

  useEffect(() => {
    if (img) {
      const scale = targetHeight / img.height;
      const width = img.width * scale;
      onWidthReady(width);
    }
  }, [img, targetHeight, onWidthReady]);

  useAbilityIconStroke(strokeRef, strokeImg, fullArt, Boolean(img));

  if (!img) return null;

  const scale = targetHeight / img.height;
  const offsetY = (lineHeight - targetHeight) / 2 - 1 + yOffset;

  const centerX = (img.width * scale) / 2;
  const centerY = (img.height * scale) / 2;

  return (
    <Group y={offsetY}>
      {strokeImg && fullArt && (
        <KonvaImage
          ref={strokeRef}
          image={strokeImg}
          x={centerX}
          y={centerY}
          offsetX={strokeImg.width / 2}
          offsetY={strokeImg.height / 2}
          scaleX={scale}
          scaleY={scale}
          listening={false}
        />
      )}

      <KonvaImage
        ref={imgRef}
        image={img}
        x={centerX}
        y={centerY}
        offsetX={img.width / 2}
        offsetY={img.height / 2}
        scaleX={scale}
        scaleY={scale}
        listening={false}
      />
    </Group>
  );
}