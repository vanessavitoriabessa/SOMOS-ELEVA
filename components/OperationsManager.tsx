"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import "./operacoes.css";

type ProdutoOperacao =
  | "Compra de Dívida"
  | "CLT";

type StatusCompra =
  | "Solicitado"
  | "Em andamento"
  | "Aguardando boleto"
  | "Nota promissória"
  | "Ag. liberação de margem"
  | "Ag. fazer anuência"
  | "Enviado ao banco"
  | "Pago"
  | "Cancelado";

type StatusClt =
  | "Novo lead"
  | "Em análise"
  | "Aguardando documentos"
  | "Digitado"
  | "Aprovado"
  | "Pago"
  | "Recusado";

type PerfilAtual = {
  id: string;
  nome: string;
  perfil: string;
};

type Cliente = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  banco?: string;
  produto?: string;
  consultora?: string;
};

type Proposta = {
  id: string;
  clienteId: string;
  cliente: string;
  cpf: string;
  telefone: string;
  vendedora: string;
  banco: string;
  tabela: string;
  percentualTabela: number;
  valorContrato: number;
  valorMeta: number;
  comissao: number;
  premiacao: number;
  status: StatusCompra;
  dataCadastro: string;
  dataPagamento: string;
  observacao: string;
};

type RegistroClt = {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  valorAprovado: number;
parcela: number;
prazo: number;
banco: string;
  consultora: string;
  status: StatusClt;
  criadoEm: string;
  atualizadoEm: string;
};

type FormularioOperacao = {
  produto: ProdutoOperacao;

  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
bancoOrigem: string;
bancoAtual: string;
banco: string;
consultora: string;
  observacao: string;

  tabela: string;
  valorContrato: string;
  statusCompra: StatusCompra;
  dataDigitacao: string;
  dataPagamento: string;

  valorAprovado: string;
  parcela: string;
  prazo: string;
  statusClt: StatusClt;
};

type OperacaoUnificada = {
  chave: string;
  id: string;
  produto: ProdutoOperacao;
  cliente: string;
  cpf: string;
  telefone: string;
  consultora: string;
  banco: string;
  valor: number;
  detalhe: string;
  status: string;
  data: string;
  proposta?: Proposta;
  clt?: RegistroClt;
};

type RespostaApi = {
  erro?: string;
  mensagem?: string;
  perfil?: PerfilAtual;
  clientes?: Cliente[];
  cliente?: Cliente;
  propostas?: Proposta[];
  proposta?: Proposta;
  registros?: RegistroClt[];
  registro?: RegistroClt;
};

const STATUS_COMPRA: StatusCompra[] = [
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

const STATUS_CLT: StatusClt[] = [
  "Novo lead",
  "Em análise",
  "Aguardando documentos",
  "Digitado",
  "Aprovado",
  "Pago",
  "Recusado",
];

const TABELAS_COMPRA = [
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

function hojeIso() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function formularioVazio(
  produto: ProdutoOperacao =
    "Compra de Dívida",
): FormularioOperacao {
  return {
    produto,

nome: "",
cpf: "",
dataNascimento: "",
telefone: "",
bancoOrigem: "",
bancoAtual: "NEO",
banco: "",
consultora: "",
observacao: "",

    tabela: "",
    valorContrato: "",
    statusCompra: "Solicitado",
    dataDigitacao: hojeIso(),
    dataPagamento: "",

    valorAprovado: "",
    parcela: "",
    prazo: "",
    statusClt: "Novo lead",
  };
}

function apenasNumeros(
  valor: unknown,
) {
  return String(valor || "")
    .replace(/\D/g, "");
}

function formatarCpf(
  valor: string,
) {
  const digitos = apenasNumeros(valor)
    .slice(0, 11);

  return digitos
    .replace(
      /^(\d{3})(\d)/,
      "$1.$2",
    )
    .replace(
      /^(\d{3})\.(\d{3})(\d)/,
      "$1.$2.$3",
    )
    .replace(
      /\.(\d{3})(\d)/,
      ".$1-$2",
    );
}

function formatarTelefone(
  valor: string,
) {
  const digitos = apenasNumeros(valor)
    .slice(0, 11);

  if (digitos.length <= 10) {
    return digitos
      .replace(
        /^(\d{2})(\d)/,
        "($1) $2",
      )
      .replace(
        /(\d{4})(\d)/,
        "$1-$2",
      );
  }

  return digitos
    .replace(
      /^(\d{2})(\d)/,
      "($1) $2",
    )
    .replace(
      /(\d{5})(\d)/,
      "$1-$2",
    );
}

function numero(
  valor: string,
) {
  const texto = String(valor || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const convertido = Number(texto);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
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

function formatarData(
  valor: string,
) {
  if (!valor) {
    return "Não informada";
  }

  const formatoIso = valor.match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  );

  if (formatoIso) {
    return `${formatoIso[3]}/${formatoIso[2]}/${formatoIso[1]}`;
  }

  return valor;
}

export default function OperationsManager() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [
    clientes,
    setClientes,
  ] = useState<Cliente[]>([]);

  const [
    propostas,
    setPropostas,
  ] = useState<Proposta[]>([]);

  const [
    registrosClt,
    setRegistrosClt,
  ] = useState<RegistroClt[]>([]);

  const [
    consultoras,
    setConsultoras,
  ] = useState<string[]>([]);

  const [
    perfilAtual,
    setPerfilAtual,
  ] = useState<PerfilAtual | null>(
    null,
  );

  const [
    form,
    setForm,
  ] = useState<FormularioOperacao>(
    formularioVazio(),
  );

  const [
    busca,
    setBusca,
  ] = useState("");

  const [
    filtroProduto,
    setFiltroProduto,
  ] = useState("Todos");

  const [
    filtroStatus,
    setFiltroStatus,
  ] = useState("Todos");

  const [
    filtroConsultora,
    setFiltroConsultora,
  ] = useState("Todas");

  const [
    mensagem,
    setMensagem,
  ] = useState("");

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    processando,
    setProcessando,
  ] = useState(false);

  const [
    atualizandoId,
    setAtualizandoId,
  ] = useState("");

  const usuarioEhConsultora =
    Boolean(
      perfilAtual &&
        perfilEhConsultora(
          perfilAtual.perfil,
        ),
    );

  const podeGerenciarStatus =
    Boolean(
      perfilAtual &&
        !usuarioEhConsultora,
    );

  async function obterSessaoAtual() {
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

  async function chamarApi<
    T extends RespostaApi,
  >(
    url: string,
    metodo:
      | "GET"
      | "POST"
      | "PATCH"
      | "DELETE" = "GET",
    corpo?: unknown,
    tokenInformado?: string,
  ): Promise<T> {
    const token =
      tokenInformado ||
      (
        await obterSessaoAtual()
      ).access_token;

    const resposta = await fetch(
      url,
      {
        method: metodo,
        headers: {
          Authorization:
            `Bearer ${token}`,
          ...(corpo
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
        },
        body: corpo
          ? JSON.stringify(corpo)
          : undefined,
        cache: "no-store",
      },
    );

    let conteudo: T;

    try {
      conteudo =
        (await resposta.json()) as T;
    } catch {
      throw new Error(
        "O servidor retornou uma resposta inválida.",
      );
    }

    if (!resposta.ok) {
      throw new Error(
        conteudo.erro ||
          "Não foi possível concluir a operação.",
      );
    }

    return conteudo;
  }

  async function carregarTudo() {
    setCarregando(true);

    try {
      const sessao =
        await obterSessaoAtual();

      const token =
        sessao.access_token;

      const [
        respostaClientes,
        respostaPropostas,
        respostaClt,
        respostaConsultoras,
      ] = await Promise.all([
        chamarApi<RespostaApi>(
          "/api/clientes",
          "GET",
          undefined,
          token,
        ),

        chamarApi<RespostaApi>(
          "/api/propostas",
          "GET",
          undefined,
          token,
        ),

        chamarApi<RespostaApi>(
          "/api/clt",
          "GET",
          undefined,
          token,
        ),

        chamarApi<
          RespostaApi & {
            consultoras?: Array<{
              nome?: string;
            }>;
          }
        >(
          "/api/consultoras",
          "GET",
          undefined,
          token,
        ),
      ]);

      const perfil =
        respostaClientes.perfil ||
        respostaPropostas.perfil ||
        respostaClt.perfil ||
        null;

      setPerfilAtual(perfil);

      setClientes(
        Array.isArray(
          respostaClientes.clientes,
        )
          ? respostaClientes.clientes
          : [],
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

      const nomesConsultoras =
        (
          respostaConsultoras.consultoras ||
          []
        )
          .map((item) =>
            String(
              item.nome || "",
            ).trim(),
          )
          .filter(Boolean);

      setConsultoras(
        Array.from(
          new Set(
            nomesConsultoras,
          ),
        ).sort((nomeA, nomeB) =>
          nomeA.localeCompare(
            nomeB,
            "pt-BR",
          ),
        ),
      );

      if (
        perfil &&
        perfilEhConsultora(
          perfil.perfil,
        )
      ) {
        setForm((atual) => ({
          ...atual,
          consultora:
            perfil.nome,
        }));
      }
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar as operações.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarTudo();
  }, [supabase]);

  function trocarProduto(
    produto: ProdutoOperacao,
  ) {
    setForm((atual) => ({
      ...formularioVazio(
        produto,
      ),

      consultora:
        usuarioEhConsultora
          ? perfilAtual?.nome || ""
          : atual.consultora,

      nome: atual.nome,
      cpf: atual.cpf,

      dataNascimento:
        atual.dataNascimento,

      telefone:
        atual.telefone,

      bancoOrigem:
  atual.bancoOrigem,

bancoAtual:
  atual.bancoAtual,

banco:
  atual.banco,

      observacao:
        atual.observacao,
    }));

    setMensagem("");
  }


    const operacoes =
    useMemo<OperacaoUnificada[]>(
      () => {
        const operacoesCompra =
          propostas.map(
            (item) => ({
              chave:
                `compra-${item.id}`,

              id: item.id,

              produto: "Compra de Dívida" as const,

              cliente:
                item.cliente,

              cpf:
                item.cpf,

              telefone:
                item.telefone,

              consultora:
                item.vendedora,

              banco:
                item.banco,

              valor:
                Number(
                  item.valorContrato ||
                    0,
                ),

              detalhe:
                item.tabela ||
                "Tabela não informada",

              status:
                item.status,

              data:
                item.dataPagamento ||
                item.dataCadastro,

              proposta:
                item,
            }),
          );

        const operacoesClt =
          registrosClt.map(
            (item) => ({
              chave:
                `clt-${item.id}`,

              id:
                item.id,

              produto: "CLT" as const,

              cliente:
                item.nome,

              cpf:
                item.cpf,

              telefone:
                item.telefone,

              consultora:
                item.consultora,

              banco:
                item.banco,

              valor:
                Number(
                  item.valorAprovado ||
                    0,
                ),

              detalhe:
                item.parcela
                  ? `Parcela ${moeda(
                      Number(
                        item.parcela ||
                          0,
                      ),
                    )}`
                  : "Parcela não informada",

              status:
                item.status,

              data:
                item.atualizadoEm ||
                item.criadoEm,

              clt:
                item,
            }),
          );

        return [
          ...operacoesCompra,
          ...operacoesClt,
        ];
      },
      [
        propostas,
        registrosClt,
      ],
    );

  const statusDisponiveis =
    useMemo(
      () =>
        Array.from(
          new Set(
            operacoes.map(
              (item) =>
                item.status,
            ),
          ),
        ).sort(
          (
            statusA,
            statusB,
          ) =>
            statusA.localeCompare(
              statusB,
              "pt-BR",
            ),
        ),
      [operacoes],
    );

  const operacoesFiltradas =
    useMemo(() => {
      const termo =
        normalizarTexto(busca);

      const termoNumerico =
        apenasNumeros(busca);

      return operacoes.filter(
        (item) => {
          const produtoCorreto =
            filtroProduto ===
              "Todos" ||
            item.produto ===
              filtroProduto;

          const statusCorreto =
            filtroStatus ===
              "Todos" ||
            item.status ===
              filtroStatus;

          const consultoraCorreta =
            filtroConsultora ===
              "Todas" ||
            item.consultora ===
              filtroConsultora;

          const buscaCorreta =
            !termo ||
            normalizarTexto(
              item.cliente,
            ).includes(termo) ||
            Boolean(
              termoNumerico &&
                item.cpf.includes(
                  termoNumerico,
                ),
            ) ||
            Boolean(
              termoNumerico &&
                item.telefone.includes(
                  termoNumerico,
                ),
            ) ||
            normalizarTexto(
              item.consultora,
            ).includes(termo) ||
            normalizarTexto(
              item.banco,
            ).includes(termo) ||
            normalizarTexto(
              item.produto,
            ).includes(termo);

          return (
            produtoCorreto &&
            statusCorreto &&
            consultoraCorreta &&
            buscaCorreta
          );
        },
      );
    }, [
      operacoes,
      busca,
      filtroProduto,
      filtroStatus,
      filtroConsultora,
    ]);

  const resumo =
    useMemo(() => {
      const pagas =
        operacoes.filter(
          (item) =>
            item.status ===
            "Pago",
        );

      return {
        total:
          operacoes.length,

        compra:
          operacoes.filter(
            (item) =>
              item.produto ===
              "Compra de Dívida",
          ).length,

        clt:
          operacoes.filter(
            (item) =>
              item.produto ===
              "CLT",
          ).length,

        pagas:
          pagas.length,

        valorPago:
          pagas.reduce(
            (
              total,
              item,
            ) =>
              total +
              Number(
                item.valor ||
                  0,
              ),
            0,
          ),
      };
    }, [operacoes]);

  async function obterOuCriarCliente(
    token: string,
    consultoraResponsavel: string,
  ) {
    const cpf =
      apenasNumeros(
        form.cpf,
      );

    const clienteExistente =
      clientes.find(
        (item) =>
          apenasNumeros(
            item.cpf,
          ) === cpf,
      );

    if (clienteExistente) {
      return {
        cliente:
          clienteExistente,

        criadoAgora:
          false,
      };
    }

    const agora =
      new Date().toISOString();

    const clienteNovo = {
      id:
        crypto.randomUUID(),

      convenioEstado:
        "",

      convenioOrgao:
        "",

      produto:
        form.produto,

      matricula:
        "",

      cargo:
        "",

      salario:
        0,

      nome:
        form.nome.trim(),

      cpf,

      nascimento:
        form.dataNascimento,

      sexo:
        "",

      estadoCivil:
        "",

      nacionalidade:
        "Brasileira",

      naturalidade:
        "",

      rg:
        "",

      orgaoEmissor:
        "",

      ufEmissor:
        "",

      dataEmissaoRg:
        "",

      nomeMae:
        "",

      nomePai:
        "",

      telefone:
        apenasNumeros(
          form.telefone,
        ),

      email:
        "",

      cep:
        "",

      logradouro:
        "",

      numeroEndereco:
        "",

      complemento:
        "",

      bairro:
        "",

      cidade:
        "",

      estado:
        "",

      banco:
  form.produto === "Compra de Dívida"
    ? `${form.bancoOrigem.trim()} → ${form.bancoAtual.trim() || "NEO"}`
    : form.banco.trim(),

agencia:
  "",

      conta:
        "",

      digitoConta:
        "",

      tipoConta:
        "Conta corrente",

      titularConta:
        form.nome.trim(),

      consultora:
        consultoraResponsavel,

      status:
        "Ativo",

      observacoes:
        form.observacao.trim(),

      documentos:
        [],

      criadoEm:
        agora,

      atualizadoEm:
        agora,
    };

    try {
      const resposta =
        await chamarApi<
          RespostaApi
        >(
          "/api/clientes",
          "POST",
          {
            cliente:
              clienteNovo,
          },
          token,
        );

      return {
        cliente:
          resposta.cliente ||
          (clienteNovo as Cliente),

        criadoAgora:
          true,
      };
    } catch (erro) {
      const textoErro =
        erro instanceof Error
          ? erro.message
          : "";

      if (
        normalizarTexto(
          textoErro,
        ).includes("cpf")
      ) {
        const respostaAtualizada =
          await chamarApi<
            RespostaApi
          >(
            "/api/clientes",
            "GET",
            undefined,
            token,
          );

        const encontrado =
          (
            respostaAtualizada.clientes ||
            []
          ).find(
            (item) =>
              apenasNumeros(
                item.cpf,
              ) === cpf,
          );

        if (encontrado) {
          return {
            cliente:
              encontrado,

            criadoAgora:
              false,
          };
        }
      }

      throw erro;
    }
  }

    async function salvar(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMensagem("");

    const cpf =
      apenasNumeros(
        form.cpf,
      );

    const telefone =
      apenasNumeros(
        form.telefone,
      );

    const consultoraResponsavel =
      usuarioEhConsultora
        ? perfilAtual?.nome || ""
        : form.consultora.trim();

    if (!form.nome.trim()) {
      setMensagem(
        "Informe o nome completo do cliente.",
      );
      return;
    }

    if (cpf.length !== 11) {
      setMensagem(
        "O CPF precisa ter 11 números.",
      );
      return;
    }

    if (!form.dataNascimento) {
      setMensagem(
        "Informe a data de nascimento.",
      );
      return;
    }

    if (
      telefone.length < 10 ||
      telefone.length > 11
    ) {
      setMensagem(
        "Informe um telefone válido.",
      );
      return;
    }

    if (
  form.produto ===
  "Compra de Dívida"
) {
  if (
    !form.bancoOrigem.trim()
  ) {
    setMensagem(
      "Selecione o banco de origem.",
    );
    return;
  }
} else {
  if (!form.banco.trim()) {
    setMensagem(
      "Selecione o banco do CLT.",
    );
    return;
  }
}

    if (
      !consultoraResponsavel
    ) {
      setMensagem(
        "Selecione a consultora responsável.",
      );
      return;
    }

    if (
      form.produto ===
      "Compra de Dívida"
    ) {
      const tabela =
        TABELAS_COMPRA.find(
          (item) =>
            item.nome ===
            form.tabela,
        );

      if (!tabela) {
        setMensagem(
          "Selecione a tabela utilizada.",
        );
        return;
      }

      if (
        numero(
          form.valorContrato,
        ) <= 0
      ) {
        setMensagem(
          "Informe o valor total do contrato.",
        );
        return;
      }

      if (!form.dataDigitacao) {
        setMensagem(
          "Informe a data da digitação.",
        );
        return;
      }

      if (
        !usuarioEhConsultora &&
        form.statusCompra ===
          "Pago" &&
        !form.dataPagamento
      ) {
        setMensagem(
          "Informe a data do pagamento.",
        );
        return;
      }
    } else {
      if (
        numero(
          form.valorAprovado,
        ) <= 0
      ) {
        setMensagem(
          "Informe o valor aprovado.",
        );
        return;
      }

      if (
        numero(
          form.parcela,
        ) <= 0
      ) {
        setMensagem(
          "Informe o valor da parcela.",
        );
        return;
      }
    }
if (
  numero(
    form.parcela,
  ) <= 0
) {
  setMensagem(
    "Informe o valor da parcela.",
  );
  return;
}

if (
  Number(form.prazo || 0) <= 0
) {
  setMensagem(
    "Informe o prazo em meses.",
  );
  return;
}
    setProcessando(true);

    let clienteCriadoId =
      "";

    try {
      const sessao =
        await obterSessaoAtual();

      const token =
        sessao.access_token;

      const {
        cliente,
        criadoAgora,
      } =
        await obterOuCriarCliente(
          token,
          consultoraResponsavel,
        );

      if (criadoAgora) {
        clienteCriadoId =
          cliente.id;
      }

      if (
        form.produto ===
        "Compra de Dívida"
      ) {
        const tabela =
          TABELAS_COMPRA.find(
            (item) =>
              item.nome ===
              form.tabela,
          );

        if (!tabela) {
          throw new Error(
            "A tabela selecionada não foi encontrada.",
          );
        }

        const valorContrato =
          numero(
            form.valorContrato,
          );

        const valorMeta =
          valorContrato *
          (
            tabela.percentual /
            100
          );

        const proposta: Proposta = {
          id:
            crypto.randomUUID(),

          clienteId:
            cliente.id,

          cliente:
            form.nome.trim(),

          cpf,

          telefone,

          vendedora:
  consultoraResponsavel,

banco:
  form.bancoOrigem.trim() +
  " → " +
  (form.bancoAtual.trim() || "NEO"),

tabela:
  tabela.nome,

          percentualTabela:
            tabela.percentual,

          valorContrato,

          valorMeta,

          comissao:
            0,

          premiacao:
            0,

          status:
            usuarioEhConsultora
              ? "Solicitado"
              : form.statusCompra,

          dataCadastro:
            form.dataDigitacao,

          dataPagamento:
            !usuarioEhConsultora &&
            form.statusCompra ===
              "Pago"
              ? form.dataPagamento
              : "",

          observacao:
            form.observacao.trim(),
        };

        await chamarApi<
          RespostaApi
        >(
          "/api/propostas",
          "POST",
          {
            proposta,
          },
          token,
        );
      } else {
        const agora =
          new Date()
            .toLocaleString(
              "pt-BR",
            );

        const registro: RegistroClt = {
          id:
            crypto.randomUUID(),

          nome:
            form.nome.trim(),

          cpf,

          dataNascimento:
            form.dataNascimento,

          telefone,

          valorAprovado:
            numero(
              form.valorAprovado,
            ),

          parcela:
            numero(
              form.parcela,
            ),
prazo:
  Number(form.prazo || 0),

          banco:
            form.banco.trim(),

          consultora:
            consultoraResponsavel,

          status:
            usuarioEhConsultora
              ? "Novo lead"
              : form.statusClt,

          criadoEm:
            agora,

          atualizadoEm:
            agora,
        };

        await chamarApi<
          RespostaApi
        >(
          "/api/clt",
          "POST",
          {
            registro,
          },
          token,
        );
      }

      const produtoSalvo =
        form.produto;

      await carregarTudo();

      setForm({
        ...formularioVazio(
          produtoSalvo,
        ),

        consultora:
          usuarioEhConsultora
            ? perfilAtual?.nome ||
              ""
            : "",
      });

      setMensagem(
        `${produtoSalvo} cadastrada com sucesso. O cliente e a operação foram salvos juntos.`,
      );
    } catch (erro) {
      if (clienteCriadoId) {
        try {
          const sessao =
            await obterSessaoAtual();

          await chamarApi<
            RespostaApi
          >(
            "/api/clientes",
            "DELETE",
            {
              id:
                clienteCriadoId,
            },
            sessao.access_token,
          );
        } catch {
          // Mantém a mensagem
          // original do erro.
        }
      }

      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar a operação.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function alterarStatus(
    operacao:
      OperacaoUnificada,

    novoStatus:
      string,
  ) {
    if (!podeGerenciarStatus) {
      return;
    }

    setAtualizandoId(
      operacao.chave,
    );

    setMensagem("");

    try {
      const sessao =
        await obterSessaoAtual();

      const token =
        sessao.access_token;

      if (
        operacao.produto ===
          "Compra de Dívida" &&
        operacao.proposta
      ) {
        const proposta: Proposta = {
          ...operacao.proposta,

          status:
            novoStatus as StatusCompra,

          dataPagamento:
            novoStatus ===
            "Pago"
              ? operacao.proposta
                  .dataPagamento ||
                hojeIso()
              : "",
        };

        await chamarApi<
          RespostaApi
        >(
          "/api/propostas",
          "PATCH",
          {
            proposta,
          },
          token,
        );
      }

      if (
        operacao.produto ===
          "CLT" &&
        operacao.clt
      ) {
        const registro: RegistroClt = {
          ...operacao.clt,

          status:
            novoStatus as StatusClt,

          atualizadoEm:
            new Date()
              .toLocaleString(
                "pt-BR",
              ),
        };

        await chamarApi<
          RespostaApi
        >(
          "/api/clt",
          "PATCH",
          {
            registro,
          },
          token,
        );
      }

      await carregarTudo();

      setMensagem(
        "Status atualizado com sucesso.",
      );
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar o status.",
      );
    } finally {
      setAtualizandoId("");
    }
  }

    return (
    <div className="operations-page">
      <section className="operations-summary">
        <article>
          <span>
            Total de operações
          </span>

          <strong>
            {resumo.total}
          </strong>
        </article>

        <article>
          <span>
            Compra de Dívida
          </span>

          <strong>
            {resumo.compra}
          </strong>
        </article>

        <article>
          <span>
            CLT
          </span>

          <strong>
            {resumo.clt}
          </strong>
        </article>

        <article>
          <span>
            Operações pagas
          </span>

          <strong>
            {resumo.pagas}
          </strong>
        </article>

        <article className="operations-summary-highlight">
          <span>
            Valor pago
          </span>

          <strong>
            {moeda(
              resumo.valorPago,
            )}
          </strong>
        </article>
      </section>

      <section className="operations-layout">
        <form
          className="operations-card operations-form"
          onSubmit={salvar}
        >
          <div className="operations-heading">
            <div>
              <span>
                NOVA OPERAÇÃO
              </span>

              <h2>
                Cadastro completo
              </h2>

              <p>
                Cadastre o cliente e a operação em um único lugar.
              </p>
            </div>

            <b>
              1x
            </b>
          </div>

          <div className="operations-product-switch">
            <button
              type="button"
              className={
                form.produto ===
                "Compra de Dívida"
                  ? "active"
                  : ""
              }
              disabled={processando}
              onClick={() =>
                trocarProduto(
                  "Compra de Dívida",
                )
              }
            >
              Compra de Dívida
            </button>

            <button
              type="button"
              className={
                form.produto ===
                "CLT"
                  ? "active"
                  : ""
              }
              disabled={processando}
              onClick={() =>
                trocarProduto(
                  "CLT",
                )
              }
            >
              CLT
            </button>
          </div>

          <div className="operations-form-grid">
            <label>
              Nome completo

              <input
                value={form.nome}
                disabled={processando}
                placeholder="Nome do cliente"
                onChange={(event) =>
                  setForm({
                    ...form,
                    nome:
                      event.target.value,
                  })
                }
              />
            </label>

            <label>
              CPF

              <input
                value={form.cpf}
                disabled={processando}
                inputMode="numeric"
                placeholder="000.000.000-00"
                onChange={(event) =>
                  setForm({
                    ...form,
                    cpf:
                      formatarCpf(
                        event.target.value,
                      ),
                  })
                }
              />
            </label>

            <label>
              Data de nascimento

              <input
                type="date"
                value={
                  form.dataNascimento
                }
                disabled={processando}
                onChange={(event) =>
                  setForm({
                    ...form,
                    dataNascimento:
                      event.target.value,
                  })
                }
              />
            </label>

            <label>
              Telefone

              <input
                value={
                  form.telefone
                }
                disabled={processando}
                inputMode="numeric"
                placeholder="(62) 99999-9999"
                onChange={(event) =>
                  setForm({
                    ...form,
                    telefone:
                      formatarTelefone(
                        event.target.value,
                      ),
                  })
                }
              />
            </label>

            {form.produto === "Compra de Dívida" ? (
  <>
    <label>
      Banco de origem

      <select
        value={form.bancoOrigem}
        disabled={processando}
        onChange={(event) =>
          setForm({
            ...form,
            bancoOrigem: event.target.value,
          })
        }
      >
        <option value="">
          Selecione o banco de origem
        </option>

        <option value="BANCO MASTER">
          BANCO MASTER
        </option>

        <option value="CREDCESTA">
          CREDCESTA
        </option>

        <option value="BANCO PAN">
          BANCO PAN
        </option>

        <option value="BANCO BMG">
          BANCO BMG
        </option>

        <option value="BANCO DAYCOVAL">
          BANCO DAYCOVAL
        </option>

        <option value="BANCO MERCANTIL">
          BANCO MERCANTIL
        </option>

        <option value="BANCO C6">
          BANCO C6
        </option>
      </select>
    </label>

    <label>
      Banco atual

      <select
        value={form.bancoAtual}
        disabled={processando}
        onChange={(event) =>
          setForm({
            ...form,
            bancoAtual: event.target.value,
          })
        }
      >
        <option value="NEO">
          NEO
        </option>
      </select>
    </label>
  </>
) : (
  <label>
    Banco / Parceiro

    <select
      value={form.banco}
      disabled={processando}
      onChange={(event) =>
        setForm({
          ...form,
          banco: event.target.value,
        })
      }
    >
      <option value="">
        Selecione o banco
      </option>

      <option value="3RN">
        3RN
      </option>

      <option value="BANCO C6">
        BANCO C6
      </option>
    </select>
  </label>
)}

            <label>
              Consultora

              <select
                value={
                  form.consultora
                }
                disabled={
                  processando ||
                  usuarioEhConsultora
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    consultora:
                      event.target.value,
                  })
                }
              >
                <option value="">
                  Selecione a consultora
                </option>

                {form.consultora &&
                  !consultoras.includes(
                    form.consultora,
                  ) && (
                    <option
                      value={
                        form.consultora
                      }
                    >
                      {form.consultora}
                    </option>
                  )}

                {consultoras.map(
                  (consultora) => (
                    <option
                      key={consultora}
                      value={consultora}
                    >
                      {consultora}
                    </option>
                  ),
                )}
              </select>
            </label>

            {form.produto ===
            "Compra de Dívida" ? (
              <>
                <label>
                  Tabela

                  <select
                    value={
                      form.tabela
                    }
                    disabled={
                      processando
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        tabela:
                          event.target
                            .value,
                      })
                    }
                  >
                    <option value="">
                      Selecione a tabela
                    </option>

                    {TABELAS_COMPRA.map(
                      (tabela) => (
                        <option
                          key={
                            tabela.nome
                          }
                          value={
                            tabela.nome
                          }
                        >
                          {tabela.nome} —{" "}
                          {
                            tabela.percentual
                          }
                          %
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  Valor do contrato

                  <input
                    value={
                      form.valorContrato
                    }
                    disabled={
                      processando
                    }
                    inputMode="decimal"
                    placeholder="Ex.: 8.500,00"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        valorContrato:
                          event.target
                            .value,
                      })
                    }
                  />
                </label>

                <label>
                  Data da digitação

                  <input
                    type="date"
                    value={
                      form.dataDigitacao
                    }
                    disabled={
                      processando
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        dataDigitacao:
                          event.target
                            .value,
                      })
                    }
                  />
                </label>

                {!usuarioEhConsultora && (
                  <label>
                    Status inicial

                    <select
                      value={
                        form.statusCompra
                      }
                      disabled={
                        processando
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          statusCompra:
                            event.target
                              .value as StatusCompra,
                        })
                      }
                    >
                      {STATUS_COMPRA.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                )}

                {!usuarioEhConsultora &&
                  form.statusCompra ===
                    "Pago" && (
                    <label>
                      Data do pagamento

                      <input
                        type="date"
                        value={
                          form.dataPagamento
                        }
                        disabled={
                          processando
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm({
                            ...form,
                            dataPagamento:
                              event.target
                                .value,
                          })
                        }
                      />
                    </label>
                  )}
              </>
            ) : (
              <>
                <label>
                  Valor aprovado

                  <input
                    value={
                      form.valorAprovado
                    }
                    disabled={
                      processando
                    }
                    inputMode="decimal"
                    placeholder="Ex.: 5.000,00"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        valorAprovado:
                          event.target
                            .value,
                      })
                    }
                  />
                </label>

                <label>
                  Valor da parcela

                  <input
                    value={
                      form.parcela
                    }
                    disabled={
                      processando
                    }
                    inputMode="decimal"
                    placeholder="Ex.: 450,00"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        parcela:
                          event.target
                            .value,
                      })
                    }
                  />
                </label>
                <label>
  Prazo (meses)

  <input
    type="number"
    min="1"
    step="1"
    value={form.prazo}
    disabled={processando}
    inputMode="numeric"
    placeholder="Ex.: 12"
    onChange={(event) =>
      setForm({
        ...form,
        prazo: event.target.value.replace(
          /\D/g,
          "",
        ),
      })
    }
  />
</label>

                {!usuarioEhConsultora && (
                  <label>
                    Status inicial

                    <select
                      value={
                        form.statusClt
                      }
                      disabled={
                        processando
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          statusClt:
                            event.target
                              .value as StatusClt,
                        })
                      }
                    >
                      {STATUS_CLT.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                )}
              </>
            )}

            <label className="operations-full-field">
              Observação

              <textarea
                value={
                  form.observacao
                }
                disabled={processando}
                placeholder="Informações importantes da operação"
                onChange={(event) =>
                  setForm({
                    ...form,
                    observacao:
                      event.target.value,
                  })
                }
              />
            </label>
          </div>

          {mensagem && (
            <div className="operations-message">
              {mensagem}
            </div>
          )}

          <button
            type="submit"
            className="operations-save"
            disabled={processando}
          >
            {processando
              ? "Salvando cliente e operação..."
              : "Salvar operação completa"}
          </button>
        </form>

        <section className="operations-card operations-list-card">
          <div className="operations-list-heading">
            <div>
              <span>
                CARTEIRA UNIFICADA
              </span>

              <h2>
                Todas as operações
              </h2>

              <p>
                Compra de Dívida e CLT reunidas na mesma tela.
              </p>
            </div>

            <b>
              {
                operacoesFiltradas.length
              }
            </b>
          </div>

          <div className="operations-filters">
            <input
              value={busca}
              placeholder="Pesquisar cliente, CPF, telefone, banco ou consultora"
              onChange={(event) =>
                setBusca(
                  event.target.value,
                )
              }
            />

            <select
              value={
                filtroProduto
              }
              onChange={(event) =>
                setFiltroProduto(
                  event.target.value,
                )
              }
            >
              <option>
                Todos
              </option>

              <option>
                Compra de Dívida
              </option>

              <option>
                CLT
              </option>
            </select>

            <select
              value={filtroStatus}
              onChange={(event) =>
                setFiltroStatus(
                  event.target.value,
                )
              }
            >
              <option>
                Todos
              </option>

              {statusDisponiveis.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ),
              )}
            </select>

            {!usuarioEhConsultora && (
              <select
                value={
                  filtroConsultora
                }
                onChange={(event) =>
                  setFiltroConsultora(
                    event.target.value,
                  )
                }
              >
                <option>
                  Todas
                </option>

                {consultoras.map(
                  (consultora) => (
                    <option
                      key={consultora}
                      value={consultora}
                    >
                      {consultora}
                    </option>
                  ),
                )}
              </select>
            )}
          </div>

          {carregando ? (
            <div className="operations-empty">
              <strong>
                Carregando operações...
              </strong>

              <p>
                Aguarde a consulta ao Supabase.
              </p>
            </div>
          ) : operacoesFiltradas.length ===
            0 ? (
            <div className="operations-empty">
              <strong>
                Nenhuma operação encontrada
              </strong>

              <p>
                Cadastre uma operação ou altere os filtros.
              </p>
            </div>
          ) : (
            <div className="operations-list">
              {operacoesFiltradas.map(
                (operacao) => {
                  const statusDaOperacao =
                    operacao.produto ===
                    "Compra de Dívida"
                      ? STATUS_COMPRA
                      : STATUS_CLT;

                  return (
                    <article
                      key={
                        operacao.chave
                      }
                    >
                      <div className="operations-item-top">
                        <div>
                          <span
                            className={`operations-product ${
                              operacao.produto ===
                              "CLT"
                                ? "clt"
                                : "compra"
                            }`}
                          >
                            {
                              operacao.produto
                            }
                          </span>

                          <strong>
                            {
                              operacao.cliente
                            }
                          </strong>

                          <small>
                            {operacao.cpf
                              ? formatarCpf(
                                  operacao.cpf,
                                )
                              : "CPF não informado"}
                            {" • "}
                            {operacao.telefone
                              ? formatarTelefone(
                                  operacao.telefone,
                                )
                              : "Telefone não informado"}
                          </small>
                        </div>

                        {podeGerenciarStatus ? (
                          <select
                            className="operations-status-select"
                            value={
                              operacao.status
                            }
                            disabled={
                              atualizandoId ===
                              operacao.chave
                            }
                            onChange={(event) =>
                              void alterarStatus(
                                operacao,
                                event.target
                                  .value,
                              )
                            }
                          >
                            {statusDaOperacao.map(
                              (status) => (
                                <option
                                  key={
                                    status
                                  }
                                  value={
                                    status
                                  }
                                >
                                  {status}
                                </option>
                              ),
                            )}
                          </select>
                        ) : (
                          <span className="operations-status-badge">
                            {
                              operacao.status
                            }
                          </span>
                        )}
                      </div>

                      <div className="operations-values">
                        <div>
                          <small>
                            Valor
                          </small>

                          <b>
                            {moeda(
                              operacao.valor,
                            )}
                          </b>
                        </div>

                        <div>
                          <small>
                            Banco
                          </small>

                          <b>
                            {operacao.banco ||
                              "Não informado"}
                          </b>
                        </div>

                        <div>
                          <small>
                            Detalhe
                          </small>

                          <b>
                            {
                              operacao.detalhe
                            }
                          </b>
                        </div>

                        <div>
                          <small>
                            Data
                          </small>

                          <b>
                            {formatarData(
                              operacao.data,
                            )}
                          </b>
                        </div>
                      </div>

                      <footer>
                        <span>
                          {operacao.consultora ||
                            "Sem consultora"}
                        </span>

                        {atualizandoId ===
                          operacao.chave && (
                          <b>
                            Atualizando...
                          </b>
                        )}
                      </footer>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}