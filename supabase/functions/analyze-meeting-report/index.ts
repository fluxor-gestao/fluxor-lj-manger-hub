// Analisa ata de reunião (PDF/imagem/texto) e extrai cliente + estrutura de devis — OpenAI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { file_base64, file_name, mime_type, language_hint } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");
    if (!file_base64) throw new Error("file_base64 é obrigatório");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Buscar Clientes Reais
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, company, document")
      .eq("active", true);

    // 2. Buscar Áreas (Business Areas)
    const { data: areas } = await supabase
      .from("business_areas")
      .select("slug, label, business_unit")
      .eq("is_active", true);

    // 3. Buscar Precificação (Service Prices)
    const { data: prices } = await supabase
      .from("service_prices")
      .select("name, price, business_unit, category");

    const clientsContext = clients?.map(c => `- ${c.name}${c.company ? ` (${c.company})` : ""}${c.document ? ` [Doc: ${c.document}]` : ""} (ID: ${c.id})`).join("\n") || "Nenhum cliente cadastrado.";
    const areasContext = areas?.map(a => `- ${a.slug}: ${a.label} (Unidade: ${a.business_unit})`).join("\n") || "Nenhuma área cadastrada.";
    const pricesContext = prices?.map(p => `- ${p.name}: R$ ${p.price} (Unidade: ${p.business_unit}, Categoria: ${p.category})`).join("\n") || "Nenhuma precificação cadastrada.";

    const langInstr = language_hint && language_hint !== "auto" ? `O idioma do documento é ${language_hint} — use este idioma em toda a saída.` : "Detecte automaticamente o idioma do documento.";

    const systemPrompt = `Você é um analista comercial sênior da Lundgaard Jensen.
Sua tarefa é analisar uma Ata de Reunião e extrair dados estruturados para criar uma proposta (Devis).

REGRA CRÍTICA DE IDIOMA:
- Determine o idioma final (campo "detected_language": pt, fr, en, es ou de).
- TODOS os campos textuais de saída devem estar 100% nesse mesmo idioma.
- Se o relatório estiver em francês ou inglês, traduza as descrições e títulos para o idioma detectado (geralmente pt-BR).

CADASTROS REAIS DO SISTEMA (USE COMO REFERÊNCIA OBRIGATÓRIA):

CLIENTES CADASTRADOS:
${clientsContext}

ÁREAS (CENTROS DE RESULTADO):
${areasContext}

CATÁLOGO DE SERVIÇOS (PRECIFICAÇÃO):
${pricesContext}

INSTRUÇÕES DE CORRESPONDÊNCIA:
1. CLIENTE: Compare o nome/empresa da Ata com a lista de CLIENTES CADASTRADOS.
   - Se houver match claro (nome, empresa ou documento), use o ID existente no campo "client_id".
   - Se for um novo cliente, deixe "client_id" vazio e preencha os dados em "client".
   - Se o cliente tiver empresas vinculadas (mesma empresa no cadastro), sugira a correta.
2. ÁREAS: O campo 'responsible_sectors' deve conter APENAS slugs da lista de ÁREAS acima.
   - Se não houver correspondência exata, deixe vazio. NUNCA invente áreas.
3. SERVIÇOS: Ao identificar serviços na Ata, compare com o CATÁLOGO DE SERVIÇOS.
   - Use o nome exato do catálogo se houver match.
   - Se o serviço não existir no catálogo, marque no título do item de escopo como "[NÃO CADASTRADO] Nome do Serviço".
   - Tente manter os preços próximos aos do catálogo.
   - Adicione um campo "confidence" (0-1) para cada serviço sugerido em relação ao catálogo.

Sua saída deve ser um objeto JSON estruturado contendo o idioma, dados do cliente, reunião e devis.`;

    const userContent: any[] = [
      { type: "text", text: `Analise esta ata${file_name ? ` (${file_name})` : ""}. ${langInstr}` },
    ];
    
    if (mime_type?.startsWith("image/")) {
      userContent.push({ type: "image_url", image_url: { url: `data:${mime_type};base64,${file_base64}` } });
    } else if (mime_type === "application/pdf") {
      userContent.push({
        type: "file",
        file: { filename: file_name || "document.pdf", file_data: `data:application/pdf;base64,${file_base64}` },
      });
    } else {
      try {
        const decoded = atob(file_base64);
        userContent.push({ type: "text", text: `Conteúdo do arquivo:\n${decoded.slice(0, 50000)}` });
      } catch {
        userContent.push({
          type: "file",
          file: { filename: file_name || "document", file_data: `data:${mime_type || "application/octet-stream"};base64,${file_base64}` },
        });
      }
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_meeting",
            parameters: {
              type: "object",
              properties: {
                detected_language: { type: "string", enum: ["pt", "fr", "en", "es"] },
                client_id: { type: "string", description: "ID do cliente existente se encontrado no catálogo." },
                client: {
                  type: "object",
                  properties: {
                    name: { type: "string" }, email: { type: "string" }, phone: { type: "string" },
                    document: { type: "string" }, type: { type: "string", enum: ["PF", "PJ", ""] },
                    address: { type: "string" }, city: { type: "string" }, notes: { type: "string" },
                  },
                  required: ["name", "email", "phone", "document", "type", "address", "city", "notes"],
                },
                meeting: {
                  type: "object",
                  properties: { date: { type: "string" }, summary: { type: "string" }, report: { type: "string" } },
                  required: ["date", "summary", "report"],
                },
                devis: {
                  type: "object",
                  properties: {
                    title: { type: "string" }, service_type: { type: "string" },
                    responsible_sectors: { type: "array", items: { type: "string" }, description: "Slugs das áreas oficiais identificadas." },
                    scope_description: { type: "string" }, proposal_structure: { type: "string" },
                    scope_items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { 
                          letter: { type: "string" }, 
                          title: { type: "string" }, 
                          description: { type: "string" }, 
                          amount: { type: "number" },
                          confidence: { type: "number" },
                          is_catalog_item: { type: "boolean", description: "Verdadeiro se o item foi encontrado no CATÁLOGO DE SERVIÇOS." }
                        },
                        required: ["letter", "title", "description", "amount", "confidence", "is_catalog_item"],
                      },
                    },
                    suggested_pricing_items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          service_name: { type: "string" },
                          quantity: { type: "number" },
                          unit_price: { type: "number" }
                        },
                        required: ["service_name", "quantity", "unit_price"]
                      }
                    },
                    total_amount: { type: "number" }, deadline_date: { type: "string" },
                  },
                  required: ["title", "service_type", "responsible_sectors", "scope_description", "proposal_structure", "scope_items", "total_amount", "deadline_date"],
                },
              },
              required: ["detected_language", "client", "meeting", "devis"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_meeting" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      throw new Error(`OpenAI: ${response.status} - ${t}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    const payload = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ payload }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("analyze-meeting-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});