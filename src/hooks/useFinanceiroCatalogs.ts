import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CatalogItem = { id: string; name: string };
export type CategoryItem = CatalogItem & { kind: string };

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
        .select("id, name, kind")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CategoryItem[];
    },
  });

  const costCenters = useQuery({
    queryKey: ["catalog", "cost_centers"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CatalogItem[];
    },
  });

  const paymentMethods = useQuery({
    queryKey: ["catalog", "payment_methods"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CatalogItem[];
    },
  });

  return {
    suppliers: suppliers.data ?? [],
    clients: clients.data ?? [],
    categories: categories.data ?? [],
    costCenters: costCenters.data ?? [],
    paymentMethods: paymentMethods.data ?? [],
  };
}
