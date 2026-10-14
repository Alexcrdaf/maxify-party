export type ParticipantRole = 'host' | 'viewer';

export interface Participant {
  id: string;
  name: string;
  avatarSeed: string;
  role: ParticipantRole;
  isAudioMuted: boolean;
  isSpeaking: boolean;
  connectedAt: number;
}

export type PlaybackAction = 'play' | 'pause' | 'seek' | 'rate' | 'source_change';

export interface PlaybackState {
  sourceUrl: string;
  sourceType: 'direct_video' | 'screen_share';
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  lastUpdated: number; // timestamp
  sentBy: string;
}

export interface ChatAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl: string; // base64 data url for images/files
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  file?: ChatAttachment;
}

export interface UserProfile {
  name: string;
  avatarSeed: string;
}

export type SignalingMessageType =
  | 'join_request'
  | 'room_state'
  | 'request_screen_stream'
  | 'playback_sync'
  | 'chat_message'
  | 'kick'
  | 'transfer_host'
  | 'participant_joined'
  | 'participant_left'
  | 'participant_update'
  | 'ping'
  | 'pong';

export interface SignalingMessage {
  type: SignalingMessageType;
  roomId: string;
  senderId: string;
  payload: any;
  timestamp: number;
}
