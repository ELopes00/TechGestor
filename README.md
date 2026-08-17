# TechGestor 2.0

Reconstrução do sistema de gestão de TI do TJRR (TechGestor), realinhada em
12/08/2026 com o **código-fonte real** do app original (Expo/React Native)
que o time exportou e compartilhou. Web em Next.js/Tailwind; mobile fica
para uma próxima frente.

> **Sem dados pessoais populados de propósito**, com uma exceção clara: os
> diretórios de referência reais do TJRR (prédios, setores, categorias de
> equipamento, servidores) em `backend/seed/` — ver seção própria abaixo.
> Nenhuma conta de usuário/técnico vem pré-criada.

## Deploy

Web no ar em **https://celab-7f3d9.web.app** (Firebase Hosting, plano
Spark gratuito). 17/08/2026: depois de tentar Vercel (que funcionou,
mas foi apagado a pedido do time) e de repetidas tentativas frustradas
de subir o Blaze do projeto (ver [[techgestor2_push_gratuito_2026-08-14]]
nas memórias — nunca propagou), a saída foi exportar o `web/` como site
**estático** (`next.config.js` tem `output: "export"`) e publicar via
`firebase deploy --only hosting`. Isso funciona 100% no Spark, sem
Blaze nenhum.

**Trade-off consciente**: a rota de servidor `web/src/app/api/push-mobile/route.ts`
(proxy pro Expo Push, ver `enviarPushMobile` em `dataService.ts`) não
funciona nessa versão — hospedagem estática não roda código de
servidor. O Next.js simplesmente ignora essa rota no build estático
(não dá erro), mas a notificação push pro mobile não sai daqui até o
site voltar a rodar num host com servidor (Vercel de novo, ou Blaze
resolvido). O resto do app (tudo que já é Firestore direto do
navegador) funciona normal.

Pra atualizar o site depois de mudanças: `npm run build` dentro de
`web/` gera `web/out/`, depois `firebase deploy --only hosting
--project celab-7f3d9` na raiz do repo publica.

## Stack

| Camada  | Tecnologia |
|---|---|
| Web | Next.js (App Router) + TypeScript + Tailwind CSS |
| Backend | Firebase: Auth, Firestore, Cloud Functions |

## Tema claro/escuro (13–14/08/2026)

Depois de olhar as telas públicas do `techgestor-bd.web.app` real (só
navegação, sem login — ver decisão de segurança abaixo), o painel web foi
realinhado pro mesmo visual: **tema escuro por padrão possível, com cor de
destaque translúcida** em vez do azul institucional sólido fixo que
tínhamos antes. O alternador claro/escuro fica no ícone de sol/lua na
Topbar, e a preferência persiste em `localStorage` (chave
`techgestor-tema`) — sem flash de tema errado no carregamento (script
inline em `web/src/app/layout.tsx`).

Em 14/08/2026 os tokens de cor foram trocados pelos valores **exatos** do
`sage-ti.web.app` (outro sistema do TJRR do mesmo time — Sistema de Ativos
e Gestão de Estoque de TI), extraídos direto do CSSOM da página real
(`--page`, `--surface-*`, `--sidebar*`, `--brand*`, `--status-*`,
`--wash-*` etc., ver `web/src/app/globals.css`). Detalhes que vieram junto:
- A sidebar (e o card do login) ficam **sempre escuras nos dois temas** —
  só trocam de tom (#14181f no claro / #121212 no escuro) — reverte a
  decisão de 13/08/2026 de deixar a sidebar clara no tema claro, porque
  agora a referência manda.
- `accent` (marca) virou var-backed: o azul é mais claro no escuro
  (#3987e5) que no claro (#2a78d6), igual ao sage-ti — antes era uma cor
  fixa. As versões translúcidas dos botões (`bg-accent-btn`) usam
  `color-mix()` pré-computado no CSS (ver comentário em `globals.css`)
  porque o modificador `/70` do Tailwind não funciona em cima de `var()`.
- Altura da Topbar (60px) e largura da sidebar (248px) também vêm de lá.
- Os brilhos radiais azuis que a sidebar/Topbar/login ganharam em
  13/08/2026 foram removidos — o sage-ti não usa esse efeito.

**Pendente pra próxima iteração**: replicar a estrutura de navegação
também (sage-ti agrupa os itens da sidebar em seções como
PRINCIPAL/MOVIMENTAÇÃO/ANÁLISE/SISTEMA/FERRAMENTAS) — não mexemos nisso.

## Levantamento de funcionalidades vs. techgestor-bd real (14/08/2026)

Comparação tela a tela com o app real (só navegação, sem alterar dados —
ver decisão de segurança abaixo) pra fechar o gap de funcionalidades.
Implementado e testado nessa passada:
- **Chamados**: anexar arquivo/foto (Firebase Storage, ver
  `backend/storage.rules` — pendente ativar Storage no console pra
  funcionar de verdade, ver aviso abaixo), transferir pra outro técnico,
  respostas rápidas no chat, seleção em lote + excluir direto do card.
  Revisitado tela a tela em 14/08/2026 (mesma comparação lado a lado do
  Inventário, aplicada aqui): formulário "Novo chamado" ganhou o campo
  "Vincular equipamento…" (lista achatada de todos os equipamentos do
  Inventário, grava em `chamado.equipamento`, campo que já existia no
  tipo mas não tinha UI); botão de foto virou "Tirar Foto" e "Abrir
  Chamado" ficou maiúsculo; cada card ganhou hora relativa ("2min
  atrás"), uma linha "Status: X" em âmbar, o texto "Toque para
  detalhes" e o botão "Transferir" (antes um ícone no topo, agora uma
  pill no rodapé do card, igual ao real — e removido de dentro do
  modal de detalhe, que no app real só tem Transferir no card); o
  modal de detalhe reorganizou os campos como rótulo/valor
  ("Título / Assunto", "Localização (Setor / Sala)" etc.), ganhou a
  linha "Equipamento vinculado" e o botão "Mudar Status" agora abre um
  painel colapsável (pills de status + nota opcional + Cancelar/
  Confirmar) em vez de pills sempre visíveis — "finalizado" aparece
  desabilitado nesse painel porque fechar ainda exige a Solução/Notas
  obrigatória, igual à decisão já tomada antes.
- **Eventos**: campos Data de Instalação/Data do Evento, transferir,
  auto-escalar técnico. Revisitado tela a tela em 14/08/2026 (mesmo
  método de Chamados/Inventário): a tabela virou uma lista de cards
  (igual Chamados/Inventário — a tela real nunca usou tabela aqui),
  com filtro TODOS/INTERNO/EXTERNO como pills no canto da seção "Agenda
  de Eventos" (antes eram pills soltas acima da lista); o formulário
  "Novo Chamado" virou "Gestão de Eventos" com abas INTERNO (âmbar) /
  EXTERNO (azul) em largura total, campos reordenados e "Selecionar
  Técnico Escalado…" isolado numa linha própria no fim; o modal de
  detalhe ganhou a mesma "MUDAR STATUS" colapsável de Chamados (pills +
  nota opcional + Cancelar/Confirmar) e uma linha "Contato:" que faltava;
  "Transferir" ficou ao lado de "Técnico: X" (diferente de Chamados, onde
  Transferir só existe no card — no app real, Eventos é o oposto:
  Transferir só existe dentro do modal). Também notado e **não**
  replicado de propósito: o painel real de status do Evento oferece dois
  status extras fora do enum padrão ("PENDENTE"/"CONCLUIDO", maiúsculos,
  aparentam ser dado legado/inconsistente do app original) — mantido só
  com os 5 valores de `STATUS_CHAMADO_OPCOES` por segurança de tipo.
- **Inventário**: Painel Analítico por equipamento (apontar/resolver
  falha, rastro de auditoria), exportar PDF (`jspdf`) e Excel (`xlsx`),
  importar planilha, scan (por enquanto entrada manual do código — sem
  câmera nessa passada), seleção em lote. Revisitado tela a tela em
  14/08/2026 (segunda passada, comparando lado a lado com o real, só
  itens/campos/botões — nenhum dado real importado, ver aviso de
  segurança abaixo): toolbar de exportar/importar virou pills
  maiúsculas com as mesmas cores (PDF outline, Excel cheio, Importar
  âmbar); busca ganhou a caixa única "Busca: ... [SCAN]"; o formulário
  inline de novo item virou um assistente modal de 3 passos ("Sistema
  de Levantamento" → Dados de Localização → Especificações Técnicas →
  Responsável), com a lista de categorias de hardware expandida
  (Monitor/CPU/Impressora/Scanner/Nobreak/Equip. Vídeoconferência/
  Notebook/Tablet/Telefone IP) e botão "Leitura digital" reaproveitando
  o modal de scan; cada card ganhou um link "Remover" sempre visível
  (antes só dava pra excluir em lote); e o Painel Analítico ganhou botão
  "Apontar falha" no cabeçalho, link "Alterar dados" (edita
  prédio/setor/local), botão "Gerir ativo" (edita fabricante/tombo do
  equipamento selecionado), e uma linha de estatística com "Processos
  abertos" e "Estado técnico" — os dois calculados a partir dos chamados
  vinculados ao tombo do equipamento (`chamado.equipamento.pat`).
- **Agenda**: calendário em grade mensal (era lista por data). Revisitado
  tela a tela em 14/08/2026: já batia bem estruturalmente (mesmo layout
  de grade, mesma ordem de campos no formulário "Agendar Novo Serviço"),
  só precisou de ajustes finos — título da seção "Agendar Novo Serviço"
  em verde (igual outros títulos de seção/ação do app real) em vez de
  cinza neutro, "Selecionar Técnico…" com maiúscula, botão "AGENDAR
  TAREFA" maiúsculo e largura total. Não achei nenhum dia com tarefa
  cadastrada nos dois meses navegados no app real pra comparar o
  cartão de tarefa em si, então esse ficou como já estava.
- **Início**: card "Meu Status Atual" com toggle Online/Offline, KPI de
  Eventos Ativos, "Monitor da Equipe" (grid com status ao vivo de todos).
- **Perfil**: revisitado tela a tela em 17/08/2026, último par da
  varredura junto com Admin. Ajustes finos pra bater com o real:
  "Logado como:" com dois pontos, "Perfil: X" em verde
  (`text-alerta-ok`), "Unidade" renomeado pra "Prédio" (rótulo do app
  real), "🔒 Alterar Minha Senha" em verde e Title Case, rótulos dos
  campos de senha com dois pontos, botão "SALVAR NOVA SENHA" maiúsculo e
  verde (era azul), "SAIR DO SISTEMA (LOGOUT)" maiúsculo. O card
  "🔔 Notificações" (ativar push no navegador) é uma adição nossa — o
  app real não tem essa seção aqui — mantido de propósito, só com o
  botão maiúsculo pra bater com o padrão visual do resto do app.
- **Admin**: confirmado de novo que não existe no menu do app real
  (só Início/Chamados/Eventos/Inventário/Agenda/Perfil/Pausa/Sair) —
  não há "tela por tela" pra comparar aqui. Aplicado só o padrão
  visual (botões primários maiúsculos) pra consistência com as outras
  telas revisadas.

⚠️ **Storage do Firebase precisa ser ativado manualmente** no projeto de
teste antes do anexo de arquivos funcionar — é um setup único só pelo
console (escolher região, aceitar termos):
`https://console.firebase.google.com/project/celab-7f3d9/storage`. As
regras (`backend/storage.rules`) já estão prontas, só falta
`firebase deploy --only storage` depois do ativar. Confirmado de novo em
14/08/2026 ao testar o botão "Arquivo" em Chamados: o upload trava sem
erro nenhum (o SDK não consegue nem completar a chamada contra um bucket
que não existe) — por isso foi adicionado um `try/catch` em
`adicionarAnexo` (`chamados/page.tsx`) que agora mostra um alerta claro
em vez de falhar em silêncio. Nessa mesma passada foram adicionados
visualizar/baixar (link com `download`, miniatura pra imagem) e remover
anexo (`DataService.removerAnexo`, botão "×" por anexo) no modal de
detalhe do chamado — prontos, só esperando a ativação do Storage pra
serem testados de ponta a ponta com upload de verdade.

## Notificação push — versão plano gratuito (14/08/2026)

O sistema original de push (dois canais, Expo + FCM, disparado por Cloud
Functions — ver `backend/functions/src/index.ts`) foi construído em
12/08/2026, mas nunca conseguiu ser implantado: Cloud Functions exige o
plano Blaze, e mesmo depois do upgrade confirmado no console, a CLI
(`firebase deploy --only functions`) seguiu recusando com "must be on
the Blaze plan" em várias tentativas em dias diferentes — parece um
problema de propagação/billing do lado do Google, não algo resolvível
por aqui.

Pedido do time em 14/08/2026: "quero fazer no plano gratuito". Como
Cloud Functions não roda em nenhuma versão no Spark, a lógica do canal
**Expo (mobile)** foi replicada direto no cliente, em
`web/src/lib/dataService.ts` (`enviarPushMobile`,
`notificarTecnicosDoPredio`, chamadas de dentro de `salvarChamado`/
`atualizarChamado`/`salvarEvento`) — mesmo comportamento das antigas
`onChamadoCriado`/`onChamadoAtualizado`/`onEventoCriado`: chamado com
técnico atribuído notifica só ele, chamado sem técnico notifica todos
os técnicos do prédio.

Testado (e confirmado, não só assumido): chamar `https://exp.host/--/api/v2/push/send`
direto do navegador **não funciona** — o preflight OPTIONS passa, mas o
POST de verdade é bloqueado por CORS (erro genérico "Failed to fetch").
Por isso o envio passa por uma API Route same-origin do próprio Next.js,
`web/src/app/api/push-mobile/route.ts`, que roda no servidor (não
depende de Firebase/Blaze nenhum — funciona em qualquer hospedagem do
Next.js) e repassa pro Expo servidor-a-servidor, sem CORS. Verificado
de ponta a ponta: criar um chamado atribuído a um técnico com
`expoPushToken` salvo dispara a chamada real pra `/api/push-mobile`,
que responde 200 com o corpo de resposta do próprio Expo.

**Canal FCM (navegador) ficou de fora dessa versão** — mandar FCM exige
a chave de servidor do Firebase Admin, que não pode ficar exposta em
código de cliente. Quem estiver logado no painel web continua vendo
tudo atualizar ao vivo na tela (Firestore em tempo real, já existia),
só não ganha uma notificação nativa do sistema operacional. Isso só
volta quando o Blaze finalmente propagar.

⚠️ Se um dia o deploy das Cloud Functions funcionar com esse código
cliente ainda ativo, cada chamado/evento dispara duas notificações
(client + function) — ver aviso completo no topo de
`backend/functions/src/index.ts` antes de reativar aquele caminho.

Detalhes de implementação: `institucional` e `surface` (Tailwind, ver
`web/tailwind.config.ts`) viram `var(--...)` definidas em
`web/src/app/globals.css`, e se invertem sozinhas com a classe `dark` na
`<html>` — a maioria dos componentes não precisou de nenhum `dark:` manual.
`accent` (azul, usado sempre com opacidade — ex. `bg-accent-600/70` — pro
efeito translúcido pedido em 13/08/2026) e `chrome` (preto fixo da
sidebar/login) ficam de fora de propósito, iguais nos dois temas.

Logo da sidebar e do login trocada pelo brasão oficial do TJRR
(`web/public/logo-tjrr.png`, baixado de `sage-ti.web.app/assets/logo.png`
a pedido do time em 13/08/2026) no lugar do badge "TG" de texto.

## Estrutura de pastas

```
/backend    -> modelo de dados, regras de segurança, seeds, Cloud Functions
/web        -> painel (Next.js + Tailwind) — 8 telas, ver abaixo
/mobile     -> app do técnico — login, Bottom Tabs (Início/QR/Notificações/
               Perfil) e o fluxo Meus Chamados → detalhe já rodando, ver
               mobile/README.md
```

## As 8 telas (espelham o app original 1:1 na navegação)

| Tela | Rota | Só ADM? |
|---|---|---|
| Início (Dashboard) | `/dashboard` | não |
| Chamados | `/chamados` | não |
| Eventos | `/eventos` | não |
| Inventário | `/inventario` | não |
| Agenda | `/agenda` | criar é só ADM |
| Perfil | `/perfil` | não |
| Admin (Equipe + Relatórios) | `/admin` | sim |
| Logs (auditoria) | `/logs` | sim |
| Login | `/login` | — |

Esta é uma **passada rápida e ampla** (decisão do time em 12/08/2026): toda
tela existe e cobre o fluxo principal, mas features pesadas do app original
ficaram de fora por ora — cada uma é candidata a uma próxima iteração:

- Câmera / leitor de código de barras (chamados e inventário)
- Importação de planilha Excel e exportação Excel/PDF (inventário e relatórios)
- Transferência de chamado/evento e seleção em lote
- Logística de deslocamento (GPS/KM) em eventos externos
- Calendário em grade na Agenda (hoje é lista por data)
- Gráfico de barras de produtividade no Admin (hoje é só tabela)
- Prontuário detalhado por equipamento no Inventário

## Fluxo de status (chamados e eventos compartilham o mesmo enum)

```
Aguardando atendimento → Em andamento → Em separação de equipamentos → Instalado → finalizado
```

Herdado literalmente do app original (`STATUS_OPCOES` em `ChamadosScreen.js`).

## Duas taxonomias de local — não confundir

- **`predio` em chamados/eventos/usuários** = uma das 7 **unidades**
  (`Administrativo`, `Criminal`, `Civel`, `Palacio`, `Latife`, `Chamado
  Externo`, `SUBCS`) — é como o app real organiza fila e escala de técnicos.
- **`predio`/`setor` em inventário** = o diretório **real e completo** do
  TJRR (prédios físicos + 289 gabinetes/secretarias) — só para localizar
  equipamento fisicamente.

Detalhes completos em [`backend/firestore-schema.md`](./backend/firestore-schema.md).

## Dados de referência (seed)

| Arquivo | Conteúdo | Vira conta de login? |
|---|---|---|
| `predios.json` | 15 prédios reais do TJRR | — |
| `setores.json` | 289 setores/gabinetes reais (lista completa, sem deduplicar) | — |
| `categorias-equipamento.json` | categorias e modelos de equipamento | — |
| `servidores.json` | 1.634 servidores (nome + matrícula) — diretório para autocompletar solicitante/responsável | **Não**, é só consulta |
| `tecnicos.json` | 13 técnicos de TI reais (só nome) — roteiro de quem convidar | Não automaticamente |

Os quatro primeiros (`predios`, `setores`, `categoriasEquipamento`,
`servidores`) já foram semeados no projeto de teste `celab-7f3d9` em
13/08/2026 — é o que alimenta os campos de autocomplete do Inventário.
`tecnicos.json` **não** entra no Firestore por esse script — é só o
roteiro de quem convidar; a equipe do time decidiu em 13/08/2026 cadastrar
esses 13 técnicos manualmente pela aba Admin → Equipe, sem atalho na UI.

```bash
cd backend/seed
npm install firebase-admin
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node seed-referencia.js
```

## ⚠️ Duas decisões de segurança que ficaram registradas, não resolvidas

1. **Senha em texto puro no Firestore.** O app original grava `senha` no
   documento `usuarios` (criação de conta e troca de senha) e usa `123`
   para todas as contas de demonstração, inclusive o admin. **Decisão do
   time em 12/08/2026: manter esse comportamento nesta passada**, para
   fiel paridade com o original — marcado com `// ⚠️` em
   `web/src/lib/dataService.ts`. Pendente remover numa iteração de
   segurança futura.
2. **`web/.env.local` não tem as credenciais reais do projeto
   `techgestor-bd`, de propósito** — elas apontam pro banco em **produção**,
   com dados reais. O `.env.local` que existe no repo local só tem valores
   falsos (`demo-*`), configurados pra rodar contra o **emulador local**
   do Firebase (ver seção "Como testar localmente" abaixo) — nunca contra
   produção.

Achado à parte, já reportado antes: o `techgestor-bd.web.app` ao vivo tem
login/senha em texto puro **hardcoded no bundle JS público**, baixável sem
autenticação — recomendação permanece a de trocar essas credenciais.

## Como rodar o Web

```bash
cd web
npm install
cp .env.local.example .env.local   # preencha com as credenciais do SEU projeto Firebase (leia o aviso no arquivo)
npm run dev
```

## Como testar localmente (sem tocar em nenhum projeto Firebase real)

Testado em 12/08/2026: `npm install` + `npm run dev` sobem limpo, as 9
rotas (login + 8 telas do painel) respondem HTTP 200, sem erro de servidor.
`npm run build` (SSG) falha na etapa de pré-renderização se não houver
Firebase configurado — **isso é esperado**, não é bug: sem uma API key
válida (real ou de emulador), a inicialização do Firebase Auth trava o
build estático. `npm run dev` não sofre disso (renderiza por requisição).

Pra testar de verdade com Firestore/Auth funcionando, sem usar nenhum
projeto real:

```bash
# na raiz do TechGestor2.0 (não dentro de /web)
firebase emulators:start --only firestore,auth
```

Requer **Java 21+** instalado (o Firebase CLI não roda emulador sem
isso). `web/.env.local` já vem configurado com `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`
e valores falsos (`demo-*`) — assim que o emulador estiver rodando,
`npm run dev` conecta nele automaticamente (ver o bloco no fim de
`web/src/lib/firebase.ts`). `firebase.json` e `.firebaserc` (projeto
`demo-techgestor`) já estão configurados na raiz.

## Como fazer deploy do Backend (regras + push)

```bash
cd backend
firebase deploy --only firestore:rules,functions
```

## Push notification — dois canais, sem proxy de terceiro

Reconstruído em 12/08/2026 depois de auditar o app original inteiro (ele
usa DOIS canais, não um: Expo Push pro mobile + Firebase Cloud Messaging
via service worker pro navegador — e manda tudo direto do client através
de um proxy CORS público). Aqui os dois canais são disparados só pelas
Cloud Functions, servidor a servidor, sem proxy nenhum:

- `web/src/lib/push.ts` + `web/public/firebase-messaging-sw.js` — botão
  "Ativar notificações" na tela Perfil do painel, salva token em
  `usuarios/{uid}.fcmToken`.
- `mobile/src/lib/push.ts` — `registrarPushMobile()`, pronta pra chamar
  assim que o login mobile existir (ver `mobile/README.md`), salva em
  `usuarios/{uid}.expoPushToken`.
- `backend/functions/src/index.ts` — dispara nos dois canais
  automaticamente quando um chamado é criado/atribuído ou um evento é
  criado. Detalhes em `backend/firestore-schema.md`.

## Próximas iterações

Aprofunde uma tela ou feature de cada vez, por exemplo:
- "Adicione o leitor de código de barras no Inventário"
- "Adicione exportação Excel/PDF no Inventário e Admin"
- "Coloque o gate de sessão real nas rotas do painel (hoje só o login redireciona)"
- "Adicione o scanner de QR Code no mobile" — ver mobile/README.md
- "Adicione notificações de verdade na aba Notificações do mobile" — ver mobile/README.md
