import { supabase } from "@/integrations/supabase/client";
import type { ChatContextRef } from "./types";
import type { AppRole } from "@/contexts/AuthContext";

export async function findOrCreateContextConversation(
  ctx: ChatContextRef,
  userId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("type", "context")
    .eq("context_type", ctx.contextType)
    .eq("context_id", ctx.contextId)
    .maybeSingle();

  if (existing?.id) {
    await ensureParticipant(existing.id, userId);
    return existing.id;
  }

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({
      type: "context",
      title: ctx.contextLabel,
      context_type: ctx.contextType,
      context_id: ctx.contextId,
      context_label: ctx.contextLabel,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !conv) throw error ?? new Error("Falha ao criar conversa");
  await ensureParticipant(conv.id, userId);
  return conv.id;
}

export async function ensureParticipant(
  conversationId: string,
  userId: string,
  area: AppRole | null = null,
) {
  await supabase
    .from("conversation_participants")
    .upsert(
      { conversation_id: conversationId, user_id: userId, area },
      { onConflict: "conversation_id,user_id", ignoreDuplicates: true },
    );
}

export async function createDirectConversation(
  currentUserId: string,
  otherUserId: string,
  title?: string,
): Promise<string> {
  // Procura conversa direct existente com exatamente esses dois participantes
  const { data: mine } = await supabase
    .from("conversation_participants")
    .select("conversation_id, conversations!inner(type)")
    .eq("user_id", currentUserId);

  const candidateIds =
    mine?.filter((m: any) => m.conversations?.type === "direct").map((m) => m.conversation_id) ?? [];

  if (candidateIds.length > 0) {
    const { data: others } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", candidateIds);
    const match = others?.[0]?.conversation_id;
    if (match) return match;
  }

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({ type: "direct", title: title ?? null, created_by: currentUserId })
    .select("id")
    .single();
  if (error || !conv) throw error ?? new Error("Falha ao criar conversa");

  await supabase.from("conversation_participants").insert([
    { conversation_id: conv.id, user_id: currentUserId },
    { conversation_id: conv.id, user_id: otherUserId },
  ]);
  return conv.id;
}

export async function createAreaConversation(
  currentUserId: string,
  area: AppRole,
  title: string,
): Promise<string> {
  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({ type: "area", area, title, created_by: currentUserId })
    .select("id")
    .single();
  if (error || !conv) throw error ?? new Error("Falha ao criar conversa");
  await ensureParticipant(conv.id, currentUserId);
  return conv.id;
}

export async function markConversationRead(conversationId: string, userId: string) {
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function sendMessage(conversationId: string, userId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return;
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userId,
    body: trimmed,
  });
  if (error) throw error;
}
