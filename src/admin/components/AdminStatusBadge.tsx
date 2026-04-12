import { cn } from "@/lib/utils";

export function AdminStatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const className =
    tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : tone === "warning"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
      : tone === "danger"
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : tone === "info"
      ? "border-electric/20 bg-electric/10 text-electric"
      : "border-border bg-background/70 text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-[0_10px_24px_hsl(0_0%_0%_/_0.12)]",
        className,
      )}
    >
      {label}
    </span>
  );
}
