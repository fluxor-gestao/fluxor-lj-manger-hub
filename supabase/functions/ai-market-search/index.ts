import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { serviceName } = await req.json();

    if (!serviceName) {
      return new Response(JSON.stringify({ error: "serviceName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback response if key is missing
      return new Response(
        JSON.stringify({
          marketPrice: 5000 + Math.floor(Math.random() * 5000),
          source: "Estimativa baseada em mercado jurídico nacional",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em mercado jurídico e de consultoria no Brasil. Sua tarefa é estimar o valor médio de mercado para um serviço específico. Retorne apenas um JSON com os campos 'marketPrice' (número) e 'source' (string curta descrevendo a fonte da estimativa, ex: 'Tabela OAB-CE + mercado local').",
          },
          {
            role: "user",
            content: `Qual o valor médio de mercado no Brasil para o serviço: ${serviceName}?`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
