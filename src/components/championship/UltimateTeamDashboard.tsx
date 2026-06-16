import { CalendarDays, CheckCircle2, Clock3, Filter, Radio } from "lucide-react";
import type { ReactNode } from "react";
import { TeamCrest, TeamFlagBadge } from "@/components/championship/TeamIdentity";
import { TeamPhotoBadge } from "@/components/profile/TeamPhotoBadge";
import { cn } from "@/lib/utils";

export interface UltimateTeamEntryIdentity {
  id: string;
  name: string;
  meta?: string;
  crestLabel?: string;
  flagUrl?: string | null;
  teamPhotoUrl?: string | null;
}

export interface UltimateTeamStandingsEntry {
  id: string;
  position: number;
  team: UltimateTeamEntryIdentity;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  efficiency: number;
}

export interface UltimateTeamMatchEntry {
  id: string;
  home: UltimateTeamEntryIdentity;
  away: UltimateTeamEntryIdentity;
  scoreHome: number | null;
  scoreAway: number | null;
  statusLabel?: string;
  metaLabel?: string;
}

interface UltimateTeamChampionshipShellProps {
  title: string;
  statusBadge: ReactNode;
  tabs: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

interface UltimateTeamGroupDashboardProps {
  standingsTitle?: string;
  roundTitle: string;
  standings: UltimateTeamStandingsEntry[];
  matches: UltimateTeamMatchEntry[];
  onTeamSelect?: (teamId: string) => void;
  filterLabel?: string;
  emptyStandingsMessage?: string;
  emptyMatchesMessage?: string;
  groupSwitcher?: ReactNode;
}

export function UltimateTeamChampionshipShell({
  title,
  statusBadge,
  tabs,
  children,
  actions,
  className,
}: UltimateTeamChampionshipShellProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,hsl(220_26%_14%_/_0.94),hsl(222_22%_9%_/_0.98))] shadow-[0_28px_80px_hsl(222_45%_2%_/_0.45)]",
        className,
      )}
    >
      <div className="border-b border-white/8 bg-[radial-gradient(circle_at_top_left,hsl(195_100%_50%_/_0.15),transparent_30%),linear-gradient(180deg,hsl(220_20%_18%_/_0.82),hsl(220_18%_14%_/_0.65))] px-5 py-6 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-electric/75">
              Ultimate Team Championship View
            </p>
            <h1 className="font-heading text-2xl font-black uppercase tracking-[0.08em] text-slate-50 md:text-[2rem]">
              {title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {statusBadge}
            {actions}
          </div>
        </div>

        <div className="mt-6">{tabs}</div>
      </div>

      <div className="px-5 py-5 md:px-8 md:py-7">{children}</div>
    </section>
  );
}

export function UltimateTeamGroupDashboard({
  standingsTitle = "CLASSIFICACAO",
  roundTitle,
  standings,
  matches,
  onTeamSelect,
  filterLabel = "equipes",
  emptyStandingsMessage = "Nenhuma classificacao disponivel para este recorte.",
  emptyMatchesMessage = "Nenhuma partida encontrada para esta rodada.",
  groupSwitcher,
}: UltimateTeamGroupDashboardProps) {
  const completedMatches = matches.filter(
    (match) => match.scoreHome !== null && match.scoreAway !== null,
  ).length;

  return (
    <div className="grid gap-5 min-[1360px]:grid-cols-[minmax(0,1.08fr)_minmax(410px,0.92fr)]">
      <section className="relative overflow-hidden rounded-[24px] border border-electric/20 bg-[radial-gradient(circle_at_top_left,hsl(195_100%_50%_/_0.16),transparent_34%),linear-gradient(180deg,hsl(220_22%_12%_/_0.98),hsl(220_24%_8%_/_0.96))] shadow-[0_22px_54px_hsl(222_48%_3%_/_0.34),inset_0_1px_0_hsl(0_0%_100%_/_0.05)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(195_100%_60%_/_0.72),hsl(51_100%_58%_/_0.48),transparent)]" />
        <div className="flex flex-col gap-4 border-b border-electric/15 bg-[linear-gradient(90deg,hsl(221_32%_8%_/_0.8),hsl(221_28%_11%_/_0.46),transparent)] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-heading text-2xl font-black uppercase tracking-[0.16em] text-slate-50 drop-shadow-[0_0_16px_hsl(195_100%_62%_/_0.2)]">
                {standingsTitle}
              </h2>
              {groupSwitcher}
            </div>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {standings.length} equipes no recorte
            </p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 self-start rounded-[12px] border border-electric/25 bg-electric/[0.08] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-electric shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.08),0_0_22px_hsl(195_100%_50%_/_0.09)] transition-all hover:border-electric/45 hover:bg-electric/[0.13] hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric/35"
          >
            <Filter className="h-3.5 w-3.5" />
            {filterLabel}
          </button>
        </div>

        <div className="table-wrapper ranking-table-wrapper overflow-x-auto">
          {standings.length > 0 ? (
            <table className="min-w-[640px] w-full table-fixed border-separate border-spacing-0 text-sm">
              <colgroup>
                <col className="w-[58px]" />
                <col className="w-[220px]" />
                <col span={9} className="w-[36px]" />
              </colgroup>
              <thead>
                <tr className="bg-black/10 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  <StandingsHeadCell className="pl-4 text-center md:pl-5">Pos</StandingsHeadCell>
                  <StandingsHeadCell>Equipe</StandingsHeadCell>
                  <StandingsHeadCell className="text-center">P</StandingsHeadCell>
                  <StandingsHeadCell className="text-center">J</StandingsHeadCell>
                  <StandingsHeadCell className="text-center">V</StandingsHeadCell>
                  <StandingsHeadCell className="text-center">E</StandingsHeadCell>
                  <StandingsHeadCell className="text-center">D</StandingsHeadCell>
                  <StandingsHeadCell className="text-center">GP</StandingsHeadCell>
                  <StandingsHeadCell className="text-center">GC</StandingsHeadCell>
                  <StandingsHeadCell className="text-center">SG</StandingsHeadCell>
                  <StandingsHeadCell className="pr-4 text-center md:pr-5">%</StandingsHeadCell>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, index) => (
                  <UltimateTeamStandingsRow
                    key={row.id}
                    row={row}
                    onTeamSelect={onTeamSelect}
                    isLeader={row.position === 1}
                    isStriped={index % 2 === 0}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-8 text-sm text-slate-400 md:px-5">{emptyStandingsMessage}</div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[24px] border border-electric/20 bg-[radial-gradient(circle_at_top_right,hsl(195_100%_50%_/_0.16),transparent_32%),linear-gradient(180deg,hsl(220_22%_12%_/_0.98),hsl(220_24%_8%_/_0.96))] shadow-[0_22px_54px_hsl(222_48%_3%_/_0.34),inset_0_1px_0_hsl(0_0%_100%_/_0.05)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(195_100%_60%_/_0.72),transparent)]" />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-electric/15 bg-[linear-gradient(90deg,hsl(221_32%_8%_/_0.78),hsl(221_28%_11%_/_0.44),transparent)] px-4 py-4 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-electric/25 bg-electric/[0.1] text-electric shadow-[0_0_20px_hsl(195_100%_50%_/_0.12)]">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-heading text-2xl font-black uppercase tracking-[0.16em] text-slate-50 drop-shadow-[0_0_16px_hsl(195_100%_62%_/_0.2)]">
                {roundTitle}
              </h2>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {completedMatches}/{matches.length} jogos com placar
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4 md:px-5">
          {matches.length > 0 ? (
            matches.map((match) => (
              <UltimateTeamMatchCard key={match.id} match={match} onTeamSelect={onTeamSelect} />
            ))
          ) : (
            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-6 text-sm text-slate-400 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.04)]">
              {emptyMatchesMessage}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function UltimateTeamStandingsRow({
  row,
  onTeamSelect,
  isLeader,
  isStriped,
}: {
  row: UltimateTeamStandingsEntry;
  onTeamSelect?: (teamId: string) => void;
  isLeader: boolean;
  isStriped: boolean;
}) {
  const positionTone = getPositionTone(row.position);

  return (
    <tr
      className={cn(
        "group transition-colors duration-200",
        isStriped ? "bg-white/[0.028]" : "bg-transparent",
        row.position <= 3 && "bg-[linear-gradient(90deg,hsl(45_90%_56%_/_0.11),transparent_58%)]",
        isLeader && "bg-[linear-gradient(90deg,hsl(45_95%_57%_/_0.18),hsl(195_100%_50%_/_0.04)_50%,transparent_72%)]",
      )}
    >
      <StandingsCell
        className={cn(
          "pl-4 text-center md:pl-5",
          isLeader ? "text-gold" : "text-slate-100",
        )}
      >
        <span
          className={cn(
            "inline-flex h-9 min-w-9 items-center justify-center rounded-[12px] border px-2 font-heading text-xl font-black leading-none shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.08)]",
            positionTone,
          )}
        >
          {row.position}
        </span>
      </StandingsCell>
      <StandingsCell>
        <button
          type="button"
          disabled={!onTeamSelect}
          onClick={() => onTeamSelect?.(row.team.id)}
          className={cn(
            "group/team flex min-w-[205px] items-center gap-3 rounded-xl py-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric/35",
            onTeamSelect ? "cursor-pointer hover:text-electric" : "cursor-default",
          )}
          title={onTeamSelect ? `Abrir perfil de ${row.team.name}` : undefined}
        >
          <TeamIdentityMark
            teamName={row.team.crestLabel ?? row.team.name}
            teamPhotoUrl={row.team.teamPhotoUrl}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-slate-100 transition-colors group-hover/team:text-electric">
                {row.team.name}
              </span>
              <TeamFlagBadge teamName={row.team.name} flagUrl={row.team.flagUrl} size="sm" />
            </div>
            <p className="mt-1 truncate text-xs text-slate-400">
              {row.team.meta ?? "Tecnico nao vinculado"}
            </p>
          </div>
        </button>
      </StandingsCell>
      <StandingsCell className="text-center font-heading text-lg font-black text-slate-50">{row.points}</StandingsCell>
      <StandingsCell className="text-center text-slate-300">{row.played}</StandingsCell>
      <StandingsCell className="text-center text-slate-300">{row.wins}</StandingsCell>
      <StandingsCell className="text-center text-slate-300">{row.draws}</StandingsCell>
      <StandingsCell className="text-center text-slate-300">{row.losses}</StandingsCell>
      <StandingsCell className="text-center text-slate-300">{row.goalsFor}</StandingsCell>
      <StandingsCell className="text-center text-slate-300">{row.goalsAgainst}</StandingsCell>
      <StandingsCell className="text-center text-slate-300">{row.goalDifference}</StandingsCell>
      <StandingsCell className="pr-4 text-center font-medium text-slate-200 md:pr-5">
        {row.efficiency}
      </StandingsCell>
    </tr>
  );
}

function UltimateTeamMatchCard({
  match,
  onTeamSelect,
}: {
  match: UltimateTeamMatchEntry;
  onTeamSelect?: (teamId: string) => void;
}) {
  const statusTone = getMatchStatusTone(match);
  const StatusIcon = statusTone.icon;

  return (
    <article className="relative overflow-hidden rounded-[18px] border border-electric/20 bg-[radial-gradient(circle_at_top_left,hsl(195_100%_50%_/_0.12),transparent_32%),linear-gradient(180deg,hsl(220_26%_15%_/_0.96),hsl(220_22%_10%_/_0.94))] px-4 py-4 shadow-[0_16px_34px_hsl(222_48%_4%_/_0.26),inset_0_1px_0_hsl(0_0%_100%_/_0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-electric/35 hover:shadow-[0_22px_42px_hsl(196_100%_15%_/_0.22),inset_0_1px_0_hsl(0_0%_100%_/_0.06)]">
      <div className="pointer-events-none absolute inset-y-3 left-0 w-px bg-[linear-gradient(180deg,transparent,hsl(195_100%_62%_/_0.58),transparent)]" />
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <UltimateTeamMatchSide team={match.home} align="right" onTeamSelect={onTeamSelect} />
        <div className="flex min-w-[106px] flex-col items-center">
          <div className="flex items-center gap-2">
            <UltimateTeamScore score={match.scoreHome} />
            <span className="font-heading text-sm font-bold uppercase text-slate-500">x</span>
            <UltimateTeamScore score={match.scoreAway} />
          </div>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
            vs
          </span>
        </div>
        <UltimateTeamMatchSide team={match.away} align="left" onTeamSelect={onTeamSelect} />
      </div>

      {(match.statusLabel || match.metaLabel) ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3 text-[11px] uppercase tracking-[0.16em] text-slate-400">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-electric/80" />
            {match.metaLabel ?? "Partida programada"}
          </span>
          <span
            className={cn(
              "inline-flex min-h-8 items-center gap-2 rounded-[10px] border px-3 py-1 font-bold shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.08)]",
              statusTone.className,
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {statusTone.label}
          </span>
        </div>
      ) : null}
    </article>
  );
}

function UltimateTeamMatchSide({
  team,
  align,
  onTeamSelect,
}: {
  team: UltimateTeamEntryIdentity;
  align: "left" | "right";
  onTeamSelect?: (teamId: string) => void;
}) {
  const content = (
    <>
      {align === "left" ? (
        <TeamIdentityMark
          teamName={team.crestLabel ?? team.name}
          teamPhotoUrl={team.teamPhotoUrl}
        />
      ) : null}
      <div className="min-w-0">
        <div
          className={cn(
            "flex items-center gap-2",
            align === "right" ? "justify-end" : "justify-start",
          )}
        >
          <span className="truncate text-sm font-semibold text-slate-100 transition-colors group-hover:text-electric md:text-[15px]">
            {team.name}
          </span>
          <TeamFlagBadge teamName={team.name} flagUrl={team.flagUrl} size="sm" />
        </div>
        <p className="mt-1 truncate text-xs text-slate-400">{team.meta ?? "Jogador nao vinculado"}</p>
      </div>
      {align === "right" ? (
        <TeamIdentityMark
          teamName={team.crestLabel ?? team.name}
          teamPhotoUrl={team.teamPhotoUrl}
        />
      ) : null}
    </>
  );
  const className = cn(
    "group flex min-w-0 items-center gap-3 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric/35",
    align === "right" ? "justify-end text-right" : "justify-start text-left",
    onTeamSelect ? "cursor-pointer" : "",
  );

  if (onTeamSelect) {
    return (
      <button
        type="button"
        onClick={() => onTeamSelect(team.id)}
        className={className}
        title={`Abrir perfil de ${team.name}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3",
        align === "right" ? "justify-end text-right" : "justify-start text-left",
      )}
    >
      {content}
    </div>
  );
}

function TeamIdentityMark({
  teamName,
  teamPhotoUrl,
}: {
  teamName: string;
  teamPhotoUrl?: string | null;
}) {
  if (teamPhotoUrl) {
    return (
      <TeamPhotoBadge
        name={teamName}
        photoUrl={teamPhotoUrl}
        size="sm"
        shape="square"
        className="h-9 w-9 border-white/15 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_20px_rgba(0,0,0,0.18)]"
        fallbackContent={
          <TeamCrest
            name={teamName}
            className="h-full w-full rounded-[10px] border-white/15 text-[10px]"
          />
        }
      />
    );
  }

  return (
    <TeamCrest name={teamName} />
  );
}

function UltimateTeamScore({ score }: { score: number | null }) {
  const hasScore = score !== null;

  return (
    <span
      className={cn(
        "inline-flex h-12 min-w-11 items-center justify-center rounded-[12px] border px-2 font-heading text-2xl font-black leading-none shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.06)]",
        hasScore
          ? "border-white/10 bg-white/[0.06] text-slate-50"
          : "border-white/8 bg-white/[0.025] text-slate-500",
      )}
    >
      {score ?? "-"}
    </span>
  );
}

function getPositionTone(position: number) {
  if (position === 1) {
    return "border-gold/55 bg-gold/15 text-gold shadow-[0_0_24px_hsl(51_100%_50%_/_0.24)]";
  }

  if (position === 2) {
    return "border-slate-300/35 bg-slate-300/10 text-slate-100 shadow-[0_0_20px_hsl(210_20%_82%_/_0.13)]";
  }

  if (position === 3) {
    return "border-amber-600/45 bg-amber-600/12 text-amber-300 shadow-[0_0_20px_hsl(32_88%_48%_/_0.16)]";
  }

  return "border-white/8 bg-white/[0.035] text-slate-200";
}

function getMatchStatusTone(match: UltimateTeamMatchEntry) {
  const normalizedLabel = match.statusLabel?.toLowerCase() ?? "";
  const hasScore = match.scoreHome !== null && match.scoreAway !== null;
  const isCompleted =
    normalizedLabel.includes("encerr") ||
    normalizedLabel.includes("final") ||
    (hasScore && !normalizedLabel.includes("disputa"));
  const isLive =
    normalizedLabel.includes("vivo") ||
    normalizedLabel.includes("disputa") ||
    normalizedLabel.includes("ao vivo");

  if (isCompleted) {
    return {
      label: match.statusLabel ?? "Finalizada",
      icon: CheckCircle2,
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    };
  }

  if (isLive) {
    return {
      label: match.statusLabel ?? "Ao vivo",
      icon: Radio,
      className: "border-electric/35 bg-electric/[0.12] text-electric",
    };
  }

  return {
    label: match.statusLabel ?? "A definir",
    icon: Clock3,
    className: "border-white/10 bg-white/[0.04] text-slate-300",
  };
}

function StandingsHeadCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <th className={cn("border-b border-electric/15 py-3.5 pr-2 font-bold", className)}>{children}</th>;
}

function StandingsCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-white/6 py-2.5 pr-2 align-middle transition-colors group-hover:bg-electric/[0.035]",
        className,
      )}
    >
      {children}
    </td>
  );
}
