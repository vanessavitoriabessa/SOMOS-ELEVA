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
  orgaosConvenios: OrgaoConvenio[];
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
  | "campanhas"
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
  { chave: "campanhas", titulo: "Campanhas", grupo: "MENU" },
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
  | "fornecedor_neo"
  | "fornecedor_3rn"
  | "categoria_entrada"
  | "categoria_saida";

type ConfigFinanceiroItem = {
  id: string;
  tipo: TipoConfigFinanceiro;
  nome: string;
  ativo: boolean;
  ordem: number;
};

type RegraComissao = {
  id: string;
  nome: string;
  produto: string;
  percentual: number;
  observacao: string;
  ativo: boolean;
};


type PremiacaoPlano = {
  id: string;
  codigo: string;
  nome: string;
  cargoChave: string;
  produto: string;
  tipoCalculo: string;
  unidadeResultado: "PONTOS" | "REAIS" | "MISTO";
  vigenciaInicio: string;
  vigenciaFim: string;
  ativo: boolean;
  parametros: Record<string, any>;
  observacao: string;
};

type PremiacaoFaixa = {
  id: string;
  planoId: string;
  ordem: number;
  nomeFaixa: string;
  valorMin: number;
  valorMax: number | null;
  tipoRecompensa: "PONTOS" | "REAIS" | "PERCENTUAL";
  valorRecompensa: number;
  bonusReais: number;
  ativo: boolean;
  observacao: string;
};

type NovaPremiacaoFaixa = {
  nomeFaixa: string;
  valorMin: string;
  valorMax: string;
  tipoRecompensa: PremiacaoFaixa["tipoRecompensa"];
  valorRecompensa: string;
  bonusReais: string;
  observacao: string;
};

type StatusPropostaConfigurado = {
  id: string; nome: string;
  tipo: "EM_ANDAMENTO" | "PAGO" | "CANCELADO";
  prazoDias: number | null; ordem: number; ativo: boolean;
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
  fusoHorario: string;
  formatoData: string;
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
  { id: "neo-normal-399", banco: "NEO", orgaoConvenio: "", orgaosConvenios: [], nome: "NORMAL", codigo: "399", percentual: 100, percentualComissaoBanco: null, ativo: true },
  { id: "neo-flex-1-379", banco: "NEO", orgaoConvenio: "", orgaosConvenios: [], nome: "FLEX 1", codigo: "379", percentual: 75, percentualComissaoBanco: null, ativo: true },
  { id: "neo-flex-2-359", banco: "NEO", orgaoConvenio: "", orgaosConvenios: [], nome: "FLEX 2", codigo: "359", percentual: 50, percentualComissaoBanco: null, ativo: true },
  { id: "neo-flex-3-339", banco: "NEO", orgaoConvenio: "", orgaosConvenios: [], nome: "FLEX 3", codigo: "339", percentual: 40, percentualComissaoBanco: null, ativo: true },
  { id: "neo-flex-4-319", banco: "NEO", orgaoConvenio: "", orgaosConvenios: [], nome: "FLEX 4", codigo: "319", percentual: 20, percentualComissaoBanco: null, ativo: true },
  { id: "neo-flex-5-299", banco: "NEO", orgaoConvenio: "", orgaosConvenios: [], nome: "FLEX 5", codigo: "299", percentual: 8, percentualComissaoBanco: null, ativo: true },
];

const configPadrao: ConfiguracaoGeral = {
  nomeSistema: "SOMOS ELEVA",
  nomeEmpresa: "Eleva Promotora de Crédito",
  multiplicadorSaldo: 22,
  moeda: "BRL",
  fusoHorario: "America/Sao_Paulo",
  formatoData: "dd/mm/aaaa",
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
    | "geral"
    | "preferencias"
    | "bancos"
    | "orgaos"
    | "tabelas"
    | "status"
    | "equipes"
    | "perfis"
    | "permissoes"
    | "financeiro"
    | "comissoes"
    | "logs"
    | "metas"
  >("geral");
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [orgaosConvenios, setOrgaosConvenios] = useState<OrgaoConvenio[]>([]);
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [orgaosNovaTabela, setOrgaosNovaTabela] = useState<string[]>([]);
  const [orgaosEdicaoTabela, setOrgaosEdicaoTabela] = useState<string[]>([]);
  const [abrirOrgaosNovaTabela, setAbrirOrgaosNovaTabela] = useState(false);
  const [abrirOrgaosEdicao, setAbrirOrgaosEdicao] = useState(false);
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

  const [statusPropostas, setStatusPropostas] = useState<StatusPropostaConfigurado[]>([]);
  const [novoStatus, setNovoStatus] = useState({ nome:"", tipo:"EM_ANDAMENTO" as StatusPropostaConfigurado["tipo"], prazoDias:"", ordem:"" });
  const [editandoStatusId, setEditandoStatusId] = useState<string | null>(null);
  const [edicaoStatus, setEdicaoStatus] = useState({ nome:"", tipo:"EM_ANDAMENTO" as StatusPropostaConfigurado["tipo"], prazoDias:"", ordem:"" });
  const [metas, setMetas] = useState<Meta[]>([]);
  const [geral, setGeral] = useState<ConfiguracaoGeral>(configPadrao);
  const [mensagem, setMensagem] = useState("");
  const [processando, setProcessando] = useState(false);

  // Define em quais módulos cada banco deve aparecer.
  // A persistência é feita na tabela public.config_banco_modulos (SQL incluído no pacote).
  const [bancoModulos, setBancoModulos] = useState<Record<string, string[]>>({});
  const [salvandoBancoModulo, setSalvandoBancoModulo] = useState<string | null>(null);

  const [financeiroItens, setFinanceiroItens] =
    useState<ConfigFinanceiroItem[]>([]);
  const [novoFinanceiroTipo, setNovoFinanceiroTipo] =
    useState<TipoConfigFinanceiro>("produto");
  const [novoFinanceiroNome, setNovoFinanceiroNome] =
    useState("");

  const [planosPremiacao, setPlanosPremiacao] = useState<PremiacaoPlano[]>([]);
  const [faixasPremiacao, setFaixasPremiacao] = useState<PremiacaoFaixa[]>([]);
  const [planoPremiacaoSelecionadoId, setPlanoPremiacaoSelecionadoId] =
    useState("");
  const [carregandoPremiacao, setCarregandoPremiacao] = useState(false);
  const [salvandoPremiacaoId, setSalvandoPremiacaoId] = useState<string | null>(
    null,
  );
  const [novaFaixaPremiacao, setNovaFaixaPremiacao] =
    useState<NovaPremiacaoFaixa>({
      nomeFaixa: "",
      valorMin: "",
      valorMax: "",
      tipoRecompensa: "PONTOS",
      valorRecompensa: "",
      bonusReais: "",
      observacao: "",
    });

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

  function numeroPremiacao(valor: string | number | null | undefined) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    return numero(String(valor ?? ""));
  }

  function formatarNumeroPremiacao(valor: number | null) {
    if (valor === null || valor === undefined) return "";
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  function parametrosPlanoAtualizados(
    plano: PremiacaoPlano,
    caminho: string[],
    valor: unknown,
  ) {
    const raiz = structuredClone(plano.parametros || {});
    let cursor: Record<string, any> = raiz;

    caminho.forEach((chave, indice) => {
      if (indice === caminho.length - 1) {
        cursor[chave] = valor;
        return;
      }

      if (!cursor[chave] || typeof cursor[chave] !== "object") {
        cursor[chave] = {};
      }

      cursor = cursor[chave] as Record<string, any>;
    });

    return raiz;
  }

  async function carregarPremiacao() {
    setCarregandoPremiacao(true);

    try {
      const [{ data: planosData, error: planosErro }, { data: faixasData, error: faixasErro }] =
        await Promise.all([
          supabase
            .from("premiacao_planos")
            .select(
              "id, codigo, nome, cargo_chave, produto, tipo_calculo, unidade_resultado, vigencia_inicio, vigencia_fim, ativo, parametros, observacao",
            )
            .order("nome", { ascending: true }),
          supabase
            .from("premiacao_faixas")
            .select(
              "id, plano_id, ordem, nome_faixa, valor_min, valor_max, tipo_recompensa, valor_recompensa, bonus_reais, ativo, observacao",
            )
            .order("ordem", { ascending: true }),
        ]);

      if (planosErro) throw new Error(planosErro.message);
      if (faixasErro) throw new Error(faixasErro.message);

      const planosNormalizados: PremiacaoPlano[] = (
        Array.isArray(planosData) ? planosData : []
      ).map((item) => ({
        id: String(item.id || ""),
        codigo: String(item.codigo || ""),
        nome: String(item.nome || ""),
        cargoChave: String(item.cargo_chave || ""),
        produto: String(item.produto || ""),
        tipoCalculo: String(item.tipo_calculo || ""),
        unidadeResultado: String(
          item.unidade_resultado || "PONTOS",
        ) as PremiacaoPlano["unidadeResultado"],
        vigenciaInicio: String(item.vigencia_inicio || ""),
        vigenciaFim: String(item.vigencia_fim || ""),
        ativo: item.ativo !== false,
        parametros:
          item.parametros && typeof item.parametros === "object"
            ? (item.parametros as Record<string, any>)
            : {},
        observacao: String(item.observacao || ""),
      }));

      const faixasNormalizadas: PremiacaoFaixa[] = (
        Array.isArray(faixasData) ? faixasData : []
      ).map((item) => ({
        id: String(item.id || ""),
        planoId: String(item.plano_id || ""),
        ordem: Number(item.ordem || 0),
        nomeFaixa: String(item.nome_faixa || ""),
        valorMin: Number(item.valor_min || 0),
        valorMax:
          item.valor_max === null || item.valor_max === undefined
            ? null
            : Number(item.valor_max),
        tipoRecompensa: String(
          item.tipo_recompensa || "PONTOS",
        ) as PremiacaoFaixa["tipoRecompensa"],
        valorRecompensa: Number(item.valor_recompensa || 0),
        bonusReais: Number(item.bonus_reais || 0),
        ativo: item.ativo !== false,
        observacao: String(item.observacao || ""),
      }));

      setPlanosPremiacao(planosNormalizados);
      setFaixasPremiacao(faixasNormalizadas);

      setPlanoPremiacaoSelecionadoId((atual) => {
        if (
          atual &&
          planosNormalizados.some((plano) => plano.id === atual)
        ) {
          return atual;
        }

        return planosNormalizados[0]?.id || "";
      });
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar as regras de premiação.",
      );
    } finally {
      setCarregandoPremiacao(false);
    }
  }

  function atualizarPlanoPremiacaoLocal(
    id: string,
    alteracoes: Partial<PremiacaoPlano>,
  ) {
    setPlanosPremiacao((lista) =>
      lista.map((plano) =>
        plano.id === id ? { ...plano, ...alteracoes } : plano,
      ),
    );
  }

  function atualizarParametroPremiacao(
    planoId: string,
    caminho: string[],
    valor: unknown,
  ) {
    setPlanosPremiacao((lista) =>
      lista.map((plano) =>
        plano.id === planoId
          ? {
              ...plano,
              parametros: parametrosPlanoAtualizados(plano, caminho, valor),
            }
          : plano,
      ),
    );
  }

  async function salvarPlanoPremiacao(plano: PremiacaoPlano) {
    setSalvandoPremiacaoId(plano.id);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("premiacao_planos")
        .update({
          nome: plano.nome.trim(),
          cargo_chave: plano.cargoChave.trim() || null,
          produto: plano.produto.trim() || null,
          unidade_resultado: plano.unidadeResultado,
          vigencia_inicio: plano.vigenciaInicio || null,
          vigencia_fim: plano.vigenciaFim || null,
          ativo: plano.ativo,
          parametros: plano.parametros || {},
          observacao: plano.observacao.trim() || null,
        })
        .eq("id", plano.id);

      if (error) throw new Error(error.message);

      setMensagem("Regra de premiação atualizada com sucesso.");
      await carregarPremiacao();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar a regra de premiação.",
      );
    } finally {
      setSalvandoPremiacaoId(null);
    }
  }

  async function alternarPlanoPremiacao(plano: PremiacaoPlano) {
    const atualizado = { ...plano, ativo: !plano.ativo };
    atualizarPlanoPremiacaoLocal(plano.id, { ativo: atualizado.ativo });
    await salvarPlanoPremiacao(atualizado);
  }

  function atualizarFaixaPremiacaoLocal(
    id: string,
    alteracoes: Partial<PremiacaoFaixa>,
  ) {
    setFaixasPremiacao((lista) =>
      lista.map((faixa) =>
        faixa.id === id ? { ...faixa, ...alteracoes } : faixa,
      ),
    );
  }

  async function salvarFaixaPremiacao(faixa: PremiacaoFaixa) {
    setSalvandoPremiacaoId(faixa.id);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("premiacao_faixas")
        .update({
          ordem: faixa.ordem,
          nome_faixa: faixa.nomeFaixa.trim(),
          valor_min: faixa.valorMin,
          valor_max: faixa.valorMax,
          tipo_recompensa: faixa.tipoRecompensa,
          valor_recompensa: faixa.valorRecompensa,
          bonus_reais: faixa.bonusReais,
          ativo: faixa.ativo,
          observacao: faixa.observacao.trim() || null,
        })
        .eq("id", faixa.id);

      if (error) throw new Error(error.message);

      setMensagem("Faixa atualizada com sucesso.");
      await carregarPremiacao();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar a faixa.",
      );
    } finally {
      setSalvandoPremiacaoId(null);
    }
  }

  async function excluirFaixaPremiacao(faixa: PremiacaoFaixa) {
    if (!window.confirm(`Deseja excluir a faixa "${faixa.nomeFaixa}"?`)) {
      return;
    }

    setSalvandoPremiacaoId(faixa.id);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("premiacao_faixas")
        .delete()
        .eq("id", faixa.id);

      if (error) throw new Error(error.message);

      setMensagem("Faixa excluída.");
      await carregarPremiacao();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir a faixa.",
      );
    } finally {
      setSalvandoPremiacaoId(null);
    }
  }

  async function adicionarFaixaPremiacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!planoPremiacaoSelecionadoId) {
      setMensagem("Selecione um plano de premiação.");
      return;
    }

    const valorMin = numeroPremiacao(novaFaixaPremiacao.valorMin);
    const valorMax = novaFaixaPremiacao.valorMax.trim()
      ? numeroPremiacao(novaFaixaPremiacao.valorMax)
      : null;
    const valorRecompensa = numeroPremiacao(
      novaFaixaPremiacao.valorRecompensa,
    );
    const bonusReais = numeroPremiacao(novaFaixaPremiacao.bonusReais);

    if (!novaFaixaPremiacao.nomeFaixa.trim()) {
      setMensagem("Informe o nome da faixa.");
      return;
    }

    const faixasDoPlano = faixasPremiacao.filter(
      (faixa) => faixa.planoId === planoPremiacaoSelecionadoId,
    );
    const proximaOrdem =
      Math.max(0, ...faixasDoPlano.map((faixa) => faixa.ordem)) + 1;

    setSalvandoPremiacaoId("nova-faixa");
    setMensagem("");

    try {
      const { error } = await supabase.from("premiacao_faixas").insert({
        plano_id: planoPremiacaoSelecionadoId,
        ordem: proximaOrdem,
        nome_faixa: novaFaixaPremiacao.nomeFaixa.trim(),
        valor_min: valorMin,
        valor_max: valorMax,
        tipo_recompensa: novaFaixaPremiacao.tipoRecompensa,
        valor_recompensa: valorRecompensa,
        bonus_reais: bonusReais,
        ativo: true,
        observacao: novaFaixaPremiacao.observacao.trim() || null,
      });

      if (error) throw new Error(error.message);

      setNovaFaixaPremiacao({
        nomeFaixa: "",
        valorMin: "",
        valorMax: "",
        tipoRecompensa: "PONTOS",
        valorRecompensa: "",
        bonusReais: "",
        observacao: "",
      });

      setMensagem("Nova faixa adicionada.");
      await carregarPremiacao();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível adicionar a faixa.",
      );
    } finally {
      setSalvandoPremiacaoId(null);
    }
  }

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
            orgaosConvenios: Array.isArray(item.orgaos_convenios)
              ? (item.orgaos_convenios as Record<string, unknown>[]).map((orgao) => ({
                  id: String(orgao.id || ""),
                  nome: String(orgao.nome || ""),
                  ativo: orgao.ativo !== false,
                }))
              : [],
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
      setStatusPropostas(
        (Array.isArray(conteudo.statusPropostas) ? conteudo.statusPropostas : []).map((item: Record<string, unknown>) => ({
          id: String(item.id || ""), nome: String(item.nome || ""),
          tipo: String(item.tipo || "EM_ANDAMENTO") as StatusPropostaConfigurado["tipo"],
          prazoDias: item.prazo_dias == null ? null : Number(item.prazo_dias),
          ordem: Number(item.ordem || 0), ativo: item.ativo !== false,
        }))
      );

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

  async function carregarBancoModulos() {
    try {
      const { data, error } = await supabase
        .from("config_banco_modulos")
        .select("banco_id, modulo");

      if (error) {
        // Enquanto a migration ainda não tiver sido executada, não quebra Configurações.
        if (String(error.code || "") === "42P01") return;
        throw error;
      }

      const mapa: Record<string, string[]> = {};

      (Array.isArray(data) ? data : []).forEach((item) => {
        const bancoId = String(item.banco_id || "");
        const modulo = String(item.modulo || "");
        if (!bancoId || !modulo) return;

        mapa[bancoId] = Array.from(new Set([...(mapa[bancoId] || []), modulo]));
      });

      setBancoModulos(mapa);
    } catch {
      // O restante das configurações continua funcionando mesmo sem a tabela nova.
    }
  }

  async function alternarBancoModulo(
    bancoId: string,
    modulo: "CLT" | "COMPRA_DIVIDA",
  ) {
    const chave = `${bancoId}:${modulo}`;
    setSalvandoBancoModulo(chave);
    setMensagem("");

    try {
      const marcado = (bancoModulos[bancoId] || []).includes(modulo);

      if (marcado) {
        const { error } = await supabase
          .from("config_banco_modulos")
          .delete()
          .eq("banco_id", bancoId)
          .eq("modulo", modulo);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("config_banco_modulos")
          .upsert(
            {
              banco_id: bancoId,
              modulo,
              atualizado_em: new Date().toISOString(),
            },
            { onConflict: "banco_id,modulo" },
          );

        if (error) throw error;
      }

      await carregarBancoModulos();
      setMensagem("Disponibilidade do banco atualizada.");
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar onde o banco aparece.",
      );
    } finally {
      setSalvandoBancoModulo(null);
    }
  }

  useEffect(() => {
    void carregar();
    void carregarBancoModulos();
  }, [supabase]);


  useEffect(() => {
    if (aba === "comissoes") {
      void carregarPremiacao();
    }
  }, [aba, supabase]);


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

  function alternarOrgaoSelecionado(
    id: string,
    selecionados: string[],
    definir: (ids: string[]) => void,
  ) {
    definir(
      selecionados.includes(id)
        ? selecionados.filter((item) => item !== id)
        : [...selecionados, id],
    );
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
          orgaoConvenioIds: orgaosNovaTabela,
          nome,
          codigo,
          percentual,
          percentualComissaoBanco,
        },
      });

      setAbrirOrgaosNovaTabela(false);
      setOrgaosNovaTabela([]);
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
    setAbrirOrgaosEdicao(false);
    setEditandoTabelaId(tabela.id);
    setOrgaosEdicaoTabela(tabela.orgaosConvenios.map((item) => item.id));
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
    setAbrirOrgaosEdicao(false);
    setEditandoTabelaId(null);
    setOrgaosEdicaoTabela([]);
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
          orgaoConvenioIds: orgaosEdicaoTabela,
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

  async function adicionarStatus(event: FormEvent) {
    event.preventDefault();
    const nome = novoStatus.nome.trim().toUpperCase();
    if (!nome) return setMensagem("Informe o nome do status.");
    setProcessando(true); setMensagem("");
    try {
      const conteudo = await chamarApi("POST", { acao:"criar_status_proposta", statusProposta:{
        nome, tipo:novoStatus.tipo,
        prazoDias: novoStatus.prazoDias === "" ? null : Number(novoStatus.prazoDias),
        ordem: novoStatus.ordem === "" ? statusPropostas.length * 10 + 10 : Number(novoStatus.ordem),
      }});
      setNovoStatus({nome:"",tipo:"EM_ANDAMENTO",prazoDias:"",ordem:""});
      setMensagem(conteudo.mensagem || "Status cadastrado com sucesso."); await carregar();
    } catch(e) { setMensagem(e instanceof Error ? e.message : "Não foi possível cadastrar o status."); }
    finally { setProcessando(false); }
  }

  function iniciarEdicaoStatus(item: StatusPropostaConfigurado) {
    setEditandoStatusId(item.id);
    setEdicaoStatus({nome:item.nome,tipo:item.tipo,prazoDias:item.prazoDias == null ? "" : String(item.prazoDias),ordem:String(item.ordem)});
  }
  function cancelarEdicaoStatus() { setEditandoStatusId(null); setEdicaoStatus({nome:"",tipo:"EM_ANDAMENTO",prazoDias:"",ordem:""}); }

  async function salvarEdicaoStatus() {
    if (!editandoStatusId) return;
    const nome=edicaoStatus.nome.trim().toUpperCase(); if(!nome) return setMensagem("Informe o nome do status.");
    setProcessando(true); setMensagem("");
    try {
      const conteudo=await chamarApi("PATCH",{acao:"editar_status_proposta",statusProposta:{
        id:editandoStatusId,nome,tipo:edicaoStatus.tipo,
        prazoDias:edicaoStatus.prazoDias === "" ? null : Number(edicaoStatus.prazoDias),
        ordem:edicaoStatus.ordem === "" ? 0 : Number(edicaoStatus.ordem),
      }});
      cancelarEdicaoStatus(); setMensagem(conteudo.mensagem || "Status atualizado com sucesso."); await carregar();
    } catch(e){setMensagem(e instanceof Error ? e.message : "Não foi possível atualizar o status.");}
    finally{setProcessando(false);}
  }

  async function alternarStatus(item: StatusPropostaConfigurado) {
    setProcessando(true); setMensagem("");
    try {
      const conteudo=await chamarApi("PATCH",{acao:"editar_status_proposta",statusProposta:{id:item.id,ativo:!item.ativo}});
      setMensagem(conteudo.mensagem || "Status atualizado."); await carregar();
    } catch(e){setMensagem(e instanceof Error ? e.message : "Não foi possível alterar o status.");}
    finally{setProcessando(false);}
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
      fornecedor_neo: [],
      fornecedor_3rn: [],
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
        tabela.orgaosConvenios.map((item) => item.nome).join(" "),
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

  const planoPremiacaoSelecionado =
    planosPremiacao.find(
      (plano) => plano.id === planoPremiacaoSelecionadoId,
    ) || null;

  const faixasPlanoSelecionado = faixasPremiacao
    .filter((faixa) => faixa.planoId === planoPremiacaoSelecionadoId)
    .sort((a, b) => a.ordem - b.ordem);

  const totalFaixasPremiacao = faixasPremiacao.length;
  const totalPlanosAtivos = planosPremiacao.filter(
    (plano) => plano.ativo,
  ).length;

  return (
    <div className="settings-page">
      <section className="settings-v3-intro">
        <div className="settings-v3-intro-icon">⚙</div>
        <div className="settings-v3-intro-copy">
          <span>CENTRAL DO SISTEMA</span>
          <h2>Configurações</h2>
          <p>
            Controle tudo que define como o sistema funciona. Cadastre, edite e personalize as regras do negócio.
          </p>
        </div>
      </section>

      <section className="settings-v3-summary">
        <article className="blue">
          <div className="settings-v3-kpi-icon">B</div>
          <div>
            <span>Bancos</span>
            <strong>{bancos.length}</strong>
            <small>instituições cadastradas</small>
          </div>
        </article>

        <article className="green">
          <div className="settings-v3-kpi-icon">T</div>
          <div>
            <span>Tabelas</span>
            <strong>{tabelas.length}</strong>
            <small>regras de produção</small>
          </div>
        </article>

        <article className="orange">
          <div className="settings-v3-kpi-icon">S</div>
          <div>
            <span>Status</span>
            <strong>{statusPropostas.length}</strong>
            <small>status de propostas</small>
          </div>
        </article>

        <article className="purple">
          <div className="settings-v3-kpi-icon">E</div>
          <div>
            <span>Equipes</span>
            <strong>{equipesConfiguradas.length}</strong>
            <small>equipes cadastradas</small>
          </div>
        </article>

        <article className="pink">
          <div className="settings-v3-kpi-icon">P</div>
          <div>
            <span>Perfis</span>
            <strong>{perfisConfigurados.length}</strong>
            <small>perfis de acesso</small>
          </div>
        </article>

        <article className="teal">
          <div className="settings-v3-kpi-icon">×</div>
          <div>
            <span>Multiplicador</span>
            <strong>{geral.multiplicadorSaldo}x</strong>
            <small>do saldo de comissão</small>
          </div>
        </article>
      </section>

      <div className="settings-admin-layout">
        <aside className="settings-admin-sidebar">
          <div className="settings-admin-sidebar-title">
            <span>CONFIGURAÇÕES</span>
            <strong>Central do sistema</strong>
          </div>

          <div className="settings-v3-side-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Buscar configurações..."
              aria-label="Buscar configurações"
            />
          </div>

          <div className="settings-admin-group">
            <small>GERAL</small>
            <button className={aba === "geral" ? "active" : ""} onClick={() => setAba("geral")}>
              <span className="settings-nav-icon">⚙</span><span><b>Informações do sistema</b><em>Identidade e parâmetros</em></span>
            </button>
            <button className={aba === "preferencias" ? "active" : ""} onClick={() => setAba("preferencias")}>
              <span className="settings-nav-icon">◉</span><span><b>Preferências</b><em>Data, moeda e padrões</em></span>
            </button>
          </div>

          <div className="settings-admin-group">
            <small>COMERCIAL</small>
            <button className={aba === "bancos" ? "active" : ""} onClick={() => setAba("bancos")}>
              <span className="settings-nav-icon">B</span><span><b>Bancos</b><em>{bancos.length} cadastrados</em></span>
            </button>
            <button className={aba === "orgaos" ? "active" : ""} onClick={() => setAba("orgaos")}>
              <span className="settings-nav-icon">O</span><span><b>Órgãos e convênios</b><em>{orgaosConvenios.length} cadastrados</em></span>
            </button>
            <button className={aba === "tabelas" ? "active" : ""} onClick={() => setAba("tabelas")}>
              <span className="settings-nav-icon">%</span><span><b>Tabelas de produção</b><em>{tabelas.length} regras</em></span>
            </button>
            <button className={aba === "status" ? "active" : ""} onClick={() => setAba("status")}>
              <span className="settings-nav-icon">S</span><span><b>Status das propostas</b><em>{statusPropostas.length} etapas</em></span>
            </button>
            <button className={aba === "metas" ? "active" : ""} onClick={() => setAba("metas")}>
              <span className="settings-nav-icon">◎</span><span><b>Metas</b><em>Objetivos comerciais</em></span>
            </button>
          </div>

          <div className="settings-admin-group">
            <small>PESSOAS E ACESSO</small>
            <button className={aba === "equipes" ? "active" : ""} onClick={() => setAba("equipes")}>
              <span className="settings-nav-icon">E</span><span><b>Equipes</b><em>{equipesConfiguradas.length} cadastradas</em></span>
            </button>
            <button className={aba === "perfis" ? "active" : ""} onClick={() => setAba("perfis")}>
              <span className="settings-nav-icon">P</span><span><b>Cargos e perfis</b><em>{perfisConfigurados.length} níveis</em></span>
            </button>
            <button className={aba === "permissoes" ? "active" : ""} onClick={() => setAba("permissoes")}>
              <span className="settings-nav-icon">🔒</span><span><b>Permissões</b><em>Menus e dados sensíveis</em></span>
            </button>
          </div>

          <div className="settings-admin-group">
            <small>FINANCEIRO</small>
            <button className={aba === "financeiro" ? "active" : ""} onClick={() => setAba("financeiro")}>
              <span className="settings-nav-icon">R$</span><span><b>Cadastros financeiros</b><em>Produtos, parceiros e categorias</em></span>
            </button>
            <button className={aba === "comissoes" ? "active" : ""} onClick={() => setAba("comissoes")}>
              <span className="settings-nav-icon">★</span><span><b>Regras de Premiação</b><em>Faixas, pontos e critérios</em></span>
            </button>
          </div>

          <div className="settings-admin-group">
            <small>OUTROS</small>
            <button className={aba === "logs" ? "active" : ""} onClick={() => setAba("logs")}>
              <span className="settings-nav-icon">◷</span><span><b>Logs do sistema</b><em>Auditoria e histórico</em></span>
            </button>
          </div>
        </aside>

        <main className="settings-admin-content">

          {mensagem && <div className="settings-message">{mensagem}</div>}

      {aba === "geral" && (
        <section className="settings-card settings-v3-general-card">
          <div className="settings-v3-section-head">
            <div className="settings-v3-section-icon">⚙</div>
            <div>
              <h2>Informações do sistema</h2>
              <p>Defina a identidade do sistema e os parâmetros principais. Essas informações serão usadas em todos os módulos.</p>
            </div>
            <span className="settings-v3-active-pill">● Configuração ativa</span>
          </div>

          <div className="settings-v3-inner-card">
            <div className="settings-v3-inner-title">
              <div className="settings-v3-inner-icon">▦</div>
              <div>
                <strong>Dados básicos</strong>
                <span>Nome, empresa e parâmetros principais.</span>
              </div>
            </div>

            <div className="settings-form-grid settings-v3-form-grid">
              <label>
                Nome do sistema
                <input value={geral.nomeSistema} onChange={e=>setGeral({...geral,nomeSistema:e.target.value})}/>
                <small>Nome que aparece no topo do sistema.</small>
              </label>
              <label>
                Nome da empresa
                <input value={geral.nomeEmpresa} onChange={e=>setGeral({...geral,nomeEmpresa:e.target.value})}/>
                <small>Razão social ou nome exibido da empresa.</small>
              </label>
              <label>
                Multiplicador do saldo
                <input value={geral.multiplicadorSaldo} onChange={e=>setGeral({...geral,multiplicadorSaldo:Number(e.target.value)||0})} type="number"/>
                <small>Define o multiplicador usado no cálculo da premiação.</small>
              </label>
              <label>
                Moeda
                <select value={geral.moeda} onChange={e=>setGeral({...geral,moeda:e.target.value})}>
                  <option value="BRL">Real brasileiro (BRL)</option>
                </select>
                <small>Moeda padrão do sistema.</small>
              </label>
            </div>
          </div>

          <div className="settings-v3-inner-card">
            <div className="settings-v3-inner-title">
              <div className="settings-v3-inner-icon">☷</div>
              <div>
                <strong>Configurações adicionais</strong>
                <span>Outras preferências que afetam o funcionamento do sistema.</span>
              </div>
            </div>

            <div className="settings-form-grid settings-v3-form-grid">
              <label>
                Fuso horário
                <select value={geral.fusoHorario} onChange={e=>setGeral({...geral,fusoHorario:e.target.value})}>
                  <option value="America/Sao_Paulo">(GMT-03:00) Brasília</option>
                </select>
                <small>Usado para datas e relatórios.</small>
              </label>
              <label>
                Formato de data
                <select value={geral.formatoData} onChange={e=>setGeral({...geral,formatoData:e.target.value})}>
                  <option value="dd/mm/aaaa">dd/mm/aaaa</option>
                </select>
                <small>Formato de exibição das datas.</small>
              </label>
            </div>
          </div>

          <div className="settings-v3-footer-actions">
            <button
              type="button"
              className="settings-v3-restore"
              onClick={() => setGeral(configPadrao)}
            >
              ↶ Restaurar padrão
            </button>
            <button
              type="button"
              className="settings-v3-save"
              onClick={salvarGeral}
            >
              ▣ Salvar configurações
            </button>
          </div>
        </section>
      )}


      {aba === "preferencias" && (
        <section className="settings-card settings-v6-preferences">
          <div className="settings-v6-page-head">
            <div>
              <span>PREFERÊNCIAS DO SISTEMA</span>
              <h2>Padrões de exibição e funcionamento</h2>
              <p>Defina formatos usados no dia a dia sem alterar regras comerciais.</p>
            </div>
            <b>◉</b>
          </div>

          <div className="settings-v6-preference-grid">
            <article>
              <div className="settings-v6-pref-icon">◷</div>
              <div>
                <strong>Fuso horário</strong>
                <span>Usado em datas, relatórios e horários do sistema.</span>
              </div>
              <select
                value={geral.fusoHorario}
                onChange={(e) => setGeral({ ...geral, fusoHorario: e.target.value })}
              >
                <option value="America/Sao_Paulo">(GMT-03:00) Brasília</option>
              </select>
            </article>

            <article>
              <div className="settings-v6-pref-icon">▣</div>
              <div>
                <strong>Formato de data</strong>
                <span>Padrão utilizado para exibir datas nas telas.</span>
              </div>
              <select
                value={geral.formatoData}
                onChange={(e) => setGeral({ ...geral, formatoData: e.target.value })}
              >
                <option value="dd/mm/aaaa">dd/mm/aaaa</option>
              </select>
            </article>

            <article>
              <div className="settings-v6-pref-icon">R$</div>
              <div>
                <strong>Moeda</strong>
                <span>Moeda padrão para valores e relatórios.</span>
              </div>
              <select
                value={geral.moeda}
                onChange={(e) => setGeral({ ...geral, moeda: e.target.value })}
              >
                <option value="BRL">Real brasileiro (BRL)</option>
              </select>
            </article>

            <article>
              <div className="settings-v6-pref-icon">×</div>
              <div>
                <strong>Multiplicador do saldo</strong>
                <span>Parâmetro usado no cálculo de saldo e premiação.</span>
              </div>
              <input
                type="number"
                value={geral.multiplicadorSaldo}
                onChange={(e) =>
                  setGeral({
                    ...geral,
                    multiplicadorSaldo: Number(e.target.value) || 0,
                  })
                }
              />
            </article>
          </div>

          <div className="settings-v6-page-actions">
            <button type="button" className="secondary" onClick={() => setGeral(configPadrao)}>
              Restaurar padrão
            </button>
            <button type="button" onClick={salvarGeral}>Salvar preferências</button>
          </div>
        </section>
      )}

      {aba === "bancos" && (
        <section className="settings-v6-stack">
          <section className="settings-card settings-v6-bank-create">
            <div className="settings-v6-page-head">
              <div>
                <span>BANCOS</span>
                <h2>Instituições do sistema</h2>
                <p>Cadastre o banco e defina exatamente em quais operações ele deve aparecer.</p>
              </div>
              <b>{bancos.length}</b>
            </div>

            <form className="settings-v6-inline-create" onSubmit={adicionarBanco}>
              <label>
                Nome do banco
                <input
                  value={novoBanco}
                  onChange={(e) => setNovoBanco(e.target.value)}
                  placeholder="Ex.: BANCO MASTER"
                />
              </label>
              <button type="submit" disabled={processando}>
                + Adicionar banco
              </button>
            </form>
          </section>

          <section className="settings-card">
            <div className="settings-v6-list-head">
              <div>
                <span>DISPONIBILIDADE</span>
                <h2>Onde cada banco aparece</h2>
                <p>
                  CLT e Compra de Dívida ficam independentes. Assim a equipe vê apenas os bancos corretos em cada operação.
                </p>
              </div>
            </div>

            <div className="settings-v6-bank-table">
              <div className="settings-v6-bank-table-head">
                <span>Banco</span>
                <span>CLT</span>
                <span>Compra de Dívida</span>
                <span>Status</span>
                <span>Ações</span>
              </div>

              {bancos.map((banco) => {
                const modulos = bancoModulos[banco.id] || [];
                const clt = modulos.includes("CLT");
                const compra = modulos.includes("COMPRA_DIVIDA");

                return (
                  <article key={banco.id} className="settings-v6-bank-row">
                    <div className="settings-v6-entity">
                      <span className="settings-v6-entity-icon">B</span>
                      <div>
                        <strong>{banco.nome}</strong>
                        <small>{banco.ativo ? "Disponível no sistema" : "Banco desativado"}</small>
                      </div>
                    </div>

                    <label className={`settings-v6-module-toggle ${clt ? "selected" : ""}`}>
                      <input
                        type="checkbox"
                        checked={clt}
                        disabled={salvandoBancoModulo === `${banco.id}:CLT`}
                        onChange={() => void alternarBancoModulo(banco.id, "CLT")}
                      />
                      <span>CLT</span>
                    </label>

                    <label className={`settings-v6-module-toggle ${compra ? "selected" : ""}`}>
                      <input
                        type="checkbox"
                        checked={compra}
                        disabled={salvandoBancoModulo === `${banco.id}:COMPRA_DIVIDA`}
                        onChange={() => void alternarBancoModulo(banco.id, "COMPRA_DIVIDA")}
                      />
                      <span>Compra de Dívida</span>
                    </label>

                    <span className={banco.ativo ? "status-active" : "status-inactive"}>
                      {banco.ativo ? "Ativo" : "Inativo"}
                    </span>

                    <div className="settings-row-actions">
                      <button type="button" onClick={() => void alternarBanco(banco.id)}>
                        {banco.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button type="button" className="delete" onClick={() => void excluirBanco(banco.id)}>
                        Excluir
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="settings-v6-example">
              <strong>Exemplo recomendado:</strong>
              <span>3RN e C6 → CLT</span>
              <span>NEO, AMIGOZ e FUTURO → Compra de Dívida</span>
            </div>
          </section>
        </section>
      )}

      {aba === "orgaos" && (
        <section className="settings-grid settings-grid-orgaos">
          <form className="settings-card" onSubmit={adicionarOrgaoConvenio}>
            <div className="settings-heading">
              <div>
                <span>NOVO ÓRGÃO / CONVÊNIO</span>
                <h2>Cadastrar convênio</h2>
                <p>Governo, Prefeitura ou qualquer convênio utilizado nas tabelas.</p>
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
                <h2>Órgãos e convênios</h2>
                <p>Lista central usada nas regras de produção.</p>
              </div>
              <b>{orgaosConvenios.length}</b>
            </div>

            <div className="settings-list settings-v6-clean-list">
              {orgaosConvenios.map((orgao) => (
                <article key={orgao.id}>
                  <div className="settings-icon">O</div>
                  <div>
                    <strong>{orgao.nome}</strong>
                    <span>{orgao.ativo ? "Disponível para vincular às tabelas" : "Desativado"}</span>
                  </div>
                  <span className={orgao.ativo ? "status-active" : "status-inactive"}>
                    {orgao.ativo ? "Ativo" : "Inativo"}
                  </span>
                  <div className="settings-row-actions">
                    <button type="button" onClick={() => void alternarOrgaoConvenio(orgao.id)}>
                      {orgao.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button type="button" className="delete" onClick={() => void excluirOrgaoConvenio(orgao.id)}>
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {aba === "tabelas" && (
        <>
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

              <div className="settings-multi-field">
                <span>Órgãos / Convênios</span>

                <button
                  type="button"
                  className="settings-multi-trigger"
                  onClick={() => setAbrirOrgaosNovaTabela((atual) => !atual)}
                  disabled={processando}
                >
                  <span className={orgaosNovaTabela.length ? "has-value" : ""}>
                    {orgaosNovaTabela.length === 0
                      ? "Selecionar órgãos / convênios"
                      : orgaosNovaTabela.length === 1
                        ? orgaosConvenios.find((item) => item.id === orgaosNovaTabela[0])?.nome
                        : `${orgaosNovaTabela.length} órgãos selecionados`}
                  </span>
                  <b>{abrirOrgaosNovaTabela ? "▲" : "▼"}</b>
                </button>

                {abrirOrgaosNovaTabela && (
                  <div className="settings-multi-dropdown">
                    <div className="settings-multi-dropdown-top">
                      <strong>Selecione um ou mais</strong>
                      {orgaosNovaTabela.length > 0 && (
                        <button type="button" onClick={() => setOrgaosNovaTabela([])}>
                          Limpar
                        </button>
                      )}
                    </div>

                    <div className="settings-multi-list">
                      {orgaosConvenios.filter((item) => item.ativo).map((item) => {
                        const marcado = orgaosNovaTabela.includes(item.id);

                        return (
                          <button
                            type="button"
                            key={item.id}
                            className={marcado ? "selected" : ""}
                            onClick={() =>
                              alternarOrgaoSelecionado(
                                item.id,
                                orgaosNovaTabela,
                                setOrgaosNovaTabela,
                              )
                            }
                          >
                            <span className="multi-check">{marcado ? "✓" : ""}</span>
                            <span>{item.nome}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {orgaosNovaTabela.length > 0 && (
                  <div className="settings-selected-tags">
                    {orgaosNovaTabela.map((id) => {
                      const orgao = orgaosConvenios.find((item) => item.id === id);
                      if (!orgao) return null;

                      return (
                        <span key={id}>
                          {orgao.nome}
                          <button
                            type="button"
                            onClick={() =>
                              alternarOrgaoSelecionado(
                                id,
                                orgaosNovaTabela,
                                setOrgaosNovaTabela,
                              )
                            }
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <small>Você pode vincular a mesma tabela a vários órgãos.</small>
              </div>

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

                        <div className="settings-multi-field settings-multi-edit">
                          <button
                            type="button"
                            className="settings-multi-trigger compact"
                            onClick={() => setAbrirOrgaosEdicao((atual) => !atual)}
                            disabled={processando}
                          >
                            <span className={orgaosEdicaoTabela.length ? "has-value" : ""}>
                              {orgaosEdicaoTabela.length === 0
                                ? "Selecionar"
                                : orgaosEdicaoTabela.length === 1
                                  ? orgaosConvenios.find((item) => item.id === orgaosEdicaoTabela[0])?.nome
                                  : `${orgaosEdicaoTabela.length} selecionados`}
                            </span>
                            <b>{abrirOrgaosEdicao ? "▲" : "▼"}</b>
                          </button>

                          {abrirOrgaosEdicao && (
                            <div className="settings-multi-dropdown edit-dropdown">
                              <div className="settings-multi-list">
                                {orgaosConvenios.filter((item) => item.ativo).map((item) => {
                                  const marcado = orgaosEdicaoTabela.includes(item.id);

                                  return (
                                    <button
                                      type="button"
                                      key={item.id}
                                      className={marcado ? "selected" : ""}
                                      onClick={() =>
                                        alternarOrgaoSelecionado(
                                          item.id,
                                          orgaosEdicaoTabela,
                                          setOrgaosEdicaoTabela,
                                        )
                                      }
                                    >
                                      <span className="multi-check">{marcado ? "✓" : ""}</span>
                                      <span>{item.nome}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
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
                          <div className="settings-orgao-tags">
                            {tabela.orgaosConvenios.length
                              ? tabela.orgaosConvenios.map((orgao) => <span key={orgao.id}>{orgao.nome}</span>)
                              : <strong>{tabela.orgaoConvenio || "—"}</strong>}
                          </div>
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

      {aba === "status" && (
        <section className="settings-grid">
          <form className="settings-card" onSubmit={adicionarStatus}>
            <div className="settings-heading"><div><span>NOVO STATUS</span><h2>Cadastrar status de proposta</h2><p>Os status ativos ficarão disponíveis na Gestão de Propostas.</p></div><b>+</b></div>
            <div className="settings-form-grid">
              <label>Nome do status<input value={novoStatus.nome} onChange={e=>setNovoStatus({...novoStatus,nome:e.target.value})} placeholder="Ex.: AG. DOCUMENTAÇÃO" disabled={processando}/></label>
              <label>Tipo<select value={novoStatus.tipo} onChange={e=>setNovoStatus({...novoStatus,tipo:e.target.value as StatusPropostaConfigurado["tipo"]})} disabled={processando}><option value="EM_ANDAMENTO">Em andamento</option><option value="PAGO">Pago</option><option value="CANCELADO">Cancelado</option></select></label>
              <label>Prazo máximo (dias)<input type="number" min="0" value={novoStatus.prazoDias} onChange={e=>setNovoStatus({...novoStatus,prazoDias:e.target.value})} placeholder="Ex.: 2" disabled={processando}/><small>Deixe em branco se não houver prazo.</small></label>
              <label>Ordem<input type="number" min="0" value={novoStatus.ordem} onChange={e=>setNovoStatus({...novoStatus,ordem:e.target.value})} placeholder="Automática" disabled={processando}/></label>
            </div>
            <div className="settings-actions"><button type="submit" disabled={processando}>{processando?"Salvando...":"Adicionar status"}</button></div>
          </form>
          <section className="settings-card">
            <div className="settings-list-heading"><div><span>STATUS CADASTRADOS</span><h2>Fluxo das propostas</h2><p>Edite, ordene, ative ou desative sem alterar o código.</p></div><b>{statusPropostas.length}</b></div>
            <div className="settings-list">
              {statusPropostas.map(item=>(
                <article key={item.id}>
                  <div className="settings-icon">S</div>
                  <div>{editandoStatusId===item.id ? <div className="settings-status-edit">
                    <input value={edicaoStatus.nome} onChange={e=>setEdicaoStatus({...edicaoStatus,nome:e.target.value})}/>
                    <select value={edicaoStatus.tipo} onChange={e=>setEdicaoStatus({...edicaoStatus,tipo:e.target.value as StatusPropostaConfigurado["tipo"]})}><option value="EM_ANDAMENTO">Em andamento</option><option value="PAGO">Pago</option><option value="CANCELADO">Cancelado</option></select>
                    <input type="number" min="0" value={edicaoStatus.prazoDias} onChange={e=>setEdicaoStatus({...edicaoStatus,prazoDias:e.target.value})} placeholder="Prazo"/>
                    <input type="number" min="0" value={edicaoStatus.ordem} onChange={e=>setEdicaoStatus({...edicaoStatus,ordem:e.target.value})} placeholder="Ordem"/>
                  </div> : <><strong>{item.nome}</strong><span>{item.tipo==="PAGO"?"Pago":item.tipo==="CANCELADO"?"Cancelado":"Em andamento"} • {item.prazoDias==null?"Sem prazo":`${item.prazoDias} dia(s)`} • Ordem {item.ordem}</span></>}</div>
                  <span className={item.ativo?"status-active":"status-inactive"}>{item.ativo?"Ativo":"Inativo"}</span>
                  <div className="settings-row-actions">{editandoStatusId===item.id ? <><button type="button" className="save-edit" onClick={()=>void salvarEdicaoStatus()}>Salvar</button><button type="button" onClick={cancelarEdicaoStatus}>Cancelar</button></> : <><button type="button" onClick={()=>iniciarEdicaoStatus(item)}>Editar</button><button type="button" onClick={()=>void alternarStatus(item)}>{item.ativo?"Desativar":"Ativar"}</button></>}</div>
                </article>
              ))}
            </div>
            <div className="settings-warning" style={{marginTop:16}}><strong>Importante:</strong><span>PAGO e CANCELADA continuam com funções especiais. O tipo preserva essas regras.</span></div>
          </section>
        </section>
      )}

      {aba === "equipes" && (
        <section className="settings-v6-stack">
          <section className="settings-card">
            <div className="settings-v6-page-head">
              <div>
                <span>ESTRUTURA DE PESSOAS</span>
                <h2>Equipes</h2>
                <p>Cadastre setores e times usados nos usuários, propostas, metas e relatórios.</p>
              </div>
              <b>{equipesConfiguradas.length}</b>
            </div>

            <form className="settings-v6-inline-create" onSubmit={adicionarEquipe}>
              <label>
                Nome da nova equipe
                <input
                  value={novaEquipe}
                  onChange={(e) => setNovaEquipe(e.target.value)}
                  placeholder="Ex.: Comercial Compra"
                  disabled={processando}
                />
              </label>
              <button type="submit" disabled={processando}>
                + Criar equipe
              </button>
            </form>
          </section>

          <section className="settings-card">
            <div className="settings-v6-list-head">
              <div>
                <span>EQUIPES CADASTRADAS</span>
                <h2>Estrutura atual</h2>
                <p>Renomear uma equipe atualiza também os usuários já vinculados.</p>
              </div>
            </div>

            <div className="settings-v6-team-grid">
              {equipesConfiguradas.map((equipe) => (
                <article key={equipe.id} className="settings-v6-team-card">
                  <div className="settings-v6-team-top">
                    <span className="settings-v6-entity-icon">E</span>
                    <span className={equipe.ativo ? "status-active" : "status-inactive"}>
                      {equipe.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </div>

                  {editandoEquipeId === equipe.id ? (
                    <input
                      className="settings-v6-edit-input"
                      value={nomeEquipeEdicao}
                      onChange={(e) => setNomeEquipeEdicao(e.target.value)}
                      disabled={processando}
                    />
                  ) : (
                    <div className="settings-v6-team-name">
                      <strong>{equipe.nome}</strong>
                      <span>Disponível para usuários e filtros do sistema.</span>
                    </div>
                  )}

                  <div className="settings-v6-team-actions">
                    {editandoEquipeId === equipe.id ? (
                      <>
                        <button type="button" className="primary" onClick={() => void salvarEdicaoEquipe()}>
                          Salvar
                        </button>
                        <button type="button" onClick={cancelarEdicaoEquipe}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => iniciarEdicaoEquipe(equipe)}>Editar nome</button>
                        <button type="button" onClick={() => void alternarEquipe(equipe)}>
                          {equipe.ativo ? "Desativar" : "Ativar"}
                        </button>
                        <button type="button" className="danger" onClick={() => void excluirEquipe(equipe)}>
                          Excluir
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {aba === "perfis" && (
        <section className="settings-card">
          <div className="settings-v6-page-head">
            <div>
              <span>CARGOS E PERFIS DE ACESSO</span>
              <h2>Perfis do sistema</h2>
              <p>Edite o nome exibido e veja claramente qual chave técnica controla as permissões.</p>
            </div>
            <b>{perfisConfigurados.length}</b>
          </div>

          <div className="settings-v6-profile-table">
            <div className="settings-v6-profile-head">
              <span>Nome exibido</span>
              <span>Código técnico</span>
              <span>Situação</span>
              <span>Ações</span>
            </div>

            {perfisConfigurados.map((perfil) => (
              <article key={perfil.chave} className="settings-v6-profile-row">
                <div className="settings-v6-entity">
                  <span className="settings-v6-entity-icon">P</span>
                  <div>
                    {editandoPerfilChave === perfil.chave ? (
                      <input
                        className="settings-v6-edit-input"
                        value={nomePerfilEdicao}
                        onChange={(e) => setNomePerfilEdicao(e.target.value)}
                        disabled={processando}
                      />
                    ) : (
                      <>
                        <strong>{perfil.nomeExibicao}</strong>
                        <small>Nome que aparece para a equipe</small>
                      </>
                    )}
                  </div>
                </div>

                <div className="settings-v6-code">
                  <code>{perfil.chave}</code>
                  <small>Identificador interno protegido</small>
                </div>

                <span className={perfil.ativo ? "status-active" : "status-inactive"}>
                  {perfil.ativo ? "Ativo" : "Inativo"}
                </span>

                <div className="settings-row-actions">
                  {editandoPerfilChave === perfil.chave ? (
                    <>
                      <button type="button" className="save-edit" onClick={() => void salvarEdicaoPerfil()}>
                        Salvar
                      </button>
                      <button type="button" onClick={cancelarEdicaoPerfil}>Cancelar</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => iniciarEdicaoPerfil(perfil)}>
                      Editar nome
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="settings-v6-profile-warning">
            <strong>Sobre “RH / Financeiro”:</strong>
            <span>
              Hoje “RH” usa a chave técnica “Financeiro”. O nome exibido pode ser alterado aqui.
              Para transformar a própria chave interna em RH sem quebrar acessos, precisamos migrar também usuários,
              permissões e validações do restante do sistema — essa alteração será feita como uma etapa técnica separada.
            </span>
          </div>
        </section>
      )}

      {aba === "permissoes" && (
        <section className="settings-card settings-v6-permissions">
          <div className="settings-v6-page-head">
            <div>
              <span>CONTROLE DE ACESSO</span>
              <h2>Permissões por perfil</h2>
              <p>Escolha um perfil e defina os módulos e informações que ele pode visualizar.</p>
            </div>
            <b>🔒</b>
          </div>

          <div className="settings-v6-permission-toolbar">
            <label>
              Perfil que deseja configurar
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

            <div className="settings-v6-permission-actions-top">
              <button
                type="button"
                onClick={() =>
                  setPermissoesPorPerfil((atual) => ({
                    ...atual,
                    [perfilPermissaoSelecionado]: Object.fromEntries(
                      PERMISSOES_DISPONIVEIS.map((item) => [item.chave, true]),
                    ) as PermissoesPerfil,
                  }))
                }
              >
                Marcar todas
              </button>
              <button
                type="button"
                onClick={() =>
                  setPermissoesPorPerfil((atual) => ({
                    ...atual,
                    [perfilPermissaoSelecionado]: permissoesVazias(),
                  }))
                }
              >
                Limpar seleção
              </button>
            </div>
          </div>

          <div className="settings-v6-permission-groups">
            {(["MENU", "INFORMAÇÕES SENSÍVEIS"] as const).map((grupo) => (
              <section key={grupo} className="settings-v6-permission-group">
                <div className="settings-v6-permission-group-head">
                  <div>
                    <strong>
                      {grupo === "MENU" ? "Acesso aos módulos" : "Informações sensíveis"}
                    </strong>
                    <span>
                      {grupo === "MENU"
                        ? "Controle quais áreas aparecem no menu e podem ser acessadas."
                        : "Dados financeiros e comissões que exigem acesso especial."}
                    </span>
                  </div>
                  <b>
                    {
                      PERMISSOES_DISPONIVEIS.filter(
                        (item) =>
                          item.grupo === grupo &&
                          permissoesPorPerfil[perfilPermissaoSelecionado]?.[item.chave],
                      ).length
                    }
                    /
                    {PERMISSOES_DISPONIVEIS.filter((item) => item.grupo === grupo).length}
                  </b>
                </div>

                <div className="settings-v6-permission-grid">
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
                          className={`settings-v6-permission-item ${
                            marcado ? "selected" : ""
                          }`}
                        >
                          <div className="settings-v6-permission-copy">
                            <span className="settings-v6-permission-icon">
                              {item.titulo.slice(0, 1)}
                            </span>
                            <div>
                              <strong>{item.titulo}</strong>
                              <small>{marcado ? "Permitido" : "Sem acesso"}</small>
                            </div>
                          </div>

                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={(e) =>
                              alterarPermissao(item.chave, e.target.checked)
                            }
                            disabled={processando}
                          />
                          <span className="settings-v6-switch" />
                        </label>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>

          <div className="settings-v6-permission-footer">
            <div>
              <strong>Alterações de acesso</strong>
              <span>As permissões continuam ligadas ao código interno do perfil.</span>
            </div>
            <button
              type="button"
              onClick={() => void salvarPermissoes()}
              disabled={processando}
            >
              {processando ? "Salvando..." : "Salvar permissões"}
            </button>
          </div>
        </section>
      )}

      {aba === "financeiro" && (
        <section className="settings-v7-finance-page">
          <section className="settings-card settings-v7-finance-hero">
            <div className="settings-v7-page-title">
              <div className="settings-v7-page-icon">R$</div>
              <div>
                <span>CONFIGURAÇÃO FINANCEIRA</span>
                <h2>Cadastros financeiros</h2>
                <p>
                  Organize produtos, parceiros, fornecedores de notas, bancos e categorias usados no Financeiro.
                </p>
              </div>
            </div>

            <div className="settings-v7-finance-kpis">
              {(
                [
                  ["produto", "Produtos", "P"],
                  ["banco", "Bancos", "B"],
                  ["parceiro", "Parceiros", "P"],
                  ["fornecedor_neo", "Fornec. NEO", "N"],
                  ["fornecedor_3rn", "Fornec. 3RN", "3"],
                  ["categoria_entrada", "Entradas", "E"],
                  ["categoria_saida", "Saídas", "S"],
                ] as Array<[TipoConfigFinanceiro, string, string]>
              ).map(([tipo, titulo, icone]) => (
                <article key={tipo}>
                  <span>{icone}</span>
                  <div>
                    <small>{titulo}</small>
                    <strong>
                      {financeiroPorTipo[tipo].filter((item) => item.ativo).length}
                    </strong>
                    <em>ativos</em>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="settings-v7-finance-grid">
            <form
              className="settings-card settings-v7-finance-create"
              onSubmit={adicionarFinanceiroItem}
            >
              <div className="settings-v7-card-head">
                <div>
                  <span>NOVO CADASTRO</span>
                  <h3>Adicionar item</h3>
                  <p>Escolha a categoria e informe o nome do novo item.</p>
                </div>
                <b>+</b>
              </div>

              <label className="settings-v7-field">
                Tipo de cadastro
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
                  <option value="banco">Banco do Financeiro</option>
                  <option value="parceiro">Parceiro</option>
                  <option value="fornecedor_neo">Fornecedor de Nota Fiscal — NEO</option>
                  <option value="fornecedor_3rn">Fornecedor de Nota Fiscal — 3RN</option>
                  <option value="categoria_entrada">Categoria de entrada</option>
                  <option value="categoria_saida">Categoria de saída</option>
                </select>
              </label>

              <label className="settings-v7-field">
                Nome
                <input
                  value={novoFinanceiroNome}
                  onChange={(e) => setNovoFinanceiroNome(e.target.value)}
                  placeholder="Ex.: Impostos, Aluguel, 3RN..."
                  disabled={processando}
                />
              </label>

              <button
                type="submit"
                className="settings-v7-primary-button"
                disabled={processando}
              >
                {processando ? "Salvando..." : "+ Adicionar item"}
              </button>
            </form>

            <section className="settings-card settings-v7-finance-summary">
              <div className="settings-v7-card-head">
                <div>
                  <span>VISÃO GERAL</span>
                  <h3>Estrutura configurada</h3>
                  <p>{financeiroItens.length} item(ns) cadastrado(s) no total.</p>
                </div>
                <b>{financeiroItens.length}</b>
              </div>

              <div className="settings-v7-finance-summary-list">
                {(
                  [
                    ["produto", "Produtos financeiros", "Produtos disponíveis para lançamentos"],
                    ["banco", "Bancos do Financeiro", "Instituições usadas nos recebimentos"],
                    ["parceiro", "Parceiros", "Parceiros comerciais e operacionais"],
                    ["fornecedor_neo", "Fornecedores NEO", "Fornecedores usados nas notas fiscais da NEO"],
                    ["fornecedor_3rn", "Fornecedores 3RN", "Fornecedores usados nas notas fiscais da 3RN"],
                    ["categoria_entrada", "Categorias de entrada", "Tipos de receitas"],
                    ["categoria_saida", "Categorias de saída", "Tipos de despesas"],
                  ] as Array<[TipoConfigFinanceiro, string, string]>
                ).map(([tipo, titulo, descricao]) => (
                  <article key={tipo}>
                    <div>
                      <strong>{titulo}</strong>
                      <span>{descricao}</span>
                    </div>
                    <b>{financeiroPorTipo[tipo].filter((item) => item.ativo).length}</b>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section className="settings-v7-finance-sections">
            {(
              [
                ["produto", "Produtos financeiros", "Defina os produtos disponíveis nos lançamentos.", "P"],
                ["banco", "Bancos do Financeiro", "Controle quais bancos aparecem na área financeira.", "B"],
                ["parceiro", "Parceiros", "Cadastre parceiros usados nas movimentações.", "P"],
                ["fornecedor_neo", "Fornecedores de Nota Fiscal — NEO", "Cadastre os fornecedores que poderão ser selecionados nas notas da NEO.", "N"],
                ["fornecedor_3rn", "Fornecedores de Nota Fiscal — 3RN", "Cadastre os fornecedores que poderão ser selecionados nas notas da 3RN.", "3"],
                ["categoria_entrada", "Categorias de entrada", "Organize todas as receitas do sistema.", "E"],
                ["categoria_saida", "Categorias de saída", "Organize todas as despesas do sistema.", "S"],
              ] as Array<[TipoConfigFinanceiro, string, string, string]>
            ).map(([tipo, titulo, descricao, icone]) => (
              <section className="settings-card settings-v7-finance-section" key={tipo}>
                <div className="settings-v7-section-title">
                  <span className="settings-v7-section-icon">{icone}</span>
                  <div>
                    <h3>{titulo}</h3>
                    <p>{descricao}</p>
                  </div>
                  <b>{financeiroPorTipo[tipo].length}</b>
                </div>

                <div className="settings-v7-item-list">
                  {financeiroPorTipo[tipo].length === 0 ? (
                    <div className="settings-v7-empty">
                      Nenhum item cadastrado nesta categoria.
                    </div>
                  ) : (
                    financeiroPorTipo[tipo].map((item) => (
                      <article key={item.id}>
                        <div className="settings-v7-item-name">
                          <span>{icone}</span>
                          <div>
                            <strong>{item.nome}</strong>
                            <small>
                              {item.ativo ? "Disponível no sistema" : "Item desativado"}
                            </small>
                          </div>
                        </div>

                        <span className={item.ativo ? "status-active" : "status-inactive"}>
                          {item.ativo ? "Ativo" : "Inativo"}
                        </span>

                        <div className="settings-row-actions">
                          <button
                            type="button"
                            onClick={() => void alternarFinanceiroItem(item)}
                            disabled={processando}
                          >
                            {item.ativo ? "Desativar" : "Ativar"}
                          </button>
                          <button
                            type="button"
                            className="delete"
                            onClick={() => void excluirFinanceiroItem(item)}
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
          </section>
        </section>
      )}

      {aba === "comissoes" && (
        <section className="premiacao-settings-page">
          <section className="settings-card premiacao-settings-hero">
            <div className="premiacao-settings-hero-title">
              <div className="premiacao-settings-hero-icon">★</div>
              <div>
                <span>CENTRAL DE PREMIAÇÃO</span>
                <h2>Regras de Premiação</h2>
                <p>
                  Controle faixas, pontos, valores e critérios diretamente no Supabase.
                  A previsão será conferida pela Diretoria antes de qualquer liberação para a colaboradora.
                </p>
              </div>
            </div>

            <div className="premiacao-settings-kpis">
              <article>
                <small>Planos cadastrados</small>
                <strong>{planosPremiacao.length}</strong>
                <span>regras principais</span>
              </article>
              <article>
                <small>Planos ativos</small>
                <strong>{totalPlanosAtivos}</strong>
                <span>em vigência</span>
              </article>
              <article>
                <small>Faixas cadastradas</small>
                <strong>{totalFaixasPremiacao}</strong>
                <span>níveis de premiação</span>
              </article>
              <article className="is-connected">
                <small>Origem dos dados</small>
                <strong>Supabase</strong>
                <span>configuração centralizada</span>
              </article>
            </div>
          </section>

          {carregandoPremiacao && (
            <div className="premiacao-settings-loading">
              Carregando regras de premiação...
            </div>
          )}

          {!carregandoPremiacao && planosPremiacao.length === 0 && (
            <div className="settings-card premiacao-settings-empty">
              <strong>Nenhum plano de premiação encontrado.</strong>
              <span>
                Confirme se o SQL da Etapa 1 foi executado no mesmo projeto Supabase utilizado pelo sistema.
              </span>
            </div>
          )}

          {!carregandoPremiacao && planosPremiacao.length > 0 && (
            <div className="premiacao-settings-layout">
              <aside className="settings-card premiacao-settings-plans">
                <div className="premiacao-settings-side-head">
                  <span>PLANOS</span>
                  <h3>Quem recebe</h3>
                  <p>Selecione uma regra para conferir ou editar.</p>
                </div>

                <div className="premiacao-settings-plan-list">
                  {planosPremiacao.map((plano) => {
                    const quantidadeFaixas = faixasPremiacao.filter(
                      (faixa) => faixa.planoId === plano.id,
                    ).length;

                    return (
                      <button
                        type="button"
                        key={plano.id}
                        className={
                          planoPremiacaoSelecionadoId === plano.id
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setPlanoPremiacaoSelecionadoId(plano.id)
                        }
                      >
                        <span className="premiacao-settings-plan-icon">
                          {plano.codigo.includes("CLT")
                            ? "C"
                            : plano.codigo.includes("SUPERV")
                              ? "S"
                              : plano.codigo.includes("COORD")
                                ? "V"
                                : plano.codigo.includes("OPER")
                                  ? "O"
                                  : plano.codigo.includes("QUAL")
                                    ? "Q"
                                    : "P"}
                        </span>

                        <span>
                          <strong>{plano.nome}</strong>
                          <em>
                            {quantidadeFaixas
                              ? `${quantidadeFaixas} faixa(s)`
                              : "regra por parâmetros"}
                          </em>
                        </span>

                        <i className={plano.ativo ? "active" : "inactive"} />
                      </button>
                    );
                  })}
                </div>
              </aside>

              {planoPremiacaoSelecionado && (
                <main className="premiacao-settings-main">
                  <section className="settings-card premiacao-settings-plan-card">
                    <div className="premiacao-settings-plan-head">
                      <div>
                        <span>PLANO SELECIONADO</span>
                        <h3>{planoPremiacaoSelecionado.nome}</h3>
                        <p>
                          {planoPremiacaoSelecionado.produto || "Premiação geral"} ·{" "}
                          {planoPremiacaoSelecionado.cargoChave || "Sem cargo definido"}
                        </p>
                      </div>

                      <button
                        type="button"
                        className={
                          planoPremiacaoSelecionado.ativo
                            ? "premiacao-status active"
                            : "premiacao-status inactive"
                        }
                        onClick={() =>
                          void alternarPlanoPremiacao(
                            planoPremiacaoSelecionado,
                          )
                        }
                        disabled={
                          salvandoPremiacaoId ===
                          planoPremiacaoSelecionado.id
                        }
                      >
                        {planoPremiacaoSelecionado.ativo
                          ? "● Plano ativo"
                          : "○ Plano inativo"}
                      </button>
                    </div>

                    <div className="premiacao-settings-form-grid">
                      <label>
                        Nome exibido
                        <input
                          value={planoPremiacaoSelecionado.nome}
                          onChange={(e) =>
                            atualizarPlanoPremiacaoLocal(
                              planoPremiacaoSelecionado.id,
                              { nome: e.target.value },
                            )
                          }
                        />
                      </label>

                      <label>
                        Cargo / perfil
                        <input
                          value={planoPremiacaoSelecionado.cargoChave}
                          onChange={(e) =>
                            atualizarPlanoPremiacaoLocal(
                              planoPremiacaoSelecionado.id,
                              { cargoChave: e.target.value },
                            )
                          }
                        />
                      </label>

                      <label>
                        Produto / origem
                        <input
                          value={planoPremiacaoSelecionado.produto}
                          onChange={(e) =>
                            atualizarPlanoPremiacaoLocal(
                              planoPremiacaoSelecionado.id,
                              { produto: e.target.value },
                            )
                          }
                        />
                      </label>

                      <label>
                        Resultado
                        <select
                          value={
                            planoPremiacaoSelecionado.unidadeResultado
                          }
                          onChange={(e) =>
                            atualizarPlanoPremiacaoLocal(
                              planoPremiacaoSelecionado.id,
                              {
                                unidadeResultado: e.target
                                  .value as PremiacaoPlano["unidadeResultado"],
                              },
                            )
                          }
                        >
                          <option value="PONTOS">Pontos</option>
                          <option value="REAIS">Valor em reais</option>
                          <option value="MISTO">Pontos + reais</option>
                        </select>
                      </label>

                      <label>
                        Vigência inicial
                        <input
                          type="date"
                          value={
                            planoPremiacaoSelecionado.vigenciaInicio
                          }
                          onChange={(e) =>
                            atualizarPlanoPremiacaoLocal(
                              planoPremiacaoSelecionado.id,
                              { vigenciaInicio: e.target.value },
                            )
                          }
                        />
                      </label>

                      <label>
                        Vigência final
                        <input
                          type="date"
                          value={
                            planoPremiacaoSelecionado.vigenciaFim
                          }
                          onChange={(e) =>
                            atualizarPlanoPremiacaoLocal(
                              planoPremiacaoSelecionado.id,
                              { vigenciaFim: e.target.value },
                            )
                          }
                        />
                      </label>
                    </div>

                    <label className="premiacao-settings-full-field">
                      Observação do plano
                      <textarea
                        value={planoPremiacaoSelecionado.observacao}
                        onChange={(e) =>
                          atualizarPlanoPremiacaoLocal(
                            planoPremiacaoSelecionado.id,
                            { observacao: e.target.value },
                          )
                        }
                        rows={2}
                      />
                    </label>

                    <div className="premiacao-settings-special">
                      <div className="premiacao-settings-special-title">
                        <span>REGRAS ESPECIAIS</span>
                        <h4>Parâmetros do cálculo</h4>
                        <p>
                          Estes campos controlam os gatilhos que não pertencem às faixas normais.
                        </p>
                      </div>

                      {planoPremiacaoSelecionado.codigo ===
                        "CONSULTORA_COMPRA" && (
                        <div className="premiacao-settings-param-grid">
                          <label>
                            Mínimo para plano de pontos
                            <input
                              value={formatarNumeroPremiacao(
                                Number(
                                  planoPremiacaoSelecionado.parametros
                                    ?.producao_minima_plano_pontos || 0,
                                ),
                              )}
                              onChange={(e) =>
                                atualizarParametroPremiacao(
                                  planoPremiacaoSelecionado.id,
                                  ["producao_minima_plano_pontos"],
                                  numeroPremiacao(e.target.value),
                                )
                              }
                            />
                            <small>
                              Abaixo deste valor, não entra nas faixas da Compra.
                            </small>
                          </label>

                          <div className="premiacao-settings-rule-note">
                            <strong>Peso da tabela</strong>
                            <span>
                              A produção válida da Compra usa automaticamente o % Produção cadastrado em Tabelas de produção.
                            </span>
                          </div>
                        </div>
                      )}

                      {planoPremiacaoSelecionado.codigo ===
                        "CONSULTORA_CLT" && (
                        <div className="premiacao-settings-param-grid">
                          <label>
                            Mínimo CLT
                            <input
                              value={formatarNumeroPremiacao(
                                Number(
                                  planoPremiacaoSelecionado.parametros
                                    ?.clt_minimo || 0,
                                ),
                              )}
                              onChange={(e) =>
                                atualizarParametroPremiacao(
                                  planoPremiacaoSelecionado.id,
                                  ["clt_minimo"],
                                  numeroPremiacao(e.target.value),
                                )
                              }
                            />
                          </label>

                          <label>
                            Limite Compra para usar 1%
                            <input
                              value={formatarNumeroPremiacao(
                                Number(
                                  planoPremiacaoSelecionado.parametros
                                    ?.compra_abaixo_minimo_pontos
                                    ?.limite_compra || 0,
                                ),
                              )}
                              onChange={(e) =>
                                atualizarParametroPremiacao(
                                  planoPremiacaoSelecionado.id,
                                  [
                                    "compra_abaixo_minimo_pontos",
                                    "limite_compra",
                                  ],
                                  numeroPremiacao(e.target.value),
                                )
                              }
                            />
                          </label>

                          <label>
                            % sobre Compra abaixo da meta
                            <input
                              value={formatarNumeroPremiacao(
                                Number(
                                  planoPremiacaoSelecionado.parametros
                                    ?.compra_abaixo_minimo_pontos
                                    ?.percentual_premiacao_compra || 0,
                                ),
                              )}
                              onChange={(e) =>
                                atualizarParametroPremiacao(
                                  planoPremiacaoSelecionado.id,
                                  [
                                    "compra_abaixo_minimo_pontos",
                                    "percentual_premiacao_compra",
                                  ],
                                  numeroPremiacao(e.target.value),
                                )
                              }
                            />
                          </label>
                        </div>
                      )}

                      {planoPremiacaoSelecionado.codigo ===
                        "COORDENACAO_COMPRA" && (
                        <div className="premiacao-settings-param-grid">
                          <label>
                            Meta CLT da empresa
                            <input
                              value={formatarNumeroPremiacao(
                                Number(
                                  planoPremiacaoSelecionado.parametros
                                    ?.meta_clt_empresa || 0,
                                ),
                              )}
                              onChange={(e) =>
                                atualizarParametroPremiacao(
                                  planoPremiacaoSelecionado.id,
                                  ["meta_clt_empresa"],
                                  numeroPremiacao(e.target.value),
                                )
                              }
                            />
                          </label>

                          <label>
                            Bônus ao bater CLT (R$)
                            <input
                              value={formatarNumeroPremiacao(
                                Number(
                                  planoPremiacaoSelecionado.parametros
                                    ?.bonus_clt_reais || 0,
                                ),
                              )}
                              onChange={(e) =>
                                atualizarParametroPremiacao(
                                  planoPremiacaoSelecionado.id,
                                  ["bonus_clt_reais"],
                                  numeroPremiacao(e.target.value),
                                )
                              }
                            />
                          </label>

                          <label>
                            Compra mínima com meta CLT
                            <input
                              value={formatarNumeroPremiacao(
                                Number(
                                  planoPremiacaoSelecionado.parametros
                                    ?.compra_minima_com_meta_clt || 0,
                                ),
                              )}
                              onChange={(e) =>
                                atualizarParametroPremiacao(
                                  planoPremiacaoSelecionado.id,
                                  ["compra_minima_com_meta_clt"],
                                  numeroPremiacao(e.target.value),
                                )
                              }
                            />
                          </label>

                          <label>
                            Compra mínima sem meta CLT
                            <input
                              value={formatarNumeroPremiacao(
                                Number(
                                  planoPremiacaoSelecionado.parametros
                                    ?.compra_minima_sem_meta_clt || 0,
                                ),
                              )}
                              onChange={(e) =>
                                atualizarParametroPremiacao(
                                  planoPremiacaoSelecionado.id,
                                  ["compra_minima_sem_meta_clt"],
                                  numeroPremiacao(e.target.value),
                                )
                              }
                            />
                          </label>
                        </div>
                      )}

                      {planoPremiacaoSelecionado.codigo ===
                        "SUPERVISAO" && (
                        <div className="premiacao-settings-rule-note wide">
                          <strong>Produção da Supervisão</strong>
                          <span>
                            Soma parcelas do CLT + produção válida da Compra. Venda própria pode ajudar a atingir a meta ou ser remunerada separadamente, sem duplicidade.
                          </span>
                        </div>
                      )}

                      {planoPremiacaoSelecionado.codigo ===
                        "OPERACIONAL" && (
                        <div className="premiacao-settings-param-grid">
                          <label>
                            R$ por contrato pago
                            <input
                              value={formatarNumeroPremiacao(
                                Number(
                                  planoPremiacaoSelecionado.parametros
                                    ?.valor_por_contrato_pago || 0,
                                ),
                              )}
                              onChange={(e) =>
                                atualizarParametroPremiacao(
                                  planoPremiacaoSelecionado.id,
                                  ["valor_por_contrato_pago"],
                                  numeroPremiacao(e.target.value),
                                )
                              }
                            />
                          </label>

                          <div className="premiacao-settings-rule-note">
                            <strong>Bônus empresa</strong>
                            <span>
                              R$ 500 mil = R$ 250 · R$ 1 milhão = R$ 500. A maior faixa substitui a anterior.
                            </span>
                          </div>
                        </div>
                      )}

                      {planoPremiacaoSelecionado.codigo ===
                        "QUALIDADE" && (
                        <div className="premiacao-settings-param-grid">
                          <label>
                            R$ por contrato pago
                            <input
                              value={formatarNumeroPremiacao(
                                Number(
                                  planoPremiacaoSelecionado.parametros
                                    ?.valor_por_contrato_pago || 0,
                                ),
                              )}
                              onChange={(e) =>
                                atualizarParametroPremiacao(
                                  planoPremiacaoSelecionado.id,
                                  ["valor_por_contrato_pago"],
                                  numeroPremiacao(e.target.value),
                                )
                              }
                            />
                          </label>

                          <label>
                            Meta da empresa
                            <input
                              value={formatarNumeroPremiacao(
                                Number(
                                  planoPremiacaoSelecionado.parametros
                                    ?.meta_empresa || 0,
                                ),
                              )}
                              onChange={(e) =>
                                atualizarParametroPremiacao(
                                  planoPremiacaoSelecionado.id,
                                  ["meta_empresa"],
                                  numeroPremiacao(e.target.value),
                                )
                              }
                            />
                          </label>

                          <label>
                            Bônus da meta (R$)
                            <input
                              value={formatarNumeroPremiacao(
                                Number(
                                  planoPremiacaoSelecionado.parametros
                                    ?.bonus_meta_reais || 0,
                                ),
                              )}
                              onChange={(e) =>
                                atualizarParametroPremiacao(
                                  planoPremiacaoSelecionado.id,
                                  ["bonus_meta_reais"],
                                  numeroPremiacao(e.target.value),
                                )
                              }
                            />
                          </label>

                          <div className="premiacao-settings-rule-note">
                            <strong>Venda própria</strong>
                            <span>
                              Segue a regra das consultoras e não pode ser contada novamente na meta geral quando for premiada separadamente.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="premiacao-settings-plan-actions">
                      <span>
                        Código interno: <b>{planoPremiacaoSelecionado.codigo}</b>
                      </span>

                      <button
                        type="button"
                        className="premiacao-settings-save"
                        onClick={() =>
                          void salvarPlanoPremiacao(
                            planoPremiacaoSelecionado,
                          )
                        }
                        disabled={
                          salvandoPremiacaoId ===
                          planoPremiacaoSelecionado.id
                        }
                      >
                        {salvandoPremiacaoId ===
                        planoPremiacaoSelecionado.id
                          ? "Salvando..."
                          : "Salvar alterações"}
                      </button>
                    </div>
                  </section>

                  <section className="settings-card premiacao-settings-ranges">
                    <div className="premiacao-settings-ranges-head">
                      <div>
                        <span>FAIXAS DE PREMIAÇÃO</span>
                        <h3>
                          {faixasPlanoSelecionado.length
                            ? "Valores e pontuações"
                            : "Plano sem faixas"}
                        </h3>
                        <p>
                          Edite a faixa e clique em Salvar na própria linha.
                        </p>
                      </div>

                      <b>{faixasPlanoSelecionado.length}</b>
                    </div>

                    {faixasPlanoSelecionado.length > 0 && (
                      <div className="premiacao-settings-range-table">
                        <div className="premiacao-settings-range-header">
                          <span>Faixa</span>
                          <span>De</span>
                          <span>Até</span>
                          <span>Tipo</span>
                          <span>Premiação</span>
                          <span>Bônus R$</span>
                          <span>Ações</span>
                        </div>

                        {faixasPlanoSelecionado.map((faixa) => (
                          <article key={faixa.id}>
                            <input
                              value={faixa.nomeFaixa}
                              onChange={(e) =>
                                atualizarFaixaPremiacaoLocal(faixa.id, {
                                  nomeFaixa: e.target.value,
                                })
                              }
                            />

                            <input
                              value={formatarNumeroPremiacao(
                                faixa.valorMin,
                              )}
                              onChange={(e) =>
                                atualizarFaixaPremiacaoLocal(faixa.id, {
                                  valorMin: numeroPremiacao(
                                    e.target.value,
                                  ),
                                })
                              }
                            />

                            <input
                              value={formatarNumeroPremiacao(
                                faixa.valorMax,
                              )}
                              placeholder="Sem limite"
                              onChange={(e) =>
                                atualizarFaixaPremiacaoLocal(faixa.id, {
                                  valorMax: e.target.value.trim()
                                    ? numeroPremiacao(e.target.value)
                                    : null,
                                })
                              }
                            />

                            <select
                              value={faixa.tipoRecompensa}
                              onChange={(e) =>
                                atualizarFaixaPremiacaoLocal(faixa.id, {
                                  tipoRecompensa: e.target
                                    .value as PremiacaoFaixa["tipoRecompensa"],
                                })
                              }
                            >
                              <option value="PONTOS">Pontos</option>
                              <option value="REAIS">R$</option>
                              <option value="PERCENTUAL">%</option>
                            </select>

                            <input
                              value={formatarNumeroPremiacao(
                                faixa.valorRecompensa,
                              )}
                              onChange={(e) =>
                                atualizarFaixaPremiacaoLocal(faixa.id, {
                                  valorRecompensa: numeroPremiacao(
                                    e.target.value,
                                  ),
                                })
                              }
                            />

                            <input
                              value={formatarNumeroPremiacao(
                                faixa.bonusReais,
                              )}
                              onChange={(e) =>
                                atualizarFaixaPremiacaoLocal(faixa.id, {
                                  bonusReais: numeroPremiacao(
                                    e.target.value,
                                  ),
                                })
                              }
                            />

                            <div className="premiacao-settings-range-actions">
                              <button
                                type="button"
                                className={
                                  faixa.ativo ? "active" : "inactive"
                                }
                                onClick={() => {
                                  const atualizada = {
                                    ...faixa,
                                    ativo: !faixa.ativo,
                                  };
                                  atualizarFaixaPremiacaoLocal(faixa.id, {
                                    ativo: atualizada.ativo,
                                  });
                                  void salvarFaixaPremiacao(atualizada);
                                }}
                                disabled={
                                  salvandoPremiacaoId === faixa.id
                                }
                              >
                                {faixa.ativo ? "Ativa" : "Inativa"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void salvarFaixaPremiacao(faixa)
                                }
                                disabled={
                                  salvandoPremiacaoId === faixa.id
                                }
                              >
                                Salvar
                              </button>

                              <button
                                type="button"
                                className="delete"
                                onClick={() =>
                                  void excluirFaixaPremiacao(faixa)
                                }
                                disabled={
                                  salvandoPremiacaoId === faixa.id
                                }
                              >
                                Excluir
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    <form
                      className="premiacao-settings-add-range"
                      onSubmit={adicionarFaixaPremiacao}
                    >
                      <div className="premiacao-settings-add-head">
                        <div>
                          <span>NOVA FAIXA</span>
                          <h4>Adicionar nível de premiação</h4>
                        </div>
                        <b>+</b>
                      </div>

                      <div className="premiacao-settings-add-grid">
                        <label>
                          Nome da faixa
                          <input
                            value={novaFaixaPremiacao.nomeFaixa}
                            onChange={(e) =>
                              setNovaFaixaPremiacao({
                                ...novaFaixaPremiacao,
                                nomeFaixa: e.target.value,
                              })
                            }
                            placeholder="Ex.: FAIXA 26"
                          />
                        </label>

                        <label>
                          Valor inicial
                          <input
                            value={novaFaixaPremiacao.valorMin}
                            onChange={(e) =>
                              setNovaFaixaPremiacao({
                                ...novaFaixaPremiacao,
                                valorMin: e.target.value,
                              })
                            }
                            placeholder="Ex.: 470.000"
                          />
                        </label>

                        <label>
                          Valor final
                          <input
                            value={novaFaixaPremiacao.valorMax}
                            onChange={(e) =>
                              setNovaFaixaPremiacao({
                                ...novaFaixaPremiacao,
                                valorMax: e.target.value,
                              })
                            }
                            placeholder="Vazio = sem limite"
                          />
                        </label>

                        <label>
                          Tipo
                          <select
                            value={novaFaixaPremiacao.tipoRecompensa}
                            onChange={(e) =>
                              setNovaFaixaPremiacao({
                                ...novaFaixaPremiacao,
                                tipoRecompensa: e.target
                                  .value as PremiacaoFaixa["tipoRecompensa"],
                              })
                            }
                          >
                            <option value="PONTOS">Pontos</option>
                            <option value="REAIS">R$</option>
                            <option value="PERCENTUAL">%</option>
                          </select>
                        </label>

                        <label>
                          Premiação
                          <input
                            value={novaFaixaPremiacao.valorRecompensa}
                            onChange={(e) =>
                              setNovaFaixaPremiacao({
                                ...novaFaixaPremiacao,
                                valorRecompensa: e.target.value,
                              })
                            }
                            placeholder="Ex.: 12.500"
                          />
                        </label>

                        <label>
                          Bônus R$
                          <input
                            value={novaFaixaPremiacao.bonusReais}
                            onChange={(e) =>
                              setNovaFaixaPremiacao({
                                ...novaFaixaPremiacao,
                                bonusReais: e.target.value,
                              })
                            }
                            placeholder="Opcional"
                          />
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="premiacao-settings-add-button"
                        disabled={salvandoPremiacaoId === "nova-faixa"}
                      >
                        {salvandoPremiacaoId === "nova-faixa"
                          ? "Adicionando..."
                          : "+ Adicionar faixa"}
                      </button>
                    </form>
                  </section>

                  <section className="premiacao-settings-footer-note">
                    <strong>Importante:</strong>
                    <span>
                      Esta tela controla a regra prevista. Na próxima etapa, o sistema calculará a previsão da competência e somente a Diretoria poderá conferir e liberar a pontuação para a colaboradora.
                    </span>
                  </section>
                </main>
              )}
            </div>
          )}
        </section>
      )}


      {aba === "logs" && (
        <section className="settings-v8-logs-page">
          <section className="settings-card settings-v8-logs-hero">
            <div className="settings-v8-logs-title">
              <div className="settings-v8-logs-icon">◷</div>
              <div>
                <span>OUTROS</span>
                <h2>Logs do sistema</h2>
                <p>
                  Central de auditoria para acompanhar alterações, acessos e ações administrativas.
                </p>
              </div>
            </div>

            <span className="settings-v8-beta-pill">Auditoria preparada</span>
          </section>

          <section className="settings-v8-log-kpis">
            <article>
              <span>A</span>
              <div>
                <small>Ações administrativas</small>
                <strong>—</strong>
                <em>aguardando integração</em>
              </div>
            </article>
            <article>
              <span>U</span>
              <div>
                <small>Usuários ativos</small>
                <strong>—</strong>
                <em>aguardando integração</em>
              </div>
            </article>
            <article>
              <span>E</span>
              <div>
                <small>Erros registrados</small>
                <strong>—</strong>
                <em>aguardando integração</em>
              </div>
            </article>
          </section>

          <section className="settings-card settings-v8-logs-panel">
            <div className="settings-v8-logs-panel-head">
              <div>
                <span>HISTÓRICO</span>
                <h3>Atividades do sistema</h3>
                <p>
                  Esta área já está pronta visualmente. Para exibir histórico real, ainda precisamos conectar uma tabela de auditoria no Supabase.
                </p>
              </div>
            </div>

            <div className="settings-v8-log-filters">
              <input type="search" placeholder="Pesquisar usuário, ação ou módulo..." disabled />
              <select disabled>
                <option>Todos os módulos</option>
              </select>
              <select disabled>
                <option>Todos os tipos de ação</option>
              </select>
            </div>

            <div className="settings-v8-log-empty">
              <div className="settings-v8-log-empty-icon">◷</div>
              <strong>Nenhum histórico de auditoria conectado ainda</strong>
              <span>
                Quando ativarmos os logs no Supabase, esta tela poderá mostrar quem alterou bancos,
                tabelas, perfis, permissões, propostas e demais configurações.
              </span>
            </div>

            <div className="settings-v8-log-note">
              <strong>Próxima etapa:</strong>
              <span>
                criar a tabela de auditoria e registrar automaticamente usuário, ação, data/hora,
                módulo e conteúdo alterado.
              </span>
            </div>
          </section>
        </section>
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

        </main>
      </div>

      <section className="settings-warning settings-global-warning">
        <strong>Integração preparada:</strong>
        <span>as tabelas e metas ficam centralizadas para serem usadas pelos módulos de Simulação, Propostas, Dashboard e Ranking.</span>
      </section>
    </div>
  );
}