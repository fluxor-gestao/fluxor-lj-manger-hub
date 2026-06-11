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
      ? `EMPRESA CNPJ: ${cnpj} (NOME: ${name}). PESQUISE NA WEB para confirmar o endereço OPERACIONAL atual. Verifique sites como econodata, cnpj.biz, LinkedIn, e sites oficiais de notícias de energia/eólica. FOCO: Qual a localização real de atuação desta empresa hoje? Itarema? Cruz? Ceará?` 
      : `EMPRESA: ${name}${city ? ` EM ${city}` : ""}${country ? `, ${country}` : ""}. PESQUISE NA WEB para encontrar o endereço OPERACIONAL exato.`;

    const systemPrompt = `Você é um especialista em enriquecimento de dados corporativos e geolocalização global com ACESSO À PESQUISA NA WEB.
Sua tarefa é encontrar informações precisas e ATUAIS de endereço para uma empresa.

REGRAS CRÍTICAS:
1. NÃO CONFIE APENAS EM CONHECIMENTO PRÉVIO. USE A PESQUISA NA WEB.
2. PRIORIDADE: Se a pesquisa na web indicar que a empresa opera em um local específico (como Itarema/CE, Cruz/CE, Ceará, Brasil), use ESSE endereço como o principal. O endereço fiscal administrativo (SP/RJ/BH) é SECUNDÁRIO. O usuário quer a localização física de atuação operacional.
3. Se o CNPJ tiver filiais, identifique a filial relevante para o Ceará/Nordeste. Valide com notícias ou sites oficiais se há uma "base operacional" ou "parque eólico" relevante.
4. Para empresas internacionais, identifique a sede ou filial operacional principal.
5. Retorne o resultado em formato JSON estruturado.

CAMPOS NO JSON:
- address: Logradouro/Rua (ex: Rua Farol do Itapaje)
- street_number: Número (ex: 02)
- neighborhood: Bairro/Distrito (ex: Porto dos Barcos)
- city: Cidade (ex: Itarema)
- state: Estado/Província/Região (ex: Ceará)
- country: País (ex: Brasil)
- zip_code: CEP/Postal Code (ex: 62590-000)
- latitude: Número decimal
- longitude: Número decimal
- trade_name: Nome Fantasia
- source: Fonte (ex: Google Search / Site Oficial)
- is_international: boolean`;


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