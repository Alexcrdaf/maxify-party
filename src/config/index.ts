/**
 * SyncWave System Configuration
 * Supports environment variables with fallback to reliable public defaults.
 */

export interface AppConfig {
  maxParticipants: number;
  peerJsHost?: string;
  peerJsPort?: number;
  peerJsPath: string;
  peerJsSecure: boolean;
  iceServers: RTCIceServer[];
  roomCodeLength: number;
  syncThresholdSeconds: number; // Max allowed desync time before seeking
  heartbeatIntervalMs: number;
}

export const APP_CONFIG: AppConfig = {
  maxParticipants: Number(import.meta.env.VITE_MAX_PARTICIPANTS) || 10,
  peerJsHost: import.meta.env.VITE_PEERJS_HOST || undefined, // defaults to 0.peerjs.com
  peerJsPort: import.meta.env.VITE_PEERJS_PORT ? Number(import.meta.env.VITE_PEERJS_PORT) : undefined,
  peerJsPath: import.meta.env.VITE_PEERJS_PATH || '/',
  peerJsSecure: import.meta.env.VITE_PEERJS_SECURE !== 'false',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
  roomCodeLength: 6,
  syncThresholdSeconds: 1.5,
  heartbeatIntervalMs: 5000,
};

/**
 * Generates human-friendly 6-character room codes (e.g. K7MX42)
 * Avoids ambiguous characters like 0/O, 1/I
 */
export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < APP_CONFIG.roomCodeLength; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validates room code format
 */
export function isValidRoomCode(code: string): boolean {
  if (!code) return false;
  const cleaned = code.trim().toUpperCase();
  return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4,10}$/.test(cleaned);
}
