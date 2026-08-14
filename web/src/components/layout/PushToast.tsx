"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { ouvirPushEmPrimeiroPlano } from "@/lib/push";

/** Mostra um toast quando uma notificação chega com a aba aberta em primeiro
 *  plano (mensagens em segundo plano são tratadas pelo service worker). */
export function PushToast() {
  const [toast, setToast] = useState<{ titulo: string; corpo: string } | null>(null);

  useEffect(() => {
    const unsubscribe = ouvirPushEmPrimeiroPlano((titulo, corpo) => setToast({ titulo, corpo }));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed right-5 top-5 z-50 flex w-80 items-start gap-3 rounded-xl border border-surface-border bg-surface p-4 shadow-lg">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-institucional-50 text-institucional-700">
        <Bell size={16} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-institucional-900">{toast.titulo}</p>
        <p className="mt-0.5 text-xs text-institucional-500">{toast.corpo}</p>
      </div>
      <button onClick={() => setToast(null)} className="text-institucional-400 hover:text-institucional-700">
        <X size={16} />
      </button>
    </div>
  );
}
