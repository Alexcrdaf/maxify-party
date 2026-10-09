import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, ShieldAlert } from 'lucide-react';
import type { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUserId,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = inputText.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (!sanitized) return;
    onSendMessage(sanitized);
    setInputText('');
  };

  return (
    <div className="glass-panel rounded-3xl p-4.5 flex flex-col h-full border border-white/8 shadow-xl">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/8">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          Чат комнаты
        </h3>
        <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
          <ShieldAlert className="w-2.5 h-2.5 text-emerald-400" /> P2P шифрование
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-sm">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center p-4">
            Здесь пока нет сообщений. Напишите что-нибудь!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;

            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center text-[11px] text-slate-400 italic my-1">
                  {msg.text}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                  {isMe ? 'Вы' : msg.senderName}
                </span>
                <div
                  className={`px-3.5 py-2 rounded-2xl max-w-[85%] break-words text-[13px] shadow ${
                    isMe
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-800/90 text-slate-200 rounded-bl-xs border border-white/5'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Сообщение..."
          maxLength={300}
          className="flex-1 bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:hover:from-purple-600 text-white transition shadow-lg shadow-purple-600/30 active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
