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

  const faixa = faixasAtingidas.at(-1);

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

  return Number(bonusAtingidos.at(-1)?.valorBonus || 0);
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
export function calcularPremiacaoCoordenacao(
  producaoEquipe: number,
  regras = obterRegrasPremiacao()
) {
  const producao = Number(producaoEquipe || 0);
  const configuracao = regras.coordenacao;

  if (!configuracao.ativa) {
    return {
      producaoEquipe: producao,
      metaEquipe: Number(configuracao.metaEquipe || 0),
      percentual: 0,
      comissao: 0,
      salarioFixo: Number(configuracao.salarioFixo || 0),
      total: Number(configuracao.salarioFixo || 0),
    };
  }

  const metaEquipe = Number(configuracao.metaEquipe || 0);

  const percentual =
    producao >= metaEquipe
      ? Number(configuracao.percentualAcimaMeta || 0)
      : Number(configuracao.percentualAbaixoMeta || 0);

  const comissao = producao * (percentual / 100);
  const salarioFixo = Number(configuracao.salarioFixo || 0);

  return {
    producaoEquipe: producao,
    metaEquipe,
    percentual,
    comissao,
    salarioFixo,
    total: salarioFixo + comissao,
  };
}

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}