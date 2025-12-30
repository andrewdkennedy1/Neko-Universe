import React, { useEffect, useState } from 'react';
import { fetch1997LibraryList, fetch2023VariantList, fetchRawFile, constructNekoSkin, mapIclIconsToSkin, GithubFile } from '../services/githubService';
import { parseFileForIcons } from '../utils/fileParsers';
import { NekoSkin } from '../types';
import { Globe, Cat, Loader2, PenTool, Github } from 'lucide-react';

interface RemoteLibraryProps {
    onPlayNeko: (skin: NekoSkin) => void;
    onInspectLegacy: (file: GithubFile) => void;
}

// Sub-component to handle individual ICL preview fetching
const LegacySkinCard: React.FC<{
    file: GithubFile,
    onClick: (f: GithubFile) => void,
    onInspect: (e: React.MouseEvent, f: GithubFile) => void,
    disabled: boolean
}> = ({ file, onClick, onInspect, disabled }) => {
    const [iconUrl, setIconUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const loadPreview = async () => {
            try {
                // Fetch and parse solely for the preview icon
                // Standard Neko usually puts "Still" at 0 or 24. 
                // Based on recent mapping updates, 0 is the safest bet for Still.
                const blob = await fetchRawFile(`1997-icon-libraries/${file.name}`);
                const f = new File([blob], file.name);
                const icons = await parseFileForIcons(f);

                if (mounted) {
                    const still = icons[0] || icons[24];
                    if (still) setIconUrl(still.url);
                }
            } catch (e) {
                // Ignore
            } finally {
                if (mounted) setLoading(false);
            }
        };
        loadPreview();
        return () => { mounted = false; };
    }, [file]);

    return (
        <button
            onClick={() => onClick(file)}
            disabled={disabled}
            className="flex flex-col items-center p-3 bg-neutral-800/40 hover:bg-neutral-800 border border-neutral-700/30 hover:border-purple-500/50 rounded-lg group transition-all relative overflow-hidden h-32 justify-center"
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative w-12 h-12 mb-2 flex items-center justify-center mt-2">
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-600" />
                ) : iconUrl ? (
                    <img
                        src={iconUrl}
                        className="max-w-full max-h-full object-contain pixelated scale-[2] group-hover:scale-[2.5] transition-transform duration-300 drop-shadow-lg"
                        alt=""
                    />
                ) : (
                    <Cat className="w-6 h-6 text-neutral-700" />
                )}
            </div>
            <span className="text-[10px] font-medium text-neutral-400 group-hover:text-white capitalize truncate max-w-full z-10 w-full text-center mb-1">
                {file.name.replace(/\.(icl|dll|exe)$/i, '')}
            </span>

            {/* Inspect Button - visible on hover */}
            <div
                onClick={(e) => onInspect(e, file)}
                className="absolute top-2 right-2 p-1.5 bg-neutral-900/80 rounded hover:bg-purple-600 text-neutral-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20 shadow-lg border border-white/10"
                title="Inspect / Remap"
            >
                <PenTool className="w-3 h-3" />
            </div>
        </button>
    );
};

const RemoteLibrary: React.FC<RemoteLibraryProps> = ({ onPlayNeko, onInspectLegacy }) => {
    const [activeTab, setActiveTab] = useState<'1997' | '2023'>('2023');
    const [legacyFiles, setLegacyFiles] = useState<GithubFile[]>([]);
    const [modernVariants, setModernVariants] = useState<GithubFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSkin, setLoadingSkin] = useState<string | null>(null);

    useEffect(() => {
        loadLists();
    }, []);

    const loadLists = async () => {
        setLoading(true);
        const [l1997, l2023] = await Promise.all([
            fetch1997LibraryList(),
            fetch2023VariantList()
        ]);
        setLegacyFiles(l1997);
        setModernVariants(l2023);
        setLoading(false);
    };

    const handleSelectLegacy = async (file: GithubFile) => {
        setLoadingSkin(file.name);
        try {
            const blob = await fetchRawFile(`1997-icon-libraries/${file.name}`);
            const f = new File([blob], file.name);
            const icons = await parseFileForIcons(f);

            const urls = icons.map(i => i.url);

            const skin: NekoSkin = {
                id: file.name,
                name: file.name.replace(/\.(icl|dll|exe)$/i, ''),
                sprites: mapIclIconsToSkin(urls)
            };

            onPlayNeko(skin);
        } catch (e) {
            console.error("Load failed", e);
            alert("Failed to load this library.");
        } finally {
            setLoadingSkin(null);
        }
    };

    const handleSelectModern = (variant: GithubFile) => {
        const skin = {
            id: variant.name,
            name: variant.name,
            sprites: constructNekoSkin(variant.name)
        };
        onPlayNeko(skin);
    };

    return (
        <div className="h-full flex flex-col bg-neutral-900 text-neutral-200">
            <div className="p-4 border-b border-neutral-800 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-purple-500" />
                        <h2 className="text-lg font-bold tracking-tight text-white">Neko Universe</h2>
                    </div>
                    <a
                        href="https://github.com/andrewdkennedy1/Neko-Universe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white transition-all"
                        title="View on GitHub"
                    >
                        <Github className="w-5 h-5" />
                    </a>
                </div>

                <div className="flex bg-neutral-800 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('2023')}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === '2023' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        2023 Collection
                    </button>
                    <button
                        onClick={() => setActiveTab('1997')}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === '1997' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        1997 Classics
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-neutral-500 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                        <span className="text-xs font-mono">Fetching Archives...</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {activeTab === '1997' && (
                            <div className="grid grid-cols-2 gap-3">
                                {legacyFiles.map(file => (
                                    <LegacySkinCard
                                        key={file.path}
                                        file={file}
                                        onClick={handleSelectLegacy}
                                        onInspect={(e, f) => {
                                            e.stopPropagation();
                                            onInspectLegacy(f);
                                        }}
                                        disabled={!!loadingSkin}
                                    />
                                ))}
                            </div>
                        )}

                        {activeTab === '2023' && (
                            <div className="grid grid-cols-2 gap-3">
                                {modernVariants.map(variant => (
                                    <button
                                        key={variant.path}
                                        onClick={() => handleSelectModern(variant)}
                                        className="flex flex-col items-center p-3 bg-neutral-800/40 hover:bg-neutral-800 border border-neutral-700/30 hover:border-purple-500/50 rounded-lg group transition-all relative overflow-hidden h-32 justify-center"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="w-12 h-12 mb-2 flex items-center justify-center">
                                            <img
                                                src={`https://raw.githubusercontent.com/eliot-akira/neko/main/2023-icon-library/${variant.name}/still.png`}
                                                onError={(e) => (e.currentTarget.src = `https://raw.githubusercontent.com/eliot-akira/neko/main/2023-icon-library/${variant.name}/alert.png`)}
                                                className="max-w-full max-h-full object-contain pixelated scale-[2] group-hover:scale-[2.5] transition-transform duration-300 drop-shadow-lg"
                                                alt=""
                                            />
                                        </div>
                                        <span className="text-[10px] font-medium text-neutral-400 group-hover:text-white capitalize truncate max-w-full z-10">{variant.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RemoteLibrary;
