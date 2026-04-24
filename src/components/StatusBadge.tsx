import { getChampionshipStatusLabel } from "@/lib/championships";
import { cn } from "@/lib/utils";
import type { ChampionshipStatus } from "@/types/championship";

interface StatusBadgeProps {
  status: ChampionshipStatus;
  className?: string;
}

function getStatusClassName(status: ChampionshipStatus) {
  if (status === "STARTED") {
    return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "DRAFT") {
    return "border border-white/10 bg-white/5 text-muted-foreground";
  }

  if (status === "READY") {
    return "border border-amber-500/20 bg-amber-500/10 text-amber-200";
  }

  if (status === "FINISHED") {
    return "border border-primary/20 bg-primary/10 text-primary";
  }

  return "border border-electric/20 bg-electric/10 text-electric";
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] shadow-[0_10px_24px_hsl(0_0%_0%_/_0.12)]",
        getStatusClassName(status),
        className,
      )}
    >
      {getChampionshipStatusLabel(status)}
    </span>
  );
}
