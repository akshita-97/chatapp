'use client';
import { useState } from 'react';
import { User } from '@/types';

interface Props {
  users: User[];
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
}

export default function NewGroupModal({ users, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md" onClick={e=>e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-3 dark:text-white">New Group</h2>
        <input className="w-full border rounded p-2 mb-3 dark:bg-gray-700 dark:text-white" placeholder="Group name" value={name} onChange={e=>setName(e.target.value)} />
        <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
          {users.map(u => (
            <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer dark:text-white">
              <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
              {u.name}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => onCreate(name, Array.from(selected))} disabled={!name || selected.size === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">Create</button>
          <button onClick={onClose} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
        </div>
      </div>
    </div>
  );
}