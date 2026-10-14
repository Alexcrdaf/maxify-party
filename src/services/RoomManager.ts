import { Peer } from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';
import { APP_CONFIG } from '../config';
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
}

export class RoomManager {
  private peer: Peer | null = null;
  public myId: string = '';
  public roomId: string = '';
  public isHost: boolean = false;
  public myProfile: Participant;
  private connections: Map<string, DataConnection> = new Map();
  // Map calls by a composite key: `${peerId}_screen` and `${peerId}_voice`
  private mediaCalls: Map<string, MediaConnection> = new Map();
  private callbacks: RoomCallbacks;
  private heartbeatTimer: any = null;
  private activeLocalStream: MediaStream | null = null;
  private activeVoiceStream: MediaStream | null = null;
  private isScreenSharing: boolean = false;

  constructor(myProfile: Participant, callbacks: RoomCallbacks) {
    this.myProfile = myProfile;
    this.callbacks = callbacks;
  }

  public async initHost(roomCode: string): Promise<string> {
    this.roomId = roomCode.toUpperCase();
    this.isHost = true;
    const hostPeerId = `syncwave-room-${this.roomId}`;

    return new Promise((resolve, reject) => {
      this.callbacks.onConnectionStatusChange('connecting');

      const peerOptions: any = {
        config: {
          iceServers: APP_CONFIG.iceServers,
        },
      };

      if (APP_CONFIG.peerJsHost) {
        peerOptions.host = APP_CONFIG.peerJsHost;
        peerOptions.port = APP_CONFIG.peerJsPort;
        peerOptions.path = APP_CONFIG.peerJsPath;
        peerOptions.secure = APP_CONFIG.peerJsSecure;
      }

      this.peer = new Peer(hostPeerId, peerOptions);

      this.peer.on('open', (id) => {
        this.myId = id;
        this.callbacks.onConnectionStatusChange('connected');
        this.startHeartbeat();
        resolve(id);
      });

      this.peer.on('error', (err: any) => {
        if (err.type === 'unavailable-id') {
          this.callbacks.onError('Комната с таким кодом уже активна. Попробуйте другой код.');
        } else if (err.type === 'server-error' || err.type === 'socket-error' || err.type === 'network') {
          this.callbacks.onError(
            'Ошибка подключения к серверу сигнализации WebRTC (0.peerjs.com). В РФ некоторые провайдеры блокируют серверы сигнализации. Попробуйте включить VPN или подключиться через мобильный интернет.'
          );
        } else {
          this.callbacks.onError(`Ошибка сети WebRTC: ${err.message || err.type}`);
        }
        reject(err);
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingDataConnection(conn);
      });

      this.peer.on('call', (call) => {
        // Auto-answer incoming media calls (voice or screen)
        // If we have an active voice stream and the call is voice, answer with it
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

    return new Promise((resolve, reject) => {
      this.callbacks.onConnectionStatusChange('connecting');

      const peerOptions: any = {
        config: {
          iceServers: APP_CONFIG.iceServers,
        },
      };

      if (APP_CONFIG.peerJsHost) {
        peerOptions.host = APP_CONFIG.peerJsHost;
        peerOptions.port = APP_CONFIG.peerJsPort;
        peerOptions.path = APP_CONFIG.peerJsPath;
        peerOptions.secure = APP_CONFIG.peerJsSecure;
      }

      // By providing an explicit alphanumeric ID, PeerJS skips the HTTP retrieveId() call (fetch to 0.peerjs.com/peerjs/id)
      // which is frequently blocked or filtered by ISPs in the Russian Federation (РФ) and causes 'server-error'.
      const guestPeerId = `syncwave-guest-${this.roomId}-${Math.random().toString(36).substring(2, 9)}`;
      this.peer = new Peer(guestPeerId, peerOptions);

      this.peer.on('open', (id) => {
        this.myId = id;

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
          resolve(id);
        });

        conn.on('data', (data) => {
          this.handleMessage(data as SignalingMessage, conn);
        });

        conn.on('close', () => {
          this.callbacks.onConnectionStatusChange('disconnected');
          this.callbacks.onError('Соединение с ведущим комнаты разорвано.');
        });

        conn.on('error', (err) => {
          this.callbacks.onError(`Ошибка соединения с комнатой: ${err}`);
        });
      });

      this.peer.on('error', (err: any) => {
        if (err.type === 'peer-unavailable') {
          this.callbacks.onError(`Комната «${this.roomId}» не найдена или ведущий ещё не создал её.`);
        } else if (err.type === 'server-error' || err.type === 'socket-error' || err.type === 'network') {
          this.callbacks.onError(
            'Ошибка подключения к серверу сигнализации WebRTC (0.peerjs.com). В РФ провайдеры иногда блокируют или фильтруют этот узел. Попробуйте обновить страницу или подключиться через VPN / мобильный интернет.'
          );
        } else {
          this.callbacks.onError(`Ошибка сети: ${err.message || err.type}`);
        }
        reject(err);
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
        payload: { reason: 'Комната заполнена (достигнут лимит участников)' },
        timestamp: Date.now(),
      } as SignalingMessage);
      conn.close();
      return;
    }

    conn.on('open', () => {
      this.connections.set(conn.peer, conn);

      // If host is currently screen sharing, immediately share the stream with this new peer
      if (this.isHost && this.activeLocalStream && this.peer) {
        this.callPeerWithStream(conn.peer, this.activeLocalStream, true);
      }

      // If host has active voice, immediately connect voice with new peer
      if (this.activeVoiceStream && this.peer) {
        this.callPeerWithStream(conn.peer, this.activeVoiceStream, false);
      }
    });

    conn.on('data', (data) => {
      this.handleMessage(data as SignalingMessage, conn);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.callbacks.onParticipantLeft(conn.peer);
      this.broadcast({
        type: 'participant_left',
        roomId: this.roomId,
        senderId: this.myId,
        payload: { participantId: conn.peer },
        timestamp: Date.now(),
      });
    });
  }

  public callPeerWithStream(peerId: string, stream: MediaStream, isScreenShare: boolean) {
    if (!this.peer || this.peer.destroyed) return;
    const callKey = `${peerId}_${isScreenShare ? 'screen' : 'voice'}`;

    if (this.mediaCalls.has(callKey)) {
      try {
        this.mediaCalls.get(callKey)?.close();
      } catch (_) {}
      this.mediaCalls.delete(callKey);
    }

    try {
      const call = this.peer.call(peerId, stream, {
        metadata: { isScreenShare },
      });
      if (call) {
        this.handleIncomingMediaCall(call);
      }
    } catch (err) {
      console.warn(`Error calling peer ${peerId} with ${isScreenShare ? 'screen' : 'voice'}:`, err);
    }
  }

  private handleIncomingMediaCall(call: MediaConnection) {
    const isScreen = call.metadata?.isScreenShare === true;
    const callKey = `${call.peer}_${isScreen ? 'screen' : 'voice'}`;
    this.mediaCalls.set(callKey, call);

    call.on('stream', (remoteStream) => {
      this.callbacks.onIncomingStream(remoteStream, call.peer, isScreen);
    });

    call.on('close', () => {
      this.mediaCalls.delete(callKey);
    });

    call.on('error', (err) => {
      console.warn(`MediaConnection error on ${callKey}:`, err);
    });
  }

  private handleMessage(msg: SignalingMessage, conn: DataConnection) {
    switch (msg.type) {
      case 'join_request': {
        if (this.isHost) {
          const participant: Participant = {
            ...msg.payload,
            id: conn.peer,
            role: 'viewer',
            connectedAt: Date.now(),
          };
          this.callbacks.onParticipantJoined(participant);

          // Send full room state back to the newly connected participant
          conn.send({
            type: 'room_state',
            roomId: this.roomId,
            senderId: this.myId,
            payload: {
              isScreenSharing: Boolean(this.activeLocalStream && this.isScreenSharing),
              hostId: this.myId,
              hostProfile: this.myProfile,
            },
            timestamp: Date.now(),
          } as SignalingMessage);

          // If host is screen sharing, call the new participant with a small delay to ensure peer is ready
          if (this.activeLocalStream && this.isScreenSharing) {
            setTimeout(() => {
              this.callPeerWithStream(conn.peer, this.activeLocalStream!, true);
            }, 300);
          }

          // Broadcast to everyone else
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
        if (msg.payload?.hostProfile) {
          this.callbacks.onParticipantJoined(msg.payload.hostProfile);
        }
        break;
      }

      case 'request_screen_stream': {
        // If participant asks for screen stream re-send (e.g. negotiation retry or reconnect)
        if (this.isHost && this.activeLocalStream && this.isScreenSharing) {
          this.callPeerWithStream(conn.peer, this.activeLocalStream, true);
        }
        break;
      }

      case 'participant_joined':
        this.callbacks.onParticipantJoined(msg.payload);
        break;

      case 'participant_left':
        this.callbacks.onParticipantLeft(msg.payload.participantId);
        break;

      case 'playback_sync':
        this.callbacks.onPlaybackSync(msg.payload);
        if (this.isHost) {
          this.broadcast(msg, msg.senderId);
        }
        break;

      case 'chat_message':
        this.callbacks.onChatMessage(msg.payload);
        if (this.isHost) {
          this.broadcast(msg, msg.senderId);
        }
        break;

      case 'transfer_host':
        if (msg.payload.newHostId === this.myId) {
          this.isHost = true;
          this.callbacks.onHostTransferred(this.myId);
        } else {
          this.callbacks.onHostTransferred(msg.payload.newHostId);
        }
        break;

      case 'kick':
        if (msg.payload.targetId === this.myId || !msg.payload.targetId) {
          this.callbacks.onKicked();
          this.destroy();
        }
        break;

      case 'participant_update':
        this.callbacks.onParticipantUpdated(msg.payload);
        if (this.isHost) {
          this.broadcast(msg, msg.senderId);
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
    const msg: SignalingMessage = {
      type: 'playback_sync',
      roomId: this.roomId,
      senderId: this.myId,
      payload: state,
      timestamp: Date.now(),
    };

    if (this.isHost) {
      this.broadcast(msg);
    } else {
      const hostConn = this.connections.get(`syncwave-room-${this.roomId}`);
      if (hostConn && hostConn.open) {
        hostConn.send(msg);
      }
    }
  }

  public requestScreenStream() {
    if (this.isHost) return;
    const hostConn = this.connections.get(`syncwave-room-${this.roomId}`);
    if (hostConn && hostConn.open) {
      hostConn.send({
        type: 'request_screen_stream',
        roomId: this.roomId,
        senderId: this.myId,
        payload: null,
        timestamp: Date.now(),
      } as SignalingMessage);
    }
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

    if (this.isHost) {
      this.broadcast(msg);
      this.callbacks.onChatMessage(chatMsg);
    } else {
      const hostConn = this.connections.get(`syncwave-room-${this.roomId}`);
      if (hostConn && hostConn.open) {
        hostConn.send(msg);
        this.callbacks.onChatMessage(chatMsg);
      }
    }
  }

  public sendVoiceStream(stream: MediaStream) {
    this.activeVoiceStream = stream;

    this.connections.forEach((_conn, peerId) => {
      this.callPeerWithStream(peerId, stream, false);
    });
  }

  public stopVoiceStream() {
    this.activeVoiceStream = null;
    this.connections.forEach((_conn, peerId) => {
      const callKey = `${peerId}_voice`;
      if (this.mediaCalls.has(callKey)) {
        this.mediaCalls.get(callKey)?.close();
        this.mediaCalls.delete(callKey);
      }
    });
  }

  public sendScreenStream(stream: MediaStream) {
    this.activeLocalStream = stream;
    this.isScreenSharing = true;

    this.connections.forEach((_conn, peerId) => {
      this.callPeerWithStream(peerId, stream, true);
    });
  }

  public stopScreenStream() {
    if (this.activeLocalStream && this.isScreenSharing) {
      this.activeLocalStream.getTracks().forEach((track) => track.stop());
      this.activeLocalStream = null;
      this.isScreenSharing = false;

      this.connections.forEach((_conn, peerId) => {
        const callKey = `${peerId}_screen`;
        if (this.mediaCalls.has(callKey)) {
          this.mediaCalls.get(callKey)?.close();
          this.mediaCalls.delete(callKey);
        }
      });
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
        payload: { targetId, reason: 'Исключён ведущим комнаты' },
        timestamp: Date.now(),
      } as SignalingMessage);
      conn.close();
      this.connections.delete(targetId);
    }
  }

  public transferHost(newHostId: string) {
    if (!this.isHost) return;
    this.isHost = false;
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

  public destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.stopScreenStream();
    this.stopVoiceStream();
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.mediaCalls.forEach((call) => call.close());
    this.mediaCalls.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.callbacks.onConnectionStatusChange('disconnected');
  }
}
