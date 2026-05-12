import { useEffect, useState, type ChangeEvent } from "react";
import {
  Award,
  Flag,
  History,
  Loader2,
  Medal,
  ShieldCheck,
  TrendingUp,
  Trash2,
  Trophy,
  Upload,
  Users,
} from "lucide-react";
import { ChallengeButton } from "@/components/championship/ChallengeButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamCrest, TeamFlagBadge } from "@/components/championship/TeamIdentity";
import { TeamPhotoBadge } from "@/components/profile/TeamPhotoBadge";
import type { ChampionshipTeamProfile } from "@/types/championship-runtime";

const dialogInputClassName =
  "h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-slate-100 outline-none transition-colors focus:border-electric/40";
const dialogTextareaClassName =
  "min-h-32 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-electric/40";
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX_FLAG_FILE_SIZE = 512 * 1024;

function formatMatchDate(value: string | null) {
  if (!value) {
    return "Data a definir";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data a definir";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem selecionada."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Formato de arquivo invalido."));
        return;
      }

      resolve(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

function parseRoster(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function getResultTone(result: ChampionshipTeamProfile["recentMatches"][number]["result"]) {
  if (result === "win") {
    return "border-emerald-500/30 bg-emerald-500/12 text-emerald-100";
  }

  if (result === "loss") {
    return "border-red-500/30 bg-red-500/12 text-red-100";
  }

  return "border-amber-500/30 bg-amber-500/12 text-amber-100";
}

function getResultLabel(result: ChampionshipTeamProfile["recentMatches"][number]["result"]) {
  if (result === "win") {
    return "Vitoria";
  }

  if (result === "loss") {
    return "Derrota";
  }

  return "Empate";
}

interface TeamProfileDialogProps {
  open: boolean;
  profile: ChampionshipTeamProfile | null;
  canEdit: boolean;
  isOwnTeam: boolean;
  isSaving: boolean;
  challengeAction?: {
    visible: boolean;
    disabled?: boolean;
    isLoading?: boolean;
    isPending?: boolean;
    helperText?: string | null;
    onOpen: () => void;
  } | null;
  onClose: () => void;
  onSaveProfile: (payload: {
    teamId: string;
    captainName: string | null;
    roster: string[];
    flagUrl: string | null;
  }) => Promise<void>;
}

export function TeamProfileDialog({
  open,
  profile,
  canEdit,
  isOwnTeam,
  isSaving,
  challengeAction,
  onClose,
  onSaveProfile,
}: TeamProfileDialogProps) {
  const [captainName, setCaptainName] = useState("");
  const [rosterText, setRosterText] = useState("");
  const [flagUrl, setFlagUrl] = useState<string | null>(null);
  const [isReadingFlag, setIsReadingFlag] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      setCaptainName("");
      setRosterText("");
      setFlagUrl(null);
      setFormError(null);
      return;
    }

    setCaptainName(profile.captainName ?? "");
    setRosterText(profile.roster.join("\n"));
    setFlagUrl(profile.team.flagUrl);
    setFormError(null);
  }, [profile]);

  const handleSubmit = async () => {
    if (!profile) {
      return;
    }

    setFormError(null);

    try {
      await onSaveProfile({
        teamId: profile.team.id,
        captainName: captainName.trim() || null,
        roster: parseRoster(rosterText),
        flagUrl,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Nao foi possivel salvar o perfil do time.");
    }
  };

  const handleFlagFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      setFormError("Envie a bandeira em PNG, JPG, WEBP ou SVG.");
      return;
    }

    if (file.size > MAX_FLAG_FILE_SIZE) {
      setFormError("A bandeira precisa ter no maximo 500 KB.");
      return;
    }

    setIsReadingFlag(true);
    setFormError(null);

    try {
      const nextFlagUrl = await readFileAsDataUrl(file);
      setFlagUrl(nextFlagUrl);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Nao foi possivel carregar a bandeira.");
    } finally {
      setIsReadingFlag(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="mobile-dialog max-h-[90vh] overflow-hidden border-white/10 bg-[linear-gradient(180deg,hsl(220_24%_14%_/_0.98),hsl(222_24%_9%_/_0.98))] p-0 text-slate-100 sm:max-w-5xl">
        {profile ? (
          <div className="flex max-h-[90vh] flex-col">
            <div className="border-b border-white/8 bg-[radial-gradient(circle_at_top_left,hsl(45_100%_55%_/_0.14),transparent_28%),radial-gradient(circle_at_top_right,hsl(196_100%_50%_/_0.14),transparent_26%),linear-gradient(180deg,hsl(220_24%_18%_/_0.92),hsl(220_20%_12%_/_0.92))] px-6 py-6">
              <DialogHeader className="text-left">
                <DialogTitle className="text-xs uppercase tracking-[0.3em] text-electric">
                  {isOwnTeam ? "Perfil do time" : "Perfil do adversario"}
                </DialogTitle>
                <DialogDescription className="text-slate-300">
                  {isOwnTeam
                    ? "Painel completo da sua equipe dentro deste campeonato."
                    : "Leitura detalhada da equipe dentro deste campeonato."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.04),0_18px_40px_hsl(222_45%_4%_/_0.22)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <TeamPhotoBadge
                      name={profile.team.name}
                      photoUrl={profile.teamPhotoUrl}
                      fallbackImageUrl={flagUrl}
                      size="sm"
                      shape="square"
                      className="h-16 w-16 rounded-[16px] border-white/20 bg-black/30 shadow-[0_20px_45px_hsl(0_0%_0%_/_0.28)]"
                      fallbackContent={
                        <TeamCrest
                          name={profile.team.name}
                          size="lg"
                          className="h-full w-full rounded-[16px] border-white/20"
                        />
                      }
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="min-w-0 break-words font-heading text-3xl font-black uppercase tracking-[0.08em] text-white">
                          {profile.team.name}
                        </h2>
                        <TeamFlagBadge teamName={profile.team.name} flagUrl={flagUrl} size="lg" />
                        {isOwnTeam ? (
                          <span className="rounded-full border border-electric/35 bg-electric/12 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-electric">
                            Meu time
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
                          Seed {profile.team.seed}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
                          {profile.groupName ?? "Sem grupo"}
                        </span>
                        {profile.captainName ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
                            Responsavel: {profile.captainName}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.04),0_18px_40px_hsl(222_45%_4%_/_0.22)]">
                  {challengeAction?.visible && !isOwnTeam ? (
                    <ChallengeButton
                      disabled={challengeAction.disabled}
                      isLoading={challengeAction.isLoading}
                      isPending={challengeAction.isPending}
                      helperText={challengeAction.helperText}
                      onClick={challengeAction.onOpen}
                      className="max-w-none"
                    />
                  ) : null}

                  <div className={`${challengeAction?.visible && !isOwnTeam ? "mt-4" : ""} grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2`}>
                    {[
                      { label: "Pontuacao", value: profile.rankingPoints, icon: TrendingUp, tone: "text-electric" },
                      { label: "Titulos", value: profile.titlesCount, icon: Trophy, tone: "text-primary" },
                      { label: "Vice", value: profile.viceTitlesCount, icon: Medal, tone: "text-slate-200" },
                      { label: "3o lugar", value: profile.thirdPlacesCount, icon: Award, tone: "text-amber-200" },
                      { label: "Jogos", value: profile.stats.played, icon: Users, tone: "text-slate-200" },
                      {
                        label: "Aproveit.",
                        value: `${
                          profile.stats.played > 0
                            ? Math.round((profile.matchRankingPoints / (profile.stats.played * 2)) * 100)
                            : 0
                        }%`,
                        icon: ShieldCheck,
                        tone: "text-emerald-200",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-3 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.03)]"
                      >
                        <div className={`flex items-center gap-2 ${stat.tone}`}>
                          <stat.icon className="h-3.5 w-3.5" />
                          <p className="text-[10px] uppercase tracking-[0.18em]">{stat.label}</p>
                        </div>
                        <p className="mt-1.5 text-xl font-semibold text-white">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-xs leading-5 text-slate-400">
                    Pontos: {profile.matchRankingPoints} por partidas + {profile.achievementRankingPoints} por conquistas.
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
                <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-electric" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Responsavel</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {profile.captainName ?? "Nao informado"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Elenco</p>
                    </div>

                    {profile.roster.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {profile.roster.map((player) => (
                          <span
                            key={`${profile.team.id}-${player}`}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-200"
                          >
                            {player}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-4 text-sm text-slate-400">
                        Nenhum jogador cadastrado para este time ainda.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-3">
                    <History className="h-5 w-5 text-electric" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Historico recente</p>
                      <p className="mt-1 text-sm text-slate-300">
                        Ultimos confrontos registrados neste campeonato.
                      </p>
                    </div>
                  </div>

                  {profile.recentMatches.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {profile.recentMatches.map((match) => (
                        <article
                          key={match.id}
                          className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                {match.phaseLabel}
                              </p>
                              <div className="mt-2 flex min-w-0 items-center gap-3">
                                <TeamFlagBadge
                                  teamName={match.opponentName}
                                  flagUrl={match.opponentFlagUrl}
                                  size="sm"
                                />
                                <p className="truncate text-base font-semibold text-white">
                                  vs {match.opponentName}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-lg font-semibold text-white">
                                {match.scoreFor} x {match.scoreAgainst}
                              </span>
                              <span
                                className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${getResultTone(match.result)}`}
                              >
                                {getResultLabel(match.result)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                            <span>{formatMatchDate(match.playedAt)}</span>
                            <span>{match.venue || "Local a definir"}</span>
                            {match.resolutionLabel ? <span>{match.resolutionLabel}</span> : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-4 text-sm text-slate-400">
                      Este time ainda nao tem partidas encerradas no campeonato.
                    </div>
                  )}
                </section>
              </div>

              {canEdit ? (
                <section className="mt-5 rounded-[24px] border border-electric/18 bg-[linear-gradient(180deg,hsl(220_24%_16%_/_0.96),hsl(222_24%_11%_/_0.96))] p-5 shadow-[0_24px_48px_hsl(222_45%_3%_/_0.22)]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-electric">Painel do time</p>
                      <p className="mt-2 text-sm text-slate-300">
                        Atualize a bandeira, o responsavel e a lista de jogadores do seu time.
                      </p>
                    </div>
                    {isReadingFlag ? (
                      <span className="inline-flex items-center gap-2 text-sm text-slate-300">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando bandeira...
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Bandeira do time</p>
                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                        <TeamFlagBadge teamName={profile.team.name} flagUrl={flagUrl} size="lg" />
                        <div className="flex flex-wrap gap-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-electric transition hover:bg-electric/15">
                            <Upload className="h-4 w-4" />
                            Escolher imagem
                            <input
                              type="file"
                              accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                              className="sr-only"
                              onChange={(event) => void handleFlagFileChange(event)}
                              disabled={isSaving || isReadingFlag}
                            />
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/12 bg-white/[0.03] text-slate-100 hover:bg-white/[0.06]"
                            onClick={() => setFlagUrl(null)}
                            disabled={!flagUrl || isSaving || isReadingFlag}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover bandeira
                          </Button>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">
                        Para manter o layout leve e estavel, use arquivos pequenos com ate 500 KB.
                      </p>
                    </div>

                    <div className="grid gap-4">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-100">Capitao ou responsavel</span>
                        <input
                          value={captainName}
                          onChange={(event) => setCaptainName(event.target.value)}
                          className={dialogInputClassName}
                          disabled={isSaving}
                          placeholder="Nome do responsavel pelo time"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-100">Elenco</span>
                        <textarea
                          value={rosterText}
                          onChange={(event) => setRosterText(event.target.value)}
                          className={dialogTextareaClassName}
                          disabled={isSaving}
                          placeholder={"Um jogador por linha\nou separado por virgulas"}
                        />
                      </label>
                    </div>
                  </div>

                  {formError ? (
                    <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                      {formError}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/12 bg-white/[0.03] text-slate-100 hover:bg-white/[0.06]"
                      onClick={onClose}
                      disabled={isSaving}
                    >
                      Fechar
                    </Button>
                    <Button
                      type="button"
                      className="bg-electric text-background hover:bg-electric/90"
                      onClick={() => void handleSubmit()}
                      disabled={isSaving || isReadingFlag}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar perfil"
                      )}
                    </Button>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <DialogHeader className="text-left">
              <DialogTitle>Perfil do time indisponivel</DialogTitle>
              <DialogDescription>
                Nao foi possivel localizar os dados desta equipe agora.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
              Tente abrir o perfil novamente depois de atualizar a tabela do campeonato.
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
