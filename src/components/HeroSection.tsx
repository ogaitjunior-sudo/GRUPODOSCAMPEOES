import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  Search,
  ShieldCheck,
  Swords,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import heroLionsBackdrop from "@/assets/hero-lions-backdrop.png";
import logoGC from "@/assets/logo-gc-fc26.png";
import { DecorativeParticles } from "@/components/DecorativeParticles";
import { useChampionships } from "@/contexts/ChampionshipContext";

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

  const openCount = countChampionshipsByLabel(statusList, "REGISTRATION");
  const liveCount = countChampionshipsByLabel(statusList, "STARTED");
  const upcomingCount = statusList.filter((status) => status === "DRAFT" || status === "READY").length;
  const championCount = countChampionshipsByLabel(statusList, "FINISHED");
  const activePlayersCount = new Set(
    championships.flatMap((championship) =>
      championship.registrationRequests
        .filter((request) => request.status === "approved")
        .map((request) => request.playerId),
    ),
  ).size;

  const quickAccessItems = [
    {
      title: "Explorar o circuito",
      helper: "Use busca e filtros para chegar mais rapido ao torneio certo.",
      to: "/explorar",
      icon: Search,
    },
    {
      title: "Acompanhar ranking",
      helper: "Veja quem esta subindo e quais eventos alimentam a temporada.",
      to: "/ranking",
      icon: Trophy,
    },
    {
      title: "Entrar no perfil",
      helper: "Central do jogador para acompanhar pedidos, historico e proximos passos.",
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
    <section className="site-section-shell relative min-h-screen overflow-hidden pt-24">
      <img
        src={heroLionsBackdrop}
        alt="Estadio"
        className="absolute inset-0 h-full w-full object-cover opacity-100 saturate-110 contrast-110 brightness-95"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,213,92,0.18)_0%,rgba(255,193,7,0.1)_17%,rgba(255,193,7,0.035)_31%,transparent_45%),linear-gradient(90deg,rgba(0,0,0,0.76),rgba(0,0,0,0.25)_44%,rgba(0,0,0,0.72)),linear-gradient(180deg,rgba(0,0,0,0.14),rgba(0,0,0,0.78))]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,transparent_34%,rgba(0,0,0,0.22)_68%,rgba(0,0,0,0.64)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/62 to-transparent" />
      <DecorativeParticles className="opacity-45" particleClassName="bg-primary/45" />

      <div className="relative z-10 mx-auto max-w-[1560px] px-5 pb-10 pt-12 sm:px-8 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(300px,0.72fr)_minmax(380px,0.72fr)] lg:items-center">
          <div className="max-w-[650px] pt-8 lg:pt-10">
            <div className="site-kicker">
              <ShieldCheck className="h-4 w-4" />
              Circuito X1 UT do FC 26
            </div>

            <h1 className="mt-8 max-w-4xl text-balance font-heading text-5xl font-semibold leading-[1.02] text-white drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)] md:text-7xl">
              <span className="block text-white">Aqui nao tem sorte.</span>
              <span className="block text-primary">So resultado.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78 md:text-xl">
              Encontre torneios abertos, acompanhe o ranking e siga o proximo passo certo sem
              excesso de informacao.
            </p>

            <div className="mt-7 flex flex-wrap gap-7">
              <div className="flex items-center gap-4 border-r border-white/12 pr-7">
                <Trophy className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-white/82">Torneios publicados</p>
                  <p className="font-heading text-2xl font-semibold text-primary">{championships.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-white/82">Jogadores ativos</p>
                  <p className="font-heading text-2xl font-semibold text-primary">{activePlayersCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:self-center">
            <div className="relative w-full max-w-[470px] px-4 py-2">
              <img
                src={logoGC}
                alt="Grupo de Campeoes FC26"
                className="relative z-10 mx-auto w-full max-w-[430px] brightness-105 contrast-105 drop-shadow-[0_18px_28px_rgba(0,0,0,0.58)]"
              />
            </div>
          </div>

          <div className="w-full max-w-[540px] justify-self-end lg:self-center">
            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(24,24,21,0.94),rgba(7,8,9,0.96))] p-7 shadow-[0_26px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-primary">Visao rapida</p>
                  <h2 className="mt-3 font-heading text-2xl font-semibold text-white">
                    O circuito em um olhar
                  </h2>
                </div>
                <CalendarClock className="h-6 w-6 text-primary" />
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "Torneios publicados",
                    value: championships.length,
                    icon: Trophy,
                  },
                  {
                    label: "Campeonatos ao vivo",
                    value: liveCount,
                    icon: Swords,
                  },
                  {
                    label: "Proximas janelas",
                    value: upcomingCount,
                    icon: CalendarClock,
                  },
                  {
                    label: "Campeoes oficiais",
                    value: championCount,
                    icon: ShieldCheck,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-white/10 bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <item.icon className="h-5 w-5 text-primary" />
                    <p className="mt-6 text-sm leading-6 text-white/72">{item.label}</p>
                    <p className="mt-1 font-heading text-3xl font-semibold text-white">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-20 mt-6 grid gap-8 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,0.94fr)]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(24,24,20,0.94),rgba(8,9,10,0.96))] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl"
          >
            <label
              htmlFor="home-search"
              className="mb-5 block text-xs uppercase tracking-[0.32em] text-primary"
            >
              Busca rapida
            </label>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex flex-1 items-center gap-3 rounded-full border border-white/10 bg-black/[0.24] px-5 py-4">
                <Search className="h-5 w-5 text-white/55" />
                <input
                  id="home-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar campeonato, jogador ou ranking"
                  className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/50"
                />
              </div>
              <button type="submit" className="cta-primary min-w-[160px] px-7 py-4 text-base">
                Pesquisar
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link to="/campeonatos" className="cta-primary px-6 py-4 text-base">
                <Trophy className="h-5 w-5" />
                Ver campeonatos
              </Link>
              <Link to="/explorar" className="cta-secondary px-6 py-4 text-base">
                <Search className="h-5 w-5" />
                Explorar circuito
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Inscricoes abertas",
                  value: openCount,
                  icon: Trophy,
                },
                {
                  label: "Ao vivo",
                  value: liveCount,
                  icon: Swords,
                },
                {
                  label: "Em breve",
                  value: upcomingCount,
                  icon: CalendarClock,
                },
              ].map((item) => (
                <div key={item.label} className="rounded-[20px] border border-white/10 bg-white/[0.035] px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-primary">{item.label}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-white/88" />
                    <p className="font-heading text-2xl font-semibold text-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </form>

          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(24,24,20,0.9),rgba(8,9,10,0.96))] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.32em] text-primary">Proximos passos</p>
            <div className="mt-6 space-y-5">
              {quickAccessItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.to}
                  className="group flex items-start gap-5 rounded-[22px] transition-colors hover:text-foreground"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="block text-base font-semibold text-white">{item.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-white/64">
                      {item.helper}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
