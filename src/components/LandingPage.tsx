import React, { useState } from 'react';
import { ArrowRight, Shuffle, X, Tv, Users } from 'lucide-react';
import { extractRoomCode, isValidRoomCode } from '../config';

interface SavedRoom {
  code: string;
  isHost: boolean;
  lastJoined: number;
}

interface LandingPageProps {
  initialRoomCode?: string;
  onCreateRoom: (name: string, customCode?: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
  isConnecting?: boolean;
}

function loadSavedRooms(): SavedRoom[] {
  try {
    const stored = localStorage.getItem('maxify_saved_rooms');
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const LandingPage: React.FC<LandingPageProps> = ({
  initialRoomCode = '',
  onCreateRoom,
  onJoinRoom,
  isConnecting = false,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>(() =>
    initialRoomCode.trim() ? 'join' : 'create'
  );
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

  const randomNames = ['Алекс', 'Макс', 'София', 'Даниил', 'Ева', 'Кирилл', 'Алина', 'Артём'];

  const persistName = (val: string) => {
    try {
      localStorage.setItem('maxify_user_name', val);
    } catch {}
  };

  const handleRandomizeName = () => {
    const pick = randomNames[Math.floor(Math.random() * randomNames.length)];
    setUserName(pick);
    persistName(pick);
  };

  const handleNameChange = (val: string) => {
    setUserName(val);
    persistName(val);
  };

  const handleCodeInput = (raw: string) => {
    setRoomCode(extractRoomCode(raw).slice(0, 10));
    if (errorMsg) setErrorMsg('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnecting) return;
    const cleanName = userName.trim() || 'Зритель';
    persistName(cleanName);
    setErrorMsg('');
    onCreateRoom(cleanName);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnecting) return;
    const cleanName = userName.trim() || 'Зритель';
    persistName(cleanName);

    const targetCode = extractRoomCode(roomCode);
    if (!isValidRoomCode(targetCode)) {
      setErrorMsg('Укажите корректный код зала (4–10 символов) или вставьте ссылку.');
      return;
    }
    setErrorMsg('');
    onJoinRoom(targetCode, cleanName);
  };

  const handleQuickSelectRoom = (code: string) => {
    setMode('join');
    setRoomCode(code);
    setErrorMsg('');
  };

  const handleDeleteSavedRoom = (codeToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedRooms.filter((r) => r.code !== codeToDelete);
    setSavedRooms(updated);
    try {
      localStorage.setItem('maxify_saved_rooms', JSON.stringify(updated));
    } catch {}
  };

  const segClass = (active: boolean) =>
    `flex-1 h-10 rounded-full text-[13px] font-medium flex items-center justify-center gap-2 cursor-pointer border-0 transition-all duration-300 ${
      active ? 'glass-seg-on' : 'bg-transparent text-white/60 hover:text-white'
    }`;

  return (
    <div className="flex-1 flex flex-col max-w-lg w-full mx-auto px-4 py-8 sm:py-14">
      <div className="my-auto space-y-7">
        <div className="space-y-2 text-center anim-in">
          <h1 className="text-[34px] sm:text-[40px] leading-[1.05] font-semibold text-white font-display">
            Совместный кинозал
          </h1>
          <p className="text-[15px] text-white/60 max-w-sm mx-auto leading-snug">
            Смотрите фильмы и трансляции вкладки синхронно с друзьями.
          </p>
        </div>

        <div
          className="glass glass-refract rounded-[32px] p-2 anim-in"
          style={{ animationDelay: '70ms' }}
        >
          {/* Segmented control */}
          <div className="glass-thin rounded-full p-1 flex gap-1 mb-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'create'}
              onClick={() => {
                setMode('create');
                setErrorMsg('');
              }}
              className={segClass(mode === 'create')}
            >
              <Tv className="w-4 h-4" />
              Создать
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'join'}
              onClick={() => {
                setMode('join');
                setErrorMsg('');
              }}
              className={segClass(mode === 'join')}
            >
              <Users className="w-4 h-4" />
              Войти по коду
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            <div>
              <label htmlFor="user-name" className="block text-xs font-medium text-white/60 mb-2 ml-1">
                Ваше имя
              </label>
              <div className="relative">
                <input
                  id="user-name"
                  type="text"
                  value={userName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Например, Алекс"
                  maxLength={20}
                  autoComplete="nickname"
                  className="glass-input w-full rounded-2xl px-4 py-3 pr-12 text-[15px]"
                />
                <button
                  type="button"
                  onClick={handleRandomizeName}
                  title="Случайное имя"
                  aria-label="Случайное имя"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white/55 hover:text-white hover:bg-white/10 transition-colors cursor-pointer bg-transparent border-0"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {mode === 'create' ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <p className="text-[13px] text-white/55 leading-relaxed px-1">
                  Откроется приватный зал с кодом. Отправьте ссылку друзьям, запустите эфир вкладки со
                  звуком или видео по ссылке — а на время фильма скройте весь интерфейс.
                </p>
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="glass-btn glass-btn-blue w-full h-12 rounded-full text-[15px] font-semibold flex items-center justify-center gap-2"
                >
                  <span>{isConnecting ? 'Открываем зал…' : 'Открыть зал'}</span>
                  {!isConnecting && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label htmlFor="room-code" className="block text-xs font-medium text-white/60 mb-2 ml-1">
                    Код зала или ссылка-приглашение
                  </label>
                  <input
                    id="room-code"
                    type="text"
                    value={roomCode}
                    onChange={(e) => handleCodeInput(e.target.value)}
                    placeholder="K7MX42"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    className="glass-input w-full rounded-2xl px-4 py-3.5 text-xl font-mono font-semibold uppercase tracking-[0.28em] text-center tabular-nums"
                  />
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="anim-pop p-3 rounded-2xl bg-[#ff453a]/15 border border-[#ff453a]/35 text-[#ff8a82] text-[13px] text-center"
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!roomCode.trim() || isConnecting}
                  className="glass-btn glass-btn-blue w-full h-12 rounded-full text-[15px] font-semibold flex items-center justify-center gap-2"
                >
                  <span>{isConnecting ? 'Подключение…' : 'Подключиться'}</span>
                  {!isConnecting && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            )}
          </div>
        </div>

        {savedRooms.length > 0 && (
          <div className="space-y-2.5 anim-in" style={{ animationDelay: '140ms' }}>
            <div className="text-[11px] font-semibold text-white/45 uppercase tracking-wider px-2">
              Недавние залы
            </div>
            <div className="flex flex-wrap gap-2">
              {savedRooms.map((sr) => (
                <div
                  key={sr.code}
                  className="glass-btn inline-flex items-center gap-1 h-9 pl-3.5 pr-1.5 rounded-full text-xs"
                >
                  <button
                    type="button"
                    onClick={() => handleQuickSelectRoom(sr.code)}
                    className="inline-flex items-center gap-2 bg-transparent border-0 p-0 text-white cursor-pointer"
                  >
                    <span className="font-mono font-semibold tabular-nums">{sr.code}</span>
                    {sr.isHost && <span className="text-[10px] text-[#ffd60a]">ведущий</span>}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSavedRoom(sr.code, e)}
                    title="Убрать из списка"
                    aria-label={`Убрать зал ${sr.code} из списка`}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-[#ff453a] hover:bg-white/10 cursor-pointer bg-transparent border-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="text-center text-[11px] text-white/35 pt-8">
        Видео и звук идут напрямую между браузерами участников по WebRTC
      </footer>
    </div>
  );
};
