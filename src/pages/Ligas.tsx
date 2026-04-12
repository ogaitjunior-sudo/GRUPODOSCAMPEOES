import { Shield, TrendingUp } from "lucide-react";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { leagueTable } from "@/data/siteContent";

const Ligas = () => {
  const hasLeagueTable = leagueTable.length > 0;

  return (
    <PageShell>
      <section className="py-16">
        <div className="container mx-auto px-4">
          <PageHeader
            icon={Shield}
            title="LIGAS SECUNDARIAS"
            description="Area secundaria do portal para modos em formato liga. O foco principal agora fica no catalogo de campeonatos X1 UT."
          />

          {hasLeagueTable ? (
            <div className="mx-auto mt-10 max-w-4xl overflow-x-auto rounded-2xl border border-border bg-card p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border font-heading text-xs text-muted-foreground">
                    <th className="px-3 py-3 text-left">#</th>
                    <th className="px-3 py-3 text-left">Jogador</th>
                    <th className="px-3 py-3 text-center">J</th>
                    <th className="px-3 py-3 text-center">V</th>
                    <th className="px-3 py-3 text-center">E</th>
                    <th className="px-3 py-3 text-center">D</th>
                    <th className="hidden px-3 py-3 text-center sm:table-cell">Gols</th>
                    <th className="px-3 py-3 text-center font-bold text-primary">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueTable.map((row, index) => (
                    <tr
                      key={row.name}
                      className={`border-b border-border/50 opacity-0 transition-colors animate-fade-in-up hover:bg-muted/30 ${
                        index < 3 ? "bg-primary/5" : ""
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="px-3 py-3">
                        <span
                          className={`font-heading font-black ${
                            index < 3 ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {row.pos}
                        </span>
                      </td>
                      <td className="flex items-center gap-2 px-3 py-3 font-bold">
                        {index < 3 && <TrendingUp className="h-3 w-3 text-primary" />}
                        <span className={index < 3 ? "gradient-gold-text" : "text-foreground"}>
                          {row.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground">{row.played}</td>
                      <td className="px-3 py-3 text-center text-green-400">{row.wins}</td>
                      <td className="px-3 py-3 text-center text-muted-foreground">{row.draws}</td>
                      <td className="px-3 py-3 text-center text-red-400">{row.losses}</td>
                      <td className="hidden px-3 py-3 text-center text-muted-foreground sm:table-cell">
                        {row.goals}
                      </td>
                      <td className="px-3 py-3 text-center font-heading font-black text-primary">
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyStateCard
              icon={Shield}
              title="Modo liga ainda sem tabela"
              description="Esta area segue disponivel como modo secundario. Quando uma temporada em formato liga for iniciada, a classificacao aparece aqui."
              className="mx-auto mt-10 max-w-3xl"
            />
          )}
        </div>
      </section>
    </PageShell>
  );
};

export default Ligas;
