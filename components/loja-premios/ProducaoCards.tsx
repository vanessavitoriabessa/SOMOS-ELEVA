type Props = {
  digitados: number;
  pagosConfirmados: number;
  aguardando: number;
  valorProduzido: string;
  valorConfirmado: string;
  valorEmFormacao: string;
  fechado: boolean;
  prazo: string;
};

export default function ProducaoCards({
  digitados,
  pagosConfirmados,
  aguardando,
  valorProduzido,
  valorConfirmado,
  valorEmFormacao,
  fechado,
  prazo,
}: Props) {
  return (
    <section className="lp-resumo-grid">
      <article>
        <div>
          <span>PRODUÇÃO DO MÊS</span>
          <strong>{digitados} contratos</strong>
          <small>{valorProduzido}</small>
        </div>
      </article>

      <article>
        <div>
          <span>CONFIRMADO / A RECEBER</span>
          <strong>{pagosConfirmados} contratos</strong>
          <small>{valorConfirmado}</small>
        </div>
      </article>

      <article>
        <div>
          <span>EM FORMAÇÃO</span>
          <strong>{aguardando} contratos</strong>
          <small>{valorEmFormacao}</small>
        </div>
      </article>

      <article>
        <div>
          <span>FECHAMENTO</span>
          <strong>
            {fechado ? "Competência fechada" : "Competência aberta"}
          </strong>
          <small>{prazo}</small>
        </div>
      </article>
    </section>
  );
}