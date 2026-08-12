"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

import "./dashboard.css";

type PerfilAtual = {
  id?: string;
  nome?: string;
  perfil?: string;
};

type PropostaCompra = {
  id?: string;
  numeroProposta?: string;
  cliente?: string;
  cpf?: string;
  vendedora?: string;
  consultora?: string;
  banco?: string;
  tabela?: string;
  percentualTabela?: number;
  valorContrato?: number;
  valorMeta?: number;
  parcela?: number;
  status?: string;
  dataCadastro?: string;
  dataPagamento?: string;
};

type RegistroClt = {
  id?: string;
  nome?: string;
  cpf?: string;
  consultora?: string;
  valorAprovado?: number;
  parcela?: number;
  prazo?: number;
  status?: string;
  criadoEm?: string;
  atualizadoEm?: string;
  dataPagamento?: string;
};

type RespostaApi = {
  erro?: string;
  perfil?: PerfilAtual;
  propostas?: PropostaCompra[];
  registros?: RegistroClt[];
};

type MembroTimeDashboard = {
  id?: string;
  nome?: string;
  perfil?: string;
  time_id?: string | null;
};

type TimeDashboard = {
  id: string;
  nome: string;
  supervisor_id?: string | null;
  ativo?: boolean;
  membros?: MembroTimeDashboard[];
};

type RespostaTimesDashboard = {
  erro?: string;
  perfil?: PerfilAtual;
  times?: TimeDashboard[];
};

type Periodo =
  | "Hoje"
  | "Esta semana"
  | "Este mês"
  | "Este ano"
  | "Tudo"
  | "Personalizado";

type ProdutoFiltro =
  | "Todos"
  | "Compra de Dívida"
  | "CLT";

type LinhaEquipe = {
  nome: string;
  propostasCompra: number;
  propostasClt: number;
  propostas: number;
  compraBruta: number;
  compraFinal: number;
  cltBruto: number;
  cltFinal: number;
  valorBruto: number;
  valorFinal: number;
  percentual: number;
};

const TABELAS = [
  {
    nome: "NEO NORMAL",
    percentual: 100,
  },
  {
    nome: "NEO FLEX 1",
    percentual: 82,
  },
  {
    nome: "NEO FLEX 2",
    percentual: 67,
  },
  {
    nome: "NEO FLEX 3",
    percentual: 52,
  },
  {
    nome: "NEO FLEX 4",
    percentual: 37,
  },
  {
    nome: "NEO FLEX 5",
    percentual: 17,
  },
];

function normalizarTexto(
  valor: unknown,
) {
  return String(valor || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .trim()
    .toLowerCase();
}

function perfilEhConsultora(
  perfil: string,
) {
  const texto =
    normalizarTexto(perfil);

  return (
    texto.includes("consultor") ||
    texto.includes("vendedor")
  );
}

function moeda(
  valor: number,
) {
  return Number(valor || 0)
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
}

function numero(
  valor: number,
) {
  return Number(valor || 0)
    .toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    });
}

function hojeIso() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function primeiroDiaMes() {
  const hoje = new Date();

  return new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    1,
  )
    .toISOString()
    .slice(0, 10);
}

function converterData(
  valor?: string,
) {
  if (!valor) {
    return null;
  }

  const texto =
    String(valor).trim();

  const iso = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  );

  if (iso) {
    return new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
    );
  }

  const brasileira =
    texto.match(
      /(\d{2})\/(\d{2})\/(\d{4})/,
    );

  if (brasileira) {
    return new Date(
      Number(brasileira[3]),
      Number(brasileira[2]) - 1,
      Number(brasileira[1]),
    );
  }

  const tentativa =
    new Date(texto);

  return Number.isNaN(
    tentativa.getTime(),
  )
    ? null
    : tentativa;
}

function mesmaData(
  data: Date,
  referencia: Date,
) {
  return (
    data.getFullYear() ===
      referencia.getFullYear() &&
    data.getMonth() ===
      referencia.getMonth() &&
    data.getDate() ===
      referencia.getDate()
  );
}

function inicioSemana(data: Date) {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);

  const diaSemana = copia.getDay();
  const diferenca = diaSemana === 0 ? -6 : 1 - diaSemana;

  copia.setDate(copia.getDate() + diferenca);

  return copia;
}

function fimSemana(data: Date) {
  const inicio = inicioSemana(data);
  const fim = new Date(inicio);

  fim.setDate(fim.getDate() + 6);
  fim.setHours(23, 59, 59, 999);

  return fim;
}

function statusNormalizado(valor?: string) {
  return normalizarTexto(valor).replace(/\s+/g, " ");
}

function propostaCompraPaga(status?: string) {
  return statusNormalizado(status) === "pago";
}

function propostaCompraCancelada(status?: string) {
  const texto = statusNormalizado(status);

  return texto === "cancelada" || texto === "cancelado";
}

function propostaCltPaga(status?: string) {
  return statusNormalizado(status) === "pago";
}

function propostaCltCancelada(status?: string) {
  const texto = statusNormalizado(status);

  return (
    texto === "cancelada" ||
    texto === "cancelado" ||
    texto === "recusada" ||
    texto === "recusado"
  );
}

function estaNoPeriodo(
  data: Date | null,
  periodo: Periodo,
  inicio: string,
  fim: string,
) {
  if (!data) {
    return false;
  }

  const hoje = new Date();

  if (periodo === "Hoje") {
    return mesmaData(data, hoje);
  }

  if (periodo === "Esta semana") {
    return data >= inicioSemana(hoje) && data <= fimSemana(hoje);
  }

  if (periodo === "Este mês") {
    return (
      data.getFullYear() ===
        hoje.getFullYear() &&
      data.getMonth() ===
        hoje.getMonth()
    );
  }

  if (periodo === "Este ano") {
    return (
      data.getFullYear() ===
      hoje.getFullYear()
    );
  }

  if (periodo === "Tudo") {
    return true;
  }

  const dataInicial =
    converterData(inicio);

  const dataFinal =
    converterData(fim);

  if (!dataInicial || !dataFinal) {
    return true;
  }

  dataInicial.setHours(
    0,
    0,
    0,
    0,
  );

  dataFinal.setHours(
    23,
    59,
    59,
    999,
  );

  return (
    data >= dataInicial &&
    data <= dataFinal
  );
}

function dataBR(valor?: string) {
  const data = converterData(valor);

  if (!data) return "—";

  return data.toLocaleDateString("pt-BR");
}

function percentualTabela(
  proposta: PropostaCompra,
) {
  const nome =
    normalizarTexto(
      proposta.tabela,
    );

  const encontrada =
    TABELAS.find((tabela) =>
      nome.startsWith(
        normalizarTexto(
          tabela.nome,
        ),
      ),
    );

  if (encontrada) {
    return encontrada.percentual;
  }

  return Number(
    proposta.percentualTabela ||
      0,
  );
}

function valorFinalCompra(
  proposta: PropostaCompra,
) {
  const valorSalvo =
    Number(
      proposta.valorMeta || 0,
    );

  if (valorSalvo > 0) {
    return valorSalvo;
  }

  return (
    Number(
      proposta.valorContrato || 0,
    ) *
    (percentualTabela(proposta) /
      100)
  );
}

function dataCompra(
  proposta: PropostaCompra,
) {
  return converterData(
    proposta.dataPagamento ||
      proposta.dataCadastro,
  );
}

function dataClt(
  registro: RegistroClt,
) {
  return converterData(
    registro.dataPagamento ||
      registro.atualizadoEm ||
      registro.criadoEm,
  );
}

function nomeResponsavelCompra(
  proposta: PropostaCompra,
) {
  return (
    proposta.vendedora ||
    proposta.consultora ||
    "Sem consultora"
  ).trim();
}

function nomeResponsavelClt(
  registro: RegistroClt,
) {
  return (
    registro.consultora ||
    "Sem consultora"
  ).trim();
}

export default function DashboardClient() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [
    perfilAtual,
    setPerfilAtual,
  ] = useState<PerfilAtual | null>(
    null,
  );

  const [
    propostas,
    setPropostas,
  ] = useState<PropostaCompra[]>(
    [],
  );

  const [
    registrosClt,
    setRegistrosClt,
  ] = useState<RegistroClt[]>(
    [],
  );

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    mensagem,
    setMensagem,
  ] = useState("");

  const [
    periodo,
    setPeriodo,
  ] = useState<Periodo>(
    "Este mês",
  );

  const [
    dataInicial,
    setDataInicial,
  ] = useState(
    primeiroDiaMes(),
  );

  const [
    dataFinal,
    setDataFinal,
  ] = useState(
    hojeIso(),
  );

  const [
    status,
    setStatus,
  ] = useState("Todas");

  const [
    produto,
    setProduto,
  ] = useState<ProdutoFiltro>("Todos");

  const [
    times,
    setTimes,
  ] = useState<TimeDashboard[]>([]);

  const [
    timeSelecionado,
    setTimeSelecionado,
  ] = useState("Todos");

  const [
    busca,
    setBusca,
  ] = useState("");

  const [
    consultoraDetalhe,
    setConsultoraDetalhe,
  ] = useState<string | null>(null);

  const [
    detalheAberto,
    setDetalheAberto,
  ] = useState(false);

  const [
    detalheSomenteCanceladas,
    setDetalheSomenteCanceladas,
  ] = useState(false);

  async function obterSessao() {
    const {
      data,
      error,
    } =
      await supabase.auth.getSession();

    if (
      error ||
      !data.session?.access_token
    ) {
      throw new Error(
        "Sua sessão expirou. Entre novamente no sistema.",
      );
    }

    return data.session;
  }

  async function consultarApi(
    url: string,
    token: string,
  ): Promise<RespostaApi> {
    const resposta =
      await fetch(url, {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        cache: "no-store",
      });

    let conteudo: RespostaApi;

    try {
      conteudo =
        (await resposta.json()) as RespostaApi;
    } catch {
      throw new Error(
        "O servidor retornou uma resposta inválida.",
      );
    }

    if (!resposta.ok) {
      throw new Error(
        conteudo.erro ||
          "Não foi possível carregar os dados.",
      );
    }

    return conteudo;
  }

  async function carregarDados() {
    setCarregando(true);
    setMensagem("");

    try {
      const sessao =
        await obterSessao();

      const token =
        sessao.access_token;

      const [
        respostaPropostas,
        respostaClt,
        respostaTimesHttp,
      ] = await Promise.all([
        consultarApi(
          "/api/propostas",
          token,
        ),
        consultarApi(
          "/api/clt",
          token,
        ),
        fetch("/api/times", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }),
      ]);

      let respostaTimes:
        RespostaTimesDashboard = {};

      try {
        respostaTimes =
          (await respostaTimesHttp.json()) as RespostaTimesDashboard;
      } catch {
        respostaTimes = {};
      }

      if (!respostaTimesHttp.ok) {
        throw new Error(
          respostaTimes.erro ||
            "Não foi possível carregar os times.",
        );
      }

      setPerfilAtual(
        respostaPropostas.perfil ||
          respostaClt.perfil ||
          respostaTimes.perfil ||
          null,
      );

      setPropostas(
        Array.isArray(
          respostaPropostas.propostas,
        )
          ? respostaPropostas.propostas
          : [],
      );

      setRegistrosClt(
        Array.isArray(
          respostaClt.registros,
        )
          ? respostaClt.registros
          : [],
      );

      const listaTimes =
        Array.isArray(respostaTimes.times)
          ? respostaTimes.times
          : [];

      setTimes(listaTimes);

      const perfilResolvido =
        respostaPropostas.perfil ||
        respostaClt.perfil ||
        respostaTimes.perfil ||
        null;

      if (
        perfilResolvido?.perfil ===
          "Supervisora" &&
        listaTimes.length === 1
      ) {
        setTimeSelecionado(
          listaTimes[0].id,
        );
      }
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar o Dashboard.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarDados();
  }, [supabase]);

  const ehConsultora =
    Boolean(
      perfilAtual &&
        perfilEhConsultora(
          perfilAtual.perfil ||
            "",
        ),
    );

  const nomeUsuario =
    perfilAtual?.nome ||
    "Equipe Eleva";

  const timeAtual = useMemo(
    () =>
      timeSelecionado === "Todos"
        ? null
        : times.find(
            (time) =>
              time.id ===
              timeSelecionado,
          ) || null,
    [
      times,
      timeSelecionado,
    ],
  );

  const nomesPermitidosTime = useMemo(() => {
    if (!timeAtual) {
      return null;
    }

    return new Set(
      (timeAtual.membros || [])
        .map((membro) =>
          normalizarTexto(
            membro.nome,
          ),
        )
        .filter(Boolean),
    );
  }, [timeAtual]);

  function pertenceAoTime(
    nome?: string | null,
  ) {
    if (!nomesPermitidosTime) {
      return true;
    }

    return nomesPermitidosTime.has(
      normalizarTexto(nome),
    );
  }

  const cancelamentosPeriodo = useMemo(() => {
    const nomeUsuarioNormalizado =
      normalizarTexto(perfilAtual?.nome);

    const porConsultora = new Map<string, number>();

    let total = 0;

    propostas.forEach((proposta) => {
      const nome = nomeResponsavelCompra(proposta);

      if (!pertenceAoTime(nome)) {
        return;
      }

      if (
        ehConsultora &&
        normalizarTexto(nome) !== nomeUsuarioNormalizado
      ) {
        return;
      }

      if (!propostaCompraCancelada(proposta.status)) {
        return;
      }

      if (
        !estaNoPeriodo(
          converterData(
            proposta.dataCadastro ||
              proposta.dataPagamento,
          ),
          periodo,
          dataInicial,
          dataFinal,
        )
      ) {
        return;
      }

      total += 1;

      porConsultora.set(
        nome,
        (porConsultora.get(nome) || 0) + 1,
      );
    });

    registrosClt.forEach((registro) => {
      const nome = nomeResponsavelClt(registro);

      if (!pertenceAoTime(nome)) {
        return;
      }

      if (
        ehConsultora &&
        normalizarTexto(nome) !== nomeUsuarioNormalizado
      ) {
        return;
      }

      if (!propostaCltCancelada(registro.status)) {
        return;
      }

      if (
        !estaNoPeriodo(
          converterData(
            registro.atualizadoEm ||
              registro.criadoEm ||
              registro.dataPagamento,
          ),
          periodo,
          dataInicial,
          dataFinal,
        )
      ) {
        return;
      }

      total += 1;

      porConsultora.set(
        nome,
        (porConsultora.get(nome) || 0) + 1,
      );
    });

    return {
      total,
      porConsultora,
    };
  }, [
    propostas,
    registrosClt,
    perfilAtual,
    ehConsultora,
    periodo,
    dataInicial,
    dataFinal,
    timeSelecionado,
    nomesPermitidosTime,
  ]);

  const resultado =
    useMemo(() => {
      const nomeUsuarioNormalizado =
        normalizarTexto(
          perfilAtual?.nome,
        );

      const compraFiltrada =
        produto === "CLT"
          ? []
          : propostas.filter(
          (proposta) => {
            if (
              !pertenceAoTime(
                nomeResponsavelCompra(
                  proposta,
                ),
              )
            ) {
              return false;
            }

            if (
              ehConsultora &&
              normalizarTexto(
                nomeResponsavelCompra(
                  proposta,
                ),
              ) !==
                nomeUsuarioNormalizado
            ) {
              return false;
            }

            if (status === "Pagas" && !propostaCompraPaga(proposta.status)) {
              return false;
            }

            if (status === "Canceladas" && !propostaCompraCancelada(proposta.status)) {
              return false;
            }

            if (
              status === "Em andamento" &&
              (propostaCompraPaga(proposta.status) ||
                propostaCompraCancelada(proposta.status))
            ) {
              return false;
            }

            return estaNoPeriodo(
              dataCompra(proposta),
              periodo,
              dataInicial,
              dataFinal,
            );
          },
        );

      const cltFiltrado =
        produto === "Compra de Dívida"
          ? []
          : registrosClt.filter(
          (registro) => {
            if (
              !pertenceAoTime(
                nomeResponsavelClt(
                  registro,
                ),
              )
            ) {
              return false;
            }

            if (
              ehConsultora &&
              normalizarTexto(
                nomeResponsavelClt(
                  registro,
                ),
              ) !==
                nomeUsuarioNormalizado
            ) {
              return false;
            }

            if (status === "Pagas" && !propostaCltPaga(registro.status)) {
              return false;
            }

            if (status === "Canceladas" && !propostaCltCancelada(registro.status)) {
              return false;
            }

            if (
              status === "Em andamento" &&
              (propostaCltPaga(registro.status) ||
                propostaCltCancelada(registro.status))
            ) {
              return false;
            }

            return estaNoPeriodo(
              dataClt(registro),
              periodo,
              dataInicial,
              dataFinal,
            );
          },
        );

      const linhas =
        new Map<
          string,
          LinhaEquipe
        >();

      compraFiltrada.forEach(
        (proposta) => {
          const nome =
            nomeResponsavelCompra(
              proposta,
            );

          const atual =
            linhas.get(nome) || {
              nome,
              propostasCompra: 0,
              propostasClt: 0,
              propostas: 0,
              compraBruta: 0,
              compraFinal: 0,
              cltBruto: 0,
              cltFinal: 0,
              valorBruto: 0,
              valorFinal: 0,
              percentual: 0,
            };

          atual.propostasCompra +=
            1;

          atual.propostas += 1;

          atual.compraBruta +=
            Number(
              proposta.valorContrato ||
                0,
            );

          atual.compraFinal +=
            valorFinalCompra(
              proposta,
            );

          linhas.set(nome, atual);
        },
      );

      cltFiltrado.forEach(
        (registro) => {
          const nome =
            nomeResponsavelClt(
              registro,
            );

          const atual =
            linhas.get(nome) || {
              nome,
              propostasCompra: 0,
              propostasClt: 0,
              propostas: 0,
              compraBruta: 0,
              compraFinal: 0,
              cltBruto: 0,
              cltFinal: 0,
              valorBruto: 0,
              valorFinal: 0,
              percentual: 0,
            };

          atual.propostasClt +=
            1;

          atual.propostas += 1;

          atual.cltBruto +=
            Number(
              registro.valorAprovado ||
                0,
            );

          atual.cltFinal +=
            Number(
              registro.parcela || 0,
            );

          linhas.set(nome, atual);
        },
      );

      const lista =
        Array.from(
          linhas.values(),
        ).map((linha) => ({
          ...linha,
          valorBruto:
            linha.compraBruta +
            linha.cltBruto,
          valorFinal:
            linha.compraFinal +
            linha.cltFinal,
        }));

      const termo =
        normalizarTexto(busca);

      const listaFiltrada =
        lista
          .filter(
            (linha) =>
              !termo ||
              normalizarTexto(
                linha.nome,
              ).includes(termo),
          )
          .sort(
            (a, b) =>
              b.valorFinal -
              a.valorFinal,
          );

      const totalFinal =
        listaFiltrada.reduce(
          (total, linha) =>
            total +
            linha.valorFinal,
          0,
        );

      const linhasComPercentual =
        listaFiltrada.map(
          (linha) => ({
            ...linha,
            percentual:
              totalFinal > 0
                ? (linha.valorFinal /
                    totalFinal) *
                  100
                : 0,
          }),
        );

      const totalBruto =
        linhasComPercentual.reduce(
          (total, linha) =>
            total +
            linha.valorBruto,
          0,
        );

      const totalPropostas =
        linhasComPercentual.reduce(
          (total, linha) =>
            total +
            linha.propostas,
          0,
        );

      const totalCompra =
        linhasComPercentual.reduce(
          (total, linha) =>
            total +
            linha.compraFinal,
          0,
        );

      const totalClt =
        linhasComPercentual.reduce(
          (total, linha) =>
            total +
            linha.cltFinal,
          0,
        );

      return {
        linhas:
          linhasComPercentual,
        totalFinal,
        totalBruto,
        totalPropostas,
        totalCompra,
        totalClt,
        equipesAtivas:
          linhasComPercentual.length,
      };
    }, [
      propostas,
      registrosClt,
      perfilAtual,
      ehConsultora,
      status,
      periodo,
      dataInicial,
      dataFinal,
      busca,
      produto,
      timeSelecionado,
      nomesPermitidosTime,
    ]);

  const maiorValor =
    Math.max(
      ...resultado.linhas.map(
        (linha) =>
          linha.valorFinal,
      ),
      1,
    );

  const maiorQuantidade =
    Math.max(
      ...resultado.linhas.map(
        (linha) =>
          linha.propostas,
      ),
      1,
    );

  const linhasGrafico =
    resultado.linhas.slice(
      0,
      8,
    );

  const rotulosProduto = useMemo(() => {
    if (produto === "CLT") {
      return {
        tituloPrimario: "Valor liberado",
        tituloSecundario: "Valor de parcela",
        resumoPrimario: "Liberado total",
        resumoSecundario: "Parcelas",
        descricao:
          "Comparativo entre valor liberado, valor de parcela e quantidade de contratos CLT no período selecionado.",
      };
    }

    if (produto === "Compra de Dívida") {
      return {
        tituloPrimario: "Valor bruto",
        tituloSecundario: "Valor líquido",
        resumoPrimario: "Bruto total",
        resumoSecundario: "Líquido total",
        descricao:
          "Comparativo entre valor bruto, valor líquido e quantidade de contratos de Compra de Dívida no período selecionado.",
      };
    }

    return {
      tituloPrimario: "Valor bruto",
      tituloSecundario: "Produção líquida",
      resumoPrimario: "Bruto total",
      resumoSecundario: "Líquido total",
      descricao:
        "Comparativo entre valor bruto, produção líquida e quantidade de contratos no período selecionado.",
    };
  }, [produto]);

  const propostasDetalhe = useMemo(() => {
    const nomeNormalizado =
      consultoraDetalhe
        ? normalizarTexto(consultoraDetalhe)
        : "";

    const compra =
      produto === "CLT"
        ? []
        : propostas.filter((proposta) => {
      if (
        !pertenceAoTime(
          nomeResponsavelCompra(
            proposta,
          ),
        )
      ) {
        return false;
      }

      if (
        nomeNormalizado &&
        normalizarTexto(
          nomeResponsavelCompra(proposta),
        ) !== nomeNormalizado
      ) {
        return false;
      }

      if (
        detalheSomenteCanceladas &&
        !propostaCompraCancelada(proposta.status)
      ) {
        return false;
      }

      if (!detalheSomenteCanceladas) {
        if (
          status === "Pagas" &&
          !propostaCompraPaga(proposta.status)
        ) {
          return false;
        }

        if (
          status === "Canceladas" &&
          !propostaCompraCancelada(proposta.status)
        ) {
          return false;
        }

        if (
          status === "Em andamento" &&
          (propostaCompraPaga(proposta.status) ||
            propostaCompraCancelada(proposta.status))
        ) {
          return false;
        }
      }

      return estaNoPeriodo(
        detalheSomenteCanceladas
          ? converterData(
              proposta.dataCadastro ||
                proposta.dataPagamento,
            )
          : dataCompra(proposta),
        periodo,
        dataInicial,
        dataFinal,
      );
    });

    const clt =
      produto === "Compra de Dívida"
        ? []
        : registrosClt.filter((registro) => {
      if (
        !pertenceAoTime(
          nomeResponsavelClt(
            registro,
          ),
        )
      ) {
        return false;
      }

      if (
        nomeNormalizado &&
        normalizarTexto(
          nomeResponsavelClt(registro),
        ) !== nomeNormalizado
      ) {
        return false;
      }

      if (
        detalheSomenteCanceladas &&
        !propostaCltCancelada(registro.status)
      ) {
        return false;
      }

      if (!detalheSomenteCanceladas) {
        if (
          status === "Pagas" &&
          !propostaCltPaga(registro.status)
        ) {
          return false;
        }

        if (
          status === "Canceladas" &&
          !propostaCltCancelada(registro.status)
        ) {
          return false;
        }

        if (
          status === "Em andamento" &&
          (propostaCltPaga(registro.status) ||
            propostaCltCancelada(registro.status))
        ) {
          return false;
        }
      }

      return estaNoPeriodo(
        detalheSomenteCanceladas
          ? converterData(
              registro.atualizadoEm ||
                registro.criadoEm ||
                registro.dataPagamento,
            )
          : dataClt(registro),
        periodo,
        dataInicial,
        dataFinal,
      );
    });

    return { compra, clt };
  }, [
    consultoraDetalhe,
    detalheSomenteCanceladas,
    propostas,
    registrosClt,
    status,
    periodo,
    dataInicial,
    dataFinal,
    produto,
    timeSelecionado,
    nomesPermitidosTime,
  ]);

  const resumoDetalhe = useMemo(() => {
    const quantidade =
      propostasDetalhe.compra.length +
      propostasDetalhe.clt.length;

    const brutoCompra =
      propostasDetalhe.compra.reduce(
        (total, proposta) =>
          total +
          Number(
            proposta.valorContrato || 0,
          ),
        0,
      );

    const liquidoCompra =
      propostasDetalhe.compra.reduce(
        (total, proposta) =>
          total +
          valorFinalCompra(proposta),
        0,
      );

    const brutoClt =
      propostasDetalhe.clt.reduce(
        (total, registro) =>
          total +
          Number(
            registro.valorAprovado || 0,
          ),
        0,
      );

    const liquidoClt =
      propostasDetalhe.clt.reduce(
        (total, registro) =>
          total +
          Number(
            registro.parcela || 0,
          ),
        0,
      );

    const canceladas =
      propostasDetalhe.compra.filter(
        (proposta) =>
          propostaCompraCancelada(
            proposta.status,
          ),
      ).length +
      propostasDetalhe.clt.filter(
        (registro) =>
          propostaCltCancelada(
            registro.status,
          ),
      ).length;

    return {
      quantidade,
      bruto:
        brutoCompra + brutoClt,
      liquido:
        liquidoCompra + liquidoClt,
      canceladas,
    };
  }, [propostasDetalhe]);

  function abrirDetalhes(
    consultora: string | null = null,
    somenteCanceladas = false,
  ) {
    setConsultoraDetalhe(consultora);
    setDetalheSomenteCanceladas(somenteCanceladas);
    setDetalheAberto(true);
  }

  function fecharDetalhes() {
    setDetalheAberto(false);
    setConsultoraDetalhe(null);
    setDetalheSomenteCanceladas(false);
  }

  return (
    <div className="eleva-dashboard">
      <section className="eleva-dashboard-title">
        <div>
          <span>
            VISÃO GERAL
          </span>

          <h2>
            Dashboard Eleva
          </h2>

          <p>
            {ehConsultora
              ? `Olá, ${nomeUsuario}. Acompanhe seus resultados.`
              : "Acompanhe a produção e o desempenho de toda a equipe."}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void carregarDados()
          }
          disabled={carregando}
        >
          ↻{" "}
          {carregando
            ? "Atualizando"
            : "Atualizar dados"}
        </button>
      </section>

      {mensagem && (
        <div className="eleva-dashboard-message">
          {mensagem}
        </div>
      )}

      <section className="eleva-dashboard-kpis">
        <article className="eleva-kpi-clickable">
          <div className="eleva-kpi-icon blue">
            ◫
          </div>

          <div>
            <span>
              Propostas
            </span>

            <strong>
              {numero(
                resultado.totalPropostas,
              )}
            </strong>

            <small>
              Período e status selecionados
            </small>
          </div>

          <button
            type="button"
            className="eleva-kpi-link"
            onClick={() =>
              abrirDetalhes(null, false)
            }
          >
            Ver propostas
          </button>
        </article>

        <article>
          <div className="eleva-kpi-icon orange">
            R$
          </div>

          <div>
            <span>
              {produto === "CLT"
                ? "Valor liberado"
                : "Valor bruto pago"}
            </span>

            <strong>
              {moeda(
                resultado.totalBruto,
              )}
            </strong>

            <small>
              Valor total dos contratos
            </small>
          </div>
        </article>

        <article>
          <div className="eleva-kpi-icon green">
            $
          </div>

          <div>
            <span>
              {produto === "CLT"
                ? "Valor de parcela"
                : "Produção líquida"}
            </span>

            <strong>
              {moeda(
                resultado.totalFinal,
              )}
            </strong>

            <small>
              Compra líquida + CLT
            </small>
          </div>
        </article>

        <article className="eleva-kpi-highlight eleva-kpi-clickable">
          <div className="eleva-kpi-icon red">
            ×
          </div>

          <div>
            <span>
              Canceladas
            </span>

            <strong>
              {numero(
                cancelamentosPeriodo.total,
              )}
            </strong>

            <small>
              Cancelamentos no período
            </small>
          </div>

          <button
            type="button"
            className="eleva-kpi-link danger"
            onClick={() =>
              abrirDetalhes(null, true)
            }
          >
            Ver canceladas
          </button>
        </article>
      </section>

      <section className="eleva-performance">
        <div className="eleva-performance-head">
          <div>
            <span>
              DESEMPENHO
            </span>

            <h3>
              Produção Financeira
            </h3>
          </div>

          <div className="eleva-performance-total">
            <small>
              Valor bruto
            </small>

            <strong>
              {moeda(
                resultado.totalBruto,
              )}
            </strong>
          </div>
        </div>

        <div className="eleva-filter-area">
          <div className="eleva-filter-group">
            <span>
              Período
            </span>

            <div className="eleva-period-buttons">
              {(
                [
                  "Hoje",
                  "Esta semana",
                  "Este mês",
                  "Este ano",
                  "Tudo",
                ] as Periodo[]
              ).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={
                    periodo === item
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPeriodo(item)
                  }
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <label>
            <span>
              Data inicial
            </span>

            <input
              type="date"
              value={dataInicial}
              onChange={(event) => {
                setDataInicial(
                  event.target.value,
                );

                setPeriodo(
                  "Personalizado",
                );
              }}
            />
          </label>

          <label>
            <span>
              Data final
            </span>

            <input
              type="date"
              value={dataFinal}
              onChange={(event) => {
                setDataFinal(
                  event.target.value,
                );

                setPeriodo(
                  "Personalizado",
                );
              }}
            />
          </label>

          <label>
            <span>
              Produto
            </span>

            <select
              value={produto}
              onChange={(event) =>
                setProduto(
                  event.target.value as ProdutoFiltro,
                )
              }
            >
              <option value="Todos">
                Todos
              </option>

              <option value="Compra de Dívida">
                Compra de Dívida
              </option>

              <option value="CLT">
                CLT
              </option>
            </select>
          </label>

          <label>
            <span>
              Time
            </span>

            <select
              value={timeSelecionado}
              onChange={(event) =>
                setTimeSelecionado(
                  event.target.value,
                )
              }
              disabled={
                perfilAtual?.perfil ===
                  "Supervisora"
              }
            >
              {perfilAtual?.perfil !==
                "Supervisora" && (
                <option value="Todos">
                  Todos os times
                </option>
              )}

              {times
                .filter(
                  (time) =>
                    time.ativo !== false,
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
            <span>
              Status
            </span>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value,
                )
              }
            >
              <option>
                Pagas
              </option>

              <option>
                Em andamento
              </option>

              <option>
                Todas
              </option>

              <option>
                Canceladas
              </option>
            </select>
          </label>
        </div>

        <div className="eleva-filter-summary">
          <article>
            <span>
              Compra de Dívida
            </span>

            <strong>
              {moeda(
                resultado.totalCompra,
              )}
            </strong>
          </article>

          <article>
            <span>
              Produção CLT
            </span>

            <strong>
              {moeda(
                resultado.totalClt,
              )}
            </strong>
          </article>

          <article>
            <span>
              Valor bruto
            </span>

            <strong>
              {moeda(
                resultado.totalBruto,
              )}
            </strong>
          </article>

          <article>
            <span>
              Consultoras ativas
            </span>

            <strong>
              {resultado.equipesAtivas}
            </strong>
          </article>
        </div>

        <div style={{ margin: "14px 0 18px", padding: "12px 14px", border: "1px solid #dfe6f2", borderRadius: 12, background: "#f8fafc", color: "#526077", fontSize: 13 }}>
          <strong style={{ color: "#183b73" }}>Como os valores são calculados:</strong>{" "}
          {produto === "CLT"
            ? "No CLT, o valor liberado é o valor aprovado e o valor de parcela é a parcela cadastrada."
            : produto === "Compra de Dívida"
              ? "Na Compra de Dívida, o valor bruto é o valor do contrato e o valor líquido é calculado conforme a tabela."
              : "Compra de Dívida usa o valor bruto do contrato e o valor líquido conforme a tabela. No CLT, o valor liberado é o aprovado e o valor de parcela é a parcela cadastrada."}
        </div>

        {carregando ? (
          <div className="eleva-dashboard-empty">
            Carregando os dados do Dashboard...
          </div>
        ) : linhasGrafico.length === 0 ? (
          <div className="eleva-dashboard-empty">
            Nenhuma produção encontrada no período selecionado.
          </div>
        ) : (
          <section className="crm-combo-card">
            <div className="crm-combo-head">
              <div>
                <span className="crm-combo-eyebrow">PERFORMANCE COMERCIAL</span>
                <h3>Produção por consultora</h3>
                <p>
                  {rotulosProduto.descricao}
                </p>
              </div>

              <div className="crm-combo-summary">
                <article>
                  <span>{rotulosProduto.resumoPrimario}</span>
                  <strong>{moeda(resultado.totalBruto)}</strong>
                </article>

                <article>
                  <span>{rotulosProduto.resumoSecundario}</span>
                  <strong>{moeda(resultado.totalFinal)}</strong>
                </article>

                <article>
                  <span>Contratos</span>
                  <strong>{numero(resultado.totalPropostas)}</strong>
                </article>
              </div>
            </div>

            <div className="crm-combo-legend">
              <span>
                <i className="legend-bruto" />
                {rotulosProduto.tituloPrimario}
              </span>

              <span>
                <i className="legend-liquido" />
                {rotulosProduto.tituloSecundario}
              </span>

              <span>
                <i className="legend-contratos" />
                Contratos
              </span>
            </div>

            <div className="crm-combo-scroll">
              <div
                className="crm-combo-chart"
                style={{
                  minWidth: `${Math.max(
                    1050,
                    linhasGrafico.length * 175,
                  )}px`,
                }}
              >
                {(() => {
                  const maiorValor = Math.max(
                    ...linhasGrafico.map((linha) =>
                      Math.max(linha.valorBruto, linha.valorFinal),
                    ),
                    1,
                  );

                  const maiorContratos = Math.max(
                    ...linhasGrafico.map((linha) => linha.propostas),
                    1,
                  );

                  const pontos = linhasGrafico
                    .map((linha, indice) => {
                      const passo = 100 / linhasGrafico.length;
                      const x = passo * indice + passo / 2;
                      const y = 88 - (linha.propostas / maiorContratos) * 62;
                      return `${x},${y}`;
                    })
                    .join(" ");

                  return (
                    <>
                      <div className="crm-combo-gridlines">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>

                      <svg
                        className="crm-combo-line-layer"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <polyline
                          points={pontos}
                          className="crm-combo-line"
                        />
                      </svg>

                      <div className="crm-combo-columns">
                        {linhasGrafico.map((linha, indice) => {
                          const alturaBruto = Math.max(
                            5,
                            (linha.valorBruto / maiorValor) * 100,
                          );

                          const alturaLiquido = Math.max(
                            5,
                            (linha.valorFinal / maiorValor) * 100,
                          );

                          const alturaContrato =
                            88 -
                            (linha.propostas / maiorContratos) * 62;

                          return (
                            <article
                              className="crm-combo-column"
                              key={`combo-${linha.nome}`}
                            >
                              <div
                                className="crm-contract-point"
                                style={{
                                  top: `${alturaContrato}%`,
                                }}
                              >
                                <span>{linha.propostas}</span>
                              </div>

                              <div className="crm-combo-value-labels">
                                <span>
                                  {rotulosProduto.tituloPrimario.toUpperCase()}
                                </span>
                                <strong>{moeda(linha.valorBruto)}</strong>

                                <span>
                                  {rotulosProduto.tituloSecundario.toUpperCase()}
                                </span>
                                <strong className="liquido">
                                  {moeda(linha.valorFinal)}
                                </strong>
                              </div>

                              <div className="crm-combo-bars">
                                <div
                                  className="crm-bar crm-bar-bruto"
                                  style={{
                                    height: `${alturaBruto}%`,
                                  }}
                                  title={`${rotulosProduto.tituloPrimario}: ${moeda(linha.valorBruto)}`}
                                />

                                <div
                                  className="crm-bar crm-bar-liquido"
                                  style={{
                                    height: `${alturaLiquido}%`,
                                  }}
                                  title={`${rotulosProduto.tituloSecundario}: ${moeda(linha.valorFinal)}`}
                                />
                              </div>

                              <div className="crm-combo-name">
                                {linha.nome}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        <div className="eleva-table-title">
          <div>
            <span>
              DETALHAMENTO
            </span>

            <h3>
              Produção por consultora
            </h3>
          </div>

          <input
            value={busca}
            placeholder="Pesquisar consultora"
            onChange={(event) =>
              setBusca(
                event.target.value,
              )
            }
          />
        </div>

        <div className="eleva-table-wrapper">
          <table className="eleva-dashboard-table">
            <thead>
              <tr>
                <th>
                  #
                </th>

                <th>
                  Consultora
                </th>

                <th>
                  Compra líquida
                </th>

                <th>
                  CLT
                </th>

                <th>
                  Canceladas
                </th>

                <th>
                  Propostas
                </th>

                <th>
                  Valor líquido
                </th>

                <th>
                  Valor bruto
                </th>

                <th>
                  % do total
                </th>

                <th>
                  Ação
                </th>
              </tr>
            </thead>

            <tbody>
              {resultado.linhas.map(
                (linha, indice) => (
                  <tr key={linha.nome}>
                    <td>
                      <b className="eleva-rank-position">
                        {indice === 0
                          ? "🥇"
                          : indice === 1
                            ? "🥈"
                            : indice === 2
                              ? "🥉"
                              : `#${indice + 1}`}
                      </b>
                    </td>

                    <td>
                      <strong>
                        {linha.nome}
                      </strong>

                      <small>
                        {
                          linha.propostasCompra
                        }{" "}
                        Compra de Dívida •{" "}
                        {
                          linha.propostasClt
                        }{" "}
                        CLT
                      </small>
                    </td>

                    <td>
                      {moeda(
                        linha.compraFinal,
                      )}
                    </td>

                    <td>
                      {moeda(
                        linha.cltFinal,
                      )}
                    </td>

                    <td>
                      <strong className="eleva-cancel-count">
                        {cancelamentosPeriodo.porConsultora.get(
                          linha.nome,
                        ) || 0}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {linha.propostas}
                      </strong>
                    </td>

                    <td className="final-value">
                      {moeda(
                        linha.valorFinal,
                      )}
                    </td>

                    <td>
                      {moeda(
                        linha.valorBruto,
                      )}
                    </td>

                    <td>
                      <div className="eleva-percent">
                        <div>
                          <i
                            style={{
                              width:
                                `${Math.min(
                                  linha.percentual,
                                  100,
                                )}%`,
                            }}
                          />
                        </div>

                        <span>
                          {linha.percentual.toFixed(
                            0,
                          )}
                          %
                        </span>
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="eleva-table-view-button"
                        onClick={() =>
                          abrirDetalhes(
                            linha.nome,
                            false,
                          )
                        }
                      >
                        Ver propostas
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>

            <tfoot>
              <tr>
                <td colSpan={4}>
                  TOTAL GERAL
                </td>

                <td>
                  {cancelamentosPeriodo.total}
                </td>

                <td>
                  {
                    resultado.totalPropostas
                  }
                </td>

                <td>
                  {moeda(
                    resultado.totalFinal,
                  )}
                </td>

                <td>
                  {moeda(
                    resultado.totalBruto,
                  )}
                </td>

                <td>
                  100%
                </td>

                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {detalheAberto && (
        <div
          className="eleva-detail-overlay"
          role="dialog"
          aria-modal="true"
          onClick={fecharDetalhes}
        >
          <div
            className="eleva-detail-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="eleva-detail-head">
              <div>
                <span>
                  {detalheSomenteCanceladas
                    ? "PROPOSTAS CANCELADAS"
                    : consultoraDetalhe
                      ? "PROPOSTAS DA CONSULTORA"
                      : "PROPOSTAS DO PERÍODO"}
                </span>

                <h3>
                  {consultoraDetalhe ||
                    (detalheSomenteCanceladas
                      ? "Canceladas"
                      : "Todas as propostas")}
                </h3>

                <p>
                  {propostasDetalhe.compra.length +
                    propostasDetalhe.clt.length}{" "}
                  registro(s) no período e status selecionados.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharDetalhes}
              >
                ×
              </button>
            </div>

            <div className="eleva-detail-summary">
              <article>
                <span>
                  Quantidade
                </span>
                <strong>
                  {resumoDetalhe.quantidade}
                </strong>
              </article>

              <article>
                <span>
                  Valor bruto
                </span>
                <strong>
                  {moeda(
                    resumoDetalhe.bruto,
                  )}
                </strong>
              </article>

              <article>
                <span>
                  Valor líquido
                </span>
                <strong>
                  {moeda(
                    resumoDetalhe.liquido,
                  )}
                </strong>
              </article>

              <article className="danger">
                <span>
                  Canceladas
                </span>
                <strong>
                  {resumoDetalhe.canceladas}
                </strong>
              </article>
            </div>

            <div className="eleva-detail-table-wrap">
              <table className="eleva-detail-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Produto</th>
                    <th>Banco / tabela</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Valor bruto</th>
                    <th>Valor líquido</th>
                  </tr>
                </thead>

                <tbody>
                  {propostasDetalhe.compra.map(
                    (proposta, indice) => (
                      <tr
                        key={`compra-${
                          proposta.id ||
                          proposta.numeroProposta ||
                          indice
                        }`}
                      >
                        <td>
                          <strong>
                            {proposta.cliente ||
                              "Cliente não informado"}
                          </strong>
                          <small>
                            {proposta.cpf || "—"}
                          </small>
                        </td>

                        <td>
                          Compra de Dívida
                        </td>

                        <td>
                          <strong>
                            {proposta.banco || "—"}
                          </strong>
                          <small>
                            {proposta.tabela || "—"}
                          </small>
                        </td>

                        <td>
                          {proposta.status || "—"}
                        </td>

                        <td>
                          {dataBR(
                            proposta.dataPagamento ||
                              proposta.dataCadastro,
                          )}
                        </td>

                        <td>
                          {moeda(
                            Number(
                              proposta.valorContrato ||
                                0,
                            ),
                          )}
                        </td>

                        <td className="final-value">
                          {moeda(
                            valorFinalCompra(
                              proposta,
                            ),
                          )}
                        </td>
                      </tr>
                    ),
                  )}

                  {propostasDetalhe.clt.map(
                    (registro, indice) => (
                      <tr
                        key={`clt-${
                          registro.id || indice
                        }`}
                      >
                        <td>
                          <strong>
                            {registro.nome ||
                              "Cliente não informado"}
                          </strong>
                          <small>
                            {registro.cpf || "—"}
                          </small>
                        </td>

                        <td>CLT</td>

                        <td>CLT</td>

                        <td>
                          {registro.status || "—"}
                        </td>

                        <td>
                          {dataBR(
                            registro.dataPagamento ||
                              registro.atualizadoEm ||
                              registro.criadoEm,
                          )}
                        </td>

                        <td>
                          {moeda(
                            Number(
                              registro.valorAprovado ||
                                0,
                            ),
                          )}
                        </td>

                        <td className="final-value">
                          {moeda(
                            Number(
                              registro.parcela || 0,
                            ),
                          )}
                        </td>
                      </tr>
                    ),
                  )}

                  {propostasDetalhe.compra.length ===
                    0 &&
                    propostasDetalhe.clt.length ===
                      0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="eleva-detail-empty"
                        >
                          Nenhuma proposta encontrada.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}