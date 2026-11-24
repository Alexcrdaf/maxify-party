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
    }, 2300);
  }, []);

  useEffect(() => {
    wakeHud();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [wakeHud]);

  // Sync fullscreen state on Esc
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Bind WebRTC screenStream with guaranteed autoplay fallback (prevents black screen on 2nd+ viewer)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (screenStream) {
      video.srcObject = screenStream;
      setAutoplayBlockedAudio(false);

      // Broadcaster stays locally muted to prevent tab audio feedback loop
      if (isLocalSharing) {
        video.muted = true;
        video.play().catch(() => {});
      } else {
        video.muted = isMuted;
        video.volume = volume;
        video.play().catch(() => {
          // Browser blocked unmuted autoplay -> start muted immediately so video plays without black screen
          video.muted = true;
          setAutoplayBlockedAudio(true);
          video.play().catch(() => {});
        });
      }
    } else {
      video.srcObject = null;
      setAutoplayBlockedAudio(false);
    }
    // Intentionally only re-bind when stream or local-sharing status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenStream, isLocalSharing]);

  // Apply volume & mute changes smoothly without re-attaching srcObject
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

  // Sync incoming direct video PlaybackState
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

  const handleUnblockAudio = () => {
    const video = videoRef.current;
    if (!video) return;
    setAutoplayBlockedAudio(false);
    setIsMuted(false);
    video.muted = false;
    video.volume = volume > 0 ? volume : 0.9;
    video.play().catch(() => {});
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted, autoplayBlockedAudio]);

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

  // Keyboard shortcuts for comfortable movie watching (F = Fullscreen, M = Mute, Space = Play/Pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
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

  return (
    <div
      ref={containerRef}
      onMouseMove={wakeHud}
      onTouchStart={wakeHud}
      onClick={() => {
        wakeHud();
      }}
      className={`relative overflow-hidden bg-black flex items-center justify-center select-none transition-all duration-300 ${
        isCinemaMode || isFullscreen
          ? 'w-full h-full rounded-none border-0'
          : 'w-full aspect-video rounded-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.7)]'
      } ${hideCursor ? 'cursor-none' : ''}`}
    >
      {/* HTML5 / WebRTC Video Surface */}
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

      {/* Unmute Prompt if Browser Blocked Unmuted Autoplay */}
      {screenStream && autoplayBlockedAudio && !isLocalSharing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleUnblockAudio();
          }}
          className="tactile absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex items-center gap-2.5 px-5 py-3 rounded-full bg-[#FAFAFA] text-[#09090B] text-xs sm:text-sm font-semibold shadow-[0_12px_40px_rgba(0,0,0,0.8)] cursor-pointer"
        >
          <Volume2 className="w-4 h-4 text-rose-600" />
          <span>Нажмите, чтобы включить звук эфира</span>
        </button>
      )}

      {/* Top-Left Live Status (auto-hides with HUD when watching movie!) */}
      {screenStream && shouldShowControls && (
        <div className="absolute top-3.5 left-3.5 z-30 flex items-center gap-2 px-3 py-1.5 rounded-lg studio-hud text-xs font-medium text-zinc-200 transition-opacity duration-200">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <ScreenShare className="w-3.5 h-3.5 text-zinc-400" />
          <span>
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
              className="tactile ml-1.5 px-2 py-0.5 rounded bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-semibold cursor-pointer"
            >
              Завершить
            </button>
          )}
        </div>
      )}

      {/* Top-Right Minimal Controls when HUD is Locked or Cinema Mode is active */}
      {hasSource && hudVisible && (hudLockedHidden || isCinemaMode) && (
        <div className="absolute top-3.5 right-3.5 z-40 flex items-center gap-1.5">
          {hudLockedHidden && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHudLockedHidden(false);
              }}
              title="Разблокировать панель плеера"
              className="tactile flex items-center gap-1.5 px-3 py-1.5 rounded-lg studio-hud text-xs font-medium text-zinc-200 hover:text-white cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
              <span>Показать плеер</span>
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
              title="Вернуть интерфейс сайта (клавиша H или Esc)"
              className="tactile flex items-center gap-1.5 px-3 py-1.5 rounded-lg studio-hud text-xs font-medium text-zinc-200 hover:text-white cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Вернуть интерфейс</span>
            </button>
          )}
        </div>
      )}

      {/* Empty Standby Screen */}
      {!hasSource && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0B0B0E] z-20">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.07] text-[11px] font-mono uppercase tracking-widest text-zinc-400 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <span>Экран зала</span>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-[#FAFAFA] font-display mb-1.5">
            Готов к началу показа
          </h3>
          <p className="text-xs sm:text-[13px] text-zinc-400 max-w-md mb-6 leading-relaxed">
            Включите «Экран в эфир» на нижней панели, чтобы транслировать любой фильм или вкладку со звуком сразу для всех зрителей в зале.
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
              className="tactile py-2.5 px-4 rounded-xl bg-white/[0.09] hover:bg-white/[0.15] border border-white/[0.1] text-[#FAFAFA] font-medium text-xs cursor-pointer"
            >
              Проверить синхронный плеер (тестовое HD-видео)
            </button>
          )}
        </div>
      )}

      {/* External Notice */}
      {externalNotice && (
        <div className="animate-toast-in absolute top-3.5 left-3.5 right-3.5 z-30 p-3.5 rounded-xl studio-hud text-xs text-zinc-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0" />
            <div>
              <span className="font-semibold text-white block mb-0.5">{externalNotice.title}</span>
              <span className="text-zinc-400 leading-relaxed">{externalNotice.description}</span>
            </div>
          </div>
          {onDismissNotice && (
            <button
              type="button"
              onClick={onDismissNotice}
              className="text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Bottom Floating Cinema HUD (auto-fades completely when mouse stops moving!) */}
      {hasSource && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-4 max-w-4xl mx-auto rounded-xl studio-hud px-3.5 py-2.5 z-30 flex flex-col gap-2 transition-all duration-200 ${
            shouldShowControls
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {/* Scrubber for direct video */}
          {!screenStream && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono tabular-nums text-zinc-300 w-11 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="cinema-range flex-1"
              />
              <span className="text-[11px] font-mono tabular-nums text-zinc-500 w-11">
                {formatTime(duration)}
              </span>
            </div>
          )}

          {/* Main HUD Controls */}
          <div className="flex items-center justify-between gap-2">
            {/* Left Playback & Volume */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {!screenStream && (
                <>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="tactile w-8 h-8 rounded-lg bg-[#FAFAFA] text-[#09090B] flex items-center justify-center hover:bg-white cursor-pointer"
                    title={isPlaying ? 'Пауза (Пробел)' : 'Воспроизвести (Пробел)'}
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
                    className="tactile p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
                    title="Назад 10 сек"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => seekRelative(10)}
                    className="tactile p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
                    title="Вперёд 10 сек"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Volume */}
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.06]">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="tactile text-zinc-300 hover:text-white cursor-pointer"
                  title={isMuted ? 'Включить звук (M)' : 'Выключить звук (M)'}
                >
                  {isMuted || volume === 0 || autoplayBlockedAudio ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
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
                  className="cinema-range w-14 sm:w-18"
                />
              </div>
            </div>

            {/* Right View Controls (Chat, Re-sync, Lock HUD, Hide Site UI, Fullscreen) */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {onRequestScreenStream && !isLocalSharing && screenStream && (
                <button
                  type="button"
                  onClick={onRequestScreenStream}
                  className="tactile px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer"
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
                  className={`tactile px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                    showChatOverlay
                      ? 'bg-[#FAFAFA] text-[#09090B]'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white'
                  }`}
                  title="Поверхностный чат поверх видео"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Чат</span>
                </button>
              )}

              {/* Lock HUD completely so accidental mouse moves don't show bottom bar */}
              <button
                type="button"
                onClick={() => setHudLockedHidden(true)}
                className="tactile p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white cursor-pointer"
                title="Скрыть даже нижнюю полосу плеера (чистый кадр)"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>

              {/* Toggle Site-Wide Cinema / Lights-Off Mode */}
              {onToggleCinemaMode && (
                <button
                  type="button"
                  onClick={onToggleCinemaMode}
                  className={`tactile px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                    isCinemaMode
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white'
                  }`}
                  title={
                    isCinemaMode
                      ? 'Вернуть панели сайта (H / Esc)'
                      : 'Выключить весь интерфейс вокруг фильма (H)'
                  }
                >
                  {isCinemaMode ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Интерфейс</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Без UI</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={toggleFullscreen}
                className="tactile p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white cursor-pointer"
                title="Во весь экран (F)"
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

      {/* Single-Header Floating Chat Overlay inside Player */}
      {showChatOverlay && children && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`animate-panel-in absolute z-40 flex flex-col pointer-events-auto rounded-2xl overflow-hidden studio-hud ${
            isFullscreen || isCinemaMode
              ? 'top-14 right-4 w-80 h-[min(24rem,calc(100%-8.5rem))]'
              : 'top-3 right-3 sm:top-4 sm:right-4 w-72 sm:w-80 h-[min(22rem,calc(100%-6.25rem))]'
          }`}
        >
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.08]">
            <span className="text-xs font-semibold text-[#FAFAFA] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
              <span>Чат зала</span>
            </span>
            <button
              type="button"
              onClick={toggleChatOverlay}
              className="tactile text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/10 cursor-pointer"
              title="Закрыть чат поверх видео"
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
