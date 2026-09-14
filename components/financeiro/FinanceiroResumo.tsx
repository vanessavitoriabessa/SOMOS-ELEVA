"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type AbaFinanceiro =
  | "visao-geral"
  | "a-receber"
  | "recebidos"
  | "movimentacoes"
  | "folha"
  | "relatorios";

type Props = {
  onNavigate: (aba: AbaFinanceiro) => void;
};

type BaixaPagamento = {
  id: string;
  banco?: string;
  tabela?: string;
  cliente?: string;
  comissao_prevista?: number;
  valor_recebido?: number;
  data_prevista_recebimento?: string;
  data_recebimento?: string | null;
};

type Movimento = {
  id?: string;
  tipo?: "Entrada" | "Saída";
  valor?: number;
  data?: string;
};

type DespesaRecorrente = {
  id: string;
  nome: string;
  categoria?: string;
  fornecedor?: string;
  valor?: number;
  dia_vencimento?: number;
  inicio_competencia?: string;
  fim_competencia?: string | null;
  ativo?: boolean;
};

type PagamentoDespesaRecorrente = {
  id: string;
  despesa_recorrente_id: string;
  competencia: string;
  valor_pago?: number;
  pago_em?: string;
};

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function mesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function primeiroDiaMes() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
}

function ultimoDiaMes() {
  const hoje = new Date();
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, "0")}-${String(ultimo.getDate()).padStart(2, "0")}`;
}

function dentroPeriodo(data: string | null | undefined, inicio: string, fim: string) {
  const valor = String(data || "").slice(0, 10);
  if (!valor) return false;
  return valor >= inicio && valor <= fim;
}

export default function FinanceiroResumo({ onNavigate }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [baixas, setBaixas] = useState<BaixaPagamento[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [despesasFixas, setDespesasFixas] = useState<DespesaRecorrente[]>([]);
  const [pagamentosFixos, setPagamentosFixos] = useState<PagamentoDespesaRecorrente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState<"mes" | "personalizado">("mes");
  const [dataInicial, setDataInicial] = useState(primeiroDiaMes());
  const [dataFinal, setDataFinal] = useState(ultimoDiaMes());

  const carregar = useCallback(async () => {
    setCarregando(true);

    try {
      const [resBaixas, resMovimentos, resFixas, resPagamentosFixos] = await Promise.all([
        supabase
          .from("baixas_pagamentos")
          .select("id,banco,tabela,cliente,comissao_prevista,valor_recebido,data_prevista_recebimento,data_recebimento")
          .order("data_prevista_recebimento", { ascending: true }),
        supabase
          .from("movimentos_financeiros")
          .select("id,tipo,valor,data")
          .order("data", { ascending: false }),
        supabase
          .from("despesas_recorrentes")
          .select("id,nome,categoria,fornecedor,valor,dia_vencimento,inicio_competencia,fim_competencia,ativo")
          .eq("ativo", true)
          .order("dia_vencimento", { ascending: true }),
        supabase
          .from("despesas_recorrentes_pagamentos")
          .select("id,despesa_recorrente_id,competencia,valor_pago,pago_em"),
      ]);

      if (resBaixas.error) throw resBaixas.error;
      if (resMovimentos.error) throw resMovimentos.error;
      if (resFixas.error) throw resFixas.error;
      if (resPagamentosFixos.error) throw resPagamentosFixos.error;

      setBaixas((resBaixas.data || []) as BaixaPagamento[]);
      setMovimentos((resMovimentos.data || []) as Movimento[]);
      setDespesasFixas((resFixas.data || []) as DespesaRecorrente[]);
      setPagamentosFixos((resPagamentosFixos.data || []) as PagamentoDespesaRecorrente[]);
    } finally {
      setCarregando(false);
    }
  }, [supabase]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const resumo = useMemo(() => {
    const aReceber = baixas
      .filter((item) => dentroPeriodo(item.data_prevista_recebimento, dataInicial, dataFinal))
      .reduce((total, item) => {
        const previsto = Number(item.comissao_prevista || 0);
        const recebido = Number(item.valor_recebido || 0);
        return total + Math.max(previsto - recebido, 0);
      }, 0);

    const recebidoMes = baixas
      .filter((item) => dentroPeriodo(item.data_recebimento, dataInicial, dataFinal))
      .reduce((total, item) => total + Number(item.valor_recebido || 0), 0);

    const despesasMes = movimentos
      .filter(
        (item) =>
          item.tipo === "Saída" &&
          dentroPeriodo(item.data, dataInicial, dataFinal),
      )
      .reduce((total, item) => total + Number(item.valor || 0), 0);

    const saldo = recebidoMes - despesasMes;

    return { aReceber, recebidoMes, despesasMes, saldo };
  }, [baixas, movimentos, dataInicial, dataFinal]);

  const proximas = useMemo(
    () =>
      baixas
        .filter((item) => {
          const previsto = Number(item.comissao_prevista || 0);
          const recebido = Number(item.valor_recebido || 0);
          return (
            previsto - recebido > 0.01 &&
            dentroPeriodo(item.data_prevista_recebimento, dataInicial, dataFinal)
          );
        })
        .slice(0, 6),
    [baixas, dataInicial, dataFinal],
  );

  const competencia = dataInicial.slice(0, 7);

  const despesasFixasMes = useMemo(
    () =>
      despesasFixas.filter((item) => {
        const inicio = String(item.inicio_competencia || "0000-00");
        const fim = item.fim_competencia ? String(item.fim_competencia) : null;
        return inicio <= competencia && (!fim || fim >= competencia);
      }),
    [despesasFixas, competencia],
  );

  const idsFixasPagasNaCompetencia = useMemo(
    () =>
      new Set(
        pagamentosFixos
          .filter((pagamento) => pagamento.competencia === competencia)
          .map((pagamento) => pagamento.despesa_recorrente_id),
      ),
    [pagamentosFixos, competencia],
  );

  const despesasFixasPendentesMes = useMemo(
    () =>
      despesasFixasMes.filter(
        (item) => !idsFixasPagasNaCompetencia.has(item.id),
      ),
    [despesasFixasMes, idsFixasPagasNaCompetencia],
  );

  const despesasPrevistas = useMemo(
    () =>
      despesasFixasPendentesMes.reduce(
        (total, item) => total + Number(item.valor || 0),
        0,
      ),
    [despesasFixasPendentesMes],
  );

  const resultadoProjetado = resumo.recebidoMes + resumo.aReceber - resumo.despesasMes - despesasPrevistas;

  const serie6Meses = useMemo(() => {
    const hoje = new Date();
    const meses = Array.from({ length: 6 }, (_, indice) => {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - indice), 1);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
      const nome = data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      return { chave, nome };
    });

    return meses.map((mes) => {
      const recebido = baixas
        .filter((item) => String(item.data_recebimento || "").slice(0, 7) === mes.chave)
        .reduce((total, item) => total + Number(item.valor_recebido || 0), 0);

      const despesas = movimentos
        .filter((item) => item.tipo === "Saída" && String(item.data || "").slice(0, 7) === mes.chave)
        .reduce((total, item) => total + Number(item.valor || 0), 0);

      return { ...mes, recebido, despesas };
    });
  }, [baixas, movimentos]);

  const maiorGrafico = Math.max(
    1,
    ...serie6Meses.flatMap((item) => [item.recebido, item.despesas]),
  );

  const proximasDespesas = despesasFixasPendentesMes.slice(0, 5);

  return (
    <div className="fin-home fin-home-modern">
      <section className="fin-home-top modern">
        <div>
          <span>CENTRO FINANCEIRO</span>
          <h2>Visão financeira</h2>
          <p>Acompanhe caixa, compromissos e recebimentos em uma leitura rápida.</p>
        </div>

        <div className="fin-top-actions fin-period-control">
          <div className="fin-period-buttons">
            <button
              type="button"
              className={periodo === "mes" ? "active" : ""}
              onClick={() => {
                setPeriodo("mes");
                setDataInicial(primeiroDiaMes());
                setDataFinal(ultimoDiaMes());
              }}
            >
              Este mês
            </button>
            <button
              type="button"
              className={periodo === "personalizado" ? "active" : ""}
              onClick={() => setPeriodo("personalizado")}
            >
              Personalizado
            </button>
          </div>

          {periodo === "personalizado" ? (
            <div className="fin-custom-dates">
              <label>
                De
                <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
              </label>
              <label>
                Até
                <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
              </label>
            </div>
          ) : (
            <div className="fin-period-label">
              <small>Competência</small>
              <strong>
                {new Date(`${dataInicial}T12:00:00`).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </div>
          )}

          <button className="fin-update-button" type="button" onClick={() => void carregar()} disabled={carregando}>
            {carregando ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </section>

      <section className="fin-home-kpis modern">
        <article className="fin-kpi-primary" onClick={() => onNavigate("a-receber")}>
          <span>A receber</span>
          <strong>{moeda(resumo.aReceber)}</strong>
          <small>Comissões ainda pendentes</small>
        </article>

        <article onClick={() => onNavigate("recebidos")}>
          <span>Recebido no mês</span>
          <strong>{moeda(resumo.recebidoMes)}</strong>
          <small>Valor efetivamente recebido</small>
        </article>

        <article onClick={() => onNavigate("movimentacoes")}>
          <span>Despesas realizadas</span>
          <strong>{moeda(resumo.despesasMes)}</strong>
          <small>Saídas já pagas no mês</small>
        </article>

        <article className={resultadoProjetado < 0 ? "fin-kpi-danger" : "fin-kpi-success"}>
          <span>Resultado projetado</span>
          <strong>{moeda(resultadoProjetado)}</strong>
          <small>Recebido + a receber − despesas</small>
        </article>
      </section>

      <section className="fin-modern-grid">
        <article className="fin-chart-card">
          <header>
            <div>
              <span>FLUXO FINANCEIRO</span>
              <h3>Entradas x saídas</h3>
              <p>Últimos 6 meses</p>
            </div>
            <div className="fin-chart-legend">
              <span><i className="recebido"></i>Recebido</span>
              <span><i className="despesa"></i>Despesas</span>
            </div>
          </header>

          <div className="fin-bars">
            {serie6Meses.map((item) => (
              <div className="fin-bar-group" key={item.chave}>
                <div className="fin-bar-values">
                  <div
                    className="fin-bar recebido"
                    style={{ height: `${Math.max((item.recebido / maiorGrafico) * 150, item.recebido ? 8 : 2)}px` }}
                    title={`Recebido: ${moeda(item.recebido)}`}
                  />
                  <div
                    className="fin-bar despesa"
                    style={{ height: `${Math.max((item.despesas / maiorGrafico) * 150, item.despesas ? 8 : 2)}px` }}
                    title={`Despesas: ${moeda(item.despesas)}`}
                  />
                </div>
                <strong>{item.nome}</strong>
              </div>
            ))}
          </div>

          <div className="fin-chart-summary">
            <div><span>Despesas fixas previstas</span><strong>{moeda(despesasPrevistas)}</strong></div>
            <div><span>Saldo realizado</span><strong>{moeda(resumo.saldo)}</strong></div>
            <div><span>Saldo projetado</span><strong>{moeda(resultadoProjetado)}</strong></div>
          </div>
        </article>

        <aside className="fin-commitments-card">
          <header>
            <div>
              <span>COMPROMISSOS</span>
              <h3>Próximas despesas</h3>
            </div>
            <button type="button" onClick={() => onNavigate("movimentacoes")}>Ver movimentações</button>
          </header>

          <div className="fin-commitment-list">
            {proximasDespesas.length === 0 ? (
              <div className="fin-home-empty">Nenhuma despesa fixa cadastrada.</div>
            ) : (
              proximasDespesas.map((item) => (
                <div className="fin-commitment-item" key={item.id}>
                  <div className="fin-date-pill">
                    <small>DIA</small>
                    <strong>{item.dia_vencimento || "—"}</strong>
                  </div>
                  <div className="fin-commitment-info">
                    <strong>{item.nome}</strong>
                    <small>{item.categoria || item.fornecedor || "Despesa fixa"}</small>
                  </div>
                  <strong className="fin-commitment-value">{moeda(Number(item.valor || 0))}</strong>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      <section className="fin-home-table-card modern">
        <header>
          <div>
            <span>RECEBIMENTOS</span>
            <h3>Próximas comissões</h3>
          </div>
          <button type="button" onClick={() => onNavigate("a-receber")}>Ver todos</button>
        </header>

        <div className="fin-home-table">
          <div className="fin-home-table-head">
            <span>Banco</span>
            <span>Cliente</span>
            <span>Data prevista</span>
            <span>Falta receber</span>
            <span></span>
          </div>

          {proximas.length === 0 ? (
            <div className="fin-home-empty">Nenhuma comissão pendente.</div>
          ) : (
            proximas.slice(0, 5).map((item) => {
              const previsto = Number(item.comissao_prevista || 0);
              const recebido = Number(item.valor_recebido || 0);
              const saldo = Math.max(previsto - recebido, 0);

              return (
                <div className="fin-home-table-row" key={item.id}>
                  <span><strong>{item.banco || "—"}</strong><small>{item.tabela || ""}</small></span>
                  <span>{item.cliente || "—"}</span>
                  <span>{item.data_prevista_recebimento || "—"}</span>
                  <span className="valor">{moeda(saldo)}</span>
                  <button type="button" onClick={() => onNavigate("a-receber")}>Dar baixa</button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
