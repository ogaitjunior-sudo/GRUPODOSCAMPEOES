import { Link } from "react-router-dom";
import logoGC from "@/assets/logo-gc-fc26.png";
import { navItems } from "@/navigation";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const quickLinks = navItems.filter((item) =>
    ["/campeonatos", "/explorar", "/ranking", "/campeoes"].includes(item.path),
  );
  const accountLinks = [
    { label: "Entrar", path: "/entrar" },
    { label: "Criar conta", path: "/criar-conta" },
    { label: "Perfil", path: "/perfil" },
    { label: "Ajuda", path: "/ajuda" },
  ];

  return (
    <footer className="site-footer pb-10 pt-16">
      <div className="container mx-auto px-4">
        <div className="footer-shell rounded-[32px] site-card px-6 py-8 md:px-8 md:py-10">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1.25fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)]">
            <div className="max-w-xl">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full site-card-soft">
                  <img src={logoGC} alt="Grupo de Campeões FC26" className="h-8 w-8 object-contain" />
                </span>
                <div>
                  <p className="font-heading text-xs uppercase tracking-[0.32em] text-primary">
                    Grupo de Campeões
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Circuito oficial de FC 26 X1 UT</p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-muted-foreground">
                Um portal mais direto para encontrar campeonatos, acompanhar o ranking e seguir o
                fluxo do jogador sem excesso de informação.
              </p>

              <div className="footer-actions mt-6 flex flex-wrap gap-3 text-sm">
                <Link to="/campeonatos" className="cta-secondary px-4 py-2.5">
                  Ver campeonatos
                </Link>
                <Link to="/entrar" className="cta-ghost px-1 py-2">
                  Entrar no portal
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Navegação</p>
              <div className="mt-4 grid gap-3">
                {quickLinks.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Conta e suporte</p>
              <div className="mt-4 grid gap-3">
                {accountLinks.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="my-8 site-divider" />

          <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>&copy; {currentYear} Grupo de Campeões. Plataforma pública do circuito FC 26.</p>
            <p>Campeonatos, ranking, histórico e jornada do jogador em um fluxo mais simples.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
