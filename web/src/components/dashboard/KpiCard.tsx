import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

type Variante = "azul" | "verde" | "amarelo" | "vermelho";

const VARIANTES: Record<Variante, { bg: string; icon: string }> = {
  azul: { bg: "bg-accent-50", icon: "text-accent-600" },
  verde: { bg: "bg-alerta-okBg", icon: "text-alerta-ok" },
  amarelo: { bg: "bg-alerta-atencaoBg", icon: "text-alerta-atencao" },
  vermelho: { bg: "bg-alerta-criticoBg", icon: "text-alerta-critico" },
};

interface KpiCardProps {
  label: string;
  valor: number | string;
  icon: LucideIcon;
  variante?: Variante;
  carregando?: boolean;
}

/** Card de indicador (KPI) usado no topo do dashboard. */
export function KpiCard({ label, valor, icon: Icon, variante = "azul", carregando }: KpiCardProps) {
  const cores = VARIANTES[variante];

  return (
    <div className="flex items-center gap-4 rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
      <div className={clsx("flex h-11 w-11 items-center justify-center rounded-lg", cores.bg)}>
        <Icon size={22} className={cores.icon} />
      </div>
      <div>
        <p className="text-sm text-institucional-500">{label}</p>
        <p className="text-2xl font-semibold text-institucional-900">
          {carregando ? "—" : valor}
        </p>
      </div>
    </div>
  );
}
