"use client";

import React, { memo, useCallback } from "react";
import {
  createDefaultGradeNumberStyle, createNationGradeNumberStyle, normalizeGradeNumberStyle,
} from "../utils/GradeNumberStyle";
import { getNationGradePreset } from "../utils/store/GradeColorPresets";

/** Inline Color switch next to Grade. No free-color editor and no effects/state mirroring. */
function GradeColorEditor({ value, onChange, selectedNation, customNationEnabled = false, visible = true }) {
  const style = normalizeGradeNumberStyle(value);
  const colored = style.mode !== "default";
  const legacy = style.mode === "custom" || style.mode === "preset";
  const preset = customNationEnabled ? null : getNationGradePreset(selectedNation);

  const toggleColor = useCallback(() => {
    onChange(colored ? createDefaultGradeNumberStyle() : createNationGradeNumberStyle());
  }, [colored, onChange]);

  if (!visible) return null;

  const description = legacy
    ? `Saved fixed color ${style.color.toUpperCase()}. Turn Color off and on to follow Nation.`
    : !colored
      ? "Use the color of the selected Nation. Off: white."
      : preset
        ? `Following Nation: ${preset.label} (${preset.color.toUpperCase()}). Click to use white.`
        : "Color is enabled, but this Nation has no registered color. Using white.";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={colored}
      aria-label="Grade number color"
      title={description}
      data-testid="grade-color-toggle"
      onClick={toggleColor}
      className={`shrink-0 flex items-center justify-center gap-2 min-w-20 h-10 px-3 rounded-md border transition-colors select-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${colored
        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
        : "hover:bg-(--panel-bg) border-(--border-color) bg-(--bg-secondary)"}`}
    >
      <span
        aria-hidden="true"
        className={`w-4 h-4 shrink-0 rounded-full border-2 ${colored
          ? "border-5 bg-white border-blue-600"
          : "bg-white dark:bg-gray-700 border-slate-400 dark:border-slate-500"}`}
      />
      <span className={`text-[11px] font-bold ${colored ? "text-blue-700 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>
        Color
      </span>
    </button>
  );
}

export default memo(GradeColorEditor);
