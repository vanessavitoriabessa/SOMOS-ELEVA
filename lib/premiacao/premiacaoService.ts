import {
  carregarRegrasPremiacao,
  type RegrasPremiacao,
} from "../../components/RegrasPremiacaoManager";

export type ProdutoPremiacao = "Compra de Dívida" | "CLT";

export type ResultadoFaixa = {
  id: string;
  meta: number;
  percentual: number;
  premioFixo: number;
  nome: string;
};

export type ResultadoPremiacao = {
  producao: number;
  metaMinima: number;
  atingiuMetaMinima: boolean;
  faixa: ResultadoFaixa | null;
  percentual: number;
  premio: number;
};

export type ResultadoOperacional = {
  nome: string;
  quantidadeContratos: number;
  valorPorContrato: number;
  valorContratos: number;
  producaoEmpresa: number;
  bonus: number;
  total: number;
};

/**
 * Retorna todas as regras cadastradas na tela Regras da Premiação.
 */
export function obterRegrasPremiacao(): RegrasPremiacao {
  return carregarRegrasPremiacao();
}

/**
 * Localiza a maior faixa ativa atingida.
 */
export function obterFaixa(
  produto: ProdutoPremiacao,
  producao: number,
  regras = obterRegrasPremiacao()
): ResultadoFaixa | null {
  const valorProducao = Number(producao || 0);

  const faixas = regras.faixas
    .filter((faixa) => faixa.ativa && faixa.produto === produto)
    .sort((a, b) => a.meta - b.meta);

  const faixasAtingidas = faixas.filter(
    (faixa) => valorProducao >= Number(faixa.meta || 0)
  );

  const faixa =
  faixasAtingidas[faixasAtingidas.length - 1];

  if (!faixa) return null;

  return {
    id: faixa.id,
    meta: Number(faixa.meta || 0),
    percentual: Number(faixa.percentual || 0),
    premioFixo: Number(faixa.premioFixo || 0),
    nome: `Faixa ${faixas.indexOf(faixa) + 1}`,
  };
}

/**
 * Calcula a comissão de Compra de Dívida.
 */
export function calcularPremiacaoCompra(
  producao: number,
  regras = obterRegrasPremiacao()
): ResultadoPremiacao {
  const valorProducao = Number(producao || 0);
  const metaMinima = Number(regras.metaMinimaCompra || 0);
  const atingiuMetaMinima = valorProducao >= metaMinima;

  const faixa = atingiuMetaMinima
    ? obterFaixa("Compra de Dívida", valorProducao, regras)
    : null;

  const percentual = Number(faixa?.percentual || 0);

  const premio =
    atingiuMetaMinima && percentual > 0
      ? valorProducao * (percentual / 100)
      : 0;

  return {
    producao: valorProducao,
    metaMinima,
    atingiuMetaMinima,
    faixa,
    percentual,
    premio,
  };
}

/**
 * Calcula a premiação fixa do CLT.
 */
export function calcularPremiacaoClt(
  producao: number,
  regras = obterRegrasPremiacao()
): ResultadoPremiacao {
  const valorProducao = Number(producao || 0);
  const metaMinima = Number(regras.metaMinimaClt || 0);
  const atingiuMetaMinima = valorProducao >= metaMinima;

  const faixa = atingiuMetaMinima
    ? obterFaixa("CLT", valorProducao, regras)
    : null;

  const premio = atingiuMetaMinima
    ? Number(faixa?.premioFixo || 0)
    : 0;

  return {
    producao: valorProducao,
    metaMinima,
    atingiuMetaMinima,
    faixa,
    percentual: 0,
    premio,
  };
}

/**
 * Calcula o bônus do operacional conforme a produção da empresa.
 *
 * Quando bonusCumulativo for falso, utiliza apenas o maior bônus atingido.
 */
export function calcularBonusOperacional(
  nomeOperacional: string,
  producaoEmpresa: number,
  regras = obterRegrasPremiacao()
): number {
  const nomeNormalizado = normalizarTexto(nomeOperacional);

  const operacional = regras.operacionais.find(
    (item) =>
      item.ativo &&
      normalizarTexto(item.nome) === nomeNormalizado
  );

  if (!operacional) return 0;

  const bonusAtingidos = operacional.bonus
    .filter(
      (bonus) =>
        Number(producaoEmpresa || 0) >= Number(bonus.metaEmpresa || 0)
    )
    .sort((a, b) => a.metaEmpresa - b.metaEmpresa);

  if (bonusAtingidos.length === 0) return 0;

  if (operacional.bonusCumulativo) {
    return bonusAtingidos.reduce(
      (total, bonus) => total + Number(bonus.valorBonus || 0),
      0
    );
  }

  const maiorBonus =
  bonusAtingidos[bonusAtingidos.length - 1];

return Number(maiorBonus?.valorBonus || 0);
}

/**
 * Calcula a premiação completa de um operacional.
 */
export function calcularPremiacaoOperacional(
  nomeOperacional: string,
  quantidadeContratosPagos: number,
  producaoEmpresa: number,
  regras = obterRegrasPremiacao()
): ResultadoOperacional {
  const nomeNormalizado = normalizarTexto(nomeOperacional);

  const operacional = regras.operacionais.find(
    (item) =>
      item.ativo &&
      normalizarTexto(item.nome) === nomeNormalizado
  );

  const quantidade = Math.max(
    0,
    Number(quantidadeContratosPagos || 0)
  );

  const valorPorContrato = Number(
    operacional?.valorPorContrato || 0
  );

  const valorContratos = quantidade * valorPorContrato;

  const bonus = calcularBonusOperacional(
    nomeOperacional,
    producaoEmpresa,
    regras
  );

  return {
    nome: nomeOperacional,
    quantidadeContratos: quantidade,
    valorPorContrato,
    valorContratos,
    producaoEmpresa: Number(producaoEmpresa || 0),
    bonus,
    total: valorContratos + bonus,
  };
}

/**
 * Calcula a comissão da coordenadora sobre a produção paga da equipe.
 */
export type ResultadoCoordenacao = {
  producaoCompra: number;
  producaoClt: number;

  compraAtivada: boolean;
  motivoAtivacaoCompra:
    | "CLT_ATINGIU_1_5_MILHAO"
    | "COMPRA_ATINGIU_200_MIL"
    | "NAO_ATIVADA";

  metaAtivacaoClt: number;
  metaAtivacaoCompra: number;

  percentualCompra: number;
  comissaoCompra: number;

  bonusClt: number;

  salarioFixo: number;
  total: number;
};

type FaixaCoordenadoraCompra = {
  meta: number;
  percentual: number;
};

/*
 * Tabela da coordenadora — Compra de Dívida.
 *
 * O sistema utiliza a maior faixa atingida.
 * Exemplo:
 * R$ 245.000,00 utiliza a faixa de R$ 240.000,00 — 1,25%.
 */
const FAIXAS_COMPRA_COORDENADORA: FaixaCoordenadoraCompra[] = [
  { meta: 30_000, percentual: 1 },
  { meta: 40_000, percentual: 1 },
  { meta: 50_000, percentual: 1 },
  { meta: 60_000, percentual: 1 },
  { meta: 70_000, percentual: 1 },
  { meta: 80_000, percentual: 1 },
  { meta: 90_000, percentual: 1 },
  { meta: 100_000, percentual: 1 },
  { meta: 120_000, percentual: 1 },
  { meta: 140_000, percentual: 1 },
  { meta: 160_000, percentual: 1 },
  { meta: 180_000, percentual: 1 },

  { meta: 200_000, percentual: 1.25 },
  { meta: 220_000, percentual: 1.25 },
  { meta: 240_000, percentual: 1.25 },
  { meta: 260_000, percentual: 1.25 },
  { meta: 280_000, percentual: 1.25 },

  { meta: 300_000, percentual: 1.5 },
  { meta: 400_000, percentual: 1.5 },
  { meta: 500_000, percentual: 1.5 },
  { meta: 600_000, percentual: 1.5 },
  { meta: 700_000, percentual: 1.5 },
  { meta: 800_000, percentual: 1.5 },
  { meta: 900_000, percentual: 1.5 },
  { meta: 1_000_000, percentual: 1.5 },
];

function obterPercentualCompraCoordenadora(
  producaoCompra: number
): number {
  const producao = Math.max(
    0,
    Number(producaoCompra || 0)
  );

  const faixasAtingidas =
    FAIXAS_COMPRA_COORDENADORA
      .filter((faixa) => producao >= faixa.meta)
      .sort((a, b) => a.meta - b.meta);

  const maiorFaixa =
  faixasAtingidas[faixasAtingidas.length - 1];

return Number(maiorFaixa?.percentual || 0);
}

function calcularBonusCltCoordenadora(
  producaoClt: number
): number {
  const producao = Math.max(
    0,
    Number(producaoClt || 0)
  );

  /*
   * Faixas confirmadas:
   *
   * R$ 1.500.000,00 = R$ 250,00
   * R$ 2.000.000,00 = R$ 500,00
   *
   * O bônus não é cumulativo.
   */
  if (producao >= 2_000_000) {
    return 500;
  }

  if (producao >= 1_500_000) {
    return 250;
  }

  return 0;
}

/**
 * Calcula a premiação da coordenadora.
 *
 * Regra para ativar a comissão da Compra:
 *
 * 1. Se o CLT atingir R$ 1.500.000,00, a comissão
 *    da Compra fica ativada, independentemente de
 *    a Compra atingir R$ 200.000,00.
 *
 * 2. Se o CLT não atingir R$ 1.500.000,00, a Compra
 *    precisa atingir no mínimo R$ 200.000,00 líquidos.
 *
 * Mesmo ativada pelo CLT, a Compra precisa alcançar
 * pelo menos a primeira faixa da tabela, de R$ 30.000,00,
 * para existir percentual de comissão.
 */
export function calcularPremiacaoCoordenacao(
  producaoCompra: number,
  producaoClt: number = 0,
  regras = obterRegrasPremiacao()
): ResultadoCoordenacao {
  const compra = Math.max(
    0,
    Number(producaoCompra || 0)
  );

  const clt = Math.max(
    0,
    Number(producaoClt || 0)
  );

  const metaAtivacaoClt = 1_500_000;
  const metaAtivacaoCompra = 200_000;

  const ativadaPeloClt =
    clt >= metaAtivacaoClt;

  const ativadaPelaCompra =
    compra >= metaAtivacaoCompra;

  const compraAtivada =
    ativadaPeloClt || ativadaPelaCompra;

  const motivoAtivacaoCompra:
    ResultadoCoordenacao["motivoAtivacaoCompra"] =
      ativadaPeloClt
        ? "CLT_ATINGIU_1_5_MILHAO"
        : ativadaPelaCompra
          ? "COMPRA_ATINGIU_200_MIL"
          : "NAO_ATIVADA";

  const percentualCompra =
    compraAtivada
      ? obterPercentualCompraCoordenadora(compra)
      : 0;

  const comissaoCompra =
    compraAtivada && percentualCompra > 0
      ? compra * (percentualCompra / 100)
      : 0;

  const bonusClt =
    calcularBonusCltCoordenadora(clt);

  const salarioFixo = Number(
    regras?.coordenacao?.salarioFixo ?? 0
  );

  return {
    producaoCompra: compra,
    producaoClt: clt,

    compraAtivada,
    motivoAtivacaoCompra,

    metaAtivacaoClt,
    metaAtivacaoCompra,

    percentualCompra,
    comissaoCompra,

    bonusClt,
    salarioFixo,

    total:
      salarioFixo +
      comissaoCompra +
      bonusClt,
  };
}

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}