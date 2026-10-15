import React from 'react';
import { Wifi, WifiOff, Users, Shield } from 'lucide-react';

interface NavbarProps {
  onGoHome?: () => void;
  roomCode?: string;
  isHost?: boolean;
  participantCount?: number;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
}

export const Navbar: React.FC<NavbarProps> = ({
  onGoHome,
  roomCode,
  isHost,
  participantCount = 1,
  connectionStatus = 'disconnected',
}) => {
  return (
    <header className="w-full h-18 border-b border-white/10 glass-panel sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 transition-colors">
      {/* Brand logo & identity */}
      <button
        type="button"
        onClick={onGoHome}
        aria-label="Maxify — на главную страницу"
        className="flex items-center gap-3.5 cursor-pointer group transition-transform active:scale-95 text-left bg-transparent border-0 p-0"
      >
        <div className="relative w-11 h-11 rounded-2xl overflow-hidden p-0.5 border border-white/20 shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-all">
          <img
            src="./icon-192.png"
            alt=""
            aria-hidden="true"
            width="44"
            height="44"
            fetchPriority="high"
            className="w-full h-full object-cover rounded-xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = './icon.png';
            }}
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight syne bg-gradient-to-r from-white via-purple-100 to-fuchsia-400 bg-clip-text text-transparent">
              Maxify
            </span>
            <span className="text-[10px] font-semibold text-purple-300 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/35">
              P2P Sync
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block -mt-0.5">Один экран. Одна компания.</p>
        </div>
      </button>

      {/* Room metadata when inside an active party */}
      {roomCode && (
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Connection state pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
              connectionStatus === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : connectionStatus === 'connecting'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {connectionStatus === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline">
              {connectionStatus === 'connected' ? 'P2P Online' : 'Подключение...'}
            </span>
          </div>

          {/* Active room code & participants badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 shadow-inner">
            <span className="text-[11px] text-slate-400">Комната:</span>
            <span className="text-sm font-mono font-bold tracking-widest text-sky-400">{roomCode}</span>
            {isHost ? (
              <span className="flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg font-medium border border-amber-500/30">
                <Shield className="w-3 h-3 text-amber-300" />
                Ведущий
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-white/10">
                <Users className="w-3 h-3 text-slate-400" />
                {participantCount}
              </span>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
