import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHUNK_RECOVERY_KEY = "gc_chunk_recovery_reload_v1";

function isChunkLoadFailure(error: Error) {
  const message = error.message.toLowerCase();

  return (
    message.includes("chunkloaderror") ||
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("error loading dynamically imported module")
  );
}

function formatFallbackMessage(error: Error | null) {
  if (!error) {
    return "Nao foi possivel renderizar esta tela agora. Tente atualizar o app.";
  }

  if (isChunkLoadFailure(error)) {
    return "A pagina ficou com arquivos desatualizados no navegador. Atualize o app para recarregar a versao mais recente.";
  }

  return "Ocorreu uma falha ao abrir esta tela. Atualize o app para tentar novamente.";
}

interface AppErrorBoundaryProps {
  children: ReactNode;
  isAdminRoute?: boolean;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AppErrorBoundary", error, errorInfo);

    if (typeof window === "undefined" || !isChunkLoadFailure(error)) {
      return;
    }

    const hasReloaded = window.sessionStorage.getItem(CHUNK_RECOVERY_KEY) === "1";

    if (!hasReloaded) {
      window.sessionStorage.setItem(CHUNK_RECOVERY_KEY, "1");
      window.location.reload();
      return;
    }

    window.sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
  }

  handleReload = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { children, isAdminRoute = false } = this.props;
    const { error } = this.state;

    if (!error) {
      return children;
    }

    return (
      <div className={isAdminRoute ? "min-h-screen bg-background" : "min-h-[50vh]"}>
        <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 py-16">
          <div className="w-full max-w-xl rounded-[28px] border border-red-500/25 bg-card/90 p-6 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.85)] backdrop-blur">
            <div className="flex items-start gap-4">
              <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300">
                <TriangleAlert className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.28em] text-red-300">falha na tela</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-white">
                  Nao foi possivel abrir esta pagina
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {formatFallbackMessage(error)}
                </p>
                <p className="mt-3 break-words text-xs leading-6 text-red-200/80">
                  {error.message}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button type="button" onClick={this.handleReload}>
                    <RefreshCcw className="h-4 w-4" />
                    Atualizar app
                  </Button>
                  <Button type="button" variant="outline" onClick={this.handleRetry}>
                    Tentar novamente
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
