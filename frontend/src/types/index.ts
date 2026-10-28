export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string;
  lastMessage?: string | null;
  lastMediaType?: string | null;
  lastSenderId?: string | null;
  lastSeq: number;
  unread: number;
  lastMessageAt?: string | null;
  online?: boolean;
  otherUser?: User | null;
  members?: any[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  seq: number;
  text?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  duplicate?: boolean;
}
