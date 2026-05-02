import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Loader2, MessageSquareText, Swords } from "lucide-react";
import { TeamCrest, TeamFlagBadge } from "@/components/championship/TeamIdentity";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputClassName =
  "h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-slate-100 outline-none transition-colors focus:border-electric/40";
const textareaClassName =
  "min-h-28 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-electric/40";

interface ChallengeModalProps {
  open: boolean;
  championshipName?: string | null;
  fromTeam: {
    name: string;
    flagUrl?: string | null;
  } | null;
  toTeam: {
    name: string;
    flagUrl?: string | null;
  } | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { date: string; time: string; message: string | null }) => Promise<void>;
}

function getTodayValue() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export function ChallengeModal({
  open,
  championshipName,
  fromTeam,
  toTeam,
  isSubmitting,
  onClose,
  onSubmit,
}: ChallengeModalProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const minimumDate = useMemo(() => getTodayValue(), []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDate("");
    setTime("");
    setMessage("");
    setFormError(null);
  }, [open, fromTeam?.name, toTeam?.name]);

  const handleSubmit = async () => {
    if (!fromTeam || !toTeam) {
      setFormError("Nao foi possivel identificar os times do desafio.");
      return;
    }

    if (!date || !time) {
      setFormError("Preencha a data e o horario para enviar o desafio.");
      return;
    }

    setFormError(null);

    try {
      await onSubmit({
        date,
        time,
        message: message.trim() || null,
      });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Nao foi possivel enviar o desafio amistoso.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="mobile-dialog border-white/10 bg-[linear-gradient(180deg,hsl(220_24%_14%_/_0.98),hsl(222_24%_9%_/_0.98))] p-0 text-slate-100 sm:max-w-2xl">
        <div className="border-b border-white/8 bg-[radial-gradient(circle_at_top_left,hsl(45_100%_55%_/_0.14),transparent_28%),radial-gradient(circle_at_top_right,hsl(196_100%_50%_/_0.14),transparent_24%),linear-gradient(180deg,hsl(220_24%_18%_/_0.92),hsl(220_20%_12%_/_0.92))] px-6 py-6">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-3 font-heading text-2xl uppercase tracking-[0.12em] text-white">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-electric/12 text-electric">
                <Swords className="h-5 w-5" />
              </span>
              Criar desafio amistoso
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Escolha a melhor janela para marcar um treino competitivo com este adversario.
            </DialogDescription>
          </DialogHeader>

          {championshipName ? (
            <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
              Campeonato: {championshipName}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              {
                label: "Seu time",
                name: fromTeam?.name ?? "A definir",
                flagUrl: fromTeam?.flagUrl ?? null,
              },
              {
                label: "Adversario",
                name: toTeam?.name ?? "A definir",
                flagUrl: toTeam?.flagUrl ?? null,
              },
            ].map((team) => (
              <div
                key={team.label}
                className="rounded-[24px] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.03)]"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{team.label}</p>
                <div className="mt-4 flex items-center gap-3">
                  <TeamCrest
                    name={team.name}
                    size="md"
                    className="border-white/20 shadow-[0_12px_30px_hsl(0_0%_0%_/_0.24)]"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold uppercase tracking-[0.08em] text-white">
                        {team.name}
                      </p>
                      <TeamFlagBadge teamName={team.name} flagUrl={team.flagUrl} size="sm" />
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      Pronto para amistoso
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
                <CalendarDays className="h-4 w-4 text-electric" />
                Data
              </span>
              <input
                type="date"
                min={minimumDate}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={inputClassName}
                disabled={isSubmitting}
              />
            </label>

            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
                <Clock3 className="h-4 w-4 text-electric" />
                Horario
              </span>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className={inputClassName}
                disabled={isSubmitting}
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
              <MessageSquareText className="h-4 w-4 text-primary" />
              Mensagem opcional
            </span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className={textareaClassName}
              placeholder="Ex: valendo treino para campeonato, testar time novo, melhor horario apos as 21h..."
              disabled={isSubmitting}
              maxLength={280}
            />
            <p className="text-right text-xs uppercase tracking-[0.16em] text-slate-500">
              {message.trim().length}/280
            </p>
          </label>

          {formError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {formError}
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-3 border-t border-white/8 bg-black/20 px-6 py-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-white/12 bg-white/[0.03] text-slate-100 hover:bg-white/[0.06]"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-electric text-background hover:bg-electric/90"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar desafio"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
