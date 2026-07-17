"use client";

import { useEffect, useMemo, useState } from "react";
import "./loja-premios.css";

type PropostaCompraDivida = {
  id: string;
  cliente: string;
  vendedora: string;
  tabela: string;
  valorContrato: number;
  valorMeta?: number;
  percentualTabela?: number;
  status: string;
  dataCadastro: string;
  dataPagamento: string;
};

type RegistroClt = {
  id: string;
  nome: string;
  consultora: string;
  parcela: number;
  status: string;
  criadoEm: string;
  atualizadoEm: string;
  dataPagamento?: string;
};

type UsuarioSalvo = {
  id?: string;
  nome?: string;
  email?: string;
  matricula?: string;
  perfil?: string;
  cargo?: string;
};

type StatusSaque = "Solicitado" | "Aprovado" | "Pago" | "Recusado";

type SolicitacaoSaque = {
  id: string;
  consultora: string;
  competencia: string;
  pontos: number;
  pontosCompra?: number;
  pontosClt?: number;
  premioCompra: number;
  premioClt: number;
  valorTotal: number;
  chavePix?: string;
  status: StatusSaque;
  solicitadoEm: string;
  atualizadoEm: string;
  pagoEm?: string;
};

type FaixaPremiacao = {
  meta: number;
  percentualCompra: number;
  premiacaoClt: number;
  nome: string;
};

type MovimentoPontos = {
  id: string;
  produto: "Compra de Dívida" | "CLT";
  descricao: string;
  pontos: number;
  data: string;
};

type ResumoConsultora = {
  nome: string;
  pontosCompra: number;
  pontosClt: number;
  pontosTotal: number;
  faixa: FaixaPremiacao | null;
  premioCompra: number;
  premioClt: number;
  premioTotal: number;
  movimentos: MovimentoPontos[];
};

const META_MINIMA = 30000;

const TABELAS_COMPRA_DIVIDA = [
  { nome: "NEO NORMAL", percentual: 100 },
  { nome: "NEO FLEX 1", percentual: 82 },
  { nome: "NEO FLEX 2", percentual: 67 },
  { nome: "NEO FLEX 4", percentual: 37 },
  { nome: "NEO FLEX 5", percentual: 17 },
];

const FAIXAS_PREMIACAO: FaixaPremiacao[] = [
  { meta: 30000, percentualCompra: 1.5, premiacaoClt: 300, nome: "Faixa 1" },
  { meta: 40000, percentualCompra: 2, premiacaoClt: 400, nome: "Faixa 2" },
  { meta: 50000, percentualCompra: 2.05, premiacaoClt: 600, nome: "Faixa 3" },
  { meta: 60000, percentualCompra: 2.1, premiacaoClt: 800, nome: "Faixa 4" },
  { meta: 70000, percentualCompra: 2.3, premiacaoClt: 2000, nome: "Faixa 5" },
  { meta: 80000, percentualCompra: 2.5, premiacaoClt: 2500, nome: "Faixa 6" },
  { meta: 90000, percentualCompra: 2.7, premiacaoClt: 2700, nome: "Faixa 7" },
  { meta: 100000, percentualCompra: 3, premiacaoClt: 3500, nome: "Faixa 8" },
  { meta: 110000, percentualCompra: 3, premiacaoClt: 3200, nome: "Faixa 8" },
  { meta: 120000, percentualCompra: 3.05, premiacaoClt: 3400, nome: "Faixa 9" },
  { meta: 130000, percentualCompra: 3.05, premiacaoClt: 3600, nome: "Faixa 9" },
  { meta: 140000, percentualCompra: 3.1, premiacaoClt: 3800, nome: "Faixa 10" },
  { meta: 150000, percentualCompra: 3.1, premiacaoClt: 5000, nome: "Faixa 10" },
  { meta: 160000, percentualCompra: 3.15, premiacaoClt: 5000, nome: "Faixa 11" },
  { meta: 180000, percentualCompra: 3.2, premiacaoClt: 5000, nome: "Faixa 12" },
  { meta: 200000, percentualCompra: 3.25, premiacaoClt: 5000, nome: "Faixa 13" },
  { meta: 220000, percentualCompra: 3.3, premiacaoClt: 5000, nome: "Faixa 14" },
  { meta: 240000, percentualCompra: 3.35, premiacaoClt: 5000, nome: "Faixa 15" },
  { meta: 260000, percentualCompra: 3.4, premiacaoClt: 5000, nome: "Faixa 16" },
  { meta: 280000, percentualCompra: 3.45, premiacaoClt: 5000, nome: "Faixa 17" },
  { meta: 300000, percentualCompra: 3.5, premiacaoClt: 5000, nome: "Faixa 18" },
  { meta: 320000, percentualCompra: 3.55, premiacaoClt: 5000, nome: "Faixa 19" },
  { meta: 340000, percentualCompra: 3.6, premiacaoClt: 5000, nome: "Faixa 20" },
  { meta: 360000, percentualCompra: 3.65, premiacaoClt: 5000, nome: "Faixa 21" },
  { meta: 380000, percentualCompra: 3.7, premiacaoClt: 5000, nome: "Faixa 22" },
  { meta: 400000, percentualCompra: 3.75, premiacaoClt: 5000, nome: "Faixa 23" },
  { meta: 420000, percentualCompra: 3.8, premiacaoClt: 5000, nome: "Faixa 24" },
  { meta: 440000, percentualCompra: 3.85, premiacaoClt: 5000, nome: "Faixa 25" },
  { meta: 460000, percentualCompra: 3.9, premiacaoClt: 5000, nome: "Faixa 26" },
  { meta: 480000, percentualCompra: 3.95, premiacaoClt: 5000, nome: "Faixa 27" },
  { meta: 500000, percentualCompra: 4, premiacaoClt: 5000, nome: "Faixa 28" },
];

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function pontos(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function porcentagem(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function chaveMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function competenciaAtual() {
  return chaveMes(new Date());
}

function converterData(valor: string) {
  if (!valor) return null;

  const iso = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const brasileira = String(valor).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (brasileira) {
    return new Date(
      Number(brasileira[3]),
      Number(brasileira[2]) - 1,
      Number(brasileira[1])
    );
  }

  const tentativa = new Date(valor);
  return Number.isNaN(tentativa.getTime()) ? null : tentativa;
}

function perfilEhAdministracao(perfil: string) {
  const texto = normalizarTexto(perfil);

  return (
    texto.includes("administrador") ||
    texto.includes("administradora") ||
    texto === "admin"
  );
}

function perfilSemAcesso(perfil: string) {
  const texto = normalizarTexto(perfil);

  return texto.includes("operacional") || texto.includes("supervisor");
}

function perfilEhVendedora(perfil: string) {
  const texto = normalizarTexto(perfil);

  return (
    texto.includes("consultor") ||
    texto.includes("consultora") ||
    texto.includes("vendedor") ||
    texto.includes("vendedora")
  );
}

function tabelaPeloNome(nome: string) {
  const tabelaNormalizada = normalizarTexto(nome);

  return TABELAS_COMPRA_DIVIDA.find((item) => {
    const nomeNormalizado = normalizarTexto(item.nome);

    return (
      tabelaNormalizada === nomeNormalizado ||
      tabelaNormalizada.startsWith(nomeNormalizado)
    );
  });
}

function percentualDaTabela(proposta: PropostaCompraDivida) {
  const tabela = tabelaPeloNome(proposta.tabela);

  if (tabela) return tabela.percentual;

  const percentualNoNome = String(proposta.tabela || "").match(
    /(\d+(?:[.,]\d+)?)\s*%/
  );

  if (percentualNoNome) {
    const valor = Number(percentualNoNome[1].replace(",", "."));
    if (Number.isFinite(valor)) return valor;
  }

  const salvo = Number(proposta.percentualTabela || 0);
  const permitido = TABELAS_COMPRA_DIVIDA.some(
    (item) => Math.abs(item.percentual - salvo) < 0.01
  );

  return permitido ? salvo : 0;
}

function valorValidoCompra(proposta: PropostaCompraDivida) {
  const valorMeta = Number(proposta.valorMeta || 0);

  if (valorMeta > 0) return valorMeta;

  return (
    Number(proposta.valorContrato || 0) *
    (percentualDaTabela(proposta) / 100)
  );
}

function competenciaCompra(proposta: PropostaCompraDivida) {
  const digitacao = converterData(proposta.dataCadastro);
  const pagamento = converterData(proposta.dataPagamento);

  if (!pagamento) return null;
  if (!digitacao) return chaveMes(pagamento);

  const limite = new Date(
    digitacao.getFullYear(),
    digitacao.getMonth() + 1,
    19,
    23,
    59,
    59
  );

  return pagamento <= limite ? chaveMes(digitacao) : chaveMes(pagamento);
}

function dataClt(registro: RegistroClt) {
  return converterData(
    registro.dataPagamento || registro.atualizadoEm || registro.criadoEm
  );
}

function faixaDaProducao(total: number) {
  if (total < META_MINIMA) return null;

  return (
    FAIXAS_PREMIACAO.filter((faixa) => total >= faixa.meta).at(-1) || null
  );
}

function nomeMes(competencia: string) {
  const [ano, mes] = competencia.split("-").map(Number);

  if (!ano || !mes) return competencia;

  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function dataAgora() {
  return new Date().toLocaleString("pt-BR");
}

export default function LojaPremiosManager() {
  const [propostas, setPropostas] = useState<PropostaCompraDivida[]>([]);
  const [registrosClt, setRegistrosClt] = useState<RegistroClt[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSalvo[]>([]);
  const [saques, setSaques] = useState<SolicitacaoSaque[]>([]);
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [nomeLogado, setNomeLogado] = useState("");
  const [perfilLogado, setPerfilLogado] = useState("");
  const [consultoraSelecionada, setConsultoraSelecionada] = useState("");
  const [carregado, setCarregado] = useState(false);
  const [mostrarFormularioPix, setMostrarFormularioPix] = useState(false);
  const [chavePix, setChavePix] = useState("");
  const [erroPix, setErroPix] = useState("");

  function carregar() {
    try {
      const propostasSalvas = JSON.parse(
        localStorage.getItem("somos-eleva-propostas") || "[]"
      );

      setPropostas(Array.isArray(propostasSalvas) ? propostasSalvas : []);
    } catch {
      setPropostas([]);
    }

    try {
      const cltSalvos = JSON.parse(
        localStorage.getItem("somos-eleva-clt") || "[]"
      );

      setRegistrosClt(Array.isArray(cltSalvos) ? cltSalvos : []);
    } catch {
      setRegistrosClt([]);
    }

    let listaUsuarios: UsuarioSalvo[] = [];

    try {
      const usuariosSalvos = JSON.parse(
        localStorage.getItem("somos-eleva-usuarios") || "[]"
      );

      listaUsuarios = Array.isArray(usuariosSalvos) ? usuariosSalvos : [];
      setUsuarios(listaUsuarios);
    } catch {
      setUsuarios([]);
    }

    try {
      const saquesSalvos = JSON.parse(
        localStorage.getItem("somos-eleva-saques-premios") || "[]"
      );

      setSaques(Array.isArray(saquesSalvos) ? saquesSalvos : []);
    } catch {
      setSaques([]);
    }

    const login = localStorage.getItem("somos-eleva-usuario") || "";
    const matricula =
      localStorage.getItem("somos-eleva-matricula") || login;

    const usuario = listaUsuarios.find((item) => {
      return (
        String(item.id || "") === login ||
        String(item.matricula || "") === login ||
        String(item.matricula || "") === matricula ||
        normalizarTexto(item.email || "") === normalizarTexto(login)
      );
    });

    const nome =
      usuario?.nome?.trim() ||
      localStorage.getItem("somos-eleva-nome")?.trim() ||
      "";

    const perfil =
      usuario?.perfil?.trim() ||
      usuario?.cargo?.trim() ||
      localStorage.getItem("somos-eleva-cargo")?.trim() ||
      "Consultora";

    setNomeLogado(nome);
    setPerfilLogado(perfil);
    setCarregado(true);
  }

  useEffect(() => {
    carregar();

    const intervalo = window.setInterval(carregar, 3000);
    window.addEventListener("storage", carregar);
    window.addEventListener("focus", carregar);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("storage", carregar);
      window.removeEventListener("focus", carregar);
    };
  }, []);

  const ehAdmin = perfilEhAdministracao(perfilLogado);
  const acessoNegado = perfilSemAcesso(perfilLogado);

  const nomesConsultoras = useMemo(() => {
    const mapa = new Map<string, string>();

    usuarios
      .filter((usuario) =>
        perfilEhVendedora(usuario.perfil || usuario.cargo || "")
      )
      .forEach((usuario) => {
        const nome = usuario.nome?.trim();
        if (nome) mapa.set(normalizarTexto(nome), nome);
      });

    propostas.forEach((proposta) => {
      const nome = proposta.vendedora?.trim();
      if (nome) mapa.set(normalizarTexto(nome), nome);
    });

    registrosClt.forEach((registro) => {
      const nome = registro.consultora?.trim();
      if (nome) mapa.set(normalizarTexto(nome), nome);
    });

    if (!ehAdmin && nomeLogado) {
      mapa.set(normalizarTexto(nomeLogado), nomeLogado);
    }

    return Array.from(mapa.values()).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }, [usuarios, propostas, registrosClt, ehAdmin, nomeLogado]);

  useEffect(() => {
    if (!carregado) return;

    if (!ehAdmin) {
      setConsultoraSelecionada(nomeLogado);
      return;
    }

    if (
      !consultoraSelecionada ||
      !nomesConsultoras.some(
        (nome) =>
          normalizarTexto(nome) === normalizarTexto(consultoraSelecionada)
      )
    ) {
      setConsultoraSelecionada(nomesConsultoras[0] || "");
    }
  }, [
    carregado,
    ehAdmin,
    nomeLogado,
    nomesConsultoras,
    consultoraSelecionada,
  ]);

  const resumos = useMemo(() => {
    return nomesConsultoras.map<ResumoConsultora>((nome) => {
      const chave = normalizarTexto(nome);

      const propostasDaConsultora = propostas.filter((proposta) => {
        return (
          proposta.status === "Pago" &&
          normalizarTexto(proposta.vendedora) === chave &&
          competenciaCompra(proposta) === competencia
        );
      });

      const cltDaConsultora = registrosClt.filter((registro) => {
        const data = dataClt(registro);

        return (
          registro.status === "Pago" &&
          normalizarTexto(registro.consultora) === chave &&
          Boolean(data) &&
          chaveMes(data as Date) === competencia
        );
      });

      const pontosCompraBrutos = propostasDaConsultora.reduce(
        (total, proposta) => total + valorValidoCompra(proposta),
        0
      );

      const pontosCltBrutos = cltDaConsultora.reduce(
        (total, registro) => total + Number(registro.parcela || 0),
        0
      );

      const saquesPagos = saques.filter(
        (saque) =>
          saque.status === "Pago" &&
          saque.competencia === competencia &&
          normalizarTexto(saque.consultora) === chave
      );

      const pontosCompraPagos = saquesPagos.reduce(
        (total, saque) => total + Number(saque.pontosCompra || 0),
        0
      );

      const pontosCltPagos = saquesPagos.reduce(
        (total, saque) => total + Number(saque.pontosClt || 0),
        0
      );

      const pontosAntigosSemDivisao = saquesPagos.reduce((total, saque) => {
        const temDivisao =
          Number(saque.pontosCompra || 0) > 0 ||
          Number(saque.pontosClt || 0) > 0;

        return temDivisao ? total : total + Number(saque.pontos || 0);
      }, 0);

      let pontosCompra = Math.max(
        pontosCompraBrutos - pontosCompraPagos,
        0
      );

      let pontosClt = Math.max(
        pontosCltBrutos - pontosCltPagos,
        0
      );

      if (pontosAntigosSemDivisao > 0) {
        const totalAntesDoDesconto = pontosCompra + pontosClt;

        if (totalAntesDoDesconto > 0) {
          const parteCompra = pontosCompra / totalAntesDoDesconto;
          const descontoCompra = pontosAntigosSemDivisao * parteCompra;
          const descontoClt = pontosAntigosSemDivisao - descontoCompra;

          pontosCompra = Math.max(pontosCompra - descontoCompra, 0);
          pontosClt = Math.max(pontosClt - descontoClt, 0);
        }
      }

      const pontosTotal = pontosCompra + pontosClt;
      const faixa = faixaDaProducao(pontosTotal);

      const premioCompra =
        faixa && pontosCompra > 0
          ? pontosCompra * (faixa.percentualCompra / 100)
          : 0;

      const premioClt =
        faixa && pontosClt > 0 ? faixa.premiacaoClt : 0;

      const movimentosCompra: MovimentoPontos[] = propostasDaConsultora.map(
        (proposta) => ({
          id: `compra-${proposta.id}`,
          produto: "Compra de Dívida",
          descricao: proposta.cliente || "Contrato pago",
          pontos: valorValidoCompra(proposta),
          data: proposta.dataPagamento || proposta.dataCadastro,
        })
      );

      const movimentosClt: MovimentoPontos[] = cltDaConsultora.map(
        (registro) => ({
          id: `clt-${registro.id}`,
          produto: "CLT",
          descricao: registro.nome || "Contrato CLT pago",
          pontos: Number(registro.parcela || 0),
          data:
            registro.dataPagamento ||
            registro.atualizadoEm ||
            registro.criadoEm,
        })
      );

      const movimentos = [...movimentosCompra, ...movimentosClt].sort(
        (a, b) => {
          const dataA = converterData(a.data)?.getTime() || 0;
          const dataB = converterData(b.data)?.getTime() || 0;
          return dataB - dataA;
        }
      );

      return {
        nome,
        pontosCompra,
        pontosClt,
        pontosTotal,
        faixa,
        premioCompra,
        premioClt,
        premioTotal: premioCompra + premioClt,
        movimentos,
      };
    });
  }, [nomesConsultoras, propostas, registrosClt, competencia, saques]);

  const resumoAtual = useMemo(() => {
    const chave = normalizarTexto(consultoraSelecionada);

    return (
      resumos.find((item) => normalizarTexto(item.nome) === chave) || {
        nome: consultoraSelecionada || nomeLogado || "Consultora",
        pontosCompra: 0,
        pontosClt: 0,
        pontosTotal: 0,
        faixa: null,
        premioCompra: 0,
        premioClt: 0,
        premioTotal: 0,
        movimentos: [],
      }
    );
  }, [resumos, consultoraSelecionada, nomeLogado]);

  const solicitacoesDaCompetencia = useMemo(() => {
    return saques
      .filter((saque) => saque.competencia === competencia)
      .sort((a, b) => b.solicitadoEm.localeCompare(a.solicitadoEm));
  }, [saques, competencia]);

  const solicitacoesDaConsultora = useMemo(() => {
    const chave = normalizarTexto(resumoAtual.nome);

    return saques.filter(
      (saque) =>
        saque.competencia === competencia &&
        normalizarTexto(saque.consultora) === chave
    );
  }, [saques, competencia, resumoAtual.nome]);

  const solicitacaoAtual = useMemo(() => {
    return solicitacoesDaConsultora.at(-1);
  }, [solicitacoesDaConsultora]);

  const solicitacaoPendente = useMemo(() => {
    return [...solicitacoesDaConsultora]
      .reverse()
      .find(
        (saque) =>
          saque.status === "Solicitado" ||
          saque.status === "Aprovado"
      );
  }, [solicitacoesDaConsultora]);

  const ultimoSaquePago = useMemo(() => {
    return [...solicitacoesDaConsultora]
      .reverse()
      .find((saque) => saque.status === "Pago");
  }, [solicitacoesDaConsultora]);

  useEffect(() => {
    setMostrarFormularioPix(false);
    setChavePix("");
    setErroPix("");
  }, [competencia, consultoraSelecionada, nomeLogado]);

  const faltaParaMeta = Math.max(META_MINIMA - resumoAtual.pontosTotal, 0);

  const progresso = Math.min(
    100,
    Math.max(0, (resumoAtual.pontosTotal / META_MINIMA) * 100)
  );

  const podeSolicitar =
    !ehAdmin &&
    !acessoNegado &&
    Boolean(resumoAtual.faixa) &&
    resumoAtual.premioTotal > 0 &&
    !solicitacaoPendente;

  function salvarSaques(novosSaques: SolicitacaoSaque[]) {
    setSaques(novosSaques);
    localStorage.setItem(
      "somos-eleva-saques-premios",
      JSON.stringify(novosSaques)
    );
  }

  function abrirFormularioSaque() {
    if (!podeSolicitar) return;

    setErroPix("");
    setMostrarFormularioPix(true);
  }

  function cancelarFormularioSaque() {
    setMostrarFormularioPix(false);
    setChavePix("");
    setErroPix("");
  }

  function solicitarSaque() {
    if (!podeSolicitar) return;

    const pixLimpo = chavePix.trim();

    if (pixLimpo.length < 3) {
      setErroPix("Informe uma chave PIX válida.");
      return;
    }

    const novaSolicitacao: SolicitacaoSaque = {
      id: crypto.randomUUID(),
      consultora: resumoAtual.nome,
      competencia,
      pontos: resumoAtual.pontosTotal,
      pontosCompra: resumoAtual.pontosCompra,
      pontosClt: resumoAtual.pontosClt,
      premioCompra: resumoAtual.premioCompra,
      premioClt: resumoAtual.premioClt,
      valorTotal: resumoAtual.premioTotal,
      chavePix: pixLimpo,
      status: "Solicitado",
      solicitadoEm: dataAgora(),
      atualizadoEm: dataAgora(),
    };

    salvarSaques([...saques, novaSolicitacao]);
    setMostrarFormularioPix(false);
    setChavePix("");
    setErroPix("");
  }

  function atualizarSolicitacao(
    id: string,
    status: "Pago" | "Recusado"
  ) {
    if (status === "Pago") {
      const confirmou = window.confirm(
        "Confirma que o PIX já foi pago? Depois da confirmação, os pontos deste saque serão retirados do saldo da consultora."
      );

      if (!confirmou) return;
    }

    const agora = dataAgora();

    const atualizados = saques.map((saque) =>
      saque.id === id
        ? {
            ...saque,
            status,
            atualizadoEm: agora,
            pagoEm: status === "Pago" ? agora : saque.pagoEm,
          }
        : saque
    );

    salvarSaques(atualizados);
  }

  function classeVisualStatus(status: StatusSaque) {
    if (status === "Pago") return "aprovado";
    return status.toLowerCase();
  }

  function textoStatus() {
    if (solicitacaoPendente) return "Aguardando pagamento";

    if (resumoAtual.faixa) return "Disponível para saque";

    if (ultimoSaquePago && resumoAtual.pontosTotal === 0) {
      return "Saque pago";
    }

    if (solicitacaoAtual?.status === "Recusado") {
      return "Bloqueado";
    }

    return "Bloqueado";
  }

  function classeStatus() {
    if (solicitacaoPendente) return "solicitado";
    if (resumoAtual.faixa) return "disponivel";

    if (ultimoSaquePago && resumoAtual.pontosTotal === 0) {
      return "aprovado";
    }

    if (solicitacaoAtual?.status === "Recusado") {
      return "recusado";
    }

    return "bloqueado";
  }

  if (!carregado) {
    return <div className="lp-carregando">Carregando seus pontos...</div>;
  }

  if (acessoNegado) {
    return (
      <section className="lp-sem-acesso">
        <div>🔒</div>
        <h2>Acesso restrito</h2>
        <p>
          A Loja de Prêmios está disponível somente para consultoras e
          administradoras. O perfil {perfilLogado} não pode visualizar
          pontuações ou premiações.
        </p>
      </section>
    );
  }

  return (
    <div className="lp-page">
      <section className="lp-topo">
        <div>
          <span className="lp-etiqueta">LOJA DE PRÊMIOS</span>
          <h2>Transforme sua produção em premiação</h2>
          <p>
            Cada R$ 1,00 de produção válida equivale a 1 ponto. Ao atingir
            30.000 pontos, o saque total da premiação fica disponível.
          </p>
        </div>

        <div className="lp-filtros">
          <label>
            Competência
            <input
              type="month"
              value={competencia}
              onChange={(event) => setCompetencia(event.target.value)}
            />
          </label>

          {ehAdmin && (
            <label>
              Consultora
              <select
                value={consultoraSelecionada}
                onChange={(event) =>
                  setConsultoraSelecionada(event.target.value)
                }
              >
                {nomesConsultoras.length === 0 ? (
                  <option value="">Nenhuma consultora</option>
                ) : (
                  nomesConsultoras.map((nome) => (
                    <option key={nome}>{nome}</option>
                  ))
                )}
              </select>
            </label>
          )}

          <button type="button" onClick={carregar}>
            Atualizar pontos
          </button>
        </div>
      </section>

      <section className="lp-carteira">
        <div className="lp-carteira-principal">
          <div className="lp-identificacao">
            <span>CARTEIRA DE PONTOS</span>
            <h3>{resumoAtual.nome}</h3>
            <small>{nomeMes(competencia)}</small>
          </div>

          <div className="lp-pontos-total">
            <span>Saldo atual</span>
            <strong>{pontos(resumoAtual.pontosTotal)}</strong>
            <small>pontos</small>
          </div>

          <div className={`lp-status ${classeStatus()}`}>
            {textoStatus()}
          </div>
        </div>

        <div className="lp-progresso-area">
          <div className="lp-progresso-texto">
            <span>Progresso para ativar a meta</span>
            <strong>{porcentagem(progresso)}%</strong>
          </div>

          <div className="lp-progresso-barra">
            <i style={{ width: `${progresso}%` }} />
          </div>

          <div className="lp-progresso-rodape">
            <span>0 pontos</span>
            <span>Meta: 30.000 pontos</span>
          </div>

          {!resumoAtual.faixa ? (
            <p className="lp-falta">
              Faltam <strong>{pontos(faltaParaMeta)} pontos</strong> para
              liberar o saque.
            </p>
          ) : (
            <p className="lp-meta-ativa">
              Meta ativada: <strong>{resumoAtual.faixa.nome}</strong>
            </p>
          )}
        </div>
      </section>

      <section className="lp-resumo-grid">
        <article>
          <div className="lp-icone compra">⇄</div>
          <div>
            <span>Pontos — Compra de Dívida</span>
            <strong>{pontos(resumoAtual.pontosCompra)}</strong>
          </div>
        </article>

        <article>
          <div className="lp-icone clt">▣</div>
          <div>
            <span>Pontos — CLT</span>
            <strong>{pontos(resumoAtual.pontosClt)}</strong>
          </div>
        </article>

        <article>
          <div className="lp-icone premio">◆</div>
          <div>
            <span>Prêmio da Compra</span>
            <strong>{moeda(resumoAtual.premioCompra)}</strong>
          </div>
        </article>

        <article>
          <div className="lp-icone premio">★</div>
          <div>
            <span>Prêmio do CLT</span>
            <strong>{moeda(resumoAtual.premioClt)}</strong>
          </div>
        </article>
      </section>

      <section
        className="lp-saque-card"
        style={{ flexWrap: "wrap" }}
      >
        <div>
          <span>VALOR TOTAL DISPONÍVEL</span>
          <strong>{moeda(resumoAtual.premioTotal)}</strong>
          <p>
            O saque é sempre solicitado pelo valor total disponível. Os
            pontos só saem do saldo quando a Administradora marcar que o
            pagamento PIX foi realizado.
          </p>
        </div>

        {!ehAdmin && (
          <button
            type="button"
            className="lp-botao-saque"
            onClick={abrirFormularioSaque}
            disabled={!podeSolicitar}
          >
            {solicitacaoPendente
              ? "Aguardando pagamento"
              : !resumoAtual.faixa
                ? ultimoSaquePago && resumoAtual.pontosTotal === 0
                  ? "Saque pago"
                  : "Meta ainda não ativada"
                : "Sacar premiação"}
          </button>
        )}

        {!ehAdmin && mostrarFormularioPix && podeSolicitar && (
          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto auto",
              gap: 10,
              alignItems: "end",
              paddingTop: 16,
              borderTop: "1px solid #e7eaf0",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                color: "#626c82",
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              CHAVE PIX PARA RECEBER
              <input
                value={chavePix}
                onChange={(event) => {
                  setChavePix(event.target.value);
                  setErroPix("");
                }}
                placeholder="CPF, telefone, e-mail ou chave aleatória"
                autoComplete="off"
                style={{
                  width: "100%",
                  minHeight: 42,
                  padding: "0 13px",
                  border: erroPix
                    ? "1px solid #d94f4b"
                    : "1px solid #dfe4ec",
                  borderRadius: 10,
                  outline: "none",
                  color: "#243354",
                  background: "#ffffff",
                }}
              />

              {erroPix && (
                <small style={{ color: "#b73c38" }}>{erroPix}</small>
              )}
            </label>

            <button
              type="button"
              className="lp-botao-saque"
              onClick={solicitarSaque}
              style={{ minWidth: 170 }}
            >
              Confirmar saque
            </button>

            <button
              type="button"
              onClick={cancelarFormularioSaque}
              style={{
                minHeight: 42,
                padding: "0 15px",
                border: "1px solid #dfe4ec",
                borderRadius: 10,
                background: "#ffffff",
                color: "#626c82",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </section>

      <section className="lp-conteudo-grid">
        <article className="lp-painel">
          <div className="lp-painel-titulo">
            <div>
              <span>EXTRATO DE PONTOS</span>
              <h3>Movimentações da competência</h3>
            </div>
            <b>{resumoAtual.movimentos.length} lançamentos</b>
          </div>

          {resumoAtual.movimentos.length === 0 ? (
            <div className="lp-vazio">
              Nenhum contrato pago gerou pontos nesta competência.
            </div>
          ) : (
            <div className="lp-movimentos">
              {resumoAtual.movimentos.map((movimento) => (
                <div className="lp-movimento" key={movimento.id}>
                  <div
                    className={`lp-produto ${
                      movimento.produto === "CLT" ? "clt" : "compra"
                    }`}
                  >
                    {movimento.produto === "CLT" ? "CLT" : "CD"}
                  </div>

                  <div className="lp-movimento-info">
                    <strong>{movimento.descricao}</strong>
                    <span>
                      {movimento.produto} • {movimento.data || "Data não informada"}
                    </span>
                  </div>

                  <b>+ {pontos(movimento.pontos)} pts</b>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="lp-painel">
          <div className="lp-painel-titulo">
            <div>
              <span>HISTÓRICO DE SAQUES</span>
              <h3>Solicitações</h3>
            </div>
          </div>

          {ehAdmin ? (
            solicitacoesDaCompetencia.length === 0 ? (
              <div className="lp-vazio">
                Nenhuma solicitação de saque nesta competência.
              </div>
            ) : (
              <div className="lp-solicitacoes">
                {solicitacoesDaCompetencia.map((saque) => (
                  <div className="lp-solicitacao" key={saque.id}>
                    <div>
                      <strong>{saque.consultora}</strong>
                      <span>
                        {saque.solicitadoEm} • {pontos(saque.pontos)} pontos
                      </span>
                      <span>
                        Chave PIX: <b>{saque.chavePix || "Não informada"}</b>
                      </span>
                      {saque.pagoEm && (
                        <span>Pagamento confirmado em {saque.pagoEm}</span>
                      )}
                    </div>

                    <div className="lp-solicitacao-valor">
                      <b>{moeda(saque.valorTotal)}</b>
                      <span
                        className={`lp-mini-status ${classeVisualStatus(
                          saque.status
                        )}`}
                      >
                        {saque.status}
                      </span>
                    </div>

                    {(saque.status === "Solicitado" ||
                      saque.status === "Aprovado") && (
                      <div className="lp-acoes-admin">
                        <button
                          type="button"
                          className="aprovar"
                          onClick={() =>
                            atualizarSolicitacao(saque.id, "Pago")
                          }
                        >
                          Marcar como pago
                        </button>
                        <button
                          type="button"
                          className="recusar"
                          onClick={() =>
                            atualizarSolicitacao(saque.id, "Recusado")
                          }
                        >
                          Recusar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : !solicitacaoAtual ? (
            <div className="lp-vazio">
              Você ainda não realizou nenhuma solicitação nesta competência.
            </div>
          ) : (
            <div className="lp-solicitacao destaque">
              <div>
                <strong>Saque da competência</strong>
                <span>
                  Solicitado em {solicitacaoAtual.solicitadoEm}
                </span>
                <span>
                  Chave PIX:{" "}
                  <b>{solicitacaoAtual.chavePix || "Não informada"}</b>
                </span>
                {solicitacaoAtual.pagoEm && (
                  <span>
                    Pagamento confirmado em {solicitacaoAtual.pagoEm}
                  </span>
                )}
              </div>

              <div className="lp-solicitacao-valor">
                <b>{moeda(solicitacaoAtual.valorTotal)}</b>
                <span
                  className={`lp-mini-status ${classeVisualStatus(
                    solicitacaoAtual.status
                  )}`}
                >
                  {solicitacaoAtual.status}
                </span>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="lp-regra">
        <strong>Como funciona:</strong>
        <span>
          a produção válida da Compra de Dívida e as parcelas CLT são
          somadas para ativar a faixa. A consultora informa a chave PIX e
          solicita o saque total. Os pontos permanecem no saldo enquanto a
          solicitação estiver aguardando. Eles são retirados somente depois
          que a Administradora confirmar que o pagamento foi realizado.
        </span>
      </section>
    </div>
  );
}
