const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cnpj, name, city, country } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    const searchQuery = cnpj 
      ? `empresa com CNPJ ${cnpj} (Nome: ${name})` 
      : `${name}${city ? ` em ${city}` : ""}${country ? `, ${country}` : ""}`;

    const systemPrompt = `Você é um especialista em enriquecimento de dados corporativos e geolocalização global.
Sua tarefa é encontrar informações precisas de endereço para uma empresa, seja ela brasileira ou internacional.

REGRAS CRÍTICAS:
1. Priorize fontes oficiais e ATUALIZADAS. Se um CNPJ for fornecido, use-o para buscar o endereço exato registrado na Receita Federal ou em bases de dados de empresas (como cnpj.biz, econodata, etc).
2. MUITO IMPORTANTE: Verifique se o nome da empresa e o CNPJ coincidem. Às vezes, bases de dados antigas podem estar desatualizadas. 
3. Se houver divergência entre a base de dados e a localização real conhecida (como "Itarema / Ceará" para certas empresas de energia/turismo), priorize a localização operacional mais relevante.
4. Para empresas internacionais, encontre a sede global ou a filial principal no país indicado.
5. Retorne o resultado em formato JSON estruturado.
6. Se não encontrar nada conclusivo, retorne um objeto com o campo "error": "Localização não encontrada".

CAMPOS NO JSON:
- address: Logradouro/Rua (ex: Av. Paulista)
- street_number: Número (ex: 1000)
- neighborhood: Bairro/Distrito (ex: Bela Vista)
- city: Cidade
- state: Estado/Província/Região
- country: País
- zip_code: CEP/Postal Code
- latitude: Número decimal (essencial para o mapa)
- longitude: Número decimal (essencial para o mapa)
- trade_name: Nome Fantasia ou Nome Comercial Real
- source: Fonte específica da informação (ex: Receita Federal, Google Maps, LinkedIn, Website Oficial)
- is_international: boolean (true se for fora do Brasil)`;


    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${OPENAI_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Encontre a localização exata de: ${searchQuery}` },
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI error:", errorData);
      throw new Error("Falha na consulta à API de enriquecimento");
    }

    const result = await response.json();
    const enrichmentData = JSON.parse(result.choices[0].message.content);

    return new Response(JSON.stringify(enrichmentData), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (e) {
    console.error("enrich-client-location error:", e);
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});