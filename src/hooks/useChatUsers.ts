import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ChatUser = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

export function useChatUsers() {
  return useQuery({
    queryKey: ["chat", "users"],
    queryFn: async (): Promise<ChatUser[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .order("full_name", { nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ChatUser[];
    },
    staleTime: 60_000,
  });
}
