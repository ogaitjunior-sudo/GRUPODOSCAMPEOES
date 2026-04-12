import { cn } from "@/lib/utils";
import type { ChampionshipStatus } from "@/types/championship";

interface StatusBadgeProps {
  status: ChampionshipStatus;
  className?: string;
}

function getStatusClassName(status: ChampionshipStatus) {
  if (status === "Em andamento") {
    return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "Em breve") {
    return "border border-white/10 bg-white/5 text-muted-foreground";
  }

  if (status === "Finalizado") {
    return "border border-primary/20 bg-primary/10 text-primary";
  }

  if (status === "Cancelado") {
    return "border border-red-500/20 bg-red-500/10 text-red-300";
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
      {status}
    </span>
  );
}

