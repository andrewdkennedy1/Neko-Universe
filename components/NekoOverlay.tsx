import React, { useEffect, useRef, useState } from 'react';
import { NekoSkin, NekoState, NekoDirection } from '../types';

interface NekoOverlayProps {
  skin: NekoSkin;
  onClose: () => void;
}

// Added 'scratch' as a generic state, but we really need specific wall scratch states
// 'wallscratch' will rely on direction to pick sprite
type ExtendedState = NekoState | 'wallscratch';

const NekoOverlay: React.FC<NekoOverlayProps> = ({ skin, onClose }) => {
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [frameIdx, setFrameIdx] = useState(1);
  const [state, setState] = useState<ExtendedState>('alert');
  
  const posRef = useRef(pos);
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const stateRef = useRef<ExtendedState>('alert');
  const frameRef = useRef(1);
  const directionRef = useRef<NekoDirection>('s');
  const lastTimeRef = useRef(0);
  const idleTimeRef = useRef(0);
  const actionCountRef = useRef(0); 

  useEffect(() => {
    stateRef.current = 'alert';
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (stateRef.current === 'sleep') {
        stateRef.current = 'alert';
        idleTimeRef.current = 0;
        actionCountRef.current = 5; // Alert for a moment
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    let animationFrameId: number;

    const loop = (time: number) => {
      const dt = time - lastTimeRef.current;
      
      // Update Physics at ~30 FPS
      if (dt > 32) { 
        updateBehavior();
        lastTimeRef.current = time;
      }

      // Frame Animation Timing
      // Running: 125ms
      // Scratching/Itching: 150ms
      // Sleeping: 500ms
      let speed = 250;
      if (stateRef.current === 'move') speed = 125;
      if (stateRef.current === 'wallscratch' || stateRef.current === 'itch' || stateRef.current === 'wash') speed = 150;
      if (stateRef.current === 'sleep') speed = 500;

      if (Math.floor(time / speed) % 2 + 1 !== frameRef.current) {
        frameRef.current = Math.floor(time / speed) % 2 + 1; // 1 or 2
        setFrameIdx(frameRef.current);
        if (actionCountRef.current > 0) actionCountRef.current--;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [skin]);

  const updateBehavior = () => {
    const cat = posRef.current;
    const mouse = mouseRef.current;
    
    // Bounds Check for Wall Scratching
    const margin = 16;
    let hittingWall: NekoDirection | null = null;
    if (cat.x <= margin) hittingWall = 'w';
    else if (cat.x >= window.innerWidth - margin) hittingWall = 'e';
    else if (cat.y <= margin) hittingWall = 'n';
    else if (cat.y >= window.innerHeight - margin) hittingWall = 's';

    // State Priorities:
    // 1. Blocking Actions (Itch, Wash, Yawn, Alert, WallScratch) must finish animation count
    if (actionCountRef.current > 0) {
        // Allow interruption by mouse movement if we are just sleeping
        const dx = mouse.x - cat.x;
        const dy = mouse.y - cat.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 100 && stateRef.current === 'sleep') {
             stateRef.current = 'alert';
             actionCountRef.current = 0;
        } else {
             // Continue action
             setPos(posRef.current);
             setState(stateRef.current);
             return;
        }
    }

    // Logic when free to choose new state
    const dx = mouse.x - cat.x;
    const dy = mouse.y - cat.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const stopDist = 16;
    const speed = 16; // Fast cat

    if (dist > stopDist) {
        // MOVEMENT
        stateRef.current = 'move';
        idleTimeRef.current = 0;

        // If mouse is outside window bounds (technically handled by logic), 
        // but if cat hits wall, trigger scratch
        if (hittingWall) {
             // Check if we are trying to move INTO the wall
             // Simple check: if mouse is beyond wall
             let scratching = false;
             if (hittingWall === 'n' && mouse.y < 0) scratching = true;
             if (hittingWall === 's' && mouse.y > window.innerHeight) scratching = true;
             if (hittingWall === 'w' && mouse.x < 0) scratching = true;
             if (hittingWall === 'e' && mouse.x > window.innerWidth) scratching = true;
             
             // Actually, just if we are AT the wall and still trying to move closer to it
             if ((hittingWall === 'n' && dy < 0) || 
                 (hittingWall === 's' && dy > 0) || 
                 (hittingWall === 'w' && dx < 0) || 
                 (hittingWall === 'e' && dx > 0)) {
                 
                 stateRef.current = 'wallscratch';
                 directionRef.current = hittingWall;
                 actionCountRef.current = 10; // Scratch for a bit
                 setPos(posRef.current);
                 setState(stateRef.current);
                 return;
             }
        }

        const angle = Math.atan2(dy, dx);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        posRef.current = { x: cat.x + vx, y: cat.y + vy };
        
        // Direction calc
        const deg = angle * (180 / Math.PI);
        // Neko uses 8 directions
        // -90 is North. 0 is East. 90 is South. 180/-180 is West.
        if (deg > -22.5 && deg <= 22.5) directionRef.current = 'e';
        else if (deg > 22.5 && deg <= 67.5) directionRef.current = 'se';
        else if (deg > 67.5 && deg <= 112.5) directionRef.current = 's';
        else if (deg > 112.5 && deg <= 157.5) directionRef.current = 'sw';
        else if (deg > 157.5 || deg <= -157.5) directionRef.current = 'w';
        else if (deg > -157.5 && deg <= -112.5) directionRef.current = 'nw';
        else if (deg > -112.5 && deg <= -67.5) directionRef.current = 'n';
        else if (deg > -67.5 && deg <= -22.5) directionRef.current = 'ne';

    } else {
        // IDLE
        if (stateRef.current === 'move') {
            stateRef.current = 'still';
        }

        idleTimeRef.current++;

        if (stateRef.current === 'still') {
            if (idleTimeRef.current > 40 && Math.random() < 0.05) {
                // Random Idle Action
                const r = Math.random();
                if (r < 0.4) {
                    stateRef.current = 'wash'; // Grooming
                    actionCountRef.current = 15;
                } else if (r < 0.7) {
                    stateRef.current = 'itch'; // Scratching Head
                    actionCountRef.current = 15;
                } else {
                    stateRef.current = 'yawn';
                    actionCountRef.current = 6;
                }
            } else if (idleTimeRef.current > 200) {
                // Go to sleep
                stateRef.current = 'sleep';
                actionCountRef.current = 0; // Sleep indefinitely
            }
        }
    }

    setPos(posRef.current);
    setState(stateRef.current);
  };

  const getSpriteUrl = () => {
    const s = skin.sprites;
    const f = frameIdx;
    const dir = directionRef.current;

    switch (state) {
        case 'sleep': return f === 1 ? s.sleep1 : s.sleep2;
        case 'alert': return s.alert;
        case 'yawn': return s.yawn;
        case 'still': return s.still;
        case 'itch': return f === 1 ? s.itch1 : s.itch2;
        case 'wash': return f === 1 ? s.wash : (s.wash || s.wash); // Wash often 1 frame, but if mapped to array...
        case 'wallscratch': 
             // Determine scratch direction based on hittingWall which we stored in directionRef for simplicity in updateBehavior
             // or re-derive. Actually we stored hittingWall in directionRef when setting state to wallscratch
             if (dir === 'n') return f === 1 ? s.nscratch1 : s.nscratch2;
             if (dir === 'e') return f === 1 ? s.escratch1 : s.escratch2;
             if (dir === 's') return f === 1 ? s.sscratch1 : s.sscratch2;
             if (dir === 'w') return f === 1 ? s.wscratch1 : s.wscratch2;
             return s.nscratch1;
        case 'move':
            return s[`${dir}run${f}`] || s.still;
        default: return s.still;
    }
  };

  return (
    <div 
        className="fixed z-[100] transition-transform will-change-transform pointer-events-none"
        style={{ 
            left: 0, 
            top: 0, 
            transform: `translate(${pos.x - 16}px, ${pos.y - 16}px) scale(3)`
        }}
    >
        <img 
            src={getSpriteUrl()} 
            alt="Neko"
            className="image-pixelated drop-shadow-2xl"
            style={{ 
                imageRendering: 'pixelated',
                width: 32,
                height: 32
            }}
        />
        
        {/* Helper to close if needed */}
        <div 
            className="absolute -top-6 left-1/2 -translate-x-1/2 bg-neutral-900/90 text-neutral-400 text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer border border-neutral-700 whitespace-nowrap" 
            onClick={onClose}
        >
            Dismiss
        </div>
    </div>
  );
};

export default NekoOverlay;
