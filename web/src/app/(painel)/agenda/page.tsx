"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { useAgendamentos, useUsuarios } from "@/lib/hooks";
import { useUsuarioAtual } from "@/lib/auth";
import { DataService } from "@/lib/dataService";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function hoje() {
  return new Date().toISOString().split("T")[0];
}

function chaveData(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Grade do mês — células vazias (null) antes do dia 1 pra alinhar com o
 *  dia da semana certo. Realinhado em 14/08/2026 pra bater com o
 *  calendário em grade do app real (antes era só uma lista por data). */
function celulasDoMes(mesRef: Date) {
  const ano = mesRef.getFullYear();
  const mes = mesRef.getMonth();
  const offset = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  return [...Array(offset).fill(null), ...Array.from({ length: totalDias }, (_, i) => i + 1)];
}

export default function AgendaPage() {
  const { agendamentos } = useAgendamentos();
  const { usuarios } = useUsuarios();
  const { usuario } = useUsuarioAtual();

  const [mesRef, setMesRef] = useState(() => new Date());
  const [dataSelecionada, setDataSelecionada] = useState(hoje());
  const [servico, setServico] = useState("");
  const [hora, setHora] = useState("08:00");
  const [tecnico, setTecnico] = useState("");
  const [salvando, setSalvando] = useState(false);

  const tecnicos = usuarios.filter((u) => u.perfil === "TECNICO");
  const tarefasDoDia = agendamentos
    .filter((a) => a.data === dataSelecionada)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const diasComTarefa = new Set(agendamentos.map((a) => a.data));
  const hojeStr = hoje();

  async function agendar() {
    if (!servico || !hora || !tecnico || !usuario) return;
    setSalvando(true);
    try {
      await DataService.salvarAgendamento({ data: dataSelecionada, servico, hora, tecnico, status: "PENDENTE", marcadoPor: usuario.login });
      await DataService.salvarLog(`CRIOU AGENDAMENTO PARA: ${tecnico}`, usuario.login);
      setServico(""); setHora("08:00"); setTecnico("");
    } finally {
      setSalvando(false);
    }
  }

  async function concluirOuCancelar(id: string, acao: "CONCLUIR" | "CANCELAR") {
    if (!usuario) return;
    await DataService.deletarAgendamento(id);
    await DataService.salvarLog(`${acao === "CONCLUIR" ? "CONCLUIU" : "CANCELOU"} AGENDAMENTO`, usuario.login);
  }

  const campo = "rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm text-institucional-900 outline-none focus:border-institucional-500";

  return (
    <>
      <Topbar titulo="Agenda" />
      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-center gap-4">
            <button onClick={() => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() - 1, 1))} className="text-institucional-600">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-institucional-800">{MESES[mesRef.getMonth()]} {mesRef.getFullYear()}</span>
            <button onClick={() => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 1))} className="text-institucional-600">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className="py-1 text-xs font-semibold text-institucional-400">{d}</div>
            ))}
            {celulasDoMes(mesRef).map((dia, i) => {
              if (dia === null) return <div key={i} />;
              const chave = chaveData(mesRef.getFullYear(), mesRef.getMonth(), dia);
              const selecionado = chave === dataSelecionada;
              const temTarefa = diasComTarefa.has(chave);
              return (
                <button
                  key={i}
                  onClick={() => setDataSelecionada(chave)}
                  className={`relative rounded-lg py-2 text-sm font-medium ${
                    selecionado
                      ? "bg-accent-btn text-white"
                      : chave === hojeStr
                      ? "border border-accent-600 text-institucional-800"
                      : "text-institucional-700 hover:bg-surface-muted"
                  }`}
                >
                  {dia}
                  {temTarefa && !selecionado && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-alerta-atencao" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-institucional-800">
            Tarefas: {dataSelecionada.split("-").reverse().join("/")}
          </p>
          {tarefasDoDia.length === 0 ? (
            <p className="rounded-xl border border-dashed border-surface-border bg-surface py-8 text-center text-sm italic text-institucional-400">
              Nenhum serviço agendado para esta data.
            </p>
          ) : (
            <div className="space-y-2">
              {tarefasDoDia.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-surface-border bg-surface p-4 shadow-sm" style={{ borderLeft: "4px solid #e6a817" }}>
                  <div>
                    <p className="font-medium text-institucional-800">{t.servico}</p>
                    <p className="text-xs text-institucional-500">⏰ {t.hora} | 👨‍🔧 {t.tecnico}</p>
                  </div>
                  {usuario?.perfil === "ADM" && (
                    <div className="flex gap-2 text-lg">
                      <button onClick={() => concluirOuCancelar(t.id, "CONCLUIR")} title="Concluir">✅</button>
                      <button onClick={() => concluirOuCancelar(t.id, "CANCELAR")} title="Cancelar">🗑️</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {usuario?.perfil === "ADM" && (
          <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-alerta-ok">Agendar Novo Serviço</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input className={`${campo} sm:col-span-2`} placeholder="Ex: Formatar PC" value={servico} onChange={(e) => setServico(e.target.value)} />
              <input className={campo} type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
            <select className={`${campo} mt-3 w-full`} value={tecnico} onChange={(e) => setTecnico(e.target.value)}>
              <option value="">Selecionar Técnico…</option>
              {tecnicos.map((t) => <option key={t.login} value={t.login}>{t.login}</option>)}
            </select>
            <button onClick={agendar} disabled={salvando} className="mt-4 w-full rounded-md bg-accent-btn px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60">
              {salvando ? "Agendando..." : "Agendar Tarefa"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
