"use client";

import { useMemo } from "react";
import { CalendarClock, ClipboardList, AlertTriangle, Users2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ChamadosPorSetorChart } from "@/components/dashboard/ChamadosPorSetorChart";
import { VolumePorHoraChart } from "@/components/dashboard/VolumePorHoraChart";
import { FilaChamadosTable } from "@/components/dashboard/FilaChamadosTable";
import { useChamados, useEventos, useUsuarios } from "@/lib/hooks";
import { useUsuarioAtual } from "@/lib/auth";
import { DataService } from "@/lib/dataService";
import { chamadoFechado, slaVencido, statusRealUsuario } from "@/lib/types";

/**
 * Dashboard ("Início" no app original). KPIs, gráficos e fila derivam da
 * mesma assinatura em tempo real — tudo atualiza junto quando o Firestore
 * muda. "Meu Status Atual" e "Monitor da Equipe" vieram em 14/08/2026
 * depois de comparar com o techgestor-bd real, que tem os dois.
 */
export default function DashboardPage() {
  const { chamados, carregando } = useChamados();
  const { eventos } = useEventos();
  const { usuarios } = useUsuarios();
  const { usuario } = useUsuarioAtual();

  const kpis = useMemo(() => {
    const abertos = chamados.filter((c) => !chamadoFechado(c.status));
    const emAtraso = abertos.filter((c) => slaVencido(c.dataAbertura));
    const equipeOnline = usuarios.filter((u) => statusRealUsuario(u) === "ONLINE").length;
    const eventosAtivos = eventos.filter((e) => !chamadoFechado(e.status)).length;

    return {
      totalAbertos: abertos.length,
      emAtraso: emAtraso.length,
      equipeOnline,
      totalEquipe: usuarios.length,
      eventosAtivos,
    };
  }, [chamados, usuarios, eventos]);

  const meuStatus = usuario ? statusRealUsuario(usuario) : "OFFLINE";
  const estouOnline = meuStatus !== "OFFLINE";

  async function alternarMeuStatus() {
    if (!usuario) return;
    await DataService.atualizarUsuario(usuario.uid, { status: estouOnline ? "OFFLINE" : "ONLINE" }, usuario.login);
  }

  return (
    <>
      <Topbar titulo="Início" />

      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        {usuario && (
          <div className="flex items-center justify-between rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
            <div>
              <p className="text-xs text-institucional-400">Meu status atual</p>
              <p className="text-lg font-semibold text-institucional-900">{usuario.nomeCompleto || usuario.login}</p>
              <p className="text-xs text-institucional-500">{usuario.predio}</p>
            </div>
            <button
              onClick={alternarMeuStatus}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white ${estouOnline ? "bg-alerta-ok" : "bg-institucional-400"}`}
            >
              <span className="h-2 w-2 rounded-full bg-white" />
              {estouOnline ? "Online" : "Offline"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <KpiCard
            label="Chamados abertos"
            valor={kpis.totalAbertos}
            icon={ClipboardList}
            variante="azul"
            carregando={carregando}
          />
          <KpiCard
            label="Chamados em atraso"
            valor={kpis.emAtraso}
            icon={AlertTriangle}
            variante="vermelho"
            carregando={carregando}
          />
          <KpiCard
            label="Equipe online"
            valor={`${kpis.equipeOnline} / ${kpis.totalEquipe}`}
            icon={Users2}
            variante="verde"
            carregando={carregando}
          />
          <KpiCard
            label="Eventos ativos"
            valor={kpis.eventosAtivos}
            icon={CalendarClock}
            variante="amarelo"
            carregando={carregando}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChamadosPorSetorChart chamados={chamados} />
          <VolumePorHoraChart chamados={chamados} />
        </div>

        <FilaChamadosTable chamados={chamados.slice(0, 20)} />

        <div>
          <p className="mb-3 text-sm font-semibold text-institucional-800">📍 Monitor da equipe</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {usuarios.map((u) => {
              const status = statusRealUsuario(u);
              const online = status !== "OFFLINE";
              return (
                <div key={u.id ?? u.uid} className="rounded-xl border border-surface-border bg-surface p-3 shadow-sm" style={{ borderLeft: `4px solid ${online ? "#1a9c5c" : "#8493ab"}` }}>
                  <p className="text-sm font-semibold text-institucional-800">{u.nomeCompleto || u.login}</p>
                  <p className="text-xs text-institucional-400">📍 {u.predio}</p>
                  <p className={`mt-1 text-xs font-semibold ${online ? "text-alerta-ok" : "text-institucional-400"}`}>
                    ● {status === "ONLINE" ? "Online (Livre)" : status}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
