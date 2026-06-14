import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Rastreio de presença global (Supabase Realtime Presence).
 * Cada usuário logado entra em um canal compartilhado e expõe seu user_id.
 * Retorna o conjunto de user_ids atualmente online.
 */
export function usePresence(): Set<string> {
  const { user } = useAuth();
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel("presence:global", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnline(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return online;
}
