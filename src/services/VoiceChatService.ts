export class VoiceChatService {
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  public async getAvailableAudioDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'audioinput');
  }

  public async startMicrophone(
    deviceId?: string,
    onSpeakingChange?: (isSpeaking: boolean) => void
  ): Promise<MediaStream> {
    // If stream already exists and tracks are live, simply unmute
    if (this.localStream && this.localStream.getAudioTracks().some((t) => t.readyState === 'live')) {
      this.mute(false);
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return this.localStream;
    }

    // Clean up any stale context before acquiring fresh stream
    this.stop();

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;

      // Voice activity detection (VAD) via Web Audio API
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkAudioLevel = () => {
          if (!this.analyser || !this.localStream) return;
          this.analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          const isSpeaking = average > 18; // voice threshold

          if (onSpeakingChange) {
            onSpeakingChange(isSpeaking);
          }

          this.animFrameId = requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
      }

      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Доступ к микрофону заблокирован. Разрешите доступ в настройках браузера.');
      }
      throw new Error(`Не удалось подключить микрофон: ${err.message || err.name}`);
    }
  }

  public mute(isMuted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
    if (this.audioContext) {
      if (isMuted && this.audioContext.state === 'running') {
        this.audioContext.suspend().catch(() => {});
      } else if (!isMuted && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
    }
  }

  public isMuted(): boolean {
    if (!this.localStream) return true;
    return this.localStream.getAudioTracks().every((track) => !track.enabled);
  }

  public hasActiveStream(): boolean {
    return Boolean(this.localStream && this.localStream.getAudioTracks().some((t) => t.readyState === 'live'));
  }

  public stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }
}

