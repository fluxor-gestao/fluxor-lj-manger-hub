import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  FileText,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertTriangle,
  AlertOctagon,
  Upload,
  FileUp,
  Loader2,
  CheckCircle2,
  Languages,
  Hash,
  Tag,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFinanceiroCatalogs } from "@/hooks/useFinanceiroCatalogs";

export const Route = createFileRoute("/_authenticated/financeiro/rapport")({
  component: RapportPage,
});

// ============================================================
// i18n
// ============================================================
type Lang = "pt" | "en" | "es" | "fr" | "de" | "it";

const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: "pt", label: "Português", flag: "🇧🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
];

const T: Record<Lang, Record<string, string>> = {
  pt: {
    title: "Rapport",
    subtitle: "Relatório mensal a partir do extrato bancário do cliente",
    back: "Voltar",
    config: "Configuração do Rapport",
    configDesc: "Selecione cliente, mês, idioma e envie o extrato bancário",
    client: "Cliente",
    selectClient: "Selecione o cliente",
    month: "Mês de referência",
    language: "Idioma do relatório",
    upload: "Extrato bancário",
    uploadHint: "PDF, CSV, XLS ou XLSX",
    uploadDrop: "Clique ou arraste o arquivo aqui",
    processStatement: "Processar extrato",
    processing: "Processando…",
    processed: "Extrato processado",
    generate: "Gerar Rapport",
    copySummary: "Copiar resumo",
    exportPdf: "Exportar PDF",
    sendClient: "Enviar ao cliente",
    initial: "Saldo inicial",
    totalIn: "Total de entradas",
    totalOut: "Total de saídas",
    net: "Saldo líquido",
    final: "Saldo final",
    count: "Movimentações",
    chartBalance: "Evolução do saldo no período",
    chartWeek: "Entradas x Saídas por semana",
    topIn: "Maiores entradas",
    topOut: "Maiores saídas",
    catOut: "Saídas por categoria sugerida",
    catIn: "Entradas por origem sugerida",
    transactions: "Movimentações",
    colDate: "Data",
    colDesc: "Descrição",
    colType: "Tipo",
    colAmount: "Valor",
    colCategory: "Categoria",
    colNote: "Observação",
    typeIn: "Entrada",
    typeOut: "Saída",
    summary: "Resumo do Rapport",
    summaryDesc: "Análise simples e clara para o cliente",
    attention: "Itens de atenção",
    attentionDesc: "Pontos que merecem revisão neste período",
    noData: "Envie um extrato e clique em Processar para começar",
    waitGenerate: "Clique em Gerar Rapport para visualizar a análise",
    autogen: "gerado automaticamente",
    week: "Semana",
    in: "entradas",
    out: "saídas",
    noneAtt: "Nenhum ponto crítico identificado no período.",
    fileSelected: "Arquivo carregado",
  },
  en: {
    title: "Rapport",
    subtitle: "Monthly report based on the client's bank statement",
    back: "Back",
    config: "Rapport configuration",
    configDesc: "Select client, month, language and upload the bank statement",
    client: "Client",
    selectClient: "Select client",
    month: "Reference month",
    language: "Report language",
    upload: "Bank statement",
    uploadHint: "PDF, CSV, XLS or XLSX",
    uploadDrop: "Click or drag the file here",
    processStatement: "Process statement",
    processing: "Processing…",
    processed: "Statement processed",
    generate: "Generate Rapport",
    copySummary: "Copy summary",
    exportPdf: "Export PDF",
    sendClient: "Send to client",
    initial: "Opening balance",
    totalIn: "Total inflows",
    totalOut: "Total outflows",
    net: "Net balance",
    final: "Closing balance",
    count: "Transactions",
    chartBalance: "Balance evolution",
    chartWeek: "Inflows vs Outflows by week",
    topIn: "Top inflows",
    topOut: "Top outflows",
    catOut: "Outflows by suggested category",
    catIn: "Inflows by suggested origin",
    transactions: "Transactions",
    colDate: "Date",
    colDesc: "Description",
    colType: "Type",
    colAmount: "Amount",
    colCategory: "Category",
    colNote: "Note",
    typeIn: "Inflow",
    typeOut: "Outflow",
    summary: "Rapport summary",
    summaryDesc: "Simple and clear analysis for the client",
    attention: "Attention items",
    attentionDesc: "Points worth reviewing this period",
    noData: "Upload a statement and click Process to start",
    waitGenerate: "Click Generate Rapport to view the analysis",
    autogen: "auto-generated",
    week: "Week",
    in: "inflows",
    out: "outflows",
    noneAtt: "No critical points identified in the period.",
    fileSelected: "File loaded",
  },
  es: {
    title: "Rapport",
    subtitle: "Informe mensual basado en el extracto bancario del cliente",
    back: "Volver",
    config: "Configuración del Rapport",
    configDesc: "Seleccione cliente, mes, idioma y suba el extracto bancario",
    client: "Cliente",
    selectClient: "Seleccione el cliente",
    month: "Mes de referencia",
    language: "Idioma del informe",
    upload: "Extracto bancario",
    uploadHint: "PDF, CSV, XLS o XLSX",
    uploadDrop: "Haga clic o arrastre el archivo aquí",
    processStatement: "Procesar extracto",
    processing: "Procesando…",
    processed: "Extracto procesado",
    generate: "Generar Rapport",
    copySummary: "Copiar resumen",
    exportPdf: "Exportar PDF",
    sendClient: "Enviar al cliente",
    initial: "Saldo inicial",
    totalIn: "Total de entradas",
    totalOut: "Total de salidas",
    net: "Saldo neto",
    final: "Saldo final",
    count: "Movimientos",
    chartBalance: "Evolución del saldo",
    chartWeek: "Entradas vs Salidas por semana",
    topIn: "Mayores entradas",
    topOut: "Mayores salidas",
    catOut: "Salidas por categoría sugerida",
    catIn: "Entradas por origen sugerido",
    transactions: "Movimientos",
    colDate: "Fecha",
    colDesc: "Descripción",
    colType: "Tipo",
    colAmount: "Importe",
    colCategory: "Categoría",
    colNote: "Nota",
    typeIn: "Entrada",
    typeOut: "Salida",
    summary: "Resumen del Rapport",
    summaryDesc: "Análisis simple y claro para el cliente",
    attention: "Puntos de atención",
    attentionDesc: "Aspectos a revisar en este período",
    noData: "Suba un extracto y haga clic en Procesar para comenzar",
    waitGenerate: "Haga clic en Generar Rapport para ver el análisis",
    autogen: "generado automáticamente",
    week: "Semana",
    in: "entradas",
    out: "salidas",
    noneAtt: "No se identificaron puntos críticos en el período.",
    fileSelected: "Archivo cargado",
  },
  fr: {
    title: "Rapport",
    subtitle: "Rapport mensuel basé sur le relevé bancaire du client",
    back: "Retour",
    config: "Configuration du Rapport",
    configDesc: "Sélectionnez client, mois, langue et téléversez le relevé",
    client: "Client",
    selectClient: "Sélectionner le client",
    month: "Mois de référence",
    language: "Langue du rapport",
    upload: "Relevé bancaire",
    uploadHint: "PDF, CSV, XLS ou XLSX",
    uploadDrop: "Cliquez ou glissez le fichier ici",
    processStatement: "Traiter le relevé",
    processing: "Traitement…",
    processed: "Relevé traité",
    generate: "Générer le Rapport",
    copySummary: "Copier le résumé",
    exportPdf: "Exporter PDF",
    sendClient: "Envoyer au client",
    initial: "Solde initial",
    totalIn: "Total des entrées",
    totalOut: "Total des sorties",
    net: "Solde net",
    final: "Solde final",
    count: "Mouvements",
    chartBalance: "Évolution du solde",
    chartWeek: "Entrées vs Sorties par semaine",
    topIn: "Principales entrées",
    topOut: "Principales sorties",
    catOut: "Sorties par catégorie suggérée",
    catIn: "Entrées par origine suggérée",
    transactions: "Mouvements",
    colDate: "Date",
    colDesc: "Description",
    colType: "Type",
    colAmount: "Montant",
    colCategory: "Catégorie",
    colNote: "Note",
    typeIn: "Entrée",
    typeOut: "Sortie",
    summary: "Résumé du Rapport",
    summaryDesc: "Analyse simple et claire pour le client",
    attention: "Points d'attention",
    attentionDesc: "Points à examiner pour cette période",
    noData: "Téléversez un relevé puis cliquez sur Traiter",
    waitGenerate: "Cliquez sur Générer le Rapport pour voir l'analyse",
    autogen: "généré automatiquement",
    week: "Semaine",
    in: "entrées",
    out: "sorties",
    noneAtt: "Aucun point critique identifié sur la période.",
    fileSelected: "Fichier chargé",
  },
  de: {
    title: "Rapport",
    subtitle: "Monatsbericht basierend auf dem Kontoauszug des Kunden",
    back: "Zurück",
    config: "Rapport-Konfiguration",
    configDesc: "Kunde, Monat, Sprache wählen und Kontoauszug hochladen",
    client: "Kunde",
    selectClient: "Kunde auswählen",
    month: "Referenzmonat",
    language: "Berichtssprache",
    upload: "Kontoauszug",
    uploadHint: "PDF, CSV, XLS oder XLSX",
    uploadDrop: "Datei hierher klicken oder ziehen",
    processStatement: "Auszug verarbeiten",
    processing: "Verarbeitung…",
    processed: "Auszug verarbeitet",
    generate: "Rapport erstellen",
    copySummary: "Zusammenfassung kopieren",
    exportPdf: "PDF exportieren",
    sendClient: "An Kunde senden",
    initial: "Anfangssaldo",
    totalIn: "Eingänge gesamt",
    totalOut: "Ausgänge gesamt",
    net: "Nettosaldo",
    final: "Endsaldo",
    count: "Bewegungen",
    chartBalance: "Saldoentwicklung",
    chartWeek: "Eingänge vs Ausgänge pro Woche",
    topIn: "Größte Eingänge",
    topOut: "Größte Ausgänge",
    catOut: "Ausgänge nach vorgeschlagener Kategorie",
    catIn: "Eingänge nach vorgeschlagener Herkunft",
    transactions: "Bewegungen",
    colDate: "Datum",
    colDesc: "Beschreibung",
    colType: "Typ",
    colAmount: "Betrag",
    colCategory: "Kategorie",
    colNote: "Notiz",
    typeIn: "Eingang",
    typeOut: "Ausgang",
    summary: "Rapport-Zusammenfassung",
    summaryDesc: "Einfache und klare Analyse für den Kunden",
    attention: "Aufmerksamkeitspunkte",
    attentionDesc: "Punkte, die in diesem Zeitraum überprüft werden sollten",
    noData: "Auszug hochladen und auf Verarbeiten klicken",
    waitGenerate: "Klicken Sie auf Rapport erstellen für die Analyse",
    autogen: "automatisch generiert",
    week: "Woche",
    in: "Eingänge",
    out: "Ausgänge",
    noneAtt: "Keine kritischen Punkte im Zeitraum festgestellt.",
    fileSelected: "Datei geladen",
  },
  it: {
    title: "Rapport",
    subtitle: "Report mensile basato sull'estratto conto del cliente",
    back: "Indietro",
    config: "Configurazione del Rapport",
    configDesc: "Seleziona cliente, mese, lingua e carica l'estratto conto",
    client: "Cliente",
    selectClient: "Seleziona il cliente",
    month: "Mese di riferimento",
    language: "Lingua del report",
    upload: "Estratto conto",
    uploadHint: "PDF, CSV, XLS o XLSX",
    uploadDrop: "Clicca o trascina il file qui",
    processStatement: "Elabora estratto",
    processing: "Elaborazione…",
    processed: "Estratto elaborato",
    generate: "Genera Rapport",
    copySummary: "Copia riepilogo",
    exportPdf: "Esporta PDF",
    sendClient: "Invia al cliente",
    initial: "Saldo iniziale",
    totalIn: "Totale entrate",
    totalOut: "Totale uscite",
    net: "Saldo netto",
    final: "Saldo finale",
    count: "Movimenti",
    chartBalance: "Andamento del saldo",
    chartWeek: "Entrate vs Uscite per settimana",
    topIn: "Maggiori entrate",
    topOut: "Maggiori uscite",
    catOut: "Uscite per categoria suggerita",
    catIn: "Entrate per origine suggerita",
    transactions: "Movimenti",
    colDate: "Data",
    colDesc: "Descrizione",
    colType: "Tipo",
    colAmount: "Importo",
    colCategory: "Categoria",
    colNote: "Nota",
    typeIn: "Entrata",
    typeOut: "Uscita",
    summary: "Riepilogo del Rapport",
    summaryDesc: "Analisi semplice e chiara per il cliente",
    attention: "Punti di attenzione",
    attentionDesc: "Aspetti da rivedere in questo periodo",
    noData: "Carica un estratto e clicca su Elabora",
    waitGenerate: "Clicca su Genera Rapport per vedere l'analisi",
    autogen: "generato automaticamente",
    week: "Settimana",
    in: "entrate",
    out: "uscite",
    noneAtt: "Nessun punto critico identificato nel periodo.",
    fileSelected: "File caricato",
  },
};

// ============================================================
// helpers
// ============================================================
type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: "entrada" | "saida";
  amount: number;
  suggestedCategory: string;
  note?: string;
};

const fmtCurrency = (n: number, lang: Lang) => {
  const locale =
    lang === "pt"
      ? "pt-BR"
      : lang === "en"
      ? "en-US"
      : lang === "es"
      ? "es-ES"
      : lang === "fr"
      ? "fr-FR"
      : lang === "de"
      ? "de-DE"
      : "it-IT";
  const currency = lang === "en" ? "USD" : lang === "pt" ? "BRL" : "EUR";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(n || 0);
};

const fmtDate = (iso: string, lang: Lang) => {
  const locale =
    lang === "pt"
      ? "pt-BR"
      : lang === "en"
      ? "en-US"
      : lang === "es"
      ? "es-ES"
      : lang === "fr"
      ? "fr-FR"
      : lang === "de"
      ? "de-DE"
      : "it-IT";
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

const fmtMonth = (key: string, lang: Lang) => {
  const [y, m] = key.split("-").map(Number);
  const locale =
    lang === "pt"
      ? "pt-BR"
      : lang === "en"
      ? "en-US"
      : lang === "es"
      ? "es-ES"
      : lang === "fr"
      ? "fr-FR"
      : lang === "de"
      ? "de-DE"
      : "it-IT";
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Deterministic pseudo-random
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function mockTransactions(month: string, clientId: string): Transaction[] {
  const seed =
    month.split("").reduce((a, c) => a + c.charCodeAt(0), 0) +
    clientId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rnd = seeded(seed || 42);
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  const inflowTemplates = [
    { d: "PIX RECEBIDO - CLIENTE A", cat: "Vendas" },
    { d: "TED RECEBIDA", cat: "Vendas" },
    { d: "BOLETO LIQUIDADO 88123", cat: "Cobranças" },
    { d: "DEPÓSITO EM CONTA", cat: "Outros" },
    { d: "ESTORNO TAXA", cat: "Estornos" },
    { d: "PIX RECEBIDO - CLIENTE B", cat: "Vendas" },
  ];
  const outflowTemplates = [
    { d: "PAGAMENTO FORNECEDOR ALPHA", cat: "Fornecedores" },
    { d: "FOLHA DE PAGAMENTO", cat: "Pessoal" },
    { d: "ALUGUEL ESCRITÓRIO", cat: "Infraestrutura" },
    { d: "ENERGIA ELÉTRICA", cat: "Utilidades" },
    { d: "TARIFA BANCÁRIA", cat: "Taxas" },
    { d: "INTERNET / TELEFONIA", cat: "Utilidades" },
    { d: "MARKETING DIGITAL", cat: "Marketing" },
    { d: "IMPOSTOS DARF", cat: "Impostos" },
    { d: "PIX ENVIADO - FORNECEDOR BETA", cat: "Fornecedores" },
    { d: "ASSINATURA SOFTWARE", cat: "Software" },
  ];

  const out: Transaction[] = [];
  const nIn = 5 + Math.floor(rnd() * 4); // 5–8
  const nOut = 9 + Math.floor(rnd() * 5); // 9–13

  for (let i = 0; i < nIn; i++) {
    const t = inflowTemplates[Math.floor(rnd() * inflowTemplates.length)];
    const day = 1 + Math.floor(rnd() * daysInMonth);
    out.push({
      id: `in-${i}`,
      date: `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      description: t.d,
      type: "entrada",
      amount: Math.round((1500 + rnd() * 18000) * 100) / 100,
      suggestedCategory: t.cat,
    });
  }
  for (let i = 0; i < nOut; i++) {
    const t = outflowTemplates[Math.floor(rnd() * outflowTemplates.length)];
    const day = 1 + Math.floor(rnd() * daysInMonth);
    out.push({
      id: `out-${i}`,
      date: `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      description: t.d,
      type: "saida",
      amount: Math.round((200 + rnd() * 9000) * 100) / 100,
      suggestedCategory: t.cat,
    });
  }

  // Possible duplicate (for attention rule)
  if (rnd() > 0.5 && out.length > 2) {
    const ref = out.find((t) => t.type === "saida");
    if (ref) {
      out.push({
        ...ref,
        id: "dup-1",
        date: ref.date,
        note: "Possível duplicidade",
      });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================
// component
// ============================================================
function RapportPage() {
  const navigate = useNavigate();
  const cats = useFinanceiroCatalogs();
  const clients = cats.clients ?? [];

  const now = new Date();
  const [clientId, setClientId] = useState<string>("");
  const [month, setMonth] = useState<string>(monthKey(now));
  const [language, setLanguage] = useState<Lang>("pt");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "ready">("idle");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [generated, setGenerated] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = T[language];

  // -------- aggregations --------
  const agg = useMemo(() => {
    const inflows = transactions.filter((x) => x.type === "entrada");
    const outflows = transactions.filter((x) => x.type === "saida");
    const totalIn = inflows.reduce((s, x) => s + x.amount, 0);
    const totalOut = outflows.reduce((s, x) => s + x.amount, 0);
    const net = totalIn - totalOut;
    const finalBalance = openingBalance + net;

    // daily balance series
    const sorted = [...transactions].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    let bal = openingBalance;
    const balanceSeries: { date: string; saldo: number }[] = [
      { date: "início", saldo: Math.round(openingBalance) },
    ];
    const byDay = new Map<string, number>();
    for (const tx of sorted) {
      const delta = tx.type === "entrada" ? tx.amount : -tx.amount;
      byDay.set(tx.date, (byDay.get(tx.date) ?? 0) + delta);
    }
    Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([d, delta]) => {
        bal += delta;
        balanceSeries.push({ date: fmtDate(d, language), saldo: Math.round(bal) });
      });

    // weekly buckets
    const weekMap = new Map<number, { entradas: number; saidas: number }>();
    for (const tx of transactions) {
      const day = Number(tx.date.split("-")[2]);
      const wk = Math.min(5, Math.ceil(day / 7));
      const cur = weekMap.get(wk) ?? { entradas: 0, saidas: 0 };
      if (tx.type === "entrada") cur.entradas += tx.amount;
      else cur.saidas += tx.amount;
      weekMap.set(wk, cur);
    }
    const weekly = Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([w, v]) => ({
        label: `${t.week} ${w}`,
        entradas: Math.round(v.entradas),
        saidas: Math.round(v.saidas),
      }));

    const topIn = [...inflows]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((x) => ({ name: x.description, value: Math.round(x.amount) }));
    const topOut = [...outflows]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((x) => ({ name: x.description, value: Math.round(x.amount) }));

    const catOutMap = new Map<string, number>();
    for (const x of outflows)
      catOutMap.set(
        x.suggestedCategory || "—",
        (catOutMap.get(x.suggestedCategory || "—") ?? 0) + x.amount
      );
    const catOut = Array.from(catOutMap.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));

    const catInMap = new Map<string, number>();
    for (const x of inflows)
      catInMap.set(
        x.suggestedCategory || "—",
        (catInMap.get(x.suggestedCategory || "—") ?? 0) + x.amount
      );
    const catIn = Array.from(catInMap.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));

    return {
      totalIn,
      totalOut,
      net,
      finalBalance,
      count: transactions.length,
      balanceSeries,
      weekly,
      topIn,
      topOut,
      catOut,
      catIn,
      inflows,
      outflows,
    };
  }, [transactions, openingBalance, language, t.week]);

  // -------- attention items --------
  const attention = useMemo(() => {
    const items: {
      icon: any;
      title: string;
      description: string;
      tone: "info" | "warn" | "danger";
    }[] = [];
    if (!generated || transactions.length === 0) return items;

    if (agg.outflows.length > 0) {
      const top = [...agg.outflows].sort((a, b) => b.amount - a.amount)[0];
      if (top.amount / agg.totalOut >= 0.4) {
        items.push({
          icon: AlertOctagon,
          title:
            language === "pt"
              ? "Saídas concentradas em poucos lançamentos"
              : language === "en"
              ? "Outflows concentrated in few transactions"
              : language === "es"
              ? "Salidas concentradas en pocos movimientos"
              : language === "fr"
              ? "Sorties concentrées sur peu d'opérations"
              : language === "de"
              ? "Ausgänge auf wenige Buchungen konzentriert"
              : "Uscite concentrate in pochi movimenti",
          description: `${top.description} — ${fmtCurrency(top.amount, language)}`,
          tone: "warn",
        });
      }
    }

    if (agg.finalBalance < openingBalance) {
      items.push({
        icon: TrendingDown,
        title:
          language === "pt"
            ? "Saldo final menor que o saldo inicial"
            : language === "en"
            ? "Closing balance lower than opening balance"
            : language === "es"
            ? "Saldo final menor que el inicial"
            : language === "fr"
            ? "Solde final inférieur au solde initial"
            : language === "de"
            ? "Endsaldo niedriger als Anfangssaldo"
            : "Saldo finale inferiore al saldo iniziale",
        description: `${fmtCurrency(openingBalance, language)} → ${fmtCurrency(
          agg.finalBalance,
          language
        )}`,
        tone: "danger",
      });
    }

    if (agg.inflows.length > 0) {
      const top = [...agg.inflows].sort((a, b) => b.amount - a.amount)[0];
      if (top.amount / Math.max(agg.totalIn, 1) >= 0.5) {
        items.push({
          icon: TrendingUp,
          title:
            language === "pt"
              ? "Grande entrada pontual"
              : language === "en"
              ? "Large one-off inflow"
              : language === "es"
              ? "Gran entrada puntual"
              : language === "fr"
              ? "Entrée ponctuelle importante"
              : language === "de"
              ? "Großer Einmaleingang"
              : "Grande entrata puntuale",
          description: `${top.description} — ${fmtCurrency(top.amount, language)}`,
          tone: "info",
        });
      }
    }

    // Recurring outflows growing
    const grouped = new Map<string, number[]>();
    for (const o of agg.outflows) {
      const arr = grouped.get(o.description) ?? [];
      arr.push(o.amount);
      grouped.set(o.description, arr);
    }
    for (const [desc, arr] of grouped) {
      if (arr.length >= 3 && arr.every((v, i) => i === 0 || v >= arr[i - 1])) {
        items.push({
          icon: TrendingUp,
          title:
            language === "pt"
              ? "Aumento de saídas recorrentes"
              : language === "en"
              ? "Recurring outflows trending up"
              : language === "es"
              ? "Aumento de salidas recurrentes"
              : language === "fr"
              ? "Sorties récurrentes en hausse"
              : language === "de"
              ? "Wiederkehrende Ausgänge steigend"
              : "Aumento di uscite ricorrenti",
          description: desc,
          tone: "warn",
        });
        break;
      }
    }

    const noCat = transactions.filter((x) => !x.suggestedCategory).length;
    if (noCat > 0) {
      items.push({
        icon: AlertTriangle,
        title:
          language === "pt"
            ? "Movimentações sem categoria"
            : language === "en"
            ? "Uncategorized transactions"
            : language === "es"
            ? "Movimientos sin categoría"
            : language === "fr"
            ? "Mouvements sans catégorie"
            : language === "de"
            ? "Buchungen ohne Kategorie"
            : "Movimenti senza categoria",
        description: `${noCat}`,
        tone: "info",
      });
    }

    // Duplicates
    const seen = new Map<string, Transaction>();
    for (const tx of transactions) {
      const key = `${tx.description}|${tx.amount}`;
      const prev = seen.get(key);
      if (prev) {
        const diff = Math.abs(
          new Date(prev.date).getTime() - new Date(tx.date).getTime()
        );
        if (diff <= 1000 * 60 * 60 * 24 * 2) {
          items.push({
            icon: AlertOctagon,
            title:
              language === "pt"
                ? "Possível cobrança duplicada"
                : language === "en"
                ? "Possible duplicate charge"
                : language === "es"
                ? "Posible cobro duplicado"
                : language === "fr"
                ? "Possible doublon"
                : language === "de"
                ? "Mögliche doppelte Buchung"
                : "Possibile addebito duplicato",
            description: `${tx.description} — ${fmtCurrency(tx.amount, language)}`,
            tone: "danger",
          });
          break;
        }
      }
      seen.set(key, tx);
    }

    return items;
  }, [agg, generated, transactions, openingBalance, language]);

  // -------- executive summary --------
  const summary = useMemo(() => {
    if (!generated || transactions.length === 0) return "";
    const clientName =
      clients.find((c) => c.id === clientId)?.name ??
      (language === "en" ? "the client" : "o cliente");
    const monthLabel = fmtMonth(month, language);
    const moreIn = agg.totalIn >= agg.totalOut;
    const delta = agg.finalBalance - openingBalance;

    const L = {
      pt: `No período de ${monthLabel}, ${clientName} apresentou ${agg.count} movimentações no extrato. As entradas totalizaram ${fmtCurrency(
        agg.totalIn,
        language
      )} e as saídas ${fmtCurrency(agg.totalOut, language)}, resultando em um saldo líquido ${moreIn ? "positivo" : "negativo"} de ${fmtCurrency(
        Math.abs(agg.net),
        language
      )}. O saldo evoluiu de ${fmtCurrency(openingBalance, language)} para ${fmtCurrency(
        agg.finalBalance,
        language
      )} (${delta >= 0 ? "+" : ""}${fmtCurrency(delta, language)}). ${attention.length > 0 ? `Foram identificados ${attention.length} pontos de atenção que merecem revisão.` : "Não foram identificados pontos críticos relevantes."}`,
      en: `In ${monthLabel}, ${clientName} had ${agg.count} transactions on the bank statement. Inflows totaled ${fmtCurrency(
        agg.totalIn,
        language
      )} and outflows ${fmtCurrency(agg.totalOut, language)}, resulting in a ${moreIn ? "positive" : "negative"} net balance of ${fmtCurrency(
        Math.abs(agg.net),
        language
      )}. The balance moved from ${fmtCurrency(openingBalance, language)} to ${fmtCurrency(
        agg.finalBalance,
        language
      )} (${delta >= 0 ? "+" : ""}${fmtCurrency(delta, language)}). ${attention.length > 0 ? `${attention.length} attention items were identified and worth reviewing.` : "No critical points were identified."}`,
      es: `En ${monthLabel}, ${clientName} registró ${agg.count} movimientos en el extracto. Las entradas sumaron ${fmtCurrency(
        agg.totalIn,
        language
      )} y las salidas ${fmtCurrency(agg.totalOut, language)}, con un saldo neto ${moreIn ? "positivo" : "negativo"} de ${fmtCurrency(
        Math.abs(agg.net),
        language
      )}. El saldo pasó de ${fmtCurrency(openingBalance, language)} a ${fmtCurrency(
        agg.finalBalance,
        language
      )} (${delta >= 0 ? "+" : ""}${fmtCurrency(delta, language)}). ${attention.length > 0 ? `Se identificaron ${attention.length} puntos de atención.` : "No se identificaron puntos críticos."}`,
      fr: `En ${monthLabel}, ${clientName} a enregistré ${agg.count} mouvements. Les entrées s'élèvent à ${fmtCurrency(
        agg.totalIn,
        language
      )} et les sorties à ${fmtCurrency(agg.totalOut, language)}, soit un solde net ${moreIn ? "positif" : "négatif"} de ${fmtCurrency(
        Math.abs(agg.net),
        language
      )}. Le solde est passé de ${fmtCurrency(openingBalance, language)} à ${fmtCurrency(
        agg.finalBalance,
        language
      )} (${delta >= 0 ? "+" : ""}${fmtCurrency(delta, language)}). ${attention.length > 0 ? `${attention.length} points d'attention ont été identifiés.` : "Aucun point critique identifié."}`,
      de: `Im ${monthLabel} verzeichnete ${clientName} ${agg.count} Buchungen. Eingänge: ${fmtCurrency(
        agg.totalIn,
        language
      )}, Ausgänge: ${fmtCurrency(agg.totalOut, language)}, Nettosaldo ${moreIn ? "positiv" : "negativ"} ${fmtCurrency(
        Math.abs(agg.net),
        language
      )}. Saldoentwicklung: ${fmtCurrency(openingBalance, language)} → ${fmtCurrency(
        agg.finalBalance,
        language
      )} (${delta >= 0 ? "+" : ""}${fmtCurrency(delta, language)}). ${attention.length > 0 ? `${attention.length} Aufmerksamkeitspunkte identifiziert.` : "Keine kritischen Punkte festgestellt."}`,
      it: `Nel ${monthLabel}, ${clientName} ha registrato ${agg.count} movimenti. Entrate: ${fmtCurrency(
        agg.totalIn,
        language
      )}, uscite: ${fmtCurrency(agg.totalOut, language)}, saldo netto ${moreIn ? "positivo" : "negativo"} di ${fmtCurrency(
        Math.abs(agg.net),
        language
      )}. Il saldo è passato da ${fmtCurrency(openingBalance, language)} a ${fmtCurrency(
        agg.finalBalance,
        language
      )} (${delta >= 0 ? "+" : ""}${fmtCurrency(delta, language)}). ${attention.length > 0 ? `${attention.length} punti di attenzione identificati.` : "Nessun punto critico identificato."}`,
    };
    return L[language];
  }, [generated, transactions, clients, clientId, month, agg, openingBalance, language, attention.length]);

  // -------- actions --------
  function handleFile(f: File | null) {
    if (!f) return;
    const ok = /\.(pdf|csv|xls|xlsx)$/i.test(f.name);
    if (!ok) {
      toast.error("Formato inválido", { description: t.uploadHint });
      return;
    }
    setFile(f);
    setStatus("idle");
    setGenerated(false);
    setTransactions([]);
  }

  function handleProcess() {
    if (!clientId) {
      toast.error(t.selectClient);
      return;
    }
    if (!file) {
      toast.error(t.upload);
      return;
    }
    setStatus("processing");
    setGenerated(false);
    setTimeout(() => {
      const txs = mockTransactions(month, clientId);
      setTransactions(txs);
      // opening balance derived from seed/totals (mock)
      const baseSeed =
        month.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + clientId.length;
      setOpeningBalance(Math.round(((baseSeed % 50) + 5) * 1000));
      setStatus("ready");
      toast.success(t.processed);
    }, 900);
  }

  function handleGenerate() {
    if (status !== "ready") {
      toast.error(t.processStatement);
      return;
    }
    setGenerated(true);
    toast.success(t.generate);
  }

  function handleCopy() {
    if (!summary) return;
    navigator.clipboard.writeText(summary).then(
      () => toast.success(t.copySummary),
      () => toast.error("—")
    );
  }

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(220 70% 50%)",
    "hsl(160 60% 45%)",
    "hsl(30 80% 55%)",
    "hsl(280 65% 60%)",
    "hsl(0 75% 55%)",
    "hsl(190 70% 45%)",
    "hsl(45 90% 50%)",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/financeiro" })}>
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info(`${t.exportPdf} — em breve`)}
            disabled={!generated}
          >
            <FileText className="h-4 w-4" />
            {t.exportPdf}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info(`${t.sendClient} — em breve`)}
            disabled={!generated}
          >
            <Send className="h-4 w-4" />
            {t.sendClient}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!generated}>
            <Copy className="h-4 w-4" />
            {t.copySummary}
          </Button>
        </div>
      </div>

      {/* Configuração */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.config}</CardTitle>
          <CardDescription>{t.configDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t.client}</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectClient} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t.month}</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value || monthKey(new Date()))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5" /> {t.language}
              </Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as Lang)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANG_OPTIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      <span className="mr-2">{l.flag}</span>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Upload */}
          <div
            className={`rounded-lg border-2 border-dashed p-5 text-center transition cursor-pointer ${
              file ? "border-primary/40 bg-primary/5" : "border-muted-foreground/20 hover:bg-muted/40"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.xls,.xlsx"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{file.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {t.fileSelected}
                </Badge>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
                <FileUp className="h-6 w-6" />
                <span>{t.uploadDrop}</span>
                <span className="text-xs">{t.uploadHint}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={handleProcess} disabled={status === "processing"}>
              {status === "processing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {status === "processing" ? t.processing : t.processStatement}
            </Button>
            <Button onClick={handleGenerate} disabled={status !== "ready"}>
              <Sparkles className="h-4 w-4" />
              {t.generate}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty / aguardando */}
      {status === "idle" && !generated ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t.noData}
          </CardContent>
        </Card>
      ) : null}
      {status === "ready" && !generated ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t.waitGenerate}
          </CardContent>
        </Card>
      ) : null}

      {/* KPIs */}
      {generated && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Kpi label={t.initial} value={fmtCurrency(openingBalance, language)} icon={Wallet} tone="muted" />
            <Kpi label={t.totalIn} value={fmtCurrency(agg.totalIn, language)} icon={ArrowUpRight} tone="success" />
            <Kpi label={t.totalOut} value={fmtCurrency(agg.totalOut, language)} icon={ArrowDownRight} tone="danger" />
            <Kpi
              label={t.net}
              value={fmtCurrency(agg.net, language)}
              icon={agg.net >= 0 ? TrendingUp : TrendingDown}
              tone={agg.net >= 0 ? "success" : "danger"}
            />
            <Kpi
              label={t.final}
              value={fmtCurrency(agg.finalBalance, language)}
              icon={Wallet}
              tone={agg.finalBalance >= 0 ? "primary" : "danger"}
            />
            <Kpi label={t.count} value={String(agg.count)} icon={Hash} tone="primary" />
          </div>

          {/* Charts row 1 */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.chartBalance}</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={agg.balanceSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => fmtCurrency(Number(v), language)} />
                    <Line type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.chartWeek}</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agg.weekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => fmtCurrency(Number(v), language)} />
                    <Legend />
                    <Bar dataKey="entradas" name={t.in} fill="hsl(142 70% 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saidas" name={t.out} fill="hsl(0 75% 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2 — Top */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" /> {t.topIn}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agg.topIn} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => fmtCurrency(Number(v), language)} />
                    <Bar dataKey="value" fill="hsl(142 70% 45%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-destructive" /> {t.topOut}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agg.topOut} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => fmtCurrency(Number(v), language)} />
                    <Bar dataKey="value" fill="hsl(0 75% 55%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts row 3 — Distribuição */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> {t.catOut}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={agg.catOut} dataKey="value" nameKey="name" outerRadius={95} label>
                      {agg.catOut.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtCurrency(Number(v), language)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" /> {t.catIn}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={agg.catIn} dataKey="value" nameKey="name" outerRadius={95} label>
                      {agg.catIn.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtCurrency(Number(v), language)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.transactions}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.colDate}</TableHead>
                      <TableHead>{t.colDesc}</TableHead>
                      <TableHead>{t.colType}</TableHead>
                      <TableHead className="text-right">{t.colAmount}</TableHead>
                      <TableHead>{t.colCategory}</TableHead>
                      <TableHead>{t.colNote}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap">{fmtDate(tx.date, language)}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{tx.description}</TableCell>
                        <TableCell>
                          {tx.type === "entrada" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                              {t.typeIn}
                            </Badge>
                          ) : (
                            <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15">
                              {t.typeOut}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            tx.type === "entrada" ? "text-emerald-600" : "text-destructive"
                          }`}
                        >
                          {tx.type === "entrada" ? "+" : "−"}
                          {fmtCurrency(tx.amount, language)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx.suggestedCategory || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx.note || ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Resumo + Atenção */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {t.summary}
                    </CardTitle>
                    <CardDescription>{t.summaryDesc}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {t.autogen}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  {summary}
                </p>
                <Separator className="my-4" />
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                  {t.copySummary}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {t.attention}
                </CardTitle>
                <CardDescription>{t.attentionDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {attention.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t.noneAtt}</div>
                ) : (
                  attention.map((item, idx) => {
                    const Icon = item.icon;
                    const toneClasses =
                      item.tone === "danger"
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : item.tone === "warn"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-primary/10 text-primary border-primary/20";
                    return (
                      <div key={idx} className={`flex gap-3 rounded-lg border p-3 ${toneClasses}`}>
                        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "muted",
}: {
  label: string;
  value: string;
  icon: any;
  tone?: "primary" | "success" | "danger" | "muted";
}) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600"
      : tone === "danger"
      ? "bg-destructive/10 text-destructive"
      : tone === "primary"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-semibold tracking-tight truncate">{value}</p>
          </div>
          <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${toneClasses}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
