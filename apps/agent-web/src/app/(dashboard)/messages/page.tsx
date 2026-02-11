'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Info,
  Image,
  Smile,
  ChevronLeft,
  Check,
  CheckCheck,
  Clock,
  Star,
  Copy,
  Reply,
  X,
  Sparkles,
  MessageCircle,
  MapPin,
  Users,
  Calendar,
  Flag,
  Archive,
  BellOff,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Input,
  Badge,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAgentSession } from '@/lib/agent/session';
import {
  listConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  type ConversationListItem,
  type ConversationMessage,
} from '@/lib/data/agent';

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

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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

function getInitials(name: string): string {
  return (name || 'Client')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'C';
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

function TypingIndicator({ clientName }: { clientName: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs font-semibold shadow-md">
        {getInitials(clientName)}
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
      <span className="text-xs text-slate-500">{isOnline ? 'Online now' : 'Offline'}</span>
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
    { icon: '👋', text: "Hi! How can I help with your trip?" },
    { icon: '📋', text: "Let me check on that for you" },
    { icon: '✅', text: "I've updated your itinerary" },
    { icon: '📞', text: "Would you like to schedule a call?" },
  ];

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
      <span className="text-xs text-slate-400 w-full mb-1 flex items-center gap-1">
        <Sparkles className="h-3 w-3" /> Quick replies:
      </span>
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion.text)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-full hover:bg-indigo-50 hover:border-indigo-300 transition-all hover:shadow-sm active:scale-95"
        >
          <span>{suggestion.icon}</span>
          <span className="text-slate-600">{suggestion.text}</span>
        </button>
      ))}
    </div>
  );
}

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const emojis = ['😊', '👍', '❤️', '🎉', '🙏', '✈️', '🏖️', '🗺️', '📸', '🌟', '💯', '🏨', '🚗', '🍽️', '🎒', '🌴', '⛰️', '🎫'];

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
            className="w-9 h-9 text-xl hover:bg-indigo-50 rounded-xl transition-all flex items-center justify-center hover:scale-110 active:scale-95"
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
  clientName,
}: {
  message: ConversationMessage;
  isOwn: boolean;
  showAvatar: boolean;
  clientName: string;
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
      className={cn('flex mb-3 group animate-in fade-in slide-in-from-bottom-1 duration-200', isOwn ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar for client messages */}
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs font-semibold mr-2 mt-auto mb-6 shadow-md ring-2 ring-white">
          {getInitials(clientName)}
        </div>
      )}
      {!isOwn && !showAvatar && <div className="w-8 mr-2" />}

      <div className={cn('max-w-[70%]', isOwn ? 'order-1' : 'order-2')}>
        {/* Message Actions */}
        <div className={cn('flex items-center gap-1 mb-1 h-6', isOwn ? 'justify-end' : 'justify-start', showActions && !isOptimistic ? 'opacity-100' : 'opacity-0', 'transition-opacity')}>
          <button className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed opacity-50" title="Reply — coming soon" disabled>
            <Reply className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all" title={copied ? 'Copied!' : 'Copy'}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed opacity-50" title="Star — coming soon" disabled>
            <Star className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Message Content */}
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl shadow-sm transition-all',
            isOwn
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-md shadow-indigo-500/20'
              : 'bg-white border border-slate-100 text-slate-800 rounded-bl-md shadow-slate-200/50',
            isOptimistic && 'opacity-70'
          )}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>

        {/* Timestamp & Status */}
        <div className={cn('flex items-center gap-1.5 mt-1.5', isOwn ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-slate-400 font-medium">{formatMessageTime(message.createdAt)}</span>
          {isOwn && (
            isOptimistic ? (
              <Clock className="h-3 w-3 text-slate-300 animate-pulse" />
            ) : message.isRead ? (
              <CheckCheck className="h-3.5 w-3.5 text-indigo-500" />
            ) : (
              <Check className="h-3.5 w-3.5 text-slate-300" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Enhanced ConversationItem with premium styling
function ConversationListCard({
  conversation,
  isActive,
  isPriority,
  onClick,
}: {
  conversation: ConversationListItem;
  isActive: boolean;
  isPriority?: boolean;
  onClick: () => void;
}) {
  const initials = getInitials(conversation.clientName);
  const isOnline = false; // Online status not yet implemented

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
        isActive 
          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 shadow-sm' 
          : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
      )}
    >
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-semibold shadow-md">
          {initials}
        </div>
        <div className={cn('absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white', isOnline ? 'bg-green-500' : 'bg-slate-300')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            {isPriority && (
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
            )}
            <p className={cn('font-semibold truncate', conversation.unreadCount > 0 ? 'text-slate-900' : 'text-slate-700')}>
              {conversation.clientName}
            </p>
            {conversation.unreadCount > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold animate-pulse">
                {conversation.unreadCount}
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
            {conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : ''}
          </span>
        </div>
        <p className="text-xs text-indigo-600 font-medium truncate flex items-center gap-1 mb-1">
          <MapPin className="h-3 w-3" />
          {conversation.destinationLabel ?? 'Trip Planning'}
        </p>
        <p className={cn(
          'text-sm truncate',
          conversation.unreadCount > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'
        )}>
          {conversation.lastMessagePreview ?? 'No messages yet'}
        </p>
      </div>
    </button>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function MessagesPage() {
  const { agent } = useAgentSession();
  const router = useRouter();
  
  // Conversation action states — persisted in localStorage
  const [priorityConversations, setPriorityConversations] = useState<Set<string>>(() => {
    try { const v = localStorage.getItem('tc_agent_priority_convos'); return v ? new Set(JSON.parse(v)) : new Set(); } catch { return new Set(); }
  });
  const [mutedConversations, setMutedConversations] = useState<Set<string>>(() => {
    try { const v = localStorage.getItem('tc_agent_muted_convos'); return v ? new Set(JSON.parse(v)) : new Set(); } catch { return new Set(); }
  });
  const [archivedConversations, setArchivedConversations] = useState<Set<string>>(() => {
    try { const v = localStorage.getItem('tc_agent_archived_convos'); return v ? new Set(JSON.parse(v)) : new Set(); } catch { return new Set(); }
  });

  // Persist dropdown states to localStorage
  useEffect(() => { try { localStorage.setItem('tc_agent_priority_convos', JSON.stringify([...priorityConversations])); } catch {} }, [priorityConversations]);
  useEffect(() => { try { localStorage.setItem('tc_agent_muted_convos', JSON.stringify([...mutedConversations])); } catch {} }, [mutedConversations]);
  useEffect(() => { try { localStorage.setItem('tc_agent_archived_convos', JSON.stringify([...archivedConversations])); } catch {} }, [archivedConversations]);

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMsgCount, setNewMsgCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversation) ?? null,
    [conversations, selectedConversation]
  );

  const filteredConversations = useMemo(() => {
    let list = conversations.filter((c) => !archivedConversations.has(c.id));
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (conv) => conv.clientName.toLowerCase().includes(query) || (conv.destinationLabel ?? '').toLowerCase().includes(query)
      );
    }
    return list;
  }, [conversations, searchQuery, archivedConversations]);

  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages]);

  const loadConversations = async () => {
    setConversationsLoading(true);
    setConversationsError(null);
    try {
      const list = await listConversations(agent.agentId);
      setConversations(list);
      if (!selectedConversation && list.length > 0) setSelectedConversation(list[0].id);
    } catch (e: any) {
      setConversationsError(e?.message ?? 'Failed to load conversations');
    } finally {
      setConversationsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.agentId]);

  useEffect(() => {
    if (!selectedConversation) {
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
        await markConversationRead(selectedConversation);
        const msgs = await listMessages(selectedConversation);
        if (cancelled) return;
        setMessages(msgs);
        // refresh unread badges
        loadConversations();
      } catch (e: any) {
        if (cancelled) return;
        setMessagesError(e?.message ?? 'Failed to load messages');
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

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

  // Note: Supabase Realtime is disabled for local development since the Docker setup
  // doesn't include the realtime service. The polling fallback below handles updates.
  // In production with full Supabase, you can enable realtime by uncommenting below.
  /*
  useEffect(() => {
    if (!selectedConversation) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`agent-messages:${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        (payload) => {
          const row: any = payload.new;
          const next: ConversationMessage = {
            id: row.id,
            conversationId: row.conversation_id,
            senderType: row.sender_type,
            content: row.content,
            isRead: Boolean(row.is_read),
            createdAt: row.created_at,
          };

          setMessages((prev) => (prev.some((m) => m.id === next.id) || prev.some((m) => m.id.startsWith('optimistic-') && m.content === next.content) ? prev.filter((m) => !m.id.startsWith('optimistic-')).concat(next.id ? [next] : []) : [...prev, next]));
          // refresh unread badges + last message preview
          loadConversations();
        }
      )
      .subscribe((status) => {
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);
  */

  // Adaptive polling - slows to 10s if page is hidden, speeds up to 1.5s after sending
  const [pollSpeed, setPollSpeed] = useState(3000); // Default 3 seconds

  useEffect(() => {
    if (!selectedConversation) return;

    // Adaptive polling - slow down when tab is hidden
    const handleVisibilityChange = () => {
      setPollSpeed(document.hidden ? 10000 : 3000);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Polling fallback - only updates when data actually changes
    const id = setInterval(async () => {
      try {
        const msgs = await listMessages(selectedConversation);
        // Only update if there are new messages (compare by length and last message id)
        setMessages((prev) => {
          if (msgs.length !== prev.length) {
            // Visual notification for new client messages
            const newMsgs = msgs.filter(m => !prev.find(p => p.id === m.id));
            const hasClientMessage = newMsgs.some(m => m.senderType === 'user');
            if (hasClientMessage && typeof window !== 'undefined') {
              document.title = '💬 New message - HowWePlan Agent';
              setTimeout(() => { document.title = 'Messages - HowWePlan Agent'; }, 3000);
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
  }, [selectedConversation, pollSpeed]);

  // Speed up polling briefly after sending a message
  const speedUpPolling = () => {
    setPollSpeed(1500); // 1.5 second
    setTimeout(() => setPollSpeed(3000), 5000); // Back to normal after 5s
  };

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

  // Typing indicator is controlled by real events, not simulated
  // In production, this would be triggered by realtime presence events

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    if (!selectedConversation) return;

    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);
    setShowQuickReplies(false);

    // Optimistic UI: add the message immediately
    const optimisticMsg: ConversationMessage = {
      id: `optimistic-${Date.now()}`,
      conversationId: selectedConversation,
      senderType: 'agent',
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await sendMessage(selectedConversation, agent.userId, content);
      // Refresh to get the real message with server ID
      const msgs = await listMessages(selectedConversation);
      setMessages(msgs);
      loadConversations();
      speedUpPolling(); // Faster polling after sending
    } catch (e: any) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setMessageInput(content); // Restore input
      setMessagesError(e?.message ?? 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickReply = (text: string) => {
    setMessageInput(text);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Conversations List */}
      <Card className={cn(
        'w-full lg:w-96 flex flex-col overflow-hidden border-0 shadow-lg bg-white',
        showMobileChat && 'hidden lg:flex'
      )}>
        <div className="p-5 border-b bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              Client Messages
            </h2>
            {conversations.filter((c) => c.unreadCount > 0).length > 0 && (
              <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2">
                {conversations.filter((c) => c.unreadCount > 0).length} new
              </Badge>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 rounded-xl"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversationsLoading ? (
            <div className="p-3 space-y-3 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                    <div className="h-3 w-36 bg-slate-100 rounded" />
                  </div>
                  <div className="h-3 w-10 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : conversationsError ? (
            <div className="p-4 text-center">
              <p className="text-sm text-red-600 mb-3">{conversationsError}</p>
              <Button variant="outline" onClick={loadConversations} className="text-sm">
                Retry
              </Button>
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <ConversationListCard
                key={conv.id}
                conversation={conv}
                isActive={conv.id === selectedConversation}
                isPriority={priorityConversations.has(conv.id)}
                onClick={() => {
                  setSelectedConversation(conv.id);
                  setShowMobileChat(true);
                  setShowQuickReplies(true);
                }}
              />
            ))
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-indigo-500" />
              </div>
              <p className="font-medium text-slate-700">No conversations found</p>
              <p className="text-xs text-slate-400 mt-1">Messages from clients will appear here</p>
            </div>
          )}
        </div>
      </Card>

      {/* Chat Area */}
      <Card className={cn(
        'flex-1 flex flex-col overflow-hidden border-0 shadow-lg bg-white',
        !showMobileChat && 'hidden lg:flex'
      )}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-white to-slate-50">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden -ml-2"
                  onClick={() => setShowMobileChat(false)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-md ring-2 ring-white">
                    {getInitials(activeConversation.clientName)}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-green-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">
                    {activeConversation.clientName}
                  </h3>
                  <div className="flex items-center gap-3">
                    <OnlineStatus isOnline={false} />
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
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
                  <DropdownMenuLabel>Client Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => {
                      // Copy client info to clipboard
                      navigator.clipboard.writeText(`Client: ${activeConversation.clientName}\nUser ID: ${activeConversation.userId}`);
                      toast.success('Client details copied', 'Client information copied to clipboard');
                    }}
                  >
                    <Info className="mr-2 h-4 w-4" />
                    <span>Copy Client Details</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => {
                      if (activeConversation.bookingId) {
                        router.push(`/bookings/${activeConversation.bookingId}`);
                      } else {
                        toast.warning('No booking', 'This conversation has no associated booking yet');
                      }
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span>View Booking</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => router.push('/itineraries')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    <span>Open Itineraries</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => {
                      const convId = activeConversation.id;
                      const newSet = new Set(priorityConversations);
                      if (newSet.has(convId)) {
                        newSet.delete(convId);
                        toast.info('Removed priority', 'Conversation no longer marked as priority');
                      } else {
                        newSet.add(convId);
                        toast.success('Marked as priority', 'Conversation marked as high priority');
                      }
                      setPriorityConversations(newSet);
                    }}
                  >
                    <Star className={cn("mr-2 h-4 w-4", priorityConversations.has(activeConversation.id) && "fill-yellow-400 text-yellow-400")} />
                    <span>{priorityConversations.has(activeConversation.id) ? 'Remove Priority' : 'Mark as Priority'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => {
                      const convId = activeConversation.id;
                      const newSet = new Set(mutedConversations);
                      if (newSet.has(convId)) {
                        newSet.delete(convId);
                        toast.success('Unmuted', 'You will receive notifications for this conversation');
                      } else {
                        newSet.add(convId);
                        toast.info('Muted', 'Notifications silenced for this conversation');
                      }
                      setMutedConversations(newSet);
                    }}
                  >
                    <BellOff className={cn("mr-2 h-4 w-4", mutedConversations.has(activeConversation.id) && "text-slate-400")} />
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
                      setSelectedConversation(null);
                      toast.success('Archived', 'Conversation has been archived');
                    }}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    <span>Archive Chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer text-slate-400"
                    disabled
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    <span>Report Client — coming soon</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-50/50 to-white relative"
            >
              {messagesLoading ? (
                <div className="space-y-4 p-4 animate-pulse">
                  {/* Incoming message skeleton */}
                  <div className="flex gap-2 max-w-[70%]">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="space-y-2">
                      <div className="h-16 w-48 bg-slate-200 rounded-2xl rounded-tl-sm" />
                      <div className="h-3 w-12 bg-slate-100 rounded" />
                    </div>
                  </div>
                  {/* Outgoing message skeleton */}
                  <div className="flex justify-end">
                    <div className="space-y-2 items-end flex flex-col">
                      <div className="h-12 w-56 bg-indigo-100 rounded-2xl rounded-tr-sm" />
                      <div className="h-3 w-12 bg-slate-100 rounded" />
                    </div>
                  </div>
                  {/* Another incoming */}
                  <div className="flex gap-2 max-w-[70%]">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="space-y-2">
                      <div className="h-20 w-64 bg-slate-200 rounded-2xl rounded-tl-sm" />
                      <div className="h-3 w-12 bg-slate-100 rounded" />
                    </div>
                  </div>
                </div>
              ) : messagesError ? (
                <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl">{messagesError}</div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
                      <Send className="h-10 w-10 text-indigo-500" />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">Start the conversation</h3>
                    <p className="text-sm text-slate-500">Send a welcome message to your client</p>
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
                            isOwn={msg.senderType === 'agent'}
                            showAvatar={showAvatar}
                            clientName={activeConversation.clientName}
                          />
                        );
                      })}
                    </div>
                  ))}
                  {isTyping && <TypingIndicator clientName={activeConversation.clientName} />}
                </>
              )}
              {newMsgCount > 0 && !isAtBottom && (
                <div className="sticky bottom-4 w-full flex justify-center z-10">
                  <button
                    type="button"
                    onClick={() => scrollToBottom()}
                    className="px-4 py-2 text-sm font-medium rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all"
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
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-slate-300 opacity-50 cursor-not-allowed" disabled title="File attachments — coming soon">
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-slate-300 opacity-50 cursor-not-allowed" disabled title="Image upload — coming soon">
                    <Image className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pr-12 py-3 rounded-full border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
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
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sending || !selectedConversation}
                  className="h-11 w-11 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                💼 Professional communication helps build client trust
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <MessageCircle className="h-12 w-12 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Select a conversation</h3>
              <p className="text-slate-500 max-w-sm">
                Choose a client from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
