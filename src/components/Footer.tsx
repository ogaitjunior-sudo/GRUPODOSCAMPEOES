import { Link } from "react-router-dom";
import logoGC from "@/assets/logo-gc-fc26.png";
import { navItems } from "@/navigation";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const quickLinks = navItems.filter((item) => item.path !== "/");
  const supportLinks = [
    { label: "Entrar", path: "/entrar" },
    { label: "Criar conta", path: "/criar-conta" },
    { label: "Ajuda", path: "/ajuda" },
    { label: "Perfil", path: "/perfil" },
  ];
  const secondaryLinks = [
    { label: "Campeoes", path: "/campeoes" },
    { label: "Ligas", path: "/ligas" },
  ];

  return (
    <footer className="py-10">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 rounded-[32px] panel-premium p-6 text-center md:p-8 md:text-left xl:grid-cols-[1.05fr_0.8fr_0.8fr_0.6fr]">
          <div>
            <div className="mb-4 flex items-center justify-center gap-3 md:justify-start">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-black/30">
                <img src={logoGC} alt="Logo" className="h-8 w-8" />
              </span>
              <div>
                <p className="font-heading text-[10px] uppercase tracking-[0.34em] text-primary">
                  Plataforma publica
                </p>
                <span className="mt-1 block font-heading text-sm font-bold gradient-gold-text">
                  GRUPO DE CAMPEOES - FC 26
                </span>
              </div>
            </div>

            <p className="max-w-md text-xs leading-6 text-muted-foreground">
              Plataforma publica do Grupo de Campeoes para campeonatos X1 de Ultimate Team,
              com calendario competitivo, ranking, relampago e area do jogador.
            </p>
          </div>

          <div>
            <p className="mb-4 font-heading text-xs uppercase tracking-[0.3em] text-primary">
              Circuito principal
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              {quickLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="rounded-full panel-premium-soft px-4 py-2.5 text-xs text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 font-heading text-xs uppercase tracking-[0.3em] text-primary">
              Conta e suporte
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              {supportLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="rounded-full panel-premium-soft px-4 py-2.5 text-xs text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 font-heading text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Areas secundarias
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              {secondaryLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-electric/30 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <p className="pt-6 text-xs text-muted-foreground">
              &copy; {currentYear} Grupo de Campeoes. Circuito publico de FC 26 para X1 UT.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
