"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const CHAVE = "techgestor-tema";

function aplicarTema(escuro: boolean) {
  document.documentElement.classList.toggle("dark", escuro);
  localStorage.setItem(CHAVE, escuro ? "escuro" : "claro");
}

/** Alterna claro/escuro — mesmo recurso visto no app real (ícone de
 *  engrenagem na sidebar). Preferência persiste em localStorage; o valor
 *  inicial é aplicado por um script inline no <head> (ver layout.tsx)
 *  pra não piscar tema errado antes da hidratação. */
export function ThemeToggle() {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const proximo = !escuro;
    setEscuro(proximo);
    aplicarTema(proximo);
  }

  return (
    <button
      onClick={alternar}
      aria-label={escuro ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={escuro ? "Tema claro" : "Tema escuro"}
      className="rounded-full p-2 text-institucional-500 hover:bg-surface-muted hover:text-institucional-700"
    >
      {escuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
