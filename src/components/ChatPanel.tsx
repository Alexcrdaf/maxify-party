import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Paperclip,
  X,
  Download,
  FileText,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import type { ChatMessage, ChatAttachment } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string, file?: ChatAttachment) => void;
  hideHeader?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  hideHeader = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [pendingFile, setPendingFile] = useState<ChatAttachment | null>(null);
  const [fileError, setFileError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setFileError('Максимальный размер файла — 15 МБ.');
      setTimeout(() => setFileError(''), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileError('');
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

  const isSafeDataUrl = (url?: string): boolean => {
    if (!url) return false;
    return /^data:(image\/(png|jpeg|jpg|webp|gif)|application\/octet-stream|application\/pdf|text\/plain);base64,[A-Za-z0-9+/=]+$/.test(
      url
    );
  };

  const handleDownload = (file: ChatAttachment) => {
    if (!isSafeDataUrl(file.dataUrl)) {
      setFileError('Недопустимый формат файла.');
      setTimeout(() => setFileError(''), 3500);
      return;
    }

    fetch(file.dataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      })
      .catch(() => {
        setFileError('Ошибка при скачивании файла.');
        setTimeout(() => setFileError(''), 3500);
      });
  };

  const renderMessageContent = (text: string) => {
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
            className="underline underline-offset-2 break-all hover:opacity-80 inline-flex items-center gap-1"
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
    <div
      className={
        hideHeader
          ? 'flex flex-col h-full p-3'
          : 'studio-panel p-3.5 flex flex-col h-full rounded-2xl'
      }
    >
      {!hideHeader && (
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/[0.07]">
          <span className="text-xs font-medium text-zinc-400">Чат сеанса</span>
          <span className="text-[10px] font-mono text-zinc-500">P2P</span>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-xs text-center p-4">
            Сообщений пока нет
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;

            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="animate-msg-in text-center text-[11px] text-zinc-500 my-1 px-2.5 py-1 rounded-md bg-white/[0.03] mx-auto w-fit max-w-full"
                >
                  {msg.text}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`animate-msg-in flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-zinc-500 mb-0.5 px-1">
                  {isMe ? 'Вы' : msg.senderName}
                </span>
                <div
                  className={`px-3 py-2 max-w-[86%] break-words text-[13px] leading-snug rounded-2xl ${
                    isMe
                      ? 'bg-[#FAFAFA] text-[#09090B] rounded-br-sm font-normal'
                      : 'bg-[#1D1D23] text-[#FAFAFA] border border-white/[0.06] rounded-bl-sm'
                  }`}
                >
                  {msg.text && <div>{renderMessageContent(msg.text)}</div>}

                  {msg.file && isSafeDataUrl(msg.file.dataUrl) && (
                    <div
                      className={`mt-1.5 p-2 rounded-xl border flex flex-col gap-1.5 ${
                        isMe
                          ? 'bg-black/10 border-black/15 text-[#09090B]'
                          : 'bg-black/30 border-white/10 text-[#FAFAFA]'
                      }`}
                    >
                      {msg.file.type.startsWith('image/') && (
                        <div className="rounded-lg overflow-hidden max-h-48">
                          <img
                            src={msg.file.dataUrl}
                            alt={msg.file.name}
                            className="w-full h-auto object-cover rounded-lg"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          {msg.file.type.startsWith('image/') ? (
                            <ImageIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          )}
                          <span className="truncate font-medium">{msg.file.name}</span>
                          <span className="text-[10px] opacity-60 shrink-0 tabular-nums">
                            {(msg.file.size / 1024).toFixed(0)} КБ
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownload(msg.file!)}
                          className="tactile p-1 rounded-md bg-black/15 hover:bg-black/25 shrink-0 cursor-pointer"
                          title="Скачать файл"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
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

      {fileError && (
        <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-lg px-2.5 py-1.5 mb-2">
          {fileError}
        </div>
      )}

      {pendingFile && (
        <div className="p-2 mb-2 rounded-xl bg-[#18181D] border border-white/10 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <Paperclip className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate text-zinc-200">{pendingFile.name}</span>
          </div>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="text-zinc-500 hover:text-rose-400 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Reactions */}
      <div className="flex items-center gap-1 py-1.5 mt-1 border-t border-white/[0.06]">
        {quickReactions.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSendMessage(emoji)}
            className="tactile flex-1 py-1 rounded-lg hover:bg-white/[0.06] text-sm cursor-pointer"
            title={`Реакция ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Row */}
      <form onSubmit={handleSubmit} className="mt-1 flex items-center gap-1.5">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="tactile w-8 h-8 rounded-xl bg-[#18181D] hover:bg-[#222229] border border-white/[0.07] text-zinc-400 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
          title="Прикрепить файл (до 15 МБ)"
        >
          <Paperclip className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Написать в чат…"
            className="studio-input w-full pl-3 pr-9 py-2 text-xs rounded-xl"
          />
          <button
            type="submit"
            disabled={!inputText.trim() && !pendingFile}
            className="tactile absolute right-1 w-6 h-6 rounded-lg bg-[#FAFAFA] disabled:bg-white/[0.07] disabled:text-zinc-600 text-[#09090B] flex items-center justify-center cursor-pointer"
            title="Отправить"
          >
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
};
