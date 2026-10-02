// Administração de usuários: lista ao vivo, cadastro, edição, status e exclusão.
import { requireSession } from '../lib/session.js';
import { atualizarUsuario, deletarUsuario, registrarUsuario, subscribeChamados, subscribeUsuarios } from '../lib/data.js';
import { esc, isFechado, NIVEIS_TECNICO, SETORES, USUARIO_STATUS_UI, usuarioStatusUI } from '../lib/format.js';
import { avatar, BTN, confirmar, emptyState, erroFirestore, field, INPUT, openDialog, options, skeletonRows, toast } from '../lib/ui.js';

const eu = await requireSession();
const $ = (id) => document.getElementById(id);
let usuarios = null;
let chamados = [];

$('f-predio').innerHTML = options([['', 'Todos os prédios'], ...SETORES], '');
$('f-status').innerHTML = options([['', 'Todos os status'], ...Object.entries(USUARIO_STATUS_UI).map(([k, v]) => [k, v.label])], '');
$('kpis').innerHTML = skeletonRows(4, 'h-24');
$('tabela').innerHTML = `<tr><td colspan="7" class="p-space-lg">${skeletonRows(4, 'h-12')}</td></tr>`;

const horas = Array.from({ length: 24 }, (_, h) => [String(h), `${String(h).padStart(2, '0')}:00`]);
const pad = (h) => `${String(h ?? '—').padStart(2, '0')}:00`;

const tile = (t, i, v, s) => `<div class="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-1">
  <div class="flex items-center justify-between"><span class="font-label-sm text-label-sm text-on-surface-variant">${t}</span><span class="material-symbols-outlined text-[20px] text-secondary">${i}</span></div>
  <span class="font-display-lg-mobile text-display-lg-mobile text-primary">${v}</span><span class="font-body-sm text-body-sm text-on-surface-variant">${s}</span></div>`;

function render() {
  if (!usuarios) return;
  const tecnicos = usuarios.filter((u) => u.perfil === 'TECNICO');
  $('kpis').innerHTML = [
    tile('Usuários', 'group', usuarios.length, 'Contas cadastradas'),
    tile('Técnicos', 'engineering', tecnicos.length, NIVEIS_TECNICO.map((n) => `${n}: ${tecnicos.filter((t) => (t.nivel || 'N1') === n).length}`).join(' • ')),
    tile('Administradores', 'shield', usuarios.filter((u) => u.perfil === 'ADM').length, 'Acesso total'),
    tile('Online agora', 'wifi', usuarios.filter((u) => u.status === 'ONLINE').length, `${usuarios.filter((u) => u.status === 'ALMOCO').length} em almoço`),
  ].join('');

  const termo = $('f-busca').value.trim().toLowerCase();
  const lista = usuarios
    .filter((u) => (!$('f-perfil').value || u.perfil === $('f-perfil').value) &&
      (!$('f-predio').value || u.predio === $('f-predio').value) &&
      (!$('f-status').value || (u.status || 'OFFLINE') === $('f-status').value) &&
      (!termo || [u.nomeCompleto, u.login, u.emailContato].some((v) => String(v || '').toLowerCase().includes(termo))))
    .sort((a, b) => String(a.nomeCompleto || a.login).localeCompare(String(b.nomeCompleto || b.login)));

  $('tabela').innerHTML = lista.length
    ? lista.map((u) => {
        const s = usuarioStatusUI(u.status);
        const carga = chamados.filter((c) => c.tecnico === u.login && !isFechado(c.status)).length;
        const souEu = u.id === eu.uid;
        return `<tr class="hover:bg-surface-container-low">
          <td class="px-space-lg py-space-sm"><div class="flex items-center gap-space-sm">${avatar(u.nomeCompleto || u.login, 'w-9 h-9 text-[12px]')}<div class="flex flex-col min-w-0"><span class="font-label-lg text-label-lg text-on-surface truncate">${esc(u.nomeCompleto || u.login)}${souEu ? ' <span class="text-outline font-normal">(você)</span>' : ''}</span><span class="font-body-sm text-body-sm text-on-surface-variant truncate">${esc(u.login)}${u.emailContato ? ` • ${esc(u.emailContato)}` : ''}</span></div></div></td>
          <td class="px-space-md py-space-sm"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${u.perfil === 'ADM' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-high text-on-surface'}"><span class="material-symbols-outlined text-[14px]">${u.perfil === 'ADM' ? 'shield' : 'engineering'}</span>${u.perfil === 'ADM' ? 'Admin' : `Técnico ${esc(u.nivel || 'N1')}`}</span></td>
          <td class="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface">${esc(u.predio || '—')}</td>
          <td class="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">${pad(u.inicio)} – ${pad(u.saida)}</td>
          <td class="px-space-md py-space-sm"><label class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-container-low"><span class="w-2 h-2 rounded-full ${s.dot}"></span><select class="bg-transparent font-label-sm text-label-sm text-on-surface focus:outline-none" data-status="${esc(u.id)}" aria-label="Status de ${esc(u.login)}">${options(Object.entries(USUARIO_STATUS_UI).map(([k, v]) => [k, v.label]), u.status || 'OFFLINE')}</select></label></td>
          <td class="px-space-md py-space-sm font-label-md text-label-md ${carga ? 'text-primary' : 'text-outline'}">${carga} em aberto</td>
          <td class="px-space-lg py-space-sm"><div class="flex justify-end gap-1">
            <button class="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high" data-editar="${esc(u.id)}" title="Editar" type="button"><span class="material-symbols-outlined text-[20px]">edit</span></button>
            ${souEu ? '' : `<button class="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40" data-excluir="${esc(u.id)}" title="Excluir" type="button"><span class="material-symbols-outlined text-[20px]">delete</span></button>`}
          </div></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="7">${emptyState('person_search', 'Nenhum usuário encontrado.')}</td></tr>`;
}

function formUsuario(u = {}) {
  const novo = !u.id;
  return `<form class="grid grid-cols-1 sm:grid-cols-2 gap-space-md" novalidate>
    ${novo ? field('Login (matrícula) *', `<input class="${INPUT}" name="login" autocomplete="off" placeholder="Ex.: joao.silva" required/>`) + field('Senha inicial *', `<input class="${INPUT}" name="senha" type="password" autocomplete="new-password" minlength="6" placeholder="Mínimo 6 caracteres" required/>`) : ''}
    <div class="sm:col-span-2">${field('Nome completo *', `<input class="${INPUT}" name="nomeCompleto" value="${esc(u.nomeCompleto || '')}" required/>`)}</div>
    <div class="sm:col-span-2">${field('E-mail de contato', `<input class="${INPUT}" name="emailContato" type="email" value="${esc(u.emailContato || '')}"/>`)}</div>
    ${field('Perfil', `<select class="${INPUT}" name="perfil">${options([['TECNICO', 'Técnico'], ['ADM', 'Administrador']], u.perfil || 'TECNICO')}</select>`)}
    ${field('Nível (técnicos)', `<select class="${INPUT}" name="nivel">${options(NIVEIS_TECNICO, u.nivel || 'N1')}</select>`)}
    <div class="sm:col-span-2">${field('Prédio / lotação', `<select class="${INPUT}" name="predio">${options(SETORES, u.predio || SETORES[0])}</select>`)}</div>
    ${field('Início do expediente', `<select class="${INPUT}" name="inicio">${options(horas, String(u.inicio ?? 8))}</select>`)}
    ${field('Fim do expediente', `<select class="${INPUT}" name="saida">${options(horas, String(u.saida ?? 17))}</select>`)}
    <p class="sm:col-span-2 hidden text-error font-body-sm text-body-sm" data-erro></p>
    <div class="sm:col-span-2 flex justify-end gap-space-sm"><button class="${BTN.ghost}" data-close type="button">Cancelar</button><button class="${BTN.primary}" type="submit"><span class="material-symbols-outlined text-[18px]">save</span>${novo ? 'Cadastrar' : 'Salvar'}</button></div>
  </form>`;
}

function abrirForm(u) {
  const novo = !u;
  const { el, close } = openDialog({ title: novo ? 'Novo usuário' : `Editar ${u.login}`, icon: novo ? 'person_add' : 'edit', size: 'max-w-2xl', body: formUsuario(u) });
  const form = el.querySelector('form');
  const erro = form.querySelector('[data-erro]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const falha = (m) => { erro.textContent = m; erro.classList.remove('hidden'); };
    if (!f.nomeCompleto.trim()) return falha('Informe o nome completo.');
    if (novo && (!f.login.trim() || f.senha.length < 6)) return falha('Informe o login e uma senha com pelo menos 6 caracteres.');
    if (novo && usuarios.some((x) => x.login?.toLowerCase() === f.login.trim().toLowerCase())) return falha('Já existe um usuário com esse login.');
    const dados = {
      nomeCompleto: f.nomeCompleto.trim(), emailContato: f.emailContato.trim(), perfil: f.perfil, predio: f.predio,
      inicio: Number(f.inicio), saida: Number(f.saida), nivel: f.perfil === 'TECNICO' ? f.nivel : null,
    };
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      if (novo) await registrarUsuario({ ...dados, login: f.login.trim(), senha: f.senha }, eu.login);
      else await atualizarUsuario(u.id, dados, eu.login);
      close();
      toast(novo ? 'Usuário cadastrado.' : 'Usuário atualizado.');
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      falha({
        'auth/email-already-in-use': 'Esse login já tem conta no Firebase.',
        'auth/weak-password': 'Senha fraca: use pelo menos 6 caracteres.',
        'permission-denied': 'Sem permissão para salvar.',
      }[err.code] || 'Falha ao salvar. Tente novamente.');
    }
  });
}

subscribeUsuarios((l) => { usuarios = l; render(); }, (err) => ($('tabela').innerHTML = `<tr><td colspan="7">${erroFirestore(err)}</td></tr>`));
subscribeChamados((l) => { chamados = l; render(); });
['f-busca', 'f-perfil', 'f-predio', 'f-status'].forEach((id) => $(id).addEventListener('input', render));
$('btn-novo').addEventListener('click', () => abrirForm());

$('tabela').addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-editar]');
  const ex = e.target.closest('[data-excluir]');
  if (ed) abrirForm(usuarios.find((u) => u.id === ed.dataset.editar));
  if (ex) {
    const u = usuarios.find((x) => x.id === ex.dataset.excluir);
    const ok = await confirmar({ title: 'Excluir usuário', message: `Excluir ${u.nomeCompleto || u.login} do TechGestor? O cadastro sai da lista (a conta de login do Firebase precisa ser removida no console).`, okLabel: 'Excluir', danger: true });
    if (!ok) return;
    try {
      await deletarUsuario(u.id, eu.login);
      toast('Usuário excluído.');
    } catch (err) {
      console.error(err);
      toast('Falha ao excluir.', 'erro');
    }
  }
});
$('tabela').addEventListener('change', async (e) => {
  const sel = e.target.closest('[data-status]');
  if (!sel) return;
  try {
    await atualizarUsuario(sel.dataset.status, { status: sel.value }, eu.login);
    toast('Status atualizado.');
  } catch (err) {
    console.error(err);
    toast('Falha ao alterar o status.', 'erro');
    render();
  }
});
