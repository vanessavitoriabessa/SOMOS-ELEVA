export type PropostaCompetenciaCompra = {
  produto?: string;
  status?: string;

  dataDigitacao?: string;
  dataCadastro?: string;
  criadoEm?: string;

  dataPagamento?: string;
  atualizadoEm?: string;

  valorContrato?: number;
  valorMeta?: number;
  vendedora?: string;
};

export type ResultadoValidacaoCompra = {
  valida: boolean;
  motivo:
    | "VALIDA"
    | "PRODUTO_INVALIDO"
    | "STATUS_NAO_PAGO"
    | "SEM_DATA_DIGITACAO"
    | "FORA_DA_COMPETENCIA"
    | "SEM_DATA_PAGAMENTO"
    | "PAGAMENTO_APOS_DIA_19";
};

export function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function converterData(valor: unknown): Date | null {
  if (!valor) return null;

  const texto = String(valor).trim();

  /*
   * Formatos aceitos:
   * 2026-07-15
   * 2026-07-15T10:30:00
   */
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    const [ano, mes, dia] = texto
      .slice(0, 10)
      .split("-")
      .map(Number);

    const data = new Date(ano, mes - 1, dia);

    return Number.isNaN(data.getTime()) ? null : data;
  }

  /*
   * Formato aceito:
   * 15/07/2026
   */
  const formatoBr = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})/
  );

  if (formatoBr) {
    const dia = Number(formatoBr[1]);
    const mes = Number(formatoBr[2]);
    const ano = Number(formatoBr[3]);

    const data = new Date(ano, mes - 1, dia);

    return Number.isNaN(data.getTime()) ? null : data;
  }

  return null;
}

export function produtoEhCompraDivida(
  proposta: PropostaCompetenciaCompra
) {
  /*
   * Compatibilidade temporária:
   *
   * As propostas antigas ainda não possuem o campo produto.
   * Como vieram do módulo Compra de Dívida, a ausência do campo
   * será considerada Compra de Dívida.
   *
   * Quando todas as propostas tiverem o campo produto,
   * essa compatibilidade poderá ser removida.
   */
  if (!proposta.produto) {
    return true;
  }

  const produto = normalizarTexto(proposta.produto);

  return (
    produto === "compra de divida" ||
    produto.includes("compra de divida")
  );
}

export function statusEhPago(status: unknown) {
  return normalizarTexto(status) === "pago";
}

export function inicioDaCompetencia(
  competencia: string
): Date | null {
  const partes = competencia.split("-");

  if (partes.length !== 2) return null;

  const ano = Number(partes[0]);
  const mes = Number(partes[1]);

  if (
    !Number.isInteger(ano) ||
    !Number.isInteger(mes) ||
    mes < 1 ||
    mes > 12
  ) {
    return null;
  }

  return new Date(ano, mes - 1, 1);
}

export function fimDaCompetencia(
  competencia: string
): Date | null {
  const inicio = inicioDaCompetencia(competencia);

  if (!inicio) return null;

  return new Date(
    inicio.getFullYear(),
    inicio.getMonth() + 1,
    0
  );
}

export function limitePagamentoCompetencia(
  competencia: string
): Date | null {
  const inicio = inicioDaCompetencia(competencia);

  if (!inicio) return null;

  /*
   * Dia 19 do mês seguinte à competência.
   *
   * Exemplo:
   * competência 2026-07
   * limite 19/08/2026
   */
  return new Date(
    inicio.getFullYear(),
    inicio.getMonth() + 1,
    19
  );
}

export function obterDataDigitacao(
  proposta: PropostaCompetenciaCompra
) {
  return converterData(
    proposta.dataDigitacao ||
      proposta.dataCadastro ||
      proposta.criadoEm
  );
}

export function obterDataPagamento(
  proposta: PropostaCompetenciaCompra
) {
  return converterData(
    proposta.dataPagamento ||
      proposta.atualizadoEm
  );
}

export function validarCompraNaCompetencia(
  proposta: PropostaCompetenciaCompra,
  competencia: string
): ResultadoValidacaoCompra {
  if (!produtoEhCompraDivida(proposta)) {
    return {
      valida: false,
      motivo: "PRODUTO_INVALIDO",
    };
  }

  if (!statusEhPago(proposta.status)) {
    return {
      valida: false,
      motivo: "STATUS_NAO_PAGO",
    };
  }

  const inicio = inicioDaCompetencia(competencia);
  const fim = fimDaCompetencia(competencia);
  const limitePagamento =
    limitePagamentoCompetencia(competencia);

  const dataDigitacao = obterDataDigitacao(proposta);

  if (!dataDigitacao) {
    return {
      valida: false,
      motivo: "SEM_DATA_DIGITACAO",
    };
  }

  if (
    !inicio ||
    !fim ||
    dataDigitacao < inicio ||
    dataDigitacao > fim
  ) {
    return {
      valida: false,
      motivo: "FORA_DA_COMPETENCIA",
    };
  }

  const dataPagamento = obterDataPagamento(proposta);

  if (!dataPagamento) {
    return {
      valida: false,
      motivo: "SEM_DATA_PAGAMENTO",
    };
  }

  if (
    !limitePagamento ||
    dataPagamento > limitePagamento
  ) {
    return {
      valida: false,
      motivo: "PAGAMENTO_APOS_DIA_19",
    };
  }

  return {
    valida: true,
    motivo: "VALIDA",
  };
}

export function compraValidaNaCompetencia(
  proposta: PropostaCompetenciaCompra,
  competencia: string
) {
  return validarCompraNaCompetencia(
    proposta,
    competencia
  ).valida;
}

export function filtrarComprasValidas(
  propostas: PropostaCompetenciaCompra[],
  competencia: string
) {
  return propostas.filter((proposta) =>
    compraValidaNaCompetencia(
      proposta,
      competencia
    )
  );
}

export function calcularProducaoValidaCompra(
  propostas: PropostaCompetenciaCompra[],
  competencia: string
) {
  return filtrarComprasValidas(
    propostas,
    competencia
  ).reduce(
    (total, proposta) =>
      total +
      Number(
        proposta.valorMeta ??
          proposta.valorContrato ??
          0
      ),
    0
  );
}