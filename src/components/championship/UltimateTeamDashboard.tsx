import { Filter } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface UltimateTeamEntryIdentity {
  id: string;
  name: string;
  meta?: string;
  crestLabel?: string;
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
  filterLabel = "equipes",
  emptyStandingsMessage = "Nenhuma classificacao disponivel para este recorte.",
  emptyMatchesMessage = "Nenhuma partida encontrada para esta rodada.",
  groupSwitcher,
}: UltimateTeamGroupDashboardProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
      <section className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,hsl(220_18%_12%_/_0.98),hsl(220_20%_10%_/_0.96))] shadow-[0_20px_44px_hsl(222_40%_3%_/_0.24)]">
        <div className="flex flex-col gap-4 border-b border-white/8 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-lg font-bold uppercase tracking-[0.18em] text-slate-100">
              {standingsTitle}
            </h2>
            {groupSwitcher}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-slate-300 transition-all hover:border-electric/35 hover:bg-electric/10 hover:text-electric focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric/35"
          >
            <Filter className="h-3.5 w-3.5" />
            {filterLabel}
          </button>
        </div>

        <div className="overflow-x-auto">
          {standings.length > 0 ? (
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  <StandingsHeadCell className="pl-4 md:pl-5">Posicao</StandingsHeadCell>
                  <StandingsHeadCell>Time</StandingsHeadCell>
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

      <section className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,hsl(220_18%_12%_/_0.98),hsl(220_20%_10%_/_0.96))] shadow-[0_20px_44px_hsl(222_40%_3%_/_0.24)]">
        <div className="border-b border-white/8 px-4 py-4 md:px-5">
          <h2 className="font-heading text-lg font-bold uppercase tracking-[0.18em] text-slate-100">
            {roundTitle}
          </h2>
        </div>

        <div className="space-y-3 px-4 py-4 md:px-5">
          {matches.length > 0 ? (
            matches.map((match) => <UltimateTeamMatchCard key={match.id} match={match} />)
          ) : (
            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-6 text-sm text-slate-400">
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
  isLeader,
  isStriped,
}: {
  row: UltimateTeamStandingsEntry;
  isLeader: boolean;
  isStriped: boolean;
}) {
  return (
    <tr
      className={cn(
        "group transition-colors",
        isStriped ? "bg-white/[0.028]" : "bg-transparent",
        isLeader && "bg-[linear-gradient(90deg,hsl(45_90%_56%_/_0.15),transparent_55%)]",
      )}
    >
      <StandingsCell
        className={cn(
          "pl-4 text-center font-semibold md:pl-5",
          isLeader ? "text-gold" : "text-slate-100",
        )}
      >
        <span className="inline-flex min-w-[2rem] justify-center">{row.position}</span>
      </StandingsCell>
      <StandingsCell>
        <div className="flex min-w-[220px] items-center gap-3">
          <UltimateTeamCrest label={row.team.crestLabel ?? row.team.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-100 transition-colors group-hover:text-electric">
              {row.team.name}
            </p>
            <p className="mt-1 truncate text-xs text-slate-400">{row.team.meta ?? "Tecnico nao vinculado"}</p>
          </div>
        </div>
      </StandingsCell>
      <StandingsCell className="text-center font-semibold text-slate-100">{row.points}</StandingsCell>
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

function UltimateTeamMatchCard({ match }: { match: UltimateTeamMatchEntry }) {
  return (
    <article className="rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,hsl(220_22%_14%_/_0.95),hsl(220_18%_12%_/_0.92))] px-4 py-4 shadow-[0_16px_32px_hsl(222_45%_4%_/_0.22)] transition-all hover:-translate-y-0.5 hover:border-electric/25 hover:shadow-[0_20px_38px_hsl(196_100%_15%_/_0.18)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <UltimateTeamMatchSide team={match.home} align="right" />
        <div className="flex items-center gap-1.5">
          <UltimateTeamScore score={match.scoreHome} />
          <UltimateTeamScore score={match.scoreAway} />
        </div>
        <UltimateTeamMatchSide team={match.away} align="left" />
      </div>

      {(match.statusLabel || match.metaLabel) ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/6 pt-3 text-[11px] uppercase tracking-[0.16em] text-slate-400">
          <span>{match.metaLabel ?? "Partida programada"}</span>
          <span>{match.statusLabel ?? "Em disputa"}</span>
        </div>
      ) : null}
    </article>
  );
}

function UltimateTeamMatchSide({
  team,
  align,
}: {
  team: UltimateTeamEntryIdentity;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3",
        align === "right" ? "justify-end text-right" : "justify-start text-left",
      )}
    >
      {align === "left" ? <UltimateTeamCrest label={team.crestLabel ?? team.name} /> : null}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-100 md:text-[15px]">{team.name}</p>
        <p className="mt-1 truncate text-xs text-slate-400">{team.meta ?? "Jogador nao vinculado"}</p>
      </div>
      {align === "right" ? <UltimateTeamCrest label={team.crestLabel ?? team.name} /> : null}
    </div>
  );
}

function UltimateTeamScore({ score }: { score: number | null }) {
  return (
    <span className="inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-[10px] border border-white/8 bg-white/[0.04] px-3 text-lg font-semibold text-slate-50 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.03)]">
      {score ?? "-"}
    </span>
  );
}

function UltimateTeamCrest({ label }: { label: string }) {
  const crestLabel = buildInitials(label);
  const hue = buildHue(label);

  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/12 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.12)]"
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 76% 56%), hsl(${(hue + 42) % 360} 68% 42%))`,
      }}
      aria-hidden="true"
    >
      {crestLabel}
    </span>
  );
}

function StandingsHeadCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <th className={cn("border-b border-white/8 py-3.5 pr-3 font-medium", className)}>{children}</th>;
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
        "border-b border-white/6 py-3 pr-3 align-middle transition-colors group-hover:bg-white/[0.02]",
        className,
      )}
    >
      {children}
    </td>
  );
}

function buildInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "UT";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function buildHue(value: string) {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0) % 360;
}
