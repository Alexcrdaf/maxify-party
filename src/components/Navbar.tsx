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
    <header className="w-full h-14 bg-[#0e0e10]/90 backdrop-blur-md border-b border-[#26262c] sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6">
      {/* Brand & Left Navigation */}
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onGoHome}
          aria-label="Maxify — на главную"
          className="flex items-center gap-2.5 cursor-pointer group bg-transparent border-0 p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg"
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-purple-600/20 group-hover:bg-purple-600/30 transition-colors">
            <img
              src="./icon.png"
              alt="Maxify"
              width="28"
              height="28"
              className="w-7 h-7 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = './icon.png';
              }}
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-white syne group-hover:text-purple-300 transition-colors">
            Maxify
          </span>
        </button>

        {/* Section links like Twitch */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
          <span className="px-3 py-1.5 rounded-md text-white bg-white/10 cursor-default">
            Совместный просмотр
          </span>
        </nav>
      </div>

      {/* Right Actions / Room status */}
      <div className="flex items-center gap-3">
        {roomCode ? (
          <>
            {/* Connection Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {connectionStatus === 'connected' ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              <span>{connectionStatus === 'connected' ? 'P2P Online' : 'Подключение'}</span>
            </div>

            {/* Room Code Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#18181b] border border-[#2d2d35] text-xs">
              <span className="text-zinc-400">Комната</span>
              <span className="font-mono font-bold text-purple-400 tracking-wider">{roomCode}</span>
              {isHost ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-medium border border-amber-500/30">
                  <Shield className="w-3 h-3" />
                  Ведущий
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] bg-[#26262c] text-zinc-300 px-1.5 py-0.5 rounded">
                  <Users className="w-3 h-3" />
                  {participantCount}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Готов к стриму</span>
          </div>
        )}
      </div>
    </header>
  );
};
