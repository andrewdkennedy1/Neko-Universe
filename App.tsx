import React, { useState } from 'react';
import RemoteLibrary from './components/RemoteLibrary';
import NekoOverlay from './components/NekoOverlay';
import IclInspector from './components/IclInspector';
import Toast from './components/Toast';
import { NekoSkin } from './types';
import { GithubFile } from './services/githubService';
import { Cat, Github } from 'lucide-react';

export default function App() {
  const [activeNeko, setActiveNeko] = useState<NekoSkin | null>(null);
  const [showSelector, setShowSelector] = useState(true);
  const [inspectFile, setInspectFile] = useState<GithubFile | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const handleModeChange = (mode: string) => {
    setToastMessage(`Behavior: ${mode}`);
    setShowToast(true);
  };

  return (
    <div className="flex h-screen w-screen bg-black text-white font-sans selection:bg-purple-500/30 overflow-hidden relative">
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      {/* Background / Playground Area */}

      {/* Background / Playground Area */}
      <div className="absolute inset-0 bg-[#121212] flex items-center justify-center pointer-events-auto" onClick={() => setShowSelector(false)}>
        {!activeNeko && !inspectFile && (
          <div className="text-center space-y-4 opacity-50 select-none pointer-events-none">
            <Cat className="w-24 h-24 mx-auto text-neutral-700" />
            <h1 className="text-4xl font-bold text-neutral-700 tracking-tighter uppercase">Neko Playground</h1>
            <p className="text-neutral-600">Select a cat to begin</p>
          </div>
        )}
      </div>

      {/* The Neko */}
      {activeNeko && (
        <NekoOverlay
          skin={activeNeko}
          onClose={() => setActiveNeko(null)}
          onModeChange={handleModeChange}
        />
      )}

      {/* Inspector Modal (Full Screen Overlay) */}
      {inspectFile && (
        <IclInspector
          file={inspectFile}
          onClose={() => setInspectFile(null)}
          onPlay={(skin) => {
            setInspectFile(null);
            setActiveNeko(skin);
            setShowSelector(false); // Hide selector to enjoy the cat
          }}
        />
      )}

      {/* Sidebar Selector (Collapsible or Overlay) */}
      <div
        className={`absolute top-0 left-0 h-full w-80 bg-neutral-900/90 backdrop-blur border-r border-neutral-800 transition-transform duration-500 ease-in-out z-40 ${showSelector ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <RemoteLibrary
          onPlayNeko={(skin) => {
            setActiveNeko(skin);
            // Optional: auto-hide on mobile, keep open on desktop
            if (window.innerWidth < 768) setShowSelector(false);
          }}
          onInspectLegacy={(file) => setInspectFile(file)}
        />

        {/* Toggle Handle */}
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="absolute -right-8 top-1/2 -translate-y-1/2 w-8 h-16 bg-neutral-800 rounded-r-lg flex items-center justify-center border-y border-r border-neutral-700 cursor-pointer hover:bg-neutral-700 text-neutral-400"
        >
          <Cat className={`w-5 h-5 transition-transform ${showSelector ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Helper hint if hidden */}
      {!showSelector && !activeNeko && !inspectFile && (
        <button
          onClick={() => setShowSelector(true)}
          className="absolute top-4 left-4 px-4 py-2 bg-purple-600 text-white rounded-full shadow-lg hover:scale-105 transition-transform z-40"
        >
          Open Library
        </button>
      )}
    </div>
  );
}
