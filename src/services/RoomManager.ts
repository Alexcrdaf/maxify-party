import { Peer } from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';
import { APP_CONFIG, computeLivePlaybackState } from '../config';
import type {
  Participant,
  PlaybackState,
  ChatMessage,
  SignalingMessage,
} from '../types';

export interface RoomCallbacks {
  onParticipantJoined: (p: Participant) => void;
  onParticipantLeft: (pId: string) => void;
  onParticipantUpdated: (p: Participant) => void;
  onPlaybackSync: (state: PlaybackState) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onHostTransferred: (newHostId: string) => void;
  onKicked: () => void;
  onError: (err: string) => void;
  onConnectionStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting') => void;
  onIncomingStream: (stream: MediaStream, senderId: string, isScreenShare: boolean) => void;
  onStreamStopped?: (senderId: string, isScreenShare: boolean) => void;
  onActiveStreamerChanged?: (streamerId: string | null, streamerName?: string) => void;
}

export class RoomManager {
  private peer: Peer | null = null;
  public myId: string = '';
  public roomId: string = '';
  public isHost: boolean = false;
  public myProfile: Participant;
  private connections: Map<string, DataConnection> = new Map();
  private mediaCalls: Map<string, MediaConnection> = new Map();
  private callbacks: RoomCallbacks;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private serverKeepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private streamRecoveryTimers: Array<ReturnType<typeof setTimeout>> = [];
  private activeLocalStream: MediaStream | null = null;
  private activeVoiceStream: MediaStream | null = null;
  private isScreenSharing: boolean = false;
  private hasRemoteScreenStream: boolean = false;
  private activeStreamerId: string | null = null;
  private activeStreamerName: string = '';
  private messageCounters: Map<string, { count: number; resetTime: number }> = new Map();
  private currentHostId: string = '';
  private participantsMap: Map<string, Participant> = new Map();
  private lastPlaybackState: PlaybackState | null = null;

  constructor(myProfile: Participant, callbacks: RoomCallbacks) {
    this.myProfile = myProfile;
    this.callbacks = callbacks;
  }

  private buildPeerOptions(): Record<string, unknown> {
    const peerOptions: Record<string, unknown> = {
      config: {
        iceServers: APP_CONFIG.iceServers,
        iceCandidatePoolSize: APP_CONFIG.iceCandidatePoolSize,
        sdpSemantics: 'unified-plan',
      },
    };

    if (APP_CONFIG.peerJsHost) {
      peerOptions.host = APP_CONFIG.peerJsHost;
      peerOptions.port = APP_CONFIG.peerJsPort;
      peerOptions.path = APP_CONFIG.peerJsPath;
      peerOptions.secure = APP_CONFIG.peerJsSecure;
    }

    return peerOptions;
  }

  private getTargetPeerIds(): string[] {
    const ids = new Set<string>();
    this.connections.forEach((_conn, peerId) => {
      if (peerId && peerId !== this.myId) ids.add(peerId);
    });
    this.participantsMap.forEach((_p, peerId) => {
      if (peerId && peerId !== this.myId) ids.add(peerId);
    });
    return Array.from(ids);
  }

  private sendToHostOrBroadcast(msg: SignalingMessage, excludePeerId?: string) {
    if (this.isHost) {
      this.broadcast(msg, excludePeerId);
    } else {
      const hostId = this.currentHostId || `syncwave-room-${this.roomId}`;
      const hostConn = this.connections.get(hostId);
      if (hostConn && hostConn.open) {
        hostConn.send(msg);
      }
    }
  }

  private clearStreamRecoveryTimers() {
    this.streamRecoveryTimers.forEach((t) => clearTimeout(t));
    this.streamRecoveryTimers = [];
  }

  private scheduleStreamRecovery() {
    this.clearStreamRecoveryTimers();
    if (!this.activeStreamerId || this.activeStreamerId === this.myId) return;

    const delays = [1200, 2800];
    delays.forEach((delay) => {
      const timer = setTimeout(() => {
        if (
          !this.hasRemoteScreenStream &&
          !this.isScreenSharing &&
          this.activeStreamerId &&
          this.activeStreamerId !== this.myId
        ) {
          this.requestScreenStream();
        }
      }, delay);
      this.streamRecoveryTimers.push(timer);
    });
  }

  public async initHost(roomCode: string): Promise<string> {
    this.roomId = roomCode.toUpperCase();
    this.isHost = true;
    const hostPeerId = `syncwave-room-${this.roomId}`;
    this.currentHostId = hostPeerId;

    return new Promise((resolve, reject) => {
      this.callbacks.onConnectionStatusChange('connecting');

      this.peer = new Peer(hostPeerId, this.buildPeerOptions());

      this.peer.on('open', (id) => {
        this.myId = id;
        this.myProfile = { ...this.myProfile, id };
        this.participantsMap.set(id, this.myProfile);
        this.callbacks.onConnectionStatusChange('connected');
        this.startHeartbeat();
        this.startServerKeepAlive();
        resolve(id);
      });

      this.peer.on('disconnected', () => {
        if (this.peer && !this.peer.destroyed) {
          this.callbacks.onConnectionStatusChange('reconnecting');
          try {
            this.peer.reconnect();
          } catch (e) {
            console.warn('Peer reconnect failed:', e);
          }
        }
      });

      this.peer.on('error', (err: any) => {
        if (err.type === 'unavailable-id') {
          this.callbacks.onError('Комната с таким кодом уже активна. Попробуйте другой код.');
        } else if (err.type === 'server-error' || err.type === 'socket-error' || err.type === 'network') {
          this.callbacks.onError(
            'Ошибка сигнального узла WebRTC (0.peerjs.com). Если провайдер ограничивает WebSocket, попробуйте обновить страницу или сменить сеть.'
          );
        } else if (err.type !== 'peer-unavailable') {
          this.callbacks.onError(`Ошибка сети WebRTC: ${err.message || err.type}`);
        }
        if (!this.myId) {
          reject(err);
        }
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingDataConnection(conn);
      });

      this.peer.on('call', (call) => {
        const isScreen = call.metadata?.isScreenShare === true;
        if (!isScreen && this.activeVoiceStream) {
          call.answer(this.activeVoiceStream);
        } else {
          call.answer();
        }
        this.handleIncomingMediaCall(call);
      });
    });
  }

  public async joinRoom(roomCode: string): Promise<string> {
    this.roomId = roomCode.toUpperCase();
    this.isHost = false;
    const hostPeerId = `syncwave-room-${this.roomId}`;
    this.currentHostId = hostPeerId;

    return new Promise((resolve, reject) => {
      this.callbacks.onConnectionStatusChange('connecting');

      let suffix = '';
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const buf = new Uint8Array(6);
        crypto.getRandomValues(buf);
        suffix = Array.from(buf, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 8);
      } else {
        suffix = Math.random().toString(36).substring(2, 10);
      }
      const guestPeerId = `syncwave-guest-${this.roomId}-${suffix}`;
      this.peer = new Peer(guestPeerId, this.buildPeerOptions());

      let resolved = false;

      this.peer.on('open', (id) => {
        this.myId = id;
        this.myProfile = { ...this.myProfile, id };
        this.participantsMap.set(id, this.myProfile);

        const conn = this.peer!.connect(hostPeerId, {
          reliable: true,
          metadata: { profile: this.myProfile },
        });

        conn.on('open', () => {
          this.connections.set(hostPeerId, conn);
          this.callbacks.onConnectionStatusChange('connected');

          const joinMsg: SignalingMessage = {
            type: 'join_request',
            roomId: this.roomId,
            senderId: this.myId,
            payload: this.myProfile,
            timestamp: Date.now(),
          };
          conn.send(joinMsg);
          this.startHeartbeat();
          this.startServerKeepAlive();
          if (!resolved) {
            resolved = true;
            resolve(id);
          }
        });

        conn.on('data', (data) => {
          this.handleMessage(data as SignalingMessage, conn);
        });

        conn.on('close', () => {
          this.callbacks.onConnectionStatusChange('disconnected');
          this.callbacks.onError('Соединение с ведущим комнаты завершено.');
        });

        conn.on('error', (err) => {
          this.callbacks.onError(`Ошибка соединения с залом: ${err}`);
        });
      });

      this.peer.on('disconnected', () => {
        if (this.peer && !this.peer.destroyed) {
          this.callbacks.onConnectionStatusChange('reconnecting');
          try {
            this.peer.reconnect();
          } catch (e) {
            console.warn('Guest peer reconnect failed:', e);
          }
        }
      });

      this.peer.on('error', (err: any) => {
        if (err.type === 'peer-unavailable') {
          if (!resolved) {
            this.callbacks.onError(`Зал «${this.roomId}» не найден или ещё не открыт ведущим.`);
            reject(err);
          }
        } else if (err.type === 'server-error' || err.type === 'socket-error' || err.type === 'network') {
          this.callbacks.onError(
            'Не удалось связаться с сигнальным сервером WebRTC (0.peerjs.com). Проверьте сеть или обновите страницу.'
          );
          if (!resolved) reject(err);
        } else {
          this.callbacks.onError(`Ошибка сети: ${err.message || err.type}`);
          if (!resolved) reject(err);
        }
      });

      this.peer.on('call', (call) => {
        const isScreen = call.metadata?.isScreenShare === true;
        if (!isScreen && this.activeVoiceStream) {
          call.answer(this.activeVoiceStream);
        } else {
          call.answer();
        }
        this.handleIncomingMediaCall(call);
      });
    });
  }

  private handleIncomingDataConnection(conn: DataConnection) {
    if (this.connections.size >= APP_CONFIG.maxParticipants) {
      conn.send({
        type: 'kick',
        roomId: this.roomId,
        senderId: this.myId,
        payload: { targetId: conn.peer, reason: 'Зал заполнен (достигнут лимит зрителей)' },
        timestamp: Date.now(),
      } as SignalingMessage);
      conn.close();
      return;
    }

    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (data) => {
      this.handleMessage(data as SignalingMessage, conn);
    });

    conn.on('close', () => {
      const leftId = conn.peer;
      this.connections.delete(leftId);
      this.participantsMap.delete(leftId);

      if (this.activeStreamerId === leftId) {
        this.activeStreamerId = null;
        this.activeStreamerName = '';
        this.hasRemoteScreenStream = false;
        this.callbacks.onActiveStreamerChanged?.(null);
        this.callbacks.onStreamStopped?.(leftId, true);
      }

      this.callbacks.onParticipantLeft(leftId);
      this.broadcast({
        type: 'participant_left',
        roomId: this.roomId,
        senderId: this.myId,
        payload: { participantId: leftId },
        timestamp: Date.now(),
      });
    });
  }

  public callPeerWithStream(peerId: string, stream: MediaStream, isScreenShare: boolean) {
    if (!this.peer || this.peer.destroyed || !peerId || peerId === this.myId) return;
    const callKey = `out_${peerId}_${isScreenShare ? 'screen' : 'voice'}`;

    const existingCall = this.mediaCalls.get(callKey);
    if (existingCall) {
      try {
        existingCall.off('close');
        existingCall.off('stream');
        existingCall.close();
      } catch {}
      this.mediaCalls.delete(callKey);
    }

    try {
      const call = this.peer.call(peerId, stream, {
        metadata: {
          isScreenShare,
          streamerName: this.myProfile.name,
        },
      });
      if (call) {
        this.mediaCalls.set(callKey, call);

        if (isScreenShare) {
          try {
            const pc = (call as any).peerConnection as RTCPeerConnection;
            if (pc && pc.getSenders) {
              const viewerCount = Math.max(1, this.getTargetPeerIds().length);
              // Scale bitrate cleanly for 2+ simultaneous viewers so host uplink stays smooth
              const targetMaxBitrate =
                viewerCount <= 2 ? 3500000 : Math.max(1500000, Math.floor(7000000 / viewerCount));

              const applyBitrateLimit = () => {
                const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
                if (videoSender && videoSender.getParameters) {
                  const params = videoSender.getParameters();
                  if (!params.encodings || params.encodings.length === 0) {
                    params.encodings = [{}];
                  }
                  params.encodings[0].maxBitrate = targetMaxBitrate;
                  videoSender.setParameters(params).catch(() => {});
                }
              };
              setTimeout(applyBitrateLimit, 450);
            }
          } catch {}
        }

        call.on('close', () => {
          this.mediaCalls.delete(callKey);
        });
        call.on('error', (err) => {
          console.warn(`Outgoing media call error on ${callKey}:`, err);
          this.mediaCalls.delete(callKey);
        });
      }
    } catch (err) {
      console.warn(`Error calling peer ${peerId} with ${isScreenShare ? 'screen' : 'voice'}:`, err);
    }
  }

  private handleIncomingMediaCall(call: MediaConnection) {
    const isScreen = call.metadata?.isScreenShare === true;
    const callKey = `in_${call.peer}_${isScreen ? 'screen' : 'voice'}`;

    const existingCall = this.mediaCalls.get(callKey);
    if (existingCall && existingCall !== call) {
      try {
        existingCall.off('close');
        existingCall.off('stream');
        existingCall.close();
      } catch {}
      this.mediaCalls.delete(callKey);
    }

    this.mediaCalls.set(callKey, call);

    call.on('stream', (remoteStream) => {
      if (isScreen) {
        this.hasRemoteScreenStream = true;
        this.activeStreamerId = call.peer;
        const senderName =
          call.metadata?.streamerName || this.participantsMap.get(call.peer)?.name || 'Участник';
        this.activeStreamerName = senderName;
        this.clearStreamRecoveryTimers();
        this.callbacks.onActiveStreamerChanged?.(call.peer, senderName);
      }

      this.callbacks.onIncomingStream(remoteStream, call.peer, isScreen);

      remoteStream.getTracks().forEach((track) => {
        track.onended = () => {
          if (isScreen) {
            this.hasRemoteScreenStream = false;
          }
          this.callbacks.onStreamStopped?.(call.peer, isScreen);
        };
      });
    });

    call.on('close', () => {
      this.mediaCalls.delete(callKey);
      if (isScreen) {
        this.hasRemoteScreenStream = false;
      }
      this.callbacks.onStreamStopped?.(call.peer, isScreen);
    });

    call.on('error', (err) => {
      console.warn(`MediaConnection error on ${callKey}:`, err);
      this.mediaCalls.delete(callKey);
    });
  }

  private checkRateLimit(peerId: string): boolean {
    const now = Date.now();
    const tracker = this.messageCounters.get(peerId) || { count: 0, resetTime: now + 1000 };
    if (now > tracker.resetTime) {
      tracker.count = 1;
      tracker.resetTime = now + 1000;
    } else {
      tracker.count++;
      if (tracker.count > 20) {
        return true;
      }
    }
    this.messageCounters.set(peerId, tracker);
    return false;
  }

  private handleMessage(msg: SignalingMessage, conn: DataConnection) {
    if (msg.roomId !== this.roomId) return;

    if (this.checkRateLimit(conn.peer)) {
      console.warn(`Rate limit exceeded for peer: ${conn.peer}, dropping message ${msg.type}`);
      return;
    }

    const isFromHost = conn.peer === this.currentHostId || conn.peer === this.myId;

    switch (msg.type) {
      case 'join_request': {
        if (this.isHost) {
          const participant: Participant = {
            ...msg.payload,
            id: conn.peer,
            role: 'viewer',
            connectedAt: Date.now(),
          };
          this.participantsMap.set(conn.peer, participant);
          this.callbacks.onParticipantJoined(participant);

          const livePlayback = this.lastPlaybackState
            ? (computeLivePlaybackState(this.lastPlaybackState) as PlaybackState)
            : null;

          conn.send({
            type: 'room_state',
            roomId: this.roomId,
            senderId: this.myId,
            payload: {
              isScreenSharing: Boolean(this.activeStreamerId),
              activeStreamerId: this.activeStreamerId,
              activeStreamerName: this.activeStreamerName,
              hostId: this.myId,
              hostProfile: this.myProfile,
              participants: Array.from(this.participantsMap.values()),
              playbackState: livePlayback,
            },
            timestamp: Date.now(),
          } as SignalingMessage);

          // If host is sharing screen, immediately push stream to the newcomer
          if (this.activeLocalStream && this.isScreenSharing) {
            setTimeout(() => {
              if (this.activeLocalStream && this.isScreenSharing) {
                this.callPeerWithStream(conn.peer, this.activeLocalStream, true);
              }
            }, 220);
          }

          // If host has active voice, connect voice stream to the newcomer
          if (this.activeVoiceStream) {
            setTimeout(() => {
              if (this.activeVoiceStream) {
                this.callPeerWithStream(conn.peer, this.activeVoiceStream, false);
              }
            }, 380);
          }

          // Broadcast newcomer to all other participants (so any guest who is streaming/speaking also calls newcomer!)
          this.broadcast(
            {
              type: 'participant_joined',
              roomId: this.roomId,
              senderId: this.myId,
              payload: participant,
              timestamp: Date.now(),
            },
            conn.peer
          );
        }
        break;
      }

      case 'room_state': {
        if (msg.payload?.hostId) {
          this.currentHostId = msg.payload.hostId;
        }
        if (Array.isArray(msg.payload?.participants)) {
          msg.payload.participants.forEach((p: Participant) => {
            this.participantsMap.set(p.id, p);
            this.callbacks.onParticipantJoined(p);
          });
        } else if (msg.payload?.hostProfile) {
          this.participantsMap.set(msg.payload.hostProfile.id, msg.payload.hostProfile);
          this.callbacks.onParticipantJoined(msg.payload.hostProfile);
        }

        if (msg.payload?.activeStreamerId) {
          this.activeStreamerId = msg.payload.activeStreamerId;
          this.activeStreamerName = msg.payload.activeStreamerName || 'Ведущий';
          this.callbacks.onActiveStreamerChanged?.(this.activeStreamerId, this.activeStreamerName);
          this.scheduleStreamRecovery();
        }

        if (msg.payload?.playbackState) {
          this.lastPlaybackState = msg.payload.playbackState;
          this.callbacks.onPlaybackSync(msg.payload.playbackState);
        }
        break;
      }

      case 'participant_joined': {
        const newPeer = msg.payload as Participant;
        if (newPeer?.id) {
          this.participantsMap.set(newPeer.id, newPeer);
          this.callbacks.onParticipantJoined(newPeer);

          // Mesh media: if WE (even as a guest!) are currently sharing screen or voice, call the newly joined viewer directly!
          if (this.activeLocalStream && this.isScreenSharing && newPeer.id !== this.myId) {
            setTimeout(() => {
              if (this.activeLocalStream && this.isScreenSharing) {
                this.callPeerWithStream(newPeer.id, this.activeLocalStream, true);
              }
            }, 250);
          }
          if (this.activeVoiceStream && newPeer.id !== this.myId) {
            setTimeout(() => {
              if (this.activeVoiceStream) {
                this.callPeerWithStream(newPeer.id, this.activeVoiceStream, false);
              }
            }, 420);
          }
        }
        break;
      }

      case 'participant_left': {
        const leftId = msg.payload?.participantId;
        if (leftId) {
          this.participantsMap.delete(leftId);
          if (this.activeStreamerId === leftId) {
            this.activeStreamerId = null;
            this.activeStreamerName = '';
            this.hasRemoteScreenStream = false;
            this.clearStreamRecoveryTimers();
            this.callbacks.onActiveStreamerChanged?.(null);
            this.callbacks.onStreamStopped?.(leftId, true);
          }
          this.callbacks.onParticipantLeft(leftId);
        }
        break;
      }

      case 'stream_started': {
        const { streamerId, streamerName } = msg.payload || {};
        if (streamerId) {
          this.activeStreamerId = streamerId;
          this.activeStreamerName = streamerName || 'Участник';
          this.callbacks.onActiveStreamerChanged?.(streamerId, this.activeStreamerName);

          if (streamerId !== this.myId) {
            // If another user took over screen sharing while we were sharing, cleanly stop our local share
            if (this.isScreenSharing && this.activeLocalStream) {
              this.activeLocalStream.getTracks().forEach((t) => t.stop());
              this.activeLocalStream = null;
              this.isScreenSharing = false;
            }
            this.hasRemoteScreenStream = false;
            this.scheduleStreamRecovery();
          }

          if (this.isHost) {
            this.broadcast(msg, conn.peer);
          }
        }
        break;
      }

      case 'request_screen_stream': {
        const requesterId = msg.payload?.requesterId || conn.peer;
        if (this.activeLocalStream && this.isScreenSharing && requesterId !== this.myId) {
          this.callPeerWithStream(requesterId, this.activeLocalStream, true);
        } else if (
          this.isHost &&
          this.activeStreamerId &&
          this.activeStreamerId !== this.myId
        ) {
          // Forward request to the guest who is currently streaming
          const streamerConn = this.connections.get(this.activeStreamerId);
          if (streamerConn && streamerConn.open) {
            streamerConn.send({
              type: 'request_screen_stream',
              roomId: this.roomId,
              senderId: this.myId,
              payload: { requesterId },
              timestamp: Date.now(),
            } as SignalingMessage);
          }
        }
        break;
      }

      case 'stream_stopped': {
        const { isScreen } = msg.payload || {};
        const screenFlag = isScreen !== false;
        if (screenFlag && this.activeStreamerId === msg.senderId) {
          this.activeStreamerId = null;
          this.activeStreamerName = '';
          this.hasRemoteScreenStream = false;
          this.clearStreamRecoveryTimers();
          this.callbacks.onActiveStreamerChanged?.(null);
        }
        this.callbacks.onStreamStopped?.(msg.senderId, screenFlag);
        if (this.isHost) {
          this.broadcast(msg, conn.peer);
        }
        break;
      }

      case 'playback_sync':
        if (!this.isHost && !isFromHost) {
          console.warn('Playback sync ignored from non-host peer:', conn.peer);
          return;
        }
        this.lastPlaybackState = msg.payload;
        this.callbacks.onPlaybackSync(msg.payload);
        if (this.isHost) {
          this.broadcast(msg, conn.peer);
        }
        break;

      case 'chat_message': {
        const msgPayload = msg.payload as ChatMessage;
        if (msgPayload?.file) {
          const size = msgPayload.file.size || 0;
          const dataUrlLen = msgPayload.file.dataUrl?.length || 0;
          if (size > 15 * 1024 * 1024 || dataUrlLen > 22 * 1024 * 1024) {
            console.warn('Rejected oversized chat attachment from:', conn.peer);
            return;
          }
        }
        this.callbacks.onChatMessage(msgPayload);
        if (this.isHost) {
          this.broadcast(msg, conn.peer);
        }
        break;
      }

      case 'transfer_host':
        if (!isFromHost && !this.isHost) {
          console.warn('Unauthorized transfer_host attempt from:', conn.peer);
          return;
        }
        this.currentHostId = msg.payload.newHostId;
        if (msg.payload.newHostId === this.myId) {
          this.isHost = true;
          this.callbacks.onHostTransferred(this.myId);
        } else {
          this.isHost = false;
          this.callbacks.onHostTransferred(msg.payload.newHostId);
        }
        break;

      case 'kick':
        if (!isFromHost) {
          console.warn('Unauthorized kick attempt ignored from:', conn.peer);
          return;
        }
        if (msg.payload?.targetId === this.myId) {
          this.callbacks.onKicked();
          this.destroy();
        }
        break;

      case 'participant_update':
        if (msg.payload?.id) {
          this.participantsMap.set(msg.payload.id, msg.payload);
        }
        this.callbacks.onParticipantUpdated(msg.payload);
        if (this.isHost) {
          this.broadcast(msg, conn.peer);
        }
        break;

      case 'ping':
        conn.send({
          type: 'pong',
          roomId: this.roomId,
          senderId: this.myId,
          payload: null,
          timestamp: Date.now(),
        } as SignalingMessage);
        break;
    }
  }

  public broadcast(msg: SignalingMessage, excludePeerId?: string) {
    this.connections.forEach((conn, peerId) => {
      if (peerId !== excludePeerId && conn.open) {
        conn.send(msg);
      }
    });
  }

  public sendPlaybackSync(state: PlaybackState) {
    this.lastPlaybackState = state;
    const msg: SignalingMessage = {
      type: 'playback_sync',
      roomId: this.roomId,
      senderId: this.myId,
      payload: state,
      timestamp: Date.now(),
    };
    this.sendToHostOrBroadcast(msg);
  }

  public updateMyProfile(partial: Partial<Participant>) {
    this.myProfile = {
      ...this.myProfile,
      ...partial,
      id: this.myId || this.myProfile.id,
    };
    if (this.myProfile.id) {
      this.participantsMap.set(this.myProfile.id, this.myProfile);
      this.callbacks.onParticipantUpdated(this.myProfile);
    }

    const msg: SignalingMessage = {
      type: 'participant_update',
      roomId: this.roomId,
      senderId: this.myId,
      payload: this.myProfile,
      timestamp: Date.now(),
    };
    this.sendToHostOrBroadcast(msg);
  }

  public requestScreenStream() {
    const msg: SignalingMessage = {
      type: 'request_screen_stream',
      roomId: this.roomId,
      senderId: this.myId,
      payload: { requesterId: this.myId },
      timestamp: Date.now(),
    };
    this.sendToHostOrBroadcast(msg);
  }

  public sendChatMessage(text: string, file?: import('../types').ChatAttachment) {
    const chatMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: this.myId,
      senderName: this.myProfile.name,
      text: text.slice(0, 1000),
      timestamp: Date.now(),
      file,
    };

    const msg: SignalingMessage = {
      type: 'chat_message',
      roomId: this.roomId,
      senderId: this.myId,
      payload: chatMsg,
      timestamp: Date.now(),
    };

    this.sendToHostOrBroadcast(msg);
    this.callbacks.onChatMessage(chatMsg);
  }

  public sendVoiceStream(stream: MediaStream) {
    this.activeVoiceStream = stream;

    this.getTargetPeerIds().forEach((peerId) => {
      this.callPeerWithStream(peerId, stream, false);
    });
  }

  public stopVoiceStream() {
    this.activeVoiceStream = null;
    this.getTargetPeerIds().forEach((peerId) => {
      const callKey = `out_${peerId}_voice`;
      if (this.mediaCalls.has(callKey)) {
        try {
          this.mediaCalls.get(callKey)?.close();
        } catch {}
        this.mediaCalls.delete(callKey);
      }
    });

    const msg: SignalingMessage = {
      type: 'stream_stopped',
      roomId: this.roomId,
      senderId: this.myId,
      payload: { isScreen: false },
      timestamp: Date.now(),
    };
    this.sendToHostOrBroadcast(msg);
  }

  public sendScreenStream(stream: MediaStream) {
    this.activeLocalStream = stream;
    this.isScreenSharing = true;
    this.activeStreamerId = this.myId;
    this.activeStreamerName = this.myProfile.name;
    this.updateMyProfile({ isStreamingScreen: true });
    this.callbacks.onActiveStreamerChanged?.(this.myId, this.myProfile.name);

    const startMsg: SignalingMessage = {
      type: 'stream_started',
      roomId: this.roomId,
      senderId: this.myId,
      payload: {
        streamerId: this.myId,
        streamerName: this.myProfile.name,
      },
      timestamp: Date.now(),
    };
    this.sendToHostOrBroadcast(startMsg);

    this.getTargetPeerIds().forEach((peerId) => {
      this.callPeerWithStream(peerId, stream, true);
    });
  }

  public stopScreenStream() {
    if (this.activeLocalStream || this.isScreenSharing) {
      if (this.activeLocalStream) {
        this.activeLocalStream.getTracks().forEach((track) => track.stop());
      }
      this.activeLocalStream = null;
      this.isScreenSharing = false;
      if (this.activeStreamerId === this.myId) {
        this.activeStreamerId = null;
        this.activeStreamerName = '';
        this.callbacks.onActiveStreamerChanged?.(null);
      }
      this.updateMyProfile({ isStreamingScreen: false });

      this.getTargetPeerIds().forEach((peerId) => {
        const callKey = `out_${peerId}_screen`;
        if (this.mediaCalls.has(callKey)) {
          try {
            this.mediaCalls.get(callKey)?.close();
          } catch {}
          this.mediaCalls.delete(callKey);
        }
      });

      const msg: SignalingMessage = {
        type: 'stream_stopped',
        roomId: this.roomId,
        senderId: this.myId,
        payload: { isScreen: true },
        timestamp: Date.now(),
      };
      this.sendToHostOrBroadcast(msg);
    }
  }

  public kickParticipant(targetId: string) {
    if (!this.isHost) return;
    const conn = this.connections.get(targetId);
    if (conn && conn.open) {
      conn.send({
        type: 'kick',
        roomId: this.roomId,
        senderId: this.myId,
        payload: { targetId, reason: 'Исключён ведущим зала' },
        timestamp: Date.now(),
      } as SignalingMessage);
      conn.close();
      this.connections.delete(targetId);
      this.participantsMap.delete(targetId);
    }
  }

  public transferHost(newHostId: string) {
    if (!this.isHost) return;
    this.isHost = false;
    this.currentHostId = newHostId;
    this.broadcast({
      type: 'transfer_host',
      roomId: this.roomId,
      senderId: this.myId,
      payload: { newHostId },
      timestamp: Date.now(),
    });
    this.callbacks.onHostTransferred(newHostId);
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.connections.size > 0) {
        this.broadcast({
          type: 'ping',
          roomId: this.roomId,
          senderId: this.myId,
          payload: null,
          timestamp: Date.now(),
        });
      }
    }, APP_CONFIG.heartbeatIntervalMs);
  }

  private startServerKeepAlive() {
    if (this.serverKeepAliveTimer) clearInterval(this.serverKeepAliveTimer);
    this.serverKeepAliveTimer = setInterval(() => {
      if (this.peer && !this.peer.destroyed) {
        if (this.peer.disconnected) {
          try {
            this.peer.reconnect();
          } catch (e) {
            console.warn('Keep-alive reconnect attempt failed:', e);
          }
        } else {
          try {
            const socket: any = (this.peer as any).socket;
            if (socket && typeof socket._send === 'function') {
              socket._send({ type: 'HEARTBEAT' });
            }
          } catch {}
        }
      }
    }, 25000);
  }

  public destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.serverKeepAliveTimer) clearInterval(this.serverKeepAliveTimer);
    this.clearStreamRecoveryTimers();
    this.stopScreenStream();
    this.stopVoiceStream();
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.mediaCalls.forEach((call) => call.close());
    this.mediaCalls.clear();
    this.messageCounters.clear();
    this.participantsMap.clear();
    this.lastPlaybackState = null;
    this.activeStreamerId = null;
    this.hasRemoteScreenStream = false;
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.callbacks.onConnectionStatusChange('disconnected');
  }
}
