import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { JSZip } from "https://deno.land/x/jszip@0.11.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportTable {
  table: string;
  display: string;
  columns?: string[]; // if set, only these columns are exported
  redact?: string[];  // columns to mask in output
  orderBy?: string;   // column for stable pagination
}

// Full list of public tables to back up. Sensitive ones are projected/redacted.
const TABLES: ExportTable[] = [
  // Comercial / Cadastros
  { table: "clients", display: "Clientes" },
  { table: "business_areas", display: "Areas_de_Negocio" },
  { table: "business_units", display: "Unidades_de_Negocio" },
  { table: "cost_centers", display: "Centros_de_Custo" },
  { table: "suppliers", display: "Fornecedores" },
  { table: "services", display: "Servicos" },
  { table: "service_prices", display: "Tabela_Precificacao" },
  { table: "service_price_history", display: "Historico_Reajustes_Precos" },
  { table: "service_milestones", display: "Marcos_Servicos" },
  { table: "commercial_settings", display: "Configuracoes_Comerciais" },

  // Devis / Propostas
  { table: "devis", display: "Devis" },
  { table: "devis_service_areas", display: "Devis_Areas_Vinculadas" },
  { table: "devis_pricing_items", display: "Devis_Itens_Precificacao" },

  // Financeiro
  { table: "financial_entries", display: "Lancamentos_Financeiros" },
  { table: "financial_payments", display: "Historico_Pagamentos" },
  { table: "financial_accounts", display: "Contas_Financeiras" },
  { table: "financial_categories", display: "Categorias_Financeiras" },
  { table: "financial_cost_centers", display: "Financeiro_Centros_Custo" },
  { table: "financial_payment_methods", display: "Metodos_Pagamento_Financeiro" },
  { table: "financial_classification_rules", display: "Regras_Classificacao" },
  { table: "payment_methods", display: "Metodos_Pagamento" },
  { table: "payment_planner", display: "Planejador_Pagamentos" },
  { table: "entry_allocations", display: "Alocacoes_Lancamentos" },
  { table: "bank_accounts", display: "Contas_Bancarias" },
  { table: "bank_statement_entries", display: "Extratos_Bancarios" },
  { table: "conciliation_matches", display: "Conciliacoes" },
  { table: "historical_expenses", display: "Despesas_Historicas" },
  { table: "historical_indicators", display: "Indicadores_Historicos" },

  // Importações
  { table: "import_batches", display: "Lotes_Importacao" },
  { table: "import_logs", display: "Logs_Importacao" },

  // Comunicação interna
  { table: "conversations", display: "Conversas" },
  { table: "conversation_participants", display: "Conversa_Participantes" },
  { table: "messages", display: "Mensagens" },

  // E-mails
  { table: "email_send_log", display: "Historico_Envio_Emails" },
  { table: "email_send_state", display: "Estado_Envio_Emails" },
  { table: "suppressed_emails", display: "Emails_Suprimidos" },

  // Anexos
  { table: "entity_attachments", display: "Metadados_Anexos" },

  // Sistema / Logs / Versões
  { table: "audit_logs", display: "Logs_Auditoria" },
  { table: "system_settings", display: "Configuracoes_Sistema" },
  { table: "system_versions", display: "Versoes_Sistema" },
  { table: "changelog_entries", display: "Changelog" },

  // Usuários (somente colunas seguras)
  {
    table: "profiles",
    display: "Usuarios_Perfis",
    columns: ["id", "full_name", "email", "status", "created_at", "updated_at"],
  },
  { table: "user_roles", display: "Usuarios_Papeis" },

  // API Keys com hash mascarado
  {
    table: "api_keys",
    display: "API_Keys",
    columns: ["id", "name", "description", "created_by", "created_at", "last_used_at", "expires_at", "is_active"],
  },
];

const PAGE_SIZE = 1000;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (typeof value === "object") {
    try { s = JSON.stringify(value); } catch { s = String(value); }
  } else {
    s = String(value);
  }
  // RFC 4180: quote and escape if contains quote, comma, CR or LF
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function fetchAllRows(
  client: ReturnType<typeof createClient>,
  t: ExportTable,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  const select = t.columns?.join(",") || "*";
  let from = 0;
  while (true) {
    const q = client.from(t.table).select(select).range(from, from + PAGE_SIZE - 1);
    // Try ordering by created_at if present for stable pagination
    const ordered = t.orderBy ? q.order(t.orderBy, { ascending: true }) : q.order("created_at", { ascending: true });
    let { data, error } = await ordered;
    if (error) {
      // Fallback without order (table may not have created_at)
      const r = await client.from(t.table).select(select).range(from, from + PAGE_SIZE - 1);
      if (r.error) throw r.error;
      data = r.data as any;
    }
    const rows = (data as Record<string, unknown>[] | null) ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function toCsv(rows: Record<string, unknown>[], redact?: string[]): string {
  if (rows.length === 0) return "";
  // Union of keys across rows (handles jsonb sparsity)
  const headerSet = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) headerSet.add(k);
  const headers = Array.from(headerSet);
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    const values = headers.map((h) => {
      if (redact?.includes(h)) return csvEscape("***REDACTED***");
      return csvEscape((row as any)[h]);
    });
    lines.push(values.join(","));
  }
  return lines.join("\r\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: isAdmin, error: roleErr } = await supabaseClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleErr) throw roleErr;
    if (!isAdmin) throw new Error("Apenas administradores podem gerar o backup geral");

    const zip = new JSZip();
    const summary: Array<{ table: string; display: string; count: number; error?: string }> = [];
    const startedAt = new Date();

    for (const t of TABLES) {
      try {
        const rows = await fetchAllRows(supabaseClient, t);
        const csv = toCsv(rows, t.redact);
        // Always include the file (even if empty) for transparency
        zip.addFile(`${t.display}.csv`, csv || "(sem registros)");
        summary.push({ table: t.table, display: t.display, count: rows.length });
      } catch (e: any) {
        console.error(`Falha ao exportar ${t.table}:`, e?.message || e);
        summary.push({ table: t.table, display: t.display, count: 0, error: e?.message || "erro" });
        zip.addFile(`_ERRO_${t.display}.txt`, `Erro ao exportar: ${e?.message || e}`);
      }
    }

    // README
    const finishedAt = new Date();
    const totalRows = summary.reduce((acc, s) => acc + s.count, 0);
    const readme = [
      "BACKUP GERAL DO SISTEMA",
      "=======================",
      `Gerado em: ${finishedAt.toISOString()}`,
      `Iniciado em: ${startedAt.toISOString()}`,
      `Usuário: ${user.email ?? user.id}`,
      `Total de tabelas: ${summary.length}`,
      `Total de registros: ${totalRows}`,
      "",
      "Resumo por tabela:",
      ...summary.map((s) =>
        `- ${s.display} (${s.table}): ${s.count} registro(s)${s.error ? ` [ERRO: ${s.error}]` : ""}`
      ),
      "",
      "Observações de segurança:",
      "- Senhas não são exportadas (gerenciadas pelo Supabase Auth).",
      "- Hashes/segredos de API Keys são omitidos.",
      "- Tokens de cancelamento de e-mail não são exportados.",
      "- Mantenha este arquivo em local seguro.",
    ].join("\r\n");
    zip.addFile("LEIA-ME.txt", readme);
    zip.addFile("_resumo.json", JSON.stringify({ generatedAt: finishedAt.toISOString(), totalRows, summary }, null, 2));

    // Log de auditoria
    try {
      await supabaseClient.from("audit_logs").insert({
        user_id: user.id,
        action: "system_backup_generated",
        entity_type: "system",
        entity_id: null,
        details: { summary, totalRows, generatedAt: finishedAt.toISOString() },
      });
    } catch (e) {
      console.error("Falha ao gravar audit_log:", e);
    }

    const content = await zip.generateAsync({ type: "uint8array" });
    const filename = `backup_sistema_${finishedAt.toISOString().replace(/[:.]/g, "-")}.zip`;

    return new Response(content, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Backup-Tables": String(summary.length),
        "X-Backup-Rows": String(totalRows),
      },
    });
  } catch (error: any) {
    console.error("Backup error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Erro desconhecido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
