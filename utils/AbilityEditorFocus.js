/** Prefer the following window, then the preceding one, after a deletion. */
export function getAbilityRemovalFocusId(blocks, removedId) {
  const index = blocks.findIndex((block) => block.id === removedId);
  if (index < 0 || blocks.length <= 1) return null;
  return blocks[index + 1]?.id ?? blocks[index - 1]?.id ?? null;
}

export function captureAbilityFocus(root, id) {
  if (!root || !id) return null;
  const element = root.ownerDocument.getElementById(`ability-text-${id}`);
  if (!element || !root.contains(element)) return { id, start: 0, end: 0, direction: "none" };
  return {
    id,
    start: element.selectionStart ?? 0,
    end: element.selectionEnd ?? 0,
    direction: element.selectionDirection ?? "none",
  };
}

/** Called after the new list has committed; never during render/reducer work. */
export function restoreAbilityFocus(root, target) {
  if (!root || !target) return false;
  const element = root.ownerDocument.getElementById(`ability-text-${target.id}`);
  if (!element || !root.contains(element) || element.disabled || !element.isConnected) return false;
  element.focus({ preventScroll: true });
  const length = element.value.length;
  element.setSelectionRange(Math.min(target.start, length), Math.min(target.end, length), target.direction);
  return root.ownerDocument.activeElement === element;
}
