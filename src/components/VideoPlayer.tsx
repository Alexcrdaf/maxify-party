import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  ScreenShare,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  X,
} from 'lucide-react';
import type { PlaybackState } from '../types';
import { APP_CONFIG } from '../config';

interface VideoPlayerProps {
  playbackState: PlaybackState;
  onUpdateState: (newState: Partial<PlaybackState>) => void;
  isHost: boolean;
  isLocalSharing?: boolean;
  screenStream: MediaStream | null;
  activeStreamerName?: string | null;
  onStopScreenShare?: () => void;
  onRequestScreenStream?: () => void;
  externalNotice?: { title: string; description: string } | null;
  onDismissNotice?: () => void;
  isCinemaMode?: boolean;
  onToggleCinemaMode?: () => void;
  children?: React.ReactNode;
  isChatOpenInPlayer?: boolean;
  onToggleInPlayerChat?: () => void;
}

const iconBtn =
  'glass-btn w-9 h-9 rounded-full flex items-center justify-center shrink-0';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  playbackState,
  onUpdateState,
  isHost,
  isLocalSharing = false,
  screenStream,
  activeStreamerName,
  onStopScreenShare,
  onRequestScreenStream,
  externalNotice,
  onDismissNotice,
  isCinemaMode = false,
  onToggleCinemaMode,
  children,
  isChatOpenInPlayer,
  onToggleInPlayerChat,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.95);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlockedAudio, setAutoplayBlockedAudio] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [hudLockedHidden, setHudLockedHidden] = useState(false);
  const [localShowChatOverlay, setLocalShowChatOverlay] = useState(false);

  const showChatOverlay =
    isChatOpenInPlayer !== undefined ? isChatOpenInPlayer : localShowChatOverlay;
  const toggleChatOverlay =
    onToggleInPlayerChat || (() => setLocalShowChatOverlay((prev) => !prev));

  const hasSource = Boolean(playbackState.sourceUrl || screenStream);

  const wakeHud = useCallback(() => {
    setHudVisible(true);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setHudVisible(false);
    }, 2600);
  }, []);

  useEffect(() => {
    wakeHud();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [wakeHud]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Bind WebRTC screenStream with autoplay fallback (prevents a black screen for 2nd+ viewer)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (screenStream) {
      video.srcObject = screenStream;
      setAutoplayBlockedAudio(false);

      if (isLocalSharing) {
        video.muted = true;
        video.play().catch(() => {});
      } else {
        video.muted = isMuted;
        video.volume = volume;
        video.play().catch(() => {
          video.muted = true;
          setAutoplayBlockedAudio(true);
          video.play().catch(() => {});
        });
      }
    } else {
      video.srcObject = null;
      setAutoplayBlockedAudio(false);
    }
    // Re-bind only when the stream or local-sharing role changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenStream, isLocalSharing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (screenStream && isLocalSharing) {
      video.muted = true;
    } else if (!autoplayBlockedAudio) {
      video.muted = isMuted;
      video.volume = volume;
    }
  }, [screenStream, isLocalSharing, isMuted, volume, autoplayBlockedAudio]);

  // Sync incoming direct-video PlaybackState
  useEffect(() => {
    if (!videoRef.current || screenStream) return;

    const video = videoRef.current;
    isSyncingRef.current = true;

    if (playbackState.sourceUrl && video.src !== playbackState.sourceUrl) {
      video.src = playbackState.sourceUrl;
      video.load();
    }

    if (playbackState.isPlaying && video.paused) {
      video.play().catch(() => {
        video.muted = true;
        setAutoplayBlockedAudio(true);
        video.play().catch(() => {});
      });
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
    }, 400);

    return () => clearTimeout(timer);
  }, [playbackState, screenStream]);

  const handleUnblockAudio = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setAutoplayBlockedAudio(false);
    setIsMuted(false);
    video.muted = false;
    video.volume = volume > 0 ? volume : 0.9;
    video.play().catch(() => {});
  }, [volume]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current || screenStream) return;

    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      onUpdateState({ isPlaying: true, currentTime: videoRef.current.currentTime });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      onUpdateState({ isPlaying: false, currentTime: videoRef.current.currentTime });
    }
  }, [screenStream, onUpdateState]);

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

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    if (autoplayBlockedAudio) {
      handleUnblockAudio();
      return;
    }
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  }, [isMuted, autoplayBlockedAudio, handleUnblockAudio]);

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    setAutoplayBlockedAudio(false);
    videoRef.current.volume = newVol;
    videoRef.current.muted = newVol === 0;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Keyboard: Space = play/pause, F = fullscreen, M = mute
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' && hasSource && !screenStream) {
        e.preventDefault();
        togglePlay();
        wakeHud();
      } else if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'а') {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'ь') {
        toggleMute();
        wakeHud();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasSource, screenStream, togglePlay, toggleFullscreen, toggleMute, wakeHud]);

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '00:00';
    const hrs = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (hrs > 0) {
      return `${hrs}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const shouldShowControls = hasSource && !hudLockedHidden && (hudVisible || showChatOverlay);
  const hideCursor = hasSource && !hudVisible && !showChatOverlay;
  const fullBleed = isCinemaMode || isFullscreen;

  return (
    <div
      ref={containerRef}
      onMouseMove={wakeHud}
      onTouchStart={wakeHud}
      onClick={wakeHud}
      className={`relative overflow-hidden bg-black flex items-center justify-center select-none ${
        fullBleed
          ? 'w-full h-full rounded-none'
          : 'w-full aspect-video rounded-[28px] border-[0.5px] border-white/20 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.18)]'
      } ${hideCursor ? 'cursor-none' : ''}`}
    >
      <video
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        onTimeUpdate={() => {
          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
        onEnded={() => setIsPlaying(false)}
        onDoubleClick={toggleFullscreen}
        onClick={(e) => {
          e.stopPropagation();
          wakeHud();
          if (hasSource && !screenStream && !hudLockedHidden) {
            togglePlay();
          }
        }}
        className="w-full h-full object-contain bg-black"
      />

      {/* Browser blocked unmuted autoplay */}
      {screenStream && autoplayBlockedAudio && !isLocalSharing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleUnblockAudio();
          }}
          className="glass-btn glass-strong anim-pop absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex items-center gap-2.5 h-12 px-5 rounded-full text-[13px] font-semibold"
        >
          <Volume2 className="w-4 h-4 text-[#ff453a]" />
          <span>Нажмите, чтобы включить звук</span>
        </button>
      )}

      {/* Live status */}
      {screenStream && (
        <div
          className={`glass-strong absolute top-3.5 left-3.5 z-30 flex items-center gap-2 h-9 pl-3 pr-2 rounded-full text-xs font-medium text-white max-w-[calc(100%-1.75rem)] transition-opacity duration-300 ${
            shouldShowControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#ff453a] animate-pulse shrink-0" />
          <ScreenShare className="w-3.5 h-3.5 text-white/60 shrink-0" />
          <span className="truncate">
            {isLocalSharing
              ? 'Вы делитесь экраном'
              : activeStreamerName
              ? `Эфир: ${activeStreamerName}`
              : 'Прямой эфир экрана'}
          </span>
          {onStopScreenShare && isLocalSharing && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStopScreenShare();
              }}
              className="glass-btn glass-btn-red h-6 px-2.5 rounded-full text-[11px] font-semibold ml-1"
            >
              Стоп
            </button>
          )}
        </div>
      )}

      {/* Un-hide controls when locked / leave cinema mode */}
      {hasSource && hudVisible && (hudLockedHidden || isCinemaMode) && (
        <div className="absolute top-3.5 right-3.5 z-40 flex items-center gap-2 anim-pop">
          {hudLockedHidden && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHudLockedHidden(false);
              }}
              title="Показать панель плеера"
              className="glass-btn glass-strong h-9 px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5 text-[#ffd60a]" />
              <span>Панель плеера</span>
            </button>
          )}

          {isCinemaMode && onToggleCinemaMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHudLockedHidden(false);
                onToggleCinemaMode();
              }}
              title="Вернуть интерфейс (H или Esc)"
              className="glass-btn glass-strong h-9 px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Вернуть интерфейс</span>
            </button>
          )}
        </div>
      )}

      {/* Empty standby */}
      {!hasSource && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-[radial-gradient(ellipse_at_50%_0%,rgba(10,132,255,0.18),transparent_65%),linear-gradient(180deg,#0a0c16,#05060a)]">
          <div className="glass-thin rounded-full px-3.5 h-7 inline-flex items-center gap-2 text-[11px] font-medium text-white/65 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
            Экран зала
          </div>
          <h3 className="text-[20px] sm:text-[24px] font-semibold text-white font-display mb-2">
            Готов к показу
          </h3>
          <p className="text-[13px] text-white/55 max-w-sm mb-6 leading-relaxed">
            Нажмите «Экран в эфир» на нижней панели — зрители увидят вашу вкладку и услышат звук.
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
              className="glass-btn h-10 px-5 rounded-full text-[13px] font-medium"
            >
              Проверить плеер на тестовом видео
            </button>
          )}
        </div>
      )}

      {/* External notice */}
      {externalNotice && (
        <div className="glass-strong anim-drop absolute top-3.5 left-3.5 right-3.5 z-30 p-3.5 rounded-3xl text-xs text-white flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#ffd60a] mt-1 shrink-0" />
            <div>
              <span className="font-semibold block mb-0.5">{externalNotice.title}</span>
              <span className="text-white/65 leading-relaxed">{externalNotice.description}</span>
            </div>
          </div>
          {onDismissNotice && (
            <button
              type="button"
              onClick={onDismissNotice}
              aria-label="Закрыть уведомление"
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 cursor-pointer bg-transparent border-0 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Bottom glass HUD — fades out when the mouse rests */}
      {hasSource && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`glass-strong absolute bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-5 max-w-4xl mx-auto rounded-[26px] px-3.5 py-3 z-30 flex flex-col gap-2.5 transition-all duration-300 ${
            shouldShowControls
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-3 pointer-events-none'
          }`}
        >
          {!screenStream && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono tabular-nums text-white/75 w-11 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                aria-label="Перемотка"
                className="glass-range flex-1"
              />
              <span className="text-[11px] font-mono tabular-nums text-white/45 w-11">
                {formatTime(duration)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              {!screenStream && (
                <>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shrink-0 cursor-pointer border-0 transition-transform duration-200 hover:scale-105 active:scale-95 shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
                    title={isPlaying ? 'Пауза (Пробел)' : 'Воспроизвести (Пробел)'}
                    aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
                  >
                    {isPlaying ? (
                      <Pause className="w-[18px] h-[18px] fill-current" />
                    ) : (
                      <Play className="w-[18px] h-[18px] fill-current ml-0.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => seekRelative(-10)}
                    className={iconBtn}
                    title="Назад 10 секунд"
                    aria-label="Назад 10 секунд"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => seekRelative(10)}
                    className={iconBtn}
                    title="Вперёд 10 секунд"
                    aria-label="Вперёд 10 секунд"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </>
              )}

              <div className="glass-thin h-9 rounded-full flex items-center gap-2 pl-3 pr-3.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="text-white/80 hover:text-white cursor-pointer bg-transparent border-0 p-0 flex"
                  title={isMuted ? 'Включить звук (M)' : 'Выключить звук (M)'}
                  aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
                >
                  {isMuted || volume === 0 || autoplayBlockedAudio ? (
                    <VolumeX className="w-4 h-4 text-[#ff453a]" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted || autoplayBlockedAudio ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  aria-label="Громкость"
                  className="glass-range w-16 sm:w-20"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {onRequestScreenStream && !isLocalSharing && screenStream && (
                <button
                  type="button"
                  onClick={onRequestScreenStream}
                  className="glass-btn h-9 px-3 rounded-full text-xs flex items-center gap-1.5"
                  title="Переподключить видеопоток"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Обновить поток</span>
                </button>
              )}

              {children && (
                <button
                  type="button"
                  onClick={toggleChatOverlay}
                  className={`glass-btn h-9 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                    showChatOverlay ? 'glass-btn-blue' : ''
                  }`}
                  title="Чат поверх видео"
                  aria-pressed={showChatOverlay}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Чат</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setHudLockedHidden(true)}
                className={iconBtn}
                title="Скрыть панель плеера (чистый кадр)"
                aria-label="Скрыть панель плеера"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>

              {onToggleCinemaMode && (
                <button
                  type="button"
                  onClick={onToggleCinemaMode}
                  className={`glass-btn h-9 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                    isCinemaMode ? 'glass-btn-blue' : ''
                  }`}
                  title={
                    isCinemaMode
                      ? 'Вернуть интерфейс (H / Esc)'
                      : 'Скрыть весь интерфейс вокруг фильма (H)'
                  }
                  aria-pressed={isCinemaMode}
                >
                  {isCinemaMode ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{isCinemaMode ? 'Интерфейс' : 'Без UI'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleFullscreen}
                className={iconBtn}
                title="Во весь экран (F)"
                aria-label="Во весь экран"
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

      {/* Floating chat over video */}
      {showChatOverlay && children && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`glass-strong anim-pop absolute z-40 flex flex-col pointer-events-auto rounded-[26px] overflow-hidden ${
            fullBleed
              ? 'top-16 right-4 w-80 h-[min(24rem,calc(100%-8.5rem))]'
              : 'top-3 right-3 sm:top-4 sm:right-4 w-[calc(100%-1.5rem)] sm:w-80 h-[min(22rem,calc(100%-6.25rem))]'
          }`}
        >
          <div className="flex items-center justify-between pl-4 pr-2 h-11 border-b border-white/10 shrink-0">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-white/55" />
              Чат зала
            </span>
            <button
              type="button"
              onClick={toggleChatOverlay}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 cursor-pointer bg-transparent border-0"
              title="Закрыть чат"
              aria-label="Закрыть чат"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>
        </div>
      )}
    </div>
  );
};
