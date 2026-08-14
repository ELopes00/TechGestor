"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { Chamado } from "@/lib/types";

/** Agrupa a lista de chamados pela hora de abertura (0h–23h). */
function agruparPorHora(chamados: Chamado[]) {
  const contagem = Array.from({ length: 24 }, (_, hora) => ({ hora: `${hora}h`, total: 0 }));
  for (const c of chamados) {
    const hora = new Date(c.dataAbertura).getHours();
    contagem[hora].total += 1;
  }
  return contagem;
}

export function VolumePorHoraChart({ chamados }: { chamados: Chamado[] }) {
  const dados = agruparPorHora(chamados);

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-institucional-800">
        Volume de chamados por hora
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={dados}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(132,147,171,0.3)" />
          <XAxis dataKey="hora" tick={{ fontSize: 11, fill: "#8493ab" }} interval={2} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#8493ab" }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            strokeOpacity={0.75}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
