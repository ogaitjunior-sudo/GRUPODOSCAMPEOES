import { RefreshCcw } from "lucide-react";
import { useState } from "react";
import { refreshApplicationCache } from "@/lib/app-cache";
import { cn } from "@/lib/utils";

export function AppRefreshButton({
  iconOnly = false,
  className,
}: {
  iconOnly?: boolean;
  className?: string;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      await refreshApplicationCache();
    } catch {
      setIsRefreshing(false);
      window.location.reload();
    }
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isRefreshing}
      aria-label={isRefreshing ? "Atualizando aplicativo" : "Atualizar aplicativo"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-white disabled:cursor-wait disabled:opacity-80",
        iconOnly ? "h-11 w-11" : "px-4 py-3",
        className,
      )}
    >
      <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
      {!iconOnly ? <span>{isRefreshing ? "Atualizando..." : "Atualizar app"}</span> : null}
    </button>
  );
}
