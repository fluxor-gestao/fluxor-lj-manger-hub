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
  Trash2,
  Workflow,
  PlusCircle,
} from "lucide-react";
import { SmartFlowAnalysis, type FlowTransaction } from "@/components/financeiro/SmartFlowAnalysis";
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

type Lang = "pt" | "en" | "es" | "fr" | "de" | "it";
const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: "pt", label: "Português", flag: "🇧🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
];

type Transaction = {
  id: string;
  date: string;
  description: string;
  type: "entrada" | "saida";
  amount: number;
  suggestedCategory: string;
  note?: string;
};

// ... (Rest of the logic here) ...
function RapportPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Lang>("pt");
  const [statements, setStatements] = useState<{ id: string; file: File; accountType: string; status: "idle" | "processing" | "ready"; transactions: Transaction[] }[]>([]);
  const [generated, setGenerated] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);

  const transactions = useMemo(() => {
    return statements.flatMap(s => s.transactions.map(t => ({ ...t, accountName: s.accountType })));
  }, [statements]);

  const flowTransactions = useMemo<FlowTransaction[]>(() => {
    return transactions.map(tx => ({
      id: tx.id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      accountName: (tx as any).accountName
    }));
  }, [transactions]);

  // Simplified Rapport implementation for demonstration
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-3xl font-bold">Rapport Financeiro Inteligente</h1>
         <Button onClick={() => setStatements(s => [...s, { id: crypto.randomUUID(), file: new File([], "Novo extrato"), accountType: "Conta Corrente", status: "idle", transactions: [] }])}>
           <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Conta
         </Button>
      </div>
      
      {statements.length === 0 ? (
        <p>Adicione contas para processar o fluxo financeiro.</p>
      ) : (
        <div className="grid gap-6">
          <SmartFlowAnalysis transactions={flowTransactions} />
        </div>
      )}
    </div>
  );
}
