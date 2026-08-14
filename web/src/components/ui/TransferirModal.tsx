interface Props {
  titulo: string;
  usuarios: { login: string }[];
  onSelecionar: (login: string) => void;
  onFechar: () => void;
}

/** Picker de destinatário pra "Transferir" — reaproveitado por Chamados e
 *  Eventos (mesmo botão "Transferir" que existe no app real, 14/08/2026). */
export function TransferirModal({ titulo, usuarios, onSelecionar, onFechar }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl">
        <p className="mb-3 text-sm font-semibold text-institucional-800">{titulo}</p>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {usuarios.length === 0 && <p className="py-4 text-center text-sm text-institucional-400">Nenhum técnico disponível.</p>}
          {usuarios.map((u) => (
            <button
              key={u.login}
              onClick={() => onSelecionar(u.login)}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-institucional-800 hover:bg-surface-muted"
            >
              {u.login}
            </button>
          ))}
        </div>
        <button onClick={onFechar} className="mt-3 w-full rounded-md border border-surface-border py-2 text-sm font-semibold text-institucional-600">
          Cancelar
        </button>
      </div>
    </div>
  );
}
