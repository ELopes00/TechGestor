"use client";

import { useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { sair, useUsuarioAtual } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";

/** Barra superior: título da tela, tema, notificações e sair. */
export function Topbar({ titulo }: { titulo: string }) {
  const router = useRouter();
  const { usuario } = useUsuarioAtual();

  async function aoSair() {
    await sair();
    router.replace("/login");
  }

  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-surface-border bg-surface px-6">
      <h1 className="text-lg font-semibold text-institucional-900">{titulo}</h1>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <button
          aria-label="Notificações"
          className="relative rounded-full p-2 hover:bg-surface-muted"
        >
          <Bell size={20} className="text-institucional-700" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-alerta-critico" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-institucional-200 text-xs font-semibold text-institucional-700">
            {(usuario?.nomeCompleto || usuario?.login || "?").slice(0, 1).toUpperCase()}
          </div>
          <button
            onClick={aoSair}
            aria-label="Sair"
            title="Sair"
            className="rounded-full p-2 text-institucional-500 hover:bg-surface-muted hover:text-alerta-critico"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
