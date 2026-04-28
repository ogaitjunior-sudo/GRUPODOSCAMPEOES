import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { RequireAdminAccess, RequireAdminPermission } from "@/admin/layout/AdminRouteGuards";
import { AdminLayout } from "@/admin/layout/AdminLayout";
import { AdminPanelProvider } from "@/admin/context/AdminPanelContext";
import AdminChampionshipsPage from "@/admin/pages/AdminChampionshipsPage";
import AdminChampionshipWorkspacePage from "@/admin/pages/AdminChampionshipWorkspacePage";
import AdminDashboardPage from "@/admin/pages/AdminDashboardPage";
import AdminImageRequestsPage from "@/admin/pages/AdminImageRequestsPage";
import AdminLanguagesPage from "@/admin/pages/AdminLanguagesPage";
import AdminLogsPage from "@/admin/pages/AdminLogsPage";
import AdminPlayersPage from "@/admin/pages/AdminPlayersPage";
import AdminProfilesPage from "@/admin/pages/AdminProfilesPage";
import AdminSettingsPage from "@/admin/pages/AdminSettingsPage";
import AdminSupportPage from "@/admin/pages/AdminSupportPage";
import AdminSystemPage from "@/admin/pages/AdminSystemPage";
import AdminTeamsPage from "@/admin/pages/AdminTeamsPage";
import AdminUsersPage from "@/admin/pages/AdminUsersPage";
import { Toaster } from "@/components/ui/toaster";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { ChampionshipProvider } from "@/contexts/ChampionshipContext";
import { FriendlyChallengesProvider } from "@/contexts/FriendlyChallengesContext";
import { PlayerAuthProvider } from "@/contexts/PlayerAuthContext";
import Ajuda from "./pages/Ajuda.tsx";
import AcessoImplantacao from "./pages/AcessoImplantacao.tsx";
import AdminChampionshipForm from "./pages/AdminChampionshipForm.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import Campeonatos from "./pages/Campeonatos.tsx";
import ChampionshipDetails from "./pages/ChampionshipDetails.tsx";
import Champions from "./pages/Champions.tsx";
import CriarConta from "./pages/CriarConta.tsx";
import Entrar from "./pages/Entrar.tsx";
import Index from "./pages/Index.tsx";
import Ligas from "./pages/Ligas.tsx";
import NotFound from "./pages/NotFound.tsx";
import Pesquisar from "./pages/Pesquisar.tsx";
import PerfilJogador from "./pages/PerfilJogador.tsx";
import Ranking from "./pages/Ranking.tsx";
import RecuperarSenha from "./pages/RecuperarSenha.tsx";
import Relampago from "./pages/Relampago.tsx";

function AppRoutes() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdminRoute ? <Navbar /> : null}
      <Toaster />
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
