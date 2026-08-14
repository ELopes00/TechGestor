# TechGestor 2.0 — App Mobile (Técnico)

Expo + React Native + TypeScript, mesmo padrão de Firebase (JS SDK) do
app original e do painel web.

## O que já existe

- **Tela de detalhes do chamado** (`src/screens/ChamadoDetalheScreen.tsx`) —
  a peça central do fluxo do técnico, com as **mesmas funções do modal de
  detalhes do app original** (`ChamadosScreen.js`): status, checklist,
  chat e fechamento ficam sempre disponíveis pra quem abrir o chamado —
  o app real não bloqueia isso por "de quem é o chamado" (é um modelo de
  confiança entre a equipe, sem trava de propriedade).
  - A única ação condicionada é **"🙋‍♂️ ASSUMIR CHAMADO"**: só aparece
    enquanto o chamado está na fila (sem técnico). Toque nela pede
    confirmação ("Este chamado sairá da fila do prédio e ficará sob sua
    responsabilidade") e então grava `tecnico = meuLogin`,
    `status = "Em andamento"` — mesmo texto e mesma mutação do
    `confirmarAssumir()` do app original.
- **"Meus Chamados"** (`src/screens/MeusChamadosScreen.tsx`) — a lista
  que abre a tela acima. Abas MEUS/FILA iguais ao app original, busca,
  cartão com prioridade/SLA/status por chamado, `pull-to-refresh`.
  Assina `chamados` em tempo real (`src/lib/hooks.ts`, `useChamados()`)
  — não é mais dado fixo.
- `src/lib/types.ts`, `src/lib/firebase.ts`, `src/lib/dataService.ts`,
  `src/lib/hooks.ts` — subconjunto do `web/src/lib/` necessário pra essas
  duas telas.
- `src/theme/colors.ts` — mesma paleta institucional do painel web.
- **Bottom Tabs** (`@react-navigation/bottom-tabs`, montado em `App.tsx`)
  — 4 abas: **Início** (`src/screens/InicioScreen.tsx`, o antigo
  lista→detalhe→voltar que morava direto em `App.tsx`), **Perfil**
  (`src/screens/PerfilScreen.tsx`, ver logout abaixo), e **QR Code** /
  **Notificações** como placeholders (`src/screens/EmBreveScreen.tsx`) —
  as features de verdade ainda não existem, ver pendências.
- **Login** (`src/screens/LoginScreen.tsx`) — mesmo padrão do web: campo
  "Login" (não e-mail) + senha, `src/lib/auth.ts` (`entrar()`) vira e-mail
  fake pro Firebase Auth. `App.tsx` usa `useUsuarioAtual()` pra decidir
  entre tela de login e o app; `MEU_LOGIN`/`MEU_PREDIO` fixos foram
  substituídos pelo usuário real da sessão.
- **`src/lib/push.ts`** — `registrarPushMobile(uid)`: pede permissão, gera
  o token Expo Push (dispositivo físico só) e salva em
  `usuarios/{uid}.expoPushToken`. **Já ligada** — `App.tsx` chama
  `registrarPushMobile(usuario.uid)` logo depois do login bem-sucedido,
  mesmo ponto onde o app original chama `setupPush()` em `App.js`. Falta
  só preencher `extra.eas.projectId` em `app.json` (rode `eas init` — não
  reaproveite o ID do projeto original) antes de gerar um build de verdade.
- **Push de servidor**: as Cloud Functions em `backend/functions/` já
  disparam pro `expoPushToken` salvo aqui automaticamente quando um
  chamado é criado/atribuído — não precisa de nada além do token salvo.
- **Logout** — `PerfilScreen.tsx` mostra login/perfil/unidade e o botão
  "Sair do sistema", chamando `sair()` de `src/lib/auth.ts` (já existia,
  só faltava um lugar na UI).

## O que falta (próximas iterações)

- Scanner de QR Code de verdade na aba "QRCode" (hoje é placeholder) —
  vincula prédio/setor ao abrir/localizar um chamado, precisa de
  `expo-camera` ou `expo-barcode-scanner`
- Notificações de verdade na aba "Notificações" (hoje é placeholder) —
  histórico de avisos, provavelmente lendo o mesmo evento que dispara o
  push (ver `backend/functions/src/index.ts`)
- Anexar foto (câmera) no chamado
- Troca de senha e "ativar notificações" na aba Perfil (hoje só tem
  identidade + logout; o web equivalente em
  `web/src/app/(painel)/perfil` tem os dois)

## Como rodar

```bash
cd mobile
npm install
cp .env.local.example .env.local   # preencha com as credenciais do SEU projeto Firebase (leia o aviso no arquivo)
npm start
```
