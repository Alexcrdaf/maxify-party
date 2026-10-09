import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomManager } from './RoomManager';
import type { Participant, PlaybackState, ChatMessage } from '../types';

describe('RoomManager & Networking Suite', () => {
  let mockCallbacks: any;
  const mockProfile: Participant = {
    id: 'user-123',
    name: 'Тестер',
    avatarSeed: 'test',
    role: 'host',
    isAudioMuted: true,
    isSpeaking: false,
    connectedAt: 1000,
  };

  beforeEach(() => {
    mockCallbacks = {
      onParticipantJoined: vi.fn(),
      onParticipantLeft: vi.fn(),
      onParticipantUpdated: vi.fn(),
      onPlaybackSync: vi.fn(),
      onChatMessage: vi.fn(),
      onHostTransferred: vi.fn(),
      onKicked: vi.fn(),
      onError: vi.fn(),
      onConnectionStatusChange: vi.fn(),
      onIncomingStream: vi.fn(),
    };
  });

  it('correctly creates RoomManager instance with state profile', () => {
    const manager = new RoomManager(mockProfile, mockCallbacks);
    expect(manager).toBeDefined();
    expect(manager.myProfile.name).toBe('Тестер');
    expect(manager.isHost).toBe(false);
  });

  it('handles playback sync messaging without mutation', () => {
    const manager = new RoomManager(mockProfile, mockCallbacks);
    const playback: PlaybackState = {
      sourceUrl: 'https://example.com/movie.mp4',
      sourceType: 'direct_video',
      isPlaying: true,
      currentTime: 42,
      playbackRate: 1,
      lastUpdated: Date.now(),
      sentBy: 'host-1',
    };

    // Simulate incoming playback_sync packet
    (manager as any).handleMessage({
      type: 'playback_sync',
      roomId: 'K7MX42',
      senderId: 'host-1',
      payload: playback,
      timestamp: Date.now(),
    }, { peer: 'host-1' });

    expect(mockCallbacks.onPlaybackSync).toHaveBeenCalledWith(playback);
  });

  it('processes incoming chat messages and invokes callback', () => {
    const manager = new RoomManager(mockProfile, mockCallbacks);
    const chatMsg: ChatMessage = {
      id: 'msg-1',
      senderId: 'user-2',
      senderName: 'Друг',
      text: 'Привет!',
      timestamp: Date.now(),
    };

    (manager as any).handleMessage({
      type: 'chat_message',
      roomId: 'K7MX42',
      senderId: 'user-2',
      payload: chatMsg,
      timestamp: Date.now(),
    }, { peer: 'user-2' });

    expect(mockCallbacks.onChatMessage).toHaveBeenCalledWith(chatMsg);
  });

  it('handles host transfer protocol correctly', () => {
    const manager = new RoomManager(mockProfile, mockCallbacks);
    manager.myId = 'new-host-id';

    (manager as any).handleMessage({
      type: 'transfer_host',
      roomId: 'K7MX42',
      senderId: 'old-host-id',
      payload: { newHostId: 'new-host-id' },
      timestamp: Date.now(),
    }, { peer: 'old-host-id' });

    expect(manager.isHost).toBe(true);
    expect(mockCallbacks.onHostTransferred).toHaveBeenCalledWith('new-host-id');
  });

  it('handles kick notification if target matches', () => {
    const manager = new RoomManager(mockProfile, mockCallbacks);
    manager.myId = 'target-user';

    (manager as any).handleMessage({
      type: 'kick',
      roomId: 'K7MX42',
      senderId: 'host',
      payload: { targetId: 'target-user', reason: 'Тест' },
      timestamp: Date.now(),
    }, { peer: 'host' });

    expect(mockCallbacks.onKicked).toHaveBeenCalled();
  });
});
