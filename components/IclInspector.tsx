import React, { useState, useEffect } from 'react';
import { GithubFile, fetchRawFile, ICL_INDEX_MAP } from '../services/githubService';
import { parseFileForIcons } from '../utils/fileParsers';
import { NekoSkin } from '../types';
import { Loader2, Play, RefreshCcw, Save, X, ArrowRight, GripHorizontal } from 'lucide-react';

interface IclInspectorProps {
    file: GithubFile;
    onClose: () => void;
    onPlay: (skin: NekoSkin) => void;
}

interface ParsedIcon {
    url: string;
    originalIndex: number;
}

const GROUPS = [
    {
        title: "Movement (Run)",
        pairs: [
            { label: "North", k1: "nrun1", k2: "nrun2" },
            { label: "North East", k1: "nerun1", k2: "nerun2" },
            { label: "East", k1: "erun1", k2: "erun2" },
            { label: "South East", k1: "serun1", k2: "serun2" },
            { label: "South", k1: "srun1", k2: "srun2" },
            { label: "South West", k1: "swrun1", k2: "swrun2" },
            { label: "West", k1: "wrun1", k2: "wrun2" },
            { label: "North West", k1: "nwrun1", k2: "nwrun2" },
        ]
    },
    {
        title: "Wall Scratching",
        pairs: [
            { label: "North Wall", k1: "nscratch1", k2: "nscratch2" },
            { label: "East Wall", k1: "escratch1", k2: "escratch2" },
            { label: "South Wall", k1: "sscratch1", k2: "sscratch2" },
            { label: "West Wall", k1: "wscratch1", k2: "wscratch2" },
        ]
    },
    {
        title: "Idle Actions",
        pairs: [
            { label: "Sleep", k1: "sleep1", k2: "sleep2" },
            { label: "Itch", k1: "itch1", k2: "itch2" },
            { label: "Wash", k1: "wash", k2: "wash" }, // Wash often maps to same or wash/wash2 if avail
        ]
    },
    {
        title: "States",
        singles: [
            { label: "Still", k: "still" },
            { label: "Alert", k: "alert" },
            { label: "Yawn", k: "yawn" },
        ]
    }
];

const IclInspector: React.FC<IclInspectorProps> = ({ file, onClose, onPlay }) => {
    const [icons, setIcons] = useState<ParsedIcon[]>([]);
    const [mapping, setMapping] = useState<Record<string, number>>({ ...ICL_INDEX_MAP });
    const [loading, setLoading] = useState(true);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const blob = await fetchRawFile(`1997-icon-libraries/${file.name}`);
                const f = new File([blob], file.name);
                const rawIcons = await parseFileForIcons(f);
                setIcons(rawIcons.map((ri, idx) => ({ url: ri.url, originalIndex: idx })));
            } catch (e) {
                console.error(e);
                alert("Failed to load ICL for inspection");
                onClose();
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [file]);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        // e.dataTransfer.setData("text/plain", index.toString());
        e.dataTransfer.effectAllowed = "copy";
    };

    const handleDrop = (e: React.DragEvent, key: string) => {
        e.preventDefault();
        if (draggedIndex !== null) {
            setMapping(prev => ({ ...prev, [key]: draggedIndex }));
            setDraggedIndex(null);
        }
    };

    const handleTest = () => {
        const spriteMap: Record<string, string> = {};
        const get = (idx: number) => icons[idx]?.url || icons[0]?.url;

        for (const [key, idx] of Object.entries(mapping)) {
            spriteMap[key] = get(idx as number);
        }

        const skin: NekoSkin = {
            id: `custom-${file.name}`,
            name: `${file.name} (Custom)`,
            sprites: spriteMap
        };
        onPlay(skin);
    };

    const resetMapping = () => setMapping({ ...ICL_INDEX_MAP });

    if (loading) {
        return (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-50 bg-[#121212] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center font-bold text-sm">
                        ICL
                    </div>
                    <div>
                        <h2 className="font-bold text-white">{file.name}</h2>
                        <p className="text-[10px] text-neutral-400">Drag frames to action slots to remap</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={resetMapping} className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium flex items-center gap-2">
                        <RefreshCcw className="w-3 h-3" /> Reset
                    </button>
                    <button onClick={onClose} className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium">
                        Close
                    </button>
                    <button onClick={handleTest} className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-900/20">
                        <Play className="w-3 h-3 fill-current" /> TEST NEKO
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">

                {/* Source Palette (Left) */}
                <div className="w-72 bg-neutral-900 border-r border-neutral-800 flex flex-col">
                    <div className="p-3 border-b border-neutral-800 bg-neutral-800/50">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Source Frames ({icons.length})</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                        <div className="grid grid-cols-4 gap-2">
                            {icons.map((icon, idx) => (
                                <div
                                    key={idx}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, idx)}
                                    className="aspect-square bg-neutral-800 rounded border border-neutral-700 hover:border-purple-500 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center relative group"
                                >
                                    <img src={icon.url} className="w-6 h-6 image-pixelated" alt="" />
                                    <span className="absolute top-0.5 right-0.5 text-[8px] text-neutral-500 font-mono bg-black/50 px-1 rounded">{idx}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mapping Grid (Right) */}
                <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-8 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-8 pb-20">

                        {GROUPS.map((group) => (
                            <div key={group.title} className="bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden">
                                <div className="px-4 py-2 bg-neutral-800 border-b border-neutral-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    <h3 className="text-sm font-bold text-white">{group.title}</h3>
                                </div>

                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                    {/* Pairs */}
                                    {group.pairs && group.pairs.map((pair) => {
                                        const idx1 = mapping[pair.k1] ?? 0;
                                        const idx2 = mapping[pair.k2] ?? 0;
                                        return (
                                            <div key={pair.label} className="flex items-center gap-4 p-3 bg-neutral-900 rounded-lg border border-neutral-800/50">
                                                <span className="w-24 text-xs font-medium text-neutral-400 text-right">{pair.label}</span>

                                                {/* Slot 1 */}
                                                <Slot
                                                    label="1"
                                                    iconUrl={icons[idx1]?.url}
                                                    idx={idx1}
                                                    onDrop={(e) => handleDrop(e, pair.k1)}
                                                />

                                                {/* Arrow */}
                                                <ArrowRight className="w-3 h-3 text-neutral-700" />

                                                {/* Slot 2 */}
                                                <Slot
                                                    label="2"
                                                    iconUrl={icons[idx2]?.url}
                                                    idx={idx2}
                                                    onDrop={(e) => handleDrop(e, pair.k2)}
                                                />
                                            </div>
                                        );
                                    })}

                                    {/* Singles */}
                                    {group.singles && group.singles.map((single) => {
                                        const idx = mapping[single.k] ?? 0;
                                        return (
                                            <div key={single.label} className="flex items-center gap-4 p-3 bg-neutral-900 rounded-lg border border-neutral-800/50">
                                                <span className="w-24 text-xs font-medium text-neutral-400 text-right">{single.label}</span>
                                                <Slot
                                                    label="Icon"
                                                    iconUrl={icons[idx]?.url}
                                                    idx={idx}
                                                    onDrop={(e) => handleDrop(e, single.k)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Subcomponent for a Drop Slot
const Slot: React.FC<{ label: string, iconUrl?: string, idx: number, onDrop: (e: React.DragEvent) => void }> = ({ label, iconUrl, idx, onDrop }) => {
    return (
        <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex-1 h-16 bg-neutral-950 rounded border-2 border-dashed border-neutral-800 hover:border-purple-500/50 hover:bg-neutral-900 transition-colors flex flex-col items-center justify-center relative group cursor-pointer"
        >
            <span className="absolute top-1 left-2 text-[8px] text-neutral-600 font-mono uppercase">{label}</span>
            {iconUrl ? (
                <>
                    <img src={iconUrl} className="w-8 h-8 image-pixelated" alt="" />
                    <span className="absolute bottom-1 right-2 text-[9px] text-purple-400 font-mono font-bold">#{idx}</span>
                </>
            ) : (
                <span className="text-[10px] text-neutral-700">Empty</span>
            )}
        </div>
    );
};

export default IclInspector;
