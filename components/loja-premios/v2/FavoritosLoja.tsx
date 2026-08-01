"use client";

import CatalogoLoja from "./CatalogoLoja";
import type { PremioLoja } from "./tipos";

type FavoritosLojaProps = {
  saldoPontos: number;
  premios: PremioLoja[];
  favoritos: string[];
  carrinho: string[];
  podeGerenciar: boolean;
  carregando: boolean;
  onFavoritar: (id: string) => void;
  onAdicionarCarrinho: (id: string) => void;
  onResgatar: (premio: PremioLoja) => void;
  onEditar: (premio: PremioLoja) => void;
};

export default function FavoritosLoja({
  saldoPontos,
  premios,
  favoritos,
  carrinho,
  podeGerenciar,
  carregando,
  onFavoritar,
  onAdicionarCarrinho,
  onResgatar,
  onEditar,
}: FavoritosLojaProps) {
  return (
    <CatalogoLoja
      titulo="Seus prêmios favoritos"
      subtitulo="Acompanhe os produtos que você marcou para resgatar depois."
      saldoPontos={saldoPontos}
      premios={premios}
      busca=""
      categoria="Todos"
      categorias={["Todos"]}
      favoritos={favoritos}
      carrinho={carrinho}
      podeGerenciar={podeGerenciar}
      carregando={carregando}
      onBusca={() => undefined}
      onCategoria={() => undefined}
      onNovoPremio={() => undefined}
      onFavoritar={onFavoritar}
      onAdicionarCarrinho={onAdicionarCarrinho}
      onResgatar={onResgatar}
      onEditar={onEditar}
    />
  );
}