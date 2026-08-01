"use client";

import type { PedidoLoja } from "./tipos";

type ResgatesLojaProps = {
  pedidos: PedidoLoja[];
  podeGerenciar: boolean;
  carregando: boolean;
  onAtualizarStatus: (
    pedido: PedidoLoja,
    status: string
  ) => void;
};

function formatarPontos(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatarData(valor: string) {
  if (!valor) return "—";

  return new Date(valor).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function classeStatus(status: string) {
  return String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "-");
}

export default function ResgatesLoja({
  pedidos,
  podeGerenciar,
  carregando,
  onAtualizarStatus,
}: ResgatesLojaProps) {
  return (
    <section className="resgates-loja">
      <div className="resgates-loja-topo">
        <div>
          <span>HISTÓRICO DE RESGATES</span>

          <h2>
            {podeGerenciar
              ? "Todos os pedidos"
              : "Meus resgates"}
          </h2>

          <p>
            Acompanhe a situação de cada solicitação.
          </p>
        </div>

        <strong>{pedidos.length}</strong>
      </div>

      {carregando ? (
        <div className="resgates-loja-vazio">
          Carregando pedidos...
        </div>
      ) : pedidos.length === 0 ? (
        <div className="resgates-loja-vazio">
          Nenhum resgate solicitado.
        </div>
      ) : (
        <div className="resgates-loja-lista">
          {pedidos.map((pedido) => (
            <article key={pedido.id}>
              <div className="resgates-loja-imagem">
                <img
                  src={
                    pedido.imagem_url ||
                    "/icon-eleva.png"
                  }
                  alt={pedido.nome_premio}
                />
              </div>

              <div className="resgates-loja-dados">
                <strong>{pedido.nome_premio}</strong>

                <span>
                  {podeGerenciar
                    ? pedido.consultora
                    : "Solicitado por você"}
                </span>

                <small>
                  {formatarData(pedido.criado_em)}
                </small>
              </div>

              <div className="resgates-loja-pontos">
                <strong>
                  {formatarPontos(
                    pedido.pontos_total
                  )}{" "}
                  pts
                </strong>

                <span
                  className={`status ${classeStatus(
                    pedido.status
                  )}`}
                >
                  {pedido.status}
                </span>
              </div>

              {podeGerenciar && (
                <select
                  value={pedido.status}
                  onChange={(evento) =>
                    onAtualizarStatus(
                      pedido,
                      evento.target.value
                    )
                  }
                >
                  <option value="SOLICITADO">
                    Solicitado
                  </option>

                  <option value="APROVADO">
                    Aprovado
                  </option>

                  <option value="EM PREPARAÇÃO">
                    Em preparação
                  </option>

                  <option value="ENTREGUE">
                    Entregue
                  </option>

                  <option value="RECUSADO">
                    Recusado
                  </option>

                  <option value="CANCELADO">
                    Cancelado
                  </option>
                </select>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}