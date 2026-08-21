"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import "./ranking.css";

import {
  calcularPremiacaoCompra,
  calcularPremiacaoClt,
} from "@/lib/premiacao/premiacaoService";
type Periodo = "Hoje" | "Semana" | "Mês" | "Todos" | "Personalizado";
type ProdutoRanking = "Todos" | "Compra de Dívida" | "CLT";

type FiltrosRanking = {
  periodo: Periodo;
  dataInicial: string;
  dataFinal: string;
  produto: ProdutoRanking;
  timeSelecionado: string;
};

type UsuarioRanking = {
  nome?: string;
  foto?: string;
  foto_url?: string;
  time_id?: string | null;
  perfil?: string;
  cargo?: string;
  ativo?: boolean;
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

type RankingServidorItem = {
  posicao: number;
  id?: string;
  nome: string;
  fotoUrl?: string;
  timeId?: string | null;
  contratosCompra?: number;
  contratosClt?: number;
  contratos: number;
  producaoCompra?: number | null;
  producaoClt?: number | null;
  producao: number | null;
};

type RankingItem = {
  nome: string;
  fotoUrl?: string;
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
  dataInicial?: string,
  dataFinal?: string
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
    return mesmaCompetencia(alvo, hoje);
  }

  if (periodo === "Personalizado") {
    const inicio = dataInicial ? converterData(dataInicial) : null;
    const fim = dataFinal ? converterData(dataFinal) : null;

    if (inicio) inicio.setHours(0, 0, 0, 0);
    if (fim) fim.setHours(23, 59, 59, 999);

    if (inicio && alvo < inicio) return false;
    if (fim && alvo > fim) return false;

    return true;
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

  const [
    rankingPagoServidor,
    setRankingPagoServidor,
  ] = useState<RankingServidorItem[]>([]);

  const [
    rankingServidorCarregado,
    setRankingServidorCarregado,
  ] = useState(false);

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

  const [nomeUsuarioAtual, setNomeUsuarioAtual] =
    useState("");

  const [ehConsultoraAtual, setEhConsultoraAtual] =
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
  }, []);

  useEffect(() => {
    void carregar({
      periodo,
      dataInicial,
      dataFinal,
      produto,
      timeSelecionado,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, dataInicial, dataFinal, produto, timeSelecionado]);

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

      const nomeAtual = String(
        usuarioAtual?.nome ||
          localStorage.getItem("somos-eleva-nome") ||
          ""
      ).trim();

      setNomeUsuarioAtual(nomeAtual);

      setEhConsultoraAtual(
        perfilAtual.includes("consultor") ||
          perfilAtual.includes("vendedor")
      );
    } catch {
      setPodeVerPremiacao(false);
      setNomeUsuarioAtual("");
      setEhConsultoraAtual(false);
    }
  }

  async function carregar(filtros?: FiltrosRanking) {
    const filtrosAtuais: FiltrosRanking = filtros ?? {
      periodo,
      dataInicial,
      dataFinal,
      produto,
      timeSelecionado,
    };
    setAtualizando(true);
  try {
    const { data, error } =
      await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error(
        "Sua sessão expirou. Entre novamente no sistema."
      );
    }

    const paramsRanking =
      new URLSearchParams({
        periodo: filtrosAtuais.periodo,
        dataInicial: filtrosAtuais.dataInicial,
        dataFinal: filtrosAtuais.dataFinal,
        produto: filtrosAtuais.produto,
        timeId: filtrosAtuais.timeSelecionado,
      });

    const [
      resposta,
      respostaTimes,
      respostaRankingPago,
    ] =
      await Promise.all([
        fetch("/api/propostas", {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${data.session.access_token}`,
          },
          cache: "no-store",
          credentials: "omit",
        }),
        fetch("/api/times", {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${data.session.access_token}`,
          },
          cache: "no-store",
          credentials: "omit",
        }),
        fetch(
          `/api/ranking?${paramsRanking.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${data.session.access_token}`,
            },
            cache: "no-store",
            credentials: "omit",
          }
        ),
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

    try {
      const conteudoRankingPago =
        (await respostaRankingPago.json()) as {
          ranking?: RankingServidorItem[];
          erro?: string;
        };

      if (respostaRankingPago.ok) {
        setRankingPagoServidor(
          Array.isArray(
            conteudoRankingPago.ranking
          )
            ? conteudoRankingPago.ranking
            : []
        );
        setRankingServidorCarregado(true);
      } else {
        console.error(
          "Erro no ranking pago:",
          conteudoRankingPago.erro
        );
        setRankingPagoServidor([]);
        setRankingServidorCarregado(false);
      }
    } catch {
      setRankingPagoServidor([]);
      setRankingServidorCarregado(false);
    }

    // A API /api/propostas é apenas complementar aqui.
    // O ranking oficial de contratos pagos vem de /api/ranking.
    // Se /api/propostas responder vazio/inválido, NÃO podemos zerar o ranking.
    try {
      const textoPropostas =
        await resposta.text();

      if (textoPropostas.trim()) {
        const conteudo =
          JSON.parse(textoPropostas) as {
            propostas?: PropostaCompraDivida[];
            erro?: string;
          };

        if (resposta.ok) {
          setPropostas(
            Array.isArray(conteudo.propostas)
              ? conteudo.propostas
              : []
          );
        } else {
          console.warn(
            "API de propostas não carregou:",
            conteudo.erro
          );
          setPropostas([]);
        }
      } else {
        setPropostas([]);
      }
    } catch (erroPropostas) {
      console.warn(
        "Resposta inválida de /api/propostas. O ranking pago continuará funcionando.",
        erroPropostas
      );
      setPropostas([]);
    }
  } catch (erro) {
    console.error(
      "Erro ao carregar o Ranking:",
      erro
    );

    // Mantém a tela utilizável mesmo se uma API complementar falhar.
    setPropostas([]);
    setRankingServidorCarregado(false);
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

  const consultorasDeVendas = useMemo(() => {
    return usuariosRanking.filter((usuario) => {
      const perfil = normalizarTexto(
        String(
          usuario.perfil ||
          usuario.cargo ||
          ""
        )
      );

      return (
        usuario.ativo !== false &&
        (
          perfil === "consultora" ||
          perfil === "consultor" ||
          perfil.includes("consultora de vendas") ||
          perfil.includes("consultor de vendas")
        )
      );
    });
  }, [usuariosRanking]);

  const nomesConsultorasDeVendas = useMemo(
    () =>
      new Set(
        consultorasDeVendas
          .map((usuario) =>
            normalizarTexto(usuario.nome || "")
          )
          .filter(Boolean)
      ),
    [consultorasDeVendas]
  );

  const rankingLocal = useMemo(() => {
    const agrupado = new Map<string, RankingItem>();

    propostas
      .filter((proposta) => {
        if (produto === "CLT") return false;

        const nomeVendedora =
          normalizarTexto(
            proposta.vendedora || ""
          );

        if (
          nomesConsultorasDeVendas.size > 0 &&
          !nomesConsultorasDeVendas.has(
            nomeVendedora
          )
        ) {
          return false;
        }

        if (
          nomesPermitidosTime &&
          !nomesPermitidosTime.has(
            nomeVendedora
          )
        ) {
          return false;
        }

        if (normalizarTexto(proposta.status) !== "pago") {
          return false;
        }

        const dataReferencia =
  converterData(proposta.dataPagamento) ||
  converterData(proposta.dataCadastro);

return estaNoPeriodo(
  dataReferencia,
  periodo,
  dataInicial,
  dataFinal
);
      })
      .forEach((proposta) => {
        const nome = proposta.vendedora?.trim() || "";

        if (!nome) return;

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

        const nomeConsultora =
          normalizarTexto(
            registro.consultora || ""
          );

        if (
          nomesConsultorasDeVendas.size > 0 &&
          !nomesConsultorasDeVendas.has(
            nomeConsultora
          )
        ) {
          return false;
        }

        if (
          nomesPermitidosTime &&
          !nomesPermitidosTime.has(
            nomeConsultora
          )
        ) {
          return false;
        }

        return normalizarTexto(registro.status) === "pago";
      })
      .forEach((registro) => {
        const data = dataClt(registro);

        if (!estaNoPeriodo(data, periodo, dataInicial, dataFinal)) return;

        const nome = registro.consultora?.trim() || "";

        if (!nome) return;

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

    // Garante que todas as consultoras conhecidas apareçam no ranking,
    // mesmo sem produção paga no período selecionado.
    consultorasDeVendas.forEach((usuario) => {
      const nome = String(usuario.nome || "").trim();

      if (!nome) {
        return;
      }

      const chave = normalizarTexto(nome);

      if (!agrupado.has(chave)) {
        agrupado.set(chave, {
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
        });
      }
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
    dataInicial,
    dataFinal,
    usuariosRanking,
    consultorasDeVendas,
    nomesConsultorasDeVendas,
  ]);

  const ranking = useMemo(() => {
    if (rankingServidorCarregado) {
      return rankingPagoServidor
        .filter((item) =>
          normalizarTexto(item.nome).includes(
            normalizarTexto(busca)
          )
        )
        .map((item) => {
          const producaoCompra = Number(
            item.producaoCompra ??
              (produto === "CLT"
                ? 0
                : item.producao) ??
              0
          );

          const producaoClt = Number(
            item.producaoClt ?? 0
          );

          const producaoTotal = Number(
            item.producao ??
              producaoCompra + producaoClt
          );

          const contratosCompra = Number(
            item.contratosCompra ??
              (produto === "CLT"
                ? 0
                : item.contratos) ??
              0
          );

          const contratosClt = Number(
            item.contratosClt ?? 0
          );

          const contratosTotal = Number(
            item.contratos ??
              contratosCompra + contratosClt
          );

          const resultadoCompra =
            calcularPremiacaoCompra(
              producaoCompra
            );

          const resultadoClt =
            calcularPremiacaoClt(
              producaoClt
            );

          const faixaCompra =
            resultadoCompra.faixa;

          const faixaClt =
            resultadoClt.faixa;

          return {
            nome: item.nome,
            fotoUrl: item.fotoUrl || "",
            contratosCompra,
            contratosClt,
            contratosTotal,
            producaoCompra,
            producaoClt,
            producaoTotal,
            metaAtivada:
              resultadoCompra.atingiuMetaMinima ||
              resultadoClt.atingiuMetaMinima,
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
            premiacaoCompra:
              resultadoCompra.premio,
            premiacaoClt:
              resultadoClt.premio,
            premiacaoTotal:
              resultadoCompra.premio +
              resultadoClt.premio,
          };
        });
    }

    return rankingLocal;
  }, [
    rankingServidorCarregado,
    rankingPagoServidor,
    rankingLocal,
    busca,
    produto,
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
    const itemRanking = ranking.find(
      (item) =>
        normalizarTexto(item.nome || "") ===
        normalizarTexto(nome)
    );

    if (itemRanking?.fotoUrl) {
      return String(itemRanking.fotoUrl);
    }

    const usuario = usuariosRanking.find(
      (item) =>
        normalizarTexto(item.nome || "") ===
        normalizarTexto(nome)
    );

    if (
      normalizarTexto(nome) ===
      normalizarTexto(nomeUsuarioAtual)
    ) {
      return String(
        usuario?.foto ||
        usuario?.foto_url ||
        localStorage.getItem("somos-eleva-foto") ||
        ""
      );
    }

    return String(
      usuario?.foto ||
      usuario?.foto_url ||
      ""
    );
  }

  function podeVerValoresDaConsultora(nome: string) {
    // Administradora e Supervisora podem ver todos os valores.
    if (!ehConsultoraAtual) {
      return true;
    }

    // Consultora vê somente o próprio valor.
    return (
      normalizarTexto(nome) ===
      normalizarTexto(nomeUsuarioAtual)
    );
  }

  function valorRanking(
    nome: string,
    valor: number
  ) {
    return podeVerValoresDaConsultora(nome)
      ? moeda(valor)
      : "Valor privado";
  }

  function detalheMetaRanking(
    nome: string,
    falta: number
  ) {
    if (!podeVerValoresDaConsultora(nome)) {
      return "Privado";
    }

    return falta > 0
      ? `Faltam ${moeda(falta)}`
      : "Meta atingida";
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
              onChange={(event) => {
                const novoPeriodo =
                  event.target.value as Periodo;

                setPeriodo(novoPeriodo);

                const agora = new Date();

                if (novoPeriodo === "Hoje") {
                  const hojeIso =
                    agora.toISOString().slice(0, 10);

                  setDataInicial(hojeIso);
                  setDataFinal(hojeIso);
                }

                if (novoPeriodo === "Semana") {
                  const inicio =
                    inicioDaSemana(agora);

                  setDataInicial(
                    inicio.toISOString().slice(0, 10)
                  );
                  setDataFinal(
                    agora.toISOString().slice(0, 10)
                  );
                }

                if (novoPeriodo === "Mês") {
                  const inicio =
                    inicioDoMes(agora);

                  const fim =
                    new Date(
                      agora.getFullYear(),
                      agora.getMonth() + 1,
                      0
                    );

                  setDataInicial(
                    inicio.toISOString().slice(0, 10)
                  );
                  setDataFinal(
                    fim.toISOString().slice(0, 10)
                  );
                }
              }}
            >
              <option>Hoje</option>
              <option>Semana</option>
              <option>Mês</option>
              <option>Personalizado</option>
              <option>Todos</option>
            </select>
          </label>

          <label>
            Data inicial
            <input
              type="date"
              value={dataInicial}
              onChange={(event) => {
                setDataInicial(event.target.value);
                setPeriodo("Personalizado");
              }}
            />
          </label>

          <label>
            Data final
            <input
              type="date"
              value={dataFinal}
              onChange={(event) => {
                setDataFinal(event.target.value);
                setPeriodo("Personalizado");
              }}
            />
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
            onClick={() =>
              void carregar({
                periodo,
                dataInicial,
                dataFinal,
                produto,
                timeSelecionado,
              })
            }
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
            <strong>
              {ehConsultoraAtual
                ? moeda(
                    ranking
                      .filter(
                        (item) =>
                          normalizarTexto(item.nome) ===
                          normalizarTexto(nomeUsuarioAtual)
                      )
                      .reduce(
                        (total, item) =>
                          total + item.producaoTotal,
                        0
                      )
                  )
                : moeda(resumo.total)}
            </strong>
            <small>Compra + CLT no período</small>
          </div>
        </article>

        <article>
          <div className="ranking-metric-icon metric-orange">♜</div>
          <div>
            <span>Top 3</span>
            <strong>
              {ehConsultoraAtual
                ? "Ranking visível"
                : moeda(
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
            <div
              className="ranking-reference-podium"
              style={{
                transform: "translateY(-70px)",
              }}
            >
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
                      {valorRanking(
                        segundoLugar.nome,
                        segundoLugar.producaoTotal
                      )}
                    </span>

                    <small>
                      {segundoLugar.contratosTotal} contratos
                    </small>

                    <div className="reference-goal-line">
                      <strong>
                        {podeVerValoresDaConsultora(segundoLugar.nome)
                          ? `${meta.progresso.toFixed(0)}%`
                          : "—"}
                      </strong>
                      <span>
                        {detalheMetaRanking(
                          segundoLugar.nome,
                          meta.falta
                        )}
                      </span>
                    </div>

                    <div className="reference-progress">
                      <i
                        style={{
                          width: podeVerValoresDaConsultora(segundoLugar.nome)
                            ? `${Math.max(
                                4,
                                meta.progresso
                              )}%`
                            : "0%",
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
                      {valorRanking(
                        primeiroLugar.nome,
                        primeiroLugar.producaoTotal
                      )}
                    </span>

                    <small>
                      {primeiroLugar.contratosTotal} contratos
                    </small>

                    <div className="reference-goal-line">
                      <strong>
                        {podeVerValoresDaConsultora(primeiroLugar.nome)
                          ? `${meta.progresso.toFixed(0)}%`
                          : "—"}
                      </strong>
                      <span>
                        {detalheMetaRanking(
                          primeiroLugar.nome,
                          meta.falta
                        )}
                      </span>
                    </div>

                    <div className="reference-progress">
                      <i
                        style={{
                          width: podeVerValoresDaConsultora(primeiroLugar.nome)
                            ? `${Math.max(
                                4,
                                meta.progresso
                              )}%`
                            : "0%",
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
                      {valorRanking(
                        terceiroLugar.nome,
                        terceiroLugar.producaoTotal
                      )}
                    </span>

                    <small>
                      {terceiroLugar.contratosTotal} contratos
                    </small>

                    <div className="reference-goal-line">
                      <strong>
                        {podeVerValoresDaConsultora(terceiroLugar.nome)
                          ? `${meta.progresso.toFixed(0)}%`
                          : "—"}
                      </strong>
                      <span>
                        {detalheMetaRanking(
                          terceiroLugar.nome,
                          meta.falta
                        )}
                      </span>
                    </div>

                    <div className="reference-progress">
                      <i
                        style={{
                          width: podeVerValoresDaConsultora(terceiroLugar.nome)
                            ? `${Math.max(
                                4,
                                meta.progresso
                              )}%`
                            : "0%",
                        }}
                      />
                    </div>

                    <div className="reference-base reference-base-orange" />
                  </article>
                );
              })()}
            </div>

            <div
              className="ranking-reference-list"
              style={{
                maxHeight: "590px",
                overflowY: "auto",
                alignSelf: "flex-start",
              }}
            >
              <h4>CLASSIFICAÇÃO GERAL</h4>

              <div className="reference-list-head">
                <span>#</span>
                <span>Consultora</span>
                <span>Produção</span>
                <span>Contratos</span>
                <span>Meta</span>
              </div>

              {ranking.length <= 3 ? (
                <div
                  style={{
                    padding: "28px 18px",
                    textAlign: "center",
                    color: "#93a4bd",
                    fontSize: 13,
                  }}
                >
                  Todas as posições atuais estão no pódio.
                </div>
              ) : ranking.slice(3).map(
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
                          {valorRanking(
                            item.nome,
                            item.producaoTotal
                          )}
                        </strong>
                        <span>
                          {podeVerValoresDaConsultora(item.nome)
                            ? `CD ${moeda(item.producaoCompra)} + CLT ${moeda(item.producaoClt)}`
                            : "Valores ocultos"}
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
                              width: podeVerValoresDaConsultora(item.nome)
                              ? `${Math.max(
                                  4,
                                  meta.progresso
                                )}%`
                              : "0%",
                            }}
                          />
                        </div>

                        <span>
                          {detalheMetaRanking(
                            item.nome,
                            meta.falta
                          )}
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