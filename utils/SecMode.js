/** SEC is a retained preference, active only while card SP is enabled. */
export const isSecMode = ({ isFullArt = false, isSec = false } = {}) =>
  isFullArt === true && isSec === true;

export function normalizeSecPreference(value) {
  if (value == null) return false;
  if (typeof value !== "boolean") throw new TypeError("isSec must be true or false.");
  return value;
}
