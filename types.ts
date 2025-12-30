export interface IconItem {
  id: string;
  name: string;
  url: string;
  format: string;
  dimensions?: { width: number; height: number };
}

export interface AnimationFrame {
  id: string;
  iconId: string;
  duration: number; // in ms
}

export type ViewMode = 'library' | 'animator' | 'remote';

export interface GeminiConfig {
  apiKey: string;
}

export interface NekoSkin {
  id: string;
  name: string;
  sprites: Record<string, string>; // key (e.g. "nrun1") -> url
}

export type NekoState = 'still' | 'move' | 'sleep' | 'alert' | 'wash' | 'itch' | 'yawn';
export type NekoDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';