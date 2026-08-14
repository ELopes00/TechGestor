"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, CalendarClock, CalendarCheck, CheckCircle2, Trash2, X, Zap } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TransferirModal } from "@/components/ui/TransferirModal";
import { useEventos, useUsuarios } from "@/lib/hooks";
import { useUsuarioAtual } from "@/lib/auth";
import { DataService } from "@/lib/dataService";
import {
  STATUS_CHAMADO_OPCOES,
  chamadoFechado,
  type Evento,
  type StatusChamado,
  type TipoEvento,
} from "@/lib/types";

export default function EventosPage() {
  const { eventos, carregando } = useEventos();
  const { usuarios } = useUsuarios();
  const { usuario } = useUsuarioAtual();

  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | TipoEvento>("TODOS");
  const [selecionado, setSelecionado] = useState<Evento | null>(null);
  const [nota, setNota] = useState("");
  const [transferindo, setTransferindo] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [novoStatus, setNovoStatus] = useState<StatusChamado>("Aguardando atendimento");
  const [notaStatus, setNotaStatus] = useState("");

  const tecnicos = usuarios.filter((u) => u.perfil === "TECNICO" || u.perfil === "ADM");

  const kpis = useMemo(
    () => ({
      agendados: eventos.filter((e) => e.status === "Aguardando atendimento").length,
      andamento: eventos.filter((e) => e.status === "Em andamento").length,
      finalizados: eventos.filter((e) => chamadoFechado(e.status)).length,
    }),
    [eventos]
  );

  const eventosFiltrados = eventos.filter((e) => filtroTipo === "TODOS" || e.tipo === filtroTipo);

  async function confirmarMudancaStatus() {
    if (!selecionado) return;
    const texto = notaStatus.trim() ? `Status atualizado: ${novoStatus} — ${notaStatus.trim()}` : `Status atualizado: ${novoStatus}`;
    const msg = { user: "SISTEMA", texto, time: Date.now() };
    const historico = [msg, ...selecionado.historico];
    await DataService.atualizarEvento(selecionado.id, { status: novoStatus, historico });
    setSelecionado({ ...selecionado, status: novoStatus, historico });
    setNotaStatus("");
    setAlterandoStatus(false);
  }

  async function enviarNota() {
    if (!selecionado || !nota.trim() || !usuario) return;
    const msg = { user: usuario.login, texto: nota, time: Date.now() };
    const historico = [msg, ...selecionado.historico];
    await DataService.atualizarEvento(selecionado.id, { historico });
    setSelecionado({ ...selecionado, historico });
    setNota("");
  }

  async function transferirPara(login: string) {
    if (!selecionado) return;
    const msg = { user: "SISTEMA", texto: `🔁 Evento transferido para: ${login}`, time: Date.now() };
    const historico = [msg, ...selecionado.historico];
    await DataService.atualizarEvento(selecionado.id, { tecnico: login, historico });
    if (usuario) await DataService.salvarLog(`TRANSFERIU EVENTO: ${selecionado.nome} PARA: ${login}`, usuario.login);
    setSelecionado({ ...selecionado, tecnico: login, historico });
    setTransferindo(false);
  }

  async function excluirEvento(id: string) {
    if (!confirm("Excluir este evento definitivamente?")) return;
    await DataService.deletarEvento(id);
  }

  return (
    <>
      <Topbar titulo="Eventos" />

      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        {usuario?.perfil === "ADM" && (
          <NovoEventoForm tecnicos={tecnicos} autor={usuario.login} />
        )}

        <div className="rounded-xl border border-surface-border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
            <h3 className="text-sm font-semibold text-institucional-800">Agenda de Eventos</h3>
            <div className="flex gap-1.5">
              {(["TODOS", "INTERNO", "EXTERNO"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroTipo(f)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase ${
                    filtroTipo === f ? "bg-alerta-ok text-white" : "border border-surface-border text-institucional-500"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 p-4">
            {!carregando && eventosFiltrados.length === 0 && (
              <p className="rounded-xl border border-dashed border-surface-border bg-surface-muted py-10 text-center text-sm text-institucional-400">
                Nenhum evento encontrado.
              </p>
            )}
            {eventosFiltrados.map((ev) => (
              <div
                key={ev.id}
                onClick={() => setSelecionado(ev)}
                className="cursor-pointer rounded-xl border border-surface-border bg-surface p-4 shadow-sm"
                style={{ borderLeft: `4px solid ${ev.tipo === "INTERNO" ? "#e6a817" : "#2a78d6"}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: ev.tipo === "INTERNO" ? "#e6a817" : "#2a78d6" }}
                    >
                      {ev.tipo === "INTERNO" ? "🏢 INTERNO" : "🛣️ EXTERNO"}
                    </span>
                    <span className="text-[11px] text-institucional-400">{ev.status}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); excluirEvento(ev.id); }}
                    title="Excluir"
                    className="rounded p-1 text-institucional-400 hover:text-alerta-critico"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <p className="mt-1.5 font-semibold text-institucional-800">{ev.nome}</p>
                <p className="text-xs text-institucional-400">📍 {ev.tipo === "INTERNO" ? ev.local : ev.endereco}</p>
                <p className="mt-1 text-xs font-semibold text-alerta-ok">👤 Escala: {ev.tecnico}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Aguardando atendimento" valor={kpis.agendados} icon={CalendarClock} variante="azul" carregando={carregando} />
          <KpiCard label="Em andamento" valor={kpis.andamento} icon={CalendarCheck} variante="amarelo" carregando={carregando} />
          <KpiCard label="Finalizados" valor={kpis.finalizados} icon={CheckCircle2} variante="verde" carregando={carregando} />
        </div>
      </main>

      {selecionado && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-institucional-900">Evento: {selecionado.nome}</h3>
              <button onClick={() => setSelecionado(null)} className="text-institucional-400 hover:text-institucional-700">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 rounded-lg border border-surface-border p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-alerta-atencao">Status: {selecionado.status}</p>
                <button
                  onClick={() => { setNovoStatus(selecionado.status); setAlterandoStatus((v) => !v); }}
                  className="rounded-full bg-accent-btn px-3 py-1 text-[11px] font-bold uppercase text-white"
                >
                  Mudar Status
                </button>
              </div>

              {alterandoStatus && (
                <div className="mb-3 rounded-lg bg-surface-muted p-3">
                  <p className="mb-2 text-xs font-semibold text-institucional-600">Alterar status para:</p>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {STATUS_CHAMADO_OPCOES.map((st) => (
                      <button
                        key={st}
                        onClick={() => setNovoStatus(st)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${novoStatus === st ? "bg-accent-btn text-white" : "border border-surface-border text-institucional-600"}`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={notaStatus}
                    onChange={(e) => setNotaStatus(e.target.value)}
                    placeholder="Nota opcional sobre a mudança…"
                    className="mb-2 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-institucional-900 outline-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setAlterandoStatus(false)} className="flex-1 rounded-md border border-surface-border py-1.5 text-xs font-bold uppercase text-institucional-600">Cancelar</button>
                    <button onClick={confirmarMudancaStatus} className="flex-1 rounded-md bg-accent-btn py-1.5 text-xs font-bold uppercase text-white">Confirmar</button>
                  </div>
                </div>
              )}

              <dl className="space-y-2 text-sm">
                <div><dt className="text-xs text-institucional-400">Solicitante</dt><dd className="text-institucional-800">{selecionado.solicitante || "Não informado"}</dd></div>
                <div><dt className="text-xs text-institucional-400">Contato</dt><dd className="text-institucional-800">{selecionado.contato || "Não informado"}</dd></div>
                <div><dt className="text-xs text-institucional-400">Local do Evento</dt><dd className="text-institucional-800">{selecionado.tipo === "INTERNO" ? selecionado.local : selecionado.endereco}</dd></div>
                <div><dt className="text-xs text-institucional-400">Material Solicitado</dt><dd className="text-institucional-800">{selecionado.material || "Nenhum"}</dd></div>
                <div><dt className="text-xs text-institucional-400">Datas</dt><dd className="text-institucional-800">Instalação: {selecionado.dataInstalacao || "---"} | Evento: {selecionado.dataEvento || "---"}</dd></div>
              </dl>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-alerta-ok">Técnico: {selecionado.tecnico}</p>
              <button onClick={() => setTransferindo(true)} className="flex items-center gap-1 rounded-md border border-surface-border px-2.5 py-1 text-[11px] font-semibold text-institucional-600">
                <ArrowLeftRight size={12} /> Transferir
              </button>
            </div>

            {transferindo && (
              <TransferirModal
                titulo="Transferir para:"
                usuarios={tecnicos}
                onSelecionar={transferirPara}
                onFechar={() => setTransferindo(false)}
              />
            )}

            <p className="mb-2 text-xs font-semibold text-alerta-ok">Histórico do Evento</p>
            <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
              {selecionado.historico.length === 0 && (
                <p className="text-xs italic text-institucional-400">Nenhuma nota ainda.</p>
              )}
              {selecionado.historico.map((msg, i) => (
                <div key={i} className="rounded-lg bg-surface-muted px-3 py-2 text-xs">
                  <p className="font-semibold text-institucional-700">{msg.user}</p>
                  <p className="text-institucional-600">{msg.texto}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Inserir anotação..."
                className="flex-1 rounded-md border border-surface-border px-3 py-2 text-sm outline-none focus:border-institucional-500"
              />
              <button onClick={enviarNota} className="rounded-md bg-accent-btn px-4 py-2 text-sm font-semibold text-white">
                Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NovoEventoForm({ tecnicos, autor }: { tecnicos: { login: string }[]; autor: string }) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoEvento>("INTERNO");
  const [tecnico, setTecnico] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [contato, setContato] = useState("");
  const [local, setLocal] = useState("");
  const [cliente, setCliente] = useState("");
  const [endereco, setEndereco] = useState("");
  const [material, setMaterial] = useState("");
  const [dataInstalacao, setDataInstalacao] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [salvando, setSalvando] = useState(false);

  function autoEscalar() {
    if (tecnicos.length === 0) return;
    setTecnico(tecnicos[Math.floor(Math.random() * tecnicos.length)].login);
  }

  async function salvar() {
    if (!nome || !tecnico) return;
    setSalvando(true);
    try {
      await DataService.salvarEvento({
        nome,
        tipo,
        tecnico,
        status: "Aguardando atendimento",
        local: tipo === "INTERNO" ? local : null,
        endereco: tipo === "EXTERNO" ? endereco : null,
        cliente: tipo === "EXTERNO" ? cliente : null,
        solicitante,
        contato,
        material,
        dataInstalacao,
        dataEvento,
        historico: [],
      });
      await DataService.salvarLog(`CRIOU EVENTO ${tipo}: ${nome}`, autor);
      setNome(""); setTecnico(""); setSolicitante(""); setContato(""); setLocal(""); setCliente(""); setEndereco(""); setMaterial(""); setDataInstalacao(""); setDataEvento("");
    } finally {
      setSalvando(false);
    }
  }

  const campo = "rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm text-institucional-900 outline-none focus:border-institucional-500";

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
      <div className="mb-3 grid grid-cols-2 gap-2">
        {(["INTERNO", "EXTERNO"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`rounded-md py-2.5 text-xs font-bold uppercase ${
              tipo === t
                ? t === "INTERNO" ? "bg-alerta-atencao text-white" : "bg-accent-btn text-white"
                : "border border-surface-border text-institucional-600"
            }`}
          >
            {t === "INTERNO" ? "🏢 Interno" : "🛣️ Externo"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <input className={`${campo} w-full`} placeholder="Nome do Evento" value={nome} onChange={(e) => setNome(e.target.value)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={campo} placeholder="Solicitante" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} />
          <input className={campo} placeholder="Contato (Ramal/Tel)" value={contato} onChange={(e) => setContato(e.target.value)} />
        </div>
        {tipo === "INTERNO" ? (
          <input className={`${campo} w-full`} placeholder="Local do evento (Sala / Setor)" value={local} onChange={(e) => setLocal(e.target.value)} />
        ) : (
          <>
            <input className={`${campo} w-full`} placeholder="Cliente / Empresa" value={cliente} onChange={(e) => setCliente(e.target.value)} />
            <input className={`${campo} w-full`} placeholder="Endereço do evento" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </>
        )}
        <input className={`${campo} w-full`} placeholder="Material solicitado" value={material} onChange={(e) => setMaterial(e.target.value)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-institucional-500">Data de Instalação</label>
            <input type="date" className={`${campo} w-full`} value={dataInstalacao} onChange={(e) => setDataInstalacao(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-institucional-500">Data do Evento</label>
            <input type="date" className={`${campo} w-full`} value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <select className={`${campo} flex-1`} value={tecnico} onChange={(e) => setTecnico(e.target.value)}>
            <option value="">Selecionar Técnico Escalado…</option>
            {tecnicos.map((t) => (
              <option key={t.login} value={t.login}>{t.login}</option>
            ))}
          </select>
          <button type="button" onClick={autoEscalar} className="rounded-md bg-institucional-100 px-3 text-institucional-700" title="Escalar automaticamente">
            <Zap size={16} />
          </button>
        </div>
      </div>

      <button
        onClick={salvar}
        disabled={salvando}
        className="mt-4 w-full rounded-md bg-accent-btn px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60"
      >
        {salvando ? "Criando..." : "Criar Evento"}
      </button>
    </div>
  );
}
