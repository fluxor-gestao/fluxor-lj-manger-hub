import React, { createContext, useContext, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const RealtimeSyncContext = createContext<null>(null);

export const RealtimeSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Mapeamento de tabelas para chaves de query
    const tableToQueryKeys: Record<string, string[][]> = {
      business_units: [["business-units"], ["catalog", "business_units"]],
      business_areas: [["business-areas"], ["business-areas-usage"]],
      system_versions: [["system-versions"], ["current-system-version"]],
      profiles: [["profiles"], ["current-user-profile"]],
      devis: [["devis"], ["devis-list"], ["business-areas-usage"]],
      financial_entries: [["financial-entries"], ["financial-data"]],
      financial_categories: [["financial-categories"], ["catalog", "financial_categories"]],
      financial_cost_centers: [["catalog", "financial_cost_centers"]],
      cost_centers: [["cost-centers"]],
      financial_payment_methods: [["catalog", "financial_payment_methods"]],
      payment_methods: [["payment-methods"]],
      financial_accounts: [["financial-accounts"], ["catalog", "financial_accounts"]],
      suppliers: [["suppliers"], ["catalog", "suppliers"]],
      clients: [["clients"], ["catalog", "clients"]],
      services: [["services"], ["catalog", "services"]],
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
            // Tentativa de invalidação por nome da tabela se não houver mapeamento
            console.log(`[RealtimeSync] Change detected in ${table}, no specific mapping, trying general invalidation.`);
            queryClient.invalidateQueries({ queryKey: [table] });
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
