import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  ScreenShare,
  Share2,
  LogOut,
  Link as LinkIcon,
  Check,
  Film,
  MessageSquare,
  MessageSquareOff,
  X,
  ChevronRight,
} from 'lucide-react';
import { VoiceChatService } from '../services/VoiceChatService';
import { ScreenCaptureService } from '../services/ScreenCaptureService';

interface RoomControlsProps {
  roomCode: string;
  isHost: boolean;
  isScreenSharing: boolean;
  hasActiveScreenStream?: boolean;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onDirectUrlSubmit: (url: string) => void;
  onLeaveRoom: () => void;
  voiceService: VoiceChatService;
  screenService: ScreenCaptureService;
  onVoiceStreamReady: (stream: MediaStream) => void;
  onStopVoiceStream?: () => void;
  onMicMuteChange?: (isMuted: boolean) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onNotify?: (message: string) => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  isChatVisible?: boolean;
  onToggleChat?: () => void;
}

export const RoomControls: React.FC<RoomControlsProps> = ({
  roomCode,
  isHost,
  isScreenSharing,
  hasActiveScreenStream = false,
  onStartScreenShare,
  onStopScreenShare,
  onDirectUrlSubmit,
  onLeaveRoom,
  voiceService,
  onVoiceStreamReady,
  onStopVoiceStream,
  onMicMuteChange,
  onSpeakingChange,
  onNotify,
  isChatVisible = true,
  onToggleChat,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);

  const demoPresets = [
    {
      name: 'Big Buck Bunny (1080p MP4)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    },
    {
      name: 'Elephants Dream (Sci-Fi Short)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    },
    {
      name: 'Sintel (Blender Animation)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    },
    {
      name: 'Tears of Steel (VFX Film)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    },
  ];

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomCode);
    const shareUrl = url.toString();

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  const handleLeave = () => {
    if (onStopVoiceStream) {
      onStopVoiceStream();
    }
    voiceService.stop();
    onLeaveRoom();
  };

  const toggleMic = async () => {
    if (isMicActive) {
      voiceService.mute(true);
      setIsMicActive(false);
      onMicMuteChange?.(true);
      onSpeakingChange?.(false);
    } else {
      try {
        const stream = await voiceService.startMicrophone(undefined, (speaking) => {
          onSpeakingChange?.(speaking);
        });
        voiceService.mute(false);
        setIsMicActive(true);
        onMicMuteChange?.(false);
        onVoiceStreamReady(stream);
      } catch (err: any) {
        onNotify?.(err.message || 'Ошибка включения микрофона');
      }
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onDirectUrlSubmit(urlInput.trim());
      setShowUrlModal(false);
      setUrlInput('');
    }
  };

  const isSharingActive = isScreenSharing || (isHost && hasActiveScreenStream);

  return (
    <div className="ios-material p-2 sm:p-2.5 rounded-[22px] flex flex-wrap items-center justify-between gap-2 animate-dock-3d">
      {/* Left: Share & Video Source */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleCopyLink}
          className="ios-press flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-[#F5F5F7] border border-white/[0.08] cursor-pointer"
          title="Скопировать ссылку-приглашение"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-[#30D158] animate-ios-pop" />
          ) : (
            <Share2 className="w-3.5 h-3.5 text-[#0A84FF]" />
          )}
          <span>{copied ? 'Скопировано' : 'Пригласить'}</span>
        </button>

        {isHost && (
          <button
            type="button"
            onClick={() => setShowUrlModal(true)}
            className="ios-press flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-[#F5F5F7] border border-white/[0.08] cursor-pointer"
          >
            <LinkIcon className="w-3.5 h-3.5 text-[#5AC8FA]" />
            <span className="hidden xs:inline">Источник</span>
            <span className="xs:hidden">Видео</span>
          </button>
        )}
      </div>

      <div className="h-5 w-px bg-white/10 hidden md:block" aria-hidden="true" />

      {/* Center: FaceTime-style Media Dock */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <button
          type="button"
          onClick={isSharingActive ? onStopScreenShare : onStartScreenShare}
          className={`ios-press flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border cursor-pointer ${
            isSharingActive
              ? 'bg-[#FF453A] border-[#FF6961]/50 text-white shadow-[0_6px_18px_rgba(255,69,58,0.35)]'
              : 'bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.08] text-[#F5F5F7]'
          }`}
          title={isSharingActive ? 'Остановить трансляцию экрана' : 'Транслировать вкладку со звуком'}
        >
          <ScreenShare className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isSharingActive ? 'Остановить экран' : 'Трансляция экрана'}
          </span>
        </button>

        <button
          type="button"
          onClick={toggleMic}
          className={`ios-press flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border cursor-pointer ${
            isMicActive
              ? 'bg-[#30D158]/20 border-[#30D158]/45 text-[#30D158] shadow-[0_4px_16px_rgba(48,209,88,0.2)]'
              : 'bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.08] text-white/85'
          }`}
          title={isMicActive ? 'Выключить микрофон' : 'Включить голосовой чат'}
        >
          {isMicActive ? (
            <>
              <Mic className="w-4 h-4 animate-pulse" />
              <span>Микрофон вкл</span>
            </>
          ) : (
            <>
              <MicOff className="w-4 h-4 text-white/60" />
              <span className="hidden xs:inline">Микрофон</span>
            </>
          )}
        </button>

        {onToggleChat && (
          <button
            type="button"
            onClick={onToggleChat}
            className={`ios-press flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border cursor-pointer ${
              isChatVisible
                ? 'bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.08] text-white/85'
                : 'bg-[#0A84FF]/20 border-[#0A84FF]/40 text-[#5AC8FA]'
            }`}
            title={isChatVisible ? 'Скрыть боковую панель' : 'Показать боковую панель'}
          >
            {isChatVisible ? (
              <>
                <MessageSquareOff className="w-4 h-4 text-white/65" />
                <span className="hidden sm:inline">Скрыть чат</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Панель</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="h-5 w-px bg-white/10 hidden md:block" aria-hidden="true" />

      {/* Right: Leave Room */}
      <button
        type="button"
        onClick={handleLeave}
        className="ios-press flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FF453A]/18 hover:bg-[#FF453A]/30 border border-[#FF453A]/35 text-[#FF6961] hover:text-white text-xs font-semibold cursor-pointer"
        title="Покинуть комнату"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Выйти</span>
      </button>

      {/* iOS 17 Sheet Modal for Media Source */}
      {showUrlModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-md"
          onClick={() => setShowUrlModal(false)}
        >
          <div
            className="animate-ios-sheet ios-material-elevated w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* iOS Sheet Grabber */}
            <div className="w-9 h-1 rounded-full bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-[#0A84FF]/20 flex items-center justify-center">
                  <Film className="w-4 h-4 text-[#0A84FF]" />
                </div>
                <h3 className="text-[16px] font-semibold text-white sf-display">
                  Источник видео
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="ios-press p-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grouped Presets */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45 px-1">
                Демо-видео (HD MP4)
              </div>
              <div className="rounded-[18px] overflow-hidden border border-white/[0.08] bg-white/[0.04] divide-y divide-white/[0.07]">
                {demoPresets.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => {
                      onDirectUrlSubmit(preset.url);
                      setShowUrlModal(false);
                    }}
                    className="ios-press w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.07] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-[13px] font-medium text-white truncate">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-white/40 truncate">{preset.url}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Direct URL Form */}
            <form onSubmit={handleUrlSubmit} className="space-y-2.5 pt-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/45 px-1">
                Прямая ссылка (.mp4 / .webm)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="ios-input flex-1 px-4 py-2.5 text-[13px]"
                />
                <button
                  type="submit"
                  className="ios-press px-4 py-2.5 rounded-[14px] bg-[#0A84FF] hover:brightness-110 text-white text-xs font-semibold cursor-pointer"
                >
                  Открыть
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
