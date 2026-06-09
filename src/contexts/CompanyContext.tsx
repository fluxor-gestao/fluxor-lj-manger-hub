import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CompanyCode = "AD" | "CO" | "AM" | "IM" | "GE";
export type ActiveCompany = CompanyCode | "__all__";

export const COMPANIES: { code: CompanyCode; name: string; short: string }[] = [
  { code: "AD", name: "Lundgaard Jensen — Advocatício", short: "Advocatício" },
  { code: "CO", name: "Lundgaard Jensen — Contábil", short: "Contábil" },
  { code: "AM", name: "Lundgaard Jensen — Ambiental", short: "Ambiental" },
  { code: "IM", name: "Lundgaard Jensen — Imobiliária", short: "Imobiliária" },
  { code: "GE", name: "Lundgaard Jensen — Gestão", short: "Gestão" },
];

const LS_KEY = "lj.activeCompany";

type Ctx = {
  activeCompany: ActiveCompany;
  setActiveCompany: (c: ActiveCompany) => void;
  isConsolidated: boolean;
  /** Code to use as `business_unit` filter, or null when consolidated. */
  filterCode: CompanyCode | null;
  /** Friendly label for the active selection. */
  activeLabel: string;
  /** Short label for badges/banners. */
  activeShort: string;
  companies: typeof COMPANIES;
};

const CompanyContext = createContext<Ctx | null>(null);

function loadInitial(): ActiveCompany {
  if (typeof window === "undefined") return "__all__";
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "__all__" || v === "AD" || v === "CO" || v === "AM" || v === "IM" || v === "GE") {
      return v;
    }
  } catch {}
  return "__all__";
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [activeCompany, setActiveState] = useState<ActiveCompany>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, activeCompany);
    } catch {}
  }, [activeCompany]);

  const setActiveCompany = useCallback((c: ActiveCompany) => setActiveState(c), []);

  const value = useMemo<Ctx>(() => {
    const isConsolidated = activeCompany === "__all__";
    const meta = COMPANIES.find((c) => c.code === activeCompany);
    return {
      activeCompany,
      setActiveCompany,
      isConsolidated,
      filterCode: isConsolidated ? null : (activeCompany as CompanyCode),
      activeLabel: isConsolidated ? "Consolidado" : meta?.name ?? "Consolidado",
      activeShort: isConsolidated ? "Consolidado" : meta?.short ?? "Consolidado",
      companies: COMPANIES,
    };
  }, [activeCompany, setActiveCompany]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany(): Ctx {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    // Safe fallback for any consumer mounted outside provider.
    return {
      activeCompany: "__all__",
      setActiveCompany: () => {},
      isConsolidated: true,
      filterCode: null,
      activeLabel: "Consolidado",
      activeShort: "Consolidado",
      companies: COMPANIES,
    };
  }
  return ctx;
}
