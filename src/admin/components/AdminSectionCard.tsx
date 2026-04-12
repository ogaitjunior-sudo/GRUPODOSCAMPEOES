import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminSectionCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[32px] panel-premium p-5 md:p-6",
        className,
      )}
    >
      {(title || description) && (
        <div className="mb-5">
          {title ? (
            <h2 className="font-heading text-lg font-bold text-white md:text-xl">{title}</h2>
          ) : null}
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      )}
      {children}
    </section>
  );
}
