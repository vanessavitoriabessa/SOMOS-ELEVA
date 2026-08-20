"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import "./configuracoes.css";

type Banco = {
  id: string;
  nome: string;
  ativo: boolean;
};

type Tabela = {
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

type EquipeConfigurada = {
  id: string;
  nome: string;
  ativo: boolean;
};

type PerfilConfigurado = {
  chave:
    | "Administradora"
    | "Coordenadora"
    | "Supervisora"
    | "Consultora"
    | "Operacional"
    | "Financeiro";
  nomeExibicao: string;
  ativo: boolean;
  ordem: number;
};

type ChavePermissao =
  | "dashboard"
  | "clientes"
  | "simulacao"
  | "gestao_propostas"
  | "clt"
  | "baixa_pagamentos"
  | "protocolos"
  | "ranking"
  | "minha_premiacao"
  | "loja_premios"
  | "financeiro"
  | "equipe"
  | "rh"
  | "dados_importados"
  | "configuracoes"
  | "ver_comissao_banco"
  | "ver_comissao_empresa";

type PermissoesPerfil = Record<ChavePermissao, boolean>;

const PERMISSOES_DISPONIVEIS: Array<{
  chave: ChavePermissao;
  titulo: string;
  grupo: "MENU" | "INFORMAÇÕES SENSÍVEIS";
}> = [
  { chave: "dashboard", titulo: "Dashboard", grupo: "MENU" },
  { chave: "clientes", titulo: "Clientes", grupo: "MENU" },
  { chave: "simulacao", titulo: "Simulação", grupo: "MENU" },
  { chave: "gestao_propostas", titulo: "Gestão de Propostas", grupo: "MENU" },
  { chave: "clt", titulo: "CLT", grupo: "MENU" },
  { chave: "baixa_pagamentos", titulo: "Baixa de pagamentos", grupo: "MENU" },
  { chave: "protocolos", titulo: "Protocolos", grupo: "MENU" },
  { chave: "ranking", titulo: "Ranking", grupo: "MENU" },
  { chave: "minha_premiacao", titulo: "Minha Premiação", grupo: "MENU" },
  { chave: "loja_premios", titulo: "Loja de Prêmios", grupo: "MENU" },
  { chave: "financeiro", titulo: "Financeiro", grupo: "MENU" },
  { chave: "equipe", titulo: "Equipe", grupo: "MENU" },
  { chave: "rh", titulo: "RH", grupo: "MENU" },
  { chave: "dados_importados", titulo: "Dados importados", grupo: "MENU" },
  { chave: "configuracoes", titulo: "Configurações", grupo: "MENU" },
  { chave: "ver_comissao_banco", titulo: "Ver % Comissão Banco", grupo: "INFORMAÇÕES SENSÍVEIS" },
  { chave: "ver_comissao_empresa", titulo: "Ver Comissão da Empresa", grupo: "INFORMAÇÕES SENSÍVEIS" },
];

const permissoesVazias = (): PermissoesPerfil =>
  Object.fromEntries(
    PERMISSOES_DISPONIVEIS.map((item) => [item.chave, false]),
  ) as PermissoesPerfil;

type TipoConfigFinanceiro =
  | "produto"
  | "banco"
  | "parceiro"
  | "categoria_entrada"
  | "categoria_saida";

type ConfigFinanceiroItem = {
  id: string;
  tipo: TipoConfigFinanceiro;
  nome: string;
  ativo: boolean;
  ordem: number;
};

type Meta = {
  id: string;
  nome: string;
  tipo: "Empresa" | "Equipe" | "Consultora";
  responsavel: string;
  valor: number;
  inicio: string;
  fim: string;
  ativo: boolean;
};

type ConfiguracaoGeral = {
  nomeSistema: string;
  nomeEmpresa: string;
  multiplicadorSaldo: number;
  moeda: string;
};

const hoje = () => new Date().toISOString().slice(0, 10);

const bancosPadrao: Banco[] = [
  { id: "neo", nome: "NEO", ativo: true },
  { id: "aki-capital", nome: "AKI CAPITAL", ativo: true },
  { id: "amigoz", nome: "AMIGOZ", ativo: true },
  { id: "futuro", nome: "FUTURO", ativo: true },
  { id: "v8", nome: "V8", ativo: true },
  { id: "c6", nome: "C6", ativo: true },
  { id: "finanbank", nome: "FINANBANK", ativo: true },
];

const tabelasPadrao: Tabela[] = [
  { id: "neo-normal-399", banco: "NEO", orgaoConvenio: "", nome: "NORMAL", codigo: "399", percentual: 100, percentualComissaoBanco: null, ativo: true },
  { id: "neo-flex-1-379", banco: "NEO", orgaoConvenio: "", nome: "FLEX 1", codigo: "379", percentual: 75, percentualComissaoBanco: null, ativo: true },
  { id: "neo-flex-2-359", banco: "NEO", orgaoConvenio: "", nome: "FLEX 2", codigo: "359", percentual: 50, percentualComissaoBanco: null, ativo: true },
  { id: "neo-flex-3-339", banco: "NEO", orgaoConvenio: "", nome: "FLEX 3", codigo: "339", percentual: 40, percentualComissaoBanco: null, ativo: true },
  { id: "neo-flex-4-319", banco: "NEO", orgaoConvenio: "", nome: "FLEX 4", codigo: "319", percentual: 20, percentualComissaoBanco: null, ativo: true },
  { id: "neo-flex-5-299", banco: "NEO", orgaoConvenio: "", nome: "FLEX 5", codigo: "299", percentual: 8, percentualComissaoBanco: null, ativo: true },
];

const configPadrao: ConfiguracaoGeral = {
  nomeSistema: "SOMOS ELEVA",
  nomeEmpresa: "Eleva Promotora de Crédito",
  multiplicadorSaldo: 22,
  moeda: "BRL",
};

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

export default function SettingsManager() {
  const supabase = useMemo(() => createClient(), []);

  const [aba, setAba] = useState<
    "geral" | "bancos" | "tabelas" | "equipes" | "perfis" | "permissoes" | "financeiro" | "metas"
  >("geral");
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [orgaosConvenios, setOrgaosConvenios] = useState<OrgaoConvenio[]>([]);
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [equipesConfiguradas, setEquipesConfiguradas] =
    useState<EquipeConfigurada[]>([]);
  const [perfisConfigurados, setPerfisConfigurados] =
    useState<PerfilConfigurado[]>([]);
  const [editandoPerfilChave, setEditandoPerfilChave] =
    useState<PerfilConfigurado["chave"] | null>(null);
  const [nomePerfilEdicao, setNomePerfilEdicao] = useState("");

  const [perfilPermissaoSelecionado, setPerfilPermissaoSelecionado] =
    useState<PerfilConfigurado["chave"]>("Administradora");
  const [permissoesPorPerfil, setPermissoesPorPerfil] =
    useState<Record<string, PermissoesPerfil>>({});

  const [novaEquipe, setNovaEquipe] = useState("");
  const [editandoEquipeId, setEditandoEquipeId] = useState<string | null>(null);
  const [nomeEquipeEdicao, setNomeEquipeEdicao] = useState("");

  const [metas, setMetas] = useState<Meta[]>([]);
  const [geral, setGeral] = useState<ConfiguracaoGeral>(configPadrao);
  const [mensagem, setMensagem] = useState("");
  const [processando, setProcessando] = useState(false);

  const [financeiroItens, setFinanceiroItens] =
    useState<ConfigFinanceiroItem[]>([]);
  const [novoFinanceiroTipo, setNovoFinanceiroTipo] =
    useState<TipoConfigFinanceiro>("produto");
  const [novoFinanceiroNome, setNovoFinanceiroNome] =
    useState("");

  const [novoBanco, setNovoBanco] = useState("");
  const [novoOrgaoConvenio, setNovoOrgaoConvenio] = useState("");
  const [buscaTabela, setBuscaTabela] = useState("");
  const [novaTabela, setNovaTabela] = useState({
    banco: "NEO",
    orgaoConvenio: "",
    nome: "",
    codigo: "",
    percentual: "",
    percentualComissaoBanco: "",
  });

  const [editandoTabelaId, setEditandoTabelaId] = useState<string | null>(null);
  const [edicaoTabela, setEdicaoTabela] = useState({
    banco: "NEO",
    orgaoConvenio: "",
    nome: "",
    codigo: "",
    percentual: "",
    percentualComissaoBanco: "",
  });
  const [novaMeta, setNovaMeta] = useState({
    nome: "",
    tipo: "Empresa" as Meta["tipo"],
    responsavel: "",
    valor: "",
    inicio: hoje(),
    fim: hoje(),
  });

  async function obterToken() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error(
        "Sua sessão expirou. Entre novamente no sistema.",
      );
    }

    return data.session.access_token;
  }

  async function chamarApi(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    body?: unknown,
  ) {
    const token = await obterToken();

    const resposta = await fetch("/api/configuracoes", {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body
          ? {
              "Content-Type": "application/json",
            }
          : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const conteudo = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        conteudo.erro ||
          "Não foi possível concluir a operação.",
      );
    }

    return conteudo;
  }

  async function carregar() {
    setProcessando(true);

    try {
      const conteudo = await chamarApi("GET");

      const bancosApi = Array.isArray(conteudo.bancos)
        ? conteudo.bancos.map((item: Record<string, unknown>) => ({
            id: String(item.id || ""),
            nome: String(item.nome || ""),
            ativo: item.ativo !== false,
          }))
        : [];

      const orgaosApi = Array.isArray(conteudo.orgaosConvenios)
        ? conteudo.orgaosConvenios.map((item: Record<string, unknown>) => ({
            id: String(item.id || ""),
            nome: String(item.nome || ""),
            ativo: item.ativo !== false,
          }))
        : [];

      const tabelasApi = Array.isArray(conteudo.tabelas)
        ? conteudo.tabelas.map((item: Record<string, unknown>) => ({
            id: String(item.id || ""),
            banco: String(item.banco || ""),
            orgaoConvenio: String(item.orgao_convenio || ""),
            nome: String(item.nome || ""),
            codigo: String(item.codigo || ""),
            percentual: Number(item.percentual || 0),
            percentualComissaoBanco:
              item.percentual_comissao_banco === null ||
              item.percentual_comissao_banco === undefined
                ? null
                : Number(item.percentual_comissao_banco),
            ativo: item.ativo !== false,
          }))
        : [];

      setBancos(bancosApi);
      setOrgaosConvenios(orgaosApi);
      setTabelas(tabelasApi);

      const { data: financeiroData, error: financeiroErro } =
        await supabase
          .from("config_financeiro_itens")
          .select("id, tipo, nome, ativo, ordem")
          .order("tipo", { ascending: true })
          .order("ordem", { ascending: true })
          .order("nome", { ascending: true });

      if (financeiroErro) {
        throw new Error(financeiroErro.message);
      }

      setFinanceiroItens(
        (Array.isArray(financeiroData) ? financeiroData : []).map(
          (item) => ({
            id: String(item.id),
            tipo: String(item.tipo) as TipoConfigFinanceiro,
            nome: String(item.nome || ""),
            ativo: item.ativo !== false,
            ordem: Number(item.ordem || 0),
          }),
        ),
      );

      const { data: equipesData, error: equipesErro } =
        await supabase
          .from("config_equipes")
          .select("id, nome, ativo")
          .order("nome", { ascending: true });

      if (equipesErro) {
        throw new Error(equipesErro.message);
      }

      setEquipesConfiguradas(
        (Array.isArray(equipesData) ? equipesData : []).map((item) => ({
          id: String(item.id),
          nome: String(item.nome || ""),
          ativo: item.ativo !== false,
        })),
      );

      const { data: perfisData, error: perfisErro } =
        await supabase
          .from("config_perfis")
          .select("chave, nome_exibicao, ativo, ordem")
          .order("ordem", { ascending: true });

      if (perfisErro) {
        throw new Error(perfisErro.message);
      }

      setPerfisConfigurados(
        (Array.isArray(perfisData) ? perfisData : []).map((item) => ({
          chave: String(item.chave) as PerfilConfigurado["chave"],
          nomeExibicao: String(item.nome_exibicao || item.chave || ""),
          ativo: item.ativo !== false,
          ordem: Number(item.ordem || 0),
        })),
      );

      const { data: permissoesData, error: permissoesErro } =
        await supabase
          .from("config_permissoes")
          .select("perfil_chave, permissoes");

      if (permissoesErro) {
        throw new Error(permissoesErro.message);
      }

      const mapaPermissoes: Record<string, PermissoesPerfil> = {};

      (Array.isArray(permissoesData) ? permissoesData : []).forEach((item) => {
        const base = permissoesVazias();
        const recebidas =
          item && typeof item.permissoes === "object" && item.permissoes
            ? (item.permissoes as Partial<PermissoesPerfil>)
            : {};

        mapaPermissoes[String(item.perfil_chave)] = {
          ...base,
          ...recebidas,
        };
      });

      setPermissoesPorPerfil(mapaPermissoes);

      // Metas e geral permanecem locais por enquanto.
      try {
        setMetas(
          JSON.parse(
            localStorage.getItem("somos-eleva-config-metas") || "[]",
          ),
        );
      } catch {
        setMetas([]);
      }

      try {
        const salvo = JSON.parse(
          localStorage.getItem("somos-eleva-config-geral") || "null",
        );
        setGeral(salvo || configPadrao);
      } catch {
        setGeral(configPadrao);
      }
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar as configurações.",
      );

      setBancos(bancosPadrao);
      setTabelas(tabelasPadrao);
    } finally {
      setProcessando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [supabase]);

  function salvarGeral() {
    localStorage.setItem("somos-eleva-config-geral", JSON.stringify(geral));
    setMensagem("Configurações gerais salvas.");
  }

  async function adicionarBanco(event: FormEvent) {
    event.preventDefault();

    const nome = novoBanco.trim().toUpperCase();

    if (!nome) {
      setMensagem("Informe o nome do banco.");
      return;
    }

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("POST", {
        acao: "criar_banco",
        banco: {
          nome,
        },
      });

      setNovoBanco("");
      setMensagem(
        conteudo.mensagem ||
          "Banco cadastrado com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível cadastrar o banco.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function alternarBanco(id: string) {
    const banco = bancos.find((item) => item.id === id);

    if (!banco) return;

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("PATCH", {
        acao: "editar_banco",
        banco: {
          id,
          ativo: !banco.ativo,
        },
      });

      setMensagem(
        conteudo.mensagem ||
          "Banco atualizado com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar o banco.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function excluirBanco(id: string) {
    if (!window.confirm("Deseja excluir este banco?")) return;

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("DELETE", {
        tipo: "banco",
        id,
      });

      setMensagem(
        conteudo.mensagem ||
          "Banco excluído com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir o banco.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function adicionarOrgaoConvenio(event: FormEvent) {
    event.preventDefault();

    const nome = novoOrgaoConvenio.trim().toUpperCase();

    if (!nome) {
      setMensagem("Informe o nome do órgão / convênio.");
      return;
    }

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("POST", {
        acao: "criar_orgao_convenio",
        orgaoConvenio: { nome },
      });

      setNovoOrgaoConvenio("");
      setMensagem(
        conteudo.mensagem || "Órgão / convênio cadastrado com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível cadastrar o órgão / convênio.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function alternarOrgaoConvenio(id: string) {
    const orgao = orgaosConvenios.find((item) => item.id === id);
    if (!orgao) return;

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("PATCH", {
        acao: "editar_orgao_convenio",
        orgaoConvenio: {
          id,
          ativo: !orgao.ativo,
        },
      });

      setMensagem(
        conteudo.mensagem || "Órgão / convênio atualizado com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar o órgão / convênio.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function excluirOrgaoConvenio(id: string) {
    if (!window.confirm("Deseja excluir este órgão / convênio?")) return;

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("DELETE", {
        tipo: "orgao_convenio",
        id,
      });

      setMensagem(
        conteudo.mensagem || "Órgão / convênio excluído com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir o órgão / convênio.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function adicionarTabela(event: FormEvent) {
    event.preventDefault();

    const nome = novaTabela.nome.trim().toUpperCase();
    const codigo = novaTabela.codigo.trim();
    const percentual = numero(novaTabela.percentual);
    const percentualComissaoBancoTexto =
      novaTabela.percentualComissaoBanco.trim();
    const percentualComissaoBanco =
      percentualComissaoBancoTexto === ""
        ? null
        : numero(percentualComissaoBancoTexto);

    if (!novaTabela.banco) return setMensagem("Selecione o banco.");
    if (!nome) return setMensagem("Informe o nome da tabela.");
    if (!codigo) return setMensagem("Informe o código da tabela.");
    if (percentual <= 0 || percentual > 100) {
      return setMensagem("Informe um percentual de produção entre 0,01% e 100%.");
    }

    if (
      percentualComissaoBanco !== null &&
      (percentualComissaoBanco <= 0 || percentualComissaoBanco > 100)
    ) {
      return setMensagem(
        "Informe a comissão bancária entre 0,01% e 100%, ou deixe em branco.",
      );
    }

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("POST", {
        acao: "criar_tabela",
        tabela: {
          banco: novaTabela.banco,
          orgaoConvenio: novaTabela.orgaoConvenio,
          nome,
          codigo,
          percentual,
          percentualComissaoBanco,
        },
      });

      setNovaTabela({
        banco: bancos.find((item) => item.ativo)?.nome || "",
        orgaoConvenio: "",
        nome: "",
        codigo: "",
        percentual: "",
        percentualComissaoBanco: "",
      });

      setMensagem(
        conteudo.mensagem ||
          "Tabela cadastrada com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível cadastrar a tabela.",
      );
    } finally {
      setProcessando(false);
    }
  }

  function iniciarEdicaoTabela(tabela: Tabela) {
    setEditandoTabelaId(tabela.id);
    setEdicaoTabela({
      banco: tabela.banco,
      orgaoConvenio: tabela.orgaoConvenio || "",
      nome: tabela.nome,
      codigo: tabela.codigo,
      percentual: String(tabela.percentual).replace(".", ","),
      percentualComissaoBanco:
        tabela.percentualComissaoBanco === null
          ? ""
          : String(tabela.percentualComissaoBanco).replace(".", ","),
    });
    setMensagem("");
  }

  function cancelarEdicaoTabela() {
    setEditandoTabelaId(null);
    setEdicaoTabela({
      banco: "NEO",
      orgaoConvenio: "",
      nome: "",
      codigo: "",
      percentual: "",
      percentualComissaoBanco: "",
    });
  }

  async function salvarEdicaoTabela() {
    if (!editandoTabelaId) return;

    const nome = edicaoTabela.nome.trim().toUpperCase();
    const codigo = edicaoTabela.codigo.trim();
    const percentual = numero(edicaoTabela.percentual);
    const percentualComissaoBancoTexto =
      edicaoTabela.percentualComissaoBanco.trim();
    const percentualComissaoBanco =
      percentualComissaoBancoTexto === ""
        ? null
        : numero(percentualComissaoBancoTexto);

    if (!edicaoTabela.banco) return setMensagem("Selecione o banco.");
    if (!nome) return setMensagem("Informe o nome da tabela.");
    if (!codigo) return setMensagem("Informe o código da tabela.");
    if (percentual <= 0 || percentual > 100) {
      return setMensagem("Informe um percentual de produção entre 0,01% e 100%.");
    }

    if (
      percentualComissaoBanco !== null &&
      (percentualComissaoBanco <= 0 || percentualComissaoBanco > 100)
    ) {
      return setMensagem(
        "Informe a comissão bancária entre 0,01% e 100%, ou deixe em branco.",
      );
    }

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("PATCH", {
        acao: "editar_tabela",
        tabela: {
          id: editandoTabelaId,
          banco: edicaoTabela.banco,
          orgaoConvenio: edicaoTabela.orgaoConvenio,
          nome,
          codigo,
          percentual,
          percentualComissaoBanco,
        },
      });

      cancelarEdicaoTabela();

      setMensagem(
        conteudo.mensagem ||
          "Tabela atualizada com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar a tabela.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function alternarTabela(id: string) {
    const tabela = tabelas.find((item) => item.id === id);

    if (!tabela) return;

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("PATCH", {
        acao: "editar_tabela",
        tabela: {
          id,
          ativo: !tabela.ativo,
        },
      });

      setMensagem(
        conteudo.mensagem ||
          "Tabela atualizada com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar a tabela.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function excluirTabela(id: string) {
    if (!window.confirm("Deseja excluir esta tabela?")) return;

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("DELETE", {
        tipo: "tabela",
        id,
      });

      setMensagem(
        conteudo.mensagem ||
          "Tabela excluída com sucesso.",
      );

      if (editandoTabelaId === id) {
        cancelarEdicaoTabela();
      }

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir a tabela.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function adicionarFinanceiroItem(
    event: FormEvent,
  ) {
    event.preventDefault();

    const nome = novoFinanceiroNome.trim();

    if (!nome) {
      setMensagem("Informe o nome do item financeiro.");
      return;
    }

    setProcessando(true);
    setMensagem("");

    try {
      const maiorOrdem = financeiroItens
        .filter((item) => item.tipo === novoFinanceiroTipo)
        .reduce(
          (maior, item) => Math.max(maior, item.ordem),
          0,
        );

      const { error } = await supabase
        .from("config_financeiro_itens")
        .insert({
          tipo: novoFinanceiroTipo,
          nome,
          ativo: true,
          ordem: maiorOrdem + 1,
          atualizado_em: new Date().toISOString(),
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "Esse item já está cadastrado nessa categoria.",
          );
        }

        throw new Error(error.message);
      }

      setNovoFinanceiroNome("");
      setMensagem("Item financeiro cadastrado com sucesso.");
      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível cadastrar o item financeiro.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function alternarFinanceiroItem(
    item: ConfigFinanceiroItem,
  ) {
    setProcessando(true);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("config_financeiro_itens")
        .update({
          ativo: !item.ativo,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw new Error(error.message);

      setMensagem(
        item.ativo
          ? "Item financeiro desativado."
          : "Item financeiro ativado.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar o item financeiro.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function excluirFinanceiroItem(
    item: ConfigFinanceiroItem,
  ) {
    if (
      !window.confirm(
        `Deseja excluir "${item.nome}" das configurações financeiras?`,
      )
    ) {
      return;
    }

    setProcessando(true);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("config_financeiro_itens")
        .delete()
        .eq("id", item.id);

      if (error) throw new Error(error.message);

      setMensagem("Item financeiro excluído.");
      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir o item financeiro.",
      );
    } finally {
      setProcessando(false);
    }
  }

  const financeiroPorTipo = useMemo(() => {
    const base: Record<
      TipoConfigFinanceiro,
      ConfigFinanceiroItem[]
    > = {
      produto: [],
      banco: [],
      parceiro: [],
      categoria_entrada: [],
      categoria_saida: [],
    };

    financeiroItens.forEach((item) => {
      base[item.tipo].push(item);
    });

    return base;
  }, [financeiroItens]);

  async function adicionarEquipe(event: FormEvent) {
    event.preventDefault();

    const nome = novaEquipe.trim();

    if (!nome) {
      setMensagem("Informe o nome da equipe.");
      return;
    }

    setProcessando(true);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("config_equipes")
        .insert({
          nome,
          ativo: true,
          atualizado_em: new Date().toISOString(),
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Essa equipe já está cadastrada.");
        }
        throw new Error(error.message);
      }

      setNovaEquipe("");
      setMensagem("Equipe cadastrada com sucesso.");
      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível cadastrar a equipe.",
      );
    } finally {
      setProcessando(false);
    }
  }

  function iniciarEdicaoEquipe(equipe: EquipeConfigurada) {
    setEditandoEquipeId(equipe.id);
    setNomeEquipeEdicao(equipe.nome);
    setMensagem("");
  }

  function cancelarEdicaoEquipe() {
    setEditandoEquipeId(null);
    setNomeEquipeEdicao("");
  }

  async function salvarEdicaoEquipe() {
    if (!editandoEquipeId) return;

    const nome = nomeEquipeEdicao.trim();
    if (!nome) return setMensagem("Informe o nome da equipe.");

    setProcessando(true);
    setMensagem("");

    try {
      const equipeAnterior = equipesConfiguradas.find(
        (item) => item.id === editandoEquipeId,
      );

      const { error } = await supabase
        .from("config_equipes")
        .update({
          nome,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", editandoEquipeId);

      if (error) throw new Error(error.message);

      // Mantém os usuários já vinculados à equipe com o novo nome.
      if (equipeAnterior && equipeAnterior.nome !== nome) {
        const { error: usuariosErro } = await supabase
          .from("profiles")
          .update({ equipe: nome })
          .eq("equipe", equipeAnterior.nome);

        if (usuariosErro) throw new Error(usuariosErro.message);
      }

      cancelarEdicaoEquipe();
      setMensagem("Equipe atualizada com sucesso.");
      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar a equipe.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function alternarEquipe(equipe: EquipeConfigurada) {
    setProcessando(true);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("config_equipes")
        .update({
          ativo: !equipe.ativo,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", equipe.id);

      if (error) throw new Error(error.message);

      setMensagem(
        equipe.ativo ? "Equipe desativada." : "Equipe ativada.",
      );
      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível alterar a equipe.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function excluirEquipe(equipe: EquipeConfigurada) {
    const emUso = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("equipe", equipe.nome);

    if (emUso.error) {
      setMensagem(emUso.error.message);
      return;
    }

    if ((emUso.count || 0) > 0) {
      setMensagem(
        `Não é possível excluir "${equipe.nome}" porque existem usuários vinculados. Renomeie ou desative a equipe.`,
      );
      return;
    }

    if (!window.confirm(`Deseja excluir a equipe "${equipe.nome}"?`)) return;

    setProcessando(true);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("config_equipes")
        .delete()
        .eq("id", equipe.id);

      if (error) throw new Error(error.message);

      setMensagem("Equipe excluída.");
      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir a equipe.",
      );
    } finally {
      setProcessando(false);
    }
  }

  function alterarPermissao(chave: ChavePermissao, permitido: boolean) {
    setPermissoesPorPerfil((atual) => ({
      ...atual,
      [perfilPermissaoSelecionado]: {
        ...(atual[perfilPermissaoSelecionado] || permissoesVazias()),
        [chave]: permitido,
      },
    }));
  }

  async function salvarPermissoes() {
    setProcessando(true);
    setMensagem("");

    try {
      const permissoes =
        permissoesPorPerfil[perfilPermissaoSelecionado] ||
        permissoesVazias();

      const { error } = await supabase
        .from("config_permissoes")
        .upsert(
          {
            perfil_chave: perfilPermissaoSelecionado,
            permissoes,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: "perfil_chave" },
        );

      if (error) throw new Error(error.message);

      setMensagem("Permissões atualizadas com sucesso.");
      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar as permissões.",
      );
    } finally {
      setProcessando(false);
    }
  }

  function iniciarEdicaoPerfil(perfil: PerfilConfigurado) {
    setEditandoPerfilChave(perfil.chave);
    setNomePerfilEdicao(perfil.nomeExibicao);
    setMensagem("");
  }

  function cancelarEdicaoPerfil() {
    setEditandoPerfilChave(null);
    setNomePerfilEdicao("");
  }

  async function salvarEdicaoPerfil() {
    if (!editandoPerfilChave) return;

    const nomeExibicao = nomePerfilEdicao.trim();
    if (!nomeExibicao) {
      setMensagem("Informe o nome que será exibido para o perfil.");
      return;
    }

    setProcessando(true);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("config_perfis")
        .update({
          nome_exibicao: nomeExibicao,
          atualizado_em: new Date().toISOString(),
        })
        .eq("chave", editandoPerfilChave);

      if (error) throw new Error(error.message);

      cancelarEdicaoPerfil();
      setMensagem("Nome do perfil atualizado com sucesso.");
      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar o nome do perfil.",
      );
    } finally {
      setProcessando(false);
    }
  }

  function adicionarMeta(event: FormEvent) {
    event.preventDefault();

    const valor = numero(novaMeta.valor);
    if (!novaMeta.nome.trim()) return setMensagem("Informe o nome da meta.");
    if (valor <= 0) return setMensagem("Informe um valor de meta maior que zero.");

    const meta: Meta = {
      id: crypto.randomUUID(),
      nome: novaMeta.nome.trim(),
      tipo: novaMeta.tipo,
      responsavel: novaMeta.responsavel.trim(),
      valor,
      inicio: novaMeta.inicio,
      fim: novaMeta.fim,
      ativo: true,
    };

    const lista = [meta, ...metas];
    setMetas(lista);
    localStorage.setItem("somos-eleva-config-metas", JSON.stringify(lista));
    setNovaMeta({
      nome: "",
      tipo: "Empresa",
      responsavel: "",
      valor: "",
      inicio: hoje(),
      fim: hoje(),
    });
    setMensagem("Meta cadastrada.");
  }

  function alternarMeta(id: string) {
    const lista = metas.map((item) =>
      item.id === id ? { ...item, ativo: !item.ativo } : item
    );
    setMetas(lista);
    localStorage.setItem("somos-eleva-config-metas", JSON.stringify(lista));
  }

  function excluirMeta(id: string) {
    if (!window.confirm("Deseja excluir esta meta?")) return;
    const lista = metas.filter((item) => item.id !== id);
    setMetas(lista);
    localStorage.setItem("somos-eleva-config-metas", JSON.stringify(lista));
  }

  const tabelasFiltradas = useMemo(() => {
    const termo = buscaTabela.trim().toLowerCase();

    if (!termo) return tabelas;

    return tabelas.filter((tabela) => {
      const campos = [
        tabela.nome,
        tabela.banco,
        tabela.orgaoConvenio,
        tabela.codigo,
        String(tabela.percentual),
        tabela.percentualComissaoBanco === null
          ? ""
          : String(tabela.percentualComissaoBanco),
        tabela.ativo ? "ativa" : "inativa",
      ];

      return campos.some((campo) =>
        String(campo || "").toLowerCase().includes(termo),
      );
    });
  }, [tabelas, buscaTabela]);

  const resumo = useMemo(
    () => ({
      bancosAtivos: bancos.filter((item) => item.ativo).length,
      tabelasAtivas: tabelas.filter((item) => item.ativo).length,
      metasAtivas: metas.filter((item) => item.ativo).length,
    }),
    [bancos, tabelas, metas]
  );

  return (
    <div className="settings-page">
      <section className="settings-summary">
        <article><span>Bancos ativos</span><strong>{resumo.bancosAtivos}</strong></article>
        <article><span>Tabelas ativas</span><strong>{resumo.tabelasAtivas}</strong></article>
        <article><span>Metas ativas</span><strong>{resumo.metasAtivas}</strong></article>
        <article className="settings-highlight"><span>Multiplicador do saldo</span><strong>{geral.multiplicadorSaldo}x</strong></article>
      </section>

      <nav className="settings-tabs">
        <button className={aba === "geral" ? "active" : ""} onClick={() => setAba("geral")}>Geral</button>
        <button className={aba === "bancos" ? "active" : ""} onClick={() => setAba("bancos")}>Bancos</button>
        <button className={aba === "tabelas" ? "active" : ""} onClick={() => setAba("tabelas")}>Tabelas</button>
        <button className={aba === "equipes" ? "active" : ""} onClick={() => setAba("equipes")}>Equipes</button>
        <button className={aba === "perfis" ? "active" : ""} onClick={() => setAba("perfis")}>Perfis</button>
        <button className={aba === "permissoes" ? "active" : ""} onClick={() => setAba("permissoes")}>Permissões</button>
        <button className={aba === "financeiro" ? "active" : ""} onClick={() => setAba("financeiro")}>Financeiro</button>
        <button className={aba === "metas" ? "active" : ""} onClick={() => setAba("metas")}>Metas</button>
      </nav>

      {mensagem && <div className="settings-message">{mensagem}</div>}

      {aba === "geral" && (
        <section className="settings-card">
          <div className="settings-heading">
            <div><span>CONFIGURAÇÕES GERAIS</span><h2>Identidade e cálculo padrão</h2><p>Esses parâmetros serão usados pelos demais módulos.</p></div>
            <b>⚙</b>
          </div>

          <div className="settings-form-grid">
            <label>Nome do sistema<input value={geral.nomeSistema} onChange={e=>setGeral({...geral,nomeSistema:e.target.value})}/></label>
            <label>Nome da empresa<input value={geral.nomeEmpresa} onChange={e=>setGeral({...geral,nomeEmpresa:e.target.value})}/></label>
            <label>Multiplicador do saldo<input value={geral.multiplicadorSaldo} onChange={e=>setGeral({...geral,multiplicadorSaldo:Number(e.target.value)||0})} type="number"/></label>
            <label>Moeda<select value={geral.moeda} onChange={e=>setGeral({...geral,moeda:e.target.value})}><option value="BRL">Real brasileiro (BRL)</option></select></label>
          </div>

          <div className="settings-actions"><button onClick={salvarGeral}>Salvar configurações</button></div>
        </section>
      )}

      {aba === "bancos" && (
        <section className="settings-grid">
          <form className="settings-card" onSubmit={adicionarBanco}>
            <div className="settings-heading"><div><span>NOVO BANCO</span><h2>Cadastrar banco</h2></div><b>+</b></div>
            <label className="settings-single-label">Nome do banco<input value={novoBanco} onChange={e=>setNovoBanco(e.target.value)} placeholder="Ex.: BANCO MASTER"/></label>
            <div className="settings-actions"><button type="submit">Adicionar banco</button></div>
          </form>

          <section className="settings-card">
            <div className="settings-list-heading"><div><span>BANCOS CADASTRADOS</span><h2>Instituições disponíveis</h2></div><b>{bancos.length}</b></div>
            <div className="settings-list">
              {bancos.map(banco=>(
                <article key={banco.id}>
                  <div className="settings-icon">B</div>
                  <div><strong>{banco.nome}</strong><span>{banco.ativo ? "Disponível no sistema" : "Desativado"}</span></div>
                  <span className={banco.ativo ? "status-active" : "status-inactive"}>{banco.ativo ? "Ativo" : "Inativo"}</span>
                  <div className="settings-row-actions">
                    <button onClick={() => void alternarBanco(banco.id)}>{banco.ativo ? "Desativar" : "Ativar"}</button>
                    <button className="delete" onClick={() => void excluirBanco(banco.id)}>Excluir</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {aba === "tabelas" && (
        <>
          <section className="settings-grid settings-grid-orgaos">
            <form className="settings-card" onSubmit={adicionarOrgaoConvenio}>
              <div className="settings-heading">
                <div>
                  <span>ÓRGÃOS / CONVÊNIOS</span>
                  <h2>Cadastrar órgão / convênio</h2>
                  <p>Cadastre aqui Governo, Prefeitura ou qualquer novo convênio que liberar.</p>
                </div>
                <b>+</b>
              </div>

              <label className="settings-single-label">
                Nome do órgão / convênio
                <input
                  value={novoOrgaoConvenio}
                  onChange={(e) => setNovoOrgaoConvenio(e.target.value)}
                  placeholder="Ex.: GOVERNO DE GO"
                  disabled={processando}
                />
              </label>

              <div className="settings-actions">
                <button type="submit" disabled={processando}>
                  {processando ? "Salvando..." : "Adicionar órgão / convênio"}
                </button>
              </div>
            </form>

            <section className="settings-card">
              <div className="settings-list-heading">
                <div>
                  <span>CADASTRADOS</span>
                  <h2>Órgãos e convênios disponíveis</h2>
                </div>
                <b>{orgaosConvenios.length}</b>
              </div>

              <div className="settings-list">
                {orgaosConvenios.map((orgao) => (
                  <article key={orgao.id}>
                    <div className="settings-icon">O</div>
                    <div>
                      <strong>{orgao.nome}</strong>
                      <span>{orgao.ativo ? "Disponível no sistema" : "Desativado"}</span>
                    </div>
                    <span className={orgao.ativo ? "status-active" : "status-inactive"}>
                      {orgao.ativo ? "Ativo" : "Inativo"}
                    </span>
                    <div className="settings-row-actions">
                      <button
                        type="button"
                        onClick={() => void alternarOrgaoConvenio(orgao.id)}
                        disabled={processando}
                      >
                        {orgao.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        className="delete"
                        onClick={() => void excluirOrgaoConvenio(orgao.id)}
                        disabled={processando}
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section className="settings-grid settings-grid-tabelas">
          <form className="settings-card" onSubmit={adicionarTabela}>
            <div className="settings-heading">
              <div>
                <span>NOVA TABELA</span>
                <h2>Cadastrar tabela</h2>
                <p>
                  Banco, código e percentual ficam salvos no Supabase e valem para toda a equipe.
                </p>
              </div>
              <b>%</b>
            </div>

            <div className="settings-form-grid">
              <label>
                Banco
                <select
                  value={novaTabela.banco}
                  onChange={(e) =>
                    setNovaTabela({
                      ...novaTabela,
                      banco: e.target.value,
                    })
                  }
                  disabled={processando}
                >
                  {bancos
                    .filter((banco) => banco.ativo)
                    .map((banco) => (
                      <option key={banco.id} value={banco.nome}>
                        {banco.nome}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Órgão / Convênio
                <select
                  value={novaTabela.orgaoConvenio}
                  onChange={(e) =>
                    setNovaTabela({
                      ...novaTabela,
                      orgaoConvenio: e.target.value,
                    })
                  }
                  disabled={processando}
                >
                  <option value="">Sem órgão específico</option>
                  <option value="GOVERNO DE SP">GOVERNO DE SP</option>
                  <option value="GOVERNO MA">GOVERNO MA</option>
                </select>
              </label>

              <label>
                Nome da tabela
                <input
                  value={novaTabela.nome}
                  onChange={(e) =>
                    setNovaTabela({
                      ...novaTabela,
                      nome: e.target.value,
                    })
                  }
                  placeholder="Ex.: FLEX 1"
                  disabled={processando}
                />
              </label>

              <label>
                Código da tabela
                <input
                  value={novaTabela.codigo}
                  onChange={(e) =>
                    setNovaTabela({
                      ...novaTabela,
                      codigo: e.target.value,
                    })
                  }
                  placeholder="Ex.: 379"
                  inputMode="numeric"
                  disabled={processando}
                />
              </label>

              <label>
                % para produção
                <input
                  value={novaTabela.percentual}
                  onChange={(e) =>
                    setNovaTabela({
                      ...novaTabela,
                      percentual: e.target.value,
                    })
                  }
                  placeholder="Ex.: 75"
                  inputMode="decimal"
                  disabled={processando}
                />
              </label>

              <label>
                % comissão banco
                <input
                  value={novaTabela.percentualComissaoBanco}
                  onChange={(e) =>
                    setNovaTabela({
                      ...novaTabela,
                      percentualComissaoBanco: e.target.value,
                    })
                  }
                  placeholder="Ex.: 28,5"
                  inputMode="decimal"
                  disabled={processando}
                />
                <small>
                  Quanto a Eleva recebe do banco. Pode deixar em branco e preencher depois.
                </small>
              </label>
            </div>

            <div className="settings-actions">
              <button type="submit" disabled={processando}>
                {processando ? "Salvando..." : "Adicionar tabela"}
              </button>
            </div>
          </form>

          <section className="settings-card">
            <div className="settings-list-heading">
              <div>
                <span>TABELAS CADASTRADAS</span>
                <h2>Regras de produção</h2>
                <p>
                  Alterações feitas aqui ficam disponíveis para todos os usuários do sistema.
                </p>
              </div>
              <b>{tabelas.length}</b>
            </div>

            <div className="settings-table-search">
              <div className="settings-table-search-field">
                <span>🔎</span>
                <input
                  type="search"
                  value={buscaTabela}
                  onChange={(e) => setBuscaTabela(e.target.value)}
                  placeholder="Pesquisar tabela, código, banco ou órgão / convênio..."
                />
                {buscaTabela && (
                  <button
                    type="button"
                    onClick={() => setBuscaTabela("")}
                    title="Limpar pesquisa"
                  >
                    ×
                  </button>
                )}
              </div>

              <small>
                {buscaTabela
                  ? `${tabelasFiltradas.length} de ${tabelas.length} tabela(s) encontrada(s)`
                  : `${tabelas.length} tabela(s) cadastrada(s)`}
              </small>
            </div>

            <div className="settings-table-head settings-table-grid">
              <span>Tabela</span>
              <span>Banco</span>
              <span>Órgão / Convênio</span>
              <span>Código</span>
              <span>% Produção</span>
              <span>% Comissão banco</span>
              <span>Status</span>
              <span>Ações</span>
            </div>

            <div className="settings-table-list">
              {tabelasFiltradas.map((tabela) => {
                const editando = editandoTabelaId === tabela.id;

                return (
                  <article
                    key={tabela.id}
                    className="settings-table-grid settings-table-row-new"
                  >
                    {editando ? (
                      <>
                        <div>
                          <input
                            value={edicaoTabela.nome}
                            onChange={(e) =>
                              setEdicaoTabela({
                                ...edicaoTabela,
                                nome: e.target.value,
                              })
                            }
                            disabled={processando}
                          />
                        </div>

                        <div>
                          <select
                            value={edicaoTabela.banco}
                            onChange={(e) =>
                              setEdicaoTabela({
                                ...edicaoTabela,
                                banco: e.target.value,
                              })
                            }
                            disabled={processando}
                          >
                            {bancos
                              .filter((banco) => banco.ativo)
                              .map((banco) => (
                                <option key={banco.id} value={banco.nome}>
                                  {banco.nome}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <select
                            value={edicaoTabela.orgaoConvenio}
                            onChange={(e) =>
                              setEdicaoTabela({
                                ...edicaoTabela,
                                orgaoConvenio: e.target.value,
                              })
                            }
                            disabled={processando}
                          >
                            <option value="">Sem órgão específico</option>
                            {orgaosConvenios
                              .filter((item) => item.ativo)
                              .map((item) => (
                                <option key={item.id} value={item.nome}>
                                  {item.nome}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <input
                            value={edicaoTabela.codigo}
                            onChange={(e) =>
                              setEdicaoTabela({
                                ...edicaoTabela,
                                codigo: e.target.value,
                              })
                            }
                            inputMode="numeric"
                            disabled={processando}
                          />
                        </div>

                        <div>
                          <input
                            value={edicaoTabela.percentual}
                            onChange={(e) =>
                              setEdicaoTabela({
                                ...edicaoTabela,
                                percentual: e.target.value,
                              })
                            }
                            inputMode="decimal"
                            disabled={processando}
                          />
                        </div>

                        <div>
                          <input
                            value={edicaoTabela.percentualComissaoBanco}
                            onChange={(e) =>
                              setEdicaoTabela({
                                ...edicaoTabela,
                                percentualComissaoBanco: e.target.value,
                              })
                            }
                            inputMode="decimal"
                            placeholder="Ex.: 28,5"
                            disabled={processando}
                          />
                        </div>

                        <span
                          className={
                            tabela.ativo
                              ? "status-active"
                              : "status-inactive"
                          }
                        >
                          {tabela.ativo ? "Ativa" : "Inativa"}
                        </span>

                        <div className="settings-row-actions">
                          <button
                            type="button"
                            className="save-edit"
                            onClick={() => void salvarEdicaoTabela()}
                            disabled={processando}
                          >
                            Salvar
                          </button>

                          <button
                            type="button"
                            onClick={cancelarEdicaoTabela}
                            disabled={processando}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <strong>{tabela.nome}</strong>
                          <span>
                            {tabela.banco} • Código {tabela.codigo || "—"}
                          </span>
                        </div>

                        <div>
                          <strong>{tabela.banco}</strong>
                        </div>

                        <div>
                          <strong>{tabela.orgaoConvenio || "—"}</strong>
                        </div>

                        <div>
                          <b>{tabela.codigo || "—"}</b>
                        </div>

                        <div>
                          <b className="settings-percent-value">
                            {String(tabela.percentual).replace(".", ",")}%
                          </b>
                        </div>

                        <div>
                          <b className="settings-percent-value">
                            {tabela.percentualComissaoBanco === null
                              ? "Não informado"
                              : `${String(tabela.percentualComissaoBanco).replace(".", ",")}%`}
                          </b>
                        </div>

                        <span
                          className={
                            tabela.ativo
                              ? "status-active"
                              : "status-inactive"
                          }
                        >
                          {tabela.ativo ? "Ativa" : "Inativa"}
                        </span>

                        <div className="settings-row-actions">
                          <button
                            type="button"
                            onClick={() => iniciarEdicaoTabela(tabela)}
                            disabled={processando}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => void alternarTabela(tabela.id)}
                            disabled={processando}
                          >
                            {tabela.ativo ? "Desativar" : "Ativar"}
                          </button>

                          <button
                            type="button"
                            className="delete"
                            onClick={() => void excluirTabela(tabela.id)}
                            disabled={processando}
                          >
                            Excluir
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
              {tabelasFiltradas.length === 0 && (
                <div className="settings-table-empty">
                  Nenhuma tabela encontrada para “{buscaTabela}”.
                </div>
              )}
            </div>
          </section>
          </section>
        </>
      )}

      {aba === "equipes" && (
        <section className="settings-grid">
          <form className="settings-card" onSubmit={adicionarEquipe}>
            <div className="settings-heading">
              <div>
                <span>NOVA EQUIPE</span>
                <h2>Cadastrar equipe</h2>
                <p>
                  Os nomes cadastrados aqui aparecem no campo Equipe dos usuários.
                </p>
              </div>
              <b>+</b>
            </div>

            <label className="settings-single-label">
              Nome da equipe
              <input
                value={novaEquipe}
                onChange={(e) => setNovaEquipe(e.target.value)}
                placeholder="Ex.: Comercial Compra"
                disabled={processando}
              />
            </label>

            <div className="settings-actions">
              <button type="submit" disabled={processando}>
                {processando ? "Salvando..." : "Adicionar equipe"}
              </button>
            </div>
          </form>

          <section className="settings-card">
            <div className="settings-list-heading">
              <div>
                <span>EQUIPES CADASTRADAS</span>
                <h2>Equipes disponíveis</h2>
                <p>
                  Renomeie, ative ou desative sem precisar alterar o código.
                </p>
              </div>
              <b>{equipesConfiguradas.length}</b>
            </div>

            <div className="settings-list">
              {equipesConfiguradas.length === 0 ? (
                <div className="settings-empty">
                  Nenhuma equipe cadastrada.
                </div>
              ) : (
                equipesConfiguradas.map((equipe) => (
                  <article key={equipe.id}>
                    <div className="settings-icon">E</div>

                    <div>
                      {editandoEquipeId === equipe.id ? (
                        <input
                          value={nomeEquipeEdicao}
                          onChange={(e) =>
                            setNomeEquipeEdicao(e.target.value)
                          }
                          disabled={processando}
                        />
                      ) : (
                        <>
                          <strong>{equipe.nome}</strong>
                          <span>
                            {equipe.ativo
                              ? "Disponível no cadastro de usuários"
                              : "Desativada"}
                          </span>
                        </>
                      )}
                    </div>

                    <span
                      className={
                        equipe.ativo
                          ? "status-active"
                          : "status-inactive"
                      }
                    >
                      {equipe.ativo ? "Ativa" : "Inativa"}
                    </span>

                    <div className="settings-row-actions">
                      {editandoEquipeId === equipe.id ? (
                        <>
                          <button
                            type="button"
                            className="save-edit"
                            onClick={() => void salvarEdicaoEquipe()}
                            disabled={processando}
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={cancelarEdicaoEquipe}
                            disabled={processando}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => iniciarEdicaoEquipe(equipe)}
                            disabled={processando}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void alternarEquipe(equipe)}
                            disabled={processando}
                          >
                            {equipe.ativo ? "Desativar" : "Ativar"}
                          </button>
                          <button
                            type="button"
                            className="delete"
                            onClick={() => void excluirEquipe(equipe)}
                            disabled={processando}
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      )}

      {aba === "perfis" && (
        <section className="settings-card">
          <div className="settings-list-heading">
            <div>
              <span>PERFIS DE ACESSO</span>
              <h2>Nomes exibidos no sistema</h2>
              <p>
                Você pode trocar o nome que aparece na tela sem alterar as permissões internas do sistema.
              </p>
            </div>
            <b>{perfisConfigurados.length}</b>
          </div>

          <div className="settings-list">
            {perfisConfigurados.map((perfil) => (
              <article key={perfil.chave}>
                <div className="settings-icon">P</div>

                <div>
                  {editandoPerfilChave === perfil.chave ? (
                    <input
                      value={nomePerfilEdicao}
                      onChange={(e) => setNomePerfilEdicao(e.target.value)}
                      disabled={processando}
                    />
                  ) : (
                    <>
                      <strong>{perfil.nomeExibicao}</strong>
                      <span>Perfil interno: {perfil.chave}</span>
                    </>
                  )}
                </div>

                <span className="status-active">Ativo</span>

                <div className="settings-row-actions">
                  {editandoPerfilChave === perfil.chave ? (
                    <>
                      <button
                        type="button"
                        className="save-edit"
                        onClick={() => void salvarEdicaoPerfil()}
                        disabled={processando}
                      >
                        Salvar
                      </button>

                      <button
                        type="button"
                        onClick={cancelarEdicaoPerfil}
                        disabled={processando}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => iniciarEdicaoPerfil(perfil)}
                      disabled={processando}
                    >
                      Editar nome
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="settings-warning" style={{ marginTop: 16 }}>
            <strong>Importante:</strong>
            <span>
              alterar o nome exibido não muda o nível de acesso. Assim você pode renomear “Administradora” para “Diretoria”, por exemplo, sem quebrar as permissões.
            </span>
          </div>
        </section>
      )}

      {aba === "permissoes" && (
        <section className="settings-card">
          <div className="settings-list-heading">
            <div>
              <span>CONTROLE DE ACESSO</span>
              <h2>Permissões por perfil</h2>
              <p>
                Selecione um perfil e marque exatamente o que deve aparecer para ele no sistema.
              </p>
            </div>
            <b>🔐</b>
          </div>

          <div style={{ marginTop: 18, maxWidth: 460 }}>
            <label className="settings-single-label">
              Perfil
              <select
                value={perfilPermissaoSelecionado}
                onChange={(e) =>
                  setPerfilPermissaoSelecionado(
                    e.target.value as PerfilConfigurado["chave"],
                  )
                }
                disabled={processando}
              >
                {perfisConfigurados
                  .filter((perfil) => perfil.ativo)
                  .map((perfil) => (
                    <option key={perfil.chave} value={perfil.chave}>
                      {perfil.nomeExibicao}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {(["MENU", "INFORMAÇÕES SENSÍVEIS"] as const).map((grupo) => (
            <div key={grupo} style={{ marginTop: 24 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#155eef",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                {grupo}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 10,
                }}
              >
                {PERMISSOES_DISPONIVEIS
                  .filter((item) => item.grupo === grupo)
                  .map((item) => {
                    const marcado =
                      permissoesPorPerfil[perfilPermissaoSelecionado]?.[
                        item.chave
                      ] || false;

                    return (
                      <label
                        key={item.chave}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "13px 14px",
                          border: "1px solid #dfe6f1",
                          borderRadius: 12,
                          background: marcado ? "#f1f6ff" : "#ffffff",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={(e) =>
                            alterarPermissao(item.chave, e.target.checked)
                          }
                          disabled={processando}
                        />
                        <span>{item.titulo}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          ))}

          <div className="settings-actions" style={{ marginTop: 24 }}>
            <button
              type="button"
              onClick={() => void salvarPermissoes()}
              disabled={processando}
            >
              {processando ? "Salvando..." : "Salvar permissões"}
            </button>
          </div>

          <div className="settings-warning" style={{ marginTop: 16 }}>
            <strong>Importante:</strong>
            <span>
              O nome exibido do perfil pode mudar, mas as permissões continuam ligadas ao perfil interno.
            </span>
          </div>
        </section>
      )}

      {aba === "financeiro" && (
        <>
          <section className="settings-grid">
            <form
              className="settings-card"
              onSubmit={adicionarFinanceiroItem}
            >
              <div className="settings-heading">
                <div>
                  <span>CONFIGURAÇÃO FINANCEIRA</span>
                  <h2>Adicionar item</h2>
                  <p>
                    Produtos, bancos e categorias usados no Financeiro.
                  </p>
                </div>
                <b>R$</b>
              </div>

              <div className="settings-form-grid">
                <label>
                  Tipo
                  <select
                    value={novoFinanceiroTipo}
                    onChange={(e) =>
                      setNovoFinanceiroTipo(
                        e.target.value as TipoConfigFinanceiro,
                      )
                    }
                    disabled={processando}
                  >
                    <option value="produto">Produto</option>
                    <option value="banco">Banco</option>
                    <option value="parceiro">Parceiro</option>
                    <option value="categoria_entrada">
                      Categoria de entrada
                    </option>
                    <option value="categoria_saida">
                      Categoria de saída
                    </option>
                  </select>
                </label>

                <label>
                  Nome
                  <input
                    value={novoFinanceiroNome}
                    onChange={(e) =>
                      setNovoFinanceiroNome(e.target.value)
                    }
                    placeholder="Digite o nome"
                    disabled={processando}
                  />
                </label>
              </div>

              <div className="settings-actions">
                <button type="submit" disabled={processando}>
                  {processando
                    ? "Salvando..."
                    : "Adicionar ao Financeiro"}
                </button>
              </div>
            </form>

            <section className="settings-card">
              <div className="settings-list-heading">
                <div>
                  <span>RESUMO FINANCEIRO</span>
                  <h2>Itens configurados</h2>
                </div>
                <b>{financeiroItens.length}</b>
              </div>

              <div className="settings-list">
                <article>
                  <div className="settings-icon">P</div>
                  <div>
                    <strong>Produtos</strong>
                    <span>
                      {
                        financeiroPorTipo.produto.filter(
                          (item) => item.ativo,
                        ).length
                      } ativos
                    </span>
                  </div>
                </article>

                <article>
                  <div className="settings-icon">B</div>
                  <div>
                    <strong>Bancos</strong>
                    <span>
                      {
                        financeiroPorTipo.banco.filter(
                          (item) => item.ativo,
                        ).length
                      } ativos
                    </span>
                  </div>
                </article>

                <article>
                  <div className="settings-icon">P</div>
                  <div>
                    <strong>Parceiros</strong>
                    <span>
                      {
                        financeiroPorTipo.parceiro.filter(
                          (item) => item.ativo,
                        ).length
                      } ativos
                    </span>
                  </div>
                </article>

                <article>
                  <div className="settings-icon">E</div>
                  <div>
                    <strong>Categorias de entrada</strong>
                    <span>
                      {
                        financeiroPorTipo.categoria_entrada.filter(
                          (item) => item.ativo,
                        ).length
                      } ativas
                    </span>
                  </div>
                </article>

                <article>
                  <div className="settings-icon">S</div>
                  <div>
                    <strong>Categorias de saída</strong>
                    <span>
                      {
                        financeiroPorTipo.categoria_saida.filter(
                          (item) => item.ativo,
                        ).length
                      } ativas
                    </span>
                  </div>
                </article>
              </div>
            </section>
          </section>

          {(
            [
              ["produto", "Produtos financeiros", "P"],
              ["banco", "Bancos do financeiro", "B"],
              ["parceiro", "Parceiros do financeiro", "P"],
              [
                "categoria_entrada",
                "Categorias de entrada",
                "E",
              ],
              [
                "categoria_saida",
                "Categorias de saída",
                "S",
              ],
            ] as Array<
              [TipoConfigFinanceiro, string, string]
            >
          ).map(([tipo, titulo, icone]) => (
            <section className="settings-card" key={tipo}>
              <div className="settings-list-heading">
                <div>
                  <span>FINANCEIRO</span>
                  <h2>{titulo}</h2>
                </div>
                <b>{financeiroPorTipo[tipo].length}</b>
              </div>

              <div className="settings-list">
                {financeiroPorTipo[tipo].length === 0 ? (
                  <div className="settings-empty">
                    Nenhum item cadastrado.
                  </div>
                ) : (
                  financeiroPorTipo[tipo].map((item) => (
                    <article key={item.id}>
                      <div className="settings-icon">
                        {icone}
                      </div>

                      <div>
                        <strong>{item.nome}</strong>
                        <span>
                          {item.ativo
                            ? "Disponível no Financeiro"
                            : "Desativado"}
                        </span>
                      </div>

                      <span
                        className={
                          item.ativo
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        {item.ativo ? "Ativo" : "Inativo"}
                      </span>

                      <div className="settings-row-actions">
                        <button
                          type="button"
                          onClick={() =>
                            void alternarFinanceiroItem(item)
                          }
                          disabled={processando}
                        >
                          {item.ativo
                            ? "Desativar"
                            : "Ativar"}
                        </button>

                        <button
                          type="button"
                          className="delete"
                          onClick={() =>
                            void excluirFinanceiroItem(item)
                          }
                          disabled={processando}
                        >
                          Excluir
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </>
      )}

      {aba === "metas" && (
        <section className="settings-grid">
          <form className="settings-card" onSubmit={adicionarMeta}>
            <div className="settings-heading"><div><span>NOVA META</span><h2>Cadastrar objetivo</h2></div><b>◎</b></div>
            <div className="settings-form-grid">
              <label>Nome da meta<input value={novaMeta.nome} onChange={e=>setNovaMeta({...novaMeta,nome:e.target.value})} placeholder="Ex.: Meta mensal Compra de Dívida"/></label>
              <label>Tipo<select value={novaMeta.tipo} onChange={e=>setNovaMeta({...novaMeta,tipo:e.target.value as Meta["tipo"]})}><option>Empresa</option><option>Equipe</option><option>Consultora</option></select></label>
              <label>Responsável<input value={novaMeta.responsavel} onChange={e=>setNovaMeta({...novaMeta,responsavel:e.target.value})} placeholder="Empresa, equipe ou consultora"/></label>
              <label>Valor da meta<input value={novaMeta.valor} onChange={e=>setNovaMeta({...novaMeta,valor:e.target.value})} placeholder="Ex.: 500.000,00" inputMode="decimal"/></label>
              <label>Data inicial<input type="date" value={novaMeta.inicio} onChange={e=>setNovaMeta({...novaMeta,inicio:e.target.value})}/></label>
              <label>Data final<input type="date" value={novaMeta.fim} onChange={e=>setNovaMeta({...novaMeta,fim:e.target.value})}/></label>
            </div>
            <div className="settings-actions"><button type="submit">Adicionar meta</button></div>
          </form>

          <section className="settings-card">
            <div className="settings-list-heading"><div><span>METAS CADASTRADAS</span><h2>Objetivos da operação</h2></div><b>{metas.length}</b></div>
            <div className="settings-list">
              {metas.length===0 ? <div className="settings-empty">Nenhuma meta cadastrada.</div> :
                metas.map(meta=>(
                  <article key={meta.id}>
                    <div className="settings-icon">◎</div>
                    <div><strong>{meta.nome}</strong><span>{meta.tipo}{meta.responsavel ? ` • ${meta.responsavel}` : ""}</span></div>
                    <div><strong>{moeda(meta.valor)}</strong><span>{meta.inicio} até {meta.fim}</span></div>
                    <span className={meta.ativo ? "status-active" : "status-inactive"}>{meta.ativo ? "Ativa" : "Inativa"}</span>
                    <div className="settings-row-actions">
                      <button onClick={()=>alternarMeta(meta.id)}>{meta.ativo ? "Desativar" : "Ativar"}</button>
                      <button className="delete" onClick={()=>excluirMeta(meta.id)}>Excluir</button>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        </section>
      )}

      <section className="settings-warning">
        <strong>Integração preparada:</strong>
        <span>as tabelas e metas ficam centralizadas para serem usadas pelos módulos de Simulação, Propostas, Dashboard e Ranking.</span>
      </section>
    </div>
  );
}