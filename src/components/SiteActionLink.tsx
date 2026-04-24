import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type SiteActionVariant = "primary" | "secondary" | "ghost";
type SiteActionSize = "sm" | "md";

interface SiteActionLinkProps {
  to: string;
  children: ReactNode;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  variant?: SiteActionVariant;
  size?: SiteActionSize;
  className?: string;
}

const sizeClasses: Record<SiteActionSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3 text-sm",
};

const variantClasses: Record<SiteActionVariant, string> = {
  primary: "cta-primary",
  secondary: "cta-secondary",
  ghost: "cta-ghost",
};

export function SiteActionLink({
  to,
  children,
  icon: Icon,
  iconPosition = "left",
  variant = "secondary",
  size = "md",
  className,
}: SiteActionLinkProps) {
  const iconNode = Icon ? <Icon className="h-4 w-4 shrink-0" /> : null;

  return (
    <Link to={to} className={cn(variantClasses[variant], sizeClasses[size], className)}>
      {iconPosition === "left" ? iconNode : null}
      <span>{children}</span>
      {iconPosition === "right" ? iconNode : null}
    </Link>
  );
}
