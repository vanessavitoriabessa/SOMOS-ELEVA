"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import "./ranking.css";

import {
  compraValidaNaCompetencia,
} from "@/lib/premiacao/competenciaCompra";

import {
  calcularPremiacaoCompra,
  calcularPremiacaoClt,
} from "@/lib/premiacao/premiacaoService";
type Periodo = "Hoje" | "Semana" | "Mês" | "Todos";
type ProdutoRanking = "Todos" | "Compra de Dívida" | "CLT";

type UsuarioRanking = {
  nome?: string;
  foto?: string;
  foto_url?: string;
  time_id?: string | null;
};

type TimeRanking = {
  id: string;
  nome: string;
  ativo?: boolean;
  membros?: Array<{
    id?: string;
    nome?: string;
    time_id?: string | null;
  }>;
};

type RespostaTimesRanking = {
  erro?: string;
  times?: TimeRanking[];
};

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

type FaixaPremiacao = {
  meta: number;
  percentualCompra: number;
  premiacaoClt: number;
  nome: string;
};

type RankingItem = {
  nome: string;
  contratosCompra: number;
  contratosClt: number;
  contratosTotal: number;
  producaoCompra: number;
  producaoClt: number;
  producaoTotal: number;
  metaAtivada: boolean;
  faixa: FaixaPremiacao | null;
  premiacaoCompra: number;
  premiacaoClt: number;
  premiacaoTotal: number;
};

const META_MINIMA = 30000;

const TABELAS_COMPRA_DIVIDA = [
  { nome: "NEO NORMAL", percentual: 100 },
  { nome: "NEO FLEX 1", percentual: 82 },
  { nome: "NEO FLEX 2", percentual: 67 },
  { nome: "NEO FLEX 3", percentual: 52 },
  { nome: "NEO FLEX 4", percentual: 37 },
  { nome: "NEO FLEX 5", percentual: 17 },
];

/*
 * A produção total (Compra de Dívida + CLT) ativa a faixa.
 *
 * Depois:
 * - Compra de Dívida: percentual da faixa × produção válida da Compra.
 * - CLT: valor fixo da faixa, desde que exista produção CLT.
 * - Premiação total: soma das duas premiações.
 */
const FAIXAS_PREMIACAO: FaixaPremiacao[] = [
  {
    meta: 30000,
    percentualCompra: 1.5,
    premiacaoClt: 300,
    nome: "Faixa 1",
  },
  {
    meta: 40000,
    percentualCompra: 2,
    premiacaoClt: 400,
    nome: "Faixa 2",
  },
  {
    meta: 50000,
    percentualCompra: 2.05,
    premiacaoClt: 600,
    nome: "Faixa 3",
  },
  {
    meta: 60000,
    percentualCompra: 2.1,
    premiacaoClt: 800,
    nome: "Faixa 4",
  },
  {
    meta: 70000,
    percentualCompra: 2.3,
    premiacaoClt: 2000,
    nome: "Faixa 5",
  },
  {
    meta: 80000,
    percentualCompra: 2.5,
    premiacaoClt: 2500,
    nome: "Faixa 6",
  },
  {
    meta: 90000,
    percentualCompra: 2.7,
    premiacaoClt: 2700,
    nome: "Faixa 7",
  },
  {
    meta: 100000,
    percentualCompra: 3,
    premiacaoClt: 3500,
    nome: "Faixa 8",
  },
  {
    meta: 110000,
    percentualCompra: 3,
    premiacaoClt: 3200,
    nome: "Faixa 8",
  },
  {
    meta: 120000,
    percentualCompra: 3.05,
    premiacaoClt: 3400,
    nome: "Faixa 9",
  },
  {
    meta: 130000,
    percentualCompra: 3.05,
    premiacaoClt: 3600,
    nome: "Faixa 9",
  },
  {
    meta: 140000,
    percentualCompra: 3.1,
    premiacaoClt: 3800,
    nome: "Faixa 10",
  },
  {
    meta: 150000,
    percentualCompra: 3.1,
    premiacaoClt: 5000,
    nome: "Faixa 10",
  },
  {
    meta: 160000,
    percentualCompra: 3.15,
    premiacaoClt: 5000,
    nome: "Faixa 11",
  },
  {
    meta: 180000,
    percentualCompra: 3.2,
    premiacaoClt: 5000,
    nome: "Faixa 12",
  },
  {
    meta: 200000,
    percentualCompra: 3.25,
    premiacaoClt: 5000,
    nome: "Faixa 13",
  },
  {
    meta: 220000,
    percentualCompra: 3.3,
    premiacaoClt: 5000,
    nome: "Faixa 14",
  },
  {
    meta: 240000,
    percentualCompra: 3.35,
    premiacaoClt: 5000,
    nome: "Faixa 15",
  },
  {
    meta: 260000,
    percentualCompra: 3.4,
    premiacaoClt: 5000,
    nome: "Faixa 16",
  },
  {
    meta: 280000,
    percentualCompra: 3.45,
    premiacaoClt: 5000,
    nome: "Faixa 17",
  },
  {
    meta: 300000,
    percentualCompra: 3.5,
    premiacaoClt: 5000,
    nome: "Faixa 18",
  },
  {
    meta: 320000,
    percentualCompra: 3.55,
    premiacaoClt: 5000,
    nome: "Faixa 19",
  },
  {
    meta: 340000,
    percentualCompra: 3.6,
    premiacaoClt: 5000,
    nome: "Faixa 20",
  },
  {
    meta: 360000,
    percentualCompra: 3.65,
    premiacaoClt: 5000,
    nome: "Faixa 21",
  },
  {
    meta: 380000,
    percentualCompra: 3.7,
    premiacaoClt: 5000,
    nome: "Faixa 22",
  },
  {
    meta: 400000,
    percentualCompra: 3.75,
    premiacaoClt: 5000,
    nome: "Faixa 23",
  },
  {
    meta: 420000,
    percentualCompra: 3.8,
    premiacaoClt: 5000,
    nome: "Faixa 24",
  },
  {
    meta: 440000,
    percentualCompra: 3.85,
    premiacaoClt: 5000,
    nome: "Faixa 25",
  },
  {
    meta: 460000,
    percentualCompra: 3.9,
    premiacaoClt: 5000,
    nome: "Faixa 26",
  },
  {
    meta: 480000,
    percentualCompra: 3.95,
    premiacaoClt: 5000,
    nome: "Faixa 27",
  },
  {
    meta: 500000,
    percentualCompra: 4,
    premiacaoClt: 5000,
    nome: "Faixa 28",
  },
];

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarPercentual(valor: number) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function inicioDoDia(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function inicioDaSemana(data: Date) {
  const atual = inicioDoDia(data);
  const dia = atual.getDay();
  const diferenca = dia === 0 ? -6 : 1 - dia;

  atual.setDate(atual.getDate() + diferenca);
  return atual;
}

function inicioDoMes(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function converterData(valor: string) {
  if (!valor) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
  }

  const parteData = valor.split(",")[0].trim();
  const partes = parteData.split("/").map(Number);

  if (partes.length === 3 && partes.every(Number.isFinite)) {
    return new Date(partes[2], partes[1] - 1, partes[0]);
  }

  return null;
}

function mesmaCompetencia(data: Date, referencia: Date) {
  return (
    data.getFullYear() === referencia.getFullYear() &&
    data.getMonth() === referencia.getMonth()
  );
}

function estaNoPeriodo(
  data: Date | null,
  periodo: Periodo,
  usarCompetenciaMensal = false
) {
  if (periodo === "Todos") return true;
  if (!data) return false;

  const hoje = new Date();
  const alvo = inicioDoDia(data);

  if (periodo === "Hoje") {
    return alvo.getTime() === inicioDoDia(hoje).getTime();
  }

  if (periodo === "Semana") {
    return alvo >= inicioDaSemana(hoje);
  }

  if (periodo === "Mês") {
    if (usarCompetenciaMensal) {
      return mesmaCompetencia(alvo, hoje);
    }

    return alvo >= inicioDoMes(hoje);
  }

  return true;
}

function tabelaPeloNome(nome: string) {
  const nomeNormalizado = normalizarTexto(nome);

  return TABELAS_COMPRA_DIVIDA.find((item) => {
    const tabelaNormalizada = normalizarTexto(item.nome);

    return (
      nomeNormalizado === tabelaNormalizada ||
      nomeNormalizado.startsWith(tabelaNormalizada)
    );
  });
}

function percentualDaTabela(proposta: PropostaCompraDivida) {
  const tabela = tabelaPeloNome(proposta.tabela);

  if (tabela) {
    return tabela.percentual;
  }

  const percentualNoNome = String(proposta.tabela || "").match(
    /(\d+(?:[.,]\d+)?)\s*%/
  );

  if (percentualNoNome) {
    const percentual = Number(
      percentualNoNome[1].replace(",", ".")
    );

    if (Number.isFinite(percentual)) {
      return percentual;
    }
  }

  const percentualSalvo = Number(proposta.percentualTabela || 0);

  const permitido = TABELAS_COMPRA_DIVIDA.some(
    (item) =>
      Math.abs(item.percentual - percentualSalvo) < 0.01
  );

  return permitido ? percentualSalvo : 0;
}

function valorValidoCompraDivida(proposta: PropostaCompraDivida) {
  const valorMetaSalvo = Number(proposta.valorMeta || 0);

  if (valorMetaSalvo > 0) {
    return valorMetaSalvo;
  }

  const valorContrato = Number(proposta.valorContrato || 0);
  const percentual = percentualDaTabela(proposta);

  return valorContrato * (percentual / 100);
}

function competenciaCompraDivida(proposta: PropostaCompraDivida) {
  const digitacao = converterData(proposta.dataCadastro);
  const pagamento = converterData(proposta.dataPagamento);

  if (!pagamento) return null;
  if (!digitacao) return inicioDoMes(pagamento);

  const limite = new Date(
    digitacao.getFullYear(),
    digitacao.getMonth() + 1,
    19,
    23,
    59,
    59
  );

  if (pagamento <= limite) {
    return inicioDoMes(digitacao);
  }

  return inicioDoMes(pagamento);
}

function dataClt(registro: RegistroClt) {
  return converterData(
    registro.dataPagamento ||
      registro.atualizadoEm ||
      registro.criadoEm
  );
}

function faixaDaProducao(producaoTotal: number) {
  if (producaoTotal < META_MINIMA) {
    return null;
  }

  const faixasAtingidas = FAIXAS_PREMIACAO.filter(
    (faixa) => producaoTotal >= faixa.meta
  );

  return faixasAtingidas.at(-1) || null;
}

export default function RankingManager() {
  const supabase = useMemo(() => createClient(), []);

  const [propostas, setPropostas] =
    useState<PropostaCompraDivida[]>([]);

  const [registrosClt, setRegistrosClt] =
    useState<RegistroClt[]>([]);

  const hoje = new Date();

const primeiroDiaMes = new Date(
  hoje.getFullYear(),
  hoje.getMonth(),
  1
);

const ultimoDiaMes = new Date(
  hoje.getFullYear(),
  hoje.getMonth() + 1,
  0
);

const [dataInicial, setDataInicial] = useState(
  primeiroDiaMes.toISOString().slice(0, 10)
);

const [dataFinal, setDataFinal] = useState(
  ultimoDiaMes.toISOString().slice(0, 10)
);

  const [periodo, setPeriodo] =
    useState<Periodo>("Mês");

  const [busca, setBusca] = useState("");
  const [produto, setProduto] =
    useState<ProdutoRanking>("Todos");

  const [timesRanking, setTimesRanking] =
    useState<TimeRanking[]>([]);

  const [timeSelecionado, setTimeSelecionado] =
    useState("Todos");

  const [usuariosRanking, setUsuariosRanking] =
    useState<UsuarioRanking[]>([]);

  const [podeVerPremiacao, setPodeVerPremiacao] =
    useState(false);
    const [atualizando, setAtualizando] =
  useState(false);

  useEffect(() => {
    identificarPermissao();

    try {
      const usuariosSalvos = JSON.parse(
        localStorage.getItem("somos-eleva-usuarios") || "[]"
      );

      setUsuariosRanking(
        Array.isArray(usuariosSalvos)
          ? usuariosSalvos
          : []
      );
    } catch {
      setUsuariosRanking([]);
    }

    void carregar();

    const atualizarAoVoltar = () => {
      if (document.visibilityState === "visible") {
        void carregar();
      }
    };

    const atualizarAoFocar = () => {
      void carregar();
    };

    document.addEventListener("visibilitychange", atualizarAoVoltar);
    window.addEventListener("focus", atualizarAoFocar);

    return () => {
      document.removeEventListener("visibilitychange", atualizarAoVoltar);
      window.removeEventListener("focus", atualizarAoFocar);
    };
  }, []);

  function identificarPermissao() {
    try {
      const cargoSalvo = String(
        localStorage.getItem("somos-eleva-cargo") || ""
      );

      const usuarioLogado = String(
        localStorage.getItem("somos-eleva-usuario") || ""
      );

      const usuariosSalvos = JSON.parse(
        localStorage.getItem("somos-eleva-usuarios") || "[]"
      );

      const usuarioAtual = Array.isArray(usuariosSalvos)
        ? usuariosSalvos.find(
            (usuario: Record<string, unknown>) =>
              String(usuario.id || "") === usuarioLogado ||
              String(usuario.email || "") === usuarioLogado ||
              String(usuario.matricula || "") === usuarioLogado ||
              String(usuario.nome || "") === usuarioLogado
          )
        : null;

      const perfilAtual = normalizarTexto(
        String(
          usuarioAtual?.perfil ||
            usuarioAtual?.cargo ||
            cargoSalvo
        )
      );

      setPodeVerPremiacao(
        perfilAtual.includes("administrador") ||
          perfilAtual.includes("administradora") ||
          perfilAtual === "admin"
      );
    } catch {
      setPodeVerPremiacao(false);
    }
  }

  async function carregar() {
    setAtualizando(true);
  try {
    const { data, error } =
      await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error(
        "Sua sessão expirou. Entre novamente no sistema."
      );
    }

    const [resposta, respostaTimes] =
      await Promise.all([
        fetch("/api/propostas", {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${data.session.access_token}`,
          },
          cache: "no-store",
        }),
        fetch("/api/times", {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${data.session.access_token}`,
          },
          cache: "no-store",
        }),
      ]);

    try {
      const conteudoTimes =
        (await respostaTimes.json()) as RespostaTimesRanking;

      if (respostaTimes.ok) {
        setTimesRanking(
          Array.isArray(conteudoTimes.times)
            ? conteudoTimes.times
            : []
        );
      }
    } catch {
      setTimesRanking([]);
    }

    const conteudo = (await resposta.json()) as {
      propostas?: PropostaCompraDivida[];
      erro?: string;
    };

    if (!resposta.ok) {
      throw new Error(
        conteudo.erro ||
          "Não foi possível carregar as propostas."
      );
    }

    const listaPropostas =
      Array.isArray(conteudo.propostas)
        ? conteudo.propostas
        : [];

    setPropostas(listaPropostas);
  } catch (erro) {
    console.error(
      "Erro ao carregar propostas no Ranking:",
      erro
    );

    setPropostas([]);
  }

    try {
    const cltSalvos = JSON.parse(
      localStorage.getItem("somos-eleva-clt") || "[]"
    );

    setRegistrosClt(
      Array.isArray(cltSalvos)
        ? cltSalvos
        : []
    );
  } catch {
    setRegistrosClt([]);
  } finally {
    setAtualizando(false);
  }
}
  const nomesPermitidosTime = useMemo(() => {
    if (timeSelecionado === "Todos") {
      return null;
    }

    const time = timesRanking.find(
      (item) => item.id === timeSelecionado
    );

    return new Set(
      (time?.membros || [])
        .map((membro) =>
          normalizarTexto(membro.nome || "")
        )
        .filter(Boolean)
    );
  }, [timesRanking, timeSelecionado]);

  const ranking = useMemo(() => {
    const agrupado = new Map<string, RankingItem>();

    propostas
  .filter((proposta) => {
    if (produto === "CLT") return false;

    if (
      nomesPermitidosTime &&
      !nomesPermitidosTime.has(
        normalizarTexto(proposta.vendedora || "")
      )
    ) {
      return false;
    }

    const statusPago =
      normalizarTexto(proposta.status) === "pago";

    if (!statusPago) {
      return false;
    }

    /*
     * Para o filtro mensal, aplica a regra oficial:
     * digitado no mês e pago até o dia 19 do mês seguinte.
     */
    if (periodo === "Mês") {
      const hoje = new Date();

      const competenciaTexto =
        `${hoje.getFullYear()}-${String(
          hoje.getMonth() + 1
        ).padStart(2, "0")}`;

      return compraValidaNaCompetencia(
        {
          ...proposta,
          produto: "Compra de Dívida",
        },
        competenciaTexto
      );
    }

    /*
     * Hoje, Semana e Todos continuam sendo tratados
     * pela data do pagamento logo abaixo.
     */
    return true;
  })
  .forEach((proposta) => {
        const pagamento =
  converterData(proposta.dataPagamento);

if (
  periodo !== "Mês" &&
  !estaNoPeriodo(pagamento, periodo)
) {
  return;
}

        const nome =
          proposta.vendedora?.trim() || "Sem consultora";

        const chave = normalizarTexto(nome);

        const atual = agrupado.get(chave) || {
          nome,
          contratosCompra: 0,
          contratosClt: 0,
          contratosTotal: 0,
          producaoCompra: 0,
          producaoClt: 0,
          producaoTotal: 0,
          metaAtivada: false,
          faixa: null,
          premiacaoCompra: 0,
          premiacaoClt: 0,
          premiacaoTotal: 0,
        };

        atual.contratosCompra += 1;
        atual.producaoCompra += valorValidoCompraDivida(proposta);

        agrupado.set(chave, atual);
      });

    registrosClt
      .filter((registro) => {
        if (produto === "Compra de Dívida") return false;

        if (
          nomesPermitidosTime &&
          !nomesPermitidosTime.has(
            normalizarTexto(registro.consultora || "")
          )
        ) {
          return false;
        }

        return normalizarTexto(registro.status) === "pago";
      })
      .forEach((registro) => {
        const data = dataClt(registro);

        if (!estaNoPeriodo(data, periodo)) return;

        const nome =
          registro.consultora?.trim() || "Sem consultora";

        const chave = normalizarTexto(nome);

        const atual = agrupado.get(chave) || {
          nome,
          contratosCompra: 0,
          contratosClt: 0,
          contratosTotal: 0,
          producaoCompra: 0,
          producaoClt: 0,
          producaoTotal: 0,
          metaAtivada: false,
          faixa: null,
          premiacaoCompra: 0,
          premiacaoClt: 0,
          premiacaoTotal: 0,
        };

        atual.contratosClt += 1;
        atual.producaoClt += Number(registro.parcela || 0);

        agrupado.set(chave, atual);
      });

    return Array.from(agrupado.values())
      .map((item) => {
        const contratosTotal =
          item.contratosCompra + item.contratosClt;

        const producaoTotal =
          item.producaoCompra + item.producaoClt;

        const resultadoCompra =
  calcularPremiacaoCompra(item.producaoCompra);

const resultadoClt =
  calcularPremiacaoClt(item.producaoClt);

const premiacaoCompra =
  resultadoCompra.premio;

const premiacaoClt =
  resultadoClt.premio;

const premiacaoTotal =
  premiacaoCompra + premiacaoClt;

const faixaCompra =
  resultadoCompra.faixa;

const faixaClt =
  resultadoClt.faixa;

const metaAtivada =
  resultadoCompra.atingiuMetaMinima ||
  resultadoClt.atingiuMetaMinima;

        return {
          ...item,
          contratosTotal,
          producaoTotal,
          metaAtivada,
faixa: faixaCompra
  ? {
      meta: faixaCompra.meta,
      percentualCompra:
        faixaCompra.percentual,
      premiacaoClt:
        faixaClt?.premioFixo || 0,
      nome: faixaCompra.nome,
    }
  : faixaClt
    ? {
        meta: faixaClt.meta,
        percentualCompra: 0,
        premiacaoClt:
          faixaClt.premioFixo,
        nome: faixaClt.nome,
      }
    : null,
          premiacaoCompra,
          premiacaoClt,
          premiacaoTotal,
        };
      })
      .filter((item) =>
        item.nome
          .toLowerCase()
          .includes(busca.trim().toLowerCase())
      )
      .sort((a, b) => b.producaoTotal - a.producaoTotal);
  }, [
    propostas,
    registrosClt,
    periodo,
    busca,
    produto,
    nomesPermitidosTime,
    timeSelecionado,
  ]);

  const resumo = useMemo(() => {
    return {
      consultoras: ranking.length,
      contratos: ranking.reduce(
        (total, item) => total + item.contratosTotal,
        0
      ),
      compraDivida: ranking.reduce(
        (total, item) => total + item.producaoCompra,
        0
      ),
      clt: ranking.reduce(
        (total, item) => total + item.producaoClt,
        0
      ),
      total: ranking.reduce(
        (total, item) => total + item.producaoTotal,
        0
      ),
      premiacao: ranking.reduce(
        (total, item) => total + item.premiacaoTotal,
        0
      ),
    };
  }, [ranking]);

  const podium = ranking.slice(0, 3);
  const maiorValor = ranking[0]?.producaoTotal || 1;

  function fotoDaConsultora(nome: string) {
    const usuario = usuariosRanking.find(
      (item) =>
        normalizarTexto(item.nome || "") ===
        normalizarTexto(nome)
    );

    return String(
      usuario?.foto ||
      usuario?.foto_url ||
      ""
    );
  }

  function proximaMeta(producao: number) {
    const proxima = FAIXAS_PREMIACAO.find(
      (faixa) => producao < faixa.meta
    );

    const meta = proxima?.meta || Math.max(producao, 1);

    return {
      meta,
      progresso: Math.min(100, Math.max(0, (producao / meta) * 100)),
      falta: Math.max(meta - producao, 0),
    };
  }

  const primeiroLugar = podium[0] || null;
  const segundoLugar = podium[1] || null;
  const terceiroLugar = podium[2] || null;

  const colunasTabela = podeVerPremiacao
    ? "70px minmax(145px, 1.1fr) 75px 125px 100px 125px 100px 115px 115px minmax(130px, 1fr)"
    : "80px minmax(170px, 1.2fr) 90px 145px 125px 145px 120px minmax(145px, 1fr)";

  return (
    <div className="ranking-page ranking-reference-page">
      <section className="ranking-reference-header">
        <div className="ranking-reference-title">
          <h2>Ranking de Vendas</h2>
          <p>
            Acompanhe a disputa do mês, evolução das metas e
            desempenho individual da equipe.
          </p>
        </div>

        <div className="ranking-reference-filters">
          <label>
            Produto
            <select
              value={produto}
              onChange={(event) =>
                setProduto(
                  event.target.value as ProdutoRanking
                )
              }
            >
              <option>Todos</option>
              <option>Compra de Dívida</option>
              <option>CLT</option>
            </select>
          </label>

          <label>
            Time
            <select
              value={timeSelecionado}
              onChange={(event) =>
                setTimeSelecionado(
                  event.target.value
                )
              }
            >
              <option value="Todos">
                Todos os times
              </option>

              {timesRanking
                .filter(
                  (time) =>
                    time.ativo !== false
                )
                .map((time) => (
                  <option
                    key={time.id}
                    value={time.id}
                  >
                    {time.nome}
                  </option>
                ))}
            </select>
          </label>

          <label>
            Período
            <select
              value={periodo}
              onChange={(event) =>
                setPeriodo(
                  event.target.value as Periodo
                )
              }
            >
              <option>Hoje</option>
              <option>Semana</option>
              <option>Mês</option>
              <option>Todos</option>
            </select>
          </label>

          <label className="ranking-reference-search">
            Consultora
            <input
              value={busca}
              onChange={(event) =>
                setBusca(
                  event.target.value
                )
              }
              placeholder="Pesquisar consultora"
            />
          </label>

          <button
            type="button"
            className="ranking-reference-refresh"
            onClick={() => void carregar()}
            disabled={atualizando}
          >
            {atualizando
              ? "Atualizando..."
              : "↻ Atualizar"}
          </button>
        </div>
      </section>

      <section className="ranking-reference-metrics">
        <article>
          <div className="ranking-metric-icon metric-blue">↗</div>
          <div>
            <span>Produção total</span>
            <strong>{moeda(resumo.total)}</strong>
            <small>Compra + CLT no período</small>
          </div>
        </article>

        <article>
          <div className="ranking-metric-icon metric-orange">♜</div>
          <div>
            <span>Top 3</span>
            <strong>
              {moeda(
                podium.reduce(
                  (total, item) =>
                    total + item.producaoTotal,
                  0
                )
              )}
            </strong>
            <small>Soma dos três primeiros</small>
          </div>
        </article>

        <article>
          <div className="ranking-metric-icon metric-green">◎</div>
          <div>
            <span>Contratos pagos</span>
            <strong>{resumo.contratos}</strong>
            <small>Produção efetivada</small>
          </div>
        </article>

        <article>
          <div className="ranking-metric-icon metric-purple">●</div>
          <div>
            <span>Consultoras</span>
            <strong>{resumo.consultoras}</strong>
            <small>No ranking atual</small>
          </div>
        </article>
      </section>

      {ranking.length === 0 ? (
        <section className="ranking-reference-empty">
          <div>🏆</div>
          <strong>
            Nenhuma produção paga neste período
          </strong>
          <p>
            Ajuste os filtros ou aguarde novas propostas pagas.
          </p>
        </section>
      ) : (
        <section className="ranking-reference-arena">
          <div className="ranking-reference-arena-head">
            <div>
              <span>TOP PERFORMANCE</span>
              <h3>Pódio de vendas</h3>
              <p>
                Destaques do período com produção, contratos e
                avanço de meta.
              </p>
            </div>

            <div className="ranking-reference-live">
              <i />
              Atualizado agora
            </div>
          </div>

          <div className="ranking-reference-main">
            <div className="ranking-reference-podium">
              {segundoLugar && (() => {
                const meta = proximaMeta(
                  segundoLugar.producaoTotal
                );
                const foto =
                  fotoDaConsultora(
                    segundoLugar.nome
                  );

                return (
                  <article className="reference-podium-card reference-second">
                    <div className="reference-medal medal-silver">
                      2
                    </div>

                    <div className="reference-avatar">
                      {foto ? (
                        <img
                          src={foto}
                          alt={segundoLugar.nome}
                        />
                      ) : (
                        iniciais(
                          segundoLugar.nome
                        )
                      )}
                    </div>

                    <strong className="reference-name">
                      {segundoLugar.nome}
                    </strong>

                    <span className="reference-value">
                      {moeda(
                        segundoLugar.producaoTotal
                      )}
                    </span>

                    <small>
                      {segundoLugar.contratosTotal} contratos
                    </small>

                    <div className="reference-goal-line">
                      <strong>
                        {meta.progresso.toFixed(0)}%
                      </strong>
                      <span>
                        {meta.falta > 0
                          ? `Faltam ${moeda(meta.falta)}`
                          : "Meta atingida"}
                      </span>
                    </div>

                    <div className="reference-progress">
                      <i
                        style={{
                          width: `${Math.max(
                            4,
                            meta.progresso
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="reference-base reference-base-blue" />
                  </article>
                );
              })()}

              {primeiroLugar && (() => {
                const meta = proximaMeta(
                  primeiroLugar.producaoTotal
                );
                const foto =
                  fotoDaConsultora(
                    primeiroLugar.nome
                  );

                return (
                  <article className="reference-podium-card reference-first">
                    <div className="reference-crown">
                      ♛
                    </div>

                    <div className="reference-medal medal-gold">
                      1
                    </div>

                    <div className="reference-avatar">
                      {foto ? (
                        <img
                          src={foto}
                          alt={primeiroLugar.nome}
                        />
                      ) : (
                        iniciais(
                          primeiroLugar.nome
                        )
                      )}
                    </div>

                    <strong className="reference-name">
                      {primeiroLugar.nome}
                    </strong>

                    <span className="reference-value">
                      {moeda(
                        primeiroLugar.producaoTotal
                      )}
                    </span>

                    <small>
                      {primeiroLugar.contratosTotal} contratos
                    </small>

                    <div className="reference-goal-line">
                      <strong>
                        {meta.progresso.toFixed(0)}%
                      </strong>
                      <span>
                        {meta.falta > 0
                          ? `Faltam ${moeda(meta.falta)}`
                          : "Meta atingida"}
                      </span>
                    </div>

                    <div className="reference-progress">
                      <i
                        style={{
                          width: `${Math.max(
                            4,
                            meta.progresso
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="reference-base reference-base-gold" />
                  </article>
                );
              })()}

              {terceiroLugar && (() => {
                const meta = proximaMeta(
                  terceiroLugar.producaoTotal
                );
                const foto =
                  fotoDaConsultora(
                    terceiroLugar.nome
                  );

                return (
                  <article className="reference-podium-card reference-third">
                    <div className="reference-medal medal-bronze">
                      3
                    </div>

                    <div className="reference-avatar">
                      {foto ? (
                        <img
                          src={foto}
                          alt={terceiroLugar.nome}
                        />
                      ) : (
                        iniciais(
                          terceiroLugar.nome
                        )
                      )}
                    </div>

                    <strong className="reference-name">
                      {terceiroLugar.nome}
                    </strong>

                    <span className="reference-value">
                      {moeda(
                        terceiroLugar.producaoTotal
                      )}
                    </span>

                    <small>
                      {terceiroLugar.contratosTotal} contratos
                    </small>

                    <div className="reference-goal-line">
                      <strong>
                        {meta.progresso.toFixed(0)}%
                      </strong>
                      <span>
                        {meta.falta > 0
                          ? `Faltam ${moeda(meta.falta)}`
                          : "Meta atingida"}
                      </span>
                    </div>

                    <div className="reference-progress">
                      <i
                        style={{
                          width: `${Math.max(
                            4,
                            meta.progresso
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="reference-base reference-base-orange" />
                  </article>
                );
              })()}
            </div>

            <div className="ranking-reference-list">
              <h4>CLASSIFICAÇÃO GERAL</h4>

              <div className="reference-list-head">
                <span>#</span>
                <span>Consultora</span>
                <span>Produção</span>
                <span>Contratos</span>
                <span>Meta</span>
              </div>

              {ranking.slice(3, 7).map(
                (item, index) => {
                  const meta = proximaMeta(
                    item.producaoTotal
                  );
                  const foto =
                    fotoDaConsultora(
                      item.nome
                    );
                  const posicao = index + 4;

                  return (
                    <article
                      className="reference-list-row"
                      key={item.nome}
                    >
                      <div className="reference-list-position">
                        {posicao}
                      </div>

                      <div className="reference-list-person">
                        <div className="reference-list-avatar">
                          {foto ? (
                            <img
                              src={foto}
                              alt={item.nome}
                            />
                          ) : (
                            iniciais(item.nome)
                          )}
                        </div>

                        <div>
                          <strong>
                            {item.nome}
                          </strong>
                          <span>
                            {item.contratosTotal} contratos
                          </span>
                        </div>
                      </div>

                      <div className="reference-list-production">
                        <strong>
                          {moeda(
                            item.producaoTotal
                          )}
                        </strong>
                        <span>
                          CD {moeda(item.producaoCompra)}
                          {" + "}
                          CLT {moeda(item.producaoClt)}
                        </span>
                      </div>

                      <strong className="reference-contracts">
                        {item.contratosTotal}
                      </strong>

                      <div className="reference-list-meta">
                        <strong>
                          {meta.progresso.toFixed(0)}%
                        </strong>

                        <div>
                          <i
                            style={{
                              width: `${Math.max(
                                4,
                                meta.progresso
                              )}%`,
                            }}
                          />
                        </div>

                        <span>
                          {meta.falta > 0
                            ? `Faltam ${moeda(meta.falta)}`
                            : "Meta atingida"}
                        </span>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </div>
        </section>
      )}

      <section className="ranking-reference-note">
        <b>ⓘ</b>
        <span>
          <strong>Sobre o ranking:</strong>{" "}
          Os valores consideram a produção total
          (Compra de Dívida + CLT) no período selecionado.
        </span>
      </section>
    </div>
  );
}