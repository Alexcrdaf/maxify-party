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
} from 'lucide-react';
import { VoiceChatService } from '../services/VoiceChatService';
import { ScreenCaptureService } from '../services/ScreenCaptureService';

interface RoomControlsProps {
  roomCode: string;
  isHost: boolean;
  isScreenSharing: boolean;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onDirectUrlSubmit: (url: string) => void;
  onLeaveRoom: () => void;
  voiceService: VoiceChatService;
  screenService: ScreenCaptureService;
  onVoiceStreamReady: (stream: MediaStream) => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
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
}) => {
  const [copied, setCopied] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);

  const demoPresets = [
    { name: 'Big Buck Bunny (1080p MP4)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
    { name: 'Elephants Dream (Sci-Fi Short)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
    { name: 'Sintel (Blender Animation)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
    { name: 'Tears of Steel (VFX Film)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
  ];

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMic = async () => {
    if (isMicActive) {
      voiceService.stop();
      setIsMicActive(false);
    } else {
      try {
        const stream = await voiceService.startMicrophone();
        setIsMicActive(true);
        onVoiceStreamReady(stream);
      } catch (err: any) {
        alert(err.message || 'Ошибка включения микрофона');
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
    <div className="glass-panel p-3.5 flex flex-wrap items-center justify-between gap-3">
      {/* Left controls: Share invite & Video source */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleCopyLink}
          className="btn btn-ghost text-xs"
          title="Скопировать ссылку для приглашения друга"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-sky-400" />}
          <span>{copied ? 'Скопировано!' : 'Пригласить друга'}</span>
        </button>

        {isHost && (
          <button
            onClick={() => setShowUrlModal(true)}
            className="btn btn-ghost text-xs"
          >
            <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Выбрать видео / Ссылку</span>
          </button>
        )}
      </div>

      {/* Center controls: Screen share & Microphone */}
      <div className="flex items-center gap-2">
        <button
          onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
          className={`btn text-xs ${
            isScreenSharing
              ? 'btn-danger'
              : 'btn-ghost'
          }`}
          title={isScreenSharing ? 'Остановить захват' : 'Транслировать вкладку со звуком'}
        >
          <ScreenShare className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isScreenSharing ? 'Остановить экран' : 'Транслировать вкладку'}
          </span>
        </button>

        <button
          onClick={toggleMic}
          className={`btn text-xs ${
            isMicActive
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'btn-ghost'
          }`}
          title={isMicActive ? 'Выключить микрофон' : 'Включить голосовой чат'}
        >
          {isMicActive ? (
            <>
              <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Голос активен</span>
            </>
          ) : (
            <>
              <MicOff className="w-4 h-4 text-slate-400" />
              <span>Микрофон</span>
            </>
          )}
        </button>
      </div>

      {/* Right controls: Leave Room */}
      <div>
        <button
          onClick={onLeaveRoom}
          className="btn btn-danger text-xs"
          title="Покинуть сессию"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </div>

      {/* URL Selector Modal in Maxify Style */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel max-w-lg w-full p-6 border border-white/15 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white syne">Выбор источника медиа</h3>
              </div>
              <button
                onClick={() => setShowUrlModal(false)}
                className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Готовые демо-фильмы (HD MP4):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {demoPresets.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => {
                      onDirectUrlSubmit(preset.url);
                      setShowUrlModal(false);
                    }}
                    className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-left text-xs text-slate-200 transition-colors"
                  >
                    <div className="font-semibold text-white truncate">{preset.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{preset.url}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct URL input */}
            <form onSubmit={handleUrlSubmit} className="space-y-3 pt-2">
              <label className="block text-xs font-medium text-slate-300">
                Прямая ссылка на MP4, WebM или видео YouTube:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="flex-1 px-3.5 py-2 text-xs"
                />
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  className="btn btn-primary text-xs px-4"
                >
                  Загрузить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
