import React, { useState } from 'react';
import { Users, Check, Copy, ExternalLink } from 'lucide-react';

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
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    if (!roomCode) return;
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomCode);
    navigator.clipboard?.writeText(url.toString()).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    }).catch(() => {});
  };

  const statusColor =
    connectionStatus === 'connected'
      ? 'bg-[#30D158]'
      : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
      ? 'bg-[#FFD60A] animate-pulse'
      : 'bg-[#FF453A]';

  const statusLabel =
    connectionStatus === 'connected'
      ? 'В сети'
      : connectionStatus === 'connecting'
      ? 'Подключение'
      : connectionStatus === 'reconnecting'
      ? 'Переподключение'
      : 'Не в сети';

  return (
    <header className="w-full h-14 sm:h-16 bg-[#060608]/75 backdrop-blur-2xl border-b border-white/[0.08] sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 transition-all">
      {/* Brand */}
      <button
        type="button"
        onClick={onGoHome}
        aria-label="Maxify — на главную"
        className="ios-press flex items-center gap-2.5 cursor-pointer group bg-transparent border-0 p-0 text-left rounded-xl"
      >
        <img
          src="./icon.png"
          alt="Maxify"
          width="36"
          height="36"
          className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.45)] group-hover:scale-[1.03] transition-transform duration-300"
        />
        <span className="text-[17px] sm:text-[18px] font-semibold tracking-tight text-[#F5F5F7] sf-display leading-none">
          Maxify
        </span>
      </button>

      {/* Dynamic Island / Status Cluster */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {roomCode ? (
          <div className="animate-ios-pop flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-[#1C1C1E]/90 border border-white/[0.12] shadow-[inset_0_0.5px_0_rgba(255,255,255,0.2),0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            {/* Live status dot */}
            <div className="flex items-center gap-1.5 pr-1.5 border-r border-white/10" title={statusLabel}>
              <span className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="hidden md:inline text-[11px] font-medium text-white/70">
                {statusLabel}
              </span>
            </div>

            {/* Room code button with tap-to-copy */}
            <button
              type="button"
              onClick={handleCopyCode}
              title="Нажмите, чтобы скопировать ссылку-приглашение"
              className="ios-press flex items-center gap-1.5 px-2 py-0.5 rounded-full hover:bg-white/[0.08] text-xs cursor-pointer"
            >
              <span className="font-mono font-semibold tracking-wider text-[#F5F5F7] tabular-nums">
                {roomCode}
              </span>
              {copiedCode ? (
                <Check className="w-3 h-3 text-[#30D158] animate-ios-pop" />
              ) : (
                <Copy className="w-3 h-3 text-white/45" />
              )}
            </button>

            {isHost && (
              <span className="hidden xs:inline-flex bg-[#0A84FF]/20 text-[#409CFF] px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[#0A84FF]/30">
                Хост
              </span>
            )}

            {/* Participants count */}
            <div
              className="flex items-center gap-1 pl-1.5 border-l border-white/10 text-xs text-white/75"
              title="Участников в комнате"
            >
              <Users className="w-3.5 h-3.5 text-white/55" />
              <span className="font-semibold text-[#F5F5F7] tabular-nums">{participantCount}</span>
            </div>
          </div>
        ) : (
          <a
            href="https://github.com/Alexcrdaf/maxify-party"
            target="_blank"
            rel="noreferrer"
            className="ios-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.1] text-xs font-medium text-white/80 transition-colors"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        )}
      </div>
    </header>
  );
};
