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
      ? `empresa com CNPJ ${cnpj} (Nome: ${name}). PESQUISE NA WEB para confirmar o endereço atual, pois registros de CNPJ podem estar desatualizados ou apontar para escritórios contábeis. Busque pela localização operacional real (sede, fábrica ou escritório principal).` 
      : `${name}${city ? ` em ${city}` : ""}${country ? `, ${country}` : ""}. PESQUISE NA WEB para encontrar o endereço exato.`;

    const systemPrompt = `Você é um especialista em enriquecimento de dados corporativos e geolocalização global com ACESSO À PESQUISA NA WEB.
Sua tarefa é encontrar informações precisas e ATUAIS de endereço para uma empresa.

REGRAS CRÍTICAS:
1. NÃO CONFIE APENAS EM CONHECIMENTO PRÉVIO OU BASES ESTÁTICAS. PESQUISE NA WEB por termos como "[Nome da Empresa] endereço", "[CNPJ] localização" ou "[Nome da Empresa] contato".
2. Priorize a localização OPERACIONAL REAL (ex: sede, fábrica, filial principal) em vez de endereços puramente fiscais/contábeis se houver diferença.
3. Se o CNPJ for brasileiro, use ferramentas de busca para encontrar o endereço mais recente em sites como cnpj.biz, econodata, casas dos dados ou o site oficial da empresa.
4. Para empresas internacionais, identifique a sede global ou a filial mais relevante.
5. Retorne o resultado em formato JSON estruturado.
6. Se encontrar múltiplos endereços, escolha o que parece ser a sede principal ou o mais recente.

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
- source: Fonte específica da informação (ex: Website Oficial, Google Maps, CNPJ.biz, etc)
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