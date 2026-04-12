import type { ReactNode } from "react";
import { AdminSectionCard } from "@/admin/components/AdminSectionCard";

export function AdminTableCard({
  title,
  description,
  filters,
  children,
}: {
  title: string;
  description: string;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AdminSectionCard title={title} description={description}>
      {filters ? <div className="mb-5 flex flex-wrap gap-3">{filters}</div> : null}
      <div className="overflow-hidden rounded-[28px] panel-premium-soft">
        {children}
      </div>
    </AdminSectionCard>
  );
}
