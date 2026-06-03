import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CORS_HEADERS, jsonResponse, validateBiRequest } from "@/lib/bi-auth.server";

// NOTE: a dedicated `bi_kpis_financeiro` RPC does not exist in the database.
// Until one is added (schema change), we aggregate `financial_entries` inline
// honoring the same ?from/?to window used by the other BI KPI endpoints.
export const Route = createFileRoute("/api/public/bi-kpis-financeiro")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const auth = await validateBiRequest(request, "financeiro");
        if (!auth.ok) return auth.response;

        let q = supabaseAdmin
          .from("financial_entries")
          .select("amount_in,amount_out,entry_type,conciliation_status,entry_date");
        if (auth.from) q = q.gte("entry_date", auth.from);
        if (auth.to) q = q.lte("entry_date", auth.to);

        const { data, error } = await q;
        if (error) return jsonResponse({ error: error.message }, 500);

        const rows = data ?? [];
        let totalIn = 0;
        let totalOut = 0;
        let previstoIn = 0;
        let previstoOut = 0;
        let transfers = 0;
        for (const r of rows as Array<Record<string, any>>) {
          const inV = Number(r.amount_in) || 0;
          const outV = Number(r.amount_out) || 0;
          if (r.entry_type === "transferencia") {
            transfers += inV + outV;
            continue;
          }
          if (r.conciliation_status === "pendente") {
            previstoIn += inV;
            previstoOut += outV;
          } else {
            totalIn += inV;
            totalOut += outV;
          }
        }

        return jsonResponse({
          data: {
            total_in: totalIn,
            total_out: totalOut,
            saldo: totalIn - totalOut,
            previsto_in: previstoIn,
            previsto_out: previstoOut,
            transfers,
            entries_count: rows.length,
          },
          meta: { from: auth.from, to: auth.to, source: "aggregate:financial_entries" },
        });
      },
    },
  },
});
