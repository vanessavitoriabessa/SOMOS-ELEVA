"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./dashboard-financeiro.css";

type Proposta = {
  id: string;
  banco?: string;
  tabela?: string;
  valorContrato?: number;
  valorMeta?: number;
  comissao?: number;
  status?: string;
  dataPagamento?: string;
};

type BaixaPagamento = {
  id: string;
  banco?: string;
  tabela?: string;
  valor_operacao?: number;
  valor_liquido?: number;
  comissao_prevista?: number;
  valor_recebido?: number;
  diferenca?: number;
  data_pagamento_proposta?: string;
  data_prevista_recebimento?: string;
  data_recebimento?: string | null;
  status?: string;
};

type LancamentoLocal = {
  id?: string;
  tipo?: "Entrada" | "Saída";
  valor?: number;
};

type FolhaLocal = {
  id?: string;
  total?: number;
  assiduidadeAtiva?: boolean;
  valorAssiduidade?: number;
};

type ResumoBanco = {
  banco: string;
  previsto: number;
  recebido: number;
  diferenca: number;
  aguardando: number;
};

type ResumoMes = {
  chave: string;
  titulo: string;
  previsto: number;
  recebido: number;
};

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizar(valor?: string | null) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function inicioDoDia(data = new Date()) {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function dataSegura(valor?: string | null) {
  if (!valor) return null;

  const data = new Date(
    `${String(valor).slice(0, 10)}T00:00:00`
  );

  return Number.isNaN(data.getTime())
    ? null
    : data;
}

function tituloMes(data: Date) {
  return data
    .toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    })
    .replace(".", "")
    .toUpperCase();
}

function statusAtual(item: BaixaPagamento) {
  if (item.data_recebimento) {
    const diferenca = Number(
      item.diferenca || 0
    );

    if (Math.abs(diferenca) < 0.01) {
      return "VALOR RECEBIDO";
    }

    return diferenca > 0
      ? "RECEBEU A MAIS"
      : "RECEBEU A MENOS";
  }

  const prevista = dataSegura(
    item.data_prevista_recebimento
  );

  if (
    prevista &&
    prevista < inicioDoDia()
  ) {
    return "COMISSÃO ATRASADA";
  }

  return "AGUARDANDO RECEBIMENTO";
}

function lerListaLocal<T>(chave: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const conteudo = JSON.parse(
      localStorage.getItem(chave) || "[]"
    );

    return Array.isArray(conteudo)
      ? (conteudo as T[])
      : [];
  } catch {
    return [];
  }
}

export default function FinancialDashboard() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [propostas, setPropostas] =
    useState<Proposta[]>([]);

  const [baixas, setBaixas] =
    useState<BaixaPagamento[]>([]);

  const [lancamentos, setLancamentos] =
    useState<LancamentoLocal[]>([]);

  const [folhas, setFolhas] =
    useState<FolhaLocal[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [mensagem, setMensagem] =
    useState("");

  const [ultimaAtualizacao, setUltimaAtualizacao] =
    useState("");

  const carregarDadosLocais =
    useCallback(() => {
      setLancamentos(
        lerListaLocal<LancamentoLocal>(
          "somos-eleva-financeiro"
        )
      );

      setFolhas(
        lerListaLocal<FolhaLocal>(
          "somos-eleva-folha"
        )
      );
    }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setMensagem("");

    try {
      carregarDadosLocais();

      const {
        data: sessao,
        error: erroSessao,
      } =
        await supabase.auth.getSession();

      if (
        erroSessao ||
        !sessao.session?.access_token
      ) {
        throw new Error(
          "Sua sessão expirou. Entre novamente no sistema."
        );
      }

      const [
        respostaPropostas,
        respostaBaixas,
      ] = await Promise.all([
        fetch("/api/propostas", {
          headers: {
            Authorization:
              `Bearer ${sessao.session.access_token}`,
          },
          cache: "no-store",
        }),
        supabase
          .from("baixas_pagamentos")
          .select("*")
          .order(
            "data_prevista_recebimento",
            { ascending: false }
          ),
      ]);

      const conteudoPropostas =
        (await respostaPropostas.json()) as {
          propostas?: Proposta[];
          erro?: string;
        };

      if (!respostaPropostas.ok) {
        throw new Error(
          conteudoPropostas.erro ||
            "Não foi possível carregar as propostas."
        );
      }

      if (respostaBaixas.error) {
        throw new Error(
          respostaBaixas.error.message
        );
      }

      setPropostas(
        Array.isArray(
          conteudoPropostas.propostas
        )
          ? conteudoPropostas.propostas
          : []
      );

      setBaixas(
        Array.isArray(
          respostaBaixas.data
        )
          ? (
              respostaBaixas.data as
                BaixaPagamento[]
            )
          : []
      );

      setUltimaAtualizacao(
        new Date().toLocaleTimeString(
          "pt-BR",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        )
      );
    } catch (erro) {
      console.error(erro);

      setPropostas([]);
      setBaixas([]);

      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar o dashboard financeiro."
      );
    } finally {
      setCarregando(false);
    }
  }, [
    carregarDadosLocais,
    supabase,
  ]);

  useEffect(() => {
    void carregar();

    const atualizar = () => {
      carregarDadosLocais();
      void carregar();
    };

    const atualizarStorage = () => {
      carregarDadosLocais();
    };

    window.addEventListener(
      "focus",
      atualizar
    );

    window.addEventListener(
      "storage",
      atualizarStorage
    );

    return () => {
      window.removeEventListener(
        "focus",
        atualizar
      );

      window.removeEventListener(
        "storage",
        atualizarStorage
      );
    };
  }, [
    carregar,
    carregarDadosLocais,
  ]);

  const propostasPagas = useMemo(
    () =>
      propostas.filter(
        (item) =>
          normalizar(item.status) ===
            "pago" &&
          Boolean(item.dataPagamento)
      ),
    [propostas]
  );

  const indicadores = useMemo(() => {
    const producaoBruta =
      propostasPagas.reduce(
        (total, item) =>
          total +
          Number(
            item.valorContrato || 0
          ),
        0
      );

    const valorLiquido =
      propostasPagas.reduce(
        (total, item) =>
          total +
          Number(item.valorMeta || 0),
        0
      );

    const comissaoPrevista =
      baixas.reduce(
        (total, item) =>
          total +
          Number(
            item.comissao_prevista || 0
          ),
        0
      );

    const comissaoRecebida =
      baixas.reduce(
        (total, item) =>
          total +
          Number(
            item.valor_recebido || 0
          ),
        0
      );

    const aReceber = baixas
      .filter(
        (item) =>
          !item.data_recebimento
      )
      .reduce(
        (total, item) =>
          total +
          Number(
            item.comissao_prevista || 0
          ),
        0
      );

    const emAtraso = baixas
      .filter(
        (item) =>
          statusAtual(item) ===
          "COMISSÃO ATRASADA"
      )
      .reduce(
        (total, item) =>
          total +
          Number(
            item.comissao_prevista || 0
          ),
        0
      );

    const recebeuAMais = baixas
      .filter(
        (item) =>
          Number(
            item.diferenca || 0
          ) > 0
      )
      .reduce(
        (total, item) =>
          total +
          Number(item.diferenca || 0),
        0
      );

    const recebeuAMenos = baixas
      .filter(
        (item) =>
          Number(
            item.diferenca || 0
          ) < 0
      )
      .reduce(
        (total, item) =>
          total +
          Math.abs(
            Number(
              item.diferenca || 0
            )
          ),
        0
      );

    return {
      producaoBruta,
      valorLiquido,
      comissaoPrevista,
      comissaoRecebida,
      aReceber,
      emAtraso,
      recebeuAMais,
      recebeuAMenos,
      diferencaTotal:
        recebeuAMais -
        recebeuAMenos,
      percentualRecebido:
        comissaoPrevista > 0
          ? (
              comissaoRecebida /
              comissaoPrevista
            ) * 100
          : 0,
    };
  }, [
    propostasPagas,
    baixas,
  ]);

  const fluxo = useMemo(() => {
    const entradas = lancamentos
      .filter(
        (item) =>
          item.tipo === "Entrada"
      )
      .reduce(
        (total, item) =>
          total +
          Number(item.valor || 0),
        0
      );

    const saidas = lancamentos
      .filter(
        (item) =>
          item.tipo === "Saída"
      )
      .reduce(
        (total, item) =>
          total +
          Number(item.valor || 0),
        0
      );

    const folhaPrevista =
      folhas.reduce(
        (total, item) =>
          total +
          Number(item.total || 0),
        0
      );

    const assiduidade =
      folhas
        .filter(
          (item) =>
            item.assiduidadeAtiva
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.valorAssiduidade ||
                0
            ),
          0
        );

    const premiacoes =
      propostasPagas.reduce(
        (total, item) =>
          total +
          Number(
            item.comissao || 0
          ),
        0
      );

    return {
      entradas,
      saidas,
      premiacoes,
      folhaPrevista,
      assiduidade,
      saldo: entradas - saidas,
    };
  }, [
    lancamentos,
    folhas,
    propostasPagas,
  ]);

  const porBanco =
    useMemo<ResumoBanco[]>(() => {
      const mapa =
        new Map<
          string,
          ResumoBanco
        >();

      for (const item of baixas) {
        const banco = String(
          item.banco ||
            "Não informado"
        ).trim();

        const atual =
          mapa.get(banco) || {
            banco,
            previsto: 0,
            recebido: 0,
            diferenca: 0,
            aguardando: 0,
          };

        atual.previsto += Number(
          item.comissao_prevista || 0
        );

        atual.recebido += Number(
          item.valor_recebido || 0
        );

        atual.diferenca += Number(
          item.diferenca || 0
        );

        if (!item.data_recebimento) {
          atual.aguardando += 1;
        }

        mapa.set(
          banco,
          atual
        );
      }

      return [
        ...mapa.values(),
      ].sort(
        (a, b) =>
          b.previsto - a.previsto
      );
    }, [baixas]);

  const porMes =
    useMemo<ResumoMes[]>(() => {
      const agora = new Date();
      const meses: ResumoMes[] = [];

      for (
        let indice = 5;
        indice >= 0;
        indice -= 1
      ) {
        const referencia =
          new Date(
            agora.getFullYear(),
            agora.getMonth() -
              indice,
            1
          );

        const ano =
          referencia.getFullYear();

        const mes =
          referencia.getMonth();

        const itens =
          baixas.filter(
            (item) => {
              const data =
                dataSegura(
                  item.data_prevista_recebimento
                ) ||
                dataSegura(
                  item.data_pagamento_proposta
                );

              return Boolean(
                data &&
                  data.getFullYear() ===
                    ano &&
                  data.getMonth() ===
                    mes
              );
            }
          );

        meses.push({
          chave:
            `${ano}-${String(
              mes + 1
            ).padStart(2, "0")}`,
          titulo:
            tituloMes(referencia),
          previsto:
            itens.reduce(
              (total, item) =>
                total +
                Number(
                  item.comissao_prevista ||
                    0
                ),
              0
            ),
          recebido:
            itens.reduce(
              (total, item) =>
                total +
                Number(
                  item.valor_recebido ||
                    0
                ),
              0
            ),
        });
      }

      return meses;
    }, [baixas]);

  const maiorValorMes =
    useMemo(
      () =>
        Math.max(
          1,
          ...porMes.flatMap(
            (item) => [
              item.previsto,
              item.recebido,
            ]
          )
        ),
      [porMes]
    );

  const totalPrevistoMes =
    porMes.reduce(
      (total, item) =>
        total + item.previsto,
      0
    );

  const totalRecebidoMes =
    porMes.reduce(
      (total, item) =>
        total + item.recebido,
      0
    );

  const percentualGrafico =
    totalPrevistoMes > 0
      ? (
          totalRecebidoMes /
          totalPrevistoMes
        ) * 100
      : 0;

  return (
    <div className="financial-dashboard financial-dashboard-pro">
      <div className="financial-dashboard-heading">
        <div>
          <span>
            CENTRO FINANCEIRO
          </span>

          <h2>
            Visão geral da operação
          </h2>

          <p>
            Produção, comissões bancárias,
            divergências e recebimentos em
            uma visão executiva.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void carregar()
          }
          disabled={carregando}
        >
          {carregando
            ? "Atualizando..."
            : "Atualizar dados ↻"}
        </button>
      </div>

      {mensagem && (
        <div className="financial-dashboard-message">
          {mensagem}
        </div>
      )}

      <section className="financial-primary-cards">
        <article>
          <div className="financial-icon financial-icon-blue">
            ▥
          </div>

          <div>
            <span>
              Produção bruta
            </span>

            <strong>
              {moeda(
                indicadores.producaoBruta
              )}
            </strong>

            <small>
              Contratos pagos
            </small>
          </div>
        </article>

        <article>
          <div className="financial-icon financial-icon-blue">
            ▤
          </div>

          <div>
            <span>
              Valor líquido
            </span>

            <strong>
              {moeda(
                indicadores.valorLiquido
              )}
            </strong>

            <small>
              Base líquida das propostas
            </small>
          </div>
        </article>

        <article>
          <div className="financial-icon financial-icon-blue">
            %
          </div>

          <div>
            <span>
              Comissão prevista
            </span>

            <strong>
              {moeda(
                indicadores.comissaoPrevista
              )}
            </strong>

            <small>
              Valor calculado pelos bancos
            </small>
          </div>
        </article>
      </section>

      <section className="financial-secondary-cards">
        <article className="financial-kpi received">
          <div className="financial-icon financial-icon-green">
            ↓
          </div>

          <div>
            <span>
              Comissão recebida
            </span>

            <strong>
              {moeda(
                indicadores.comissaoRecebida
              )}
            </strong>

            <small>
              {indicadores.percentualRecebido
                .toFixed(1)
                .replace(".", ",")}
              % do previsto
            </small>

            <div className="financial-mini-progress">
              <i
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      indicadores.percentualRecebido
                    )
                  )}%`,
                }}
              />
            </div>
          </div>
        </article>

        <article className="financial-kpi">
          <div className="financial-icon financial-icon-blue">
            ◉
          </div>

          <div>
            <span>
              A receber
            </span>

            <strong>
              {moeda(
                indicadores.aReceber
              )}
            </strong>

            <small>
              Comissões ainda pendentes
            </small>
          </div>
        </article>

        <article className="financial-kpi delayed">
          <div className="financial-icon financial-icon-red">
            ◷
          </div>

          <div>
            <span>
              Em atraso
            </span>

            <strong>
              {moeda(
                indicadores.emAtraso
              )}
            </strong>

            <small>
              Previsão vencida sem baixa
            </small>
          </div>
        </article>

        <article className="financial-kpi positive">
          <div className="financial-icon financial-icon-green">
            ↑
          </div>

          <div>
            <span>
              Recebeu a mais
            </span>

            <strong>
              {moeda(
                indicadores.recebeuAMais
              )}
            </strong>

            <small>
              Divergências positivas
            </small>
          </div>
        </article>

        <article className="financial-kpi warning">
          <div className="financial-icon financial-icon-orange">
            ↓
          </div>

          <div>
            <span>
              Recebeu a menos
            </span>

            <strong>
              {moeda(
                indicadores.recebeuAMenos
              )}
            </strong>

            <small>
              Divergências negativas
            </small>
          </div>
        </article>

        <article
          className={`financial-kpi ${
            indicadores.diferencaTotal < 0
              ? "difference-negative"
              : "difference-positive"
          }`}
        >
          <div className="financial-icon financial-icon-red">
            −
          </div>

          <div>
            <span>
              Diferença total
            </span>

            <strong>
              {moeda(
                indicadores.diferencaTotal
              )}
            </strong>

            <small>
              Mais recebido − faltante
            </small>
          </div>
        </article>
      </section>

      <section className="financial-dashboard-main-grid">
        <article className="financial-dashboard-panel financial-chart-panel">
          <div className="financial-dashboard-panel-title">
            <div>
              <span>
                EVOLUÇÃO MENSAL
              </span>

              <h3>
                Previsto x recebido
              </h3>
            </div>

            <b>
              Últimos 6 meses
            </b>
          </div>

          <div className="financial-chart">
            {porMes.map(
              (item) => (
                <div
                  className="financial-chart-item"
                  key={item.chave}
                >
                  <div className="financial-chart-bars">
                    <div
                      className="financial-chart-bar previsto"
                      style={{
                        height: `${Math.max(
                          4,
                          (
                            item.previsto /
                            maiorValorMes
                          ) * 160
                        )}px`,
                      }}
                      title={`Previsto: ${moeda(
                        item.previsto
                      )}`}
                    />

                    <div
                      className="financial-chart-bar recebido"
                      style={{
                        height: `${Math.max(
                          4,
                          (
                            item.recebido /
                            maiorValorMes
                          ) * 160
                        )}px`,
                      }}
                      title={`Recebido: ${moeda(
                        item.recebido
                      )}`}
                    />
                  </div>

                  <strong>
                    {item.titulo}
                  </strong>
                </div>
              )
            )}
          </div>

          <div className="financial-chart-legend">
            <span>
              <i className="previsto" />
              Previsto
            </span>

            <span>
              <i className="recebido" />
              Recebido
            </span>
          </div>

          <div className="financial-chart-summary">
            <div>
              <span>
                Total previsto
              </span>

              <strong>
                {moeda(
                  totalPrevistoMes
                )}
              </strong>
            </div>

            <div>
              <span>
                Total recebido
              </span>

              <strong>
                {moeda(
                  totalRecebidoMes
                )}
              </strong>
            </div>

            <div>
              <span>
                Recebimento (%)
              </span>

              <strong>
                {percentualGrafico
                  .toFixed(1)
                  .replace(".", ",")}
                %
              </strong>
            </div>
          </div>
        </article>

        <article className="financial-dashboard-panel financial-bank-panel">
          <div className="financial-dashboard-panel-title">
            <div>
              <span>
                RESUMO POR BANCO
              </span>

              <h3>
                Conciliação bancária
              </h3>
            </div>
          </div>

          <div className="financial-bank-table">
            <div className="financial-bank-row financial-bank-head">
              <span>Banco</span>
              <span>Previsto</span>
              <span>Recebido</span>
              <span>Diferença</span>
              <span>Pendentes</span>
            </div>

            {porBanco.length === 0 ? (
              <div className="financial-dashboard-empty">
                Nenhum banco com comissão registrada.
              </div>
            ) : (
              porBanco.map(
                (item) => (
                  <div
                    className="financial-bank-row"
                    key={item.banco}
                  >
                    <strong>
                      {item.banco}
                    </strong>

                    <span>
                      {moeda(
                        item.previsto
                      )}
                    </span>

                    <span>
                      {moeda(
                        item.recebido
                      )}
                    </span>

                    <span
                      className={
                        item.diferenca < 0
                          ? "negative-text"
                          : item.diferenca > 0
                            ? "positive-text"
                            : ""
                      }
                    >
                      {moeda(
                        item.diferenca
                      )}
                    </span>

                    <strong>
                      {item.aguardando}
                    </strong>
                  </div>
                )
              )
            )}
          </div>

          <div className="financial-panel-footer">
            Ver detalhes por banco
            <span>›</span>
          </div>
        </article>

        <article className="financial-dashboard-panel financial-flow-panel">
          <div className="financial-dashboard-panel-title">
            <div>
              <span>
                FLUXO FINANCEIRO
              </span>

              <h3>
                Visão do saldo
              </h3>
            </div>
          </div>

          <div className="financial-flow-list">
            <div>
              <i className="flow-icon income">
                ↓
              </i>

              <span>
                <strong>
                  Entradas
                </strong>

                <small>
                  Lançamentos manuais
                </small>
              </span>

              <b className="positive-text">
                {moeda(
                  fluxo.entradas
                )}
              </b>
            </div>

            <div>
              <i className="flow-icon expense">
                ↓
              </i>

              <span>
                <strong>
                  Saídas
                </strong>

                <small>
                  Lançamentos manuais
                </small>
              </span>

              <b className="negative-text">
                {moeda(
                  fluxo.saidas
                )}
              </b>
            </div>

            <div>
              <i className="flow-icon neutral">
                ▣
              </i>

              <span>
                <strong>
                  Premiações calculadas
                </strong>

                <small>
                  Comissões registradas nas propostas
                </small>
              </span>

              <b>
                {moeda(
                  fluxo.premiacoes
                )}
              </b>
            </div>

            <div>
              <i className="flow-icon payroll">
                ▦
              </i>

              <span>
                <strong>
                  Folha prevista
                </strong>

                <small>
                  Salários e benefícios
                </small>
              </span>

              <b>
                {moeda(
                  fluxo.folhaPrevista
                )}
              </b>
            </div>

            <div>
              <i className="flow-icon attendance">
                ♙
              </i>

              <span>
                <strong>
                  Assiduidade
                </strong>

                <small>
                  Prêmios selecionados
                </small>
              </span>

              <b>
                {moeda(
                  fluxo.assiduidade
                )}
              </b>
            </div>
          </div>

          <div className="financial-balance-box">
            <div>
              <strong>
                SALDO
              </strong>

              <span>
                Entradas − saídas
              </span>
            </div>

            <b
              className={
                fluxo.saldo < 0
                  ? "negative-text"
                  : ""
              }
            >
              {moeda(
                fluxo.saldo
              )}
            </b>
          </div>
        </article>
      </section>

      <footer className="financial-dashboard-footer">
        <span>
          ⓘ Os valores são atualizados conforme
          baixas dos bancos e lançamentos manuais
          realizados.
        </span>

        <span>
          Última atualização:
          {" "}
          {ultimaAtualizacao
            ? `às ${ultimaAtualizacao}`
            : "agora"}
          {" "}
          ↻
        </span>
      </footer>
    </div>
  );
}