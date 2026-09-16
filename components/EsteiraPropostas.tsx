"use client";

import "./esteira.css";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type StatusProposta = string;

type Cliente = {
  id: string;
  nome: string;
  cpf: string;
  rg: string;
  telefone: string;
  telefone2: string;
  email: string;
  nomeMae: string;
  nomePai: string;
  dataNascimento: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

type Proposta = {
  id: string;
  numeroProposta: string;
  motivoCancelamento?: string;
  dataCancelamento?: string;
  canceladoPor?: string;
  clienteId: string;
  cliente: string;
  cpf: string;
  telefone: string;
  vendedora: string;
  banco: string;
  tabelaBancoId?: string;
  tabela: string;
  percentualTabela: number;
  valorContrato: number;
  valorMeta: number;
  comissao?: number;
  status: StatusProposta;
  dataSolicitacao: string;
  dataCadastro: string;
  dataPagamento: string;
observacao: string;
senhaContracheque: string;
senhaConsignacao: string;
protocolo?: string;
};

type TabelaConfigurada = {
  id: string;
  banco: string;
  orgaoConvenio: string;
  nome: string;
  codigo: string;
  percentual: number;
  percentualComissaoBanco: number | null;
  ativo: boolean;
};

type OrgaoConvenio = {
  id: string;
  nome: string;
  ativo: boolean;
};

type StatusConfigurado = {
  id: string; nome: string;
  tipo: "EM_ANDAMENTO" | "PAGO" | "CANCELADO";
  prazoDias: number | null; ordem: number; ativo: boolean;
};

type BancoConfigurado = {
  id: string;
  nome: string;
  ativo: boolean;
};

type RespostaApi = {
  perfil?: {
    id: string;
    nome: string;
    perfil: string;
  };
  propostas?: Proposta[];
  proposta?: Proposta;
  erro?: string;
};

type Formulario = {
  clienteId: string;
  numeroProposta: string;
  nomeCliente: string;
cpfCliente: string;
rgCliente: string;
telefoneCliente: string;
telefone2Cliente: string;
emailCliente: string;
nomeMaeCliente: string;
nomePaiCliente: string;
dataNascimentoCliente: string;
cepCliente: string;
enderecoCliente: string;
numeroCliente: string;
complementoCliente: string;
bairroCliente: string;
cidadeCliente: string;
ufCliente: string;
  vendedora: string;
  banco: string;
  tabela: string;
  valorContrato: string;
  status: StatusProposta;
  dataSolicitacao: string;
  dataDigitacao: string;
  dataPagamento: string;
observacao: string;
senhaContracheque: string;
senhaConsignacao: string;
};

const STATUS_PADRAO: StatusProposta[] = [
  "AG. BOLETO",
  "PROPOSTA DIGITADA",
  "AG. ASS TERMO",
  "AG. VÍDEO",
  "AG. ASS PROPOSTA",
  "BOLETO VALIDADO",
  "AG. QUITAÇÃO",
  "BOLETO QUITADO",
  "AG. LIBERAÇÃO MARGEM",
  "AVERBADO",
  "PAGO",
  "CANCELADA",
];

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

const FORMULARIO_VAZIO: Formulario = {
  clienteId: "",
  numeroProposta: "",
  nomeCliente: "",
cpfCliente: "",
rgCliente: "",
telefoneCliente: "",
telefone2Cliente: "",
emailCliente: "",
nomeMaeCliente: "",
nomePaiCliente: "",
dataNascimentoCliente: "",
cepCliente: "",
enderecoCliente: "",
numeroCliente: "",
complementoCliente: "",
bairroCliente: "",
cidadeCliente: "",
ufCliente: "",
  vendedora: "",
  banco: "",
  tabela: "",
  valorContrato: "",
  status: "AG. BOLETO",
  dataSolicitacao: hojeIso(),
  dataDigitacao: hojeIso(),
  dataPagamento: "",
observacao: "",
senhaContracheque: "",
senhaConsignacao: "",
};

function apenasNumeros(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

function normalizarPerfil(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}


function numeroFlex(valor: string) {
  const texto = normalizarPerfil(valor)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  const achou = texto.match(/flex\s*0*(\d+)/i);
  return achou ? Number(achou[1]) : null;
}

function ehTabelaNormal(valor: string) {
  return normalizarPerfil(valor).includes("normal");
}

function encontrarTabelaDaProposta(
  proposta: Proposta,
  tabelas: TabelaConfigurada[],
) {
  const ativas = tabelas.filter((tabela) => tabela.ativo);

  // 1) Melhor cenário: a proposta já possui o ID exato da tabela escolhida.
  if (proposta.tabelaBancoId) {
    const porId = ativas.find(
      (tabela) => tabela.id === proposta.tabelaBancoId,
    );
    if (porId) return porId;
  }

  const banco = normalizarPerfil(proposta.banco);
  const nomeVenda = normalizarPerfil(proposta.tabela);
  const percentualVenda = Number(proposta.percentualTabela || 0);
  const flexVenda = numeroFlex(proposta.tabela);
  const normalVenda = ehTabelaNormal(proposta.tabela);

  const mesmoBanco = ativas.filter(
    (tabela) => normalizarPerfil(tabela.banco) === banco,
  );

  // 2) Nome exatamente igual + mesmo percentual de produção.
  const exata = mesmoBanco.find(
    (tabela) =>
      normalizarPerfil(tabela.nome) === nomeVenda &&
      Math.abs(Number(tabela.percentual || 0) - percentualVenda) < 0.0001,
  );
  if (exata) return exata;

  // 3) Propostas antigas como "NEO FLEX 3":
  // casa pelo número do FLEX + percentual de produção.
  if (flexVenda !== null) {
    const porFlexEPercentual = mesmoBanco.find(
      (tabela) =>
        numeroFlex(tabela.nome) === flexVenda &&
        Math.abs(Number(tabela.percentual || 0) - percentualVenda) < 0.0001,
    );
    if (porFlexEPercentual) return porFlexEPercentual;
  }

  // 4) NORMAL antiga: casa NORMAL + percentual de produção.
  if (normalVenda) {
    const porNormalEPercentual = mesmoBanco.find(
      (tabela) =>
        ehTabelaNormal(tabela.nome) &&
        Math.abs(Number(tabela.percentual || 0) - percentualVenda) < 0.0001,
    );
    if (porNormalEPercentual) return porNormalEPercentual;
  }

  // 5) Compatibilidade final para nomes com prefixos (SP_NCDT_, MA_CGMX_ etc).
  const porNomeContido = mesmoBanco.find((tabela) => {
    const nomeTabela = normalizarPerfil(tabela.nome);
    return (
      nomeTabela.includes(nomeVenda) ||
      nomeVenda.includes(nomeTabela)
    );
  });

  return porNomeContido;
}

function calcularComissaoDaProposta(
  proposta: Proposta,
  tabelas: TabelaConfigurada[],
) {
  const tabela = encontrarTabelaDaProposta(proposta, tabelas);
  const percentual = Number(tabela?.percentualComissaoBanco || 0);
  const valor = Number(proposta.valorContrato || 0) * (percentual / 100);

  return {
    tabela,
    percentual,
    valor,
  };
}

function formatarCpf(valor: string) {
  return apenasNumeros(valor)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function moeda(valor?: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function converterValor(valor: string) {
  const texto = String(valor || "")
    .trim()
    .replace(/[^\d,.-]/g, "");

  if (!texto) return 0;

  let normalizado = texto;

  if (texto.includes(",") && texto.includes(".")) {
    // Ex.: 25.832,20
    normalizado = texto
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (texto.includes(",")) {
    // Ex.: 25832,20
    normalizado = texto.replace(",", ".");
  } else if (texto.includes(".")) {
    // Se houver apenas um ponto e 1 ou 2 casas depois dele,
    // tratamos como decimal vindo do banco: 25832.2 / 25832.20.
    const partes = texto.split(".");
    const ultimo = partes[partes.length - 1];

    if (partes.length === 2 && /^\d{1,2}$/.test(ultimo)) {
      normalizado = texto;
    } else {
      // Ex.: 25.832 ou 1.234.567
      normalizado = texto.replace(/\./g, "");
    }
  }

  const convertido = Number(normalizado);

  return Number.isFinite(convertido) ? convertido : 0;
}

function dataBR(valor?: string) {
  if (!valor) return "—";

  const data = valor.slice(0, 10);
  const partes = data.split("-");

  if (partes.length !== 3) return valor;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
function calcularLimitePagamento(dataFinal: string) {
  if (!dataFinal) return "";

  const [anoTexto, mesTexto] = dataFinal.split("-");
  let ano = Number(anoTexto);
  let mes = Number(mesTexto) + 1;

  if (mes === 13) {
    mes = 1;
    ano += 1;
  }

  return `${ano}-${String(mes).padStart(2, "0")}-19`;
}
function classeStatus(status: string) {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function numeroProposta(id: string, indice: number) {
  const parteId = String(id || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase();

  return `PROP-${parteId || String(indice + 1).padStart(6, "0")}`;
}

export default function EsteiraPropostas() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [consultoras, setConsultoras] = useState<string[]>([]);
  const [tabelasConfiguradas, setTabelasConfiguradas] = useState<TabelaConfigurada[]>([]);
  const [orgaosConvenios, setOrgaosConvenios] = useState<OrgaoConvenio[]>([]);
  const [bancosConfigurados, setBancosConfigurados] = useState<BancoConfigurado[]>([]);
  const [statusConfigurados, setStatusConfigurados] = useState<StatusConfigurado[]>([]);
  const [orgaoConvenio, setOrgaoConvenio] = useState("");
  const [perfilAtual, setPerfilAtual] = useState("");
  const [permissoesPerfil, setPermissoesPerfil] =
    useState<Record<string, boolean> | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroConsultora, setFiltroConsultora] = useState("Todas");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  function selecionarMesAtual() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth();

  const inicio = new Date(ano, mes, 1);
  const fim = new Date(ano, mes + 1, 0);

  setDataInicial(inicio.toISOString().slice(0, 10));
  setDataFinal(fim.toISOString().slice(0, 10));
}

function limparPeriodo() {
  setDataInicial("");
  setDataFinal("");
}

  const [selecionada, setSelecionada] = useState<Proposta | null>(null);
  const [editando, setEditando] = useState<Proposta | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalCancelamentoAberto, setModalCancelamentoAberto] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [cancelando, setCancelando] = useState(false);

  const [form, setForm] = useState<Formulario>(FORMULARIO_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const [nomeUsuarioAtual, setNomeUsuarioAtual] = useState("");
  const [mensagem, setMensagem] = useState("");
const [buscaCliente, setBuscaCliente] = useState("");
const [etapaModal, setEtapaModal] = useState(1);
const [clienteNovo, setClienteNovo] = useState(false);
const [buscandoCep, setBuscandoCep] = useState(false);
const [mensagemCep, setMensagemCep] = useState("");
const [arquivos, setArquivos] = useState({
  rgFrente: null as File | null,
  rgVerso: null as File | null,
  cnh: null as File | null,
  contracheques: [] as File[],
});

  const obterToken = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error("Sua sessão expirou. Entre novamente no sistema.");
    }

    return data.session.access_token;
  }, [supabase]);

  const carregarTabelasConfiguradas = useCallback(async () => {
    try {
      const token = await obterToken();

      const resposta = await fetch("/api/configuracoes", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const conteudo = (await resposta.json()) as {
        bancos?: Array<Record<string, unknown>>;
        orgaosConvenios?: Array<Record<string, unknown>>;
        tabelas?: Array<Record<string, unknown>>;
        statusPropostas?: Array<Record<string, unknown>>;
        erro?: string;
      };

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro || "Não foi possível carregar as tabelas configuradas."
        );
      }

      const listaBancos = Array.isArray(conteudo.bancos)
        ? conteudo.bancos.map((item) => ({
            id: String(item.id || ""),
            nome: String(item.nome || "").trim().toUpperCase(),
            ativo: item.ativo !== false,
          }))
        : [];

      const listaOrgaos = Array.isArray(conteudo.orgaosConvenios)
        ? conteudo.orgaosConvenios.map((item) => ({
            id: String(item.id || ""),
            nome: String(item.nome || "").trim().toUpperCase(),
            ativo: item.ativo !== false,
          }))
        : [];

      const lista = Array.isArray(conteudo.tabelas)
        ? conteudo.tabelas.map((item) => ({
            id: String(item.id || ""),
            banco: String(item.banco || "").trim().toUpperCase(),
            orgaoConvenio: String(item.orgao_convenio || "").trim().toUpperCase(),
            nome: String(item.nome || "").trim(),
            codigo: String(item.codigo || "").trim(),
            percentual: Number(item.percentual || 0),
            percentualComissaoBanco:
              item.percentual_comissao_banco === null ||
              item.percentual_comissao_banco === undefined ||
              String(item.percentual_comissao_banco).trim() === ""
                ? null
                : Number(item.percentual_comissao_banco),
            ativo: item.ativo !== false,
          }))
        : [];

      const listaStatus = Array.isArray(conteudo.statusPropostas)
        ? conteudo.statusPropostas.map((item) => ({
            id: String(item.id || ""),
            nome: String(item.nome || "").trim().toUpperCase(),
            tipo: String(item.tipo || "EM_ANDAMENTO") as StatusConfigurado["tipo"],
            prazoDias: item.prazo_dias == null ? null : Number(item.prazo_dias),
            ordem: Number(item.ordem || 0),
            ativo: item.ativo !== false,
          }))
        : [];
      setBancosConfigurados(listaBancos);
      setOrgaosConvenios(listaOrgaos);
      setTabelasConfiguradas(lista);
      setStatusConfigurados(listaStatus);
    } catch (erro) {
      console.error(erro);
      setBancosConfigurados([]);
      setOrgaosConvenios([]);
      setTabelasConfiguradas([]);
      setStatusConfigurados([]);
    }
  }, [obterToken]);

  const carregarPropostas = useCallback(async () => {
    setCarregando(true);
    setMensagem("");

    try {
      const token = await obterToken();

      const resposta = await fetch("/api/propostas", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const conteudo = (await resposta.json()) as RespostaApi;

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro || "Não foi possível carregar as propostas."
        );
      }

      const perfilDaApi = String(conteudo.perfil?.perfil || "").trim();
      const nomeDaApi = String(conteudo.perfil?.nome || "").trim();

      if (nomeDaApi) {
        setNomeUsuarioAtual(nomeDaApi);
      }

      if (perfilDaApi) {
        setPerfilAtual(perfilDaApi);
      } else {
        const { data: sessaoAtual } = await supabase.auth.getSession();
        const perfilMetadata = String(
          sessaoAtual.session?.user?.user_metadata?.perfil ||
          sessaoAtual.session?.user?.user_metadata?.cargo ||
          ""
        ).trim();

        const perfilLocal =
          typeof window !== "undefined"
            ? String(
                localStorage.getItem("somos-eleva-cargo") ||
                localStorage.getItem("somos-eleva-perfil") ||
                ""
              ).trim()
            : "";

        setPerfilAtual(perfilMetadata || perfilLocal);
      }

      setPropostas(
        Array.isArray(conteudo.propostas) ? conteudo.propostas : []
      );
    } catch (erro) {
      console.error(erro);
      setPropostas([]);
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar as propostas."
      );
    } finally {
      setCarregando(false);
    }
  }, [obterToken]);

  const carregarClientes = useCallback(async () => {
    try {
      const token = await obterToken();

      const resposta = await fetch("/api/clientes", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const conteudo = (await resposta.json()) as {
        clientes?: Array<Record<string, unknown>>;
        erro?: string;
      };

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro || "Não foi possível carregar os clientes.",
        );
      }

      const lista = Array.isArray(conteudo.clientes)
        ? conteudo.clientes.map((cliente) => ({
            id: String(cliente.id || ""),
            nome: String(cliente.nome || ""),
            cpf: apenasNumeros(String(cliente.cpf || "")),
            rg: String(cliente.rg || ""),
            telefone: String(cliente.telefone || ""),
            telefone2: String(cliente.telefone2 || ""),
            email: String(cliente.email || ""),
            nomeMae: String(cliente.nomeMae || ""),
            nomePai: String(cliente.nomePai || ""),
            dataNascimento: String(
              cliente.nascimento || cliente.dataNascimento || "",
            ),
            cep: String(cliente.cep || ""),
            endereco: String(
              cliente.logradouro || cliente.endereco || "",
            ),
            numero: String(
              cliente.numeroEndereco || cliente.numero || "",
            ),
            complemento: String(cliente.complemento || ""),
            bairro: String(cliente.bairro || ""),
            cidade: String(cliente.cidade || ""),
            uf: String(cliente.estado || cliente.uf || ""),
          }))
        : [];

      setClientes(lista);
    } catch (erro) {
      console.error("Erro ao carregar clientes pela API:", erro);
      setClientes([]);
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar os clientes.",
      );
    }
  }, [obterToken]);

  const carregarConsultoras = useCallback(async () => {
    try {
      const token = await obterToken();

      const resposta = await fetch("/api/consultoras", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const conteudo = (await resposta.json()) as {
        consultoras?: Array<{ nome?: string }>;
      };

      const nomes = (conteudo.consultoras ?? [])
        .map((item) => String(item.nome || "").trim())
        .filter(Boolean);

      setConsultoras(
        Array.from(new Set(nomes)).sort((a, b) =>
          a.localeCompare(b, "pt-BR")
        )
      );
    } catch (erro) {
      console.error("Erro ao carregar consultoras:", erro);
      setConsultoras([]);
    }
  }, [obterToken]);

  useEffect(() => {
    void carregarTabelasConfiguradas();
  }, [carregarTabelasConfiguradas]);

  useEffect(() => {
    void carregarPropostas();
    void carregarClientes();
    void carregarConsultoras();
  }, [carregarPropostas, carregarClientes, carregarConsultoras]);

  const statusAtivos = useMemo(() => {
    const configurados = statusConfigurados.filter((item) => item.ativo && item.nome)
      .sort((a,b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome,"pt-BR"));
    return configurados.length ? configurados : STATUS_PADRAO.map((nome,indice) => ({
      id:`padrao-${indice}`, nome,
      tipo: nome==="PAGO" ? ("PAGO" as const) : nome==="CANCELADA" ? ("CANCELADO" as const) : ("EM_ANDAMENTO" as const),
      prazoDias:null, ordem:(indice+1)*10, ativo:true
    }));
  }, [statusConfigurados]);

  const nomesStatusAtivos = useMemo(() => statusAtivos.map(item => item.nome), [statusAtivos]);

  function tipoDoStatus(nome: string) {
    return statusAtivos.find(item => item.nome === nome)?.tipo ||
      (nome === "PAGO" ? "PAGO" : nome === "CANCELADA" ? "CANCELADO" : "EM_ANDAMENTO");
  }

  const propostasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return propostas.filter((proposta) => {
      const correspondeBusca =
        !termo ||
        [
          proposta.numeroProposta,
          proposta.cliente,
          proposta.cpf,
          proposta.vendedora,
          proposta.banco,
          proposta.tabela,
          proposta.status,
          proposta.protocolo,
        ]
          .join(" ")
          .toLowerCase()
          .includes(termo);

      const correspondeStatus =
        filtroStatus === "Todos" || proposta.status === filtroStatus;
        const correspondeConsultora =
  filtroConsultora === "Todas" ||
  proposta.vendedora === filtroConsultora;

      const dataProposta = String(proposta.dataCadastro || "").slice(0, 10);

      const correspondeDataInicial =
        !dataInicial || dataProposta >= dataInicial;

      const correspondeDataFinal =
        !dataFinal || dataProposta <= dataFinal;

      return (
  correspondeBusca &&
  correspondeStatus &&
  correspondeConsultora &&
  correspondeDataInicial &&
  correspondeDataFinal
);
    });
  }, [
  propostas,
  busca,
  filtroStatus,
  filtroConsultora,
  dataInicial,
  dataFinal,
]);

  const resumo = useMemo(() => {
  const ativas = propostasFiltradas.filter(
    (item) => item.status !== "CANCELADA"
  );

  const limitePagamento = calcularLimitePagamento(dataFinal);

  const pagasDentroDoPrazo = ativas.filter((item) => {
    if (item.status !== "PAGO") return false;
    if (!item.dataPagamento) return false;

    const dataPagamento = String(item.dataPagamento).slice(0, 10);

    return (
      !limitePagamento ||
      dataPagamento <= limitePagamento
    );
  });

  const producaoDigitada = ativas.reduce(
    (total, item) =>
      total + Number(item.valorMeta || 0),
    0
  );

  const producaoPaga = pagasDentroDoPrazo.reduce(
    (total, item) =>
      total + Number(item.valorMeta || 0),
    0
  );

  const valorPago = pagasDentroDoPrazo.reduce(
    (total, item) =>
      total + Number(item.valorContrato || 0),
    0
  );

  const comissaoEmpresa = pagasDentroDoPrazo.reduce(
    (total, item) => {
      const calculo = calcularComissaoDaProposta(
        item,
        tabelasConfiguradas,
      );

      return total + calculo.valor;
    },
    0
  );

  return {
    total: ativas.length,

    andamento: ativas.filter(
      (item) => item.status !== "PAGO"
    ).length,

    pagas: pagasDentroDoPrazo.length,

    aguardando: ativas.filter(
      (item) => item.status === "AG. BOLETO"
    ).length,

    valorPago,
    producaoDigitada,
    producaoPaga,
    comissaoEmpresa,
  };
}, [propostasFiltradas, dataFinal, tabelasConfiguradas]);

  const clienteSelecionado = useMemo(
    () => clientes.find((cliente) => cliente.id === form.clienteId),
    [clientes, form.clienteId]
  );

  const bancosDisponiveis = useMemo(() => {
    const bancosAtivos = bancosConfigurados
      .filter((banco) => banco.ativo && banco.nome)
      .map((banco) => banco.nome);

    if (bancosAtivos.length) {
      return Array.from(new Set(bancosAtivos)).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      );
    }

    // Fallback para instalações antigas onde a API ainda não devolve bancos.
    return Array.from(
      new Set(
        tabelasConfiguradas
          .filter((tabela) => tabela.ativo && tabela.banco)
          .map((tabela) => tabela.banco),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [bancosConfigurados, tabelasConfiguradas]);

  const orgaosDisponiveis = useMemo(
    () =>
      orgaosConvenios
        .filter(
          (item) =>
            item.ativo &&
            tabelasConfiguradas.some(
              (tabela) =>
                tabela.ativo &&
                tabela.banco === String(form.banco || "").trim().toUpperCase() &&
                tabela.orgaoConvenio === item.nome,
            ),
        )
        .map((item) => item.nome)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [orgaosConvenios, tabelasConfiguradas, form.banco],
  );

  const tabelasFiltradas = useMemo(() => {
    if (!orgaoConvenio) return [];

    return tabelasConfiguradas
      .filter((tabela) => {
        if (!tabela.ativo) return false;
        if (tabela.banco !== String(form.banco || "").trim().toUpperCase()) {
          return false;
        }

        if (orgaoConvenio === "__SEM_ORGAO__") {
          return !tabela.orgaoConvenio;
        }

        return tabela.orgaoConvenio === orgaoConvenio;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [tabelasConfiguradas, form.banco, orgaoConvenio]);

  const tabelaSelecionada = useMemo(() => {
    const configurada = tabelasConfiguradas.find(
      (tabela) =>
        tabela.ativo &&
        tabela.banco === String(form.banco || "").trim().toUpperCase() &&
        tabela.nome === form.tabela
    );

    if (configurada) return configurada;

    // Mantém propostas antigas/históricas exatamente como foram gravadas.
    if (editando && form.tabela === editando.tabela) {
      return {
        id: `historica-${editando.id}`,
        banco: editando.banco,
        orgaoConvenio: "",
        nome: editando.tabela,
        codigo: "",
        percentual: Number(editando.percentualTabela || 0),
        percentualComissaoBanco: null,
        ativo: true,
      } satisfies TabelaConfigurada;
    }

    return undefined;
  }, [form.banco, form.tabela, tabelasConfiguradas, editando]);

  const valorContrato = converterValor(form.valorContrato);

  const valorMeta =
    valorContrato * ((tabelaSelecionada?.percentual || 0) / 100);

  const podeAlterarDataPagamento = ["administradora", "operacional"].includes(
    normalizarPerfil(perfilAtual)
  );

  const podeCancelarProposta = ["administradora", "operacional"].includes(
    normalizarPerfil(perfilAtual)
  );

  const perfilNormalizado = normalizarPerfil(perfilAtual);

  useEffect(() => {
    let ativo = true;

    async function carregarPermissoesPerfil() {
      if (!perfilAtual) return;

      try {
        const { data, error } = await supabase
          .from("config_permissoes")
          .select("permissoes")
          .eq("perfil_chave", perfilAtual)
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!ativo) return;

        setPermissoesPerfil(
          data?.permissoes && typeof data.permissoes === "object"
            ? (data.permissoes as Record<string, boolean>)
            : null,
        );
      } catch (erro) {
        console.error("Não foi possível carregar permissões do perfil:", erro);
        if (ativo) setPermissoesPerfil(null);
      }
    }

    void carregarPermissoesPerfil();

    return () => {
      ativo = false;
    };
  }, [perfilAtual, supabase]);

  const ehAdminPadrao = [
    "administradora",
    "administrador",
    "admin",
  ].includes(perfilNormalizado);

  const podeVerComissaoBanco =
    permissoesPerfil?.ver_comissao_banco ?? ehAdminPadrao;

  const podeVerComissaoEmpresa =
    permissoesPerfil?.ver_comissao_empresa ?? ehAdminPadrao;

  const podeEditarTodasPropostas = [
    "administradora",
    "administrador",
    "admin",
    "supervisora",
    "supervisor",
    "supervisora de vendas",
    "operacional",
  ].includes(perfilNormalizado);

  function podeEditarProposta(proposta: Proposta) {
    if (podeEditarTodasPropostas) return true;

    const perfilEhConsultora = [
      "consultora",
      "consultora de vendas",
      "vendedora",
    ].includes(perfilNormalizado);

    if (!perfilEhConsultora) return false;

    return (
      normalizarPerfil(proposta.vendedora || "") ===
      normalizarPerfil(nomeUsuarioAtual || "")
    );
  }

async function buscarClientePorCpf() {
  const cpfNumeros = apenasNumeros(buscaCliente);

  if (cpfNumeros.length !== 11) {
    setMensagem("Digite um CPF completo.");
    return;
  }

  setMensagem("");

  const clienteEncontrado = clientes.find(
    (cliente) => apenasNumeros(cliente.cpf) === cpfNumeros,
  );

  if (!clienteEncontrado) {
    // Atualiza novamente antes de concluir que não existe.
    await carregarClientes();

    const token = await obterToken();
    const resposta = await fetch("/api/clientes", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const conteudo = (await resposta.json()) as {
      clientes?: Array<Record<string, unknown>>;
      erro?: string;
    };

    if (!resposta.ok) {
      setMensagem(
        conteudo.erro || "Não foi possível consultar os clientes.",
      );
      return;
    }

    const encontradoNaApi = (conteudo.clientes || []).find(
      (cliente) =>
        apenasNumeros(String(cliente.cpf || "")) === cpfNumeros,
    );

    if (!encontradoNaApi) {
      setForm((atual) => ({
        ...atual,
        clienteId: "",
        cpfCliente: cpfNumeros,
        nomeCliente: "",
        rgCliente: "",
        telefoneCliente: "",
        telefone2Cliente: "",
        emailCliente: "",
        nomeMaeCliente: "",
        nomePaiCliente: "",
        dataNascimentoCliente: "",
        cepCliente: "",
        enderecoCliente: "",
        numeroCliente: "",
        complementoCliente: "",
        bairroCliente: "",
        cidadeCliente: "",
        ufCliente: "",
      }));

      setClienteNovo(true);
      setMensagem(
        "Cliente não encontrado. Cadastre o cliente aqui mesmo e continue a proposta.",
      );
      return;
    }

    const clienteApi: Cliente = {
      id: String(encontradoNaApi.id || ""),
      nome: String(encontradoNaApi.nome || ""),
      cpf: apenasNumeros(String(encontradoNaApi.cpf || "")),
      rg: String(encontradoNaApi.rg || ""),
      telefone: String(encontradoNaApi.telefone || ""),
      telefone2: String(encontradoNaApi.telefone2 || ""),
      email: String(encontradoNaApi.email || ""),
      nomeMae: String(encontradoNaApi.nomeMae || ""),
      nomePai: String(encontradoNaApi.nomePai || ""),
      dataNascimento: String(
        encontradoNaApi.nascimento ||
          encontradoNaApi.dataNascimento ||
          "",
      ),
      cep: String(encontradoNaApi.cep || ""),
      endereco: String(
        encontradoNaApi.logradouro ||
          encontradoNaApi.endereco ||
          "",
      ),
      numero: String(
        encontradoNaApi.numeroEndereco ||
          encontradoNaApi.numero ||
          "",
      ),
      complemento: String(encontradoNaApi.complemento || ""),
      bairro: String(encontradoNaApi.bairro || ""),
      cidade: String(encontradoNaApi.cidade || ""),
      uf: String(encontradoNaApi.estado || encontradoNaApi.uf || ""),
    };

    setClientes((atuais) => {
      const semDuplicar = atuais.filter(
        (item) => item.id !== clienteApi.id,
      );
      return [...semDuplicar, clienteApi];
    });

    preencherClienteNoFormulario(clienteApi);
    return;
  }

  preencherClienteNoFormulario(clienteEncontrado);
}

function preencherClienteNoFormulario(cliente: Cliente) {
  setClienteNovo(false);
  setForm((atual) => ({
    ...atual,
    clienteId: cliente.id,
    nomeCliente: cliente.nome,
    cpfCliente: apenasNumeros(cliente.cpf),
    rgCliente: cliente.rg,
    telefoneCliente: cliente.telefone,
    telefone2Cliente: cliente.telefone2,
    emailCliente: cliente.email,
    nomeMaeCliente: cliente.nomeMae,
    nomePaiCliente: cliente.nomePai,
    dataNascimentoCliente: cliente.dataNascimento,
    cepCliente: cliente.cep,
    enderecoCliente: cliente.endereco,
    numeroCliente: cliente.numero,
    complementoCliente: cliente.complemento,
    bairroCliente: cliente.bairro,
    cidadeCliente: cliente.cidade,
    ufCliente: cliente.uf,
  }));

  setMensagem("Cliente encontrado. Os dados foram preenchidos.");
}

  function abrirNovaProposta() {
  setEditando(null);
  setEtapaModal(1);
  setClienteNovo(false);
  setOrgaoConvenio("");
  setForm({
    ...FORMULARIO_VAZIO,
    status: nomesStatusAtivos[0] || "AG. BOLETO",
    dataSolicitacao: hojeIso(),
    dataDigitacao: hojeIso(),
  });

  setArquivos({
    rgFrente: null,
    rgVerso: null,
    cnh: null,
    contracheques: [],
  });

  setBuscaCliente("");
  setMensagem("");
  setModalAberto(true);
}

  function abrirEdicaoProposta(proposta: Proposta) {
    if (!podeEditarProposta(proposta)) {
      setMensagem("Você só pode editar as propostas cadastradas por você.");
      return;
    }

    setEtapaModal(3);
    setClienteNovo(false);
    const cliente = clientes.find((item) => item.id === proposta.clienteId);

    const tabelaAtual = tabelasConfiguradas.find(
      (tabela) =>
        tabela.banco === String(proposta.banco || "").trim().toUpperCase() &&
        tabela.nome === proposta.tabela
    );

    setOrgaoConvenio(
      tabelaAtual
        ? tabelaAtual.orgaoConvenio || "__SEM_ORGAO__"
        : "__HISTORICA__"
    );

    setEditando(proposta);
    setForm({
      clienteId: proposta.clienteId || cliente?.id || "",
      numeroProposta: proposta.numeroProposta || "",
      nomeCliente: cliente?.nome || proposta.cliente || "",
      cpfCliente: cliente?.cpf || proposta.cpf || "",
      rgCliente: cliente?.rg || "",
      telefoneCliente: cliente?.telefone || proposta.telefone || "",
      telefone2Cliente: cliente?.telefone2 || "",
      emailCliente: cliente?.email || "",
      nomeMaeCliente: cliente?.nomeMae || "",
      nomePaiCliente: cliente?.nomePai || "",
      dataNascimentoCliente: cliente?.dataNascimento || "",
      cepCliente: cliente?.cep || "",
      enderecoCliente: cliente?.endereco || "",
      numeroCliente: cliente?.numero || "",
      complementoCliente: cliente?.complemento || "",
      bairroCliente: cliente?.bairro || "",
      cidadeCliente: cliente?.cidade || "",
      ufCliente: cliente?.uf || "",
      vendedora: proposta.vendedora || "",
      banco: proposta.banco || "",
      tabela: proposta.tabela || "",
      valorContrato: Number(proposta.valorContrato || 0)
        .toFixed(2)
        .replace(".", ","),
      status: proposta.status || "AG. BOLETO",
      dataSolicitacao: proposta.dataSolicitacao || proposta.dataCadastro || hojeIso(),
      dataDigitacao: proposta.dataCadastro || hojeIso(),
      dataPagamento: proposta.dataPagamento || "",
      observacao: proposta.observacao || "",
      senhaContracheque: proposta.senhaContracheque || "",
      senhaConsignacao: proposta.senhaConsignacao || "",
    });

    setBuscaCliente(formatarCpf(cliente?.cpf || proposta.cpf || ""));
    setMensagem("");
    setModalAberto(true);
  }

  async function salvarProposta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    // Bloqueio síncrono: evita dois POSTs mesmo em clique duplo muito rápido.
    if (salvandoRef.current) return;

    if (!form.cpfCliente.trim()) {
      setMensagem("Informe o CPF do cliente.");
      setEtapaModal(1);
      return;
    }

    if (!form.nomeCliente.trim()) {
      setMensagem("Informe o nome do cliente.");
      setEtapaModal(1);
      return;
    }

    if (!form.telefoneCliente.trim()) {
      setMensagem("Informe o telefone do cliente.");
      setEtapaModal(1);
      return;
    }

    if (!form.rgCliente.trim()) {
      setMensagem("Informe o RG do cliente.");
      setEtapaModal(1);
      return;
    }

    if (!form.dataNascimentoCliente) {
      setMensagem("Informe a data de nascimento do cliente.");
      setEtapaModal(1);
      return;
    }

    if (!form.nomeMaeCliente.trim()) {
      setMensagem("Informe o nome da mãe do cliente.");
      setEtapaModal(1);
      return;
    }

    if (!form.emailCliente.trim()) {
      setMensagem("Informe o e-mail do cliente.");
      setEtapaModal(1);
      return;
    }

    if (!form.vendedora) {
      setMensagem("Selecione a consultora.");
      setEtapaModal(3);
      return;
    }

    if (!form.banco.trim()) {
      setMensagem("Informe o banco.");
      setEtapaModal(3);
      return;
    }

    if (!orgaoConvenio) {
      setMensagem("Selecione o órgão / convênio.");
      setEtapaModal(3);
      return;
    }

    if (!tabelaSelecionada) {
      setMensagem("Selecione a tabela.");
      setEtapaModal(3);
      return;
    }

    if (valorContrato <= 0) {
      setMensagem("Informe o valor do contrato.");
      setEtapaModal(3);
      return;
    }

    if (!form.senhaConsignacao.trim()) {
      setMensagem("A senha da consignação é obrigatória.");
      setEtapaModal(3);
      return;
    }

    if (editando && !podeEditarProposta(editando)) {
      setMensagem("Você só pode editar as propostas cadastradas por você.");
      return;
    }

    salvandoRef.current = true;
    setSalvando(true);
    setMensagem("");

    const propostaId = editando?.id || crypto.randomUUID();
    const caminhosEnviados: string[] = [];
    let propostaCriadaNestaTentativa = false;
    let clienteCriadoNestaTentativa = "";

    try {
      const token = await obterToken();

      /*
       * NOVA PROPOSTA:
       * primeiro enviamos os arquivos. A proposta só é criada no banco
       * depois que os uploads terminarem. Assim, erro de RG/CNH/contracheque
       * não deixa proposta incompleta aparecendo na Gestão de Propostas.
       */
      const documentosParaRegistrar: Array<{
        tipo: string;
        nome_arquivo: string;
        caminho: string;
      }> = [];

      if (!editando) {
        const documentosUnicos = [
          { tipo: "rg-frente", arquivo: arquivos.rgFrente },
          { tipo: "rg-verso", arquivo: arquivos.rgVerso },
          { tipo: "cnh", arquivo: arquivos.cnh },
        ];

        for (const documento of documentosUnicos) {
          if (!documento.arquivo) continue;

          const extensao =
            documento.arquivo.name.split(".").pop() || "jpg";
          const caminho =
            `${propostaId}/${documento.tipo}-${crypto.randomUUID()}.${extensao}`;

          const { error: erroUpload } = await supabase.storage
            .from("propostas")
            .upload(caminho, documento.arquivo, {
              upsert: false,
            });

          if (erroUpload) {
            throw new Error(
              `Erro ao enviar ${documento.tipo}: ${erroUpload.message}`,
            );
          }

          caminhosEnviados.push(caminho);
          documentosParaRegistrar.push({
            tipo: documento.tipo,
            nome_arquivo: documento.arquivo.name,
            caminho,
          });
        }

        for (
          let indice = 0;
          indice < arquivos.contracheques.length;
          indice += 1
        ) {
          const arquivo = arquivos.contracheques[indice];
          const extensao = arquivo.name.split(".").pop() || "jpg";
          const caminho =
            `${propostaId}/contracheque-${indice + 1}-${crypto.randomUUID()}.${extensao}`;

          const { error: erroUpload } = await supabase.storage
            .from("propostas")
            .upload(caminho, arquivo, {
              upsert: false,
            });

          if (erroUpload) {
            throw new Error(
              `Erro ao enviar contracheque ${indice + 1}: ${erroUpload.message}`,
            );
          }

          caminhosEnviados.push(caminho);
          documentosParaRegistrar.push({
            tipo: "contracheque",
            nome_arquivo: arquivo.name,
            caminho,
          });
        }
      }

      const dadosCliente = {
        nome: form.nomeCliente.trim(),
        cpf: apenasNumeros(form.cpfCliente),
        rg: form.rgCliente.trim(),
        telefone: form.telefoneCliente.trim(),
        telefone2: form.telefone2Cliente.trim(),
        email: form.emailCliente.trim(),
        nome_mae: form.nomeMaeCliente.trim(),
        nome_pai: form.nomePaiCliente.trim(),
        data_nascimento: form.dataNascimentoCliente || null,
        cep: form.cepCliente.trim(),
        endereco: form.enderecoCliente.trim(),
        numero: form.numeroCliente.trim(),
        complemento: form.complementoCliente.trim(),
        bairro: form.bairroCliente.trim(),
        cidade: form.cidadeCliente.trim(),
        uf: form.ufCliente.trim(),
      };

      let clienteId = form.clienteId;

      if (clienteId) {
        const { error: erroAtualizarCliente } = await supabase
          .from("clientes")
          .update(dadosCliente)
          .eq("id", clienteId);

        if (erroAtualizarCliente) {
          throw new Error(
            `Não foi possível atualizar o cliente: ${erroAtualizarCliente.message}`,
          );
        }
      } else {
        const { data: clienteCriado, error: erroCriarCliente } = await supabase
          .from("clientes")
          .insert(dadosCliente)
          .select("id")
          .single();

        if (erroCriarCliente || !clienteCriado?.id) {
          throw new Error(
            `Não foi possível cadastrar o cliente: ${
              erroCriarCliente?.message || "cliente sem identificação"
            }`,
          );
        }

        clienteId = String(clienteCriado.id);
        clienteCriadoNestaTentativa = clienteId;
      }

      const proposta: Proposta = {
        id: propostaId,
        numeroProposta: form.numeroProposta.trim(),
        clienteId,
        cliente: form.nomeCliente.trim(),
        cpf: apenasNumeros(form.cpfCliente),
        telefone: form.telefoneCliente.trim(),
        vendedora: form.vendedora,
        banco: form.banco.trim(),
        tabelaBancoId:
          tabelaSelecionada.id.startsWith("historica-")
            ? editando?.tabelaBancoId || ""
            : tabelaSelecionada.id,
        tabela: tabelaSelecionada.nome,
        percentualTabela: tabelaSelecionada.percentual,
        valorContrato,
        valorMeta,
        status: form.status,
        dataSolicitacao: form.dataSolicitacao,
        dataCadastro: form.dataDigitacao,
        dataPagamento:
          tipoDoStatus(form.status) === "PAGO"
            ? form.dataPagamento || hojeIso()
            : "",
        observacao: form.observacao.trim(),
        senhaContracheque: form.senhaContracheque.trim(),
        senhaConsignacao: form.senhaConsignacao.trim(),
      };

      const resposta = await fetch("/api/propostas", {
        method: editando ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ proposta }),
      });

      const conteudo = (await resposta.json()) as RespostaApi;

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro ||
            (editando
              ? "Não foi possível atualizar a proposta."
              : "Não foi possível salvar a proposta."),
        );
      }

      propostaCriadaNestaTentativa = !editando;

      // Só registra os documentos depois que a proposta foi criada com sucesso.
      if (!editando && documentosParaRegistrar.length) {
        const { error: erroDocumentos } = await supabase
          .from("proposta_documentos")
          .insert(
            documentosParaRegistrar.map((documento) => ({
              proposta_id: propostaId,
              ...documento,
            })),
          );

        if (erroDocumentos) {
          // Tenta desfazer a proposta recém-criada para ela não ficar
          // aparecendo como cadastro concluído quando o processo falhou.
          try {
            await fetch("/api/propostas", {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: propostaId,
                rollback: true,
              }),
            });
          } catch (erroRollback) {
            console.error("Falha ao desfazer proposta incompleta:", erroRollback);
          }

          if (clienteCriadoNestaTentativa) {
            try {
              await supabase
                .from("clientes")
                .delete()
                .eq("id", clienteCriadoNestaTentativa);
              clienteCriadoNestaTentativa = "";
            } catch (erroClienteRollback) {
              console.error(
                "Falha ao desfazer cliente de proposta incompleta:",
                erroClienteRollback,
              );
            }
          }

          throw new Error(
            `Erro ao registrar documentos: ${erroDocumentos.message}`,
          );
        }
      }

      await carregarPropostas();

      setModalAberto(false);
      setEditando(null);
      setOrgaoConvenio("");
      setForm(FORMULARIO_VAZIO);
      setArquivos({
        rgFrente: null,
        rgVerso: null,
        cnh: null,
        contracheques: [],
      });
      setEtapaModal(1);
      setClienteNovo(false);
      setMensagem(
        editando
          ? "Proposta atualizada com sucesso."
          : "Proposta finalizada e cadastrada com sucesso.",
      );
    } catch (erro) {
      /*
       * Se a proposta ainda NÃO foi criada, qualquer arquivo enviado nesta
       * tentativa é removido. Portanto nada incompleto fica para trás.
       */
      if (!propostaCriadaNestaTentativa && caminhosEnviados.length) {
        try {
          await supabase.storage
            .from("propostas")
            .remove(caminhosEnviados);
        } catch (erroLimpeza) {
          console.error("Não foi possível limpar uploads incompletos:", erroLimpeza);
        }
      }

      // Se o cliente foi criado durante esta tentativa, mas a proposta não
      // chegou ao estado finalizado, desfaz o cliente novo também.
      if (!propostaCriadaNestaTentativa && clienteCriadoNestaTentativa) {
        try {
          await supabase
            .from("clientes")
            .delete()
            .eq("id", clienteCriadoNestaTentativa);
        } catch (erroClienteRollback) {
          console.error(
            "Não foi possível limpar cliente de proposta incompleta:",
            erroClienteRollback,
          );
        }
      }

      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível finalizar a proposta.",
      );
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  }

  async function excluirProposta(proposta: Proposta) {

    const confirmar = window.confirm(
      `Deseja excluir definitivamente a proposta de ${proposta.cliente}?\n\nEssa ação não poderá ser desfeita.`,
    );

    if (!confirmar) return;

    setSalvando(true);
    setMensagem("");

    try {
      const token = await obterToken();

      const resposta = await fetch("/api/propostas", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: proposta.id }),
      });

      const conteudo = (await resposta.json()) as RespostaApi;

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro || "Não foi possível excluir a proposta.",
        );
      }

      await carregarPropostas();

      if (editando?.id === proposta.id) {
        setModalAberto(false);
        setEditando(null);
        setForm(FORMULARIO_VAZIO);
      }

      setMensagem("Proposta excluída com sucesso.");
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir a proposta.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarCancelamento() {
    if (!editando) return;

    if (!motivoCancelamento.trim()) {
      setMensagem("Informe o motivo do cancelamento.");
      return;
    }

    setCancelando(true);
    setMensagem("");

    try {
      const token = await obterToken();

      const propostaCancelada: Proposta = {
        ...editando,
        numeroProposta: form.numeroProposta.trim(),
        clienteId: form.clienteId,
        cliente: form.nomeCliente.trim(),
        cpf: apenasNumeros(form.cpfCliente),
        telefone: form.telefoneCliente.trim(),
        vendedora: form.vendedora,
        banco: form.banco.trim(),
        tabelaBancoId:
          tabelaSelecionada && !tabelaSelecionada.id.startsWith("historica-")
            ? tabelaSelecionada.id
            : editando.tabelaBancoId || "",
        tabela: form.tabela,
        percentualTabela: tabelaSelecionada?.percentual || 0,
        valorContrato,
        valorMeta,
        status: "CANCELADA",
        dataSolicitacao: form.dataSolicitacao,
        dataCadastro: form.dataDigitacao,
        dataPagamento: "",
        observacao: form.observacao.trim(),
        senhaContracheque: form.senhaContracheque.trim(),
        senhaConsignacao: form.senhaConsignacao.trim(),
        motivoCancelamento: motivoCancelamento.trim(),
        dataCancelamento: new Date().toISOString(),
      };

      const resposta = await fetch("/api/propostas", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ proposta: propostaCancelada }),
      });

      const conteudo = (await resposta.json()) as RespostaApi;

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro || "Não foi possível cancelar a proposta."
        );
      }

      await carregarPropostas();
      setModalCancelamentoAberto(false);
      setModalAberto(false);
      setEditando(null);
      setMotivoCancelamento("");
      setForm(FORMULARIO_VAZIO);
      setMensagem("Proposta cancelada com sucesso.");
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível cancelar a proposta."
      );
    } finally {
      setCancelando(false);
    }
  }

  async function buscarEnderecoPorCep(cepInformado: string) {
    const cep = apenasNumeros(cepInformado).slice(0, 8);

    if (cep.length !== 8) {
      setMensagemCep("");
      return;
    }

    setBuscandoCep(true);
    setMensagemCep("Buscando endereço...");

    try {
      const resposta = await fetch(`/api/cep?cep=${cep}`, {
        method: "GET",
        cache: "no-store",
      });

      const dados = (await resposta.json()) as {
        erro?: string;
        cep?: string;
        endereco?: string;
        complemento?: string;
        bairro?: string;
        cidade?: string;
        uf?: string;
      };

      if (!resposta.ok) {
        setMensagemCep(
          dados.erro || "CEP não encontrado. Preencha o endereço manualmente.",
        );
        return;
      }

      setForm((atual) => ({
        ...atual,
        cepCliente: String(dados.cep || cep).replace(/\D/g, "").replace(
          /^(\d{5})(\d{3})$/,
          "$1-$2",
        ),
        enderecoCliente: String(dados.endereco || ""),
        bairroCliente: String(dados.bairro || ""),
        cidadeCliente: String(dados.cidade || ""),
        ufCliente: String(dados.uf || "").toUpperCase().slice(0, 2),
        complementoCliente:
          atual.complementoCliente || String(dados.complemento || ""),
      }));

      setMensagemCep("✓ Endereço encontrado.");
    } catch (erro) {
      console.error("Erro ao buscar CEP:", erro);
      setMensagemCep(
        "Não foi possível consultar o CEP agora. Preencha o endereço manualmente.",
      );
    } finally {
      setBuscandoCep(false);
    }
  }

  function avancarEtapaModal() {
    setMensagem("");
    if (etapaModal === 1) {
      if (!form.nomeCliente.trim()) { setMensagem("Informe o nome completo do cliente."); return; }
      if (apenasNumeros(form.cpfCliente).length !== 11) { setMensagem("Informe um CPF válido para continuar."); return; }
      if (!form.rgCliente.trim()) { setMensagem("Informe o RG do cliente."); return; }
      if (!form.dataNascimentoCliente) { setMensagem("Informe a data de nascimento do cliente."); return; }
      if (!form.nomeMaeCliente.trim()) { setMensagem("Informe o nome da mãe do cliente."); return; }
      if (!form.telefoneCliente.trim()) { setMensagem("Informe o telefone principal do cliente."); return; }
      if (!form.emailCliente.trim()) { setMensagem("Informe o e-mail do cliente."); return; }
    }
    if (etapaModal === 3) {
      if (!form.vendedora) { setMensagem("Selecione a consultora."); return; }
      if (!form.banco.trim()) { setMensagem("Selecione o banco."); return; }
      if (!orgaoConvenio) { setMensagem("Selecione o órgão / convênio."); return; }
      if (!tabelaSelecionada) { setMensagem("Selecione a tabela."); return; }
      if (valorContrato <= 0) { setMensagem("Informe o valor do contrato."); return; }
      if (!form.senhaConsignacao.trim()) { setMensagem("Informe a senha da consignação para continuar."); return; }
    }
    setEtapaModal((atual) => Math.min(5, atual + 1));
  }
  function voltarEtapaModal() {
    setMensagem("");
    setEtapaModal((atual) => Math.max(1, atual - 1));
  }

  return (
    <div className="esteira-profissional">
      <section className="esteira-stats">
        <article>
          <span>TOTAL DE PROPOSTAS</span>
          <strong>{resumo.total}</strong>
        </article>

        <article>
          <span>EM ANDAMENTO </span>
          <strong>{resumo.andamento}</strong>
        </article>

        <article>
          <span>CONTRATOS PAGOS </span>
          <strong>{resumo.pagas}</strong>
        </article>

        <article>
          <span> AGUARDANDO BOLETO </span>
          <strong>{resumo.aguardando}</strong>
        </article>

        <article>
          <span> VALOR BRUTO PAGO </span>
          <strong>{moeda(resumo.valorPago)}</strong>
        </article>
<article>
  <span>PRODUÇÃO LIQUIDA PAGO </span>
  <strong>{moeda(resumo.producaoPaga)}</strong>
</article>

        {podeVerComissaoEmpresa && (
          <article
            style={{
              borderColor: "#c8d8ff",
              background: "linear-gradient(135deg, #f3f7ff, #ffffff)",
            }}
          >
            <span>COMISSÃO DA EMPRESA</span>
            <strong style={{ color: "#155eef" }}>
              {moeda(resumo.comissaoEmpresa)}
            </strong>
          </article>
        )}

        <article className="destaque">
          <span>PRODUÇÃO DIGITADA </span>
<strong>{moeda(resumo.producaoDigitada)}</strong>
        </article>
      </section>

      <section className="esteira-toolbar">
        <div className="esteira-toolbar-title">
          <span>GESTÃO DE PROPOSTAS</span>
          <h2>Acompanhamento das propostas</h2>
        </div>

        <div className="esteira-filtros">
  <input
    value={busca}
    onChange={(evento) => setBusca(evento.target.value)}
    placeholder="Buscar proposta, cliente, CPF ou consultora..."
  />

  <select
    value={filtroConsultora}
    onChange={(evento) =>
      setFiltroConsultora(evento.target.value)
    }
  >
    <option value="Todas">Todas as consultoras</option>

    {consultoras.map((consultora) => (
      <option key={consultora} value={consultora}>
        {consultora}
      </option>
    ))}
  </select>

  <input
    type="date"
    value={dataInicial}
    onChange={(evento) =>
      setDataInicial(evento.target.value)
    }
    title="Data inicial"
  />

  <input
    type="date"
    value={dataFinal}
    onChange={(evento) =>
      setDataFinal(evento.target.value)
    }
    title="Data final"
  />

  <button
    type="button"
    className="botao-secundario"
    onClick={selecionarMesAtual}
  >
    Este mês
  </button>

  <button
    type="button"
    className="botao-secundario"
    onClick={limparPeriodo}
  >
    Limpar período
  </button>

  <select
    value={filtroStatus}
    onChange={(evento) =>
      setFiltroStatus(evento.target.value)
    }
  >
    <option value="Todos">Todos os status</option>

    {nomesStatusAtivos.map((status) => (
      <option key={status} value={status}>
        {status}
      </option>
    ))}
  </select>

  <button
    type="button"
    className="botao-secundario"
    onClick={() => router.push("/clientes")}
  >
    + Novo cliente
  </button>

  <button
    type="button"
    className="botao-principal"
    onClick={abrirNovaProposta}
  >
    + Nova proposta
  </button>
</div>
      </section>

      {mensagem && !modalAberto && (
        <div className="esteira-mensagem">{mensagem}</div>
      )}

      <section className="esteira-tabela-card">
        {carregando ? (
          <div className="esteira-vazio">
            Carregando propostas do Supabase...
          </div>
        ) : propostasFiltradas.length === 0 ? (
          <div className="esteira-vazio">
            <strong>Nenhuma proposta encontrada</strong>
            <span>
              Cadastre uma proposta ou altere os filtros.
            </span>
          </div>
        ) : (
          <div
            className="esteira-tabela-wrapper"
            style={{
              transform: "rotateX(180deg)",
              overflowX: "auto",
            }}
          >
            <table
              className="esteira-tabela"
              style={{
                transform: "rotateX(180deg)",
              }}
            >
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>CONSULTORA</th>
                  <th>CLIENTE</th>
                  <th>PRODUTO</th>
                  <th>BANCO / TABELA / CONVÊNIO</th>
                  <th>CÓDIGO</th>
                  <th>VALOR</th>
                  <th>VALOR FINAL</th>
                  <th>% PRODUÇÃO</th>
                  {podeVerComissaoBanco && <th>% COMISSÃO BANCO</th>}
                  {podeVerComissaoEmpresa && <th>COMISSÃO EMPRESA</th>}
                  <th>DATA / DIGITAÇÃO</th>
                  <th>DATA PAGAMENTO CLIENTE</th>
                  <th>STATUS</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>

              <tbody>
                {propostasFiltradas.map((proposta, indice) => {
                  const calculoComissao = calcularComissaoDaProposta(
                    proposta,
                    tabelasConfiguradas,
                  );

                  return (
                  <tr key={proposta.id}>
                    <td>
                      <strong>
                        {proposta.numeroProposta || numeroProposta(proposta.id, indice)}
                      </strong>
                    </td>

                    <td>{proposta.vendedora || "—"}</td>

                    <td>
                      <strong>{proposta.cliente}</strong>
                      <small>{formatarCpf(proposta.cpf)}</small>
                    </td>

                    <td>Compra de Dívida</td>

                    <td>
                      <strong>{proposta.banco || "—"}</strong>
                      <small style={{ fontWeight: 400 }}>
                        {proposta.tabela || "Tabela não informada"}
                      </small>
                      <small style={{ fontWeight: 400 }}>
                        {calculoComissao.tabela?.orgaoConvenio ||
                          "Convênio não informado"}
                      </small>
                    </td>

                    <td>
                      {calculoComissao.tabela?.codigo || "—"}
                    </td>

                    <td>{moeda(proposta.valorContrato)}</td>

                    <td>
                      <strong className="valor-final">
                        {moeda(proposta.valorMeta)}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {`${String(
                          Number(
                            calculoComissao.tabela?.percentual ??
                              proposta.percentualTabela ??
                              0,
                          ),
                        ).replace(".", ",")}%`}
                      </strong>
                    </td>

                    {podeVerComissaoBanco && (
                      <td>
                        <strong>
                          {calculoComissao.percentual > 0
                            ? `${String(calculoComissao.percentual).replace(".", ",")}%`
                            : "—"}
                        </strong>
                      </td>
                    )}

                    {podeVerComissaoEmpresa && (
                      <td>
                        <strong
                          style={{
                            color:
                              calculoComissao.valor > 0
                                ? "#155eef"
                                : "#b42318",
                          }}
                        >
                          {calculoComissao.valor > 0
                            ? moeda(calculoComissao.valor)
                            : "—"}
                        </strong>
                      </td>
                    )}

                    <td>
                      <strong>
                        {dataBR(proposta.dataCadastro)}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {dataBR(proposta.dataPagamento)}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`esteira-status status-${classeStatus(
                          proposta.status
                        )}`}
                      >
                        {proposta.status}
                      </span>
                    </td>

                    <td>
                      <div className="esteira-acoes">
                        <button
                          type="button"
                          title="Visualizar"
                          onClick={() => setSelecionada(proposta)}
                        >
                          ◉
                        </button>

                        {podeEditarProposta(proposta) && (
                          <button
                            type="button"
                            title={
                              podeEditarTodasPropostas
                                ? "Editar proposta"
                                : "Editar minha proposta"
                            }
                            onClick={() => abrirEdicaoProposta(proposta)}
                          >
                            ✎
                          </button>
                        )}

                        {podeCancelarProposta &&
                          proposta.status !== "CANCELADA" && (
                            <button
                              type="button"
                              title="Cancelar proposta"
                              aria-label={`Cancelar proposta de ${proposta.cliente}`}
                              onClick={() => {
                                abrirEdicaoProposta(proposta);
                                setMensagem("");
                                setMotivoCancelamento(
                                  proposta.motivoCancelamento || "",
                                );
                                setModalAberto(false);
                                setModalCancelamentoAberto(true);
                              }}
                              style={{
                                color: "#b42318",
                                borderColor: "#f0b4ae",
                                background: "#fff5f4",
                              }}
                            >
                              ⊘
                            </button>
                          )}

                        <button
  type="button"
  title="Excluir proposta"
  aria-label={`Excluir proposta de ${proposta.cliente}`}
  disabled={salvando}
  onClick={() => void excluirProposta(proposta)}
  style={{
    color: "#b42318",
    borderColor: "#f0b4ae",
    background: "#fff5f4",
  }}
>
  🗑
</button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selecionada && (
        <div
          className="esteira-overlay"
          onClick={() => setSelecionada(null)}
        >
          <aside
            className="esteira-drawer"
            onClick={(evento) => evento.stopPropagation()}
          >
            <header>
              <div>
                <span>FICHA DA PROPOSTA</span>
                <h2>{selecionada.cliente}</h2>
                <p>{selecionada.vendedora}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelecionada(null)}
              >
                ×
              </button>
            </header>

            <div className="drawer-grid">
              <div>
                <span>CPF</span>
                <strong>{formatarCpf(selecionada.cpf)}</strong>
              </div>

              <div>
                <span>Telefone</span>
                <strong>{selecionada.telefone || "—"}</strong>
              </div>

              <div>
                <span>Banco</span>
                <strong>{selecionada.banco || "—"}</strong>
              </div>

              <div>
                <span>Tabela</span>
                <strong>{selecionada.tabela || "—"}</strong>
              </div>

              <div>
                <span>Valor do contrato</span>
                <strong>{moeda(selecionada.valorContrato)}</strong>
              </div>

              <div>
                <span>Valor para meta</span>
                <strong>{moeda(selecionada.valorMeta)}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{selecionada.status}</strong>
              </div>

              <div>
                <span>Data de digitação</span>
                <strong>{dataBR(selecionada.dataCadastro)}</strong>
              </div>
            </div>

            <label>
              Observações
              <textarea
                rows={6}
                value={selecionada.observacao || ""}
                readOnly
              />
            </label>
          </aside>
        </div>
      )}
      {modalAberto && (
        <div
          className="esteira-overlay"
          onClick={() => {
  setModalAberto(false);
  setEditando(null);
  setBuscaCliente("");
  setMensagem("");
  setForm(FORMULARIO_VAZIO);
}}
        >
          <div
            className="nova-proposta-modal"
            onClick={(evento) => evento.stopPropagation()}
          >
            <header>
              <div>
                <span>{editando ? "ATUALIZAR PROPOSTA" : "NOVA PROPOSTA"}</span>
                <h2>
                  {editando
                    ? `Editar ${form.nomeCliente || "proposta"}`
                    : "Cadastrar contrato"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalAberto(false);
                  setEditando(null);
                }}
              >
                ×
              </button>
            </header>

            <div className="proposta-wizard">
              {["Cliente","Endereço","Proposta","Documentos","Revisão"].map((titulo, indice) => (
                <button type="button" key={titulo} className={`proposta-wizard-step ${etapaModal===indice+1?"active":etapaModal>indice+1?"done":""}`} onClick={()=>{ if(indice+1<=etapaModal || editando) setEtapaModal(indice+1); }}>
                  <b>{etapaModal>indice+1?"✓":indice+1}</b><span>{titulo}</span>
                </button>
              ))}
            </div>

            <form onSubmit={salvarProposta} className="proposta-wizard-form">
              <div className="proposta-wizard-scroll">
  <div className="modal-form-grid">
{etapaModal === 1 && (
    <div className="proposta-etapa-conteudo proposta-cliente-layout">
      <div className="proposta-cliente-principal">
    {/* BUSCA DO CLIENTE PELO CPF */}
    <div className="busca-cliente-topo">
      {mensagem && (
  <div
    className={
      form.clienteId
        ? "cliente-encontrado-modal"
        : "cliente-nao-encontrado-modal"
    }
  >
    {mensagem}
  </div>
)}
      <label className="cliente-pesquisa-modal">
        CPF do cliente

        <input
  type="text"
  inputMode="numeric"
  value={buscaCliente}
  onChange={(evento) => {
    const cpfDigitado = apenasNumeros(
      evento.target.value
    ).slice(0, 11);

    setBuscaCliente(formatarCpf(cpfDigitado));

    setForm((atual) => ({
      ...atual,
      clienteId: "",
      cpfCliente: cpfDigitado,
    }));

    setMensagem("");
  }}
  placeholder="Digite o CPF do cliente"
  maxLength={14}
/>
      </label>

      <button
  type="button"
  className="botao-buscar-cliente"
  onClick={buscarClientePorCpf}
>
  Buscar cliente
</button>

      <div className="aviso-cliente-cadastrado">
        <strong>ⓘ</strong>

        <span>
          Se o cliente já estiver cadastrado, os dados serão
          preenchidos automaticamente.
        </span>
      </div>
    </div>

    <div className={`cliente-status-wizard ${form.clienteId?"found":clienteNovo?"new":"idle"}`}>
      <div><strong>{form.clienteId?"✓ Cliente encontrado":clienteNovo?"+ Novo cliente":"Busque o cliente pelo CPF"}</strong><span>{form.clienteId?"Dados carregados automaticamente.":clienteNovo?"Preencha os dados abaixo. O cliente será criado junto com a proposta.":"Se não existir, você cadastra aqui sem sair da proposta."}</span></div>
      {!form.clienteId && !clienteNovo && apenasNumeros(form.cpfCliente).length===11 && <button type="button" onClick={()=>setClienteNovo(true)}>Cadastrar cliente agora</button>}
    </div>

    {/* DADOS DO CLIENTE */}
    <div className="secao-modal">
      <div className="secao-modal-titulo">
        <span>👤 DADOS DO CLIENTE</span>
        <p>
          Preencha ou confira as informações cadastrais.
        </p>
      </div>

      <div className="modal-form-grid">
        <label>
          Nome completo <strong className="campo-obrigatorio">*</strong>
          <input
            value={form.nomeCliente}
            required
            onChange={(evento) =>
              setForm({
                ...form,
                nomeCliente: evento.target.value,
              })
            }
            placeholder="Nome completo do cliente"
          />
        </label>

        <label>
          CPF <strong className="campo-obrigatorio">*</strong>
          <input
            value={formatarCpf(form.cpfCliente)}
            readOnly
            placeholder="CPF do cliente"
          />
        </label>

        <label>
          RG <strong className="campo-obrigatorio">*</strong>
          <input
            value={form.rgCliente}
            required
            onChange={(evento) =>
              setForm({
                ...form,
                rgCliente: evento.target.value,
              })
            }
            placeholder="Número do RG"
          />
        </label>

        <label>
          Data de nascimento <strong className="campo-obrigatorio">*</strong>
          <input
            type="date"
            value={form.dataNascimentoCliente}
            required
            onChange={(evento) =>
              setForm({
                ...form,
                dataNascimentoCliente:
                  evento.target.value,
              })
            }
          />
        </label>

        <label>
          Nome da mãe <strong className="campo-obrigatorio">*</strong>
          <input
            value={form.nomeMaeCliente}
            required
            onChange={(evento) =>
              setForm({
                ...form,
                nomeMaeCliente: evento.target.value,
              })
            }
            placeholder="Nome completo da mãe"
          />
        </label>

        <label>
          Nome do pai
          <input
            value={form.nomePaiCliente}
            onChange={(evento) =>
              setForm({
                ...form,
                nomePaiCliente: evento.target.value,
              })
            }
            placeholder="Nome completo do pai"
          />
        </label>

        <label>
          Telefone <strong className="campo-obrigatorio">*</strong>
          <input
            type="tel"
            value={form.telefoneCliente}
            required
            onChange={(evento) =>
              setForm({
                ...form,
                telefoneCliente: evento.target.value,
              })
            }
            placeholder="Telefone principal"
          />
        </label>

        <label>
          Telefone 2
          <input
            type="tel"
            value={form.telefone2Cliente}
            onChange={(evento) =>
              setForm({
                ...form,
                telefone2Cliente:
                  evento.target.value,
              })
            }
            placeholder="Telefone alternativo"
          />
        </label>

        <label className="campo-largura-total">
          E-mail <strong className="campo-obrigatorio">*</strong>
          <input
            type="email"
            value={form.emailCliente}
            required
            onChange={(evento) =>
              setForm({
                ...form,
                emailCliente: evento.target.value,
              })
            }
            placeholder="E-mail do cliente"
          />
        </label>
      </div>
    </div>

      </div>
      <aside className="proposta-cliente-sidebar">
        <div className="cliente-side-card cliente-side-identidade">
          <div className="cliente-side-icon">👤</div>
          <div>
            <strong>{form.clienteId ? "Cliente identificado" : "Novo cliente"}</strong>
            <span>{form.clienteId ? (form.nomeCliente || "Dados carregados") : "Informe o CPF para buscar ou cadastre um novo cliente."}</span>
          </div>
        </div>
        <div className="cliente-side-card">
          <h4>💡 Dicas</h4>
          <ul>
            <li>Utilize o CPF para buscar o cliente no sistema</li>
            <li>Se não encontrar, preencha os dados nesta tela</li>
            <li>Confira se as informações estão corretas</li>
            <li>O cliente será salvo junto com a proposta</li>
          </ul>
        </div>
        <div className="cliente-side-card cliente-side-seguranca">
          <div className="cliente-side-icon">🔒</div>
          <div><strong>Cadastro integrado</strong><span>Os dados ficam vinculados ao cliente e à proposta.</span></div>
        </div>
      </aside>
    </div>
  )}
{etapaModal === 2 && (
  <div className="proposta-etapa-conteudo">
    {/* ENDEREÇO */}
    <div className="secao-modal">
      <div className="secao-modal-titulo">
        <span>📍 ENDEREÇO</span>
        <p>
          Informe o endereço completo do cliente.
        </p>
      </div>

      <div className="modal-form-grid">
        <label>
          CEP
          <input
            value={form.cepCliente}
            inputMode="numeric"
            onChange={(evento) => {
              const numeros = apenasNumeros(evento.target.value).slice(0, 8);
              const formatado =
                numeros.length > 5
                  ? `${numeros.slice(0, 5)}-${numeros.slice(5)}`
                  : numeros;

              setForm((atual) => ({
                ...atual,
                cepCliente: formatado,
              }));

              setMensagemCep("");

              if (numeros.length === 8) {
                void buscarEnderecoPorCep(numeros);
              }
            }}
            onBlur={() => {
              const numeros = apenasNumeros(form.cepCliente);

              if (numeros.length === 8 && !buscandoCep) {
                void buscarEnderecoPorCep(numeros);
              }
            }}
            placeholder="00000-000"
            maxLength={9}
          />
          {mensagemCep && (
            <small
              className={`cep-feedback ${
                mensagemCep.startsWith("✓") ? "sucesso" : ""
              }`}
            >
              {buscandoCep ? "Buscando endereço..." : mensagemCep}
            </small>
          )}
        </label>

        <label>
          Endereço
          <input
            value={form.enderecoCliente}
            onChange={(evento) =>
              setForm({
                ...form,
                enderecoCliente:
                  evento.target.value,
              })
            }
            placeholder="Rua, avenida ou logradouro"
          />
        </label>

        <label>
          Número
          <input
            value={form.numeroCliente}
            onChange={(evento) =>
              setForm({
                ...form,
                numeroCliente: evento.target.value,
              })
            }
            placeholder="Número"
          />
        </label>

        <label>
          Complemento
          <input
            value={form.complementoCliente}
            onChange={(evento) =>
              setForm({
                ...form,
                complementoCliente:
                  evento.target.value,
              })
            }
            placeholder="Casa, apartamento, bloco..."
          />
        </label>

        <label>
          Bairro
          <input
            value={form.bairroCliente}
            onChange={(evento) =>
              setForm({
                ...form,
                bairroCliente: evento.target.value,
              })
            }
            placeholder="Bairro"
          />
        </label>

        <label>
          Cidade
          <input
            value={form.cidadeCliente}
            onChange={(evento) =>
              setForm({
                ...form,
                cidadeCliente: evento.target.value,
              })
            }
            placeholder="Cidade"
          />
        </label>

        <label>
          UF
          <input
            value={form.ufCliente}
            onChange={(evento) =>
              setForm({
                ...form,
                ufCliente: evento.target.value
                  .toUpperCase()
                  .slice(0, 2),
              })
            }
            placeholder="GO"
            maxLength={2}
          />
        </label>
      </div>
    </div>


</div>)}
{etapaModal === 3 && (<div className="proposta-etapa-conteudo">
    {/* DADOS DA PROPOSTA */}
    <div className="secao-modal">
      <div className="secao-modal-titulo">
        <span>📄 DADOS DA PROPOSTA</span>
        <p>Informe os dados da operação.</p>
      </div>

      <div className="modal-form-grid">
        <label>
          Número da proposta
          <input
            type="text"
            value={form.numeroProposta}
            onChange={(evento) =>
              setForm({
                ...form,
                numeroProposta: evento.target.value,
              })
            }
            placeholder="Ex.: NEO-25487"
          />
        </label>

        <label>
          Consultora
          <select
            value={form.vendedora}
            disabled={
              Boolean(editando) &&
              !podeEditarTodasPropostas
            }
            onChange={(evento) =>
              setForm({
                ...form,
                vendedora: evento.target.value,
              })
            }
          >
            <option value="">Selecione a consultora</option>

            {consultoras.map((consultora) => (
              <option key={consultora} value={consultora}>
                {consultora}
              </option>
            ))}
          </select>
        </label>

        <label>
          Banco
          <select
            value={form.banco}
            onChange={(evento) => {
              const banco = evento.target.value;

              setForm({
                ...form,
                banco,
                tabela: "",
              });

              setOrgaoConvenio("");
            }}
          >
            <option value="">Selecione o banco</option>

            {editando &&
              form.banco &&
              !bancosDisponiveis.includes(form.banco) && (
                <option value={form.banco}>
                  {form.banco} (histórico)
                </option>
              )}

            {bancosDisponiveis.map((banco) => (
              <option key={banco} value={banco}>
                {banco}
              </option>
            ))}
          </select>
        </label>

        <label>
          Órgão / Convênio
          <select
            value={orgaoConvenio}
            disabled={!form.banco}
            onChange={(evento) => {
              const valor = evento.target.value;

              setOrgaoConvenio(valor);
              setForm({
                ...form,
                tabela: "",
              });
            }}
          >
            <option value="">
              {form.banco
                ? "Selecione o órgão / convênio"
                : "Escolha primeiro o banco"}
            </option>

            {editando &&
              orgaoConvenio === "__HISTORICA__" && (
                <option value="__HISTORICA__">
                  Tabela histórica
                </option>
              )}

            {tabelasConfiguradas.some(
              (tabela) =>
                tabela.ativo &&
                tabela.banco === String(form.banco || "").trim().toUpperCase() &&
                !tabela.orgaoConvenio
            ) && (
              <option value="__SEM_ORGAO__">
                Sem órgão específico
              </option>
            )}

            {orgaosDisponiveis.map((orgao) => (
              <option key={orgao} value={orgao}>
                {orgao}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tabela
          <select
            value={form.tabela}
            disabled={!orgaoConvenio}
            onChange={(evento) =>
              setForm({
                ...form,
                tabela: evento.target.value,
              })
            }
          >
            <option value="">
              {orgaoConvenio
                ? "Selecione a tabela"
                : "Escolha primeiro o órgão / convênio"}
            </option>

            {editando &&
              orgaoConvenio === "__HISTORICA__" &&
              form.tabela && (
                <option value={form.tabela}>
                  {form.tabela} — {editando.percentualTabela}% (histórica)
                </option>
              )}

            {tabelasFiltradas.map((tabela) => (
              <option
                key={tabela.id}
                value={tabela.nome}
              >
                {tabela.nome}
                {tabela.codigo ? ` • ${tabela.codigo}` : ""}
                {" — "}
                {tabela.percentual}%
              </option>
            ))}
          </select>
        </label>

        <label>
          Valor do contrato
          <input
            value={form.valorContrato}
            onChange={(evento) =>
              setForm({
                ...form,
                valorContrato: evento.target.value,
              })
            }
            placeholder="Ex.: 20.000,00"
          />
        </label>

        <label>
          Data da solicitação
          <input
            type="date"
            value={form.dataSolicitacao}
            onChange={(evento) =>
              setForm({
                ...form,
                dataSolicitacao:
                  evento.target.value,
              })
            }
          />
        </label>

        <label>
          Data da digitação
          <input
            type="date"
            value={form.dataDigitacao}
            onChange={(evento) =>
              setForm({
                ...form,
                dataDigitacao:
                  evento.target.value,
              })
            }
          />
        </label>

        <label>
          Status
          <select
            value={form.status}
            onChange={(evento) =>
              setForm({
                ...form,
                status: evento.target.value as StatusProposta,
                dataPagamento:
                  tipoDoStatus(evento.target.value) === "PAGO" &&
                  podeAlterarDataPagamento &&
                  !form.dataPagamento
                    ? hojeIso()
                    : form.dataPagamento,
              })
            }
          >
            {editando && form.status && !nomesStatusAtivos.includes(form.status) && (
              <option value={form.status}>{form.status} (histórico)</option>
            )}
            {nomesStatusAtivos.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>

        {editando && (
          <label>
            Data do pagamento
            <input
              type="date"
              value={form.dataPagamento}
              disabled={!podeAlterarDataPagamento}
              onChange={(evento) =>
                setForm({
                  ...form,
                  dataPagamento: evento.target.value,
                })
              }
              title={
                podeAlterarDataPagamento
                  ? "Data em que a proposta foi paga"
                  : "Somente operacional ou administradora pode alterar esta data"
              }
            />
            {!podeAlterarDataPagamento && (
              <small>
                Somente operacional ou administradora pode alterar.
              </small>
            )}
          </label>
        )}

        <label>
          Senha do contracheque
          <input
            type="text"
            value={form.senhaContracheque}
            onChange={(evento) =>
              setForm({
                ...form,
                senhaContracheque:
                  evento.target.value,
              })
            }
            placeholder="Digite a senha do contracheque"
          />
        </label>

        <label>
          Senha da consignação <strong className="campo-obrigatorio">*</strong>
          <input
            type="text"
            required
            value={form.senhaConsignacao}
            onChange={(evento) =>
              setForm({
                ...form,
                senhaConsignacao:
                  evento.target.value,
              })
            }
            placeholder="Digite a senha da consignação"
          />
        </label>

        <div className="valor-meta-modal">
          <span>Valor para a meta</span>
          <strong>{moeda(valorMeta)}</strong>
        </div>
      </div>

      <label className="observacao-modal">
        Observações
        <textarea
          rows={4}
          value={form.observacao}
          onChange={(evento) =>
            setForm({
              ...form,
              observacao: evento.target.value,
            })
          }
          placeholder="Digite informações importantes sobre a proposta"
        />
      </label>
    </div>
  </div>)}
      {etapaModal === 4 && (<div className="proposta-etapa-conteudo">
<div className="secao-documentos">
  <div className="secao-modal-titulo">
    <span>📎 DOCUMENTOS</span>
    <p>Anexe os documentos necessários para a proposta.</p>
  </div>

  <div className="documentos-grid">
    <div className={`documento-upload ${arquivos.rgFrente ? "documento-anexado" : ""}`}>
      {arquivos.rgFrente ? (
        <>
          <div className="documento-check">✓</div>
          <span>RG FRENTE ANEXADO</span>
          <strong className="documento-nome-arquivo">{arquivos.rgFrente?.name}</strong>

          <div className="documento-acoes-anexo">
            <label className="documento-trocar">
              Trocar arquivo
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) =>
                  setArquivos((atuais) => ({
                    ...atuais,
                    rgFrente: e.target.files?.[0] ?? null,
                  }))
                }
              />
            </label>

            <button
              type="button"
              className="documento-remover"
              onClick={() =>
                setArquivos((atuais) => ({
                  ...atuais,
                  rgFrente: null,
                }))
              }
            >
              Remover
            </button>
          </div>
        </>
      ) : (
        <label className="documento-upload-vazio">
          <span>RG FRENTE</span>
          <strong>Selecionar arquivo</strong>
          <small>Imagem ou PDF</small>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) =>
              setArquivos((atuais) => ({
                ...atuais,
                rgFrente: e.target.files?.[0] ?? null,
              }))
            }
          />
        </label>
      )}
    </div>

    <div className={`documento-upload ${arquivos.rgVerso ? "documento-anexado" : ""}`}>
      {arquivos.rgVerso ? (
        <>
          <div className="documento-check">✓</div>
          <span>RG VERSO ANEXADO</span>
          <strong className="documento-nome-arquivo">{arquivos.rgVerso?.name}</strong>

          <div className="documento-acoes-anexo">
            <label className="documento-trocar">
              Trocar arquivo
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) =>
                  setArquivos((atuais) => ({
                    ...atuais,
                    rgVerso: e.target.files?.[0] ?? null,
                  }))
                }
              />
            </label>

            <button
              type="button"
              className="documento-remover"
              onClick={() =>
                setArquivos((atuais) => ({
                  ...atuais,
                  rgVerso: null,
                }))
              }
            >
              Remover
            </button>
          </div>
        </>
      ) : (
        <label className="documento-upload-vazio">
          <span>RG VERSO</span>
          <strong>Selecionar arquivo</strong>
          <small>Imagem ou PDF</small>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) =>
              setArquivos((atuais) => ({
                ...atuais,
                rgVerso: e.target.files?.[0] ?? null,
              }))
            }
          />
        </label>
      )}
    </div>

    <div className={`documento-upload ${arquivos.cnh ? "documento-anexado" : ""}`}>
      {arquivos.cnh ? (
        <>
          <div className="documento-check">✓</div>
          <span>CNH ANEXADO</span>
          <strong className="documento-nome-arquivo">{arquivos.cnh?.name}</strong>

          <div className="documento-acoes-anexo">
            <label className="documento-trocar">
              Trocar arquivo
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) =>
                  setArquivos((atuais) => ({
                    ...atuais,
                    cnh: e.target.files?.[0] ?? null,
                  }))
                }
              />
            </label>

            <button
              type="button"
              className="documento-remover"
              onClick={() =>
                setArquivos((atuais) => ({
                  ...atuais,
                  cnh: null,
                }))
              }
            >
              Remover
            </button>
          </div>
        </>
      ) : (
        <label className="documento-upload-vazio">
          <span>CNH</span>
          <strong>Selecionar arquivo</strong>
          <small>Imagem ou PDF</small>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) =>
              setArquivos((atuais) => ({
                ...atuais,
                cnh: e.target.files?.[0] ?? null,
              }))
            }
          />
        </label>
      )}
    </div>

    <div className={`documento-upload documento-upload-multiplo ${
      arquivos.contracheques.length ? "documento-anexado-multiplo" : ""
    }`}>
      {arquivos.contracheques.length > 0 && (
        <>
          <div className="documento-check">✓</div>
          <span>
            {arquivos.contracheques.length}{" "}
            {arquivos.contracheques.length === 1
              ? "ARQUIVO ANEXADO"
              : "ARQUIVOS ANEXADOS"}
          </span>
        </>
      )}

      <label className="documento-upload-seletor">
        <input
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={(e) => {
            const selecionados = Array.from(e.target.files || []);

            if (selecionados.length) {
              setArquivos((atuais) => ({
                ...atuais,
                contracheques: [
                  ...atuais.contracheques,
                  ...selecionados,
                ],
              }));
            }

            e.target.value = "";
          }}
        />

        <strong>
          {arquivos.contracheques.length
            ? "+ Adicionar mais arquivos"
            : "Selecionar arquivos"}
        </strong>
        <small>
          {arquivos.contracheques.length
            ? "Contracheque • várias imagens ou PDFs"
            : "Contracheque • várias imagens ou PDFs"}
        </small>
      </label>

      {arquivos.contracheques.length > 0 && (
        <div className="contracheques-selecionados">
          {arquivos.contracheques.map((arquivo, indice) => (
            <div
              className="contracheque-item"
              key={`${arquivo.name}-${arquivo.lastModified}-${indice}`}
            >
              <span title={arquivo.name}>
                {indice + 1}. {arquivo.name}
              </span>

              <button
                type="button"
                onClick={() =>
                  setArquivos((atuais) => ({
                    ...atuais,
                    contracheques: atuais.contracheques.filter(
                      (_, itemIndice) => itemIndice !== indice
                    ),
                  }))
                }
                aria-label={`Remover ${arquivo.name}`}
                title="Remover arquivo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
</div>
  </div>)}
   {etapaModal === 5 && (
     <div className="proposta-etapa-conteudo">
       <div className="revisao-proposta">
         <div className="revisao-cabecalho"><div><span>REVISÃO FINAL</span><h3>Confira antes de salvar</h3></div><b>✓ Tudo pronto</b></div>
         <section><header><strong>👤 Cliente</strong><button type="button" onClick={() => setEtapaModal(1)}>Editar</button></header><p><b>{form.nomeCliente || "—"}</b> • {formatarCpf(form.cpfCliente)} • {form.telefoneCliente || "—"}</p></section>
         <section><header><strong>📍 Endereço</strong><button type="button" onClick={() => setEtapaModal(2)}>Editar</button></header><p>{[form.enderecoCliente, form.numeroCliente, form.bairroCliente, form.cidadeCliente, form.ufCliente].filter(Boolean).join(" • ") || "—"}</p></section>
         <section><header><strong>📄 Proposta</strong><button type="button" onClick={() => setEtapaModal(3)}>Editar</button></header>
           <div className="revisao-grid"><div><span>Consultora</span><b>{form.vendedora || "—"}</b></div><div><span>Banco</span><b>{form.banco || "—"}</b></div><div><span>Tabela</span><b>{form.tabela || "—"}</b></div><div><span>Valor</span><b>{moeda(valorContrato)}</b></div><div><span>Valor para meta</span><b>{moeda(valorMeta)}</b></div><div><span>Status</span><b>{form.status}</b></div></div>
         </section>
         <section><header><strong>📎 Documentos</strong><button type="button" onClick={() => setEtapaModal(4)}>Editar</button></header><p>RG frente: {arquivos.rgFrente ? "✓" : "—"} • RG verso: {arquivos.rgVerso ? "✓" : "—"} • CNH: {arquivos.cnh ? "✓" : "—"} • Contracheques: {arquivos.contracheques.length}</p></section>
       </div>
     </div>
   )}
  </div>

   {mensagem && (
    <div className="esteira-mensagem">
      {mensagem}
    </div>
  )}

                </div>
  <footer className="proposta-wizard-footer">
    <button type="button" className="botao-secundario" onClick={() => setModalAberto(false)}>Cancelar</button>
    <div className="proposta-wizard-footer-right">
      <span>Etapa {etapaModal} de 5</span>
      {etapaModal > 1 && <button type="button" className="botao-secundario" onClick={voltarEtapaModal}>← Voltar</button>}
      {etapaModal < 5 ? (
        <button type="button" className="botao-principal" onClick={avancarEtapaModal}>{etapaModal === 4 ? "Revisar →" : "Continuar →"}</button>
      ) : (
        <button type="submit" className="botao-principal" disabled={salvando}>{salvando ? "Salvando..." : editando ? "Salvar alterações" : "✓ Salvar proposta"}</button>
      )}
    </div>
  </footer>
</form>
          </div>
        </div>
      )}

      {modalCancelamentoAberto && editando && (
        <div
          className="esteira-overlay"
          onClick={() => {
            if (!cancelando) setModalCancelamentoAberto(false);
          }}
          style={{ zIndex: 9999 }}
        >
          <div
            className="nova-proposta-modal"
            onClick={(evento) => evento.stopPropagation()}
            style={{ maxWidth: 620 }}
          >
            <header>
              <div>
                <span>CANCELAR PROPOSTA</span>
                <h2>{editando.cliente}</h2>
              </div>

              <button
                type="button"
                disabled={cancelando}
                onClick={() => setModalCancelamentoAberto(false)}
              >
                ×
              </button>
            </header>

            <div style={{ padding: "20px" }}>
              <p>
                A proposta continuará salva e entrará nas métricas de
                cancelamento.
              </p>

              <label className="observacao-modal">
                Motivo do cancelamento
                <textarea
                  rows={5}
                  value={motivoCancelamento}
                  onChange={(evento) =>
                    setMotivoCancelamento(evento.target.value)
                  }
                  placeholder="Explique por que a proposta foi cancelada"
                  disabled={cancelando}
                />
              </label>

              {mensagem && (
                <div className="esteira-mensagem">{mensagem}</div>
              )}
            </div>

            <footer>
              <button
                type="button"
                className="botao-secundario"
                disabled={cancelando}
                onClick={() => setModalCancelamentoAberto(false)}
              >
                Voltar
              </button>

              <button
                type="button"
                className="botao-principal"
                disabled={cancelando || !motivoCancelamento.trim()}
                onClick={confirmarCancelamento}
                style={{ background: "#b42318" }}
              >
                {cancelando ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </footer>
          </div>
        </div>
      )}

    </div>
  );
}