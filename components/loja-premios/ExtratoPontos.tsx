type Movimento = {
  id: string;
  produto: "Compra de Dívida" | "CLT";
  descricao: string;
  pontos: number;
  data: string;
};

type Props = {
  movimentos: Movimento[];
  formatarPontos: (valor: number) => string;
};

export default function ExtratoPontos({
  movimentos,
  formatarPontos,
}: Props) {
  return (
    <article className="lp-painel">
      <div className="lp-painel-titulo">
        <div>
          <span>EXTRATO DE PONTOS</span>
          <h3>Movimentações da competência</h3>
        </div>

        <b>{movimentos.length} lançamentos</b>
      </div>

      {movimentos.length === 0 ? (
        <div className="lp-vazio">
          Nenhum contrato pago gerou pontos nesta competência.
        </div>
      ) : (
        <div className="lp-movimentos">
          {movimentos.map((movimento) => (
            <div className="lp-movimento" key={movimento.id}>
              <div
                className={`lp-produto ${
                  movimento.produto === "CLT" ? "clt" : "compra"
                }`}
              >
                {movimento.produto === "CLT" ? "CLT" : "CD"}
              </div>

              <div className="lp-movimento-info">
                <strong>{movimento.descricao}</strong>

                <span>
                  {movimento.produto} •{" "}
                  {movimento.data || "Data não informada"}
                </span>
              </div>

              <b>+ {formatarPontos(movimento.pontos)} pts</b>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}