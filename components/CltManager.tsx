"use client";
// ELEVA | CLT | TABELAS LIVRES + CAMPOS COMPACTOS | 29/10/2026

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

import "./clt.css";
import "./clt-tabelas.css";
import {
  bancosCltCorrespondem,
  ehTabelaClt,
  prazoTabelaCompativel,
  rotuloPrazoTabelaClt,
  rotuloTabelaClt,
  type TabelaCltOpcao,
} from "@/lib/clt/tabelas";

type StatusClt =

  | "Novo lead"

  | "Em análise"

  | "Aguardando documentos"

  | "Digitado"

  | "Aprovado"

  | "Pago"

  | "Cancelado"

  | "Recusado";

type RegistroClt = {

  id: string;

  nome: string;

  cpf: string;

  dataNascimento: string;

  dataPagamento: string;

  telefone: string;

  valorAprovado: number;

  parcela: number;

  prazo: number;

  banco: string;
  tabelaBancoId?: string | null;
  tabela?: string;
  tabelaCodigo?: string;
  tabelaPrazo?: number | null;
  tabelaPrazoInicial?: number | null;
  tabelaPrazoFinal?: number | null;
  tabelaAtiva?: boolean;
  tabelaEncontrada?: boolean;

  consultora: string;

  status: StatusClt;

  criadoEm: string;

  atualizadoEm: string;

};

type FormularioClt = {

  nome: string;

  cpf: string;

  dataNascimento: string;

  dataPagamento: string;

  telefone: string;

  valorAprovado: string;

  parcela: string;

  prazo: string;

  banco: string;
  tabelaBancoId: string;

  consultora: string;

  status: StatusClt;

};

type PerfilAtual = {

  id: string;

  nome: string;

  perfil: string;

};

type BancoConfiguracao = {

  id: string;

  nome: string;

  ativo: boolean;

};

type RespostaClt = {

  registros?: RegistroClt[];

  registro?: RegistroClt;

  perfil?: PerfilAtual;

  mensagem?: string;

  erro?: string;

  encontradas?: number;

  importadas?: number;

  atualizadas?: number;

  ignoradas?: number;

  falhas?: number;

};

const STATUS: StatusClt[] = [

  "Novo lead",

  "Em análise",

  "Aguardando documentos",

  "Digitado",

  "Aprovado",

  "Pago",

  "Cancelado",

  "Recusado",

];

function formularioVazio(): FormularioClt {

  return {

    nome: "",

    cpf: "",

    dataNascimento: "",

    dataPagamento: "",

    telefone: "",

    valorAprovado: "",

parcela: "",

prazo: "",

banco: "",
    tabelaBancoId: "",

    consultora: "",

    status: "Novo lead",

  };

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

function numero(valor: string) {

  const texto = String(valor || "")

    .trim()

    .replace(/[^\d,.-]/g, "");

  if (!texto) return 0;

  let normalizado = texto;

  if (texto.includes(",") && texto.includes(".")) {

    normalizado = texto.replace(/\./g, "").replace(",", ".");

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

function formatarData(data: string) {

  if (!data) return "Não informada";

  const [ano, mes, dia] = data.slice(0, 10).split("-");

  if (!ano || !mes || !dia) return data;

  return `${dia}/${mes}/${ano}`;

}

function normalizarTexto(valor: string) {

  return String(valor || "")

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .trim()

    .toLowerCase();

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

function normalizarRegistro(

  item: Partial<RegistroClt> & Record<string, unknown>,

): RegistroClt {

  return {

    id: String(item.id || crypto.randomUUID()),

    nome: String(item.nome || ""),

    cpf: apenasNumeros(String(item.cpf || "")),

    dataNascimento: String(item.dataNascimento || item.nascimento || "").slice(

      0,

      10,

    ),

    dataPagamento: String(

  item.dataPagamento || ""

).slice(0,10),

    telefone: apenasNumeros(String(item.telefone || "")),

    valorAprovado: Number(item.valorAprovado || 0),

parcela: Number(item.parcela || 0),

prazo: Number(item.prazo || 0),

banco: String(item.banco || ""),
    tabelaBancoId: String(item.tabelaBancoId || item.tabela_banco_id || "") || null,
    tabela: String(item.tabela || ""),
    tabelaCodigo: String(item.tabelaCodigo || ""),
    tabelaPrazo: item.tabelaPrazo == null ? null : Number(item.tabelaPrazo),
    tabelaPrazoInicial:
      item.tabelaPrazoInicial == null
        ? item.tabelaPrazo == null
          ? null
          : Number(item.tabelaPrazo)
        : Number(item.tabelaPrazoInicial),
    tabelaPrazoFinal:
      item.tabelaPrazoFinal == null
        ? item.tabelaPrazo == null
          ? null
          : Number(item.tabelaPrazo)
        : Number(item.tabelaPrazoFinal),
    tabelaAtiva: item.tabelaAtiva === true,
    tabelaEncontrada: item.tabelaEncontrada === true,

    consultora: String(item.consultora || ""),

    status: STATUS.includes(item.status as StatusClt)

      ? (item.status as StatusClt)

      : "Novo lead",

    criadoEm: String(item.criadoEm || ""),

    atualizadoEm: String(item.atualizadoEm || ""),

  };

}

function mesclarPorId(principais: RegistroClt[], adicionais: RegistroClt[]) {

  const ids = new Set(principais.map((item) => item.id));

  return [

    ...principais,

    ...adicionais.filter((item) => !ids.has(item.id)),

  ];

}

function chaveCpf(item: RegistroClt, nomePadrao = "") {

  const cpf = apenasNumeros(item.cpf);

  if (!cpf) return "";

  return `${normalizarTexto(item.consultora || nomePadrao)}|${cpf}`;

}

/*

 * Alguns navegadores antigos possuem linhas de modelo como CLT-001, CLT-002,

 * sem nenhum dado de cliente. Elas não devem aparecer como registros pendentes.

 * Registros parcialmente preenchidos continuam sendo preservados para conferência.

 */

function registroPossuiAlgumDado(item: RegistroClt) {

  return Boolean(

    String(item.nome || "").trim() ||

      apenasNumeros(String(item.cpf || "")) ||

      String(item.dataNascimento || "").trim() ||

      apenasNumeros(String(item.telefone || "")) ||

      Number(item.valorAprovado || 0) > 0 ||

      Number(item.parcela || 0) > 0 ||

Number(item.prazo || 0) > 0 ||

String(item.banco || "").trim(),

  );

}

export default function CltManager() {

  const supabase = useMemo(() => createClient(), []);

  const [registros, setRegistros] = useState<RegistroClt[]>([]);

  const [registrosAntigosPendentes, setRegistrosAntigosPendentes] = useState<

    RegistroClt[]

  >([]);

  const [consultoras, setConsultoras] = useState<string[]>([]);

  const [bancos, setBancos] = useState<BancoConfiguracao[]>([]);
  const [tabelasClt, setTabelasClt] = useState<TabelaCltOpcao[]>([]);
  const [carregandoTabelas, setCarregandoTabelas] = useState(true);
  const [erroTabelas, setErroTabelas] = useState("");
  const [buscaTabela, setBuscaTabela] = useState("");
  const [mostrarSugestoesTabela, setMostrarSugestoesTabela] = useState(false);

  const [perfilAtual, setPerfilAtual] = useState<PerfilAtual | null>(null);

  const [form, setForm] = useState<FormularioClt>(formularioVazio());

  const [busca, setBusca] = useState("");

  const [filtroStatus, setFiltroStatus] = useState("Todos");

  const [filtroConsultora, setFiltroConsultora] = useState("Todas");

  const [filtroBanco, setFiltroBanco] = useState("Todos");

  const [periodo, setPeriodo] = useState<

  "Hoje" | "Este mês" | "Todas" | "Personalizado"

>("Todas");

  const [dataPagamentoInicial, setDataPagamentoInicial] = useState("");

  const [dataPagamentoFinal, setDataPagamentoFinal] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [mensagem, setMensagem] = useState("");

  const [carregando, setCarregando] = useState(true);

  const [processando, setProcessando] = useState(false);

  const [mostrarTodasPropostas, setMostrarTodasPropostas] = useState(false);

  function dataIsoLocal(data: Date) {

    const ano = data.getFullYear();

    const mes = String(data.getMonth() + 1).padStart(2, "0");

    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;

  }

  function aplicarPeriodo(novoPeriodo: "Hoje" | "Este mês" | "Todas") {

    setPeriodo(novoPeriodo);

    const agora = new Date();

    if (novoPeriodo === "Todas") {

      setDataPagamentoInicial("");

      setDataPagamentoFinal("");

      return;

    }

    if (novoPeriodo === "Hoje") {

      const hoje = dataIsoLocal(agora);

      setDataPagamentoInicial(hoje);

      setDataPagamentoFinal(hoje);

      return;

    }

    const inicio = new Date(

      agora.getFullYear(),

      agora.getMonth(),

      1,

    );

    const fim = new Date(

      agora.getFullYear(),

      agora.getMonth() + 1,

      0,

    );

    setDataPagamentoInicial(dataIsoLocal(inicio));

    setDataPagamentoFinal(dataIsoLocal(fim));

  }

  function formularioLimpo(perfil = perfilAtual): FormularioClt {

    return {

      ...formularioVazio(),

      consultora:

        perfil && perfilEhConsultora(perfil.perfil) ? perfil.nome : "",

    };

  }

  async function obterSessaoAtual() {

    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {

      throw new Error("Sua sessão expirou. Entre novamente no sistema.");

    }

    return data.session;

  }

  async function chamarApiClt(

    method: "GET" | "POST" | "PATCH" | "DELETE",

    body?: unknown,

  ) {

    const sessao = await obterSessaoAtual();

    const resposta = await fetch("/api/clt", {

      method,

      headers: {

        Authorization: `Bearer ${sessao.access_token}`,

        ...(body ? { "Content-Type": "application/json" } : {}),

      },

      body: body ? JSON.stringify(body) : undefined,

      cache: "no-store",

    });

    const conteudo = (await resposta.json()) as RespostaClt;

    if (!resposta.ok) {

      throw new Error(conteudo.erro || "Não foi possível concluir a operação.");

    }

    return { conteudo, sessao };

  }

  function lerListaLocal(chave: string) {

    const salvo = localStorage.getItem(chave);

    if (!salvo) return [] as RegistroClt[];

    try {

      const lista = JSON.parse(salvo);

      return Array.isArray(lista)

        ? lista.map((item) => normalizarRegistro(item))

        : [];

    } catch {

      return [] as RegistroClt[];

    }

  }

  function localizarPendentes(

    origem: RegistroClt[],

    listaSupabase: RegistroClt[],

    perfil: PerfilAtual,

  ) {

    if (!perfilEhConsultora(perfil.perfil)) return [] as RegistroClt[];

    const candidatos = origem.filter(

      (item) =>

        registroPossuiAlgumDado(item) &&

        (!item.consultora.trim() ||

          nomesCorrespondem(item.consultora, perfil.nome)),

    );

    const idsSupabase = new Set(listaSupabase.map((item) => item.id));

    const cpfsSupabase = new Set(

      listaSupabase.map((item) => chaveCpf(item, perfil.nome)).filter(Boolean),

    );

    const idsIncluidos = new Set<string>();

    const cpfsIncluidos = new Set<string>();

    return candidatos.filter((item) => {

      const chave = chaveCpf(item, perfil.nome);

      if (idsSupabase.has(item.id) || idsIncluidos.has(item.id)) return false;

      if (chave && (cpfsSupabase.has(chave) || cpfsIncluidos.has(chave))) {

        return false;

      }

      idsIncluidos.add(item.id);

      if (chave) cpfsIncluidos.add(chave);

      return true;

    });

  }

  async function carregarRegistrosDoSupabase() {

    setCarregando(true);

    try {

      const listaLocalAtual = lerListaLocal("somos-eleva-clt");

      const { conteudo, sessao } = await chamarApiClt("GET");

      const perfil = conteudo.perfil || null;

      const listaSupabase = Array.isArray(conteudo.registros)

        ? conteudo.registros.map((item) => normalizarRegistro(item))

        : [];

      setPerfilAtual(perfil);

      if (perfil && perfilEhConsultora(perfil.perfil)) {

        setForm((atual) => ({ ...atual, consultora: perfil.nome }));

      }

      let pendentes: RegistroClt[] = [];

      if (perfil) {

        const chaveBackup = `somos-eleva-clt-backup-migracao-v1-${sessao.user.id}`;

        const chaveImportacao = `somos-eleva-clt-importados-supabase-v1-${sessao.user.id}`;

        const backupExistente = lerListaLocal(chaveBackup);

        const origemCompleta = mesclarPorId(listaLocalAtual, backupExistente);

        if (origemCompleta.length) {

          localStorage.setItem(chaveBackup, JSON.stringify(origemCompleta));

        }

        const importacaoConcluida =

          localStorage.getItem(chaveImportacao) === "sim";

        if (!importacaoConcluida) {

          pendentes = localizarPendentes(origemCompleta, listaSupabase, perfil);

        }

      }

      setRegistrosAntigosPendentes(pendentes);

      setRegistros(mesclarPorId(listaSupabase, pendentes));

      if (!pendentes.length) {

        localStorage.setItem("somos-eleva-clt", JSON.stringify(listaSupabase));

      }

    } catch (erro) {

      setMensagem(

        erro instanceof Error

          ? erro.message

          : "Não foi possível carregar os registros CLT.",

      );

    } finally {

      setCarregando(false);

    }

  }

  useEffect(() => {

    void carregarRegistrosDoSupabase();

  }, [supabase]);

  useEffect(() => {

    let componenteAtivo = true;

    async function carregarConsultoras() {

      try {

        const sessao = await obterSessaoAtual();

        const resposta = await fetch("/api/consultoras", {

          method: "GET",

          headers: { Authorization: `Bearer ${sessao.access_token}` },

          cache: "no-store",

        });

        const conteudo = (await resposta.json()) as {

          consultoras?: Array<{ nome?: string }>;

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

        if (componenteAtivo) {

          setConsultoras(

            Array.from(new Set(nomes)).sort((a, b) =>

              a.localeCompare(b, "pt-BR"),

            ),

          );

        }

      } catch {

        if (componenteAtivo) setConsultoras([]);

      }

    }

    void carregarConsultoras();

    return () => {

      componenteAtivo = false;

    };

  }, [supabase]);

  useEffect(() => {
    let ativo = true;
    async function carregarBancosETabelas() {
      setCarregandoTabelas(true);
      setErroTabelas("");
      try {
        const sessao = await obterSessaoAtual();
        const resposta = await fetch("/api/clt?modo=tabelas", {
          headers: { Authorization: `Bearer ${sessao.access_token}` },
          cache: "no-store",
        });
        const conteudo = await resposta.json() as {
          bancos?: BancoConfiguracao[];
          tabelas?: TabelaCltOpcao[];
          erro?: string;
        };
        if (!resposta.ok) throw new Error(conteudo.erro || "Não foi possível carregar as tabelas CLT.");
        if (!ativo) return;
        setBancos((Array.isArray(conteudo.bancos) ? conteudo.bancos : [])
          .filter((banco) => banco.ativo && banco.nome)
          .map((banco) => ({ ...banco, nome: String(banco.nome).trim().toUpperCase() })));
        setTabelasClt((Array.isArray(conteudo.tabelas) ? conteudo.tabelas : [])
          .filter((tabela) => tabela.ativo && ehTabelaClt(tabela.orgaoConvenio)));
      } catch (erro) {
        if (ativo) {
          setTabelasClt([]);
          setErroTabelas(erro instanceof Error ? erro.message : "Não foi possível carregar as tabelas CLT.");
        }
      } finally {
        if (ativo) setCarregandoTabelas(false);
      }
    }
    void carregarBancosETabelas();
    return () => { ativo = false; };
  }, [supabase]);

  useEffect(() => {

  aplicarPeriodo("Todas");

}, []);

  const idsPendentes = useMemo(

    () => new Set(registrosAntigosPendentes.map((item) => item.id)),

    [registrosAntigosPendentes],

  );

  const filtrados = useMemo(() => {

  const termo = busca.trim().toLowerCase();

  const numerico = apenasNumeros(busca);

  return registros.filter((item) => {

    const statusOk =

      filtroStatus === "Todos" ||

      item.status === filtroStatus;

    const consultoraOk =

      filtroConsultora === "Todas" ||

      item.consultora === filtroConsultora;

    const bancoOk =

      filtroBanco === "Todos" ||

      normalizarTexto(item.banco) === normalizarTexto(filtroBanco);

    const buscaOk =

      !termo ||

      normalizarTexto(item.nome).includes(normalizarTexto(termo)) ||

      (Boolean(numerico) && item.cpf.includes(numerico)) ||

      (Boolean(numerico) && item.telefone.includes(numerico)) ||

      normalizarTexto(item.consultora).includes(normalizarTexto(termo)) ||

      normalizarTexto(item.banco).includes(normalizarTexto(termo));

    const dataPagamento = String(

      item.dataPagamento || ""

    ).slice(0, 10);

    /*

     * Com período de pagamento selecionado, mostrar somente propostas PAGAS

     * que tenham data de pagamento dentro do intervalo.

     * Sem período ("Todas"), todos os status permanecem visíveis.

     */

    const periodoPagamentoAtivo =

      Boolean(dataPagamentoInicial) || Boolean(dataPagamentoFinal);

    const statusPeriodoOk =

      !periodoPagamentoAtivo || item.status === "Pago";

    const possuiDataNoPeriodo =

      !periodoPagamentoAtivo || Boolean(dataPagamento);

    const dataInicialOk =

      !dataPagamentoInicial ||

      (Boolean(dataPagamento) && dataPagamento >= dataPagamentoInicial);

    const dataFinalOk =

      !dataPagamentoFinal ||

      (Boolean(dataPagamento) && dataPagamento <= dataPagamentoFinal);

    return (

      statusOk &&

      consultoraOk &&

      bancoOk &&

      buscaOk &&

      statusPeriodoOk &&

      possuiDataNoPeriodo &&

      dataInicialOk &&

      dataFinalOk

    );

  });

}, [

  registros,

  busca,

  filtroStatus,

  filtroConsultora,

  filtroBanco,

  dataPagamentoInicial,

  dataPagamentoFinal,

]);

  const resumo = useMemo(

  () => ({

    total: filtrados.length,

    analise: filtrados.filter(

      (item) => item.status === "Em análise"

    ).length,

    cancelados: filtrados.filter(

      (item) => item.status === "Cancelado"

    ).length,

    pagos: filtrados.filter(

      (item) => item.status === "Pago"

    ).length,

    valorPago: filtrados

      .filter((item) => item.status === "Pago")

      .reduce(

        (total, item) =>

          total + Number(item.valorAprovado || 0),

        0

      ),

    valorParcelasPagas: filtrados

      .filter((item) => item.status === "Pago")

      .reduce(

        (total, item) =>

          total + Number(item.parcela || 0),

        0

      ),

  }),

  [filtrados]

);

  const registrosExibidos = useMemo(

    () =>

      mostrarTodasPropostas

        ? filtrados

        : filtrados.slice(0, 10),

    [filtrados, mostrarTodasPropostas],

  );

  async function sincronizarRegistrosAntigos() {

    if (!registrosAntigosPendentes.length || !perfilAtual) return;

    const confirmar = window.confirm(

      `Encontramos ${registrosAntigosPendentes.length} registro(s) CLT antigo(s) neste navegador. Confirme somente se eles pertencem à usuária ${perfilAtual.nome}.`,

    );

    if (!confirmar) return;

    setProcessando(true);

    setMensagem("");

    try {

      const { conteudo, sessao } = await chamarApiClt("POST", {

        acao: "importar_local",

        registros: registrosAntigosPendentes,

      });

      const falhas = Number(conteudo.falhas || 0);

      if (falhas === 0) {

        const chaveImportacao = `somos-eleva-clt-importados-supabase-v1-${sessao.user.id}`;

        localStorage.setItem(chaveImportacao, "sim");

      }

      await carregarRegistrosDoSupabase();

      setMensagem(

        `${Number(conteudo.encontradas || 0)} encontrada(s) • ${Number(

          conteudo.importadas || 0,

        )} importada(s) • ${Number(

          conteudo.atualizadas || 0,

        )} atualizada(s) • ${Number(

          conteudo.ignoradas || 0,

        )} já existente(s)${falhas ? ` • ${falhas} com falha` : ""}.`,

      );

    } catch (erro) {

      setMensagem(

        erro instanceof Error

          ? erro.message

          : "Não foi possível sincronizar os registros antigos.",

      );

    } finally {

      setProcessando(false);

    }

  }

  // Regra de exibição das tabelas:
  // - sem Banco + Prazo completos: mostra todas as tabelas CLT ativas;
  // - com Banco + Prazo preenchidos: mostra somente as tabelas compatíveis.
  const filtroTabelaPorContratoAtivo = Boolean(
    form.banco.trim() && Number(form.prazo) > 0,
  );

  const tabelasDisponiveis = useMemo(() => {
    const base = filtroTabelaPorContratoAtivo
      ? tabelasClt.filter(
          (tabela) =>
            bancosCltCorrespondem(tabela.banco, form.banco) &&
            prazoTabelaCompativel(
              tabela.prazoInicial,
              tabela.prazoFinal,
              form.prazo,
            ),
        )
      : tabelasClt;

    return [...base].sort((a, b) => {
      const banco = String(a.banco || "").localeCompare(
        String(b.banco || ""),
        "pt-BR",
      );
      if (banco !== 0) return banco;
      const nome = String(a.nome || "").localeCompare(
        String(b.nome || ""),
        "pt-BR",
      );
      if (nome !== 0) return nome;
      return String(a.codigo || "").localeCompare(
        String(b.codigo || ""),
        "pt-BR",
      );
    });
  }, [
    tabelasClt,
    filtroTabelaPorContratoAtivo,
    form.banco,
    form.prazo,
  ]);

  const tabelasDisponiveisFiltradas = useMemo(() => {
    const termo = normalizarTexto(buscaTabela);
    const termoCompacto = termo.replace(/[^a-z0-9]/g, "");

    if (!termo) return tabelasDisponiveis;

    return tabelasDisponiveis.filter((tabela) => {
      const alvo = normalizarTexto(`${tabela.nome} ${tabela.codigo} ${tabela.banco}`);
      const alvoCompacto = alvo.replace(/[^a-z0-9]/g, "");
      return (
        alvo.includes(termo) ||
        Boolean(termoCompacto && alvoCompacto.includes(termoCompacto))
      );
    });
  }, [tabelasDisponiveis, buscaTabela]);

  const tabelaSelecionadaAtual = useMemo(() => {
    if (!form.tabelaBancoId) return null;
    return tabelasClt.find((tabela) => tabela.id === form.tabelaBancoId) || null;
  }, [tabelasClt, form.tabelaBancoId]);

  const registroEditado = registros.find((item) => item.id === editandoId);
  const tabelaHistorica = Boolean(
    form.tabelaBancoId &&
    registroEditado?.tabelaBancoId === form.tabelaBancoId &&
    !tabelasDisponiveis.some((tabela) => tabela.id === form.tabelaBancoId),
  );

  function mudarBanco(banco: string) {
    // A pesquisa de tabelas é independente do banco; não apagamos uma tabela já escolhida.
    setForm((atual) => ({ ...atual, banco }));
  }

  function mudarPrazo(prazo: string) {
    // A pesquisa de tabelas é independente do prazo; não apagamos uma tabela já escolhida.
    setForm((atual) => ({ ...atual, prazo }));
  }

  async function salvarSomenteTabela() {
    if (!registroEditado || processando) return;
    if (!bancosCltCorrespondem(form.banco, registroEditado.banco) ||
        Number(form.prazo) !== Number(registroEditado.prazo)) {
      setMensagem("Para alterar banco ou prazo, use Atualizar registro. Salvar somente tabela mantém os demais dados do contrato.");
      return;
    }
    setProcessando(true);
    setMensagem("");
    try {
      const { conteudo } = await chamarApiClt("PATCH", {
        acao: "vincular_tabela",
        id: registroEditado.id,
        tabelaBancoId: form.tabelaBancoId || null,
      });
      if (!conteudo.registro) throw new Error("A API não retornou o registro atualizado. Confira se os dois arquivos CLT foram substituídos.");
      const salvo = normalizarRegistro(conteudo.registro);
      if ((salvo.tabelaBancoId || "") !== form.tabelaBancoId) {
        throw new Error("O vínculo não foi confirmado pelo servidor. Atualize a API antes de continuar.");
      }
      setRegistros((atual) => atual.map((item) => item.id === salvo.id ? salvo : item));
      setForm(formularioLimpo(perfilAtual));
      setEditandoId(null);
      setMensagem(conteudo.mensagem || "Tabela salva no contrato.");
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível salvar a tabela.");
    } finally {
      setProcessando(false);
    }
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();

    setMensagem("");

    if (!form.nome.trim()) {

      setMensagem("Informe o nome completo.");

      return;

    }

    const cpf = apenasNumeros(form.cpf);

    if (cpf.length !== 11) {

      setMensagem("O CPF precisa ter 11 números.");

      return;

    }

    if (!form.dataNascimento) {

      setMensagem("Informe a data de nascimento.");

      return;

    }

    const telefone = apenasNumeros(form.telefone);

    if (telefone.length < 10 || telefone.length > 11) {

      setMensagem("Informe um número de telefone válido.");

      return;

    }

    const valorAprovado = numero(form.valorAprovado);

    if (valorAprovado <= 0) {

      setMensagem("Informe o valor aprovado.");

      return;

    }

    const parcela = numero(form.parcela);

    if (parcela <= 0) {

      setMensagem("Informe o valor da parcela.");

      return;

    }

    const prazo = Number(form.prazo);

if (!Number.isInteger(prazo) || prazo <= 0) {

  setMensagem("Informe o prazo em meses.");

  return;

}

    if (!form.banco.trim()) {

      setMensagem("Informe o banco.");

      return;

    }

    const consultoraResponsavel =

      perfilAtual && perfilEhConsultora(perfilAtual.perfil)

        ? perfilAtual.nome

        : form.consultora.trim();

    if (!consultoraResponsavel) {

      setMensagem("Informe a consultora.");

      return;

    }

if (form.status === "Pago" && !form.dataPagamento) {

  setMensagem("Informe a data do pagamento.");

  return;

}

    /*

     * O mesmo cliente pode contratar CLT novamente.

     * Por isso, CPF + consultora sozinhos não devem bloquear um novo cadastro.

     *

     * Bloqueamos apenas uma duplicação realmente provável:

     * mesmo CPF + mesma consultora + mesmo valor aprovado + mesma parcela

     * + mesmo prazo + mesmo banco, desde que o registro anterior ainda esteja

     * ativo (Cancelado/Recusado nunca bloqueiam uma nova operação).

     */

    const duplicado = registros.some((item) => {

      if (item.id === editandoId) return false;

      if (["Cancelado", "Recusado"].includes(item.status)) {

        return false;

      }

      return (

        item.cpf === cpf &&

        nomesCorrespondem(item.consultora, consultoraResponsavel) &&

        Math.abs(Number(item.valorAprovado || 0) - valorAprovado) < 0.01 &&

        Math.abs(Number(item.parcela || 0) - parcela) < 0.01 &&

        Number(item.prazo || 0) === prazo &&

        normalizarTexto(item.banco) === normalizarTexto(form.banco)

      );

    });

    if (duplicado) {

      setMensagem(

        "Já existe uma operação CLT igual para este CPF e esta consultora. Confira valor, parcela, prazo e banco.",

      );

      return;

    }

    const agora = new Date().toLocaleString("pt-BR");

    const antigo = registros.find((item) => item.id === editandoId);

    const registro: RegistroClt = {

  id: editandoId || crypto.randomUUID(),

  nome: form.nome.trim(),

  cpf,

  dataNascimento: form.dataNascimento,

  dataPagamento:

    form.status === "Pago" ? form.dataPagamento : "",

  telefone,

  valorAprovado,

  parcela,

  prazo,

  banco: form.banco.trim(),
  tabelaBancoId: form.tabelaBancoId || null,

  consultora: consultoraResponsavel,

  status: form.status,

  criadoEm: antigo?.criadoEm || agora,

  atualizadoEm: agora,

};

    const estavaEditando = Boolean(editandoId);

    setProcessando(true);

    try {

      const { conteudo } = await chamarApiClt(estavaEditando ? "PATCH" : "POST", { registro });
      if (conteudo.registro && (conteudo.registro.tabelaBancoId || "") !== form.tabelaBancoId) {
        throw new Error("O contrato foi salvo, mas a tabela não foi confirmada. Atualize também app/api/clt/route.ts.");
      }

      await carregarRegistrosDoSupabase();

      setForm(formularioLimpo(perfilAtual));

      setEditandoId(null);

      setMensagem(

        estavaEditando

          ? "Registro atualizado com sucesso."

          : "Cliente CLT cadastrado com sucesso.",

      );

    } catch (erro) {

      setMensagem(

        erro instanceof Error

          ? erro.message

          : "Não foi possível salvar o registro CLT.",

      );

    } finally {

      setProcessando(false);

    }

  }

  function editar(item: RegistroClt) {

    if (idsPendentes.has(item.id)) {

      setMensagem("Sincronize os registros antigos antes de editar este cliente.");

      return;

    }

    setEditandoId(item.id);

    setForm({

  nome: item.nome,

  cpf: formatarCpf(item.cpf),

  dataNascimento: item.dataNascimento || "",

  dataPagamento: item.dataPagamento || "",

  telefone: formatarTelefone(item.telefone),

      valorAprovado: item.valorAprovado

        ? item.valorAprovado.toFixed(2).replace(".", ",")

        : "",

      parcela: item.parcela

  ? item.parcela.toFixed(2).replace(".", ",")

  : "",

prazo: item.prazo ? String(item.prazo) : "",

banco: item.banco,
      tabelaBancoId: item.tabelaBancoId || "",

      consultora: item.consultora,

      status: item.status,

    });

    setMensagem("Editando registro selecionado.");

    window.scrollTo({ top: 0, behavior: "smooth" });

  }

  async function excluir(id: string) {

    if (idsPendentes.has(id)) {

      setMensagem("Sincronize os registros antigos antes de excluir este cliente.");

      return;

    }

    if (!window.confirm("Deseja excluir este registro CLT?")) return;

    setProcessando(true);

    setMensagem("");

    try {

      await chamarApiClt("DELETE", { id });

      await carregarRegistrosDoSupabase();

      if (editandoId === id) {

        setEditandoId(null);

        setForm(formularioLimpo(perfilAtual));

      }

      setMensagem("Registro CLT excluído com sucesso.");

    } catch (erro) {

      setMensagem(

        erro instanceof Error

          ? erro.message

          : "Não foi possível excluir o registro CLT.",

      );

    } finally {

      setProcessando(false);

    }

  }

  function cancelarEdicao() {

    setEditandoId(null);

    setForm(formularioLimpo(perfilAtual));

    setBuscaTabela("");
    setMostrarSugestoesTabela(false);

    setMensagem("");

  }

  const usuarioEhConsultora = Boolean(

    perfilAtual && perfilEhConsultora(perfilAtual.perfil),

  );

  return (

    <div className="clt-page">

      {usuarioEhConsultora && registrosAntigosPendentes.length > 0 && (

        <section

          className="clt-help"

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

            <strong>{registrosAntigosPendentes.length} registros antigos encontrados.</strong>{" "}

            Um backup foi criado neste navegador. Clique para enviar tudo ao

            Supabase sem recadastrar.

          </span>

          <button

            type="button"

            onClick={sincronizarRegistrosAntigos}

            disabled={processando}

            style={{

              border: 0,

              borderRadius: 10,

              padding: "12px 18px",

              fontWeight: 800,

              cursor: processando ? "wait" : "pointer",

            }}

          >

            {processando ? "Sincronizando..." : "Sincronizar registros antigos"}

          </button>

        </section>

      )}

      <section className="clt-summary">

        <article>

          <span>TOTAL DE REGISTROS</span>

          <strong>{resumo.total}</strong>

        </article>

        <article>

          <span>EM ANÁLISE</span>

          <strong>{resumo.analise}</strong>

        </article>

        <article>

          <span>CANCELADOS</span>

          <strong>{resumo.cancelados}</strong>

        </article>

        <article>

          <span>PAGOS</span>

          <strong>{resumo.pagos}</strong>

        </article>

        <article className="clt-highlight">

          <span>VALOR APROVADO PAGO</span>

          <strong>{moeda(resumo.valorPago)}</strong>

        </article>

        <article className="clt-highlight">

  <span>VALOR DAS PARCELAS PAGAS</span>

  <strong>{moeda(resumo.valorParcelasPagas)}</strong>

</article>

      </section>

      <section className="clt-layout clt-layout-vertical">

        <form className="clt-card clt-form-card-full" onSubmit={salvar}>

          <div className="clt-heading">

            <div>

              <span>{editandoId ? "EDITAR REGISTRO" : "NOVO CLIENTE CLT"}</span>

              <h2>{editandoId ? "Atualizar análise" : "Cadastrar análise"}</h2>

              <p>Cadastre os dados essenciais da operação CLT.</p>

            </div>

            <b>CLT</b>

          </div>

          <div className="clt-form-grid">

            <label>

              Nome completo

              <input

                value={form.nome}

                disabled={processando}

                onChange={(event) =>

                  setForm({ ...form, nome: event.target.value })

                }

                placeholder="Nome do cliente"

              />

            </label>

            <label>

              CPF

              <input

                value={form.cpf}

                disabled={processando}

                onChange={(event) =>

                  setForm({ ...form, cpf: formatarCpf(event.target.value) })

                }

                placeholder="000.000.000-00"

                inputMode="numeric"

              />

            </label>

            <label>

              Data de nascimento

              <input

                type="date"

                value={form.dataNascimento}

                disabled={processando}

                onChange={(event) =>

                  setForm({ ...form, dataNascimento: event.target.value })

                }

              />

            </label>

            <label>

              Número de telefone

              <input

                value={form.telefone}

                disabled={processando}

                onChange={(event) =>

                  setForm({

                    ...form,

                    telefone: formatarTelefone(event.target.value),

                  })

                }

                placeholder="(62) 99999-9999"

                inputMode="numeric"

              />

            </label>

            <label>

              Valor aprovado

              <input

                value={form.valorAprovado}

                disabled={processando}

                onChange={(event) =>

                  setForm({ ...form, valorAprovado: event.target.value })

                }

                placeholder="Ex.: 8.500,00"

                inputMode="decimal"

              />

            </label>

            <label>

              Parcela

              <input

                value={form.parcela}

                disabled={processando}

                onChange={(event) =>

                  setForm({ ...form, parcela: event.target.value })

                }

                placeholder="Ex.: 450,00"

                inputMode="decimal"

              />

            </label>

<label style={{ width: "100%" }}>

  Prazo em meses

  <input

    type="number"

    min="1"

    step="1"

    value={form.prazo}

    disabled={processando}

    onChange={(event) => mudarPrazo(event.target.value)}

    placeholder="Ex.: 12"

    inputMode="numeric"
    style={{ minHeight: 42 }}

  />

</label>

            <label style={{ width: "100%" }}>

  Banco

  <select

    value={form.banco}

    disabled={processando}

    onChange={(event) => mudarBanco(event.target.value)}
    style={{ minHeight: 42 }}

  >

    <option value="">Selecione o banco</option>

    {form.banco &&

      !bancos.some((banco) => banco.nome === form.banco) && (

        <option value={form.banco}>

          {form.banco} (histórico)

        </option>

      )}

    {bancos.map((banco) => (

      <option key={banco.id} value={banco.nome}>

        {banco.nome}

      </option>

    ))}

  </select>

</label>

            <div
              className="clt-tabela-campo"
              style={{ position: "relative", display: "grid", gap: 6 }}
            >
              <span
                style={{
                  color: "#39506e",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                Tabela bancária da venda
              </span>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 46px", gap: 8 }}>
                <input
                  type="search"
                  value={buscaTabela}
                  disabled={processando || carregandoTabelas}
                  onFocus={() => setMostrarSugestoesTabela(true)}
                  onChange={(event) => {
                    setBuscaTabela(event.target.value);
                    setMostrarSugestoesTabela(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setMostrarSugestoesTabela(false);
                    }
                    if (event.key === "Enter" && tabelasDisponiveisFiltradas.length === 1) {
                      event.preventDefault();
                      const tabela = tabelasDisponiveisFiltradas[0];
                      setForm((atual) => ({ ...atual, tabelaBancoId: tabela.id }));
                      setBuscaTabela("");
                      setMostrarSugestoesTabela(false);
                    }
                  }}
                  placeholder="Digite o nome ou código da tabela"
                  autoComplete="off"
                  aria-label="Pesquisar tabela por nome ou código"
                />

                <button
                  type="button"
                  disabled={processando || carregandoTabelas}
                  onClick={() => setMostrarSugestoesTabela((atual) => !atual)}
                  aria-label="Pesquisar tabela"
                  title="Pesquisar tabela"
                  style={{
                    minHeight: 42,
                    border: "1px solid #b9cdf5",
                    borderRadius: 10,
                    background: mostrarSugestoesTabela ? "#155eef" : "#eef4ff",
                    color: mostrarSugestoesTabela ? "#fff" : "#155eef",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </button>
              </div>

              {form.tabelaBancoId && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 10px",
                    border: "1px solid #cfe0ff",
                    borderRadius: 9,
                    background: "#f6f9ff",
                    color: "#173b73",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  <span>
                    ✓ {tabelaSelecionadaAtual
                      ? rotuloTabelaClt(tabelaSelecionadaAtual)
                      : `${registroEditado?.tabela || "Tabela vinculada"}${
                          registroEditado?.tabelaCodigo ? ` • Código ${registroEditado.tabelaCodigo}` : ""
                        }`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((atual) => ({ ...atual, tabelaBancoId: "" }))}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "#c43d3d",
                      fontSize: 11,
                      fontWeight: 900,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Limpar
                  </button>
                </div>
              )}

              {mostrarSugestoesTabela &&
                !processando &&
                !carregandoTabelas && (
                  <div
                    role="listbox"
                    aria-label="Tabelas encontradas"
                    style={{
                      position: "absolute",
                      zIndex: 80,
                      top: form.tabelaBancoId ? 118 : 72,
                      left: 0,
                      right: 0,
                      maxHeight: 290,
                      overflowY: "auto",
                      border: "1px solid #cfdced",
                      borderRadius: 12,
                      background: "#fff",
                      boxShadow: "0 14px 32px rgba(20, 48, 86, .16)",
                      padding: 6,
                    }}
                  >
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setForm((atual) => ({ ...atual, tabelaBancoId: "" }));
                        setBuscaTabela("");
                        setMostrarSugestoesTabela(false);
                      }}
                      style={{
                        width: "100%",
                        minHeight: 40,
                        border: 0,
                        borderRadius: 8,
                        background: "#f7f9fc",
                        color: "#607087",
                        padding: "8px 10px",
                        textAlign: "left",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Sem tabela selecionada
                    </button>

                    {tabelasDisponiveisFiltradas.map((tabela) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={form.tabelaBancoId === tabela.id}
                        key={tabela.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setForm((atual) => ({ ...atual, tabelaBancoId: tabela.id }));
                          setBuscaTabela("");
                          setMostrarSugestoesTabela(false);
                        }}
                        style={{
                          width: "100%",
                          minHeight: 46,
                          marginTop: 4,
                          border: form.tabelaBancoId === tabela.id
                            ? "1px solid #9bbcff"
                            : "1px solid transparent",
                          borderRadius: 8,
                          background: form.tabelaBancoId === tabela.id ? "#eef4ff" : "#fff",
                          color: "#173250",
                          padding: "8px 10px",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: 12 }}>
                          {tabela.nome || "Tabela sem nome"}
                        </strong>
                        <span style={{ display: "block", marginTop: 2, fontSize: 10, color: "#6c7d94" }}>
                          {tabela.banco ? `${tabela.banco} • ` : ""}
                          {tabela.codigo ? `Código ${tabela.codigo} • ` : ""}
                          {rotuloPrazoTabelaClt(tabela)}
                        </span>
                      </button>
                    ))}

                    {tabelasDisponiveisFiltradas.length === 0 && (
                      <div
                        style={{
                          padding: "12px 10px",
                          color: "#8a5b00",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        Nenhuma tabela encontrada com esse nome ou código.
                      </div>
                    )}
                  </div>
                )}

              <small className={erroTabelas ? "clt-tabela-aviso" : "clt-tabela-ajuda"} role={erroTabelas ? "alert" : undefined}>
                {carregandoTabelas ? "Carregando tabelas cadastradas..." :
                 erroTabelas ? erroTabelas :
                 tabelasDisponiveis.length === 0 && filtroTabelaPorContratoAtivo
                   ? `Nenhuma tabela CLT ativa compatível com ${form.banco} e ${form.prazo} meses.` :
                 tabelasDisponiveis.length === 0
                   ? "Nenhuma tabela CLT ativa cadastrada." :
                 buscaTabela && tabelasDisponiveisFiltradas.length === 0
                   ? "Nenhuma tabela encontrada com esse nome ou código." :
                 buscaTabela
                   ? `${tabelasDisponiveisFiltradas.length} tabela(s) encontrada(s). Clique em uma opção.` :
                 filtroTabelaPorContratoAtivo
                   ? `${tabelasDisponiveis.length} tabela(s) compatível(is) com ${form.banco} e ${form.prazo} meses.` :
                 `${tabelasDisponiveis.length} tabela(s) CLT ativa(s). Preencha Banco + Prazo para filtrar automaticamente, ou use a lupa para ver todas.`}
              </small>
            </div>

            <label>

              Consultora

              <select

                value={form.consultora}

                disabled={processando || usuarioEhConsultora}

                onChange={(event) =>

                  setForm({ ...form, consultora: event.target.value })

                }

              >

                <option value="">Selecione a consultora</option>

                {form.consultora && !consultoras.includes(form.consultora) && (

                  <option value={form.consultora}>{form.consultora}</option>

                )}

                {consultoras.map((consultora) => (

                  <option key={consultora} value={consultora}>

                    {consultora}

                  </option>

                ))}

              </select>

            </label>

            <label>

  Status

  <select

    value={form.status}

    disabled={processando}

    onChange={(event) =>

      setForm({

        ...form,

        status: event.target.value as StatusClt,

      })

    }

  >

    {STATUS.map((status) => (

      <option key={status}>{status}</option>

    ))}

  </select>

</label>

{form.status === "Pago" && (

  <label>

    Data do pagamento

    <input

      type="date"

      value={form.dataPagamento}

      disabled={processando}

      onChange={(event) =>

        setForm({

          ...form,

          dataPagamento: event.target.value,

        })

      }

    />

  </label>

)}

          </div>

          {mensagem && <div className="clt-message">{mensagem}</div>}

          <div className="clt-actions">

            {editandoId && (

              <button

                type="button"

                className="cancel"

                disabled={processando}

                onClick={cancelarEdicao}

              >

                Cancelar

              </button>

            )}

            {editandoId && (
              <button type="button" className="clt-salvar-tabela" disabled={processando || carregandoTabelas}
                onClick={() => void salvarSomenteTabela()} title="Altera somente o vínculo da tabela, sem reenviar os outros dados">
                Salvar somente tabela
              </button>
            )}
            <button type="submit" className="save" disabled={processando}>

              {processando

                ? "Aguarde..."

                : editandoId

                  ? "Atualizar registro"

                  : "Salvar registro"}

            </button>

          </div>

        </form>

        <section className="clt-card clt-wallet-card-full">

          <div className="clt-list-heading clt-list-heading-actions">

            <div>

              <span>CARTEIRA CLT</span>

              <h2>Clientes e análises</h2>

            </div>

            <div className="clt-wallet-actions">

              <button

                type="button"

                className="clt-view-all-button"

                onClick={() =>

                  setMostrarTodasPropostas((atual) => !atual)

                }

              >

                {mostrarTodasPropostas

                  ? "Mostrar menos"

                  : `Ver todas as propostas (${filtrados.length})`}

              </button>

            </div>

          </div>

          <div className="clt-periodo-rapido">

            <span>PERÍODO DO PAGAMENTO</span>

            <div>

              {(["Hoje", "Este mês", "Todas"] as const).map((item) => (

                <button

                  type="button"

                  key={item}

                  className={periodo === item ? "active" : ""}

                  onClick={() => aplicarPeriodo(item)}

                >

                  {item}

                </button>

              ))}

            </div>

          </div>

          <div className="clt-filters">

            <input

              value={busca}

              onChange={(event) => setBusca(event.target.value)}

              placeholder="Pesquisar cliente, CPF, telefone, banco ou consultora"

            />

            <select

              value={filtroConsultora}

              disabled={usuarioEhConsultora}

              onChange={(event) =>

                setFiltroConsultora(event.target.value)

              }

            >

              <option value="Todas">

                Todas as vendedoras

              </option>

              {consultoras.map((consultora) => (

                <option

                  key={consultora}

                  value={consultora}

                >

                  {consultora}

                </option>

              ))}

            </select>

            <select

              value={filtroBanco}

              onChange={(event) => setFiltroBanco(event.target.value)}

              title="Filtrar por banco"

            >

              <option value="Todos">Todos os bancos</option>

              {bancos

                .filter((banco) => banco.ativo && banco.nome)

                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))

                .map((banco) => (

                  <option key={banco.id} value={banco.nome}>

                    {banco.nome}

                  </option>

                ))}

            </select>

            <select

              value={filtroStatus}

              onChange={(event) => setFiltroStatus(event.target.value)}

            >

              <option>Todos</option>

              {STATUS.map((status) => (

                <option key={status}>{status}</option>

              ))}

            </select>

            <input

              type="date"

              value={dataPagamentoInicial}

              onChange={(event) => {

                setDataPagamentoInicial(event.target.value);

                setPeriodo("Personalizado");

              }}

              title="Data inicial do pagamento"

            />

            <input

              type="date"

              value={dataPagamentoFinal}

              onChange={(event) => {

                setDataPagamentoFinal(event.target.value);

                setPeriodo("Personalizado");

              }}

              title="Data final do pagamento"

            />

          </div>

          {carregando ? (

            <div className="clt-empty">

              <div>◌</div>

              <strong>Carregando registros CLT...</strong>

            </div>

          ) : filtrados.length === 0 ? (

            <div className="clt-empty">

              <div>▣</div>

              <strong>Nenhum registro CLT</strong>

              <p>Cadastre o primeiro cliente.</p>

            </div>

          ) : (

            <div className="clt-list clt-list-compacta">
              <div className="clt-client-table-wrap">
                <table className="clt-client-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Consultora</th>
                      <th>Telefone</th>
                      <th>Valor aprovado</th>
                      <th>Parcela</th>
                      <th>Banco / tabela</th>
                      <th>Prazo</th>
                      <th>Pagamento</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosExibidos.map((item) => {
                      const pendente = idsPendentes.has(item.id);
                      const tabelaResumo = item.tabelaBancoId
                        ? [
                            item.tabela || "Tabela vinculada indisponível",
                            item.tabelaCodigo ? `Cód. ${item.tabelaCodigo}` : "",
                          ].filter(Boolean).join(" • ")
                        : "Sem tabela selecionada";

                      return (
                        <tr key={item.id}>
                          <td className="clt-col-cliente">
                            <strong>{item.nome}</strong>
                            <small>
                              {item.cpf ? formatarCpf(item.cpf) : "CPF não informado"}
                              {item.dataNascimento ? ` • Nasc. ${formatarData(item.dataNascimento)}` : ""}
                              {pendente ? " • Aguardando sincronização" : ""}
                            </small>
                          </td>
                          <td>
                            <strong className="clt-table-main">{item.consultora || "—"}</strong>
                          </td>
                          <td>
                            <span>{item.telefone ? formatarTelefone(item.telefone) : "—"}</span>
                          </td>
                          <td>
                            <strong className="clt-table-money">{moeda(item.valorAprovado)}</strong>
                          </td>
                          <td>
                            <strong className="clt-table-money">{moeda(item.parcela)}</strong>
                          </td>
                          <td className="clt-col-banco">
                            <strong>{item.banco || "—"}</strong>
                            <small className={!item.tabelaBancoId ? "clt-sem-tabela" : ""}>
                              {tabelaResumo}
                            </small>
                          </td>
                          <td>
                            <span>{item.prazo ? `${item.prazo} meses` : "—"}</span>
                          </td>
                          <td>
                            <span>{item.status === "Pago" ? formatarData(item.dataPagamento) : "—"}</span>
                          </td>
                          <td>
                            <span
                              className={`clt-status status-${item.status
                                .toLowerCase()
                                .replace(/\s/g, "-")
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")}`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td>
                            <div className="clt-table-actions">
                              <button
                                type="button"
                                disabled={processando || pendente}
                                onClick={() => editar(item)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="delete"
                                disabled={processando || pendente}
                                onClick={() => excluir(item.id)}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          )}

          {!carregando &&

            filtrados.length > 10 &&

            !mostrarTodasPropostas && (

              <div className="clt-list-more">

                Mostrando 10 de {filtrados.length} propostas.

                Clique em <strong>Ver todas as propostas</strong> para abrir a carteira completa.

              </div>

            )}

        </section>

      </section>

      <section className="clt-help">

        <strong>Cadastro CLT:</strong>

        <span>

          acompanhe cada cliente pelo status da análise e pelo valor aprovado.

          Os bancos disponíveis são carregados das Configurações da Administração.

        </span>

      </section>

    </div>

  );

}
// FIM DO ARQUIVO COMPLETO - CltManager.tsx - ELEVA
