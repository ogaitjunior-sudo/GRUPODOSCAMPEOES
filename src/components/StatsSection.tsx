import { ArrowRight, BarChart3, HelpCircle, Search, Trophy, UserRound, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useChampionships } from "@/contexts/ChampionshipContext";

export function StatsSection() {
  const { championships } = useChampionships();

  const quickActions = [
    {
      icon: Trophy,
      title: "Campeonatos",
      helper:
        championships.length > 0
          ? `${championships.length} competicao(oes) publicada(s)`
          : "Catalogo oficial do circuito",
      to: "/campeonatos",
      accent: "text-primary",
    },
    {
      icon: BarChart3,
      title: "Ranking",
      helper: "Classificacao, desempenho e destaque da temporada",
      to: "/ranking",
      accent: "text-electric",
    },
    {
      icon: Zap,
      title: "Relampago",
      helper: "Copas rapidas para fechar chave no mesmo dia",
      to: "/relampago",
      accent: "text-primary",
    },
    {
      icon: Search,
      title: "Explorar",
      helper: "Busca rapida, filtros e descoberta do circuito",
      to: "/explorar",
      accent: "text-electric",
    },
    {
      icon: UserRound,
      title: "Perfil do jogador",
      helper: "Campanhas, participacoes e atalhos do seu acesso",
      to: "/perfil",
      accent: "text-primary",
    },
    {
      icon: HelpCircle,
      title: "Ajuda operacional",
      helper: "FAQ, suporte e contato rapido com a organizacao",
      to: "/ajuda",
      accent: "text-electric",
    },
  ];

  return (
    <section className="site-section-shell py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="font-heading text-xs uppercase tracking-[0.34em] text-primary">
            Central competitiva
          </p>
          <h2 className="mt-3 font-heading text-3xl font-black text-white md:text-4xl">
            Acesso rapido ao circuito X1 UT
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            A home agora funciona como ponto de entrada para campeonato, ranking,
            relampago, busca e acompanhamento do jogador.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action, index) => (
            <Link
              key={action.title}
              to={action.to}
              className="rounded-[28px] panel-premium p-6 opacity-0 transition-all duration-300 animate-fade-in-up hover:-translate-y-1 hover:border-electric/30"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/18 bg-primary/10 ${action.accent}`}
                >
                  <action.icon className="h-6 w-6" />
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-5 font-heading text-xl font-bold text-foreground">
                {action.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {action.helper}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
