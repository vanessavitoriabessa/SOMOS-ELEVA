"use client";

import ProdutoCard from "./ProdutoCard";
import type { PremioLoja } from "./tipos";

type CatalogoLojaProps = {
  titulo: string;
  subtitulo: string;
  saldoPontos: number;
  premios: PremioLoja[];
  busca: string;
  categoria: string;
  categorias: string[];
  favoritos: string[];
  carrinho: string[];
  podeGerenciar: boolean;
  carregando: boolean;
  onBusca: (valor: string) => void;
  onCategoria: (valor: string) => void;
  onNovoPremio: () => void;
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

export default function CatalogoLoja({
  titulo,
  subtitulo,
  saldoPontos,
  premios,
  busca,
  categoria,
  categorias,
  favoritos,
  carrinho,
  podeGerenciar,
  carregando,
  onBusca,
  onCategoria,
  onNovoPremio,
  onFavoritar,
  onAdicionarCarrinho,
  onResgatar,
  onEditar,
}: CatalogoLojaProps) {
  return (
    <div className="catalogo-loja">
      <section className="catalogo-loja-hero">
        <div>
          <span>LOJA DE PRÊMIOS ELEVA</span>
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </div>

        <div className="catalogo-loja-saldo">
          <small>Saldo disponível</small>
          <strong>{formatarPontos(saldoPontos)}</strong>
          <span>pontos</span>
        </div>
      </section>

      <section className="catalogo-loja-toolbar">
        <input
          value={busca}
          onChange={(evento) => onBusca(evento.target.value)}
          placeholder="Buscar prêmio..."
        />

        <div className="catalogo-loja-categorias">
          {categorias.map((item) => (
            <button
              type="button"
              key={item}
              className={categoria === item ? "ativo" : ""}
              onClick={() => onCategoria(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {podeGerenciar && (
          <button
            type="button"
            className="catalogo-loja-novo"
            onClick={onNovoPremio}
          >
            + Novo prêmio
          </button>
        )}
      </section>

      {carregando ? (
        <div className="catalogo-loja-vazio">
          Carregando prêmios...
        </div>
      ) : premios.length === 0 ? (
        <div className="catalogo-loja-vazio">
          Nenhum prêmio encontrado.
        </div>
      ) : (
        <section className="catalogo-loja-grid">
          {premios.map((premio) => (
            <ProdutoCard
              key={premio.id}
              premio={premio}
              saldoPontos={saldoPontos}
              favorito={favoritos.includes(premio.id)}
              noCarrinho={carrinho.includes(premio.id)}
              podeGerenciar={podeGerenciar}
              onFavoritar={onFavoritar}
              onAdicionarCarrinho={onAdicionarCarrinho}
              onResgatar={onResgatar}
              onEditar={onEditar}
            />
          ))}
        </section>
      )}
    </div>
  );
}