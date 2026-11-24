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
    return stored ? JSON.parse(stored) : [];
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

  const handleCodeInput = (raw: string) => {
    const extracted = extractRoomCode(raw);
    setRoomCode(extracted.slice(0, 10));
    if (errorMsg) setErrorMsg('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnecting) return;
    const cleanName = userName.trim() || 'Зритель';
    try {
      localStorage.setItem('maxify_user_name', cleanName);
    } catch {}
    setErrorMsg('');
    onCreateRoom(cleanName);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnecting) return;
    const cleanName = userName.trim() || 'Зритель';
    try {
      localStorage.setItem('maxify_user_name', cleanName);
    } catch {}

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

  return (
    <div className="flex-1 flex flex-col justify-between max-w-xl w-full mx-auto px-4 py-8 sm:py-12">
      <div className="my-auto space-y-6 animate-panel-in">
        {/* Compact Studio Title */}
        <div className="space-y-1.5 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#FAFAFA] font-display tracking-tight">
            Совместный кинозал
          </h1>
          <p className="text-sm text-zinc-400">
            Смотрите фильмы и трансляции вкладки синхронно с друзьями в одной комнате.
          </p>
        </div>

        {/* Main Studio Ticket Box */}
        <div className="studio-panel rounded-2xl overflow-hidden">
          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 p-1.5 bg-[#0D0D10] border-b border-white/[0.06] gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('create');
                setErrorMsg('');
              }}
              className={`tactile py-2.5 px-3 rounded-xl text-xs sm:text-[13px] font-medium flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'create'
                  ? 'bg-[#1C1C22] text-[#FAFAFA] shadow-sm border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Создать сеанс</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('join');
                setErrorMsg('');
              }}
              className={`tactile py-2.5 px-3 rounded-xl text-xs sm:text-[13px] font-medium flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'join'
                  ? 'bg-[#1C1C22] text-[#FAFAFA] shadow-sm border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Войти по коду</span>
            </button>
          </div>

          {/* Form Body */}
          <div className="p-5 sm:p-6">
            {/* Shared Name Input */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Ваше имя в зале
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Например, Алекс"
                  maxLength={20}
                  className="studio-input w-full rounded-xl px-3.5 py-2.5 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={handleRandomizeName}
                  title="Случайное имя"
                  className="tactile absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {mode === 'create' ? (
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="rounded-xl bg-[#151519] border border-white/[0.06] p-3.5 text-xs text-zinc-400 space-y-1 leading-relaxed">
                  <div className="text-zinc-200 font-medium">Как это работает</div>
                  <p>
                    Откроется приватная комната с 6-значным кодом. Скиньте ссылку друзьям — вы сможете запустить трансляцию вкладки со звуком или включить фильм по прямой ссылке, а во время просмотра полностью скрыть интерфейс.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="tactile w-full py-3 px-4 rounded-xl bg-[#FAFAFA] hover:bg-white disabled:opacity-50 text-[#09090B] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isConnecting ? 'Открываем зал…' : 'Открыть новый зал'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-zinc-400">
                      Код комнаты или ссылка-приглашение
                    </label>
                    <span className="text-[11px] text-zinc-500">6 символов</span>
                  </div>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => handleCodeInput(e.target.value)}
                    placeholder="K7MX42"
                    autoFocus
                    aria-label="Код комнаты"
                    className="studio-input w-full rounded-xl px-4 py-3 text-lg font-mono font-semibold uppercase tracking-[0.26em] text-center tabular-nums"
                  />
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs text-center">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!roomCode.trim() || isConnecting}
                  className="tactile w-full py-3 px-4 rounded-xl bg-[#FAFAFA] hover:bg-white disabled:opacity-35 text-[#09090B] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isConnecting ? 'Подключение…' : 'Подключиться к сеансу'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Saved Recent Rooms Strip */}
        {savedRooms.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-1">
              Недавние залы
            </div>
            <div className="flex flex-wrap gap-2">
              {savedRooms.map((sr) => (
                <div
                  key={sr.code}
                  onClick={() => handleQuickSelectRoom(sr.code)}
                  className="tactile group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121216] hover:bg-[#19191F] border border-white/[0.07] text-xs cursor-pointer"
                >
                  <span className="font-mono font-semibold text-zinc-200 tabular-nums">
                    {sr.code}
                  </span>
                  {sr.isHost && (
                    <span className="text-[10px] text-amber-400/90">ведущий</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSavedRoom(sr.code, e)}
                    title="Удалить из списка"
                    className="text-zinc-600 hover:text-rose-400 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Minimal Footer */}
      <footer className="text-center text-[11px] text-zinc-600 pt-6">
        Прямая передача видео и звука между браузерами участников по протоколу WebRTC P2P
      </footer>
    </div>
  );
};
