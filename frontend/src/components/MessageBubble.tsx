'use client';
import { Message } from '@/types';

interface Props {
  message: Message;
  isOwn: boolean;
}

function Tick({ status }: { status: string }) {
  if (status === 'read') return <span className="text-blue-500 text-xs">✓✓</span>;
  if (status === 'delivered') return <span className="text-gray-400 text-xs">✓✓</span>;
  return <span className="text-gray-400 text-xs">✓</span>;
}

export default function MessageBubble({ message, isOwn }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className={`max-w-[70%] rounded-lg px-3 py-2 ${isOwn ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 dark:text-white shadow'}`}>
        {message.mediaUrl && (
          message.mediaType === 'image'
            ? <img src={message.mediaUrl} alt="media" className="rounded max-w-full mb-1" />
            : <a href={message.mediaUrl} className="underline text-sm" target="_blank" rel="noreferrer">📎 {message.mediaUrl.split('/').pop()}</a>
        )}
        {message.text && <div className="whitespace-pre-wrap break-words">{message.text}</div>}
        <div className={`flex items-center gap-1 mt-1 text-[10px] ${isOwn ? 'text-green-100 justify-end' : 'text-gray-400'}`}>
          <span>{time}</span>
          {isOwn && <Tick status={message.status} />}
        </div>
      </div>
    </div>
  );
}