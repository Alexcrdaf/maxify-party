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
    <div className="ios-material p-4 rounded-[24px] flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.08]">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-white/55 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#0A84FF]" />
          <span>Участники</span>
        </h3>
        <span className="text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-white/[0.08] text-white/80">
          {participants.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {participants.map((p) => {
          const isMe = p.id === currentUserId;
          return (
            <div
              key={p.id}
              className={`animate-ios-pop flex items-center justify-between p-2.5 rounded-[16px] border transition-colors ${
                isMe
                  ? 'bg-[#0A84FF]/15 border-[#0A84FF]/30'
                  : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className={`relative w-8 h-8 rounded-full bg-gradient-to-b from-[#5AC8FA] to-[#0A84FF] flex items-center justify-center text-xs font-semibold text-white shrink-0 transition-shadow ${
                    p.isSpeaking ? 'speaking-ring' : ''
                  }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-white truncate">
                      {p.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] text-[#5AC8FA] font-medium">Вы</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {p.role === 'host' ? (
                      <span className="text-[10px] text-[#FFD60A] font-medium flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" /> Ведущий
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/45">Зритель</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`p-1 rounded-full ${
                    p.isAudioMuted ? 'text-white/30' : 'text-[#30D158] bg-[#30D158]/15'
                  }`}
                  title={p.isAudioMuted ? 'Микрофон отключён' : 'Голос активен'}
                >
                  {p.isAudioMuted ? (
                    <MicOff className="w-3.5 h-3.5" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </span>

                {isHost && !isMe && (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onTransferHost(p.id)}
                      title="Передать роль ведущего"
                      className="ios-press p-1.5 rounded-full text-white/45 hover:text-[#FFD60A] hover:bg-[#FFD60A]/15 transition-colors cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onKickParticipant(p.id)}
                      title="Исключить из комнаты"
                      className="ios-press p-1.5 rounded-full text-white/45 hover:text-[#FF453A] hover:bg-[#FF453A]/15 transition-colors cursor-pointer"
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
