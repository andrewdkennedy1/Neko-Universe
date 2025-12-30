import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Grid as GridIcon, Columns, Rows } from 'lucide-react';

interface SpriteSlicerProps {
  imageUrl: string;
  onClose: () => void;
  onSlice: (blobs: Blob[]) => void;
}

const SpriteSlicer: React.FC<SpriteSlicerProps> = ({ imageUrl, onClose, onSlice }) => {
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(new Image());

  useEffect(() => {
    imgRef.current.src = imageUrl;
    imgRef.current.onload = () => {
        draw();
        // Heuristic auto-detection: if square, maybe 1x1, if wide, maybe strip
        if (imgRef.current.width > imgRef.current.height * 2) {
             setCols(Math.round(imgRef.current.width / imgRef.current.height));
        }
    };
  }, [imageUrl]);

  useEffect(() => {
    draw();
  }, [rows, cols]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = imgRef.current;

    // Canvas size setup
    // Fit to container logic can be handled by CSS, we keep canvas resolution native to image for slicing accuracy
    // But for display we might need scaling. Let's draw native size but use CSS to fit.
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Draw Grid
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    ctx.strokeStyle = '#a855f7'; // Purple 500
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Vertical lines
    for (let i = 1; i < cols; i++) {
        ctx.moveTo(i * cellW, 0);
        ctx.lineTo(i * cellW, canvas.height);
    }
    // Horizontal lines
    for (let i = 1; i < rows; i++) {
        ctx.moveTo(0, i * cellH);
        ctx.lineTo(canvas.width, i * cellH);
    }
    ctx.stroke();
  };

  const handleSlice = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    if (!ctx) return;

    const cellW = img.width / cols;
    const cellH = img.height / rows;
    canvas.width = cellW;
    canvas.height = cellH;

    const blobs: Blob[] = [];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            ctx.clearRect(0, 0, cellW, cellH);
            ctx.drawImage(img, x * cellW, y * cellH, cellW, cellH, 0, 0, cellW, cellH);
            
            await new Promise<void>(resolve => {
                canvas.toBlob(blob => {
                    if (blob) blobs.push(blob);
                    resolve();
                }, 'image/png');
            });
        }
    }
    onSlice(blobs);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-4xl p-4 shadow-2xl flex flex-col h-[90vh]">
         {/* Header */}
         <div className="flex justify-between items-center mb-4 pb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2">
                <GridIcon className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-bold text-white">Slice Sprite Sheet</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>
         </div>

         {/* Content */}
         <div className="flex-1 flex overflow-hidden gap-6">
            {/* Preview */}
            <div className="flex-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzMzMiIGZpbGwtb3BhY2l0eT0iMC4yIi8+PC9zdmc+')] bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-center overflow-auto p-4 relative group">
                <canvas 
                    ref={canvasRef} 
                    className="max-w-full max-h-full object-contain shadow-lg"
                />
            </div>

            {/* Sidebar */}
            <div className="w-64 flex flex-col gap-6">
                <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-800">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Grid Settings</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-neutral-300 flex items-center gap-2 mb-2">
                                <Columns className="w-4 h-4 text-neutral-500" /> Columns (X)
                            </label>
                            <input 
                                type="number" 
                                min="1" 
                                max="32" 
                                value={cols} 
                                onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-neutral-300 flex items-center gap-2 mb-2">
                                <Rows className="w-4 h-4 text-neutral-500" /> Rows (Y)
                            </label>
                            <input 
                                type="number" 
                                min="1" 
                                max="32" 
                                value={rows} 
                                onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:border-purple-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-auto">
                    <div className="bg-purple-900/20 text-purple-300 p-3 rounded-lg text-xs mb-4">
                        Total Frames: <span className="font-bold">{rows * cols}</span>
                    </div>
                    <button 
                        onClick={handleSlice}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-purple-500/25"
                    >
                        <Check className="w-5 h-5" />
                        Import Frames
                    </button>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SpriteSlicer;
