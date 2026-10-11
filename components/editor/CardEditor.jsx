// CFV hide-explanations and SEC UI v1
"use client";
import { getGradeNumberFill } from "../../utils/GradeNumberStyle";
import React, { useState, useCallback, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Group, Text } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { createAbilityBlock, getAbilityBackgroundColor, tintAbilityImageData } from '../../utils/AbilityBlocks';
// Ability window spacing v2: measured bounds and one top-only flavour gap.
import { getAbilityBlockLayout, getAbilityFlavorY } from '../../utils/AbilityBlockLayout';
import { sameAbilityImageBounds, measureAbilityImageBounds } from '../../utils/AbilityImageBounds';
import { ABILITY_WINDOW_SPACING } from '../../utils/store/AbilityWindowSpacing';
import { ABILITY_EDITOR_TEXT as abilityText } from '../../utils/store/AbilityEditorText';
import AbilitiesBox from './AbilitiesOutput';
import { getBoxPath } from '../../utils/store/CardConstants';
import { CARD_TYPOGRAPHY as typography } from '../../utils/store/Typography';
import { useIconConfig } from '../../utils/store/IconConfig';
import {
  getBasePath,
  getPassivePath,
  getTriggerPath,
  getNationPath,
  getTagPath,
  getRacePath,
  getShieldPath,
  getClanPath,
  getKoreanAssetPath,
  getAssetPath,
  getGradePath
} from '../../utils/PathHelper';
import { typeLabel, RACE_OVERLAY, getShieldOverlay } from '../../utils/store/CardConstants';

const EMPTY_OVERLAY_FILTERS = [];
const RGB_OVERLAY_FILTERS = [Konva.Filters.RGB];
const DEFAULT_DARK_ABILITY_TINT = { r: 60, g: 60, b: 60 };
const MAX_CHARS_PER_LINE = 60;
const MAX_RENDER_LINES = 2;
let BASE_WIDTH = 400;
let BASE_HEIGHT = 584;

const EXPORT_PRESETS = {
  max: { width: 2805, height: 4090, label: 'Max (7x)', viewportWidth: 400, viewportHeight: 584 },
  standard: { width: 1600, height: 2336, label: 'Standard (4x)', viewportWidth: 400, viewportHeight: 584 },
  lite: { width: 800, height: 1168, label: 'Lite (2x)', viewportWidth: 400, viewportHeight: 584 },
};

function wrapFlavorText(text) {
  if (!text) return "";
  const rawLines = text.split("\n");
  const result = [];
  for (let line of rawLines) {
    while (line.length > MAX_CHARS_PER_LINE) {
      result.push(line.slice(0, MAX_CHARS_PER_LINE));
      line = line.slice(MAX_CHARS_PER_LINE);
    }
    result.push(line);
  }
  return result.slice(0, MAX_RENDER_LINES).join("\n");
}

function CardEditor({
  overlayNation,
  overlayClan,
  overlayType,
  subOrderType,
  isSubType,
  overlayPassive,
  overlayAddition,
  overlayTrigger,
  overlayCardName,
  overlayRaceText,
  raceCheck,
  overlayGrade,
  gradeNumberStyle,
  overlayPower,
  overlayShieldValue,
  shieldCheck,
  overlayIllust,
  overlayFlavor,
  overlayAbilities,
  abilityBlocks,
  onAbilityLayoutChange,
  abilitySpacingAdjust = 0,
  isFullArt,
  showGlobe,
  customLayers,
  baseColorTint,
  showClan,
  customNationEnabled,
  solidColor,
  customNationName,
  cardNameGradient,
  nationGradient,

  isMobile,
  isLocked,
  isDragging,
  imageSrc,
  exportTrigger,
  exportPreset = 'standard',
  onImageConfigChange,
  initialImageConfig,
  onExportEnd,
}) {
  const ICON_CONFIG = useIconConfig();
  const isInternalUpdate = useRef(false);
  const stageRef = useRef(null);
  const flavorTextRef = useRef(null);
  const hasAppliedInitialConfig = useRef(
    Boolean(initialImageConfig?.scale != null && imageSrc)
  );
  const baseOverlayRef = useRef(null);

  const font = typography.bodyFont;
  const lightFont = typography.bodyLightFont ?? font;
  const fontSize = typography.bodyFontSize;
  const lineHeight = typography.bodyLineHeight;
  const bodyLightYOffset =
    typography.bodyLightYOffset ?? 0;
  // 라이드 덱 크레스트는 내부 설정을,
  // 나머지 카드는 기존 UI 보정값을 사용한다.
  const spacingAdjust =
    Number(
      overlayType === "base_crest.png/ride_deck"
        ? (typography.rideDeckSpacingAdjust ?? 0)
        : abilitySpacingAdjust
    ) || 0;

  const bodyLetterSpacing =
    (typography.bodyLetterSpacing ?? 0) + spacingAdjust;

  const bodyWordSpacing =
    (typography.bodyWordSpacing ?? 0) + spacingAdjust;

  const bodyYOffset =
    typography.bodyYOffset ?? 0;

  const [abilityMeasurements, setAbilityMeasurements] = useState({});
  const renderedAbilityBlocks = useMemo(() =>
    abilityBlocks ?? [createAbilityBlock("generated-ability", overlayAbilities || "")],
    [abilityBlocks, overlayAbilities]);
  const recordAbilityMeasurement = useCallback((id, text, metrics) => {
    setAbilityMeasurements((previous) => {
      const before = previous[id];
      if (before?.text === text && before.lineCount === metrics.lineCount &&
          (before.hideExplanations === true) === (metrics.hideExplanations === true) &&
          before.widthOverflow === metrics.widthOverflow &&
          before.backgroundReady === metrics.backgroundReady &&
          sameAbilityImageBounds(before.backgroundBounds, metrics.backgroundBounds)) return previous;
      return { ...previous, [id]: { text, ...metrics } };
    });
  }, []);

  useEffect(() => {
    const activeIds = new Set(renderedAbilityBlocks.map((block) => block.id));
    setAbilityMeasurements((previous) => {
      if (Object.keys(previous).every((id) => activeIds.has(id))) return previous;
      return Object.fromEntries(Object.entries(previous).filter(([id]) => activeIds.has(id)));
    });
  }, [renderedAbilityBlocks]);

  const [textWidth, setTextWidth] = useState(0);
  const flavorDisplayWidth =
        textWidth * (typography.flavorScaleX ?? 1);
  const [contentConfig, setContentConfig] = useState(() =>
    initialImageConfig?.scale ? initialImageConfig : { scale: 1, x: 0, y: 0 }
  );

  const lastCenter = useRef(null);
  const lastDist = useRef(0);
  const [isMultiTouch, setIsMultiTouch] = useState(false);

  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => {
      setTimeout(() => {
        setFontsLoaded(true);
      }, 150);
    });
  }, []);

  const isNormalUnit = overlayType === `base_normal.png`;
  const isTriggerUnit = overlayType === 'base_trigger.png';
  const isTriggerOrder = overlayType === 'base_trigger_o.png' || overlayType === 'base_blitz_trigger_o.png' || overlayType === 'base_set_trigger_o.png';
  const isGUnitEncounter = overlayType === 'base_g.png/encounter';
  const isGUnit = isGUnitEncounter || overlayType === 'base_g.png';
  const isEncounter = overlayType === 'base_encounter.png' || isGUnitEncounter;
  const isTokenUnit = overlayType === 'base_normal.png/token';
  const isDarkMode = isEncounter || overlayType === 'base_crest.png/encounter';

  const isMarker = overlayType === 'base_ticket.png/marker';
  const isEnergy = overlayType === 'base_ticket.png';

  const isCrest = overlayType.split('.png')[0] + '.png' === 'base_crest.png'

  if (isCrest) {
    BASE_WIDTH = 584;
    BASE_HEIGHT = 400;
  } else {
    BASE_WIDTH = 400;
    BASE_HEIGHT = 584;
  }

  const isUnit = isNormalUnit || isTriggerUnit || isTokenUnit || isGUnit || isEncounter
  const isOrder = !isUnit && !isMarker && !isEnergy && !isCrest
  const hasClan = (showClan || isEncounter) && overlayClan !== 'race.png';

  const totalAbilitiesLines = typography.abilityLines;
  const abilityLayout = useMemo(() => getAbilityBlockLayout(
    renderedAbilityBlocks, abilityMeasurements,
    { isUnit, isCrest, isEnergy, maxLines: totalAbilitiesLines, windowGap: ABILITY_WINDOW_SPACING.windowGap }
  ), [renderedAbilityBlocks, abilityMeasurements, isUnit, isCrest, isEnergy, totalAbilitiesLines, ABILITY_WINDOW_SPACING.windowGap]);

  useEffect(() => {
    onAbilityLayoutChange?.({
      ready: abilityLayout.ready,
      overflow: abilityLayout.overflow,
      totalLines: abilityLayout.totalLines,
      blockCount: abilityLayout.items.length,
    });
  }, [abilityLayout.ready, abilityLayout.overflow, abilityLayout.totalLines,
      abilityLayout.items.length, onAbilityLayoutChange]);

  const [isExporting, setIsExporting] = useState(false);

  const passivePath = overlayPassive ? getPassivePath(overlayPassive) : null;
  const additionPath = overlayAddition ? getPassivePath(overlayAddition) : null;
  const triggerPath = overlayTrigger ? getTriggerPath(overlayTrigger) : null;
  const nationPath = overlayNation ? (isUnit ? getNationPath(overlayNation) : isCrest ? getNationPath(overlayNation, false).replace(".png", "_c.png") : getNationPath(overlayNation).replace(".png", "_o.png")) : null;
  const vertexPath = (overlayNation && isCrest) ? getNationPath(overlayNation, false).replace(".png", "_v.png") : null;
  const gradeNationPath = customNationEnabled ? getGradePath('custom.png') : getGradePath(overlayNation);
  const tagFile = overlayType ? typeLabel[overlayType] : null;
  const shieldFile = getShieldOverlay(shieldCheck, overlayShieldValue);
  const shieldPath = shieldFile ? getShieldPath(shieldFile) : null;
  const raceOverlayPath = getRacePath(RACE_OVERLAY);
  const [base_overlay] = useImage(getKoreanAssetPath(baseColorTint?.enabled ? '/assets/base/base_overlay_custom.png' : '/assets/base/base_overlay.png'));
  const [base_overlay_top] = useImage(getKoreanAssetPath('/assets/base/base_overlay_top.png'));
  const encounterFrame = isDarkMode ? getKoreanAssetPath('/assets/frame/EN.png') : null;
  const tokenFramePath = getKoreanAssetPath('/assets/frame/token.png');
  const globe = showGlobe ? getBasePath('globe.png') : null;

  const typePath = overlayType ? getBasePath(overlayType, (isNormalUnit || isTriggerUnit || isTokenUnit || !isUnit) ? false : true).split('.png')[0] + '.png' : null;
  let tagPath = tagFile ? getTagPath(tagFile) : null;



  // Custom
  const customSuffix = isOrder ? '_o' : '';

  const nation_bg =
    getNationPath(`custom${customSuffix}.png`);

  const gradient =
    getNationPath(`custom/gradient${customSuffix}.png`);

  const color =
    getNationPath(`custom/color${customSuffix}.png`);

  const nation =
    getNationPath(`custom/nation${customSuffix}.png`);

  const nation_frame =
    getNationPath(`custom/nation_frame${customSuffix}.png`);

  const front =
    getNationPath(`custom/front${customSuffix}.png`);

  const hide_flag =
    getNationPath(`custom/hide_flag${customSuffix}.png`);

  // --

  let subOrderColor = "#000000"

  if (isOrder && isSubType) {
    if (isTriggerOrder) {
      subOrderColor = "#8e2500";
    } else if (typePath?.includes("normal")) {
      subOrderColor = "#00245c";
    } else if (typePath?.includes("blitz")) {
      subOrderColor = "#870b15";
    } else if (typePath?.includes("set")) {
      subOrderColor = "#121d30";
    }
    tagPath = tagPath.replace(".png", "2.png");
  }

  // Box boundaries now come exclusively from abilityBlocks.
  // Legacy blank-line conversion is confined to template import (CardFormat).

  const [flavorBG] = isDarkMode
    ? useImage(getKoreanAssetPath('/assets/flavor/box_enc.png'))
    : useImage(getKoreanAssetPath('/assets/flavor/box.png'));

  const [flavorL] = isDarkMode
    ? useImage(getKoreanAssetPath('/assets/flavor/fadeL_enc.png'))
    : useImage(getKoreanAssetPath('/assets/flavor/fadeL.png'));

  const [flavorR] = isDarkMode
    ? useImage(getKoreanAssetPath('/assets/flavor/fadeR_enc.png'))
    : useImage(getKoreanAssetPath('/assets/flavor/fadeR.png'));

  const [flavorBG2] = isDarkMode
    ? useImage(getKoreanAssetPath('/assets/flavor/box2_enc.png'))
    : useImage(getKoreanAssetPath('/assets/flavor/box2.png'));

  const [flavorL2] = isDarkMode
    ? useImage(getKoreanAssetPath('/assets/flavor/fadeL2_enc.png'))
    : useImage(getKoreanAssetPath('/assets/flavor/fadeL2.png'));

  const [flavorR2] = isDarkMode
    ? useImage(getKoreanAssetPath('/assets/flavor/fadeR2_enc.png'))
    : useImage(getKoreanAssetPath('/assets/flavor/fadeR2.png'));

  const [DIcon] = useImage(getKoreanAssetPath(isCrest ? '/assets/icon_landscape.png' : '/assets/icon.png'));

  const [imageObj] = useImage(imageSrc ? imageSrc : null);

  useEffect(() => {
    if (!imageSrc) return;
    const hasSavedConfig =
      initialImageConfig?.scale != null &&
      (initialImageConfig.scale !== 1 ||
        initialImageConfig.x !== 0 ||
        initialImageConfig.y !== 0);
    if (!hasSavedConfig) {
      hasAppliedInitialConfig.current = false;
    }
  }, [imageSrc]);

  const isBaseOverlayVisible = Boolean(base_overlay && (isNormalUnit || isTriggerUnit || isTokenUnit));

  // Rebuild the tint cache only when the source/colour/size/export scale changes.
  // The previous inline ref recached the image on every text edit.
  useLayoutEffect(() => {
    const node = baseOverlayRef.current;
    if (!node) return;
    node.clearCache();
    if (baseColorTint?.enabled && base_overlay) {
      node.cache({ x: 0, y: 0, width: BASE_WIDTH, height: BASE_HEIGHT, pixelRatio: isExporting || 1 });
    }
    node.getLayer()?.batchDraw();
  }, [base_overlay, baseColorTint?.enabled, baseColorTint?.color,
      BASE_WIDTH, BASE_HEIGHT, isExporting, fontsLoaded]);

  useEffect(() => {
    if (initialImageConfig?.scale &&
      (Math.abs(initialImageConfig.scale - contentConfig.scale) > 0.001 ||
        Math.abs(initialImageConfig.x - contentConfig.x) > 0.001 ||
        Math.abs(initialImageConfig.y - contentConfig.y) > 0.001)) {
      isInternalUpdate.current = true;
      setContentConfig(initialImageConfig);
      hasAppliedInitialConfig.current = true;
    }
  }, [initialImageConfig?.scale, initialImageConfig?.x, initialImageConfig?.y]);

  useEffect(() => {
    if (!imageObj) return;

    const isDefaultConfig = contentConfig.x === 0 && contentConfig.y === 0 && contentConfig.scale === 1;

    if (!hasAppliedInitialConfig.current || isDefaultConfig) {
      const scale = BASE_HEIGHT / imageObj.height;
      const scaledWidth = imageObj.width * scale;

      const newConfig = {
        scale,
        x: (BASE_WIDTH - scaledWidth) / 2,
        y: 0
      };

      isInternalUpdate.current = true;
      setContentConfig(newConfig);
      hasAppliedInitialConfig.current = true;
    }
  }, [imageObj, imageSrc]);

  useEffect(() => {
    if (exportTrigger > 0) handleExport();
  }, [exportTrigger]);

  useEffect(() => {
    if (flavorTextRef.current) {
      setTextWidth(flavorTextRef.current.width());
    }
  }, [
    overlayFlavor,
    fontsLoaded,
    typography.flavorFont,
    typography.flavorFontSize,
    typography.flavorLetterSpacing
  ]);

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    onImageConfigChange?.(contentConfig);
  }, [contentConfig.scale, contentConfig.x, contentConfig.y, onImageConfigChange]);


  const handleExport = async () => {
    if (!stageRef.current) return;
    if (!abilityLayout.ready || abilityLayout.overflow) {
      window.alert(abilityLayout.overflow
        ? abilityText.exportOverflow
        : abilityText.exportPending);
      onExportEnd?.();
      return;
    }

    const currentPreset = EXPORT_PRESETS[exportPreset] || EXPORT_PRESETS.standard;
    const exportScale = currentPreset.width / BASE_WIDTH;

    setIsExporting(exportScale);

    await new Promise(r => setTimeout(r, 80));

    try {
      const offscreenCanvas = stageRef.current.toCanvas({
        pixelRatio: exportScale,
      });

      const bitmap = await createImageBitmap(offscreenCanvas);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = bitmap.width;
      tempCanvas.height = bitmap.height;

      const ctx = tempCanvas.getContext('bitmaprenderer');
      ctx.transferFromImageBitmap(bitmap);

      tempCanvas.toBlob(async (blob) => {
        const safeFileName = overlayCardName.replace(/[/\\?%*:|"<>]/g, '').trim() || 'card';

        if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.saveFile) {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            await window.electronAPI.saveFile(arrayBuffer, `${safeFileName}.png`);
          } catch (e) {
            console.error('Failed to save file natively:', e);
          } finally {
            bitmap.close();
          }
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${safeFileName}.png`;
          link.href = url;
          document.body.appendChild(link);
          link.click();

          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          bitmap.close();
        }
      }, 'image/png');

    } catch (error) {
    }

    setIsExporting(false);
    onExportEnd?.();
  };

  const getDistance = (p1, p2) => {
    return Math.sqrt(
      Math.pow(p2.x - p1.x, 2) +
      Math.pow(p2.y - p1.y, 2)
    );
  };

  const getCenter = (p1, p2) => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  };

  const handleTouchMove = useCallback((e) => {
    if (isLocked || isDragging) return;

    const touches = e.evt.touches;

    setIsMultiTouch(touches.length >= 2);

    const touch1 = touches[0];
    const touch2 = touches[1];

    if (!touch1 || !touch2) {
      lastCenter.current = null;
      lastDist.current = 0;
      return;
    }

    e.evt.preventDefault();

    const p1 = {
      x: touch1.clientX,
      y: touch1.clientY,
    };

    const p2 = {
      x: touch2.clientX,
      y: touch2.clientY,
    };

    const center = getCenter(p1, p2);
    const dist = getDistance(p1, p2);

    if (!lastCenter.current) {
      lastCenter.current = center;
      lastDist.current = dist;
      return;
    }

    const dx = center.x - lastCenter.current.x;
    const dy = center.y - lastCenter.current.y;

    const scaleBy = dist / lastDist.current;

    setContentConfig((prev) => {
      const oldScale = prev.scale;

      const newScale = oldScale * scaleBy;

      const pointTo = {
        x: (center.x - prev.x) / oldScale,
        y: (center.y - prev.y) / oldScale,
      };

      const newPos = {
        x: center.x - pointTo.x * newScale,
        y: center.y - pointTo.y * newScale,
      };

      return {
        scale: newScale,
        x: newPos.x + dx,
        y: newPos.y + dy,
      };
    });

    lastCenter.current = center;
    lastDist.current = dist;
  }, [isLocked, isDragging]);

  const handleWheel = useCallback((e) => {
    if (isLocked || isDragging) return;
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    setContentConfig(prev => {
      const oldScale = prev.scale;
      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const mousePointTo = { x: (pointer.x - prev.x) / oldScale, y: (pointer.y - prev.y) / oldScale };
      return { scale: newScale, x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
    });
  }, [isLocked, isDragging]);

  const handleDragEnd = useCallback((newPos) => {
    setContentConfig(prev => ({ ...prev, x: newPos.x, y: newPos.y }));
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const touches = e.evt.touches;

    if (touches.length < 2) {
      setIsMultiTouch(false);

      lastCenter.current = null;
      lastDist.current = 0;
    }
  }, []);

  const processedFlavor = wrapFlavorText(overlayFlavor);
  const flavorLine = processedFlavor.split("\n").length;
  const flavorLineHeightValue = typography.flavorLineHeight ?? 1;
  const flavorPaddingY = typography.flavorPaddingY ?? 3;
  const flavorYOffset = typography.flavorYOffset ?? 0;

  const nameAreaX = typography.nameAreaX ?? 95;
  const nameAreaWidth = typography.nameAreaWidth ?? 150;
  const nameYOffset = typography.nameYOffset ?? 0;
  const nameLetterSpacing = typography.nameLetterSpacing ?? 0;
  // 카드명 칸 중앙 정렬 관련 선언

  const flavorJoinOverlap = 0;    // 플레이버 텍스트 접합선 관련으로 시도한건데 안만들어도 됐었음

  const flavorCenterWidth =
    flavorDisplayWidth + 2 + (flavorJoinOverlap * 2);

  const flavorTextHeight =
    flavorLine *
    typography.flavorFontSize *
    flavorLineHeightValue;

  const flavorBoxHeight =
    flavorTextHeight + (flavorPaddingY * 2);

  const flavorBaseY = 494 - flavorBoxHeight;

  const getFlavorY = () => getAbilityFlavorY(abilityLayout, {
    flavorBoxHeight,
    parentY: isUnit ? 0 : 21.5,
    emptyY: flavorBaseY + flavorYOffset,
    flavorGap: ABILITY_WINDOW_SPACING.flavorGap,
  });

  const [nameScaleX, setNameScaleX] = useState(1);
  const [cardNameWidth, setCardNameWidth] = useState(0);
  const cardNameRef = useRef(null);

  const [raceScaleX, setRaceScaleX] = useState(1);
  const [raceTextWidth, setRaceTextWidth] = useState(0);
  const raceTextRef = useRef(null);

  useLayoutEffect(() => {
    if (cardNameRef.current) {
      const actualWidth = cardNameRef.current.width();
      const maxWidth = typography.nameAreaWidth ?? 240;

      setCardNameWidth(actualWidth);

      if (actualWidth > maxWidth) {
        setNameScaleX(maxWidth / actualWidth);
      } else {
        setNameScaleX(1);
      }
    }
  }, [
    overlayCardName,
    fontsLoaded,
    typography.nameFont,
    typography.nameFontSize,
    typography.nameLetterSpacing,
    typography.nameAreaWidth
  ]);

  const [subtypeScaleX, setSubtypeScaleX] = useState(1);
  const [subtypeWidth, setSubtypeWidth] = useState(0);
  const subtypeRef = useRef(null);

  useLayoutEffect(() => {
    if (subtypeRef.current) {
      const actualWidth = subtypeRef.current.width();
      const maxWidth = 55;

      setSubtypeWidth(actualWidth);

      if (actualWidth > maxWidth) {
        setSubtypeScaleX(maxWidth / actualWidth);
      } else {
        setSubtypeScaleX(1);
      }
    }
  }, [
    subOrderType,
    fontsLoaded,
    typography.nationFont,
    typography.nationFontSize,
    typography.subtypeLetterSpacing,
  ]);

  useLayoutEffect(() => {
    if (raceTextRef.current) {
      const actualWidth = raceTextRef.current.width();
      const maxWidth = hasClan ? 50 : 100;

      setRaceTextWidth(actualWidth);

      if (actualWidth > maxWidth) {
        setRaceScaleX(maxWidth / actualWidth);
      } else {
        setRaceScaleX(1);
      }
    }
}, [
  overlayRaceText,
  hasClan,
  fontsLoaded,
  typography.raceFont,
  typography.raceFontSize,
  typography.raceLetterSpacing]);

  const [nationScaleX, setNationScaleX] = useState(1);
  const [nationTextWidth, setNationTextWidth] = useState(0);
  const nationTextRef = useRef(null);

  useLayoutEffect(() => {
    if (nationTextRef.current) {
      const actualWidth = nationTextRef.current.width();
      const maxWidth = 100;

      setNationTextWidth(actualWidth);

      if (actualWidth > maxWidth) {
        setNationScaleX(maxWidth / actualWidth);
      } else {
        setNationScaleX(1);
      }
    }
  }, [
    customNationName,
    fontsLoaded,
    typography.nationFont,
    typography.nationFontSize,
    typography.nationLetterSpacing,
  ]);

  return (
    <Stage
      width={BASE_WIDTH}
      height={BASE_HEIGHT}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={stageRef}
      style={{
        cursor: isLocked ? 'default' : 'move',
        touchAction: 'none',
      }}
    >
      <Layer
        key={fontsLoaded ? 'fonts-ready' : 'fonts-loading'}
        clipFunc={(ctx) => {
          const r = 24, w = BASE_WIDTH, h = BASE_HEIGHT;
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.lineTo(w - r, 0);
          ctx.quadraticCurveTo(w, 0, w, r);
          ctx.lineTo(w, h - r);
          ctx.quadraticCurveTo(w, h, w - r, h);
          ctx.lineTo(r, h);
          ctx.quadraticCurveTo(0, h, 0, h - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();
        }}
      >
        {/* Background */}
        <Rect width={BASE_WIDTH} height={BASE_HEIGHT} fill="white" />

        {/* Art */}
        <Group visible={Boolean(imageSrc)}>
          {imageSrc && (
            <EditableImage
              url={imageSrc}
              config={contentConfig}
              draggable={!isLocked && !isMultiTouch}
              onDragEnd={handleDragEnd}
            />
          )}
        </Group>

        {/* Encounter Frame */}
        <OverlayFrame visible={Boolean(isDarkMode && !isFullArt && !isCrest)} exportScale={isExporting} url={encounterFrame} width={BASE_WIDTH} height={BASE_HEIGHT} />

        {/* Crest Globe */}
        <OverlayFrame visible={isCrest && showGlobe} exportScale={isExporting} url={globe} width={BASE_WIDTH} height={BASE_HEIGHT} />

        {/* Crest Vertext */}
        <OverlayFrame visible={isCrest} exportScale={isExporting} url={vertexPath} width={BASE_WIDTH} height={BASE_HEIGHT} />

        {/* Base Type */}
        <OverlayFrame visible={Boolean(typePath)} exportScale={isExporting} url={typePath} width={BASE_WIDTH} height={BASE_HEIGHT} />

        {/* Base Overlay */}
        <KonvaImage
          visible={isBaseOverlayVisible}
          image={base_overlay}
          width={BASE_WIDTH}
          height={BASE_HEIGHT}
          listening={false}
          filters={baseColorTint?.enabled ? RGB_OVERLAY_FILTERS : EMPTY_OVERLAY_FILTERS}
          red={baseColorTint?.enabled ? parseInt(baseColorTint.color.slice(1, 3), 16) : 255}
          green={baseColorTint?.enabled ? parseInt(baseColorTint.color.slice(3, 5), 16) : 255}
          blue={baseColorTint?.enabled ? parseInt(baseColorTint.color.slice(5, 7), 16) : 255}
          ref={baseOverlayRef}
        />
        <KonvaImage visible={Boolean(base_overlay_top && (isNormalUnit || isTriggerUnit || isTokenUnit))} image={base_overlay_top} width={BASE_WIDTH} height={BASE_HEIGHT} listening={false} />

        {/* Token Frame */}
        <OverlayFrame visible={Boolean(overlayType?.includes("/token"))} exportScale={isExporting} url={tokenFramePath} width={BASE_WIDTH} height={BASE_HEIGHT} />
        {/* Nation Label */}
        <OverlayFrame visible={Boolean((isCrest || !customNationEnabled) && overlayNation && !isMarker && !isEnergy)} exportScale={isExporting} url={nationPath} width={BASE_WIDTH} height={BASE_HEIGHT} />
        {/* Custom */}
        <Group visible={Boolean(customNationEnabled && !isMarker && !isEnergy && !isCrest)}>
          <OverlayFrame exportScale={isExporting} url={nation_bg} width={BASE_WIDTH} height={BASE_HEIGHT} />
          <GradientOverlayFrame
            url={gradient}
            width={BASE_WIDTH}
            height={BASE_HEIGHT}
            colors={cardNameGradient}
            exportScale={isExporting}
          />
          <GradientOverlayFrame
            url={color}
            width={BASE_WIDTH}
            height={BASE_HEIGHT}
            colors={[solidColor]}
            exportScale={isExporting}
          />
          <OverlayFrame exportScale={isExporting} url={front} width={BASE_WIDTH} height={BASE_HEIGHT} />
          <OverlayFrame exportScale={isExporting} url={hide_flag} width={BASE_WIDTH} height={BASE_HEIGHT} />
          <GradientOverlayFrame
            url={nation}
            width={BASE_WIDTH}
            height={BASE_HEIGHT}
            colors={nationGradient}
            orientation={"horizon"}
            exportScale={isExporting}
          />
          <GradientOverlayFrame
            url={nation_frame}
            width={BASE_WIDTH}
            height={BASE_HEIGHT}
            colors={[solidColor]}
            exportScale={isExporting}
          />
        </Group>

        {/* Custom Layers */}
        {customLayers && customLayers.map((layer) => (
          <OverlayFrame
            key={layer.id}
            visible={Boolean(layer.src && layer.visible)}
            exportScale={isExporting}
            url={layer.src}
            width={BASE_WIDTH}
            height={BASE_HEIGHT}
          />
        ))}

        {/* Grade Nation Icon */}
        <OverlayFrame visible={Boolean(overlayNation && !isMarker && !isEnergy && !isCrest)} exportScale={isExporting} url={gradeNationPath} width={BASE_WIDTH} height={BASE_HEIGHT} />

        {/* Tag */}
        <OverlayFrame visible={Boolean(tagPath)} exportScale={isExporting} url={tagPath} width={BASE_WIDTH} height={BASE_HEIGHT} />

        {/* Subtype */}
        <Group
          visible={Boolean(isSubType && !isMarker && !isUnit)}
          key={`${subOrderType}-${fontsLoaded}`}
          x={46.17}
          y={541.7 + (isMobile ? (-0.5) : 0) + (0.25)}
        >
          <Text
            ref={subtypeRef}
            text={subOrderType}
            x={0}
            offsetX={subtypeWidth / 2}
            fontSize={8.35}
            fontFamily={"VGKRBody"}
            letterSpacing={typography.subtypeLetterSpacing ?? 0}
            stroke={subOrderColor}
            strokeWidth={1.6}
            scaleY={1}
            scaleX={subtypeScaleX}
            fontStyle={"normal"}
            align="center"
            lineJoin="round"
            lineCap="round"
            perfectDrawEnabled={false}
            listening={false}
          />

          <Text
            text={subOrderType}
            x={0}
            offsetX={subtypeWidth / 2}
            fontSize={8.35}
            fontFamily={"VGKRBody"}
            letterSpacing={typography.subtypeLetterSpacing ?? 0}
            fill="white"
            scaleY={1}
            scaleX={subtypeScaleX}
            fontStyle={"normal"}
            align="center"
            perfectDrawEnabled={false}
            listening={false}
          />
        </Group>

        {/* Addition */}
        <OverlayFrame visible={Boolean(additionPath && (isUnit || isOrder) && !isGUnit && !isTokenUnit)} exportScale={isExporting} url={additionPath} width={BASE_WIDTH} height={BASE_HEIGHT} />

        {/* Passive */}
        <OverlayFrame visible={Boolean(passivePath && isUnit)} exportScale={isExporting} url={isGUnit ? getPassivePath('tripledrive.png') : passivePath} width={BASE_WIDTH} height={BASE_HEIGHT} />

        {/* Race Overlay */}
        <Group visible={Boolean(isUnit && (customNationEnabled || (raceOverlayPath && (raceCheck || overlayClan !== `race.png`))))}>
          <OverlayFrame exportScale={isExporting} url={(hasClan && !customNationEnabled) ? getClanPath(overlayClan) : raceOverlayPath} width={BASE_WIDTH} height={BASE_HEIGHT} />
        </Group>

        {/* Shield */}
        <OverlayFrame visible={Boolean(shieldPath && isUnit && shieldCheck && !isGUnit)} exportScale={isExporting} url={shieldPath} width={BASE_WIDTH} height={BASE_HEIGHT} />

        {/* Trigger */}
        <OverlayFrame visible={Boolean(triggerPath && (isTriggerUnit || isTriggerOrder))} exportScale={isExporting} url={triggerPath} width={BASE_WIDTH} height={BASE_HEIGHT} />

        {/* Card Name */}
        <Text
          ref={cardNameRef}
          text={overlayCardName}
          x={
            isCrest
              ? 180 + typography.nameXOffset
              : (typography.nameAreaX + typography.nameAreaWidth / 2)
                + typography.nameXOffset
          }
          y={(isCrest ? 337.75 : (isUnit ? 513 : 534.25)) + typography.nameYOffset}
          fontSize={typography.nameFontSize}
          skewX={typography.nameSkewX * (Math.PI / 180)}
          scaleX={nameScaleX * (typography.nameScaleX ?? 1)}
          scaleY={typography.nameScaleY}
          letterSpacing={typography.nameLetterSpacing ?? 0}
          wrap="none"
          ellipsis={false}
          fontFamily={typography.nameFont}
          fontStyle={typography.nameFontStyle ?? "normal"}
          fill="black"
          stroke="black"
          strokeWidth={typography.nameStrokeWidth ?? 0}
          lineJoin="round"
          align="center"
          perfectDrawEnabled={false}
          listening={false}
          offsetX={cardNameWidth / 2}
        />

        {/* Nation Text */}
        <Group
          visible={Boolean(customNationEnabled && (isUnit || isOrder))}
          x={isOrder ? 174 : 242}
          y={
            (isMobile ? 541 : 539)
            + (isOrder ? 19 : 0)
            + (typography.nationYOffset ?? 0)
          }
          scaleY={0.95}
        >
          <Text
            ref={nationTextRef}
            text={customNationName}
            wrap="none"
            fontSize={typography.nationFontSize}
            fontFamily={typography.nationFont}
            letterSpacing={typography.nationLetterSpacing ?? 0}
            lineJoin="round"
            stroke={solidColor}
            strokeWidth={1.5}
            scaleX={nationScaleX}
            offsetX={nationTextWidth / 2}
            x={(isOrder ? 50 : 100) / 2}
            align="center"
            perfectDrawEnabled={false}
            listening={false}
          />

          <Text
            text={customNationName}
            wrap="none"
            fontSize={typography.nationFontSize}
            fontFamily={typography.nationFont}
            letterSpacing={typography.nationLetterSpacing ?? 0}
            fill="white"
            scaleX={nationScaleX}
            offsetX={nationTextWidth / 2}
            x={(isOrder ? 50 : 100) / 2}
            align="center"
            perfectDrawEnabled={false}
            listening={false}
          />
        </Group>

        {/* Race Text */}
        <Group
          visible={Boolean((customNationEnabled || raceCheck || overlayClan !== `race.png`) && isUnit)}
          x={(hasClan && !customNationEnabled) ? 297 : 242}
          y={
            (isMobile ? 556.5 : 554.5)
            + (typography.raceYOffset ?? 0)
          }
        >
          <Text
            ref={raceTextRef}
            text={overlayRaceText}
            wrap='none'
            fontSize={typography.raceFontSize}
            fontFamily={typography.raceFont}
            letterSpacing={typography.raceLetterSpacing ?? 0}

            lineJoin="round"
            stroke="black"
            strokeWidth={1.5}
            scaleX={raceScaleX}
            offsetX={(raceTextWidth / 2)}
            x={((hasClan && !customNationEnabled) ? 50 : 100) / 2}
            align="center"
            perfectDrawEnabled={false}
            listening={false}
          />

          <Text
            text={overlayRaceText}
            wrap='none'
            fontSize={typography.raceFontSize}
            fontFamily={typography.raceFont}
            letterSpacing={typography.raceLetterSpacing ?? 0}

            fill="white"
            scaleX={raceScaleX}
            offsetX={(raceTextWidth / 2)}
            x={((hasClan && !customNationEnabled) ? 50 : 100) / 2}
            align="center"
            perfectDrawEnabled={false}
            listening={false}
          />
        </Group>

        {/* Grade */}
        <Group visible={!isMarker && !isEnergy && !isCrest}>
          <Text
            text={overlayGrade}
            x={-20} y={13}
            width={100}
            wrap='none'
            fontSize={30}
            fontFamily="Anton"
            stroke="black"
            strokeWidth={3}
            align="center"
            perfectDrawEnabled={false}
            listening={false}
          />
          <Text
            text={overlayGrade}
            x={-20} y={14}
            width={100}
            wrap='none'
            fontSize={28}
            fontFamily="Anton"
            fill={getGradeNumberFill(gradeNumberStyle, overlayNation, customNationEnabled)}
            align="center"
            perfectDrawEnabled={false}
            listening={false}
          />
        </Group>

        {/* Power */}
        <Group visible={Boolean(isUnit)}>
          <Text
            text={isGUnit ? `${overlayPower}+` : overlayPower}
            x={71} y={539}
            width={100}
            skewX={-13 * (Math.PI / 180)}
            wrap='none'
            fontSize={24}
            fontFamily="Anton"
            stroke="black"
            strokeWidth={3}
            align="center"
            perfectDrawEnabled={false}
            listening={false}
          />
          <Text
            text={isGUnit ? `${overlayPower}+` : overlayPower}
            x={71} y={539}
            width={100}
            skewX={-13 * (Math.PI / 180)}
            wrap='none'
            fontSize={24}
            fontFamily="Anton"
            fill="#cfc44c"
            align="center"
            perfectDrawEnabled={false}
            listening={false}
          />
        </Group>

        {/* Shield Value */}
        <Group visible={Boolean(shieldCheck && !isGUnit && isUnit)}>
          <Text
            text={overlayShieldValue}
            x={34} y={184}
            width={100}
            rotation={90}
            wrap='none'
            fontSize={18}
            fontFamily="Anton"
            stroke="black"
            strokeWidth={3}
            align="center"
            perfectDrawEnabled={false}
            listening={false}
          />
          <Text
            text={overlayShieldValue}
            x={34} y={184}
            width={100}
            rotation={90}
            wrap='none'
            fontSize={18}
            fontFamily="Anton"
            fill="#e5d1a2"
            align="center"
            perfectDrawEnabled={false}
            listening={false}
          />
        </Group>

        {/* Illustrator */}
        <Text
          text={isCrest ? `FANMADE CARD //NOT OFFICIAL  ${overlayIllust ? `illust/ ${overlayIllust}` : ""}` : overlayIllust ? `illust/ ${overlayIllust}` : null}
          x={isCrest ? 24 : 258}
          y={isCrest ? 383 : 568}
          width={isCrest ? 220 : 130}
          wrap='none'
          fontSize={7}
          fontFamily="Bodrum"
          fill={isTriggerUnit ? "black" : "white"}
          align={isCrest ? "left" : "right"}
          perfectDrawEnabled={false}
          listening={false}
        />
        {/* Flavor */}
        <Group
  visible={Boolean(overlayFlavor && !isFullArt && !isMarker && !isCrest)}  y={isUnit ? 0 : 21.5}>
          <Group y={getFlavorY()}>
            <KonvaImage
              image={flavorLine > 1 ? flavorBG2 : flavorBG}
              x={200}
              height={flavorBoxHeight}
              width={flavorCenterWidth}
              offsetX={flavorCenterWidth / 2}
              perfectDrawEnabled={false}
              listening={false}
            />

            <KonvaImage
              image={flavorLine > 1 ? flavorL2 : flavorL}
              x={200 - (flavorDisplayWidth / 2) - 31}
              width={30}
              height={flavorBoxHeight}
              perfectDrawEnabled={false}
              listening={false}
            />

            <KonvaImage
              image={flavorLine > 1 ? flavorR2 : flavorR}
              x={200 + (flavorDisplayWidth / 2) + 1}
              width={30}
              height={flavorBoxHeight}
              perfectDrawEnabled={false}
              listening={false}
            />
          </Group>

          <Group
            x={200}
            y={
              getFlavorY() + flavorPaddingY
            }
          >
            <Text
              ref={flavorTextRef}
              text={processedFlavor}
              fontSize={typography.flavorFontSize}
              fontFamily={typography.flavorFont}
              scaleX={typography.flavorScaleX ?? 1}
              letterSpacing={typography.flavorLetterSpacing ?? 0}   // 플레이버 텍스트 자간 추가
              lineHeight={
                            (typography.flavorLineHeight ?? 1)
                          }
              stroke={isDarkMode ? "white" : "black"}
              strokeWidth={typography.flavorStrokeWidth ?? 1}       // 플레이버 텍스트 테두리 두께 (한국어판에서 조정)
              lineJoin='round'
              offsetX={textWidth / 2}
              perfectDrawEnabled={false}
              listening={false}
              align='center'
            />

            <Text
              text={processedFlavor}
              fontSize={typography.flavorFontSize}
              fontFamily={typography.flavorFont}
              scaleX={typography.flavorScaleX ?? 1}
              letterSpacing={typography.flavorLetterSpacing ?? 0}   // 플레이버 텍스트 자간 추가
              lineHeight={
                            (typography.flavorLineHeight ?? 1)
                          }
              fill={isDarkMode ? "black" : "white"}
              offsetX={textWidth / 2}
              perfectDrawEnabled={false}
              listening={false}
              align='center'
            />
          </Group>
        </Group>

        {/* Independent ability windows, in the same order as their UI inputs. */}
        {abilityLayout.items.map((item) => (
          <AbilityWindow
            key={item.block.id}
            item={item}
            baseWidth={BASE_WIDTH}
            baseHeight={BASE_HEIGHT}
            totalAbilitiesLines={totalAbilitiesLines}
            isCrest={isCrest}
            isDarkMode={isDarkMode}
            isFullArt={isFullArt}
            isMobile={isMobile}
            isExporting={isExporting}
            ICON_CONFIG={ICON_CONFIG}
            font={font}
            lightFont={lightFont}
            fontSize={fontSize}
            lineHeight={lineHeight}
            bodyLetterSpacing={bodyLetterSpacing}
            bodyWordSpacing={bodyWordSpacing}
            bodyYOffset={bodyYOffset}
            bodyLightYOffset={bodyLightYOffset}
            onMeasure={recordAbilityMeasurement}
          />
        ))}

        {/* DIcon */}
        <KonvaImage visible={Boolean(DIcon)} image={DIcon} width={BASE_WIDTH} height={BASE_HEIGHT} listening={false} />

        {/* Fanmade Label */}
        <Text
          visible={!isCrest}
          text={"FANMADE CARD //NOT OFFICIAL"}
          x={22} y={568}
          width={130}
          wrap='none'
          fontSize={7}
          fontFamily="Bodrum"
          fill={isTriggerUnit ? "black" : "white"}
          align="left"
          perfectDrawEnabled={false}
          listening={false}
        />
      </Layer>
    </Stage>
  );
}

// The background and body of each window share the same measured row count.
const AbilityWindow = ({
  item, baseWidth, baseHeight, totalAbilitiesLines, isCrest, isDarkMode,
  isFullArt, isMobile, isExporting, ICON_CONFIG, font, lightFont, fontSize,
  lineHeight, bodyLetterSpacing, bodyWordSpacing, bodyYOffset,
  bodyLightYOffset, onMeasure,
}) => {
  const { block, lineCount } = item;
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [backgroundBounds, setBackgroundBounds] = useState(null);
  const measure = useCallback((metrics) => {
    onMeasure(block.id, block.text, {
      ...metrics,
      hideExplanations: block.hideExplanations === true,
      backgroundReady: isFullArt || metrics.lineCount === 0 || backgroundReady,
      backgroundBounds,
    });
  }, [block.id, block.text, block.hideExplanations, onMeasure, isFullArt, backgroundReady, backgroundBounds]);
  const color = getAbilityBackgroundColor(block);
  return (
    <Group name="ability-window" id={block.id}>
      <OverlayFrame
        visible={!isFullArt}
        exportScale={isExporting}
        url={getAssetPath(getBoxPath(lineCount, totalAbilitiesLines, isCrest), "", true)}
        tint={!color && isDarkMode ? DEFAULT_DARK_ABILITY_TINT : null}
        solidTint={color}
        keepImageWhileLoading={true}
        onImageReadyChange={setBackgroundReady}
        onImageBoundsChange={setBackgroundBounds}
        y={item.backgroundY}
        width={baseWidth}
        height={baseHeight}
      />
      <AbilitiesBox
        text={block.text}
        lineHeight={lineHeight}
        fontSize={fontSize}
        font={font}
        lightFont={lightFont}
        bodyScaleX={typography.bodyScaleX ?? 1}
        bodyScaleY={typography.bodyScaleY ?? 0.9}
        letterSpacing={bodyLetterSpacing}
        bodyWordSpacing={bodyWordSpacing}
        bodyYOffset={
          bodyYOffset
          + (isCrest ? (typography.crestBodyYOffset ?? 0) : 0)
        }
        bodyLightYOffset={bodyLightYOffset}
        bodyJustify={typography.bodyJustify ?? false}
        maxLines={totalAbilitiesLines}
        MAX_WIDTH={isCrest ? 271 : 370}
        ICON_CONFIG={ICON_CONFIG}
        x={isCrest ? 24 : 15}
        y={item.textY}
        isCrest={isCrest}
        onLayoutChange={measure}
        dark={isDarkMode}
        fullArt={isFullArt}
        useSpTextStyle={block.useSpTextStyle ?? false}
        hideExplanations={block.hideExplanations ?? false}
        isMobile={isMobile}
      />
    </Group>
  );
};

const OverlayFrame = ({
  url,
  width,
  height,
  filters = EMPTY_OVERLAY_FILTERS,
  tint = null,
  solidTint = null,
  y = 0,
  exportScale = 0,
  visible = true,
  keepImageWhileLoading = false,
  onImageReadyChange = null,
  onImageBoundsChange = null,
}) => {
  const [loadedImg, imageStatus] = useImage(url, 'anonymous');
  const lastLoadedRef = useRef(null);
  const previous = lastLoadedRef.current;
  // Only ability backgrounds opt in. Never retain across a canvas orientation
  // change, an empty URL or a failed load. Other overlays keep their old rules.
  const canRetain = keepImageWhileLoading && url && imageStatus === 'loading' &&
    previous?.width === width && previous?.height === height;
  const img = loadedImg || (canRetain ? previous.image : null);

  useLayoutEffect(() => {
    if (loadedImg) {
      lastLoadedRef.current = { image: loadedImg, width, height };
    } else if (!url || imageStatus === 'failed') {
      lastLoadedRef.current = null;
    }
    onImageReadyChange?.(Boolean(url && loadedImg && imageStatus === 'loaded'));
  }, [loadedImg, imageStatus, url, width, height, onImageReadyChange]);

  // Only ability backgrounds request this measurement. The helper caches by
  // decoded image and dimensions; keystrokes and colour changes do not rescan.
  useLayoutEffect(() => {
    if (onImageBoundsChange) {
      onImageBoundsChange(measureAbilityImageBounds(img, width, height));
    }
  }, [img, width, height, onImageBoundsChange]);

  const imageRef = React.useRef(null);
  const solidFilter = useMemo(() => solidTint
    ? [(imageData) => tintAbilityImageData(imageData, solidTint)]
    : null, [solidTint]);

  // Commit the tint cache with the new image before it can be painted unfiltered.
  useLayoutEffect(() => {
    if (!img || !imageRef.current) return;

    const node = imageRef.current;
    node.clearCache();

    if (filters.length > 0 || tint || solidFilter || exportScale > 0) {
      node.cache({
        x: 0,
        y: 0,
        width: width,
        height: height,
        pixelRatio: exportScale || 1
      });

      const canvas = node._cache?.canvas;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
        }
      }
    }
  }, [img, filters, tint, solidFilter, exportScale, width, height]);

  if (!img || !url) return null;

  return (
    <KonvaImage
      ref={imageRef}
      image={img}
      width={width}
      height={height}
      filters={solidFilter ?? (tint ? RGB_OVERLAY_FILTERS : filters)}
      red={tint?.r}
      green={tint?.g}
      blue={tint?.b}
      y={y}
      visible={visible}
      perfectDrawEnabled={false}
      listening={false}
    />
  );
};

const EditableImage = ({
  url,
  config,
  draggable = true,
  onDragEnd
}) => {
  const [img] = useImage(url);

  if (!img) return null;

  return (
    <KonvaImage
      image={img}
      x={config.x}
      y={config.y}
      scaleX={config.scale}
      scaleY={config.scale}
      draggable={draggable}
      perfectDrawEnabled={false}
      preventDefault={false}
      listening={true}
      onDragEnd={(e) =>
        onDragEnd?.({
          x: e.target.x(),
          y: e.target.y(),
        })
      }
    />
  );
};

const GradientOverlayFrame = ({
  url,
  width,
  height,
  colors = [],
  y = 0,
  visible = true,
  mirror = true,
  orientation = "vertical",
  exportScale = 0,
}) => {
  const [img] = useImage(url, "anonymous");
  const [maskedCanvas, setMaskedCanvas] = React.useState(null);

  useEffect(() => {
    if (!img || !visible) {
      setMaskedCanvas(null);
      return;
    }

    const safeWidth = Number(width) || 400;
    const safeHeight = Number(height) || 584;
    const scale = exportScale || 1;

    let minX = safeWidth, maxX = 0, minY = safeHeight, maxY = 0;
    let foundShape = false;

    try {
      const scanCanvas = document.createElement("canvas");
      scanCanvas.width = safeWidth;
      scanCanvas.height = safeHeight;
      const sctx = scanCanvas.getContext("2d");
      sctx.drawImage(img, 0, 0, safeWidth, safeHeight);

      const imgData = sctx.getImageData(0, 0, safeWidth, safeHeight);
      const pixels = imgData.data;

      for (let row = 0; row < safeHeight; row++) {
        for (let col = 0; col < safeWidth; col++) {
          const idx = (row * safeWidth + col) * 4;
          if (pixels[idx + 3] > 10) {
            if (col < minX) minX = col;
            if (col > maxX) maxX = col;
            if (row < minY) minY = row;
            if (row > maxY) maxY = row;
            foundShape = true;
          }
        }
      }
    } catch (e) {
      console.warn("Mask boundary scan skipped, falling back to full container size.");
    }

    if (!foundShape) {
      minX = 0; maxX = safeWidth; minY = 0; maxY = safeHeight;
    }

    const canvas = document.createElement("canvas");
    canvas.width = safeWidth * scale;
    canvas.height = safeHeight * scale;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(scale, scale);

    if (colors.length > 1) {
      let x0, y0, x1, y1;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      if (orientation === "horizon") {
        x0 = cx;
        y0 = minY;
        x1 = cx;
        y1 = maxY;
      } else {
        x0 = minX;
        y0 = cy;
        x1 = maxX;
        y1 = cy;
      }

      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      const baseColors = orientation === "horizon" ? [...colors].reverse() : [...colors];

      if (mirror) {
        const mirroredColors = [...baseColors.slice().reverse(), ...baseColors.slice(1)];
        mirroredColors.forEach((color, index) => {
          gradient.addColorStop(index / (mirroredColors.length - 1), color || "transparent");
        });
      } else {
        baseColors.forEach((color, index) => {
          gradient.addColorStop(index / (baseColors.length - 1), color || "transparent");
        });
      }
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = colors[0] || "transparent";
    }

    ctx.fillRect(0, 0, safeWidth, safeHeight);

    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, safeWidth, safeHeight);
    ctx.globalCompositeOperation = "source-over";

    ctx.restore();

    setMaskedCanvas(canvas);
  }, [img, width, height, visible, mirror, orientation, exportScale, JSON.stringify(colors)]);

  if (!visible || !maskedCanvas) return null;

  return (
    <KonvaImage
      image={maskedCanvas}
      x={0}
      y={y}
      width={width}
      height={height}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
};
export default React.memo(CardEditor);
