'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSocket } from '@/lib/socket';
import { convApi, usersApi, mediaApi } from '@/lib/api';
import { Conversation, Message, User } from '@/types';
import { Socket } from 'socket.io-client';
import Sidebar from '@/components/Sidebar';
import ChatView from '@/components/ChatView';
import NewChatModal from '@/components/NewChatModal';
import NewGroupModal from '@/components/NewGroupModal';

export default function ChatPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState<Record<string, Set<string>>>({});
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const conversationsRef = useRef<Conversation[]>([]);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  useEffect(() => {
    if (loading) return;
    if (!user || !token) { router.replace('/login'); return; }
    const s = getSocket(token);
    socketRef.current = s;

    const loadConvs = async () => {
      const r = await convApi.list();
      setConversations(r.data);
    };
    loadConvs();
    usersApi.list().then(r => setUsers(r.data)).catch(()=>{});

    s.on('connect', () => {
      // sync missed messages
      const cursors = conversationsRef.current.map(c => ({ conversationId: c.id, lastSeq: c.lastSeq }));
      // use latest from state via ref? We'll send current
      s.emit('sync:request', { cursors }, (res: any) => {
        if (res?.messages) {
          for (const cid of Object.keys(res.messages)) {
            const missed: Message[] = res.messages[cid];
            if (!missed || !missed.length) continue;
            if (cid === activeIdRef.current) {
              setMessages(prev => {
                const seen = new Set(prev.map(m=>m.id));
                const add = missed.filter(m=>!seen.has(m.id));
                return [...prev, ...add].sort((a,b)=>a.seq-b.seq);
              });
            }
          }
        }
      });
    });

    s.on('message:new', (msg: Message) => {
      const cid = msg.conversationId;
      // dedup
      setMessages(prev => {
        if (cid !== activeIdRef.current) return prev;
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg].sort((a,b)=>a.seq-b.seq);
      });
      // update conversation list + unread
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === cid);
        if (idx === -1) return prev;
        const c = { ...prev[idx] };
        c.lastMessage = msg.text || (msg.mediaType === 'image' ? '📷 Image' : '📎 File');
        c.lastSeq = Math.max(c.lastSeq || 0, msg.seq);
        c.lastMessageAt = msg.createdAt;
        if (cid !== activeIdRef.current && msg.senderId !== user.id) {
          c.unread = (c.unread || 0) + 1;
        } else {
          c.unread = 0;
        }
        const next = [...prev];
        next[idx] = c;
        // move to top
        next.splice(idx,1);
        next.unshift(c);
        return next;
      });
      // mark read if active and incoming
      if (cid === activeIdRef.current && msg.senderId !== user.id && msg.seq > 0) {
        socketRef.current?.emit('message:read', { conversationId: cid, upToSeq: msg.seq });
        convApi.read(cid, msg.seq).catch(()=>{});
      }
    });

    s.on('message:status', ({ conversationId, messageId, status }: any) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status } : m));
    });

    s.on('typing:update', ({ conversationId, userId, typing: isTyping }: any) => {
      setTyping(prev => {
        const next = { ...prev };
        if (!next[conversationId]) next[conversationId] = new Set();
        else next[conversationId] = new Set(next[conversationId]);
        if (isTyping) next[conversationId].add(userId);
        else next[conversationId].delete(userId);
        return next;
      });
    });

    s.on('presence:update', ({ userId, online: isOnline }: any) => {
      setOnline(prev => {
        const next = new Set(prev);
        if (isOnline) next.add(userId); else next.delete(userId);
        return next;
      });
      // update conversation online for direct
      setConversations(prev => prev.map(c => {
        if (c.type === 'direct' && c.otherUser?.id === userId) {
          return { ...c, online: isOnline };
        }
        return c;
      }));
    });

    // heartbeat
    const hb = setInterval(() => { s.emit('presence:heartbeat'); }, 30000);

    return () => {
      clearInterval(hb);
      s.off('connect');
      s.off('message:new');
      s.off('message:status');
      s.off('typing:update');
      s.off('presence:update');
    };
  }, [user, token, loading, router]);

  const openConversation = async (id: string) => {
    setActiveId(id);
    // mark read
    const conv = conversations.find(c => c.id === id);
    const lastSeq = conv?.lastSeq || 0;
    try {
      const r = await convApi.messages(id, { limit: 50 });
      setMessages(r.data);
    } catch {}
    if (lastSeq) {
      socketRef.current?.emit('message:read', { conversationId: id, upToSeq: lastSeq });
      await convApi.read(id, lastSeq).catch(()=>{});
    }
    // join room
    socketRef.current?.emit('conversation:join', id);
    // reset unread
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
  };

  const sendMessage = async (text: string, file?: File) => {
    if (!activeId) return;
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    if (file) {
      const r = await mediaApi.upload(file);
      mediaUrl = r.data.url;
      mediaType = r.data.type;
    }
    const messageId = (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2);
    const msg: Message = {
      id: messageId,
      conversationId: activeId,
      senderId: user!.id,
      seq: 0,
      text: text || null,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
    socketRef.current?.emit('message:send', {
      conversationId: activeId, messageId, text, mediaUrl, mediaType,
    }, (ack: any) => {
      if (ack?.ok) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, seq: ack.seq, createdAt: ack.serverTimestamp || m.createdAt, status: ack.status || 'sent' } : m));
      }
    });
  };

  const handleTyping = (isTyping: boolean) => {
    if (!activeId) return;
    socketRef.current?.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId: activeId });
  };

  const createDirect = async (userId: string) => {
    const r = await convApi.direct(userId);
    setShowNewChat(false);
    await reloadConversations();
    openConversation(r.data.id);
  };

  const createGroup = async (name: string, memberIds: string[]) => {
    const r = await convApi.group(name, memberIds);
    setShowNewGroup(false);
    await reloadConversations();
    openConversation(r.data.id);
  };

  const reloadConversations = async () => {
    const r = await convApi.list();
    setConversations(r.data);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const activeConv = conversations.find(c => c.id === activeId) || null;
  const typingSet = activeId ? (typing[activeId] || new Set<string>()) : new Set<string>();

  return (
    <div className="h-screen flex dark:bg-gray-900">
      <div className={`${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 border-r dark:border-gray-700 flex-col`}>
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          online={online}
          onSelect={openConversation}
          onNewChat={() => setShowNewChat(true)}
          onNewGroup={() => setShowNewGroup(true)}
          onToggleDark={() => {
            const el = document.documentElement;
            el.classList.toggle('dark');
            localStorage.setItem('theme', el.classList.contains('dark') ? 'dark' : 'light');
          }}
        />
      </div>
      <div className={`${activeId ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {activeConv ? (
          <ChatView
            conversation={activeConv}
            messages={messages}
            typingUserIds={Array.from(typingSet).filter(id => id !== user!.id)}
            online={online}
            currentUserId={user!.id}
            onBack={() => setActiveId(null)}
            onSend={sendMessage}
            onTyping={handleTyping}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Select a conversation
          </div>
        )}
      </div>
      {showNewChat && <NewChatModal users={users} onClose={() => setShowNewChat(false)} onCreate={createDirect} />}
      {showNewGroup && <NewGroupModal users={users} onClose={() => setShowNewGroup(false)} onCreate={createGroup} />}
    </div>
  );
}