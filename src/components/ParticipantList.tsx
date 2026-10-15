import React from 'react';
import { Shield, Mic, MicOff, UserMinus, Crown, Users } from 'lucide-react';
import type { Participant } from '../types';

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  onTransferHost: (participantId: string) => void;
  onKickParticipant: (participantId: string) => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  isHost,
  onTransferHost,
  onKickParticipant,
}) => {
  return (
    <div className="bg-[#18181b] border border-[#2d2d35] rounded-xl p-3.5 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#26262c]">
        <h3 className="text-xs uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-purple-400" />
          <span>Участники</span>
        </h3>
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-white/10 text-sky-300">
          {participants.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {participants.map((p) => {
          const isMe = p.id === currentUserId;
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                isMe
                  ? 'bg-sky-500/20 border-sky-400/40 shadow-sm'
                  : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className={`relative w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm ${
                    p.isSpeaking ? 'speaking-ring ring-2 ring-emerald-400' : ''
                  }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {p.name}
                    </span>
                    {isMe && <span className="text-[10px] text-sky-400 font-medium">(Вы)</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {p.role === 'host' ? (
                      <span className="text-[10px] text-amber-300 font-medium flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5 text-amber-300" /> Ведущий
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Зритель</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span title={p.isAudioMuted ? 'Микрофон отключён' : 'Голос активен'}>
                  {p.isAudioMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </span>

                {isHost && !isMe && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onTransferHost(p.id)}
                      title="Передать роль ведущего"
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-400/10 transition"
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onKickParticipant(p.id)}
                      title="Исключить из комнаты"
                      className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
