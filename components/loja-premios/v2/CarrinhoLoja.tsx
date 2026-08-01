"use client";

import { Check, Trash2 } from "lucide-react";
import type { PremioLoja } from "./tipos";

type CarrinhoLojaProps = {
  itens: PremioLoja[];
  saldoPontos: number;
  totalCarrinho: number;
  onRemover: (id: string) => void;
  onConfirmar: () => void;
};

function formatarPontos(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function CarrinhoLoja({
  itens,
  saldoPontos,
  totalCarrinho,
  onRemover,
  onConfirmar,
}: CarrinhoLojaProps) {
  const saldoInsuficiente = totalCarrinho > saldoPontos;

  return (
    <section className="carrinho-loja">
      <div className="carrinho-loja-topo">
        <div>
          <span>MEU CARRINHO</span>
          <h2>Revise seus prêmios</h2>
          <p>
            Confira os produtos antes de confirmar o resgate.
          </p>
        </div>

        <strong>{itens.length} item(ns)</strong>
      </div>

      {itens.length === 0 ? (
        <div className="carrinho-loja-vazio">
          Seu carrinho está vazio.
        </div>
      ) : (
        <>
          <div className="carrinho-loja-lista">
            {itens.map((premio) => (
              <article key={premio.id}>
                <div className="carrinho-loja-imagem">
                  <img
                    src={premio.imagem_url || "/icon-eleva.png"}
                    alt={premio.nome}
                  />
                </div>

                <div className="carrinho-loja-dados">
                  <span>{premio.categoria}</span>
                  <h3>{premio.nome}</h3>
                  <small>
                    {premio.estoque > 0
                      ? `${premio.estoque} em estoque`
                      : "Sem estoque"}
                  </small>
                </div>

                <strong>
                  {formatarPontos(premio.pontos)} pts
                </strong>

                <button
                  type="button"
                  onClick={() => onRemover(premio.id)}
                  aria-label={`Remover ${premio.nome} do carrinho`}
                >
                  <Trash2 size={18} />
                </button>
              </article>
            ))}
          </div>

          <div className="carrinho-loja-resumo">
            <div>
              <span>Total do carrinho</span>

              <strong>
                {formatarPontos(totalCarrinho)} pontos
              </strong>

              <small>
                Saldo disponível:{" "}
                {formatarPontos(saldoPontos)} pontos
              </small>

              {saldoInsuficiente && (
                <b>
                  Faltam{" "}
                  {formatarPontos(
                    totalCarrinho - saldoPontos
                  )}{" "}
                  pontos.
                </b>
              )}
            </div>

            <button
              type="button"
              disabled={saldoInsuficiente}
              onClick={onConfirmar}
            >
              <Check size={18} />
              Confirmar resgates
            </button>
          </div>
        </>
      )}
    </section>
  );
}