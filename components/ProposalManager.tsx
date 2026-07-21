"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import "./propostas.css";

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
  nome: string;
  percentual: number;
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
  encontradas?: number;
  importadas?: number;
  atualizadas?: number;
  ignoradas?: number;
  falhas?: number;
  detalhesFalhas?: Array<{
    id?: string;
    cliente?: string;
    erro?: string;
  }>;
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

const TABELAS_COMPRA_DIVIDA: TabelaCompraDivida[] = [
  { nome: "NEO NORMAL", percentual: 100 },
  { nome: "NEO FLEX 1", percentual: 82 },
  { nome: "NEO FLEX 2", percentual: 67 },
  { nome: "NEO FLEX 4", percentual: 37 },
  { nome: "NEO FLEX 5", percentual: 17 },
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
  observacao: "",
};

function numero(valor: string) {
  const limpo = valor
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const convertido = Number(limpo);

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

function percentualDaTabela(tabela: string, percentualSalvo: unknown) {
  const tabelaEncontrada = tabelaPeloNome(tabela);

  if (tabelaEncontrada) {
    return tabelaEncontrada.percentual;
  }

  const percentualNoNome = String(tabela || "").match(/(\d+(?:[.,]\d+)?)\s*%/);

  if (percentualNoNome) {
    const percentual = Number(percentualNoNome[1].replace(",", "."));

    if (Number.isFinite(percentual)) {
      return percentual;
    }
  }

  const percentual = Number(percentualSalvo || 0);

  const permitido = TABELAS_COMPRA_DIVIDA.some(
    (item) => Math.abs(item.percentual - percentual) < 0.01,
  );

  return permitido ? percentual : 0;
}

function nomeLimpoDaTabela(tabela: string) {
  return (
    tabelaPeloNome(tabela)?.nome ||
    String(tabela || "")
      .replace(/\s*[-–—]\s*\d+(?:[.,]\d+)?\s*%/g, "")
      .trim()
  );
}

function normalizarProposta(
  item: Partial<Proposta> & Record<string, unknown>,
): Proposta {
  const valorContrato = Number(item.valorContrato ?? item.valorOperacao ?? 0);

  const tabela = nomeLimpoDaTabela(String(item.tabela || ""));

  const percentualTabela = percentualDaTabela(
    String(item.tabela || ""),
    item.percentualTabela,
  );

  const valorMeta =
    Number.isFinite(valorContrato) && percentualTabela > 0
      ? valorContrato * (percentualTabela / 100)
      : 0;

  return {
    id: String(item.id || crypto.randomUUID()),
    clienteId: String(item.clienteId || ""),
    cliente: String(item.cliente || ""),
    cpf: apenasNumeros(String(item.cpf || "")),
    telefone: apenasNumeros(String(item.telefone || "")),
    vendedora: String(item.vendedora || item.consultora || ""),
    banco: String(item.banco || ""),
    tabela,
    percentualTabela,
    valorContrato: Number.isFinite(valorContrato) ? valorContrato : 0,
    valorMeta,

    // Valores antigos são zerados para não serem confundidos com premiação.
    comissao: 0,
    premiacao: 0,

    status: STATUS.includes(item.status as StatusProposta)
      ? (item.status as StatusProposta)
      : "Solicitado",
    dataCadastro: String(item.dataCadastro || ""),
    dataPagamento: String(item.dataPagamento || ""),
    observacao: String(item.observacao || item.observacoes || ""),
  };
}

function perfilEhConsultora(perfil: string) {
  return normalizarTexto(perfil).includes("consultor");
}

function nomesCorrespondem(nomeA: string, nomeB: string) {
  const a = normalizarTexto(nomeA);
  const b = normalizarTexto(nomeB);

  if (!a || !b) return false;
  if (a === b) return true;

  const menor = a.length <= b.length ? a : b;
  const maior = a.length > b.length ? a : b;

  return menor.length >= 5 && maior.includes(menor);
}

function mesclarPorId(principais: Proposta[], adicionais: Proposta[]) {
  const ids = new Set(principais.map((item) => item.id));

  return [
    ...principais,
    ...adicionais.filter((item) => !ids.has(item.id)),
  ];
}

function chaveDuplicidadeProposta(item: Proposta, nomePadrao = "") {
  const responsavel = normalizarTexto(item.vendedora || nomePadrao);
  const identificadorCliente =
    apenasNumeros(item.cpf) || normalizarTexto(item.cliente);
  const valor = Number(item.valorContrato || 0).toFixed(2);
  const data = dataParaInput(item.dataCadastro);
  const tabela = normalizarTexto(item.tabela);

  if (!responsavel || !identificadorCliente || Number(valor) <= 0) return "";

  return `${responsavel}|${identificadorCliente}|${valor}|${data}|${tabela}`;
}

function propostaTemDadosReais(item: Proposta) {
  /*
   * Registros totalmente vazios são ignorados. Se houver cliente preenchido
   * mas faltar outro campo, a proposta permanece pendente para a API informar
   * exatamente o que precisa ser corrigido.
   */
  return Boolean(String(item.cliente || "").trim());
}

export default function ProposalManager() {
  const supabase = useMemo(() => createClient(), []);

  const [propostas, setPropostas] = useState<Proposta[]>([]);

  const [propostasAntigasPendentes, setPropostasAntigasPendentes] = useState<
    Proposta[]
  >([]);

  const [clientes, setClientes] = useState<ClienteCadastrado[]>([]);

  const [consultoras, setConsultoras] = useState<string[]>([]);

  const [perfilAtual, setPerfilAtual] = useState<PerfilAtual | null>(null);

  const [form, setForm] = useState<FormularioProposta>(formularioVazio);

  const [busca, setBusca] = useState("");

  const [filtroStatus, setFiltroStatus] = useState("Todos");

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

  function lerListaLocal(chave: string) {
    const salvo = localStorage.getItem(chave);

    if (!salvo) return [] as Proposta[];

    try {
      const lista = JSON.parse(salvo);

      return Array.isArray(lista)
        ? lista.map((item) => normalizarProposta(item))
        : [];
    } catch {
      return [] as Proposta[];
    }
  }

  function localizarPendentes(
    origem: Proposta[],
    listaSupabase: Proposta[],
    perfil: PerfilAtual,
  ) {
    if (!perfilEhConsultora(perfil.perfil)) return [] as Proposta[];

    const candidatos = origem.filter(
      (item) =>
        propostaTemDadosReais(item) &&
        (!item.vendedora.trim() || nomesCorrespondem(item.vendedora, perfil.nome)),
    );

    const idsSupabase = new Set(listaSupabase.map((item) => item.id));
    const chavesSupabase = new Set(
      listaSupabase
        .map((item) => chaveDuplicidadeProposta(item, perfil.nome))
        .filter(Boolean),
    );
    const idsIncluidos = new Set<string>();
    const chavesIncluidas = new Set<string>();

    return candidatos.filter((item) => {
      const chave = chaveDuplicidadeProposta(item, perfil.nome);

      if (idsSupabase.has(item.id) || idsIncluidos.has(item.id)) return false;
      if (chave && (chavesSupabase.has(chave) || chavesIncluidas.has(chave))) {
        return false;
      }

      idsIncluidos.add(item.id);
      if (chave) chavesIncluidas.add(chave);
      return true;
    });
  }

  async function carregarPropostasDoSupabase() {
    setCarregando(true);

    try {
      /*
       * Esta leitura acontece antes do GET para proteger os registros antigos.
       * Assim, a lista do Supabase nunca sobrescreve o histórico local antes
       * de criarmos o backup e identificarmos o que ainda precisa migrar.
       */
      const listaLocalAtual = lerListaLocal("somos-eleva-propostas");
      const { conteudo, sessao } = await chamarApiPropostas("GET");
      const perfil = conteudo.perfil || null;
      const listaSupabase = Array.isArray(conteudo.propostas)
        ? conteudo.propostas.map(normalizarProposta)
        : [];

      setPerfilAtual(perfil);

      if (perfil && perfilEhConsultora(perfil.perfil)) {
        setForm((atual) => ({
          ...atual,
          vendedora: perfil.nome,
        }));
      }

      let pendentes: Proposta[] = [];

      if (perfil) {
        const chaveBackup = `somos-eleva-propostas-backup-migracao-v2-${sessao.user.id}`;
        const chaveImportacao = `somos-eleva-propostas-importadas-supabase-v2-${sessao.user.id}`;
        const backupExistente = lerListaLocal(chaveBackup);
        const origemCompleta = mesclarPorId(listaLocalAtual, backupExistente);
        const registrosComDados = origemCompleta.filter(propostaTemDadosReais);

        if (registrosComDados.length) {
          localStorage.setItem(chaveBackup, JSON.stringify(registrosComDados));
        }

        const importacaoConcluida =
          localStorage.getItem(chaveImportacao) === "sim";

        if (!importacaoConcluida) {
          pendentes = localizarPendentes(
            registrosComDados,
            listaSupabase,
            perfil,
          );
        }
      }

      setPropostasAntigasPendentes(pendentes);
      setPropostas(mesclarPorId(listaSupabase, pendentes));

      /*
       * Só atualizamos a cópia local quando não existem itens pendentes.
       * Enquanto houver histórico a migrar, a chave original fica preservada.
       */
      if (!pendentes.length) {
        localStorage.setItem(
          "somos-eleva-propostas",
          JSON.stringify(listaSupabase),
        );
      }
    } catch (erro) {
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
    void carregarPropostasDoSupabase();
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

  const idsPendentes = useMemo(
    () => new Set(propostasAntigasPendentes.map((item) => item.id)),
    [propostasAntigasPendentes],
  );

  async function sincronizarPropostasAntigas() {
    if (!propostasAntigasPendentes.length || !perfilAtual) return;

    const confirmar = window.confirm(
      `Encontramos ${propostasAntigasPendentes.length} proposta(s) antiga(s) neste navegador. Confirme somente se elas pertencem à usuária ${perfilAtual.nome}.`,
    );

    if (!confirmar) return;

    setProcessando(true);
    setMensagem("");

    try {
      const { conteudo, sessao } = await chamarApiPropostas("POST", {
        acao: "importar_local",
        propostas: propostasAntigasPendentes,
      });

      const falhas = Number(conteudo.falhas || 0);

      if (falhas === 0) {
        const chaveImportacao = `somos-eleva-propostas-importadas-supabase-v2-${sessao.user.id}`;
        localStorage.setItem(chaveImportacao, "sim");
      }

      await carregarPropostasDoSupabase();

      const detalhes = Array.isArray(conteudo.detalhesFalhas)
        ? conteudo.detalhesFalhas
            .slice(0, 3)
            .map((item) => `${item.cliente || item.id || "Registro"}: ${item.erro || "falha"}`)
            .join(" | ")
        : "";

      setMensagem(
        `${Number(conteudo.encontradas || 0)} encontrada(s) • ${Number(
          conteudo.importadas || 0,
        )} importada(s) • ${Number(
          conteudo.atualizadas || 0,
        )} atualizada(s) • ${Number(
          conteudo.ignoradas || 0,
        )} já existente(s)${falhas ? ` • ${falhas} com falha${detalhes ? ` — ${detalhes}` : ""}` : ""}.`,
      );
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível sincronizar as propostas antigas.",
      );
    } finally {
      setProcessando(false);
    }
  }

  const clienteSelecionado = useMemo(
    () => clientes.find((cliente) => cliente.id === form.clienteId),
    [clientes, form.clienteId],
  );

  const tabelaSelecionada = useMemo(
    () => TABELAS_COMPRA_DIVIDA.find((item) => item.nome === form.tabela),
    [form.tabela],
  );

  const valorContrato = numero(form.valorContrato);

  const percentualTabela = tabelaSelecionada?.percentual || 0;

  const valorMeta = valorContrato * (percentualTabela / 100);

  const propostasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return propostas.filter((proposta) => {
      const correspondeStatus =
        filtroStatus === "Todos" || proposta.status === filtroStatus;

      const correspondeBusca =
        !termo ||
        proposta.cliente.toLowerCase().includes(termo) ||
        proposta.cpf.includes(apenasNumeros(termo)) ||
        proposta.vendedora.toLowerCase().includes(termo) ||
        proposta.banco.toLowerCase().includes(termo) ||
        proposta.tabela.toLowerCase().includes(termo);

      return correspondeStatus && correspondeBusca;
    });
  }, [propostas, busca, filtroStatus]);

  const resumo = useMemo(() => {
    const pagas = propostas.filter((item) => item.status === "Pago");

    const valorPago = pagas.reduce(
      (total, item) => total + Number(item.valorContrato || 0),
      0,
    );

    const producaoValida = pagas.reduce(
      (total, item) => total + Number(item.valorMeta || 0),
      0,
    );

    const emAndamento = propostas.filter(
      (item) => item.status !== "Pago" && item.status !== "Cancelado",
    ).length;

    return {
      total: propostas.length,
      pagas: pagas.length,
      emAndamento,
      valorPago,
      producaoValida,
    };
  }, [propostas]);

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

    const proposta: Proposta = {
      id: editandoId || crypto.randomUUID(),
      clienteId: clienteSelecionado.id,
      cliente: clienteSelecionado.nome,
      cpf: clienteSelecionado.cpf,
      telefone: clienteSelecionado.telefone,
      vendedora: consultoraResponsavel,
      banco: form.banco.trim(),
      tabela: tabelaSelecionada.nome,
      percentualTabela: tabelaSelecionada.percentual,
      valorContrato,
      valorMeta,
      comissao: 0,
      premiacao: 0,
      status: form.status,
      dataCadastro: form.dataDigitacao,
      dataPagamento: form.status === "Pago" ? form.dataPagamento : "",
      observacao: form.observacao.trim(),
    };

    const estavaEditando = Boolean(editandoId);

    setProcessando(true);

    try {
      await chamarApiPropostas(estavaEditando ? "PATCH" : "POST", {
        proposta,
      });

      await carregarPropostasDoSupabase();

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
    if (idsPendentes.has(proposta.id)) {
      setMensagem("Sincronize as propostas antigas antes de editar este contrato.");
      return;
    }

    const cliente = localizarClienteDaProposta(proposta);

    const tabela = tabelaPeloNome(proposta.tabela);

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
    if (idsPendentes.has(id)) {
      setMensagem("Sincronize as propostas antigas antes de excluir este contrato.");
      return;
    }

    const confirmar = window.confirm("Deseja realmente excluir esta proposta?");

    if (!confirmar) return;

    setProcessando(true);
    setMensagem("");

    try {
      await chamarApiPropostas("DELETE", { id });

      await carregarPropostasDoSupabase();

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

  const usuarioEhConsultora = Boolean(
    perfilAtual && perfilEhConsultora(perfilAtual.perfil),
  );

  return (
    <div className="proposal-page">
      {usuarioEhConsultora && propostasAntigasPendentes.length > 0 && (
        <section
          className="proposal-note"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <span>
            <strong>
              {propostasAntigasPendentes.length} proposta(s) antiga(s) encontrada(s).
            </strong>{" "}
            Um backup foi criado neste navegador. Clique para enviar tudo ao
            Supabase sem recadastrar.
          </span>

          <button
            type="button"
            onClick={sincronizarPropostasAntigas}
            disabled={processando}
            style={{
              border: 0,
              borderRadius: 10,
              padding: "12px 18px",
              fontWeight: 800,
              cursor: processando ? "wait" : "pointer",
            }}
          >
            {processando ? "Sincronizando..." : "Sincronizar propostas antigas"}
          </button>
        </section>
      )}

      <section className="proposal-summary">
        <article>
          <span>Total de propostas</span>
          <strong>{resumo.total}</strong>
        </article>

        <article>
          <span>Em andamento</span>
          <strong>{resumo.emAndamento}</strong>
        </article>

        <article>
          <span>Contratos pagos</span>
          <strong>{resumo.pagas}</strong>
        </article>

        <article>
          <span>Valor total pago</span>
          <strong>{moeda(resumo.valorPago)}</strong>
        </article>

        <article className="commission-summary">
          <span>Produção válida paga</span>
          <strong>{moeda(resumo.producaoValida)}</strong>
        </article>
      </section>

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

                {TABELAS_COMPRA_DIVIDA.map((tabela) => (
                  <option key={tabela.nome} value={tabela.nome}>
                    {tabela.nome} — {formatarPercentual(tabela.percentual)}
                  </option>
                ))}
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

          <div className="proposal-filters">
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar cliente, CPF, consultora, banco ou tabela"
            />

            <select
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
            >
              <option>Todos</option>

              {STATUS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

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
            <div className="proposal-list">
              {propostasFiltradas.map((proposta) => {
                const pendente = idsPendentes.has(proposta.id);

                return (
                <article key={proposta.id}>
                  <div className="proposal-item-top">
                    <div>
                      <strong>{proposta.cliente}</strong>

                      <span>
                        {proposta.banco || "Banco não informado"}

                        {proposta.tabela
                          ? ` • ${proposta.tabela} — ${formatarPercentual(
                              proposta.percentualTabela,
                            )}`
                          : ""}
                        {pendente ? " • Aguardando sincronização" : ""}
                      </span>
                    </div>

                    <span
                      className={`status status-${proposta.status
                        .toLowerCase()
                        .replace(/\s/g, "-")
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")}`}
                    >
                      {proposta.status}
                    </span>
                  </div>

                  <div className="proposal-item-values">
                    <div>
                      <small>Contrato</small>

                      <b>{moeda(proposta.valorContrato)}</b>
                    </div>

                    <div>
                      <small>Percentual da tabela</small>

                      <b>{formatarPercentual(proposta.percentualTabela)}</b>
                    </div>

                    <div>
                      <small>Valor para a meta</small>

                      <b>{moeda(proposta.valorMeta)}</b>
                    </div>
                  </div>

                  <div className="proposal-item-footer">
                    <span>
                      {proposta.vendedora || "Consultora não informada"} •
                      Digitado em {formatarData(proposta.dataCadastro)}
                      {proposta.status === "Pago" && proposta.dataPagamento && (
                        <> • Pago em {formatarData(proposta.dataPagamento)}</>
                      )}
                    </span>

                    <div>
                      <button
                        disabled={processando || pendente}
                        onClick={() => editar(proposta)}
                      >
                        Editar
                      </button>

                      <button
                        className="delete"
                        disabled={processando || pendente}
                        onClick={() => void excluir(proposta.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <section className="proposal-note">
        <strong>Como funciona:</strong>

        <span>
          o percentual da tabela define quanto o contrato vale para a meta.
          Exemplo: contrato de R$ 20.000,00 na tabela de 82% vale R$ 16.400,00
          na produção da consultora. A premiação será calculada no Ranking
          depois da soma da Compra de Dívida com as parcelas do CLT.
        </span>
      </section>
    </div>
  );
}
