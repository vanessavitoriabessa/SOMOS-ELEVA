"use client";

import { Heart, Pencil, ShoppingCart } from "lucide-react";
import type { PremioLoja } from "./tipos";

type ProdutoCardProps = {
  premio: PremioLoja;
  saldoPontos: number;
  favorito: boolean;
  noCarrinho: boolean;
  podeGerenciar: boolean;
  onFavoritar: (id: string) => void;
  onAdicionarCarrinho: (id: string) => void;
  onResgatar: (premio: PremioLoja) => void;
  onEditar: (premio: PremioLoja) => void;
};

function formatarPontos(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function normalizar(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function etiquetaPremio(premio: PremioLoja) {
  if (premio.estoque <= 0) return "Esgotado";
  if (premio.estoque <= 2) return "Últimas unidades";
  if (premio.destaque) return "Destaque";

  if (premio.criado_em) {
    const criado = new Date(premio.criado_em).getTime();
    const seteDias = 7 * 24 * 60 * 60 * 1000;

    if (Date.now() - criado <= seteDias) {
      return "Novo";
    }
  }

  return "";
}

export default function ProdutoCard({
  premio,
  saldoPontos,
  favorito,
  noCarrinho,
  podeGerenciar,
  onFavoritar,
  onAdicionarCarrinho,
  onResgatar,
  onEditar,
}: ProdutoCardProps) {
  const etiqueta = etiquetaPremio(premio);

  const pontosFaltantes = Math.max(
    Number(premio.pontos || 0) - saldoPontos,
    0
  );

  const podeResgatar =
    premio.ativo &&
    premio.estoque > 0 &&
    pontosFaltantes === 0;

  return (
    <article className="produto-card">
      <div className="produto-card-imagem">
        {etiqueta && (
          <span
            className={`produto-card-etiqueta ${normalizar(
              etiqueta
            ).replaceAll(" ", "-")}`}
          >
            {etiqueta}
          </span>
        )}

        {!podeGerenciar && (
          <button
            type="button"
            className={`produto-card-favorito ${
              favorito ? "marcado" : ""
            }`}
            onClick={() => onFavoritar(premio.id)}
            aria-label="Favoritar prêmio"
          >
            <Heart
              size={19}
              fill={favorito ? "currentColor" : "none"}
            />
          </button>
        )}

        <img
          src={premio.imagem_url || "/icon-eleva.png"}
          alt={premio.nome}
        />
      </div>

      <div className="produto-card-conteudo">
        <span className="produto-card-categoria">
          {premio.categoria}
        </span>

        <h3>{premio.nome}</h3>

        <p>{premio.descricao}</p>

        <div className="produto-card-preco">
          <strong>{formatarPontos(premio.pontos)} pts</strong>

          <span>
            {premio.estoque > 0
              ? `${premio.estoque} em estoque`
              : "Sem estoque"}
          </span>
        </div>

        {podeGerenciar ? (
          <div className="produto-card-admin">
            <button
              type="button"
              onClick={() => onEditar(premio)}
            >
              <Pencil size={16} />
              Editar
            </button>

            <span
              className={premio.ativo ? "ativo" : "inativo"}
            >
              {premio.ativo ? "Ativo" : "Inativo"}
            </span>
          </div>
        ) : (
          <div className="produto-card-acoes">
            <button
              type="button"
              className="secundario"
              disabled={!premio.ativo || premio.estoque <= 0}
              onClick={() => onAdicionarCarrinho(premio.id)}
            >
              <ShoppingCart size={16} />

              {noCarrinho ? "Ver carrinho" : "Adicionar"}
            </button>

            <button
              type="button"
              className="principal"
              disabled={!podeResgatar}
              onClick={() => onResgatar(premio)}
            >
              {premio.estoque <= 0
                ? "Esgotado"
                : pontosFaltantes > 0
                  ? `Faltam ${formatarPontos(
                      pontosFaltantes
                    )} pts`
                  : "Resgatar agora"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}