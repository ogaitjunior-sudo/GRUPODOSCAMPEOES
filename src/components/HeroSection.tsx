import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  Search,
  ShieldCheck,
  Swords,
  Trophy,
  UserRound,
} from "lucide-react";
import heroStadium from "@/assets/hero-stadium.jpg";
import logoGC from "@/assets/logo-gc-fc26.png";
import { DecorativeParticles } from "@/components/DecorativeParticles";
import { useChampionships } from "@/contexts/ChampionshipContext";
import { champions } from "@/data/siteContent";

function countChampionshipsByLabel(statuses: string[], label: string) {
  return statuses.filter((status) => status === label).length;
}

export function HeroSection() {
  const navigate = useNavigate();
  const { championships } = useChampionships();
  const [query, setQuery] = useState("");
  const statusList = useMemo(
    () => championships.map((championship) => championship.status),
    [championships],
  );

  const openCount = statusList.filter((status) => status.startsWith("Inscri")).length;
  const liveCount = countChampionshipsByLabel(statusList, "Em andamento");
  const upcomingCount = countChampionshipsByLabel(statusList, "Em breve");
  const championCount = champions.length;

  const quickAccessItems = [
    {
      title: "Campeonatos oficiais",
      helper: `${championships.length} torneio(s) no portal`,
      to: "/campeonatos",
      icon: Trophy,
    },
    {
      title: "Explorar o circuito",
      helper: "Busca, filtros e atalhos publicos",
      to: "/explorar",
      icon: Search,
    },
    {
      title: "Meu perfil",
      helper: "Historico, campanhas e acessos",
      to: "/perfil",
      icon: UserRound,
    },
  ];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      navigate("/explorar");
      return;
    }

    navigate(`/explorar?q=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <section className="site-section-shell relative overflow-hidden pt-24">
      <img
        src={heroStadium}
        alt="Estadio"
        className="absolute inset-0 h-full w-full object-cover"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/65 to-background" />
      <div className="absolute inset-0 surface-grid opacity-[0.06]" />
      <DecorativeParticles className="opacity-30" particleClassName="bg-primary/40" />

      <div className="relative z-10 container mx-auto px-4 pb-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] lg:items-center">
          <div className="pt-8 lg:pt-16">
            <div className="mb-6 inline-flex rounded-full panel-premium-soft px-5 py-2 text-[11px] font-heading uppercase tracking-[0.38em] text-primary">
              Plataforma publica de campeonatos X1 UT
            </div>

            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full panel-premium-soft md:h-24 md:w-24">
                <img
                  src={logoGC}
                  alt="Grupo de Campeoes FC26"
                  className="h-auto w-14 animate-float object-contain md:w-16"
                />
              </div>
              <div className="space-y-2">
                <p className="font-heading text-xs uppercase tracking-[0.34em] text-primary">
                  FC 26
                </p>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  Ultimate Team x1
                </p>
              </div>
            </div>

            <h1 className="max-w-4xl font-heading text-3xl font-black leading-tight text-glow-gold gradient-gold-text md:text-5xl lg:text-6xl">
              CAMPEONATOS X1
              <br />
              DE ULTIMATE TEAM
            </h1>

            <div className="mt-6 max-w-3xl rounded-[32px] panel-premium-soft px-6 py-5 md:px-8">
              <p className="text-base font-light leading-relaxed text-metallic md:text-lg">
                Entre no circuito, encontre torneios abertos, acompanhe o ranking, dispute
                relampagos e gerencie sua campanha competitiva em um fluxo publico pensado
                para FC 26.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 max-w-3xl rounded-[28px] panel-premium p-4">
              <label htmlFor="home-search" className="mb-3 block text-xs uppercase tracking-[0.24em] text-primary">
                Busca rapida
              </label>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-background/70 px-4 py-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="home-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar campeonato, jogador ou ranking"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-2xl border-glow-gold px-6 py-3 font-heading text-sm font-bold gradient-gold text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110"
                >
                  Pesquisar
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/campeonatos"
                className="rounded-full border-glow-gold px-8 py-3.5 font-heading text-sm font-bold gradient-gold text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110"
              >
                Ver campeonatos
              </Link>
              <Link
                to="/ranking"
                className="rounded-full panel-premium-soft px-8 py-3.5 font-heading text-sm font-bold text-electric transition-all hover:-translate-y-0.5 hover:bg-electric/10"
              >
                Abrir ranking
              </Link>
              <Link
                to="/relampago"
                className="rounded-full panel-premium-soft px-8 py-3.5 font-heading text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/10"
              >
                Jogar relampago
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {[
                "PlayStation",
                "Xbox",
                "mata-mata",
                "grupos + finais",
                "ranking de temporada",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.16em] text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-5 lg:pt-16">
            <div className="rounded-[32px] panel-premium p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-primary">Circuito publico</p>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-foreground">
                    Tudo em um so painel
                  </h2>
                </div>
                <Swords className="h-8 w-8 text-electric" />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Inscricoes abertas", value: openCount, icon: CalendarClock, tone: "text-primary" },
                  { label: "Em andamento", value: liveCount, icon: Swords, tone: "text-electric" },
                  { label: "Em breve", value: upcomingCount, icon: ShieldCheck, tone: "text-muted-foreground" },
                  { label: "Campeoes oficiais", value: championCount, icon: Trophy, tone: "text-primary" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] panel-premium-soft p-4">
                    <div className="flex items-center justify-between gap-3">
                      <item.icon className={`h-5 w-5 ${item.tone}`} />
                      <span className="font-heading text-2xl font-black text-foreground">{item.value}</span>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] panel-premium-soft p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Acesso rapido</p>
              <div className="mt-4 space-y-3">
                {quickAccessItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.to}
                    className="flex items-center gap-4 rounded-[22px] border border-white/8 bg-background/50 px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-electric/30 hover:bg-white/5"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-primary/20 bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-foreground">{item.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{item.helper}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
