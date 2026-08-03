"use client";

import LojaPremiosV2 from "./loja-premios/v2/LojaPremiosV2";
import MinhaPremiacaoV2 from "./minha-premiacao/MinhaPremiacaoV2";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import "./loja-premios.css";
import StatCard from "./loja-premios/StatCard";
import ProducaoCards from "./loja-premios/ProducaoCards";
import ExtratoPontos from "./loja-premios/ExtratoPontos";
import CatalogoPremios from "./loja-premios/CatalogoPremios";

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
  operacional?: string;
  digitador?: string;
  digitadora?: string;
  responsavelDigitacao?: string;
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
  valorPorDigitacao?: number;
  bonusMeioMilhao?: number;
  bonusUmMilhao?: number;
  metaCoordenacao?: number;
  percentualCoordenacaoAbaixo?: number;
  percentualCoordenacaoAcima?: number;
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

type PedidoLojaResumo = {
  id: string;
  consultora: string;
  pontos_total: number;
  status: string;
};

type AjustePontos = {
  id: string;
  consultora: string;
  competencia: string;
  produto: "Compra de Dívida" | "CLT";
  pontos: number;
  motivo: string;
  criado_por?: string | null;
  criado_em?: string;
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

function chaveMes(data: Date | null | undefined) {
  if (!data || Number.isNaN(data.getTime())) return "";

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

function perfilEhOperacional(perfil: string) {
  return normalizarTexto(perfil).includes("operacional");
}

function perfilEhCoordenacao(perfil: string) {
  const texto = normalizarTexto(perfil);
  return texto.includes("coordenador") || texto.includes("coordenadora");
}

function perfilSemAcesso(perfil: string) {
  const texto = normalizarTexto(perfil);
  return texto.includes("supervisor") || texto.includes("supervisora");
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

  // Propostas antigas podem estar como pagas, mas sem data de pagamento.
  // Nesse caso, usamos a data de cadastro para não perder a produção.
  if (!pagamento) {
    return digitacao ? chaveMes(digitacao) : null;
  }

  if (!digitacao) {
    return chaveMes(pagamento);
  }

  const limite = new Date(
    digitacao.getFullYear(),
    digitacao.getMonth() + 1,
    19,
    23,
    59,
    59,
  );

  return pagamento <= limite
    ? chaveMes(digitacao)
    : chaveMes(pagamento);
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

function prazoPagamentoCompetencia(competencia: string) {
  const [ano, mes] = competencia.split("-").map(Number);
  if (!ano || !mes) return null;
  return new Date(ano, mes, 19, 23, 59, 59);
}

function textoPrazoCompetencia(competencia: string) {
  const prazo = prazoPagamentoCompetencia(competencia);
  if (!prazo) return "Prazo não identificado";
  return `Contratos digitados nesta competência podem ser pagos até ${prazo.toLocaleDateString("pt-BR")}.`;
}

function competenciaEstaFechada(competencia: string) {
  const prazo = prazoPagamentoCompetencia(competencia);
  return Boolean(prazo && new Date() > prazo);
}

type LojaPremiosManagerProps = {
  area?: "premiacao" | "loja";
};

export default function LojaPremiosManager({
  area = "premiacao",
}: LojaPremiosManagerProps) {
  const supabase = useMemo(() => createClient(), []);
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
  const [abaAtiva, setAbaAtiva] = useState<
    "pontos" | "catalogo" | "resgates"
  >(area === "loja" ? "catalogo" : "pontos");
  const [pedidosLoja, setPedidosLoja] = useState<PedidoLojaResumo[]>([]);
  const [ajustesPontos, setAjustesPontos] = useState<AjustePontos[]>([]);

  useEffect(() => {
    setAbaAtiva(area === "loja" ? "catalogo" : "pontos");
  }, [area]);

  async function carregar() {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session?.access_token) {
        throw new Error("Sua sessão expirou. Entre novamente no sistema.");
      }

      const resposta = await fetch("/api/propostas", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
        cache: "no-store",
      });

      const conteudo = (await resposta.json()) as {
        propostas?: PropostaCompraDivida[];
        erro?: string;
      };

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro || "Não foi possível carregar as propostas."
        );
      }

      const lista = Array.isArray(conteudo.propostas)
        ? conteudo.propostas
        : [];

      setPropostas(lista);

      // Mantém uma cópia apenas para compatibilidade com módulos antigos.
      localStorage.setItem(
        "somos-eleva-propostas",
        JSON.stringify(lista)
      );
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

    try {
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos_loja")
        .select("id, consultora, pontos_total, status");

      if (pedidosError) {
        console.error("Erro ao carregar pedidos da loja:", pedidosError);
        setPedidosLoja([]);
      } else {
        setPedidosLoja(
          Array.isArray(pedidosData)
            ? (pedidosData as PedidoLojaResumo[])
            : []
        );
      }
    } catch {
      setPedidosLoja([]);
    }

    try {
      const { data: ajustesData, error: ajustesError } = await supabase
        .from("ajustes_pontos")
        .select(
          "id, consultora, competencia, produto, pontos, motivo, criado_por, criado_em"
        );

      if (ajustesError) {
        console.error("Erro ao carregar ajustes de pontos:", ajustesError);
        setAjustesPontos([]);
      } else {
        setAjustesPontos(
          Array.isArray(ajustesData)
            ? (ajustesData as AjustePontos[])
            : []
        );
      }
    } catch {
      setAjustesPontos([]);
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
    const atualizar = () => {
      void carregar();
    };

    atualizar();

    const intervalo = window.setInterval(atualizar, 3000);
    window.addEventListener("storage", atualizar);
    window.addEventListener("focus", atualizar);
    window.addEventListener("loja-premios-pedidos-atualizados", atualizar);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("storage", atualizar);
      window.removeEventListener("focus", atualizar);
      window.removeEventListener("loja-premios-pedidos-atualizados", atualizar);
    };
  }, [supabase]);

  const ehAdmin = perfilEhAdministracao(perfilLogado);
  const ehCoordenadora = perfilEhCoordenacao(perfilLogado);
  const ehOperacional = perfilEhOperacional(perfilLogado);
  const podeGerenciarLoja = ehAdmin || ehCoordenadora;
  const podeVerTodasConsultoras = podeGerenciarLoja;
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

    if (ehCoordenadora && nomeLogado) {
      mapa.set(normalizarTexto(nomeLogado), nomeLogado);
    }

    if (!podeVerTodasConsultoras && nomeLogado) {
      mapa.set(normalizarTexto(nomeLogado), nomeLogado);
    }

    return Array.from(mapa.values()).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }, [usuarios, propostas, registrosClt, podeVerTodasConsultoras, nomeLogado, ehCoordenadora]);

  useEffect(() => {
    if (!carregado) return;

    if (!podeVerTodasConsultoras) {
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
    podeVerTodasConsultoras,
    nomeLogado,
    nomesConsultoras,
    consultoraSelecionada,
  ]);

  const resumos = useMemo(() => {
    return nomesConsultoras.map<ResumoConsultora>((nome) => {
      const chave = normalizarTexto(nome);

      const propostasDaConsultora = propostas.filter((proposta) => {
        return (
          normalizarTexto(proposta.status) === "pago" &&
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
      const ajustesDaConsultora = ajustesPontos.filter((ajuste) => {
        return (
          normalizarTexto(ajuste.consultora) === chave &&
          ajuste.competencia === competencia
        );
      });

      const ajusteCompra = ajustesDaConsultora
        .filter((ajuste) => ajuste.produto === "Compra de Dívida")
        .reduce(
          (total, ajuste) => total + Number(ajuste.pontos || 0),
          0
        );

      const ajusteClt = ajustesDaConsultora
        .filter((ajuste) => ajuste.produto === "CLT")
        .reduce(
          (total, ajuste) => total + Number(ajuste.pontos || 0),
          0
        );

      const pontosCompraBrutos = ajusteCompra;
const pontosCltBrutos = ajusteClt;

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

      const pontosResgatadosNaLoja = pedidosLoja
        .filter((pedido) => {
          const status = normalizarTexto(pedido.status);

          return (
            normalizarTexto(pedido.consultora) === chave &&
            ["aprovado", "em preparacao", "entregue"].includes(status)
          );
        })
        .reduce(
          (total, pedido) => total + Number(pedido.pontos_total || 0),
          0
        );

      if (pontosResgatadosNaLoja > 0) {
        const totalAntesDoResgate = pontosCompra + pontosClt;

        if (totalAntesDoResgate > 0) {
          const parteCompra = pontosCompra / totalAntesDoResgate;
          const descontoCompra = pontosResgatadosNaLoja * parteCompra;
          const descontoClt = pontosResgatadosNaLoja - descontoCompra;

          pontosCompra = Math.max(pontosCompra - descontoCompra, 0);
          pontosClt = Math.max(pontosClt - descontoClt, 0);
        }
      }

      const pontosTotal = pontosCompra + pontosClt;

// Compra + CLT servem somente para ativar a meta mínima de R$ 30 mil.
const metaAtivada = pontosTotal >= META_MINIMA;

// A faixa da Compra considera somente a produção de Compra de Dívida.
const faixaCompra = metaAtivada
  ? faixaDaProducao(pontosCompra)
  : null;

// Pontuação da Compra: somente o valor da Compra na faixa da própria Compra.
const premioCompra =
  metaAtivada && faixaCompra && pontosCompra > 0
    ? pontosCompra * (faixaCompra.percentualCompra / 100)
    : 0;

// Pontuação do CLT: sempre 1% somente sobre o valor de CLT.
const premioClt =
  metaAtivada && pontosClt > 0
    ? pontosClt * 0.01
    : 0;

const faixa = faixaCompra;

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
  }, [
    nomesConsultoras,
    propostas,
    registrosClt,
    competencia,
    saques,
    pedidosLoja,
    ajustesPontos,
  ]);

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

  const usuarioLogado = useMemo(() => {
    const chave = normalizarTexto(nomeLogado);
    return usuarios.find((usuario) => normalizarTexto(usuario.nome || "") === chave);
  }, [usuarios, nomeLogado]);

  const resumoCoordenacao = useMemo(() => {
    const producaoCompra = resumos.reduce((total, item) => total + item.pontosCompra, 0);
    const producaoClt = resumos.reduce((total, item) => total + item.pontosClt, 0);
    const meta = Number(usuarioLogado?.metaCoordenacao ?? 300000);
    const percentualAbaixo = Number(usuarioLogado?.percentualCoordenacaoAbaixo ?? 1);
    const percentualAcima = Number(usuarioLogado?.percentualCoordenacaoAcima ?? 2);
    const percentual = producaoCompra >= meta ? percentualAcima : percentualAbaixo;
    const comissaoPropria = producaoCompra * (percentual / 100);
    return {
      consultoras: resumos.filter((item) => normalizarTexto(item.nome) !== normalizarTexto(nomeLogado)).length,
      producaoCompra,
      producaoClt,
      producaoTotal: producaoCompra + producaoClt,
      meta,
      percentual,
      comissaoPropria,
    };
  }, [resumos, usuarioLogado, nomeLogado]);

  const resumoExibido = useMemo(() => {
    if (ehCoordenadora && normalizarTexto(resumoAtual.nome) === normalizarTexto(nomeLogado)) {
      return {
        ...resumoAtual,
        pontosCompra: resumoCoordenacao.producaoCompra,
        pontosClt: resumoCoordenacao.producaoClt,
        pontosTotal: resumoCoordenacao.producaoTotal,
        premioCompra: resumoCoordenacao.comissaoPropria,
        premioClt: 0,
        premioTotal: resumoCoordenacao.comissaoPropria,
        faixa: resumoCoordenacao.comissaoPropria > 0 ? ({ meta: 0, percentualCompra: resumoCoordenacao.percentual, premiacaoClt: 0, nome: "Comissão da coordenação" } as FaixaPremiacao) : null,
      };
    }
    return resumoAtual;
  }, [ehCoordenadora, resumoAtual, nomeLogado, resumoCoordenacao]);

  const pontosDoUsuarioLogado = useMemo(() => {
    if (ehCoordenadora) {
      return resumoCoordenacao.producaoTotal;
    }

    const resumoProprio = resumos.find(
      (item) =>
        normalizarTexto(item.nome) === normalizarTexto(nomeLogado)
    );

    return Number(resumoProprio?.pontosTotal || 0);
  }, [
    ehCoordenadora,
    resumoCoordenacao.producaoTotal,
    resumos,
    nomeLogado,
  ]);

  useEffect(() => {
    const pontosSeguros = Number.isFinite(pontosDoUsuarioLogado)
      ? pontosDoUsuarioLogado
      : 0;

    localStorage.setItem(
      "somos-eleva-pontos-header",
      String(pontosSeguros)
    );

    window.dispatchEvent(
      new CustomEvent("somos-eleva-pontos-atualizados", {
        detail: pontosSeguros,
      })
    );
  }, [pontosDoUsuarioLogado]);

  const solicitacoesDaCompetencia = useMemo(() => {
    return saques
      .filter((saque) => saque.competencia === competencia)
      .sort((a, b) => b.solicitadoEm.localeCompare(a.solicitadoEm));
  }, [saques, competencia]);

  const solicitacoesDaConsultora = useMemo(() => {
    const chave = normalizarTexto(resumoExibido.nome);

    return saques.filter(
      (saque) =>
        saque.competencia === competencia &&
        normalizarTexto(saque.consultora) === chave
    );
  }, [saques, competencia, resumoExibido.nome]);

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

  const resumoOperacional = useMemo(() => {
    const chaveNome = normalizarTexto(nomeLogado);

    const digitacoesPagas = propostas.filter((proposta) => {
      const responsavel =
        proposta.operacional ||
        proposta.digitador ||
        proposta.digitadora ||
        proposta.responsavelDigitacao ||
        "";

      return (
        normalizarTexto(proposta.status) === "pago" &&
competenciaCompra(proposta) === competencia &&
        normalizarTexto(responsavel) === chaveNome
      );
    });

    const producaoEmpresa = propostas
      .filter(
        (proposta) =>
          normalizarTexto(proposta.status) === "pago" &&
competenciaCompra(proposta) === competencia
      )
      .reduce((total, proposta) => total + valorValidoCompra(proposta), 0);

    const nomeOperacional = normalizarTexto(nomeLogado);
    const ehSthefane = nomeOperacional.includes("sthefane");
    const ehVinicius = nomeOperacional.includes("vinicius");

    // Regras fixas definidas pela empresa para os dois Operacionais.
    // Mantemos os campos do cadastro apenas como reserva para novos Operacionais.
    const valorPorDigitacao =
      ehSthefane || ehVinicius
        ? 10
        : Number(usuarioLogado?.valorPorDigitacao ?? 10);

    const bonusMeioMilhao = ehSthefane
      ? 250
      : ehVinicius
        ? 0
        : Number(usuarioLogado?.bonusMeioMilhao ?? 0);

    const bonusUmMilhao =
      ehSthefane || ehVinicius
        ? 500
        : Number(usuarioLogado?.bonusUmMilhao ?? 500);

    const valorDigitacoes = digitacoesPagas.length * valorPorDigitacao;

    // O bônus não é cumulativo: ao chegar a R$ 1 milhão, vale apenas o bônus de R$ 500.
    const bonusMeta =
      producaoEmpresa >= 1000000
        ? bonusUmMilhao
        : producaoEmpresa >= 500000
          ? bonusMeioMilhao
          : 0;

    return {
      quantidade: digitacoesPagas.length,
      valorPorDigitacao,
      valorDigitacoes,
      producaoEmpresa,
      bonusMeta,
      total: valorDigitacoes + bonusMeta,
    };
  }, [propostas, competencia, nomeLogado, usuarioLogado]);

  const acompanhamentoCompetencia = useMemo(() => {
    const chaveConsultora = normalizarTexto(resumoExibido.nome);
    const propostasDigitadas = propostas.filter((proposta) => {
      const dataDigitacao = converterData(proposta.dataCadastro);

      // Registros antigos sem data válida permanecem salvos, mas não entram
      // em uma competência até que a data de digitação seja informada.
      if (!dataDigitacao || chaveMes(dataDigitacao) !== competencia) {
        return false;
      }

      if (!ehOperacional) {
        return normalizarTexto(proposta.vendedora) === chaveConsultora;
      }

      const responsavelOperacional =
        proposta.operacional ||
        proposta.digitador ||
        proposta.digitadora ||
        proposta.responsavelDigitacao ||
        "";

      return (
        normalizarTexto(responsavelOperacional) ===
        normalizarTexto(nomeLogado)
      );
    });

    const propostasConfirmadas = propostasDigitadas.filter(
      (proposta) =>
        normalizarTexto(proposta.status) === "pago" &&
competenciaCompra(proposta) === competencia
    );

    const propostasEmFormacao = propostasDigitadas.filter(
      (proposta) =>
       normalizarTexto(proposta.status) !== "pago" ||
        competenciaCompra(proposta) !== competencia
    );

    const valorProduzido = propostasDigitadas.reduce(
      (total, proposta) => total + valorValidoCompra(proposta),
      0
    );
    const valorConfirmado = propostasConfirmadas.reduce(
      (total, proposta) => total + valorValidoCompra(proposta),
      0
    );
    const valorEmFormacao = propostasEmFormacao.reduce(
      (total, proposta) => total + valorValidoCompra(proposta),
      0
    );

    return {
      digitados: propostasDigitadas.length,
      pagosConfirmados: propostasConfirmadas.length,
      aguardando: propostasEmFormacao.length,
      valorProduzido,
      valorConfirmado,
      valorEmFormacao,
      fechado: competenciaEstaFechada(competencia),
      prazo: textoPrazoCompetencia(competencia),
    };
  }, [propostas, competencia, resumoExibido.nome, ehOperacional, nomeLogado]);

  const faltaParaMeta = Math.max(META_MINIMA - resumoExibido.pontosTotal, 0);

  const progresso = Math.min(
    100,
    Math.max(0, (resumoExibido.pontosTotal / META_MINIMA) * 100)
  );

  const valorSaquesPagos = useMemo(() => {
    return solicitacoesDaConsultora
      .filter((saque) => saque.status === "Pago")
      .reduce((total, saque) => total + Number(saque.valorTotal || 0), 0);
  }, [solicitacoesDaConsultora]);

  const rankingCompetencia = useMemo(() => {
    return [...resumos].sort(
      (a, b) => Number(b.pontosTotal || 0) - Number(a.pontosTotal || 0)
    );
  }, [resumos]);

  const posicaoRanking = useMemo(() => {
    const chave = normalizarTexto(resumoExibido.nome);
    const indice = rankingCompetencia.findIndex(
      (item) => normalizarTexto(item.nome) === chave
    );

    return indice >= 0 ? indice + 1 : 0;
  }, [rankingCompetencia, resumoExibido.nome]);

  const selecionouProprioResultado = normalizarTexto(resumoExibido.nome) === normalizarTexto(nomeLogado);

  const podeSolicitar =
    !ehAdmin &&
    !acessoNegado &&
    (!ehCoordenadora || selecionouProprioResultado) &&
    Boolean(resumoExibido.faixa) &&
    resumoExibido.premioTotal > 0 &&
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
      consultora: resumoExibido.nome,
      competencia,
      pontos: resumoExibido.pontosTotal,
      pontosCompra: resumoExibido.pontosCompra,
      pontosClt: resumoExibido.pontosClt,
      premioCompra: resumoExibido.premioCompra,
      premioClt: resumoExibido.premioClt,
      valorTotal: resumoExibido.premioTotal,
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

  function solicitarSaqueComPix(chaveInformada: string) {
    if (!podeSolicitar) return;

    const pixLimpo = chaveInformada.trim();

    if (pixLimpo.length < 3) return;

    const novaSolicitacao: SolicitacaoSaque = {
      id: crypto.randomUUID(),
      consultora: resumoExibido.nome,
      competencia,
      pontos: resumoExibido.pontosTotal,
      pontosCompra: resumoExibido.pontosCompra,
      pontosClt: resumoExibido.pontosClt,
      premioCompra: resumoExibido.premioCompra,
      premioClt: resumoExibido.premioClt,
      valorTotal: resumoExibido.premioTotal,
      chavePix: pixLimpo,
      status: "Solicitado",
      solicitadoEm: dataAgora(),
      atualizadoEm: dataAgora(),
    };

    salvarSaques([...saques, novaSolicitacao]);
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

    if (resumoExibido.faixa) return "Disponível para saque";

    if (ultimoSaquePago && resumoExibido.pontosTotal === 0) {
      return "Saque pago";
    }

    if (solicitacaoAtual?.status === "Recusado") {
      return "Bloqueado";
    }

    return "Bloqueado";
  }

  function classeStatus() {
    if (solicitacaoPendente) return "solicitado";
    if (resumoExibido.faixa) return "disponivel";

    if (ultimoSaquePago && resumoExibido.pontosTotal === 0) {
      return "aprovado";
    }

    if (solicitacaoAtual?.status === "Recusado") {
      return "recusado";
    }

    return "bloqueado";
  }

  const navegacaoLoja =
    area === "loja" ? (
      <section className="lp-abas-principais">
        <button
          type="button"
          className={abaAtiva === "catalogo" ? "ativa" : ""}
          onClick={() => setAbaAtiva("catalogo")}
        >
          Catálogo de prêmios
        </button>

        <button
          type="button"
          className={abaAtiva === "resgates" ? "ativa" : ""}
          onClick={() => setAbaAtiva("resgates")}
        >
          Meus resgates
        </button>
      </section>
    ) : null;

  if (!carregado) {
    return <div className="lp-carregando">Carregando seus pontos...</div>;
  }

  if (acessoNegado) {
    return (
      <section className="lp-sem-acesso">
        <div>🔒</div>
        <h2>Acesso restrito</h2>
        <p>O perfil {perfilLogado} não possui acesso à Loja de Prêmios.</p>
      </section>
    );
  }

  if (area === "loja" && abaAtiva !== "pontos") {
    return (
      <div className="lp-page">
        {navegacaoLoja}

        <LojaPremiosV2
  saldoPontos={pontosDoUsuarioLogado}
  nomeUsuario={nomeLogado}
  perfilUsuario={perfilLogado}
  nomesConsultoras={nomesConsultoras}
  consultoraSelecionada={consultoraSelecionada}
  competencia={competencia}
  saldoConsultora={resumoExibido.pontosTotal}
  onConsultoraChange={setConsultoraSelecionada}
  onCompetenciaChange={setCompetencia}
  onPontosAtualizados={carregar}
/>
      </div>
    );
  }

  if (area === "premiacao" && !ehOperacional) {
    return (
      <MinhaPremiacaoV2
        nomeUsuario={nomeLogado}
        nomeExibido={resumoExibido.nome}
        perfilUsuario={perfilLogado}
        podeGerenciar={podeGerenciarLoja}
        nomesConsultoras={nomesConsultoras}
        consultoraSelecionada={consultoraSelecionada}
        competencia={competencia}
        pontosCompra={resumoExibido.pontosCompra}
        pontosClt={resumoExibido.pontosClt}
        pontosTotal={resumoExibido.pontosTotal}
        premioCompra={resumoExibido.premioCompra}
        premioClt={resumoExibido.premioClt}
        premioTotal={resumoExibido.premioTotal}
        producaoDigitada={acompanhamentoCompetencia.valorProduzido}
        producaoConfirmada={acompanhamentoCompetencia.valorConfirmado}
        producaoEmFormacao={acompanhamentoCompetencia.valorEmFormacao}
        contratosDigitados={acompanhamentoCompetencia.digitados}
        contratosConfirmados={acompanhamentoCompetencia.pagosConfirmados}
        contratosEmFormacao={acompanhamentoCompetencia.aguardando}
        saquesPagos={valorSaquesPagos}
        progresso={progresso}
        faltaParaMeta={faltaParaMeta}
        meta={META_MINIMA}
        movimentos={resumoExibido.movimentos}
        posicaoRanking={posicaoRanking}
        totalRanking={rankingCompetencia.length}
        podeSolicitar={podeSolicitar}
        solicitacaoPendente={Boolean(solicitacaoPendente)}
        onConsultoraChange={setConsultoraSelecionada}
        onCompetenciaChange={setCompetencia}
        onAtualizar={carregar}
        onSolicitarSaque={solicitarSaqueComPix}
      />
    );
  }

  if (ehOperacional) {
    return (
      <div className="lp-page">
        {navegacaoLoja}
        <section className="lp-topo">
          <div>
            <span className="lp-etiqueta">MINHA PREMIAÇÃO OPERACIONAL</span>
            <h2>{nomeLogado || "Operacional"}</h2>
            <p>A premiação usa os valores configurados no seu cadastro e considera somente contratos pagos de Compra de Dívida.</p>
          </div>
          <div className="lp-filtros">
            <label>Competência<input type="month" value={competencia} onChange={(event) => setCompetencia(event.target.value)} /></label>
            <button type="button" onClick={carregar}>Atualizar</button>
          </div>
        </section>
        <section className="lp-resumo-grid">
          <article><div><span>DIGITAÇÕES PAGAS</span><strong>{resumoOperacional.quantidade}</strong></div></article>
          <article><div><span>{moeda(resumoOperacional.valorPorDigitacao)} POR DIGITAÇÃO</span><strong>{moeda(resumoOperacional.valorDigitacoes)}</strong></div></article>
          <article><div><span>PRODUÇÃO DA EMPRESA</span><strong>{moeda(resumoOperacional.producaoEmpresa)}</strong></div></article>
          <article><div><span>BÔNUS DE META</span><strong>{moeda(resumoOperacional.bonusMeta)}</strong></div></article>
        </section>
        <section className="lp-resumo-grid">
          <article><div><span>PRODUZIDO NO MÊS</span><strong>{acompanhamentoCompetencia.digitados} contratos</strong><small>{moeda(acompanhamentoCompetencia.valorProduzido)}</small></div></article>
          <article><div><span>CONFIRMADO PARA RECEBER</span><strong>{acompanhamentoCompetencia.pagosConfirmados} contratos</strong><small>{moeda(acompanhamentoCompetencia.valorConfirmado)}</small></div></article>
          <article><div><span>EM FORMAÇÃO</span><strong>{acompanhamentoCompetencia.aguardando} contratos</strong><small>{moeda(acompanhamentoCompetencia.valorEmFormacao)}</small></div></article>
          <article><div><span>STATUS DA COMPETÊNCIA</span><strong>{acompanhamentoCompetencia.fechado ? "Fechada" : "Em andamento"}</strong><small>{acompanhamentoCompetencia.prazo}</small></div></article>
        </section>
        <section className="lp-carteira">
          <div className="lp-carteira-principal"><span>TOTAL DA MINHA PREMIAÇÃO</span><h3>{moeda(resumoOperacional.total)}</h3><small>{nomeMes(competencia)}</small></div>
        </section>
      </div>
    );
  }


  return (
    <div className="lp-page">
      {navegacaoLoja}
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

          {podeGerenciarLoja && (
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
            <h3>{resumoExibido.nome}</h3>
            <small>{nomeMes(competencia)}</small>
          </div>

          <div className="lp-pontos-total">
            <span>Saldo atual</span>
            <strong>{pontos(resumoExibido.pontosTotal)}</strong>
            <small>pontos</small>

            {podeGerenciarLoja && resumoExibido.nome && (
              <button
                type="button"
                style={{
                  marginTop: 10,
                  minHeight: 36,
                  padding: "0 13px",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.14)",
                  color: "#ffffff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Ajustar pontos
              </button>
            )}
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

          {!resumoExibido.faixa ? (
            <p className="lp-falta">
              Faltam <strong>{pontos(faltaParaMeta)} pontos</strong> para
              liberar o saque.
            </p>
          ) : (
            <p className="lp-meta-ativa">
              Meta ativada: <strong>{resumoExibido.faixa.nome}</strong>
            </p>
          )}
        </div>
      </section>

      <section className="lp-resumo-grid">
  <StatCard
    icone="⇄"
    titulo="Pontos — Compra de Dívida"
    valor={pontos(resumoExibido.pontosCompra)}
  />

  <StatCard
    icone="▣"
    titulo="Pontos — CLT"
    valor={pontos(resumoExibido.pontosClt)}
  />

  <StatCard
    icone="◆"
    titulo="Prêmio da Compra"
    valor={moeda(resumoExibido.premioCompra)}
  />

  <StatCard
    icone="★"
    titulo="Prêmio do CLT"
    valor={moeda(resumoExibido.premioClt)}
  />
</section>
<ProducaoCards
  digitados={acompanhamentoCompetencia.digitados}
  pagosConfirmados={acompanhamentoCompetencia.pagosConfirmados}
  aguardando={acompanhamentoCompetencia.aguardando}
  valorProduzido={moeda(acompanhamentoCompetencia.valorProduzido)}
  valorConfirmado={moeda(acompanhamentoCompetencia.valorConfirmado)}
  valorEmFormacao={moeda(acompanhamentoCompetencia.valorEmFormacao)}
  fechado={acompanhamentoCompetencia.fechado}
  prazo={acompanhamentoCompetencia.prazo}
/>
<section className="lp-saque-card" style={{ flexWrap: "wrap" }}>
  <div>
    <span>VALOR TOTAL DISPONÍVEL</span>
    <strong>{moeda(resumoExibido.premioTotal)}</strong>
    <p>
      O saque é sempre solicitado pelo valor total disponível. Os pontos só
      saem do saldo quando a gestão marcar que o pagamento PIX foi realizado.
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
        : !resumoExibido.faixa
          ? ultimoSaquePago && resumoExibido.pontosTotal === 0
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
  <ExtratoPontos
    movimentos={resumoExibido.movimentos}
    formatarPontos={pontos}
  />

  <article className="lp-painel">
  <div className="lp-painel-titulo">
    <div>
      <span>HISTÓRICO DE SAQUES</span>
      <h3>Solicitações</h3>
    </div>
  </div>

  {podeGerenciarLoja ? (
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
    que a gestão confirmar que o pagamento foi realizado.
  </span>
</section>
</div>
);
}