export default class EscalaService {
  static definirTecnico(setor, listaChamadosGeral, listaUsuarios) {
    const horaAtual = new Date().getHours();
    const hojeStr = new Date().toLocaleDateString();

    // 1. FILTRA TÉCNICOS PELO SETOR
    let poolTecnicos = listaUsuarios.filter((u) => u.perfil === 'TECNICO');

    if (setor !== 'Chamado Externo') {
      poolTecnicos = poolTecnicos.filter((u) => u.predio === setor);
    }

    // 2. FILTRA POR HORÁRIO DE INÍCIO
    let disponiveis = poolTecnicos.filter((tec) => {
      const inicioTec = tec.inicio || 8;
      return horaAtual >= inicioTec;
    });

    // 3. FILTRA POR STATUS ONLINE
    disponiveis = disponiveis.filter((tec) => tec.status === 'ONLINE');

    if (disponiveis.length === 0)
      return {
        erro: `Nenhum técnico disponível para ${setor} (Horário, Predio ou Offline).`,
      };

    // 4. LÓGICA DE BALANCEAMENTO
    const cargaDeTrabalho = disponiveis.map((tec) => {
      const chamadosDoTecnico = listaChamadosGeral.filter(
        (c) =>
          c.tecnico === tec.login &&
          new Date(c.dataAbertura).toLocaleDateString() === hojeStr
      );

      const qtdHoje = chamadosDoTecnico.length;

      let ultimoChamadoTime = 0;
      if (qtdHoje > 0) {
        const ultimos = chamadosDoTecnico.sort(
          (a, b) => b.dataAbertura - a.dataAbertura
        );
        ultimoChamadoTime = ultimos[0].dataAbertura;
      }

      return {
        nome: tec.login,
        qtd: qtdHoje,
        ultimo: ultimoChamadoTime,
      };
    });

    cargaDeTrabalho.sort((a, b) => {
      if (a.qtd === b.qtd) {
        return a.ultimo - b.ultimo;
      }
      return a.qtd - b.qtd;
    });

    return { nome: cargaDeTrabalho[0].nome, erro: null };
  }
}