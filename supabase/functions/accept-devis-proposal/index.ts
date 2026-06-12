// Aceite/recusa público de proposta (devis) via accept_token
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const PREVIEW_FIELDS =
  "id, devis_number, title, total_amount, down_payment_amount, deadline_date, scope_description, proposal_structure, accepted_at, rejected_at, client_id, source_language, secondary_language, title_secondary, scope_description_secondary, proposal_structure_secondary, business_unit, responsible_sector, initial_charge_generated";

function previewPayload(devis: any, clientName: string | null) {
  return {
    id: devis.id,
    title: devis.title,
    client_name: clientName,
    total_amount: Number(devis.total_amount) || 0,
    down_payment_amount: Number(devis.down_payment_amount) || 0,
    deadline_date: devis.deadline_date,
    scope_description: devis.scope_description,
    proposal_structure: devis.proposal_structure,
    accepted_at: devis.accepted_at,
    rejected_at: devis.rejected_at,
    source_language: devis.source_language ?? null,
    secondary_language: devis.secondary_language ?? null,
    title_secondary: devis.title_secondary ?? null,
    scope_description_secondary: devis.scope_description_secondary ?? null,
    proposal_structure_secondary: devis.proposal_structure_secondary ?? null,
    business_unit: devis.business_unit ?? "DE",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action"); // "reject" or default accept

    if (!token) return json({ error: "token ausente" }, 400);

    // Token deve ser UUID — qualquer outro formato é tratado como não encontrado
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(token)) return json({ error: "Proposta não encontrada" }, 404);

    const { data: devis, error } = await admin
      .from("devis")
      .select(PREVIEW_FIELDS)
      .eq("accept_token", token)
      .maybeSingle();

    if (error) {
      console.error("select devis error", error);
      return json({ error: "Erro ao buscar proposta" }, 500);
    }
    if (!devis) return json({ error: "Proposta não encontrada" }, 404);

    let clientName: string | null = null;
    if (devis.client_id) {
      const { data: client } = await admin
        .from("clients")
        .select("name")
        .eq("id", devis.client_id)
        .maybeSingle();
      clientName = client?.name ?? null;
    }

    if (req.method === "GET") {
      return json(previewPayload(devis, clientName));
    }

    if (req.method === "POST") {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("cf-connecting-ip") ||
        null;

      if (action === "reject") {
        if (devis.rejected_at || devis.accepted_at) {
          return json(previewPayload(devis, clientName));
        }
        let reason: string | null = null;
        try {
          const body = await req.json();
          reason = body?.reason ? String(body.reason).slice(0, 1000) : null;
        } catch {}
        const updates: any = {
          rejected_at: new Date().toISOString(),
          status: "rejeitada",
          rejected_ip: ip,
        };
        if (reason) updates.notes = reason;

        const { data: updated, error: upErr } = await admin
          .from("devis")
          .update(updates)
          .eq("accept_token", token)
          .select(PREVIEW_FIELDS)
          .maybeSingle();
        if (upErr) {
          console.error("reject update error", upErr);
          return json({ error: "Erro ao registrar recusa" }, 500);
        }
        return json(previewPayload(updated, clientName));
      }

      // Default: accept
      if (devis.accepted_at) {
        return json(previewPayload(devis, clientName));
      }

      // 1. Atualizar o Devis para Aceito
      const { data: updated, error: upErr } = await admin
        .from("devis")
        .update({
          accepted_at: new Date().toISOString(),
          status: "aceita",
          accepted_ip: ip,
        })
        .eq("accept_token", token)
        .select(PREVIEW_FIELDS)
        .maybeSingle();

      if (upErr) {
        console.error("accept update error", upErr);
        return json({ error: "Erro ao registrar aceite" }, 500);
      }

      console.log(`Devis ${updated.devis_number} aceito. Iniciando automações...`);

      // 2. Gerar lançamento financeiro previsto (Cobrança Inicial)
      if (!updated.initial_charge_generated) {
        try {
          // Verificar duplicidade antes de inserir
          const { data: existingEntry } = await admin
            .from("financial_entries")
            .select("id")
            .eq("devis_id", updated.id)
            .eq("source_type", "devis")
            .maybeSingle();

          if (existingEntry) {
            console.log(`Lançamento financeiro já existe para o Devis ${updated.devis_number}.`);
          } else {
            const entryDate = new Date().toISOString().slice(0, 10);
            const { error: entryErr } = await admin.from("financial_entries").insert({
              entry_date: entryDate,
              competence_date: entryDate,
              competence_month: entryDate.slice(0, 7),
              business_unit: updated.business_unit,
              movement_description: `Entrada (50%) - Devis ${updated.devis_number}`,
              amount_in: Number(updated.down_payment_amount) || 0,
              entry_type: "receita",
              source_type: "devis",
              conciliation_status: "pendente",
              client_id: updated.client_id,
              devis_id: updated.id,
              devis_number: updated.devis_number,
              payment_status: "aberto",
              open_amount: Number(updated.down_payment_amount) || 0,
              due_date: entryDate, // Vencimento imediato para entrada
            });

            if (entryErr) {
              console.error("Erro ao criar lançamento financeiro:", entryErr);
            } else {
              console.log(`Lançamento financeiro criado para o Devis ${updated.devis_number}.`);
              // Marcar como gerado no Devis
              await admin.from("devis").update({ initial_charge_generated: true }).eq("id", updated.id);
            }
          }
        } catch (e) {
          console.error("Exceção ao processar financeiro:", e);
        }
      }

      // 3. Criar operação/processo operacional
      try {
        // Verificar duplicidade antes de inserir
        const { data: existingService } = await admin
          .from("services")
          .select("id")
          .eq("devis_id", updated.id)
          .maybeSingle();

        if (existingService) {
          console.log(`Operação já existe para o Devis ${updated.devis_number}.`);
        } else {
          const { error: serviceErr } = await admin.from("services").insert({
            title: updated.title,
            description: updated.scope_description,
            business_unit: updated.business_unit,
            responsible_sector: updated.responsible_sector,
            client_id: updated.client_id,
            devis_id: updated.id,
            status: "a_iniciar",
            start_date: new Date().toISOString().slice(0, 10),
            expected_end_date: updated.deadline_date,
          });

          if (serviceErr) {
            console.error("Erro ao criar operação:", serviceErr);
          } else {
            console.log(`Operação criada para o Devis ${updated.devis_number}.`);
          }
        }
      } catch (e) {
        console.error("Exceção ao processar operação:", e);
      }

      return json(previewPayload(updated, clientName));
    }

    return json({ error: "Método não suportado" }, 405);
  } catch (e) {
    console.error("accept-devis-proposal error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
