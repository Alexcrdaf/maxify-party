import React, { useState } from 'react';
import {
  Film,
  ScreenShare,
  ArrowRight,
  PlusCircle,
  Dice5,
  ShieldCheck,
  Zap,
  Globe,
} from 'lucide-react';
import { isValidRoomCode } from '../config';

interface LandingPageProps {
  initialRoomCode?: string;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ initialRoomCode = '', onCreateRoom, onJoinRoom }) => {
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('maxify_user_name') || '';
  });
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
    }
  }, [initialRoomCode]);

  const randomNames = ['Алекс', 'Макс', 'София', 'Даниил', 'Ева', 'Кирилл', 'Алина', 'Артём'];

  const handleRandomizeName = () => {
    const pick = randomNames[Math.floor(Math.random() * randomNames.length)];
    setUserName(pick);
    localStorage.setItem('maxify_user_name', pick);
  };

  const handleNameChange = (val: string) => {
    setUserName(val);
    localStorage.setItem('maxify_user_name', val);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="flex-1 flex flex-col justify-between max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Hero Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center my-auto">
        {/* Left Column: Brand & Value proposition */}
        <div className="lg:col-span-7 space-y-5">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight syne">
            Смотрите стримы и фильмы вместе
          </h1>

          <p className="text-zinc-300 text-base sm:text-lg max-w-xl leading-relaxed">
            Прямая трансляция экрана со звуком вкладки и синхронный просмотр видео без задержек и без сторонних серверов. Всё передаётся напрямую между участниками через WebRTC P2P.
          </p>

          {/* Feature Cards in Solid Dark Surface */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-[#18181b]/80 border border-[#2d2d35] rounded-xl p-4 transition-colors hover:border-purple-500/40">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 mb-2.5">
                <Film className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">HTML5 плеер</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-normal">
                Точная синхронизация файлов MP4/WebM с компенсацией сетевого пинга.
              </p>
            </div>

            <div className="bg-[#18181b]/80 border border-[#2d2d35] rounded-xl p-4 transition-colors hover:border-purple-500/40">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 mb-2.5">
                <ScreenShare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Экран и вкладка</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-normal">
                Захват окна или вкладки браузера с чистым системным звуком в 60 FPS.
              </p>
            </div>

            <div className="bg-[#18181b]/80 border border-[#2d2d35] rounded-xl p-4 transition-colors hover:border-purple-500/40">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 mb-2.5">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">YouTube и ссылки</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-normal">
                Поддержка прямых ссылок на потоки и видеофайлы из облака.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Maxify Session Card */}
        <div className="lg:col-span-5">
          <div className="bg-[#18181b] border border-[#2d2d35] rounded-2xl p-6 sm:p-7 relative shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white">Вход в сессию</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Создайте комнату или подключитесь к другу</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                {(userName.trim() || 'М').charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-4">
              <div>
                <label htmlFor="user-name-input" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Ваш никнейм
                </label>
                <div className="relative">
                  <input
                    id="user-name-input"
                    type="text"
                    maxLength={24}
                    value={userName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Например: Алекс"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0e0e10] border border-[#3b3b44] rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    autoComplete="nickname"
                  />
                  <button
                    type="button"
                    onClick={handleRandomizeName}
                    title="Случайный никнейм"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
                  >
                    <Dice5 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Create Room Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCreate}
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Создать комнату</span>
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#2d2d35]"></div>
                <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                  или код приглашения
                </span>
                <div className="flex-grow border-t border-[#2d2d35]"></div>
              </div>

              {/* Join Room Form */}
              <form onSubmit={handleJoin}>
                <label htmlFor="room-code-input" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Код комнаты
                </label>
                <div className="flex gap-2">
                  <input
                    id="room-code-input"
                    type="text"
                    maxLength={6}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="Например: K7MX42"
                    className="w-full font-mono text-center uppercase tracking-widest text-sm bg-[#0e0e10] border border-[#3b3b44] rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#2d2d35] hover:bg-purple-600 active:scale-[0.98] text-white font-semibold text-sm rounded-lg transition-all shrink-0 flex items-center gap-1.5"
                  >
                    <span>Войти</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                {errorMsg && (
                  <p className="text-xs text-rose-400 mt-2 font-medium" role="alert">{errorMsg}</p>
                )}
              </form>
            </div>

            {/* Test hint */}
            <div className="mt-5 pt-3 border-t border-[#2d2d35] flex items-center gap-2 text-xs text-zinc-400">
              <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>
                Откройте созданную ссылку во второй вкладке для проверки.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer architecture block */}
      <footer className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Maxify: P2P DataChannel • STUN & TURN • Opus Voice</span>
        </div>
        <div>
          <span>Готово к хостингу на GitHub Pages</span>
        </div>
      </footer>
    </div>
  );
};
