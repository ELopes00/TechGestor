"use client";

import { useState } from "react";

interface AutocompleteProps<T> {
  value: string;
  onChange: (texto: string) => void;
  onSelect: (item: T) => void;
  placeholder: string;
  opcoes: T[];
  rotulo: (item: T) => string;
  sublabel?: (item: T) => string | undefined;
  className?: string;
}

/** Campo de texto com sugestões filtradas — usado nos formulários de
 *  Inventário para prédio/setor/responsável (busca nos diretórios reais). */
export function Autocomplete<T>({
  value,
  onChange,
  onSelect,
  placeholder,
  opcoes,
  rotulo,
  sublabel,
  className,
}: AutocompleteProps<T>) {
  const [aberto, setAberto] = useState(false);

  const filtradas = value
    ? opcoes.filter((o) => rotulo(o).toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        placeholder={placeholder}
        className={className ?? "w-full rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm text-institucional-900 outline-none focus:border-institucional-500"}
      />
      {aberto && filtradas.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-surface-border bg-surface shadow-lg">
          {filtradas.map((item, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => onSelect(item)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted"
            >
              <span className="text-institucional-800">{rotulo(item)}</span>
              {sublabel?.(item) && <span className="ml-2 text-xs text-institucional-400">{sublabel(item)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
