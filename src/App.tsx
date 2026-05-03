import { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { RequireAdminAccess, RequireAdminPermission } from "@/admin/layout/AdminRouteGuards";
import { AdminLayout } from "@/admin/layout/AdminLayout";
import { AdminPanelProvider } from "@/admin/context/AdminPanelContext";
import { Toaster } from "@/components/ui/toaster";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Navbar } from "@/components/Navbar";
import {
  ADMIN_LOGIN_ROUTE,
  AdminAuthProvider,
} from "@/contexts/AdminAuthContext";
import { ChampionshipProvider } from "@/contexts/ChampionshipContext";
import { FriendlyChallengesProvider } from "@/contexts/FriendlyChallengesContext";
import { PlayerAuthProvider } from "@/contexts/PlayerAuthContext";
import Index from "./pages/Index.tsx";

const Ajuda = lazy(() => import("./pages/Ajuda.tsx"));
const AcessoImplantacao = lazy(() => import("./pages/AcessoImplantacao.tsx"));
const AdminChampionshipForm = lazy(() => import("./pages/AdminChampionshipForm.tsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const Campeonatos = lazy(() => import("./pages/Campeonatos.tsx"));
const ChampionshipDetails = lazy(() => import("./pages/ChampionshipDetails.tsx"));
const Champions = lazy(() => import("./pages/Champions.tsx"));
const CriarConta = lazy(() => import("./pages/CriarConta.tsx"));
const Entrar = lazy(() => import("./pages/Entrar.tsx"));
const Ligas = lazy(() => import("./pages/Ligas.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Pesquisar = lazy(() => import("./pages/Pesquisar.tsx"));
const PerfilJogador = lazy(() => import("./pages/PerfilJogador.tsx"));
const Ranking = lazy(() => import("./pages/Ranking.tsx"));
const RecuperarSenha = lazy(() => import("./pages/RecuperarSenha.tsx"));
const Relampago = lazy(() => import("./pages/Relampago.tsx"));

const AdminChampionshipsPage = lazy(() => import("@/admin/pages/AdminChampionshipsPage"));
const AdminChampionshipWorkspacePage = lazy(
  () => import("@/admin/pages/AdminChampionshipWorkspacePage"),
);
const AdminDashboardPage = lazy(() => import("@/admin/pages/AdminDashboardPage"));
const AdminImageRequestsPage = lazy(() => import("@/admin/pages/AdminImageRequestsPage"));
const AdminLanguagesPage = lazy(() => import("@/admin/pages/AdminLanguagesPage"));
const AdminLogsPage = lazy(() => import("@/admin/pages/AdminLogsPage"));
const AdminPlayersPage = lazy(() => import("@/admin/pages/AdminPlayersPage"));
const AdminProfilesPage = lazy(() => import("@/admin/pages/AdminProfilesPage"));
const AdminSettingsPage = lazy(() => import("@/admin/pages/AdminSettingsPage"));
const AdminSupportPage = lazy(() => import("@/admin/pages/AdminSupportPage"));
const AdminSystemPage = lazy(() => import("@/admin/pages/AdminSystemPage"));
const AdminTeamsPage = lazy(() => import("@/admin/pages/AdminTeamsPage"));
const AdminUsersPage = lazy(() => import("@/admin/pages/AdminUsersPage"));

function RouteFallback({ isAdminRoute }: { isAdminRoute: boolean }) {
  return (
    <div className={isAdminRoute ? "min-h-screen bg-background" : "min-h-[50vh]"}>
      <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 py-16">
        <div className="hunter-loading rounded-2xl border border-border bg-card/80 px-6 py-5 text-center shadow-[0_20px_70px_-40px_rgba(0,0,0,0.85)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-primary/80">carregando</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Preparando a proxima tela do campeonato.
          </p>
        </div>
      </div>
    </div>
  );
}

function HomeRoute() {
  return <Index />;
}

function LegacyAdminLoginRoute() {
  const location = useLocation();

  return <Navigate replace to={`${ADMIN_LOGIN_ROUTE}${location.search}`} />;
}

function AppRoutes() {
  const location = useLocation();
  const isAdminRoute =
    location.pathname.startsWith("/admin") || location.pathname === ADMIN_LOGIN_ROUTE;

  const routes = (
    <Suspense fallback={<RouteFallback isAdminRoute={isAdminRoute} />}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/explorar" element={<Pesquisar />} />
        <Route path="/pesquisar" element={<Pesquisar />} />
        <Route path="/perfil" element={<PerfilJogador />} />
        <Route path="/relampago" element={<Relampago />} />
        <Route path="/campeoes" element={<Champions />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/campeonatos" element={<Campeonatos />} />
        <Route path="/campeonatos/:championshipId" element={<ChampionshipDetails />} />
        <Route path="/ligas" element={<Ligas />} />
        <Route path="/ajuda" element={<Ajuda />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/acesso-implantacao" element={<AcessoImplantacao />} />
        <Route path="/criar-conta" element={<CriarConta />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />

        <Route path={ADMIN_LOGIN_ROUTE} element={<AdminLogin />} />
        <Route path="/admin/login" element={<LegacyAdminLoginRoute />} />
        <Route
          path="/admin"
          element={
            <RequireAdminAccess>
              <AdminPanelProvider>
                <AdminLayout />
              </AdminPanelProvider>
            </RequireAdminAccess>
          }
        >
          <Route
            index
            element={<Navigate replace to="dashboard" />}
          />
          <Route
            path="dashboard"
            element={
              <RequireAdminPermission permission="dashboard:view">
                <AdminDashboardPage />
              </RequireAdminPermission>
            }
          />
          <Route
            path="perfis"
            element={
              <RequireAdminAccess>
                <AdminProfilesPage />
              </RequireAdminAccess>
            }
          />
          <Route
            path="usuarios"
            element={
              <RequireAdminPermission permission="users:view">
                <AdminUsersPage />
              </RequireAdminPermission>
            }
          />
          <Route
            path="jogadores"
            element={
              <RequireAdminPermission permission="players:view">
                <AdminPlayersPage />
              </RequireAdminPermission>
            }
          />
          <Route
            path="times"
            element={
              <RequireAdminPermission permission="teams:view">
                <AdminTeamsPage />
              </RequireAdminPermission>
            }
          />
          <Route
            path="campeonatos"
            element={
              <RequireAdminPermission permission="championships:view">
                <AdminChampionshipsPage />
              </RequireAdminPermission>
            }
          />
          <Route
            path="campeonatos/novo"
            element={
              <RequireAdminPermission permission="championships:manage">
                <AdminChampionshipForm />
              </RequireAdminPermission>
            }
          />
          <Route
            path="campeonatos/:championshipId/editar"
            element={
              <RequireAdminPermission permission="championships:manage">
                <AdminChampionshipForm />
              </RequireAdminPermission>
            }
          />
          <Route
            path="campeonatos/:championshipId"
            element={
              <RequireAdminPermission permission="championships:view">
                <AdminChampionshipWorkspacePage />
              </RequireAdminPermission>
            }
          />
          <Route
            path="imagens"
            element={
              <RequireAdminPermission permission="images:view">
                <AdminImageRequestsPage />
              </RequireAdminPermission>
            }
          />
          <Route
            path="idiomas"
            element={
              <RequireAdminPermission permission="languages:view">
                <AdminLanguagesPage />
              </RequireAdminPermission>
            }
          />
          <Route
            path="suporte"
            element={
              <RequireAdminPermission permission="support:view">
                <AdminSupportPage />
              </RequireAdminPermission>
            }
          />
          <Route
            path="sistema"
            element={
              <RequireAdminAccess>
                <AdminSystemPage />
              </RequireAdminAccess>
            }
          />
          <Route
            path="logs"
            element={
              <RequireAdminPermission permission="logs:view">
                <AdminLogsPage />
              </RequireAdminPermission>
            }
          />
          <Route
            path="configuracoes"
            element={
              <RequireAdminPermission permission="settings:view">
                <AdminSettingsPage />
              </RequireAdminPermission>
            }
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );

  return (
    <>
      {!isAdminRoute ? <Navbar /> : null}
      <Toaster />
      {isAdminRoute ? routes : <main className="app-main">{routes}<MobileBottomNav /></main>}
      {!isAdminRoute ? <Footer /> : null}
    </>
  );
}

const App = () => (
  <AdminAuthProvider>
    <PlayerAuthProvider>
      <FriendlyChallengesProvider>
        <ChampionshipProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ChampionshipProvider>
      </FriendlyChallengesProvider>
    </PlayerAuthProvider>
  </AdminAuthProvider>
);

export default App;
