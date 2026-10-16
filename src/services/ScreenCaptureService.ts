export interface ScreenShareOptions {
  withAudio?: boolean;
  frameRate?: number;
}

export class ScreenCaptureService {
  private currentStream: MediaStream | null = null;

  public isSupported(): boolean {
    return Boolean(
      typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getDisplayMedia === 'function'
    );
  }

  public async startCapture(
    options: ScreenShareOptions = { withAudio: true, frameRate: 60 },
    onEndedCallback?: () => void
  ): Promise<MediaStream> {
    if (!this.isSupported()) {
      throw new Error(
        'Браузер или устройство не поддерживает функцию захвата экрана (getDisplayMedia). В мобильных браузерах захват экрана часто ограничен системой.'
      );
    }

    try {
      const targetFps = options.frameRate || 60;
      const displayMediaOptions: any = {
        video: {
          displaySurface: 'browser',
          frameRate: { ideal: targetFps, max: targetFps },
          width: { ideal: 1920, max: 2560 },
          height: { ideal: 1080, max: 1440 },
        },
        audio: options.withAudio
          ? {
              echoCancellation: false,
              autoGainControl: false,
              noiseSuppression: false,
            }
          : false,
        // Chrome / Edge hints for capturing tab / system audio
        systemAudio: 'include',
        surfaceSwitching: 'include',
        selfBrowserSurface: 'exclude',
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      } catch (firstErr: any) {
        // Fallback for browsers that don't support advanced audio constraint objects in getDisplayMedia (e.g. Firefox)
        if (options.withAudio) {
          const fallbackOptions: any = {
            video: {
              frameRate: { ideal: targetFps, max: targetFps },
            },
            audio: true,
          };
          stream = await navigator.mediaDevices.getDisplayMedia(fallbackOptions);
        } else {
          throw firstErr;
        }
      }

      this.currentStream = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Enforce 60 FPS constraint if browser supports applyConstraints
        try {
          if (typeof videoTrack.applyConstraints === 'function') {
            await videoTrack.applyConstraints({
              frameRate: { ideal: targetFps, max: targetFps },
            });
          }
        } catch (_) {
          // Fallback gracefully if applyConstraints is not fully supported
        }

        videoTrack.onended = () => {
          this.stopCapture();
          if (onEndedCallback) {
            onEndedCallback();
          }
        };
      }

      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Захват экрана отменён пользователем или доступ запрещён в настройках браузера.');
      } else if (err.name === 'NotFoundError') {
        throw new Error('Поддерживаемый источник видеозахвата не найден.');
      } else {
        throw new Error(`Ошибка захвата экрана: ${err.message || err.name}`);
      }
    }
  }

  public hasAudioTrack(): boolean {
    if (!this.currentStream) return false;
    return this.currentStream.getAudioTracks().length > 0;
  }

  public hasActiveStream(): boolean {
    return Boolean(
      this.currentStream &&
        this.currentStream.getTracks().some((track) => track.readyState === 'live')
    );
  }

  public stopCapture() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
  }
}
