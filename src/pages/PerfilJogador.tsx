import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  Inbox,
  Loader2,
  MessageSquareText,
  Search,
  Send,
  ShieldCheck,
  Swords,
  Trophy,
  Trash2,
  UserRound,
  Upload,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import logoGC from "@/assets/logo-gc-fc26.png";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { TeamCrest, TeamFlagBadge } from "@/components/championship/TeamIdentity";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { TeamPhotoBadge } from "@/components/profile/TeamPhotoBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChampionships } from "@/contexts/ChampionshipContext";
import { useFriendlyChallenges } from "@/contexts/FriendlyChallengesContext";
import { usePlayerAuth } from "@/contexts/PlayerAuthContext";
import { toast } from "@/hooks/use-toast";
import { splitFriendlyChallengesForPlayer } from "@/lib/friendly-challenges";
import { champions } from "@/data/siteContent";
import {
  formatChampionshipDateRange,
  getChampionshipRegistrationByPlayer,
  getChampionshipRegistrationStatusLabel,
} from "@/lib/championships";
import type { ChampionshipRecord } from "@/types/championship";
import type { FriendlyChallengeRecord, FriendlyChallengeStatus } from "@/types/friendly-challenge";

type ProfileTab = "perfil" | "atividade" | "campeonatos" | "rankings" | "desafios";
type ProfileMediaSection = "jogador" | "equipe";

const SUPPORTED_PROFILE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_PROFILE_IMAGE_SOURCE_FILE_SIZE = 8 * 1024 * 1024;
const MAX_PROFILE_IMAGE_STORAGE_SIZE = 256 * 1024;
const PROFILE_IMAGE_MAX_DIMENSION = 1024;
const PROFILE_IMAGE_MIN_DIMENSION = 256;
const PROFILE_IMAGE_SCALE_STEPS = [1, 0.85, 0.7, 0.55, 0.4, 0.3, 0.24];
const PROFILE_IMAGE_QUALITY_STEPS = [0.92, 0.82, 0.72, 0.62, 0.52, 0.42, 0.32];

function isProfileTab(value: string | null): value is ProfileTab {
  return (
    value === "perfil" ||
    value === "atividade" ||
    value === "campeonatos" ||
    value === "rankings" ||
    value === "desafios"
  );
}

function readFileAsDataUrl(file: Blob) {
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

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Nao foi possivel processar a imagem selecionada."));
    };
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.src = objectUrl;
  });
}

function renderOptimizedImageBlob(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      reject(new Error("Nao foi possivel preparar a imagem para upload."));
      return;
    }

    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Nao foi possivel otimizar a imagem selecionada."));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

async function prepareProfileImage(file: File) {
  if (file.size > MAX_PROFILE_IMAGE_SOURCE_FILE_SIZE) {
    throw new Error("Envie uma imagem com no maximo 8 MB.");
  }

  if (file.size <= MAX_PROFILE_IMAGE_STORAGE_SIZE) {
    return readFileAsDataUrl(file);
  }

  const image = await loadImageFromFile(file);
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight, 1);
  const baseScale = Math.min(1, PROFILE_IMAGE_MAX_DIMENSION / longestEdge);
  const minimumScale = Math.min(1, PROFILE_IMAGE_MIN_DIMENSION / longestEdge);
  let smallestBlob: Blob | null = null;

  for (const scaleStep of PROFILE_IMAGE_SCALE_STEPS) {
    const scale = Math.max(baseScale * scaleStep, minimumScale);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    for (const quality of PROFILE_IMAGE_QUALITY_STEPS) {
      const optimizedBlob = await renderOptimizedImageBlob(image, width, height, quality);

      if (!smallestBlob || optimizedBlob.size < smallestBlob.size) {
        smallestBlob = optimizedBlob;
      }

      if (optimizedBlob.size <= MAX_PROFILE_IMAGE_STORAGE_SIZE) {
        return readFileAsDataUrl(optimizedBlob);
      }
    }
  }

  if (smallestBlob && smallestBlob.size <= MAX_PROFILE_IMAGE_STORAGE_SIZE * 1.15) {
    return readFileAsDataUrl(smallestBlob);
  }

  throw new Error("Nao foi possivel reduzir a imagem automaticamente. Tente uma foto mais leve.");
}

function formatDisplayName(name: string | null) {
  if (!name) {
    return "Jogador";
  }

  return name.trim();
}

function formatJoinedDate(value: string | null | undefined) {
  if (!value) {
    return "Conta conectada ao portal";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Conta conectada ao portal";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildRankingMonitors(championships: ChampionshipRecord[]) {
  const registry = new Map<
    string,
    {
      name: string;
      championships: ChampionshipRecord[];
    }
  >();

  championships.forEach((championship) => {
    const key = championship.configuration.rankingName.trim() || "Circuito principal";
    const current = registry.get(key);

    if (current) {
      current.championships.push(championship);
      return;
    }

    registry.set(key, {
      name: key,
      championships: [championship],
    });
  });

  return Array.from(registry.values());
}

function formatFriendlyChallengeDate(date: string, time: string) {
  const parsedDate = new Date(`${date}T${time}:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Data e horario a confirmar";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function getFriendlyChallengeStatusLabel(status: FriendlyChallengeStatus) {
  if (status === "accepted") {
    return "Aceito";
  }

  if (status === "rejected") {
    return "Recusado";
  }

  return "Pendente";
}

function getFriendlyChallengeStatusClassName(status: FriendlyChallengeStatus) {
  if (status === "accepted") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-100";
  }

  if (status === "rejected") {
    return "border-red-500/25 bg-red-500/10 text-red-100";
  }

  return "border-amber-500/25 bg-amber-500/10 text-amber-100";
}

function FriendlyChallengeCard({
  challenge,
  perspective,
  isBusy,
  onRespond,
}: {
  challenge: FriendlyChallengeRecord;
  perspective: "received" | "sent";
  isBusy: boolean;
  onRespond?: (status: Extract<FriendlyChallengeStatus, "accepted" | "rejected">) => void;
}) {
  const opponent =
    perspective === "received"
      ? {
          name: challenge.fromTeamName,
          flagUrl: challenge.fromFlagUrl,
        }
      : {
          name: challenge.toTeamName,
          flagUrl: challenge.toFlagUrl,
        };
  const label = perspective === "received" ? "Desafio recebido" : "Desafio enviado";

  return (
    <article className="rounded-[28px] border border-white/8 bg-background/55 p-5 shadow-[0_18px_40px_hsl(0_0%_0%_/_0.22)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">{label}</p>
            <Badge
              variant="outline"
              className={getFriendlyChallengeStatusClassName(challenge.status)}
            >
              {getFriendlyChallengeStatusLabel(challenge.status)}
            </Badge>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <TeamCrest name={opponent.name} size="md" className="border-white/20" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-heading text-lg uppercase tracking-[0.08em] text-foreground">
                  {opponent.name}
                </p>
                <TeamFlagBadge teamName={opponent.name} flagUrl={opponent.flagUrl} size="sm" />
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-electric">
                {challenge.championshipName ?? "Amistoso avulso"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-background/55 px-4 py-3 text-sm text-muted-foreground">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Janela sugerida</p>
          <p className="mt-2 font-semibold text-foreground">
            {formatFriendlyChallengeDate(challenge.date, challenge.time)}
          </p>
        </div>
      </div>

      {challenge.message ? (
        <div className="mt-5 rounded-2xl border border-white/8 bg-background/45 px-4 py-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <MessageSquareText className="h-4 w-4 text-electric" />
            Mensagem
          </div>
          <p className="mt-3 text-sm leading-7 text-foreground">{challenge.message}</p>
        </div>
      ) : null}

      {perspective === "received" && challenge.status === "pending" && onRespond ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            className="bg-electric text-background hover:bg-electric/90"
            onClick={() => onRespond("accepted")}
            disabled={isBusy}
          >
            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Aceitar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-white/12 bg-white/[0.03] text-slate-100 hover:bg-white/[0.06]"
            onClick={() => onRespond("rejected")}
            disabled={isBusy}
          >
            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
            Recusar
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function LinkButton({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-md border border-primary/30 px-4 py-2 font-heading text-xs font-bold uppercase tracking-[0.16em] text-primary transition-all hover:bg-primary/10"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function ProfileInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-background/55 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-foreground">{value}</p>
    </div>
  );
}

function QuickLinkCard({
  to,
  icon: Icon,
  title,
  helper,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  helper: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-white/8 bg-background/55 p-4 transition-all hover:-translate-y-0.5 hover:border-electric/30"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
        </div>
      </div>
    </Link>
  );
}

function ChampionshipRows({
  items,
  playerId,
  emptyTitle,
  emptyDescription,
}: {
  items: ChampionshipRecord[];
  playerId: string | null;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyStateCard
        icon={Trophy}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel="Abrir catalogo"
        actionTo="/campeonatos"
        className="mx-auto max-w-3xl"
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        (() => {
          const registrationRequest = getChampionshipRegistrationByPlayer(item, playerId);

          return (
            <Link
              key={item.id}
              to={`/campeonatos/${item.id}`}
              className="block rounded-[28px] border border-white/8 bg-background/55 p-5 transition-all hover:-translate-y-0.5 hover:border-electric/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">
                    {item.configuration.rankingName}
                  </p>
                  <h3 className="mt-2 font-heading text-xl text-foreground">{item.name}</h3>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {registrationRequest ? (
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                      {getChampionshipRegistrationStatusLabel(registrationRequest.status)}
                    </Badge>
                  ) : null}
                  <StatusBadge status={item.status} />
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.description}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <ProfileInfoCard label="Plataforma" value={item.configuration.platform} />
                <ProfileInfoCard
                  label="Calendario"
                  value={formatChampionshipDateRange(item.startDate, item.endDate)}
                />
                <ProfileInfoCard
                  label="Participacao"
                  value={
                    registrationRequest
                      ? getChampionshipRegistrationStatusLabel(registrationRequest.status)
                      : "Sem pedido enviado"
                  }
                />
              </div>
            </Link>
          );
        })()
      ))}
    </div>
  );
}

export default function PerfilJogador() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProfileTab>("atividade");
  const [activeProfileSection, setActiveProfileSection] = useState<ProfileMediaSection>("jogador");
  const [challengeActionId, setChallengeActionId] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isReadingAvatar, setIsReadingAvatar] = useState(false);
  const [teamPhotoDraft, setTeamPhotoDraft] = useState<string | null>(null);
  const [teamPhotoError, setTeamPhotoError] = useState<string | null>(null);
  const [isReadingTeamPhoto, setIsReadingTeamPhoto] = useState(false);
  const playerPhotoSectionRef = useRef<HTMLElement | null>(null);
  const teamPhotoSectionRef = useRef<HTMLElement | null>(null);
  const { championships } = useChampionships();
  const {
    isAuthenticated,
    loginName,
    playerEmail,
    session,
    avatarUrl,
    teamPhotoUrl,
    isUpdatingProfile,
    updateProfileAvatar,
    updateTeamPhoto,
  } = usePlayerAuth();
  const {
    challenges,
    isLoading: isLoadingFriendlyChallenges,
    updateChallengeStatus,
  } = useFriendlyChallenges();

  useEffect(() => {
    const tabFromUrl = searchParams.get("aba");
    setActiveTab(isProfileTab(tabFromUrl) ? tabFromUrl : "atividade");
  }, [searchParams]);

  useEffect(() => {
    setAvatarDraft(avatarUrl ?? null);
    setAvatarError(null);
  }, [avatarUrl]);

  useEffect(() => {
    setTeamPhotoDraft(teamPhotoUrl ?? null);
    setTeamPhotoError(null);
  }, [teamPhotoUrl]);

  useEffect(() => {
    if (activeTab !== "perfil" || typeof window === "undefined") {
      return;
    }

    const targetSection =
      activeProfileSection === "equipe" ? teamPhotoSectionRef.current : playerPhotoSectionRef.current;

    if (!targetSection) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      targetSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeProfileSection, activeTab]);

  if (!isAuthenticated) {
    return (
      <PageShell>
        <section className="px-4 py-20">
          <div className="container mx-auto">
            <EmptyStateCard
              icon={UserRound}
              title="Entre para abrir o perfil"
              description="O perfil do jogador fica disponivel depois do login. Entre com sua conta para acessar atividade, campeonatos e rankings pessoais."
              actionLabel="Abrir login"
              actionTo="/entrar"
              className="mx-auto max-w-3xl"
            />
          </div>
        </section>
      </PageShell>
    );
  }

  const playerName = formatDisplayName(loginName);
  const openChampionships = championships.filter((item) => item.status === "REGISTRATION");
  const liveChampionships = championships.filter((item) => item.status === "STARTED");
  const upcomingChampionships = championships.filter((item) => item.status === "DRAFT" || item.status === "READY");
  const rankingMonitors = buildRankingMonitors(championships);
  const historicalTitles = champions.reduce((total, item) => total + item.titles, 0);
  const challengeInbox = splitFriendlyChallengesForPlayer(challenges, {
    playerId: session?.id ?? null,
    playerEmail,
  });
  const pendingReceivedChallenges = challengeInbox.received.filter((item) => item.status === "pending");
  const pendingSentChallenges = challengeInbox.sent.filter((item) => item.status === "pending");
  const tabButtons: Array<{
    key: ProfileTab;
    label: string;
    helper: string;
    icon: LucideIcon;
  }> = [
    {
      key: "perfil",
      label: "Perfil",
      helper: "Foto do jogador, da equipe e identidade da conta.",
      icon: Camera,
    },
    {
      key: "atividade",
      label: "Painel",
      helper: "Resumo do acesso e radar do circuito.",
      icon: UserRound,
    },
    {
      key: "campeonatos",
      label: "Campeonatos",
      helper: "Catalogo, janelas e eventos ao vivo.",
      icon: Trophy,
    },
    {
      key: "rankings",
      label: "Ranking",
      helper: "Monitoramento e historico do circuito.",
      icon: BarChart3,
    },
    {
      key: "desafios",
      label: "Desafios",
      helper: "Recebidos, enviados e respostas do amistoso.",
      icon: Swords,
    },
  ];

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);

    const nextParams = new URLSearchParams(searchParams);

    if (tab === "atividade") {
      nextParams.delete("aba");
    } else {
      nextParams.set("aba", tab);
    }

    setSearchParams(nextParams, { replace: true });
  };

  const handleOpenProfileSection = (section: ProfileMediaSection) => {
    setActiveProfileSection(section);
    handleTabChange("perfil");
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!SUPPORTED_PROFILE_IMAGE_TYPES.has(file.type)) {
      setAvatarError("Envie a foto em PNG, JPG ou WEBP.");
      return;
    }

    setIsReadingAvatar(true);
    setAvatarError(null);

    try {
      const nextAvatarUrl = await prepareProfileImage(file);
      setAvatarDraft(nextAvatarUrl);
    } catch (error) {
      setAvatarError(
        error instanceof Error ? error.message : "Nao foi possivel carregar a foto selecionada.",
      );
    } finally {
      setIsReadingAvatar(false);
    }
  };

  const handleSaveAvatar = async (nextAvatarUrl: string | null) => {
    setAvatarError(null);

    const result = await updateProfileAvatar(nextAvatarUrl);

    if (!result.success) {
      setAvatarError(result.message ?? "Nao foi possivel atualizar a foto do perfil.");
      toast({
        title: "Nao foi possivel atualizar a foto",
        description: result.message ?? "Tente novamente em alguns instantes.",
      });
      return;
    }

    setAvatarDraft(nextAvatarUrl);
    toast({
      title: nextAvatarUrl ? "Foto atualizada" : "Foto removida",
      description:
        result.message ??
        (nextAvatarUrl
          ? "Sua nova foto ja aparece no perfil."
          : "O perfil voltou a usar o icone padrao."),
    });
  };

  const handleTeamPhotoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!SUPPORTED_PROFILE_IMAGE_TYPES.has(file.type)) {
      setTeamPhotoError("Envie a foto da equipe em PNG, JPG ou WEBP.");
      return;
    }

    setIsReadingTeamPhoto(true);
    setTeamPhotoError(null);

    try {
      const nextTeamPhotoUrl = await prepareProfileImage(file);
      setTeamPhotoDraft(nextTeamPhotoUrl);
    } catch (error) {
      setTeamPhotoError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar a foto da equipe selecionada.",
      );
    } finally {
      setIsReadingTeamPhoto(false);
    }
  };

  const handleSaveTeamPhoto = async (nextTeamPhotoUrl: string | null) => {
    setTeamPhotoError(null);

    const result = await updateTeamPhoto(nextTeamPhotoUrl);

    if (!result.success) {
      setTeamPhotoError(result.message ?? "Nao foi possivel atualizar a foto da equipe.");
      toast({
        title: "Nao foi possivel atualizar a foto da equipe",
        description: result.message ?? "Tente novamente em alguns instantes.",
      });
      return;
    }

    setTeamPhotoDraft(nextTeamPhotoUrl);
    toast({
      title: nextTeamPhotoUrl ? "Foto da equipe atualizada" : "Foto da equipe removida",
      description:
        result.message ??
        (nextTeamPhotoUrl
          ? "A identidade publica do seu time ja foi atualizada."
          : "O time voltou a usar o selo padrao."),
    });
  };

  const hasAvatarChanges = (avatarDraft ?? null) !== (avatarUrl ?? null);
  const hasSavedAvatar = Boolean(avatarUrl);
  const hasDraftAvatar = Boolean(avatarDraft);
  const hasTeamPhotoChanges = (teamPhotoDraft ?? null) !== (teamPhotoUrl ?? null);
  const hasSavedTeamPhoto = Boolean(teamPhotoUrl);
  const hasDraftTeamPhoto = Boolean(teamPhotoDraft);

  const handleRespondToChallenge = async (
    challengeId: string,
    status: Extract<FriendlyChallengeStatus, "accepted" | "rejected">,
  ) => {
    setChallengeActionId(challengeId);

    try {
      await updateChallengeStatus({ challengeId, status });
      toast({
        title: status === "accepted" ? "Desafio aceito" : "Desafio recusado",
        description:
          status === "accepted"
            ? "O desafio amistoso foi aceito e ja aparece atualizado no seu painel."
            : "O convite foi recusado e o status ja foi atualizado para o remetente.",
      });
    } catch (error) {
      toast({
        title: "Nao foi possivel responder ao desafio",
        description:
          error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
      });
    } finally {
      setChallengeActionId(null);
    }
  };

  return (
    <PageShell className="bg-background">
      <section className="relative overflow-hidden px-4 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(51_100%_50%_/_0.10),transparent_28%),radial-gradient(circle_at_82%_18%,hsl(195_100%_50%_/_0.12),transparent_24%),linear-gradient(180deg,hsl(0_0%_6%),hsl(0_0%_4%))]" />

        <div className="relative z-10 container mx-auto">
          <div className="mb-10">
            <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
              Perfil do jogador
            </p>
            <h1 className="mt-3 font-heading text-4xl font-black gradient-gold-text text-glow-gold">
              PAINEL DE {playerName.toUpperCase()}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              O perfil agora funciona como central publica do jogador para acompanhar o circuito
              X1 UT, sem depender de um backoffice separado.
            </p>
          </div>

          <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-5">
              <div className="overflow-hidden rounded-[28px] border border-primary/20 bg-metallic-card shadow-[0_18px_45px_hsl(0_0%_0%_/_0.34)] border-glow-gold">
                <div className="relative flex h-72 items-end justify-center bg-[radial-gradient(circle_at_top,hsl(51_100%_50%_/_0.18),transparent_38%),linear-gradient(180deg,hsl(0_0%_18%),hsl(0_0%_10%))]">
                  <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(hsl(0_0%_100%_/_0.04)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%_/_0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
                  <PlayerAvatar name={playerName} avatarUrl={avatarUrl} size="xl" className="mb-6" />
                </div>

                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-heading text-xl text-foreground">{playerName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-electric">
                        Conta publica do circuito
                      </p>
                    </div>
                    <TeamPhotoBadge
                      name={playerName}
                      photoUrl={teamPhotoUrl}
                      fallbackImageUrl={logoGC}
                      className="h-11 w-11 border-primary/20 bg-background/70 p-1"
                      imageClassName={teamPhotoUrl ? undefined : "object-contain p-1"}
                    />
                  </div>

                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span>{playerEmail ?? loginName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-electric" />
                      <span>Conta ativa desde {formatJoinedDate(session?.loginAt)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>Foco atual em campeonatos X1 de Ultimate Team</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-primary/30 bg-primary/10 font-heading text-xs font-bold uppercase tracking-[0.16em] text-primary hover:bg-primary/15"
                      onClick={() => handleOpenProfileSection("jogador")}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Editar foto
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-electric/30 bg-electric/10 font-heading text-xs font-bold uppercase tracking-[0.16em] text-electric hover:bg-electric/15"
                      onClick={() => handleOpenProfileSection("equipe")}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Foto da equipe
                    </Button>
                    <LinkButton to="/campeonatos" icon={Trophy} label="Abrir catalogo" />
                    <LinkButton to="/ranking" icon={BarChart3} label="Ver ranking" />
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-border bg-card/80 p-3 shadow-[0_12px_30px_hsl(0_0%_0%_/_0.26)]">
                {tabButtons.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabChange(tab.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                      activeTab === tab.key
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        activeTab === tab.key
                          ? "border-primary/30 bg-primary/12 text-primary"
                          : "border-border bg-background/50 text-electric"
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{tab.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {tab.helper}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </button>
                ))}
              </div>
            </aside>

            <div className="space-y-8">
              {activeTab === "perfil" && (
                <div className="space-y-8">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant={activeProfileSection === "jogador" ? "default" : "outline"}
                      className={
                        activeProfileSection === "jogador"
                          ? "bg-primary text-background hover:bg-primary/90"
                          : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                      }
                      onClick={() => setActiveProfileSection("jogador")}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Foto do jogador
                    </Button>
                    <Button
                      type="button"
                      variant={activeProfileSection === "equipe" ? "default" : "outline"}
                      className={
                        activeProfileSection === "equipe"
                          ? "bg-electric text-background hover:bg-electric/90"
                          : "border-electric/30 bg-electric/10 text-electric hover:bg-electric/15"
                      }
                      onClick={() => setActiveProfileSection("equipe")}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Foto da equipe
                    </Button>
                  </div>

                  <section className="rounded-[28px] border border-primary/18 bg-metallic-card p-6 shadow-[0_20px_45px_hsl(0_0%_0%_/_0.32)]">
                    <div ref={playerPhotoSectionRef} />
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                      <div>
                        <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
                          Perfil
                        </p>
                        <h2 className="mt-2 font-heading text-3xl text-foreground">
                          Foto do jogador
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                          Adicione uma foto para personalizar seu card publico. A imagem aparece
                          no topo do perfil e no menu da conta para reforcar sua identidade dentro
                          do circuito.
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
                      <div className="overflow-hidden rounded-[28px] border border-primary/16 bg-background/45 shadow-[0_18px_40px_hsl(0_0%_0%_/_0.22)]">
                        <div className="relative flex h-72 items-end justify-center bg-[radial-gradient(circle_at_top,hsl(51_100%_50%_/_0.16),transparent_38%),linear-gradient(180deg,hsl(0_0%_18%),hsl(0_0%_10%))]">
                          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(hsl(0_0%_100%_/_0.04)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%_/_0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
                          <PlayerAvatar
                            name={playerName}
                            avatarUrl={avatarDraft}
                            size="xl"
                            className="mb-8 h-40 w-40 border-primary/30 shadow-[0_0_40px_hsl(51_100%_50%_/_0.16)]"
                          />
                        </div>

                        <div className="space-y-3 p-6">
                          <p className="text-xs uppercase tracking-[0.22em] text-electric">
                            Preview ao vivo
                          </p>
                          <p className="font-heading text-xl text-foreground">{playerName}</p>
                          <p className="text-sm leading-7 text-muted-foreground">
                            Use imagens quadradas e leves para manter o carregamento rapido no
                            desktop e no celular.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-white/8 bg-background/45 p-6 shadow-[0_18px_40px_hsl(0_0%_0%_/_0.22)]">
                        <div className="flex flex-col gap-6">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-primary">
                              Upload da foto
                            </p>
                            <p className="mt-3 text-sm leading-7 text-muted-foreground">
                              PNG, JPG ou WEBP com ate 8 MB. O sistema otimiza a imagem
                              automaticamente para manter o perfil leve e rapido.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-4 py-2 font-heading text-xs font-bold uppercase tracking-[0.16em] text-electric transition hover:bg-electric/15">
                              <Upload className="h-4 w-4" />
                              Escolher foto
                              <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                                className="sr-only"
                                onChange={(event) => void handleAvatarFileChange(event)}
                                disabled={isReadingAvatar || isUpdatingProfile}
                              />
                            </label>

                            <Button
                              type="button"
                              variant="outline"
                              className="border-white/12 bg-white/[0.03] text-slate-100 hover:bg-white/[0.06]"
                              onClick={() => {
                                if (hasAvatarChanges) {
                                  setAvatarDraft(avatarUrl ?? null);
                                  setAvatarError(null);
                                  return;
                                }

                                void handleSaveAvatar(null);
                              }}
                              disabled={
                                isReadingAvatar ||
                                isUpdatingProfile ||
                                (!hasAvatarChanges && !hasSavedAvatar && !hasDraftAvatar)
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {hasAvatarChanges ? "Cancelar alteracao" : "Remover foto"}
                            </Button>
                          </div>

                          <div className="rounded-[24px] border border-white/8 bg-background/55 p-5">
                            <p className="text-xs uppercase tracking-[0.22em] text-electric">
                              Resultado
                            </p>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              <ProfileInfoCard
                                label="Status"
                                value={
                                  isReadingAvatar
                                    ? "Lendo arquivo"
                                    : isUpdatingProfile
                                      ? "Salvando"
                                      : hasDraftAvatar
                                        ? "Foto pronta"
                                        : "Icone padrao"
                                }
                              />
                              <ProfileInfoCard
                                label="Alteracoes"
                                value={hasAvatarChanges ? "Nao salvas" : "Sincronizadas"}
                              />
                              <ProfileInfoCard
                                label="Exibicao"
                                value="Perfil e menu"
                              />
                            </div>
                          </div>

                          {avatarError ? (
                            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                              {avatarError}
                            </div>
                          ) : null}

                          <div className="flex flex-wrap justify-end gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              className="border-white/12 bg-white/[0.03] text-slate-100 hover:bg-white/[0.06]"
                              onClick={() => handleTabChange("atividade")}
                            >
                              Voltar ao painel
                            </Button>
                            <Button
                              type="button"
                              className="bg-electric text-background hover:bg-electric/90"
                              onClick={() => void handleSaveAvatar(avatarDraft ?? null)}
                              disabled={
                                isReadingAvatar ||
                                isUpdatingProfile ||
                                !hasAvatarChanges
                              }
                            >
                              {isUpdatingProfile ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                "Salvar foto"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-electric/18 bg-metallic-card p-6 shadow-[0_20px_45px_hsl(0_0%_0%_/_0.32)]">
                    <div ref={teamPhotoSectionRef} />
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                      <div>
                        <p className="font-heading text-xs uppercase tracking-[0.35em] text-electric">
                          Equipe
                        </p>
                        <h2 className="mt-2 font-heading text-3xl text-foreground">
                          Foto da equipe
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                          Defina uma imagem para representar o seu time. Essa foto aparece no selo
                          lateral do perfil e acompanha sua equipe nas tabelas e rodadas do
                          campeonato.
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
                      <div className="overflow-hidden rounded-[28px] border border-electric/16 bg-background/45 shadow-[0_18px_40px_hsl(0_0%_0%_/_0.22)]">
                        <div className="relative flex h-72 items-end justify-center bg-[radial-gradient(circle_at_top,hsl(195_100%_50%_/_0.18),transparent_38%),linear-gradient(180deg,hsl(0_0%_18%),hsl(0_0%_10%))]">
                          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(hsl(0_0%_100%_/_0.04)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%_/_0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
                          <div className="relative mb-8">
                            <TeamPhotoBadge
                              name={playerName}
                              photoUrl={teamPhotoDraft}
                              fallbackImageUrl={logoGC}
                              size="lg"
                              className="h-40 w-40 border-electric/30 bg-background/85 shadow-[0_0_40px_hsl(195_100%_50%_/_0.16)]"
                              imageClassName={teamPhotoDraft ? undefined : "object-contain p-4"}
                            />
                            <div className="absolute -bottom-2 -right-3">
                              <TeamCrest
                                name={playerName}
                                size="sm"
                                className="border-[hsl(220_18%_12%)] shadow-[0_10px_22px_hsl(0_0%_0%_/_0.28)]"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 p-6">
                          <p className="text-xs uppercase tracking-[0.22em] text-primary">
                            Preview do time
                          </p>
                          <p className="font-heading text-xl text-foreground">{playerName}</p>
                          <p className="text-sm leading-7 text-muted-foreground">
                            Use uma foto limpa ou identidade visual do elenco para reforcar a
                            leitura do seu time em qualquer tabela do circuito.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-white/8 bg-background/45 p-6 shadow-[0_18px_40px_hsl(0_0%_0%_/_0.22)]">
                        <div className="flex flex-col gap-6">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-electric">
                              Upload da equipe
                            </p>
                            <p className="mt-3 text-sm leading-7 text-muted-foreground">
                              PNG, JPG ou WEBP com ate 8 MB. O sistema reduz a imagem
                              automaticamente antes de salvar e mantem fallback seguro se o time
                              ainda nao tiver foto.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 font-heading text-xs font-bold uppercase tracking-[0.16em] text-primary transition hover:bg-primary/15">
                              <Upload className="h-4 w-4" />
                              Escolher foto da equipe
                              <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                                className="sr-only"
                                onChange={(event) => void handleTeamPhotoFileChange(event)}
                                disabled={isReadingTeamPhoto || isUpdatingProfile}
                              />
                            </label>

                            <Button
                              type="button"
                              variant="outline"
                              className="border-white/12 bg-white/[0.03] text-slate-100 hover:bg-white/[0.06]"
                              onClick={() => {
                                if (hasTeamPhotoChanges) {
                                  setTeamPhotoDraft(teamPhotoUrl ?? null);
                                  setTeamPhotoError(null);
                                  return;
                                }

                                void handleSaveTeamPhoto(null);
                              }}
                              disabled={
                                isReadingTeamPhoto ||
                                isUpdatingProfile ||
                                (!hasTeamPhotoChanges && !hasSavedTeamPhoto && !hasDraftTeamPhoto)
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {hasTeamPhotoChanges ? "Cancelar alteracao" : "Remover foto"}
                            </Button>
                          </div>

                          <div className="rounded-[24px] border border-white/8 bg-background/55 p-5">
                            <p className="text-xs uppercase tracking-[0.22em] text-primary">
                              Resultado
                            </p>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              <ProfileInfoCard
                                label="Status"
                                value={
                                  isReadingTeamPhoto
                                    ? "Lendo arquivo"
                                    : isUpdatingProfile
                                      ? "Salvando"
                                      : hasDraftTeamPhoto
                                        ? "Foto pronta"
                                        : "Selo padrao"
                                }
                              />
                              <ProfileInfoCard
                                label="Alteracoes"
                                value={hasTeamPhotoChanges ? "Nao salvas" : "Sincronizadas"}
                              />
                              <ProfileInfoCard
                                label="Exibicao"
                                value="Perfil e campeonato"
                              />
                            </div>
                          </div>

                          {teamPhotoError ? (
                            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                              {teamPhotoError}
                            </div>
                          ) : null}

                          <div className="flex flex-wrap justify-end gap-3">
                            <Button
                              type="button"
                              className="bg-primary text-background hover:bg-primary/90"
                              onClick={() => void handleSaveTeamPhoto(teamPhotoDraft ?? null)}
                              disabled={
                                isReadingTeamPhoto ||
                                isUpdatingProfile ||
                                !hasTeamPhotoChanges
                              }
                            >
                              {isUpdatingProfile ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                "Salvar foto da equipe"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "atividade" && (
                <>
                  <section className="rounded-[28px] border border-primary/18 bg-metallic-card p-6 shadow-[0_20px_45px_hsl(0_0%_0%_/_0.32)]">
                    <div className="mb-6">
                      <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
                        Painel
                      </p>
                      <h2 className="mt-2 font-heading text-3xl text-foreground">
                        Radar do seu acesso
                      </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        {
                          label: "Conta",
                          value: "Ativa",
                          helper: "Pronta para acompanhar o circuito",
                          icon: ShieldCheck,
                          tone: "text-primary",
                        },
                        {
                          label: "Inscricoes abertas",
                          value: String(openChampionships.length),
                          helper: "Eventos disponiveis agora",
                          icon: Trophy,
                          tone: "text-primary",
                        },
                        {
                          label: "Ao vivo",
                          value: String(liveChampionships.length),
                          helper: "Campeonatos em andamento",
                          icon: Zap,
                          tone: "text-electric",
                        },
                        {
                          label: "Arquivo oficial",
                          value: String(historicalTitles),
                          helper: "Titulos registrados no hall",
                          icon: Crown,
                          tone: "text-electric",
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-2xl border border-border bg-background/55 p-5 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.02)]"
                        >
                          <div className={`flex items-center gap-3 ${stat.tone}`}>
                            <stat.icon className="h-5 w-5" />
                            <span className="text-xs font-heading uppercase tracking-[0.24em]">
                              {stat.label}
                            </span>
                          </div>
                          <p className="mt-4 font-heading text-3xl font-black text-foreground">
                            {stat.value}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">{stat.helper}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="rounded-[28px] border border-electric/15 bg-metallic-card p-6 shadow-[0_20px_40px_hsl(0_0%_0%_/_0.28)]">
                      <p className="font-heading text-xs uppercase tracking-[0.35em] text-electric">
                        Proximo passo
                      </p>
                      <div className="mt-6 space-y-4">
                        <QuickLinkCard
                          to="/campeonatos"
                          icon={Trophy}
                          title="Entrar em um campeonato"
                          helper="Veja o que esta aberto e compare formato, vagas e calendario."
                        />
                        <QuickLinkCard
                          to="/ranking"
                          icon={BarChart3}
                          title="Monitorar ranking"
                          helper="Acompanhe o que esta alimentando o ranking publico do circuito."
                        />
                        <QuickLinkCard
                          to="/explorar"
                          icon={Search}
                          title="Explorar eventos e rankings"
                          helper="Use filtros e busca para ir direto ao ponto."
                        />
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-border bg-card/75 p-6 shadow-[0_20px_40px_hsl(0_0%_0%_/_0.28)]">
                      <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
                        Estado do circuito
                      </p>
                      <div className="mt-5 space-y-3">
                        {[
                          {
                            title: "Inscricoes abertas",
                            value: openChampionships.length,
                            helper: "Prontas para receber jogadores",
                            tone: "text-primary",
                          },
                          {
                            title: "Em andamento",
                            value: liveChampionships.length,
                            helper: "Rodadas ja acontecendo",
                            tone: "text-electric",
                          },
                          {
                            title: "Preparando tabela",
                            value: upcomingChampionships.length,
                            helper: "Janelas programadas no calendario",
                            tone: "text-muted-foreground",
                          },
                        ].map((item) => (
                          <article
                            key={item.title}
                            className="flex items-center justify-between rounded-2xl border border-white/8 bg-background/45 px-5 py-4"
                          >
                            <div>
                              <p className={`text-sm font-semibold ${item.tone}`}>{item.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{item.helper}</p>
                            </div>
                            <span className="font-heading text-3xl font-black text-foreground">
                              {item.value}
                            </span>
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                </>
              )}

              {activeTab === "campeonatos" && (
                <section className="rounded-[28px] border border-primary/18 bg-metallic-card p-6 shadow-[0_20px_45px_hsl(0_0%_0%_/_0.32)]">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
                        Campeonatos
                      </p>
                      <h2 className="mt-2 font-heading text-3xl text-foreground">
                        O que esta disponivel para seu perfil
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                        Em vez de uma aba administrativa, o perfil virou ponto de entrada para
                        descobrir o que esta aberto, o que esta ao vivo e o que entra em breve.
                      </p>
                    </div>

                    <LinkButton to="/campeonatos" icon={Trophy} label="Abrir catalogo" />
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <ProfileInfoCard label="Inscricoes abertas" value={String(openChampionships.length)} />
                    <ProfileInfoCard label="Eventos ao vivo" value={String(liveChampionships.length)} />
                    <ProfileInfoCard label="Preparando tabela" value={String(upcomingChampionships.length)} />
                  </div>

                  <div className="mt-8">
                    <ChampionshipRows
                      items={championships}
                      playerId={session?.id ?? null}
                      emptyTitle="Nenhum campeonato publicado ainda"
                      emptyDescription="Quando o proximo evento oficial entrar no ar, ele aparecera aqui para o seu perfil acompanhar sem depender de uma area administrativa."
                    />
                  </div>

                  <div className="mt-8 rounded-[24px] border border-white/8 bg-background/45 p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Areas secundarias
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <LinkButton to="/campeoes" icon={Crown} label="Abrir campeoes" />
                      <LinkButton to="/ligas" icon={Clock3} label="Ver ligas" />
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "rankings" && (
                <section className="rounded-[28px] border border-electric/18 bg-metallic-card p-6 shadow-[0_20px_45px_hsl(0_0%_0%_/_0.32)]">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="font-heading text-xs uppercase tracking-[0.35em] text-electric">
                        Ranking
                      </p>
                      <h2 className="mt-2 font-heading text-3xl text-foreground">
                        Monitores do circuito
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                        O perfil mostra quais rankings publicos estao sendo alimentados pelo
                        calendario atual e deixa o hall historico como apoio, nao como foco central.
                      </p>
                    </div>

                    <LinkButton to="/ranking" icon={BarChart3} label="Abrir ranking geral" />
                  </div>

                  {rankingMonitors.length > 0 ? (
                    <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="space-y-4">
                        {rankingMonitors.map((monitor) => {
                          const liveCount = monitor.championships.filter(
                            (item) => item.status === "STARTED",
                          ).length;
                          const openCount = monitor.championships.filter(
                            (item) => item.status === "REGISTRATION",
                          ).length;

                          return (
                            <article
                              key={monitor.name}
                              className="rounded-[28px] border border-white/8 bg-background/55 p-5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-heading text-xl text-foreground">{monitor.name}</p>
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    {monitor.championships.length} campeonato(s) vinculados a este monitor.
                                  </p>
                                </div>
                                <Link
                                  to="/ranking"
                                  className="rounded-full border border-electric/20 bg-electric/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-electric"
                                >
                                  Ver no ranking
                                </Link>
                              </div>

                              <div className="mt-5 grid gap-3 md:grid-cols-3">
                                <ProfileInfoCard label="Ao vivo" value={String(liveCount)} />
                                <ProfileInfoCard label="Abertos" value={String(openCount)} />
                                <ProfileInfoCard
                                  label="Plataformas"
                                  value={String(
                                    new Set(
                                      monitor.championships.map((item) => item.configuration.platform),
                                    ).size,
                                  )}
                                />
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <aside className="rounded-[28px] border border-white/8 bg-background/55 p-5">
                        <p className="text-xs uppercase tracking-[0.24em] text-primary">
                          Arquivo historico
                        </p>
                        <div className="mt-5 space-y-3">
                          {champions.slice(0, 5).map((champion) => (
                            <div
                              key={champion.name}
                              className="flex items-center justify-between rounded-2xl border border-white/8 bg-background/45 px-4 py-4"
                            >
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {champion.name}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                  {champion.titles} titulo(s)
                                </p>
                              </div>
                              <span className="font-heading text-xl font-black text-primary">
                                #{champion.rank}
                              </span>
                            </div>
                          ))}
                        </div>
                      </aside>
                    </div>
                  ) : (
                    <EmptyStateCard
                      icon={BarChart3}
                      title="Nenhum ranking monitorado ainda"
                      description="Assim que os campeonatos publicados apontarem para um ranking oficial, esta aba lista os monitores ativos do circuito."
                      actionLabel="Abrir ranking geral"
                      actionTo="/ranking"
                      className="mx-auto mt-8 max-w-3xl"
                    />
                  )}
                </section>
              )}

              {activeTab === "desafios" && (
                <section className="rounded-[28px] border border-primary/18 bg-metallic-card p-6 shadow-[0_20px_45px_hsl(0_0%_0%_/_0.32)]">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="font-heading text-xs uppercase tracking-[0.35em] text-primary">
                        Desafios
                      </p>
                      <h2 className="mt-2 font-heading text-3xl text-foreground">
                        Central de amistosos
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                        Receba, envie e responda desafios amistosos sem sair do seu perfil. O
                        painel usa o mesmo visual do campeonato e mantem o historico rapido para
                        celular e desktop.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <ProfileInfoCard label="Recebidos" value={String(challengeInbox.received.length)} />
                    <ProfileInfoCard label="Enviados" value={String(challengeInbox.sent.length)} />
                    <ProfileInfoCard label="Pendentes" value={String(pendingReceivedChallenges.length + pendingSentChallenges.length)} />
                  </div>

                  {isLoadingFriendlyChallenges ? (
                    <div className="mt-8 rounded-[24px] border border-white/8 bg-background/45 px-5 py-5 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Carregando seus desafios amistosos...
                      </span>
                    </div>
                  ) : challengeInbox.received.length === 0 && challengeInbox.sent.length === 0 ? (
                    <EmptyStateCard
                      icon={Inbox}
                      title="Nenhum desafio amistoso ainda"
                      description="Quando voce desafiar um adversario pelo perfil do time, os convites enviados e recebidos vao aparecer aqui."
                      actionLabel="Abrir campeonatos"
                      actionTo="/campeonatos"
                      className="mx-auto mt-8 max-w-3xl"
                    />
                  ) : (
                    <div className="mt-8">
                      <Tabs defaultValue="received" className="space-y-5">
                        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[18px] bg-background/50 p-2">
                          <TabsTrigger
                            value="received"
                            className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] data-[state=active]:bg-primary/12 data-[state=active]:text-primary"
                          >
                            Recebidos ({challengeInbox.received.length})
                          </TabsTrigger>
                          <TabsTrigger
                            value="sent"
                            className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] data-[state=active]:bg-electric/12 data-[state=active]:text-electric"
                          >
                            Enviados ({challengeInbox.sent.length})
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="received" className="space-y-4">
                          {challengeInbox.received.length > 0 ? (
                            challengeInbox.received.map((challenge) => (
                              <FriendlyChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                                perspective="received"
                                isBusy={challengeActionId === challenge.id}
                                onRespond={(status) =>
                                  void handleRespondToChallenge(challenge.id, status)
                                }
                              />
                            ))
                          ) : (
                            <div className="rounded-[24px] border border-dashed border-white/10 bg-background/40 px-5 py-5 text-sm text-muted-foreground">
                              Nenhum desafio recebido no momento.
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="sent" className="space-y-4">
                          {challengeInbox.sent.length > 0 ? (
                            challengeInbox.sent.map((challenge) => (
                              <FriendlyChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                                perspective="sent"
                                isBusy={false}
                              />
                            ))
                          ) : (
                            <div className="rounded-[24px] border border-dashed border-white/10 bg-background/40 px-5 py-5 text-sm text-muted-foreground">
                              Voce ainda nao enviou nenhum desafio amistoso.
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  <div className="mt-8 rounded-[24px] border border-white/8 bg-background/45 p-5">
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <Send className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Como criar um novo desafio
                        </p>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          Abra qualquer campeonato, clique no time adversario e use o botao
                          "Desafiar para amistoso" dentro do perfil do time.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
