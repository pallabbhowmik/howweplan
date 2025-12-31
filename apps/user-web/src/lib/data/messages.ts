import { getSupabaseClient } from '@/lib/supabase/client';

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
  const supabase = getSupabaseClient();

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, booking_id, agent_id, state, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const conversationIds = (conversations ?? []).map((c: any) => c.id);

  const unreadByConversation = new Map<string, number>();
  if (conversationIds.length > 0) {
    const { data: unread, error: unreadErr } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .eq('sender_type', 'agent');

    if (unreadErr) throw unreadErr;
    for (const row of unread ?? []) {
      const cid = (row as any).conversation_id as string;
      unreadByConversation.set(cid, (unreadByConversation.get(cid) ?? 0) + 1);
    }
  }

  const lastByConversation = new Map<string, any>();
  if (conversationIds.length > 0) {
    const { data: lastMsgs, error: lastErr } = await supabase
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    if (lastErr) throw lastErr;
    for (const m of lastMsgs ?? []) {
      const cid = (m as any).conversation_id as string;
      if (!lastByConversation.has(cid)) lastByConversation.set(cid, m);
    }
  }

  const agentIds = Array.from(new Set((conversations ?? []).map((c: any) => c.agent_id).filter(Boolean)));
  const agentsById = new Map<string, any>();
  if (agentIds.length > 0) {
    const { data: agents, error: agentErr } = await supabase
      .from('agents')
      .select('id, user_id, users!agents_user_id_fkey(id, first_name, last_name, avatar_url)')
      .in('id', agentIds);
    if (agentErr) throw agentErr;
    for (const a of agents ?? []) agentsById.set((a as any).id, a);
  }

  // Destination label from booking->request if available (best-effort)
  const bookingIds = (conversations ?? []).map((c: any) => c.booking_id).filter(Boolean) as string[];
  const bookingsById = new Map<string, any>();
  if (bookingIds.length > 0) {
    const { data: bookings, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, request_id')
      .in('id', Array.from(new Set(bookingIds)));
    if (bookingErr) throw bookingErr;
    for (const b of bookings ?? []) bookingsById.set((b as any).id, b);
  }

  const requestIds = Array.from(new Set(Array.from(bookingsById.values()).map((b: any) => b.request_id).filter(Boolean)));
  const requestsById = new Map<string, any>();
  if (requestIds.length > 0) {
    const { data: requests, error: reqErr } = await supabase
      .from('travel_requests')
      .select('id, title, destination')
      .in('id', requestIds);
    if (reqErr) throw reqErr;
    for (const r of requests ?? []) requestsById.set((r as any).id, r);
  }

  return (conversations ?? []).map((c: any) => {
    const agent = agentsById.get(c.agent_id);
    const u: any = agent?.users;
    const last = lastByConversation.get(c.id) ?? null;
    const unreadCount = unreadByConversation.get(c.id) ?? 0;

    const booking = c.booking_id ? bookingsById.get(c.booking_id) : null;
    const request = booking?.request_id ? requestsById.get(booking.request_id) : null;

    let destinationLabel: string | null = null;
    if (request?.destination) {
      const d: any = request.destination;
      const country = typeof d?.country === 'string' ? d.country : null;
      const regions = Array.isArray(d?.regions) ? (d.regions.filter(Boolean) as string[]) : [];
      if (country && regions.length > 0) destinationLabel = `${country} • ${regions.join(', ')}`;
      else if (country) destinationLabel = country;
      else if (typeof request?.title === 'string') destinationLabel = request.title;
    } else if (typeof request?.title === 'string') {
      destinationLabel = request.title;
    }

    const agentName = u ? `${u.first_name} ${u.last_name}`.trim() : 'Agent';

    return {
      id: c.id,
      bookingId: c.booking_id ?? null,
      agentId: c.agent_id,
      state: c.state,
      updatedAt: c.updated_at,
      lastMessageAt: last?.created_at ?? null,
      lastMessagePreview: last?.content ? String(last.content).slice(0, 120) : null,
      unreadCount,
      agentName,
      agentAvatarUrl: u?.avatar_url ?? null,
      destinationLabel,
    } as ConversationListItem;
  });
}

export async function listMessages(conversationId: string): Promise<ConversationMessage[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_type, content, is_read, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((m: any) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderType: m.sender_type,
    content: m.content,
    isRead: Boolean(m.is_read),
    createdAt: m.created_at,
  }));
}

export async function sendUserMessage(conversationId: string, userId: string, content: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: userId,
    sender_type: 'user',
    content,
    content_type: 'text',
    is_read: false,
  });
  if (error) throw error;
}

export async function markConversationReadAsUser(conversationId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('sender_type', 'agent');
  if (error) throw error;
}
