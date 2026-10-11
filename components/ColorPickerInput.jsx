import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useId } from 'react';
import { HexColorPicker } from 'react-colorful';
import Tooltip from './Tooltip';
import {
  normalizeHexColor, createColorInputState, syncColorInputState, editColorInputState,
} from '../utils/ColorInput';

export default function ColorPickerInput({
  label,
  color = '#ffffff',
  onChange,
  visible = true,
  disabled = false,
  containerClass = 'mb-5.75',
  debounceMs = 150,

  // Toggle props
  toggleVisible = false,
  toggleValue = false,
  toggleOnChange,
  toggleText = '',
  toggleTooltip = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputState, setInputState] = useState(() => createColorInputState(color));
  const syncedState = syncColorInputState(inputState, color);
  // Updating this component's own state on a changed prop prevents committing old
  // picker props and then reversing them from a passive synchronization effect.
  if (syncedState !== inputState) setInputState(syncedState);

  const { selected: pickerColor, draft: draftHex, source: sourceColor, revision } = syncedState;
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);
  const pendingColorRef = useRef(null);
  const lastPublishedRef = useRef(sourceColor);
  const onChangeRef = useRef(onChange);
  const draftRef = useRef(draftHex);
  const selectedRef = useRef(pickerColor);
  const revisionRef = useRef(revision);
  const fieldId = useId();

  const cancelPending = useCallback(() => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    pendingColorRef.current = null;
  }, []);

  // Keep callbacks current and cancel old delayed edits on import/reset/disable.
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
    draftRef.current = draftHex;
    selectedRef.current = pickerColor;
    revisionRef.current = revision;
  }, [onChange, draftHex, pickerColor, revision]);

  useLayoutEffect(() => {
    if (sourceColor !== lastPublishedRef.current) {
      cancelPending();
      lastPublishedRef.current = sourceColor;
    }
  }, [sourceColor, cancelPending]);

  useEffect(() => () => cancelPending(), [cancelPending]);

  useLayoutEffect(() => {
    if (disabled || !visible) {
      cancelPending();
      setIsOpen(false);
    }
  }, [disabled, visible, cancelPending]);

  const publishColor = useCallback((next) => {
    if (!next || next === lastPublishedRef.current) return;
    lastPublishedRef.current = next;
    onChangeRef.current?.(next);
  }, []);

  const queueColor = useCallback((next) => {
    cancelPending();
    if (!next || next === lastPublishedRef.current) return;
    if (debounceMs <= 0) {
      publishColor(next);
      return;
    }
    pendingColorRef.current = next;
    timeoutRef.current = setTimeout(() => {
      const pending = pendingColorRef.current;
      timeoutRef.current = null;
      pendingColorRef.current = null;
      publishColor(pending);
    }, debounceMs);
  }, [cancelPending, debounceMs, publishColor]);

  const handleColorPickerChange = useCallback((value) => {
    if (disabled || !visible || revision !== revisionRef.current) return;
    const next = normalizeHexColor(value);
    if (!next || next === selectedRef.current) return;
    selectedRef.current = next;
    draftRef.current = next;
    setInputState((prev) => ({ ...prev, selected: next, draft: next }));
    queueColor(next);
  }, [disabled, visible, queueColor, revision]);

  const handleHexChange = useCallback((event) => {
    if (disabled || !visible) return;
    const draft = event.target.value;
    draftRef.current = draft;
    const valid = normalizeHexColor(draft, false);
    if (valid) selectedRef.current = valid;
    setInputState((prev) => editColorInputState(prev, draft));
    // Never pass incomplete input (#, #1, an empty string, etc.) to the picker or parent.
    if (valid) queueColor(valid);
    else cancelPending();
  }, [disabled, visible, queueColor, cancelPending]);

  const commitHex = useCallback(() => {
    if (disabled || !visible) return;
    const next = normalizeHexColor(draftRef.current) ?? selectedRef.current;
    selectedRef.current = next;
    draftRef.current = next;
    setInputState((prev) => prev.selected === next && prev.draft === next
      ? prev : { ...prev, selected: next, draft: next,
        revision: next === prev.selected ? prev.revision : prev.revision + 1 });
    cancelPending();
    publishColor(next);
  }, [disabled, visible, cancelPending, publishColor]);

  // Do not classify the trigger as an outside click: it should close an open picker.
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event) {
      if (!pickerRef.current?.contains(event.target) &&
          !triggerRef.current?.contains(event.target)) {
        commitHex();
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, commitHex]);

  if (!visible) return null;

  return (
    <div className={`flex-1 relative gap-3 ${containerClass}`}>
      <label className="block text-sm font-medium text-(--text-secondary) mb-1">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <button
          ref={triggerRef}
          type="button"
          aria-label={label || "Choose color"}
          aria-expanded={isOpen}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) commitHex();
            setIsOpen((open) => !open);
          }}
          className={`flex-1 h-10 px-3 rounded-md border flex items-center gap-2 bg-(--bg-secondary) border-(--border-color) transition-all ${
            !disabled ? 'cursor-pointer hover:bg-(--panel-bg)' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <div
            className="w-4 h-4 rounded-full border border-white/20 shrink-0"
            style={{ backgroundColor: pickerColor }}
          />
          <span className="text-xs font-mono flex-1">
            {pickerColor.toUpperCase()}
          </span>
        </button>

        {toggleVisible && (
          <Tooltip text={toggleTooltip}>
            <label className={`flex items-center justify-center gap-2 min-w-17 h-10 px-3 rounded-md border cursor-pointer transition-all ${
              toggleValue
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'hover:bg-(--panel-bg) border-(--border-color) bg-(--bg-secondary)'
            }`}>
              <input
                type="checkbox"
                className="hidden"
                checked={toggleValue}
                onChange={(e) => toggleOnChange(e.target.checked)}
              />
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                toggleValue
                  ? 'border-5 bg-white border-blue-600'
                  : 'border-2 bg-white dark:bg-gray-700 border-slate-400 dark:border-slate-500'
              }`}></span>
              <span className={`text-[11px] font-bold ${
                toggleValue ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
              }`}>
                {toggleText}
              </span>
            </label>
          </Tooltip>
        )}
      </div>

      {isOpen && !disabled && (
        <div
          ref={pickerRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 mt-2 p-3 bg-(--bg-primary) border border-(--border-color) rounded-lg shadow-xl z-50 flex flex-col gap-3"
        >
          {/* Reinitialize HSV only for external/manual color changes, never while dragging. */}
          <HexColorPicker key={revision} color={pickerColor} onChange={handleColorPickerChange} />

          <div className="flex items-center gap-2">
            <label htmlFor={fieldId} className="text-xs font-medium text-(--text-secondary)">Hex</label>
            <input
              id={fieldId}
              type="text"
              value={draftHex}
              onChange={handleHexChange}
              onBlur={commitHex}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  commitHex();
                }
              }}
              autoComplete="off"
              spellCheck={false}
              aria-label={`${label || "Color"} HEX`}
              className="flex-1 text-xs p-1.5 bg-(--bg-secondary) text-(--text-primary) border border-(--border-color) rounded-md outline-none focus:ring-1 focus:ring-blue-500 uppercase"
              placeholder="#ffffff"
            />
          </div>
        </div>
      )}
    </div>
  );
}
