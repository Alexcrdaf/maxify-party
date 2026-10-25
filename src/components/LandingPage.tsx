import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Dice5,
  Film,
  Monitor,
  Mic,
  Trash2,
  Bookmark,
  Zap,
  Globe,
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

export const LandingPage: React.FC<LandingPageProps> = ({ initialRoomCode = '', onCreateRoom, onJoinRoom }) => {
  const [userName, setUserName] = useState(() => localStorage.getItem('maxify_user_name') || '');
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>([]);

  const randomNames = ['Алекс', 'Макс', 'София', 'Даниил', 'Ева', 'Кирилл', 'Алина', 'Артём'];

  useEffect(() => {
    try {
      const stored = localStorage.getItem('maxify_saved_rooms');
      if (stored) setSavedRooms(JSON.parse(stored));
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (initialRoomCode) setRoomCode(initialRoomCode);
  }, [initialRoomCode]);

  const handleRandomizeName = () => {
    const pick = randomNames[Math.floor(Math.random() * randomNames.length)];
    setUserName(pick);
    localStorage.setItem('maxify_user_name', pick);
  };

  const handleNameChange = (val: string) => {
    setUserName(val);
    localStorage.setItem('maxify_user_name', val);
  };

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = userName.trim() || 'Гость';
    localStorage.setItem('maxify_user_name', cleanName);
    setErrorMsg('');
    onCreateRoom(cleanName);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = userName.trim() || 'Гость';
    localStorage.setItem('maxify_user_name', cleanName);
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
    } catch (_) {}
  };

  return (
    <div className="flex-1 flex flex-col justify-between max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-14 text-white relative z-10">
      {/* Hero Header Area */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight syne mb-4 leading-tight">
          Смотри вместе.{' '}
          <span className="bg-gradient-to-r from-[#da8fff] via-[#bf5af2] to-[#ff69b4] bg-clip-text text-transparent drop-shadow-md">
            В один клик.
          </span>
        </h1>
        <p className="text-base sm:text-lg text-[#dcbcff]/80 max-w-lg mx-auto leading-relaxed">
          Мгновенный синхронный просмотр видео, стримов и трансляция вкладок с чистым звуком и без задержек.
        </p>
      </div>

      {/* Main Glass Cards Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl w-full mx-auto mb-12">
        {/* Card 1: Create Room */}
        <div className="glass-panel p-6 sm:p-8 rounded-[32px] flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:border-[#bf5af2]/50">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#bf5af2] to-[#da8fff] flex items-center justify-center mb-5 shadow-lg shadow-[#bf5af2]/35">
              <Film className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight syne mb-2 text-white">
              Создать комнату
            </h2>
            <p className="text-xs sm:text-sm text-[#dcbcff]/70 leading-relaxed mb-6">
              Получите уникальный 6-значный код комнаты, пригласите друзей и управляйте совместным плеером как хост.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#dcbcff]/90 mb-1.5 ml-1">
                  Ваше имя в комнате
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Например: Алекс"
                    maxLength={20}
                    className="w-full px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-sm font-semibold text-white placeholder-[#dcbcff]/40 focus:outline-none focus:border-[#bf5af2] focus:ring-2 focus:ring-[#bf5af2]/30 transition-all backdrop-blur-xl"
                  />
                  <button
                    type="button"
                    onClick={handleRandomizeName}
                    title="Случайное имя"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-[#dcbcff]/70 hover:text-white hover:bg-white/10 transition-colors"
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
            className="w-full mt-8 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#da8fff] via-[#bf5af2] to-[#a855f7] hover:opacity-95 active:scale-98 text-white font-bold text-sm tracking-wide shadow-xl shadow-[#bf5af2]/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Создать новую комнату</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Card 2: Join by Code */}
        <div className="glass-panel p-6 sm:p-8 rounded-[32px] flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:border-[#bf5af2]/50">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-white/[0.08] border border-white/15 flex items-center justify-center mb-5 shadow-lg">
              <Globe className="w-6 h-6 text-[#da8fff]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight syne mb-2 text-white">
              Войти по коду
            </h2>
            <p className="text-xs sm:text-sm text-[#dcbcff]/70 leading-relaxed mb-6">
              Друг прислал код комнаты? Введите его ниже, чтобы мгновенно подключиться к трансляции.
            </p>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#dcbcff]/90 mb-1.5 ml-1">
                  Код комнаты
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="КОД (НАПР. K7MX42)"
                  maxLength={10}
                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-sm font-mono uppercase tracking-widest text-center text-white placeholder-[#dcbcff]/40 focus:outline-none focus:border-[#bf5af2] focus:ring-2 focus:ring-[#bf5af2]/30 transition-all backdrop-blur-xl font-bold"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs text-center font-medium">
                  {errorMsg}
                </div>
              )}
            </form>
          </div>

          <button
            type="button"
            onClick={handleJoin}
            disabled={!roomCode.trim()}
            className="w-full mt-8 py-3.5 px-6 rounded-2xl bg-white/[0.1] hover:bg-white/[0.18] active:scale-98 disabled:opacity-40 disabled:hover:bg-white/[0.1] text-white font-bold text-sm tracking-wide border border-white/15 backdrop-blur-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Присоединиться к просмотру</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid in iOS Glass Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl w-full mx-auto mb-10">
        <div className="glass-panel p-5 rounded-2xl text-left">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-[#da8fff]" />
            <h3 className="text-sm font-bold text-white">Прямой P2P DataChannel</h3>
          </div>
          <p className="text-xs text-[#dcbcff]/70 leading-relaxed">
            Синхронизация паузы, таймкода и скорости воспроизведения с миллисекундным откликом.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl text-left">
          <div className="flex items-center gap-3 mb-2">
            <Monitor className="w-5 h-5 text-[#da8fff]" />
            <h3 className="text-sm font-bold text-white">Трансляция вкладки</h3>
          </div>
          <p className="text-xs text-[#dcbcff]/70 leading-relaxed">
            Захват видео и оригинального звука браузера без промежуточного сжатия и задержки.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl text-left">
          <div className="flex items-center gap-3 mb-2">
            <Mic className="w-5 h-5 text-[#da8fff]" />
            <h3 className="text-sm font-bold text-white">Голосовой чат Opus</h3>
          </div>
          <p className="text-xs text-[#dcbcff]/70 leading-relaxed">
            Раздельные аудиоканалы для фильма и голоса участников с подавлением эха.
          </p>
        </div>
      </div>

      {/* Saved / Recent Rooms */}
      {savedRooms.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl max-w-4xl w-full mx-auto mb-8 text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#dcbcff] uppercase tracking-wider">
              <Bookmark className="w-4 h-4 text-[#da8fff]" />
              <span>Недавние комнаты</span>
            </div>
            <span className="text-[11px] text-[#dcbcff]/50">Кликните, чтобы выбрать</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedRooms.map((sr) => (
              <div
                key={sr.code}
                onClick={() => setRoomCode(sr.code)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-mono font-bold text-white cursor-pointer transition-all"
              >
                <span>{sr.code}</span>
                {sr.isHost && (
                  <span className="text-[9px] bg-[#bf5af2]/30 text-[#da8fff] px-1.5 py-0.2 rounded-full font-sans">
                    Хост
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleDeleteSavedRoom(sr.code, e)}
                  title="Удалить"
                  className="p-1 text-[#dcbcff]/40 hover:text-red-400 transition-colors ml-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="text-center text-xs text-[#dcbcff]/50 pt-6 border-t border-white/[0.06]">
        Maxify • Чистый P2P совместный просмотр на GitHub Pages без серверных логов
      </footer>
    </div>
  );
};
