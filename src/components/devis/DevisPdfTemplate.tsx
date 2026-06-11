import logoBanner from "@/assets/logo-banner.png";
import brazilWatermark from "@/assets/brazil-watermark.png";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

type Lang = "pt" | "fr" | "en" | "es";

const LABELS: Record<Lang, {
  title: string;
  parties: string; contractor: string; client: string;
  object: string; scope: string;
  fees: string; total: string; down: string; balance: string;
  deadline: string; deadlineLabel: string;
  signatures: string; witnesses: string;
  name: string; cpf: string; signature: string;
  page: string; of: string; document: string; address: string;
  contractorLabel: string; clientLabel: string;
}> = {
  pt: {
    title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ADVOCACIA",
    parties: "I. DA IDENTIFICAÇÃO DAS PARTES",
    contractor: "CONTRATADO",
    client: "CONTRATANTE",
    object: "II. DO OBJETO DO CONTRATO",
    scope: "Escopo de Serviços",
    fees: "III. HONORÁRIOS",
    total: "Valor Total",
    down: "Entrada (50%)",
    balance: "Saldo (50%) na conclusão",
    deadline: "IV. PRAZO",
    deadlineLabel: "Prazo estimado de execução",
    signatures: "ASSINATURAS",
    witnesses: "Testemunhas",
    name: "Nome",
    cpf: "CPF",
    signature: "Assinatura",
    page: "Página",
    of: "de",
    document: "Documento",
    address: "Endereço",
    contractorLabel: "CONTRATADO",
    clientLabel: "CONTRATANTE",
  },
  fr: {
    title: "CONTRAT DE PRESTATION DE SERVICES JURIDIQUES",
    parties: "I. IDENTIFICATION DES PARTIES",
    contractor: "CABINET",
    client: "CLIENT",
    object: "II. OBJET DU CONTRAT",
    scope: "Étendue des Services",
    fees: "III. HONORAIRES",
    total: "Montant Total",
    down: "Acompte (50%)",
    balance: "Solde (50%) à l'achèvement",
    deadline: "IV. DÉLAI",
    deadlineLabel: "Délai estimé d'exécution",
    signatures: "SIGNATURES",
    witnesses: "Témoins",
    name: "Nom",
    cpf: "CPF",
    signature: "Signature",
    page: "Page",
    of: "de",
    document: "Document",
    address: "Adresse",
    contractorLabel: "CABINET",
    clientLabel: "CLIENT",
  },
  en: {
    title: "LEGAL SERVICES AGREEMENT",
    parties: "I. IDENTIFICATION OF THE PARTIES",
    contractor: "LAW FIRM",
    client: "CLIENT",
    object: "II. OBJECT OF THE AGREEMENT",
    scope: "Scope of Services",
    fees: "III. FEES",
    total: "Total Amount",
    down: "Down Payment (50%)",
    balance: "Balance (50%) on completion",
    deadline: "IV. DEADLINE",
    deadlineLabel: "Estimated execution deadline",
    signatures: "SIGNATURES",
    witnesses: "Witnesses",
    name: "Name",
    cpf: "ID",
    signature: "Signature",
    page: "Page",
    of: "of",
    document: "Document",
    address: "Address",
    contractorLabel: "LAW FIRM",
    clientLabel: "CLIENT",
  },
  es: {
    title: "CONTRATO DE PRESTACIÓN DE SERVICIOS JURÍDICOS",
    parties: "I. IDENTIFICACIÓN DE LAS PARTES",
    contractor: "CONTRATADO",
    client: "CONTRATANTE",
    object: "II. OBJETO DEL CONTRATO",
    scope: "Alcance de los Servicios",
    fees: "III. HONORARIOS",
    total: "Valor Total",
    down: "Anticipo (50%)",
    balance: "Saldo (50%) a la conclusión",
    deadline: "IV. PLAZO",
    deadlineLabel: "Plazo estimado de ejecución",
    signatures: "FIRMAS",
    witnesses: "Testigos",
    name: "Nombre",
    cpf: "Documento",
    signature: "Firma",
    page: "Página",
    of: "de",
    document: "Documento",
    address: "Dirección",
    contractorLabel: "CONTRATADO",
    clientLabel: "CONTRATANTE",
  },
};

interface ScopeItem {
  letter: string;
  title: string;
  description?: string;
  amount?: number;
}

// extrai itens "a)" / "A)" do markdown da proposta
const parseScopeItems = (markdown?: string | null): ScopeItem[] => {
  if (!markdown) return [];
  const items: ScopeItem[] = [];
  const lines = markdown.split(/\r?\n/);
  let current: ScopeItem | null = null;
  const headerRx = /^\s*\**\s*([A-Za-z])[\)\.\:\-]\s+(.+?)(?:\s*[—–\-]\s*(?:BRL|R\$)\s*([\d\.,]+))?\**\s*$/;
  for (const raw of lines) {
    const line = raw.replace(/\*\*/g, "").trim();
    const m = line.match(headerRx);
    if (m) {
      if (current) items.push(current);
      const amountStr = m[3]?.replace(/\./g, "").replace(",", ".");
      current = {
        letter: m[1].toLowerCase(),
        title: m[2].trim(),
        description: "",
        amount: amountStr ? Number(amountStr) : undefined,
      };
    } else if (current && line) {
      current.description = (current.description ? current.description + " " : "") + line;
    }
  }
  if (current) items.push(current);
  return items;
};

const fromScopeItemsArray = (raw: any): ScopeItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((it: any, idx: number) => ({
    letter: String(it?.letter || String.fromCharCode(97 + idx)).toLowerCase(),
    title: String(it?.title || ""),
    description: String(it?.description || ""),
    amount: typeof it?.amount === "number" ? it.amount : undefined,
  }));
};

interface DevisPdfTemplateProps {
  devis: any;
  client: any;
  pricingItems?: any[];
  contractor?: {
    name: string;
    document: string;
    address: string;
  };
}

const DEFAULT_CONTRACTOR = {
  name: "LUNDGAARD JENSEN ADVOCACIA E CONSULTORIA INTERNACIONAL",
  document: "21.682.183/0001-42",
  address: "Rua João Cordeiro, nº 831, Praia de Iracema, Fortaleza/CE",
};

const FOOTER_TEXT =
  "Rua João Cordeiro, 831 – Praia de Iracema  |  +55 (85) 9 9406-6042  |  +55 (85) 9 3037-9931";
const BRAND_LINE = "lundgaardjensen.com  |  @lundgaard.jensen";

const BLUE = "#1e40af";
const GOLD = "#c8a96a";
const TEXT = "#1a1a1a";

// ===== layout chrome =====
const A4_W = 794;
const A4_H = 1123;
const PAD_TOP = 30;
const PAD_RIGHT = 56;
const PAD_BOTTOM = 60;
const PAD_LEFT = 70; // já considera a barra azul
const CONTENT_W = A4_W - PAD_LEFT - PAD_RIGHT;
const COL_GAP = 28;
const COL_W = (CONTENT_W - COL_GAP) / 2;

export default function DevisPdfTemplate({
  devis,
  client,
  pricingItems = [],
  contractor = DEFAULT_CONTRACTOR,
}: DevisPdfTemplateProps) {
  const secondaryLang = (devis?.secondary_language || null) as Lang | null;
  const isBilingual = !!secondaryLang && secondaryLang !== "pt";
  const LP = LABELS.pt;
  const LS = isBilingual ? LABELS[secondaryLang!] : null;

  const scopeItemsP =
    fromScopeItemsArray(devis?.scope_items).length > 0
      ? fromScopeItemsArray(devis.scope_items)
      : parseScopeItems(devis?.proposal_structure);
  const scopeItemsS = isBilingual
    ? fromScopeItemsArray(devis?.scope_items_secondary).length > 0
      ? fromScopeItemsArray(devis.scope_items_secondary)
      : parseScopeItems(devis?.proposal_structure_secondary)
    : [];

  const total = Number(devis?.total_amount) || 0;
  const down = Number(devis?.down_payment_amount) || total * 0.5;
  const balance = total - down;
  const devisNumber = devis?.devis_number || "DE———";

  // ----- styles -----
  const pageStyle: React.CSSProperties = {
    width: `${A4_W}px`,
    minHeight: `${A4_H}px`,
    background: "#ffffff",
    color: TEXT,
    fontFamily: "Georgia, 'Times New Roman', serif",
    position: "relative",
    boxSizing: "border-box",
    fontSize: "11px",
    lineHeight: 1.55,
    paddingTop: `${PAD_TOP}px`,
    paddingRight: `${PAD_RIGHT}px`,
    paddingBottom: `${PAD_BOTTOM}px`,
    paddingLeft: `${PAD_LEFT}px`,
    overflow: "hidden",
  };

  const secStyle: React.CSSProperties = {
    fontSize: "11.5px",
    fontWeight: 700,
    textTransform: "uppercase",
    textDecoration: "underline",
    margin: "14px 0 8px 0",
    color: TEXT,
    letterSpacing: "0.3px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
    textDecoration: "underline",
    margin: "0 0 14px 0",
    color: TEXT,
    textAlign: "center",
    letterSpacing: "0.4px",
  };


  const subStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    margin: "10px 0 4px 0",
  };

  const justified: React.CSSProperties = { textAlign: "justify", whiteSpace: "pre-wrap" };

  // ----- chrome shared parts -----
  const BlueBar = () => (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        width: "14px",
        background: BLUE,
      }}
    />
  );

  const Watermark = () => (
    <img
      src={brazilWatermark}
      alt=""
      crossOrigin="anonymous"
      style={{
        position: "absolute",
        right: "-40px",
        top: "180px",
        width: "640px",
        height: "640px",
        objectFit: "contain",
        opacity: 0.12,
        zIndex: 0,
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );

  const Header = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
    <div style={{ position: "relative", zIndex: 2, marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <img
          src={logoBanner}
          alt="Lundgaard Jensen"
          style={{ height: "52px", objectFit: "contain" }}
          crossOrigin="anonymous"
        />
        <div style={{ fontFamily: "Arial, sans-serif", fontSize: "10px", color: "#444", paddingTop: "8px" }}>
          {LP.page} {pageNum} {LP.of} {totalPages}
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${GOLD}`, marginTop: "6px" }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 0",
          fontFamily: "Arial, sans-serif",
          fontSize: "10.5px",
          color: "#1f2937",
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span>{BRAND_LINE}</span>
          <div style={{ display: "flex", gap: "4px" }}>
            {devis.devis_service_areas?.map((a: any) => (
              <span key={a.area_slug} style={{ fontSize: "8px", background: "#f3f4f6", padding: "1px 4px", borderRadius: "2px" }}>
                {a.area_slug.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
        <span style={{ fontWeight: 600, letterSpacing: "0.5px" }}>{devisNumber}</span>
      </div>
      <div style={{ borderTop: `1px solid ${GOLD}` }} />
    </div>
  );

  const Footer = () => (
    <div
      style={{
        position: "absolute",
        bottom: `${PAD_BOTTOM - 32}px`,
        left: `${PAD_LEFT}px`,
        right: `${PAD_RIGHT}px`,
        zIndex: 2,
      }}
    >
      <div style={{ borderTop: `1px solid ${GOLD}`, marginBottom: "8px" }} />
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: "10px",
          color: "#1f2937",
          textAlign: "center",
        }}
      >
        {FOOTER_TEXT}
      </div>
    </div>
  );

  // ----- conteúdo por idioma -----
  const renderColumn = (lang: "pt" | Lang, isSecondary: boolean) => {
    const L = isSecondary && LS ? LS : LP;
    const proposalText = isSecondary
      ? devis?.proposal_structure_secondary || ""
      : devis?.proposal_structure || "";
    const scopeDesc = isSecondary
      ? devis?.scope_description_secondary || devis?.scope_description || ""
      : devis?.scope_description || devis?.meeting_summary || "";
    const scope = isSecondary ? scopeItemsS : scopeItemsP;
    void lang;

    return (
      <div style={{ width: isBilingual ? `${COL_W}px` : `${CONTENT_W}px`, position: "relative", zIndex: 2 }}>
        <div style={titleStyle}>{L.title}</div>

        <div style={justified}>
          {isSecondary
            ? "Les parties ci-après qualifiées conviennent entre elles du présent Contrat de Prestation de Services Juridiques, lequel sera régi par les clauses ci-après stipulées, les engageant à respecter toutes les dispositions convenues."
            : "As partes abaixo qualificadas têm, entre si, justo e acertado, o presente Contrato de Prestação de Serviços de Advocacia, que será regido pelas cláusulas descritas no presente instrumento, obrigando-se a cumprir com todas as disposições aqui pactuadas."}
        </div>

        <div style={secStyle}>{L.parties}</div>
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontWeight: 700 }}>{L.client}:</div>
          <div>{client?.name || "—"}</div>
          {client?.document && (
            <div>{L.document}: {client.document}</div>
          )}
          {(client?.address || client?.city) && (
            <div>{L.address}: {[client?.address, client?.city].filter(Boolean).join(", ")}</div>
          )}
          {client?.email && <div>Email: {client.email}</div>}
          {client?.phone && <div>Tel: {client.phone}</div>}
        </div>
        <div>
          <div style={{ fontWeight: 700 }}>{L.contractor}:</div>
          <div style={justified}>
            <strong>{contractor.name}</strong>, {isSecondary
              ? `société d'avocats, inscrite au CNPJ sous le nº ${contractor.document}, dont le siège se situe ${contractor.address}, représentée par son associé Me Leonardo Carapeba Lundgaard Jensen, avocat inscrit au Barreau de l'État du Ceará (OAB/CE) sous le nº 20.985.`
              : `sociedade de advogados, inscrita no CNPJ sob o nº ${contractor.document}, localizada na ${contractor.address}, neste ato representada pelo sócio Leonardo Carapeba Lundgaard Jensen, brasileiro, casado, advogado, inscrito na OAB/CE sob o nº 20.985.`}
          </div>
        </div>

        <div style={secStyle}>{L.object}</div>
        <div style={justified}>{scopeDesc}</div>

        {scope.length > 0 && (
          <>
            <div style={subStyle}>{L.scope}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {scope.map((it, idx) => (
                <div key={`${it.letter}-${idx}`} style={{ ...justified }}>
                  <strong>
                    {it.letter}) {it.title}
                    {it.amount !== undefined ? ` — ${fmtBRL(it.amount)}` : ""}
                  </strong>
                  {it.description && <div style={{ marginTop: "2px" }}>{it.description}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        <div style={secStyle}>{L.fees}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{L.total}</span>
            <strong>{fmtBRL(total)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{L.down}</span>
            <span>{fmtBRL(down)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{L.balance}</span>
            <span>{fmtBRL(balance)}</span>
          </div>
        </div>

        <div style={secStyle}>{L.deadline}</div>
        <div>{L.deadlineLabel}: <strong>{fmtDate(devis?.deadline_date, isSecondary)}</strong></div>

        {!!proposalText && (
          <details style={{ marginTop: "10px", fontSize: "10px", color: "#444" }}>
            <summary style={{ cursor: "pointer" }}>—</summary>
          </details>
        )}
      </div>
    );
  };

  const ContentPage = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
    <div className="devis-pdf-page" style={pageStyle}>
      <BlueBar />
      <Watermark />
      <Header pageNum={pageNum} totalPages={totalPages} />
      <div style={{ position: "relative", zIndex: 2 }}>
        {isBilingual ? (
          <div style={{ display: "flex", gap: `${COL_GAP}px` }}>
            {renderColumn("pt", false)}
            {renderColumn(secondaryLang as Lang, true)}
          </div>
        ) : (
          renderColumn("pt", false)
        )}
      </div>
      <Footer />
    </div>
  );

  const SignaturesPage = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
    <div className="devis-pdf-page" style={{ ...pageStyle, pageBreakBefore: "always" }}>
      <BlueBar />
      <Watermark />
      <Header pageNum={pageNum} totalPages={totalPages} />

      <div style={{ position: "relative", zIndex: 2, marginTop: "60px", textAlign: "center" }}>
        <div style={{ borderTop: `1px solid ${TEXT}`, width: "70%", margin: "0 auto" }} />
        <div style={{ marginTop: "6px", fontWeight: 700, fontSize: "11px" }}>{contractor.name}</div>
        <div style={{ fontSize: "10px", color: "#444" }}>
          {LP.contractorLabel}{isBilingual && LS ? ` / ${LS.contractorLabel}` : ""}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, marginTop: "80px", textAlign: "center" }}>
        <div style={{ borderTop: `1px solid ${TEXT}`, width: "70%", margin: "0 auto" }} />
        <div style={{ marginTop: "6px", fontWeight: 700, fontSize: "11px" }}>{client?.name || "—"}</div>
        <div style={{ fontSize: "10px", color: "#444" }}>
          {LP.clientLabel}{isBilingual && LS ? ` / ${LS.clientLabel}` : ""}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, marginTop: "70px" }}>
        <div style={{ fontWeight: 700, fontSize: "11px" }}>
          {LP.witnesses}:{isBilingual && LS ? ` / ${LS.witnesses}` : ""}
        </div>
        <div style={{ display: "flex", gap: "40px", marginTop: "30px" }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ fontSize: "10.5px", lineHeight: 1.9 }}>
                <div><strong>{LP.name}:</strong> _____________________________</div>
                <div><strong>{LP.cpf}:</strong> _____________________________</div>
                <div><strong>{LP.signature}:</strong> _____________________________</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );

  const totalPages = 2;

  return (
    <div id="devis-pdf-root" style={{ background: "#fff" }}>
      <ContentPage pageNum={1} totalPages={totalPages} />
      <SignaturesPage pageNum={2} totalPages={totalPages} />
    </div>
  );
}

const fmtDate = (iso?: string | null, fr?: boolean) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return fr ? `${d}/${m}/${y}` : `${d}/${m}/${y}`;
};
