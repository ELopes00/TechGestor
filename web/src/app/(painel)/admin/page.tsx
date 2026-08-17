"use client";

import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useChamados, useEventos, useUsuarios } from "@/lib/hooks";
import { useUsuarioAtual } from "@/lib/auth";
import { DataService } from "@/lib/dataService";
import { UNIDADES, chamadoFechado, statusRealUsuario, type Papel, type Usuario } from "@/lib/types";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function AdminPage() {
  const { usuario } = useUsuarioAtual();
  const [aba, setAba] = useState<"EQUIPE" | "RELATORIOS">("EQUIPE");

  const campo = "rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm text-institucional-900 outline-none focus:border-institucional-500";

  return (
    <>
      <Topbar titulo="Admin" />
      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="flex gap-2 rounded-lg border border-surface-border bg-surface p-1">
          {(["EQUIPE", "RELATORIOS"] as const).map((a) => (
            <button key={a} onClick={() => setAba(a)} className={`flex-1 rounded-md py-2 text-sm font-semibold ${aba === a ? "bg-institucional-100 text-institucional-800" : "text-institucional-400"}`}>
              {a === "EQUIPE" ? "👥 Equipe" : "📊 Relatórios"}
            </button>
          ))}
        </div>

        {aba === "EQUIPE" ? <AbaEquipe autor={usuario?.login ?? ""} campo={campo} /> : <AbaRelatorios />}
      </main>
    </>
  );
}

function AbaEquipe({ autor, campo }: { autor: string; campo: string }) {
  const { usuarios } = useUsuarios();
  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [predio, setPredio] = useState<string>(UNIDADES[0]);
  const [perfil, setPerfil] = useState<Papel>("TECNICO");
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [novaSenhaAdmin, setNovaSenhaAdmin] = useState("");
  const [msgSenha, setMsgSenha] = useState<string | null>(null);
  const [redefinindo, setRedefinindo] = useState(false);

  async function criar() {
    if (!login || !senha) return;
    setSalvando(true);
    try {
      await DataService.registrarUsuario(login, senha, nome, perfil, predio, 8, 17, autor);
      setNome(""); setLogin(""); setSenha("");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao() {
    if (!editando) return;
    await DataService.atualizarUsuario(editando.uid, {
      nomeCompleto: editando.nomeCompleto, predio: editando.predio, inicio: editando.inicio, saida: editando.saida, perfil: editando.perfil,
    }, autor);
    setEditando(null);
  }

  async function excluir(u: Usuario) {
    if (!confirm(`Apagar o usuário ${u.login}?`)) return;
    await DataService.deletarUsuario(u.uid, autor);
    setEditando(null);
  }

  /** Admin redefine a senha de outra pessoa (pedido de 14/08/2026, ver
   *  backend/functions/src/index.ts). Só quem tem perfil ADM chega aqui. */
  async function redefinirSenha() {
    if (!editando) return;
    if (novaSenhaAdmin.length < 6) {
      setMsgSenha("Mínimo 6 caracteres.");
      return;
    }
    setRedefinindo(true);
    setMsgSenha(null);
    const resultado = await DataService.redefinirSenhaDeOutroUsuario(editando.uid, novaSenhaAdmin);
    setRedefinindo(false);
    setMsgSenha(resultado.sucesso ? "Senha redefinida." : "Não foi possível redefinir. Tente de novo.");
    if (resultado.sucesso) setNovaSenhaAdmin("");
  }

  return (
    <>
      <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-institucional-800">Cadastrar novo usuário</p>
        <div className="mb-3 flex gap-2">
          {(["TECNICO", "ADM"] as const).map((p) => (
            <button key={p} onClick={() => setPerfil(p)} className={`flex-1 rounded-md py-2 text-xs font-bold ${perfil === p ? "bg-accent-btn text-white" : "bg-surface-muted text-institucional-500"}`}>
              {p === "TECNICO" ? "👨‍🔧 TÉCNICO" : "🛡️ ADMIN"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={`${campo} sm:col-span-2`} placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
          <input className={campo} placeholder="Login" value={login} onChange={(e) => setLogin(e.target.value)} />
          <input className={campo} type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {UNIDADES.map((u) => (
            <button key={u} onClick={() => setPredio(u)} className={`rounded-md px-2.5 py-1 text-xs font-medium ${predio === u ? "bg-accent-btn text-white" : "border border-surface-border text-institucional-600"}`}>
              {u}
            </button>
          ))}
        </div>
        <button onClick={criar} disabled={salvando} className="mt-4 rounded-md bg-accent-btn px-4 py-2 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60">
          {salvando ? "Salvando..." : `Salvar ${perfil}`}
        </button>
      </div>

      <p className="mb-2 mt-6 text-sm font-semibold text-institucional-800">Equipe cadastrada</p>
      <div className="space-y-2">
        {usuarios.map((u) => {
          const status = statusRealUsuario(u);
          return (
            <div key={u.id ?? u.uid} className="flex items-center justify-between rounded-xl border border-surface-border bg-surface p-4 shadow-sm" style={{ borderLeft: `4px solid ${status === "ONLINE" ? "#1a9c5c" : "#8493ab"}` }}>
              <div>
                <p className="font-semibold text-institucional-800">{u.nomeCompleto || u.login} ({u.login})</p>
                <p className="text-xs text-institucional-500">{u.perfil === "ADM" ? "🛡️ Admin" : "👨‍🔧 Técnico"} | 🏢 {u.predio} | ⏰ {String(u.inicio).padStart(2, "0")}:00–{String(u.saida).padStart(2, "0")}:00</p>
                <p className="mt-1 text-xs font-semibold" style={{ color: status === "ONLINE" ? "#1a9c5c" : "#8493ab" }}>● {status}</p>
              </div>
              <button
                onClick={() => { setEditando(u); setNovaSenhaAdmin(""); setMsgSenha(null); }}
                className="text-xs font-semibold text-institucional-600"
              >
                Editar
              </button>
            </div>
          );
        })}
      </div>

      {editando && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl">
            <p className="mb-4 text-sm font-semibold text-institucional-800">Editar: {editando.login}</p>
            <div className="mb-3 flex gap-2">
              {(["TECNICO", "ADM"] as const).map((p) => (
                <button key={p} onClick={() => setEditando({ ...editando, perfil: p })} className={`flex-1 rounded-md py-2 text-xs font-bold ${editando.perfil === p ? "bg-accent-btn text-white" : "bg-surface-muted text-institucional-500"}`}>
                  {p}
                </button>
              ))}
            </div>
            <input className={`${campo} w-full`} value={editando.nomeCompleto ?? ""} onChange={(e) => setEditando({ ...editando, nomeCompleto: e.target.value })} placeholder="Nome completo" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input className={campo} type="number" value={editando.inicio} onChange={(e) => setEditando({ ...editando, inicio: Number(e.target.value) })} placeholder="Entrada (h)" />
              <input className={campo} type="number" value={editando.saida} onChange={(e) => setEditando({ ...editando, saida: Number(e.target.value) })} placeholder="Saída (h)" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {UNIDADES.map((u) => (
                <button key={u} onClick={() => setEditando({ ...editando, predio: u })} className={`rounded-md px-2 py-1 text-xs ${editando.predio === u ? "bg-accent-btn text-white" : "border border-surface-border text-institucional-600"}`}>
                  {u}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setEditando(null)} className="flex-1 rounded-md border border-surface-border py-2 text-sm font-bold uppercase text-institucional-600">Cancelar</button>
              <button onClick={salvarEdicao} className="flex-1 rounded-md bg-accent-btn py-2 text-sm font-bold uppercase text-white">Salvar</button>
            </div>

            <div className="mt-4 border-t border-surface-border pt-4">
              <p className="mb-2 text-xs font-semibold text-institucional-500">🔒 Redefinir senha desta pessoa</p>
              {msgSenha && <p className="mb-2 text-xs text-institucional-600">{msgSenha}</p>}
              <div className="flex gap-2">
                <input
                  className={`${campo} flex-1`}
                  type="text"
                  placeholder="Nova senha (mín. 6 caracteres)"
                  value={novaSenhaAdmin}
                  onChange={(e) => setNovaSenhaAdmin(e.target.value)}
                />
                <button
                  onClick={redefinirSenha}
                  disabled={redefinindo}
                  className="rounded-md border border-institucional-700 px-3 text-xs font-semibold text-institucional-700 disabled:opacity-60"
                >
                  {redefinindo ? "..." : "Redefinir"}
                </button>
              </div>
            </div>

            <button onClick={() => excluir(editando)} className="mt-4 w-full rounded-md bg-alerta-critico py-2 text-sm font-bold uppercase text-white">🗑️ Excluir usuário</button>
          </div>
        </div>
      )}
    </>
  );
}

function AbaRelatorios() {
  const { usuarios } = useUsuarios();
  const { chamados } = useChamados();
  const { eventos } = useEventos();
  const [mesRef, setMesRef] = useState(new Date());

  const ranking = useMemo(() => {
    const mes = mesRef.getMonth();
    const ano = mesRef.getFullYear();
    return usuarios
      .filter((u) => u.perfil === "TECNICO")
      .map((t) => {
        const chamadosDoMes = chamados.filter((c) => {
          if (!chamadoFechado(c.status) || c.tecnico !== t.login) return false;
          const d = new Date(c.dataAbertura);
          return d.getMonth() === mes && d.getFullYear() === ano;
        });
        const eventosDoMes = eventos.filter((e) => {
          if (!chamadoFechado(e.status) || e.tecnico !== t.login) return false;
          const d = new Date(e.data);
          return d.getMonth() === mes && d.getFullYear() === ano;
        });
        return { login: t.login, nome: t.nomeCompleto || t.login, chamados: chamadosDoMes.length, eventos: eventosDoMes.length, total: chamadosDoMes.length + eventosDoMes.length };
      })
      .sort((a, b) => b.total - a.total);
  }, [usuarios, chamados, eventos, mesRef]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-center gap-4 rounded-xl border border-surface-border bg-surface p-3">
        <button onClick={() => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() - 1, 1))} className="text-institucional-600">‹</button>
        <span className="text-sm font-semibold text-institucional-800">{MESES[mesRef.getMonth()]} {mesRef.getFullYear()}</span>
        <button onClick={() => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 1))} className="text-institucional-600">›</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm">
        <div className="flex bg-surface-muted px-4 py-3 text-xs font-semibold uppercase text-institucional-400">
          <span className="flex-[3]">Técnico</span>
          <span className="flex-1 text-center">Chamados</span>
          <span className="flex-1 text-center">Eventos</span>
          <span className="flex-1 text-right">Total</span>
        </div>
        {ranking.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-institucional-400">Sem dados.</p>
        ) : (
          ranking.map((r) => (
            <div key={r.login} className="flex items-center border-t border-surface-border px-4 py-3 text-sm">
              <span className="flex-[3] font-medium text-institucional-800">{r.nome}</span>
              <span className="flex-1 text-center text-institucional-600">{r.chamados}</span>
              <span className="flex-1 text-center text-institucional-600">{r.eventos}</span>
              <span className="flex-1 text-right"><span className="rounded-full bg-accent-btn px-2.5 py-0.5 text-xs font-bold text-white">{r.total}</span></span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
