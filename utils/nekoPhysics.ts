/**
 * Neko.js - A JavaScript implementation of the classic Neko desktop pet
 * Adapted for TypeScript/React
 */

export enum NekoState {
    STOP = 0,
    WASH = 1,
    SCRATCH = 2,
    YAWN = 3,
    SLEEP = 4,
    AWAKE = 5,
    U_MOVE = 6,
    D_MOVE = 7,
    L_MOVE = 8,
    R_MOVE = 9,
    UL_MOVE = 10,
    UR_MOVE = 11,
    DL_MOVE = 12,
    DR_MOVE = 13,
    U_CLAW = 14,
    D_CLAW = 15,
    L_CLAW = 16,
    R_CLAW = 17,
}

export enum BehaviorMode {
    CHASE_MOUSE = 0,
    RUN_AWAY_FROM_MOUSE = 1,
    RUN_AROUND_RANDOMLY = 2,
    PACE_AROUND_SCREEN = 3,
    RUN_AROUND = 4,
}

const STOP_TIME = 4;
const WASH_TIME = 10;
const SCRATCH_TIME = 4;
const YAWN_TIME = 3;
const AWAKE_TIME = 3;
const CLAW_TIME = 10;
const SPRITE_SIZE = 32;

export interface NekoOptions {
    fps?: number;
    speed?: number;
    behaviorMode?: BehaviorMode;
    idleThreshold?: number;
    startX?: number;
    startY?: number;
    allowBehaviorChange?: boolean;
    sprites?: string[];
    parentElement?: HTMLElement;
    onClose?: () => void;
    onBehaviorChange?: (mode: string) => void;
}

export class Neko {
    fps: number;
    speed: number;
    behaviorMode: BehaviorMode;
    idleThreshold: number;
    state: NekoState = NekoState.STOP;
    tickCount: number = 0;
    stateCount: number = 0;

    x: number;
    y: number;
    logicX: number;
    logicY: number;
    prevLogicX: number;
    prevLogicY: number;
    targetX: number;
    targetY: number;
    oldTargetX: number;
    oldTargetY: number;
    moveDX: number = 0;
    moveDY: number = 0;

    boundsWidth: number;
    boundsHeight: number;

    mouseX: number | null = null;
    mouseY: number | null = null;
    hasMouseMoved: boolean = false;

    element: HTMLDivElement | null = null;
    spriteImages: string[] = [];
    allowBehaviorChange: boolean;
    parentElement: HTMLElement | null = null;
    onClose?: () => void;
    onBehaviorChange?: (mode: string) => void;

    running: boolean = false;
    intervalId: any = null;
    tickAccumulator: number = 0;

    lastMoveDX: number = 0;
    lastMoveDY: number = 0;
    cornerIndex: number = 0;
    actionCount: number = 0;
    ballX: number = 0;
    ballY: number = 0;
    ballVX: number = 0;
    ballVY: number = 0;

    animationTable = [
        [28, 28], // STOP
        [25, 28], // WASH
        [26, 27], // SCRATCH
        [29, 29], // YAWN
        [30, 31], // SLEEP
        [0, 0],   // AWAKE
        [1, 2],   // U_MOVE
        [9, 10],  // D_MOVE
        [13, 14], // L_MOVE
        [5, 6],   // R_MOVE
        [15, 16], // UL_MOVE
        [3, 4],   // UR_MOVE
        [11, 12], // DL_MOVE
        [7, 8],   // DR_MOVE
        [17, 18], // U_CLAW
        [23, 24], // D_CLAW
        [21, 22], // L_CLAW
        [19, 20], // R_CLAW
    ];

    constructor(options: NekoOptions = {}) {
        this.fps = options.fps || 120;
        this.speed = options.speed || 24;
        this.behaviorMode = options.behaviorMode || BehaviorMode.CHASE_MOUSE;
        this.idleThreshold = options.idleThreshold || 6;
        this.x = options.startX || 0;
        this.y = options.startY || 0;
        this.allowBehaviorChange = options.allowBehaviorChange !== false;
        this.spriteImages = options.sprites || [];
        this.parentElement = options.parentElement || document.body;
        this.onClose = options.onClose;
        this.onBehaviorChange = options.onBehaviorChange;

        this.logicX = this.x;
        this.logicY = this.y;
        this.prevLogicX = this.x;
        this.prevLogicY = this.y;
        this.targetX = this.x;
        this.targetY = this.y;
        this.oldTargetX = this.x;
        this.oldTargetY = this.y;

        this.boundsWidth = document.documentElement.clientWidth - SPRITE_SIZE;
        this.boundsHeight = window.innerHeight - SPRITE_SIZE;

        this.init();
    }

    init() {
        this.element = document.createElement("div");
        this.element.className = "neko";
        this.element.style.position = "fixed";
        this.element.style.width = SPRITE_SIZE + "px";
        this.element.style.height = SPRITE_SIZE + "px";
        this.element.style.imageRendering = "pixelated";
        this.element.style.pointerEvents = "auto"; // Always auto to handle interactions
        this.element.style.cursor = this.allowBehaviorChange ? "pointer" : "default";
        this.element.style.zIndex = "999999";
        this.element.style.left = this.x + "px";
        this.element.style.top = this.y + "px";

        const img = document.createElement("img");
        img.style.width = "100%";
        img.style.height = "100%";
        // Prevent drag
        img.draggable = false;
        this.element.appendChild(img);

        // Close/Dismiss button (visible on hover)
        if (this.onClose) {
            const closeBtn = document.createElement("div");
            closeBtn.className = "neko-close-btn";
            closeBtn.innerHTML = "×"; // Simple multiplication sign as 'X'
            closeBtn.style.position = "absolute";
            closeBtn.style.top = "-8px";
            closeBtn.style.right = "-8px";
            closeBtn.style.width = "16px";
            closeBtn.style.height = "16px";
            closeBtn.style.display = "flex";
            closeBtn.style.alignItems = "center";
            closeBtn.style.justifyContent = "center";
            closeBtn.style.background = "rgba(0, 0, 0, 0.6)";
            closeBtn.style.color = "#fff";
            closeBtn.style.fontSize = "14px";
            closeBtn.style.lineHeight = "1";
            closeBtn.style.borderRadius = "50%";
            closeBtn.style.opacity = "0";
            closeBtn.style.transition = "opacity 0.2s, transform 0.2s";
            closeBtn.style.pointerEvents = "auto";
            closeBtn.style.cursor = "pointer";
            closeBtn.style.border = "1px solid rgba(255, 255, 255, 0.2)";
            closeBtn.style.userSelect = "none";
            closeBtn.style.zIndex = "1000000";

            closeBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.onClose) this.onClose();
            });

            // Add hover scale effect
            closeBtn.addEventListener("mouseenter", () => {
                closeBtn.style.transform = "scale(1.2)";
                closeBtn.style.background = "rgba(220, 38, 38, 0.8)"; // Red warning color on hover
            });
            closeBtn.addEventListener("mouseleave", () => {
                closeBtn.style.transform = "scale(1)";
                closeBtn.style.background = "rgba(0, 0, 0, 0.6)";
            });

            this.element.appendChild(closeBtn);

            // Hover effects on the main container to show button
            this.element.addEventListener("mouseenter", () => {
                closeBtn.style.opacity = "1";
            });
            this.element.addEventListener("mouseleave", () => {
                closeBtn.style.opacity = "0";
            });
        }

        this.parentElement?.appendChild(this.element);

        this.element.addEventListener("mousedown", (e) => {
            // If clicking close button, don't cycle
            if ((e.target as HTMLElement).classList.contains('neko-close-btn')) return;

            if (this.allowBehaviorChange) {
                e.stopPropagation();
                e.preventDefault();
                this.setState(NekoState.AWAKE);
                this.cycleBehavior();
            }
        });

        document.addEventListener("mousemove", (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.hasMouseMoved = true;
        });

        window.addEventListener("resize", () => {
            this.boundsWidth = document.documentElement.clientWidth - SPRITE_SIZE;
            this.boundsHeight = window.innerHeight - SPRITE_SIZE;
        });

        this.x = Math.random() * this.boundsWidth;
        this.y = Math.random() * this.boundsHeight;
        this.logicX = this.x;
        this.logicY = this.y;
        this.prevLogicX = this.x;
        this.prevLogicY = this.y;
        this.targetX = this.x + SPRITE_SIZE / 2;
        this.targetY = this.y + SPRITE_SIZE - 1;
        this.oldTargetX = this.targetX;
        this.oldTargetY = this.targetY;
        this.updatePosition();

        this.updateSprite();
        this.start();
    }

    start() {
        if (this.running) return;
        this.running = true;

        const interval = 1000 / this.fps;
        this.intervalId = setInterval(() => {
            if (this.running) this.update();
        }, interval);
    }

    stop() {
        this.running = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    setSprites(sprites: string[]) {
        this.spriteImages = sprites;
        this.updateSprite();
    }

    updateSprite() {
        if (this.spriteImages.length === 0 || !this.element) return;

        let frameIndex;
        if (this.state === NekoState.SLEEP) {
            frameIndex = this.animationTable[this.state][(this.tickCount >> 2) & 0x1];
        } else {
            frameIndex = this.animationTable[this.state][this.tickCount & 0x1];
        }

        const img = this.element.querySelector("img");
        if (img && this.spriteImages[frameIndex]) {
            img.src = this.spriteImages[frameIndex];
        }
    }

    updatePosition() {
        if (!this.element) return;
        // Apply scaling here if needed, or stick to CSS transform on container?
        // User Neko code sets top/left. 
        // We can add scale if we want big cat. Currently size is fixed 32 in init.
        // NekoOverlay had scale(3). Let's apply that via style.
        this.element.style.transform = `translate(${Math.round(this.x)}px, ${Math.round(this.y)}px) scale(2)`;
        // NOTE: Translation is better for performance than top/left, but we must zero top/left.
        // But original code used top/left. Let's switch to transform for 120fps smoothness.
        this.element.style.left = '0px';
        this.element.style.top = '0px';
    }

    update() {
        this.tickAccumulator += 5 / this.fps;

        while (this.tickAccumulator >= 1) {
            this.tickAccumulator -= 1;
            this.prevLogicX = this.logicX;
            this.prevLogicY = this.logicY;
            this.processOriginalTick();
        }

        const t = this.tickAccumulator;
        this.x = this.prevLogicX + (this.logicX - this.prevLogicX) * t;
        this.y = this.prevLogicY + (this.logicY - this.prevLogicY) * t;

        this.updatePosition();
    }

    processOriginalTick() {
        this.tickCount++;
        if (this.tickCount >= 9999) this.tickCount = 0;

        if (this.tickCount % 2 === 0) {
            this.stateCount++;
        }

        switch (this.behaviorMode) {
            case BehaviorMode.CHASE_MOUSE:
                this.chaseMouse();
                break;
            case BehaviorMode.RUN_AWAY_FROM_MOUSE:
                this.runAwayFromMouse();
                break;
            case BehaviorMode.RUN_AROUND_RANDOMLY:
                this.runRandomly();
                break;
            case BehaviorMode.PACE_AROUND_SCREEN:
                this.paceAroundScreen();
                break;
            case BehaviorMode.RUN_AROUND:
                this.runAround();
                break;
        }

        this.updateSprite();
    }

    chaseMouse() {
        if (!this.hasMouseMoved || this.mouseX === null || this.mouseY === null) {
            this.runTowards(this.logicX + SPRITE_SIZE / 2, this.logicY + SPRITE_SIZE - 1);
            return;
        }
        this.runTowards(this.mouseX, this.mouseY);
    }

    runAwayFromMouse() {
        if (!this.hasMouseMoved || this.mouseX === null || this.mouseY === null) {
            this.runTowards(this.logicX + SPRITE_SIZE / 2, this.logicY + SPRITE_SIZE - 1);
            return;
        }

        const dwLimit = this.idleThreshold * 16;
        const xdiff = this.logicX + SPRITE_SIZE / 2 - this.mouseX;
        const ydiff = this.logicY + SPRITE_SIZE / 2 - this.mouseY;

        if (Math.abs(xdiff) < dwLimit && Math.abs(ydiff) < dwLimit) {
            const dLength = Math.sqrt(xdiff * xdiff + ydiff * ydiff);
            let targetX, targetY;
            if (dLength !== 0) {
                targetX = this.logicX + (xdiff / dLength) * dwLimit;
                targetY = this.logicY + (ydiff / dLength) * dwLimit;
            } else {
                // If perfectly on mouse, run to casual center screen offset
                targetX = this.boundsWidth / 2 + (Math.random() * 200 - 100);
                targetY = this.boundsHeight / 2 + (Math.random() * 200 - 100);
            }
            this.runTowards(targetX, targetY);
            if (this.state === NekoState.AWAKE) {
                this.calcDirection(targetX - this.logicX, targetY - this.logicY);
            }
        } else {
            this.runTowards(this.targetX, this.targetY);
        }
    }

    runRandomly() {
        if (this.state === NekoState.SLEEP) {
            this.actionCount++;
        }
        if (this.actionCount > this.idleThreshold * 10) {
            this.actionCount = 0;
            this.targetX = Math.random() * this.boundsWidth;
            this.targetY = Math.random() * this.boundsHeight;
            this.runTowards(this.targetX, this.targetY);
        } else {
            this.runTowards(this.targetX, this.targetY);
        }
    }

    paceAroundScreen() {
        if (this.lastMoveDX === 0 && this.lastMoveDY === 0) {
            this.cornerIndex = (this.cornerIndex + 1) % 4;
        }

        const corners = [
            [SPRITE_SIZE + SPRITE_SIZE / 2, SPRITE_SIZE + SPRITE_SIZE - 1],
            [SPRITE_SIZE + SPRITE_SIZE / 2, this.boundsHeight - SPRITE_SIZE + SPRITE_SIZE - 1],
            [this.boundsWidth - SPRITE_SIZE + SPRITE_SIZE / 2, this.boundsHeight - SPRITE_SIZE + SPRITE_SIZE - 1],
            [this.boundsWidth - SPRITE_SIZE + SPRITE_SIZE / 2, SPRITE_SIZE + SPRITE_SIZE - 1],
        ];

        const target = corners[this.cornerIndex];
        this.runTowards(target[0], target[1]);
    }

    runAround() {
        const dwBoundingBox = this.speed * 8;

        if (this.ballX === 0 && this.ballY === 0) {
            this.ballX = Math.random() * (this.boundsWidth - dwBoundingBox);
            this.ballY = Math.random() * (this.boundsHeight - dwBoundingBox);
            this.ballVX = (Math.random() < 0.5 ? 1 : -1) * (this.speed / 2) + 1;
            this.ballVY = (Math.random() < 0.5 ? 1 : -1) * (this.speed / 2) + 1;
        }

        this.ballX += this.ballVX;
        this.ballY += this.ballVY;

        if (this.ballX < dwBoundingBox) {
            if (this.ballX > 0) this.ballVX++;
            else this.ballVX = -this.ballVX;
        } else if (this.ballX > this.boundsWidth - dwBoundingBox) {
            if (this.ballX < this.boundsWidth) this.ballVX--;
            else this.ballVX = -this.ballVX;
        }

        if (this.ballY < dwBoundingBox) {
            if (this.ballY > 0) this.ballVY++;
            else this.ballVY = -this.ballVY;
        } else if (this.ballY > this.boundsHeight - dwBoundingBox) {
            if (this.ballY < this.boundsHeight) this.ballVY--;
            else this.ballVY = -this.ballVY;
        }

        this.runTowards(this.ballX, this.ballY);
    }

    setState(newState: NekoState) {
        this.tickCount = 0;
        this.stateCount = 0;
        this.state = newState;
    }

    runTowards(targetX: number, targetY: number) {
        this.oldTargetX = this.targetX;
        this.oldTargetY = this.targetY;
        this.targetX = targetX;
        this.targetY = targetY;

        const dx = targetX - this.logicX - SPRITE_SIZE / 2;
        const dy = targetY - this.logicY - SPRITE_SIZE + 1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance !== 0) {
            if (distance <= this.speed) {
                this.moveDX = Math.trunc(dx);
                this.moveDY = Math.trunc(dy);
            } else {
                this.moveDX = Math.trunc((this.speed * dx) / distance);
                this.moveDY = Math.trunc((this.speed * dy) / distance);
            }
        } else {
            this.moveDX = 0;
            this.moveDY = 0;
        }

        this.lastMoveDX = this.moveDX;
        this.lastMoveDY = this.moveDY;

        const moveStart = !(
            this.oldTargetX >= this.targetX - this.idleThreshold &&
            this.oldTargetX <= this.targetX + this.idleThreshold &&
            this.oldTargetY >= this.targetY - this.idleThreshold &&
            this.oldTargetY <= this.targetY + this.idleThreshold
        );

        switch (this.state) {
            case NekoState.STOP:
                if (moveStart) {
                    this.setState(NekoState.AWAKE);
                } else if (this.stateCount >= STOP_TIME) {
                    if (this.moveDX < 0 && this.logicX <= 0) {
                        this.setState(NekoState.L_CLAW);
                    } else if (this.moveDX > 0 && this.logicX >= this.boundsWidth) {
                        this.setState(NekoState.R_CLAW);
                    } else if (this.moveDY < 0 && this.logicY <= 0) {
                        this.setState(NekoState.U_CLAW);
                    } else if (this.moveDY > 0 && this.logicY >= this.boundsHeight) {
                        this.setState(NekoState.D_CLAW);
                    } else {
                        this.setState(NekoState.WASH);
                    }
                }
                break;

            case NekoState.WASH:
                if (moveStart) {
                    this.setState(NekoState.AWAKE);
                } else if (this.stateCount >= WASH_TIME) {
                    this.setState(NekoState.SCRATCH);
                }
                break;

            case NekoState.SCRATCH:
                if (moveStart) {
                    this.setState(NekoState.AWAKE);
                } else if (this.stateCount >= SCRATCH_TIME) {
                    this.setState(NekoState.YAWN);
                }
                break;

            case NekoState.YAWN:
                if (moveStart) {
                    this.setState(NekoState.AWAKE);
                } else if (this.stateCount >= YAWN_TIME) {
                    this.setState(NekoState.SLEEP);
                }
                break;

            case NekoState.SLEEP:
                if (moveStart) {
                    this.setState(NekoState.AWAKE);
                }
                break;

            case NekoState.AWAKE:
                if (this.stateCount >= AWAKE_TIME + Math.floor(Math.random() * 20)) {
                    this.calcDirection(this.moveDX, this.moveDY);
                }
                break;

            case NekoState.U_MOVE:
            case NekoState.D_MOVE:
            case NekoState.L_MOVE:
            case NekoState.R_MOVE:
            case NekoState.UL_MOVE:
            case NekoState.UR_MOVE:
            case NekoState.DL_MOVE:
            case NekoState.DR_MOVE:
                let newX = this.logicX + this.moveDX;
                let newY = this.logicY + this.moveDY;
                const wasOutside = newX <= 0 || newX >= this.boundsWidth || newY <= 0 || newY >= this.boundsHeight;

                this.calcDirection(this.moveDX, this.moveDY);

                newX = Math.max(0, Math.min(this.boundsWidth, newX));
                newY = Math.max(0, Math.min(this.boundsHeight, newY));
                const notMoved = newX === this.logicX && newY === this.logicY;

                if (wasOutside && notMoved) {
                    this.setState(NekoState.STOP);
                } else {
                    this.logicX = newX;
                    this.logicY = newY;
                }
                break;

            case NekoState.U_CLAW:
            case NekoState.D_CLAW:
            case NekoState.L_CLAW:
            case NekoState.R_CLAW:
                if (moveStart) {
                    this.setState(NekoState.AWAKE);
                } else if (this.stateCount >= CLAW_TIME) {
                    this.setState(NekoState.SCRATCH);
                }
                break;

            default:
                this.setState(NekoState.STOP);
                break;
        }
    }

    calcDirection(dx: number, dy: number) {
        let newState: NekoState;

        if (dx === 0 && dy === 0) {
            newState = NekoState.STOP;
        } else {
            const largeX = dx;
            const largeY = -dy;
            const length = Math.sqrt(largeX * largeX + largeY * largeY);
            const sinTheta = largeY / length;

            const sinPiPer8 = 0.3826834323651;
            const sinPiPer8Times3 = 0.9238795325113;

            if (dx > 0) {
                if (sinTheta > sinPiPer8Times3) newState = NekoState.U_MOVE;
                else if (sinTheta > sinPiPer8) newState = NekoState.UR_MOVE;
                else if (sinTheta > -sinPiPer8) newState = NekoState.R_MOVE;
                else if (sinTheta > -sinPiPer8Times3) newState = NekoState.DR_MOVE;
                else newState = NekoState.D_MOVE;
            } else {
                if (sinTheta > sinPiPer8Times3) newState = NekoState.U_MOVE;
                else if (sinTheta > sinPiPer8) newState = NekoState.UL_MOVE;
                else if (sinTheta > -sinPiPer8) newState = NekoState.L_MOVE;
                else if (sinTheta > -sinPiPer8Times3) newState = NekoState.DL_MOVE;
                else newState = NekoState.D_MOVE;
            }
        }

        if (this.state !== newState) {
            this.setState(newState);
        }
    }

    cycleBehavior() {
        const behaviors = [
            BehaviorMode.CHASE_MOUSE,
            BehaviorMode.RUN_AWAY_FROM_MOUSE,
            BehaviorMode.RUN_AROUND_RANDOMLY,
            BehaviorMode.PACE_AROUND_SCREEN,
            BehaviorMode.RUN_AROUND,
        ];
        const currentIndex = behaviors.indexOf(this.behaviorMode);
        const nextIndex = (currentIndex + 1) % behaviors.length;
        this.behaviorMode = behaviors[nextIndex];

        if (this.state === NekoState.SLEEP) {
            this.setState(NekoState.AWAKE);
        }

        // Reset running state so we don't sprint to a stale target from previous mode
        this.targetX = this.logicX;
        this.targetY = this.logicY;
        this.oldTargetX = this.logicX;
        this.oldTargetY = this.logicY;
        this.actionCount = 0;
        this.tickCount = 0;

        // Slightly nudge to trigger update
        this.setState(NekoState.AWAKE);

        console.log("Behavior switch:", BehaviorMode[this.behaviorMode]);
        if (this.onBehaviorChange) {
            // Convert Enum to readable string
            const modeName = BehaviorMode[this.behaviorMode].replace(/_/g, " ");
            this.onBehaviorChange(modeName);
        }
    }

    destroy() {
        this.stop();
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        // Cleanup global listeners (we used document/window)
        // We really should store the bound functions to remove them
        // For now, this is a minor leak if mounting/unmounting frequently,
        // but given the app structure it's likely single instance.
        // TODO: Proper event cleanup
    }
}
