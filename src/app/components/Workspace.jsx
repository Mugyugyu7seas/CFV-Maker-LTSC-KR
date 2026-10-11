// CFV ride-deck explanations control v1
"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { useCardState } from '../../../utils/store/State';

import { TextPreset } from '../../../utils/store/Text';
import { createRideDeckAbilityBlocks } from '../../../utils/RideDeckAbilities';
import CardEditor from '../../../components/editor/CardEditor';
import { previewZip } from '../../../utils/CardIO';

export default function Workspace() {

    const { state, setField, setMultiple, setImageConfig } = useCardState();

    const reportAbilityLayout = useCallback((status) => {
        setField('abilityLayoutStatus', status);
    }, [setField]);

    const finishExport = useCallback(() => setField('exportTrigger', 0), [setField]);

    const t = TextPreset.Extra;

    const isEnergy = state.selectedType === 'base_ticket.png';
    const isCrest = state.selectedType.split('.png')[0] + '.png' === 'base_crest.png'
    const isRideDeck = state.selectedType === 'base_crest.png/ride_deck'

    // This derived block never overwrites the user's ordinary ability windows.
    const rideDeckAbilityBlocks = React.useMemo(() =>
        isRideDeck
            ? createRideDeckAbilityBlocks(t.GeneratorText, state.rideDeckHideExplanations ?? false)
            : undefined,
        [isRideDeck, t.GeneratorText, state.rideDeckHideExplanations]
    );

    const [isDragging, setIsDragging] = useState(false);
    const [isDraggingZip, setIsDraggingZip] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();

        window.addEventListener("resize", checkMobile);

        return () => {
            window.removeEventListener("resize", checkMobile);
        };
    }, []);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files[0];
        if (file) {
            if (file.name && file.name.endsWith('.zip')) {
                setIsDraggingZip(true);
                setIsDragging(false);
            } else if (file.type && file.type.startsWith('image/')) {
                if (state.isLocked) return;
                setIsDragging(true);
                setIsDraggingZip(false);
            }
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        setIsDraggingZip(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        setIsDraggingZip(false);

        const file = e.dataTransfer.files[0];
        if (!file) return;

        if (file.name.endsWith('.zip')) {
            setField('isImportingPreview', true);
            const preview = await previewZip(file);

            if (preview.success) {
                if (preview.imageUrl) {
                    setField('tempImageSrc', preview.imageUrl);
                }

                setMultiple({
                    importPreview: { file, ...preview },
                    showImportModal: true,
                });
            } else {
                window.alert(preview.error || "템플릿을 불러오지 못했습니다.");
            }
            setField('isImportingPreview', false);
        } else if (file.type.startsWith('image/')) {
            if (state.isLocked) return;
            if (state.imageSrc) URL.revokeObjectURL(state.imageSrc);
            setMultiple({
                imageSrc: URL.createObjectURL(file),
            });
        }
    };

    return (
        <main
            className="flex-1 w-full min-w-0 relative bg-(--bg-primary) overflow-auto flex items-center justify-center p-2 sm:p-6 md:p-12 transition-colors duration-300 touch-pan-x touch-pan-y custom-scrollbar"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && !state.isLocked && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/10 border-4 border-dashed border-blue-400 pointer-events-none">
                    <div className="text-center"><svg className="w-16 h-16 mx-auto text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-blue-600 font-bold text-lg">Drop Image Here</span></div>
                </div>
            )}
            {isDraggingZip && !state.isLocked && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/10 border-4 border-dashed border-green-400 pointer-events-none">
                    <div className="text-center"><svg className="w-16 h-16 mx-auto text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0 0l-2 2m2-2l2 2" /></svg><span className="text-green-600 font-bold text-lg">Drop .zip File Here</span></div>
                </div>
            )}

            <div className="relative group max-w-full flex items-center justify-center m-auto">
                <div className={`${isCrest ? "scale-[0.68]" : "scale-[0.75]"} bottom-10 sm:scale-90 md:scale-100 md:bottom-0 origin-center relative shadow-2xl bg-transparent transition-transform duration-300`}>
                    <CardEditor


                        overlayCardName={isEnergy ? t.Energy : isRideDeck ? t.Generator : state.cardName}
                        overlayNation={state.selectedNation}
                        overlayClan={state.clan}
                        overlayType={state.selectedType}
                        subOrderType={state.subOrderType}
                        isSubType={state.isSubType}
                        overlayPassive={state.selectedPassive}
                        overlayTrigger={state.selectedTrigger}
                        overlayRaceText={state.raceText}
                        raceCheck={state.raceCheck}
                        overlayGrade={state.grade}
                        gradeNumberStyle={state.gradeNumberStyle}
                        overlayPower={state.power}
                        overlayShieldValue={state.shield}
                        shieldCheck={state.shieldCheck}
                        overlayIllust={state.illust}
                        overlayFlavor={state.flavor}
                        abilityBlocks={isRideDeck ? rideDeckAbilityBlocks : state.abilityBlocks}
                        onAbilityLayoutChange={reportAbilityLayout}
                        abilitySpacingAdjust={state.abilitySpacingAdjust ?? 0}
                        overlayAbilities={isRideDeck ? t.GeneratorText : state.abilities}
                        overlayAddition={state.addition}
                        isFullArt={state.isFullArt}
                        showGlobe={state.showGlobe}
                        customLayers={state.customLayers}
                        baseColorTint={state.baseColorTint}
                        showClan={state.showClan}
                        solidColor={state.solidColor}
                        customNationEnabled={state.customNationEnabled}
                        customNationName={state.customNationName}
                        cardNameGradient={state.cardNameGradient}
                        nationGradient={state.nationGradient}

                        isMobile={isMobile}
                        isLocked={state.isLocked}
                        isDragging={isDragging}
                        imageSrc={state.imageSrc}
                        exportTrigger={state.exportTrigger}
                        exportPreset={state.exportPreset}
                        onImageConfigChange={setImageConfig}
                        initialImageConfig={state.imageConfig}
                        onExportEnd={finishExport}
                    />
                </div>
            </div>
        </main>
    )
}