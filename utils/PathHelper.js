import { KOREAN_ASSET_PATHS, SHARED_ASSET_PATHS } from "./AssetManifest.generated.mjs";

const ASSET_PREFIX = "/assets/";
const KOREAN_PREFIX = "/assets/ko/";

// Directory policy is independent of card mode and legacy localization flags.
export const getCanonicalAssetPath = (originalPath) => {
  if (typeof originalPath !== "string" || !originalPath.startsWith(ASSET_PREFIX)) return originalPath;
  const relativePath = originalPath.slice(ASSET_PREFIX.length).replace(/^ko\//, "");
  if (/^(base|icon)\//.test(relativePath)) return KOREAN_PREFIX + relativePath;
  if (/^(flavor|frame|trigger)\//.test(relativePath)) return ASSET_PREFIX + relativePath;
  if (originalPath.startsWith(KOREAN_PREFIX) && !KOREAN_ASSET_PATHS.has(relativePath) && SHARED_ASSET_PATHS.has(relativePath)) return ASSET_PREFIX + relativePath;
  return originalPath;
};

export const getKoreanAssetPath = (originalPath) => {
  originalPath = getCanonicalAssetPath(originalPath);
  if (typeof originalPath !== "string" || !originalPath.startsWith(ASSET_PREFIX)) return originalPath;
  if (originalPath.startsWith(KOREAN_PREFIX)) return originalPath;
  const relativePath = originalPath.slice(ASSET_PREFIX.length);
  if (/^(flavor|frame|trigger)\//.test(relativePath)) return originalPath;
  return KOREAN_ASSET_PATHS.has(relativePath) ? KOREAN_PREFIX + relativePath : originalPath;
};

/** Resolve built-in ability icons using the same manifest-based policy. */
export const getKoreanCardIconPath = (originalPath) => {
  if (typeof originalPath !== "string" || !originalPath) return originalPath;
  if (!originalPath.startsWith(`${ASSET_PREFIX}icon/`) && !originalPath.startsWith(`${KOREAN_PREFIX}icon/`)) return originalPath;
  return getKoreanAssetPath(originalPath);
};

export const getAssetPath = (filename, category = "", useKoreanAsset = true) => {
  if (!filename) return null;
  if (filename.startsWith("/")) {
    return useKoreanAsset ? getKoreanAssetPath(filename) : getCanonicalAssetPath(filename);
  }
  const fullPath = `${ASSET_PREFIX}${category ? `${category}/` : ""}${filename}`;
  return useKoreanAsset ? getKoreanAssetPath(fullPath) : getCanonicalAssetPath(fullPath);
};

export const getBasePath = (filename, useKoreanAsset = true) => getAssetPath(filename, "base", useKoreanAsset);
export const getPassivePath = (filename, useKoreanAsset = true) => getAssetPath(filename, "passive", useKoreanAsset);
export const getTriggerPath = (filename, useKoreanAsset = false) => getAssetPath(filename, "trigger", useKoreanAsset);
export const getNationPath = (filename, useKoreanAsset = true) => getAssetPath(filename, "base/nation", useKoreanAsset);
export const getGradePath = (filename, useKoreanAsset = true) => getAssetPath(filename, "base/nation/grade", useKoreanAsset);
export const getRacePath = (filename, useKoreanAsset = true) => getAssetPath(filename, "base", useKoreanAsset);
export const getShieldPath = (filename, useKoreanAsset = true) => getAssetPath(filename, "base/shield", useKoreanAsset);
export const getTagPath = (filename, useKoreanAsset = true) => getAssetPath(filename, "base/tag", useKoreanAsset);
export const getClanPath = (filename, useKoreanAsset = true) => getAssetPath(filename, "base", useKoreanAsset);
