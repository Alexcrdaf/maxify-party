import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Film,
  RotateCcw,
  RotateCw,
  RefreshCw,
  MessageSquare,
  MessageSquareOff,
  ScreenShare,
} from 'lucide-react';
import type { PlaybackState } from '../types';
import { APP_CONFIG } from '../config';

interface VideoPlayerProps {
  playbackState: PlaybackState;
  onUpdateState: (newState: Partial<PlaybackState>) => void;
  isHost: boolean;
  screenStream: MediaStream | null;
  onStopScreenShare?: () => void;
  onRequestScreenStream?: () => void;
  externalNotice?: { title: string; description: string } | null;
  children?: React.ReactNode;
  isChatOpenInPlayer?: boolean;
  onToggleInPlayerChat?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  playbackState,
  onUpdateState,
  isHost,
  screenStream,
  onStopScreenShare,
  onRequestScreenStream,
  externalNotice,
  children,
  isChatOpenInPlayer,
  onToggleInPlayerChat,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localShowChatOverlay, setLocalShowChatOverlay] = useState(false);
  const isSyncingRef = useRef(false);

  const showChatOverlay = isChatOpenInPlayer !== undefined ? isChatOpenInPlayer : localShowChatOverlay;
  const toggleChatOverlay = onToggleInPlayerChat || (() => setLocalShowChatOverlay((prev) => !prev));

  // Bind screenStream if available
  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
      // Host should be muted locally to avoid hearing their own tab echo,
      // but viewers MUST be unmuted so they can hear the screen/tab audio.
      if (isHost && screenStream.getVideoTracks()[0]?.readyState === 'live') {
        videoRef.current.muted = true;
      } else {
        videoRef.current.muted = isMuted;
        videoRef.current.volume = volume;
      }
      videoRef.current.play().catch((err) => {
        console.warn('Autoplay screen stream prevented:', err);
      });
    } else if (videoRef.current && !screenStream) {
      videoRef.current.srcObject = null;
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
    }
  }, [screenStream, isHost, isMuted, volume]);

  // Sync incoming state from RoomManager
  useEffect(() => {
    if (!videoRef.current || screenStream) return;

    const video = videoRef.current;
    isSyncingRef.current = true;

    // Source change
    if (playbackState.sourceUrl && video.src !== playbackState.sourceUrl) {
      video.src = playbackState.sourceUrl;
      video.load();
    }

    // Play/Pause sync
    if (playbackState.isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!playbackState.isPlaying && !video.paused) {
      video.pause();
    }

    // Time seek sync with threshold
    const timeDiff = Math.abs(video.currentTime - playbackState.currentTime);
    if (timeDiff > APP_CONFIG.syncThresholdSeconds) {
      video.currentTime = playbackState.currentTime;
    }

    // Rate sync
    if (playbackState.playbackRate && video.playbackRate !== playbackState.playbackRate) {
      video.playbackRate = playbackState.playbackRate;
    }

    setIsPlaying(playbackState.isPlaying);

    const timer = setTimeout(() => {
      isSyncingRef.current = false;
    }, 450);

    return () => clearTimeout(timer);
  }, [playbackState, screenStream]);

  // HTML5 Video Event Handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current || screenStream) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      onUpdateState({ isPlaying: false, currentTime: videoRef.current.currentTime });
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      onUpdateState({ isPlaying: true, currentTime: videoRef.current.currentTime });
    }
  };

  const handleSeek = (newTime: number) => {
    if (!videoRef.current || screenStream) return;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    onUpdateState({ currentTime: newTime });
  };

  const seekRelative = (deltaSec: number) => {
    if (!videoRef.current || screenStream) return;
    const next = Math.max(0, Math.min(duration || 1000, currentTime + deltaSec));
    handleSeek(next);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const next = !isMuted;
      videoRef.current.muted = next;
      setIsMuted(next);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      setVolume(newVol);
      setIsMuted(newVol === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const hasSource = Boolean(playbackState.sourceUrl || screenStream);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden bg-black aspect-video rounded-2xl border border-[#2d2d35] flex items-center justify-center group shadow-2xl"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="w-full h-full object-contain bg-black"
      />

      {/* Screen Sharing Active Bar Overlay */}
      {screenStream && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-semibold backdrop-blur-md shadow-lg border border-red-400/40 animate-pulse">
          <ScreenShare className="w-3.5 h-3.5" />
          <span>{isHost ? 'Вы транслируете экран' : 'Идет трансляция экрана'}</span>
          {onStopScreenShare && (
            <button
              onClick={onStopScreenShare}
              className="ml-2 px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold cursor-pointer transition-colors"
            >
              Остановить
            </button>
          )}
        </div>
      )}

      {/* Empty State Overlay */}
      {!hasSource && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0b0b0e]/95 z-20">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 mb-3.5">
            <Film className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">Экран совместного просмотра</h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
            Запустите трансляцию вкладки браузера со звуком или выберите тестовое видео.
          </p>
          {isHost && (
            <button
              onClick={() => onUpdateState({ sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', isPlaying: false })}
              className="py-2.5 px-5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-semibold text-xs rounded-xl transition-all shadow-md"
            >
              Запустить демо (Big Buck Bunny 1080p)
            </button>
          )}
        </div>
      )}

      {/* External platform notice (e.g. DRM / CSP) */}
      {externalNotice && (
        <div className="absolute top-4 left-4 right-4 z-30 p-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5 backdrop-blur-md shadow-lg">
          <div className="flex-1">
            <span className="font-semibold text-white block mb-0.5">{externalNotice.title}</span>
            <span>{externalNotice.description}</span>
          </div>
        </div>
      )}

      {/* Video Controls Bar Overlay */}
      {hasSource && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 flex flex-col gap-2.5">
          {/* Progress Seekbar (disabled when screen sharing) */}
          {!screenStream && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-300 w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-[11px] font-mono text-slate-400 w-10">
                {formatTime(duration)}
              </span>
            </div>
          )}

          {/* Bottom buttons row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!screenStream && (
                <>
                  <button
                    onClick={togglePlay}
                    className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center hover:bg-sky-400 transition-colors"
                    title={isPlaying ? 'Пауза' : 'Воспроизведение'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                  <button
                    onClick={() => seekRelative(-10)}
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs border border-white/10"
                    title="Назад 10 секунд"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => seekRelative(10)}
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs border border-white/10"
                    title="Вперёд 10 секунд"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Volume */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/10">
                <button onClick={toggleMute} className="text-slate-300 hover:text-white">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-16"
                />
              </div>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-2">
              {children && (
                <button
                  onClick={toggleChatOverlay}
                  className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors border ${
                    showChatOverlay
                      ? 'bg-purple-600/90 text-white border-purple-400/50 shadow-md'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-white/10'
                  }`}
                  title={showChatOverlay ? 'Скрыть чат в плеере' : 'Открыть чат прямо в плеере'}
                >
                  {showChatOverlay ? <MessageSquareOff className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{showChatOverlay ? 'Чат (вкл)' : 'Чат в видео'}</span>
                </button>
              )}

              {onRequestScreenStream && !isHost && (
                <button
                  onClick={onRequestScreenStream}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-sky-300 hover:text-white border border-sky-500/30 text-xs flex items-center gap-1.5 transition-colors"
                  title="Переподключить поток демонстрации"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Обновить видеопоток</span>
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10"
                title="Полноэкранный режим"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating overlay: inside player both in fullscreen and windowed mode */}
      {showChatOverlay && children && (
        <div className={`absolute z-40 flex flex-col pointer-events-auto shadow-2xl rounded-[28px] overflow-hidden border border-[#bf5af2]/35 bg-[#10051c]/90 backdrop-blur-2xl transition-all duration-200 ${
          isFullscreen
            ? 'top-4 right-4 w-80 max-h-[85%]'
            : 'top-3 right-3 sm:top-4 sm:right-4 w-72 sm:w-80 max-h-[82%]'
        }`}>
          <div className="flex items-center justify-between px-3.5 py-2 bg-white/[0.04] border-b border-[#bf5af2]/20">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#da8fff]" />
              Чат трансляции
            </span>
            <button
              onClick={toggleChatOverlay}
              className="text-zinc-400 hover:text-white p-1 rounded-lg text-xs hover:bg-white/10 transition-colors cursor-pointer"
              title="Закрыть чат в плеере"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col p-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
