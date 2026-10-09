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
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-full border border-white/5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          Участники ({participants.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {participants.map((p) => {
          const isMe = p.id === currentUserId;
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                isMe
                  ? 'bg-purple-950/20 border-purple-500/30'
                  : 'bg-slate-900/40 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className={`relative w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                    p.isSpeaking ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''
                  }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-200 truncate selectable-text">
                      {p.name}
                    </span>
                    {isMe && <span className="text-[10px] text-slate-400">(Вы)</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {p.role === 'host' ? (
                      <span className="text-[10px] text-amber-300 font-medium flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5" /> Ведущий
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Зритель</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span title={p.isAudioMuted ? 'Микрофон выключен' : 'Микрофон активен'}>
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
