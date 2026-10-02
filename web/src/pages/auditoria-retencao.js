// Situação real da retenção: volume e idade dos logs no Firestore.
import { requireSession } from '../lib/session.js';
import { collection, getCountFromServer, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { dataHora, esc } from '../lib/format.js';
import { skeletonRows } from '../lib/ui.js';

await requireSession();
const el = document.getElementById('situacao');
el.innerHTML = skeletonRows(3, 'h-28');

const tile = (titulo, icone, valor, sub) => `
  <div class="flex flex-col gap-space-xs p-space-md bg-surface-container-lowest rounded-xl shadow-sm">
    <div class="flex items-center justify-between"><span class="font-label-lg text-label-lg text-on-surface">${titulo}</span><span class="material-symbols-outlined text-secondary">${icone}</span></div>
    <span class="font-headline-xl text-headline-xl text-primary">${valor}</span>
    <span class="font-body-sm text-body-sm text-on-surface-variant">${sub}</span>
  </div>`;

try {
  const logs = collection(db, 'logs');
  const [total, primeiro] = await Promise.all([
    getCountFromServer(logs),
    getDocs(query(logs, orderBy('data', 'asc'), limit(1))),
  ]);
  const maisAntigo = primeiro.docs[0]?.data().data;
  const meses = maisAntigo ? Math.floor((Date.now() - maisAntigo) / (30.44 * 86400000)) : 0;
  el.innerHTML =
    tile('Registros armazenados', 'dataset', total.data().count.toLocaleString('pt-BR'), 'Total na coleção de logs') +
    tile('Registro mais antigo', 'history', maisAntigo ? esc(dataHora(maisAntigo).split(' ')[0]) : '—', maisAntigo ? `${meses} mês(es) de histórico` : 'Nenhum registro') +
    tile('Meta de retenção', 'lock_clock', '36 meses', meses >= 36 ? 'Histórico já cobre a meta' : `Faltam ${36 - meses} mês(es) de histórico`);
} catch (e) {
  console.error(e);
  el.innerHTML = tile('Situação', 'cloud_off', '—', 'Não foi possível consultar os logs.');
}
