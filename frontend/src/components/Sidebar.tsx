'use client';
import { Conversation } from '@/types';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  online: Set<string>;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onToggleDark: () => void;
}

export default function Sidebar({ conversations, activeId, online, onSelect, onNewChat, onNewGroup, onToggleDark }: Props) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="p-4 flex items-center justify-between border-b dark:border-gray-700">
        <h1 className="text-xl font-bold dark:text-white">Chats</h1>
        <div className="flex gap-2">
          <button onClick={onNewChat} className="text-sm bg-green-600 text-white px-2 py-1 rounded">+ Chat</button>
          <button onClick={onNewGroup} className="text-sm bg-blue-600 text-white px-2 py-1 rounded">+ Group</button>
          <button onClick={onToggleDark} className="text-sm px-2 py-1 rounded border dark:border-gray-600 dark:text-white">🌙</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map(c => (
          <button key={c.id} onClick={() => onSelect(c.id)}
            className={`w-full text-left flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${activeId === c.id ? 'bg-gray-200 dark:bg-gray-700' : ''}`}>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                {c.name?.[0]?.toUpperCase() || '?'}
              </div>
              {c.type === 'direct' && c.online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <span className="font-medium truncate dark:text-white">{c.name}</span>
                {c.unread > 0 && (
                  <span className="bg-green-600 text-white text-xs rounded-full px-2">{c.unread}</span>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {c.lastMessage || 'No messages'}
              </div>
            </div>
          </button>
        ))}
        {conversations.length === 0 && (
          <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">No conversations yet</div>
        )}
      </div>
    </div>
  );
}