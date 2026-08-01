type Props = {
  total: number;
  andamento: number;
  pagos: number;
  valorPago: number;
  producao: number;
};

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ProposalStats({
  total,
  andamento,
  pagos,
  valorPago,
  producao,
}: Props) {
  return (
    <section className="proposal-summary">
      <article>
        <span>Total de propostas</span>
        <strong>{total}</strong>
      </article>

      <article>
        <span>Em andamento</span>
        <strong>{andamento}</strong>
      </article>

      <article>
        <span>Contratos pagos</span>
        <strong>{pagos}</strong>
      </article>

      <article>
        <span>Valor total pago</span>
        <strong>{moeda(valorPago)}</strong>
      </article>

      <article className="commission-summary">
        <span>Produção válida paga</span>
        <strong>{moeda(producao)}</strong>
      </article>
    </section>
  );
}