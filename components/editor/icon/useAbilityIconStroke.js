"use client";

import { useLayoutEffect } from "react";
import Konva from "konva";
import { getAbilityIconOutline } from "../../../utils/AbilityTextStyle";

/**
 * Paint a supplied _s silhouette with the common SP outline ink.
 * Alpha in the PNG is preserved. node.alpha(1) is the RGBA filter's color
 * mixing strength; node.opacity(...) controls the visible outline opacity.
 * `ready` retries after the foreground arrives even if the mask loaded first.
 */
export function useAbilityIconStroke(ref, image, spEnabled, ready = true) {
  const outline = getAbilityIconOutline(spEnabled);
  const color = outline?.color ?? "black";
  const opacity = outline?.opacity ?? 1;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !image || !spEnabled || !ready) return;

    try {
      const rgb = Konva.Util.getRGB(color);
      node.clearCache();
      node.filters([Konva.Filters.RGBA]);
      node.red(rgb.r);
      node.green(rgb.g);
      node.blue(rgb.b);
      node.alpha(1);
      node.opacity(opacity);
      node.cache();
      node.getLayer()?.batchDraw();
    } catch (error) {
      // A mask problem must not hide the foreground icon.
      console.warn("[CFV] Could not apply the SP icon outline", error);
    }
  }, [ref, image, spEnabled, ready, color, opacity]);
}
