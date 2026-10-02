# TechGestor TJRR — Web

Site do TechGestor com o visual do Stitch, ligado ao **mesmo Firebase do app** (`techgestor-bd`):
mesmos usuários, chamados, inventário, eventos, agenda e logs.
Vite (multipáginas) + Tailwind CSS 3 + Firebase JS SDK.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run demo     # http://localhost:5175 — dados fictícios, login demo / demo123, sem Firebase
```

Publicado em **https://techgestor-sti.web.app** (site `techgestor-sti` do projeto `techgestor-bd`).
O endereço antigo `techgestor-web.web.app` só redireciona para o novo (pasta `redirecionamento/`).
O site `techgestor-bd.web.app` é do app Expo (e do APK) e não deve ser usado aqui. Para publicar de novo:

```bash
npm run build
NODE_OPTIONS=--use-system-ca firebase deploy --only hosting:web --project techgestor-bd
```

Regras de segurança do Firestore (valem para o app e o site): `firestore.rules`.
Publicar com `firebase deploy --only firestore:rules --project techgestor-bd`.

Criar um usuário real (mesmo formato do app):
`TG_ADMIN=<seu login ADM> TG_ADMIN_SENHA=<sua senha> NODE_OPTIONS=--use-system-ca node scripts/criar-usuario.mjs <login> <senha> "<Nome>" ADM SUBCS`

## Continuar em outro computador

```bash
git clone https://github.com/ELopes00/TechGestor.git
cd TechGestor/web
npm install
npm run dev            # site real (login do Firebase)
npm run demo           # ou: dados fictícios, login demo / demo123
```

Para publicar ou testar regras, instale e entre no Firebase CLI: `npm i -g firebase-tools` e `firebase login`.
Na rede do TJRR, use `NODE_OPTIONS=--use-system-ca` antes dos comandos `firebase` e `node`.

### Pendências (02/10/2026)

- **Regras do Firestore (`firestore.rules`) prontas e testadas, mas NÃO publicadas.** Ao publicar,
  25 contas de login sem cadastro em `usuarios` perdem o acesso (hoje entram como ADM). Antes, decidir
  quais devem continuar e criar o cadastro delas. Testar: `python scripts/testar-regras.py`.
  Publicar: `firebase deploy --only firestore:rules --project techgestor-bd`.
- App (Expo): a exclusão de usuário apaga só o cadastro, não a conta de login; e técnicos deixarão de
  ver todos os logs. Ajustar numa próxima versão do app.

`design/stitch/` guarda as telas originais exportadas do Stitch (HTML + imagem) e o `DESIGN.md`.

## Páginas

| Arquivo | Tela | Dados |
|---|---|---|
| `index.html` | Login (matrícula + senha, igual ao app) | Firebase Auth |
| `dashboard.html` | Indicadores, chamados por hora/prédio, equipe, fila prioritária, CSV | chamados, usuarios |
| `chamados.html` | Fila com filtros/abas, detalhe, novo chamado | chamados |
| `chamado.html?id=` | Conversa oficial + notas internas, ações | chamados |
| `eventos.html` | Cronograma, cadastro, status, conclusão (km p/ externos) | eventos |
| `inventario.html` | Estações, equipamentos, empréstimo, defeito → chamado, prontuário, CSV | inventario |
| `agenda.html` | Calendário de serviços agendados + eventos | agendamentos, eventos |
| `perfil.html` | Status, meus números, troca de senha, tema, atividade | usuarios, logs |
| `admin.html` *(ADM)* | Usuários: cadastro, edição, status, exclusão | usuarios |
| `auditoria.html` *(ADM)* | Trilha de logs ao vivo, filtros, CSV | logs |
| `auditoria-exportacao.html` *(ADM)* | Pacote pericial JSON com SHA-256 e raiz de Merkle | logs |
| `auditoria-integridade.html` *(ADM)* | Verifica um pacote e compara com o banco | logs |
| `auditoria-retencao.html` *(ADM)* | Situação real da retenção e o que falta para WORM | logs |

## Estrutura

- Cada página HTML tem só o conteúdo da tela. A 1ª linha traz os metadados:
  `<!--page id="chamados" nav="chamados" title="Chamados" require="ADM"-->`
  (`require="ADM"` restringe a página a administradores).
- `vite.config.js` aplica o layout (cabeçalho, menu, rodapé de `src/partials/`) e carrega
  automaticamente `src/pages/<id>.js` quando existe.
- `src/lib/` — `firebase.js` (config), `data.js` (coleções, mesmo formato do app), `session.js`
  (login/guarda/logout), `format.js` (status, SLA, protocolo), `ui.js` (diálogos, avisos), `auditoria.js`.
- `src/components/chamado-detalhe.js` — detalhe do chamado usado em `chamados.html` e `chamado.html`.
- `src/theme/palette.js` — paleta clara/escura (variáveis CSS); `style.css` tem os ajustes do modo escuro.
- `scripts/import-stitch.mjs` — importava as telas originais do Stitch. **Não rode com `--force`**:
  sobrescreveria as páginas já adaptadas.

## Observações

- Todas as ações gravam em `logs` como o app faz (com `[Web]` no login/logout).
- Assinatura ICP-Brasil e armazenamento WORM dependem de infraestrutura fora do site (ver `auditoria-retencao.html`).
- Anexos e fotos dos chamados enviados pelo app aparecem pelo nome; só abrem se tiverem URL pública.
