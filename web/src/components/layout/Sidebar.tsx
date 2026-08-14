"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  Package,
  CalendarDays,
  UserCircle,
  ShieldCheck,
  ScrollText,
} from "lucide-react";
import clsx from "clsx";
import { useUsuarioAtual } from "@/lib/auth";

const ITENS_MENU = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/chamados", label: "Chamados", icon: ClipboardList },
  { href: "/eventos", label: "Eventos", icon: CalendarClock },
  { href: "/inventario", label: "Inventário", icon: Package },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/perfil", label: "Perfil", icon: UserCircle },
];

const ITENS_ADMIN = [
  { href: "/admin", label: "Admin", icon: ShieldCheck },
  { href: "/logs", label: "Logs", icon: ScrollText },
];

/**
 * Menu lateral fixo. Admin/Logs só aparecem para quem tem perfil "ADM".
 *
 * Realinhado em 14/08/2026 pra bater com o sage-ti.web.app: lá a sidebar
 * fica sempre escura nos dois temas (só troca de #14181f pra #121212, ver
 * `chrome` no tailwind.config.ts) — reverte o que fizemos em 13/08/2026
 * (sidebar clara no tema claro), porque agora a referência é ficar igual
 * ao CSS real do sage-ti, não ao nosso instinto de "menos contraste".
 * Largura 248px também vem de lá (`--sidebar-w`).
 */
export function Sidebar() {
  const pathname = usePathname();
  const { usuario } = useUsuarioAtual();
  const itens = usuario?.perfil === "ADM" ? [...ITENS_MENU, ...ITENS_ADMIN] : ITENS_MENU;

  return (
    <aside className="flex h-screen w-[248px] shrink-0 flex-col bg-chrome-900 text-white">
      <div className="flex items-center gap-2 px-6 py-5">
        {/* Badge sempre branco, de propósito — a logo tem traços finos,
            precisa de fundo claro fixo pra ficar bem visível. */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white p-1 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tjrr.png" alt="Brasão do TJRR" className="h-full w-full object-contain" />
        </div>
        <p className="text-sm font-semibold text-white">TechGestor</p>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3">
        {itens.map(({ href, label, icon: Icon }) => {
          const ativo = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                ativo ? "bg-chrome-700 text-white" : "text-chrome-text hover:bg-chrome-800"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {usuario && (
        <div className="border-t border-white/10 px-6 py-4">
          <p className="truncate text-xs font-medium text-white">{usuario.nomeCompleto || usuario.login}</p>
          <p className="text-[11px] text-chrome-muted">
            {usuario.perfil === "ADM" ? "Administrador" : "Técnico"} · {usuario.predio}
          </p>
        </div>
      )}
    </aside>
  );
}
