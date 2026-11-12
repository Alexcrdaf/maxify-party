import React, { useState } from 'react';
import {
  ArrowRight,
  Dice5,
  Tv,
  MonitorUp,
  Mic,
  Trash2,
  Clock,
  Zap,
} from 'lucide-react';
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
    <div className="flex-1 flex flex-col justify-between max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-14 text-white relative z-10">
      {/* Apple-style Hero */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 animate-ios-spring">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.07] border border-white/[0.12] text-[11px] font-medium text-white/80 mb-5 backdrop-blur-xl">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0A84FF]" />
          <span>Совместный просмотр без серверов и задержек</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight sf-display mb-4 leading-[1.08] text-white">
          Смотрите вместе.{' '}
          <span className="bg-gradient-to-r from-[#5AC8FA] via-[#0A84FF] to-[#BF5AF2] bg-clip-text text-transparent">
            В одно касание.
          </span>
        </h1>
        <p className="text-[15px] sm:text-[17px] text-white/60 max-w-lg mx-auto leading-relaxed font-normal">
          Синхронный видеоплеер, трансляция вкладки до 60 FPS и голосовой чат по прямому P2P-соединению.
        </p>
      </div>

      {/* Main iOS 17 Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl w-full mx-auto mb-10">
        {/* Card 1: Create Room */}
        <div
          className="ios-material p-6 sm:p-7 rounded-[28px] flex flex-col justify-between animate-ios-spring"
          style={{ animationDelay: '60ms' }}
        >
          <div>
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-b from-[#0A84FF] to-[#5E5CE6] flex items-center justify-center mb-5 shadow-[0_8px_20px_rgba(10,132,255,0.35)]">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-[22px] font-semibold tracking-tight sf-display mb-1.5 text-white">
              Создать комнату
            </h2>
            <p className="text-[13px] text-white/55 leading-relaxed mb-6">
              Создайте приватную комнату, отправьте код друзьям и управляйте воспроизведением.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-white/70 mb-1.5 ml-1">
                  Ваше имя
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Например: Алекс"
                    maxLength={20}
                    className="ios-input w-full px-4 py-3 pr-11 text-[14px] font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleRandomizeName}
                    title="Случайное имя"
                    className="ios-press absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Dice5 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCreate()}
            className="ios-press w-full mt-7 py-3.5 px-6 rounded-[16px] bg-gradient-to-b from-[#0A84FF] to-[#0070E0] hover:brightness-110 text-white font-semibold text-[15px] tracking-tight shadow-[0_8px_24px_rgba(10,132,255,0.35)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Создать комнату</span>
            <ArrowRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Card 2: Join Room */}
        <div
          className="ios-material p-6 sm:p-7 rounded-[28px] flex flex-col justify-between animate-ios-spring"
          style={{ animationDelay: '120ms' }}
        >
          <div>
            <div className="w-11 h-11 rounded-[14px] bg-white/[0.1] border border-white/[0.12] flex items-center justify-center mb-5">
              <MonitorUp className="w-5 h-5 text-[#5AC8FA]" />
            </div>
            <h2 className="text-[22px] font-semibold tracking-tight sf-display mb-1.5 text-white">
              Войти по коду
            </h2>
            <p className="text-[13px] text-white/55 leading-relaxed mb-6">
              Введите 6-значный код от ведущего, чтобы мгновенно подключиться к просмотру.
            </p>

            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-white/70 mb-1.5 ml-1">
                  Код комнаты
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="K7MX42"
                  maxLength={10}
                  className="ios-input w-full px-4 py-3 text-[15px] font-mono uppercase tracking-[0.2em] text-center font-semibold tabular-nums"
                />
              </div>

              {errorMsg && (
                <div className="animate-ios-pop p-3 rounded-2xl bg-[#FF453A]/15 border border-[#FF453A]/30 text-[#FF6961] text-xs text-center font-medium">
                  {errorMsg}
                </div>
              )}
            </form>
          </div>

          <button
            type="button"
            onClick={handleJoin}
            disabled={!roomCode.trim()}
            className="ios-press w-full mt-7 py-3.5 px-6 rounded-[16px] bg-white/[0.12] hover:bg-white/[0.18] disabled:opacity-35 disabled:hover:bg-white/[0.12] text-white font-semibold text-[15px] tracking-tight border border-white/[0.12] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Присоединиться</span>
            <ArrowRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Apple Bento Feature Strip */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-4xl w-full mx-auto mb-8 animate-ios-spring"
        style={{ animationDelay: '180ms' }}
      >
        <div className="ios-material-thin p-4 sm:p-5 rounded-[22px] text-left">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Zap className="w-4 h-4 text-[#0A84FF]" />
            <h3 className="text-[13px] font-semibold text-white">Синхронизация P2P</h3>
          </div>
          <p className="text-[12px] text-white/55 leading-relaxed">
            Мгновенная синхронизация паузы, перемотки и таймкода напрямую между браузерами.
          </p>
        </div>

        <div className="ios-material-thin p-4 sm:p-5 rounded-[22px] text-left">
          <div className="flex items-center gap-2.5 mb-1.5">
            <MonitorUp className="w-4 h-4 text-[#5AC8FA]" />
            <h3 className="text-[13px] font-semibold text-white">Захват со звуком</h3>
          </div>
          <p className="text-[12px] text-white/55 leading-relaxed">
            Трансляция вкладки браузера в высоком качестве с оригинальным стереозвуком.
          </p>
        </div>

        <div className="ios-material-thin p-4 sm:p-5 rounded-[22px] text-left">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Mic className="w-4 h-4 text-[#30D158]" />
            <h3 className="text-[13px] font-semibold text-white">Голос и чат</h3>
          </div>
          <p className="text-[12px] text-white/55 leading-relaxed">
            Чистый голосовой канал Opus с шумоподавлением и обмен файлами в чате.
          </p>
        </div>
      </div>

      {/* Recent Rooms */}
      {savedRooms.length > 0 && (
        <div
          className="ios-material-thin p-4 sm:p-5 rounded-[22px] max-w-4xl w-full mx-auto mb-8 text-left animate-ios-spring"
          style={{ animationDelay: '220ms' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-white/60 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-[#0A84FF]" />
              <span>Недавние комнаты</span>
            </div>
            <span className="text-[11px] text-white/40">Нажмите для подстановки</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedRooms.map((sr) => (
              <div
                key={sr.code}
                onClick={() => setRoomCode(sr.code)}
                className="ios-press flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-xs font-mono font-semibold text-white cursor-pointer"
              >
                <span className="tabular-nums">{sr.code}</span>
                {sr.isHost && (
                  <span className="text-[10px] bg-[#0A84FF]/20 text-[#5AC8FA] px-1.5 py-0.5 rounded-full font-sans font-medium">
                    Хост
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleDeleteSavedRoom(sr.code, e)}
                  title="Удалить из истории"
                  className="p-0.5 text-white/35 hover:text-[#FF453A] transition-colors ml-0.5 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minimal Apple Footer */}
      <footer className="text-center text-[11px] text-white/40 pt-5 border-t border-white/[0.07] space-y-1">
        <div>Maxify • Приватный P2P-просмотр без регистрации и серверных логов</div>
        <div className="text-[10px] text-white/30">
          Работает по технологии WebRTC (прямой обмен данными между участниками комнаты).
        </div>
      </footer>
    </div>
  );
};
