// Detalhe de um chamado (dados, checklist, conversa, notas internas e ações).
// Usado na coluna direita de chamados.html e na página inteira chamado.html.
import { atualizarChamado, salvarLog } from '../lib/data.js';
import {
  dataHora, esc, FRASES_RAPIDAS, formatProtocolo, hora, isFechado, isSlaVencido, fracaoSla, prioridadeUI,
  SETORES, slaTexto, STATUS_CHAMADO, statusUI, tempoRelativo,
} from '../lib/format.js';
import { avatar, BTN, confirmar, emptyState, field, INPUT, openDialog, options, toast } from '../lib/ui.js';

const card = 'bg-surface-container-lowest rounded-xl shadow-sm';
const infoBox = (icon, label, value, sub = '') => `
  <div class="p-space-sm bg-surface-container-low rounded-lg flex flex-col gap-0.5 min-w-0">
    <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">${label}</span>
    <span class="flex items-center gap-1 font-label-lg text-label-lg text-on-surface min-w-0"><span class="material-symbols-outlined text-[18px] text-secondary shrink-0">${icon}</span><span class="truncate">${value}</span></span>
    ${sub ? `<span class="font-body-sm text-body-sm text-on-surface-variant truncate">${sub}</span>` : ''}
  </div>`;

function equipamentoTexto(e) {
  if (!e) return '';
  if (typeof e === 'string') return e;
  return [e.tipo, e.marca, e.tombo && `Tombo ${e.tombo}`, e.pat && `Pat. ${e.pat}`, e.nome].filter(Boolean).join(' • ');
}

function anexoHtml(a) {
  const nome = esc(a.nome || 'anexo');
  const url = typeof a.uri === 'string' && /^(https?:|data:image)/.test(a.uri) ? a.uri : null;
  const icone = a.type === 'image' || /\.(jpe?g|png|webp)$/i.test(a.nome || '') ? 'image' : 'description';
  const inner = `<span class="material-symbols-outlined text-[16px]">${icone}</span><span class="truncate max-w-[14rem]">${nome}</span>`;
  const cls = 'flex items-center gap-1 px-space-sm py-1 rounded-lg bg-surface-container text-on-surface-variant font-label-sm text-label-sm';
  return url
    ? `<a class="${cls} hover:text-primary" href="${esc(url)}" rel="noopener" target="_blank">${inner}</a>`
    : `<span class="${cls}" title="Arquivo salvo apenas no aparelho de origem">${inner}</span>`;
}

function mensagemHtml(m, eu) {
  if (m.user === 'SISTEMA') {
    return `<div class="flex items-center justify-center my-space-xs">
      <div class="px-space-md py-1 rounded-2xl bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-start gap-1 max-w-[90%] whitespace-pre-line">
        <span class="material-symbols-outlined text-[16px] text-secondary">smart_toy</span><span>${esc(m.texto)}</span>
        <span class="text-outline text-[11px] ml-1 shrink-0">${hora(m.time)}</span>
      </div></div>`;
  }
  const minha = m.user === eu;
  return `<div class="flex items-start gap-space-sm max-w-[85%] ${minha ? 'self-end flex-row-reverse' : ''}">
    ${avatar(m.user)}
    <div class="flex flex-col gap-1 ${minha ? 'items-end' : ''}">
      <div class="flex items-center gap-space-xs">
        <span class="font-label-sm text-label-sm font-bold ${minha ? 'text-primary' : 'text-on-surface'}">${esc(m.user)}</span>
        <span class="font-body-sm text-[11px] text-outline" title="${dataHora(m.time)}">${hora(m.time)}</span>
      </div>
      <div class="${minha ? 'bg-primary-container text-on-primary rounded-tr-none' : 'bg-surface-container-lowest text-on-surface rounded-tl-none'} p-space-sm rounded-lg shadow-sm font-body-md text-body-md whitespace-pre-line break-words">${esc(m.texto)}</div>
    </div></div>`;
}

/**
 * Monta o detalhe em `el`. Chame `render(chamado)` sempre que o documento mudar.
 * ctx: { user, getUsers: () => usuarios[], full: boolean }
 */
export function chamadoDetalhe(el, ctx) {
  let atual = null;
  let aba = 'conversa';
  const { user } = ctx;
  const log = (msg) => salvarLog(msg, user.login);
  const curto = (c) => formatProtocolo(c);

  async function salvar(dados, okMsg) {
    try {
      await atualizarChamado(atual.id, dados);
      if (okMsg) toast(okMsg);
      return true;
    } catch (e) {
      console.error(e);
      toast(e.code === 'permission-denied' ? 'Sem permissão para alterar este chamado.' : 'Falha ao salvar. Tente novamente.', 'erro');
      return false;
    }
  }
  const comHistorico = (c, texto) => [{ user: 'SISTEMA', texto, time: Date.now() }, ...(c.historico || [])];

  // ----- Ações -----
  async function assumir() {
    const c = atual;
    if (c.tecnico && c.tecnico !== user.login &&
      !(await confirmar({ title: 'Assumir chamado', message: `Este chamado está com ${c.tecnico}. Deseja assumi-lo?`, okLabel: 'Assumir' }))) return;
    if (await salvar({ tecnico: user.login, status: 'Em andamento', historico: comHistorico(c, `✅ ${user.login} assumiu o chamado da fila.`) }, 'Chamado assumido.'))
      log(`🙋‍♂️ ASSUMIU CHAMADO ${curto(c)}`);
  }

  function transferir() {
    const c = atual;
    const tecnicos = ctx.getUsers().filter((u) => u.perfil === 'TECNICO').sort((a, b) => a.login.localeCompare(b.login));
    const { el: dlg, close } = openDialog({
      title: 'Transferir chamado',
      icon: 'swap_horiz',
      body: `<form class="flex flex-col gap-space-md">
        ${field('Técnico de destino', `<select class="${INPUT}" name="tecnico"><option value="">— Devolver para a fila do prédio —</option>${tecnicos
          .map((t) => `<option value="${esc(t.login)}">${esc(t.nomeCompleto || t.login)} (${esc(t.login)}) • ${esc(t.predio || '')} • ${esc(t.status || 'OFFLINE')}</option>`)
          .join('')}</select>`)}
        ${field('Prédio / fila', `<select class="${INPUT}" name="predio">${options(SETORES, c.predio)}</select>`)}
        <div class="flex justify-end gap-space-sm"><button class="${BTN.ghost}" data-close type="button">Cancelar</button><button class="${BTN.primary}" type="submit"><span class="material-symbols-outlined text-[18px]">swap_horiz</span>Transferir</button></div>
      </form>`,
    });
    dlg.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const tecnico = f.get('tecnico');
      const predio = f.get('predio');
      const destino = tecnico || `Fila (${predio})`;
      close();
      if (await salvar({ tecnico, predio, status: tecnico ? 'Em andamento' : 'Aguardando atendimento', historico: comHistorico(c, `🔄 Transferido para ${destino}`) }, `Transferido para ${destino}.`))
        log(`🔄 TRANSFERIU CHAMADO ${curto(c)} PARA ${destino}`);
    });
  }

  function mudarStatus() {
    const c = atual;
    const { el: dlg, close } = openDialog({
      title: 'Alterar status',
      icon: 'published_with_changes',
      body: `<form class="flex flex-col gap-space-md">
        ${field('Novo status', `<select class="${INPUT}" name="status">${options(STATUS_CHAMADO.filter((s) => s !== 'finalizado'), c.status)}</select>`)}
        ${field('Nota (opcional)', `<textarea class="${INPUT} h-24 py-2" name="nota" placeholder="Ex.: aguardando entrega do cabo HDMI"></textarea>`)}
        <p class="font-body-sm text-body-sm text-on-surface-variant">Para concluir o chamado use “Finalizar”, que pede a descrição da solução.</p>
        <div class="flex justify-end gap-space-sm"><button class="${BTN.ghost}" data-close type="button">Cancelar</button><button class="${BTN.primary}" type="submit">Salvar status</button></div>
      </form>`,
    });
    dlg.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const status = f.get('status');
      const nota = String(f.get('nota') || '').trim();
      close();
      if (await salvar({ status, historico: comHistorico(c, `🔄 Status atualizado: ${status}${nota ? `\n📝 Nota: ${nota}` : ''}`) }, 'Status atualizado.'))
        log(`🔄 ALTEROU STATUS CHAMADO ${curto(c)} para ${status}`);
    });
  }

  function finalizar() {
    const c = atual;
    const pendentes = (c.checklist || []).filter((i) => !i.checked).length;
    const { el: dlg, close } = openDialog({
      title: 'Finalizar chamado',
      icon: 'task_alt',
      body: `<form class="flex flex-col gap-space-md">
        ${pendentes ? `<div class="flex items-start gap-2 p-3 rounded-lg bg-[#fffbeb] text-[#b45309] dark:bg-amber-500/15 dark:text-amber-300 font-body-sm text-body-sm"><span class="material-symbols-outlined text-[18px]">warning</span>${pendentes} item(ns) do checklist ainda não foram marcados.</div>` : ''}
        ${field('Solução aplicada *', `<textarea class="${INPUT} h-28 py-2" name="solucao" placeholder="Descreva o que foi feito para resolver" required></textarea>`)}
        <div class="flex justify-end gap-space-sm"><button class="${BTN.ghost}" data-close type="button">Voltar</button><button class="${BTN.secondary} !bg-on-tertiary-container !text-on-tertiary" type="submit"><span class="material-symbols-outlined text-[18px]">task_alt</span>Finalizar chamado</button></div>
      </form>`,
    });
    dlg.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const solucao = String(new FormData(e.target).get('solucao') || '').trim();
      if (!solucao) return toast('Descreva a solução antes de finalizar.', 'erro');
      close();
      const ok = await salvar({
        status: 'finalizado',
        tecnico: c.tecnico || user.login,
        dataFechamento: Date.now(),
        solucao,
        historico: comHistorico(c, `🏁 CHAMADO FINALIZADO POR ${user.login}.\n📝 SOLUÇÃO: ${solucao}`),
      }, 'Chamado finalizado.');
      if (ok) log(`✅ FECHOU CHAMADO ${curto(c)}`);
    });
  }

  async function reabrir() {
    const c = atual;
    if (!(await confirmar({ title: 'Reabrir chamado', message: 'O chamado volta para "Em andamento". Continuar?', okLabel: 'Reabrir' }))) return;
    if (await salvar({ status: 'Em andamento', dataFechamento: null, historico: comHistorico(c, `↩️ Chamado reaberto por ${user.login}.`) }, 'Chamado reaberto.'))
      log(`↩️ REABRIU CHAMADO ${curto(c)}`);
  }

  async function enviar(texto, interna = false) {
    const c = atual;
    texto = texto.trim();
    if (!texto) return false;
    const msg = { user: user.login, texto, time: Date.now() };
    const ok = interna
      ? await salvar({ notasInternas: [msg, ...(c.notasInternas || [])] })
      : await salvar({ historico: [msg, ...(c.historico || [])] });
    if (ok) log(interna ? `🗒️ ADICIONOU NOTA INTERNA NO CHAMADO ${curto(c)}` : `📝 COMENTOU CHAMADO ${curto(c)}`);
    return ok;
  }

  async function toggleCheck(id) {
    const checklist = (atual.checklist || []).map((i) => (String(i.id) === id ? { ...i, checked: !i.checked } : i));
    await salvar({ checklist });
  }

  // ----- Renderização -----
  function render(c) {
    atual = c;
    if (!c) {
      el.innerHTML = `<div class="${card} p-space-lg">${emptyState('confirmation_number', 'Selecione um chamado da fila para ver os detalhes.')}</div>`;
      return;
    }

    // Preserva o rascunho e o foco do campo de mensagem entre atualizações em tempo real.
    const input = el.querySelector('[data-chat-input]');
    const rascunho = input?.value ?? '';
    const tinhaFoco = document.activeElement === input;

    const fechado = isFechado(c.status);
    const vencido = !fechado && isSlaVencido(c);
    const pr = prioridadeUI(c.prioridade);
    const st = statusUI(c.status);
    const meu = c.tecnico === user.login;
    const lista = aba === 'notas' ? c.notasInternas || [] : c.historico || [];
    const slaCls = fechado ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' : vencido ? 'bg-error text-on-error' : fracaoSla(c) > 0.75 ? 'bg-[#fffbeb] text-[#b45309] dark:bg-amber-500/15 dark:text-amber-300' : 'bg-surface-container text-on-surface-variant';
    const checklist = c.checklist || [];

    const cabecalho = `
      <div class="${card} p-space-md flex flex-col gap-space-md">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm bg-surface-container-low p-space-md rounded-lg">
          <div class="flex flex-col gap-1 min-w-0">
            <div class="flex items-center gap-space-xs flex-wrap">
              <span class="font-headline-lg text-headline-lg text-primary font-bold">${esc(formatProtocolo(c))}</span>
              <span class="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold uppercase tracking-wider flex items-center gap-1 ${st.cls}"><span class="material-symbols-outlined text-[14px]">${st.icon}</span>${esc(st.label)}</span>
              <span class="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1 ${pr.cls}"><span class="w-1.5 h-1.5 rounded-full ${pr.dot} ${c.prioridade === 'CRITICA' && !fechado ? 'animate-pulse' : ''}"></span>${pr.label}</span>
            </div>
            <h2 class="font-headline-sm text-headline-sm text-on-surface">${esc(c.titulo || 'Sem título')}</h2>
            <span class="font-label-sm text-label-sm text-on-surface-variant">Abertura: ${dataHora(c.dataAbertura)} (${tempoRelativo(c.dataAbertura)})${c.abertoPor ? ` • por ${esc(c.abertoPor)}` : ''}${c.dataFechamento ? ` • Fechado: ${dataHora(c.dataFechamento)}` : ''}</span>
          </div>
          <div class="flex items-center gap-space-xs shrink-0">
            ${ctx.full ? '' : `<a class="p-2 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors" href="chamado.html?id=${encodeURIComponent(c.id)}" title="Abrir caixa de conversa oficial"><span class="material-symbols-outlined text-[20px]">open_in_new</span></a>`}
            <button class="p-2 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors" data-act="copiar" title="Copiar link do chamado" type="button"><span class="material-symbols-outlined text-[20px]">share</span></button>
            <span class="px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-bold ${slaCls}" title="SLA da prioridade ${pr.label}">${fechado ? 'Concluído' : `SLA: ${slaTexto(c)}`}</span>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 ${ctx.full ? '' : 'md:grid-cols-4'} gap-space-sm">
          ${infoBox('person', 'Solicitante', esc(c.solicitante || '—'))}
          ${infoBox('domain', 'Prédio / Sala', esc(c.predio || '—'), esc(c.sala || ''))}
          ${infoBox('engineering', 'Técnico', esc(c.tecnico || 'Não atribuído'), c.tecnico ? '' : 'Aguardando despacho')}
          ${infoBox('devices', 'Equipamento', esc(equipamentoTexto(c.equipamento) || '—'))}
        </div>
        <div class="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-xs">
          <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Descrição do problema</span>
          <p class="font-body-md text-body-md text-on-surface whitespace-pre-line">${esc(c.descricao || '—')}</p>
          ${c.observacao ? `<p class="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-line"><strong>Observação:</strong> ${esc(c.observacao)}</p>` : ''}
          ${c.solucao ? `<p class="font-body-sm text-body-sm text-on-surface whitespace-pre-line p-space-sm rounded-lg bg-tertiary-fixed/60"><strong>Solução:</strong> ${esc(c.solucao)}</p>` : ''}
          ${(c.anexos || []).length ? `<div class="flex flex-wrap gap-space-xs pt-space-xs">${c.anexos.map(anexoHtml).join('')}</div>` : ''}
        </div>
        ${checklist.length ? `
        <div class="flex flex-col gap-space-xs">
          <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Checklist de atendimento (${checklist.filter((i) => i.checked).length}/${checklist.length})</span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
            ${checklist.map((i) => `<label class="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low cursor-pointer ${fechado ? 'opacity-70 cursor-default' : 'hover:bg-surface-container'}">
              <input class="w-4 h-4 accent-secondary" data-check="${esc(i.id)}" type="checkbox" ${i.checked ? 'checked' : ''} ${fechado ? 'disabled' : ''}/>
              <span class="font-body-sm text-body-sm ${i.checked ? 'line-through text-on-surface-variant' : 'text-on-surface'}">${esc(i.text)}</span></label>`).join('')}
          </div>
        </div>` : ''}
      </div>`;

    const conversa = `
      <section class="${card} flex flex-col ${ctx.full ? 'h-[calc(100vh-12rem)] min-h-[520px]' : 'h-[480px]'}">
        <div class="px-space-md py-space-sm bg-surface-container-low rounded-t-xl flex items-center justify-between gap-space-sm flex-wrap">
          <div class="flex items-center gap-1 bg-surface-container p-1 rounded-lg">
            <button class="px-space-sm py-1 rounded font-label-sm text-label-sm font-semibold flex items-center gap-1 ${aba === 'conversa' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}" data-aba="conversa" type="button"><span class="material-symbols-outlined text-[16px]">forum</span>Conversa <span class="text-outline">${(c.historico || []).length}</span></button>
            <button class="px-space-sm py-1 rounded font-label-sm text-label-sm font-semibold flex items-center gap-1 ${aba === 'notas' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}" data-aba="notas" type="button"><span class="material-symbols-outlined text-[16px]">lock</span>Notas internas <span class="text-outline">${(c.notasInternas || []).length}</span></button>
          </div>
          <span class="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm"><span class="w-2 h-2 rounded-full bg-on-tertiary-container"></span>${aba === 'notas' ? 'Visível só para a equipe técnica' : 'Atualização em tempo real'}</span>
        </div>
        <div class="flex-1 p-space-md overflow-y-auto flex flex-col gap-space-md bg-surface" data-chat-scroll>
          ${lista.length ? [...lista].reverse().map((m) => mensagemHtml(m, user.login)).join('') : emptyState(aba === 'notas' ? 'sticky_note_2' : 'chat', aba === 'notas' ? 'Nenhuma nota interna.' : 'Nenhuma mensagem ainda.')}
        </div>
        ${aba === 'conversa' && !fechado ? `<div class="px-space-sm pt-space-xs flex gap-space-xs overflow-x-auto">${FRASES_RAPIDAS.map((f) => `<button class="shrink-0 px-space-sm py-1 rounded-full bg-surface-container text-on-surface-variant hover:text-primary font-label-sm text-label-sm" data-frase="${esc(f)}" type="button">${esc(f)}</button>`).join('')}</div>` : ''}
        <form class="p-space-sm bg-surface-container-low rounded-b-xl flex items-center gap-space-xs" data-chat-form>
          <input class="flex-1 h-10 px-space-md bg-surface-container-lowest rounded-lg text-body-md font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30" data-chat-input placeholder="${aba === 'notas' ? 'Escreva uma nota interna para a equipe...' : 'Escreva uma resposta ou registre andamento...'}" type="text"/>
          <button class="h-10 px-space-md rounded-lg bg-secondary text-on-secondary font-label-md text-label-md flex items-center gap-1 hover:opacity-90 transition-all" type="submit"><span class="material-symbols-outlined text-[18px]">send</span><span class="hidden sm:inline">Enviar</span></button>
        </form>
      </section>`;

    const acao = (act, icon, label, cls = BTN.ghost) => `<button class="${cls}" data-act="${act}" type="button"><span class="material-symbols-outlined text-[18px]">${icon}</span>${label}</button>`;
    const acoes = `
      <div class="${card} p-space-md flex flex-wrap items-center justify-between gap-space-sm">
        <div class="flex flex-wrap items-center gap-space-xs">
          ${fechado ? acao('reabrir', 'undo', 'Reabrir') : `
            ${!meu ? acao('assumir', 'pan_tool', 'Assumir', BTN.primary) : ''}
            ${acao('transferir', 'swap_horiz', 'Transferir')}
            ${acao('status', 'published_with_changes', 'Mudar status')}`}
        </div>
        ${fechado ? '' : acao('finalizar', 'task_alt', 'Finalizar chamado', `${BTN.secondary} !bg-on-tertiary-container !text-on-tertiary`)}
      </div>`;

    el.innerHTML = ctx.full
      ? `<div class="grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
          <div class="xl:col-span-5 flex flex-col gap-space-md">${cabecalho}${acoes}</div>
          <div class="xl:col-span-7">${conversa}</div>
        </div>`
      : cabecalho + acoes + conversa;

    const novoInput = el.querySelector('[data-chat-input]');
    novoInput.value = rascunho;
    if (tinhaFoco) novoInput.focus();
    const scroll = el.querySelector('[data-chat-scroll]');
    scroll.scrollTop = scroll.scrollHeight;
  }

  el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act],[data-aba],[data-frase]');
    if (!t || !atual) return;
    if (t.dataset.aba) {
      aba = t.dataset.aba;
      return render(atual);
    }
    if (t.dataset.frase) return enviar(t.dataset.frase);
    const acoes = { assumir, transferir, status: mudarStatus, finalizar, reabrir };
    if (t.dataset.act === 'copiar') {
      const url = new URL(`chamado.html?id=${encodeURIComponent(atual.id)}`, location.href).href;
      try {
        await navigator.clipboard.writeText(url);
        toast('Link do chamado copiado.');
      } catch {
        toast(url, 'info');
      }
      return;
    }
    acoes[t.dataset.act]?.();
  });
  el.addEventListener('change', (e) => {
    if (e.target.matches('[data-check]')) toggleCheck(e.target.dataset.check);
  });
  el.addEventListener('submit', async (e) => {
    if (!e.target.matches('[data-chat-form]')) return;
    e.preventDefault();
    const input = e.target.querySelector('[data-chat-input]');
    const texto = input.value;
    input.value = '';
    if (!(await enviar(texto, aba === 'notas'))) input.value = texto;
  });

  return { render };
}
