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
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
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

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/90 border border-white/10 shadow-2xl flex flex-col justify-end group select-none"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onClick={togglePlay}
      />

      {externalNotice && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700/60 text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">{externalNotice.title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-5">{externalNotice.description}</p>
            <div className="flex justify-center gap-3">
              <a
                href={playbackState.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm flex items-center gap-2 transition"
              >
                Открыть в новой вкладке <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {screenStream && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold backdrop-blur-md animate-pulse">
          <MonitorPlay className="w-4 h-4" />
          <span>Прямая трансляция вкладки</span>
          {onStopScreenShare && (
            <button
              onClick={onStopScreenShare}
              className="ml-2 underline text-red-200 hover:text-white"
            >
              Завершить
            </button>
          )}
        </div>
      )}

      {!playbackState.sourceUrl && !screenStream && !externalNotice && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-slate-400 pointer-events-none p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Play className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-base font-medium text-slate-300 mb-1">Видео не выбрано</p>
          <p className="text-xs text-slate-500 max-w-sm">
            {isHost
              ? 'Вставьте прямую ссылку на видео (MP4/WebM) или запустите трансляцию вкладки со звуком.'
              : 'Ожидание выбора источника видео ведущим комнаты...'}
          </p>
        </div>
      )}

      {!screenStream && playbackState.sourceUrl && (
        <div className="relative z-20 w-full p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                disabled={!isHost}
                title={isHost ? 'Воспроизведение / Пауза' : 'Управление только у ведущего'}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-1.5 text-slate-300 hover:text-white transition"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
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
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
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
