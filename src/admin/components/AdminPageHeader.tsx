import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="inline-flex rounded-full panel-premium-soft px-4 py-2 font-heading text-[11px] uppercase tracking-[0.32em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-4 font-heading text-3xl font-black text-white md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3 lg:justify-end">{actions}</div> : null}
    </div>
  );
}
