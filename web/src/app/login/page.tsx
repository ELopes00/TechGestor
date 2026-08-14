"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { entrar, sair, useUsuarioAtual } from "@/lib/auth";

const MENSAGENS_ERRO: Record<string, string> = {
  "auth/invalid-credential": "Login ou senha incorretos.",
  "auth/invalid-email": "Login inválido.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um momento e tente de novo.",
  "auth/network-request-failed": "Falha de conexão. Verifique sua internet.",
};

/**
 * Tela de login do painel do gestor. Segue o app original: o campo é
 * "Login" (não e-mail) — internamente vira um e-mail fake pro Firebase
 * Auth (ver lib/auth.ts). Só quem tem perfil "ADM" entra no painel web;
 * um TECNICO é orientado a usar o app mobile.
 */
export default function LoginPage() {
  const router = useRouter();
  const { usuario, carregando: carregandoSessao } = useUsuarioAtual();

  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [manterConectado, setManterConectado] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (carregandoSessao || !usuario) return;

    if (usuario.perfil === "ADM") {
      router.replace("/dashboard");
      return;
    }

    setErro("Este painel é exclusivo para administradores. Acesse pelo aplicativo móvel do técnico.");
    sair();
  }, [usuario, carregandoSessao, router]);

  async function aoEnviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(login, senha, manterConectado);
    } catch (err) {
      const codigo = (err as { code?: string })?.code ?? "";
      setErro(MENSAGENS_ERRO[codigo] ?? "Não foi possível entrar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      {/* Fundo e card acompanham o tema (13/08/2026, ver Sidebar.tsx pro
          mesmo ajuste). Brilho radial removido em 14/08/2026 pra ficar fiel
          ao CSS real do sage-ti.web.app, que não usa esse efeito. */}
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-xl">
        <div className="mb-7 flex flex-col items-center text-center">
          {/* Badge sempre branco, de propósito — a logo tem traços finos e
              escuros; com o card seguindo o tema (ver acima), ela precisa
              de um fundo claro fixo pra continuar bem visível no escuro
              também (pedido em 13/08/2026). */}
          <div className="mb-3 rounded-xl bg-white p-2.5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-tjrr.png" alt="Brasão do TJRR" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-lg font-semibold text-institucional-900">TechGestor</h1>
          <p className="text-sm text-institucional-500">Painel do Gestor</p>
        </div>

        {erro && (
          <div className="mb-5 flex items-start gap-2 rounded-lg bg-alerta-criticoBg px-3 py-2.5 text-sm text-alerta-critico">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={aoEnviar} className="space-y-4">
          <div>
            <label htmlFor="login" className="mb-1.5 block text-xs font-medium text-institucional-600">
              Seu Login
            </label>
            <input
              id="login"
              type="text"
              required
              autoComplete="username"
              autoCapitalize="none"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="ex: admin"
              className="w-full rounded-lg border border-surface-border bg-surface-muted px-3 py-2.5 text-sm text-institucional-900 outline-none placeholder:text-institucional-400 focus:border-accent-500 focus:ring-2 focus:ring-accent-50"
            />
          </div>

          <div>
            <label htmlFor="senha" className="mb-1.5 block text-xs font-medium text-institucional-600">
              Sua Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-surface-border bg-surface-muted px-3 py-2.5 text-sm text-institucional-900 outline-none placeholder:text-institucional-400 focus:border-accent-500 focus:ring-2 focus:ring-accent-50"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-institucional-600">
            <input
              type="checkbox"
              checked={manterConectado}
              onChange={(e) => setManterConectado(e.target.checked)}
              className="h-4 w-4 rounded border-surface-border text-accent-600 focus:ring-accent-300"
            />
            Mantenha-me conectado
          </label>

          <button
            type="submit"
            disabled={enviando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-btn px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-btn-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando && <Loader2 size={16} className="animate-spin" />}
            {enviando ? "Entrando..." : "Entrar no sistema"}
          </button>
        </form>
      </div>
    </div>
  );
}
