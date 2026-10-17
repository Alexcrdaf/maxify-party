import { useState, useEffect, useRef } from 'react';
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

export function App() {
  const [inRoom, setInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
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

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    sourceUrl: '',
    sourceType: 'direct_video',
    isPlaying: false,
    currentTime: 0,
    playbackRate: 1,
    lastUpdated: Date.now(),
    sentBy: '',
  });

  const roomManagerRef = useRef<RoomManager | null>(null);
  const screenServiceRef = useRef<ScreenCaptureService>(new ScreenCaptureService());
  const voiceServiceRef = useRef<VoiceChatService>(new VoiceChatService());
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    // Check both standard query search params and hash (in case router / host uses hash format)
    const url = new URL(window.location.href);
    let roomParam = url.searchParams.get('room');
    if (!roomParam && window.location.hash.includes('room=')) {
      const match = window.location.hash.match(/[?&]room=([^&]+)/);
      if (match) roomParam = match[1];
    }
    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
    }
  }, []);

  const saveRoomToStorage = (code: string, isHostRole: boolean) => {
    try {
      const stored = localStorage.getItem('maxify_saved_rooms');
      const list: Array<{ code: string; isHost: boolean; lastJoined: number }> = stored ? JSON.parse(stored) : [];
      const filtered = list.filter((item) => item.code !== code);
      filtered.unshift({ code, isHost: isHostRole, lastJoined: Date.now() });
      localStorage.setItem('maxify_saved_rooms', JSON.stringify(filtered.slice(0, 8)));
    } catch (_) {}
  };

  const handleCreateRoom = async (name: string, customCode?: string) => {
    const code = customCode && isValidRoomCode(customCode) ? customCode.toUpperCase() : generateRoomCode();
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
            id: `sys-${Date.now()}`,
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
                id: `sys-${Date.now()}`,
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
        alert('Вы были исключены из комнаты ведущим.');
        handleLeaveRoom();
      },
      onError: (err) => {
        console.error(err);
      },
      onConnectionStatusChange: (status) => {
        setConnectionStatus(status);
      },
      onIncomingStream: (stream, senderId, isScreen) => {
        if (isScreen) {
          setScreenStream(stream);

          const screenAudioTracks = stream.getAudioTracks();
          if (screenAudioTracks.length > 0) {
            const screenAudioKey = `${senderId}_screen_audio`;
            let audioEl = remoteAudioElementsRef.current.get(screenAudioKey);
            if (!audioEl) {
              audioEl = document.createElement('audio');
              audioEl.autoplay = true;
              (audioEl as any).playsInline = true;
              audioEl.style.display = 'none';
              document.body.appendChild(audioEl);
              remoteAudioElementsRef.current.set(screenAudioKey, audioEl);
            }
            audioEl.srcObject = new MediaStream(screenAudioTracks);
            audioEl.play().catch((err) => {
              console.warn('Autoplay screen audio prevented:', err);
            });
          }
        } else {
          // Play remote voice audio via persistent DOM element with autoplay
          let audioEl = remoteAudioElementsRef.current.get(senderId);
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            (audioEl as any).playsInline = true;
            audioEl.style.display = 'none';
            document.body.appendChild(audioEl);
            remoteAudioElementsRef.current.set(senderId, audioEl);
          }
          audioEl.srcObject = stream;
          audioEl.play().catch((err) => {
            console.warn('Autoplay prevented, requires user interaction:', err);
          });
        }
      },
      onStreamStopped: (senderId, isScreen) => {
        if (isScreen) {
          // If the host is currently broadcasting their screen, remote stream stops shouldn't kill local broadcast
          if (!screenServiceRef.current.hasActiveStream() && !isScreenSharing) {
            setScreenStream(null);
          }
          const screenAudioKey = `${senderId}_screen_audio`;
          const audioEl = remoteAudioElementsRef.current.get(screenAudioKey);
          if (audioEl) {
            audioEl.pause();
            audioEl.srcObject = null;
            audioEl.remove();
            remoteAudioElementsRef.current.delete(screenAudioKey);
          }
        } else {
          const audioEl = remoteAudioElementsRef.current.get(senderId);
          if (audioEl) {
            audioEl.pause();
            audioEl.srcObject = null;
            audioEl.remove();
            remoteAudioElementsRef.current.delete(senderId);
          }
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
      alert(`Не удалось создать комнату: ${err.message || err}`);
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
        alert('Вы были исключены из комнаты.');
        handleLeaveRoom();
      },
      onError: (err) => {
        alert(err);
      },
      onConnectionStatusChange: (status) => {
        setConnectionStatus(status);
      },
      onIncomingStream: (stream, senderId, isScreen) => {
        if (isScreen) {
          setScreenStream(stream);

          // Auxiliary audio player to guarantee that screen audio tracks play reliably
          const screenAudioTracks = stream.getAudioTracks();
          if (screenAudioTracks.length > 0) {
            const screenAudioKey = `${senderId}_screen_audio`;
            let audioEl = remoteAudioElementsRef.current.get(screenAudioKey);
            if (!audioEl) {
              audioEl = document.createElement('audio');
              audioEl.autoplay = true;
              (audioEl as any).playsInline = true;
              audioEl.style.display = 'none';
              document.body.appendChild(audioEl);
              remoteAudioElementsRef.current.set(screenAudioKey, audioEl);
            }
            audioEl.srcObject = new MediaStream(screenAudioTracks);
            audioEl.play().catch((err) => {
              console.warn('Autoplay screen audio prevented:', err);
            });
          }
        } else {
          let audioEl = remoteAudioElementsRef.current.get(senderId);
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            (audioEl as any).playsInline = true;
            audioEl.style.display = 'none';
            document.body.appendChild(audioEl);
            remoteAudioElementsRef.current.set(senderId, audioEl);
          }
          audioEl.srcObject = stream;
          audioEl.play().catch((err) => {
            console.warn('Autoplay prevented, requires user interaction:', err);
          });
        }
      },
      onStreamStopped: (senderId, isScreen) => {
        if (isScreen) {
          setScreenStream(null);
          const screenAudioKey = `${senderId}_screen_audio`;
          const audioEl = remoteAudioElementsRef.current.get(screenAudioKey);
          if (audioEl) {
            audioEl.pause();
            audioEl.srcObject = null;
            audioEl.remove();
            remoteAudioElementsRef.current.delete(screenAudioKey);
          }
        } else {
          const audioEl = remoteAudioElementsRef.current.get(senderId);
          if (audioEl) {
            audioEl.pause();
            audioEl.srcObject = null;
            audioEl.remove();
            remoteAudioElementsRef.current.delete(senderId);
          }
        }
      },
    });

    roomManagerRef.current = manager;

    try {
      const assignedId = await manager.joinRoom(code);
      setMyId(assignedId);
      initialProfile.id = assignedId;
      setParticipants([
        {
          id: `syncwave-room-${code}`,
          name: 'Ведущий',
          avatarSeed: 'host',
          role: 'host',
          isAudioMuted: true,
          isSpeaking: false,
          connectedAt: Date.now(),
        },
        initialProfile,
      ]);
      setInRoom(true);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleUpdatePlaybackState = (partial: Partial<PlaybackState>) => {
    const nextState: PlaybackState = {
      ...playbackState,
      ...partial,
      lastUpdated: Date.now(),
      sentBy: myId,
    };
    setPlaybackState(nextState);
    roomManagerRef.current?.sendPlaybackSync(nextState);
  };

  const handleDirectUrlSubmit = (url: string) => {
    const analysis = analyzeMediaUrl(url);

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
      handleUpdatePlaybackState({
        sourceUrl: url,
        sourceType: 'direct_video',
        currentTime: 0,
        isPlaying: false,
      });
    }
  };

  const handleStartScreenShare = async () => {
    try {
      const stream = await screenServiceRef.current.startCapture({ withAudio: true }, () => {
        handleStopScreenShare();
      });
      setScreenStream(stream);
      setIsScreenSharing(true);
      roomManagerRef.current?.sendScreenStream(stream);

      // Check if user enabled the audio checkbox in the browser capture dialog
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `sys-audio-warn-${Date.now()}`,
            senderId: 'system',
            senderName: 'Подсказка по звуку',
            text: '⚠️ Трансляция запущена без системного звука. Чтобы передавать звук видео/игры, при выборе экрана в браузере обязательно выберите вкладку или включите галочку «Также транслировать звук вкладки / системы».',
            timestamp: Date.now(),
            isSystem: true,
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `sys-audio-ok-${Date.now()}`,
            senderId: 'system',
            senderName: 'Система',
            text: '🔊 Звук трансляции успешно захвачен и транслируется зрителям.',
            timestamp: Date.now(),
            isSystem: true,
          },
        ]);
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка захвата экрана');
    }
  };

  const handleStopScreenShare = () => {
    screenServiceRef.current.stopCapture();
    roomManagerRef.current?.stopScreenStream();
    setScreenStream(null);
    setIsScreenSharing(false);
  };

  const handleLeaveRoom = () => {
    roomManagerRef.current?.destroy();
    screenServiceRef.current.stopCapture();
    voiceServiceRef.current.stop();
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
    setConnectionStatus('disconnected');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans relative selection:bg-sky-500 selection:text-white">
      <a href="#main-content" className="skip-link">
        Перейти к основному содержимому
      </a>

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
        <main id="main-content" className="flex-1 p-2 sm:p-4 lg:p-6 max-w-[1700px] w-full mx-auto flex flex-col gap-3 sm:gap-4">
          <div className={`grid grid-cols-1 ${isChatVisible ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-3 sm:gap-4 flex-1 transition-all duration-300`}>
            <div className={`${isChatVisible ? 'lg:col-span-3' : 'lg:col-span-1 max-w-5xl mx-auto w-full'} flex flex-col gap-3 sm:gap-4 transition-all duration-300`}>
              <VideoPlayer
                playbackState={playbackState}
                onUpdateState={handleUpdatePlaybackState}
                isHost={isHost}
                screenStream={screenStream}
                onStopScreenShare={isScreenSharing ? handleStopScreenShare : undefined}
                onRequestScreenStream={() => roomManagerRef.current?.requestScreenStream()}
                externalNotice={externalNotice}
              >
                {/* Embedded In-Player Chat */}
                <div className="h-64 sm:h-72 flex flex-col">
                  <ChatPanel
                    messages={chatMessages}
                    currentUserId={myId}
                    onSendMessage={(text, file) => roomManagerRef.current?.sendChatMessage(text, file)}
                  />
                </div>
              </VideoPlayer>

              <RoomControls
                roomCode={roomCode}
                isHost={isHost}
                isScreenSharing={isScreenSharing}
                onStartScreenShare={handleStartScreenShare}
                onStopScreenShare={handleStopScreenShare}
                onDirectUrlSubmit={handleDirectUrlSubmit}
                onLeaveRoom={handleLeaveRoom}
                voiceService={voiceServiceRef.current}
                screenService={screenServiceRef.current}
                onVoiceStreamReady={(stream) => {
                  roomManagerRef.current?.sendVoiceStream(stream);
                }}
                onStopVoiceStream={() => {
                  roomManagerRef.current?.stopVoiceStream();
                }}
                connectionStatus={connectionStatus}
                isChatVisible={isChatVisible}
                onToggleChat={() => setIsChatVisible((prev) => !prev)}
              />
            </div>

            {isChatVisible && (
              <div className="lg:col-span-1 flex flex-col gap-3 sm:gap-4 h-[550px] lg:h-auto animate-fadeIn">
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
