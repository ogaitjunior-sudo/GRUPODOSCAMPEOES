import { useEffect, useRef, useState } from "react";
import { Crown, Pause, Play, Trophy, Volume2 } from "lucide-react";
import logoGC from "@/assets/logo-gc-fc26.png";
import { Button } from "@/components/ui/button";
import { DecorativeParticles } from "@/components/DecorativeParticles";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { PageShell } from "@/components/PageShell";
import { champions, championsTheme } from "@/data/siteContent";

function TrophyIcons({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-1">
      {Array.from({ length: count }).map((_, index) => (
        <Trophy key={index} className="h-4 w-4 text-primary" />
      ))}
    </span>
  );
}

function formatTitles(count: number) {
  return `${count} título${count === 1 ? "" : "s"}`;
}

function formatRegisteredTitles(count: number) {
  return `${formatTitles(count)} registrado${count === 1 ? "" : "s"} na galeria.`;
}

const Champions = () => {
  const hasChampions = champions.length > 0;
  const totalTitles = champions.reduce((sum, player) => sum + player.titles, 0);
  const topTitleCount = champions[0]?.titles ?? 0;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const hasTheme = Boolean(championsTheme.source);
  const supportsManagedPlayback =
    typeof window !== "undefined" && !window.navigator.userAgent.toLowerCase().includes("jsdom");

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !hasTheme || !supportsManagedPlayback) {
      return;
    }

    audio.volume = championsTheme.volume;

    let active = true;

    const attemptAutoplay = async () => {
      if (!championsTheme.autoplay) {
        return;
      }

      try {
        const playback = audio.play();

        if (playback !== undefined) {
          await playback;
        }

        if (active) {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        }
      } catch {
        if (active) {
          setIsPlaying(false);
          setAutoplayBlocked(true);
        }
      }
    };

    void attemptAutoplay();

    return () => {
      active = false;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // Some non-browser environments do not implement media controls.
      }
    };
  }, [hasTheme, supportsManagedPlayback]);

  const handleThemeToggle = async () => {
    const audio = audioRef.current;

    if (!audio || !supportsManagedPlayback) {
      setAutoplayBlocked(true);
      return;
    }

    if (audio.paused) {
      try {
        const playback = audio.play();

        if (playback !== undefined) {
          await playback;
        }

        setIsPlaying(true);
        setAutoplayBlocked(false);
      } catch {
        setIsPlaying(false);
        setAutoplayBlocked(true);
      }

      return;
    }

    audio.pause();
    setIsPlaying(false);
  };

  return (
    <PageShell>
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        <DecorativeParticles count={15} className="opacity-20" particleClassName="bg-primary/50" />
        <div className="relative container mx-auto px-4 text-center">
          <img
            src={logoGC}
            alt="Grupo de Campeões FC26"
            className="mx-auto mb-4 h-24 w-24 animate-float drop-shadow-[0_0_20px_hsl(51,100%,50%,0.4)]"
          />
          <p className="mb-2 font-heading text-xs tracking-[0.3em] text-primary">
            CAMPEÕES E DESTAQUES
          </p>
          <h1 className="mb-3 font-heading text-4xl font-black gradient-gold-text text-glow-gold md:text-6xl">
            HALL DA FAMA
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground">
            A galeria reúne cada campeão apenas uma vez, com a quantidade correta de títulos e um visual padronizado para destacar a história do grupo.
          </p>

          <div className="mx-auto mt-8 grid max-w-4xl gap-4 text-left md:grid-cols-3">
            <article className="rounded-2xl border border-primary/20 bg-metallic-card p-5 shadow-[0_0_30px_hsl(51_100%_50%_/_0.08)]">
              <p className="text-xs font-heading uppercase tracking-[0.2em] text-primary">Campeões oficiais</p>
              <p className="mt-3 font-heading text-3xl font-black text-foreground">{champions.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Lista única, sem nomes duplicados.</p>
            </article>

            <article className="rounded-2xl border border-primary/20 bg-metallic-card p-5 shadow-[0_0_30px_hsl(51_100%_50%_/_0.08)]">
              <p className="text-xs font-heading uppercase tracking-[0.2em] text-primary">Títulos somados</p>
              <p className="mt-3 font-heading text-3xl font-black text-foreground">{totalTitles}</p>
              <p className="mt-2 text-sm text-muted-foreground">Contagem total registrada na galeria.</p>
            </article>

            <article className="rounded-2xl border border-primary/20 bg-metallic-card p-5 shadow-[0_0_30px_hsl(51_100%_50%_/_0.08)]">
              <p className="text-xs font-heading uppercase tracking-[0.2em] text-primary">Maior marca</p>
              <p className="mt-3 font-heading text-3xl font-black text-foreground">{topTitleCount}</p>
              <p className="mt-2 text-sm text-muted-foreground">{formatTitles(topTitleCount)} na liderança atual.</p>
            </article>
          </div>

          <article className="mx-auto mt-6 max-w-4xl rounded-[1.75rem] border border-primary/20 bg-metallic-card p-6 text-left shadow-[0_20px_60px_hsl(0_0%_0%_/_0.35)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-heading uppercase tracking-[0.2em] text-primary">Tema da aba</p>
                <h2 className="mt-2 flex items-center gap-2 font-heading text-xl font-bold text-foreground">
                  <Volume2 className="h-5 w-5 text-primary" />
                  {championsTheme.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {hasTheme
                    ? autoplayBlocked
                      ? "O navegador bloqueou a reprodução automática com som. Use o botão para iniciar manualmente."
                      : "A página tenta iniciar a música assim que esta aba é aberta."
                    : "Adicione um arquivo em public/audio ou troque a URL da música em siteContent.ts para ativar o tema."}
                </p>
              </div>

              {hasTheme && (
                <Button
                  type="button"
                  onClick={() => {
                    void handleThemeToggle();
                  }}
                  className="font-heading font-bold"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? "Pausar música" : "Tocar música"}
                </Button>
              )}
            </div>

            {hasTheme && (
              <audio
                ref={audioRef}
                src={championsTheme.source}
                loop={championsTheme.loop}
                preload="auto"
                playsInline
              />
            )}
          </article>
        </div>
      </section>

      <section className="bg-card py-16">
        <div className="container mx-auto px-4">
          {hasChampions ? (
            <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="grid gap-4 md:grid-cols-2">
                {champions.map((player, index) => (
                  <article
                  key={player.name}
                  className={`rounded-[1.75rem] p-5 opacity-0 transition-all duration-300 animate-fade-in-up ${
                    player.highlight
                      ? "border-2 border-primary/50 bg-metallic-card border-glow-gold md:col-span-2"
                      : index < 3
                      ? "border border-primary/20 bg-metallic-card"
                      : "border border-border bg-metallic-card"
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-heading text-sm font-black ${
                            index === 0
                              ? "gradient-gold text-primary-foreground"
                              : index === 1
                              ? "bg-muted text-foreground"
                              : index === 2
                              ? "bg-amber-900/50 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {player.rank}
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-heading uppercase tracking-[0.2em] text-primary">
                            {player.highlight ? "Maior campeão" : "Campeão oficial"}
                          </p>
                          <h2
                            className={`mt-2 font-heading font-bold ${
                              player.highlight ? "text-2xl gradient-gold-text" : "text-xl text-foreground"
                            }`}
                          >
                            {player.name}
                          </h2>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {formatRegisteredTitles(player.titles)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <TrophyIcons count={player.titles} />
                        <span className="font-heading text-sm font-bold text-primary">
                          {player.titles}x
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="space-y-4">
                <article className="rounded-[1.75rem] border border-primary/20 bg-metallic-card p-6 shadow-[0_20px_60px_hsl(0_0%_0%_/_0.2)]">
                  <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-lg font-bold text-foreground">Destaques da galeria</h2>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    Os campeões foram organizados por quantidade de títulos, com desempate em ordem alfabética e visual padronizado para facilitar a leitura.
                  </p>
                </article>

                <article className="rounded-[1.75rem] border border-primary/20 bg-metallic-card p-6 shadow-[0_20px_60px_hsl(0_0%_0%_/_0.2)]">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-lg font-bold text-foreground">Regras da lista</h2>
                  </div>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                    <p>1 nome corresponde a 1 registro visível.</p>
                    <p>Títulos repetidos do mesmo jogador são somados automaticamente.</p>
                    <p>O líder atual recebe destaque visual sem duplicar o nome em outra área.</p>
                  </div>
                </article>
              </aside>
            </div>
          ) : (
            <EmptyStateCard
              icon={Crown}
              title="Nenhum campeão registrado ainda"
              description="O site foi zerado para um novo começo. Quando os primeiros torneios forem concluídos, os vencedores aparecerão aqui com seus títulos e destaques."
              className="mx-auto max-w-3xl"
            />
          )}
        </div>
      </section>
    </PageShell>
  );
};

export default Champions;
