import { ArrowRight, BarChart3, HelpCircle, Trophy, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { SiteSectionIntro } from "@/components/SiteSectionIntro";
import { useChampionships } from "@/contexts/ChampionshipContext";

export function StatsSection() {
  const { championships } = useChampionships();

  const quickActions = [
    {
      icon: Trophy,
      title: "Campeonatos",
      helper:
        championships.length > 0
          ? `${championships.length} eventos disponíveis no portal`
          : "Acompanhe a grade oficial do circuito",
      to: "/campeonatos",
      emphasis: true,
    },
    {
      icon: BarChart3,
      title: "Ranking",
      helper: "Veja quem está em alta e quais eventos alimentam a temporada.",
      to: "/ranking",
    },
    {
      icon: UserRound,
      title: "Perfil",
      helper: "Central do jogador para pedidos, campanhas e próximos passos.",
      to: "/perfil",
    },
    {
      icon: HelpCircle,
      title: "Ajuda",
      helper: "Dúvidas, suporte e orientações sem sair do fluxo principal.",
      to: "/ajuda",
    },
  ];

  return (
    <section className="site-section-shell py-20">
      <div className="container mx-auto px-4">
        <SiteSectionIntro
          eyebrow="Acesso rápido"
          title="Entre pelo caminho certo"
          description="A navegação principal ficou mais objetiva. Aqui ficam só os atalhos que realmente ajudam o jogador a seguir sem fricção."
          align="center"
          className="mx-auto max-w-4xl"
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
          {quickActions.map((action, index) => (
            <Link
              key={action.title}
              to={action.to}
              className={`rounded-[28px] p-6 transition-all duration-200 hover:-translate-y-1 ${
                action.emphasis ? "site-card" : "site-card-soft"
              } ${index === 0 ? "lg:row-span-2" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/18 bg-primary/10 text-primary">
                  <action.icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <h3 className="mt-6 font-heading text-2xl font-semibold text-foreground">
                {action.title}
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
                {action.helper}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
