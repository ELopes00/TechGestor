import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechGestor 2.0",
  description: "Gestão de chamados técnicos",
};

/**
 * Layout raiz — só HTML/body/estilos globais. O menu lateral fica no
 * layout do grupo `(painel)`, para que `/login` renderize em tela cheia,
 * sem sidebar.
 */
const SCRIPT_TEMA = `(function(){try{
  var salvo = localStorage.getItem("techgestor-tema");
  var escuro = salvo ? salvo === "escuro" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (escuro) document.documentElement.classList.add("dark");
} catch (e) {}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Aplica o tema salvo antes da hidratação, pra não piscar claro→escuro. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
