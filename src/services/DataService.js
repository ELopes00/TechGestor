import { deleteApp, getApps, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, EmailAuthProvider, getAuth, onAuthStateChanged, reauthenticateWithCredential, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const gerarEmailFake = (login) => `${login.trim().toLowerCase().replace(/\s+/g, '')}@techgestor.app`;

export const DataService = {
  // --- CHAMADOS ---
  subscribeChamados(callback) {
    const q = query(collection(db, "chamados"), orderBy("dataAbertura", "desc"));
    return onSnapshot(q, (snapshot) => { callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
  },
  async salvarChamado(chamado) { await addDoc(collection(db, "chamados"), { ...chamado, dataAbertura: Date.now() }); },
  async deletarChamado(id) { await deleteDoc(doc(db, "chamados", id)); },
  async atualizarChamado(id, dadosNovos) { await updateDoc(doc(db, "chamados", id), dadosNovos); },

  // --- INVENTÁRIO COM PRONTUÁRIO (AUDITORIA TOTAL) ---
  subscribeInventario(callback) {
    const q = query(collection(db, "inventario"));
    return onSnapshot(q, (snapshot) => { callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
  },
  
  async salvarItemInventario(item, usuarioLogado = "Usuário") { 
    const docRef = await addDoc(collection(db, "inventario"), item); 
    // Registo de nascimento do item
    await this.registrarNoProntuario(docRef.id, "CADASTRO", "Equipamento registrado no sistema.", usuarioLogado);
  },
  
  async deletarItemInventario(id, usuarioLogado = "Usuário") { 
    // Registo no log geral do sistema para evitar perdas fantasmas
    await this.salvarLog(`EXCLUIU ITEM DO INVENTÁRIO (ID: ${id})`, usuarioLogado);
    await deleteDoc(doc(db, "inventario", id)); 
  },
  
  async atualizarItemInventario(id, dadosNovos, usuarioLogado = "Usuário") { 
    // 1. Puxar os dados como estavam ANTES da alteração
    const itemRef = doc(db, "inventario", id);
    const itemSnap = await getDoc(itemRef);
    const dadosAntigos = itemSnap.exists() ? itemSnap.data() : {};

    // 2. Fazer a atualização real no banco de dados
    await updateDoc(itemRef, dadosNovos); 

    // 🧠 O TRADUTOR: Transforma arrays e objetos complexos em texto legível
    const formatarValor = (valor) => {
      if (valor === null || valor === undefined || valor === '') return "vazio";
      if (Array.isArray(valor)) {
        // Se for a lista de equipamentos, pega só o nome e o tombo
        return valor.map(v => v.tombo ? `${v.tipo} (${v.tombo})` : "Item").join(', ');
      }
      if (typeof valor === 'object') return "Dados Complexos";
      return String(valor).trim();
    };

    // 3. O Detetive: varrer os campos e descobrir o que mudou
    let alteracoes = [];
    for (const campo in dadosNovos) {
      if (campo !== 'id' && campo !== 'prontuario' && campo !== 'ultimaAtualizacao') {
        
        // JSON.stringify garante que ele saiba comparar arrays/listas corretamente
        const valAntigoStr = JSON.stringify(dadosAntigos[campo] || "");
        const valNovoStr = JSON.stringify(dadosNovos[campo] || "");

        if (valAntigoStr !== valNovoStr) {
          const textoAntigo = formatarValor(dadosAntigos[campo]);
          const textoNovo = formatarValor(dadosNovos[campo]);
          alteracoes.push(`${campo.toUpperCase()}: de '${textoAntigo}' para '${textoNovo}'`);
        }
      }
    }

    // 4. Se houveram mudanças reais, grava a string no prontuário
    if (alteracoes.length > 0) {
      const detalhesDaMudanca = alteracoes.join(" | ");
      await this.registrarNoProntuario(id, "MODIFICAÇÃO", detalhesDaMudanca, usuarioLogado);
    }
  },

  // --- GESTÃO DO PRONTUÁRIO (SUBCOLEÇÃO) ---
  async registrarNoProntuario(itemId, acao, detalhes, usuario) {
    try {
      const prontuarioRef = collection(db, "inventario", itemId, "prontuario");
      await addDoc(prontuarioRef, {
        acao: acao,
        detalhes: detalhes,
        usuario: usuario,
        data: Date.now()
      });
    } catch (error) {
      console.log("Erro ao registrar no prontuário: ", error);
    }
  },

  async limparProntuarioItem(itemId, usuarioLogado) {
    try {
      const prontuarioRef = collection(db, "inventario", itemId, "prontuario");
      const snapshot = await getDocs(prontuarioRef);
      
      const promessas = snapshot.docs.map(docSnap => deleteDoc(doc(db, "inventario", itemId, "prontuario", docSnap.id)));
      
      await Promise.all(promessas);

      await this.registrarNoProntuario(itemId, "LIMPEZA DE SISTEMA", "O histórico antigo foi apagado permanentemente.", usuarioLogado);
      await this.salvarLog(`LIMPOU O PRONTUÁRIO DO ITEM ID: ${itemId}`, usuarioLogado);
    } catch (error) {
      console.log("Erro ao limpar prontuário:", error);
    }
  },

  subscribeProntuarioItem(itemId, callback) {
    const q = query(collection(db, "inventario", itemId, "prontuario"), orderBy("data", "desc"));
    return onSnapshot(q, (snapshot) => { 
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); 
    });
  },

  // --- EVENTOS ---
  subscribeEventos(callback) {
    const q = query(collection(db, "eventos"), orderBy("data", "desc"));
    return onSnapshot(q, (snapshot) => { callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
  },
  async salvarEvento(evento) { await addDoc(collection(db, "eventos"), { ...evento, data: Date.now() }); },
  async deletarEvento(id) { await deleteDoc(doc(db, "eventos", id)); },
  async atualizarEvento(id, dadosNovos) { await updateDoc(doc(db, "eventos", id), dadosNovos); },

  // --- AGENDAMENTOS ---
  subscribeAgendamentos(callback) {
    const q = query(collection(db, "agendamentos"));
    return onSnapshot(q, (snapshot) => { callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
  },
  async salvarAgendamento(agendamento) { await addDoc(collection(db, "agendamentos"), { ...agendamento, criadoEm: Date.now() }); },
  async deletarAgendamento(id) { await deleteDoc(doc(db, "agendamentos", id)); },
  async atualizarAgendamento(id, dadosNovos) { await updateDoc(doc(db, "agendamentos", id), dadosNovos); },

  // --- AUTH E USUÁRIOS COM AUDITORIA TOTAL ---
  observarAuth(callback) { return onAuthStateChanged(auth, callback); },
  
  async login(loginUsuario, senha) {
    const emailFormatado = gerarEmailFake(loginUsuario);
    const cred = await signInWithEmailAndPassword(auth, emailFormatado, senha);
    
    // VERIFICAÇÃO DE EXPEDIENTE PARA AUDITORIA
    const userDoc = await getDoc(doc(db, "usuarios", cred.user.uid));
    const dados = userDoc.data() || {};

    const horaAtual = new Date().getHours();
    const inicio = dados.inicio || 8;
    const saida = dados.saida || 17;
    
    let noHorario = false;
    if (inicio < saida) {
      noHorario = horaAtual >= inicio && horaAtual < saida;
    } else {
      noHorario = horaAtual >= inicio || horaAtual < saida;
    }

    const statusFinal = noHorario ? 'ONLINE' : 'OFFLINE';
    const msgLog = noHorario 
      ? `LOGOU NO SISTEMA (Dentro do expediente)` 
      : `ALERTA: LOGOU NO SISTEMA FORA DO EXPEDIENTE (${horaAtual}h)`;

    await this.salvarLog(msgLog, dados.login || loginUsuario);
    await updateDoc(doc(db, "usuarios", cred.user.uid), { status: statusFinal });
    
    return cred.user;
  },
  
  async registrar(loginUsuario, senha, nomeCompleto, perfil, predio, emailOpcional, inicio, saida, nivel = null) {
    const emailFormatado = gerarEmailFake(loginUsuario);
    
    const firebaseConfig = {
      apiKey: "AIzaSyBpgjmA9h1yuExOKxCAbQBy7NYdH9PerJs",
      authDomain: "techgestor-bd.firebaseapp.com",
      projectId: "techgestor-bd",
      storageBucket: "techgestor-bd.firebasestorage.app",
      messagingSenderId: "1020969618268",
      appId: "1:1020969618268:web:afa267b785caaff9f58f99"
    };

    const apps = getApps();
    let appTemporario = apps.find(a => a.name === "AppCadastroTemporario");
    
    if (!appTemporario) {
      appTemporario = initializeApp(firebaseConfig, "AppCadastroTemporario");
    }
    
    const authTemporario = getAuth(appTemporario);
    const userCred = await createUserWithEmailAndPassword(authTemporario, emailFormatado, senha);
    
    await setDoc(doc(db, "usuarios", userCred.user.uid), {
      login: loginUsuario, senha: senha, nomeCompleto, emailContato: emailOpcional,
      perfil, predio, inicio, saida, nivel: nivel || null, status: 'ONLINE', uid: userCred.user.uid
    });

    await this.salvarLog(`CRIOU NOVO USUÁRIO: ${loginUsuario} (${perfil})`, "ADMINISTRADOR");
    await deleteApp(appTemporario);

    return userCred.user;
  },
  
  async logout() {
    if (auth.currentUser) {
      const userDoc = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
      const nome = userDoc.data()?.login || "Usuário";
      
      await this.salvarLog(`SAIU DO SISTEMA (Logout)`, nome);
      await updateDoc(doc(db, "usuarios", auth.currentUser.uid), { status: 'OFFLINE' });
    }
    await signOut(auth);
  },

  async mudarMinhaSenha(senhaAtual, novaSenha) {
    const user = auth.currentUser;
    if (!user) return { sucesso: false, erro: "Usuário não logado" };

    try {
      const cred = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, novaSenha);
      await updateDoc(doc(db, "usuarios", user.uid), { senha: novaSenha });

      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      const nome = userDoc.data()?.login || user.email;

      await this.salvarLog("ALTEROU A PRÓPRIA SENHA", nome);
      return { sucesso: true };
    } catch (error) {
      console.log("Erro ao mudar senha:", error);
      return { sucesso: false, erro: error.code };
    }
  },

  subscribeUsuarios(callback) {
    const q = query(collection(db, "usuarios"));
    return onSnapshot(q, (snapshot) => { callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
  },
  
  async atualizarUsuario(uid, dadosNovos) { 
    if (dadosNovos.status) {
      const userDoc = await getDoc(doc(db, "usuarios", uid));
      const nome = userDoc.data()?.login || "Usuário";
      await this.salvarLog(`ALTEROU STATUS PARA: ${dadosNovos.status}`, nome);
    }
    await updateDoc(doc(db, "usuarios", uid), dadosNovos); 
  },

  async deletarUsuario(uid) { 
    await this.salvarLog(`EXCLUIU UM USUÁRIO DO SISTEMA (ID: ${uid})`, "ADMINISTRADOR");
    await deleteDoc(doc(db, "usuarios", uid)); 
  },

  // --- NOTIFICAÇÕES PUSH REAIS ---
  async salvarPushToken(uid, token) {
    try {
      await updateDoc(doc(db, "usuarios", uid), { expoPushToken: token });
    } catch (e) { console.log("Erro Push Token:", e); }
  },

  async enviarPushNotification(expoPushToken, title, body) {
    if (!expoPushToken) return;
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: { sistema: 'TechGestor' },
      channelId: 'default',
    };
    
    const proxyUrl = 'https://corsproxy.io/?';
    const expoUrl = 'https://exp.host/--/api/v2/push/send';

    try {
      await fetch(proxyUrl + encodeURIComponent(expoUrl), {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
    } catch (e) {
      console.log("Erro ao enviar notificação: ", e);
    }
  },

  // --- LOGS E AUDITORIA ---
  async salvarLog(mensagem, usuarioLogado) {
    try {
      await addDoc(collection(db, "logs"), {
        mensagem: mensagem,
        usuario: usuarioLogado || 'SISTEMA',
        data: Date.now()
      });
    } catch (error) {
      console.log("Erro ao salvar log: ", error);
    }
  },

  subscribeLogs(callback) {
    const q = query(collection(db, "logs"), orderBy("data", "desc"));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).slice(0, 150));
    });
  }
};