import { useState, useRef, useCallback, useEffect } from 'react';
import { MessageSquare, Users } from 'lucide-react';
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
import { extractRoomCode, generateRoomCode, isValidRoomCode } from './config';
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
    return roomParam ? extractRoomCode(roomParam) : '';
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
  const [isJoining, setIsJoining] = useState(false);
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
  const [activeStreamerId, setActiveStreamerId] = useState<string | null>(null);
  const [activeStreamerName, setActiveStreamerName] = useState<string | null>(null);

  const [isChatVisible, setIsChatVisible] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'participants'>('chat');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCinemaMode, setIsCinemaMode] = useState(false);

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
  const sidebarTabRef = useRef<'chat' | 'participants'>(sidebarTab);
  const isChatVisibleRef = useRef<boolean>(isChatVisible);
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakingThrottleRef = useRef<{ value: boolean; lastSent: number }>({ value: false, lastSent: 0 });

  useEffect(() => {
    sidebarTabRef.current = sidebarTab;
  }, [sidebarTab]);

  useEffect(() => {
    isChatVisibleRef.current = isChatVisible;
  }, [isChatVisible]);

  // Global keyboard shortcut H (or Esc) to toggle/exit Cinema (Lights-Off) Mode when in room
  useEffect(() => {
    if (!inRoom) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape' && isCinemaMode && !document.fullscreenElement) {
        setIsCinemaMode(false);
      } else if (e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'р') {
        setIsCinemaMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inRoom, isCinemaMode]);

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

  const attachRemoteVoiceAudio = (peerId: string, stream: MediaStream) => {
    let audioEl = remoteAudioElementsRef.current.get(peerId);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      (audioEl as any).playsInline = true;
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
      remoteAudioElementsRef.current.set(peerId, audioEl);
    }
    audioEl.srcObject = stream;
    audioEl.play().catch((err) => {
      console.warn('Voice autoplay prevented:', err);
    });
  };

  const detachRemoteVoiceAudio = (peerId: string) => {
    const audioEl = remoteAudioElementsRef.current.get(peerId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      remoteAudioElementsRef.current.delete(peerId);
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
    setIsJoining(false);
    setIsCinemaMode(false);
    setScreenStream(null);
    setIsScreenSharing(false);
    setActiveStreamerId(null);
    setActiveStreamerName(null);
    setParticipants([]);
    setChatMessages([]);
    setUnreadCount(0);
    setExternalNotice(null);
    setConnectionStatus('disconnected');
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [screenService, voiceService]);

  const buildRoomCallbacks = (managerRefGetter: () => RoomManager | null, announceJoinLeave: boolean) => ({
    onParticipantJoined: (p: Participant) => {
      setParticipants((prev) => {
        const exists = prev.some((x) => x.id === p.id);
        if (exists) {
          return prev.map((x) => (x.id === p.id ? { ...x, ...p } : x));
        }
        return [...prev, p];
      });
      if (announceJoinLeave) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: nextSysId('join'),
            senderId: 'system',
            senderName: 'Система',
            text: `${p.name} вошёл в зал`,
            timestamp: Date.now(),
            isSystem: true,
          },
        ]);
      }
    },
    onParticipantLeft: (pId: string) => {
      detachRemoteVoiceAudio(pId);
      setParticipants((prev) => {
        const leaving = prev.find((x) => x.id === pId);
        if (leaving && announceJoinLeave) {
          setChatMessages((msgs) => [
            ...msgs,
            {
              id: nextSysId('leave'),
              senderId: 'system',
              senderName: 'Система',
              text: `${leaving.name} покинул зал`,
              timestamp: Date.now(),
              isSystem: true,
            },
          ]);
        }
        return prev.filter((x) => x.id !== pId);
      });
    },
    onParticipantUpdated: (p: Participant) => {
      setParticipants((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    },
    onPlaybackSync: (incomingState: PlaybackState) => {
      playbackStateRef.current = incomingState;
      setPlaybackState(incomingState);
    },
    onChatMessage: (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
      const mgr = managerRefGetter();
      if (
        msg.senderId !== mgr?.myId &&
        (!isChatVisibleRef.current || sidebarTabRef.current !== 'chat')
      ) {
        setUnreadCount((c) => c + 1);
      }
    },
    onHostTransferred: (newHostId: string) => {
      const mgr = managerRefGetter();
      setIsHost(newHostId === mgr?.myId);
      setParticipants((prev) =>
        prev.map((p) => ({
          ...p,
          role: p.id === newHostId ? 'host' : 'viewer',
        }))
      );
    },
    onKicked: () => {
      showToast('Вы были исключены из зала ведущим.', 'error');
      handleLeaveRoom();
    },
    onError: (err: string) => {
      showToast(err, 'error');
    },
    onConnectionStatusChange: (
      status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
    ) => {
      setConnectionStatus(status);
    },
    onActiveStreamerChanged: (streamerId: string | null, streamerName?: string) => {
      setActiveStreamerId(streamerId);
      setActiveStreamerName(streamerName || null);
      const mgr = managerRefGetter();
      if (streamerId && mgr && streamerId !== mgr.myId) {
        // Another participant started sharing screen -> stop local capture cleanly if active
        if (screenService.hasActiveStream()) {
          screenService.stopCapture();
        }
        setIsScreenSharing(false);
      }
    },
    onIncomingStream: (stream: MediaStream, senderId: string, isScreen: boolean) => {
      if (isScreen) {
        // VideoPlayer renders both video & audio tracks directly (no duplicate hidden <audio> echo!)
        setScreenStream(stream);
      } else {
        attachRemoteVoiceAudio(senderId, stream);
      }
    },
    onStreamStopped: (senderId: string, isScreen: boolean) => {
      if (isScreen) {
        if (!screenService.hasActiveStream()) {
          setScreenStream(null);
        }
      } else {
        detachRemoteVoiceAudio(senderId);
      }
    },
  });

  const handleCreateRoom = async (name: string, customCode?: string) => {
    const code =
      customCode && isValidRoomCode(customCode) ? customCode.toUpperCase() : generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    setIsJoining(true);
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

    const manager = new RoomManager(
      initialProfile,
      buildRoomCallbacks(() => roomManagerRef.current, true)
    );
    roomManagerRef.current = manager;

    try {
      const assignedId = await manager.initHost(code);
      setMyId(assignedId);
      setParticipants([{ ...initialProfile, id: assignedId }]);
      setInRoom(true);
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('room', code);
      window.history.replaceState({}, document.title, nextUrl.toString());
    } catch (err: any) {
      showToast(`Не удалось открыть зал: ${err.message || err}`, 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinRoom = async (code: string, name: string) => {
    const cleanCode = extractRoomCode(code);
    setRoomCode(cleanCode);
    setIsHost(false);
    setIsJoining(true);
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

    const manager = new RoomManager(
      initialProfile,
      buildRoomCallbacks(() => roomManagerRef.current, false)
    );
    roomManagerRef.current = manager;

    try {
      const assignedId = await manager.joinRoom(cleanCode);
      setMyId(assignedId);
      const selfWithId = { ...initialProfile, id: assignedId };
      setParticipants((prev) => {
        if (prev.some((x) => x.id === assignedId)) return prev;
        return [...prev, selfWithId];
      });
      setInRoom(true);
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('room', cleanCode);
      window.history.replaceState({}, document.title, nextUrl.toString());
    } catch (err) {
      console.error(err);
    } finally {
      setIsJoining(false);
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
      showToast(`${analysis.noticeTitle}: используйте «Экран в эфир»`, 'info');
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
      setChatMessages((prev) => [
        ...prev,
        {
          id: nextSysId(audioTracks.length === 0 ? 'audio-warn' : 'audio-ok'),
          senderId: 'system',
          senderName: 'Система',
          text:
            audioTracks.length === 0
              ? 'Эфир запущен без звука вкладки. Чтобы зрители слышали фильм, выберите вкладку браузера и отметьте «Также предоставлять доступ к аудио вкладки».'
              : 'Эфир со звуком активен и транслируется всем участникам зала.',
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);
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
    <div className="min-h-screen text-[#FAFAFA] flex flex-col relative">
      <div className="studio-backdrop" aria-hidden="true" />

      <a href="#main-content" className="skip-link">
        Перейти к основному содержимому
      </a>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none px-4 w-full max-w-md flex justify-center">
          <div
            className={`animate-toast-in pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl studio-hud text-xs font-medium ${
              toastMessage.tone === 'error' ? 'border-rose-500/40 text-rose-300' : 'text-zinc-100'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                toastMessage.tone === 'error' ? 'bg-rose-500' : 'bg-emerald-400'
              }`}
            />
            <span className="truncate">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Hide Top Navbar completely in Cinema / Lights-Off Mode */}
      {!isCinemaMode && (
        <Navbar
          onGoHome={handleLeaveRoom}
          roomCode={inRoom ? roomCode : undefined}
          isHost={isHost}
          participantCount={participants.length}
          connectionStatus={connectionStatus}
          activeStreamerName={activeStreamerName}
          onEnterCinemaMode={inRoom ? () => setIsCinemaMode(true) : undefined}
        />
      )}

      {!inRoom ? (
        <main id="main-content" className="flex-1 flex flex-col">
          <LandingPage
            initialRoomCode={roomCode}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            isConnecting={isJoining}
          />
        </main>
      ) : (
        <main
          id="main-content"
          className={
            isCinemaMode
              ? 'fixed inset-0 z-50 bg-black flex items-center justify-center p-0 m-0'
              : 'flex-1 p-2.5 sm:p-4 max-w-[1720px] w-full mx-auto flex flex-col gap-3'
          }
        >
          <div
            className={
              isCinemaMode
                ? 'w-full h-full flex'
                : `grid grid-cols-1 ${
                    isChatVisible ? 'lg:grid-cols-12' : 'lg:grid-cols-1'
                  } gap-3 flex-1 items-stretch`
            }
          >
            {/* Theater Stage Column */}
            <div
              className={
                isCinemaMode
                  ? 'w-full h-full flex flex-col'
                  : `${
                      isChatVisible
                        ? 'lg:col-span-9'
                        : 'lg:col-span-1 max-w-6xl mx-auto w-full'
                    } flex flex-col gap-2.5`
              }
            >
              <div className={isCinemaMode ? 'w-full h-full' : 'w-full'}>
                <VideoPlayer
                  playbackState={playbackState}
                  onUpdateState={handleUpdatePlaybackState}
                  isHost={isHost}
                  isLocalSharing={isScreenSharing}
                  screenStream={screenStream}
                  activeStreamerName={activeStreamerName}
                  onStopScreenShare={isScreenSharing ? handleStopScreenShare : undefined}
                  onRequestScreenStream={() => roomManagerRef.current?.requestScreenStream()}
                  externalNotice={externalNotice}
                  onDismissNotice={() => setExternalNotice(null)}
                  isCinemaMode={isCinemaMode}
                  onToggleCinemaMode={() => setIsCinemaMode((prev) => !prev)}
                >
                  <div className="h-64 sm:h-72 flex flex-col">
                    <ChatPanel
                      messages={chatMessages}
                      currentUserId={myId}
                      onSendMessage={(text, file) =>
                        roomManagerRef.current?.sendChatMessage(text, file)
                      }
                      hideHeader={true}
                    />
                  </div>
                </VideoPlayer>
              </div>

              {!isCinemaMode && (
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
                  onToggleChat={() =>
                    setIsChatVisible((prev) => {
                      const next = !prev;
                      if (next && sidebarTab === 'chat') {
                        setUnreadCount(0);
                      }
                      return next;
                    })
                  }
                  onEnterCinemaMode={() => setIsCinemaMode(true)}
                />
              )}
            </div>

            {/* Unified Studio Sidebar (Chat + Live Viewers Tabs) */}
            {!isCinemaMode && isChatVisible && (
              <aside className="lg:col-span-3 studio-panel rounded-2xl flex flex-col h-[520px] lg:h-[calc(100vh-5.25rem)] overflow-hidden animate-panel-in">
                {/* Compact Live Speaking Avatars + Tab Switcher */}
                <div className="p-2.5 border-b border-white/[0.07] bg-[#0E0E12] space-y-2.5">
                  {/* Live Viewers Strip */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-0.5">
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        title={`${p.name}${p.role === 'host' ? ' (Ведущий)' : ''}`}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#18181E] border border-white/[0.07] shrink-0 text-[11px] ${
                          p.isSpeaking ? 'speaking-halo' : ''
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.isSpeaking
                              ? 'bg-emerald-400'
                              : !p.isAudioMuted
                              ? 'bg-emerald-500/60'
                              : 'bg-zinc-600'
                          }`}
                        />
                        <span className="text-zinc-200 font-medium max-w-[80px] truncate">
                          {p.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Segmented Sidebar Tabs */}
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-[#15151A] gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarTab('chat');
                        setUnreadCount(0);
                      }}
                      className={`tactile py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                        sidebarTab === 'chat'
                          ? 'bg-[#24242C] text-[#FAFAFA]'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Чат</span>
                      {unreadCount > 0 && sidebarTab !== 'chat' && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-semibold tabular-nums">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSidebarTab('participants')}
                      className={`tactile py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                        sidebarTab === 'participants'
                          ? 'bg-[#24242C] text-[#FAFAFA]'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Зрители ({participants.length})</span>
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                  {sidebarTab === 'chat' ? (
                    <ChatPanel
                      messages={chatMessages}
                      currentUserId={myId}
                      onSendMessage={(text, file) =>
                        roomManagerRef.current?.sendChatMessage(text, file)
                      }
                      hideHeader={true}
                    />
                  ) : (
                    <ParticipantList
                      participants={participants}
                      currentUserId={myId}
                      isHost={isHost}
                      activeStreamerId={activeStreamerId}
                      onTransferHost={(targetId) => roomManagerRef.current?.transferHost(targetId)}
                      onKickParticipant={(targetId) =>
                        roomManagerRef.current?.kickParticipant(targetId)
                      }
                      embedded={true}
                    />
                  )}
                </div>
              </aside>
            )}
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
