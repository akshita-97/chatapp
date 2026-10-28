'use client';
import { useState } from 'react';
import { User } from '@/types';

interface Props {
  users: User[];
  onClose: () => void;
  onCreate: (userId: string) => void;
}

export default function NewChatModal({ users, onClose, onCreate }: Props) {
  const [q, setQ] = useState('');
  const filtered = users.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md" onClick={e=>e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-3 dark:text-white">New Chat</h2>
        <input className="w-full border rounded p-2 mb-3 dark:bg-gray-700 dark:text-white" placeholder="Search users" value={q} onChange={e=>setQ(e.target.value)} />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.map(u => (
            <button key={u.id} onClick={() => onCreate(u.id)} className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer dark:text-white">
              {u.name} <span className="text-xs text-gray-500">{u.email}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="text-gray-500 text-sm">No users</div>}
        </div>
        <button onClick={onClose} className="mt-3 text-sm text-gray-500">Cancel</button>
      </div>
    </div>
  );
}