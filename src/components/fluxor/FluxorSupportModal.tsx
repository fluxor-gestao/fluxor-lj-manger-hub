import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { sendTicket, type FluxorTicketPayload } from "@/lib/fluxorMonitor/fluxorMonitorClient";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FluxorSupportModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const currentPath = useRouterState({ select: (s) => s.location.href });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<FluxorTicketPayload["type"]>("duvida");
  const [priority, setPriority] = useState<FluxorTicketPayload["priority"]>("media");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setType("duvida");
    setPriority("media");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim() || !description.trim()) {
      toast.error("Preencha título e descrição.");
      return;
    }
    setSubmitting(true);
    const { ok } = await sendTicket({
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      screen: currentPath,
      user_email: user?.email ?? null,
    });
    setSubmitting(false);

    if (ok) {
      toast.success("Chamado enviado com sucesso. A equipe Fluxor foi notificada.");
      reset();
      onOpenChange(false);
    } else {
      toast.error("Não foi possível enviar o chamado agora. Tente novamente em instantes.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Abrir chamado</DialogTitle>
          <DialogDescription>
            Envie um chamado para a equipe Fluxor. Tela atual e usuário são preenchidos
            automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fluxor-title">Título</Label>
            <Input
              id="fluxor-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Resumo do chamado"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as FluxorTicketPayload["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="erro">Erro</SelectItem>
                  <SelectItem value="duvida">Dúvida</SelectItem>
                  <SelectItem value="melhoria">Melhoria</SelectItem>
                  <SelectItem value="solicitacao">Solicitação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as FluxorTicketPayload["priority"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fluxor-desc">Descrição</Label>
            <Textarea
              id="fluxor-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={6}
              placeholder="Descreva com o máximo de detalhes possível"
              required
            />
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <div>
              <span className="font-medium">Tela:</span> {currentPath || "—"}
            </div>
            <div>
              <span className="font-medium">Usuário:</span> {user?.email ?? "anônimo"}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar chamado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
