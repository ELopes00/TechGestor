// Caixa de conversa oficial de um chamado (chamado.html?id=...).
import { requireSession } from '../lib/session.js';
import { subscribeChamado, subscribeUsuarios } from '../lib/data.js';
import { formatProtocolo } from '../lib/format.js';
import { emptyState, skeletonRows } from '../lib/ui.js';
import { chamadoDetalhe } from '../components/chamado-detalhe.js';

const user = await requireSession();
const el = document.getElementById('chamado-detalhe');
const id = new URLSearchParams(location.search).get('id');
let usuarios = [];

if (!id) {
  el.innerHTML = `<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">${emptyState('search_off', 'Nenhum chamado informado. Abra um chamado a partir da fila.')}</div>`;
} else {
  el.innerHTML = `<div class="grid grid-cols-1 xl:grid-cols-12 gap-space-md"><div class="xl:col-span-5 flex flex-col gap-space-md">${skeletonRows(3, 'h-40')}</div><div class="xl:col-span-7 skeleton rounded-xl h-[520px]"></div></div>`;
  const detalhe = chamadoDetalhe(el, { user, getUsers: () => usuarios, full: true });
  subscribeUsuarios((lista) => (usuarios = lista));
  subscribeChamado(id, (c) => {
    if (!c) {
      el.innerHTML = `<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">${emptyState('search_off', 'Chamado não encontrado. Ele pode ter sido excluído.')}</div>`;
      return;
    }
    document.getElementById('crumb-protocolo').textContent = `${formatProtocolo(c)} • ${c.titulo || ''}`;
    document.title = `${formatProtocolo(c)} • TechGestor TJRR`;
    detalhe.render(c);
  });
}
