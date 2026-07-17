"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import "./clientes.css";
import "./clientes-completo.css";

type DocumentoCliente = {
  id: string;
  nome: string;
  mimeType: string;
  tamanho: number;
  dados: string;
};

type Cliente = {
  id: string;

  convenioEstado: string;
  convenioOrgao: string;
  produto: string;
  matricula: string;
  cargo: string;
  salario: number;
  senhaPortal: string;
  senhaContracheque: string;

  nome: string;
  cpf: string;
  nascimento: string;
  sexo: string;
  estadoCivil: string;
  nacionalidade: string;
  naturalidade: string;
  rg: string;
  orgaoEmissor: string;
  ufEmissor: string;
  dataEmissaoRg: string;
  nomeMae: string;
  nomePai: string;

  telefone: string;
  email: string;

  cep: string;
  logradouro: string;
  numeroEndereco: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;

  banco: string;
  agencia: string;
  conta: string;
  digitoConta: string;
  tipoConta: string;
  titularConta: string;

  consultora: string;
  status: string;
  observacoes: string;
  documentos: DocumentoCliente[];

  criadoEm: string;
  atualizadoEm: string;
};

type FormularioCliente = {
  convenioEstado: string;
  convenioOrgao: string;
  produto: string;
  matricula: string;
  cargo: string;
  salario: string;
  senhaPortal: string;
  senhaContracheque: string;

  nome: string;
  cpf: string;
  nascimento: string;
  sexo: string;
  estadoCivil: string;
  nacionalidade: string;
  naturalidade: string;
  rg: string;
  orgaoEmissor: string;
  ufEmissor: string;
  dataEmissaoRg: string;
  nomeMae: string;
  nomePai: string;

  telefone: string;
  email: string;

  cep: string;
  logradouro: string;
  numeroEndereco: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;

  banco: string;
  agencia: string;
  conta: string;
  digitoConta: string;
  tipoConta: string;
  titularConta: string;

  consultora: string;
  status: string;
  observacoes: string;
  documentos: DocumentoCliente[];
};

type Proposta = {
  id: string;
  cliente: string;
  cpf: string;
  telefone: string;
  vendedora: string;
  banco: string;
  tabela: string;
  valorContrato: number;
  percentualTabela: number;
  comissao: number;
  status: string;
  dataCadastro: string;
  dataPagamento: string;
  observacao: string;
};

const STATUS_CLIENTE = [
  "Ativo",
  "Em negociação",
  "Aguardando retorno",
  "Sem interesse",
  "Finalizado",
];

const PRODUTOS = [
  "Compra de Dívida",
  "Cartão benefício 70% compra",
  "CLT",
  "INSS",
  "Servidor",
  "Portabilidade",
  "Cartão consignado",
  "Outro",
];

const ESTADOS_BRASIL = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapá"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
] as const;

function criarFormularioVazio(): FormularioCliente {
  return {
    convenioEstado: "São Paulo",
    convenioOrgao: "",
    produto: "Compra de Dívida",
    matricula: "",
    cargo: "",
    salario: "",
    senhaPortal: "",
    senhaContracheque: "",

    nome: "",
    cpf: "",
    nascimento: "",
    sexo: "",
    estadoCivil: "",
    nacionalidade: "Brasileira",
    naturalidade: "",
    rg: "",
    orgaoEmissor: "",
    ufEmissor: "",
    dataEmissaoRg: "",
    nomeMae: "",
    nomePai: "",

    telefone: "",
    email: "",

    cep: "",
    logradouro: "",
    numeroEndereco: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",

    banco: "",
    agencia: "",
    conta: "",
    digitoConta: "",
    tipoConta: "Conta corrente",
    titularConta: "",

    consultora: "",
    status: "Ativo",
    observacoes: "",
    documentos: [],
  };
}

function apenasNumeros(valor: string) {
  return valor.replace(/\D/g, "");
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

function formatarCep(valor: string) {
  return apenasNumeros(valor)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

function converterNumero(valor: string) {
  const convertido = Number(
    valor
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );

  return Number.isFinite(convertido) ? convertido : 0;
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function calcularIdade(nascimento: string) {
  if (!nascimento) return "";

  const data = new Date(`${nascimento}T12:00:00`);

  if (Number.isNaN(data.getTime())) return "";

  const hoje = new Date();
  let idade = hoje.getFullYear() - data.getFullYear();

  const aniversarioAindaNaoChegou =
    hoje.getMonth() < data.getMonth() ||
    (hoje.getMonth() === data.getMonth() &&
      hoje.getDate() < data.getDate());

  if (aniversarioAindaNaoChegou) {
    idade -= 1;
  }

  return idade >= 0 ? String(idade) : "";
}

function normalizarCliente(
  item: Partial<Cliente> & Record<string, unknown>
): Cliente {
  return {
    id: String(item.id || crypto.randomUUID()),

    convenioEstado: String(item.convenioEstado || ""),
    convenioOrgao: String(item.convenioOrgao || ""),
    produto: String(item.produto || "Compra de Dívida"),
    matricula: String(item.matricula || ""),
    cargo: String(item.cargo || ""),
    salario: Number(item.salario || 0),
    senhaPortal: String(item.senhaPortal || ""),
    senhaContracheque: String(item.senhaContracheque || ""),

    nome: String(item.nome || ""),
    cpf: apenasNumeros(String(item.cpf || "")),
    nascimento: String(item.nascimento || ""),
    sexo: String(item.sexo || ""),
    estadoCivil: String(item.estadoCivil || ""),
    nacionalidade: String(item.nacionalidade || "Brasileira"),
    naturalidade: String(item.naturalidade || ""),
    rg: String(item.rg || ""),
    orgaoEmissor: String(item.orgaoEmissor || ""),
    ufEmissor: String(item.ufEmissor || ""),
    dataEmissaoRg: String(item.dataEmissaoRg || ""),
    nomeMae: String(item.nomeMae || ""),
    nomePai: String(item.nomePai || ""),

    telefone: apenasNumeros(String(item.telefone || "")),
    email: String(item.email || ""),

    cep: apenasNumeros(String(item.cep || "")),
    logradouro: String(item.logradouro || ""),
    numeroEndereco: String(item.numeroEndereco || ""),
    complemento: String(item.complemento || ""),
    bairro: String(item.bairro || ""),
    cidade: String(item.cidade || ""),
    estado: String(item.estado || "").toUpperCase(),

    banco: String(item.banco || ""),
    agencia: String(item.agencia || ""),
    conta: String(item.conta || ""),
    digitoConta: String(item.digitoConta || ""),
    tipoConta: String(item.tipoConta || "Conta corrente"),
    titularConta: String(item.titularConta || ""),

    consultora: String(item.consultora || ""),
    status: String(item.status || "Ativo"),
    observacoes: String(item.observacoes || ""),
    documentos: Array.isArray(item.documentos)
      ? item.documentos
      : [],

    criadoEm: String(item.criadoEm || ""),
    atualizadoEm: String(item.atualizadoEm || ""),
  };
}

function formularioDoCliente(
  cliente: Cliente
): FormularioCliente {
  return {
    convenioEstado: cliente.convenioEstado,
    convenioOrgao: cliente.convenioOrgao,
    produto: cliente.produto,
    matricula: cliente.matricula,
    cargo: cliente.cargo,
    salario: cliente.salario
      ? cliente.salario.toFixed(2).replace(".", ",")
      : "",
    senhaPortal: cliente.senhaPortal,
    senhaContracheque: cliente.senhaContracheque,

    nome: cliente.nome,
    cpf: formatarCpf(cliente.cpf),
    nascimento: cliente.nascimento,
    sexo: cliente.sexo,
    estadoCivil: cliente.estadoCivil,
    nacionalidade: cliente.nacionalidade,
    naturalidade: cliente.naturalidade,
    rg: cliente.rg,
    orgaoEmissor: cliente.orgaoEmissor,
    ufEmissor: cliente.ufEmissor,
    dataEmissaoRg: cliente.dataEmissaoRg,
    nomeMae: cliente.nomeMae,
    nomePai: cliente.nomePai,

    telefone: formatarTelefone(cliente.telefone),
    email: cliente.email,

    cep: formatarCep(cliente.cep),
    logradouro: cliente.logradouro,
    numeroEndereco: cliente.numeroEndereco,
    complemento: cliente.complemento,
    bairro: cliente.bairro,
    cidade: cliente.cidade,
    estado: cliente.estado,

    banco: cliente.banco,
    agencia: cliente.agencia,
    conta: cliente.conta,
    digitoConta: cliente.digitoConta,
    tipoConta: cliente.tipoConta,
    titularConta: cliente.titularConta,

    consultora: cliente.consultora,
    status: cliente.status,
    observacoes: cliente.observacoes,
    documentos: cliente.documentos,
  };
}

export default function ClientManager() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [form, setForm] = useState<FormularioCliente>(
    criarFormularioVazio()
  );
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] =
    useState("Todos");
  const [editandoId, setEditandoId] =
    useState<string | null>(null);
  const [detalhe, setDetalhe] =
    useState<Cliente | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [mostrarSenha, setMostrarSenha] =
    useState(false);
  const [mostrarSenhaContracheque, setMostrarSenhaContracheque] =
    useState(false);
  const [mostrarSenhaDetalhe, setMostrarSenhaDetalhe] =
    useState(false);
  const [mostrarSenhaContrachequeDetalhe, setMostrarSenhaContrachequeDetalhe] =
    useState(false);

  useEffect(() => {
    carregar();
  }, []);

  function carregar() {
    const clientesSalvos = localStorage.getItem(
      "somos-eleva-clientes"
    );
    const propostasSalvas = localStorage.getItem(
      "somos-eleva-propostas"
    );

    if (clientesSalvos) {
      try {
        const lista = JSON.parse(clientesSalvos);

        setClientes(
          Array.isArray(lista)
            ? lista.map((item) =>
                normalizarCliente(item)
              )
            : []
        );
      } catch {
        setClientes([]);
      }
    }

    if (propostasSalvas) {
      try {
        setPropostas(JSON.parse(propostasSalvas));
      } catch {
        setPropostas([]);
      }
    }
  }

  function persistir(lista: Cliente[]) {
    try {
      localStorage.setItem(
        "somos-eleva-clientes",
        JSON.stringify(lista)
      );
      setClientes(lista);
      return true;
    } catch {
      setMensagem(
        "Não foi possível salvar. Remova documentos grandes e tente novamente."
      );
      return false;
    }
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoNumerico = apenasNumeros(busca);

    return clientes.filter((cliente) => {
      const statusOk =
        filtroStatus === "Todos" ||
        cliente.status === filtroStatus;

      const buscaOk =
        !termo ||
        cliente.nome.toLowerCase().includes(termo) ||
        cliente.cpf.includes(termoNumerico) ||
        cliente.telefone.includes(termoNumerico) ||
        cliente.consultora
          .toLowerCase()
          .includes(termo) ||
        cliente.banco.toLowerCase().includes(termo) ||
        cliente.convenioEstado
          .toLowerCase()
          .includes(termo) ||
        cliente.convenioOrgao
          .toLowerCase()
          .includes(termo);

      return statusOk && buscaOk;
    });
  }, [clientes, busca, filtroStatus]);

  const resumo = useMemo(() => {
    return {
      total: clientes.length,
      ativos: clientes.filter(
        (item) => item.status === "Ativo"
      ).length,
      negociacao: clientes.filter(
        (item) => item.status === "Em negociação"
      ).length,
      retorno: clientes.filter(
        (item) => item.status === "Aguardando retorno"
      ).length,
      finalizados: clientes.filter(
        (item) => item.status === "Finalizado"
      ).length,
    };
  }, [clientes]);

  function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem("");

    if (!form.nome.trim()) {
      setMensagem("Informe o nome do cliente.");
      return;
    }

    const cpfLimpo = apenasNumeros(form.cpf);

    if (cpfLimpo && cpfLimpo.length !== 11) {
      setMensagem("O CPF precisa ter 11 números.");
      return;
    }

    const cpfDuplicado = clientes.some(
      (item) =>
        item.cpf === cpfLimpo &&
        item.id !== editandoId
    );

    if (cpfLimpo && cpfDuplicado) {
      setMensagem(
        "Já existe um cliente cadastrado com esse CPF."
      );
      return;
    }

    const agora = new Date().toLocaleString("pt-BR");
    const antigo = clientes.find(
      (item) => item.id === editandoId
    );

    const cliente: Cliente = {
      id: editandoId || crypto.randomUUID(),

      convenioEstado: form.convenioEstado,
      convenioOrgao: form.convenioOrgao.trim(),
      produto: form.produto,
      matricula: form.matricula.trim(),
      cargo: form.cargo.trim(),
      salario: converterNumero(form.salario),
      senhaPortal: form.senhaPortal,
      senhaContracheque: form.senhaContracheque,

      nome: form.nome.trim(),
      cpf: cpfLimpo,
      nascimento: form.nascimento,
      sexo: form.sexo,
      estadoCivil: form.estadoCivil,
      nacionalidade: form.nacionalidade.trim(),
      naturalidade: form.naturalidade.trim(),
      rg: form.rg.trim(),
      orgaoEmissor: form.orgaoEmissor.trim(),
      ufEmissor: form.ufEmissor,
      dataEmissaoRg: form.dataEmissaoRg,
      nomeMae: form.nomeMae.trim(),
      nomePai: form.nomePai.trim(),

      telefone: apenasNumeros(form.telefone),
      email: form.email.trim().toLowerCase(),

      cep: apenasNumeros(form.cep),
      logradouro: form.logradouro.trim(),
      numeroEndereco: form.numeroEndereco.trim(),
      complemento: form.complemento.trim(),
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado,

      banco: form.banco.trim(),
      agencia: form.agencia.trim(),
      conta: form.conta.trim(),
      digitoConta: form.digitoConta.trim(),
      tipoConta: form.tipoConta,
      titularConta:
        form.titularConta.trim() || form.nome.trim(),

      consultora: form.consultora.trim(),
      status: form.status,
      observacoes: form.observacoes.trim(),
      documentos: form.documentos,

      criadoEm: antigo?.criadoEm || agora,
      atualizadoEm: agora,
    };

    const atualizados = editandoId
      ? clientes.map((item) =>
          item.id === editandoId ? cliente : item
        )
      : [cliente, ...clientes];

    if (!persistir(atualizados)) {
      return;
    }

    const estavaEditando = Boolean(editandoId);

    setForm(criarFormularioVazio());
    setEditandoId(null);
    setMostrarSenha(false);
    setMostrarSenhaContracheque(false);

    setMensagem(
      estavaEditando
        ? "Cliente atualizado com sucesso."
        : "Cliente cadastrado com sucesso."
    );
  }

  function editar(cliente: Cliente) {
    setEditandoId(cliente.id);
    setForm(formularioDoCliente(cliente));
    setDetalhe(null);
    setMostrarSenha(false);
    setMostrarSenhaContracheque(false);
    setMensagem("Editando cliente selecionado.");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function excluir(id: string) {
    const confirmar = window.confirm(
      "Deseja realmente excluir este cliente?"
    );

    if (!confirmar) return;

    persistir(
      clientes.filter((item) => item.id !== id)
    );

    setDetalhe(null);

    if (editandoId === id) {
      setEditandoId(null);
      setForm(criarFormularioVazio());
    }
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(criarFormularioVazio());
    setMensagem("");
    setMostrarSenha(false);
    setMostrarSenhaContracheque(false);
  }

  function propostasDoCliente(cliente: Cliente) {
    const cpf = apenasNumeros(cliente.cpf);

    return propostas.filter((proposta) => {
      if (cpf && proposta.cpf === cpf) {
        return true;
      }

      return (
        !cpf &&
        proposta.cliente.trim().toLowerCase() ===
          cliente.nome.trim().toLowerCase()
      );
    });
  }

  function abrirDetalhe(cliente: Cliente) {
    setDetalhe(cliente);
    setMostrarSenhaDetalhe(false);
    setMostrarSenhaContrachequeDetalhe(false);
  }

  async function anexarDocumentos(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const arquivos = Array.from(
      event.target.files || []
    );

    event.target.value = "";

    if (!arquivos.length) return;

    const quantidadeDisponivel =
      4 - form.documentos.length;

    if (quantidadeDisponivel <= 0) {
      setMensagem(
        "O limite é de 4 documentos por cliente."
      );
      return;
    }

    const selecionados = arquivos.slice(
      0,
      quantidadeDisponivel
    );

    const muitoGrandes = selecionados.filter(
      (arquivo) => arquivo.size > 1024 * 1024
    );

    if (muitoGrandes.length) {
      setMensagem(
        "Cada documento deve ter no máximo 1 MB."
      );
      return;
    }

    try {
      const novosDocumentos =
        await Promise.all(
          selecionados.map(
            (arquivo) =>
              new Promise<DocumentoCliente>(
                (resolve, reject) => {
                  const leitor = new FileReader();

                  leitor.onload = () => {
                    if (
                      typeof leitor.result !== "string"
                    ) {
                      reject(
                        new Error(
                          "Formato não suportado."
                        )
                      );
                      return;
                    }

                    resolve({
                      id: crypto.randomUUID(),
                      nome: arquivo.name,
                      mimeType:
                        arquivo.type ||
                        "application/octet-stream",
                      tamanho: arquivo.size,
                      dados: leitor.result,
                    });
                  };

                  leitor.onerror = () =>
                    reject(
                      new Error(
                        "Falha ao ler documento."
                      )
                    );

                  leitor.readAsDataURL(arquivo);
                }
              )
          )
        );

      setForm({
        ...form,
        documentos: [
          ...form.documentos,
          ...novosDocumentos,
        ],
      });

      setMensagem(
        `${novosDocumentos.length} documento(s) anexado(s).`
      );
    } catch {
      setMensagem(
        "Não foi possível anexar o documento."
      );
    }
  }

  function removerDocumento(id: string) {
    setForm({
      ...form,
      documentos: form.documentos.filter(
        (documento) => documento.id !== id
      ),
    });
  }

  function abrirDocumento(
    documento: DocumentoCliente
  ) {
    window.open(
      documento.dados,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const propostasDetalhe = detalhe
    ? propostasDoCliente(detalhe)
    : [];

  const valorTotalDetalhe =
    propostasDetalhe.reduce(
      (total, item) =>
        total + Number(item.valorContrato || 0),
      0
    );

  return (
    <div className="client-page">
      <section className="client-summary">
        <article>
          <span>Total de clientes</span>
          <strong>{resumo.total}</strong>
        </article>

        <article>
          <span>Ativos</span>
          <strong>{resumo.ativos}</strong>
        </article>

        <article>
          <span>Em negociação</span>
          <strong>{resumo.negociacao}</strong>
        </article>

        <article>
          <span>Aguardando retorno</span>
          <strong>{resumo.retorno}</strong>
        </article>

        <article className="client-summary-final">
          <span>Finalizados</span>
          <strong>{resumo.finalizados}</strong>
        </article>
      </section>

      <section className="client-layout">
        <form
          className="client-form"
          onSubmit={salvar}
        >
          <div className="client-form-heading">
            <div>
              <span>
                {editandoId
                  ? "EDITAR CLIENTE"
                  : "NOVO CLIENTE"}
              </span>

              <h2>
                {editandoId
                  ? "Atualizar cadastro"
                  : "Cadastrar cliente"}
              </h2>

              <p>
                Dados completos para atendimento,
                análise e formalização.
              </p>
            </div>

            <div className="client-form-badge">
              +
            </div>
          </div>

          <section className="client-section">
            <div className="client-section-title">
              <span>01</span>

              <div>
                <strong>
                  Convênio e dados funcionais
                </strong>

                <small>
                  Estado, órgão, produto e vínculo.
                </small>
              </div>
            </div>

            <div className="client-form-grid">
              <label>
                Estado do convênio

                <select
                  value={form.convenioEstado}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      convenioEstado:
                        event.target.value,
                    })
                  }
                >
                  <option value="">
                    Selecione
                  </option>

                  {ESTADOS_BRASIL.map(
                    ([uf, nome]) => (
                      <option
                        key={uf}
                        value={nome}
                      >
                        {nome}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Convênio / órgão

                <input
                  value={form.convenioOrgao}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      convenioOrgao:
                        event.target.value,
                    })
                  }
                  placeholder="Ex.: Governo SP"
                />
              </label>

              <label>
                Modalidade / produto

                <select
                  value={form.produto}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      produto: event.target.value,
                    })
                  }
                >
                  {PRODUTOS.map((produto) => (
                    <option key={produto}>
                      {produto}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Matrícula

                <input
                  value={form.matricula}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      matricula:
                        event.target.value,
                    })
                  }
                  placeholder="Matrícula funcional"
                />
              </label>

              <label>
                Cargo

                <input
                  value={form.cargo}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cargo: event.target.value,
                    })
                  }
                  placeholder="Cargo do cliente"
                />
              </label>

              <label>
                Salário

                <input
                  value={form.salario}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      salario: event.target.value,
                    })
                  }
                  placeholder="Ex.: 3.500,00"
                  inputMode="decimal"
                />
              </label>

              <label>
                Senha do portal

                <div className="client-password-wrap">
                  <input
                    type={
                      mostrarSenha
                        ? "text"
                        : "password"
                    }
                    value={form.senhaPortal}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        senhaPortal:
                          event.target.value,
                      })
                    }
                    placeholder="Senha do portal"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarSenha(
                        !mostrarSenha
                      )
                    }
                  >
                    {mostrarSenha
                      ? "Ocultar"
                      : "Mostrar"}
                  </button>
                </div>
              </label>

              <label>
                Senha do contracheque

                <div className="client-password-wrap">
                  <input
                    type={
                      mostrarSenhaContracheque
                        ? "text"
                        : "password"
                    }
                    value={form.senhaContracheque}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        senhaContracheque:
                          event.target.value,
                      })
                    }
                    placeholder="Senha do contracheque"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarSenhaContracheque(
                        !mostrarSenhaContracheque
                      )
                    }
                  >
                    {mostrarSenhaContracheque
                      ? "Ocultar"
                      : "Mostrar"}
                  </button>
                </div>
              </label>
            </div>

            <div className="client-security-warning">
              As senhas estão sendo salvas apenas
              neste navegador. Não use o sistema com
              dados reais antes da migração para o
              banco seguro.
            </div>
          </section>

          <section className="client-section">
            <div className="client-section-title">
              <span>02</span>

              <div>
                <strong>Dados pessoais</strong>

                <small>
                  Identificação e filiação.
                </small>
              </div>
            </div>

            <div className="client-form-grid">
              <label>
                Nome completo

                <input
                  value={form.nome}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      nome: event.target.value,
                    })
                  }
                  placeholder="Digite o nome completo"
                />
              </label>

              <label>
                CPF

                <input
                  value={form.cpf}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cpf: formatarCpf(
                        event.target.value
                      ),
                    })
                  }
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </label>

              <label>
                Data de nascimento

                <input
                  type="date"
                  value={form.nascimento}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      nascimento:
                        event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Idade

                <input
                  value={
                    calcularIdade(
                      form.nascimento
                    ) || ""
                  }
                  placeholder="Automática"
                  readOnly
                />
              </label>

              <label>
                Sexo

                <select
                  value={form.sexo}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      sexo: event.target.value,
                    })
                  }
                >
                  <option value="">
                    Selecione
                  </option>
                  <option>Feminino</option>
                  <option>Masculino</option>
                  <option>Outro</option>
                  <option>
                    Prefere não informar
                  </option>
                </select>
              </label>

              <label>
                Estado civil

                <select
                  value={form.estadoCivil}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      estadoCivil:
                        event.target.value,
                    })
                  }
                >
                  <option value="">
                    Selecione
                  </option>
                  <option>Solteiro(a)</option>
                  <option>Casado(a)</option>
                  <option>Divorciado(a)</option>
                  <option>Viúvo(a)</option>
                  <option>União estável</option>
                </select>
              </label>

              <label>
                Nacionalidade

                <input
                  value={form.nacionalidade}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      nacionalidade:
                        event.target.value,
                    })
                  }
                  placeholder="Ex.: Brasileira"
                />
              </label>

              <label>
                Naturalidade

                <input
                  value={form.naturalidade}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      naturalidade:
                        event.target.value,
                    })
                  }
                  placeholder="Cidade de nascimento"
                />
              </label>

              <label>
                RG

                <input
                  value={form.rg}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      rg: event.target.value,
                    })
                  }
                  placeholder="Número do RG"
                />
              </label>

              <label>
                Órgão emissor

                <input
                  value={form.orgaoEmissor}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      orgaoEmissor:
                        event.target.value,
                    })
                  }
                  placeholder="Ex.: SSP"
                />
              </label>

              <label>
                UF do RG

                <select
                  value={form.ufEmissor}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      ufEmissor:
                        event.target.value,
                    })
                  }
                >
                  <option value="">
                    Selecione
                  </option>

                  {ESTADOS_BRASIL.map(
                    ([uf]) => (
                      <option
                        key={uf}
                        value={uf}
                      >
                        {uf}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Data de emissão do RG

                <input
                  type="date"
                  value={form.dataEmissaoRg}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      dataEmissaoRg:
                        event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Nome da mãe

                <input
                  value={form.nomeMae}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      nomeMae:
                        event.target.value,
                    })
                  }
                  placeholder="Nome completo"
                />
              </label>

              <label>
                Nome do pai

                <input
                  value={form.nomePai}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      nomePai:
                        event.target.value,
                    })
                  }
                  placeholder="Nome completo"
                />
              </label>
            </div>
          </section>

          <section className="client-section">
            <div className="client-section-title">
              <span>03</span>

              <div>
                <strong>Contato e endereço</strong>

                <small>
                  Um telefone, um e-mail e endereço
                  completo.
                </small>
              </div>
            </div>

            <div className="client-form-grid">
              <label>
                Telefone / WhatsApp

                <input
                  value={form.telefone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      telefone:
                        formatarTelefone(
                          event.target.value
                        ),
                    })
                  }
                  placeholder="(62) 99999-9999"
                  inputMode="numeric"
                />
              </label>

              <label>
                E-mail

                <input
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                  placeholder="cliente@email.com"
                  type="email"
                />
              </label>

              <label>
                CEP

                <input
                  value={form.cep}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cep: formatarCep(
                        event.target.value
                      ),
                    })
                  }
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              </label>

              <label>
                Logradouro

                <input
                  value={form.logradouro}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      logradouro:
                        event.target.value,
                    })
                  }
                  placeholder="Rua ou avenida"
                />
              </label>

              <label>
                Número

                <input
                  value={form.numeroEndereco}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      numeroEndereco:
                        event.target.value,
                    })
                  }
                  placeholder="Número"
                />
              </label>

              <label>
                Complemento

                <input
                  value={form.complemento}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      complemento:
                        event.target.value,
                    })
                  }
                  placeholder="Casa, apto, bloco..."
                />
              </label>

              <label>
                Bairro

                <input
                  value={form.bairro}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      bairro:
                        event.target.value,
                    })
                  }
                  placeholder="Bairro"
                />
              </label>

              <label>
                Cidade

                <input
                  value={form.cidade}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cidade:
                        event.target.value,
                    })
                  }
                  placeholder="Cidade"
                />
              </label>

              <label>
                Estado

                <select
                  value={form.estado}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      estado:
                        event.target.value,
                    })
                  }
                >
                  <option value="">
                    Selecione
                  </option>

                  {ESTADOS_BRASIL.map(
                    ([uf, nome]) => (
                      <option
                        key={uf}
                        value={uf}
                      >
                        {uf} — {nome}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
          </section>

          <section className="client-section">
            <div className="client-section-title">
              <span>04</span>

              <div>
                <strong>Dados bancários</strong>

                <small>
                  Uma única conta para recebimento.
                </small>
              </div>
            </div>

            <div className="client-form-grid">
              <label>
                Banco

                <input
                  value={form.banco}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      banco: event.target.value,
                    })
                  }
                  placeholder="Nome ou código do banco"
                />
              </label>

              <label>
                Agência

                <input
                  value={form.agencia}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      agencia:
                        event.target.value,
                    })
                  }
                  placeholder="Agência"
                />
              </label>

              <label>
                Conta

                <input
                  value={form.conta}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      conta: event.target.value,
                    })
                  }
                  placeholder="Número da conta"
                />
              </label>

              <label>
                Dígito

                <input
                  value={form.digitoConta}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      digitoConta:
                        event.target.value,
                    })
                  }
                  placeholder="Dígito"
                />
              </label>

              <label>
                Tipo de conta

                <select
                  value={form.tipoConta}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      tipoConta:
                        event.target.value,
                    })
                  }
                >
                  <option>Conta corrente</option>
                  <option>Conta poupança</option>
                  <option>Conta salário</option>
                  <option>Conta digital</option>
                </select>
              </label>

              <label>
                Titular da conta

                <input
                  value={form.titularConta}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      titularConta:
                        event.target.value,
                    })
                  }
                  placeholder="Nome do titular"
                />
              </label>
            </div>
          </section>

          <section className="client-section">
            <div className="client-section-title">
              <span>05</span>

              <div>
                <strong>
                  Atendimento e documentos
                </strong>

                <small>
                  Responsável, status, observações e
                  anexos.
                </small>
              </div>
            </div>

            <div className="client-form-grid">
              <label>
                Consultora responsável

                <input
                  value={form.consultora}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      consultora:
                        event.target.value,
                    })
                  }
                  placeholder="Nome da consultora"
                />
              </label>

              <label>
                Status do cliente

                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status:
                        event.target.value,
                    })
                  }
                >
                  {STATUS_CLIENTE.map(
                    (status) => (
                      <option key={status}>
                        {status}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <label className="client-observations">
              Observações

              <textarea
                value={form.observacoes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    observacoes:
                      event.target.value,
                  })
                }
                placeholder="Informações importantes sobre o atendimento"
              />
            </label>

            <div className="client-documents">
              <div className="client-documents-heading">
                <div>
                  <strong>
                    Documentação do cliente
                  </strong>

                  <span>
                    PDF, JPG ou PNG • máximo de 1 MB
                    por arquivo • até 4 documentos
                  </span>
                </div>

                <label className="client-upload-button">
                  Anexar documentos

                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    multiple
                    onChange={anexarDocumentos}
                  />
                </label>
              </div>

              {!form.documentos.length ? (
                <div className="client-documents-empty">
                  Nenhum documento anexado.
                </div>
              ) : (
                <div className="client-document-list">
                  {form.documentos.map(
                    (documento) => (
                      <article
                        key={documento.id}
                      >
                        <div>
                          <strong>
                            {documento.nome}
                          </strong>

                          <span>
                            {(
                              documento.tamanho /
                              1024
                            ).toFixed(0)}{" "}
                            KB
                          </span>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              abrirDocumento(
                                documento
                              )
                            }
                          >
                            Abrir
                          </button>

                          <button
                            type="button"
                            className="delete"
                            onClick={() =>
                              removerDocumento(
                                documento.id
                              )
                            }
                          >
                            Remover
                          </button>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </div>
          </section>

          {mensagem && (
            <div className="client-message">
              {mensagem}
            </div>
          )}

          <div className="client-actions">
            {editandoId && (
              <button
                type="button"
                className="cancel"
                onClick={cancelarEdicao}
              >
                Cancelar edição
              </button>
            )}

            <button
              type="submit"
              className="save"
            >
              {editandoId
                ? "Atualizar cliente"
                : "Salvar cliente"}
            </button>
          </div>
        </form>

        <section className="client-list-card">
          <div className="client-list-heading">
            <div>
              <span>CARTEIRA DE CLIENTES</span>
              <h2>Clientes cadastrados</h2>
            </div>

            <b>{filtrados.length}</b>
          </div>

          <div className="client-filters">
            <input
              value={busca}
              onChange={(event) =>
                setBusca(event.target.value)
              }
              placeholder="Pesquisar nome, CPF, telefone, banco, convênio ou consultora"
            />

            <select
              value={filtroStatus}
              onChange={(event) =>
                setFiltroStatus(
                  event.target.value
                )
              }
            >
              <option>Todos</option>

              {STATUS_CLIENTE.map((status) => (
                <option key={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {filtrados.length === 0 ? (
            <div className="client-empty">
              <div>♙</div>

              <strong>
                Nenhum cliente encontrado
              </strong>

              <p>
                Cadastre o primeiro cliente ou altere
                os filtros.
              </p>
            </div>
          ) : (
            <div className="client-list">
              {filtrados.map((cliente) => {
                const quantidadePropostas =
                  propostasDoCliente(cliente).length;

                return (
                  <article key={cliente.id}>
                    <div className="client-item-top">
                      <div>
                        <strong>
                          {cliente.nome}
                        </strong>

                        <span>
                          {cliente.cpf
                            ? formatarCpf(
                                cliente.cpf
                              )
                            : "CPF não informado"}
                        </span>
                      </div>

                      <span
                        className={`client-status status-${cliente.status
                          .toLowerCase()
                          .replace(/\s/g, "-")
                          .normalize("NFD")
                          .replace(
                            /[\u0300-\u036f]/g,
                            ""
                          )}`}
                      >
                        {cliente.status}
                      </span>
                    </div>

                    <div className="client-tags">
                      <span>
                        {cliente.produto}
                      </span>

                      {cliente.convenioEstado && (
                        <span>
                          {cliente.convenioEstado}
                        </span>
                      )}

                      {cliente.banco && (
                        <span>{cliente.banco}</span>
                      )}
                    </div>

                    <div className="client-values">
                      <div>
                        <small>Consultora</small>

                        <b>
                          {cliente.consultora ||
                            "Não informada"}
                        </b>
                      </div>

                      <div>
                        <small>Telefone</small>

                        <b>
                          {cliente.telefone
                            ? formatarTelefone(
                                cliente.telefone
                              )
                            : "Não informado"}
                        </b>
                      </div>

                      <div>
                        <small>Propostas</small>
                        <b>{quantidadePropostas}</b>
                      </div>
                    </div>

                    <footer>
                      <span>
                        Atualizado em{" "}
                        {cliente.atualizadoEm}
                      </span>

                      <div>
                        <button
                          onClick={() =>
                            abrirDetalhe(cliente)
                          }
                        >
                          Abrir
                        </button>

                        <button
                          onClick={() =>
                            editar(cliente)
                          }
                        >
                          Editar
                        </button>

                        <button
                          className="delete"
                          onClick={() =>
                            excluir(cliente.id)
                          }
                        >
                          Excluir
                        </button>
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <section className="client-help">
        <strong>Integração ativa:</strong>

        <span>
          o sistema encontra automaticamente as
          propostas vinculadas ao mesmo CPF.
        </span>
      </section>

      {detalhe && (
        <div
          className="client-modal-overlay"
          onClick={() => setDetalhe(null)}
        >
          <section
            className="client-modal client-modal-complete"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <header>
              <div>
                <span>FICHA COMPLETA DO CLIENTE</span>
                <h3>{detalhe.nome}</h3>
              </div>

              <button
                onClick={() => setDetalhe(null)}
              >
                ×
              </button>
            </header>

            <section className="client-modal-section">
              <h4>
                Convênio e dados funcionais
              </h4>

              <div className="client-modal-grid">
                <div>
                  <span>Estado do convênio</span>
                  <strong>
                    {detalhe.convenioEstado ||
                      "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Convênio / órgão</span>
                  <strong>
                    {detalhe.convenioOrgao ||
                      "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Modalidade</span>
                  <strong>{detalhe.produto}</strong>
                </div>

                <div>
                  <span>Matrícula</span>
                  <strong>
                    {detalhe.matricula ||
                      "Não informada"}
                  </strong>
                </div>

                <div>
                  <span>Cargo</span>
                  <strong>
                    {detalhe.cargo ||
                      "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Salário</span>
                  <strong>
                    {detalhe.salario
                      ? moeda(detalhe.salario)
                      : "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Senha do portal</span>

                  <strong>
                    {!detalhe.senhaPortal
                      ? "Não informada"
                      : mostrarSenhaDetalhe
                        ? detalhe.senhaPortal
                        : "••••••••"}
                  </strong>

                  {detalhe.senhaPortal && (
                    <button
                      type="button"
                      className="client-inline-button"
                      onClick={() =>
                        setMostrarSenhaDetalhe(
                          !mostrarSenhaDetalhe
                        )
                      }
                    >
                      {mostrarSenhaDetalhe
                        ? "Ocultar"
                        : "Mostrar"}
                    </button>
                  )}
                </div>

                <div>
                  <span>Senha do contracheque</span>

                  <strong>
                    {!detalhe.senhaContracheque
                      ? "Não informada"
                      : mostrarSenhaContrachequeDetalhe
                        ? detalhe.senhaContracheque
                        : "••••••••"}
                  </strong>

                  {detalhe.senhaContracheque && (
                    <button
                      type="button"
                      className="client-inline-button"
                      onClick={() =>
                        setMostrarSenhaContrachequeDetalhe(
                          !mostrarSenhaContrachequeDetalhe
                        )
                      }
                    >
                      {mostrarSenhaContrachequeDetalhe
                        ? "Ocultar"
                        : "Mostrar"}
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="client-modal-section">
              <h4>Dados pessoais</h4>

              <div className="client-modal-grid">
                <div>
                  <span>CPF</span>
                  <strong>
                    {detalhe.cpf
                      ? formatarCpf(detalhe.cpf)
                      : "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Nascimento / idade</span>
                  <strong>
                    {detalhe.nascimento
                      ? `${detalhe.nascimento} • ${calcularIdade(
                          detalhe.nascimento
                        )} anos`
                      : "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Sexo</span>
                  <strong>
                    {detalhe.sexo ||
                      "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Estado civil</span>
                  <strong>
                    {detalhe.estadoCivil ||
                      "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Nacionalidade</span>
                  <strong>
                    {detalhe.nacionalidade ||
                      "Não informada"}
                  </strong>
                </div>

                <div>
                  <span>Naturalidade</span>
                  <strong>
                    {detalhe.naturalidade ||
                      "Não informada"}
                  </strong>
                </div>

                <div>
                  <span>RG</span>
                  <strong>
                    {detalhe.rg || "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Órgão / UF</span>
                  <strong>
                    {[
                      detalhe.orgaoEmissor,
                      detalhe.ufEmissor,
                    ]
                      .filter(Boolean)
                      .join(" / ") ||
                      "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Data de emissão</span>
                  <strong>
                    {detalhe.dataEmissaoRg ||
                      "Não informada"}
                  </strong>
                </div>

                <div>
                  <span>Nome da mãe</span>
                  <strong>
                    {detalhe.nomeMae ||
                      "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Nome do pai</span>
                  <strong>
                    {detalhe.nomePai ||
                      "Não informado"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="client-modal-section">
              <h4>Contato e endereço</h4>

              <div className="client-modal-grid">
                <div>
                  <span>Telefone</span>
                  <strong>
                    {detalhe.telefone
                      ? formatarTelefone(
                          detalhe.telefone
                        )
                      : "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>E-mail</span>
                  <strong>
                    {detalhe.email ||
                      "Não informado"}
                  </strong>
                </div>

                <div className="client-modal-wide">
                  <span>Endereço</span>
                  <strong>
                    {[
                      detalhe.logradouro,
                      detalhe.numeroEndereco,
                      detalhe.complemento,
                      detalhe.bairro,
                      detalhe.cidade,
                      detalhe.estado,
                      detalhe.cep
                        ? `CEP ${formatarCep(
                            detalhe.cep
                          )}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" • ") ||
                      "Não informado"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="client-modal-section">
              <h4>Dados bancários</h4>

              <div className="client-modal-grid">
                <div>
                  <span>Banco</span>
                  <strong>
                    {detalhe.banco ||
                      "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Agência</span>
                  <strong>
                    {detalhe.agencia ||
                      "Não informada"}
                  </strong>
                </div>

                <div>
                  <span>Conta</span>
                  <strong>
                    {detalhe.conta
                      ? `${detalhe.conta}${
                          detalhe.digitoConta
                            ? `-${detalhe.digitoConta}`
                            : ""
                        }`
                      : "Não informada"}
                  </strong>
                </div>

                <div>
                  <span>Tipo</span>
                  <strong>
                    {detalhe.tipoConta ||
                      "Não informado"}
                  </strong>
                </div>

                <div>
                  <span>Titular</span>
                  <strong>
                    {detalhe.titularConta ||
                      "Não informado"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="client-history-summary">
              <article>
                <span>Propostas vinculadas</span>
                <strong>
                  {propostasDetalhe.length}
                </strong>
              </article>

              <article>
                <span>
                  Valor total dos contratos
                </span>

                <strong>
                  {moeda(valorTotalDetalhe)}
                </strong>
              </article>

              <article>
                <span>Contratos pagos</span>

                <strong>
                  {
                    propostasDetalhe.filter(
                      (item) =>
                        item.status === "Pago"
                    ).length
                  }
                </strong>
              </article>
            </section>

            {detalhe.documentos.length > 0 && (
              <section className="client-modal-section">
                <h4>Documentos anexados</h4>

                <div className="client-modal-documents">
                  {detalhe.documentos.map(
                    (documento) => (
                      <button
                        type="button"
                        key={documento.id}
                        onClick={() =>
                          abrirDocumento(documento)
                        }
                      >
                        <span>{documento.nome}</span>
                        <b>Abrir</b>
                      </button>
                    )
                  )}
                </div>
              </section>
            )}

            {propostasDetalhe.length > 0 && (
              <section className="client-history">
                <h4>Histórico de propostas</h4>

                {propostasDetalhe.map(
                  (proposta) => (
                    <article key={proposta.id}>
                      <div>
                        <strong>
                          {proposta.banco ||
                            "Banco não informado"}

                          {proposta.tabela
                            ? ` • ${proposta.tabela}`
                            : ""}
                        </strong>

                        <span>
                          {proposta.status} •{" "}
                          {proposta.dataCadastro}
                        </span>
                      </div>

                      <b>
                        {moeda(
                          proposta.valorContrato
                        )}
                      </b>
                    </article>
                  )
                )}
              </section>
            )}

            {detalhe.observacoes && (
              <section className="client-modal-note">
                <span>Observações</span>
                <p>{detalhe.observacoes}</p>
              </section>
            )}

            <footer>
              <button
                onClick={() => editar(detalhe)}
              >
                Editar cadastro
              </button>

              <button
                onClick={() => setDetalhe(null)}
              >
                Fechar
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
