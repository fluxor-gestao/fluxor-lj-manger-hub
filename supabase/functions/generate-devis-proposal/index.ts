// Gera proposta jurídica (Devis) — IA gera o Escopo dos Serviços (Seção III) e sugere itens de precificação.
// As demais 10 cláusulas (I, II, IV–XI) vêm de um template fixo em PT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONTRACTORS: Record<string, { name: string; document: string; address: string; representative: string }> = {
  DE: {
    name: "LUNDGAARD JENSEN ADVOCACIA E CONSULTORIA INTERNACIONAL",
    document: "21.682.183/0001-42",
    address: "Rua João Cordeiro, nº 831, Praia de Iracema, Fortaleza/CE",
    representative: "Leonardo Carapeba Lundgaard Jensen, brasileiro, casado, advogado, inscrito na OAB/CE sob o nº 20.985",
  },
  CO: {
    name: "LUNDGAARD JENSEN CONTABILIDADE INTERNACIONAL",
    document: "21.682.183/0001-42",
    address: "Rua João Cordeiro, nº 831, Praia de Iracema, Fortaleza/CE",
    representative: "Leonardo Carapeba Lundgaard Jensen, brasileiro, casado, advogado, inscrito na OAB/CE sob o nº 20.985",
  },
  AM: {
    name: "LUNDGAARD JENSEN CONSULTORIA AMBIENTAL",
    document: "21.682.183/0001-42",
    address: "Rua João Cordeiro, nº 831, Praia de Iracema, Fortaleza/CE",
    representative: "Leonardo Carapeba Lundgaard Jensen, brasileiro, casado, advogado, inscrito na OAB/CE sob o nº 20.985",
  },
  IM: {
    name: "LUNDGAARD JENSEN CONSULTORIA IMOBILIÁRIA",
    document: "21.682.183/0001-42",
    address: "Rua João Cordeiro, nº 831, Praia de Iracema, Fortaleza/CE",
    representative: "Leonardo Carapeba Lundgaard Jensen, brasileiro, casado, advogado, inscrito na OAB/CE sob o nº 20.985",
  },
  GE: {
    name: "LUNDGAARD JENSEN GESTÃO INTERNACIONAL",
    document: "21.682.183/0001-42",
    address: "Rua João Cordeiro, nº 831, Praia de Iracema, Fortaleza/CE",
    representative: "Leonardo Carapeba Lundgaard Jensen, brasileiro, casado, advogado, inscrito na OAB/CE sob o nº 20.985",
  },
};

const DEFAULT_CONTRACTOR = CONTRACTORS.DE;

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

interface ScopeItem {
  letter: string;
  title: string;
  description: string;
  deliverables?: string[];
  stakeholders?: string[];
  success_metrics?: string[];
  duration?: string;
  amount: number;
}

function renderScopeItems(items: ScopeItem[]): string {
  return items
    .map((it) => {
      const head = `**${(it.letter || "").toUpperCase()}) ${it.title} — ${fmtBRL(it.amount)}**`;
      const lines = [head];
      if (it.description) lines.push(`*Descrição:* ${it.description}`);
      if (it.deliverables?.length) lines.push(`*Entregáveis:* ${it.deliverables.join("; ")}.`);
      if (it.stakeholders?.length) lines.push(`*Partes envolvidas:* ${it.stakeholders.join("; ")}.`);
      if (it.success_metrics?.length)
        lines.push(`*Indicadores de sucesso:* ${it.success_metrics.join("; ")}.`);
      if (it.duration) lines.push(`*Prazo:* ${it.duration}.`);
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildProposalMarkdown(args: {
  business_unit?: string;
  title: string;
  client_name?: string;
  client_document?: string;
  client_address?: string;
  scope_description: string;
  scope_items: ScopeItem[];
  total_amount: number;
  down_payment_amount: number;
  deadline_date?: string | null;
}): string {
  const {
    title,
    client_name,
    client_document,
    client_address,
    scope_description,
    scope_items,
    total_amount,
    down_payment_amount,
    deadline_date,
  } = args;
  const balance = Math.max(total_amount - down_payment_amount, 0);
  const clientLines = [
    `- **CONTRATANTE:** ${client_name || "{nome do cliente}"}`,
    client_document ? `  - Documento: ${client_document}` : "",
    client_address ? `  - Endereço: ${client_address}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const contractor = CONTRACTORS[args.business_unit || "DE"] || DEFAULT_CONTRACTOR;

  return `# ${title}

## I. Identificação das Partes
- **CONTRATADO:** ${contractor.name}, sociedade de advogados inscrita no CNPJ sob o nº ${contractor.document}, com sede na ${contractor.address}, neste ato representada pelo sócio ${contractor.representative}.
${clientLines}

## II. Objeto do Contrato
O presente contrato tem por objeto a prestação, pelo CONTRATADO ao CONTRATANTE, dos serviços jurídicos e de consultoria detalhados na Seção III abaixo. ${scope_description}

## III. Escopo dos Serviços
${renderScopeItems(scope_items)}

## IV. Honorários
- **Valor Total:** ${fmtBRL(total_amount)}.
- **Entrada (50%) na assinatura:** ${fmtBRL(down_payment_amount)}.
- **Saldo (50%) na conclusão dos serviços:** ${fmtBRL(balance)}.
- Em caso de execução superior a 12 (doze) meses, os valores remanescentes serão reajustados pela variação acumulada do IPCA/IBGE no período.

## V. Forma de Pagamento
Os pagamentos serão realizados via PIX ou transferência bancária para conta de titularidade do CONTRATADO, em até 5 (cinco) dias úteis contados da emissão da respectiva cobrança. A entrada de 50% é condição para o início da execução; o saldo de 50% é devido na entrega final ou conforme cronograma específico previamente acordado entre as partes.

## VI. Obrigações do Contratado
O CONTRATADO obriga-se a: (a) executar os serviços com zelo, diligência profissional e observância da legislação aplicável e das normas da OAB; (b) manter sigilo absoluto sobre informações, documentos e dados a que tiver acesso; (c) manter o CONTRATANTE informado sobre o andamento dos trabalhos por meio de relatórios periódicos; (d) empregar profissionais qualificados para a condução do objeto; (e) entregar os produtos jurídicos contratados dentro dos prazos estabelecidos na Seção III.

## VII. Obrigações do Contratante
O CONTRATANTE obriga-se a: (a) fornecer, em tempo hábil, todos os documentos, dados e informações necessários à execução dos serviços; (b) prestar esclarecimentos e tomar decisões tempestivas sempre que solicitado; (c) efetuar os pagamentos nas datas e condições pactuadas; (d) custear despesas de terceiros eventualmente necessárias (notário, tradutor juramentado, taxas, custas judiciais, peritos), salvo quando expressamente incluídas no escopo.

## VIII. Limitação de Escopo
Os serviços contratados restringem-se ao objeto descrito na Seção III. Quaisquer atos, peças, diligências, audiências, recursos, pareceres adicionais ou demandas judiciais não expressamente previstos neste instrumento configuram serviços extraordinários, sujeitos a aditivo contratual com honorários específicos. O CONTRATADO não assume obrigação de resultado, mas de meio, comprometendo-se com a melhor técnica e diligência profissional aplicáveis.

## IX. Rescisão
O presente contrato poderá ser rescindido: (a) por comum acordo entre as partes, mediante distrato escrito; (b) por inadimplemento de qualquer obrigação contratual, após notificação com prazo de 10 (dez) dias para purgação da mora; (c) unilateralmente por qualquer das partes, mediante aviso prévio de 30 (trinta) dias. Em qualquer hipótese de rescisão, são devidos ao CONTRATADO os honorários proporcionais aos serviços efetivamente prestados até a data da rescisão, bem como o reembolso de despesas comprovadamente incorridas.

## X. Foro
Fica eleito o foro da Comarca de Fortaleza/CE para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.${deadline_date ? `\n\n*Prazo estimado de execução: até ${deadline_date}.*` : ""}

## XI. Assinaturas
As partes assinam o presente instrumento em via eletrônica, juntamente com 2 (duas) testemunhas, declarando ter lido e concordado com todas as cláusulas e condições aqui pactuadas.
`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      meeting_report,
      client_name,
      client_document,
      client_address,
      total_amount,
      deadline_date,
      tier,
    } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");
    if (!meeting_report) throw new Error("meeting_report é obrigatório");

    const model = tier === "final" ? "gpt-5" : "gpt-5-mini";
    const hasTotal = typeof total_amount === "number" && total_amount > 0;

    const systemPrompt = `Você é advogado(a) sênior de Lundgaard Jensen, redator(a) de propostas comerciais jurídicas (devis) em português do Brasil (pt-BR).

Sua tarefa NÃO é redigir o contrato inteiro. As cláusulas padrão (I, II, IV–XI) são geradas por template fixo pelo sistema. Você é responsável APENAS por:
1. "title" — título da proposta (1 linha, em pt-BR, descritivo do escopo).
2. "scope_description" — resumo executivo do objeto (2 a 4 frases densas, em pt-BR), citando fatos concretos do relatório.
3. "scope_items" — lista A/B/C... (3 a 6 itens) com title, description (3–6 frases), deliverables, stakeholders, success_metrics, duration (prazo da etapa) e amount (BRL, > 0).
4. "total_amount" — soma EXATA dos amounts dos scope_items.

REGRAS DE IDIOMA (CRÍTICO):
- TODOS os textos (title, scope_description, scope_items.*) devem ser ESCRITOS EM PORTUGUÊS DO BRASIL (pt-BR) PURO.
- Se o relatório da reunião estiver em outro idioma (francês, inglês, espanhol), TRADUZA o conteúdo para pt-BR antes de redigir.
- PROIBIDO usar palavras estrangeiras no texto final: "Proposition", "lieu", "honoraires", "fees", "scope", "deliverables", "stakeholders" (use "partes envolvidas"), "propuesta", "report", "due diligence" sozinho (use "auditoria/due diligence").
- PROIBIDO termos em francês ("apostille" → "apostilamento"; "notaire" → "tabelião/notário"; "mairie" → "prefeitura"; "Chambre des Notaires" → "Câmara de Notários"), inglês ou espanhol — sempre traduza para pt-BR.
- PROIBIDO placeholders: [...], {...}, <...>, «...», "lorem", "TBD", "XXX".
- PROIBIDO formato bilíngue ou barras "/" separando idiomas.

REGRAS GERAIS:
- Tom jurídico formal, parágrafos densos.
- Personalize tudo com base no relatório da reunião. NUNCA texto genérico.
- ${
      hasTotal
        ? `O valor total foi definido pelo cliente: R$ ${total_amount}. Distribua proporcionalmente entre os itens; soma DEVE ser EXATAMENTE ${total_amount}.`
        : `Estime valores de mercado brasileiros plausíveis (BRL): due diligence imobiliária 15.000–60.000; constituição societária 8.000–25.000; licenciamento urbanístico 10.000–40.000; consultoria/negociação 5.000–20.000; pareceres 4.000–15.000; coordenação multidisciplinar 5.000–15.000.`
    }
- VALOR ZERO PROIBIDO em qualquer scope_items[].amount.

TABELA DE PREÇOS OFICIAL (USE COMO REFERÊNCIA OBRIGATÓRIA PARA VALORES):
- Abertura de Empresa / PJ: R$ 3.000,00
- Abertura de IPTU / ITR: R$ 3.000,00
- Abertura de Conta Corrente (PF ou PJ): R$ 1,000.00
- Abertura de PJ estrangeira: R$ 1.200,00
- Due Diligence: a partir de R$ 3.500,00
- Visto Investimento: R$ 7.500,00
- Visto Imobiliário: R$ 7.000,00
- Visto Administrador / Aposentadoria / Nômade Digital: R$ 6.400,00 - R$ 6.500,00
- Visto Reunião Familiar / Trabalho / Mercosul: R$ 3.000,00 - R$ 4.000,00
- Registro de Marca: R$ 2.500,00
- Aditivos / Contrato de Mútuo: R$ 1.200,00 - R$ 1.300,00
- Naturalização: R$ 8.500,00
- Consultoria / Parecer Técnico: R$ 3.750,00 - R$ 7.500,00
- Administração Mensal: R$ 1.350,00
- Contabilidade Mensal: R$ 945,00 - R$ 1.770,00 (conforme nº funcionários)
- Certificado Digital: R$ 300,00
- Alvarás / Autorizações Ambientais: R$ 5.000,00 - R$ 7.500,00
- Estudos Ambientais (EAS/EAI/EVA): R$ 4.500,00
- Unificação / Desmembramento de Matrículas: R$ 2.000,00 - R$ 6.000,00
- Negociação Imobiliária: R$ 2.000,00
- Escritura / Registro de Imóvel (Acompanhamento): R$ 1.700,00`;

    const userPrompt = `Relatório da reunião${client_name ? ` com o cliente "${client_name}"` : ""}:

${meeting_report}

${hasTotal ? `Valor total alvo: R$ ${total_amount}` : "Sem valor definido — estime conforme faixas."}

Gere APENAS title, scope_description, scope_items (A/B/C...) e total_amount. NÃO gere as demais seções do contrato — elas são montadas por template fixo pelo sistema.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_scope",
              description: "Gera apenas o escopo da proposta (título, resumo, itens).",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  service_type: { type: "string" },
                  responsible_sector: { type: "string" },
                  scope_description: { type: "string" },
                  scope_items: {
                    type: "array",
                    minItems: 3,
                    items: {
                      type: "object",
                      properties: {
                        letter: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        deliverables: { type: "array", items: { type: "string" } },
                        stakeholders: { type: "array", items: { type: "string" } },
                        success_metrics: { type: "array", items: { type: "string" } },
                        duration: { type: "string" },
                        amount: { type: "number", exclusiveMinimum: 0 },
                      },
                      required: ["letter", "title", "description", "duration", "amount"],
                    },
                  },
                  total_amount: { type: "number", exclusiveMinimum: 0 },
                  deadline_date: { type: "string" },
                  payment_terms: { type: "string" },
                  assumptions: { type: "array", items: { type: "string" } },
                },
                required: ["title", "scope_description", "scope_items", "total_amount"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_scope" } },
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições da OpenAI atingido. Tente novamente em instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 401) {
      return new Response(JSON.stringify({ error: "Chave OPENAI_API_KEY inválida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("OpenAI error:", response.status, t);
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta sem tool_call");
    const ai = JSON.parse(toolCall.function.arguments);

    // ---- Pós-processamento: remover placeholders e detectar idioma estrangeiro ----
    const FOREIGN_TOKENS = /\b(Proposition|Proposal|Propuesta|honoraires|Honoraires|fees|Fees|scope|Scope|deliverables|stakeholders|notaire|Notaire|mairie|Mairie|apostille|Apostille|Chambre|propuesta)\b/;
    const scrub = (s: string): string => {
      if (!s) return s;
      return s
        .replace(/\[([^\]]*)\]/g, "$1") // remove colchetes mantendo conteúdo
        .replace(/\{([^}]*)\}/g, "$1") // remove chaves mantendo conteúdo
        .replace(/«\s*([^»]*)\s*»/g, "$1") // remove guillemets franceses
        .replace(/\s{2,}/g, " ")
        .trim();
    };
    if (typeof ai.title === "string") ai.title = scrub(ai.title);
    if (typeof ai.scope_description === "string") ai.scope_description = scrub(ai.scope_description);
    const scopeItems: ScopeItem[] = (Array.isArray(ai.scope_items) ? ai.scope_items : []).map((it: any) => ({
      ...it,
      title: typeof it.title === "string" ? scrub(it.title) : it.title,
      description: typeof it.description === "string" ? scrub(it.description) : it.description,
      duration: typeof it.duration === "string" ? scrub(it.duration) : it.duration,
      deliverables: Array.isArray(it.deliverables) ? it.deliverables.map((d: any) => typeof d === "string" ? scrub(d) : d) : it.deliverables,
      stakeholders: Array.isArray(it.stakeholders) ? it.stakeholders.map((d: any) => typeof d === "string" ? scrub(d) : d) : it.stakeholders,
      success_metrics: Array.isArray(it.success_metrics) ? it.success_metrics.map((d: any) => typeof d === "string" ? scrub(d) : d) : it.success_metrics,
    }));
    // Fallback de título se contiver token estrangeiro
    let finalTitle = ai.title || "Proposta de Prestação de Serviços Jurídicos";
    if (FOREIGN_TOKENS.test(finalTitle)) {
      console.warn("Título com token estrangeiro detectado, aplicando fallback:", finalTitle);
      finalTitle = "Proposta de Prestação de Serviços Jurídicos e Consultoria";
    }

    const computedTotal = scopeItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const finalTotal = hasTotal ? Number(total_amount) : Number(ai.total_amount) || computedTotal;
    const downPayment = +(finalTotal * 0.5).toFixed(2);

    const proposal_structure = buildProposalMarkdown({
      business_unit: args.business_unit,
      title: finalTitle,
      client_name,
      client_document,
      client_address,
      scope_description: ai.scope_description || "",
      scope_items: scopeItems,
      total_amount: finalTotal,
      down_payment_amount: downPayment,
      deadline_date: deadline_date || ai.deadline_date || null,
    });

    const proposal = {
      title: finalTitle,
      service_type: ai.service_type,
      responsible_sector: ai.responsible_sector,
      scope_description: ai.scope_description,
      scope_items: scopeItems,
      total_amount: finalTotal,
      deadline_date: ai.deadline_date || deadline_date || null,
      payment_terms:
        ai.payment_terms ||
        "50% na assinatura via PIX/transferência; 50% na conclusão. Reajuste pelo IPCA acima de 12 meses.",
      assumptions: ai.assumptions || [],
      proposal_structure,
    };

    return new Response(JSON.stringify({ proposal, model_used: model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-devis-proposal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
