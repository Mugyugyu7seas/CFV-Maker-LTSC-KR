"use client";

import React from "react";
import { ABILITY_EDITOR_TEXT as t } from "../utils/store/AbilityEditorText";

/** This preference is independent of SP and of editable ability windows. */
export default function RideDeckExplanationsControl({ checked = false, onChange }) {
  return (
    <section className="mb-4" aria-label="Ride deck crest settings">
      <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
        Ride deck crest
      </h2>
      <div className="flex justify-end">
        <label
          title="Hide *explanations* in the fixed ride deck crest template. The source text is kept."
          className={`relative flex items-center justify-center gap-2 h-8 px-2 rounded-md border transition-all select-none cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 ${checked
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "hover:bg-(--panel-bg) border-(--border-color) bg-(--bg-secondary)"}`}
        >
          <input
            type="checkbox"
            className="sr-only"
            aria-label="Hide explanations in the ride deck crest"
            checked={checked === true}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span aria-hidden="true" className={`w-4 h-4 rounded-full border-2 transition-all ${checked
            ? "border-5 bg-white border-blue-600"
            : "border-2 bg-white dark:bg-gray-700 border-slate-400 dark:border-slate-500"}`} />
          <span className={`text-[11px] font-bold whitespace-nowrap ${checked
            ? "text-blue-700 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>
            {t.hideExplanations}
          </span>
        </label>
      </div>
    </section>
  );
}
