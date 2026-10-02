// Inventário: estações por responsável (coleção "inventario"), mesmo formato do app.
import { requireSession } from '../lib/session.js';
import {
  atualizarItemInventario, deletarItemInventario, salvarChamado, salvarItemInventario, salvarLog, subscribeInventario,
  subscribeProntuario,
} from '../lib/data.js';
import { CHECKLIST_PADRAO, dataHora, esc, gerarProtocolo, SETORES } from '../lib/format.js';
import { BTN, confirmar, emptyState, erroFirestore, field, INPUT, openDialog, options, skeletonRows, toast } from '../lib/ui.js';
import { baixar } from '../lib/auditoria.js';

const user = await requireSession();
const $ = (id) => document.getElementById(id);
const TIPOS = ['Monitor', 'CPU', 'Impressora', 'Scanner', 'Nobreak', 'Equipamento de Vídeoconferência', 'Notebook', 'Tablet', 'Telefone IP'];
const POR_PAGINA = 25;
let itens = null;
let pagina = 0;

$('f-predio').innerHTML = options([['', 'Todos os prédios'], ...SETORES], '');
$('f-tipo').innerHTML = options([['', 'Todos os tipos'], ...TIPOS], '');
$('kpis').innerHTML = skeletonRows(4, 'h-24');
$('tabela').innerHTML = `<tr><td colspan="5" class="p-space-lg">${skeletonRows(5, 'h-12')}</td></tr>`;

const eqs = (i) => i.equipamentosUnificados?.length ? i.equipamentosUnificados : i.pat && i.pat !== 'N/A' ? [{ id: 'legado', tipo: i.cpuMarca ? 'CPU' : 'Equipamento', marca: i.cpuMarca || '', tombo: i.pat, status: 'Disponível' }] : [];
const indisponivel = (e) => String(e.status || '').toLowerCase().startsWith('indispon');
const tile = (t, ic, v, s, alerta) => `<div class="p-space-md rounded-xl ${alerta ? 'bg-error-container text-on-error-container' : 'bg-surface-container-lowest'} shadow-sm flex flex-col gap-1">
  <div class="flex items-center justify-between"><span class="font-label-sm text-label-sm ${alerta ? '' : 'text-on-surface-variant'}">${t}</span><span class="material-symbols-outlined text-[20px] ${alerta ? 'text-error' : 'text-secondary'}">${ic}</span></div>
  <span class="font-display-lg-mobile text-display-lg-mobile ${alerta ? 'text-error' : 'text-primary'}">${v}</span><span class="font-body-sm text-body-sm ${alerta ? '' : 'text-on-surface-variant'}">${s}</span></div>`;

function filtrados() {
  const termo = $('f-busca').value.trim().toLowerCase();
  return itens.filter((i) => {
    const lista = eqs(i);
    return (!$('f-predio').value || i.predio === $('f-predio').value) &&
      (!$('f-tipo').value || lista.some((e) => e.tipo === $('f-tipo').value)) &&
      ($('f-situacao').value !== 'indisponivel' || lista.some(indisponivel)) &&
      ($('f-situacao').value !== 'emprestado' || i.emprestadoPara) &&
      (!termo || [i.responsavel, i.nome, i.matricula, i.setor, i.local, i.predio, i.pat, ...lista.flatMap((e) => [e.tombo, e.marca, e.tipo])].some((v) => String(v || '').toLowerCase().includes(termo)));
  }).sort((a, b) => (b.dataCadastro || 0) - (a.dataCadastro || 0));
}

function render() {
  if (!itens) return;
  const todos = itens.flatMap(eqs);
  const indisp = todos.filter(indisponivel).length;
  $('kpis').innerHTML = [
    tile('Estações', 'desktop_windows', itens.length, `${new Set(itens.map((i) => i.predio)).size} prédio(s)`),
    tile('Equipamentos', 'devices', todos.length, TIPOS.slice(0, 3).map((t) => `${t}: ${todos.filter((e) => e.tipo === t).length}`).join(' • ')),
    tile('Indisponíveis', 'build', indisp, 'Com defeito registrado', indisp > 0),
    tile('Emprestados', 'swap_horiz', itens.filter((i) => i.emprestadoPara).length, 'Aguardando devolução'),
  ].join('');

  const lista = filtrados();
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  pagina = Math.min(pagina, paginas - 1);
  $('contagem').textContent = `${lista.length} estação(ões)`;
  $('pagina-info').textContent = `Página ${pagina + 1} de ${paginas}`;
  $('pag-ant').disabled = pagina === 0;
  $('pag-prox').disabled = pagina >= paginas - 1;
  $('tabela').innerHTML = lista.length
    ? lista.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA).map((i) => {
        const lista = eqs(i);
        const ruins = lista.filter(indisponivel).length;
        return `<tr class="hover:bg-surface-container-low align-top">
          <td class="px-space-lg py-space-sm"><button class="flex flex-col text-left" data-ver="${esc(i.id)}" type="button"><span class="font-label-lg text-label-lg text-primary hover:underline">${esc(i.responsavel || i.nome || '—')}</span><span class="font-body-sm text-body-sm text-on-surface-variant">${i.matricula ? `Mat. ${esc(i.matricula)} • ` : ''}${dataHora(i.dataCadastro).split(' ')[0]}</span></button></td>
          <td class="px-space-md py-space-sm font-body-sm text-body-sm"><div class="text-on-surface">${esc(i.predio || '—')}</div><div class="text-on-surface-variant">${esc([i.setor, i.local].filter(Boolean).join(' • '))}</div></td>
          <td class="px-space-md py-space-sm"><div class="flex flex-wrap gap-1 max-w-md">${lista.map((e) => `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm ${indisponivel(e) ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface-variant'}" title="${esc(e.marca || '')}">${esc(e.tipo)} <strong class="font-semibold">${esc(e.tombo || 's/ tombo')}</strong></span>`).join('') || '<span class="text-outline font-body-sm text-body-sm">—</span>'}</div></td>
          <td class="px-space-md py-space-sm font-label-sm text-label-sm">${i.emprestadoPara ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant"><span class="material-symbols-outlined text-[14px]">swap_horiz</span>Com ${esc(i.emprestadoPara)}</span>` : ruins ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container"><span class="material-symbols-outlined text-[14px]">build</span>${ruins} indisponível(is)</span>` : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant"><span class="material-symbols-outlined text-[14px]">check</span>Em uso</span>'}</td>
          <td class="px-space-lg py-space-sm"><div class="flex justify-end gap-1">
            <button class="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high" data-editar="${esc(i.id)}" title="Editar" type="button"><span class="material-symbols-outlined text-[20px]">edit</span></button>
            <button class="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high" data-emprestimo="${esc(i.id)}" title="${i.emprestadoPara ? 'Registrar devolução' : 'Emprestar'}" type="button"><span class="material-symbols-outlined text-[20px]">${i.emprestadoPara ? 'assignment_return' : 'outbox'}</span></button>
            <button class="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40" data-defeito="${esc(i.id)}" title="Registrar defeito" type="button"><span class="material-symbols-outlined text-[20px]">report</span></button>
            ${user.perfil === 'ADM' ? `<button class="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40" data-excluir="${esc(i.id)}" title="Excluir" type="button"><span class="material-symbols-outlined text-[20px]">delete</span></button>` : ''}
          </div></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="5">${emptyState('inventory', 'Nenhuma estação encontrada.')}</td></tr>`;
}

// ---------- Formulário (novo / editar) ----------
function abrirForm(item) {
  const novo = !item;
  let lista = item ? eqs(item).map((e) => ({ ...e })) : [];
  const { el, close } = openDialog({
    title: novo ? 'Novo levantamento' : 'Editar estação',
    icon: novo ? 'add_box' : 'edit',
    size: 'max-w-3xl',
    body: `<form class="flex flex-col gap-space-lg" novalidate>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
        ${field('Responsável *', `<input class="${INPUT}" name="responsavel" value="${esc(item?.responsavel || item?.nome || '')}" required/>`)}
        ${field('Matrícula', `<input class="${INPUT}" name="matricula" value="${esc(item?.matricula || '')}"/>`)}
        ${field('Prédio *', `<select class="${INPUT}" name="predio">${options(SETORES, item?.predio || SETORES[0])}</select>`)}
        ${field('Setor / unidade *', `<input class="${INPUT}" name="setor" value="${esc(item?.setor || '')}" placeholder="Ex.: 2ª Vara Criminal" required/>`)}
        ${field('Local / sala', `<input class="${INPUT}" name="local" value="${esc(item?.local || '')}"/>`)}
        ${field('Responsável pela peça', `<input class="${INPUT}" name="responsavelPeca" value="${esc(item?.responsavelPeca || '')}"/>`)}
      </div>
      <div class="flex flex-col gap-space-sm">
        <span class="font-label-md text-label-md text-on-surface">Equipamentos vinculados</span>
        <div class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-space-sm items-end p-space-sm rounded-lg bg-surface-container-low">
          ${field('Tipo', `<select class="${INPUT}" data-eq="tipo">${options(TIPOS, 'Monitor')}</select>`)}
          ${field('Marca / modelo', `<input class="${INPUT}" data-eq="marca"/>`)}
          ${field('Tombo *', `<input class="${INPUT}" data-eq="tombo"/>`)}
          <button class="${BTN.ghost}" data-add type="button"><span class="material-symbols-outlined text-[18px]">add</span>Adicionar</button>
        </div>
        <div class="flex flex-col gap-1" data-lista></div>
      </div>
      <p class="hidden text-error font-body-sm text-body-sm" data-erro></p>
      <div class="flex justify-end gap-space-sm"><button class="${BTN.ghost}" data-close type="button">Cancelar</button><button class="${BTN.primary}" type="submit"><span class="material-symbols-outlined text-[18px]">save</span>Salvar</button></div>
    </form>`,
  });
  const form = el.querySelector('form');
  const erro = form.querySelector('[data-erro]');
  const falha = (m) => { erro.textContent = m; erro.classList.remove('hidden'); };
  const desenhar = () => {
    form.querySelector('[data-lista]').innerHTML = lista.length
      ? lista.map((e, idx) => `<div class="flex items-center justify-between gap-space-sm px-space-sm py-1.5 rounded-lg bg-surface-container"><span class="font-body-sm text-body-sm"><strong>${esc(e.tipo)}</strong> • ${esc(e.marca || 'sem marca')} • Tombo ${esc(e.tombo)} ${indisponivel(e) ? '<span class="text-error">(indisponível)</span>' : ''}</span><button class="p-1 rounded text-on-surface-variant hover:text-error" data-rem="${idx}" title="Remover" type="button"><span class="material-symbols-outlined text-[18px]">close</span></button></div>`).join('')
      : '<span class="font-body-sm text-body-sm text-outline">Nenhum equipamento adicionado.</span>';
  };
  desenhar();
  const adicionar = () => {
    const g = (k) => form.querySelector(`[data-eq="${k}"]`);
    const tombo = g('tombo').value.trim();
    if (!tombo) { falha('Informe o tombo do equipamento.'); return false; }
    if (lista.some((e) => e.tombo === tombo)) { falha(`O tombo ${tombo} já está na lista.`); return false; }
    lista.push({ id: `${Date.now()}${Math.random().toString(36).slice(2, 7)}`, tipo: g('tipo').value, marca: g('marca').value.trim(), tombo, status: 'Disponível' });
    g('marca').value = ''; g('tombo').value = '';
    erro.classList.add('hidden');
    desenhar();
    return true;
  };
  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-add]')) adicionar();
    const rem = e.target.closest('[data-rem]');
    if (rem) { lista.splice(Number(rem.dataset.rem), 1); desenhar(); }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.querySelector('[data-eq="tombo"]').value.trim() && !adicionar()) return;
    const f = Object.fromEntries(new FormData(form));
    if (!f.responsavel.trim() || !f.setor.trim()) return falha('Preencha o responsável e o setor.');
    if (!lista.length) return falha('Adicione pelo menos um equipamento.');
    const cpu = lista.find((x) => x.tipo === 'CPU' || x.tipo === 'Notebook');
    const dados = {
      nome: f.responsavel.trim(), responsavel: f.responsavel.trim(), matricula: f.matricula.trim(), setor: f.setor.trim(),
      predio: f.predio, local: f.local.trim(), responsavelPeca: f.responsavelPeca.trim(),
      pat: cpu?.tombo || lista[0].tombo, cpuMarca: cpu?.marca || '', cpuTombo: cpu?.tombo || '',
      equipamentosUnificados: lista.filter((x) => x.id !== 'legado' || x.tombo).map((x) => (x.id === 'legado' ? { ...x, id: String(Date.now()) } : x)),
    };
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      if (novo) {
        await salvarItemInventario({ ...dados, emprestadoPara: null, dataCadastro: Date.now() }, user.login);
        salvarLog(`CRIOU ITEM INVENTÁRIO: ${dados.responsavel}`, user.login);
      } else {
        await atualizarItemInventario(item.id, dados, user.login);
      }
      close();
      toast(novo ? 'Levantamento salvo.' : 'Estação atualizada.');
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      falha(err.code === 'permission-denied' ? 'Sem permissão para salvar.' : 'Falha ao salvar.');
    }
  });
}

// ---------- Detalhe + prontuário ----------
function verItem(item) {
  const { el, close } = openDialog({
    title: item.responsavel || item.nome || 'Estação',
    icon: 'desktop_windows',
    size: 'max-w-3xl',
    body: `<div class="flex flex-col gap-space-lg">
      <dl class="grid grid-cols-2 md:grid-cols-3 gap-space-sm font-body-sm text-body-sm">
        ${[['Matrícula', item.matricula], ['Prédio', item.predio], ['Setor', item.setor], ['Local', item.local], ['Resp. pela peça', item.responsavelPeca], ['Cadastro', dataHora(item.dataCadastro)], ['Empréstimo', item.emprestadoPara ? `${item.emprestadoPara} desde ${dataHora(item.dataEmprestimo)}` : 'Não']]
          .map(([k, v]) => `<div class="p-space-sm rounded-lg bg-surface-container-low"><dt class="font-label-sm text-label-sm text-on-surface-variant uppercase">${k}</dt><dd class="text-on-surface">${esc(v || '—')}</dd></div>`).join('')}
      </dl>
      <div class="flex flex-col gap-space-xs"><h3 class="font-headline-sm text-headline-sm text-primary">Equipamentos</h3>
        ${eqs(item).map((e) => `<div class="flex items-center justify-between gap-space-sm px-space-sm py-2 rounded-lg bg-surface-container-low"><span class="font-body-sm text-body-sm"><strong>${esc(e.tipo)}</strong> • ${esc(e.marca || 'sem marca')} • Tombo ${esc(e.tombo)}</span>
          ${indisponivel(e) ? `<button class="px-2 py-1 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm" data-liberar="${esc(e.id)}" type="button">Marcar disponível</button>` : '<span class="font-label-sm text-label-sm text-on-tertiary-container">Disponível</span>'}</div>`).join('')}
      </div>
      <div class="flex flex-col gap-space-xs"><h3 class="font-headline-sm text-headline-sm text-primary">Prontuário</h3><div class="flex flex-col gap-1" data-prontuario>${skeletonRows(3, 'h-8')}</div></div>
    </div>`,
  });
  const off = subscribeProntuario(item.id, (regs) => {
    if (!el.isConnected) return off?.();
    const alvo = el.querySelector('[data-prontuario]');
    alvo.innerHTML = regs.length
      ? regs.map((r) => `<div class="flex flex-col gap-0.5 px-space-sm py-2 rounded-lg bg-surface-container-low"><div class="flex justify-between gap-space-sm font-label-sm text-label-sm"><span class="text-primary">${esc(r.acao)}</span><span class="text-outline">${dataHora(r.data)} • ${esc(r.usuario)}</span></div><span class="font-body-sm text-body-sm text-on-surface break-words">${esc(r.detalhes)}</span></div>`).join('')
      : emptyState('history', 'Sem registros no prontuário.');
  });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-liberar]');
    if (!b) return;
    const novos = eqs(item).map((x) => (x.id === b.dataset.liberar ? { ...x, status: 'Disponível' } : x));
    try {
      await atualizarItemInventario(item.id, { equipamentosUnificados: novos }, user.login);
      toast('Equipamento marcado como disponível.');
      close();
      off();
    } catch (err) { console.error(err); toast('Falha ao atualizar.', 'erro'); }
  });
}

// ---------- Empréstimo ----------
async function emprestimo(item) {
  if (item.emprestadoPara) {
    if (!(await confirmar({ title: 'Registrar devolução', message: `Confirmar que ${item.emprestadoPara} devolveu os equipamentos de ${item.responsavel || item.nome}?`, okLabel: 'Registrar devolução' }))) return;
    try {
      await atualizarItemInventario(item.id, { emprestadoPara: null, dataEmprestimo: null }, user.login);
      salvarLog(`RECEBEU DEVOLUÇÃO: ${item.nome} DE ${item.emprestadoPara}`, user.login);
      toast('Devolução registrada.');
    } catch (err) { console.error(err); toast('Falha ao registrar.', 'erro'); }
    return;
  }
  const { el, close } = openDialog({
    title: 'Emprestar equipamentos', icon: 'outbox',
    body: `<form class="flex flex-col gap-space-md">${field('Emprestar para *', `<input class="${INPUT}" name="quem" placeholder="Nome de quem vai levar" required/>`)}
      <div class="flex justify-end gap-space-sm"><button class="${BTN.ghost}" data-close type="button">Cancelar</button><button class="${BTN.primary}" type="submit">Registrar empréstimo</button></div></form>`,
  });
  el.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const quem = String(new FormData(e.target).get('quem')).trim();
    if (!quem) return;
    try {
      await atualizarItemInventario(item.id, { emprestadoPara: quem, dataEmprestimo: Date.now() }, user.login);
      salvarLog(`EMPRESTOU ${item.nome} PARA ${quem}`, user.login);
      close();
      toast('Empréstimo registrado.');
    } catch (err) { console.error(err); toast('Falha ao registrar.', 'erro'); }
  });
}

// ---------- Defeito (abre chamado) ----------
function defeito(item) {
  const lista = eqs(item);
  const { el, close } = openDialog({
    title: 'Registrar defeito', icon: 'report',
    body: `<form class="flex flex-col gap-space-md">
      <div class="flex flex-col gap-1"><span class="font-label-md text-label-md">Equipamentos com defeito *</span>${lista.map((e) => `<label class="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low"><input class="w-4 h-4 accent-secondary" name="tombo" type="checkbox" value="${esc(e.tombo)}"/><span class="font-body-sm text-body-sm">${esc(e.tipo)} • ${esc(e.marca || '')} • ${esc(e.tombo)}</span></label>`).join('')}</div>
      ${field('Descrição do defeito *', `<textarea class="${INPUT} h-24 py-2" name="desc" required></textarea>`)}
      <p class="font-body-sm text-body-sm text-on-surface-variant">Os equipamentos ficam como indisponíveis e um chamado é aberto para cada um.</p>
      <div class="flex justify-end gap-space-sm"><button class="${BTN.ghost}" data-close type="button">Cancelar</button><button class="${BTN.danger}" type="submit">Registrar e abrir chamado</button></div></form>`,
  });
  el.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const tombos = f.getAll('tombo');
    const desc = String(f.get('desc')).trim();
    if (!tombos.length || !desc) return toast('Selecione o equipamento e descreva o defeito.', 'erro');
    try {
      const novos = lista.map((x) => (tombos.includes(x.tombo) ? { ...x, status: 'Indisponível' } : x));
      await atualizarItemInventario(item.id, { equipamentosUnificados: novos }, user.login);
      for (const t of tombos) {
        const eq = novos.find((x) => x.tombo === t);
        await salvarChamado({
          protocolo: gerarProtocolo(), titulo: `Defeito: ${eq.tipo}${eq.marca ? ` - ${eq.marca}` : ''}`, descricao: desc,
          solicitante: item.responsavel || item.nome || '', sala: item.local || item.setor || '', predio: item.predio || SETORES[0],
          observacao: `Tombo ${t}`, patrimonio: t, equipamento: eq, status: 'Aguardando atendimento', tecnico: '', prioridade: 'MEDIA',
          historico: [], anexos: [], checklist: CHECKLIST_PADRAO, abertoPor: user.login,
        });
      }
      salvarLog(`Registrou defeito para ${tombos.length} equipamento(s) de ${item.nome}`, user.login);
      close();
      toast('Defeito registrado e chamado aberto.');
    } catch (err) { console.error(err); toast('Falha ao registrar o defeito.', 'erro'); }
  });
}

subscribeInventario((l) => { itens = l; render(); }, (err) => ($('tabela').innerHTML = `<tr><td colspan="5">${erroFirestore(err)}</td></tr>`));
['f-busca', 'f-predio', 'f-tipo', 'f-situacao'].forEach((id) => $(id).addEventListener('input', () => { pagina = 0; render(); }));
$('pag-ant').addEventListener('click', () => { pagina--; render(); });
$('pag-prox').addEventListener('click', () => { pagina++; render(); });
$('btn-novo').addEventListener('click', () => abrirForm());
$('tabela').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-ver],[data-editar],[data-emprestimo],[data-defeito],[data-excluir]');
  if (!b) return;
  const id = b.dataset.ver || b.dataset.editar || b.dataset.emprestimo || b.dataset.defeito || b.dataset.excluir;
  const item = itens.find((i) => i.id === id);
  if (b.dataset.ver) verItem(item);
  else if (b.dataset.editar) abrirForm(item);
  else if (b.dataset.emprestimo) emprestimo(item);
  else if (b.dataset.defeito) defeito(item);
  else if (await confirmar({ title: 'Excluir estação', message: `Excluir a estação de ${item.responsavel || item.nome}? Esta ação fica registrada na auditoria.`, okLabel: 'Excluir', danger: true })) {
    try { await deletarItemInventario(item.id, user.login); toast('Estação excluída.'); } catch (err) { console.error(err); toast('Falha ao excluir.', 'erro'); }
  }
});
$('btn-csv').addEventListener('click', () => {
  if (!itens) return;
  const linhas = [['Responsável', 'Matrícula', 'Prédio', 'Setor', 'Local', 'Tipo', 'Marca', 'Tombo', 'Status', 'Emprestado para', 'Cadastro']];
  filtrados().forEach((i) => eqs(i).forEach((e) => linhas.push([i.responsavel || i.nome, i.matricula, i.predio, i.setor, i.local, e.tipo, e.marca, e.tombo, e.status, i.emprestadoPara || '', dataHora(i.dataCadastro)])));
  const csv = linhas.map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  baixar('﻿' + csv, `inventario-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
});
