// Traduz campos textuais de um devis — saída refinada, tom jurídico pt-BR
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANG_NAME: Record<string, string> = {
  pt: "português do Brasil (pt-BR)",
  fr: "français",
  en: "English",
  es: "español",
  de: "Deutsch",
};

const STRUCTURED_KEYS = new Set([
  "proposal_structure",
  "scope_items",
  "assumptions",
  "payment_terms",
]);

const PROSE_KEYS = new Set([
  "title",
  "scope_description",
  "meeting_summary",
  "meeting_report",
  "notes",
  "service_type",
  "responsible_sector",
]);

function postProcessPt(value: any): any {
  if (Array.isArray(value)) return value.map(postProcessPt);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value)) out[k] = postProcessPt(value[k]);
    return out;
  }
  if (typeof value !== "string") return value;
  let s = value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  // normalizações leves comuns vindas de FR/EN
  s = s
    .replace(/\bPhase\s+([A-D])\b/g, "Fase $1")
    .replace(/\bPage\s+(\d+)/g, "Página $1")
    .replace(/\bpage\s+(\d+)/g, "página $1")
    .replace(/\bpages?\s+(\d+)\s*[-–—]\s*(\d+)/gi, "páginas $1–$2")
    .replace(/\bstakeholders?\b/gi, "partes interessadas")
    .replace(/\bdue\s+diligence\b/gi, "due diligence")
    .replace(/\bescrow\b/gi, "escrow")
    .replace(/\s+—\s+—\s+/g, " — ")
    .replace(/[ \t]{2,}/g, " ");
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fields, target_language, source_language } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");
    if (!fields || typeof fields !== "object") throw new Error("fields é obrigatório");

    const target = LANG_NAME[target_language] || LANG_NAME.pt;
    const source = LANG_NAME[source_language] || "idioma original";
    const targetIsPt = target_language === "pt";

    const structuredList = Object.keys(fields).filter((k) => STRUCTURED_KEYS.has(k));
    const proseList = Object.keys(fields).filter((k) => PROSE_KEYS.has(k));

    const systemPrompt = `Você é um(a) advogado(a) sênior do escritório Lundgaard Jensen, encarregado(a) de **adaptar** (não apenas traduzir) propostas comerciais jurídicas de ${source} para ${target}.

OBJETIVO
- Produzir um texto que pareça **redigido nativamente** em ${target}, com fluidez profissional, e não uma tradução literal.
- Manter rigorosamente o sentido jurídico, valores, prazos, datas, siglas e nomes próprios.

REGRAS DE ESTILO (${targetIsPt ? "pt-BR jurídico" : target})
- Tom: proposta comercial jurídica, formal, terceira pessoa, voz ativa, frases curtas e claras.
- Evite calques e estrangeirismos quando houver equivalente natural.
- Reescreva trechos prolixos; combine repetições; mantenha precisão técnica.
- Itens de lista começam com verbo no infinitivo ou substantivo claro (ex.: "Levantamento topográfico…", "Coletar escrituras…"), sem "que/de" pendurado.
${targetIsPt ? `- Padronize: "Due Diligence" → "due diligence" (manter em itálico mental, sem aspas); "Phase A/B/C/D" → "Fase A/B/C/D"; "stakeholders" → "partes interessadas"; "escrow" → "escrow (depósito em garantia)" na 1ª ocorrência, depois "escrow"; "page/pages" → "página/páginas"; "memorandum on valuation impact" → "memorando de impacto na avaliação"; "title search" → "pesquisa de títulos"; "zoning" → "código municipal/zoneamento"; "coastal/marine status" → "status costeiro/marinho".` : ""}

ESTRUTURA (PRESERVAR FIELMENTE)
- Bullets que começam com "- " continuam com "- ".
- Itens "A)" / "a)" / "1)" mantêm o mesmo marcador.
- Cabeçalhos "Fase A —", "Phase A —" viram "${targetIsPt ? "Fase A —" : "Phase/Fase A —"}".
- Referências de página entre parênteses "(página N)" mantêm o formato.
- Não traduza valores (R$, BRL, %), datas, e-mails, telefones, CNPJ, OAB, nomes de pessoas/empresas.

CAMPOS RECEBIDOS
- Estruturados (markdown com listas/numeração): ${structuredList.join(", ") || "—"}
- Texto corrido (parágrafos formais): ${proseList.join(", ") || "—"}
- Arrays (ex.: scope_items, assumptions): traduzir CADA item; manter mesma quantidade e ordem; em objetos, traduzir apenas os campos textuais (title, description), preservando letter/amount/números.

SAÍDA
- Retorne **somente JSON**, com **exatamente as mesmas chaves** recebidas e os mesmos tipos (string → string; array → array; objeto → objeto). Nada além do JSON.`;

    const userPrompt = `Adapte/traduza os seguintes campos para ${target}. Devolva JSON com as mesmas chaves e tipos:

${JSON.stringify(fields, null, 2)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        reasoning_effort: "medium",
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições da OpenAI atingido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 401) return new Response(JSON.stringify({ error: "Chave OPENAI_API_KEY inválida." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) { const t = await response.text(); console.error("OpenAI error:", response.status, t); throw new Error(`OpenAI: ${response.status}`); }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");
    let translated = JSON.parse(content);
    if (targetIsPt) translated = postProcessPt(translated);

    return new Response(JSON.stringify({ translated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("translate-devis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
