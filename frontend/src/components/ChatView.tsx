'use client';
import { useState, useRef, useEffect } from 'react';
import { Conversation, Message } from '@/types';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

interface Props {
  conversation: Conversation;
  messages: Message[];
  typingUserIds: string[];
  online: Set<string>;
  currentUserId: string;
  onBack: () => void;
  onSend: (text: string, file?: File) => void;
  onTyping: (isTyping: boolean) => void;
}

function dateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate()-1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}

export default function ChatView({ conversation, messages, typingUserIds, online, currentUserId, onBack, onSend, onTyping }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typingUserIds]);

  // group messages by date
  const groups: { label: string; msgs: Message[] }[] = [];
  let currentLabel = '';
  for (const m of messages) {
    const label = dateLabel(m.createdAt);
    if (label !== currentLabel) {
      groups.push({ label, msgs: [m] });
      currentLabel = label;
    } else {
      groups[groups.length-1].msgs.push(m);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="p-3 border-b dark:border-gray-700 flex items-center gap-3 bg-white dark:bg-gray-800">
        <button onClick={onBack} className="md:hidden text-gray-600 dark:text-gray-300">←</button>
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
          {conversation.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <div className="font-semibold dark:text-white">{conversation.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {typingUserIds.length > 0
              ? 'typing...'
              : (conversation.type === 'direct'
                  ? (conversation.online ? 'online' : 'offline')
                  : `${conversation.members?.length || ''} members`)}
          </div>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-900">
        {groups.map((g, gi) => (
          <div key={gi}>
            <div className="text-center my-2">
              <span className="text-xs bg-gray-200 dark:bg-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">{g.label}</span>
            </div>
            {g.msgs.map(m => (
              <MessageBubble key={m.id} message={m} isOwn={m.senderId === currentUserId} />
            ))}
          </div>
        ))}
        {typingUserIds.length > 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">typing...</div>
        )}
      </div>

      <MessageInput onSend={onSend} onTyping={onTyping} />
    </div>
  );
}