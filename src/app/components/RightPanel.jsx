// CFV ride-deck explanations control v1
"use client"
import React, { useState } from 'react';


import { useCardState } from '../../../utils/store/State';

import TextArea from '../../../components/TextArea';
import AbilityBlocksEditor from '../../../components/AbilityBlocksEditor';
import UploadGroup from '../../../components/custom/Icon/UploadGroup';
import RideDeckExplanationsControl from '../../../components/RideDeckExplanationsControl';

import { TextPreset } from '../../../utils/store/Text';

import {
    TextIcon,
    CloseIcon
} from '../../../components/Icon';

export default function RightPanel() {

    const { state, setField, setAbilityBlocks } = useCardState();
    const [isOpen, setIsOpen] = useState(false);

    const t = TextPreset.RightPanel;

    const isMarker = state.selectedType === 'base_ticket.png/marker';
    const isEnergy = state.selectedType === 'base_ticket.png';
    const isCrest = state.selectedType.split('.png')[0] + '.png' === 'base_crest.png'
    const isRideDeck = state.selectedType === 'base_crest.png/ride_deck'

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="md:hidden fixed bottom-6 right-4 z-40 p-3 min-h-12 min-w-12 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-transform"
                aria-label="Open Abilities & Flavor"
            >
                <TextIcon size={24} />
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-41 md:hidden transition-opacity"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside className={`fixed inset-y-0 right-0 z-50 w-[85%] max-w-sm md:w-[320px] bg-(--panel-bg) border-l border-(--panel-border) flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shadow-2xl md:shadow-none ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                <div className="flex items-center justify-between p-4 border-b border-(--panel-border) md:hidden shrink-0">
                    <span className="font-semibold text-lg text-(--text-primary)">Abilities & Flavor</span>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 min-h-11 min-w-11 text-(--text-secondary) hover:bg-(--bg-secondary) rounded-md flex items-center justify-center active:bg-(--border-color)"
                        aria-label="Close panel"
                    >
                        <CloseIcon size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-24 md:pb-5 transition-colors duration-300">
                    <div className={`${(isEnergy || isRideDeck) ? "hidden" : "mb-4"}`}>
                        <h2 className="hidden md:block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Abilities & Flavor</h2>
                        <div className="flex flex-col gap-2">
                            <div className={`${(isMarker || isEnergy || isCrest) ? "hidden" : "flex-1"}`}>
                                <label className="block text-sm font-medium text-(--text-secondary) mb-1">{t.Flavor}</label>
                                <TextArea
                                    disabled={state.isFullArt}
                                    value={state.flavor}
                                    onChange={(e) => setField('flavor', e)}
                                    placeholder={!state.isFullArt ? "Type Here..." : "Flavor Disabled"}
                                    maxRows={5}
                                />
                            </div>
                            <div className="flex items-center gap-2 py-1">
                                <label className="text-xs font-medium text-(--text-secondary) shrink-0">
                                    Ability Spacing
                                </label>

                                <input
                                    type="range"
                                    min="-1"
                                    max="1"
                                    step="0.05"
                                    value={state.abilitySpacingAdjust ?? 0}
                                    onChange={(e) =>
                                        setField(
                                            'abilitySpacingAdjust',
                                            Number(e.target.value)
                                        )
                                    }
                                    className="flex-1 min-w-0"
                                />

                                <input
                                    type="number"
                                    min="-1"
                                    max="1"
                                    step="0.05"
                                    value={state.abilitySpacingAdjust ?? 0}
                                    onChange={(e) =>
                                        setField(
                                            'abilitySpacingAdjust',
                                            Number(e.target.value)
                                        )
                                    }
                                    className="w-16 px-1.5 py-1 text-xs text-center rounded border border-(--border-color) bg-(--input-bg)"
                                />

                                <button
                                    type="button"
                                    onClick={() => setField('abilitySpacingAdjust', 0)}
                                    className="px-1.5 py-1 text-[10px] rounded border border-(--border-color) text-(--text-secondary) hover:text-(--text-primary)"
                                >
                                    Reset
                                </button>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-(--text-secondary) mb-1">{t.Abilities}</label>
                                <AbilityBlocksEditor
                                    blocks={state.abilityBlocks}
                                    onChange={setAbilityBlocks}
                                    fullArt={state.isFullArt}
                                    layoutStatus={state.abilityLayoutStatus}
                                />
                            </div>
                        </div>
                    </div>
                    {isRideDeck && (
                        <RideDeckExplanationsControl
                            checked={state.rideDeckHideExplanations ?? false}
                            onChange={(value) => setField('rideDeckHideExplanations', value)}
                        />
                    )}
                    {/* Keep the registry loader mounted; hide only its manager UI. */}
                    <div hidden={isEnergy || isRideDeck}>
                        <UploadGroup />
                    </div>
                </div>
            </aside>
        </>
    )
}