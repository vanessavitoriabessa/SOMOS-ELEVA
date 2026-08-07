"use client";

type Props = {
  pagos: number;
  valorBrutoPago: number;
  valorLiquidoPago: number;
  producaoDigitada: number;
  andamento: number;
  canceladas: number;
  onVerPagas?: () => void;
  onVerCanceladas?: () => void;
};

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ProposalStats({
  pagos,
  valorBrutoPago,
  valorLiquidoPago,
  producaoDigitada,
  andamento,
  canceladas,
  onVerPagas,
  onVerCanceladas,
}: Props) {
  return (
    <section className="proposal-summary proposal-summary-pro">
      <article>
        <span>Propostas pagas</span>
        <strong>{pagos}</strong>
        <small>Contratos com status Pago</small>

        {onVerPagas && (
          <button type="button" onClick={onVerPagas}>
            Ver pagas
          </button>
        )}
      </article>

      <article className="proposal-stat-success">
        <span>Valor bruto pago</span>
        <strong>{moeda(valorBrutoPago)}</strong>
        <small>Valor dos contratos pagos</small>
      </article>

      <article className="proposal-stat-success">
        <span>Valor líquido pago</span>
        <strong>{moeda(valorLiquidoPago)}</strong>
        <small>Produção válida dos contratos pagos</small>
      </article>

      <article>
        <span>Produção digitada</span>
        <strong>{moeda(producaoDigitada)}</strong>
        <small>Produção válida de todas as propostas</small>
      </article>

      <article className="proposal-stat-warning">
        <span>Em andamento</span>
        <strong>{andamento}</strong>
        <small>Aguardando conclusão</small>
      </article>

      <article className="proposal-stat-danger">
        <span>Canceladas</span>
        <strong>{canceladas}</strong>
        <small>Contratos cancelados</small>

        {onVerCanceladas && (
          <button type="button" onClick={onVerCanceladas}>
            Ver canceladas
          </button>
        )}
      </article>
    </section>
  );
}