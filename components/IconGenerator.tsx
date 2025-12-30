import React, { useState } from 'react';
import { generateIcon } from '../services/geminiService';
import { Loader2, Wand2, X, Grid, Image as ImageIcon } from 'lucide-react';

interface IconGeneratorProps {
  onClose: () => void;
  onGenerated: (url: string, name: string) => void;
}

const IconGenerator: React.FC<IconGeneratorProps> = ({ onClose, onGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [isSpriteSheet, setIsSpriteSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const url = await generateIcon(prompt, isSpriteSheet);
      onGenerated(url, isSpriteSheet ? `Sprite: ${prompt.slice(0, 15)}` : prompt.slice(0, 20));
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-800 border border-neutral-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">AI Studio</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Output Format
            </label>
            <div className="flex gap-2 p-1 bg-neutral-900 rounded-lg">
                <button 
                    onClick={() => setIsSpriteSheet(false)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${!isSpriteSheet ? 'bg-neutral-700 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    <ImageIcon className="w-4 h-4" />
                    Icon
                </button>
                <button 
                    onClick={() => setIsSpriteSheet(true)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${isSpriteSheet ? 'bg-purple-600 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    <Grid className="w-4 h-4" />
                    Sprite Sheet
                </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Prompt
            </label>
            <textarea
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none h-24"
              placeholder={isSpriteSheet ? "e.g., A pixel art character walking, side view" : "e.g., A futuristic blue robot head"}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {isSpriteSheet ? 'Generate Sheet' : 'Generate Icon'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconGenerator;
