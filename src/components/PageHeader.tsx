import type { LucideIcon } from "lucide-react";
import { SiteSectionIntro } from "@/components/SiteSectionIntro";

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
  return (
    <SiteSectionIntro
      icon={Icon}
      eyebrow={eyebrow}
      title={title}
      description={description}
      align={align}
      className={className}
    />
  );
}
