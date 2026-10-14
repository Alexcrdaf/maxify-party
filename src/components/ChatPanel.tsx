import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
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
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const quickReactions = ['🔥', '😂', '🍿', '😮', '👏'];

  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 syne">
          <MessageSquare className="w-4 h-4 text-sky-400" />
          <span>Чат комнаты</span>
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">P2P Encrypted</span>
      </div>

      {/* Messages Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center p-4">
            Здесь пока тихо. Напишите сообщение или отправьте реакцию!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;

            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center text-[10px] text-slate-400 italic my-1 px-2 py-1 rounded-lg bg-white/5">
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
                  className={`px-3 py-2 rounded-2xl max-w-[85%] break-words shadow-sm ${
                    isMe
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-tr-xs'
                      : 'bg-slate-800/80 text-slate-100 rounded-tl-xs border border-white/10'
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

      {/* Quick Reaction Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 my-1 px-1">
        <span className="text-[10px] text-slate-400 font-mono">Быстро:</span>
        <div className="flex items-center gap-2">
          {quickReactions.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSendMessage(emoji)}
              className="text-sm hover:scale-125 transition-transform p-0.5"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="mt-1 flex gap-2">
        <input
          type="text"
          maxLength={280}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Написать в чат..."
          className="flex-1 px-3 py-2 text-xs"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="btn btn-accent p-2 shrink-0 disabled:opacity-40"
          title="Отправить сообщение"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
