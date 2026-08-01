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

type ResumoBanco = {
  banco: string;
  previsto: number;
  recebido: number;
  diferenca: number;
  aguardando: number;
};

type ResumoSemana = {
  chave: string;
  titulo: string;
  previsto: number;
  recebido: number;
  diferenca: number;
  quantidade: number;
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
  const data = new Date(`${String(valor).slice(0, 10)}T00:00:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

function inicioDaSemana(data: Date) {
  const copia = inicioDoDia(data);
  const dia = copia.getDay();
  const ajuste = dia === 0 ? -6 : 1 - dia;
  copia.setDate(copia.getDate() + ajuste);
  return copia;
}

function fimDaSemana(data: Date) {
  const inicio = inicioDaSemana(data);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 6);
  return fim;
}

function chaveData(data: Date) {
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}

function tituloSemana(data: Date) {
  const inicio = inicioDaSemana(data);
  const fim = fimDaSemana(data);

  return `${inicio.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })} a ${fim.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })}`;
}

function tituloMes(data: Date) {
  return data.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

function statusAtual(item: BaixaPagamento) {
  if (item.data_recebimento) {
    const diferenca = Number(item.diferenca || 0);
    if (Math.abs(diferenca) < 0.01) return "VALOR RECEBIDO";
    return diferenca > 0 ? "RECEBEU A MAIS" : "RECEBEU A MENOS";
  }

  const prevista = dataSegura(item.data_prevista_recebimento);
  if (prevista && prevista < inicioDoDia()) return "COMISSÃO ATRASADA";
  return "AGUARDANDO RECEBIMENTO";
}

export default function FinancialDashboard() {
  const supabase = useMemo(() => createClient(), []);

  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [baixas, setBaixas] = useState<BaixaPagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setMensagem("");

    try {
      const { data: sessao, error: erroSessao } =
        await supabase.auth.getSession();

      if (erroSessao || !sessao.session?.access_token) {
        throw new Error("Sua sessão expirou. Entre novamente no sistema.");
      }

      const [respostaPropostas, respostaBaixas] = await Promise.all([
        fetch("/api/propostas", {
          headers: {
            Authorization: `Bearer ${sessao.session.access_token}`,
          },
          cache: "no-store",
        }),
        supabase
          .from("baixas_pagamentos")
          .select("*")
          .order("data_prevista_recebimento", { ascending: false }),
      ]);

      const conteudoPropostas = (await respostaPropostas.json()) as {
        propostas?: Proposta[];
        erro?: string;
      };

      if (!respostaPropostas.ok) {
        throw new Error(
          conteudoPropostas.erro ||
            "Não foi possível carregar as propostas.",
        );
      }

      if (respostaBaixas.error) {
        throw new Error(respostaBaixas.error.message);
      }

      setPropostas(
        Array.isArray(conteudoPropostas.propostas)
          ? conteudoPropostas.propostas
          : [],
      );

      setBaixas(
        Array.isArray(respostaBaixas.data)
          ? (respostaBaixas.data as BaixaPagamento[])
          : [],
      );
    } catch (erro) {
      console.error(erro);
      setPropostas([]);
      setBaixas([]);
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar o dashboard financeiro.",
      );
    } finally {
      setCarregando(false);
    }
  }, [supabase]);

  useEffect(() => {
    void carregar();

    const atualizar = () => void carregar();
    window.addEventListener("focus", atualizar);
    document.addEventListener("visibilitychange", atualizar);

    return () => {
      window.removeEventListener("focus", atualizar);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [carregar]);

  const propostasPagas = useMemo(
    () =>
      propostas.filter(
        (item) =>
          normalizar(item.status) === "pago" &&
          Boolean(item.dataPagamento),
      ),
    [propostas],
  );

  const indicadores = useMemo(() => {
    const producaoBruta = propostasPagas.reduce(
      (total, item) => total + Number(item.valorContrato || 0),
      0,
    );

    const valorLiquido = propostasPagas.reduce(
      (total, item) => total + Number(item.valorMeta || 0),
      0,
    );

    const comissaoPrevista = baixas.reduce(
      (total, item) => total + Number(item.comissao_prevista || 0),
      0,
    );

    const comissaoRecebida = baixas.reduce(
      (total, item) => total + Number(item.valor_recebido || 0),
      0,
    );

    const aReceber = baixas
      .filter((item) => !item.data_recebimento)
      .reduce(
        (total, item) => total + Number(item.comissao_prevista || 0),
        0,
      );

    const emAtraso = baixas
      .filter((item) => statusAtual(item) === "COMISSÃO ATRASADA")
      .reduce(
        (total, item) => total + Number(item.comissao_prevista || 0),
        0,
      );

    const recebeuAMais = baixas
      .filter((item) => Number(item.diferenca || 0) > 0)
      .reduce(
        (total, item) => total + Number(item.diferenca || 0),
        0,
      );

    const recebeuAMenos = baixas
      .filter((item) => Number(item.diferenca || 0) < 0)
      .reduce(
        (total, item) => total + Math.abs(Number(item.diferenca || 0)),
        0,
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
      diferencaTotal: recebeuAMais - recebeuAMenos,
      percentualRecebido:
        comissaoPrevista > 0
          ? (comissaoRecebida / comissaoPrevista) * 100
          : 0,
    };
  }, [propostasPagas, baixas]);

  const porBanco = useMemo<ResumoBanco[]>(() => {
    const mapa = new Map<string, ResumoBanco>();

    for (const item of baixas) {
      const banco = String(item.banco || "Não informado").trim();
      const atual =
        mapa.get(banco) ||
        {
          banco,
          previsto: 0,
          recebido: 0,
          diferenca: 0,
          aguardando: 0,
        };

      atual.previsto += Number(item.comissao_prevista || 0);
      atual.recebido += Number(item.valor_recebido || 0);
      atual.diferenca += Number(item.diferenca || 0);

      if (!item.data_recebimento) atual.aguardando += 1;

      mapa.set(banco, atual);
    }

    return [...mapa.values()].sort(
      (a, b) => b.previsto - a.previsto,
    );
  }, [baixas]);

  const porSemana = useMemo<ResumoSemana[]>(() => {
    const agora = new Date();
    const semanas: ResumoSemana[] = [];

    for (let indice = 5; indice >= 0; indice -= 1) {
      const referencia = new Date(agora);
      referencia.setDate(referencia.getDate() - indice * 7);

      const inicio = inicioDaSemana(referencia);
      const fim = fimDaSemana(referencia);
      const chave = chaveData(inicio);

      const itens = baixas.filter((item) => {
        const data =
          dataSegura(item.data_prevista_recebimento) ||
          dataSegura(item.data_pagamento_proposta);

        return Boolean(data && data >= inicio && data <= fim);
      });

      semanas.push({
        chave,
        titulo: tituloSemana(referencia),
        previsto: itens.reduce(
          (total, item) =>
            total + Number(item.comissao_prevista || 0),
          0,
        ),
        recebido: itens.reduce(
          (total, item) => total + Number(item.valor_recebido || 0),
          0,
        ),
        diferenca: itens.reduce(
          (total, item) => total + Number(item.diferenca || 0),
          0,
        ),
        quantidade: itens.length,
      });
    }

    return semanas;
  }, [baixas]);

  const porMes = useMemo<ResumoMes[]>(() => {
    const agora = new Date();
    const meses: ResumoMes[] = [];

    for (let indice = 5; indice >= 0; indice -= 1) {
      const referencia = new Date(
        agora.getFullYear(),
        agora.getMonth() - indice,
        1,
      );

      const ano = referencia.getFullYear();
      const mes = referencia.getMonth();

      const itens = baixas.filter((item) => {
        const data =
          dataSegura(item.data_prevista_recebimento) ||
          dataSegura(item.data_pagamento_proposta);

        return Boolean(
          data &&
            data.getFullYear() === ano &&
            data.getMonth() === mes,
        );
      });

      meses.push({
        chave: `${ano}-${String(mes + 1).padStart(2, "0")}`,
        titulo: tituloMes(referencia),
        previsto: itens.reduce(
          (total, item) =>
            total + Number(item.comissao_prevista || 0),
          0,
        ),
        recebido: itens.reduce(
          (total, item) => total + Number(item.valor_recebido || 0),
          0,
        ),
      });
    }

    return meses;
  }, [baixas]);

  const maiorValorMes = useMemo(
    () =>
      Math.max(
        1,
        ...porMes.flatMap((item) => [
          item.previsto,
          item.recebido,
        ]),
      ),
    [porMes],
  );

  return (
    <div className="financial-dashboard">
      <div className="financial-dashboard-heading">
        <div>
          <span>CENTRO FINANCEIRO</span>
          <h2>Visão geral da operação</h2>
          <p>
            Produção, comissões bancárias, divergências e recebimentos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void carregar()}
          disabled={carregando}
        >
          {carregando ? "Atualizando..." : "Atualizar dados"}
        </button>
      </div>

      {mensagem && (
        <div className="financial-dashboard-message">{mensagem}</div>
      )}

      <section className="financial-dashboard-cards">
        <article>
          <span>Produção bruta</span>
          <strong>{moeda(indicadores.producaoBruta)}</strong>
          <small>Contratos pagos</small>
        </article>

        <article>
          <span>Valor líquido</span>
          <strong>{moeda(indicadores.valorLiquido)}</strong>
          <small>Base líquida das propostas</small>
        </article>

        <article>
          <span>Comissão prevista</span>
          <strong>{moeda(indicadores.comissaoPrevista)}</strong>
          <small>Valor calculado pelos bancos</small>
        </article>

        <article>
          <span>Comissão recebida</span>
          <strong>{moeda(indicadores.comissaoRecebida)}</strong>
          <small>
            {indicadores.percentualRecebido.toFixed(1).replace(".", ",")}
            % do previsto
          </small>
        </article>

        <article>
          <span>A receber</span>
          <strong>{moeda(indicadores.aReceber)}</strong>
          <small>Comissões ainda pendentes</small>
        </article>

        <article className="danger">
          <span>Em atraso</span>
          <strong>{moeda(indicadores.emAtraso)}</strong>
          <small>Previsão vencida sem baixa</small>
        </article>

        <article className="positive">
          <span>Recebeu a mais</span>
          <strong>{moeda(indicadores.recebeuAMais)}</strong>
          <small>Divergências positivas</small>
        </article>

        <article className="warning">
          <span>Recebeu a menos</span>
          <strong>{moeda(indicadores.recebeuAMenos)}</strong>
          <small>Divergências negativas</small>
        </article>

        <article
          className={
            indicadores.diferencaTotal < 0 ? "danger" : "highlight"
          }
        >
          <span>Diferença total</span>
          <strong>{moeda(indicadores.diferencaTotal)}</strong>
          <small>Mais recebido − faltante</small>
        </article>
      </section>

      <section className="financial-dashboard-grid">
        <article className="financial-dashboard-panel">
          <div className="financial-dashboard-panel-title">
            <div>
              <span>EVOLUÇÃO MENSAL</span>
              <h3>Previsto x recebido</h3>
            </div>
          </div>

          <div className="financial-chart">
            {porMes.map((item) => (
              <div className="financial-chart-item" key={item.chave}>
                <div className="financial-chart-bars">
                  <div
                    className="financial-chart-bar previsto"
                    style={{
                      height: `${Math.max(
                        4,
                        (item.previsto / maiorValorMes) * 150,
                      )}px`,
                    }}
                    title={`Previsto: ${moeda(item.previsto)}`}
                  />
                  <div
                    className="financial-chart-bar recebido"
                    style={{
                      height: `${Math.max(
                        4,
                        (item.recebido / maiorValorMes) * 150,
                      )}px`,
                    }}
                    title={`Recebido: ${moeda(item.recebido)}`}
                  />
                </div>
                <strong>{item.titulo}</strong>
              </div>
            ))}
          </div>

          <div className="financial-chart-legend">
            <span><i className="previsto" /> Previsto</span>
            <span><i className="recebido" /> Recebido</span>
          </div>
        </article>

        <article className="financial-dashboard-panel">
          <div className="financial-dashboard-panel-title">
            <div>
              <span>RESUMO POR BANCO</span>
              <h3>Conciliação bancária</h3>
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
              porBanco.map((item) => (
                <div className="financial-bank-row" key={item.banco}>
                  <strong>{item.banco}</strong>
                  <span>{moeda(item.previsto)}</span>
                  <span>{moeda(item.recebido)}</span>
                  <span
                    className={
                      item.diferenca < 0
                        ? "negative-text"
                        : item.diferenca > 0
                          ? "positive-text"
                          : ""
                    }
                  >
                    {moeda(item.diferenca)}
                  </span>
                  <strong>{item.aguardando}</strong>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="financial-dashboard-panel">
        <div className="financial-dashboard-panel-title">
          <div>
            <span>FECHAMENTO SEMANAL</span>
            <h3>Últimas seis semanas</h3>
          </div>
        </div>

        <div className="financial-week-grid">
          {porSemana.map((item) => (
            <article key={item.chave}>
              <span>{item.titulo}</span>
              <strong>{item.quantidade} propostas</strong>

              <div>
                <small>Previsto</small>
                <b>{moeda(item.previsto)}</b>
              </div>

              <div>
                <small>Recebido</small>
                <b>{moeda(item.recebido)}</b>
              </div>

              <div>
                <small>Diferença</small>
                <b
                  className={
                    item.diferenca < 0
                      ? "negative-text"
                      : item.diferenca > 0
                        ? "positive-text"
                        : ""
                  }
                >
                  {moeda(item.diferenca)}
                </b>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}