import { Loader2, ShieldAlert, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChallengeButtonProps {
  disabled?: boolean;
  isLoading?: boolean;
  isPending?: boolean;
  helperText?: string | null;
  onClick?: () => void;
  className?: string;
}

export function ChallengeButton({
  disabled = false,
  isLoading = false,
  isPending = false,
  helperText,
  onClick,
  className,
}: ChallengeButtonProps) {
  return (
    <div className={cn("w-full max-w-sm space-y-3", className)}>
      <Button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        className={cn(
          "h-12 w-full rounded-2xl border-0 px-5 font-heading text-xs font-black uppercase tracking-[0.18em] shadow-[0_18px_38px_hsl(195_100%_50%_/_0.24)] transition hover:scale-[1.01]",
          isPending
            ? "bg-amber-500 text-black hover:bg-amber-500/90"
            : "bg-electric text-background hover:bg-electric/90",
        )}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Swords className="mr-2 h-4 w-4" />
        )}
        {isPending ? "Desafio pendente" : "Desafiar para amistoso"}
      </Button>

      {helperText ? (
        <p className="flex items-start gap-2 text-sm leading-6 text-slate-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{helperText}</span>
        </p>
      ) : null}
    </div>
  );
}
