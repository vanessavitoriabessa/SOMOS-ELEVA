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
  // No Dashboard, Compra de Dívida segue a mesma competência
  // da Gestão de Propostas: data da digitação/cadastro.
  return converterData(
    proposta.dataCadastro,
  );
}

function dataClt(
  registro: RegistroClt,
) {
  // CLT entra na produção somente pela data efetiva de pagamento.
  return converterData(
    registro.dataPagamento,
  );
}

function limitePagamentoCompra(dataFinal: string) {
  if (!dataFinal) return null;

  const partes = String(dataFinal).slice(0, 7).split("-");
  if (partes.length !== 2) return null;

  let ano = Number(partes[0]);
  let mes = Number(partes[1]) + 1;

  if (mes === 13) {
    mes = 1;
    ano += 1;
  }

  // Mesma regra da Gestão de Propostas:
  // contratos digitados no período podem ser pagos até o dia 19 do mês seguinte.
  return new Date(ano, mes - 1, 19, 23, 59, 59, 999);
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
  ] = useState("Pagas");

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

  const [visaoGrafico, setVisaoGrafico] =
    useState<"vendedora" | "produto">("vendedora");

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

  const [consultorasAtivasAberto, setConsultorasAtivasAberto] = useState(false);

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
    const resposta = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      // A autenticação desta API já é enviada no header Authorization.
      // Não enviar cookies evita o HTTP 431 (Request Header Fields Too Large).
      credentials: "omit",
    });

    // Lê primeiro como texto. Assim uma resposta vazia ou uma página HTML
    // de erro não derruba todas as informações do Dashboard sem explicação.
    const texto = await resposta.text();

    if (!texto.trim()) {
      throw new Error(
        `${url} retornou uma resposta vazia (HTTP ${resposta.status}).`,
      );
    }

    let conteudo: RespostaApi;

    try {
      conteudo = JSON.parse(texto) as RespostaApi;
    } catch {
      throw new Error(
        `${url} retornou uma resposta inválida (HTTP ${resposta.status}).`,
      );
    }

    if (!resposta.ok) {
      throw new Error(
        conteudo.erro ||
          `Não foi possível carregar ${url} (HTTP ${resposta.status}).`,
      );
    }

    return conteudo;
  }

  async function carregarDados() {
    setCarregando(true);
    setMensagem("");

    try {
      const sessao = await obterSessao();
      const token = sessao.access_token;

      let respostaPropostas: RespostaApi | null = null;
      let respostaClt: RespostaApi | null = null;
      let erroPropostas: Error | null = null;

      // PROPOSTAS: carregamento principal e independente.
      // Mesmo que a API de CLT apresente erro, as propostas continuam visíveis.
      try {
        respostaPropostas = await consultarApi(
          "/api/propostas",
          token,
        );

        setPropostas(
          Array.isArray(respostaPropostas.propostas)
            ? respostaPropostas.propostas
            : [],
        );
      } catch (erro) {
        erroPropostas =
          erro instanceof Error
            ? erro
            : new Error("Não foi possível carregar as propostas.");

        console.error(
          "Erro ao carregar propostas no Dashboard:",
          erro,
        );
        setPropostas([]);
      }

      // CLT: complementar. A falha desta API não pode mais zerar propostas.
      try {
        respostaClt = await consultarApi("/api/clt", token);

        setRegistrosClt(
          Array.isArray(respostaClt.registros)
            ? respostaClt.registros
            : [],
        );
      } catch (erro) {
        console.warn(
          "A API de CLT não carregou, mas as propostas continuarão visíveis:",
          erro,
        );
        setRegistrosClt([]);
      }

      const perfilResolvido =
        respostaPropostas?.perfil ||
        respostaClt?.perfil ||
        null;

      setPerfilAtual(perfilResolvido);

      if (erroPropostas) {
        setMensagem(erroPropostas.message);
      } else {
        setMensagem("");
      }

      if (
        perfilResolvido &&
        perfilEhConsultora(perfilResolvido.perfil || "")
      ) {
        setTimes([]);
        setTimeSelecionado("Todos");
        return;
      }

      // Times também são complementares e não podem apagar a produção.
      try {
        const respostaTimesHttp = await fetch("/api/times", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
          // A autenticação já está no Bearer token; cookies não são necessários.
          credentials: "omit",
        });

        const textoTimes = await respostaTimesHttp.text();
        let respostaTimes: RespostaTimesDashboard = {};

        if (textoTimes.trim()) {
          try {
            respostaTimes = JSON.parse(
              textoTimes,
            ) as RespostaTimesDashboard;
          } catch {
            throw new Error(
              `/api/times retornou uma resposta inválida (HTTP ${respostaTimesHttp.status}).`,
            );
          }
        }

        if (!respostaTimesHttp.ok) {
          throw new Error(
            respostaTimes.erro ||
              `Não foi possível carregar os times (HTTP ${respostaTimesHttp.status}).`,
          );
        }

        const listaTimes = Array.isArray(respostaTimes.times)
          ? respostaTimes.times
          : [];

        setTimes(listaTimes);

        if (
          perfilResolvido?.perfil === "Supervisora" &&
          listaTimes.length === 1
        ) {
          setTimeSelecionado(listaTimes[0].id);
        }
      } catch (erro) {
        console.warn(
          "Os times não carregaram, mas a produção continuará visível:",
          erro,
        );
        setTimes([]);
        setTimeSelecionado("Todos");
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

            // COMPRA DE DÍVIDA:
            // O período sempre representa a data de digitação/cadastro.
            // Quando o status é Pagas, exige status Pago, mas mantém
            // a competência pela data em que a proposta foi digitada.
            if (status === "Pagas") {
              return (
                propostaCompraPaga(proposta.status) &&
                estaNoPeriodo(
                  dataCompra(proposta),
                  periodo,
                  dataInicial,
                  dataFinal,
                )
              );
            }

            if (status === "Digitadas") {
              return estaNoPeriodo(
                dataCompra(proposta),
                periodo,
                dataInicial,
                dataFinal,
              );
            }

            if (status === "Canceladas") {
              return (
                propostaCompraCancelada(proposta.status) &&
                estaNoPeriodo(
                  converterData(
                    proposta.dataCadastro || proposta.dataPagamento,
                  ),
                  periodo,
                  dataInicial,
                  dataFinal,
                )
              );
            }

            if (status === "Em andamento") {
              return (
                !propostaCompraPaga(proposta.status) &&
                !propostaCompraCancelada(proposta.status) &&
                estaNoPeriodo(
                  dataCompra(proposta),
                  periodo,
                  dataInicial,
                  dataFinal,
                )
              );
            }

            // "Todas": usa a data de digitação para mostrar tudo que entrou no período.
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

            // CLT segue a mesma leitura do Dashboard:
            // Digitadas = criadoEm; Pagas = dataPagamento.
            if (status === "Pagas") {
              return (
                propostaCltPaga(registro.status) &&
                estaNoPeriodo(
                  converterData(registro.dataPagamento),
                  periodo,
                  dataInicial,
                  dataFinal,
                )
              );
            }

            if (status === "Digitadas") {
              return estaNoPeriodo(
                converterData(registro.criadoEm),
                periodo,
                dataInicial,
                dataFinal,
              );
            }

            if (status === "Canceladas") {
              return (
                propostaCltCancelada(registro.status) &&
                estaNoPeriodo(
                  converterData(
                    registro.atualizadoEm ||
                      registro.criadoEm ||
                      registro.dataPagamento,
                  ),
                  periodo,
                  dataInicial,
                  dataFinal,
                )
              );
            }

            if (status === "Em andamento") {
              return (
                !propostaCltPaga(registro.status) &&
                !propostaCltCancelada(registro.status) &&
                estaNoPeriodo(
                  converterData(registro.criadoEm),
                  periodo,
                  dataInicial,
                  dataFinal,
                )
              );
            }

            return estaNoPeriodo(
              converterData(registro.criadoEm),
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

      const totalCompraBruto =
        linhasComPercentual.reduce(
          (total, linha) =>
            total +
            linha.compraBruta,
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

      const totalCltLiquido =
        linhasComPercentual.reduce(
          (total, linha) =>
            total +
            linha.cltBruto,
          0,
        );

      return {
        linhas:
          linhasComPercentual,
        totalFinal,
        totalBruto,
        totalPropostas,
        totalCompraBruto,
        totalCompra,
        totalClt,
        totalCltLiquido,
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

  // Produção gerencial: Compra de Dívida líquida + parcelas CLT.
  const producaoTotal =
    resultado.totalCompra +
    resultado.totalClt;

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

  const consultorasAtivas = useMemo(() => {
    const mapa = new Map<string, { nome: string; time: string }>();
    times.filter((time) => time.ativo !== false).forEach((time) => {
      (time.membros || []).forEach((membro) => {
        if (!perfilEhConsultora(membro.perfil || "")) return;
        const nome = String(membro.nome || "").trim();
        if (nome) mapa.set(normalizarTexto(nome), { nome, time: time.nome || "Sem time" });
      });
    });
    return Array.from(mapa.values()).sort((a,b) => a.nome.localeCompare(b.nome,"pt-BR"));
  }, [times]);

  const periodoAnterior = useMemo(() => {
    if (periodo === "Tudo") return null;
    const hoje = new Date(); let ini: Date | null=null; let fim: Date | null=null;
    if (periodo === "Hoje") { ini=new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate()); fim=new Date(ini); }
    else if (periodo === "Esta semana") { ini=inicioSemana(hoje); fim=fimSemana(hoje); }
    else if (periodo === "Este mês") { ini=new Date(hoje.getFullYear(),hoje.getMonth(),1); fim=new Date(hoje.getFullYear(),hoje.getMonth()+1,0); }
    else if (periodo === "Este ano") { ini=new Date(hoje.getFullYear(),0,1); fim=new Date(hoje.getFullYear(),11,31); }
    else { ini=converterData(dataInicial); fim=converterData(dataFinal); }
    if (!ini || !fim) return null;
    ini.setHours(0,0,0,0); fim.setHours(23,59,59,999);
    const dias=Math.floor((fim.getTime()-ini.getTime())/86400000)+1;
    const antFim=new Date(ini); antFim.setDate(antFim.getDate()-1);
    const antIni=new Date(antFim); antIni.setDate(antIni.getDate()-dias+1);
    const iso=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return {inicio:iso(antIni),fim:iso(antFim)};
  }, [periodo,dataInicial,dataFinal]);

  const resultadoAnterior = useMemo(() => {
    if (!periodoAnterior) return {contratos:0,compraBruto:0,compraLiquido:0,cltLiberado:0,cltParcelas:0,producaoTotal:0};
    const user=normalizarTexto(perfilAtual?.nome);
    const dentro=(d:Date|null)=>estaNoPeriodo(d,"Personalizado",periodoAnterior.inicio,periodoAnterior.fim);
    const compra=produto==="CLT"?[]:propostas.filter(p=>{
      const nome=nomeResponsavelCompra(p); if(!pertenceAoTime(nome)||(ehConsultora&&normalizarTexto(nome)!==user)) return false;
      if(status==="Pagas") return propostaCompraPaga(p.status)&&dentro(dataCompra(p));
      if(status==="Digitadas") return dentro(dataCompra(p));
      if(status==="Canceladas") return propostaCompraCancelada(p.status)&&dentro(converterData(p.dataCadastro||p.dataPagamento));
      if(status==="Em andamento") return !propostaCompraPaga(p.status)&&!propostaCompraCancelada(p.status)&&dentro(dataCompra(p));
      return dentro(dataCompra(p));
    });
    const clt=produto==="Compra de Dívida"?[]:registrosClt.filter(r=>{
      const nome=nomeResponsavelClt(r); if(!pertenceAoTime(nome)||(ehConsultora&&normalizarTexto(nome)!==user)) return false;
      if(status==="Pagas") return propostaCltPaga(r.status)&&dentro(converterData(r.dataPagamento));
      if(status==="Digitadas") return dentro(converterData(r.criadoEm));
      if(status==="Canceladas") return propostaCltCancelada(r.status)&&dentro(converterData(r.atualizadoEm||r.criadoEm||r.dataPagamento));
      if(status==="Em andamento") return !propostaCltPaga(r.status)&&!propostaCltCancelada(r.status)&&dentro(converterData(r.criadoEm));
      return dentro(converterData(r.criadoEm));
    });
    const cb=compra.reduce((s,p)=>s+Number(p.valorContrato||0),0), cl=compra.reduce((s,p)=>s+valorFinalCompra(p),0);
    const la=clt.reduce((s,r)=>s+Number(r.valorAprovado||0),0), lp=clt.reduce((s,r)=>s+Number(r.parcela||0),0);
    return {contratos:compra.length+clt.length,compraBruto:cb,compraLiquido:cl,cltLiberado:la,cltParcelas:lp,producaoTotal:cl+lp};
  }, [periodoAnterior,propostas,registrosClt,produto,status,perfilAtual,ehConsultora,timeSelecionado,nomesPermitidosTime]);

  function tendencia(atual:number, anterior:number) {
    if(!periodoAnterior) return {texto:"— sem comparação",direcao:"neutra"};
    if(anterior===0) return atual===0?{texto:"→ 0% vs. período anterior",direcao:"neutra"}:{texto:"↑ novo vs. período anterior",direcao:"alta"};
    const v=((atual-anterior)/Math.abs(anterior))*100, pct=Math.abs(v).toLocaleString("pt-BR",{maximumFractionDigits:1});
    return v>0?{texto:`↑ ${pct}% vs. período anterior`,direcao:"alta"}:v<0?{texto:`↓ ${pct}% vs. período anterior`,direcao:"baixa"}:{texto:"→ 0% vs. período anterior",direcao:"neutra"};
  }
  const tendencias={
    contratos:tendencia(resultado.totalPropostas,resultadoAnterior.contratos),
    compraBruto:tendencia(resultado.totalCompraBruto,resultadoAnterior.compraBruto),
    compraLiquido:tendencia(resultado.totalCompra,resultadoAnterior.compraLiquido),
    cltLiberado:tendencia(resultado.totalCltLiquido,resultadoAnterior.cltLiberado),
    cltParcelas:tendencia(resultado.totalClt,resultadoAnterior.cltParcelas),
    producaoTotal:tendencia(producaoTotal,resultadoAnterior.producaoTotal),
  };

  const linhasGraficoProduto = useMemo(() => {
    const totalContratosCompra = resultado.linhas.reduce(
      (total, linha) => total + linha.propostasCompra,
      0,
    );
    const totalContratosClt = resultado.linhas.reduce(
      (total, linha) => total + linha.propostasClt,
      0,
    );

    const compra = {
      nome: "Compra de Dívida",
      valorBruto: resultado.totalCompraBruto,
      valorFinal: resultado.totalCompra,
      propostas: totalContratosCompra,
    };

    const clt = {
      nome: "CLT",
      valorBruto: resultado.totalCltLiquido,
      valorFinal: resultado.totalClt,
      propostas: totalContratosClt,
    };

    if (produto === "Compra de Dívida") return [compra];
    if (produto === "CLT") return [clt];
    return [compra, clt];
  }, [produto, resultado]);

  const dadosGraficoAtual =
    visaoGrafico === "produto" ? linhasGraficoProduto : linhasGrafico;

  return (
    <div className="eleva-dashboard">
      <section className="eleva-dashboard-title">
        <div>
          <span>
            VISÃO GERAL
          </span>

          <h2>
            Central de Performance
          </h2>

          <p>
            {ehConsultora
              ? `Olá, ${nomeUsuario}. Acompanhe seus resultados.`
              : "Acompanhe vendas digitadas, pagamentos e desempenho comercial em uma única visão."}
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

        <section className="dashboard-top-summary">
          <div className="dashboard-top-summary-head">
            <div>
              <span>RESUMO DO PERÍODO</span>
              <h4>{status === "Pagas" ? "Produção paga" : status === "Digitadas" ? "Produção digitada" : "Produção selecionada"}</h4>
            </div>

            <button
              type="button"
              className="dashboard-info-button"
              title={
                produto === "CLT"
                  ? "No CLT, o valor líquido é o valor aprovado/liberado e a produção considera também as parcelas."
                  : produto === "Compra de Dívida"
                    ? "Na Compra de Dívida, o bruto é o valor do contrato e o líquido segue a tabela."
                    : "Produção Total = Compra de Dívida líquida + Produção de Parcela CLT."
              }
            >
              i
            </button>
          </div>

          <div className="dashboard-top-kpis">
            <article data-trend={tendencias.contratos.texto} data-direction={tendencias.contratos.direcao}>
              <span>Contratos</span>
              <strong>{numero(resultado.totalPropostas)}</strong>
              <small>{status === "Pagas" ? "pagos no período" : "no período"}</small>
            </article>

            <article data-trend={tendencias.compraBruto.texto} data-direction={tendencias.compraBruto.direcao}>
              <span>Compra — Bruto</span>
              <strong>{moeda(resultado.totalCompraBruto)}</strong>
              <small>valor dos contratos</small>
            </article>

            <article data-trend={tendencias.compraLiquido.texto} data-direction={tendencias.compraLiquido.direcao}>
              <span>Compra — Líquido</span>
              <strong>{moeda(resultado.totalCompra)}</strong>
              <small>produção conforme tabela</small>
            </article>

            <article data-trend={tendencias.cltLiberado.texto} data-direction={tendencias.cltLiberado.direcao}>
              <span>CLT — Liberado</span>
              <strong>{moeda(resultado.totalCltLiquido)}</strong>
              <small>valor aprovado/liberado</small>
            </article>

            <article data-trend={tendencias.cltParcelas.texto} data-direction={tendencias.cltParcelas.direcao}>
              <span>CLT — Parcelas</span>
              <strong>{moeda(resultado.totalClt)}</strong>
              <small>produção de parcela</small>
            </article>

            <article className="primary" data-trend={tendencias.producaoTotal.texto} data-direction={tendencias.producaoTotal.direcao}>
              <span>Produção Total</span>
              <strong>{moeda(producaoTotal)}</strong>
              <small>Compra líquida + parcelas CLT</small>
            </article>
          </div>

          <div className="dashboard-top-secondary">
            <button type="button" className="secondary-card danger" onClick={() => abrirDetalhes(null, true)}>
              <span className="secondary-card-icon">×</span>
              <span className="secondary-card-copy"><small>Canceladas</small><strong>{numero(cancelamentosPeriodo.total)}</strong></span>
              <b>Ver propostas →</b>
            </button>
            <button type="button" className="secondary-card team" onClick={() => setConsultorasAtivasAberto(true)}>
              <span className="secondary-card-icon">◎</span>
              <span className="secondary-card-copy"><small>Consultoras ativas</small><strong>{consultorasAtivas.length || resultado.equipesAtivas}</strong></span>
              <b>Ver equipe →</b>
            </button>
            <button type="button" className="secondary-card detail" onClick={() => abrirDetalhes(null, false)}>
              <span className="secondary-card-icon">↗</span>
              <span className="secondary-card-copy"><small>Detalhamento</small><strong>Propostas</strong></span>
              <b>Abrir →</b>
            </button>
          </div>
        </section>



      <section className="eleva-performance">
        <div className="eleva-performance-head">
          <div>
            <span>
              FILTROS
            </span>

            <h3>
              Análise do período
            </h3>
          </div>

          <div className="eleva-performance-badge">
            <span>{status}</span>
            <small>{periodo}</small>
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
                Digitadas
              </option>

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

        <div className="dashboard-filter-rule">
          <span className="dashboard-filter-rule-icon">⌁</span>
          <div>
            <strong>
              {status === "Pagas"
                ? produto === "CLT" ? "Filtrando pela data de pagamento" : "Filtrando pela data de digitação"
                : status === "Digitadas"
                  ? "Filtrando pela data de digitação"
                  : "Filtro aplicado ao período selecionado"}
            </strong>
            <small>
              {status === "Pagas"
                ? produto === "CLT" ? "Mostra CLT efetivamente pago dentro das datas escolhidas." : "Na Compra de Dívida, mostra propostas digitadas dentro das datas escolhidas que estejam com status Pago."
                : status === "Digitadas"
                  ? "Mostra tudo que foi digitado/cadastrado dentro das datas escolhidas, mesmo que ainda não esteja pago."
                  : "Altere Produto, Time e Situação para refinar a leitura do Dashboard."}
            </small>
          </div>
        </div>

        {carregando ? (
          <div className="eleva-dashboard-empty">
            Carregando os dados do Dashboard...
          </div>
        ) : dadosGraficoAtual.length === 0 ? (
          <div className="eleva-dashboard-empty">
            Nenhuma produção encontrada no período selecionado.
          </div>
        ) : (
          <section className="crm-combo-card">
            <div className="crm-combo-head">
              <div>
                <span className="crm-combo-eyebrow">PERFORMANCE COMERCIAL</span>
                <h3>Evolução da produção</h3>
                <p>
                  Visualize a produção por vendedora ou por produto no período selecionado.
                </p>
              </div>

              <div className="crm-chart-controls">
                <div className="crm-chart-switch">
                  <button type="button" className={`seller ${visaoGrafico === "vendedora" ? "active" : ""}`} onClick={() => setVisaoGrafico("vendedora")}>
                    Por vendedora
                  </button>
                  <button type="button" className={`product ${visaoGrafico === "produto" ? "active" : ""}`} onClick={() => setVisaoGrafico("produto")}>
                    Por produto
                  </button>
                </div>
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
                    dadosGraficoAtual.length * 175,
                  )}px`,
                  ["--crm-count" as string]: Math.max(dadosGraficoAtual.length, 1),
                }}
              >
                {(() => {
                  const maiorValor = Math.max(
                    ...dadosGraficoAtual.map((linha) =>
                      Math.max(linha.valorBruto, linha.valorFinal),
                    ),
                    1,
                  );

                  const maiorContratos = Math.max(
                    ...dadosGraficoAtual.map((linha) => linha.propostas),
                    1,
                  );

                  const pontos = dadosGraficoAtual
                    .map((linha, indice) => {
                      const passo = 100 / dadosGraficoAtual.length;
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
                        {dadosGraficoAtual.map((linha, indice) => {
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
                  CLT PARCELA
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
                        Ver contratos
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

      {consultorasAtivasAberto && (
        <div className="eleva-detail-overlay" role="dialog" aria-modal="true" onClick={() => setConsultorasAtivasAberto(false)}>
          <div className="active-consultants-modal" onClick={(event) => event.stopPropagation()}>
            <div className="active-consultants-head">
              <div><span>EQUIPE COMERCIAL</span><h3>Consultoras ativas</h3><p>{consultorasAtivas.length} consultora(s) ativa(s) cadastrada(s) nos times da empresa.</p></div>
              <button type="button" onClick={() => setConsultorasAtivasAberto(false)}>×</button>
            </div>
            <div className="active-consultants-grid">
              {consultorasAtivas.map((consultora) => (
                <article key={`${consultora.time}-${consultora.nome}`}>
                  <div className="active-consultant-avatar">{consultora.nome.charAt(0).toUpperCase()}</div>
                  <div><strong>{consultora.nome}</strong><small>{consultora.time}</small></div>
                  <span>Ativa</span>
                </article>
              ))}
              {consultorasAtivas.length === 0 && <div className="active-consultants-empty">Nenhuma consultora ativa foi encontrada nos times cadastrados.</div>}
            </div>
          </div>
        </div>
      )}

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
              <article data-trend="10%">
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