import React from 'react';
import { Settings, Maximize, Palette, Hand, HelpCircle, Video, VideoOff } from 'lucide-react';
import { GestureState } from '../types';

interface ControlsProps {
  color: string;
  setColor: (c: string) => void;
  gesture: GestureState;
  onToggleFullscreen: () => void;
  cameraActive: boolean;
  setCameraActive: (active: boolean) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  color,
  setColor,
  gesture,
  onToggleFullscreen,
  cameraActive,
  setCameraActive
}) => {
  
  // Helper for gesture badges
  const getGestureBadgeStyle = (g: GestureState) => {
    switch (g) {
      case GestureState.CLOSED: return 'bg-red-500/80 text-white shadow-red-500/50';
      case GestureState.OPEN: return 'bg-green-500/80 text-white shadow-green-500/50';
      case GestureState.POINTING: return 'bg-blue-500/80 text-white shadow-blue-500/50';
      case GestureState.VICTORY: return 'bg-purple-500/80 text-white shadow-purple-500/50';
      default: return 'bg-gray-600 text-gray-300';
    }
  };

  const getGestureIcon = (g: GestureState) => {
     switch (g) {
      case GestureState.CLOSED: return '✊';
      case GestureState.OPEN: return '✋';
      case GestureState.POINTING: return '☝️';
      case GestureState.VICTORY: return '✌️';
      default: return '-';
    }
  };

  return (
    <div className="absolute top-4 right-4 z-50 w-72 flex flex-col gap-4">
      {/* Status Panel */}
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3 text-white/80 border-b border-white/10 pb-2">
          <Settings size={18} />
          <h2 className="font-semibold text-sm tracking-wide">CONTROL PANEL</h2>
        </div>

        {/* Gesture Status */}
        <div className="mb-4 bg-white/5 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Hand size={16} />
            <span>Gesture:</span>
          </div>
          <div className={`px-3 py-1 rounded text-xs font-bold transition-all duration-300 flex items-center gap-2 shadow-lg ${getGestureBadgeStyle(gesture)}`}>
            <span className="text-sm">{getGestureIcon(gesture)}</span>
            {gesture}
          </div>
        </div>

        {/* Color Picker */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <Palette size={16} />
            <span>Magic Tint</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="color" 
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
            />
            <input 
              type="text" 
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 rounded px-2 text-xs text-white focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={onToggleFullscreen}
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs py-2 rounded transition-all"
          >
            <Maximize size={14} />
            Fullscreen
          </button>
          <button 
            onClick={() => setCameraActive(!cameraActive)}
            className={`flex items-center justify-center gap-2 text-xs py-2 rounded transition-all ${cameraActive ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'}`}
          >
            {cameraActive ? <Video size={14} /> : <VideoOff size={14} />}
            {cameraActive ? 'Cam On' : 'Cam Off'}
          </button>
        </div>
      </div>

      {/* Guide Panel */}
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl">
         <div className="flex items-center gap-2 mb-3 text-white/80 border-b border-white/10 pb-2">
          <HelpCircle size={18} />
          <h2 className="font-semibold text-sm tracking-wide">SPELL GUIDE</h2>
        </div>
        
        <div className="space-y-3">
           <div className="flex items-center gap-3">
             <span className="text-xl w-6 text-center">✋</span>
             <div>
               <p className="text-xs font-bold text-green-400">OPEN HAND</p>
               <p className="text-[10px] text-gray-400">Cast Expansion Spell</p>
             </div>
           </div>
           
           <div className="flex items-center gap-3">
             <span className="text-xl w-6 text-center">✊</span>
             <div>
               <p className="text-xs font-bold text-red-400">CLOSED FIST</p>
               <p className="text-[10px] text-gray-400">Channel Energy (Contract)</p>
             </div>
           </div>

           <div className="flex items-center gap-3">
             <span className="text-xl w-6 text-center">☝️</span>
             <div>
               <p className="text-xs font-bold text-blue-400">INDEX FINGER</p>
               <p className="text-[10px] text-gray-400">Spirit Spiral</p>
             </div>
           </div>

           <div className="flex items-center gap-3">
             <span className="text-xl w-6 text-center">✌️</span>
             <div>
               <p className="text-xs font-bold text-purple-400">VICTORY</p>
               <p className="text-[10px] text-gray-400">Disco Party Mode</p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};