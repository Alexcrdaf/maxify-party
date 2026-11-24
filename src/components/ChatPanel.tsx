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

const SAFE_DATA_URL =
  /^data:(image\/(png|jpeg|jpg|webp|gif)|application\/octet-stream|application\/pdf|text\/plain);base64,[A-Za-z0-9+/=]+$/;

const isSafeDataUrl = (url?: string): boolean => Boolean(url && SAFE_DATA_URL.test(url));

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const flashError = (text: string) => {
    setFileError(text);
    setTimeout(() => setFileError(''), 3500);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      flashError('Максимальный размер файла — 15 МБ.');
    } else {
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
    }

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

  const handleDownload = (file: ChatAttachment) => {
    if (!isSafeDataUrl(file.dataUrl)) {
      flashError('Недопустимый формат файла.');
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
      .catch(() => flashError('Ошибка при скачивании файла.'));
  };

  const renderMessageContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (/^https?:\/\//.test(part)) {
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
      className={hideHeader ? 'flex flex-col h-full min-h-0 p-3' : 'glass p-3.5 flex flex-col h-full min-h-0 rounded-[28px]'}
    >
      {!hideHeader && (
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/10">
          <span className="text-xs font-medium text-white/55">Чат сеанса</span>
          <span className="text-[10px] font-mono text-white/35">P2P</span>
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 text-xs" aria-live="polite">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/35 text-[13px] text-center p-4">
            Сообщений пока нет
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;

            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="anim-msg text-center text-[11px] text-white/50 my-1 px-3 py-1 rounded-full bg-white/[0.06] mx-auto w-fit max-w-full"
                >
                  {msg.text}
                </div>
              );
            }

            return (
              <div key={msg.id} className={`anim-msg flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-white/45 mb-0.5 px-2">{isMe ? 'Вы' : msg.senderName}</span>
                <div
                  className={`px-3.5 py-2 max-w-[88%] break-words text-[13px] leading-snug rounded-[20px] ${
                    isMe
                      ? 'rounded-br-md text-white bg-[linear-gradient(180deg,rgba(10,132,255,0.85),rgba(10,110,235,0.75))] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_16px_-6px_rgba(10,132,255,0.6)]'
                      : 'rounded-bl-md text-white bg-white/[0.1] border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
                  }`}
                >
                  {msg.text && <div>{renderMessageContent(msg.text)}</div>}

                  {msg.file && isSafeDataUrl(msg.file.dataUrl) && (
                    <div className="mt-1.5 p-2 rounded-2xl bg-black/25 border border-white/10 flex flex-col gap-1.5">
                      {msg.file.type.startsWith('image/') && (
                        <div className="rounded-xl overflow-hidden max-h-48">
                          <img
                            src={msg.file.dataUrl}
                            alt={msg.file.name}
                            className="w-full h-auto object-cover"
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
                          className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 cursor-pointer border-0 text-white transition-colors"
                          title="Скачать файл"
                          aria-label="Скачать файл"
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
        <div
          role="alert"
          className="anim-pop text-[11px] text-[#ff8a82] bg-[#ff453a]/15 border border-[#ff453a]/30 rounded-2xl px-3 py-1.5 mt-2"
        >
          {fileError}
        </div>
      )}

      {pendingFile && (
        <div className="anim-pop p-2 pl-3 mt-2 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <Paperclip className="w-3.5 h-3.5 text-white/55 shrink-0" />
            <span className="truncate text-white/90">{pendingFile.name}</span>
          </div>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            aria-label="Убрать вложение"
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/55 hover:text-[#ff453a] hover:bg-white/10 cursor-pointer bg-transparent border-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center gap-1 pt-2 mt-2 border-t border-white/10">
        {quickReactions.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSendMessage(emoji)}
            className="flex-1 h-8 rounded-full text-sm bg-transparent border-0 hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            title={`Реакция ${emoji}`}
            aria-label={`Реакция ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="glass-btn w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          title="Прикрепить файл (до 15 МБ)"
          aria-label="Прикрепить файл"
        >
          <Paperclip className="w-4 h-4 text-white/70" />
        </button>

        <div className="flex-1 min-w-0 relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Сообщение"
            maxLength={1000}
            aria-label="Сообщение"
            className="glass-input w-full h-9 pl-4 pr-10 text-[13px] rounded-full"
          />
          <button
            type="submit"
            disabled={!inputText.trim() && !pendingFile}
            className="absolute right-1 w-7 h-7 rounded-full bg-[#0a84ff] disabled:bg-white/10 disabled:text-white/30 text-white flex items-center justify-center cursor-pointer border-0 transition-all active:scale-90"
            title="Отправить"
            aria-label="Отправить"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
};
