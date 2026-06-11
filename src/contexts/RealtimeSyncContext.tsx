import React, { createContext, useContext, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const RealtimeSyncContext = createContext<null>(null);

export const RealtimeSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Mapeamento de tabelas para chaves de query
    const tableToQueryKeys: Record<string, string[][]> = {
      business_units: [["business-units"]],
      business_areas: [["business-areas"], ["business-areas-usage"]],
      system_versions: [["system-versions"]],
      profiles: [["profiles"], ["current-user-profile"]],
      devis: [["devis"], ["devis-list"], ["business-areas-usage"]],
      financial_entries: [["financial-entries"], ["financial-data"]],
      financial_categories: [["financial-categories"]],
      cost_centers: [["cost-centers"]],
      payment_methods: [["payment-methods"]],
      financial_accounts: [["financial-accounts"]],
      suppliers: [["suppliers"]],
      clients: [["clients"]],
      services: [["services"]],
      devis_service_areas: [["business-areas-usage"]],
    };

    const channel = supabase
      .channel("public-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
        },
        (payload) => {
          const table = payload.table;
          const queryKeys = tableToQueryKeys[table];

          if (queryKeys) {
            queryKeys.forEach((key) => {
              console.log(`[RealtimeSync] Invalidating query key: ${JSON.stringify(key)} due to change in ${table}`);
              queryClient.invalidateQueries({ queryKey: key });
            });
          } else {
            // Se não houver mapeamento específico, podemos invalidar por prefixo ou 
            // simplesmente logar para sabermos que precisamos adicionar
            console.log(`[RealtimeSync] Change detected in ${table}, but no query key mapping found.`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return <RealtimeSyncContext.Provider value={null}>{children}</RealtimeSyncContext.Provider>;
};

export const useRealtimeSync = () => useContext(RealtimeSyncContext);
