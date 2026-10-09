import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  MonitorPlay,
  AlertCircle,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import type { PlaybackState } from '../types';
import { APP_CONFIG } from '../config';

interface VideoPlayerProps {
  playbackState: PlaybackState;
  onUpdateState: (newState: Partial<PlaybackState>) => void;
  isHost: boolean;
  screenStream: MediaStream | null;
  onStopScreenShare?: () => void;
  externalNotice?: { title: string; description: string } | null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  playbackState,
  onUpdateState,
  isHost,
  screenStream,
  onStopScreenShare,
  externalNotice,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1x to 3x zoom
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // Drag pan position
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isSyncingRef = useRef(false);

  // Bind screenStream if available
  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current && !screenStream) {
      videoRef.current.srcObject = null;
    }
  }, [screenStream]);

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

    // Time seek sync
    const timeDiff = Math.abs(video.currentTime - playbackState.currentTime);
    if (timeDiff > APP_CONFIG.syncThresholdSeconds) {
      video.currentTime = playbackState.currentTime;
    }

    // Rate sync
    if (playbackState.playbackRate && video.playbackRate !== playbackState.playbackRate) {
      video.playbackRate = playbackState.playbackRate;
    }

    const timer = setTimeout(() => {
      isSyncingRef.current = false;
    }, 300);

    return () => clearTimeout(timer);
  }, [playbackState, screenStream]);

  const handlePlay = () => {
    if (isSyncingRef.current || screenStream) return;
    setIsPlaying(true);
    onUpdateState({ isPlaying: true, currentTime: videoRef.current?.currentTime || 0 });
  };

  const handlePause = () => {
    if (isSyncingRef.current || screenStream) return;
    setIsPlaying(false);
    onUpdateState({ isPlaying: false, currentTime: videoRef.current?.currentTime || 0 });
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      if (isHost) {
        onUpdateState({ currentTime: targetTime });
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current || screenStream) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
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

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.25, 1);
      if (next === 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow drag when zoomed in or with Middle mouse / Left mouse
    if (zoomLevel > 1 || e.button === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative w-full aspect-video rounded-3xl overflow-hidden bg-black/95 border border-white/10 shadow-2xl flex flex-col justify-end group select-none transition-all ${
        zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      }`}
    >
      {/* Video Element with Zoom scale and Pan drag offset */}
      <div
        className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-auto"
        onMouseDown={handleMouseDown}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain pointer-events-none"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transition: isDragging ? 'none' : 'transform 150ms ease-out',
          }}
          playsInline
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        />
      </div>

      {/* Notice for DRM / External Sources */}
      {externalNotice && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md">
          <div className="max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-700/60 text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">{externalNotice.title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-5">{externalNotice.description}</p>
            <div className="flex justify-center gap-3">
              <a
                href={playbackState.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-lg shadow-purple-600/30"
              >
                Открыть в новой вкладке <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Top Floating Control Bar: Left = Stream status, Right = Zoom & Fullscreen & Audio controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-3 pointer-events-auto">
        {/* Left Status Bar */}
        <div>
          {screenStream && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/25 border border-red-500/40 text-red-200 text-xs font-semibold backdrop-blur-md shadow-lg animate-pulse">
              <MonitorPlay className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">Прямая трансляция вкладки</span>
              <span className="sm:hidden">Трансляция</span>
            </div>
          )}
        </div>

        {/* Right Consolidated Controls Bar (Single cleanly spaced bar) */}
        {(playbackState.sourceUrl || screenStream) && (
          <div className="flex items-center gap-1.5 liquid-glass px-2.5 py-1.5 rounded-2xl border border-white/10 shadow-2xl">
            {/* Stream Audio Mute & Stop Button (if streaming) */}
            {screenStream && (
              <>
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
                  title={isMuted ? 'Включить звук трансляции' : 'Выключить звук трансляции'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>

                {onStopScreenShare && (
                  <button
                    onClick={onStopScreenShare}
                    className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition shadow-md whitespace-nowrap"
                  >
                    Остановить показ
                  </button>
                )}

                <div className="w-[1px] h-4 bg-white/20 mx-1" />
              </>
            )}

            {/* Zoom Controls */}
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
              title="Приблизить (+25%)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition disabled:opacity-30"
              title="Отдалить (-25%)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            {zoomLevel > 1 && (
              <button
                onClick={handleResetZoom}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
                title="Сбросить масштаб"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[11px] font-mono text-purple-300 px-1 font-semibold">{Math.round(zoomLevel * 100)}%</span>

            <div className="w-[1px] h-4 bg-white/20 mx-1" />

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
              title={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!playbackState.sourceUrl && !screenStream && !externalNotice && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-slate-400 pointer-events-none p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-xl">
            <Play className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-base font-semibold text-slate-200 mb-1">Видео не выбрано</p>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            {isHost
              ? 'Вставьте прямую ссылку на видео (MP4/WebM) или запустите трансляцию вкладки со звуком.'
              : 'Ожидание выбора источника видео ведущим комнаты...'}
          </p>
        </div>
      )}

      {/* Controls Overlay (Only for Direct Video mode) */}
      {!screenStream && playbackState.sourceUrl && (
        <div className="relative z-20 w-full p-4 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Progress Bar */}
          <div className="w-full mb-3 flex items-center gap-3">
            <span className="text-xs text-slate-300 font-mono">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              disabled={!isHost}
              className="w-full h-1.5 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-xs text-slate-300 font-mono">{formatTime(duration)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                disabled={!isHost}
                title={isHost ? 'Воспроизведение / Пауза' : 'Управление только у ведущего'}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              {/* Volume & Mute */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-1.5 text-slate-300 hover:text-white transition"
                  title={isMuted ? 'Включить звук' : 'Выключить звук'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-red-400" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-emerald-400" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition shadow"
                title="На весь экран"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
