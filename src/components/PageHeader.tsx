import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
  align?: "left" | "center";
  className?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  eyebrow,
  align = "center",
  className,
}: PageHeaderProps) {
  const centered = align === "center";

  return (
    <div className={cn(centered ? "text-center" : "text-left", className)}>
      <Icon className={cn("mb-3 h-10 w-10 text-primary", centered && "mx-auto")} />
      {eyebrow && (
        <p className="mb-2 font-heading text-xs font-bold uppercase tracking-[0.3em] text-primary">
          {eyebrow}
        </p>
      )}
      <h1 className="mb-2 font-heading text-2xl font-black gradient-gold-text text-glow-gold md:text-4xl">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
