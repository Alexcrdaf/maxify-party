/**
 * Maxify Core Services: WebRTC Signaling, Voice Chat, and Screen Capture
 * Объединённый сервис сетевой синхронизации (WebRTC PeerJS P2P),
 * захвата экрана (getDisplayMedia 60 FPS) и голосового чата (Web Audio VAD).
 */

export { RoomManager } from './RoomManager';
export type { RoomCallbacks } from './RoomManager';

export { ScreenCaptureService } from './ScreenCaptureService';
export type { ScreenShareOptions } from './ScreenCaptureService';

export { VoiceChatService } from './VoiceChatService';
