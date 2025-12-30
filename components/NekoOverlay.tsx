import React, { useEffect, useRef } from 'react';
import { NekoSkin } from '../types';
import { Neko, NekoState } from '../utils/nekoPhysics';

interface NekoOverlayProps {
  skin: NekoSkin;
  onClose: () => void;
}

const NekoOverlay: React.FC<NekoOverlayProps> = ({ skin, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nekoRef = useRef<Neko | null>(null);

  useEffect(() => {
    // Map the skin sprites to the specific integer index expected by Neko.ts
    // 0: Awake
    // 1-2: U_MOVE
    // 3-4: UR_MOVE
    // 5-6: R_MOVE
    // 7-8: DR_MOVE
    // 9-10: D_MOVE
    // 11-12: DL_MOVE
    // 13-14: L_MOVE
    // 15-16: UL_MOVE
    // 17-18: U_CLAW
    // 19-20: R_CLAW
    // 21-22: L_CLAW
    // 23-24: D_CLAW
    // 25: WASH[0]
    // 26-27: SCRATCH
    // 28: STOP (also WASH[1])
    // 29: YAWN
    // 30-31: SLEEP

    // We need to map from the named keys in NekoSkin
    const s = skin.sprites;

    // Note: Assuming 'escratch' is Right Claw, 'wscratch' is Left Claw.
    // Assuming 'nerun' is NE Run (UR_MOVE), etc.

    // Fallbacks provided for robustness
    const spirteArray = [
      s.alert || s.still,     // 0: AWAKE
      s.nrun1 || s.nrun2,     // 1: U_MOVE
      s.nrun2 || s.nrun1,     // 2
      s.nerun1 || s.nrun1,    // 3: UR_MOVE
      s.nerun2 || s.nrun2,    // 4
      s.erun1 || s.serun1,    // 5: R_MOVE
      s.erun2 || s.serun2,    // 6
      s.serun1 || s.srun1,    // 7: DR_MOVE
      s.serun2 || s.srun2,    // 8
      s.srun1 || s.srun2,     // 9: D_MOVE
      s.srun2 || s.srun1,     // 10
      s.swrun1 || s.srun1,    // 11: DL_MOVE
      s.swrun2 || s.srun2,    // 12
      s.wrun1 || s.swrun1,    // 13: L_MOVE
      s.wrun2 || s.swrun2,    // 14
      s.nwrun1 || s.nrun1,    // 15: UL_MOVE
      s.nwrun2 || s.nrun2,    // 16
      s.nscratch1 || s.nrun1, // 17: U_CLAW
      s.nscratch2 || s.nrun2, // 18
      s.escratch1 || s.erun1, // 19: R_CLAW
      s.escratch2 || s.erun2, // 20
      s.wscratch1 || s.wrun1, // 21: L_CLAW
      s.wscratch2 || s.wrun2, // 22
      s.sscratch1 || s.srun1, // 23: D_CLAW
      s.sscratch2 || s.srun2, // 24
      s.wash || s.still,      // 25: WASH
      s.itch1 || s.still,     // 26: SCRATCH
      s.itch2 || s.still,     // 27
      s.still || s.nrun1,     // 28: STOP
      s.yawn || s.still,      // 29: YAWN
      s.sleep1 || s.still,    // 30: SLEEP
      s.sleep2 || s.sleep1,   // 31
    ];

    if (!nekoRef.current) {
      nekoRef.current = new Neko({
        speed: 16, // Original speed often feels best. User suggested 24 for high DPI.
        fps: 60,   // 60 is plenty smooth for pixel art
        sprites: spirteArray,
        onClose: onClose,
        startY: window.innerHeight / 2,
        startX: window.innerWidth / 2,
      });
    } else {
      nekoRef.current.setSprites(spirteArray);
    }

    // No need to append anything manually here if we modify Neko.ts to append to document.body
    // or if we passed a parentElement. 
    // Ideally we want to pass this container ref, but Neko.ts currently defaults to body.
    // Let's rely on Neko.ts behavior to append to body, as `fixed` position works best there.

    return () => {
      // Cleanup on unmount
      if (nekoRef.current) {
        nekoRef.current.destroy();
        nekoRef.current = null;
      }
    };
  }, [skin, onClose]);

  // We render essentially nothing (or a hidden placeholder) as the Neko class manages the DOM
  return <div ref={containerRef} className="hidden" />;
};

export default NekoOverlay;
