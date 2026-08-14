"use client";

import { AlertTriangle } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { chamadoFechado, slaVencido, type Chamado } from "@/lib/types";

/**
 * Fila de chamados recentes, em tempo real. Qualquer mudança de status no
 * Firestore (ex: técnico atualizando pelo app) reflete aqui na hora.
 */
export function FilaChamadosTable({ chamados }: { chamados: Chamado[] }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
        <h3 className="text-sm font-semibold text-institucional-800">
          Fila de chamados recentes
        </h3>
        <span className="flex items-center gap-1.5 text-xs text-institucional-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-alerta-ok" />
          Tempo real
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border text-xs uppercase text-institucional-400">
              <th className="px-5 py-3 font-medium">Chamado</th>
              <th className="px-5 py-3 font-medium">Unidade / Sala</th>
              <th className="px-5 py-3 font-medium">Técnico</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Aberto em</th>
            </tr>
          </thead>
          <tbody>
            {chamados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-institucional-400">
                  Nenhum chamado registrado ainda.
                </td>
              </tr>
            )}
            {chamados.map((chamado) => {
              const atrasado = !chamadoFechado(chamado.status) && slaVencido(chamado.dataAbertura);
              return (
                <tr
                  key={chamado.id}
                  className="border-b border-surface-border last:border-0 hover:bg-surface-muted"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-institucional-800">{chamado.titulo}</p>
                    <p className="text-xs text-institucional-400">{chamado.solicitante}</p>
                  </td>
                  <td className="px-5 py-3 text-institucional-600">
                    {chamado.predio} / {chamado.sala}
                  </td>
                  <td className="px-5 py-3 text-institucional-600">
                    {chamado.tecnico || <span className="text-institucional-400">Fila</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={chamado.status} />
                      {atrasado && (
                        <span title="Mais de 2h sem atualização (SLA)">
                          <AlertTriangle size={14} className="text-alerta-critico" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-institucional-500">
                    {new Date(chamado.dataAbertura).toLocaleString("pt-BR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
