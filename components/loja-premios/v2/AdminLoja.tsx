"use client";

import {
  BarChart3,
  Package,
  Pencil,
  Settings2,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import AjustePontosModal from "../AjustePontosModal";
import type { PedidoLoja, PremioLoja } from "./tipos";

type AdminLojaProps = {
  premios: PremioLoja[];
  pedidos: PedidoLoja[];

  nomesConsultoras: string[];
  consultoraSelecionada: string;
  competencia: string;
  saldoConsultora: number;
  nomeUsuario: string;

  onConsultoraChange: (nome: string) => void;
  onCompetenciaChange: (competencia: string) => void;
  onPontosAtualizados: () => void | Promise<void>;

  onNovoPremio: () => void;
  onEditar: (premio: PremioLoja) => void;
};

function formatarPontos(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function normalizar(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export default function AdminLoja({
  premios,
  pedidos,
  nomesConsultoras,
  consultoraSelecionada,
  competencia,
  saldoConsultora,
  nomeUsuario,
  onConsultoraChange,
  onCompetenciaChange,
  onPontosAtualizados,
  onNovoPremio,
  onEditar,
}: AdminLojaProps) {
  const [modalAjusteAberto, setModalAjusteAberto] =
    useState(false);

  const pedidosAguardando = pedidos.filter((pedido) =>
    ["solicitado", "aprovado"].includes(
      normalizar(pedido.status)
    )
  ).length;

  const estoqueBaixo = premios.filter(
    (premio) => premio.ativo && premio.estoque <= 2
  ).length;

  const pontosResgatados = pedidos
    .filter((pedido) =>
      ["aprovado", "em preparacao", "entregue"].includes(
        normalizar(pedido.status)
      )
    )
    .reduce(
      (total, pedido) =>
        total + Number(pedido.pontos_total || 0),
      0
    );

  return (
    <>
      <section className="admin-loja">
        <div className="admin-loja-topo">
          <div>
            <span>ADMINISTRAÇÃO DA LOJA</span>

            <h2>Visão geral</h2>

            <p>
              Acompanhe produtos, estoque, resgates e ajustes de
              pontuação.
            </p>
          </div>

          <button
            type="button"
            onClick={onNovoPremio}
          >
            + Cadastrar prêmio
          </button>
        </div>

        <div className="admin-loja-resumo">
          <article>
            <Package size={22} />

            <span>Produtos cadastrados</span>

            <strong>{premios.length}</strong>
          </article>

          <article>
            <ShoppingCart size={22} />

            <span>Pedidos aguardando</span>

            <strong>{pedidosAguardando}</strong>
          </article>

          <article>
            <BarChart3 size={22} />

            <span>Pontos resgatados</span>

            <strong>
              {formatarPontos(pontosResgatados)}
            </strong>
          </article>

          <article>
            <Package size={22} />

            <span>Estoque baixo</span>

            <strong>{estoqueBaixo}</strong>
          </article>
        </div>

        <div className="admin-loja-ajustes">
          <div className="admin-loja-ajustes-topo">
            <div>
              <span>CONTROLE DE PONTUAÇÃO</span>
              <h3>Ajustes manuais</h3>
              <p>
                Corrija pontos lançados incorretamente sem alterar
                propostas ou contratos.
              </p>
            </div>

            <Settings2 size={24} />
          </div>

          <div className="admin-loja-ajustes-grid">
            <label>
              Consultora

              <select
                value={consultoraSelecionada}
                onChange={(evento) =>
                  onConsultoraChange(evento.target.value)
                }
              >
                {nomesConsultoras.length === 0 ? (
                  <option value="">
                    Nenhuma consultora disponível
                  </option>
                ) : (
                  nomesConsultoras.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label>
              Competência

              <input
                type="month"
                value={competencia}
                onChange={(evento) =>
                  onCompetenciaChange(evento.target.value)
                }
              />
            </label>

            <div className="admin-loja-ajustes-saldo">
              <span>Saldo atual</span>
              <strong>
                {formatarPontos(saldoConsultora)} pontos
              </strong>
            </div>

            <button
              type="button"
              className="admin-loja-botao-ajuste"
              disabled={!consultoraSelecionada || !competencia}
              onClick={() => setModalAjusteAberto(true)}
            >
              <Settings2 size={18} />
              Ajustar pontos
            </button>
          </div>
        </div>

        <div className="admin-loja-produtos">
          <div className="admin-loja-produtos-topo">
            <div>
              <span>CONTROLE RÁPIDO</span>

              <h3>Produtos e estoque</h3>
            </div>

            <strong>{premios.length} produto(s)</strong>
          </div>

          {premios.length === 0 ? (
            <div className="admin-loja-vazio">
              Nenhum produto cadastrado.
            </div>
          ) : (
            <div className="admin-loja-lista">
              {premios.map((premio) => (
                <article key={premio.id}>
                  <div className="admin-loja-imagem">
                    <img
                      src={
                        premio.imagem_url ||
                        "/icon-eleva.png"
                      }
                      alt={premio.nome}
                    />
                  </div>

                  <div className="admin-loja-dados">
                    <strong>{premio.nome}</strong>

                    <span>{premio.categoria}</span>

                    <small>
                      {formatarPontos(premio.pontos)} pts
                    </small>
                  </div>

                  <div className="admin-loja-estoque">
                    <strong>{premio.estoque}</strong>
                    <span>unidade(s)</span>
                  </div>

                  <span
                    className={`admin-loja-status ${
                      premio.ativo ? "ativo" : "inativo"
                    }`}
                  >
                    {premio.ativo ? "Ativo" : "Inativo"}
                  </span>

                  <button
                    type="button"
                    onClick={() => onEditar(premio)}
                  >
                    <Pencil size={16} />
                    Editar
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <AjustePontosModal
        aberto={modalAjusteAberto}
        consultora={consultoraSelecionada}
        competencia={competencia}
        saldoAtual={saldoConsultora}
        criadoPor={nomeUsuario}
        onFechar={() => setModalAjusteAberto(false)}
        onAtualizado={async () => {
          await onPontosAtualizados();
        }}
      />
    </>
  );
}