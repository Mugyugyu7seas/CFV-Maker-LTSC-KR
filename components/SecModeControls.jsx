"use client";

import React from "react";
import { isSecMode } from "../utils/SecMode";

/** UI and persistence only. No SEC artwork or colour remapping is loaded yet. */
export function SecToggle({ isFullArt = false, isSec = false, onChange }) {
  const active = isSecMode({ isFullArt, isSec });
  const hint = isFullArt
    ? "Open SEC properties in Advance. SEC artwork is not connected yet."
    : "Enable card SP to use SEC.";
  return (
    <label title={hint}
      className={`relative flex items-center justify-center gap-2 shrink-0 min-w-17 h-10 px-3 rounded-md border transition-all select-none focus-within:ring-2 focus-within:ring-blue-500 ${
        isFullArt ? "cursor-pointer" : "cursor-not-allowed opacity-40"
      } ${active
        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
        : "hover:bg-(--panel-bg) border-(--border-color) bg-(--bg-secondary)"}`}>
      <input type="checkbox" className="sr-only" aria-label="SEC mode"
        checked={active} disabled={!isFullArt}
        onChange={(event) => { if (isFullArt) onChange(event.target.checked); }} />
      <span aria-hidden="true" className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${active
        ? "border-5 bg-white border-blue-600"
        : "border-2 bg-white dark:bg-gray-700 border-slate-400 dark:border-slate-500"}`} />
      <span className={`text-[11px] font-bold transition-colors ${active
        ? "text-blue-700 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>SEC</span>
    </label>
  );
}

/** Reserved panel: controls will be added after the asset contract is decided. */
export function SecProperties() {
  return (
    <section className="flex flex-col mb-4" aria-label="SEC properties">
      <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">SEC properties</h2>
      <p className="text-xs text-(--text-secondary) mb-3">
        SEC artwork is not connected yet. The card keeps its current SP appearance.
      </p>
      <div className="rounded-md border border-(--border-color) p-3 space-y-3 text-xs text-(--text-secondary)">
        <p><strong>Frame</strong><br />Pending frame and colour-mask assets.</p>
        <p><strong>Grade</strong><br />Pending SEC number and decoration settings.</p>
        <p><strong>Icons</strong><br />Pending icon mapping and colour rules.</p>
      </div>
      <p className="mt-3 text-[11px] text-(--text-secondary)">
        Custom properties are hidden, not reset. Turn off SEC to edit them again.
      </p>
    </section>
  );
}
