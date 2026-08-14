"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { useUsuarioAtual, sair } from "@/lib/auth";
import { DataService } from "@/lib/dataService";
import { registrarPush } from "@/lib/push";

const MENSAGENS_ERRO: Record<string, string> = {
  "auth/invalid-credential": "A senha atual está incorreta.",
  "auth/wrong-password": "A senha atual está incorreta.",
};

export default function PerfilPage() {
  const router = useRouter();
  const { usuario } = useUsuarioAtual();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [pushMsg, setPushMsg] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [ativandoPush, setAtivandoPush] = useState(false);

  async function ativarNotificacoes() {
    if (!usuario) return;
    setPushMsg(null);
    setAtivandoPush(true);
    const resultado = await registrarPush(usuario.uid);
    setAtivandoPush(false);
    setPushMsg(
      resultado.sucesso
        ? { tipo: "sucesso", texto: "Notificações ativadas neste navegador." }
        : { tipo: "erro", texto: resultado.erro ?? "Não foi possível ativar." }
    );
  }

  async function trocarSenha() {
    setMensagem(null);
    if (!senhaAtual || !novaSenha || !confirmarSenha) return setMensagem({ tipo: "erro", texto: "Preencha todos os campos." });
    if (novaSenha.length < 6) return setMensagem({ tipo: "erro", texto: "A nova senha deve ter pelo menos 6 caracteres." });
    if (novaSenha !== confirmarSenha) return setMensagem({ tipo: "erro", texto: "As senhas novas não coincidem." });

    setSalvando(true);
    const resultado = await DataService.mudarMinhaSenha(senhaAtual, novaSenha);
    setSalvando(false);

    if (resultado.sucesso) {
      setMensagem({ tipo: "sucesso", texto: "Sua senha foi alterada com sucesso." });
      setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
    } else {
      setMensagem({ tipo: "erro", texto: MENSAGENS_ERRO[resultado.erro ?? ""] ?? "Erro ao atualizar. Tente novamente." });
    }
  }

  async function aoSair() {
    await sair();
    router.replace("/login");
  }

  const campo = "w-full rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm text-institucional-900 outline-none focus:border-institucional-500";

  return (
    <>
      <Topbar titulo="Perfil" />
      <main className="flex-1 space-y-6 overflow-y-auto p-6 max-w-lg">
        <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-institucional-400">Logado como</p>
          <p className="text-lg font-semibold text-institucional-900">{usuario?.login}</p>
          <p className="mt-1 text-sm text-institucional-600">Perfil: {usuario?.perfil === "ADM" ? "Administrador" : "Técnico"}</p>
          <p className="text-sm text-institucional-600">Unidade: {usuario?.predio || "Geral"}</p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-institucional-800">🔒 Alterar minha senha</p>

          {mensagem && (
            <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${mensagem.tipo === "erro" ? "bg-alerta-criticoBg text-alerta-critico" : "bg-alerta-okBg text-alerta-ok"}`}>
              {mensagem.texto}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-institucional-500">Senha atual</label>
              <input type="password" className={campo} value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="Digite sua senha atual" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-institucional-500">Nova senha</label>
              <input type="password" className={campo} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-institucional-500">Confirmar nova senha</label>
              <input type="password" className={campo} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Repita a nova senha" />
            </div>
          </div>

          <button onClick={trocarSenha} disabled={salvando} className="mt-4 w-full rounded-md bg-accent-btn py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {salvando ? "Salvando..." : "Salvar nova senha"}
          </button>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
          <p className="mb-1 text-sm font-semibold text-institucional-800">🔔 Notificações</p>
          <p className="mb-4 text-xs text-institucional-500">
            Receba um aviso neste navegador quando um chamado for atribuído a você ou chegar na fila da sua unidade.
          </p>
          {pushMsg && (
            <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${pushMsg.tipo === "erro" ? "bg-alerta-criticoBg text-alerta-critico" : "bg-alerta-okBg text-alerta-ok"}`}>
              {pushMsg.texto}
            </div>
          )}
          <button onClick={ativarNotificacoes} disabled={ativandoPush} className="w-full rounded-md border border-institucional-700 py-2.5 text-sm font-semibold text-institucional-700 disabled:opacity-60">
            {ativandoPush ? "Ativando..." : "Ativar notificações neste navegador"}
          </button>
        </div>

        <button onClick={aoSair} className="w-full rounded-md bg-alerta-critico py-2.5 text-sm font-semibold text-white">
          Sair do sistema
        </button>
      </main>
    </>
  );
}
