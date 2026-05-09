import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import type { SelectSingleEventHandler } from "react-day-picker";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  Layers3,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { AdminPageHeader } from "@/admin/components/AdminPageHeader";
import { AdminSectionCard } from "@/admin/components/AdminSectionCard";
import { AdminStatusBadge } from "@/admin/components/AdminStatusBadge";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useChampionships } from "@/contexts/ChampionshipContext";
import { toast } from "@/hooks/use-toast";
import {
  bracketSyncPolicyOptions,
  buildChampionshipDescription,
  buildChampionshipRules,
  championshipFormatOptions,
  championshipGameOptions,
  championshipStatusOptions,
  createDefaultChampionshipConfiguration,
  getFormatOption,
  getChampionshipStatusLabel,
  knockoutBracketModeOptions,
  knockoutSetupModeOptions,
  matchReportingModeOptions,
  normalizeChampionshipConfiguration,
  registrationModeOptions,
  roundTripModeOptions,
  shouldLockGroupCount,
} from "@/lib/championships";
import { formatChampionshipStoreError } from "@/lib/championship-store";
import type { ChampionshipConfiguration, ChampionshipFormValues } from "@/types/championship";

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60";
const textareaClassName =
  "min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60";
const SAVE_TIMEOUT_MS = 24_000;

const steps = [
  {
    id: "tipo",
    label: "Tipo",
    description: "Formato e identidade do campeonato",
    icon: Layers3,
  },
  {
    id: "participantes",
    label: "Participantes",
    description: "Vagas, classificacao e forma de entrada",
    icon: Users,
  },
  {
    id: "configuracoes",
    label: "Configuracoes",
    description: "Datas, inscricoes e opcoes avancadas",
    icon: SlidersHorizontal,
  },
] as const;

type StepId = (typeof steps)[number]["id"];
type SubmitPhase = "idle" | "saving" | "redirecting";

const initialConfiguration = createDefaultChampionshipConfiguration();
const initialFormValues: ChampionshipFormValues = {
  name: "",
  description: buildChampionshipDescription(initialConfiguration),
  startDate: "",
  endDate: "",
  teamCount: 16,
  rules: buildChampionshipRules(initialConfiguration),
  status: "REGISTRATION",
  configuration: initialConfiguration,
};

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatVisibleDate(value: string) {
  const date = parseDateValue(value);

  if (!date) {
    return "dd/mm/aaaa";
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

async function withSaveTimeout<T>(operation: Promise<T>) {
  let timeoutId: ReturnType<typeof window.setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          "O Supabase demorou demais para responder. O botao foi liberado; confira a lista e tente novamente se o campeonato nao aparecer.",
        ),
      );
    }, SAVE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

function validateStep(step: StepId, form: ChampionshipFormValues) {
  if (step === "tipo") {
    if (!form.name.trim()) {
      return "Informe o nome do campeonato.";
    }

    if (!form.configuration.rankingName.trim()) {
      return "Informe o ranking vinculado.";
    }
  }

  if (step === "participantes") {
    if (form.teamCount < 2) {
      return "A quantidade de jogadores deve ser de pelo menos 2.";
    }

    if (
      form.configuration.groupCount > 0 &&
      form.configuration.qualifiedPerGroup > form.teamCount
    ) {
      return "Os classificados por grupo nao podem superar o total de jogadores.";
    }
  }

  if (step === "configuracoes") {
    if (!form.startDate) {
      return "Preencha a data de inicio.";
    }

    if (form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      return "A data de fim nao pode ser anterior a data de inicio.";
    }
  }

  return "";
}

export default function AdminChampionshipForm() {
  const { championshipId } = useParams();
  const {
    createChampionship,
    getChampionshipById,
    isLoading,
    storageMode,
    syncError,
    updateChampionship,
  } = useChampionships();
  const [form, setForm] = useState<ChampionshipFormValues>(initialFormValues);
  const [stepIndex, setStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");

  const isEditing = Boolean(championshipId);
  const existingChampionship = championshipId ? getChampionshipById(championshipId) : undefined;
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const previewDescription = useMemo(
    () => buildChampionshipDescription(form.configuration),
    [form.configuration],
  );
  const previewRules = useMemo(
    () => buildChampionshipRules(form.configuration),
    [form.configuration],
  );
  const isSubmitting = submitPhase !== "idle";
  const submitLabel =
    submitPhase === "saving"
      ? "Salvando..."
      : submitPhase === "redirecting"
        ? "Abrindo lista..."
        : isEditing
          ? "Salvar alteracoes"
          : "Criar campeonato";
  const groupCountLocked = shouldLockGroupCount(form.configuration.format);
  const selectedFormat = getFormatOption(form.configuration.format);

  const redirectToChampionshipsList = () => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams({
        refresh: `${Date.now()}`,
      });
      window.location.replace(`/admin/campeonatos?${searchParams.toString()}`);
      return;
    }
  };

  useEffect(() => {
    if (!existingChampionship) {
      return;
    }

    setForm({
      name: existingChampionship.name,
      description: existingChampionship.description,
      startDate: existingChampionship.startDate,
      endDate: existingChampionship.endDate,
      teamCount: existingChampionship.teamCount,
      rules: existingChampionship.rules,
      status: existingChampionship.status,
      configuration: normalizeChampionshipConfiguration(existingChampionship.configuration),
    });
  }, [existingChampionship]);

  const updateField =
    (field: keyof ChampionshipFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const nextValue = field === "teamCount" ? Number(event.target.value) : event.target.value;
      setForm((current) => ({ ...current, [field]: nextValue }));
      setErrorMessage("");
    };

  const updateDateField = (field: "startDate" | "endDate") => (nextValue: string) => {
    setForm((current) => ({ ...current, [field]: nextValue }));
    setErrorMessage("");
  };

  const updateConfiguration = (next: Partial<ChampionshipConfiguration>) => {
    setForm((current) => {
      const format = next.format ?? current.configuration.format;
      const hasFinalStage =
        typeof next.hasFinalStage === "boolean"
          ? next.hasFinalStage
          : next.format
            ? format !== "points-league"
            : current.configuration.hasFinalStage;
      const configuration = normalizeChampionshipConfiguration({
        ...current.configuration,
        ...next,
        format,
        hasFinalStage,
        thirdPlaceMatch: hasFinalStage
          ? next.thirdPlaceMatch ?? current.configuration.thirdPlaceMatch
          : false,
        awayGoalsRule: hasFinalStage
          ? next.awayGoalsRule ?? current.configuration.awayGoalsRule
          : false,
      });

      return {
        ...current,
        configuration,
        description: buildChampionshipDescription(configuration),
        rules: buildChampionshipRules(configuration),
      };
    });
    setErrorMessage("");
  };

  const nextStep = () => {
    const validation = validateStep(currentStep.id, form);

    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateStep("configuracoes", form);

    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setSubmitPhase("saving");

    const payload: ChampionshipFormValues = {
      ...form,
      description: previewDescription,
      rules: previewRules,
      configuration: normalizeChampionshipConfiguration(form.configuration),
    };

    try {
      if (isEditing && championshipId) {
        await withSaveTimeout(updateChampionship(championshipId, payload));
        toast({
          title: "Campeonato atualizado",
          description: "As alteracoes foram salvas no cadastro principal.",
        });
      } else {
        await withSaveTimeout(createChampionship(payload));
        toast({
          title: "Campeonato criado",
          description: "O novo campeonato entrou na grade principal.",
        });
      }

      setSubmitPhase("redirecting");
      redirectToChampionshipsList();
    } catch (error) {
      setErrorMessage(formatChampionshipStoreError(error));
      setSubmitPhase("idle");
    }
  };

  if (isEditing && isLoading) {
    return (
      <EmptyStateCard
        icon={Trophy}
        title="Carregando campeonato"
        description="Buscando dados para liberar a edicao."
        className="mx-auto max-w-3xl"
      />
    );
  }

  if (isEditing && championshipId && !existingChampionship) {
    return (
      <EmptyStateCard
        icon={Trophy}
        title="Campeonato nao encontrado"
        description="O item que voce tentou editar saiu do cadastro principal."
        actionLabel="Voltar para campeonatos"
        actionTo="/admin/campeonatos"
        className="mx-auto max-w-3xl"
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AdminPageHeader
        eyebrow="Fluxo guiado"
        title={isEditing ? "Editar campeonato" : "Criar campeonato"}
        description="Wizard inspirado em um fluxo mais claro de produto, sem perder as regras e os controles do sistema."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/campeonatos">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
            {!isLastStep ? (
              <Button type="button" onClick={nextStep}>
                Avancar
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4" />
                {submitLabel}
              </Button>
            )}
          </>
        }
      />

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      ) : null}

      {storageMode === "supabase" && syncError ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {syncError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSectionCard
          title="Etapas do wizard"
          description="A estrutura foi reduzida para tres blocos de decisao, sem esconder a capacidade do sistema."
        >
          <div className="grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => index <= stepIndex && setStepIndex(index)}
                className={`rounded-[24px] border p-4 text-left transition-all ${
                  index === stepIndex
                    ? "border-primary/20 bg-primary/10"
                    : index < stepIndex
                      ? "border-electric/20 bg-electric/10"
                      : "border-white/8 bg-black/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-primary">
                    <step.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Etapa {index + 1}
                    </p>
                    <p className="mt-1 font-semibold text-white">{step.label}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </button>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Resumo automatico"
          description="Descricao e regras continuam sendo consolidadas a partir do que voce define no wizard."
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-white">{form.name || "Novo campeonato"}</p>
                <AdminStatusBadge label={form.status} tone="info" />
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{previewDescription}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <InfoRow label="Jogo" value={form.configuration.game} />
              <InfoRow label="Ranking" value={form.configuration.rankingName} />
              <InfoRow
                label="Jogo rankeado"
                value={form.configuration.isRankedGame ? "Sim" : "Nao"}
              />
              <InfoRow label="Formato" value={selectedFormat.label} />
              <InfoRow label="Participantes" value={form.teamCount} />
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="font-semibold text-white">Regras consolidadas</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{previewRules}</p>
            </div>
          </div>
        </AdminSectionCard>
      </div>

      {currentStep.id === "tipo" ? (
        <AdminSectionCard
          title="Tipo do campeonato"
          description="Defina a identidade esportiva primeiro: nome, ranking e formato."
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-5">
              <Field label="Nome do campeonato">
                <input
                  value={form.name}
                  onChange={updateField("name")}
                  placeholder="Ex.: Circuito Elite X1 UT"
                  className={inputClassName}
                />
              </Field>

              <Field label="Ranking vinculado">
                <input
                  value={form.configuration.rankingName}
                  onChange={(event) => updateConfiguration({ rankingName: event.target.value })}
                  placeholder="Ex.: CAMPEOES"
                  className={inputClassName}
                />
              </Field>

              <Field label="Jogo rankeado">
                <Segmented
                  value={form.configuration.isRankedGame ? "true" : "false"}
                  onChange={(nextValue) =>
                    updateConfiguration({ isRankedGame: nextValue === "true" })
                  }
                  options={[
                    { value: "true", label: "Sim" },
                    { value: "false", label: "Nao" },
                  ]}
                />
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Marque se esse campeonato deve contar como jogo rankeado no circuito.
                </p>
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Jogo">
                  <select
                    value={form.configuration.game}
                    onChange={(event) =>
                      updateConfiguration({
                        game: event.target.value as ChampionshipConfiguration["game"],
                      })
                    }
                    className={inputClassName}
                  >
                    {championshipGameOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status inicial">
                  <div className="flex flex-wrap gap-2">
                    {championshipStatusOptions.map((option) => (
                      <SelectableChip
                        key={option}
                        active={form.status === option}
                        label={getChampionshipStatusLabel(option)}
                        onClick={() => {
                          setForm((current) => ({ ...current, status: option }));
                          setErrorMessage("");
                        }}
                      />
                    ))}
                  </div>
                </Field>
              </div>

            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-white">Formato da competicao</p>
              <div className="grid gap-3 md:grid-cols-2">
                {championshipFormatOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      updateConfiguration({
                        format: option.value,
                      })
                    }
                    className={`rounded-[24px] border p-4 text-left transition-all ${
                      form.configuration.format === option.value
                        ? "border-primary/25 bg-primary/10"
                        : "border-white/8 bg-black/20 hover:border-electric/20 hover:bg-white/5"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{option.label}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AdminSectionCard>
      ) : null}

      {currentStep.id === "participantes" ? (
        <AdminSectionCard
          title="Participantes e estrutura"
          description="Monte o tamanho do evento e como a fase classificatoria conversa com a fase final."
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Total de jogadores">
              <input
                type="number"
                min={2}
                value={form.teamCount}
                onChange={updateField("teamCount")}
                className={inputClassName}
              />
            </Field>

            <Field label="Total de grupos">
              <input
                type="number"
                min={0}
                value={form.configuration.groupCount}
                disabled={groupCountLocked}
                onChange={(event) =>
                  updateConfiguration({
                    groupCount: Math.max(0, Number(event.target.value)),
                  })
                }
                className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
              />
            </Field>

            <Field label="Classificados por grupo">
              <input
                type="number"
                min={1}
                value={form.configuration.qualifiedPerGroup}
                onChange={(event) =>
                  updateConfiguration({
                    qualifiedPerGroup: Math.max(1, Number(event.target.value)),
                  })
                }
                className={inputClassName}
              />
            </Field>

            <Field label="Fase final">
              <Toggle
                value={form.configuration.hasFinalStage}
                onChange={(value) => updateConfiguration({ hasFinalStage: value })}
              />
            </Field>

            <Field label="Fase classificatoria">
              <Segmented
                value={form.configuration.groupStageMode}
                onChange={(value) =>
                  updateConfiguration({
                    groupStageMode: value as ChampionshipConfiguration["groupStageMode"],
                  })
                }
                options={roundTripModeOptions}
              />
            </Field>

            <Field label="Jogador escolhe conta UT">
              <Toggle
                value={form.configuration.playerChoosesTeamOnSignup}
                onChange={(value) => updateConfiguration({ playerChoosesTeamOnSignup: value })}
              />
            </Field>

            <Field label="Sorteio ao vivo">
              <Toggle
                value={form.configuration.liveDraw}
                onChange={(value) => updateConfiguration({ liveDraw: value })}
              />
            </Field>

            {form.configuration.hasFinalStage ? (
              <Field label="Mata-mata">
                <Segmented
                  value={form.configuration.knockoutMode}
                  onChange={(value) =>
                    updateConfiguration({
                      knockoutMode: value as ChampionshipConfiguration["knockoutMode"],
                    })
                  }
                  options={roundTripModeOptions}
                />
              </Field>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-muted-foreground xl:col-span-2">
                Sem fase final: a classificacao vai decidir o resultado final direto pelo formato escolhido.
              </div>
            )}

            {form.configuration.hasFinalStage ? (
              <Field label="Final">
                <Segmented
                  value={form.configuration.finalMode}
                  onChange={(value) =>
                    updateConfiguration({
                      finalMode: value as ChampionshipConfiguration["finalMode"],
                    })
                  }
                  options={roundTripModeOptions}
                />
              </Field>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryTile
              title="Entrada"
              helper={
                form.configuration.playerChoosesTeamOnSignup
                  ? "Jogador escolhe a conta UT no fluxo de inscricao."
                  : "Conta ou seed definida pela operacao."
              }
            />
            <SummaryTile
              title="Classificatoria"
              helper={
                form.configuration.groupCount > 0
                  ? `${form.configuration.groupCount} grupo(s) com ${form.configuration.qualifiedPerGroup} classificado(s).`
                  : "Sem grupos; a entrada vai direto para o quadro principal."
              }
            />
            <SummaryTile
              title="Fase final"
              helper={
                form.configuration.hasFinalStage
                  ? `Mata-mata em ${form.configuration.knockoutMode === "home-away" ? "ida e volta" : "jogo unico"}.`
                  : "Sem mata-mata configurado."
              }
            />
          </div>
        </AdminSectionCard>
      ) : null}

      {currentStep.id === "configuracoes" ? (
        <AdminSectionCard
          title="Configuracoes basicas"
          description="Feche a operacao principal primeiro e use a camada avancada so quando realmente precisar."
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <OptionGroup
                  title="Modo de inscricao"
                  options={registrationModeOptions}
                  value={form.configuration.registrationMode}
                  onSelect={(value) =>
                    updateConfiguration({
                      registrationMode: value as ChampionshipConfiguration["registrationMode"],
                    })
                  }
                />

                <OptionGroup
                  title="Quem reporta resultados"
                  options={matchReportingModeOptions}
                  value={form.configuration.resultsReportedBy}
                  onSelect={(value) =>
                    updateConfiguration({
                      resultsReportedBy: value as ChampionshipConfiguration["resultsReportedBy"],
                    })
                  }
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <DatePickerField
                  label="Data de inicio"
                  value={form.startDate}
                  onChange={updateDateField("startDate")}
                />

                <DatePickerField
                  label="Data de fim (opcional)"
                  value={form.endDate}
                  onChange={updateDateField("endDate")}
                  minDate={parseDateValue(form.startDate)}
                  allowClear
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Taxa de inscricao">
                  <input
                    value={form.configuration.entryFee}
                    onChange={(event) => updateConfiguration({ entryFee: event.target.value })}
                    placeholder="Deixe em branco para gratis"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Descricao automatica">
                  <textarea value={previewDescription} readOnly className={textareaClassName} />
                </Field>
              </div>

              <details className="rounded-[24px] border border-white/8 bg-black/20 p-5">
                <summary className="cursor-pointer list-none text-sm font-semibold text-white">
                  Configuracoes avancadas
                </summary>

                <div className="mt-5 space-y-6">
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Montagem do bracket">
                      <select
                        value={form.configuration.knockoutSetupMode}
                        onChange={(event) =>
                          updateConfiguration({
                            knockoutSetupMode:
                              event.target.value as ChampionshipConfiguration["knockoutSetupMode"],
                          })
                        }
                        className={inputClassName}
                      >
                        {knockoutSetupModeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Cruzamento">
                      <select
                        value={form.configuration.knockoutBracketMode}
                        onChange={(event) =>
                          updateConfiguration({
                            knockoutBracketMode:
                              event.target.value as ChampionshipConfiguration["knockoutBracketMode"],
                          })
                        }
                        className={inputClassName}
                      >
                        {knockoutBracketModeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Sync do bracket">
                      <select
                        value={form.configuration.bracketSyncPolicy}
                        onChange={(event) =>
                          updateConfiguration({
                            bracketSyncPolicy:
                              event.target.value as ChampionshipConfiguration["bracketSyncPolicy"],
                          })
                        }
                        className={inputClassName}
                      >
                        {bracketSyncPolicyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Terceiro lugar">
                      <Toggle
                        value={form.configuration.thirdPlaceMatch}
                        onChange={(value) => updateConfiguration({ thirdPlaceMatch: value })}
                      />
                    </Field>

                    <Field label="Gols fora">
                      <Toggle
                        value={form.configuration.awayGoalsRule}
                        onChange={(value) => updateConfiguration({ awayGoalsRule: value })}
                      />
                    </Field>
                  </div>

                  <Field label="Outras informacoes">
                    <textarea
                      value={form.configuration.extraInformation}
                      onChange={(event) =>
                        updateConfiguration({ extraInformation: event.target.value })
                      }
                      placeholder="Premios, links, checkpoints e instrucoes especiais."
                      className={textareaClassName}
                    />
                  </Field>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                    <Field label="Oitavas">
                      <input
                        value={form.configuration.phaseLabels.roundOf16}
                        onChange={(event) =>
                          updateConfiguration({
                            phaseLabels: {
                              ...form.configuration.phaseLabels,
                              roundOf16: event.target.value,
                            },
                          })
                        }
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Quartas">
                      <input
                        value={form.configuration.phaseLabels.quarterfinal}
                        onChange={(event) =>
                          updateConfiguration({
                            phaseLabels: {
                              ...form.configuration.phaseLabels,
                              quarterfinal: event.target.value,
                            },
                          })
                        }
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Semifinal">
                      <input
                        value={form.configuration.phaseLabels.semifinal}
                        onChange={(event) =>
                          updateConfiguration({
                            phaseLabels: {
                              ...form.configuration.phaseLabels,
                              semifinal: event.target.value,
                            },
                          })
                        }
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Final">
                      <input
                        value={form.configuration.phaseLabels.final}
                        onChange={(event) =>
                          updateConfiguration({
                            phaseLabels: {
                              ...form.configuration.phaseLabels,
                              final: event.target.value,
                            },
                          })
                        }
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="3o lugar">
                      <input
                        value={form.configuration.phaseLabels.thirdPlace}
                        onChange={(event) =>
                          updateConfiguration({
                            phaseLabels: {
                              ...form.configuration.phaseLabels,
                              thirdPlace: event.target.value,
                            },
                          })
                        }
                        className={inputClassName}
                      />
                    </Field>
                  </div>
                </div>
              </details>
            </div>

            <div className="space-y-5">
              <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Revisao final</p>
                <div className="mt-4 space-y-3">
                  <InfoRow
                    label="Inscricao"
                    value={
                      form.configuration.registrationMode === "public"
                        ? "Publica com aprovacao"
                        : "Privada"
                    }
                  />
                  <InfoRow
                    label="Resultados"
                    value={
                      form.configuration.resultsReportedBy === "players"
                        ? "Administrador e jogadores"
                        : "Somente administrador"
                    }
                  />
                  <InfoRow
                    label="Calendario"
                    value={
                      form.startDate
                        ? form.endDate
                          ? `${form.startDate} ate ${form.endDate}`
                          : form.startDate
                        : "Defina a data de inicio para concluir"
                    }
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Regras finais</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{previewRules}</p>
              </div>
            </div>
          </div>
        </AdminSectionCard>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/admin/campeonatos">Cancelar</Link>
          </Button>
          {stepIndex > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStepIndex((current) => current - 1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Etapa anterior
            </Button>
          ) : null}
        </div>

        {!isLastStep ? (
          <Button type="button" onClick={nextStep}>
            Avancar
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            {submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-semibold text-white">{label}</span>
      {children}
    </label>
  );
}

function DatePickerField({
  label,
  value,
  onChange,
  minDate,
  allowClear = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: Date;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateValue(value);
  const handleSelect: SelectSingleEventHandler = (date) => {
    if (!date) {
      return;
    }

    onChange(formatDateValue(date));
    setOpen(false);
  };

  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-white">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`${inputClassName} flex items-center justify-between gap-3 text-left ${
              value ? "" : "text-muted-foreground"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <CalendarRange className="h-4 w-4 shrink-0 text-electric" />
              <span className="truncate">{formatVisibleDate(value)}</span>
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-primary">Abrir</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto rounded-2xl border-white/10 bg-black/95 p-0 text-white shadow-[0_20px_70px_-30px_rgba(255,211,0,0.45)]"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={minDate ? { before: minDate } : undefined}
            initialFocus
          />
          {allowClear && value ? (
            <div className="border-t border-white/10 p-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Limpar data
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function OptionGroup({
  title,
  value,
  onSelect,
  options,
}: {
  title: string;
  value: string;
  onSelect: (value: string) => void;
  options: Array<{ value: string; label: string; description: string }>;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      <div className="grid gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`rounded-[22px] border p-4 text-left transition-all ${
              value === option.value
                ? "border-primary/25 bg-primary/10"
                : "border-white/8 bg-black/20 hover:border-electric/20 hover:bg-white/5"
            }`}
          >
            <p className="text-sm font-semibold text-white">{option.label}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {option.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectableChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition-all ${
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-white/10 bg-black/20 text-muted-foreground hover:border-electric/25 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-white/5 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-4 py-2 text-sm transition-all ${
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "text-white hover:bg-white/10"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Segmented
      value={value ? "true" : "false"}
      onChange={(next) => onChange(next === "true")}
      options={[
        { value: "false", label: "Nao" },
        { value: "true", label: "Sim" },
      ]}
    />
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-7 text-white">{value}</p>
    </div>
  );
}

function SummaryTile({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
    </div>
  );
}
