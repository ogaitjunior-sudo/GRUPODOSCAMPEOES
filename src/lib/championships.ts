import type {
  BracketSyncPolicy,
  ChampionshipConfiguration,
  ChampionshipFormValues,
  ChampionshipRegistrationRequest,
  ChampionshipRegistrationStatus,
  ChampionshipFormat,
  ChampionshipGame,
  ChampionshipPhaseLabels,
  ChampionshipPlatform,
  ChampionshipRecord,
  ChampionshipStatus,
  KnockoutBracketMode,
  KnockoutSetupMode,
  MatchReportingMode,
  RegistrationMode,
  RoundTripMode,
} from "@/types/championship";

export const championshipStatusOptions: ChampionshipStatus[] = [
  "DRAFT",
  "REGISTRATION",
  "READY",
  "STARTED",
  "FINISHED",
];

export function normalizeChampionshipStatus(value: unknown): ChampionshipStatus {
  if (
    value === "DRAFT" ||
    value === "REGISTRATION" ||
    value === "READY" ||
    value === "STARTED" ||
    value === "FINISHED"
  ) {
    return value;
  }

  if (value === "Inscricoes abertas") {
    return "REGISTRATION";
  }

  if (value === "Em andamento") {
    return "STARTED";
  }

  if (value === "Finalizado" || value === "Cancelado") {
    return "FINISHED";
  }

  return "DRAFT";
}

export function getChampionshipStatusLabel(status: ChampionshipStatus) {
  if (status === "DRAFT") {
    return "Rascunho";
  }

  if (status === "REGISTRATION") {
    return "Inscricoes abertas";
  }

  if (status === "READY") {
    return "Pronto para tabela";
  }

  if (status === "STARTED") {
    return "Em andamento";
  }

  if (status === "FINISHED") {
    return "Finalizado";
  }

  return "Finalizado";
}

export function isRegistrationOpenStatus(status: ChampionshipStatus) {
  return status === "REGISTRATION";
}

export function isStartedStatus(status: ChampionshipStatus) {
  return status === "STARTED";
}

export function isFinishedStatus(status: ChampionshipStatus) {
  return status === "FINISHED";
}

export const championshipGameOptions: ChampionshipGame[] = ["FC 26"];

export const championshipPlatformOptions: ChampionshipPlatform[] = [
  "PlayStation 5",
  "PlayStation 4",
  "Xbox Series",
  "Xbox One",
  "PC",
];

export const championshipFormatOptions: Array<{
  value: ChampionshipFormat;
  label: string;
  description: string;
}> = [
  {
    value: "points-league",
    label: "Pontos corridos",
    description:
      "Todos se enfrentam dentro de um mesmo grupo e a tabela final define o campeao sem mata-mata.",
  },
  {
    value: "points-league-knockout",
    label: "Pontos corridos + mata-mata",
    description:
      "Cada competidor enfrenta todos os demais em um unico grupo. Depois, os melhores avancam para o mata-mata.",
  },
  {
    value: "groups-knockout",
    label: "Grupos + mata-mata",
    description:
      "As equipes sao divididas em grupos e os classificados avancam para o mata-mata ate a grande final.",
  },
  {
    value: "knockout",
    label: "Mata-mata",
    description:
      "A competicao comeca direto em confrontos eliminatorios, sem fase de grupos anterior.",
  },
  {
    value: "cross-brackets",
    label: "Chaves cruzadas",
    description:
      "A fase classificatoria organiza confrontos cruzados por chave, acelerando a leitura do mata-mata.",
  },
];

export const roundTripModeOptions: Array<{ value: RoundTripMode; label: string }> = [
  { value: "single-leg", label: "Somente ida" },
  { value: "home-away", label: "Ida e volta" },
];

export const knockoutBracketModeOptions: Array<{
  value: KnockoutBracketMode;
  label: string;
  description: string;
}> = [
  {
    value: "cross-groups",
    label: "Cruzamento por grupos",
    description:
      "Cruza os classificados por grupos emparelhados, como 1o de um grupo contra 2o do outro.",
  },
  {
    value: "best-vs-worst",
    label: "Melhor x pior",
    description:
      "Ordena os classificados pela campanha e monta os confrontos do melhor contra o pior.",
  },
];

export const knockoutSetupModeOptions: Array<{
  value: KnockoutSetupMode;
  label: string;
  description: string;
}> = [
  {
    value: "automatic",
    label: "Automatico",
    description: "O sistema monta os confrontos iniciais com base na classificacao calculada.",
  },
  {
    value: "manual",
    label: "Manual",
    description: "O sistema gera a estrutura e o administrador escolhe os confrontos iniciais.",
  },
];

export const bracketSyncPolicyOptions: Array<{
  value: BracketSyncPolicy;
  label: string;
  description: string;
}> = [
  {
    value: "warn",
    label: "Avisar e regerar",
    description:
      "Quando a fase de grupos mudar depois do bracket, a tela avisa e permite regerar as finais.",
  },
  {
    value: "freeze",
    label: "Congelar bracket",
    description:
      "Quando a fase de grupos mudar, o chaveamento permanece congelado ate que alguem escolha regerar manualmente.",
  },
];

export const matchReportingModeOptions: Array<{
  value: MatchReportingMode;
  label: string;
  description: string;
}> = [
  {
    value: "admin",
    label: "Administrador",
    description: "Apenas o administrador informa os resultados das partidas.",
  },
  {
    value: "players",
    label: "Jogadores",
    description:
      "Administrador e jogadores registrados podem informar os resultados das respectivas partidas.",
  },
];

export const registrationModeOptions: Array<{
  value: RegistrationMode;
  label: string;
  description: string;
}> = [
  {
    value: "public",
    label: "Publica",
    description:
      "Qualquer jogador registrado pode se inscrever, mas o administrador aprova a entrada.",
  },
  {
    value: "private",
    label: "Privada",
    description: "Somente o administrador pode registrar as equipes no campeonato.",
  },
];

export function createDefaultPhaseLabels(): ChampionshipPhaseLabels {
  return {
    roundOf16: "Oitavas de final",
    quarterfinal: "Quartas de final",
    semifinal: "Semifinal",
    final: "Final",
    thirdPlace: "Disputa de 3o lugar",
  };
}

function normalizeLegacyBracketMode(value: unknown): KnockoutBracketMode {
  if (value === "best-vs-worst") {
    return "best-vs-worst";
  }

  return "cross-groups";
}

function normalizePhaseLabels(value: Partial<ChampionshipPhaseLabels> | undefined) {
  const defaults = createDefaultPhaseLabels();

  return {
    roundOf16: String(value?.roundOf16 ?? defaults.roundOf16).trim() || defaults.roundOf16,
    quarterfinal:
      String(value?.quarterfinal ?? defaults.quarterfinal).trim() || defaults.quarterfinal,
    semifinal: String(value?.semifinal ?? defaults.semifinal).trim() || defaults.semifinal,
    final: String(value?.final ?? defaults.final).trim() || defaults.final,
    thirdPlace: String(value?.thirdPlace ?? defaults.thirdPlace).trim() || defaults.thirdPlace,
  } satisfies ChampionshipPhaseLabels;
}

export function createDefaultChampionshipConfiguration(): ChampionshipConfiguration {
  return {
    game: "FC 26",
    rankingName: "CAMPEOES",
    isRankedGame: true,
    platform: "PlayStation 5",
    format: "points-league-knockout",
    qualifiedPerGroup: 8,
    groupCount: 1,
    groupStageMode: "single-leg",
    knockoutMode: "single-leg",
    knockoutBracketMode: "cross-groups",
    knockoutSetupMode: "automatic",
    finalMode: "single-leg",
    hasFinalStage: true,
    thirdPlaceMatch: false,
    awayGoalsRule: false,
    bracketSyncPolicy: "warn",
    phaseLabels: createDefaultPhaseLabels(),
    resultsReportedBy: "admin",
    registrationMode: "public",
    playerChoosesTeamOnSignup: true,
    liveDraw: false,
    entryFee: "",
    extraInformation: "",
  };
}

export function getFormatOption(format: ChampionshipFormat) {
  return championshipFormatOptions.find((item) => item.value === format) ?? championshipFormatOptions[0];
}

export function getAutomaticGroupCount(format: ChampionshipFormat, currentGroupCount: number) {
  if (format === "points-league" || format === "points-league-knockout") {
    return 1;
  }

  if (format === "knockout") {
    return 0;
  }

  return Math.max(1, currentGroupCount || 1);
}

export function shouldLockGroupCount(format: ChampionshipFormat) {
  return format === "points-league" || format === "points-league-knockout" || format === "knockout";
}

export function buildChampionshipDescription(configuration: ChampionshipConfiguration) {
  const formatOption = getFormatOption(configuration.format);
  const registrationLabel =
    configuration.registrationMode === "public" ? "inscricoes publicas" : "inscricoes privadas";
  const finalStageLabel = configuration.hasFinalStage
    ? `fase final ${configuration.knockoutSetupMode === "manual" ? "manual" : "automatica"}`
    : "sem fase final";
  const rankedGameLabel = configuration.isRankedGame ? "jogo rankeado" : "jogo nao rankeado";

  return `${formatOption.label} no ${configuration.game} para ${configuration.platform}, vinculado ao ranking ${configuration.rankingName}, ${rankedGameLabel}, com ${registrationLabel} e ${finalStageLabel}.`;
}

export function buildChampionshipRules(configuration: ChampionshipConfiguration) {
  const groupStageText =
    configuration.groupCount > 0
      ? `Fase de grupos: ${configuration.groupStageMode === "home-away" ? "ida e volta" : "somente ida"}`
      : "Sem fase de grupos";
  const knockoutText = configuration.hasFinalStage
    ? `Mata-mata: ${configuration.knockoutMode === "home-away" ? "ida e volta" : "somente ida"}`
    : "Sem mata-mata";
  const finalText = configuration.hasFinalStage
    ? `Final: ${configuration.finalMode === "home-away" ? "ida e volta" : "somente ida"}`
    : "Sem final";
  const bracketText = configuration.hasFinalStage
    ? `Montagem do bracket: ${configuration.knockoutSetupMode === "manual" ? "manual" : configuration.knockoutBracketMode}`
    : "";
  const syncText = configuration.hasFinalStage
    ? `Mudancas na fase de grupos: ${configuration.bracketSyncPolicy === "freeze" ? "congelam o bracket" : "avisam para regeracao"}`
    : "";
  const reportingText =
    configuration.resultsReportedBy === "players"
      ? "Resultados por administrador e jogadores"
      : "Resultados somente pelo administrador";
  const registrationText =
    configuration.registrationMode === "public" ? "Inscricoes publicas" : "Inscricoes privadas";
  const rankedGameText = configuration.isRankedGame
    ? "Jogo rankeado: Sim"
    : "Jogo rankeado: Nao";
  const teamChoiceText = configuration.playerChoosesTeamOnSignup
    ? "Jogador escolhe equipe na inscricao"
    : "Administrador define equipes para sorteio";
  const liveDrawText = configuration.liveDraw ? "Sorteio ao vivo habilitado" : "Sorteio ao vivo desabilitado";
  const thirdPlaceText = configuration.thirdPlaceMatch ? "Com disputa de terceiro lugar" : "Sem disputa de terceiro lugar";
  const awayGoalsText = configuration.awayGoalsRule
    ? "Desempate por gols fora de casa ativo"
    : "Sem gols fora de casa";
  const entryFeeText = configuration.entryFee.trim()
    ? `Taxa de inscricao: ${configuration.entryFee.trim()}`
    : "Taxa de inscricao gratuita";
  const extraText = configuration.extraInformation.trim()
    ? `Observacoes: ${configuration.extraInformation.trim()}`
    : "";

  return [
    `Ranking: ${configuration.rankingName}`,
    groupStageText,
    knockoutText,
    finalText,
    bracketText,
    syncText,
    reportingText,
    registrationText,
    rankedGameText,
    teamChoiceText,
    liveDrawText,
    thirdPlaceText,
    awayGoalsText,
    entryFeeText,
    extraText,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function resolveChampionshipEndDate(startDate: string, endDate: string) {
  const normalizedStartDate = typeof startDate === "string" ? startDate.trim() : "";
  const normalizedEndDate = typeof endDate === "string" ? endDate.trim() : "";

  if (normalizedEndDate) {
    return normalizedEndDate;
  }

  return normalizedStartDate;
}

export function formatChampionshipDateRange(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const normalizedEndDate = resolveChampionshipEndDate(startDate, endDate);
  const start = new Date(startDate);

  if (Number.isNaN(start.getTime())) {
    return "Data a definir";
  }

  if (!normalizedEndDate) {
    return formatter.format(start);
  }

  const end = new Date(normalizedEndDate);

  if (Number.isNaN(end.getTime()) || start.getTime() === end.getTime()) {
    return formatter.format(start);
  }

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function createChampionshipId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `championship-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createChampionshipRegistrationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `championship-registration-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function sortChampionships(items: ChampionshipRecord[]) {
  return [...items].sort((left, right) => {
    const leftDate = new Date(left.startDate).getTime();
    const rightDate = new Date(right.startDate).getTime();

    if (leftDate !== rightDate) {
      return leftDate - rightDate;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export function normalizeChampionshipConfiguration(
  configuration: Partial<ChampionshipConfiguration> | undefined,
) {
  const defaults = createDefaultChampionshipConfiguration();
  const nextFormat = configuration?.format ?? defaults.format;
  const nextGroupCount = getAutomaticGroupCount(
    nextFormat,
    Number(configuration?.groupCount ?? defaults.groupCount),
  );
  const hasFinalStage =
    nextFormat === "knockout"
      ? true
      : typeof configuration?.hasFinalStage === "boolean"
        ? configuration.hasFinalStage
        : nextFormat !== "points-league";

  return {
    ...defaults,
    ...configuration,
    rankingName: String(configuration?.rankingName ?? defaults.rankingName).trim() || defaults.rankingName,
    isRankedGame:
      typeof configuration?.isRankedGame === "boolean"
        ? configuration.isRankedGame
        : defaults.isRankedGame,
    entryFee: String(configuration?.entryFee ?? defaults.entryFee).trim(),
    extraInformation: String(configuration?.extraInformation ?? defaults.extraInformation).trim(),
    qualifiedPerGroup: Math.max(1, Number(configuration?.qualifiedPerGroup ?? defaults.qualifiedPerGroup)),
    groupCount: nextGroupCount,
    hasFinalStage,
    knockoutBracketMode: normalizeLegacyBracketMode(
      configuration?.knockoutBracketMode ?? defaults.knockoutBracketMode,
    ),
    knockoutSetupMode:
      configuration?.knockoutSetupMode === "manual" ? "manual" : defaults.knockoutSetupMode,
    bracketSyncPolicy:
      configuration?.bracketSyncPolicy === "freeze" ? "freeze" : defaults.bracketSyncPolicy,
    phaseLabels: normalizePhaseLabels(configuration?.phaseLabels),
  } satisfies ChampionshipConfiguration;
}

export function normalizeChampionshipFormValues(values: ChampionshipFormValues): ChampionshipFormValues {
  const configuration = normalizeChampionshipConfiguration(values.configuration);

  return {
    name: values.name.trim(),
    description: values.description.trim() || buildChampionshipDescription(configuration),
    startDate: values.startDate,
    endDate: resolveChampionshipEndDate(values.startDate, values.endDate),
    teamCount: Number(values.teamCount),
    rules: values.rules.trim() || buildChampionshipRules(configuration),
    status: normalizeChampionshipStatus(values.status),
    configuration,
  };
}

function isChampionshipRegistrationStatus(value: unknown): value is ChampionshipRegistrationStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}

export function normalizeChampionshipRegistrationRequests(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ChampionshipRegistrationRequest[];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const request = item as Partial<ChampionshipRegistrationRequest>;
      const requestedAt =
        typeof request.requestedAt === "string" && request.requestedAt.trim()
          ? request.requestedAt
          : new Date().toISOString();
      const playerId =
        typeof request.playerId === "string" && request.playerId.trim()
          ? request.playerId.trim()
          : `legacy-player-${index}`;

      return {
        id:
          typeof request.id === "string" && request.id.trim()
            ? request.id.trim()
            : createChampionshipRegistrationId(),
        playerId,
        playerName:
          typeof request.playerName === "string" && request.playerName.trim()
            ? request.playerName.trim()
            : "Jogador",
        playerEmail:
          typeof request.playerEmail === "string" && request.playerEmail.trim()
            ? request.playerEmail.trim().toLowerCase()
            : "",
        status: isChampionshipRegistrationStatus(request.status) ? request.status : "pending",
        requestedAt,
        reviewedAt:
          typeof request.reviewedAt === "string" && request.reviewedAt.trim()
            ? request.reviewedAt
            : null,
        reviewedBy:
          typeof request.reviewedBy === "string" && request.reviewedBy.trim()
            ? request.reviewedBy.trim()
            : null,
      } satisfies ChampionshipRegistrationRequest;
    })
    .sort(
      (left, right) =>
        new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime(),
    );
}

export function getChampionshipRegistrationByPlayer(
  championship: Pick<ChampionshipRecord, "registrationRequests">,
  playerId: string | null | undefined,
) {
  if (!playerId) {
    return null;
  }

  return (
    championship.registrationRequests.find((request) => request.playerId === playerId) ?? null
  );
}

export function getChampionshipAvailability(
  championship: Pick<ChampionshipRecord, "teamCount" | "registrationRequests">,
) {
  const total = Math.max(0, Number(championship.teamCount) || 0);
  const pending = championship.registrationRequests.filter(
    (request) => request.status === "pending",
  ).length;
  const approved = championship.registrationRequests.filter(
    (request) => request.status === "approved",
  ).length;
  const occupied = Math.min(total, pending + approved);
  const available = Math.max(0, total - occupied);

  return {
    total,
    pending,
    approved,
    occupied,
    available,
  };
}

export function formatChampionshipAvailableSlots(
  championship: Pick<ChampionshipRecord, "teamCount" | "registrationRequests">,
) {
  const availability = getChampionshipAvailability(championship);

  if (availability.total <= 0) {
    return "Sem limite definido";
  }

  if (availability.available === 0) {
    return `0/${availability.total} disponiveis`;
  }

  return `${availability.available}/${availability.total} disponiveis`;
}

export function getChampionshipRegistrationStatusLabel(status: ChampionshipRegistrationStatus) {
  if (status === "approved") {
    return "Aprovado";
  }

  if (status === "rejected") {
    return "Recusado";
  }

  return "Aguardando aprovacao";
}
