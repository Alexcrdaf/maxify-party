import React, { useState } from 'react';
import {
  Monitor,
  Zap,
  ArrowRight,
  Sparkles,
  Volume2,
  Heart,
  ExternalLink,
  ShieldCheck,
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass text-purple-200 text-xs font-semibold mb-6 shadow-lg shadow-purple-500/10">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
          <span>Синхронный просмотр нового поколения 2026</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4 max-w-3xl leading-tight">
          Один экран.{' '}
          <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent">
            Одна компания.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-xl mb-10 leading-relaxed font-light">
          Смотрите фильмы, сериалы и стримы вместе с друзьями прямо в браузере с идеальной синхронизацией, трансляцией вкладки со звуком и голосовой связью.
        </p>

        {/* Liquid Glass Action Card */}
        <div className="liquid-glass p-7 sm:p-9 rounded-3xl max-w-md w-full relative group">
          <div className="mb-5 text-left">
            <label className="block text-xs font-semibold text-slate-300 mb-2">Ваше имя в комнате</label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Например: Алекс"
              maxLength={20}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/80 transition shadow-inner"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-red-300 bg-red-500/15 border border-red-500/30 p-3 rounded-2xl mb-4 text-left">
              {errorMsg}
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 mb-4 group active:scale-95"
          >
            <span>Создать новую комнату</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </button>

          <div className="relative my-6 flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#0b0d17] px-3 text-[11px] text-slate-400 uppercase tracking-wider absolute rounded-full border border-white/5">
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
              className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm font-mono tracking-wider text-slate-100 placeholder-slate-500 uppercase focus:outline-none focus:border-purple-500/80 transition shadow-inner"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition border border-white/10 active:scale-95"
            >
              Войти
            </button>
          </form>
        </div>
      </div>

      {/* Feature Highlights Grid in Liquid Glass */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-16">
        <div className="liquid-glass p-7 rounded-3xl flex flex-col items-start text-left transition hover:-translate-y-1">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 mb-4 shadow-lg">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Мгновенная P2P-синхронизация</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-light">
            Воспроизведение, пауза и перемотка управляются ведущим в реальном времени через WebRTC DataChannel с нулевой серверной задержкой.
          </p>
        </div>

        <div className="liquid-glass p-7 rounded-3xl flex flex-col items-start text-left transition hover:-translate-y-1">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 mb-4 shadow-lg">
            <Monitor className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Трансляция вкладки со звуком</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-light">
            Полноценный захват любой вкладки браузера с прямой передачей оригинального аудиопотока и функциями масштабирования (Zoom).
          </p>
        </div>

        <div className="liquid-glass p-7 rounded-3xl flex flex-col items-start text-left transition hover:-translate-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-4 shadow-lg">
            <Volume2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Голосовой чат с VAD</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-light">
            Общайтесь голосом во время просмотра. Индикатор активности речи в реальном времени и раздельные аудиоканалы против эха.
          </p>
        </div>
      </div>

      {/* Footer with Boosty & Legal Safety */}
      <footer className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <div className="flex items-center gap-2">
          <span>© 2026 SyncWave by Alexcdraft.</span>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3" /> 100% P2P Legal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://boosty.to/vostguy/donate"
            target="_blank"
            rel="noreferrer"
            className="liquid-glass-boosty px-3.5 py-1.5 rounded-xl text-orange-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition active:scale-95 shadow"
          >
            <Heart className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
            <span>Поддержать проект на Boosty</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      </footer>
    </div>
  );
};
