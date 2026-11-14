import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  RefreshCw,
  MessageSquare,
  MessageSquareOff,
  ScreenShare,
  X,
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

  // Sync fullscreen state when user exits via Esc
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Bind screenStream only when stream or host role changes (never on volume/mute changes)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (screenStream) {
      video.srcObject = screenStream;
      video.play().catch((err) => {
        console.warn('Autoplay screen stream prevented:', err);
      });
    } else {
      video.srcObject = null;
    }
  }, [screenStream]);

  // Apply volume & mute independently without interrupting stream playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (screenStream && isHost && screenStream.getVideoTracks()[0]?.readyState === 'live') {
      // Host stays muted locally to prevent tab audio echo
      video.muted = true;
    } else {
      video.muted = isMuted;
      video.volume = volume;
    }
  }, [screenStream, isHost, isMuted, volume]);

  // Sync incoming playbackState from RoomManager
  useEffect(() => {
    if (!videoRef.current || screenStream) return;

    const video = videoRef.current;
    isSyncingRef.current = true;

    if (playbackState.sourceUrl && video.src !== playbackState.sourceUrl) {
      video.src = playbackState.sourceUrl;
      video.load();
    }

    if (playbackState.isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!playbackState.isPlaying && !video.paused) {
      video.pause();
    }

    const timeDiff = Math.abs(video.currentTime - playbackState.currentTime);
    if (timeDiff > APP_CONFIG.syncThresholdSeconds) {
      video.currentTime = playbackState.currentTime;
    }

    if (playbackState.playbackRate && video.playbackRate !== playbackState.playbackRate) {
      video.playbackRate = playbackState.playbackRate;
    }

    setIsPlaying(playbackState.isPlaying);

    const timer = setTimeout(() => {
      isSyncingRef.current = false;
    }, 450);

    return () => clearTimeout(timer);
  }, [playbackState, screenStream]);

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
    } else {
      document.exitFullscreen().catch(() => {});
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
      className="relative overflow-hidden bg-[#060608] aspect-video rounded-[24px] border border-white/[0.11] flex items-center justify-center group shadow-[0_28px_70px_rgba(0,0,0,0.72)] animate-theater-3d"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onClick={hasSource && !screenStream ? togglePlay : undefined}
        className="w-full h-full object-contain bg-black"
      />

      {/* Screen Sharing Live Dynamic Pill */}
      {screenStream && (
        <div className="animate-ios-pop absolute top-3.5 left-3.5 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C1C1E]/85 text-white text-xs font-medium backdrop-blur-2xl shadow-lg border border-white/[0.14]">
          <span className="w-2 h-2 rounded-full bg-[#FF453A] animate-pulse" />
          <ScreenShare className="w-3.5 h-3.5 text-white/80" />
          <span>{isHost ? 'Ваш экран в эфире' : 'Трансляция экрана'}</span>
          {onStopScreenShare && (
            <button
              type="button"
              onClick={onStopScreenShare}
              className="ios-press ml-1 px-2.5 py-0.5 rounded-full bg-[#FF453A] hover:bg-[#FF6961] text-white text-[11px] font-semibold cursor-pointer"
            >
              Стоп
            </button>
          )}
        </div>
      )}

      {/* Empty State: Minimal Projector Standby */}
      {!hasSource && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05)_0%,rgba(6,6,8,0.98)_70%)] z-20">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-white/40 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <span>Ожидание источника</span>
          </div>
          <h3 className="text-[19px] sm:text-[22px] font-semibold text-[#F5F5F7] sf-display mb-1.5">
            Экран готов к показу
          </h3>
          <p className="text-[13px] text-white/50 max-w-sm mb-6 leading-relaxed">
            Запустите трансляцию вкладки на панели ниже или откройте видео по прямой ссылке.
          </p>
          {isHost && (
            <button
              type="button"
              onClick={() =>
                onUpdateState({
                  sourceUrl:
                    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                  sourceType: 'direct_video',
                  currentTime: 0,
                  isPlaying: false,
                })
              }
              className="ios-press py-2.5 px-5 rounded-full bg-[#F5F5F7] hover:bg-white text-[#000000] font-semibold text-xs shadow-[0_8px_24px_rgba(255,255,255,0.14)] cursor-pointer"
            >
              Запустить тестовый ролик
            </button>
          )}
        </div>
      )}

      {/* External platform notice */}
      {externalNotice && (
        <div className="animate-ios-toast absolute top-4 left-4 right-4 z-30 p-3.5 rounded-[18px] ios-material-elevated text-xs text-white/85 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-[#FFD60A] mt-1.5 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-white block mb-0.5">{externalNotice.title}</span>
            <span className="text-white/65 leading-relaxed">{externalNotice.description}</span>
          </div>
        </div>
      )}

      {/* Apple TV / iOS 17 Floating Video Controls */}
      {hasSource && (
        <div className="absolute bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-4 rounded-[20px] ios-material-elevated px-3.5 py-2.5 sm:px-4 sm:py-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-250 z-30 flex flex-col gap-2">
          {/* Seekbar */}
          {!screenStream && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono tabular-nums text-white/75 w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="ios-slider flex-1"
              />
              <span className="text-[11px] font-mono tabular-nums text-white/50 w-10">
                {formatTime(duration)}
              </span>
            </div>
          )}

          {/* Controls row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {!screenStream && (
                <>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="ios-press w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 cursor-pointer"
                    title={isPlaying ? 'Пауза' : 'Воспроизведение'}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => seekRelative(-10)}
                    className="ios-press p-2 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-white/85 cursor-pointer"
                    title="Назад 10 секунд"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => seekRelative(10)}
                    className="ios-press p-2 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-white/85 cursor-pointer"
                    title="Вперёд 10 секунд"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Volume */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/[0.08]">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="ios-press text-white/80 hover:text-white cursor-pointer"
                  title={isMuted ? 'Включить звук' : 'Выключить звук'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="ios-slider w-14 sm:w-16"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {children && (
                <button
                  type="button"
                  onClick={toggleChatOverlay}
                  className={`ios-press px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                    showChatOverlay
                      ? 'bg-[#0A84FF] text-white'
                      : 'bg-white/[0.1] hover:bg-white/[0.18] text-white/85'
                  }`}
                  title={showChatOverlay ? 'Скрыть чат в плеере' : 'Открыть чат в плеере'}
                >
                  {showChatOverlay ? (
                    <MessageSquareOff className="w-3.5 h-3.5" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{showChatOverlay ? 'Скрыть чат' : 'Чат'}</span>
                </button>
              )}

              {onRequestScreenStream && !isHost && (
                <button
                  type="button"
                  onClick={onRequestScreenStream}
                  className="ios-press px-3 py-1.5 rounded-full bg-white/[0.1] hover:bg-white/[0.18] text-[#5AC8FA] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  title="Переподключить поток демонстрации"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Обновить</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleFullscreen}
                className="ios-press p-2 rounded-full bg-white/[0.1] hover:bg-white/[0.18] text-white/85 cursor-pointer"
                title="Полноэкранный режим"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Single-Header iOS Floating Chat Overlay */}
      {showChatOverlay && children && (
        <div
          className={`animate-ios-pop absolute z-40 flex flex-col pointer-events-auto rounded-[24px] overflow-hidden ios-material-elevated ${
            isFullscreen
              ? 'top-4 right-4 w-80 max-h-[85%]'
              : 'top-3 right-3 sm:top-4 sm:right-4 w-72 sm:w-80 max-h-[82%]'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.08]">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#0A84FF]" />
              <span>Чат трансляции</span>
            </span>
            <button
              type="button"
              onClick={toggleChatOverlay}
              className="ios-press text-white/55 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Закрыть чат"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
        </div>
      )}
    </div>
  );
};
