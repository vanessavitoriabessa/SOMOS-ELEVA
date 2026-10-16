/**
 * Fonte única de Custo PA: usada no Financeiro e em Minha Premiação.
 * As regras abaixo foram extraídas do CustoPorOperadorManager enviado.
 * Não altera tabelas, permissões, premiações nem lançamentos do banco.
 */
import type { createClient } from "@/lib/supabase/client";

type ClienteCustoPa = ReturnType<typeof createClient>;
type ValorBanco = number | string | null;

export type ConfigCustoPa = {
  id: number;
  chave: string;
  nome: string;
  ativo: boolean;
  ordem: number;
};

export type ExtraCustoPa = {
  id: string;
  competencia: string;
  nome: string;
  valor: number;
  observacao?: string | null;
  ativo: boolean;
};

export type OperadorCustoPa = {
  id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
};

export type DadosCustoPa = {
  config: ConfigCustoPa[];
  extras: ExtraCustoPa[];

  fixas: {
    id: string;
    valor: ValorBanco;
    inicio_competencia: string | null;
    fim_competencia: string | null;
    ativo: boolean;
  }[];

  folhas: {
    id: string;
    competencia: string;
    salario: ValorBanco;
    assiduidade_ativa: boolean;
    valor_assiduidade: ValorBanco;
    pagamento_realizado: boolean;
  }[];

  premios: {
    id: string;
    pontos_solicitados: ValorBanco;
    valor_reais: ValorBanco;
    status: string;
    processado_em: string | null;
  }[];

  simples: {
    id: string;
    competencia: string;
    valor_imposto: ValorBanco;
  }[];

  inss: {
    id: string;
    tipo: string;
    competencia: string;
    valor: ValorBanco;
  }[];

  parcelasInss: {
    valor_parcela: ValorBanco;
    ativo: boolean;
  }[];

  operadores: OperadorCustoPa[];
};

export type CalculoCustoPa = {
  referencia: string;
  df: number;
  fo: number;
  pr: number;
  si: number;
  inf: number;
  ad: number;
  ex: ExtraCustoPa[];
  qtd: number;
  total: number;
  unit: number;
};

export type ResumoCustoPa = {
  referencia: string;
  custoPa: number;
  custoTotal: number;
  quantidadeOperadores: number;
  consultadoEm: string;
};

export function referenciaCustoPaValida(referencia: string): boolean {
  return /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(referencia);
}

export function mesAnteriorCustoPa(referencia: string): string {
  if (!referenciaCustoPaValida(referencia)) {
    throw new Error("Selecione um mês e ano de referência válidos.");
  }

  const [ano, mes] = referencia.split("-").map(Number);

  return mes === 1
    ? `${ano - 1}-12`
    : `${ano}-${String(mes - 1).padStart(2, "0")}`;
}

function numero(valor: ValorBanco | undefined): number {
  const convertido = Number(valor ?? 0);

  if (!Number.isFinite(convertido)) {
    throw new Error(
      "Há um valor financeiro inválido na composição do Custo PA.",
    );
  }

  return convertido;
}

export function calcularCustoPa(
  dados: DadosCustoPa,
  referencia: string,
): CalculoCustoPa {
  if (!referenciaCustoPaValida(referencia)) {
    throw new Error("Selecione um mês e ano de referência válidos.");
  }

  const ativa = (chave: string) =>
    dados.config.find((item) => item.chave === chave)?.ativo ?? true;

  const df = dados.fixas
    .filter((item) => {
      const inicio = String(
        item.inicio_competencia || "0000-00",
      ).slice(0, 7);

      const fim = item.fim_competencia
        ? String(item.fim_competencia).slice(0, 7)
        : null;

      return (
        item.ativo &&
        inicio <= referencia &&
        (!fim || fim >= referencia)
      );
    })
    .reduce((soma, item) => soma + numero(item.valor), 0);

  const fo = dados.folhas
    .filter(
      (item) =>
        String(item.competencia || "").slice(0, 7) === referencia &&
        item.pagamento_realizado === true,
    )
    .reduce(
      (soma, item) =>
        soma +
        numero(item.salario) +
        numero(
          item.assiduidade_ativa ? item.valor_assiduidade : 0,
        ),
      0,
    );

  const pr = dados.premios
    .filter(
      (item) =>
        item.status === "PAGO" &&
        String(item.processado_em || "").slice(0, 7) === referencia,
    )
    .reduce(
      (soma, item) =>
        soma + numero(item.valor_reais ?? item.pontos_solicitados),
      0,
    );

  // Regra JÁ EXISTENTE no Financeiro recebido: Simples do mês anterior
  // mais 370 de parcelamento mensal. Não é o valor do Custo PA, nem um
  // ajuste para outubro. Foi preservada para não mudar a composição financeira.
  const referenciaSimples = mesAnteriorCustoPa(referencia);

  const impostoSimplesMensal = dados.simples
    .filter(
      (item) =>
        String(item.competencia || "").slice(0, 7) ===
        referenciaSimples,
    )
    .reduce(
      (soma, item) => soma + numero(item.valor_imposto),
      0,
    );

  const parcelamentoSimplesMensalExistente = 370;
  const si =
    impostoSimplesMensal + parcelamentoSimplesMensalExistente;

  // Mantém o arquivo enviado: INSS/FGTS da própria referência e
  // valor_parcela dos inss_parcelamentos ativos (sem criar outra regra).
  const impostosCompetencia = dados.inss
    .filter(
      (item) =>
        String(item.competencia || "").slice(0, 7) === referencia,
    )
    .reduce((soma, item) => soma + numero(item.valor), 0);

  const parcelamentosCompetencia = dados.parcelasInss
    .filter((item) => item.ativo)
    .reduce(
      (soma, item) => soma + numero(item.valor_parcela),
      0,
    );

  const inf = impostosCompetencia + parcelamentosCompetencia;

  const ex = dados.extras.filter(
    (item) => item.competencia === referencia,
  );

  const ad = ex
    .filter((item) => item.ativo)
    .reduce((soma, item) => soma + numero(item.valor), 0);

  const qtd = dados.operadores.filter((item) => {
    const perfil = String(item.perfil || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return (
      item.ativo &&
      (perfil.includes("consultor") || perfil.includes("vendedor"))
    );
  }).length;

  const total =
    (ativa("despesas_fixas") ? df : 0) +
    (ativa("folha") ? fo : 0) +
    (ativa("premiacoes_pagas") ? pr : 0) +
    (ativa("simples_nacional") ? si : 0) +
    (ativa("inss_fgts") ? inf : 0) +
    ad;

  if (!Number.isFinite(total)) {
    throw new Error("Não foi possível calcular o Custo PA.");
  }

  return {
    referencia,
    df,
    fo,
    pr,
    si,
    inf,
    ad,
    ex,
    qtd,
    total,
    unit: qtd ? total / qtd : 0,
  };
}

// Pagina também bases maiores que o limite da API. Não transforma erro de
// permissão/consulta em custo zero. Mantém as políticas RLS do cliente recebido.
export async function carregarDadosCustoPa(
  cliente: ClienteCustoPa,
  signal?: AbortSignal,
): Promise<DadosCustoPa> {
  const ler = async <T,>(
    tabela: string,
    colunas: string,
    campoOrdem: string,
    filtro?: [string, boolean | string],
  ): Promise<T[]> => {
    const registros: T[] = [];
    let inicio = 0;

    for (;;) {
      if (signal?.aborted) {
        throw new Error("Consulta do Custo PA cancelada.");
      }

      let consulta = cliente
        .from(tabela)
        .select(colunas, { count: "exact" })
        .order(campoOrdem, { ascending: true });

      if (filtro) {
        consulta = consulta.eq(filtro[0], filtro[1]);
      }

      if (signal) {
        consulta = consulta.abortSignal(signal);
      }

      const { data, error, count } = await consulta.range(
        inicio,
        inicio + 499,
      );

      if (error) {
        throw new Error(
          `Não foi possível consultar ${tabela}: ${error.message}`,
        );
      }

      const pagina = (data || []) as unknown as T[];

      if (!pagina.length) {
        if (
          typeof count === "number" &&
          registros.length < count
        ) {
          throw new Error(
            `A consulta de ${tabela} retornou dados incompletos.`,
          );
        }

        break;
      }

      registros.push(...pagina);

      if (
        typeof count === "number" &&
        registros.length >= count
      ) {
        break;
      }

      // Usa a quantidade recebida, inclusive se o limite configurado for < 500.
      inicio += pagina.length;
    }

    return registros;
  };

  const [
    config,
    extras,
    fixas,
    folhas,
    premios,
    simples,
    inss,
    parcelasInss,
    operadores,
  ] = await Promise.all([
    ler<ConfigCustoPa>(
      "custo_operador_config",
      "id,chave,nome,ativo,ordem",
      "id",
    ),

    ler<ExtraCustoPa>(
      "custo_operador_adicionais",
      "id,competencia,nome,valor,observacao,ativo",
      "id",
    ),

    ler<DadosCustoPa["fixas"][number]>(
      "despesas_recorrentes",
      "id,valor,inicio_competencia,fim_competencia,ativo",
      "id",
      ["ativo", true],
    ),

    ler<DadosCustoPa["folhas"][number]>(
      "folha_pagamentos",
      "id,competencia,salario,assiduidade_ativa,valor_assiduidade,pagamento_realizado,total_dia05,total_mensal,valor_pago",
      "id",
    ),

    ler<DadosCustoPa["premios"][number]>(
      "pontos_saques",
      "id,pontos_solicitados,valor_reais,status,processado_em",
      "id",
      ["status", "PAGO"],
    ),

    ler<DadosCustoPa["simples"][number]>(
      "controle_simples_nacional",
      "id,competencia,valor_imposto,status",
      "id",
    ),

    ler<DadosCustoPa["inss"][number]>(
      "controle_inss_fgts",
      "id,tipo,competencia,valor",
      "id",
    ),

    ler<DadosCustoPa["parcelasInss"][number]>(
      "inss_parcelamentos",
      "valor_parcela,ativo",
      "valor_parcela",
      ["ativo", true],
    ),

    ler<OperadorCustoPa>(
      "profiles",
      "id,nome,perfil,ativo",
      "id",
      ["ativo", true],
    ),
  ]);

  config.sort((a, b) => a.ordem - b.ordem);

  return {
    config,
    extras,
    fixas,
    folhas,
    premios,
    simples,
    inss,
    parcelasInss,
    operadores,
  };
}

// Apenas um aviso de atualização entre abas; nunca armazena custos/folhas/nomes.
export const CHAVE_AVISO_CUSTO_PA = "eleva:custo-pa:atualizacao";

export function notificarAlteracaoCustoPa(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      CHAVE_AVISO_CUSTO_PA,
      `${Date.now()}-${Math.random()}`,
    );
  } catch {
    // Polling e atualização ao retornar à aba permanecem ativos.
  }
}