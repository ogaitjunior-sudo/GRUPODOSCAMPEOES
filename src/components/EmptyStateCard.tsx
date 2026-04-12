import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  className?: string;
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  className,
}: EmptyStateCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/20 bg-metallic-card px-6 py-10 text-center shadow-[0_0_30px_hsl(51_100%_50%_/_0.08)]",
        className,
      )}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mb-2 font-heading text-xl font-bold gradient-gold-text text-glow-gold">
        {title}
      </h3>
      <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-5 inline-flex rounded-md border border-primary/30 px-5 py-2 font-heading text-xs font-bold uppercase tracking-[0.2em] text-primary transition-all hover:bg-primary/10"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
