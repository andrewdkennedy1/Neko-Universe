import React, { useState, useEffect, useRef } from 'react';
import { AnimationFrame, IconItem } from '../types';
import { Play, Pause, Trash, SkipForward, Clock, Download, PlusCircle, Film, Footprints } from 'lucide-react';

interface AnimatorProps {
  frames: AnimationFrame[];
  setFrames: React.Dispatch<React.SetStateAction<AnimationFrame[]>>;
  icons: IconItem[];
}

const Animator: React.FC<AnimatorProps> = ({ frames, setFrames, icons }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWalking, setIsWalking] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [fps, setFps] = useState(8); 
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Animation loop variables ref
  const walkPos = useRef(0);
  const lastTime = useRef(0);

  // Playback logic
  useEffect(() => {
    let interval: number;
    if (isPlaying && frames.length > 0) {
      interval = window.setInterval(() => {
        setCurrentFrameIndex(prev => (prev + 1) % frames.length);
      }, 1000 / fps);
    }
    return () => clearInterval(interval);
  }, [isPlaying, frames.length, fps]);

  // Main Render Loop (using RequestAnimationFrame for smooth motion)
  useEffect(() => {
    let animationFrameId: number;
    
    const render = (time: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Calculate Delta for smooth movement
        const dt = time - lastTime.current;
        lastTime.current = time;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background
        const size = 16;
        for(let y=0; y<canvas.height; y+=size) {
            for(let x=0; x<canvas.width; x+=size) {
                ctx.fillStyle = (Math.floor(x/size) + Math.floor(y/size)) % 2 === 0 ? '#262626' : '#171717';
                ctx.fillRect(x,y,size,size);
            }
        }

        if (frames.length > 0) {
          const frame = frames[currentFrameIndex];
          const icon = icons.find(i => i.id === frame.iconId);
          
          if (icon) {
            const img = new Image();
            img.src = icon.url;
            
            // Draw immediately if cached, otherwise it might flicker, 
            // but normally browser caches blob URLs well.
            // Ideally we'd preload images, but for simplicity:
            if (img.complete) {
                drawFrame(ctx, img, canvas.width, canvas.height);
            } else {
                img.onload = () => drawFrame(ctx, img, canvas.width, canvas.height);
            }
          }
        } else {
             ctx.fillStyle = '#404040';
             ctx.font = '12px Inter, sans-serif';
             ctx.textAlign = 'center';
             ctx.fillText("PREVIEW", canvas.width/2, canvas.height/2);
        }

        if (isWalking || isPlaying) {
             animationFrameId = requestAnimationFrame(render);
        }
    };
    
    // Draw logic
    const drawFrame = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number) => {
         let x = (cw - img.width) / 2;
         let y = (ch - img.height) / 2;
         
         // Scaling if too big
         const scale = Math.min(cw / img.width, ch / img.height) * 0.5; // smaller for walking room
         const w = img.width * scale;
         const h = img.height * scale;
         
         if (isWalking && isPlaying) {
             const speed = 0.1; 
             // Move across screen
             walkPos.current = (walkPos.current + (1000/60) * speed) % (cw + w);
             x = walkPos.current - w;
             y = (ch - h) / 2 + Math.sin(walkPos.current * 0.05) * 5; // Bobbing
         } else {
             walkPos.current = (cw / 2); // Reset center
             x = (cw - w) / 2;
             y = (ch - h) / 2;
         }

         ctx.imageSmoothingEnabled = false;
         ctx.drawImage(img, x, y, w, h);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentFrameIndex, frames, icons, isWalking, isPlaying]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const iconId = e.dataTransfer.getData('iconId');
    if (iconId) {
      const newFrame: AnimationFrame = {
        id: crypto.randomUUID(),
        iconId,
        duration: 100
      };
      setFrames(prev => [...prev, newFrame]);
      if (frames.length === 0) setCurrentFrameIndex(0);
    }
  };

  const removeFrame = (frameId: string) => {
    setFrames(prev => prev.filter(f => f.id !== frameId));
    if (currentFrameIndex >= frames.length - 1) {
        setCurrentFrameIndex(Math.max(0, frames.length - 2));
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950">
      {/* Preview Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900 to-black">
        
        <div className="flex flex-col gap-6 items-center">
            {/* Canvas Container */}
            <div className="relative group rounded-xl p-1 bg-gradient-to-b from-neutral-700 to-neutral-800 shadow-2xl">
                <canvas 
                    ref={canvasRef} 
                    width={512} 
                    height={256} 
                    className="w-[512px] h-[256px] rounded-lg bg-neutral-900 cursor-crosshair"
                />
                <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] text-white font-mono border border-white/10">
                    {frames.length > 0 ? `FRAME ${currentFrameIndex + 1}/${frames.length}` : 'NO SOURCE'}
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 bg-neutral-900 p-2 pl-3 rounded-full border border-neutral-800 shadow-xl">
                <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-white hover:bg-neutral-200 text-black shadow-lg shadow-white/10'}`}
                >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                
                <div className="h-6 w-px bg-neutral-800 mx-1"></div>
                
                <div className="flex flex-col px-2">
                    <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mb-0.5">Speed</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="range" 
                            min="1" 
                            max="30" 
                            value={fps} 
                            onChange={(e) => setFps(parseInt(e.target.value))}
                            className="w-24 accent-purple-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[10px] text-neutral-300 font-mono w-6 text-right">{fps} FPS</span>
                    </div>
                </div>

                <div className="h-6 w-px bg-neutral-800 mx-1"></div>

                <button 
                    onClick={() => setIsWalking(!isWalking)}
                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isWalking ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                    title="Walk it around"
                >
                    <Footprints className="w-4 h-4" />
                </button>

                <button className="w-9 h-9 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors" title="Export">
                    <Download className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      {/* Timeline Strip */}
      <div 
        className="h-56 border-t border-neutral-800 bg-neutral-900 flex flex-col z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="h-10 bg-neutral-900 border-b border-neutral-800 flex items-center px-4 justify-between">
            <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Timeline</span>
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
                TOTAL: {((frames.length * (1000/fps))/1000).toFixed(2)}s
            </div>
        </div>
        
        <div className="flex-1 overflow-x-auto p-4 flex gap-3 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzMzMiIGZpbGwtb3BhY2l0eT0iMC4yIi8+PC9zdmc+')]">
            {frames.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-xl text-neutral-600 gap-3 group">
                    <div className="p-3 bg-neutral-800/50 rounded-full group-hover:scale-110 transition-transform">
                        <PlusCircle className="w-6 h-6 text-neutral-500" />
                    </div>
                    <p className="text-sm font-medium">Drag icons here to create sequence</p>
                </div>
            )}
            
            {frames.map((frame, idx) => {
                const icon = icons.find(i => i.id === frame.iconId);
                return (
                    <div 
                        key={frame.id}
                        className={`relative group flex-shrink-0 w-28 h-32 bg-neutral-800 border-2 rounded-lg flex flex-col items-center p-2 cursor-pointer transition-all ${currentFrameIndex === idx ? 'border-purple-500 ring-2 ring-purple-500/20 translate-y-[-2px]' : 'border-neutral-700 hover:border-neutral-500'}`}
                        onClick={() => setCurrentFrameIndex(idx)}
                    >
                        <div className="flex-1 w-full flex items-center justify-center bg-neutral-900/50 rounded border border-neutral-800/50 mb-2">
                            {icon && (
                                <img src={icon.url} className="max-w-[80%] max-h-[80%] object-contain pixelated" alt="" />
                            )}
                        </div>
                        
                        <div className="w-full flex items-center justify-between px-1">
                             <span className="text-[9px] text-neutral-500 font-mono">#{idx + 1}</span>
                             <span className="text-[9px] text-neutral-600 font-mono">{(1000/fps).toFixed(0)}ms</span>
                        </div>

                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                removeFrame(frame.id);
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
                        >
                            <Trash className="w-3 h-3" />
                        </button>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default Animator;
