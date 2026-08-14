"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftRight, CheckSquare, MessageCircle, Square, Trash2, X, Zap } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { TransferirModal } from "@/components/ui/TransferirModal";
import { useChamados, useInventario, useUsuarios } from "@/lib/hooks";
import { useUsuarioAtual } from "@/lib/auth";
import { DataService } from "@/lib/dataService";
import {
  CHECKLIST_PADRAO,
  STATUS_CHAMADO_OPCOES,
  UNIDADES,
  chamadoFechado,
  corPrioridade,
  slaVencido,
  type Anexo,
  type Chamado,
  type Prioridade,
  type StatusChamado,
} from "@/lib/types";

const PRIORIDADES: Prioridade[] = ["NORMAL", "MEDIA", "ALTA"];

/** Mesmos atalhos de resposta rápida do app real (chat do chamado). */
const RESPOSTAS_RAPIDAS = [
  "✅ Serviço finalizado.",
  "📍 Estou a caminho.",
  "⏳ Aguardando peça.",
  "👤 Usuário ausente.",
  "🔧 Testes em andamento.",
];

/** "1d atrás", "3h atrás" etc. — usado no card, igual ao techgestor-bd
 *  real (comparação tela a tela em 14/08/2026). */
function tempoRelativo(ts: number) {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

export default function ChamadosPage() {
  const { chamados, carregando } = useChamados();
  const { usuarios } = useUsuarios();
  const { itens: itensInventario } = useInventario();
  const { usuario } = useUsuarioAtual();

  const [aba, setAba] = useState<"MEUS" | "FILA">("MEUS");
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<Chamado | null>(null);
  const [selecionandoVarios, setSelecionandoVarios] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [transferindo, setTransferindo] = useState<Chamado | null>(null);

  const equipamentosDisponiveis = useMemo(
    () =>
      itensInventario.flatMap((i) =>
        (i.equipamentosUnificados ?? []).map((eq) => ({ nome: `${eq.tipo} — ${eq.marca || "S/D"}`, pat: eq.tombo }))
      ),
    [itensInventario]
  );

  function toggleSelecao(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function excluirChamado(id: string) {
    if (!confirm("Excluir este chamado definitivamente?")) return;
    await DataService.deletarChamado(id);
  }

  async function excluirSelecionados() {
    if (selecionados.size === 0) return;
    if (!confirm(`Excluir ${selecionados.size} chamado(s) selecionado(s)?`)) return;
    await Promise.all([...selecionados].map((id) => DataService.deletarChamado(id)));
    setSelecionados(new Set());
    setSelecionandoVarios(false);
  }

  async function transferirPara(login: string) {
    if (!transferindo || !usuario) return;
    const msg = { user: "SISTEMA", texto: `🔁 Chamado transferido para: ${login}`, time: Date.now() };
    const historico = [msg, ...transferindo.historico];
    await DataService.atualizarChamado(transferindo.id, { tecnico: login, historico });
    await DataService.salvarLog(`TRANSFERIU CHAMADO #${transferindo.id.slice(0, 4)} PARA: ${login}`, usuario.login);
    setTransferindo(null);
  }

  const visiveis = useMemo(() => {
    if (!usuario) return [];
    return chamados.filter((c) => {
      const termo = busca.toLowerCase();
      const bate = c.titulo?.toLowerCase().includes(termo) || c.tecnico?.toLowerCase().includes(termo) || c.solicitante?.toLowerCase().includes(termo);
      if (!bate) return false;
      if (aba === "MEUS") return usuario.perfil === "ADM" ? true : c.tecnico === usuario.login;
      const semTecnico = !c.tecnico;
      const mesmaUnidade = c.predio === usuario.predio || usuario.perfil === "ADM";
      return semTecnico && mesmaUnidade && !chamadoFechado(c.status);
    });
  }, [chamados, usuario, aba, busca]);

  return (
    <>
      <Topbar titulo="Chamados" />
      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="flex items-center justify-end">
          <button
            onClick={() => { setSelecionandoVarios((v) => !v); setSelecionados(new Set()); }}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
              selecionandoVarios ? "border-accent-600 bg-accent-50 text-accent-600" : "border-surface-border text-institucional-600"
            }`}
          >
            {selecionandoVarios ? <CheckSquare size={14} /> : <Square size={14} />}
            Selecionar Vários
          </button>
        </div>

        {selecionandoVarios && selecionados.size > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-alerta-criticoBg px-4 py-2.5">
            <span className="text-sm font-medium text-alerta-critico">{selecionados.size} selecionado(s)</span>
            <button onClick={excluirSelecionados} className="flex items-center gap-1.5 rounded-md bg-alerta-critico px-3 py-1.5 text-xs font-semibold text-white">
              <Trash2 size={14} /> Excluir selecionados
            </button>
          </div>
        )}

        <div className="flex gap-2 rounded-lg border border-surface-border bg-surface p-1">
          {(["MEUS", "FILA"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`flex-1 rounded-md py-2 text-sm font-semibold ${aba === a ? "bg-institucional-100 text-institucional-800" : "text-institucional-400"}`}
            >
              {a === "MEUS" ? "👤 Meus Chamados" : `🏢 Fila (${usuario?.predio ?? "Geral"})`}
            </button>
          ))}
        </div>

        <NovoChamadoForm usuarios={usuarios} equipamentos={equipamentosDisponiveis} autor={usuario?.login ?? ""} />

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="🔍 Buscar por erro, assunto ou técnico…"
          className="w-full rounded-md border border-surface-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-institucional-500"
        />

        <div className="space-y-3">
          {!carregando && visiveis.length === 0 && (
            <p className="rounded-xl border border-dashed border-surface-border bg-surface py-10 text-center text-sm text-institucional-400">
              Nenhum chamado encontrado.
            </p>
          )}
          {visiveis.map((c) => {
            const vencido = !chamadoFechado(c.status) && slaVencido(c.dataAbertura);
            return (
              <div
                key={c.id}
                onClick={() => (selecionandoVarios ? toggleSelecao(c.id) : setSelecionado(c))}
                className="cursor-pointer rounded-xl border border-surface-border bg-surface p-4 shadow-sm"
                style={{ borderLeft: `5px solid ${chamadoFechado(c.status) ? "#8493ab" : vencido ? "#e6a817" : corPrioridade(c.prioridade)}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {selecionandoVarios && (
                      selecionados.has(c.id)
                        ? <CheckSquare size={16} className="text-accent-600" />
                        : <Square size={16} className="text-institucional-400" />
                    )}
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: chamadoFechado(c.status) ? "#8493ab" : vencido ? "#e6a817" : corPrioridade(c.prioridade) }}
                    >
                      {chamadoFechado(c.status) ? "FINALIZADO" : vencido ? "ATRASADO" : c.prioridade}
                    </span>
                    {vencido && <AlertTriangle size={13} className="text-alerta-critico" />}
                    <span className="text-[11px] text-institucional-400">{tempoRelativo(c.dataAbertura)}</span>
                  </div>
                  {!selecionandoVarios && (
                    <button
                      onClick={(e) => { e.stopPropagation(); excluirChamado(c.id); }}
                      title="Excluir"
                      className="rounded p-1 text-institucional-400 hover:text-alerta-critico"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <p className="mt-1.5 font-semibold text-institucional-800">{c.titulo}</p>
                <p className="text-xs text-institucional-400">Solicitante: {c.solicitante} | Sala: {c.sala}</p>
                <p className="mt-1 text-xs font-semibold text-alerta-atencao">Status: {c.status}</p>
                <p className="mt-1 text-xs text-institucional-500">
                  📍 {c.predio} | {c.tecnico || <span className="font-semibold text-amber-600">AGUARDANDO TÉCNICO</span>}
                </p>
                {!selecionandoVarios && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-medium text-alerta-ok">
                      <MessageCircle size={12} /> Toque para detalhes
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setTransferindo(c); }}
                      className="flex items-center gap-1 rounded-md border border-surface-border px-2.5 py-1 text-[11px] font-semibold text-institucional-600"
                    >
                      <ArrowLeftRight size={12} /> Transferir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {selecionado && (
        <DetalheChamado
          chamado={selecionado}
          usuario={usuario}
          onFechar={() => setSelecionado(null)}
          onAtualizar={(c) => setSelecionado(c)}
        />
      )}

      {transferindo && (
        <TransferirModal
          titulo={`Transferir "${transferindo.titulo}" para:`}
          usuarios={usuarios.filter((u) => u.perfil === "TECNICO" || u.perfil === "ADM")}
          onSelecionar={transferirPara}
          onFechar={() => setTransferindo(null)}
        />
      )}
    </>
  );
}

function NovoChamadoForm({
  usuarios, equipamentos, autor,
}: {
  usuarios: { login: string; predio: string; perfil: string }[];
  equipamentos: { nome: string; pat: string }[];
  autor: string;
}) {
  const [titulo, setTitulo] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [sala, setSala] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [predio, setPredio] = useState<string>(UNIDADES[0]);
  const [tecnico, setTecnico] = useState("");
  const [equipamentoPat, setEquipamentoPat] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("NORMAL");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [salvando, setSalvando] = useState(false);

  const tecnicosDaUnidade = usuarios.filter((u) => u.predio === predio && (u.perfil === "TECNICO" || u.perfil === "ADM"));

  function autoEscalar() {
    if (tecnicosDaUnidade.length === 0) return;
    setTecnico(tecnicosDaUnidade[Math.floor(Math.random() * tecnicosDaUnidade.length)].login);
  }

  async function salvar() {
    if (!titulo || !solicitante || !descricao || !sala) return;
    setSalvando(true);
    try {
      const equipamentoSelecionado = equipamentos.find((e) => e.pat === equipamentoPat);
      const id = await DataService.salvarChamado({
        titulo, solicitante, sala, descricao, observacao,
        predio, status: "Aguardando atendimento", tecnico, prioridade,
        equipamento: equipamentoSelecionado ?? null,
        historico: [], checklist: CHECKLIST_PADRAO, abertoPor: autor,
      });
      if (arquivos.length > 0) {
        const anexos = await Promise.all(arquivos.map((a) => DataService.anexarArquivo(id, a, a.type.startsWith("image/") ? "imagem" : "doc")));
        await DataService.atualizarChamado(id, { anexos });
      }
      await DataService.salvarLog(`ABRIU CHAMADO: ${titulo}`, autor);
      setTitulo(""); setSolicitante(""); setSala(""); setDescricao(""); setObservacao(""); setTecnico(""); setEquipamentoPat(""); setPrioridade("NORMAL"); setArquivos([]);
    } finally {
      setSalvando(false);
    }
  }

  const campo = "w-full rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm text-institucional-900 outline-none focus:border-institucional-500";

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-institucional-800">Novo chamado</p>
      <div className="space-y-3">
        <input className={campo} placeholder="Chamado (assunto principal)" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className={campo} placeholder="Solicitante" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} />
          <input className={campo} placeholder="Sala" value={sala} onChange={(e) => setSala(e.target.value)} />
        </div>
        <input className={campo} placeholder="Descrição do problema" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <textarea className={campo} placeholder="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
          <select className={campo} value={predio} onChange={(e) => { setPredio(e.target.value); setTecnico(""); }}>
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select className={campo} value={tecnico} onChange={(e) => setTecnico(e.target.value)}>
            <option value="">Técnico…</option>
            {tecnicosDaUnidade.map((t) => <option key={t.login} value={t.login}>{t.login}</option>)}
          </select>
          <button type="button" onClick={autoEscalar} className="rounded-md bg-institucional-100 px-3 text-institucional-700" title="Escalar automaticamente">
            <Zap size={16} />
          </button>
        </div>

        <select className={campo} value={equipamentoPat} onChange={(e) => setEquipamentoPat(e.target.value)}>
          <option value="">Vincular equipamento…</option>
          {equipamentos.map((e) => <option key={e.pat} value={e.pat}>{e.nome} (Ref: {e.pat})</option>)}
        </select>

        <div className="flex gap-2">
          {PRIORIDADES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrioridade(p)}
              className="flex-1 rounded-md py-1.5 text-xs font-bold text-white"
              style={{ backgroundColor: prioridade === p ? corPrioridade(p) : "#eceff3", color: prioridade === p ? "#fff" : "#8493ab" }}
            >
              {p}
            </button>
          ))}
        </div>

        {arquivos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {arquivos.map((a, i) => (
              <span key={i} className="flex items-center gap-1.5 rounded-md bg-surface-muted px-2.5 py-1 text-xs text-institucional-700">
                {a.name}
                <button type="button" onClick={() => setArquivos(arquivos.filter((_, j) => j !== i))} className="text-institucional-400">×</button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-surface-border py-2 text-xs font-semibold text-institucional-600">
            📎 Arquivo
            <input type="file" multiple className="hidden" onChange={(e) => setArquivos([...arquivos, ...Array.from(e.target.files ?? [])])} />
          </label>
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-alerta-ok py-2 text-xs font-semibold text-white">
            📷 Tirar Foto
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setArquivos([...arquivos, ...Array.from(e.target.files ?? [])])} />
          </label>
        </div>
      </div>

      <button
        onClick={salvar}
        disabled={salvando}
        className="mt-4 w-full rounded-md bg-accent-btn px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60"
      >
        {salvando ? "Abrindo..." : "Abrir Chamado"}
      </button>
    </div>
  );
}

function DetalheChamado({
  chamado, usuario, onFechar, onAtualizar,
}: {
  chamado: Chamado;
  usuario: { login: string } | null;
  onFechar: () => void;
  onAtualizar: (c: Chamado) => void;
}) {
  const [mensagem, setMensagem] = useState("");
  const [solucao, setSolucao] = useState("");
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [novoStatus, setNovoStatus] = useState<StatusChamado>(chamado.status);
  const [notaStatus, setNotaStatus] = useState("");
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const fechado = chamadoFechado(chamado.status);

  async function adicionarAnexo(arquivo: File | undefined) {
    if (!arquivo) return;
    setEnviandoAnexo(true);
    try {
      const anexo = await DataService.anexarArquivo(chamado.id, arquivo, arquivo.type.startsWith("image/") ? "imagem" : "doc");
      const anexos = [...(chamado.anexos ?? []), anexo];
      await DataService.atualizarChamado(chamado.id, { anexos });
      onAtualizar({ ...chamado, anexos });
    } catch (e) {
      console.error("Erro ao anexar arquivo:", e);
      alert("Não foi possível enviar o anexo. O Firebase Storage deste projeto ainda não foi ativado — avise o administrador.");
    } finally {
      setEnviandoAnexo(false);
    }
  }

  async function removerAnexo(anexo: Anexo) {
    if (!confirm(`Remover o anexo "${anexo.nome}"?`)) return;
    await DataService.removerAnexo(anexo);
    const anexos = (chamado.anexos ?? []).filter((a) => a.id !== anexo.id);
    await DataService.atualizarChamado(chamado.id, { anexos });
    onAtualizar({ ...chamado, anexos });
  }

  async function confirmarMudancaStatus() {
    if (novoStatus === "finalizado" || novoStatus === chamado.status) { setAlterandoStatus(false); return; }
    const texto = notaStatus.trim() ? `Status atualizado: ${novoStatus} — ${notaStatus.trim()}` : `Status atualizado: ${novoStatus}`;
    const msg = { user: "SISTEMA", texto, time: Date.now() };
    const historico = [msg, ...chamado.historico];
    await DataService.atualizarChamado(chamado.id, { status: novoStatus, historico });
    onAtualizar({ ...chamado, status: novoStatus, historico });
    setNotaStatus("");
    setAlterandoStatus(false);
  }

  async function enviarTexto(texto: string) {
    if (!texto.trim() || !usuario) return;
    const msg = { user: usuario.login, texto, time: Date.now() };
    const historico = [msg, ...chamado.historico];
    await DataService.atualizarChamado(chamado.id, { historico });
    onAtualizar({ ...chamado, historico });
  }

  async function enviarMensagem() {
    await enviarTexto(mensagem);
    setMensagem("");
  }

  async function toggleCheck(id: number) {
    const checklist = chamado.checklist.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item));
    await DataService.atualizarChamado(chamado.id, { checklist });
    onAtualizar({ ...chamado, checklist });
  }

  async function fecharChamado() {
    if (!solucao.trim() || !usuario) return;
    const msg = { user: "SISTEMA", texto: `CHAMADO FINALIZADO POR ${usuario.login}. SOLUÇÃO: ${solucao}`, time: Date.now() };
    const historico = [msg, ...chamado.historico];
    await DataService.atualizarChamado(chamado.id, { status: "finalizado", tecnico: chamado.tecnico || usuario.login, historico });
    await DataService.salvarLog(`FECHOU CHAMADO #${chamado.id.slice(0, 4)}`, usuario.login);
    onAtualizar({ ...chamado, status: "finalizado", historico });
    onFechar();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-institucional-900">Chamado #{chamado.id.slice(0, 4)}</h3>
          <button onClick={onFechar} className="text-institucional-400 hover:text-institucional-700"><X size={18} /></button>
        </div>

        <div className="mb-4 rounded-lg border border-surface-border p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-alerta-atencao">Status: {chamado.status}</p>
            {!fechado && (
              <button
                onClick={() => { setNovoStatus(chamado.status); setAlterandoStatus((v) => !v); }}
                className="rounded-full bg-accent-btn px-3 py-1 text-[11px] font-bold uppercase text-white"
              >
                Mudar Status
              </button>
            )}
          </div>

          {alterandoStatus && (
            <div className="mb-3 rounded-lg bg-surface-muted p-3">
              <p className="mb-2 text-xs font-semibold text-institucional-600">Alterar status para:</p>
              <div className="mb-2 flex flex-wrap gap-2">
                {STATUS_CHAMADO_OPCOES.map((st) => (
                  <button
                    key={st}
                    onClick={() => setNovoStatus(st)}
                    disabled={st === "finalizado"}
                    title={st === "finalizado" ? "Use \"Fechar chamado definitivamente\" abaixo" : undefined}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${novoStatus === st ? "bg-accent-btn text-white" : "border border-surface-border text-institucional-600"}`}
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
            <div><dt className="text-xs text-institucional-400">Título / Assunto</dt><dd className="text-institucional-800">{chamado.titulo}</dd></div>
            <div><dt className="text-xs text-institucional-400">Solicitante</dt><dd className="text-institucional-800">{chamado.solicitante}</dd></div>
            <div><dt className="text-xs text-institucional-400">Localização (Setor / Sala)</dt><dd className="text-institucional-800">{chamado.predio} / {chamado.sala}</dd></div>
            <div><dt className="text-xs text-institucional-400">Descrição do Problema</dt><dd className="text-institucional-800">{chamado.descricao}</dd></div>
            {chamado.observacao && <div><dt className="text-xs text-institucional-400">Observação Adicional</dt><dd className="text-institucional-800">{chamado.observacao}</dd></div>}
          </dl>
        </div>

        <p className="mb-3 text-xs text-institucional-500">
          <span className="font-semibold text-institucional-600">Equipamento vinculado:</span> {chamado.equipamento?.nome ?? "Não informado"}
        </p>

        <p className="mb-2 text-xs font-semibold text-institucional-500">Documentos anexados</p>
        {chamado.anexos && chamado.anexos.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {chamado.anexos.map((a) => (
              <div key={a.id} className="flex items-center gap-1.5 rounded-md border border-surface-border bg-surface-muted p-1.5">
                {a.type === "imagem" ? (
                  <a href={a.uri} target="_blank" rel="noopener noreferrer" title="Ver em tamanho real">
                    <img src={a.uri} alt={a.nome} className="h-9 w-9 rounded object-cover" />
                  </a>
                ) : (
                  <span className="pl-1 text-sm">📄</span>
                )}
                <a href={a.uri} target="_blank" rel="noopener noreferrer" download={a.nome} className="max-w-[9rem] truncate text-xs text-accent-600" title="Baixar / visualizar">
                  {a.nome}
                </a>
                {!fechado && (
                  <button onClick={() => removerAnexo(a)} title="Remover anexo" className="text-institucional-400 hover:text-alerta-critico">
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-xs italic text-institucional-400">Sem anexos.</p>
        )}
        {!fechado && (
          <div className="mb-4 flex gap-2">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-surface-border py-2 text-xs font-semibold text-institucional-600">
              📎 Arquivo
              <input type="file" className="hidden" disabled={enviandoAnexo} onChange={(e) => adicionarAnexo(e.target.files?.[0])} />
            </label>
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-alerta-ok py-2 text-xs font-semibold text-white">
              📷 Foto
              <input type="file" accept="image/*" capture="environment" className="hidden" disabled={enviandoAnexo} onChange={(e) => adicionarAnexo(e.target.files?.[0])} />
            </label>
          </div>
        )}

        <p className="mb-2 text-xs font-semibold text-institucional-500">Protocolo de atendimento</p>
        <div className="mb-4 space-y-1.5 rounded-lg bg-surface-muted p-3">
          {chamado.checklist?.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={item.checked} disabled={fechado} onChange={() => toggleCheck(item.id)} className="h-4 w-4 accent-accent-600" />
              <span className={item.checked ? "text-institucional-400 line-through" : "text-institucional-700"}>{item.text}</span>
            </label>
          ))}
        </div>

        {!fechado && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold text-institucional-500">Solução / notas (obrigatório para fechar)</p>
            <textarea value={solucao} onChange={(e) => setSolucao(e.target.value)} placeholder="Descreva o que foi feito…" className="w-full rounded-md border border-surface-border px-3 py-2 text-sm outline-none focus:border-institucional-500" />
            <button onClick={fecharChamado} className="mt-2 w-full rounded-md bg-alerta-critico py-2 text-sm font-bold uppercase text-white">
              Fechar chamado definitivamente
            </button>
          </div>
        )}

        <p className="mb-2 text-xs font-semibold text-institucional-500">Histórico / chat</p>

        {!fechado && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {RESPOSTAS_RAPIDAS.map((r) => (
              <button
                key={r}
                onClick={() => enviarTexto(r)}
                className="rounded-full border border-surface-border px-2.5 py-1 text-[11px] font-medium text-institucional-600 hover:bg-surface-muted"
              >
                {r}
              </button>
            ))}
          </div>
        )}

        <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
          {chamado.historico.length === 0 && <p className="text-xs italic text-institucional-400">Nenhuma mensagem ainda.</p>}
          {chamado.historico.map((msg, i) => (
            <div key={i} className="rounded-lg bg-surface-muted px-3 py-2 text-xs">
              <p className="font-semibold text-institucional-700">{msg.user}</p>
              <p className="text-institucional-600">{msg.texto}</p>
            </div>
          ))}
        </div>

        {!fechado && (
          <div className="flex gap-2">
            <input value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Digite uma mensagem…" className="flex-1 rounded-md border border-surface-border px-3 py-2 text-sm outline-none focus:border-institucional-500" />
            <button onClick={enviarMensagem} className="rounded-md bg-accent-btn px-4 py-2 text-sm font-semibold text-white">Enviar</button>
          </div>
        )}
      </div>
    </div>
  );
}
