"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { Chamado } from "@/lib/types";

/** Agrupa a lista de chamados por unidade e conta ocorrências. */
function agruparPorUnidade(chamados: Chamado[]) {
  const contagem = new Map<string, number>();
  for (const c of chamados) {
    contagem.set(c.predio, (contagem.get(c.predio) ?? 0) + 1);
  }
  return Array.from(contagem, ([setor, total]) => ({ setor, total })).sort(
    (a, b) => b.total - a.total
  );
}

export function ChamadosPorSetorChart({ chamados }: { chamados: Chamado[] }) {
  const dados = agruparPorUnidade(chamados);

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-institucional-800">
        Chamados por unidade
      </h3>
      {dados.length === 0 ? (
        <p className="py-10 text-center text-sm text-institucional-400">
          Sem dados no período.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dados} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(132,147,171,0.3)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#8493ab" }} />
            <YAxis type="category" dataKey="setor" width={110} tick={{ fontSize: 12, fill: "#8493ab" }} />
            <Tooltip cursor={{ fill: "rgba(132,147,171,0.12)" }} />
            <Bar dataKey="total" fill="#3b82f6" fillOpacity={0.7} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
