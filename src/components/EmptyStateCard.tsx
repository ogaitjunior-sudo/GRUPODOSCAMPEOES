import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteActionLink } from "@/components/SiteActionLink";
import { cn } from "@/lib/utils";

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  actionOnClick?: (() => void) | undefined;
  className?: string;
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  actionOnClick,
  className,
}: EmptyStateCardProps) {
  return (
    <div
      className={cn(
        "site-card rounded-[28px] px-6 py-10 text-center",
        className,
      )}
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mb-3 font-heading text-2xl font-semibold text-foreground">
        {title}
      </h3>
      <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground">
        {description}
      </p>
      {actionLabel && actionTo ? (
        <SiteActionLink
          to={actionTo}
          variant="secondary"
          size="sm"
          className="mt-6"
        >
          {actionLabel}
        </SiteActionLink>
      ) : null}
      {actionLabel && actionOnClick ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-6"
          onClick={actionOnClick}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
