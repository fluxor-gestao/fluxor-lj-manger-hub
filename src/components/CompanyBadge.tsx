import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { COMPANY_BADGE_CLASS, COMPANY_SHORT, isCompanyCode } from "@/lib/companyCodes";

interface Props {
  code?: string | null;
  className?: string;
  showCode?: boolean;
}

export function CompanyBadge({ code, className, showCode = true }: Props) {
  if (!isCompanyCode(code)) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        Sem empresa
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn(COMPANY_BADGE_CLASS[code], "gap-1.5", className)}>
      {showCode && <span className="font-mono text-[10px] opacity-80">{code}</span>}
      <span>{COMPANY_SHORT[code]}</span>
    </Badge>
  );
}
