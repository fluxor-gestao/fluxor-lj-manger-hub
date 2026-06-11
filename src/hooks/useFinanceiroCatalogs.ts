import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CatalogItem = { id: string; name: string };
export type CategoryItem = CatalogItem & { kind: string; dre_group?: string | null };

const STALE = 5 * 60 * 1000;

export function useFinanceiroCatalogs() {
  const suppliers = useQuery({
    queryKey: ["catalog", "suppliers"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CatalogItem[];
    },
  });

  const clients = useQuery({
    queryKey: ["catalog", "clients"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CatalogItem[];
    },
  });

  const categories = useQuery({
    queryKey: ["catalog", "financial_categories"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories")
        .select("id, name, kind, dre_group")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CategoryItem[];
    },
  });

  const costCenters = useQuery({
    queryKey: ["catalog", "financial_cost_centers"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_cost_centers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CatalogItem[];
    },
  });

  const paymentMethods = useQuery({
    queryKey: ["catalog", "financial_payment_methods"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_payment_methods")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CatalogItem[];
    },
  });

  const financialAccounts = useQuery({
    queryKey: ["catalog", "financial_accounts"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("id, name, bank, business_unit")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as (CatalogItem & { bank: string; business_unit: string })[];
    },
  });

  const businessUnits = useQuery({
    queryKey: ["catalog", "business_units"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_units")
        .select("id, code, name")
        .eq("active", true)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  return {
    suppliers: suppliers.data ?? [],
    clients: clients.data ?? [],
    categories: categories.data ?? [],
    costCenters: costCenters.data ?? [],
    paymentMethods: paymentMethods.data ?? [],
    financialAccounts: financialAccounts.data ?? [],
    businessUnits: businessUnits.data ?? [],
  };
}
