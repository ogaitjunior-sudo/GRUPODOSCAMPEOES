import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { RequireAdminAccess, RequireAdminPermission } from "@/admin/layout/AdminRouteGuards";
import { AdminLayout } from "@/admin/layout/AdminLayout";
import { AdminPanelProvider } from "@/admin/context/AdminPanelContext";
import { Toaster } from "@/components/ui/toaster";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
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
        <div className="rounded-2xl border border-border bg-card/80 px-6 py-5 text-center shadow-[0_20px_70px_-40px_rgba(0,0,0,0.85)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-primary/80">carregando</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Preparando a proxima tela do campeonato.
          </p>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdminRoute ? <Navbar /> : null}
      <Toaster />
      <Suspense fallback={<RouteFallback isAdminRoute={isAdminRoute} />}>
        <Routes>
          <Route path="/" element={<Index />} />
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

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAdminAccess>
                <AdminLayout />
              </RequireAdminAccess>
            }
          >
            <Route
              index
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
      {!isAdminRoute ? <Footer /> : null}
    </>
  );
}

const App = () => (
  <AdminAuthProvider>
    <PlayerAuthProvider>
      <FriendlyChallengesProvider>
        <ChampionshipProvider>
          <AdminPanelProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AdminPanelProvider>
        </ChampionshipProvider>
      </FriendlyChallengesProvider>
    </PlayerAuthProvider>
  </AdminAuthProvider>
);

export default App;
