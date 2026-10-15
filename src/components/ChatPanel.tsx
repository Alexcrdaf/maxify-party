import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Paperclip, X, Download, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import type { ChatMessage, ChatAttachment } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string, file?: ChatAttachment) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUserId,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [pendingFile, setPendingFile] = useState<ChatAttachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Максимальный размер файла для P2P отправки — 15 МБ.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !pendingFile) return;
    onSendMessage(inputText.trim(), pendingFile || undefined);
    setInputText('');
    setPendingFile(null);
  };

  const quickReactions = ['🔥', '😂', '🍿', '😮', '👏'];

  const renderMessageContent = (text: string) => {
    // Regex for URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-300 underline underline-offset-2 break-all hover:text-white inline-flex items-center gap-1"
          >
            <span>{part}</span>
            <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="bg-[#18181b] border border-[#2d2d35] rounded-xl p-3.5 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#26262c]">
        <h3 className="text-xs uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
          <span>Чат комнаты</span>
        </h3>
        <span className="text-[10px] text-zinc-500 font-mono">P2P</span>
      </div>

      {/* Messages Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center p-4">
            Здесь пока тихо. Напишите сообщение, прикрепите файл или отправьте реакцию!
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
                  className={`px-4 py-2.5 rounded-2xl max-w-[85%] break-words text-sm ${
                    isMe
                      ? 'bubble-mine'
                      : 'bubble-their'
                  }`}
                >
                  {msg.text && <div>{renderMessageContent(msg.text)}</div>}

                  {/* Attached file/image */}
                  {msg.file && (
                    <div className="mt-1 p-2 rounded-xl bg-black/30 border border-white/10 flex flex-col gap-1.5">
                      {msg.file.type.startsWith('image/') ? (
                        <div className="rounded-lg overflow-hidden max-h-48">
                          <img
                            src={msg.file.dataUrl}
                            alt={msg.file.name}
                            className="w-full h-auto object-cover rounded-lg"
                          />
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          {msg.file.type.startsWith('image/') ? (
                            <ImageIcon className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                          )}
                          <span className="truncate font-medium">{msg.file.name}</span>
                          <span className="text-[9px] opacity-70 shrink-0">
                            ({(msg.file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>

                        <a
                          href={msg.file.dataUrl}
                          download={msg.file.name}
                          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                          title="Скачать файл"
                        >
                          <Download className="w-3.5 h-3.5 text-white" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending file preview */}
      {pendingFile && (
        <div className="p-2 mb-2 rounded-xl bg-slate-900/90 border border-sky-500/40 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            {pendingFile.type.startsWith('image/') ? (
              <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <span className="truncate text-slate-200">{pendingFile.name}</span>
            <span className="text-[10px] text-slate-400 shrink-0">
              ({(pendingFile.size / 1024).toFixed(0)} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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

      {/* Input form with file attach button */}
      <form onSubmit={handleSubmit} className="mt-1 flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition-colors shrink-0"
          title="Прикрепить файл или фото"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          maxLength={1000}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Написать в чат, отправить ссылку..."
          className="flex-1 px-3 py-2 text-xs"
        />

        <button
          type="submit"
          disabled={!inputText.trim() && !pendingFile}
          className="btn btn-accent p-2 shrink-0 disabled:opacity-40"
          title="Отправить сообщение"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
