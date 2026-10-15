import React, { useState } from 'react';
import {
  Film,
  ScreenShare,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Dice5,
  ShieldCheck,
  Zap,
  Globe,
} from 'lucide-react';
import { isValidRoomCode } from '../config';

interface LandingPageProps {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onCreateRoom, onJoinRoom }) => {
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('maxify_user_name') || '';
  });
  const [roomCode, setRoomCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/25 text-sky-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>GitHub Pages Ready • Прямой WebRTC P2P без пережатия</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1] syne">
            Один экран.<br />
            <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Одна компания.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
            Смотрите фильмы, сериалы и трансляции вкладок браузера синхронно с друзьями. 
            Никаких промежуточных медиа-серверов: управление воспроизведением, чистый системный звук и видеопоток 
            передаются напрямую между участниками.
          </p>

          {/* Feature Cards in Maxify Glass */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="glass-panel-subtle p-4 border border-white/5 hover:border-sky-500/30 transition-all">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3">
                <Film className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white syne">HTML5 Sync</h3>
              <p className="text-xs text-slate-400 mt-1">
                Точная синхронизация MP4/WebM с компенсацией сетевого пинга и защитой от цикла событий.
              </p>
            </div>

            <div className="glass-panel-subtle p-4 border border-white/5 hover:border-indigo-500/30 transition-all">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                <ScreenShare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white syne">Захват вкладки</h3>
              <p className="text-xs text-slate-400 mt-1">
                Нативный getDisplayMedia с передачей системного звука вкладки через защищённый WebRTC.
              </p>
            </div>

            <div className="glass-panel-subtle p-4 border border-white/5 hover:border-purple-500/30 transition-all">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white syne">Внешние сайты</h3>
              <p className="text-xs text-slate-400 mt-1">
                YouTube IFrame API и честная диагностика аппаратных ограничений DRM (Widevine / HDCP).
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Maxify Session Card */}
        <div className="lg:col-span-5">
          <div className="glass-panel p-6 sm:p-8 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white syne">Вход в сессию</h2>
                <p className="text-xs text-slate-400 mt-0.5">Настройте профиль и выберите действие</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-md border border-white/20">
                {(userName.trim() || 'М').charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-4">
              <div>
                <label htmlFor="user-name-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Ваше имя в комнате
                </label>
                <div className="relative">
                  <input
                    id="user-name-input"
                    type="text"
                    maxLength={24}
                    value={userName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Например: Алекс"
                    className="w-full px-3.5 py-2.5 text-sm"
                    autoComplete="nickname"
                  />
                  <button
                    type="button"
                    onClick={handleRandomizeName}
                    title="Выбрать случайное имя"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
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
                  className="w-full btn btn-primary py-3.5 text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Создать комнату</span>
                </button>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  или по коду друга
                </span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              {/* Join Room Form */}
              <form onSubmit={handleJoin}>
                <label htmlFor="room-code-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Код комнаты друга
                </label>
                <div className="flex gap-2">
                  <input
                    id="room-code-input"
                    type="text"
                    maxLength={6}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="Например: K7MX42"
                    className="w-full font-mono text-center uppercase tracking-widest text-sm"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="btn btn-accent px-5 py-2.5 shrink-0"
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
            <div className="mt-6 pt-4 border-t border-white/10 flex items-start gap-2.5 text-xs text-slate-300">
              <Zap className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                Быстрый тест: создайте комнату и откройте ту же ссылку во второй вкладке браузера или на телефоне.
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
