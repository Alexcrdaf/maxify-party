import React, { useState } from 'react';
import {
  Monitor,
  Zap,
  ArrowRight,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { isValidRoomCode } from '../config';

interface LandingPageProps {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onCreateRoom, onJoinRoom }) => {
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setErrorMsg('Пожалуйста, введите ваше имя.');
      return;
    }
    setErrorMsg('');
    onCreateRoom(userName.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setErrorMsg('Пожалуйста, введите ваше имя.');
      return;
    }
    if (!isValidRoomCode(roomCode)) {
      setErrorMsg('Некорректный код комнаты. Введите правильный 4–10 символьный код.');
      return;
    }
    setErrorMsg('');
    onJoinRoom(roomCode.trim().toUpperCase(), userName.trim());
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-12 px-6 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center my-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Синхронный просмотр нового поколения</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4 max-w-3xl leading-tight">
          Один экран.{' '}
          <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent">
            Одна компания.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-xl mb-10 leading-relaxed">
          Смотрите любимые видео, сериалы и фильмы вместе с друзьями прямо в браузере с идеальной синхронизацией и встроенной голосовой связью.
        </p>

        {/* Input & Action Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl relative">
          <div className="mb-5 text-left">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Ваше имя</label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Например: Алекс"
              maxLength={20}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl mb-4 text-left">
              {errorMsg}
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 mb-4 group"
          >
            <span>Создать новую комнату</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="relative my-5 flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-slate-900/90 px-3 text-[11px] text-slate-500 uppercase tracking-wider absolute">
              или подключиться по коду
            </span>
          </div>

          {/* Join form */}
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="КОД (K7MX42)"
              maxLength={10}
              className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono tracking-wider text-slate-100 placeholder-slate-500 uppercase focus:outline-none focus:border-purple-500/60"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition border border-white/5"
            >
              Войти
            </button>
          </form>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-16">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-start text-left">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">Мгновенная P2P-синхронизация</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Воспроизведение, пауза и перемотка управляются ведущим в реальном времени через WebRTC DataChannel с миллисекундной задержкой.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-start text-left">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
            <Monitor className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">Трансляция вкладки со звуком</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Полноценный захват системного экрана или отдельной вкладки браузера с прямой передачей оригинального аудиопотока.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-start text-left">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Volume2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">Встроенный голосовой чат</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Общайтесь голосом прямо во время просмотра. Раздельные каналы для системного звука фильма и микрофонов участников.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div>© 2026 SyncWave. Open-source Watch Party Platform.</div>
        <div className="flex items-center gap-6">
          <span>Работает без backend на GitHub Pages</span>
        </div>
      </footer>
    </div>
  );
};
