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
  onStreamStopped?: (senderId: string, isScreenShare: boolean) => void;
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
  private serverKeepAliveTimer: any = null;
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
        this.startServerKeepAlive();
        resolve(id);
      });

      this.peer.on('disconnected', () => {
        // If peer disconnected from signaling server (e.g. idle timeout after ~15-20 min),
        // reconnect to server without destroying the peer ID or active calls
        if (this.peer && !this.peer.destroyed) {
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
          this.startServerKeepAlive();
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

      this.peer.on('disconnected', () => {
        if (this.peer && !this.peer.destroyed) {
          try {
            this.peer.reconnect();
          } catch (e) {
            console.warn('Guest peer reconnect failed:', e);
          }
        }
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
      // Note: We deliberately do NOT immediately callPeerWithStream here.
      // The join_request / room_state handshake ensures the participant's profile is fully registered
      // and their WebRTC peer is ready to answer incoming media streams.
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
    const callKey = `out_${peerId}_${isScreenShare ? 'screen' : 'voice'}`;

    // If an active outgoing media connection for this type exists, close it cleanly without triggering onStreamStopped
    const existingCall = this.mediaCalls.get(callKey);
    if (existingCall) {
      try {
        // Detach event listeners so replacement doesn't trigger onStreamStopped
        existingCall.off('close');
        existingCall.off('stream');
        existingCall.close();
      } catch (_) {}
      this.mediaCalls.delete(callKey);
    }

    try {
      const call = this.peer.call(peerId, stream, {
        metadata: { isScreenShare },
      });
      if (call) {
        // Track the outgoing call so we can close it when stopping the stream
        this.mediaCalls.set(callKey, call);
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

    // Clean up any stale incoming call for this peer/type
    const existingCall = this.mediaCalls.get(callKey);
    if (existingCall && existingCall !== call) {
      try {
        existingCall.off('close');
        existingCall.off('stream');
        existingCall.close();
      } catch (_) {}
      this.mediaCalls.delete(callKey);
    }

    this.mediaCalls.set(callKey, call);

    call.on('stream', (remoteStream) => {
      this.callbacks.onIncomingStream(remoteStream, call.peer, isScreen);

      // Listen for remote track endings
      remoteStream.getTracks().forEach((track) => {
        track.onended = () => {
          if (this.callbacks.onStreamStopped) {
            this.callbacks.onStreamStopped(call.peer, isScreen);
          }
        };
      });
    });

    call.on('close', () => {
      this.mediaCalls.delete(callKey);
      if (this.callbacks.onStreamStopped) {
        this.callbacks.onStreamStopped(call.peer, isScreen);
      }
    });

    call.on('error', (err) => {
      console.warn(`MediaConnection error on ${callKey}:`, err);
      this.mediaCalls.delete(callKey);
    });
  }

  private handleMessage(msg: SignalingMessage, conn: DataConnection) {
    const hostPeerId = `syncwave-room-${this.roomId}`;
    const isFromHost = conn.peer === hostPeerId || conn.peer === this.myId;

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

          // If host has active voice, connect voice stream to the new participant as well
          if (this.activeVoiceStream) {
            setTimeout(() => {
              this.callPeerWithStream(conn.peer, this.activeVoiceStream!, false);
            }, 500);
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

      case 'stream_stopped': {
        const { isScreen } = msg.payload || {};
        if (this.callbacks.onStreamStopped) {
          this.callbacks.onStreamStopped(msg.senderId, isScreen !== false);
        }
        if (this.isHost) {
          this.broadcast(msg, msg.senderId);
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
        // Synchronize playback only if message originated from host, or if host is broadcasting
        if (!this.isHost && !isFromHost) {
          console.warn('Playback sync ignored from non-host peer:', conn.peer);
          return;
        }
        this.callbacks.onPlaybackSync(msg.payload);
        if (this.isHost) {
          this.broadcast(msg, msg.senderId);
        }
        break;

      case 'chat_message': {
        const msgPayload = msg.payload as ChatMessage;
        // Client-side DoS mitigation: validate size of file / dataUrl
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
          this.broadcast(msg, msg.senderId);
        }
        break;
      }

      case 'transfer_host':
        // Only current host can transfer host privileges
        if (!isFromHost && !this.isHost) {
          console.warn('Unauthorized transfer_host attempt from:', conn.peer);
          return;
        }
        if (msg.payload.newHostId === this.myId) {
          this.isHost = true;
          this.callbacks.onHostTransferred(this.myId);
        } else {
          this.callbacks.onHostTransferred(msg.payload.newHostId);
        }
        break;

      case 'kick':
        // Only host is allowed to kick participants; host cannot be kicked by guests
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
      const callKey = `out_${peerId}_voice`;
      if (this.mediaCalls.has(callKey)) {
        try {
          this.mediaCalls.get(callKey)?.close();
        } catch (_) {}
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
    if (this.isHost) {
      this.broadcast(msg);
    } else {
      const hostConn = this.connections.get(`syncwave-room-${this.roomId}`);
      if (hostConn && hostConn.open) {
        hostConn.send(msg);
      }
    }
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
        const callKey = `out_${peerId}_screen`;
        if (this.mediaCalls.has(callKey)) {
          try {
            this.mediaCalls.get(callKey)?.close();
          } catch (_) {}
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
      if (this.isHost) {
        this.broadcast(msg);
      } else {
        const hostConn = this.connections.get(`syncwave-room-${this.roomId}`);
        if (hostConn && hostConn.open) {
          hostConn.send(msg);
        }
      }
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

  /**
   * Signaling Server Keep-Alive:
   * Public WebRTC signaling servers (e.g. 0.peerjs.com or custom servers) close
   * idle WebSocket connections if no ping is sent within 45-60 seconds, which
   * causes the host to disconnect from signaling and prevents new peers from joining after 20 minutes.
   * This keep-alive ensures the room stays active and joinable indefinitely.
   */
  private startServerKeepAlive() {
    if (this.serverKeepAliveTimer) clearInterval(this.serverKeepAliveTimer);
    this.serverKeepAliveTimer = setInterval(() => {
      if (this.peer && !this.peer.destroyed) {
        if (this.peer.disconnected) {
          // Reconnect to signaling server if disconnected
          try {
            this.peer.reconnect();
          } catch (e) {
            console.warn('Keep-alive reconnect attempt failed:', e);
          }
        } else {
          // Send HEARTBEAT message on the underlying PeerJS socket connection
          try {
            const socket: any = (this.peer as any).socket;
            if (socket && typeof socket._send === 'function') {
              socket._send({ type: 'HEARTBEAT' });
            }
          } catch (_) {}
        }
      }
    }, 25000); // Send keep-alive every 25 seconds
  }

  public destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.serverKeepAliveTimer) clearInterval(this.serverKeepAliveTimer);
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
