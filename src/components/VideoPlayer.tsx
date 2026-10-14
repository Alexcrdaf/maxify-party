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
  externalNotice,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSyncingRef = useRef(false);

  // Bind screenStream if available
  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
      videoRef.current.muted = true; // Avoid feedback on host pc
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current && !screenStream) {
      videoRef.current.srcObject = null;
      videoRef.current.muted = isMuted;
    }
  }, [screenStream, isMuted]);

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
      className="relative glass-panel overflow-hidden bg-black aspect-video flex flex-col justify-between group shadow-2xl"
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

      {/* Empty State Overlay */}
      {!hasSource && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/85 backdrop-blur-sm z-20">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-400/25 flex items-center justify-center text-sky-400 mb-4">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white syne">Экран совместного просмотра</h3>
          <p className="text-xs text-slate-300 max-w-md mt-1 mb-5">
            Ведущий может загрузить MP4/WebM видео, выбрать демо-ролик или запустить трансляцию вкладки браузера со звуком.
          </p>
          {isHost && (
            <button
              onClick={() => onUpdateState({ sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', isPlaying: false })}
              className="btn btn-primary text-xs"
            >
              Запустить Big Buck Bunny (1080p)
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
    </div>
  );
};
