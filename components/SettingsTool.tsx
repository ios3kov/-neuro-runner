import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { AppState } from '../types';
import { audio } from '../utils/audio';
import { useOverscrollGuard } from '../hooks/useOverscrollGuard';
import { Z_LAYERS } from '../constants/ui';
import { UI_STRINGS } from '../constants/strings';

export const SettingsTool: React.FC = () => {
  const userSettings = useStore((s) => s.user.settings);
  const toggleSound = useStore((s) => s.toggleSound);
  const toggleMusic = useStore((s) => s.toggleMusic);
  const toggleHidden = useStore((s) => s.toggleHidden);
  const toggleHaptics = useStore((s) => s.toggleHaptics);
  const toggleLowPower = useStore((s) => s.toggleLowPower);
  const setAppState = useStore((s) => s.setAppState);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const scrollGuard = useOverscrollGuard();
  
  const settingItems = [
    { 
      id: 'sound', 
      label: 'AUDIO_FX', 
      active: userSettings.soundEnabled, 
      action: toggleSound,
      icon: '🔊' 
    },
    { 
      id: 'music', 
      label: 'AMBIENCE', 
      active: userSettings.musicEnabled, 
      action: toggleMusic,
      icon: '🎵' 
    },
    { 
      id: 'hidden', 
      label: 'HIDDEN_FILES', 
      active: userSettings.showHidden, 
      action: toggleHidden,
      icon: '👁️' 
    },
    { 
      id: 'haptics', 
      label: 'HAPTICS', 
      active: userSettings.hapticsEnabled ?? true, 
      action: toggleHaptics,
      icon: '📳' 
    },
    {
      id: 'power',
      label: 'LOW_POWER',
      active: userSettings.lowPowerMode ?? false,
      action: toggleLowPower,
      icon: '🔋'
    }
  ];

  const handleToggle = (index: number) => {
    audio.playClick();
    settingItems[index].action();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedIndex(prev => (prev + 1) % settingItems.length);
          audio.playHover();
      }
      if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedIndex(prev => (prev - 1 + settingItems.length) % settingItems.length);
          audio.playHover();
      }
      if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle(focusedIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, settingItems]);

  return (
    <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 font-mono animate-in fade-in duration-300"
        style={{ zIndex: Z_LAYERS.TOOL_LAYER }}
    >
      <div 
        {...scrollGuard}
        className="w-full max-w-md border border-cyan-500/30 bg-black/95 p-6 shadow-[0_0_50px_rgba(0,240,255,0.05)] relative cyber-shape flex flex-col max-h-[80vh] overflow-y-auto custom-scrollbar"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-cyan-900/30 pb-2 shrink-0">
            <div className="flex flex-col">
                <h2 className="text-lg text-cyan-400 font-bold tracking-[0.2em] uppercase neon-text leading-none">
                    {UI_STRINGS.SETTINGS.HEADER_TITLE}
                </h2>
                <span className="text-[8px] text-cyan-800 tracking-widest mt-1">
                    {UI_STRINGS.SETTINGS.HEADER_SUB}
                </span>
            </div>
            <button 
                onClick={() => { audio.playClick(); setAppState(AppState.DESKTOP); }}
                className="w-8 h-8 flex items-center justify-center text-red-500 border border-red-900/40 hover:bg-red-900/20 transition-all text-lg font-bold cyber-shape leading-none"
            >
                ✕
            </button>
        </div>

        {/* Settings Grid */}
        <div className="flex flex-col gap-2 shrink-0">
          {settingItems.map((item, index) => (
            <div 
                key={item.id}
                onClick={() => { setFocusedIndex(index); handleToggle(index); }}
                className={`flex justify-between items-center p-3 border transition-all cursor-pointer group ${
                    focusedIndex === index 
                    ? 'bg-cyan-900/20 border-cyan-500/50' 
                    : 'bg-transparent border-cyan-900/20 hover:bg-cyan-900/10'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-1 h-8 transition-colors ${item.active ? 'bg-cyan-500 shadow-[0_0_8px_#00f0ff]' : 'bg-gray-800'}`}></div>
                    <div className="flex flex-col">
                         <span className={`text-xs font-bold tracking-widest transition-colors ${item.active ? 'text-cyan-100' : 'text-gray-500'}`}>
                            {item.label}
                         </span>
                         <span className="text-[8px] text-cyan-900 font-bold uppercase">
                            {item.active ? 'ACTIVE' : 'DISABLED'}
                         </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                     <span className="text-sm grayscale opacity-50">{item.icon}</span>
                     <button 
                        className={`w-12 h-6 flex items-center justify-center text-[9px] font-bold border transition-all cyber-shape ${
                            item.active 
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' 
                            : 'bg-gray-900 text-gray-600 border-gray-800'
                        }`}
                     >
                        {item.active ? 'ON' : 'OFF'}
                     </button>
                </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-8 border-t border-cyan-900/30 pt-4 flex flex-col gap-1 shrink-0 opacity-50">
            <div className="flex justify-between text-[7px] text-cyan-800 uppercase font-bold tracking-widest">
                <span>{UI_STRINGS.SETTINGS.MEM_OK}</span>
                <span>{UI_STRINGS.SETTINGS.SECURE_BOOT}</span>
            </div>
             <div className="w-full h-0.5 bg-cyan-900/20">
                <div className="w-[88%] h-full bg-cyan-800/40"></div>
            </div>
        </div>
      </div>
    </div>
  );
};