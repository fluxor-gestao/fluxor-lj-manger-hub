import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SystemSettingsData = {
  companyName: string;
  companyDocument: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  systemDisplayName: string;
  primaryColor: string;
  footerText: string;
  supportEmail: string;
  defaultLanguage: string;
  timezone: string;
  dateFormat: string;
  recordsPerPage: string;
  compactMode: boolean;
  // outros campos existem mas não são lidos globalmente ainda
  [key: string]: any;
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsData = {
  companyName: "",
  companyDocument: "",
  companyEmail: "",
  companyPhone: "",
  companyAddress: "",
  systemDisplayName: "",
  primaryColor: "primary",
  footerText: "",
  supportEmail: "",
  defaultLanguage: "pt-BR",
  timezone: "America/Sao_Paulo",
  dateFormat: "dd/MM/yyyy",
  recordsPerPage: "25",
  compactMode: false,
};

/**
 * Hook leve para ler as opções salvas em `system_settings` (key='general').
 * Cache global compartilhado entre componentes (mesma queryKey do admin).
 */
export function useSystemSettings() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["system-settings", "general"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SystemSettingsData> => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("settings")
        .eq("category", "general")
        .maybeSingle();
      if (error) throw error;
      const saved = (data?.settings ?? {}) as Partial<SystemSettingsData>;
      return { ...DEFAULT_SYSTEM_SETTINGS, ...saved };
    },
  });

  return {
    settings: query.data ?? DEFAULT_SYSTEM_SETTINGS,
    isLoading: query.isLoading,
  };
}
