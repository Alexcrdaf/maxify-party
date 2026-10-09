import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Monitor,
  Share2,
  LogOut,
  Wifi,
  Link as LinkIcon,
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
  screenService,
  onVoiceStreamReady,
  connectionStatus,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);

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

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'connecting':
      case 'reconnecting':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse';
      case 'disconnected':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-4.5 border border-white/8 shadow-xl flex flex-wrap items-center justify-between gap-4">
      {/* Left controls: Media Source & Sharing */}
      <div className="flex items-center gap-3 flex-wrap">
        {isHost && (
          <>
            <button
              onClick={() => setShowUrlModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition border border-purple-400/30 shadow-lg shadow-purple-600/25 active:scale-95"
            >
              <LinkIcon className="w-4 h-4" />
              <span>Источник видео</span>
            </button>

            {screenService.isSupported() && (
              <button
                onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition border active:scale-95 ${
                  isScreenSharing
                    ? 'bg-red-500/20 text-red-200 border-red-500/40 hover:bg-red-500/30'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-white/10'
                }`}
              >
                <Monitor className="w-4 h-4 text-blue-400" />
                <span>{isScreenSharing ? 'Остановить экран' : 'Транслировать вкладку'}</span>
              </button>
            )}
          </>
        )}

        {/* Voice Chat Button */}
        <button
          onClick={toggleMic}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition border active:scale-95 ${
            isMicActive
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-white/10'
          }`}
        >
          {isMicActive ? <Mic className="w-4 h-4 text-emerald-400 animate-pulse" /> : <MicOff className="w-4 h-4 text-slate-400" />}
          <span>{isMicActive ? 'Микрофон ВКЛ' : 'Включить голос'}</span>
        </button>
      </div>

      {/* Right controls: Share Room, Connection Status & Leave */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-medium ${getStatusColor()}`}
        >
          <Wifi className="w-3.5 h-3.5" />
          <span className="capitalize">{connectionStatus}</span>
        </div>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 text-xs font-semibold transition active:scale-95"
        >
          <Share2 className="w-4 h-4 text-purple-400" />
          <span>{copied ? 'Скопировано!' : 'Пригласить'}</span>
        </button>

        <button
          onClick={onLeaveRoom}
          className="p-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition active:scale-95"
          title="Выйти из комнаты"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Modal for Media URL */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel bg-slate-900/95 rounded-3xl p-6 max-w-md w-full border border-white/15 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-purple-400" />
              Выбрать источник видео
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Вставьте прямую ссылку на медиафайл (MP4, WebM) или адрес веб-страницы/сервиса.
            </p>
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/video.mp4"
                className="w-full bg-slate-950/90 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold transition shadow-lg shadow-purple-600/30"
                >
                  Загрузить видео
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
