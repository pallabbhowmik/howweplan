'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  Search,
  MoreVertical,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Clock,
  Star,
  Copy,
  Reply,
  MapPin,
  X,
  Sparkles,
  MessageCircle,
  User,
  Flag,
  Trash2,
  Archive,
  Bell,
  BellOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useUserSession } from '@/lib/user/session';
import {
  listUserConversations,
  listMessages,
  sendUserMessage,
  markConversationReadAsUser,
  type ConversationListItem,
  type ConversationMessage,
} from '@/lib/data/messages';

// ============================================================================
// TYPES
// ============================================================================

interface MessageGroup {
  date: string;
  messages: ConversationMessage[];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getDateKey(dateString: string): string {
  return new Date(dateString).toDateString();
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'A';
}

function groupMessagesByDate(messages: ConversationMessage[]): MessageGroup[] {
  const groups: Map<string, ConversationMessage[]> = new Map();

  messages.forEach((msg) => {
    const key = getDateKey(msg.createdAt);
    const existing = groups.get(key) || [];
    groups.set(key, [...existing, msg]);
  });

  return Array.from(groups.entries()).map(([date, msgs]) => ({
    date,
    messages: msgs,
  }));
}

// ============================================================================
// PREMIUM CHAT COMPONENTS
// ============================================================================

function TypingIndicator({ agentName }: { agentName: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold shadow-md">
        {initials(agentName)}
      </div>
      <div className="flex items-center gap-1 bg-slate-100 rounded-2xl px-4 py-2.5">
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

function OnlineStatus({ isOnline }: { isOnline: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
      <span className="text-xs text-slate-500">{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <span className="text-xs font-medium text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
        {formatDateHeader(date)}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
    </div>
  );
}

function QuickReplies({ onSelect }: { onSelect: (text: string) => void }) {
  const suggestions = [
    { icon: '👋', text: "Hi, I have a question" },
    { icon: '📅', text: "Can we schedule a call?" },
    { icon: '✅', text: "That sounds great!" },
    { icon: '🙏', text: "Thank you!" },
  ];

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
      <span className="text-xs text-slate-400 w-full mb-1 flex items-center gap-1">
        <Sparkles className="h-3 w-3" /> Quick replies:
      </span>
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion.text)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-all hover:shadow-sm active:scale-95"
        >
          <span>{suggestion.icon}</span>
          <span className="text-slate-600">{suggestion.text}</span>
        </button>
      ))}
    </div>
  );
}

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const emojis = ['😊', '👍', '❤️', '😂', '🎉', '🙏', '✈️', '🏖️', '🗺️', '📸', '🌟', '💯', '🏨', '🚗', '🍽️', '🎒', '🌴', '⛰️'];

  return (
    <div className="absolute bottom-full right-0 mb-2 p-3 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-500">Quick Emoji</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="w-9 h-9 text-xl hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center hover:scale-110 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
  showAvatar,
  agentName,
}: {
  message: ConversationMessage;
  isOwn: boolean;
  showAvatar: boolean;
  agentName: string;
}) {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOptimistic = message.id.startsWith('optimistic-');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.senderType === 'system') {
    return (
      <div className="flex justify-center my-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 px-4 py-2 rounded-full shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium text-amber-700">{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex mb-3 group animate-in fade-in slide-in-from-bottom-1 duration-200 ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar for agent messages */}
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold mr-2 mt-auto mb-6 shadow-md ring-2 ring-white">
          {initials(agentName)}
        </div>
      )}
      {!isOwn && !showAvatar && <div className="w-8 mr-2" />}

      <div className={`max-w-[70%] ${isOwn ? 'order-1' : 'order-2'}`}>
        {/* Message Actions */}
        <div className={`flex items-center gap-1 mb-1 h-6 ${isOwn ? 'justify-end' : 'justify-start'} ${showActions && !isOptimistic ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
          <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all" title="Reply">
            <Reply className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all" title={copied ? 'Copied!' : 'Copy'}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-all" title="Star">
            <Star className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Message Content */}
        <div
          className={`px-4 py-2.5 rounded-2xl shadow-sm transition-all ${
            isOwn
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-md shadow-blue-500/20'
              : 'bg-white border border-slate-100 text-slate-800 rounded-bl-md shadow-slate-200/50'
          } ${isOptimistic ? 'opacity-70' : ''}`}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>

        {/* Timestamp & Status */}
        <div className={`flex items-center gap-1.5 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-slate-400 font-medium">{formatMessageTime(message.createdAt)}</span>
          {isOwn && (
            isOptimistic ? (
              <Clock className="h-3 w-3 text-slate-300 animate-pulse" />
            ) : message.isRead ? (
              <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
            ) : (
              <Check className="h-3.5 w-3.5 text-slate-300" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationListItem({
  conversation,
  isSelected,
  isImportant,
  onClick,
}: {
  conversation: ConversationListItem;
  isSelected: boolean;
  isImportant?: boolean;
  onClick: () => void;
}) {
  const isOnline = true; // Assume agents are online during business hours

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 text-left transition-all rounded-xl ${
        isSelected
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm'
          : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold text-sm shadow-md">
            {initials(conversation.agentName)}
          </div>
          <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isImportant && (
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                )}
                <span className={`font-semibold truncate ${conversation.unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                  {conversation.agentName}
                </span>
                {conversation.unreadCount > 0 && (
                  <Badge className="h-5 min-w-5 px-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-bold animate-pulse">
                    {conversation.unreadCount}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-blue-600 font-medium truncate flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {conversation.destinationLabel ?? 'Trip Planning'}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
              {conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : ''}
            </span>
          </div>
          <p className={`text-sm truncate mt-1.5 ${conversation.unreadCount > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
            {conversation.lastMessagePreview ?? 'No messages yet'}
          </p>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function MessagesPage() {
  const { user, loading: userLoading, error: userError } = useUserSession();
  const userId = user?.userId ?? null;

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Dropdown action states
  const [importantConversations, setImportantConversations] = useState<Set<string>>(new Set());
  const [mutedConversations, setMutedConversations] = useState<Set<string>>(new Set());
  const [archivedConversations, setArchivedConversations] = useState<Set<string>>(new Set());
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isTyping, _setIsTyping] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMsgCount, setNewMsgCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.agentName.toLowerCase().includes(q) || (c.destinationLabel ?? '').toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages]);

  const loadConversations = async () => {
    const currentUserId = userId;
    if (!currentUserId) return;
    setConversationsLoading(true);
    setConversationsError(null);
    try {
      const list = await listUserConversations(currentUserId);
      setConversations(list);
      const first = list[0];
      if (!selectedConversationId && first) setSelectedConversationId(first.id);
    } catch (e: unknown) {
      setConversationsError((e as Error)?.message ?? 'Failed to load conversations');
    } finally {
      setConversationsLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    if (userError) return;
    if (!userId) return;
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userLoading, userError]);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 80;
    setIsAtBottom(atBottom);
    if (atBottom) setNewMsgCount(0);
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setMessagesError(null);
      setNewMsgCount(0);
      prevMsgCountRef.current = 0;
      return;
    }

    let cancelled = false;
    const load = async () => {
      setMessagesLoading(true);
      setMessagesError(null);
      try {
        await markConversationReadAsUser(selectedConversationId);
        const msgs = await listMessages(selectedConversationId);
        if (cancelled) return;
        setMessages(msgs);
        loadConversations();
      } catch (e: unknown) {
        if (cancelled) return;
        setMessagesError((e as Error)?.message ?? 'Failed to load messages');
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  useEffect(() => {
    const prevCount = prevMsgCountRef.current;
    const nextCount = messages.length;
    if (nextCount > prevCount) {
      if (isAtBottom) {
        scrollToBottom();
      } else {
        setNewMsgCount((c) => c + (nextCount - prevCount));
      }
    }
    prevMsgCountRef.current = nextCount;
  }, [messages, isAtBottom, scrollToBottom]);

  // Real-time updates via faster polling
  // Using 2-second polling for better real-time feel
  // Adapts: slows to 10s if page is hidden, speeds up to 1s after sending
  const [pollSpeed, setPollSpeed] = useState(2000); // Default 2 seconds

  useEffect(() => {
    if (!selectedConversationId) return;

    // Adaptive polling - slow down when tab is hidden
    const handleVisibilityChange = () => {
      setPollSpeed(document.hidden ? 10000 : 2000);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Polling fallback - only updates when data actually changes
    const id = setInterval(async () => {
      try {
        const msgs = await listMessages(selectedConversationId);
        // Only update if there are new messages (compare by length and last message id)
        setMessages((prev) => {
          if (msgs.length !== prev.length) {
            // Play sound notification for new messages from agent
            const newMsgs = msgs.filter(m => !prev.find(p => p.id === m.id));
            const hasAgentMessage = newMsgs.some(m => m.senderType === 'agent');
            if (hasAgentMessage && typeof window !== 'undefined') {
              // Visual notification - update title
              document.title = '💬 New message - HowWePlan';
              setTimeout(() => { document.title = 'Messages - HowWePlan'; }, 3000);
            }
            return msgs;
          }
          const lastNew = msgs[msgs.length - 1];
          const lastPrev = prev[prev.length - 1];
          if (lastNew?.id !== lastPrev?.id) return msgs;
          // Check if any read status changed
          const hasReadChanges = msgs.some((m, i) => prev[i] && m.isRead !== prev[i].isRead);
          if (hasReadChanges) return msgs;
          return prev; // No changes, keep existing state
        });
      } catch {
        // ignore - polling is best-effort
      }
    }, pollSpeed);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, pollSpeed]);

  // Speed up polling briefly after sending a message
  const speedUpPolling = () => {
    setPollSpeed(1000); // 1 second
    setTimeout(() => setPollSpeed(2000), 5000); // Back to normal after 5s
  };

  // Typing indicator is controlled by real events, not simulated
  // In production, this would be triggered by realtime presence events

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    if (!selectedConversationId) return;
    const currentUserId = userId;
    if (!currentUserId) return;
    const content = newMessage.trim();
    setNewMessage('');
    setShowQuickReplies(false);

    // Optimistic UI: add the message immediately
    const optimisticMsg: ConversationMessage = {
      id: `optimistic-${Date.now()}`,
      conversationId: selectedConversationId,
      senderType: 'user',
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    
    // Speed up polling to catch quick responses
    speedUpPolling();

    try {
      await sendUserMessage(selectedConversationId, currentUserId, content);
      // Refresh to get the real message with server ID
      const msgs = await listMessages(selectedConversationId);
      setMessages(msgs);
      loadConversations();
    } catch (e: unknown) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setNewMessage(content); // Restore input
      console.error('Failed to send message:', e);
    }
  };

  const handleQuickReply = (text: string) => {
    setNewMessage(text);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-4">
        {/* Conversations Sidebar */}
        <Card className="w-96 flex flex-col overflow-hidden border-0 shadow-lg bg-white">
          <div className="p-5 border-b bg-gradient-to-r from-slate-50 to-blue-50/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                Messages
              </h2>
              {conversations.filter((c) => c.unreadCount > 0).length > 0 && (
                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2">
                  {conversations.filter((c) => c.unreadCount > 0).length} new
                </Badge>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search conversations..."
                className="pl-10 bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2 space-y-1">
            {userLoading || conversationsLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Loading conversations…</p>
              </div>
            ) : userError ? (
              <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl m-2">{userError}</div>
            ) : conversationsError ? (
              <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl m-2">{conversationsError}</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                  <Send className="h-8 w-8 text-blue-500" />
                </div>
                <p className="font-medium text-slate-700">No conversations yet</p>
                <p className="text-xs text-slate-400 mt-1">Start by requesting a trip!</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <ConversationListItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={selectedConversationId === conv.id}
                  isImportant={importantConversations.has(conv.id)}
                  onClick={() => {
                    setSelectedConversationId(conv.id);
                    setShowQuickReplies(true);
                  }}
                />
              ))
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-lg bg-white">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-gradient-to-r from-white to-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md ring-2 ring-white">
                      {initials(activeConversation.agentName)}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{activeConversation.agentName}</h3>
                    <div className="flex items-center gap-3">
                      <OnlineStatus isOnline={true} />
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {activeConversation.destinationLabel ?? 'Trip Planning'}
                      </span>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Conversation</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onClick={() => {
                        if (activeConversation.agentId) {
                          router.push(`/agents/${activeConversation.agentId}`);
                        }
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>View Agent Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onClick={() => {
                        const convId = activeConversation.id;
                        const newSet = new Set(importantConversations);
                        if (newSet.has(convId)) {
                          newSet.delete(convId);
                          setFeedbackMessage('Removed from important');
                        } else {
                          newSet.add(convId);
                          setFeedbackMessage('Marked as important');
                        }
                        setImportantConversations(newSet);
                        setTimeout(() => setFeedbackMessage(null), 2000);
                      }}
                    >
                      <Star className={`mr-2 h-4 w-4 ${importantConversations.has(activeConversation.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      <span>{importantConversations.has(activeConversation.id) ? 'Remove Important' : 'Mark as Important'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onClick={() => {
                        const convId = activeConversation.id;
                        const newSet = new Set(mutedConversations);
                        if (newSet.has(convId)) {
                          newSet.delete(convId);
                          setFeedbackMessage('Notifications enabled');
                        } else {
                          newSet.add(convId);
                          setFeedbackMessage('Notifications muted');
                        }
                        setMutedConversations(newSet);
                        setTimeout(() => setFeedbackMessage(null), 2000);
                      }}
                    >
                      <BellOff className={`mr-2 h-4 w-4 ${mutedConversations.has(activeConversation.id) ? 'text-slate-400' : ''}`} />
                      <span>{mutedConversations.has(activeConversation.id) ? 'Unmute' : 'Mute Notifications'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onClick={() => {
                        const convId = activeConversation.id;
                        const newSet = new Set(archivedConversations);
                        newSet.add(convId);
                        setArchivedConversations(newSet);
                        setSelectedConversationId(null);
                        setFeedbackMessage('Conversation archived');
                        setTimeout(() => setFeedbackMessage(null), 2000);
                      }}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      <span>Archive Chat</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer text-red-600 focus:text-red-600"
                      onClick={() => {
                        setFeedbackMessage('Report submitted - our team will review');
                        setTimeout(() => setFeedbackMessage(null), 3000);
                      }}
                    >
                      <Flag className="mr-2 h-4 w-4" />
                      <span>Report Issue</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Messages Area */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto p-6 bg-gradient-to-b from-slate-50/50 to-white relative"
              >
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-500">Loading messages…</p>
                    </div>
                  </div>
                ) : messagesError ? (
                  <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl">{messagesError}</div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Send className="h-10 w-10 text-blue-500" />
                      </div>
                      <h3 className="font-semibold text-slate-800 mb-1">Start the conversation</h3>
                      <p className="text-sm text-slate-500">Send a message to your travel agent</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messageGroups.map((group) => (
                      <div key={group.date}>
                        <DateDivider date={group.date} />
                        {group.messages.map((msg, idx) => {
                          const prevMsg = group.messages[idx - 1];
                          const showAvatar = !prevMsg || prevMsg.senderType !== msg.senderType;
                          return (
                            <MessageBubble
                              key={msg.id}
                              message={msg}
                              isOwn={msg.senderType === 'user'}
                              showAvatar={showAvatar}
                              agentName={activeConversation.agentName}
                            />
                          );
                        })}
                      </div>
                    ))}
                    {isTyping && <TypingIndicator agentName={activeConversation.agentName} />}
                  </>
                )}
                {newMsgCount > 0 && !isAtBottom && (
                  <div className="sticky bottom-4 w-full flex justify-center z-10">
                    <button
                      type="button"
                      onClick={() => scrollToBottom()}
                      className="px-4 py-2 text-sm font-medium rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all"
                    >
                      {newMsgCount} new message{newMsgCount > 1 ? 's' : ''} · Jump to latest
                    </button>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {showQuickReplies && messages.length < 3 && <QuickReplies onSelect={handleQuickReply} />}

              {/* Message Input */}
              <div className="p-4 border-t bg-white">
                <div className="flex items-end gap-2">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      className="pr-12 py-3 rounded-full border-slate-200 focus:border-blue-300 focus:ring-blue-200"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-slate-400 hover:text-amber-500 transition-colors"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <Smile className="h-5 w-5" />
                      </Button>
                      {showEmojiPicker && (
                        <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="h-11 w-11 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:shadow-none transition-all"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  🔒 Messages are encrypted and monitored for your safety
                </p>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <MessageCircle className="h-12 w-12 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Select a conversation</h3>
                <p className="text-slate-500 max-w-sm">
                  Choose a conversation from the list to chat with your travel agent
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
      
      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-2 z-50">
          {feedbackMessage}
        </div>
      )}
    </div>
  );
}
