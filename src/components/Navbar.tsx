import React, { useState } from 'react';
import { Users, Check, Copy, EyeOff, Radio } from 'lucide-react';

interface NavbarProps {
  onGoHome?: () => void;
  roomCode?: string;
  isHost?: boolean;
  participantCount?: number;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  activeStreamerName?: string | null;
  onEnterCinemaMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onGoHome,
  roomCode,
  isHost,
  participantCount = 1,
  connectionStatus = 'disconnected',
  activeStreamerName,
  onEnterCinemaMode,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = () => {
    if (!roomCode) return;
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomCode);
    navigator.clipboard
      ?.writeText(url.toString())
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  };

  const dotClass =
    connectionStatus === 'connected'
      ? 'bg-emerald-500'
      : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
      ? 'bg-amber-400 animate-pulse'
      : 'bg-rose-500';

  const statusText =
    connectionStatus === 'connected'
      ? 'P2P активен'
      : connectionStatus === 'connecting'
      ? 'Соединение…'
      : connectionStatus === 'reconnecting'
      ? 'Переподключение…'
      : 'Офлайн';

  return (
    <header className="w-full h-13 bg-[#09090B]/90 backdrop-blur-md border-b border-white/[0.07] sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onGoHome}
          aria-label="Maxify — на главную"
          className="tactile flex items-center gap-2.5 cursor-pointer bg-transparent border-0 p-0 text-left rounded-lg"
        >
          <img
            src="./icon.png"
            alt="Maxify"
            width="28"
            height="28"
            className="w-7 h-7 object-contain rounded-[7px]"
          />
          <span className="text-[15px] font-semibold tracking-tight text-[#FAFAFA] font-display">
            Maxify
          </span>
        </button>

        {roomCode && activeStreamerName && (
          <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-white/10 text-xs text-zinc-300">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span className="text-zinc-400">Эфир:</span>
            <span className="font-medium text-white truncate max-w-[140px]">
              {activeStreamerName}
            </span>
          </div>
        )}
      </div>

      {/* Right: Room Controls or Lobby Link */}
      {roomCode ? (
        <div className="flex items-center gap-2">
          {/* Status + Code Capsule */}
          <div className="flex items-center h-8 rounded-lg bg-[#141418] border border-white/[0.08] px-2.5 gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${dotClass}`} title={statusText} />

            <button
              type="button"
              onClick={handleCopyInvite}
              title="Скопировать ссылку-приглашение"
              className="tactile flex items-center gap-1.5 font-mono font-semibold tracking-wider text-[#FAFAFA] hover:text-white cursor-pointer"
            >
              <span className="tabular-nums">{roomCode}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-zinc-500" />
              )}
            </button>

            {isHost && (
              <span className="hidden sm:inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                Ведущий
              </span>
            )}

            <div
              className="flex items-center gap-1 pl-2 border-l border-white/[0.08] text-zinc-300"
              title="Зрителей в зале"
            >
              <Users className="w-3.5 h-3.5 text-zinc-500" />
              <span className="font-medium tabular-nums">{participantCount}</span>
            </div>
          </div>

          {/* Lights-Off / Hide UI Quick Trigger */}
          {onEnterCinemaMode && (
            <button
              type="button"
              onClick={onEnterCinemaMode}
              title="Выключить интерфейс для просмотра фильма (клавиша H)"
              className="tactile h-8 px-2.5 rounded-lg bg-[#141418] hover:bg-[#1E1E24] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Скрыть UI</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>WebRTC P2P</span>
        </div>
      )}
    </header>
  );
};
