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

    const langInstr = language_hint && language_hint !== "auto" ? `O idioma do documento é ${language_hint} — use este idioma em toda a saída.` : "Detecte automaticamente o idioma do documento.";

    const areaInstr = official_areas?.length 
      ? `CATÁLOGO OFICIAL DE ÁREAS (USE APENAS ESTES SLUGS): ${official_areas.map((a: any) => `${a.slug} (${a.label})`).join(", ")}. 
         REGRA CRÍTICA: Se o assunto da reunião não se encaixar em nenhuma destas áreas, deixe o campo 'responsible_sectors' VAZIO. NUNCA invente slugs fora desta lista.`
      : "Identifique as áreas comerciais envolvidas.";

    const systemPrompt = `Você é um analista comercial multilíngue.

REGRA CRÍTICA DE IDIOMA (OBRIGATÓRIA):
- Primeiro determine o idioma final (campo "detected_language": pt, fr, en ou es).
- TODOS os campos textuais de saída devem estar 100% nesse mesmo idioma, sem exceção.
- NUNCA misture idiomas. reescreva tudo no idioma final escolhido.
- Não traduza nomes próprios, valores monetários ou siglas técnicas.

${areaInstr}

Sua tarefa: extrair (1) idioma detectado, (2) dados do cliente, (3) resumo da reunião,
(4) estrutura inicial da proposta comercial.`;

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
                    responsible_sectors: { type: "array", items: { type: "string" }, description: "Slugs das áreas oficiais identificadas. Deixe vazio se não houver match exato." },
                    scope_description: { type: "string" }, proposal_structure: { type: "string" },
                    scope_items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { letter: { type: "string" }, title: { type: "string" }, description: { type: "string" }, amount: { type: "number" } },
                        required: ["letter", "title", "description", "amount"],
                      },
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