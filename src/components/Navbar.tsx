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
      ? 'bg-[#30d158] shadow-[0_0_8px_#30d158]'
      : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
      ? 'bg-[#ffd60a] animate-pulse'
      : 'bg-[#ff453a]';

  const statusText =
    connectionStatus === 'connected'
      ? 'Соединение установлено'
      : connectionStatus === 'connecting'
      ? 'Соединение…'
      : connectionStatus === 'reconnecting'
      ? 'Переподключение…'
      : 'Нет соединения';

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4 pointer-events-none">
      <div className="glass glass-refract pointer-events-auto mx-auto max-w-[1720px] h-14 rounded-full flex items-center justify-between pl-3 pr-2.5 sm:pl-4">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onGoHome}
            aria-label="Maxify — на главную"
            className="flex items-center gap-2.5 cursor-pointer bg-transparent border-0 p-0 text-left rounded-full transition-transform duration-200 active:scale-95"
          >
            <img
              src="./icon.png"
              alt=""
              width="30"
              height="30"
              className="w-[30px] h-[30px] object-contain rounded-[9px] shadow-[0_3px_10px_rgba(0,0,0,0.5)]"
            />
            <span className="text-[16px] font-semibold tracking-tight text-white font-display">
              Maxify
            </span>
          </button>

          {roomCode && activeStreamerName && (
            <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-white/15 text-xs min-w-0">
              <Radio className="w-3.5 h-3.5 text-[#ff453a] animate-pulse shrink-0" />
              <span className="text-white/55">Эфир</span>
              <span className="font-medium text-white truncate max-w-[160px]">
                {activeStreamerName}
              </span>
            </div>
          )}
        </div>

        {/* Right */}
        {roomCode ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="glass-thin h-9 rounded-full flex items-center gap-2 pl-3 pr-3 text-xs">
              <span className={`w-2 h-2 rounded-full ${dotClass}`} title={statusText} />

              <button
                type="button"
                onClick={handleCopyInvite}
                title="Скопировать ссылку-приглашение"
                className="flex items-center gap-1.5 font-mono font-semibold tracking-wider text-white cursor-pointer bg-transparent border-0 p-0 transition-opacity hover:opacity-80"
              >
                <span className="tabular-nums">{roomCode}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[#30d158]" />
                ) : (
                  <Copy className="w-3 h-3 text-white/50" />
                )}
              </button>

              {isHost && (
                <span className="hidden sm:inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#ffd60a]/20 text-[#ffd60a]">
                  Ведущий
                </span>
              )}

              <span className="flex items-center gap-1 pl-2 border-l border-white/15 text-white/80" title="Зрителей в зале">
                <Users className="w-3.5 h-3.5 text-white/55" />
                <span className="font-medium tabular-nums">{participantCount}</span>
              </span>
            </div>

            {onEnterCinemaMode && (
              <button
                type="button"
                onClick={onEnterCinemaMode}
                title="Скрыть интерфейс на время фильма (клавиша H)"
                className="glass-btn h-9 px-3 rounded-full text-xs font-medium flex items-center gap-1.5"
              >
                <EyeOff className="w-3.5 h-3.5 text-white/70" />
                <span className="hidden sm:inline">Скрыть UI</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-white/55 pr-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#30d158]" />
            <span>WebRTC P2P</span>
          </div>
        )}
      </div>
    </header>
  );
};
