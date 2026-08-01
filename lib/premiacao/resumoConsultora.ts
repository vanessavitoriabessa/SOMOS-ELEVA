import {
  calcularPremiacaoClt,
  calcularPremiacaoCompra,
} from "./premiacaoService";

import {
  compraValidaNaCompetencia,
  normalizarTexto,
} from "./competenciaCompra";

export type ResumoConsultora = {
  nome: string;

  pontosCompra: number;
  pontosClt: number;
  pontosTotal: number;

  premioCompra: number;
  premioClt: number;
  premioTotal: number;

  faixa: any;

  movimentos: any[];
};

export function montarResumoConsultora({
  nome,
  propostas,
  registrosClt,
  competencia,
  saques,
  valorValidoCompra,
  chaveMes,
  converterData,
}: any): ResumoConsultora {
  const chave = normalizarTexto(nome);

  const propostasDaConsultora = propostas.filter(
    (proposta: any) =>
      normalizarTexto(proposta.vendedora) === chave &&
      compraValidaNaCompetencia(
        {
          ...proposta,
          produto:
            proposta.produto || "Compra de Dívida",
        },
        competencia
      )
  );

  const cltDaConsultora = registrosClt.filter(
    (registro: any) => {
      const data = converterData(
        registro.dataPagamento ||
          registro.atualizadoEm ||
          registro.criadoEm
      );

      return (
        normalizarTexto(registro.status) === "pago" &&
        normalizarTexto(registro.consultora) === chave &&
        data &&
        chaveMes(data) === competencia
      );
    }
  );

  const pontosCompraBrutos =
    propostasDaConsultora.reduce(
      (total: number, proposta: any) =>
        total + valorValidoCompra(proposta),
      0
    );

  const pontosCltBrutos =
    cltDaConsultora.reduce(
      (total: number, registro: any) =>
        total + Number(registro.parcela || 0),
      0
    );

  const saquesPagos = saques.filter(
    (saque: any) =>
      normalizarTexto(saque.status) === "pago" &&
      saque.competencia === competencia &&
      normalizarTexto(saque.consultora) === chave
  );

  const pontosCompraPagos =
    saquesPagos.reduce(
      (total: number, saque: any) =>
        total + Number(saque.pontosCompra || 0),
      0
    );

  const pontosCltPagos =
    saquesPagos.reduce(
      (total: number, saque: any) =>
        total + Number(saque.pontosClt || 0),
      0
    );

  const pontosCompra = Math.max(
    pontosCompraBrutos - pontosCompraPagos,
    0
  );

  const pontosClt = Math.max(
    pontosCltBrutos - pontosCltPagos,
    0
  );

  const resultadoCompra =
    calcularPremiacaoCompra(pontosCompra);

  const resultadoClt =
    calcularPremiacaoClt(pontosClt);

  const premioCompra = resultadoCompra.premio;
  const premioClt = resultadoClt.premio;

  return {
    nome,

    pontosCompra,
    pontosClt,

    pontosTotal:
      pontosCompra + pontosClt,

    premioCompra,
    premioClt,

    premioTotal:
      premioCompra + premioClt,

    faixa: resultadoCompra.faixa,

    movimentos: [],
  };
}