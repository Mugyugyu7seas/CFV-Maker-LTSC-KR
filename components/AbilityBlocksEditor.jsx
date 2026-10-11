// CFV hide-explanations and SEC UI v1
"use client";

import React, { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import TextArea from "./TextArea";
import ColorPickerInput from "./ColorPickerInput";
import { MAX_ABILITY_BLOCKS, createAbilityBlock, isAbilityColor } from "../utils/AbilityBlocks";
import { validateAbilityBoxPresets, getAbilityPresetPatch } from "../utils/store/AbilityBoxPresets";
import { ABILITY_EDITOR_TEXT as t } from "../utils/store/AbilityEditorText";
import { usesSpAbilityText } from "../utils/AbilityTextStyle";
import { getAbilityRemovalFocusId, captureAbilityFocus, restoreAbilityFocus } from "../utils/AbilityEditorFocus";

const buttonClass = "px-2 py-1 text-xs rounded border border-(--border-color) text-(--text-secondary) hover:bg-(--bg-secondary) disabled:opacity-30 disabled:cursor-not-allowed";

const AbilityBlockEditor = memo(function AbilityBlockEditor({
  block, index, count, fullArt, presets, confirming,
  update, onMove, onRequestRemove, onConfirmRemove, onCancelRemove, onDismissRemove,
}) {
  const cancelRef = useRef(null);
  useLayoutEffect(() => {
    if (confirming) cancelRef.current?.focus({ preventScroll: true });
  }, [confirming]);
  const changeText = useCallback((text) => update(block.id, { text }), [block.id, update]);
  const setBackground = (target, value) => {
    if (value === "default" || value === "custom") {
      update(target.id, { background: { ...target.background, mode: value, presetId: null } });
    } else {
      const preset = presets.find((item) => item.id === value);
      if (preset) update(target.id, getAbilityPresetPatch(preset, target));
    }
  };
  const bg = block.background;
  const selected = bg.mode === "preset" ? bg.presetId : bg.mode;
  const savedPresetMissing = bg.mode === "preset" && !presets.some((preset) => preset.id === bg.presetId);
  const spText = usesSpAbilityText({ fullArt, useSpTextStyle: block.useSpTextStyle });
  const toggleHint = fullArt ? t.spTextInheritedHint : t.spTextHint;
  return (
          <section className="p-2 rounded-md border border-(--border-color)" data-ability-id={block.id}
            onFocusCapture={(event) => {
              if (confirming && event.target.tagName === "TEXTAREA") onDismissRemove();
            }}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label htmlFor={`ability-text-${block.id}`} className="text-sm font-medium text-(--text-secondary)">
                {t.blockTitle(index + 1)}
              </label>
              <div className="flex items-center gap-1">
                <button type="button" className={buttonClass} aria-label={t.moveUp(index + 1)} title={t.moveUp(index + 1)} disabled={index === 0} onClick={() => onMove(block.id, -1)}>↑</button>
                <button type="button" className={buttonClass} aria-label={t.moveDown(index + 1)} title={t.moveDown(index + 1)} disabled={index === count - 1} onClick={() => onMove(block.id, 1)}>↓</button>
                <button type="button" className={buttonClass} aria-label={t.deleteBlock(index + 1)} disabled={count === 1 || confirming} onClick={() => onRequestRemove(block)}>{t.delete}</button>
              </div>
            </div>
            {confirming && (
              <div role="group" aria-label={t.deleteConfirmation}
                className="mb-2 p-2 rounded border border-(--border-color) bg-(--bg-secondary)"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancelRemove(block.id);
                  }
                }}>
                <p className="text-xs text-(--text-secondary) mb-2">{t.confirmDelete}</p>
                <div className="flex justify-end gap-2">
                  <button ref={cancelRef} type="button" className={buttonClass}
                    onClick={() => onCancelRemove(block.id)}>{t.cancel}</button>
                  <button type="button" className={buttonClass}
                    aria-label={t.confirmDeleteButton}
                    onClick={() => onConfirmRemove(block.id)}>{t.delete}</button>
                </div>
              </div>
            )}
            <div className="mb-2">
              <label htmlFor={`ability-bg-${block.id}`} className="block text-xs font-medium text-(--text-secondary) mb-1">{t.background}</label>
              <div className="flex items-center gap-2" data-testid="ability-background-controls">
                <select
                  id={`ability-bg-${block.id}`}
                  aria-label={t.backgroundMode(index + 1)}
                  className="flex-1 min-w-0 h-10 px-2 py-1 text-sm rounded-md border border-(--border-color) bg-(--input-bg) text-(--text-primary)"
                  value={selected || "custom"}
                  onChange={(event) => setBackground(block, event.target.value)}
                >
                  <option value="default">{t.defaultBackground}</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.label}</option>
                  ))}
                  {savedPresetMissing && <option value={bg.presetId}>{t.savedPreset(bg.presetId)}</option>}
                  <option value="custom">{t.customBackground}</option>
                </select>
                <label
                  title={toggleHint}
                  className={`relative flex items-center justify-center gap-2 shrink-0 min-w-17 h-10 px-2 rounded-md border transition-all select-none focus-within:ring-2 focus-within:ring-blue-500 ${
                    fullArt ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  } ${spText
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "hover:bg-(--panel-bg) border-(--border-color) bg-(--bg-secondary)"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    aria-label={t.spTextLabel(index + 1)}
                    aria-describedby={`ability-sp-hint-${block.id}`}
                    checked={spText}
                    disabled={fullArt}
                    onChange={(event) => {
                      if (!fullArt) update(block.id, { useSpTextStyle: event.target.checked });
                    }}
                  />
                  <span aria-hidden="true" className={`w-4 h-4 rounded-full border-2 transition-all ${spText
                    ? "border-5 bg-white border-blue-600"
                    : "border-2 bg-white dark:bg-gray-700 border-slate-400 dark:border-slate-500"}`} />
                  <span className={`text-[11px] font-bold whitespace-nowrap ${spText
                    ? "text-blue-700 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>{t.spText}</span>
                </label>
                <span id={`ability-sp-hint-${block.id}`} className="sr-only">{toggleHint}</span>
              </div>
            </div>
            {bg.mode !== "default" && (
              <ColorPickerInput
                label={t.backgroundColor}
                color={bg.color}
                containerClass="mb-2"
                onChange={(color) => {
                  if (isAbilityColor(color)) update(block.id, {
                    background: { mode: "custom", presetId: null, color },
                  });
                }}
              />
            )}
            <TextArea
              id={`ability-text-${block.id}`}
              ariaLabel={t.content(index + 1)}
              value={block.text}
              onChange={changeText}
              placeholder={t.placeholder}
              maxRows={15}
              format={true}
            />
            <div className="flex justify-end pt-2">
              <label title={t.hideExplanationsHint}
                className={`relative flex items-center justify-center gap-2 h-8 px-2 rounded-md border transition-all select-none cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 ${block.hideExplanations
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "hover:bg-(--panel-bg) border-(--border-color) bg-(--bg-secondary)"}`}>
                <input type="checkbox" className="sr-only"
                  aria-label={t.hideExplanationsLabel(index + 1)}
                  checked={block.hideExplanations === true}
                  onChange={(event) => update(block.id, { hideExplanations: event.target.checked })} />
                <span aria-hidden="true" className={`w-4 h-4 rounded-full border-2 transition-all ${block.hideExplanations
                  ? "border-5 bg-white border-blue-600"
                  : "border-2 bg-white dark:bg-gray-700 border-slate-400 dark:border-slate-500"}`} />
                <span className={`text-[11px] font-bold whitespace-nowrap ${block.hideExplanations
                  ? "text-blue-700 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>{t.hideExplanations}</span>
              </label>
            </div>
          </section>
  );
});

/** Native confirm/alert is deliberately not used: it can break Electron focus. */
export default function AbilityBlocksEditor({ blocks, onChange, fullArt = false, layoutStatus }) {
  const presets = useMemo(() => validateAbilityBoxPresets(), []);
  const rootRef = useRef(null);
  const blocksRef = useRef(blocks);
  const focusAfterCommit = useRef(null);
  const deleteSnapshotRef = useRef(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  useLayoutEffect(() => {
    blocksRef.current = blocks;
    if (pendingDeleteId && blocks.find((block) => block.id === pendingDeleteId) !== deleteSnapshotRef.current) {
      // An import or an edit replaced the target: never confirm a different record.
      deleteSnapshotRef.current = null;
      setPendingDeleteId(null);
    }
    if (focusAfterCommit.current) {
      restoreAbilityFocus(rootRef.current, focusAfterCommit.current);
      focusAfterCommit.current = null;
    }
  }, [blocks, pendingDeleteId]);

  const update = useCallback((id, patch) => onChange((current) => current.map((block) =>
    block.id === id ? { ...block, ...patch } : block)), [onChange]);

  const confirmRemove = useCallback((id) => {
    const current = blocksRef.current;
    if (deleteSnapshotRef.current?.id === id &&
        current.find((block) => block.id === id) !== deleteSnapshotRef.current) {
      deleteSnapshotRef.current = null;
      setPendingDeleteId(null);
      return;
    }
    const targetId = getAbilityRemovalFocusId(current, id);
    if (!targetId) { setPendingDeleteId(null); return; }
    focusAfterCommit.current = captureAbilityFocus(rootRef.current, targetId);
    deleteSnapshotRef.current = null;
    setPendingDeleteId(null);
    onChange((latest) => latest.length > 1 ? latest.filter((block) => block.id !== id) : latest);
  }, [onChange]);

  const requestRemove = useCallback((block) => {
    if (blocksRef.current.length <= 1) return;
    if (block.text.trim()) {
      deleteSnapshotRef.current = block;
      setPendingDeleteId(block.id);
    } else {
      deleteSnapshotRef.current = null;
      confirmRemove(block.id);
    }
  }, [confirmRemove]);

  const cancelRemove = useCallback((id) => {
    focusAfterCommit.current = captureAbilityFocus(rootRef.current, id);
    deleteSnapshotRef.current = null;
    setPendingDeleteId(null);
  }, []);
  const dismissRemove = useCallback(() => {
    deleteSnapshotRef.current = null;
    setPendingDeleteId(null);
  }, []);

  const move = useCallback((id, direction) => {
    deleteSnapshotRef.current = null;
    setPendingDeleteId(null);
    onChange((current) => {
      const from = current.findIndex((block) => block.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }, [onChange]);

  const add = useCallback(() => {
    if (blocksRef.current.length >= MAX_ABILITY_BLOCKS) return;
    const added = createAbilityBlock();
    deleteSnapshotRef.current = null;
    focusAfterCommit.current = { id: added.id, start: 0, end: 0, direction: "none" };
    setPendingDeleteId(null);
    onChange((current) => current.length < MAX_ABILITY_BLOCKS ? [...current, added] : current);
  }, [onChange]);

  return (
    <div ref={rootRef} className="flex flex-col gap-3" data-testid="ability-blocks-editor">
      {blocks.map((block, index) => (
        <AbilityBlockEditor key={block.id} block={block} index={index} count={blocks.length}
          fullArt={fullArt} presets={presets} confirming={pendingDeleteId === block.id}
          update={update} onMove={move} onRequestRemove={requestRemove}
          onConfirmRemove={confirmRemove} onCancelRemove={cancelRemove} onDismissRemove={dismissRemove} />
      ))}
      <button
        type="button"
        className="w-full py-2 text-sm rounded-md border border-dashed border-(--border-color) text-(--text-secondary) hover:bg-(--bg-secondary) disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={add}
        disabled={blocks.length >= MAX_ABILITY_BLOCKS}
      >
        {t.add(blocks.length, MAX_ABILITY_BLOCKS)}
      </button>
      <p className="text-[11px] text-(--text-secondary)">{t.newlineHint}</p>
      {fullArt && <p className="text-[11px] text-(--text-secondary)">{t.fullArtHint}</p>}
      {layoutStatus?.overflow && (
        <p role="alert" className="p-2 text-xs border border-amber-500/50 rounded text-amber-600 dark:text-amber-400">
          {t.overflow(layoutStatus.totalLines, layoutStatus.blockCount)}
        </p>
      )}
    </div>
  );
}
