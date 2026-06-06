// TODO: persistir em uma tabela futura `operation_comments`
// (process_id, author_id, body, related_status, created_at).
// Por enquanto os comentários vivem em estado local da sessão.
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { STATUS_LABEL, type OpStatus, type ServiceLike } from "./status";

type LocalComment = {
  id: string;
  author: string;
  created_at: string;
  body: string;
  status: OpStatus;
};

export function ProcessoComentarios({ service }: { service: ServiceLike }) {
  const { user } = useAuth();
  const [items, setItems] = useState<LocalComment[]>([]);
  const [text, setText] = useState("");

  const author =
    (user as any)?.user_metadata?.full_name ||
    user?.email ||
    "Você";

  const send = () => {
    if (!text.trim()) return;
    setItems((arr) => [
      {
        id: Math.random().toString(36).slice(2, 9),
        author,
        created_at: new Date().toISOString(),
        body: text.trim(),
        status: service.status as OpStatus,
      },
      ...arr,
    ]);
    setText("");
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="py-3 space-y-2">
          <Textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um comentário…"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={send} disabled={!text.trim()}>
              <Send className="h-4 w-4" />
              Enviar
            </Button>
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-6 border border-dashed rounded-lg">
          Sem comentários ainda. O feed é local até a tabela de comentários existir.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{c.author}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {STATUS_LABEL[c.status]}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{c.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
