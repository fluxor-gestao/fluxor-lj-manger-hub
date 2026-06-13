// Enriquecimento de localização por CNPJ.
// Fonte primária: BrasilAPI (dados cadastrais reais da Receita Federal).
// Fallback CNPJ: ReceitaWS.
// Geocodificação: OpenStreetMap Nominatim (endereço completo).
// Fallback (sem CNPJ): OpenAI por nome — usado APENAS quando não há CNPJ válido.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function onlyDigits(s: string | undefined | null): string {
  return (s || "").replace(/\D+/g, "");
}

function formatCNPJ(d: string): string {
  if (d.length !== 14) return d;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function isValidCNPJ(d: string): boolean {
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = base.split("").reduce((acc, n, i) => acc + parseInt(n) * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(d.slice(0, 12), w1);
  const d2 = calc(d.slice(0, 12) + d1, w2);
  return d1 === parseInt(d[12]) && d2 === parseInt(d[13]);
}

async function fetchBrasilAPI(cnpj: string) {
  const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  if (!r.ok) throw new Error(`BrasilAPI ${r.status}`);
  const j = await r.json();
  return {
    trade_name: j.nome_fantasia || j.razao_social || null,
    company_name: j.razao_social || null,
    address: j.logradouro || "",
    street_number: j.numero || "",
    neighborhood: j.bairro || "",
    city: j.municipio || "",
    state: j.uf || "",
    country: "Brasil",
    zip_code: j.cep ? String(j.cep).replace(/^(\d{5})(\d{3}).*$/, "$1-$2") : "",
    source: "BrasilAPI / Receita Federal",
  };
}

async function fetchReceitaWS(cnpj: string) {
  const r = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
  if (!r.ok) throw new Error(`ReceitaWS ${r.status}`);
  const j = await r.json();
  if (j.status === "ERROR") throw new Error(j.message || "ReceitaWS erro");
  return {
    trade_name: j.fantasia || j.nome || null,
    company_name: j.nome || null,
    address: j.logradouro || "",
    street_number: j.numero || "",
    neighborhood: j.bairro || "",
    city: j.municipio || "",
    state: j.uf || "",
    country: "Brasil",
    zip_code: j.cep || "",
    source: "ReceitaWS",
  };
}

async function geocode(addressLine: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addressLine)}`;
  const r = await fetch(url, { headers: { "User-Agent": "fluxor-bi-client-location/1.0" } });
  if (!r.ok) return null;
  const arr = await r.json();
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
}

async function aiLocateByName(name: string) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");
  const sys = `Você retorna JSON com endereço de uma empresa. Campos: address, street_number, neighborhood, city, state, country, zip_code, latitude, longitude, trade_name, source, is_international.`;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Encontre a localização de: ${name}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error("OpenAI falhou");
  const j = await r.json();
  return JSON.parse(j.choices[0].message.content);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cnpj, name } = await req.json();
    const cnpjDigits = onlyDigits(cnpj);

    console.log(`[enrich] request cnpj="${cnpj}" digits="${cnpjDigits}" name="${name}"`);

    // Fluxo CNPJ (preferencial)
    if (cnpjDigits) {
      if (!isValidCNPJ(cnpjDigits)) {
        return new Response(
          JSON.stringify({ error: "CNPJ inválido. Verifique se possui 14 dígitos válidos." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let base: any = null;
      try {
        base = await fetchBrasilAPI(cnpjDigits);
        console.log(`[enrich] BrasilAPI ok cnpj=${cnpjDigits} razao=${base.company_name}`);
      } catch (e) {
        console.log(`[enrich] BrasilAPI falhou cnpj=${cnpjDigits}: ${(e as Error).message}. Tentando ReceitaWS...`);
        try {
          base = await fetchReceitaWS(cnpjDigits);
          console.log(`[enrich] ReceitaWS ok cnpj=${cnpjDigits} razao=${base.company_name}`);
        } catch (e2) {
          console.log(`[enrich] ReceitaWS falhou cnpj=${cnpjDigits}: ${(e2 as Error).message}`);
          return new Response(
            JSON.stringify({ error: "Não foi possível consultar o CNPJ nas fontes públicas no momento." }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      const addrLine = [
        base.address,
        base.street_number,
        base.neighborhood,
        base.city,
        base.state,
        base.country,
        base.zip_code,
      ].filter(Boolean).join(", ");

      let latitude = 0, longitude = 0;
      try {
        const g = await geocode(addrLine);
        if (g) { latitude = g.lat; longitude = g.lon; }
        console.log(`[enrich] geocode cnpj=${cnpjDigits} -> ${latitude},${longitude}`);
      } catch (e) {
        console.log(`[enrich] geocode falhou: ${(e as Error).message}`);
      }

      const payload = {
        ...base,
        cnpj_formatted: formatCNPJ(cnpjDigits),
        latitude,
        longitude,
        is_international: false,
      };

      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fluxo sem CNPJ — IA por nome
    if (!name) {
      return new Response(JSON.stringify({ error: "Informe CNPJ ou nome para busca." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiResult = await aiLocateByName(name);
    console.log(`[enrich] AI por nome="${name}" -> ${aiResult.city}/${aiResult.state}`);
    return new Response(JSON.stringify({ ...aiResult, source: aiResult.source || "AI (nome)" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-client-location error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
