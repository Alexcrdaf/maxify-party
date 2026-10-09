import React from 'react';
import { Radio } from 'lucide-react';

interface NavbarProps {
  onGoHome?: () => void;
  roomCode?: string;
  isHost?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onGoHome, roomCode, isHost }) => {
  return (
    <header className="w-full h-16 border-b border-white/5 glass-panel sticky top-0 z-50 flex items-center justify-between px-6">
      <div
        onClick={onGoHome}
        className="flex items-center gap-3 cursor-pointer group transition-transform active:scale-95"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
            SyncWave
          </span>
          <span className="hidden sm:inline-block ml-2 text-xs text-purple-400 font-medium px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
            v1.0 P2P
          </span>
        </div>
      </div>

      {roomCode && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700/50">
            <span className="text-xs text-slate-400">Комната:</span>
            <span className="text-sm font-mono font-bold tracking-wider text-purple-400">{roomCode}</span>
            {isHost && (
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-medium border border-purple-500/30">
                Ведущий
              </span>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
