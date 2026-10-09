import React from 'react';
import { Radio, Heart, ExternalLink } from 'lucide-react';

interface NavbarProps {
  onGoHome?: () => void;
  roomCode?: string;
  isHost?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onGoHome, roomCode, isHost }) => {
  return (
    <header className="w-full h-16 border-b border-white/10 liquid-glass sticky top-0 z-50 flex items-center justify-between px-6">
      <div
        onClick={onGoHome}
        className="flex items-center gap-3 cursor-pointer group transition-transform active:scale-95"
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-all">
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-300 bg-clip-text text-transparent">
            SyncWave
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Boosty Support Button */}
        <a
          href="https://boosty.to/vostguy/donate"
          target="_blank"
          rel="noreferrer"
          className="liquid-glass-boosty px-3 py-1.5 rounded-xl text-orange-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 group"
          title="Поддержать автора на Boosty"
        >
          <Heart className="w-3.5 h-3.5 text-orange-400 fill-orange-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Поддержать автора</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>

        {roomCode && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 shadow-inner">
            <span className="text-xs text-slate-400">Комната:</span>
            <span className="text-sm font-mono font-bold tracking-wider text-purple-400 selectable-text room-code-badge">{roomCode}</span>
            {isHost && (
              <span className="text-[10px] bg-purple-500/25 text-purple-200 px-1.5 py-0.5 rounded-lg font-medium border border-purple-500/35">
                Ведущий
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
