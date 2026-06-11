import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { JSZip } from "https://deno.land/x/jszip@0.11.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportTable {
  tableName: string;
  columns?: string[];
  displayName: string;
}

const ALLOWED_TABLES: ExportTable[] = [
  { tableName: "clients", displayName: "Clientes" },
  { tableName: "devis", displayName: "Devis" },
  { tableName: "devis_service_areas", displayName: "Devis_Areas_Vinculadas" },
  { tableName: "devis_pricing_items", displayName: "Devis_Itens_Precificacao" },
  { tableName: "business_areas", displayName: "Areas_de_Negocio" },
  { tableName: "business_units", displayName: "Unidades_de_Negocio" },
  { tableName: "service_prices", displayName: "Tabela_Precificacao" },
  { tableName: "service_price_history", displayName: "Historico_Reajustes_Precos" },
  { tableName: "financial_entries", displayName: "Lancamentos_Financeiros" },
  { tableName: "accounts_receivable", displayName: "Contas_a_Receber" }, // Check if this exists or is part of financial_entries
  { tableName: "accounts_payable", displayName: "Contas_a_Pagar" },     // Check if this exists or is part of financial_entries
  { tableName: "financial_payments", displayName: "Historico_Pagamentos_Financeiros" },
  { tableName: "financial_accounts", displayName: "Contas_Financeiras_Bancarias" },
  { tableName: "financial_categories", displayName: "Categorias_Financeiras" },
  { tableName: "cost_centers", displayName: "Centros_de_Custo" },
  { tableName: "financial_payment_methods", displayName: "Metodos_Pagamento_Financeiro" },
  { tableName: "bank_statement_entries", displayName: "Extratos_Bancarios_Importados" },
  { tableName: "conciliation_matches", displayName: "Conciliacoes_Realizadas" },
  { tableName: "audit_logs", displayName: "Logs_Auditoria_Sistema" },
  { tableName: "email_send_log", displayName: "Historico_Envio_Emails" },
  { tableName: "entity_attachments", displayName: "Metadados_Anexos" },
  { tableName: "commercial_settings", displayName: "Configuracoes_Comerciais" },
  { tableName: "system_settings", displayName: "Configuracoes_Sistema" },
  { 
    tableName: "profiles", 
    displayName: "Usuarios_Perfis",
    columns: ["id", "full_name", "email", "status", "created_at"] 
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate Auth and Admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      throw new Error("Only admins can generate system backups");
    }

    const zip = new JSZip();
    const summary = [];

    for (const table of ALLOWED_TABLES) {
      let query = supabaseClient.from(table.tableName).select(table.columns?.join(",") || "*");
      
      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching ${table.tableName}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(",")];
        
        for (const row of data) {
          const values = headers.map(header => {
            const val = row[header];
            const escaped = ('' + (val ?? '')).replace(/"/g, '""');
            return `"${escaped}"`;
          });
          csvRows.push(values.join(","));
        }

        zip.addFile(`${table.displayName}.csv`, csvRows.join("\n"));
        summary.push({ table: table.tableName, count: data.length });
      } else {
        summary.push({ table: table.tableName, count: 0 });
      }
    }

    // Generate Log
    await supabaseClient.from("admin_logs").insert({
      user_id: user.id,
      action: "system_backup_generated",
      details: {
        summary,
        timestamp: new Date().toISOString()
      }
    });

    const content = await zip.generateAsync({ type: "uint8array" });

    return new Response(content, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="system_backup_${new Date().toISOString().split('T')[0]}.zip"`,
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
