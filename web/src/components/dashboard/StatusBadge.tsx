import clsx from "clsx";
import type { StatusChamado } from "@/lib/types";

const CONFIG: Record<StatusChamado, { label: string; className: string }> = {
  "Aguardando atendimento": { label: "Aguardando atendimento", className: "bg-institucional-100 text-institucional-700" },
  "Em andamento": { label: "Em andamento", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  "Em separação de equipamentos": { label: "Em separação", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  Instalado: { label: "Instalado", className: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" },
  finalizado: { label: "Finalizado", className: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" },
};

export function StatusBadge({ status }: { status: StatusChamado }) {
  const config = CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-500 dark:bg-gray-500/15 dark:text-gray-300" };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
