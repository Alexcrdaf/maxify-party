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

  return (
    <div className="studio-panel px-3 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2">
      {/* Left: Invite & Source */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={handleCopyLink}
          className="tactile h-9 px-3 rounded-xl bg-[#18181D] hover:bg-[#222229] border border-white/[0.07] text-xs font-medium text-zinc-200 flex items-center gap-1.5 cursor-pointer"
          title="Скопировать пригласительную ссылку"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Share2 className="w-3.5 h-3.5 text-zinc-400" />
          )}
          <span>{copied ? 'Ссылка скопирована' : 'Пригласить'}</span>
        </button>

        {isHost && (
          <button
            type="button"
            onClick={() => setShowUrlModal(true)}
            className="tactile h-9 px-3 rounded-xl bg-[#18181D] hover:bg-[#222229] border border-white/[0.07] text-xs font-medium text-zinc-200 flex items-center gap-1.5 cursor-pointer"
            title="Вставить прямую ссылку на видео"
          >
            <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span>Ссылка на видео</span>
          </button>
        )}
      </div>

      {/* Center: Broadcast, Voice & View Controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
          className={`tactile h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer border ${
            isScreenSharing
              ? 'bg-rose-500 hover:bg-rose-600 border-rose-400/40 text-white'
              : 'bg-[#FAFAFA] hover:bg-white border-transparent text-[#09090B]'
          }`}
          title={
            isScreenSharing
              ? 'Остановить демонстрацию вашего экрана'
              : 'Поделиться вкладкой браузера или экраном со звуком'
          }
        >
          <ScreenShare className="w-3.5 h-3.5" />
          <span>{isScreenSharing ? 'Завершить эфир' : 'Экран в эфир'}</span>
        </button>

        <button
          type="button"
          onClick={toggleMic}
          className={`tactile h-9 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 border cursor-pointer ${
            isMicActive
              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
              : 'bg-[#18181D] hover:bg-[#222229] border-white/[0.07] text-zinc-300'
          }`}
          title={isMicActive ? 'Выключить микрофон' : 'Включить голосовой чат'}
        >
          {isMicActive ? (
            <>
              <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Голос вкл</span>
            </>
          ) : (
            <>
              <MicOff className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">Микрофон</span>
            </>
          )}
        </button>

        {onEnterCinemaMode && (
          <button
            type="button"
            onClick={onEnterCinemaMode}
            className="tactile h-9 px-3 rounded-xl bg-[#18181D] hover:bg-[#222229] border border-white/[0.07] text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            title="Выключить весь интерфейс для просмотра фильма (клавиша H)"
          >
            <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">Режим кино</span>
          </button>
        )}

        {onToggleChat && (
          <button
            type="button"
            onClick={onToggleChat}
            className={`tactile h-9 px-3 rounded-xl text-xs font-medium border flex items-center gap-1.5 cursor-pointer ${
              isChatVisible
                ? 'bg-[#18181D] hover:bg-[#222229] border-white/[0.07] text-zinc-300'
                : 'bg-white/[0.12] border-white/20 text-white'
            }`}
            title={isChatVisible ? 'Свернуть боковую панель' : 'Открыть боковую панель'}
          >
            {isChatVisible ? (
              <PanelRightClose className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline">{isChatVisible ? 'Скрыть панель' : 'Чат'}</span>
          </button>
        )}
      </div>

      {/* Right: Leave */}
      <button
        type="button"
        onClick={handleLeave}
        className="tactile h-9 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 hover:text-rose-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
        title="Выйти из зала"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Выйти</span>
      </button>

      {/* Media Source Modal */}
      {showUrlModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setShowUrlModal(false)}
        >
          <div
            className="animate-panel-in studio-panel w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-semibold text-[#FAFAFA] font-display">
                  Открыть видео по ссылке
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="tactile p-1 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Готовые HD-ролики для проверки синхронизации
              </div>
              <div className="rounded-xl overflow-hidden border border-white/[0.07] bg-[#141418] divide-y divide-white/[0.06]">
                {demoPresets.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => {
                      onDirectUrlSubmit(preset.url);
                      setShowUrlModal(false);
                    }}
                    className="tactile w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.05] cursor-pointer"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-xs font-medium text-zinc-200 truncate">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">{preset.url}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleUrlSubmit} className="space-y-2 pt-1">
              <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Прямой адрес файла (.mp4, .webm)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/movie.mp4"
                  className="studio-input flex-1 rounded-xl px-3.5 py-2.5 text-xs"
                />
                <button
                  type="submit"
                  className="tactile px-4 py-2.5 rounded-xl bg-[#FAFAFA] hover:bg-white text-[#09090B] text-xs font-semibold cursor-pointer"
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
