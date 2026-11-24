import React from 'react';
import { Mic, MicOff, UserMinus, Crown, Radio } from 'lucide-react';
import type { Participant } from '../types';

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  activeStreamerId?: string | null;
  onTransferHost: (participantId: string) => void;
  onKickParticipant: (participantId: string) => void;
  embedded?: boolean;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  isHost,
  activeStreamerId,
  onTransferHost,
  onKickParticipant,
  embedded = false,
}) => {
  return (
    <div
      className={embedded ? 'flex flex-col h-full p-2.5' : 'glass p-3.5 rounded-[28px] flex flex-col h-full'}
    >
      {!embedded && (
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
          <span className="text-xs font-medium text-white/55">Участники</span>
          <span className="text-xs font-mono font-semibold text-white/80 tabular-nums">
            {participants.length}
          </span>
        </div>
      )}

      <ul className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 list-none m-0 p-0">
        {participants.map((p) => {
          const isMe = p.id === currentUserId;
          const isStreaming = p.isStreamingScreen || (activeStreamerId && activeStreamerId === p.id);

          return (
            <li
              key={p.id}
              className={`flex items-center justify-between gap-2 p-2 pl-2.5 rounded-[20px] border transition-colors ${
                isMe
                  ? 'bg-white/[0.1] border-white/20'
                  : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-b from-white/25 to-white/[0.06] border border-white/20 flex items-center justify-center text-[13px] font-semibold text-white shrink-0 ${
                    p.isSpeaking ? 'speaking-halo' : ''
                  }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-white truncate">{p.name}</span>
                    {isMe && <span className="text-[10px] text-white/45 shrink-0">вы</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[11px] ${
                        p.role === 'host' ? 'text-[#ffd60a] font-medium' : 'text-white/45'
                      }`}
                    >
                      {p.role === 'host' ? 'Ведущий' : 'Зритель'}
                    </span>
                    {isStreaming && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#ff6b61] font-medium">
                        <Radio className="w-3 h-3 animate-pulse" />
                        в эфире
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    p.isAudioMuted ? 'text-white/30' : 'text-[#30d158] bg-[#30d158]/15'
                  }`}
                  title={p.isAudioMuted ? 'Микрофон выключен' : 'Микрофон включён'}
                >
                  {p.isAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </span>

                {isHost && !isMe && (
                  <>
                    <button
                      type="button"
                      onClick={() => onTransferHost(p.id)}
                      title="Сделать ведущим"
                      aria-label={`Сделать ведущим: ${p.name}`}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/45 hover:text-[#ffd60a] hover:bg-[#ffd60a]/15 transition-colors cursor-pointer bg-transparent border-0"
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onKickParticipant(p.id)}
                      title="Исключить из зала"
                      aria-label={`Исключить: ${p.name}`}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/45 hover:text-[#ff453a] hover:bg-[#ff453a]/15 transition-colors cursor-pointer bg-transparent border-0"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
