import {
  gwListConversations,
  gwListMessages,
  gwSendMessage,
  gwMarkReadUpTo,
  gwCreateConversation,
} from '@/lib/data/api';

// ============================================================================
// Messaging Data Access - Gateway API
// ============================================================================
// All messaging operations go through the Gateway API to the Messaging Service.
// 
// Endpoints used:
//   - GET  /api/messaging/api/v1/conversations     - List conversations
//   - GET  /api/messaging/api/v1/messages          - List messages
//   - POST /api/messaging/api/v1/messages          - Send message
//   - POST /api/messaging/api/v1/messages/read-up-to - Mark messages read
// 
// See docs/FRONTEND-DATA-ACCESS-POLICY.md for details.
// ============================================================================

export type ConversationListItem = {
  id: string;
  bookingId: string | null;
  agentId: string;
  state: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  agentName: string;
  agentAvatarUrl: string | null;
  destinationLabel: string | null;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  senderType: 'user' | 'agent' | 'system';
  content: string;
  isRead: boolean;
  createdAt: string;
};

export async function listUserConversations(userId: string): Promise<ConversationListItem[]> {
  // NOTE: `userId` is kept for backward compatibility with callers.
  // The messaging service infers the principal from the bearer token.
  void userId;

  const response: any = await gwListConversations();
  const items: any[] = response?.data?.items ?? [];

  return items.map((c: any) => {
    const last = c.lastMessage;
    const participants: any[] = Array.isArray(c.participants) ? c.participants : [];
    const agent = participants.find((p) => p?.participantType === 'AGENT');
    const agentName = agent?.displayName || 'Agent';
    
    // Build destination label from trip info
    let destinationLabel: string | null = null;
    if (c.tripDestination) {
      destinationLabel = c.tripDestination;
      if (c.tripDates) {
        destinationLabel += ` • ${c.tripDates}`;
      }
    }
    
    return {
      id: c.id,
      bookingId: c.bookingId ?? null,
      agentId: agent?.id ?? '',
      state: c.state,
      updatedAt: c.updatedAt,
      lastMessageAt: last?.createdAt ?? null,
      lastMessagePreview: last?.content ? String(last.content).slice(0, 120) : null,
      unreadCount: Number(c.unreadCount ?? 0),
      agentName,
      agentAvatarUrl: null,
      destinationLabel,
    } as ConversationListItem;
  });
}

export async function listMessages(conversationId: string): Promise<ConversationMessage[]> {
  const response: any = await gwListMessages(conversationId);
  const items: any[] = response?.data?.items ?? [];

  return items.map((m: any) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderType: String(m.senderType ?? '').toLowerCase() as any,
    content: m.content,
    isRead: Array.isArray(m.readBy) && m.readBy.length > 0,
    createdAt: m.createdAt,
  }));
}

export async function sendUserMessage(conversationId: string, userId: string, content: string): Promise<void> {
  // NOTE: `userId` kept for backward compatibility.
  void userId;
  await gwSendMessage(conversationId, content);
}

export async function markConversationReadAsUser(conversationId: string): Promise<void> {
  // Mark read up to the most recent message in the thread.
  const response: any = await gwListMessages(conversationId);
  const items: any[] = response?.data?.items ?? [];
  const last = items.length > 0 ? items[items.length - 1] : null;
  if (!last?.id) return;
  await gwMarkReadUpTo(conversationId, String(last.id));
}

/**
 * Start a new conversation with an agent.
 * Returns the conversation ID which can be used to redirect to the messages page.
 */
export async function startConversation(
  userId: string,
  agentId: string,
  bookingId?: string | null
): Promise<{ conversationId: string }> {
  console.log('[startConversation] Creating conversation - userId:', userId, 'agentId:', agentId, 'bookingId:', bookingId);
  try {
    const response: any = await gwCreateConversation(userId, agentId, bookingId);
    console.log('[startConversation] Response:', response);
    const conversation = response?.data ?? response;
    if (!conversation?.id) {
      console.error('[startConversation] No conversation ID in response:', response);
      throw new Error('Failed to create conversation - no ID returned');
    }
    return { conversationId: conversation.id };
  } catch (error) {
    console.error('[startConversation] Error:', error);
    throw error;
  }
}
