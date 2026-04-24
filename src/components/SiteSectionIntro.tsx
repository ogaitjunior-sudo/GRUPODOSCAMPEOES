import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SiteSectionIntroProps {
  title: string;
  description: string;
  eyebrow?: string;
  icon?: LucideIcon;
  align?: "left" | "center";
  action?: ReactNode;
  className?: string;
}

export function SiteSectionIntro({
  title,
  description,
  eyebrow,
  icon: Icon,
  align = "left",
  action,
  className,
}: SiteSectionIntroProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        centered && "items-center text-center",
        className,
      )}
    >
      <div className={cn("max-w-3xl space-y-4", centered && "mx-auto")}>
        {(eyebrow || Icon) && (
          <div className={cn("site-kicker", centered && "mx-auto")}>
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {eyebrow ?? "Seção"}
          </div>
        )}

        <div className="space-y-3">
          <h1 className="text-balance font-heading text-3xl font-semibold tracking-[0.06em] text-foreground md:text-5xl">
            {title}
          </h1>
          <p
            className={cn(
              "max-w-2xl text-sm leading-7 text-muted-foreground md:text-base",
              centered && "mx-auto",
            )}
          >
            {description}
          </p>
        </div>
      </div>

      {action ? <div className={cn("shrink-0", centered && "mx-auto")}>{action}</div> : null}
    </div>
  );
}
