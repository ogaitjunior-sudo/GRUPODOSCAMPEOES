import { useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  ChevronRight,
  Search,
  ShieldCheck,
  Swords,
  Trophy,
  UserRound,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { AdminPanelState } from "@/admin/types";
import heroLionsBackdrop from "@/assets/hero-lions-backdrop.png";
import heroLogoShadow from "@/assets/hero-logo-shadow.png";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { readCachedAdminPanelState } from "@/lib/admin-panel-store";

interface QuickMetric {
  title: string;
  value: string;
  icon: LucideIcon;
}

interface BottomStat {
  value: string;
  title: string;
  helper?: string;
  icon: LucideIcon;
}

const quickMetrics: QuickMetric[] = [
  { title: "TORNEIOS PUBLICADOS", value: "0", icon: Trophy },
  { title: "CAMPEONATOS AO VIVO", value: "0", icon: Swords },
  { title: "PR\u00d3XIMAS JANELAS", value: "0", icon: CalendarClock },
  { title: "CAMPE\u00d5ES OFICIAIS", value: "0", icon: ShieldCheck },
];

const playerPreviewTokens = Array.from({ length: 5 }, (_, index) => index);
const particlePositions = Array.from({ length: 44 }, (_, index) => ({
  left: `${8 + ((index * 9) % 84)}%`,
  top: `${16 + ((index * 11) % 68)}%`,
  delay: `${(index % 10) * 0.38}s`,
  duration: `${6.2 + (index % 7) * 0.52}s`,
  size: 2 + (index % 3),
  opacity: 0.22 + (index % 5) * 0.07,
  drift: `${-12 + (index % 8) * 6}px`,
}));

const sparkPositions = [
  { left: "44%", top: "20%", delay: "0.4s", duration: "5.2s" },
  { left: "49%", top: "28%", delay: "1.1s", duration: "4.8s" },
  { left: "55%", top: "18%", delay: "0.8s", duration: "5.6s" },
  { left: "60%", top: "34%", delay: "1.5s", duration: "4.9s" },
  { left: "65%", top: "24%", delay: "0.6s", duration: "5.4s" },
  { left: "70%", top: "38%", delay: "1.9s", duration: "5.1s" },
  { left: "74%", top: "26%", delay: "0.9s", duration: "5.7s" },
  { left: "79%", top: "44%", delay: "1.3s", duration: "5s" },
  { left: "83%", top: "30%", delay: "0.5s", duration: "5.5s" },
  { left: "86%", top: "50%", delay: "1.7s", duration: "4.7s" },
  { left: "90%", top: "36%", delay: "1s", duration: "5.3s" },
  { left: "94%", top: "54%", delay: "1.4s", duration: "5.8s" },
  { left: "58%", top: "58%", delay: "0.7s", duration: "4.9s" },
  { left: "69%", top: "62%", delay: "1.2s", duration: "5.2s" },
] as const;

function normalizePlayerEmail(value: string) {
  return value.trim().toLowerCase();
}

function countActivePlayers(state: AdminPanelState) {
  const activePlayers = new Set<string>();

  state.users.forEach((user) => {
    const normalizedEmail = normalizePlayerEmail(user.email);

    if (!normalizedEmail || user.status !== "active") {
      return;
    }

    if (user.role === "player" || user.role === "captain" || user.role === "manager") {
      activePlayers.add(normalizedEmail);
    }
  });

  state.players.forEach((player) => {
    const normalizedEmail = normalizePlayerEmail(player.email);

    if (!normalizedEmail || player.status === "blocked") {
      return;
    }

    activePlayers.add(normalizedEmail);
  });

  return activePlayers.size;
}

function QuickMetricCard({ title, value, icon: Icon }: QuickMetric) {
  return (
    <div className="tr-quick-item tr-stat-card">
      <span className="tr-quick-icon">
        <Icon className="h-5 w-5" />
      </span>
      <p className="tr-quick-label">{title}</p>
      <p className="tr-quick-value">{value}</p>
    </div>
  );
}

function BottomStatCard({ value, title, helper, icon: Icon }: BottomStat) {
  return (
    <div className="tr-bottom-stat tr-bottom-item">
      <span className="tr-bottom-stat-icon">
        <Icon className="h-6 w-6" />
      </span>
      <div className="tr-bottom-stat-copy">
        {value ? <p className="tr-bottom-stat-value">{value}</p> : null}
        <p className="tr-bottom-stat-title">{title}</p>
        {helper ? <p className="tr-bottom-stat-helper">{helper}</p> : null}
      </div>
    </div>
  );
}

export function HeroSection() {
  const [activePlayersCount, setActivePlayersCount] = useState(() =>
    countActivePlayers(readCachedAdminPanelState()),
  );

  useEffect(() => {
    const syncActivePlayersCount = () => {
      setActivePlayersCount(countActivePlayers(readCachedAdminPanelState()));
    };

    syncActivePlayersCount();

    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("storage", syncActivePlayersCount);
    window.addEventListener("focus", syncActivePlayersCount);

    return () => {
      window.removeEventListener("storage", syncActivePlayersCount);
      window.removeEventListener("focus", syncActivePlayersCount);
    };
  }, []);

  const handleMouseMove = (event: ReactMouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    event.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    event.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  const handleMouseLeave = (event: ReactMouseEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--mouse-x", "50%");
    event.currentTarget.style.setProperty("--mouse-y", "50%");
  };

  const activePlayersValue = new Intl.NumberFormat("pt-BR").format(activePlayersCount);
  const bottomStats: BottomStat[] = [
    { value: activePlayersValue, title: "JOGADORES ATIVOS", icon: Users },
    { value: "0", title: "CAMPEONATOS REALIZADOS", icon: Trophy },
    { value: "100%", title: "SISTEMA AUTOM\u00c1TICO", helper: "E SEGURO", icon: ShieldCheck },
    { value: "", title: "RESPOSTA R\u00c1PIDA", helper: "SUPORTE \u00c1GIL", icon: Zap },
  ];

  return (
    <section
      className="tr-hero"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div aria-hidden="true" className="hero-glow" />
      <div
        aria-hidden="true"
        className="tr-lion-left"
        style={{ backgroundImage: `url(${heroLionsBackdrop})` }}
      />
      <div
        aria-hidden="true"
        className="tr-lion-right"
        style={{ backgroundImage: `url(${heroLionsBackdrop})` }}
      />
      <div aria-hidden="true" className="tr-lines" />
      {particlePositions.map((particle, index) => (
        <span
          key={`${particle.left}-${particle.top}-${index}`}
          aria-hidden="true"
          className="tr-particle"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            ["--delay" as "--delay"]: particle.delay,
            ["--duration" as "--duration"]: particle.duration,
            ["--drift" as "--drift"]: particle.drift,
          } as CSSProperties}
        />
      ))}
      {sparkPositions.map((particle, index) => (
        <span
          key={`${particle.left}-${particle.top}-spark-${index}`}
          aria-hidden="true"
          className="tr-spark"
          style={{
            left: particle.left,
            top: particle.top,
            ["--delay" as "--delay"]: particle.delay,
            ["--duration" as "--duration"]: particle.duration,
          } as CSSProperties}
        />
      ))}

      <div className="tr-hero-inner">
        <div className="tr-left hero">
          <div className="mobile-hero-title md:hidden">
            <h1 aria-label="GRUPO DE CAMPEÕES">
              <span aria-hidden="true">GRUPO DE</span>
              <strong aria-hidden="true">CAMPEÕES</strong>
              GRUPO DE
              <br />
              CAMPEÕES
            </h1>
            <p>A elite compete aqui.</p>
          </div>

          <div className="tr-badge">
            <ShieldCheck className="h-4 w-4" />
            CIRCUITO X1 UT DO FC 26
          </div>

          <h1 className="tr-title font-hero hero-text-old">
            {"AQUI N\u00c3O"}
            <br />
            TEM SORTE.
            <br />
            <span className="gold">{"S\u00d3"}</span>
            <br />
            <span className="gold">RESULTADO.</span>
          </h1>

          <p className="tr-subtitle">
            {"Entre no circuito, dispute campeonatos e prove quem realmente domina."}
          </p>

          <div className="tr-actions actions hero-buttons">
            <Link to="/campeonatos" className="tr-primary-btn tr-primary-button btn-primary">
              <Trophy className="h-4.5 w-4.5" />
              VER CAMPEONATOS
              <ChevronRight className="h-4.5 w-4.5" />
            </Link>

            <Link to="/explorar" className="tr-secondary-btn tr-secondary-button btn-secondary">
              <Search className="h-4.5 w-4.5" />
              EXPLORAR CIRCUITO
            </Link>
          </div>

          <div className="tr-player-card players-card">
            <div className="tr-player-stack" aria-hidden="true">
              {playerPreviewTokens.map((token) => (
                <span key={token} className="tr-player-avatar player-avatar">
                  <UserRound className="h-4 w-4" />
                </span>
              ))}
            </div>

            <span aria-hidden="true" className="tr-player-divider" />

            <div className="tr-player-copy">
              <p className="tr-player-value">{activePlayersValue}</p>
              <p className="tr-player-label">JOGADORES ATIVOS</p>
            </div>
          </div>
        </div>

        <div className="tr-center hero-visual">
          <div aria-hidden="true" className="tr-energy-ring" />
          <div aria-hidden="true" className="tr-energy-base" />
          <div aria-hidden="true" className="tr-energy-beam" />
          <div className="tr-logo-wrap hero-logo-wrap">
            <img
              src={heroLogoShadow}
              alt="Grupo de Campe\u00f5es FC26"
              className="tr-logo hero-logo"
            />
          </div>
        </div>

        <div className="tr-right">
          <aside className="tr-quick-card quick-view">
            <div className="tr-quick-head">
              <div>
                <p className="tr-quick-kicker">{"VIS\u00c3O R\u00c1PIDA"}</p>
                <p className="tr-quick-subtitle">O circuito em um olhar.</p>
              </div>
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>

            <div className="tr-quick-grid">
              {quickMetrics.map((item) => (
                <QuickMetricCard
                  key={item.title}
                  title={item.title}
                  value={item.value}
                  icon={item.icon}
                />
              ))}
            </div>

            <Link to="/explorar" className="tr-quick-action">
              VER TODOS OS DADOS
              <span className="tr-quick-action-icon">
                <ChevronRight className="h-4.5 w-4.5" />
              </span>
            </Link>
          </aside>
        </div>
      </div>

      <MobileBottomNav />

      <div className="tr-bottom-stats">
        {bottomStats.map((item) => (
          <BottomStatCard
            key={`${item.title}-${item.value}`}
            value={item.value}
            title={item.title}
            helper={item.helper}
            icon={item.icon}
          />
        ))}
      </div>
    </section>
  );
}
