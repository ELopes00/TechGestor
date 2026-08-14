/**
 * Popula as coleções de REFERÊNCIA do TechGestor 2.0 (predios, setores,
 * categoriasEquipamento e servidores) a partir das listas reais usadas
 * hoje pelo TJRR.
 *
 * `servidores` é só um diretório de consulta (nome + matrícula) para
 * autocompletar o campo "solicitante" de um chamado — NÃO cria conta de
 * login. Contas reais (gestor/técnico) exigem e-mail e devem ser criadas
 * via Firebase Auth (convite), nunca com senha fixa/compartilhada — ver
 * `backend/seed/tecnicos.json` para a lista de nomes a convidar.
 *
 * Uso:
 *   npm install firebase-admin
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node seed-referencia.js
 *
 * Idempotente: usa o próprio texto como ID do documento (slug), então
 * rodar de novo apenas sobrescreve os mesmos registros, sem duplicar.
 */
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const predios = require("./predios.json");
const setores = require("./setores.json");
const categoriasEquipamento = require("./categorias-equipamento.json");
const servidores = require("./servidores.json");

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

function slug(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

async function seedLista(colecao, itens, paraDoc) {
  const batchSize = 400; // limite de 500 escritas por batch no Firestore
  for (let i = 0; i < itens.length; i += batchSize) {
    const lote = itens.slice(i, i + batchSize);
    const batch = db.batch();
    for (const item of lote) {
      const { id, dado } = paraDoc(item);
      batch.set(db.collection(colecao).doc(id), dado, { merge: true });
    }
    await batch.commit();
    console.log(`${colecao}: ${Math.min(i + batchSize, itens.length)}/${itens.length}`);
  }
}

async function main() {
  await seedLista("predios", predios, (nome) => ({
    id: slug(nome),
    dado: { nome, ativo: true },
  }));

  await seedLista("setores", setores, (nome) => ({
    id: slug(nome),
    dado: { nome, ativo: true },
  }));

  await seedLista("categoriasEquipamento", categoriasEquipamento, (item) => ({
    id: slug(item.categoria),
    dado: item,
  }));

  await seedLista("servidores", servidores, (item) => ({
    id: item.matricula ? item.matricula : slug(item.nome),
    dado: item,
  }));

  console.log("Seed de referência concluído.");
  console.log(
    `Lembrete: ${require("./tecnicos.json").length} técnicos em tecnicos.json ` +
      "ainda precisam de convite por e-mail via Firebase Auth para virarem login de verdade."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
