import React, { useRef, useState } from 'react';
import { IconItem } from '../types';
import { Upload, Trash2, Scissors, FileImage, AlertTriangle, FileBox, Loader2, Sparkles } from 'lucide-react';
import { parseFileForIcons } from '../utils/fileParsers';
import { animateExistingIcon } from '../services/geminiService';

interface LibraryProps {
  icons: IconItem[];
  setIcons: React.Dispatch<React.SetStateAction<IconItem[]>>;
  onDragStart: (e: React.DragEvent, iconId: string) => void;
  onOpenSlicer: (imageUrl: string) => void;
}

const Library: React.FC<LibraryProps> = ({ icons, setIcons, onDragStart, onOpenSlicer }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingAiId, setLoadingAiId] = useState<string | null>(null);
  const [lastImportStatus, setLastImportStatus] = useState<{count: number, file: string} | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    setLastImportStatus(null);
    const newIcons: IconItem[] = [];
    let processedCount = 0;

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (['icl', 'dll', 'exe', 'bin', 'src'].includes(ext || '')) {
         try {
            const extracted = await parseFileForIcons(file);
            extracted.forEach((img, idx) => {
                newIcons.push({
                    id: crypto.randomUUID(),
                    name: `${file.name} #${idx + 1}`,
                    url: img.url,
                    format: img.format
                });
            });
            processedCount += extracted.length;
            if (extracted.length === 0) {
                 setLastImportStatus({ count: 0, file: file.name });
            }
         } catch (e) {
             console.error(`Failed to parse ${file.name}`, e);
         }
      } else {
        const url = URL.createObjectURL(file);
        newIcons.push({
          id: crypto.randomUUID(),
          name: file.name,
          url,
          format: file.type.split('/')[1] || 'img'
        });
        processedCount++;
      }
    }

    if (processedCount > 0) {
         setIcons(prev => [...prev, ...newIcons]);
         setLastImportStatus({ count: processedCount, file: 'Files' });
    }
    setIsProcessing(false);
  };

  const deleteIcon = (id: string) => {
    setIcons(prev => prev.filter(icon => icon.id !== id));
  };

  const handleAiAnimate = async (icon: IconItem) => {
    setLoadingAiId(icon.id);
    try {
        // Convert blob URL to Base64
        const response = await fetch(icon.url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                const newUrl = await animateExistingIcon(base64);
                // Open slicer with result
                onOpenSlicer(newUrl);
            } catch (err) {
                console.error(err);
                alert("Failed to generate AI animation.");
            } finally {
                setLoadingAiId(null);
            }
        };
        reader.readAsDataURL(blob);
    } catch (e) {
        console.error(e);
        setLoadingAiId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900 border-r border-neutral-800">
      <div className="p-4 border-b border-neutral-800 flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <FileBox className="w-4 h-4" />
                Library
            </h2>
            <span className="text-xs bg-neutral-800 text-neutral-500 px-2 py-1 rounded-full border border-neutral-800">{icons.length} Items</span>
        </div>
        
        <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-neutral-700 rounded-lg text-neutral-400 hover:text-white hover:border-purple-500 hover:bg-neutral-800/50 transition-all group disabled:opacity-50 disabled:cursor-wait"
        >
            {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
            ) : (
                <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            )}
            <span className="text-sm font-medium">{isProcessing ? 'Extracting...' : 'Import .ICL / .DLL / Files'}</span>
        </button>
        
        {lastImportStatus && lastImportStatus.count === 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-2 rounded text-xs flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                No icons found in {lastImportStatus.file}
            </div>
        )}

        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            onChange={handleFileUpload}
            accept=".png,.jpg,.jpeg,.svg,.ico,.icl,.dll,.exe,.src"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {icons.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-3">
                <div className="w-16 h-16 rounded-2xl bg-neutral-800/50 flex items-center justify-center border border-neutral-800">
                    <FileImage className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-sm font-medium">No icons loaded</p>
                <p className="text-xs text-neutral-600 text-center max-w-[200px]">
                    Drag & drop files or use the import button to extract from libraries.
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {icons.map(icon => (
                <div 
                    key={icon.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, icon.id)}
                    className="group relative aspect-square bg-neutral-800/50 rounded-lg border border-neutral-700/50 hover:border-purple-500/50 hover:bg-neutral-800 transition-all cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center"
                >
                    {/* Checkerboard background for transparency */}
                    <div className="absolute inset-0 opacity-20" 
                        style={{backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)', backgroundSize: '10px 10px', backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px'}} 
                    />
                    
                    <img 
                        src={icon.url} 
                        alt={icon.name}
                        className="relative z-10 max-w-[70%] max-h-[70%] object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-300"
                    />
                    
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex justify-between items-end">
                         <div className="flex gap-1">
                             <button 
                                onClick={() => handleAiAnimate(icon)}
                                title="AI Auto Animate"
                                className="p-1 hover:bg-purple-500 text-purple-400 hover:text-white rounded transition-colors"
                             >
                                {loadingAiId === icon.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                             </button>
                             <button 
                                onClick={() => onOpenSlicer(icon.url)}
                                title="Slice Sprite Sheet"
                                className="p-1 hover:bg-blue-500 text-blue-400 hover:text-white rounded transition-colors"
                             >
                                <Scissors className="w-3 h-3" />
                             </button>
                         </div>
                         <button 
                            onClick={() => deleteIcon(icon.id)}
                            className="p-1 hover:bg-red-500 text-neutral-500 hover:text-white rounded transition-colors"
                         >
                            <Trash2 className="w-3 h-3" />
                         </button>
                    </div>
                    
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[9px] text-neutral-400 font-mono border border-white/5 z-20">
                        {icon.format.toUpperCase()}
                    </div>
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default Library;
