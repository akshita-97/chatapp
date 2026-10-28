'use client';
import { useState, useRef } from 'react';

interface Props {
  onSend: (text: string, file?: File) => void;
  onTyping: (isTyping: boolean) => void;
}

const EMOJIS = ['😀','😂','😍','👍','❤️','🎉','🔥','😎','🤔','😢','🙏','✨'];

export default function MessageInput({ onSend, onTyping }: Props) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<any>(null);

  const handleChange = (v: string) => {
    setText(v);
    onTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 2000);
  };

  const send = () => {
    if (!text.trim() && !fileRef.current?.files?.length) return;
    const file = fileRef.current?.files?.[0];
    onSend(text.trim(), file);
    setText('');
    if (fileRef.current) fileRef.current.value = '';
    onTyping(false);
    if (typingTimer.current) clearTimeout(typingTimer.current);
  };

  return (
    <div className="p-3 border-t dark:border-gray-700 bg-white dark:bg-gray-800 relative">
      {showEmoji && (
        <div className="absolute bottom-16 left-3 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded p-2 shadow flex flex-wrap gap-1 w-64">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => { setText(t => t + e); setShowEmoji(false); }} className="text-xl hover:bg-gray-100 dark:hover:bg-gray-600 rounded p-1">{e}</button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowEmoji(s => !s)} className="text-xl">😊</button>
        <button onClick={() => fileRef.current?.click()} className="text-xl">📎</button>
        <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" />
        <input
          className="flex-1 border rounded-full px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          placeholder="Type a message"
          value={text}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button onClick={send} className="bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700">Send</button>
      </div>
    </div>
  );
}