"use client";

import {
  BarChart3,
  Heart,
  Package,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import AdminLoja from "./AdminLoja";
import CarrinhoLoja from "./CarrinhoLoja";
import CatalogoLoja from "./CatalogoLoja";
import FavoritosLoja from "./FavoritosLoja";
import ModalPremio from "./ModalPremio";
import ResgatesLoja from "./ResgatesLoja";
import { useLojaPremios } from "./useLojaPremios";
import { podeGerenciarLoja } from "./permissoes";
import "./loja-v2.css";

type LojaPremiosV2Props = {
  saldoPontos: number;
  nomeUsuario: string;
  perfilUsuario: string;

  nomesConsultoras?: string[];
  consultoraSelecionada?: string;
  competencia?: string;
  saldoConsultora?: number;

  onConsultoraChange?: (nome: string) => void;
  onCompetenciaChange?: (competencia: string) => void;
  onPontosAtualizados?: () => void | Promise<void>;
};

function formatarPontos(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function LojaPremiosV2({
  saldoPontos,
  nomeUsuario,
  perfilUsuario,
  nomesConsultoras = [],
  consultoraSelecionada = "",
  competencia = "",
  saldoConsultora = 0,
  onConsultoraChange = () => undefined,
  onCompetenciaChange = () => undefined,
  onPontosAtualizados = () => undefined,
}: LojaPremiosV2Props) {
  const podeGerenciar = podeGerenciarLoja(perfilUsuario);

  const loja = useLojaPremios({
    saldoPontos,
    nomeUsuario,
    perfilUsuario,
    podeGerenciar,
  });

  return (
    <div className="loja-premios-v2">
      <section className="loja-premios-v2-navegacao">
        <div className="loja-premios-v2-abas">
          <button
            type="button"
            className={loja.aba === "catalogo" ? "ativo" : ""}
            onClick={() => loja.setAba("catalogo")}
          >
            <Sparkles size={17} />
            Catálogo
          </button>

          <button
            type="button"
            className={loja.aba === "favoritos" ? "ativo" : ""}
            onClick={() => loja.setAba("favoritos")}
          >
            <Heart size={17} />
            Favoritos

            {loja.favoritos.length > 0 && (
              <b>{loja.favoritos.length}</b>
            )}
          </button>

          <button
            type="button"
            className={loja.aba === "carrinho" ? "ativo" : ""}
            onClick={() => loja.setAba("carrinho")}
          >
            <ShoppingCart size={17} />
            Carrinho

            {loja.carrinho.length > 0 && (
              <b>{loja.carrinho.length}</b>
            )}
          </button>

          <button
            type="button"
            className={loja.aba === "resgates" ? "ativo" : ""}
            onClick={() => loja.setAba("resgates")}
          >
            <Package size={17} />
            {podeGerenciar
              ? "Pedidos"
              : "Meus resgates"}
          </button>

          {podeGerenciar && (
            <button
              type="button"
              className={loja.aba === "admin" ? "ativo" : ""}
              onClick={() => loja.setAba("admin")}
            >
              <BarChart3 size={17} />
              Administração
            </button>
          )}
        </div>

        <div className="loja-premios-v2-saldo">
          <span>Saldo disponível</span>
          <strong>{formatarPontos(saldoPontos)}</strong>
          <small>pontos</small>
        </div>
      </section>

      {loja.erro && (
        <div className="loja-premios-v2-alerta erro">
          {loja.erro}
        </div>
      )}

      {loja.mensagem && (
        <div className="loja-premios-v2-alerta sucesso">
          {loja.mensagem}
        </div>
      )}

      {loja.aba === "catalogo" && (
        <CatalogoLoja
          titulo="Escolha seu próximo prêmio"
          subtitulo="Transforme seus resultados em produtos e experiências especiais."
          saldoPontos={saldoPontos}
          premios={loja.premiosFiltrados}
          busca={loja.busca}
          categoria={loja.categoria}
          categorias={loja.categorias}
          favoritos={loja.favoritos}
          carrinho={loja.carrinho}
          podeGerenciar={podeGerenciar}
          carregando={loja.carregando}
          onBusca={loja.setBusca}
          onCategoria={loja.setCategoria}
          onNovoPremio={loja.abrirNovoPremio}
          onFavoritar={loja.alternarFavorito}
          onAdicionarCarrinho={loja.adicionarAoCarrinho}
          onResgatar={loja.resgatar}
          onEditar={loja.abrirEdicao}
        />
      )}

      {loja.aba === "favoritos" && (
        <FavoritosLoja
          saldoPontos={saldoPontos}
          premios={loja.premiosFavoritos}
          favoritos={loja.favoritos}
          carrinho={loja.carrinho}
          podeGerenciar={podeGerenciar}
          carregando={loja.carregando}
          onFavoritar={loja.alternarFavorito}
          onAdicionarCarrinho={loja.adicionarAoCarrinho}
          onResgatar={loja.resgatar}
          onEditar={loja.abrirEdicao}
        />
      )}

      {loja.aba === "carrinho" && (
        <CarrinhoLoja
          itens={loja.itensCarrinho}
          saldoPontos={saldoPontos}
          totalCarrinho={loja.totalCarrinho}
          onRemover={loja.removerDoCarrinho}
          onConfirmar={() => {
            void loja.confirmarCarrinho();
          }}
        />
      )}

      {loja.aba === "resgates" && (
        <ResgatesLoja
          pedidos={loja.pedidos}
          podeGerenciar={podeGerenciar}
          carregando={loja.carregando}
          onAtualizarStatus={(pedido, status) => {
            void loja.atualizarStatusPedido(
              pedido,
              status
            );
          }}
        />
      )}

      {loja.aba === "admin" && podeGerenciar && (
        <AdminLoja
          premios={loja.premios}
          pedidos={loja.pedidos}
          nomesConsultoras={nomesConsultoras}
          consultoraSelecionada={consultoraSelecionada}
          competencia={competencia}
          saldoConsultora={saldoConsultora}
          nomeUsuario={nomeUsuario}
          onConsultoraChange={onConsultoraChange}
          onCompetenciaChange={onCompetenciaChange}
          onPontosAtualizados={onPontosAtualizados}
          onNovoPremio={loja.abrirNovoPremio}
          onEditar={loja.abrirEdicao}
        />
      )}

      <ModalPremio
        aberto={loja.modalAberto}
        formulario={loja.formulario}
        salvando={loja.salvando}
        erro={loja.erro}
        mensagem={loja.mensagem}
        onChange={loja.setFormulario}
        onFechar={loja.fecharModal}
        onSalvar={(evento) => {
          void loja.salvarPremio(evento);
        }}
      />
    </div>
  );
}