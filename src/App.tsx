import { useState, useRef, useCallback } from 'react';
import {
  Navbar,
  LandingPage,
  VideoPlayer,
  ParticipantList,
  ChatPanel,
  RoomControls,
} from './components';
import {
  RoomManager,
  ScreenCaptureService,
  VoiceChatService,
} from './services';
import { generateRoomCode, isValidRoomCode } from './config';
import { analyzeMediaUrl } from './utils/mediaDetector';
import type { Participant, PlaybackState, ChatMessage } from './types';

function getInitialRoomCode(): string {
  try {
    const url = new URL(window.location.href);
    let roomParam = url.searchParams.get('room');
    if (!roomParam && window.location.hash.includes('room=')) {
      const match = window.location.hash.match(/[#?&]room=([^&]+)/);
      if (match) roomParam = match[1];
    }
    return roomParam ? roomParam.toUpperCase() : '';
  } catch {
    return '';
  }
}

let sysMsgCounter = 0;
function nextSysId(prefix = 'sys'): string {
  sysMsgCounter += 1;
  return `${prefix}-${Date.now()}-${sysMsgCounter}`;
}

export function App() {
  const [inRoom, setInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState(getInitialRoomCode);
  const [isHost, setIsHost] = useState(false);
  const [myId, setMyId] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  >('disconnected');
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [externalNotice, setExternalNotice] = useState<{ title: string; description: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    sourceUrl: '',
    sourceType: 'direct_video',
    isPlaying: false,
    currentTime: 0,
    playbackRate: 1,
    lastUpdated: 0,
    sentBy: '',
  });

  const [screenService] = useState(() => new ScreenCaptureService());
  const [voiceService] = useState(() => new VoiceChatService());

  const roomManagerRef = useRef<RoomManager | null>(null);
  const playbackStateRef = useRef<PlaybackState>(playbackState);
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakingThrottleRef = useRef<{ value: boolean; lastSent: number }>({ value: false, lastSent: 0 });

  const showToast = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    setToastMessage({ text, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  const saveRoomToStorage = (code: string, isHostRole: boolean) => {
    try {
      const stored = localStorage.getItem('maxify_saved_rooms');
      const list: Array<{ code: string; isHost: boolean; lastJoined: number }> = stored
        ? JSON.parse(stored)
        : [];
      const filtered = list.filter((item) => item.code !== code);
      filtered.unshift({ code, isHost: isHostRole, lastJoined: Date.now() });
      localStorage.setItem('maxify_saved_rooms', JSON.stringify(filtered.slice(0, 8)));
    } catch {}
  };

  const attachRemoteAudio = (key: string, stream: MediaStream) => {
    let audioEl = remoteAudioElementsRef.current.get(key);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      (audioEl as any).playsInline = true;
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
      remoteAudioElementsRef.current.set(key, audioEl);
    }
    audioEl.srcObject = stream;
    audioEl.play().catch((err) => {
      console.warn('Autoplay prevented, requires user interaction:', err);
    });
  };

  const detachRemoteAudio = (key: string) => {
    const audioEl = remoteAudioElementsRef.current.get(key);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      remoteAudioElementsRef.current.delete(key);
    }
  };

  const handleLeaveRoom = useCallback(() => {
    roomManagerRef.current?.destroy();
    roomManagerRef.current = null;
    screenService.stopCapture();
    voiceService.stop();
    remoteAudioElementsRef.current.forEach((audioEl) => {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
    });
    remoteAudioElementsRef.current.clear();
    setInRoom(false);
    setScreenStream(null);
    setIsScreenSharing(false);
    setParticipants([]);
    setChatMessages([]);
    setExternalNotice(null);
    setConnectionStatus('disconnected');
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [screenService, voiceService]);

  const handleCreateRoom = async (name: string, customCode?: string) => {
    const code =
      customCode && isValidRoomCode(customCode) ? customCode.toUpperCase() : generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    saveRoomToStorage(code, true);

    const initialProfile: Participant = {
      id: `syncwave-room-${code}`,
      name,
      avatarSeed: name,
      role: 'host',
      isAudioMuted: true,
      isSpeaking: false,
      connectedAt: Date.now(),
    };

    const manager = new RoomManager(initialProfile, {
      onParticipantJoined: (p) => {
        setParticipants((prev) => {
          if (prev.some((x) => x.id === p.id)) return prev;
          return [...prev, p];
        });
        setChatMessages((prev) => [
          ...prev,
          {
            id: nextSysId('join'),
            senderId: 'system',
            senderName: 'Система',
            text: `${p.name} присоединился к комнате.`,
            timestamp: Date.now(),
            isSystem: true,
          },
        ]);
      },
      onParticipantLeft: (pId) => {
        setParticipants((prev) => {
          const leaving = prev.find((x) => x.id === pId);
          if (leaving) {
            setChatMessages((msgs) => [
              ...msgs,
              {
                id: nextSysId('leave'),
                senderId: 'system',
                senderName: 'Система',
                text: `${leaving.name} покинул комнату.`,
                timestamp: Date.now(),
                isSystem: true,
              },
            ]);
          }
          return prev.filter((x) => x.id !== pId);
        });
      },
      onParticipantUpdated: (p) => {
        setParticipants((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      },
      onPlaybackSync: (incomingState) => {
        playbackStateRef.current = incomingState;
        setPlaybackState(incomingState);
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) => [...prev, msg]);
      },
      onHostTransferred: (newHostId) => {
        setIsHost(newHostId === manager.myId);
        setParticipants((prev) =>
          prev.map((p) => ({
            ...p,
            role: p.id === newHostId ? 'host' : 'viewer',
          }))
        );
      },
      onKicked: () => {
        showToast('Вы были исключены из комнаты ведущим.', 'error');
        handleLeaveRoom();
      },
      onError: (err) => {
        showToast(err, 'error');
      },
      onConnectionStatusChange: (status) => {
        setConnectionStatus(status);
      },
      onIncomingStream: (stream, senderId, isScreen) => {
        if (isScreen) {
          setScreenStream(stream);
          const screenAudioTracks = stream.getAudioTracks();
          if (screenAudioTracks.length > 0) {
            attachRemoteAudio(`${senderId}_screen_audio`, new MediaStream(screenAudioTracks));
          }
        } else {
          attachRemoteAudio(senderId, stream);
        }
      },
      onStreamStopped: (senderId, isScreen) => {
        if (isScreen) {
          if (!screenService.hasActiveStream()) {
            setScreenStream(null);
          }
          detachRemoteAudio(`${senderId}_screen_audio`);
        } else {
          detachRemoteAudio(senderId);
        }
      },
    });

    roomManagerRef.current = manager;

    try {
      const assignedId = await manager.initHost(code);
      setMyId(assignedId);
      setParticipants([initialProfile]);
      setInRoom(true);
    } catch (err: any) {
      showToast(`Не удалось создать комнату: ${err.message || err}`, 'error');
    }
  };

  const handleJoinRoom = async (code: string, name: string) => {
    const cleanCode = code.toUpperCase();
    setRoomCode(cleanCode);
    setIsHost(false);
    saveRoomToStorage(cleanCode, false);

    const initialProfile: Participant = {
      id: '',
      name,
      avatarSeed: name,
      role: 'viewer',
      isAudioMuted: true,
      isSpeaking: false,
      connectedAt: Date.now(),
    };

    const manager = new RoomManager(initialProfile, {
      onParticipantJoined: (p) => {
        setParticipants((prev) => {
          if (prev.some((x) => x.id === p.id)) return prev;
          return [...prev, p];
        });
      },
      onParticipantLeft: (pId) => {
        setParticipants((prev) => prev.filter((x) => x.id !== pId));
      },
      onParticipantUpdated: (p) => {
        setParticipants((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      },
      onPlaybackSync: (incomingState) => {
        playbackStateRef.current = incomingState;
        setPlaybackState(incomingState);
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) => [...prev, msg]);
      },
      onHostTransferred: (newHostId) => {
        setIsHost(newHostId === manager.myId);
        setParticipants((prev) =>
          prev.map((p) => ({
            ...p,
            role: p.id === newHostId ? 'host' : 'viewer',
          }))
        );
      },
      onKicked: () => {
        showToast('Вы были исключены из комнаты.', 'error');
        handleLeaveRoom();
      },
      onError: (err) => {
        showToast(err, 'error');
      },
      onConnectionStatusChange: (status) => {
        setConnectionStatus(status);
      },
      onIncomingStream: (stream, senderId, isScreen) => {
        if (isScreen) {
          setScreenStream(stream);
          const screenAudioTracks = stream.getAudioTracks();
          if (screenAudioTracks.length > 0) {
            attachRemoteAudio(`${senderId}_screen_audio`, new MediaStream(screenAudioTracks));
          }
        } else {
          attachRemoteAudio(senderId, stream);
        }
      },
      onStreamStopped: (senderId, isScreen) => {
        if (isScreen) {
          if (!screenService.hasActiveStream()) {
            setScreenStream(null);
          }
          detachRemoteAudio(`${senderId}_screen_audio`);
        } else {
          detachRemoteAudio(senderId);
        }
      },
    });

    roomManagerRef.current = manager;

    try {
      const assignedId = await manager.joinRoom(cleanCode);
      setMyId(assignedId);
      initialProfile.id = assignedId;
      setParticipants((prev) => {
        if (prev.some((x) => x.id === assignedId)) return prev;
        return [...prev, initialProfile];
      });
      setInRoom(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePlaybackState = (partial: Partial<PlaybackState>) => {
    const nextState: PlaybackState = {
      ...playbackStateRef.current,
      ...partial,
      lastUpdated: Date.now(),
      sentBy: myId,
    };
    playbackStateRef.current = nextState;
    setPlaybackState(nextState);
    roomManagerRef.current?.sendPlaybackSync(nextState);
  };

  const handleDirectUrlSubmit = (url: string) => {
    const analysis = analyzeMediaUrl(url);

    if (analysis.type === 'invalid') {
      showToast(analysis.noticeDescription || 'Некорректная ссылка', 'error');
      return;
    }

    if (analysis.type === 'direct_video') {
      setExternalNotice(null);
      handleUpdatePlaybackState({
        sourceUrl: url,
        sourceType: 'direct_video',
        currentTime: 0,
        isPlaying: false,
      });
    } else if (analysis.noticeTitle && analysis.noticeDescription) {
      setExternalNotice({
        title: analysis.noticeTitle,
        description: analysis.noticeDescription,
      });
      showToast(`${analysis.noticeTitle}: используйте «Трансляция экрана»`, 'info');
    }
  };

  const handleStopScreenShare = () => {
    screenService.stopCapture();
    roomManagerRef.current?.stopScreenStream();
    setScreenStream(null);
    setIsScreenSharing(false);
  };

  const handleStartScreenShare = async () => {
    try {
      const stream = await screenService.startCapture({ withAudio: true }, () => {
        handleStopScreenShare();
      });
      setExternalNotice(null);
      setScreenStream(stream);
      setIsScreenSharing(true);
      roomManagerRef.current?.sendScreenStream(stream);

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: nextSysId('audio-warn'),
            senderId: 'system',
            senderName: 'Подсказка',
            text: 'Трансляция запущена без системного звука. Чтобы передавать звук, выберите вкладку и включите «Транслировать звук вкладки».',
            timestamp: Date.now(),
            isSystem: true,
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: nextSysId('audio-ok'),
            senderId: 'system',
            senderName: 'Система',
            text: 'Звук трансляции захвачен и передаётся зрителям.',
            timestamp: Date.now(),
            isSystem: true,
          },
        ]);
      }
    } catch (err: any) {
      showToast(err.message || 'Ошибка захвата экрана', 'error');
    }
  };

  const handleMicMuteChange = (muted: boolean) => {
    roomManagerRef.current?.updateMyProfile({ isAudioMuted: muted, isSpeaking: false });
  };

  const handleSpeakingChange = (speaking: boolean) => {
    const now = Date.now();
    const prev = speakingThrottleRef.current;
    if (prev.value !== speaking && now - prev.lastSent > 180) {
      speakingThrottleRef.current = { value: speaking, lastSent: now };
      roomManagerRef.current?.updateMyProfile({ isSpeaking: speaking });
    }
  };

  return (
    <div className="min-h-screen text-white flex flex-col relative">
      <div className="ios-wallpaper" aria-hidden="true" />

      <a href="#main-content" className="skip-link">
        Перейти к основному содержимому
      </a>

      {/* Dynamic Island Toast Banner */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none px-4 w-full max-w-md flex justify-center">
          <div
            className={`animate-ios-toast pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full ios-material-elevated text-xs font-medium shadow-2xl ${
              toastMessage.tone === 'error' ? 'border-[#FF453A]/45 text-[#FF6961]' : 'text-white'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                toastMessage.tone === 'error' ? 'bg-[#FF453A]' : 'bg-[#0A84FF]'
              }`}
            />
            <span className="truncate">{toastMessage.text}</span>
          </div>
        </div>
      )}

      <Navbar
        onGoHome={handleLeaveRoom}
        roomCode={inRoom ? roomCode : undefined}
        isHost={isHost}
        participantCount={participants.length}
        connectionStatus={connectionStatus}
      />

      {!inRoom ? (
        <main id="main-content" className="flex-1 flex flex-col">
          <LandingPage
            initialRoomCode={roomCode}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        </main>
      ) : (
        <main
          id="main-content"
          className="flex-1 p-2.5 sm:p-4 lg:p-6 max-w-[1680px] w-full mx-auto flex flex-col gap-3 sm:gap-4"
        >
          <div
            className={`grid grid-cols-1 ${
              isChatVisible ? 'lg:grid-cols-4' : 'lg:grid-cols-1'
            } gap-3 sm:gap-4 flex-1 transition-all duration-300`}
          >
            <div
              className={`${
                isChatVisible ? 'lg:col-span-3' : 'lg:col-span-1 max-w-5xl mx-auto w-full'
              } flex flex-col gap-3 sm:gap-4 transition-all duration-300`}
            >
              <VideoPlayer
                playbackState={playbackState}
                onUpdateState={handleUpdatePlaybackState}
                isHost={isHost}
                screenStream={screenStream}
                onStopScreenShare={isScreenSharing ? handleStopScreenShare : undefined}
                onRequestScreenStream={() => roomManagerRef.current?.requestScreenStream()}
                externalNotice={externalNotice}
              >
                <div className="h-64 sm:h-72 flex flex-col">
                  <ChatPanel
                    messages={chatMessages}
                    currentUserId={myId}
                    onSendMessage={(text, file) => roomManagerRef.current?.sendChatMessage(text, file)}
                    hideHeader={true}
                  />
                </div>
              </VideoPlayer>

              <RoomControls
                roomCode={roomCode}
                isHost={isHost}
                isScreenSharing={isScreenSharing}
                hasActiveScreenStream={Boolean(screenStream)}
                onStartScreenShare={handleStartScreenShare}
                onStopScreenShare={handleStopScreenShare}
                onDirectUrlSubmit={handleDirectUrlSubmit}
                onLeaveRoom={handleLeaveRoom}
                voiceService={voiceService}
                screenService={screenService}
                onVoiceStreamReady={(stream) => {
                  roomManagerRef.current?.sendVoiceStream(stream);
                }}
                onStopVoiceStream={() => {
                  roomManagerRef.current?.stopVoiceStream();
                  handleMicMuteChange(true);
                }}
                onMicMuteChange={handleMicMuteChange}
                onSpeakingChange={handleSpeakingChange}
                onNotify={(msg) => showToast(msg, 'error')}
                connectionStatus={connectionStatus}
                isChatVisible={isChatVisible}
                onToggleChat={() => setIsChatVisible((prev) => !prev)}
              />
            </div>

            {isChatVisible && (
              <div className="lg:col-span-1 flex flex-col gap-3 sm:gap-4 h-[550px] lg:h-auto animate-ios-spring">
                <div className="h-1/3 sm:h-2/5 min-h-[140px]">
                  <ParticipantList
                    participants={participants}
                    currentUserId={myId}
                    isHost={isHost}
                    onTransferHost={(targetId) => roomManagerRef.current?.transferHost(targetId)}
                    onKickParticipant={(targetId) => roomManagerRef.current?.kickParticipant(targetId)}
                  />
                </div>

                <div className="flex-1 min-h-[260px]">
                  <ChatPanel
                    messages={chatMessages}
                    currentUserId={myId}
                    onSendMessage={(text, file) => roomManagerRef.current?.sendChatMessage(text, file)}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
