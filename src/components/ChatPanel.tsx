import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
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
            className="text-white underline underline-offset-2 break-all hover:opacity-80 inline-flex items-center gap-1"
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
          : 'ios-material p-4 flex flex-col h-full rounded-[24px]'
      }
    >
      {!hideHeader && (
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.08]">
          <h3 className="text-[11px] uppercase tracking-wider font-semibold text-white/55 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>Сообщения</span>
          </h3>
          <span className="text-[10px] text-white/40 font-medium">P2P</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/35 text-xs text-center p-4">
            Пока тихо
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;

            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="animate-ios-msg text-center text-[11px] text-white/45 my-1 px-2.5 py-1 rounded-full bg-white/[0.04] mx-auto w-fit max-w-full"
                >
                  {msg.text}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`animate-ios-msg flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-white/45 mb-0.5 px-1.5 font-medium">
                  {isMe ? 'Вы' : msg.senderName}
                </span>
                <div
                  className={`px-3.5 py-2 max-w-[85%] break-words text-[13px] leading-snug ${
                    isMe ? 'imessage-mine' : 'imessage-their'
                  }`}
                >
                  {msg.text && <div>{renderMessageContent(msg.text)}</div>}

                  {/* Safe File Attachment */}
                  {msg.file && isSafeDataUrl(msg.file.dataUrl) && (
                    <div className="mt-1.5 p-2 rounded-xl bg-black/25 border border-white/10 flex flex-col gap-1.5">
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
                            <ImageIcon className="w-3.5 h-3.5 text-[#5AC8FA] shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-[#5AC8FA] shrink-0" />
                          )}
                          <span className="truncate font-medium">{msg.file.name}</span>
                          <span className="text-[9px] opacity-65 shrink-0 tabular-nums">
                            {(msg.file.size / 1024).toFixed(0)} KB
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownload(msg.file!)}
                          className="ios-press p-1 rounded-full bg-white/15 hover:bg-white/25 transition-colors shrink-0 cursor-pointer"
                          title="Скачать файл"
                        >
                          <Download className="w-3 h-3 text-white" />
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

      {/* Inline error notice */}
      {fileError && (
        <div className="animate-ios-pop text-[11px] text-[#FF6961] bg-[#FF453A]/15 border border-[#FF453A]/30 rounded-xl px-3 py-1.5 mb-2">
          {fileError}
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && (
        <div className="animate-ios-pop p-2 mb-2 rounded-2xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <Paperclip className="w-3.5 h-3.5 text-[#0A84FF] shrink-0" />
            <span className="truncate text-white">{pendingFile.name}</span>
          </div>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="ios-press text-white/50 hover:text-[#FF453A] p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Reactions */}
      <div className="flex items-center gap-1 py-1.5 mt-1 border-t border-white/[0.07]">
        {quickReactions.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSendMessage(emoji)}
            className="ios-press flex-1 py-1 rounded-full hover:bg-white/[0.1] text-sm cursor-pointer"
            title={`Отправить ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* iMessage Input Bar */}
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
          className="ios-press p-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white/65 hover:text-white shrink-0 cursor-pointer"
          title="Прикрепить файл (до 15 МБ)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Сообщение..."
            className="ios-input w-full pl-3.5 pr-9 py-2 text-[13px] rounded-full"
          />
          <button
            type="submit"
            disabled={!inputText.trim() && !pendingFile}
            className="ios-press absolute right-1 w-7 h-7 rounded-full bg-[#0A84FF] disabled:bg-white/10 disabled:text-white/30 text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Отправить"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
};
