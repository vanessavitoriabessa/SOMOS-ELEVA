"use client";

import ProposalTable, { type PropostaTabela } from "./ProposalTable";
import ProposalStatus from "./ProposalStatus";
import ProposalFilters, { type PeriodoProposta } from "./ProposalFilters";
import ProposalStats from "./ProposalStats";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import "../propostas.css";

type StatusProposta =
  | "Solicitado"
  | "Em andamento"
  | "Aguardando boleto"
  | "Nota promissória"
  | "Ag. liberação de margem"
  | "Ag. fazer anuência"
  | "Enviado ao banco"
  | "Pago"
  | "Cancelado";

type ClienteCadastrado = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  banco?: string;
  produto?: string;
  status?: string;
};
type TabelaCompraDivida = {
  id: string;
  banco: string;
  nome: string;
  codigo: string;
  percentual: number;
  ativo: boolean;
};

type Proposta = {
  id: string;
  clienteId: string;
  cliente: string;
  cpf: string;
  telefone: string;
  vendedora: string;
  banco: string;

  /*
   * percentualTabela agora representa quanto o contrato
   * vale para a meta, e não a premiação da consultora.
   */
  tabela: string;
  percentualTabela: number;
  valorContrato: number;
  valorMeta: number;

  /*
   * Mantidos apenas para compatibilidade com módulos antigos.
   * O Ranking não deve usar estes campos para pagar a consultora.
   */
  comissao: number;
  premiacao: number;

  status: StatusProposta;
  dataCadastro: string;
  dataPagamento: string;
  motivoCancelamento: string;
  dataCancelamento?: string;
  canceladoPor?: string;
  observacao: string;
};

type PerfilAtual = {
  id: string;
  nome: string;
  perfil: string;
};

type RespostaPropostas = {
  propostas?: Proposta[];
  proposta?: Proposta;
  perfil?: PerfilAtual;
  mensagem?: string;
  erro?: string;
  importadas?: number;
};

type FormularioProposta = {
  clienteId: string;
  vendedora: string;
  banco: string;
  tabela: string;
  valorContrato: string;
  status: StatusProposta;
  dataDigitacao: string;
  dataPagamento: string;
  motivoCancelamento: string;
  observacao: string;
};

const STATUS: StatusProposta[] = [
  "Solicitado",
  "Em andamento",
  "Aguardando boleto",
  "Nota promissória",
  "Ag. liberação de margem",
  "Ag. fazer anuência",
  "Enviado ao banco",
  "Pago",
  "Cancelado",
];

const TABELAS_COMPRA_DIVIDA_PADRAO: TabelaCompraDivida[] = [
  {
    id: "neo-normal-399",
    banco: "NEO",
    nome: "NORMAL",
    codigo: "399",
    percentual: 100,
    ativo: true,
  },
  {
    id: "neo-flex-1-379",
    banco: "NEO",
    nome: "FLEX 1",
    codigo: "379",
    percentual: 75,
    ativo: true,
  },
  {
    id: "neo-flex-2-359",
    banco: "NEO",
    nome: "FLEX 2",
    codigo: "359",
    percentual: 50,
    ativo: true,
  },
  {
    id: "neo-flex-3-339",
    banco: "NEO",
    nome: "FLEX 3",
    codigo: "339",
    percentual: 40,
    ativo: true,
  },
  {
    id: "neo-flex-4-319",
    banco: "NEO",
    nome: "FLEX 4",
    codigo: "319",
    percentual: 20,
    ativo: true,
  },
  {
    id: "neo-flex-5-299",
    banco: "NEO",
    nome: "FLEX 5",
    codigo: "299",
    percentual: 8,
    ativo: true,
  },
];

const formularioVazio: FormularioProposta = {
  clienteId: "",
  vendedora: "",
  banco: "",
  tabela: "",
  valorContrato: "",
  status: "Solicitado",
  dataDigitacao: hojeIso(),
  dataPagamento: "",
  motivoCancelamento: "",
  observacao: "",
};

function numero(valor: string) {
  const texto = String(valor || "")
    .trim()
    .replace(/[^\d,.-]/g, "");

  if (!texto) return 0;

  let normalizado = texto;

  if (texto.includes(",") && texto.includes(".")) {
    normalizado = texto
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (texto.includes(",")) {
    normalizado = texto.replace(",", ".");
  }

  const convertido = Number(normalizado);

  return Number.isFinite(convertido) ? convertido : 0;
}

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

function apenasNumeros(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

function formatarCpf(valor: string) {
  const digitos = apenasNumeros(valor).slice(0, 11);

  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatarTelefone(valor: string) {
  const digitos = apenasNumeros(valor).slice(0, 11);

  if (digitos.length <= 10) {
    return digitos
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digitos
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}
function dataParaInput(valor: string) {
  if (!valor) return "";

  const texto = String(valor).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    return texto.slice(0, 10);
  }

  const encontrada = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);

  if (encontrada) {
    return `${encontrada[3]}-${encontrada[2]}-${encontrada[1]}`;
  }

  return "";
}

function formatarData(valor: string) {
  const data = dataParaInput(valor);

  if (!data) return "Não informada";

  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function nomeCanonicoTabela(
  banco: string,
  nome: string,
) {
  const bancoLimpo = String(banco || "").trim().toUpperCase();
  const nomeLimpo = String(nome || "").trim().toUpperCase();

  if (!nomeLimpo) return "";

  if (
    bancoLimpo === "NEO" &&
    !nomeLimpo.startsWith("NEO ")
  ) {
    return `NEO ${nomeLimpo}`;
  }

  return nomeLimpo;
}

function nomeExibicaoTabela(
  tabela: TabelaCompraDivida,
) {
  const nome = nomeCanonicoTabela(
    tabela.banco,
    tabela.nome,
  );

  const codigo = tabela.codigo
    ? ` ${tabela.codigo}`
    : "";

  return `${nome}${codigo}`;
}

function tabelaPeloNome(
  nome: string,
  tabelas: TabelaCompraDivida[],
) {
  const nomeNormalizado =
    normalizarTexto(nome);

  return tabelas.find((item) => {
    const canonico = nomeCanonicoTabela(
      item.banco,
      item.nome,
    );

    const tabelaNormalizada =
      normalizarTexto(canonico);

    const exibicaoNormalizada =
      normalizarTexto(
        nomeExibicaoTabela(item),
      );

    return (
      nomeNormalizado === tabelaNormalizada ||
      nomeNormalizado === exibicaoNormalizada ||
      nomeNormalizado.startsWith(
        tabelaNormalizada,
      )
    );
  });
}

function percentualSalvoDaProposta(
  percentualSalvo: unknown,
  tabela: string,
) {
  const salvo = Number(
    percentualSalvo || 0,
  );

  if (
    Number.isFinite(salvo) &&
    salvo > 0
  ) {
    return salvo;
  }

  const percentualNoNome =
    String(tabela || "").match(
      /(\\d+(?:[.,]\\d+)?)\\s*%/,
    );

  if (percentualNoNome) {
    const percentual = Number(
      percentualNoNome[1].replace(
        ",",
        ".",
      ),
    );

    if (
      Number.isFinite(percentual)
    ) {
      return percentual;
    }
  }

  return 0;
}

function nomeLimpoDaTabela(
  tabela: string,
) {
  return String(tabela || "")
    .replace(
      /\\s*[-–—]\\s*\\d+(?:[.,]\\d+)?\\s*%/g,
      "",
    )
    .trim();
}

function normalizarProposta(
  item: Partial<Proposta> &
    Record<string, unknown>,
): Proposta {
  const valorContrato = Number(
    item.valorContrato ??
      item.valorOperacao ??
      0,
  );

  const tabela =
    nomeLimpoDaTabela(
      String(item.tabela || ""),
    );

  const percentualTabela =
    percentualSalvoDaProposta(
      item.percentualTabela,
      String(item.tabela || ""),
    );

  const valorMetaSalvo = Number(
    item.valorMeta ??
      item.valorLiquido ??
      0,
  );

  const valorMeta =
    Number.isFinite(valorMetaSalvo) &&
    valorMetaSalvo > 0
      ? valorMetaSalvo
      : Number.isFinite(valorContrato) &&
          percentualTabela > 0
        ? valorContrato *
          (percentualTabela / 100)
        : 0;

  return {
    id: String(
      item.id ||
        crypto.randomUUID(),
    ),
    clienteId: String(
      item.clienteId || "",
    ),
    cliente: String(
      item.cliente || "",
    ),
    cpf: apenasNumeros(
      String(item.cpf || ""),
    ),
    telefone: apenasNumeros(
      String(item.telefone || ""),
    ),
    vendedora: String(
      item.vendedora ||
        item.consultora ||
        "",
    ),
    banco: String(
      item.banco || "",
    ),
    tabela,
    percentualTabela,
    valorContrato:
      Number.isFinite(valorContrato)
        ? valorContrato
        : 0,
    valorMeta,

    comissao: 0,
    premiacao: 0,

    status: STATUS.includes(
      item.status as StatusProposta,
    )
      ? (item.status as StatusProposta)
      : "Solicitado",
    dataCadastro: String(
      item.dataCadastro || "",
    ),
    dataPagamento: String(
      item.dataPagamento || "",
    ),
    motivoCancelamento: String(
      item.motivoCancelamento || "",
    ),
    dataCancelamento: String(
      item.dataCancelamento || "",
    ),
    canceladoPor: String(
      item.canceladoPor || "",
    ),
    observacao: String(
      item.observacao ||
        item.observacoes ||
        "",
    ),
  };
}

function perfilEhConsultora(perfil: string) {
  return normalizarTexto(perfil).includes("consultor");
}

export default function ProposalManager() {
  const supabase = useMemo(() => createClient(), []);

  const [propostas, setPropostas] = useState<Proposta[]>([]);

  const [clientes, setClientes] = useState<ClienteCadastrado[]>([]);

  const [consultoras, setConsultoras] = useState<string[]>([]);

  const [
    tabelasCompraDivida,
    setTabelasCompraDivida,
  ] = useState<TabelaCompraDivida[]>(
    TABELAS_COMPRA_DIVIDA_PADRAO,
  );

  const [perfilAtual, setPerfilAtual] = useState<PerfilAtual | null>(null);

  const [form, setForm] = useState<FormularioProposta>(formularioVazio);

  const [busca, setBusca] = useState("");

  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [periodoFiltro, setPeriodoFiltro] =
    useState<PeriodoProposta>("Este mês");
  const [dataInicialFiltro, setDataInicialFiltro] = useState("");
  const [dataFinalFiltro, setDataFinalFiltro] = useState("");
  const [consultoraFiltro, setConsultoraFiltro] = useState("Todas");
  const [bancoFiltro, setBancoFiltro] = useState("Todos");
  const [tabelaFiltro, setTabelaFiltro] = useState("Todas");
  const [propostaDetalhe, setPropostaDetalhe] =
    useState<Proposta | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [mensagem, setMensagem] = useState("");

  const [carregando, setCarregando] = useState(true);

  const [processando, setProcessando] = useState(false);

  function formularioLimpo(perfil = perfilAtual): FormularioProposta {
    return {
      ...formularioVazio,
      dataDigitacao: hojeIso(),
      vendedora: perfil && perfilEhConsultora(perfil.perfil) ? perfil.nome : "",
    };
  }

  async function obterSessaoAtual() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error("Sua sessão expirou. Entre novamente no sistema.");
    }

    return data.session;
  }

  async function chamarApiPropostas(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    body?: unknown,
  ) {
    const sessao = await obterSessaoAtual();

    const resposta = await fetch("/api/propostas", {
      method,
      headers: {
        Authorization: `Bearer ${sessao.access_token}`,
        ...(body
          ? {
              "Content-Type": "application/json",
            }
          : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const conteudo = (await resposta.json()) as RespostaPropostas;

    if (!resposta.ok) {
      throw new Error(conteudo.erro || "Não foi possível concluir a operação.");
    }

    return {
      conteudo,
      sessao,
    };
  }

  async function carregarPropostasDoSupabase(importarDadosLocais = false) {
    setCarregando(true);

    try {
      const sessao = await obterSessaoAtual();

      if (importarDadosLocais) {
        const chaveImportacao = `somos-eleva-propostas-importadas-supabase-v1-${sessao.user.id}`;

        const importacaoConcluida =
          localStorage.getItem(chaveImportacao) === "sim";

        const propostasSalvas = localStorage.getItem("somos-eleva-propostas");

        if (!importacaoConcluida && propostasSalvas) {
          try {
            const listaLocal = JSON.parse(propostasSalvas);

            const propostasLocais = Array.isArray(listaLocal)
              ? listaLocal.map(normalizarProposta)
              : [];

            if (propostasLocais.length) {
              const { conteudo: resultadoImportacao } =
                await chamarApiPropostas("POST", {
                  acao: "importar_local",
                  propostas: propostasLocais,
                });

              if (Number(resultadoImportacao.importadas || 0) > 0) {
                setMensagem(
                  `${resultadoImportacao.importadas} proposta(s) antiga(s) foram sincronizadas com o Supabase.`,
                );
              }
            }

            localStorage.setItem(chaveImportacao, "sim");
          } catch (erroImportacao) {
            console.error(
              "Falha ao importar propostas locais:",
              erroImportacao,
            );
          }
        }
      }

      const { conteudo } = await chamarApiPropostas("GET");

      const lista = Array.isArray(conteudo.propostas)
        ? conteudo.propostas.map(normalizarProposta)
        : [];

      setPropostas(lista);

      if (conteudo.perfil) {
        setPerfilAtual(conteudo.perfil);

        if (perfilEhConsultora(conteudo.perfil.perfil)) {
          setForm((atual) => ({
            ...atual,
            vendedora: conteudo.perfil?.nome || "",
          }));
        }
      }

      /*
       * Cópia temporária para os módulos antigos
       * que ainda leem propostas do localStorage.
       * A fonte oficial desta página já é o Supabase.
       */
      localStorage.setItem("somos-eleva-propostas", JSON.stringify(lista));
    } catch (erro) {
      setPropostas([]);
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar as propostas.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let listaClientes: ClienteCadastrado[] = [];

    const clientesSalvos = localStorage.getItem("somos-eleva-clientes");

    if (clientesSalvos) {
      try {
        const lista = JSON.parse(clientesSalvos);

        listaClientes = Array.isArray(lista)
          ? lista.map((cliente: Partial<ClienteCadastrado>) => ({
              id: String(cliente.id || crypto.randomUUID()),
              nome: String(cliente.nome || ""),
              cpf: apenasNumeros(String(cliente.cpf || "")),
              telefone: apenasNumeros(String(cliente.telefone || "")),
              banco: String(cliente.banco || ""),
              produto: String(cliente.produto || ""),
              status: String(cliente.status || "Ativo"),
            }))
          : [];

        setClientes(listaClientes);
      } catch {
        setClientes([]);
      }
    }

    const rascunho = localStorage.getItem("somos-eleva-rascunho-proposta");

    if (rascunho) {
      try {
        const dados = JSON.parse(rascunho);

        const clienteEncontrado = listaClientes.find((cliente) => {
          const mesmoCpf =
            dados.cpf && cliente.cpf === apenasNumeros(dados.cpf);

          const mesmoNome =
            normalizarTexto(cliente.nome) ===
            normalizarTexto(dados.cliente || "");

          return mesmoCpf || mesmoNome;
        });

        setForm((atual) => ({
          ...atual,
          clienteId: clienteEncontrado?.id || "",
          banco: dados.banco || "",
          tabela: nomeLimpoDaTabela(dados.tabela || ""),
          valorContrato: dados.valorLiberado
            ? String(Number(dados.valorLiberado).toFixed(2)).replace(".", ",")
            : "",
        }));

        setMensagem(
          clienteEncontrado
            ? "Rascunho carregado. Selecione a tabela e complete a proposta."
            : "Rascunho carregado. Cadastre o cliente primeiro ou selecione um cliente existente.",
        );

        localStorage.removeItem("somos-eleva-rascunho-proposta");
      } catch {
        localStorage.removeItem("somos-eleva-rascunho-proposta");
      }
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregarTabelasConfiguradas() {
      try {
        const { data, error } =
          await supabase.auth.getSession();

        if (
          error ||
          !data.session?.access_token
        ) {
          throw new Error(
            "Sua sessão expirou. Entre novamente no sistema.",
          );
        }

        const resposta = await fetch(
          "/api/configuracoes",
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${data.session.access_token}`,
            },
            cache: "no-store",
          },
        );

        const conteudo =
          await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            conteudo.erro ||
              "Não foi possível carregar as tabelas.",
          );
        }

        const lista =
          Array.isArray(
            conteudo.tabelas,
          )
            ? conteudo.tabelas
            : [];

        const normalizadas =
          lista
            .map(
              (
                item: Partial<TabelaCompraDivida>,
              ): TabelaCompraDivida => ({
                id: String(
                  item.id ||
                    crypto.randomUUID(),
                ),
                banco: String(
                  item.banco || "NEO",
                )
                  .trim()
                  .toUpperCase(),
                nome: String(
                  item.nome || "",
                )
                  .trim()
                  .toUpperCase(),
                codigo: String(
                  item.codigo || "",
                ).trim(),
                percentual: Number(
                  item.percentual || 0,
                ),
                ativo:
                  item.ativo !== false,
              }),
            )
            .filter(
  (item: TabelaCompraDivida) =>
    item.ativo &&
    item.nome &&
    item.percentual > 0,
);

        if (!ativo) return;

        setTabelasCompraDivida(
          normalizadas.length
            ? normalizadas
            : TABELAS_COMPRA_DIVIDA_PADRAO,
        );
      } catch (erro) {
        console.error(erro);

        if (!ativo) return;

        setTabelasCompraDivida(
          TABELAS_COMPRA_DIVIDA_PADRAO,
        );
      }
    }

    void carregarTabelasConfiguradas();

    const atualizar = () =>
      void carregarTabelasConfiguradas();

    window.addEventListener(
      "focus",
      atualizar,
    );

    return () => {
      ativo = false;

      window.removeEventListener(
        "focus",
        atualizar,
      );
    };
  }, [supabase]);

  useEffect(() => {
    void carregarPropostasDoSupabase(true);
  }, [supabase]);

  useEffect(() => {
    let componenteAtivo = true;

    async function carregarConsultoras() {
      try {
        const sessao = await obterSessaoAtual();

        const resposta = await fetch("/api/consultoras", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessao.access_token}`,
          },
          cache: "no-store",
        });

        const conteudo = (await resposta.json()) as {
          consultoras?: Array<{
            nome?: string;
          }>;
          erro?: string;
        };

        if (!resposta.ok) {
          throw new Error(
            conteudo.erro || "Não foi possível carregar as consultoras.",
          );
        }

        const nomes = (conteudo.consultoras || [])
          .map((consultora) => String(consultora.nome || "").trim())
          .filter(Boolean);

        const nomesSemRepeticao = Array.from(new Set(nomes)).sort((a, b) =>
          a.localeCompare(b, "pt-BR"),
        );

        if (componenteAtivo) {
          setConsultoras(nomesSemRepeticao);
        }
      } catch {
        if (componenteAtivo) {
          setConsultoras([]);
        }
      }
    }

    void carregarConsultoras();

    return () => {
      componenteAtivo = false;
    };
  }, [supabase]);

  const clienteSelecionado = useMemo(
    () => clientes.find((cliente) => cliente.id === form.clienteId),
    [clientes, form.clienteId],
  );

  const tabelaSelecionada = useMemo(
    () =>
      tabelaPeloNome(
        form.tabela,
        tabelasCompraDivida,
      ),
    [
      form.tabela,
      tabelasCompraDivida,
    ],
  );

  const valorContrato = numero(form.valorContrato);

  const percentualTabela = tabelaSelecionada?.percentual || 0;

  const valorMeta = valorContrato * (percentualTabela / 100);

  function dataIsoLocal(data: Date) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function intervaloPeriodo(periodo: PeriodoProposta) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (periodo === "Todos") {
      return {
        inicio: "",
        fim: "",
      };
    }

    if (periodo === "Personalizado") {
      return {
        inicio: dataInicialFiltro,
        fim: dataFinalFiltro,
      };
    }

    if (periodo === "Hoje") {
      const iso = dataIsoLocal(hoje);
      return {
        inicio: iso,
        fim: iso,
      };
    }

    if (periodo === "Esta semana") {
      const inicio = new Date(hoje);
      const diaSemana = inicio.getDay();
      const diferenca = diaSemana === 0 ? -6 : 1 - diaSemana;
      inicio.setDate(inicio.getDate() + diferenca);

      const fim = new Date(inicio);
      fim.setDate(fim.getDate() + 6);

      return {
        inicio: dataIsoLocal(inicio),
        fim: dataIsoLocal(fim),
      };
    }

    const inicioMes = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      1,
    );

    const fimMes = new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      0,
    );

    return {
      inicio: dataIsoLocal(inicioMes),
      fim: dataIsoLocal(fimMes),
    };
  }

  const intervaloFiltro = useMemo(
    () => intervaloPeriodo(periodoFiltro),
    [
      periodoFiltro,
      dataInicialFiltro,
      dataFinalFiltro,
    ],
  );

  const bancosFiltro = useMemo(
    () =>
      Array.from(
        new Set(
          propostas
            .map((item) => item.banco)
            .filter(Boolean),
        ),
      ).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [propostas],
  );

  const tabelasFiltro = useMemo(
    () =>
      Array.from(
        new Set(
          propostas
            .filter(
              (item) =>
                bancoFiltro === "Todos" ||
                item.banco === bancoFiltro,
            )
            .map((item) => item.tabela)
            .filter(Boolean),
        ),
      ).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [propostas, bancoFiltro],
  );

  const propostasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return propostas.filter((proposta) => {
      const correspondeStatus =
        filtroStatus === "Todos" ||
        proposta.status === filtroStatus;

      const correspondeConsultora =
        consultoraFiltro === "Todas" ||
        proposta.vendedora === consultoraFiltro;

      const correspondeBanco =
        bancoFiltro === "Todos" ||
        proposta.banco === bancoFiltro;

      const correspondeTabela =
        tabelaFiltro === "Todas" ||
        proposta.tabela === tabelaFiltro;

      const correspondeBusca =
        !termo ||
        proposta.cliente.toLowerCase().includes(termo) ||
        proposta.cpf.includes(apenasNumeros(termo)) ||
        proposta.vendedora.toLowerCase().includes(termo) ||
        proposta.banco.toLowerCase().includes(termo) ||
        proposta.tabela.toLowerCase().includes(termo);

      const data = String(
        proposta.dataCadastro || "",
      ).slice(0, 10);

      const correspondePeriodo =
        (!intervaloFiltro.inicio ||
          data >= intervaloFiltro.inicio) &&
        (!intervaloFiltro.fim ||
          data <= intervaloFiltro.fim);

      return (
        correspondeStatus &&
        correspondeConsultora &&
        correspondeBanco &&
        correspondeTabela &&
        correspondeBusca &&
        correspondePeriodo
      );
    });
  }, [
    propostas,
    busca,
    filtroStatus,
    consultoraFiltro,
    bancoFiltro,
    tabelaFiltro,
    intervaloFiltro,
  ]);

  const resumo = useMemo(() => {
    const baseResumo = propostasFiltradas;

    const pagas = baseResumo.filter(
      (item) => item.status === "Pago",
    );

    const canceladas = baseResumo.filter(
      (item) => item.status === "Cancelado",
    );

    const valorBrutoPago = pagas.reduce(
      (total, item) =>
        total +
        Number(item.valorContrato || 0),
      0,
    );

    const valorLiquidoPago = pagas.reduce(
      (total, item) =>
        total +
        Number(item.valorMeta || 0),
      0,
    );

    const producaoDigitada = baseResumo
      .filter((item) => item.status !== "Cancelado")
      .reduce(
        (total, item) =>
          total +
          Number(item.valorMeta || 0),
        0,
      );

    const emAndamento = baseResumo.filter(
      (item) =>
        item.status !== "Pago" &&
        item.status !== "Cancelado",
    ).length;

    return {
      total: baseResumo.length,
      pagas: pagas.length,
      canceladas: canceladas.length,
      emAndamento,
      valorBrutoPago,
      valorLiquidoPago,
      producaoDigitada,
    };
  }, [propostasFiltradas]);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem("");

    if (!clienteSelecionado) {
      setMensagem("Selecione um cliente já cadastrado.");
      return;
    }

    const consultoraResponsavel =
      perfilAtual && perfilEhConsultora(perfilAtual.perfil)
        ? perfilAtual.nome
        : form.vendedora.trim();

    if (!consultoraResponsavel) {
      setMensagem("Selecione a consultora responsável.");
      return;
    }

    if (!form.banco.trim()) {
      setMensagem("Informe o banco da operação.");
      return;
    }

    if (!tabelaSelecionada) {
      setMensagem("Selecione a tabela utilizada.");
      return;
    }

    if (valorContrato <= 0) {
      setMensagem("Informe o valor total do contrato.");
      return;
    }

    if (!form.dataDigitacao) {
      setMensagem("Informe a data da digitação.");
      return;
    }

    if (form.status === "Pago" && !form.dataPagamento) {
      setMensagem("Informe a data do pagamento.");
      return;
    }

    if (form.status === "Cancelado" && !form.motivoCancelamento.trim()) {
      setMensagem("Informe o motivo do cancelamento.");
      return;
    }

    const propostaAnterior =
      editandoId
        ? propostas.find(
            (item) =>
              item.id === editandoId,
          )
        : undefined;

    const valorFoiCorrigido =
      Boolean(propostaAnterior) &&
      Math.abs(
        Number(
          propostaAnterior?.valorContrato ||
            0,
        ) - valorContrato,
      ) > 0.009;

    const observacaoFinal =
      valorFoiCorrigido &&
      propostaAnterior?.status ===
        "Cancelado"
        ? [
            form.observacao.trim(),
            `CORREÇÃO DE VALOR EM ${new Date().toLocaleString(
              "pt-BR",
            )}: ${moeda(
              Number(
                propostaAnterior.valorContrato ||
                  0,
              ),
            )} → ${moeda(
              valorContrato,
            )}.`,
          ]
            .filter(Boolean)
            .join("\n")
        : form.observacao.trim();

    const proposta: Proposta = {
      id: editandoId || crypto.randomUUID(),
      clienteId: clienteSelecionado.id,
      cliente: clienteSelecionado.nome,
      cpf: clienteSelecionado.cpf,
      telefone: clienteSelecionado.telefone,
      vendedora: consultoraResponsavel,
      banco: form.banco.trim(),
      tabela: nomeCanonicoTabela(
        tabelaSelecionada.banco,
        tabelaSelecionada.nome,
      ),
      percentualTabela: tabelaSelecionada.percentual,
      valorContrato,
      valorMeta,
      comissao: 0,
      premiacao: 0,
      status: form.status,
      dataCadastro: form.dataDigitacao,
      dataPagamento: form.status === "Pago" ? form.dataPagamento : "",
      motivoCancelamento:
        form.status === "Cancelado" ? form.motivoCancelamento.trim() : "",
      observacao: observacaoFinal,
    };

    /*
     * A API utiliza PAGO e CANCELADA em letras maiúsculas.
     * A tela continua exibindo Pago e Cancelado para o usuário.
     */
    const propostaParaApi = {
      ...proposta,
      status:
        form.status === "Pago"
          ? "PAGO"
          : form.status === "Cancelado"
            ? "CANCELADA"
            : form.status,
    };

    const estavaEditando = Boolean(editandoId);

    setProcessando(true);

    try {
      await chamarApiPropostas(
  estavaEditando ? "PATCH" : "POST",
  {
    proposta: propostaParaApi,
  }
);

      await carregarPropostasDoSupabase(false);

      setForm(formularioLimpo(perfilAtual));
      setEditandoId(null);

      setMensagem(
        estavaEditando
          ? "Proposta atualizada com sucesso."
          : "Proposta cadastrada com sucesso.",
      );
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar a proposta.",
      );
    } finally {
      setProcessando(false);
    }
  }

  function localizarClienteDaProposta(proposta: Proposta) {
    return clientes.find((cliente) => {
      if (proposta.clienteId && cliente.id === proposta.clienteId) {
        return true;
      }

      if (proposta.cpf && cliente.cpf === proposta.cpf) {
        return true;
      }

      return (
        normalizarTexto(cliente.nome) === normalizarTexto(proposta.cliente)
      );
    });
  }

  function editar(proposta: Proposta) {
    const cliente = localizarClienteDaProposta(proposta);

    const tabela = tabelaPeloNome(
      proposta.tabela,
      tabelasCompraDivida,
    );

    setEditandoId(proposta.id);

    setForm({
      clienteId: cliente?.id || "",
      vendedora: proposta.vendedora || "",
      banco: proposta.banco || "",
      tabela: tabela?.nome || "",
      valorContrato: Number(proposta.valorContrato || 0)
        .toFixed(2)
        .replace(".", ","),
      status: proposta.status,
      dataDigitacao: dataParaInput(proposta.dataCadastro) || hojeIso(),
      dataPagamento: dataParaInput(proposta.dataPagamento),
      motivoCancelamento: proposta.motivoCancelamento || "",
      observacao: proposta.observacao || "",
    });

    setMensagem(
      cliente
        ? "Editando proposta selecionada."
        : "O cliente desta proposta antiga não foi encontrado. Selecione o cliente correto.",
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluir(id: string) {
    const confirmar = window.confirm("Deseja realmente excluir esta proposta?");

    if (!confirmar) return;

    setProcessando(true);
    setMensagem("");

    try {
      await chamarApiPropostas("DELETE", { id });

      await carregarPropostasDoSupabase(false);

      if (editandoId === id) {
        setEditandoId(null);
        setForm(formularioLimpo(perfilAtual));
      }

      setMensagem("Proposta excluída com sucesso.");
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir a proposta.",
      );
    } finally {
      setProcessando(false);
    }
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(formularioLimpo(perfilAtual));
    setMensagem("");
  }

  return (
  <div className="proposal-page">

    <ProposalStats
      pagos={resumo.pagas}
      valorBrutoPago={resumo.valorBrutoPago}
      valorLiquidoPago={resumo.valorLiquidoPago}
      producaoDigitada={resumo.producaoDigitada}
      andamento={resumo.emAndamento}
      canceladas={resumo.canceladas}
      onVerPagas={() => {
        setFiltroStatus("Pago");
        setPropostaDetalhe(null);
      }}
      onVerCanceladas={() => {
        setFiltroStatus("Cancelado");
        setPropostaDetalhe(null);
      }}
    />

    <section className="proposal-layout">
  <form className="proposal-form" onSubmit={enviar}>
          <div className="proposal-form-heading">
            <div>
              <span>{editandoId ? "EDITAR PROPOSTA" : "NOVA PROPOSTA"}</span>

              <h2>
                {editandoId ? "Atualizar contrato" : "Cadastrar contrato"}
              </h2>

              <p>
                Selecione o cliente e a tabela. O sistema calcula
                automaticamente quanto o contrato vale para a meta.
              </p>
            </div>

            <div className="proposal-form-badge">%</div>
          </div>

          <div className="proposal-form-grid">
            <label className="proposal-client-field">
              Cliente cadastrado
              <select
                value={form.clienteId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    clienteId: event.target.value,
                  })
                }
              >
                <option value="">Selecione o cliente</option>

                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                    {cliente.cpf ? ` — ${formatarCpf(cliente.cpf)}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              CPF
              <input
                value={
                  clienteSelecionado?.cpf
                    ? formatarCpf(clienteSelecionado.cpf)
                    : ""
                }
                placeholder="Preenchido automaticamente"
                readOnly
              />
            </label>

            <label>
              Telefone
              <input
                value={
                  clienteSelecionado?.telefone
                    ? formatarTelefone(clienteSelecionado.telefone)
                    : ""
                }
                placeholder="Preenchido automaticamente"
                readOnly
              />
            </label>

            <label>
              Consultora
              <select
                value={form.vendedora}
                disabled={
                  processando ||
                  Boolean(perfilAtual && perfilEhConsultora(perfilAtual.perfil))
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    vendedora: event.target.value,
                  })
                }
                required
              >
                <option value="">Selecione a consultora</option>

                {form.vendedora && !consultoras.includes(form.vendedora) && (
                  <option value={form.vendedora}>{form.vendedora}</option>
                )}

                {consultoras.map((consultora) => (
                  <option key={consultora} value={consultora}>
                    {consultora}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Banco da operação
              <input
                value={form.banco}
                onChange={(event) =>
                  setForm({
                    ...form,
                    banco: event.target.value,
                  })
                }
                placeholder="Ex.: NEO"
              />
            </label>

            <label>
              Tabela utilizada
              <select
                value={form.tabela}
                onChange={(event) =>
                  setForm({
                    ...form,
                    tabela: event.target.value,
                  })
                }
              >
                <option value="">Selecione a tabela</option>

                {form.tabela &&
                  !tabelasCompraDivida.some(
                    (tabela) =>
                      normalizarTexto(
                        nomeCanonicoTabela(
                          tabela.banco,
                          tabela.nome,
                        ),
                      ) ===
                      normalizarTexto(
                        form.tabela,
                      ),
                  ) && (
                    <option value={form.tabela}>
                      {form.tabela} — tabela histórica
                    </option>
                  )}

                {tabelasCompraDivida.map((tabela) => {
                  const nomeTabela =
                    nomeCanonicoTabela(
                      tabela.banco,
                      tabela.nome,
                    );

                  return (
                    <option
                      key={tabela.id}
                      value={nomeTabela}
                    >
                      {nomeExibicaoTabela(tabela)} —{" "}
                      {formatarPercentual(
                        tabela.percentual,
                      )}
                    </option>
                  );
                })}
              </select>
            </label>

            <label>
              Valor total do contrato
              <input
                value={form.valorContrato}
                onChange={(event) =>
                  setForm({
                    ...form,
                    valorContrato: event.target.value,
                  })
                }
                placeholder="Ex.: 20.000,00"
                inputMode="decimal"
              />
            </label>
            <label>
              Data da digitação
              <input
                type="date"
                value={form.dataDigitacao}
                onChange={(event) =>
                  setForm({
                    ...form,
                    dataDigitacao: event.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as StatusProposta,
                    dataPagamento:
                      event.target.value === "Pago"
                        ? form.dataPagamento || hojeIso()
                        : "",
                    motivoCancelamento:
                      event.target.value === "Cancelado"
                        ? form.motivoCancelamento
                        : "",
                  })
                }
              >
                {STATUS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>

          <section className="paid-section">
            <div className="paid-section-heading">
              <div>
                <span>PRODUÇÃO PARA A META</span>
                <h3>Valor válido do contrato</h3>
              </div>

              <strong>{moeda(valorMeta)}</strong>
            </div>

            <div className="commission-calculation">
              <div>
                <span>Valor do contrato</span>

                <strong>{moeda(valorContrato)}</strong>
              </div>

              <div className="formula">×</div>

              <div>
                <span>Percentual da tabela</span>

                <strong>{formatarPercentual(percentualTabela)}</strong>
              </div>

              <div className="formula">=</div>

              <div className="commission-result">
                <span>Valor para a meta</span>

                <strong>{moeda(valorMeta)}</strong>
              </div>
            </div>
          </section>

          {editandoId &&
            form.status === "Cancelado" && (
              <div className="proposal-message">
                Esta proposta está cancelada. Você pode corrigir o valor do contrato,
                a tabela, o banco e as demais informações sem reativá-la. Ao salvar,
                ela continuará com status Cancelado.
              </div>
            )}

          {form.status === "Cancelado" && (
            <section className="paid-section">
              <div className="paid-section-heading">
                <div>
                  <span>CANCELAMENTO</span>
                  <h3>Motivo do cancelamento</h3>
                </div>
              </div>

              <label className="proposal-observation">
                Motivo obrigatório
                <textarea
                  value={form.motivoCancelamento}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      motivoCancelamento: event.target.value,
                    })
                  }
                  placeholder="Ex.: proposta criada somente para teste"
                  required
                />
              </label>
            </section>
          )}

          {form.status === "Pago" && (
            <section className="paid-section">
              <div className="paid-section-heading">
                <div>
                  <span>CONTRATO PAGO</span>
                  <h3>Data do pagamento</h3>
                </div>
              </div>

              <div className="paid-grid">
                <label>
                  Data do pagamento
                  <input
                    type="date"
                    value={form.dataPagamento}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        dataPagamento: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            </section>
          )}

          {!clientes.length && (
            <div className="proposal-message">
              Nenhum cliente cadastrado. Cadastre o cliente na página Clientes
              antes de criar uma proposta.
            </div>
          )}

          <label className="proposal-observation">
            Observações
            <textarea
              value={form.observacao}
              onChange={(event) =>
                setForm({
                  ...form,
                  observacao: event.target.value,
                })
              }
              placeholder="Informações importantes sobre o contrato"
            />
          </label>

          {mensagem && <div className="proposal-message">{mensagem}</div>}

          <div className="proposal-actions">
            {editandoId && (
              <button type="button" className="cancel" onClick={cancelarEdicao}>
                Cancelar edição
              </button>
            )}

            <button
              type="submit"
              className="save"
              disabled={processando || carregando || !clientes.length}
            >
              {processando
                ? "Salvando..."
                : editandoId
                  ? "Atualizar proposta"
                  : "Salvar proposta"}
            </button>
          </div>
        </form>

        <section className="proposal-list-card">
          <div className="proposal-list-heading">
            <div>
              <span>ACOMPANHAMENTO</span>

              <h2>Propostas cadastradas</h2>
            </div>

            <b>{propostasFiltradas.length}</b>
          </div>

          <ProposalFilters
            busca={busca}
            filtroStatus={filtroStatus}
            status={STATUS}
            periodo={periodoFiltro}
            dataInicial={dataInicialFiltro}
            dataFinal={dataFinalFiltro}
            consultora={consultoraFiltro}
            banco={bancoFiltro}
            tabela={tabelaFiltro}
            consultoras={consultoras}
            bancos={bancosFiltro}
            tabelas={tabelasFiltro}
            onBuscaChange={setBusca}
            onStatusChange={setFiltroStatus}
            onPeriodoChange={setPeriodoFiltro}
            onDataInicialChange={setDataInicialFiltro}
            onDataFinalChange={setDataFinalFiltro}
            onConsultoraChange={setConsultoraFiltro}
            onBancoChange={(valor) => {
              setBancoFiltro(valor);
              setTabelaFiltro("Todas");
            }}
            onTabelaChange={setTabelaFiltro}
          />

          {carregando ? (
  <div className="proposal-empty">
    <div>⌛</div>

    <strong>Carregando propostas</strong>

    <p>Aguarde enquanto os dados são buscados no Supabase.</p>
  </div>
) : propostasFiltradas.length === 0 ? (
  <div className="proposal-empty">
    <div>▤</div>

    <strong>Nenhuma proposta encontrada</strong>

    <p>Cadastre a primeira proposta ou altere os filtros.</p>
  </div>
) : (
  <ProposalTable
    propostas={propostasFiltradas}
    processando={processando}
    onVer={(proposta) =>
      setPropostaDetalhe(proposta as Proposta)
    }
    onEditar={(proposta) =>
      editar(proposta as Proposta)
    }
    onExcluir={(id) => void excluir(id)}
  />
)}
</section>
</section>

      <section className="proposal-note">
        <strong>Como funciona:</strong>

        <span>
          o percentual da tabela define quanto o contrato vale para a meta.
          Exemplo: contrato de R$ 20.000,00 na tabela de 75% vale R$ 15.000,00
          na produção da consultora. A premiação será calculada no Ranking
          depois da soma da Compra de Dívida com as parcelas do CLT.
        </span>
      </section>

      {propostaDetalhe && (
        <div
          className="proposal-detail-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setPropostaDetalhe(null)
          }
        >
          <section
            className="proposal-detail-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <header className="proposal-detail-head">
              <div>
                <span>DETALHES DA PROPOSTA</span>
                <h3>
                  {propostaDetalhe.cliente ||
                    "Cliente não informado"}
                </h3>
                <p>
                  {propostaDetalhe.vendedora || "—"} •{" "}
                  {propostaDetalhe.status}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPropostaDetalhe(null)
                }
              >
                ×
              </button>
            </header>

            <div className="proposal-detail-summary">
              <article>
                <span>Valor bruto</span>
                <strong>
                  {moeda(
                    propostaDetalhe.valorContrato,
                  )}
                </strong>
              </article>

              <article>
                <span>Valor líquido</span>
                <strong>
                  {moeda(
                    propostaDetalhe.valorMeta,
                  )}
                </strong>
              </article>

              <article>
                <span>Percentual</span>
                <strong>
                  {propostaDetalhe.percentualTabela || 0}%
                </strong>
              </article>

              <article>
                <span>Status</span>
                <strong>
                  {propostaDetalhe.status}
                </strong>
              </article>
            </div>

            <div className="proposal-detail-grid">
              <div>
                <span>CPF</span>
                <strong>{propostaDetalhe.cpf || "—"}</strong>
              </div>

              <div>
                <span>Telefone</span>
                <strong>{propostaDetalhe.telefone || "—"}</strong>
              </div>

              <div>
                <span>Consultora</span>
                <strong>{propostaDetalhe.vendedora || "—"}</strong>
              </div>

              <div>
                <span>Banco</span>
                <strong>{propostaDetalhe.banco || "—"}</strong>
              </div>

              <div>
                <span>Tabela</span>
                <strong>{propostaDetalhe.tabela || "—"}</strong>
              </div>

              <div>
                <span>Data da digitação</span>
                <strong>
                  {propostaDetalhe.dataCadastro
                    ? new Date(
                        `${propostaDetalhe.dataCadastro.slice(0, 10)}T12:00:00`,
                      ).toLocaleDateString("pt-BR")
                    : "—"}
                </strong>
              </div>

              <div>
                <span>Data do pagamento</span>
                <strong>
                  {propostaDetalhe.dataPagamento
                    ? new Date(
                        `${propostaDetalhe.dataPagamento.slice(0, 10)}T12:00:00`,
                      ).toLocaleDateString("pt-BR")
                    : "—"}
                </strong>
              </div>
            </div>

            {(propostaDetalhe.observacao ||
              propostaDetalhe.motivoCancelamento) && (
              <div className="proposal-detail-notes">
                {propostaDetalhe.motivoCancelamento && (
                  <div>
                    <span>Motivo do cancelamento</span>
                    <p>
                      {propostaDetalhe.motivoCancelamento}
                    </p>
                  </div>
                )}

                {propostaDetalhe.observacao && (
                  <div>
                    <span>Observações / histórico</span>
                    <p>{propostaDetalhe.observacao}</p>
                  </div>
                )}
              </div>
            )}

            <footer className="proposal-detail-actions">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setPropostaDetalhe(null)
                }
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={() => {
                  const proposta =
                    propostaDetalhe;
                  setPropostaDetalhe(null);
                  editar(proposta);
                }}
              >
                Editar proposta
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}