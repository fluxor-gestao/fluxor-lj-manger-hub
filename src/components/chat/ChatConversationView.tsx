import { useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, Send, X, FileIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useChatUsers } from "@/hooks/useChatUsers";
import { usePresence } from "@/hooks/usePresence";
import {
  getAttachmentSignedUrl,
  markConversationRead,
  sendMessage,
  uploadChatAttachment,
} from "@/lib/chat/api";
import type { ConversationWithMeta, MessageAttachment } from "@/lib/chat/types";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_FILE_MB = 10;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentChip({ att }: { att: MessageAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = att.mime?.startsWith("image/");
  useEffect(() => {
    let cancelled = false;
    getAttachmentSignedUrl(att.path).then((u) => {
      if (!cancelled) setUrl(u);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [att.path]);

  if (isImage && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block max-w-[260px]">
        <img src={url} alt={att.name} className="rounded-md border max-h-48 object-cover" />
        <div className="text-[10px] opacity-70 mt-1 truncate">{att.name} · {formatBytes(att.size)}</div>
      </a>
    );
  }
  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-md border bg-background/50 px-2 py-1.5 text-xs hover:bg-background"
    >
      <FileIcon className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[180px]">{att.name}</span>
      <span className="opacity-60">{formatBytes(att.size)}</span>
      <Download className="h-3.5 w-3.5 opacity-70" />
    </a>
  );
}

export function ChatConversationView({
  conversation,
  className,
}: {
  conversation: ConversationWithMeta;
  className?: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: messages = [] } = useChatMessages(conversation.id);
  const { data: users = [] } = useChatUsers();
  const onlineSet = usePresence();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const usersById = useMemo(() => {
    const m = new Map<string, { name: string; email: string | null }>();
    users.forEach((u) => m.set(u.user_id, { name: u.full_name || u.email || "Usuário", email: u.email }));
    return m;
  }, [users]);

  // Para conversas diretas, identificar o "outro" participante
  const otherUserId = useMemo(() => {
    if (conversation.type !== "direct") return null;
    return conversation.participants?.find((p) => p.user_id !== user?.id)?.user_id ?? null;
  }, [conversation, user?.id]);
  const otherUser = otherUserId ? usersById.get(otherUserId) : null;
  const otherOnline = otherUserId ? onlineSet.has(otherUserId) : false;

  useEffect(() => {
    if (!user?.id) return;
    markConversationRead(conversation.id, user.id).then(() => {
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
    });
  }, [conversation.id, user?.id, messages.length, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: MessageAttachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          toast.error(`${file.name}: tamanho acima de ${MAX_FILE_MB}MB`);
          continue;
        }
        const att = await uploadChatAttachment(conversation.id, file);
        uploaded.push(att);
      }
      setPending((p) => [...p, ...uploaded]);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar arquivo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!user?.id || sending) return;
    if (!body.trim() && pending.length === 0) return;
    setSending(true);
    try {
      await sendMessage(conversation.id, user.id, body, pending);
      setBody("");
      setPending([]);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const headerTitle = otherUser?.name
    || conversation.title
    || (conversation.type === "context" ? conversation.context_label : "Conversa");

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      <div className="border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          {conversation.type === "direct" && (
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                otherOnline ? "bg-emerald-500" : "bg-muted-foreground/40",
              )}
              title={otherOnline ? "Online agora" : "Offline"}
            />
          )}
          <div className="font-medium text-sm truncate">{headerTitle}</div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {conversation.type === "direct" && otherUser?.email && (
            <span className="text-xs text-muted-foreground">{otherUser.email}</span>
          )}
          {conversation.context_type && (
            <Badge variant="outline" className="text-xs">
              {conversation.context_type}: {conversation.context_label}
            </Badge>
          )}
          {conversation.area && (
            <Badge variant="secondary" className="text-xs">Área: {conversation.area}</Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="px-4 py-3 space-y-2">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Nenhuma mensagem ainda. Envie a primeira!
            </div>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            const senderName = !mine ? usersById.get(m.sender_id)?.name : null;
            const atts = Array.isArray(m.attachments) ? m.attachments : [];
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm break-words space-y-2",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {senderName && conversation.type !== "direct" && (
                    <div className="text-[11px] font-medium opacity-80">{senderName}</div>
                  )}
                  {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                  {atts.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {atts.map((a) => <AttachmentChip key={a.path} att={a} />)}
                    </div>
                  )}
                  <div className={cn("text-[10px] opacity-70", mine ? "text-right" : "")}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {pending.length > 0 && (
        <div className="border-t px-2 py-2 flex flex-wrap gap-1.5 shrink-0">
          {pending.map((p) => (
            <div key={p.path} className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-xs">
              <FileIcon className="h-3.5 w-3.5" />
              <span className="truncate max-w-[140px]">{p.name}</span>
              <span className="opacity-60">{formatBytes(p.size)}</span>
              <button
                type="button"
                onClick={() => setPending((arr) => arr.filter((x) => x.path !== p.path))}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remover"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t p-2 flex items-end gap-2 shrink-0">
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || sending}
          title="Anexar arquivo"
        >
          <Paperclip className={cn("h-4 w-4", uploading && "animate-pulse")} />
        </Button>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escreva uma mensagem..."
          className="min-h-[40px] max-h-32 resize-none"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!body.trim() && pending.length === 0) || sending || uploading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
