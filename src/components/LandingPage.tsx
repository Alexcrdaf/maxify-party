import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Dice5, Trash2 } from 'lucide-react';
import { isValidRoomCode } from '../config';

interface SavedRoom {
  code: string;
  isHost: boolean;
  lastJoined: number;
}

interface LandingPageProps {
  initialRoomCode?: string;
  onCreateRoom: (name: string, customCode?: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
}

function loadSavedRooms(): SavedRoom[] {
  try {
    const stored = localStorage.getItem('maxify_saved_rooms');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export const LandingPage: React.FC<LandingPageProps> = ({
  initialRoomCode = '',
  onCreateRoom,
  onJoinRoom,
}) => {
  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem('maxify_user_name') || '';
    } catch {
      return '';
    }
  });
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>(loadSavedRooms);

  const consoleRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const randomNames = ['Алекс', 'Макс', 'София', 'Даниил', 'Ева', 'Кирилл', 'Алина', 'Артём'];

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = consoleRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;

    const rotY = (px - 0.5) * 6; // subtle +-3deg horizontal tilt
    const rotX = (0.5 - py) * 5; // subtle +-2.5deg vertical tilt

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${rotX.toFixed(2)}deg`);
      el.style.setProperty('--ry', `${rotY.toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
    });
  };

  const handleMouseLeave = () => {
    const el = consoleRef.current;
    if (!el) return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--gx', '50%');
    el.style.setProperty('--gy', '0%');
  };

  const handleRandomizeName = () => {
    const pick = randomNames[Math.floor(Math.random() * randomNames.length)];
    setUserName(pick);
    try {
      localStorage.setItem('maxify_user_name', pick);
    } catch {}
  };

  const handleNameChange = (val: string) => {
    setUserName(val);
    try {
      localStorage.setItem('maxify_user_name', val);
    } catch {}
  };

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = userName.trim() || 'Гость';
    try {
      localStorage.setItem('maxify_user_name', cleanName);
    } catch {}
    setErrorMsg('');
    onCreateRoom(cleanName);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = userName.trim() || 'Гость';
    try {
      localStorage.setItem('maxify_user_name', cleanName);
    } catch {}
    if (!isValidRoomCode(roomCode)) {
      setErrorMsg('Введите корректный 6-значный код комнаты (латинские буквы и цифры).');
      return;
    }
    setErrorMsg('');
    onJoinRoom(roomCode.trim().toUpperCase(), cleanName);
  };

  const handleDeleteSavedRoom = (codeToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedRooms.filter((r) => r.code !== codeToDelete);
    setSavedRooms(updated);
    try {
      localStorage.setItem('maxify_saved_rooms', JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="flex-1 flex flex-col justify-between max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 text-[#F5F5F7] relative z-10 stage-perspective">
      {/* Main Spatial 3D Session Console */}
      <div className="my-auto py-4">
        <div
          ref={consoleRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="animate-spatial-3d card-3d-interactive ios-material rounded-[28px] overflow-hidden"
        >
          <div className="card-3d-sheen" aria-hidden="true" />

          {/* Top Bar: Headline + Single Unified Name Input */}
          <div className="p-6 sm:p-8 border-b border-white/[0.08] flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight sf-display text-[#F5F5F7] leading-tight">
                Кинозал для своих
              </h1>
              <p className="text-[14px] sm:text-[15px] text-white/55 mt-1.5 leading-snug">
                Синхронный эфир и видео без промежуточных серверов
              </p>
            </div>

            <div className="w-full md:w-64 shrink-0">
              <label className="block text-[11px] font-medium text-white/50 mb-1.5 ml-1">
                Ваше имя
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Например: Алекс"
                  maxLength={20}
                  className="ios-input w-full px-3.5 py-2.5 pr-10 text-[14px] font-medium"
                />
                <button
                  type="button"
                  onClick={handleRandomizeName}
                  title="Случайное имя"
                  className="ios-press absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-white/45 hover:text-[#F5F5F7] hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Dice5 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Asymmetric Split Console */}
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
            {/* Left Module (5 cols): New Session */}
            <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white/[0.015]">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-[18px] font-semibold sf-display text-[#F5F5F7]">
                    Новый сеанс
                  </h2>
                  <span className="text-[11px] font-mono text-white/45 tabular-nums">
                    WebRTC • 60 FPS
                  </span>
                </div>
                <p className="text-[13px] text-white/55 leading-relaxed">
                  Создайте закрытую комнату. Участники подключаются напрямую к вашему экрану или видеопотоку по 6-значному коду.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCreate()}
                className="ios-press w-full mt-7 py-3 px-5 rounded-[14px] bg-[#F5F5F7] hover:bg-white text-[#000000] font-semibold text-[14px] tracking-tight shadow-[0_8px_24px_rgba(255,255,255,0.12)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Открыть зал</span>
                <ArrowRight className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>

            {/* Right Module (7 cols): Join by Code (Apple TV Passkey style) */}
            <form
              onSubmit={handleJoin}
              className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-[18px] font-semibold sf-display text-[#F5F5F7]">
                    Вход по коду
                  </h2>
                  <span className="text-[11px] text-white/40">
                    6 символов
                  </span>
                </div>

                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="K7MX42"
                  maxLength={10}
                  aria-label="Код комнаты"
                  className="ios-input w-full px-4 py-3.5 text-[20px] font-mono uppercase tracking-[0.28em] text-center font-semibold tabular-nums"
                />

                {errorMsg && (
                  <div className="animate-ios-pop mt-3 p-2.5 rounded-xl bg-[#FF453A]/15 border border-[#FF453A]/30 text-[#FF6961] text-xs text-center font-medium">
                    {errorMsg}
                  </div>
                )}

                {savedRooms.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] text-white/40 mb-2">
                      Недавние залы
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {savedRooms.map((sr) => (
                        <div
                          key={sr.code}
                          onClick={() => {
                            setRoomCode(sr.code);
                            setErrorMsg('');
                          }}
                          className="ios-press flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.09] text-xs font-mono font-semibold text-[#F5F5F7] cursor-pointer"
                        >
                          <span className="tabular-nums">{sr.code}</span>
                          {sr.isHost && (
                            <span className="text-[10px] text-white/45 font-sans font-normal">
                              хост
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedRoom(sr.code, e)}
                            title="Удалить из истории"
                            className="p-0.5 text-white/30 hover:text-[#FF453A] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!roomCode.trim()}
                className="ios-press w-full mt-7 py-3 px-5 rounded-[14px] bg-white/[0.1] hover:bg-white/[0.16] disabled:opacity-35 disabled:hover:bg-white/[0.1] text-[#F5F5F7] font-semibold text-[14px] tracking-tight border border-white/[0.12] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Войти в зал</span>
                <ArrowRight className="w-4 h-4 stroke-[2.2]" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Concise P2P WebRTC Footnote */}
      <footer className="text-center text-[11px] text-white/35 pt-4">
        Прямое P2P-соединение WebRTC между участниками комнаты
      </footer>
    </div>
  );
};
