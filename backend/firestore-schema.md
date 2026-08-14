# TechGestor 2.0 — Modelo de Dados (Firestore)

> **Realinhado em 12/08/2026** com o repositório fonte real do TechGestor
> (App.js, src/services/DataService.js, src/screens/*.js, constants/const.ts).
> Timestamps seguem o padrão do app original: `number` (`Date.now()`), não
> Firestore `Timestamp` — é o que já está gravado no banco em produção.

## Visão geral das coleções

```
usuarios/{uid}
predios/{predioId}            (diretório real TJRR — só Inventário usa)
setores/{setorId}             (diretório real TJRR — só Inventário usa)
servidores/{servidorId}       (diretório real TJRR — autocomplete de solicitante/responsável)
categoriasEquipamento/{id}    (categorias e modelos de equipamento)
chamados/{chamadoId}
eventos/{eventoId}
inventario/{itemId}
agendamentos/{agendamentoId}
logs/{logId}
```

> **Duas taxonomias de local, propositalmente diferentes:**
> - `predio` em `chamados`/`eventos`/`usuarios` = uma das 7 **unidades**
>   (`UNIDADES` em `web/src/lib/types.ts`: Administrativo, Criminal, Civel,
>   Palacio, Latife, Chamado Externo, SUBCS) — é assim que o app real
>   organiza fila/escala.
> - `predio`/`setor` em `inventario` = o diretório **real e completo** do
>   TJRR (prédios físicos + 289 gabinetes/secretarias), guardado nas
>   coleções `predios`/`setores` e usado só para localizar equipamento.

---

## 1. `usuarios/{uid}`

O `uid` do documento é o `uid` do Firebase Auth. O login não usa e-mail
real — o app gera um e-mail fake a partir do "login" digitado
(`gerarEmailFake` em `web/src/lib/auth.ts`), só para satisfazer o Firebase
Auth.

```ts
type Papel = "ADM" | "TECNICO";
type StatusUsuario = "ONLINE" | "OFFLINE" | "EVENTO" | "ALMOCO" | "INDISPONIVEL";

interface Usuario {
  uid: string;
  login: string;              // usado como e-mail fake e como identificador em todo o app
  nomeCompleto?: string;
  emailContato?: string;
  senha?: string;              // ⚠️ ver nota de segurança abaixo
  perfil: Papel;
  predio: string;              // uma das UNIDADES
  inicio: number;               // hora de início do expediente (0–23)
  saida: number;                // hora de saída do expediente (0–23)
  status: StatusUsuario;
  expoPushToken?: string;      // app mobile (Expo Push) — ver seção Push abaixo
  fcmToken?: string;            // navegador (Firebase Cloud Messaging) — idem
}
```

`status` real (`ONLINE`/`OFFLINE`) é calculado combinando o campo gravado
com o horário de expediente (`statusRealUsuario()` em `types.ts`) — fora do
horário, o usuário aparece OFFLINE mesmo que o campo diga ONLINE.

### Push notification — dois canais

O app original manda push **direto do client** pra API do Expo, passando
por um proxy CORS público (`corsproxy.io`) — funciona, mas depende de um
serviço de terceiro pra tudo. Reconstruído em 12/08/2026 rodando no
servidor (`backend/functions/src/index.ts`), sem proxy:

| Canal | Token gravado em | Quem gera | Quem lê e envia |
|---|---|---|---|
| Expo Push | `usuarios/{uid}.expoPushToken` | App mobile (`mobile/src/lib/push.ts`) | Cloud Functions, direto pra `exp.host` |
| Firebase Cloud Messaging | `usuarios/{uid}.fcmToken` | Painel web (`web/src/lib/push.ts`) | Cloud Functions, via `firebase-admin/messaging` |

Gatilhos automáticos (Firestore → Cloud Functions):
- `chamados` criado → notifica o técnico atribuído, ou todos os técnicos
  da mesma unidade se nasceu na fila.
- `chamados` atualizado e o campo `tecnico` mudou → notifica o novo técnico.
- `eventos` criado → notifica o técnico escalado.

Não precisa chamar nada manualmente: basta o token estar salvo no
documento do usuário que as Functions cuidam do resto.

### ⚠️ Nota de segurança — senha em texto puro

O app original grava `senha` em texto puro no documento `usuarios` (tanto
ao criar conta quanto ao trocar senha) — e usa a mesma senha (`123`) para
todas as contas de demonstração, incluindo o admin. Isso é uma falha grave
num sistema em produção com dados reais.

**Decisão do time em 12/08/2026:** replicar esse comportamento nesta
passada de realinhamento, para manter paridade com o app original — ver
`web/src/lib/dataService.ts` (`registrarUsuario`, `mudarMinhaSenha`), ambos
com `// ⚠️` marcando o ponto exato. **Fica pendente para uma iteração
futura de segurança** remover a gravação de `senha` e trocar todas as
senhas de demonstração.

---

## 2. `predios/{predioId}`, `setores/{setorId}`, `servidores/{servidorId}`, `categoriasEquipamento/{id}`

Diretórios de referência reais do TJRR, usados **só pelo módulo de
Inventário** (autocomplete de prédio/setor/responsável/equipamento).

```ts
interface Predio { id: string; nome: string; ativo: boolean; }
interface Setor { id: string; nome: string; ativo: boolean; }
interface Servidor { nome: string; matricula: string; }
interface CategoriaEquipamento { categoria: string; marcasModelos: string[]; }
```

Seeds reais em `backend/seed/` (predios.json, setores.json,
servidores.json — 1.634 servidores, categorias-equipamento.json), carregados
via `backend/seed/seed-referencia.js`.

---

## 3. `chamados/{chamadoId}`

```ts
type StatusChamado =
  | "Aguardando atendimento"
  | "Em andamento"
  | "Em separação de equipamentos"
  | "Instalado"
  | "finalizado";

type Prioridade = "NORMAL" | "MEDIA" | "ALTA";

interface MensagemHistorico { user: string; texto: string; time: number; }
interface ItemChecklist { id: number; text: string; checked: boolean; }
interface Anexo { id: string; nome: string; uri: string; type: "doc" | "imagem"; }
interface EquipamentoVinculado { nome: string; pat: string; }

interface Chamado {
  id: string;
  titulo: string;
  solicitante: string;
  sala: string;
  descricao: string;
  observacao?: string;
  predio: string;             // uma das UNIDADES
  status: StatusChamado;
  tecnico: string;             // login do técnico; "" = fila
  prioridade: Prioridade;
  dataAbertura: number;
  equipamento?: EquipamentoVinculado | null;
  historico: MensagemHistorico[];   // chat + trilha de auditoria, mais recente primeiro
  anexos?: Anexo[];
  checklist: ItemChecklist[];       // CHECKLIST_PADRAO ao abrir
  abertoPor: string;
}
```

**Fluxo de status:**
```
Aguardando atendimento → Em andamento → Em separação de equipamentos → Instalado → finalizado
```
Um chamado "na fila" tem `tecnico == ""`; qualquer técnico da mesma
unidade pode assumi-lo. **SLA vencido** = mais de 2h aberto sem chegar a um
status final (`slaVencido()` em `types.ts`).

---

## 4. `eventos/{eventoId}`

```ts
type TipoEvento = "INTERNO" | "EXTERNO";

interface Evento {
  id: string;
  nome: string;
  tipo: TipoEvento;
  tecnico: string;
  status: StatusChamado;       // mesmo enum de chamados
  data: number;

  local?: string | null;       // só INTERNO
  ramal?: string | null;
  cliente?: string | null;     // só EXTERNO
  endereco?: string | null;    // só EXTERNO

  solicitante?: string;
  contato?: string;
  material?: string;
  dataInstalacao?: string;
  dataEvento?: string;

  historico: MensagemHistorico[];
  notas?: string;               // preenchido ao concluir
  transporte?: string;          // só EXTERNO, ao concluir
  km?: number;                  // só EXTERNO, ao concluir
}
```

---

## 5. `inventario/{itemId}`

Uma "peça de inventário" representa um **responsável** (pessoa/local) e
agrupa um ou mais equipamentos físicos vinculados a ele.

```ts
interface EquipamentoUnificado {
  id: string;
  tipo: string;                // categoria (Computador, Monitor, CPU, Telefone IP...)
  marca: string;
  tombo: string;                // código de patrimônio
  status: "Disponível" | "Indisponível";
}

interface ItemInventario {
  id: string;
  nome: string;                 // = responsavel, por conveniência de busca
  pat: string;                  // tombo do equipamento principal
  responsavel: string;
  matricula?: string;
  setor: string;                 // diretório real (const.ts SETORES_UNIDADES)
  predio: string;                 // diretório real (const.ts PREDIOS)
  local?: string;                  // Secretária, Gabinete, Sala de Audiência...
  responsavelPeca?: string;        // técnico que fez o levantamento
  cpuMarca?: string;
  cpuTombo?: string;
  equipamentosUnificados: EquipamentoUnificado[];
  emprestadoPara: string | null;
  dataEmprestimo?: number | null;
  dataCadastro: number;
}
```

---

## 6. `agendamentos/{agendamentoId}`

```ts
interface Agendamento {
  id: string;
  data: string;      // "YYYY-MM-DD"
  servico: string;
  hora: string;       // "HH:mm"
  tecnico: string;
  status: string;      // "PENDENTE" no app original
  marcadoPor: string;
}
```

Concluir ou cancelar **apaga** o registro (não muda status) — comportamento
herdado do app original.

---

## 7. `logs/{logId}`

Trilha de auditoria simples, gravada por praticamente toda ação relevante
do sistema (login/logout, criar/editar/excluir chamado, evento, item de
inventário, usuário, troca de senha, mudança de status).

```ts
interface LogEntry {
  id: string;
  mensagem: string;
  usuario: string;
  data: number;
}
```

---

## Por que Firestore e não SQL relacional

- Leitura em tempo real (`onSnapshot`) nativa — essencial para chat,
  histórico e fila de chamados/eventos refletindo instantaneamente entre
  gestor e técnico.
- Integração direta com Firebase Auth.
- Documentos auto-contidos (`equipamentosUnificados`, `historico`,
  `checklist` como arrays embutidos) evitam joins nas telas mais acessadas.
