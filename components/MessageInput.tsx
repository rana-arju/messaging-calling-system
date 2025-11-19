'use client';

import { useRef, useState, useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, X } from 'lucide-react';

interface MessageInputProps {
  chatId: string;
}

export default function MessageInput({ chatId }: MessageInputProps) {
  const { sendMessage, sendTypingIndicator } = useChatStore();
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContent(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.length > 0) {
      sendTypingIndicator(chatId, true);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (value.length === 0) {
        sendTypingIndicator(chatId, false);
      }
    }, 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSend = () => {
    if (!content.trim() && !file) return;

    sendMessage(chatId, content, file || undefined);
    setContent('');
    setFile(null);

    sendTypingIndicator(chatId, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 space-y-2">
      {file && (
        <div className="flex items-center gap-2 p-2 bg-accent rounded">
          <span className="text-sm flex-1 truncate">{file.name}</span>
          <button
            onClick={() => setFile(null)}
            className="hover:bg-background p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          size="icon"
          variant="ghost"
        >
          <Paperclip size={20} />
        </Button>

        <Input
          placeholder="Type a message..."
          value={content}
          onChange={handleTyping}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />

        <Button
          onClick={handleSend}
          size="icon"
          disabled={!content.trim() && !file}
        >
          <Send size={20} />
        </Button>
      </div>
    </div>
  );
}
