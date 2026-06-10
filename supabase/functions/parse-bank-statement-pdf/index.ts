// Extrai transações de um extrato bancário PDF usando OpenAI (chat.completions com PDF)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileBase64, fileName, text } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");
    if (!fileBase64 && !text) throw new Error("fileBase64 ou text é obrigatório");

    // Preferimos texto pré-extraído (muito mais rápido e barato que reenviar PDF binário).
    const userContent: any[] = text
      ? [{
          type: "text",
          text: `Analise o extrato bancário${fileName ? ` "${fileName}"` : ""} abaixo (texto já extraído do PDF) e retorne TODAS as transações.\n\n---\n${String(text).slice(0, 180000)}\n---`,
        }]
      : [
          { type: "text", text: `Analise o extrato${fileName ? ` "${fileName}"` : ""} e extraia todas as transações.` },
          { type: "file", file: { filename: fileName || "extrato.pdf", file_data: `data:application/pdf;base64,${fileBase64}` } },
        ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Extraia TODAS as transações de um extrato bancário. Datas em ISO (YYYY-MM-DD). Valores em número (positivo crédito, negativo débito). Para cada transação, forneça o campo 'description' original e um novo campo 'interpreted_description' com uma versão simplificada e legível (ex: 'PIX RECEBIDO 123' -> 'Recebimento PIX', 'TRF INTERNA' -> 'Transferência entre contas')." },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_transactions",
            parameters: {
              type: "object",
              properties: {
                bank_name: { type: "string" },
                account: { type: "string" },
                period_start: { type: "string" },
                period_end: { type: "string" },
                transactions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string" },
                      description: { type: "string" },
                      interpreted_description: { type: "string" },
                      amount: { type: "number" },
                      document: { type: "string" },
                    },
                    required: ["date", "description", "amount"],
                  },
                },
              },
              required: ["transactions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_transactions" } },
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições da OpenAI atingido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 401) return new Response(JSON.stringify({ error: "Chave OPENAI_API_KEY inválida." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) { const t = await response.text(); console.error("OpenAI error:", response.status, t); throw new Error(`OpenAI: ${response.status}`); }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta sem tool_call");
    const data = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("parse-bank-statement-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
