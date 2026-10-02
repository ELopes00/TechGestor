// Classificação dos logs (o app grava só texto livre em "mensagem") e utilidades de exportação.
import { dataHora } from './format.js';

export const TIPOS_LOG = {
  ACESSO: { label: 'Acesso', icon: 'login', cls: 'bg-secondary-fixed text-on-secondary-fixed-variant' },
  ALERTA: { label: 'Alerta', icon: 'warning', cls: 'bg-error-container text-on-error-container' },
  CHAMADO: { label: 'Chamado', icon: 'confirmation_number', cls: 'bg-primary-fixed text-on-primary-fixed' },
  INVENTARIO: { label: 'Inventário', icon: 'inventory_2', cls: 'bg-tertiary-fixed text-on-tertiary-fixed-variant' },
  USUARIO: { label: 'Usuários', icon: 'manage_accounts', cls: 'bg-surface-container-high text-on-surface' },
  OUTRO: { label: 'Outros', icon: 'more_horiz', cls: 'bg-surface-container text-on-surface-variant' },
};

export function tipoLog(msg = '') {
  const m = msg.toUpperCase();
  if (m.includes('ALERTA') || m.includes('EXCLUIU')) return 'ALERTA';
  if (m.includes('LOGOU') || m.includes('SAIU DO SISTEMA') || m.includes('SENHA')) return 'ACESSO';
  if (m.includes('CHAMADO')) return 'CHAMADO';
  if (m.includes('INVENT') || m.includes('PEÇA') || m.includes('ITEM') || m.includes('PLANILHA')) return 'INVENTARIO';
  if (m.includes('USUÁRIO') || m.includes('STATUS PARA')) return 'USUARIO';
  return 'OUTRO';
}

export function logsCsv(logs) {
  const linhas = [['Data/hora (Boa Vista)', 'Timestamp', 'Usuário', 'Tipo', 'Descrição', 'ID']];
  logs.forEach((l) => linhas.push([dataHora(l.data), l.data, l.usuario, TIPOS_LOG[tipoLog(l.mensagem)].label, l.mensagem, l.id]));
  return linhas.map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
}

export function baixar(conteudo, nome, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo }));
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- Hash e árvore de Merkle (Web Crypto, SHA-256) ----------
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async (data) =>
  hex(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? new TextEncoder().encode(data) : data));

/** Forma canônica de um log (campos fixos, nessa ordem) para gerar a folha da árvore. */
export const logCanonico = (l) => JSON.stringify({ id: l.id, data: l.data, usuario: l.usuario ?? '', mensagem: l.mensagem ?? '' });

/** Retorna os níveis da árvore (níveis[0] = folhas, último = [raiz]). Ímpar: duplica o último. */
export async function arvoreMerkle(logs) {
  if (!logs.length) return [[await sha256('')]];
  let nivel = await Promise.all(logs.map((l) => sha256(logCanonico(l))));
  const niveis = [nivel];
  while (nivel.length > 1) {
    const prox = [];
    for (let i = 0; i < nivel.length; i += 2) prox.push(await sha256(nivel[i] + (nivel[i + 1] ?? nivel[i])));
    niveis.push(prox);
    nivel = prox;
  }
  return niveis;
}
