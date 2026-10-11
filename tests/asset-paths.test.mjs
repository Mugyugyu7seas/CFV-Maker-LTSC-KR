import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { KOREAN_ASSET_PATHS } = await import(pathToFileURL(path.join(root, "utils/AssetManifest.generated.mjs")).href);
const { SHARED_ASSET_PATHS } = await import(pathToFileURL(path.join(root, "utils/AssetManifest.generated.mjs")).href);
const { createHash } = await import("node:crypto");
const { getKoreanAssetPath, getKoreanCardIconPath, getAssetPath } = await import(pathToFileURL(path.join(root, "utils/PathHelper.js")).href);

test("generated Korean asset manifest is non-empty, normalized, and points to real files", () => {
  assert.ok(KOREAN_ASSET_PATHS.size > 0);
  const koreanRoot = path.join(root, "public", "assets", "ko");
  for (const assetPath of KOREAN_ASSET_PATHS) {
    assert.equal(typeof assetPath, "string");
    assert.ok(assetPath.length > 0);
    assert.ok(!assetPath.startsWith("/"));
    assert.ok(!assetPath.startsWith("ko/"));
    assert.ok(!assetPath.includes("\\"));
    assert.ok(!assetPath.split("/").includes(".."));
    assert.ok(fs.existsSync(path.join(koreanRoot, assetPath)), `Manifest entry missing from public/assets/ko: ${assetPath}`);
  }
});

test("existing Korean counterparts are selected and missing counterparts fall back to shared paths", () => {
  assert.equal(getKoreanAssetPath("/assets/base/base_overlay_top.png"), "/assets/ko/base/base_overlay_top.png");
  assert.equal(getKoreanAssetPath("/assets/base/base_overlay_custom.png"), "/assets/ko/base/base_overlay_custom.png");
  assert.equal(getKoreanAssetPath("/assets/frame/EN.png"), "/assets/frame/EN.png");
  assert.equal(getKoreanAssetPath("/assets/flavor/box.png"), "/assets/flavor/box.png");
  assert.equal(getKoreanAssetPath("/assets/trigger/draw.png"), "/assets/trigger/draw.png");
  assert.equal(getKoreanAssetPath("/assets/base/race.png"), "/assets/ko/base/race.png");
});

test("built-in ability icons use the same manifest policy; uploads remain untouched", () => {
  assert.equal(getKoreanCardIconPath("/assets/icon/AUTO.png"), "/assets/ko/icon/AUTO.png");
  assert.equal(getKoreanCardIconPath("/assets/icon/cost/value/bg.png"), "/assets/ko/icon/cost/value/bg.png");
  for (const value of ["blob:custom-icon", "data:image/png;base64,AA", "/custom/example.png", null, ""]) {
    assert.equal(getKoreanCardIconPath(value), value);
  }
});

test("shared assets normalize legacy Korean URLs; unique Korean files keep their paths", () => {
  const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  for (const relative of SHARED_ASSET_PATHS) {
    const shared = `/assets/${relative}`, korean = `/assets/ko/${relative}`;
    assert.ok(fs.existsSync(path.join(root, "public", shared)));
    if (!KOREAN_ASSET_PATHS.has(relative)) {
      assert.equal(getKoreanAssetPath(shared), shared);
      assert.equal(getKoreanAssetPath(korean), shared);
      assert.equal(getKoreanAssetPath(getKoreanAssetPath(korean)), shared);
      assert.ok(!fs.existsSync(path.join(root, "public", korean)), `Duplicate localized file remains: ${relative}`);
    } else {
      assert.notEqual(hash(path.join(root, "public", shared)), hash(path.join(root, "public", korean)));
    }
  }
  for (const relative of KOREAN_ASSET_PATHS) {
    const korean = `/assets/ko/${relative}`;
    assert.equal(getKoreanAssetPath(korean), korean);
    assert.ok(fs.existsSync(path.join(root, "public", korean)));
    assert.equal(getKoreanAssetPath(`/assets/${relative}`), korean);
  }
});

test("base and icon families always use Korean directories; shared families never localize", () => {
  for (const relative of KOREAN_ASSET_PATHS) {
    if (!/^(base|icon)\//.test(relative)) continue;
    for (const localized of [false, true]) {
      assert.equal(getAssetPath(`/assets/${relative}`, "", localized), `/assets/ko/${relative}`);
      assert.equal(getAssetPath(relative, "", localized), `/assets/ko/${relative}`);
    }
    assert.ok(!fs.existsSync(path.join(root, "public/assets", relative)));
  }
  for (const family of ["flavor", "frame", "trigger"]) {
    for (const relative of SHARED_ASSET_PATHS) {
      if (!relative.startsWith(family + "/")) continue;
      for (const localized of [false, true]) {
        assert.equal(getAssetPath(`/assets/${relative}`, "", localized), `/assets/${relative}`);
        assert.equal(getAssetPath(`/assets/ko/${relative}`, "", localized), `/assets/${relative}`);
      }
    }
  }
  for (const value of ["blob:upload", "data:image/png;base64,AA", "/custom/icon.png", "https://example.org/icon.png"]) {
    assert.equal(getKoreanAssetPath(value), value);
  }
});
