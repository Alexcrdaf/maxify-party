import React from 'react';
import { Wifi, WifiOff, Users, Sparkles, ExternalLink } from 'lucide-react';

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
    <header className="w-full h-16 bg-[#10051c]/70 backdrop-blur-2xl border-b border-[#bf5af2]/20 sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 transition-all">
      {/* Brand */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={onGoHome}
          aria-label="Maxify — на главную"
          className="flex items-center gap-3 cursor-pointer group bg-transparent border-0 p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bf5af2] rounded-2xl"
        >
          <div className="relative w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
            <img
              src="./icon.png"
              alt="Maxify"
              width="40"
              height="40"
              className="w-10 h-10 object-contain rounded-[14px] shadow-[0_8px_20px_rgba(168,85,247,0.55)]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = './icon.png';
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white syne group-hover:text-[#da8fff] transition-colors leading-none drop-shadow-sm">
              Maxify
            </span>
            <span className="text-[10px] uppercase font-semibold text-[#dcbcff]/70 tracking-widest mt-0.5">
              Watchparty
            </span>
          </div>
        </button>
      </div>

      {/* Right Action Cluster */}
      <div className="flex items-center gap-3">
        {roomCode ? (
          <>
            {/* Room code pill with iOS liquid styling */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.07] border border-[#bf5af2]/30 backdrop-blur-xl text-xs shadow-inner">
              <span className="text-[#dcbcff]/80 text-[11px]">Комната:</span>
              <span className="font-mono font-bold tracking-wider text-white bg-gradient-to-r from-[#da8fff] to-[#bf5af2] bg-clip-text text-transparent">
                {roomCode}
              </span>
              {isHost && (
                <span className="bg-[#bf5af2]/20 text-[#da8fff] px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#bf5af2]/40">
                  ХОСТ
                </span>
              )}
            </div>

            {/* Participants counter */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-xl text-xs text-[#dcbcff]"
              title="Участники онлайн"
            >
              <Users className="w-3.5 h-3.5 text-[#bf5af2]" />
              <span className="font-mono font-bold text-white">{participantCount}</span>
            </div>

            {/* Connection status */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-xl text-xs"
              title={`Статус соединения: ${connectionStatus}`}
            >
              {connectionStatus === 'connected' ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-medium text-[#dcbcff]/90 backdrop-blur-xl">
              <Sparkles className="w-3.5 h-3.5 text-[#bf5af2]" />
              <span>WebRTC Direct P2P</span>
            </div>
            <a
              href="https://github.com/Alexcrdaf/syncwave"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-white/20 text-xs font-semibold text-[#dcbcff] hover:text-white transition-all backdrop-blur-xl"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <button
              type="button"
              onClick={onGoHome}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-[#da8fff] to-[#bf5af2] hover:opacity-95 active:scale-95 text-white text-xs font-bold tracking-tight transition-all shadow-lg shadow-[#bf5af2]/35"
            >
              Новая комната
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
