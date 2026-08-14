import { Sidebar } from "@/components/layout/Sidebar";
import { PushToast } from "@/components/layout/PushToast";

/**
 * Layout do painel do gestor (Dashboard, Chamados, Inventário, Eventos...):
 * menu lateral fixo + área de conteúdo. O Topbar fica por página, pois o
 * título muda conforme a rota.
 *
 * TODO próxima iteração: envolver este layout num gate de autenticação
 * (useUsuarioAtual) que redireciona para /login quando não há sessão, ou
 * quando o papel não é "gestor".
 */
export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">{children}</div>
      <PushToast />
    </div>
  );
}
