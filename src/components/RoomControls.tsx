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
  PanelRightClose,
  PanelRightOpen,
  EyeOff,
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
  onEnterCinemaMode?: () => void;
}

const demoPresets = [
  {
    name: 'Big Buck Bunny',
    meta: '1080p MP4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    name: 'Elephants Dream',
    meta: 'Sci-Fi, короткометражка',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
  {
    name: 'Sintel',
    meta: 'Blender, анимация',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  },
  {
    name: 'Tears of Steel',
    meta: 'VFX, фильм',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  },
];

export const RoomControls: React.FC<RoomControlsProps> = ({
  roomCode,
  isHost,
  isScreenSharing,
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
  onEnterCinemaMode,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomCode);
    const shareUrl = url.toString();

    const markCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    navigator.clipboard
      .writeText(shareUrl)
      .then(markCopied)
      .catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        markCopied();
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

  const btn = 'glass-btn h-10 px-3.5 rounded-full text-xs font-medium flex items-center gap-2';

  return (
    <div className="glass rounded-[28px] px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 anim-in">
      {/* Left */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button type="button" onClick={handleCopyLink} className={btn} title="Скопировать ссылку-приглашение">
          {copied ? (
            <Check className="w-4 h-4 text-[#30d158]" />
          ) : (
            <Share2 className="w-4 h-4 text-white/65" />
          )}
          <span>{copied ? 'Скопировано' : 'Пригласить'}</span>
        </button>

        {isHost && (
          <button
            type="button"
            onClick={() => setShowUrlModal(true)}
            className={btn}
            title="Открыть видео по ссылке"
          >
            <LinkIcon className="w-4 h-4 text-white/65" />
            <span className="hidden sm:inline">Видео по ссылке</span>
          </button>
        )}
      </div>

      {/* Center */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
          className={`glass-btn h-10 px-4 rounded-full text-xs font-semibold flex items-center gap-2 ${
            isScreenSharing ? 'glass-btn-red' : 'glass-btn-blue'
          }`}
          title={isScreenSharing ? 'Остановить показ экрана' : 'Показать вкладку или экран со звуком'}
        >
          <ScreenShare className="w-4 h-4" />
          <span>{isScreenSharing ? 'Завершить эфир' : 'Экран в эфир'}</span>
        </button>

        <button
          type="button"
          onClick={toggleMic}
          className={`glass-btn h-10 px-3.5 rounded-full text-xs font-medium flex items-center gap-2 ${
            isMicActive ? 'glass-btn-green' : ''
          }`}
          title={isMicActive ? 'Выключить микрофон' : 'Включить микрофон'}
          aria-pressed={isMicActive}
        >
          {isMicActive ? (
            <Mic className="w-4 h-4 animate-pulse" />
          ) : (
            <MicOff className="w-4 h-4 text-white/55" />
          )}
          <span className="hidden sm:inline">{isMicActive ? 'Микрофон вкл' : 'Микрофон'}</span>
        </button>

        {onEnterCinemaMode && (
          <button
            type="button"
            onClick={onEnterCinemaMode}
            className={btn}
            title="Скрыть интерфейс на время фильма (H)"
          >
            <EyeOff className="w-4 h-4 text-white/65" />
            <span className="hidden md:inline">Режим кино</span>
          </button>
        )}

        {onToggleChat && (
          <button
            type="button"
            onClick={onToggleChat}
            className={btn}
            title={isChatVisible ? 'Свернуть боковую панель' : 'Открыть боковую панель'}
            aria-pressed={isChatVisible}
          >
            {isChatVisible ? (
              <PanelRightClose className="w-4 h-4 text-white/65" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
            <span className="hidden lg:inline">{isChatVisible ? 'Скрыть панель' : 'Панель'}</span>
          </button>
        )}
      </div>

      {/* Right */}
      <button
        type="button"
        onClick={handleLeave}
        className="glass-btn h-10 px-3.5 rounded-full text-xs font-medium flex items-center gap-2 text-[#ff8a82] hover:text-white"
        title="Выйти из зала"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Выйти</span>
      </button>

      {/* Source sheet */}
      {showUrlModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-sm"
          onClick={() => setShowUrlModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Источник видео"
        >
          <div
            className="glass-strong anim-sheet w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 space-y-5 max-h-[92dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/25 mx-auto -mt-1 sm:hidden" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="glass-thin w-9 h-9 rounded-full flex items-center justify-center">
                  <Film className="w-4 h-4 text-white/80" />
                </div>
                <h3 className="text-[17px] font-semibold text-white font-display">Видео по ссылке</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                aria-label="Закрыть"
                className="glass-btn w-9 h-9 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-white/45 uppercase tracking-wider px-1">
                Тестовые ролики
              </div>
              <div className="rounded-3xl overflow-hidden bg-black/20 border border-white/10 divide-y divide-white/10">
                {demoPresets.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => {
                      onDirectUrlSubmit(preset.url);
                      setShowUrlModal(false);
                    }}
                    className="w-full px-4 py-3 flex items-center justify-between text-left bg-transparent border-0 hover:bg-white/[0.07] active:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-[14px] font-medium text-white truncate">{preset.name}</div>
                      <div className="text-[12px] text-white/45 truncate">{preset.meta}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleUrlSubmit} className="space-y-2">
              <label
                htmlFor="video-url"
                className="block text-[11px] font-semibold text-white/45 uppercase tracking-wider px-1"
              >
                Прямая ссылка (.mp4, .webm)
              </label>
              <div className="flex gap-2">
                <input
                  id="video-url"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/movie.mp4"
                  className="glass-input flex-1 min-w-0 rounded-full px-4 h-11 text-[13px]"
                />
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  className="glass-btn glass-btn-blue h-11 px-5 rounded-full text-[13px] font-semibold"
                >
                  Запустить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
