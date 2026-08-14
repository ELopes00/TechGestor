"use client";

import { Topbar } from "@/components/layout/Topbar";
import { useLogs } from "@/lib/hooks";

/** Auditoria — só visível para perfil ADM (gate real fica pendente, ver README). */
export default function LogsPage() {
  const { logs, carregando } = useLogs();

  return (
    <>
      <Topbar titulo="Logs" />
      <main className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="rounded-xl border border-surface-border bg-surface shadow-sm">
          <div className="border-b border-surface-border px-5 py-4">
            <h3 className="text-sm font-semibold text-institucional-800">Auditoria do sistema</h3>
            <p className="text-xs text-institucional-400">Histórico em tempo real de ações no TechGestor</p>
          </div>
          <div className="divide-y divide-surface-border">
            {!carregando && logs.length === 0 && (
              <p className="px-5 py-10 text-center text-sm italic text-institucional-400">Nenhum log registrado ainda.</p>
            )}
            {logs.map((log, i) => (
              <div key={log.id ?? i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-institucional-800">{log.mensagem}</p>
                  <p className="text-xs text-institucional-400">👤 {log.usuario}</p>
                </div>
                <div className="text-right text-xs text-institucional-500">
                  <p className="font-semibold text-institucional-700">{new Date(log.data).toLocaleDateString("pt-BR")}</p>
                  <p>{new Date(log.data).toLocaleTimeString("pt-BR").slice(0, 5)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
