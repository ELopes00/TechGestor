"use client";

import { useMemo, useRef, useState } from "react";
import { Boxes, PackageCheck, PackageX, X } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { useInventario, usePredios, useSetores, useServidores, useCategoriasEquipamento, useUsuarios, useChamados } from "@/lib/hooks";
import { useUsuarioAtual } from "@/lib/auth";
import { DataService } from "@/lib/dataService";
import { chamadoFechado } from "@/lib/types";
import type { EquipamentoUnificado, ItemInventario } from "@/lib/types";

const LOCAIS_FISICOS = ["Secretária", "Gabinete", "Sala de Audiência", "Sala do(a) Magistrada(o)", "Sala única", "Outros Locais"];

/** Ordem e rótulos batem com a tela real do techgestor-bd (14/08/2026). */
const CATEGORIAS_HARDWARE = ["Monitor", "CPU", "Impressora", "Scanner", "Nobreak", "Equipamento de Vídeoconferência", "Notebook", "Tablet", "Telefone IP"];

/** Colunas do Excel de import/export — mesmo formato nos dois sentidos,
 *  pra dar pra editar o que foi exportado e reimportar (14/08/2026). */
const COLUNAS_EXCEL = ["Responsável", "Matrícula", "Prédio", "Setor", "Local", "Tipo", "Marca/Modelo", "Tombo", "Status"] as const;

function itensParaLinhasExcel(itens: ItemInventario[]) {
  const linhas: Record<string, string>[] = [];
  for (const item of itens) {
    const equipamentos = item.equipamentosUnificados?.length ? item.equipamentosUnificados : [{ tipo: "", marca: "", tombo: "", status: "Disponível" as const, id: "" }];
    for (const eq of equipamentos) {
      linhas.push({
        "Responsável": item.responsavel ?? "",
        "Matrícula": item.matricula ?? "",
        "Prédio": item.predio ?? "",
        "Setor": item.setor ?? "",
        "Local": item.local ?? "",
        "Tipo": eq.tipo ?? "",
        "Marca/Modelo": eq.marca ?? "",
        "Tombo": eq.tombo ?? "",
        "Status": eq.status ?? "Disponível",
      });
    }
  }
  return linhas;
}

export default function InventarioPage() {
  const { itens, carregando } = useInventario();
  const { usuario } = useUsuarioAtual();
  const { usuarios } = useUsuarios();
  const arquivoImportRef = useRef<HTMLInputElement>(null);

  const [busca, setBusca] = useState("");
  const [itemEmprestimo, setItemEmprestimo] = useState<ItemInventario | null>(null);
  const [analisandoId, setAnalisandoId] = useState<string | null>(null);
  const [scanAberto, setScanAberto] = useState(false);
  const [codigoScan, setCodigoScan] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [importando, setImportando] = useState(false);
  const [assistenteAberto, setAssistenteAberto] = useState(false);

  const filtrados = itens.filter((i) => {
    const termo = busca.toLowerCase();
    return i.nome?.toLowerCase().includes(termo) || i.pat?.includes(termo) || i.responsavel?.toLowerCase().includes(termo);
  });

  const analisando = itens.find((i) => i.id === analisandoId) ?? null;

  const kpis = useMemo(() => {
    const totalEquip = itens.reduce((acc, i) => acc + (i.equipamentosUnificados?.length || 0), 0);
    const indisponiveis = itens.reduce(
      (acc, i) => acc + (i.equipamentosUnificados?.filter((e) => e.status === "Indisponível").length || 0),
      0
    );
    const emprestados = itens.filter((i) => i.emprestadoPara).length;
    return { totalEquip, indisponiveis, emprestados };
  }, [itens]);

  async function emprestar(destino: string) {
    if (!itemEmprestimo || !destino) return;
    await DataService.atualizarItemInventario(itemEmprestimo.id, { emprestadoPara: destino, dataEmprestimo: Date.now() });
    if (usuario) await DataService.salvarLog(`EMPRESTOU ${itemEmprestimo.nome} PARA ${destino}`, usuario.login);
    setItemEmprestimo(null);
  }

  async function devolver(item: ItemInventario) {
    await DataService.atualizarItemInventario(item.id, { emprestadoPara: null, dataEmprestimo: null });
    if (usuario) await DataService.salvarLog(`RECEBEU DEVOLUÇÃO: ${item.nome}`, usuario.login);
  }

  function toggleSelecao(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function selecionarTodos() {
    setSelecionados(selecionados.size === filtrados.length ? new Set() : new Set(filtrados.map((i) => i.id)));
  }

  async function excluirItem(item: ItemInventario) {
    if (!confirm(`Remover o registo de ${item.responsavel || item.nome}?`)) return;
    await DataService.deletarItemInventario(item.id);
    if (usuario) await DataService.salvarLog(`REMOVEU ITEM INVENTÁRIO: ${item.responsavel || item.nome}`, usuario.login);
  }

  async function excluirSelecionados() {
    if (selecionados.size === 0) return;
    if (!confirm(`Excluir ${selecionados.size} item(ns) selecionado(s)?`)) return;
    await Promise.all([...selecionados].map((id) => DataService.deletarItemInventario(id)));
    setSelecionados(new Set());
  }

  async function exportarExcel() {
    const XLSX = await import("xlsx");
    const linhas = itensParaLinhasExcel(itens);
    const planilha = XLSX.utils.json_to_sheet(linhas, { header: [...COLUNAS_EXCEL] });
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, "Inventário");
    XLSX.writeFile(livro, `inventario-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function exportarPdf() {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const documento = new jsPDF();
    documento.text("Inventário — TechGestor 2.0", 14, 14);
    autoTable(documento, {
      startY: 20,
      head: [[...COLUNAS_EXCEL]],
      body: itensParaLinhasExcel(itens).map((l) => COLUNAS_EXCEL.map((c) => l[c])),
      styles: { fontSize: 7 },
    });
    documento.save(`inventario-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  async function importarDados(arquivo: File | undefined) {
    if (!arquivo) return;
    setImportando(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await arquivo.arrayBuffer();
      const livro = XLSX.read(buffer);
      const planilha = livro.Sheets[livro.SheetNames[0]];
      const linhas: Record<string, string>[] = XLSX.utils.sheet_to_json(planilha);

      const grupos = new Map<string, { info: Record<string, string>; equipamentos: EquipamentoUnificado[] }>();
      for (const linha of linhas) {
        const chave = `${linha["Responsável"] ?? ""}|${linha["Matrícula"] ?? ""}`;
        if (!grupos.has(chave)) grupos.set(chave, { info: linha, equipamentos: [] });
        if (linha["Tombo"]) {
          grupos.get(chave)!.equipamentos.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            tipo: linha["Tipo"] || "Outro",
            marca: linha["Marca/Modelo"] || "",
            tombo: String(linha["Tombo"]),
            status: linha["Status"] === "Indisponível" ? "Indisponível" : "Disponível",
          });
        }
      }

      let importados = 0;
      for (const { info, equipamentos } of grupos.values()) {
        if (equipamentos.length === 0 || !info["Responsável"]) continue;
        await DataService.salvarItemInventario(
          {
            nome: info["Responsável"],
            pat: equipamentos[0].tombo,
            responsavel: info["Responsável"],
            matricula: info["Matrícula"] || "",
            predio: info["Prédio"] || "",
            setor: info["Setor"] || "",
            local: info["Local"] || "",
            equipamentosUnificados: equipamentos,
            emprestadoPara: null,
          },
          usuario?.login ?? "Importação"
        );
        importados++;
      }
      if (usuario) await DataService.salvarLog(`IMPORTOU PLANILHA: ${importados} item(ns)`, usuario.login);
      alert(`${importados} item(ns) importado(s) com sucesso.`);
    } finally {
      setImportando(false);
      if (arquivoImportRef.current) arquivoImportRef.current.value = "";
    }
  }

  function buscarPorScan() {
    if (!codigoScan.trim()) return;
    setBusca(codigoScan.trim());
    setCodigoScan("");
    setScanAberto(false);
  }

  return (
    <>
      <Topbar titulo="Inventário" />

      <main className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button onClick={exportarPdf} className="rounded-md border border-alerta-ok px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-alerta-ok">
            Exportar PDF
          </button>
          <button onClick={exportarExcel} className="rounded-md bg-alerta-ok px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
            Exportar Excel
          </button>
          <button
            onClick={() => arquivoImportRef.current?.click()}
            disabled={importando}
            className="rounded-md bg-alerta-atencao px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60"
          >
            {importando ? "Importando..." : "Importar Dados"}
          </button>
          <input ref={arquivoImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => importarDados(e.target.files?.[0])} />
        </div>

        <div className="flex items-center gap-2 rounded-md border border-surface-border bg-surface px-3 py-2">
          <span className="text-xs font-semibold text-institucional-500">Busca:</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar registos..."
            className="flex-1 bg-transparent text-sm text-institucional-900 outline-none"
          />
          <button onClick={() => setScanAberto(true)} className="rounded-md border border-surface-border px-3 py-1 text-xs font-bold uppercase tracking-wide text-institucional-600">
            Scan
          </button>
        </div>

        <button
          onClick={() => setAssistenteAberto(true)}
          className="w-full rounded-md bg-accent-btn py-3 text-sm font-bold uppercase tracking-wide text-white"
        >
          Iniciar Novo Levantamento
        </button>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold text-institucional-600">
            <input type="checkbox" checked={selecionados.size === filtrados.length && filtrados.length > 0} onChange={selecionarTodos} className="h-4 w-4 accent-accent-600" />
            Selecionar Todos ({filtrados.length})
          </label>
          {selecionados.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-institucional-500">{selecionados.size} selecionado(s)</span>
              <button onClick={excluirSelecionados} className="rounded-md bg-alerta-critico px-3 py-1.5 text-xs font-semibold text-white">
                Excluir selecionados
              </button>
              <button onClick={() => setSelecionados(new Set())} className="text-xs font-semibold text-institucional-500">
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {filtrados.length === 0 && (
            <p className="rounded-xl border border-dashed border-surface-border bg-surface py-10 text-center text-sm text-institucional-400">
              Nenhum item encontrado.
            </p>
          )}
          {filtrados.map((item) => (
            <div key={item.id} className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selecionados.has(item.id)}
                    onChange={() => toggleSelecao(item.id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-accent-600"
                  />
                  <div>
                    <p className="font-bold uppercase text-institucional-800">
                      {item.responsavel || item.nome || "Não atribuído"}
                      {item.emprestadoPara && (
                        <span className="ml-2 rounded-full bg-alerta-atencaoBg px-2 py-0.5 text-xs font-medium text-alerta-atencao">
                          Emprestado a {item.emprestadoPara}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-institucional-400">Localização: {item.predio} - {item.setor}{item.local ? ` / ${item.local}` : ""}</p>
                    <div className="mt-2 space-y-0.5">
                      {item.equipamentosUnificados?.map((eq, i) => (
                        <p key={i} className={`text-xs ${eq.status === "Indisponível" ? "text-alerta-critico" : "text-institucional-500"}`}>
                          • {eq.tipo}: {eq.marca || "S/D"} (Ref: {eq.tombo}){eq.status === "Indisponível" ? " — falha técnica" : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button onClick={() => setAnalisandoId(item.id)} className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-semibold text-institucional-600">
                    Analisar Registo
                  </button>
                  {item.emprestadoPara ? (
                    <button onClick={() => devolver(item)} className="rounded-md bg-alerta-atencao px-3 py-1.5 text-xs font-bold uppercase text-white">
                      Processar devolução
                    </button>
                  ) : (
                    <button onClick={() => setItemEmprestimo(item)} className="rounded-md bg-alerta-ok px-3 py-1.5 text-xs font-bold uppercase text-white">
                      Autorizar empréstimo
                    </button>
                  )}
                  <button onClick={() => excluirItem(item)} className="text-xs font-semibold text-alerta-critico">
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
          <KpiCard label="Itens cadastrados" valor={itens.length} icon={Boxes} variante="azul" carregando={carregando} />
          <KpiCard label="Equipamentos indisponíveis" valor={kpis.indisponiveis} icon={PackageX} variante="vermelho" carregando={carregando} />
          <KpiCard label="Emprestados" valor={kpis.emprestados} icon={PackageCheck} variante="amarelo" carregando={carregando} />
        </div>
      </main>

      {itemEmprestimo && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl">
            <h3 className="mb-1 text-sm font-semibold text-institucional-800">Empréstimo: {itemEmprestimo.nome}</h3>
            <p className="mb-3 text-xs text-institucional-500">Defina o destinatário:</p>
            <div className="mb-4 max-h-52 space-y-1 overflow-y-auto">
              {usuarios.map((u) => (
                <button
                  key={u.login}
                  onClick={() => emprestar(u.login)}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
                >
                  {u.login}
                </button>
              ))}
            </div>
            <button
              onClick={() => setItemEmprestimo(null)}
              className="w-full rounded-md border border-surface-border py-2 text-sm font-semibold text-institucional-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {scanAberto && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-institucional-800">Escanear código</h3>
              <button onClick={() => setScanAberto(false)} className="text-institucional-400"><X size={18} /></button>
            </div>
            <p className="mb-3 text-xs text-institucional-500">
              Sem acesso à câmera nesta passada — digite ou cole o código de patrimônio.
            </p>
            <input
              autoFocus
              value={codigoScan}
              onChange={(e) => setCodigoScan(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscarPorScan()}
              placeholder="Código de patrimônio…"
              className="w-full rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm text-institucional-900 outline-none focus:border-institucional-500"
            />
            <button onClick={buscarPorScan} className="mt-3 w-full rounded-md bg-accent-btn py-2 text-sm font-semibold text-white">
              Buscar
            </button>
          </div>
        </div>
      )}

      {analisando && <PainelAnalitico item={analisando} autor={usuario?.login ?? "Usuário"} onFechar={() => setAnalisandoId(null)} />}

      {assistenteAberto && <AssistenteLevantamento autor={usuario?.login ?? "Usuário"} onFechar={() => setAssistenteAberto(false)} />}
    </>
  );
}

function PainelAnalitico({ item, autor, onFechar }: { item: ItemInventario; autor: string; onFechar: () => void }) {
  const [equipId, setEquipId] = useState(item.equipamentosUnificados?.[0]?.id);
  const [editandoDados, setEditandoDados] = useState(false);
  const [gerindoAtivo, setGerindoAtivo] = useState(false);
  const { chamados } = useChamados();

  const equip = item.equipamentosUnificados?.find((e) => e.id === equipId) ?? item.equipamentosUnificados?.[0];

  const [predio, setPredio] = useState(item.predio);
  const [setor, setSetor] = useState(item.setor);
  const [local, setLocal] = useState(item.local ?? "");
  const [marcaEdit, setMarcaEdit] = useState(equip?.marca ?? "");
  const [tomboEdit, setTomboEdit] = useState(equip?.tombo ?? "");

  const historicoEquip = equip ? chamados.filter((c) => c.equipamento?.pat === equip.tombo) : [];
  const processosAbertos = historicoEquip.filter((c) => !chamadoFechado(c.status)).length;
  const estadoTecnico = equip?.status === "Indisponível" ? "Crítico" : processosAbertos > 0 ? "Atenção" : "Excelente";
  const corEstado = estadoTecnico === "Crítico" ? "text-alerta-critico" : estadoTecnico === "Atenção" ? "text-alerta-atencao" : "text-alerta-ok";

  async function apontarFalha() {
    if (!equip) return;
    const novoStatus = equip.status === "Indisponível" ? "Disponível" : "Indisponível";
    const equipamentosUnificados = item.equipamentosUnificados.map((e) => (e.id === equip.id ? { ...e, status: novoStatus as EquipamentoUnificado["status"] } : e));
    const registo = { data: Date.now(), texto: `${novoStatus === "Indisponível" ? "🔴 Falha apontada" : "✅ Falha resolvida"} em ${equip.tipo} (Ref: ${equip.tombo}).`, autor };
    await DataService.atualizarItemInventario(item.id, { equipamentosUnificados, auditoria: [registo, ...(item.auditoria ?? [])] });
  }

  async function limparHistorico() {
    if (!confirm("Limpar todo o rastro de auditoria deste item?")) return;
    await DataService.atualizarItemInventario(item.id, { auditoria: [] });
  }

  async function salvarDados() {
    await DataService.atualizarItemInventario(item.id, { predio, setor, local });
    await DataService.salvarLog(`ALTEROU DADOS DO ITEM: ${item.responsavel || item.nome}`, autor);
    setEditandoDados(false);
  }

  async function salvarAtivo() {
    if (!equip) return;
    const equipamentosUnificados = item.equipamentosUnificados.map((e) => (e.id === equip.id ? { ...e, marca: marcaEdit, tombo: tomboEdit } : e));
    await DataService.atualizarItemInventario(item.id, { equipamentosUnificados });
    setGerindoAtivo(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-6 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-semibold text-accent-600">Painel Analítico</h3>
          <div className="flex items-center gap-2">
            {equip && (
              <button onClick={apontarFalha} className={`rounded-full px-3 py-1 text-xs font-bold uppercase text-white ${equip.status === "Indisponível" ? "bg-alerta-ok" : "bg-alerta-critico"}`}>
                {equip.status === "Indisponível" ? "Resolver falha" : "Apontar falha"}
              </button>
            )}
            <button onClick={onFechar} className="text-institucional-400 hover:text-institucional-700"><X size={18} /></button>
          </div>
        </div>
        <p className="mb-4 text-sm font-medium text-institucional-800">
          {item.responsavel || item.nome}{" "}
          <button onClick={() => setEditandoDados((v) => !v)} className="text-xs font-semibold text-alerta-atencao">Alterar dados</button>
        </p>

        {editandoDados && (
          <div className="mb-4 space-y-2 rounded-lg bg-surface-muted p-3">
            <input value={predio} onChange={(e) => setPredio(e.target.value)} placeholder="Prédio" className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-institucional-900 outline-none" />
            <input value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Setor" className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-institucional-900 outline-none" />
            <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Local" className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-institucional-900 outline-none" />
            <button onClick={salvarDados} className="w-full rounded-md bg-accent-btn py-1.5 text-xs font-semibold text-white">Salvar dados</button>
          </div>
        )}

        <p className="mb-2 text-xs font-semibold text-institucional-500">Selecione o ativo correspondente:</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {item.equipamentosUnificados?.map((e) => (
            <button
              key={e.id}
              onClick={() => { setEquipId(e.id); setMarcaEdit(e.marca ?? ""); setTomboEdit(e.tombo ?? ""); setGerindoAtivo(false); }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${equip?.id === e.id ? "bg-accent-btn text-white" : "border border-surface-border text-institucional-600"}`}
            >
              {e.tipo} ({e.tombo})
            </button>
          ))}
        </div>

        {equip && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-surface-muted p-3">
            <div>
              <p className="text-sm font-semibold text-institucional-800">{equip.tipo}</p>
              <p className="text-xs text-institucional-500">Fabricante: {equip.marca || "S/D"}</p>
              <p className="text-xs text-institucional-500">Identificador: {equip.tombo}</p>
              <p className={`mt-1 text-xs font-semibold ${equip.status === "Indisponível" ? "text-alerta-critico" : "text-alerta-ok"}`}>
                Estado Operacional: {equip.status}
              </p>
            </div>
            <button onClick={() => setGerindoAtivo((v) => !v)} className="rounded-md bg-institucional-800 px-3 py-1.5 text-xs font-bold uppercase text-white">
              Gerir ativo
            </button>
          </div>
        )}

        {gerindoAtivo && equip && (
          <div className="mb-4 space-y-2 rounded-lg bg-surface-muted p-3">
            <input value={marcaEdit} onChange={(e) => setMarcaEdit(e.target.value)} placeholder="Fabricante / modelo" className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-institucional-900 outline-none" />
            <input value={tomboEdit} onChange={(e) => setTomboEdit(e.target.value)} placeholder="Código de patrimônio" className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-institucional-900 outline-none" />
            <button onClick={salvarAtivo} className="w-full rounded-md bg-accent-btn py-1.5 text-xs font-semibold text-white">Salvar ativo</button>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between rounded-lg border border-surface-border p-3">
          <div>
            <p className="text-lg font-bold text-institucional-800">{processosAbertos}</p>
            <p className="text-[11px] uppercase text-institucional-400">Processos abertos</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${corEstado}`}>{estadoTecnico}</p>
            <p className="text-[11px] uppercase text-institucional-400">Estado técnico</p>
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold text-institucional-500">Registo de intervenções:</p>
        <div className="mb-4 max-h-32 space-y-2 overflow-y-auto">
          {historicoEquip.length === 0 && (
            <p className="text-center text-xs italic text-institucional-400">Sem registo de manutenção prévio.</p>
          )}
          {historicoEquip.map((c) => (
            <div key={c.id} className="rounded-lg bg-surface-muted px-3 py-2 text-xs">
              <p className="font-medium text-institucional-700">{c.titulo}</p>
              <p className="text-institucional-400">{c.status} — {new Date(c.dataAbertura).toLocaleDateString("pt-BR")}</p>
            </div>
          ))}
        </div>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase text-alerta-ok">Rastro de auditoria</p>
          {(item.auditoria?.length ?? 0) > 0 && (
            <button onClick={limparHistorico} className="rounded-full bg-alerta-critico px-2 py-1 text-[11px] font-bold uppercase text-white">
              Limpar histórico
            </button>
          )}
        </div>
        <div className="mb-4 max-h-48 space-y-2 overflow-y-auto">
          {(!item.auditoria || item.auditoria.length === 0) && (
            <p className="text-xs italic text-institucional-400">Sem registo de auditoria prévio.</p>
          )}
          {item.auditoria?.map((r, i) => (
            <div key={i} className="rounded-lg border-l-2 border-alerta-atencao bg-surface-muted px-3 py-2 text-xs">
              <p className="text-institucional-400">{new Date(r.data).toLocaleString("pt-BR")}</p>
              <p className="text-institucional-700">{r.texto}</p>
              <p className="italic text-institucional-400">Por: {r.autor}</p>
            </div>
          ))}
        </div>

        <button onClick={onFechar} className="w-full rounded-md bg-accent-btn py-2.5 text-sm font-bold uppercase text-white">
          Encerrar análise
        </button>
      </div>
    </div>
  );
}

/** Assistente em 3 passos pra registar um levantamento — estrutura bate com
 *  o "SISTEMA DE LEVANTAMENTO" da tela real (14/08/2026): Dados de
 *  Localização → Especificações Técnicas → Responsável. */
function AssistenteLevantamento({ autor, onFechar }: { autor: string; onFechar: () => void }) {
  const predios = usePredios();
  const setores = useSetores();
  const servidores = useServidores();
  const categorias = useCategoriasEquipamento();
  const { usuarios } = useUsuarios();

  const [passo, setPasso] = useState(1);
  const [predio, setPredio] = useState("");
  const [setor, setSetor] = useState("");
  const [local, setLocal] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [matricula, setMatricula] = useState("");
  const [responsavelPeca, setResponsavelPeca] = useState("");
  const [equipamentos, setEquipamentos] = useState<EquipamentoUnificado[]>([]);
  const [categoriaAtual, setCategoriaAtual] = useState("Monitor");
  const [marcaAtual, setMarcaAtual] = useState("");
  const [tomboAtual, setTomboAtual] = useState("");
  const [scanAberto, setScanAberto] = useState(false);
  const [codigoScan, setCodigoScan] = useState("");
  const [salvando, setSalvando] = useState(false);

  const marcasDaCategoria = categorias.find((c) => c.categoria === categoriaAtual)?.marcasModelos ?? [];

  function vincularComponente() {
    if (!tomboAtual) return;
    setEquipamentos([...equipamentos, { id: Date.now().toString(), tipo: categoriaAtual, marca: marcaAtual, tombo: tomboAtual, status: "Disponível" }]);
    setMarcaAtual(""); setTomboAtual("");
  }

  function confirmarScan() {
    setTomboAtual(codigoScan.trim());
    setCodigoScan("");
    setScanAberto(false);
  }

  async function concluir() {
    if (!predio || !setor || !responsavel || equipamentos.length === 0) return;
    setSalvando(true);
    try {
      await DataService.salvarItemInventario(
        {
          nome: responsavel,
          pat: equipamentos[0].tombo,
          responsavel,
          matricula,
          predio,
          setor,
          local,
          responsavelPeca,
          equipamentosUnificados: equipamentos,
          emprestadoPara: null,
        },
        autor
      );
      await DataService.salvarLog(`CRIOU ITEM INVENTÁRIO: ${responsavel}`, autor);
      onFechar();
    } finally {
      setSalvando(false);
    }
  }

  const campo = "w-full rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm text-institucional-900 outline-none focus:border-institucional-500";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface shadow-xl">
        <div className="rounded-t-xl bg-accent-btn py-3 text-center text-sm font-bold uppercase tracking-wide text-white">
          Sistema de Levantamento
        </div>

        <div className="p-6">
          {passo === 1 && (
            <>
              <h3 className="mb-4 text-center text-base font-bold text-accent-600">Dados de Localização</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-institucional-500">Prédio</label>
                  <Autocomplete value={predio} onChange={setPredio} onSelect={(p) => setPredio(p.nome)} placeholder="Definir edifício…" opcoes={predios} rotulo={(p) => p.nome} className={campo} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-institucional-500">Departamento</label>
                  <Autocomplete value={setor} onChange={setSetor} onSelect={(s) => setSetor(s.nome)} placeholder="Definir secção…" opcoes={setores} rotulo={(s) => s.nome} className={campo} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-institucional-500">Posicionamento Físico</label>
                  <select className={campo} value={local} onChange={(e) => setLocal(e.target.value)}>
                    <option value="">Especificar localização…</option>
                    {LOCAIS_FISICOS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-5 flex justify-between">
                <button onClick={onFechar} className="rounded-md border border-alerta-critico px-4 py-2 text-xs font-bold uppercase text-alerta-critico">Cancelar</button>
                <button onClick={() => setPasso(2)} disabled={!predio || !setor} className="rounded-md bg-accent-btn px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-60">Prosseguir</button>
              </div>
            </>
          )}

          {passo === 2 && (
            <>
              <h3 className="mb-4 text-center text-base font-bold text-accent-600">Especificações Técnicas</h3>
              <p className="mb-2 text-xs font-semibold text-institucional-500">Categoria do Hardware</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {CATEGORIAS_HARDWARE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setCategoriaAtual(c); setMarcaAtual(""); }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${categoriaAtual === c ? "bg-accent-btn text-white" : "border border-surface-border text-institucional-600"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <p className="mb-2 text-xs font-bold uppercase text-institucional-500">Registo: {categoriaAtual}</p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-institucional-500">Fabricante / Modelo</label>
                  <Autocomplete value={marcaAtual} onChange={setMarcaAtual} onSelect={(m) => setMarcaAtual(m)} placeholder="Especificar fabricante…" opcoes={marcasDaCategoria} rotulo={(m) => m} className={campo} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-institucional-500">Código de Patrimônio</label>
                  <div className="flex gap-2">
                    <input className={campo} placeholder="Número de série interno" value={tomboAtual} onChange={(e) => setTomboAtual(e.target.value)} />
                    <button type="button" onClick={() => setScanAberto(true)} className="shrink-0 rounded-md border border-alerta-ok px-3 text-xs font-bold uppercase text-alerta-ok">Leitura digital</button>
                  </div>
                </div>
              </div>

              <button type="button" onClick={vincularComponente} className="mt-3 text-xs font-bold uppercase text-alerta-ok">
                Vincular novo componente
              </button>

              {equipamentos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {equipamentos.map((eq) => (
                    <span key={eq.id} className="rounded-md bg-surface-muted px-2.5 py-1 text-xs text-institucional-700">
                      {eq.tipo} · {eq.tombo}
                      <button onClick={() => setEquipamentos(equipamentos.filter((e) => e.id !== eq.id))} className="ml-1.5 text-institucional-400">×</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 flex justify-between">
                <button onClick={() => setPasso(1)} className="rounded-md border border-surface-border px-4 py-2 text-xs font-bold uppercase text-institucional-600">Retroceder</button>
                <button onClick={() => setPasso(3)} disabled={equipamentos.length === 0} className="rounded-md bg-accent-btn px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-60">Prosseguir</button>
              </div>
            </>
          )}

          {passo === 3 && (
            <>
              <h3 className="mb-4 text-center text-base font-bold text-accent-600">Responsável</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-institucional-500">Responsável pelo bem</label>
                  <Autocomplete
                    value={responsavel}
                    onChange={setResponsavel}
                    onSelect={(s) => { setResponsavel(s.nome); setMatricula(s.matricula); }}
                    placeholder="Nome do responsável…"
                    opcoes={servidores}
                    rotulo={(s) => s.nome}
                    sublabel={(s) => (s.matricula ? `Matrícula: ${s.matricula}` : undefined)}
                    className={campo}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-institucional-500">Técnico inventariante</label>
                  <select className={campo} value={responsavelPeca} onChange={(e) => setResponsavelPeca(e.target.value)}>
                    <option value="">Selecionar técnico…</option>
                    {usuarios.map((u) => <option key={u.login} value={u.login}>{u.login}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-5 flex justify-between">
                <button onClick={() => setPasso(2)} className="rounded-md border border-surface-border px-4 py-2 text-xs font-bold uppercase text-institucional-600">Retroceder</button>
                <button onClick={concluir} disabled={salvando || !responsavel} className="rounded-md bg-alerta-ok px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-60">
                  {salvando ? "Salvando..." : "Concluir levantamento"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {scanAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-institucional-800">Leitura digital</h3>
              <button onClick={() => setScanAberto(false)} className="text-institucional-400"><X size={18} /></button>
            </div>
            <p className="mb-3 text-xs text-institucional-500">
              Sem acesso à câmera nesta passada — digite ou cole o código de patrimônio.
            </p>
            <input
              autoFocus
              value={codigoScan}
              onChange={(e) => setCodigoScan(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmarScan()}
              placeholder="Código de patrimônio…"
              className="w-full rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm text-institucional-900 outline-none focus:border-institucional-500"
            />
            <button onClick={confirmarScan} className="mt-3 w-full rounded-md bg-accent-btn py-2 text-sm font-semibold text-white">
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
