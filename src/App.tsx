import { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { VideoPlayer } from './components/VideoPlayer';
import { ParticipantList } from './components/ParticipantList';
import { ChatPanel } from './components/ChatPanel';
import { RoomControls } from './components/RoomControls';
import { RoomManager } from './services/RoomManager';
import { ScreenCaptureService } from './services/ScreenCaptureService';
import { VoiceChatService } from './services/VoiceChatService';
import { generateRoomCode } from './config';
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
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
    }
  }, []);

  const handleCreateRoom = async (name: string) => {
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);

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
        } else {
          // Play remote voice audio via persistent DOM element with autoplay
          let audioEl = remoteAudioElementsRef.current.get(senderId);
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            (audioEl as any).playsInline = true;
            (audioEl as any).style = 'display: none;';
            document.body.appendChild(audioEl);
            remoteAudioElementsRef.current.set(senderId, audioEl);
          }
          audioEl.srcObject = stream;
          audioEl.play().catch((err) => {
            console.warn('Autoplay prevented, requires user interaction:', err);
          });
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
    setRoomCode(code);
    setIsHost(false);

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
        } else {
          let audioEl = remoteAudioElementsRef.current.get(senderId);
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            (audioEl as any).playsInline = true;
            (audioEl as any).style = 'display: none;';
            document.body.appendChild(audioEl);
            remoteAudioElementsRef.current.set(senderId, audioEl);
          }
          audioEl.srcObject = stream;
          audioEl.play().catch((err) => {
            console.warn('Autoplay prevented, requires user interaction:', err);
          });
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
      <Navbar
        onGoHome={handleLeaveRoom}
        roomCode={inRoom ? roomCode : undefined}
        isHost={isHost}
        participantCount={participants.length}
        connectionStatus={connectionStatus}
      />

      {!inRoom ? (
        <LandingPage
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      ) : (
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <VideoPlayer
                playbackState={playbackState}
                onUpdateState={handleUpdatePlaybackState}
                isHost={isHost}
                screenStream={screenStream}
                onStopScreenShare={isScreenSharing ? handleStopScreenShare : undefined}
                externalNotice={externalNotice}
              />

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
                connectionStatus={connectionStatus}
              />
            </div>

            <div className="lg:col-span-1 flex flex-col gap-4 h-[750px] lg:h-auto">
              <div className="h-1/2">
                <ParticipantList
                  participants={participants}
                  currentUserId={myId}
                  isHost={isHost}
                  onTransferHost={(targetId) => roomManagerRef.current?.transferHost(targetId)}
                  onKickParticipant={(targetId) => roomManagerRef.current?.kickParticipant(targetId)}
                />
              </div>

              <div className="h-1/2">
                <ChatPanel
                  messages={chatMessages}
                  currentUserId={myId}
                  onSendMessage={(text) => roomManagerRef.current?.sendChatMessage(text)}
                />
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
