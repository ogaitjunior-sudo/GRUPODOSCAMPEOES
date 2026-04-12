import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminMetricCard({
  icon: Icon,
  label,
  value,
  helper,
  accent = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  helper: string;
  accent?: "primary" | "electric" | "danger";
}) {
  const accentClassName =
    accent === "electric"
      ? "border-electric/20 bg-electric/10 text-electric"
      : accent === "danger"
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : "border-primary/20 bg-primary/10 text-primary";

  return (
    <article className="rounded-[28px] panel-premium-soft p-5 transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
          <p className="mt-4 font-heading text-3xl font-black text-white">{value}</p>
        </div>
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-[18px] border shadow-[0_14px_30px_hsl(0_0%_0%_/_0.2)]",
            accentClassName,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{helper}</p>
    </article>
  );
}
