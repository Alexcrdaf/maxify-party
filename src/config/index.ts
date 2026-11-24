/**
 * Maxify System Configuration
 * Supports environment variables with fallback to fast, reliable public defaults.
 */

export interface AppConfig {
  maxParticipants: number;
  peerJsHost?: string;
  peerJsPort?: number;
  peerJsPath: string;
  peerJsSecure: boolean;
  iceServers: RTCIceServer[];
  iceCandidatePoolSize: number;
  roomCodeLength: number;
  syncThresholdSeconds: number;
  heartbeatIntervalMs: number;
}

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: import.meta.env.VITE_TURN_USERNAME || undefined,
      credential: import.meta.env.VITE_TURN_CREDENTIAL || undefined,
    });
  }

  return servers;
}

export const APP_CONFIG: AppConfig = {
  maxParticipants: Number(import.meta.env.VITE_MAX_PARTICIPANTS) || 10,
  peerJsHost: import.meta.env.VITE_PEERJS_HOST || undefined,
  peerJsPort: import.meta.env.VITE_PEERJS_PORT ? Number(import.meta.env.VITE_PEERJS_PORT) : undefined,
  peerJsPath: import.meta.env.VITE_PEERJS_PATH || '/',
  peerJsSecure: import.meta.env.VITE_PEERJS_SECURE !== 'false',
  iceServers: buildIceServers(),
  iceCandidatePoolSize: 4,
  roomCodeLength: 6,
  syncThresholdSeconds: 1.2,
  heartbeatIntervalMs: 5000,
};

/**
 * Generates human-friendly 6-character room codes (e.g. K7MX42)
 * Avoids ambiguous characters like 0/O, 1/I
 * Uses cryptographically secure random values (crypto.getRandomValues)
 */
export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const array = new Uint8Array(APP_CONFIG.roomCodeLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < APP_CONFIG.roomCodeLength; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  }
  let result = '';
  for (let i = 0; i < APP_CONFIG.roomCodeLength; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Extracts a clean room code if the user pasted a full invite link or raw code
 */
export function extractRoomCode(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.includes('room=')) {
    const match = trimmed.match(/[#?&]room=([A-Za-z0-9]+)/);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }
  return trimmed.toUpperCase();
}

/**
 * Validates room code format
 */
export function isValidRoomCode(code: string): boolean {
  if (!code) return false;
  const cleaned = extractRoomCode(code);
  // Only valid if input itself was a clean code (or callers extract first);
  // keep strict check on raw code so SQLi/path-traversal fuzz tests stay strict!
  if (cleaned !== code.trim().toUpperCase()) return false;
  return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4,10}$/.test(cleaned);
}

/**
 * Computes time-compensated PlaybackState so late joiners land on the exact current second
 */
export function computeLivePlaybackState(state: PlaybackStateLike): PlaybackStateLike {
  if (!state.isPlaying || !state.lastUpdated || state.lastUpdated <= 0) {
    return state;
  }
  const elapsedSec = Math.max(0, (Date.now() - state.lastUpdated) / 1000);
  const rate = state.playbackRate || 1;
  return {
    ...state,
    currentTime: state.currentTime + elapsedSec * rate,
    lastUpdated: Date.now(),
  };
}

export interface PlaybackStateLike {
  sourceUrl: string;
  sourceType: 'direct_video' | 'screen_share';
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  lastUpdated: number;
  sentBy: string;
}
