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
      className={
        embedded
          ? 'flex flex-col h-full p-3'
          : 'studio-panel p-3.5 rounded-2xl flex flex-col h-full'
      }
    >
      {!embedded && (
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.07]">
          <span className="text-xs font-medium text-zinc-400">Участники в зале</span>
          <span className="text-xs font-mono font-semibold text-zinc-300 tabular-nums">
            {participants.length}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {participants.map((p) => {
          const isMe = p.id === currentUserId;
          const isStreaming = p.isStreamingScreen || (activeStreamerId && activeStreamerId === p.id);

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                isMe
                  ? 'bg-white/[0.06] border-white/[0.12]'
                  : 'bg-[#151519] border-white/[0.05] hover:border-white/[0.1]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full bg-[#222228] border border-white/10 flex items-center justify-center text-xs font-semibold text-[#FAFAFA] shrink-0 ${
                    p.isSpeaking ? 'speaking-halo' : ''
                  }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-[#FAFAFA] truncate">
                      {p.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] text-zinc-400 shrink-0">(вы)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] ${
                        p.role === 'host' ? 'text-amber-400 font-medium' : 'text-zinc-500'
                      }`}
                    >
                      {p.role === 'host' ? 'Ведущий' : 'Зритель'}
                    </span>
                    {isStreaming && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-medium">
                        <Radio className="w-2.5 h-2.5 animate-pulse" />В эфире
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`p-1.5 rounded-lg ${
                    p.isAudioMuted ? 'text-zinc-600' : 'text-emerald-400 bg-emerald-500/10'
                  }`}
                  title={p.isAudioMuted ? 'Микрофон выключен' : 'Микрофон включён'}
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
                      title="Сделать ведущим"
                      className="tactile p-1.5 rounded-lg text-zinc-500 hover:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onKickParticipant(p.id)}
                      title="Исключить из зала"
                      className="tactile p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
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
