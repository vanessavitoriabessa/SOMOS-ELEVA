"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./dashboard-financeiro.css";

type ProdutoFinanceiro =
  | "Todos"
  | "Compra de Dívida"
  | "CLT"
  | "INSS"
  | "Crédito Pessoal";

type PeriodoFinanceiro = "Hoje" | "Mês" | "Ano" | "Personalizado";

type Proposta = {
  id: string;
  produto?: string;
  banco?: string;
  tabela?: string;
  valorContrato?: number;
  valorMeta?: number;
  comissao?: number;
  status?: string;
  dataCadastro?: string;
  dataPagamento?: string;
};

type BaixaPagamento = {
  id: string;
  produto?: string;
  banco?: string;
  tabela?: string;
  comissao_prevista?: number;
  valor_recebido?: number;
  diferenca?: number;
  data_pagamento_proposta?: string;
  data_prevista_recebimento?: string;
  data_recebimento?: string | null;
};

type LancamentoLocal = {
  id?: string;
  tipo?: "Entrada" | "Saída";
  produto?: string;
  banco?: string;
  categoria?: string;
  descricao?: string;
  valor?: number;
  data?: string;
};

type FolhaPagamento = {
  id?: string;
  competencia?: string;
  assiduidade_ativa?: boolean;
  valor_assiduidade?: number;
  total_dia05?: number;
};

type ComissaoPagamento = {
  id?: string;
  competencia?: string;
  comissao_compra_divida?: number;
  comissao_clt?: number;
  outras_premiacoes?: number;
  ajuste_manual?: number;
  total_comissao?: number;
  data_pagamento?: string | null;
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

function isoHoje() {
  return new Date().toISOString().slice(0, 10);
}

function primeiroDiaMes() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-01`;
}

function ultimoDiaMes() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
}

function primeiroDiaAno() {
  return `${new Date().getFullYear()}-01-01`;
}

function ultimoDiaAno() {
  return `${new Date().getFullYear()}-12-31`;
}

function somenteData(valor?: string | null) {
  if (!valor) return "";
  const encontrada = String(valor).match(/\d{4}-\d{2}-\d{2}/);
  return encontrada ? encontrada[0] : "";
}

function noPeriodo(valor: string | null | undefined, inicio: string, fim: string) {
  const data = somenteData(valor);
  if (!data) return false;
  if (inicio && data < inicio) return false;
  if (fim && data > fim) return false;
  return true;
}

function produtoCorresponde(valor: string | undefined, produto: ProdutoFinanceiro) {
  if (produto === "Todos") return true;
  return normalizar(valor) === normalizar(produto);
}

function lerListaLocal<T>(chave: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const dados = JSON.parse(localStorage.getItem(chave) || "[]");
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

export default function FinancialDashboard() {
  const supabase = useMemo(() => createClient(), []);

  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [baixas, setBaixas] = useState<BaixaPagamento[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoLocal[]>([]);
  const [folhas, setFolhas] = useState<FolhaPagamento[]>([]);
  const [comissoes, setComissoes] = useState<ComissaoPagamento[]>([]);

  const [periodo, setPeriodo] = useState<PeriodoFinanceiro>("Mês");
  const [dataInicial, setDataInicial] = useState(primeiroDiaMes());
  const [dataFinal, setDataFinal] = useState(ultimoDiaMes());
  const [produto, setProduto] = useState<ProdutoFinanceiro>("Todos");

  const [periodoFluxo, setPeriodoFluxo] =
    useState<PeriodoFinanceiro>("Mês");
  const [dataInicialFluxo, setDataInicialFluxo] =
    useState(primeiroDiaMes());
  const [dataFinalFluxo, setDataFinalFluxo] =
    useState(ultimoDiaMes());
  const [produtoFluxo, setProdutoFluxo] =
    useState<ProdutoFinanceiro>("Todos");

  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("");

  function mudarPeriodo(novo: PeriodoFinanceiro) {
    setPeriodo(novo);

    if (novo === "Hoje") {
      const hoje = isoHoje();
      setDataInicial(hoje);
      setDataFinal(hoje);
    }

    if (novo === "Mês") {
      setDataInicial(primeiroDiaMes());
      setDataFinal(ultimoDiaMes());
    }

    if (novo === "Ano") {
      setDataInicial(primeiroDiaAno());
      setDataFinal(ultimoDiaAno());
    }
  }

  function mudarPeriodoFluxo(novo: PeriodoFinanceiro) {
    setPeriodoFluxo(novo);

    if (novo === "Hoje") {
      const hoje = isoHoje();
      setDataInicialFluxo(hoje);
      setDataFinalFluxo(hoje);
    }

    if (novo === "Mês") {
      setDataInicialFluxo(primeiroDiaMes());
      setDataFinalFluxo(ultimoDiaMes());
    }

    if (novo === "Ano") {
      setDataInicialFluxo(primeiroDiaAno());
      setDataFinalFluxo(ultimoDiaAno());
    }
  }

  const carregar = useCallback(async () => {
    setCarregando(true);
    setMensagem("");

    try {
      const { data: sessao, error: erroSessao } = await supabase.auth.getSession();

      if (erroSessao || !sessao.session?.access_token) {
        throw new Error("Sua sessão expirou. Entre novamente no sistema.");
      }

      const [
        respostaPropostas,
        respostaBaixas,
        respostaFolhas,
        respostaComissoes,
        respostaLancamentos,
      ] = await Promise.all([
        fetch("/api/propostas", {
          headers: {
            Authorization: `Bearer ${sessao.session.access_token}`,
          },
          cache: "no-store",
        }),
        supabase.from("baixas_pagamentos").select("*"),
        supabase.from("folha_pagamentos").select("*"),
        supabase.from("comissoes_pagamentos").select("*"),
        supabase
          .from("movimentos_financeiros")
          .select("*")
          .order("data", { ascending: false }),
      ]);

      const conteudo = (await respostaPropostas.json()) as {
        propostas?: Proposta[];
        erro?: string;
      };

      if (!respostaPropostas.ok) {
        throw new Error(conteudo.erro || "Não foi possível carregar as propostas.");
      }

      if (respostaBaixas.error) throw respostaBaixas.error;
      if (respostaFolhas.error) throw respostaFolhas.error;
      if (respostaComissoes.error) throw respostaComissoes.error;
      if (respostaLancamentos.error) throw respostaLancamentos.error;

      setPropostas(Array.isArray(conteudo.propostas) ? conteudo.propostas : []);
      setBaixas(Array.isArray(respostaBaixas.data) ? respostaBaixas.data : []);
      setFolhas(Array.isArray(respostaFolhas.data) ? respostaFolhas.data : []);
      setComissoes(
        Array.isArray(respostaComissoes.data)
          ? (respostaComissoes.data as ComissaoPagamento[])
          : [],
      );
      setLancamentos(
        Array.isArray(respostaLancamentos.data)
          ? respostaLancamentos.data.map((registro) => ({
              id: String(registro.id || ""),
              tipo:
                String(registro.tipo || "") === "Saída"
                  ? "Saída"
                  : "Entrada",
              produto: String(registro.produto || ""),
              banco: String(registro.banco || ""),
              categoria: String(registro.categoria || ""),
              descricao: String(registro.descricao || ""),
              valor: Number(registro.valor || 0),
              data: String(registro.data || ""),
            }))
          : [],
      );

      setUltimaAtualizacao(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (erro) {
      console.error(erro);
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar o financeiro.",
      );
    } finally {
      setCarregando(false);
    }
  }, [supabase]);

  useEffect(() => {
    void carregar();

    const atualizar = () => void carregar();
    window.addEventListener("focus", atualizar);

    return () => window.removeEventListener("focus", atualizar);
  }, [carregar]);

  const propostasFiltradas = useMemo(
    () =>
      propostas.filter(
        (item) =>
          normalizar(item.status) === "pago" &&
          noPeriodo(item.dataPagamento, dataInicial, dataFinal) &&
          produtoCorresponde(item.produto, produto),
      ),
    [propostas, dataInicial, dataFinal, produto],
  );

  const baixasFiltradas = useMemo(
    () =>
      baixas.filter((item) => {
        const dataReferencia =
          item.data_recebimento ||
          item.data_pagamento_proposta ||
          item.data_prevista_recebimento;

        return (
          noPeriodo(dataReferencia, dataInicial, dataFinal) &&
          produtoCorresponde(item.produto, produto)
        );
      }),
    [baixas, dataInicial, dataFinal, produto],
  );

  const lancamentosFiltrados = useMemo(
    () =>
      lancamentos.filter(
        (item) =>
          noPeriodo(item.data, dataInicial, dataFinal) &&
          produtoCorresponde(item.produto, produto),
      ),
    [lancamentos, dataInicial, dataFinal, produto],
  );

  const folhasFiltradas = useMemo(
    () =>
      folhas.filter((item) => {
        const competencia = String(item.competencia || "").slice(0, 7);
        if (!competencia) return false;

        const inicioMes = `${competencia}-01`;
        const fimMes = `${competencia}-31`;

        return (
          (!dataInicial || fimMes >= dataInicial) &&
          (!dataFinal || inicioMes <= dataFinal)
        );
      }),
    [folhas, dataInicial, dataFinal],
  );

  const comissoesFiltradas = useMemo(
    () =>
      comissoes.filter((item) => {
        const dataReferencia =
          item.data_pagamento ||
          (item.competencia ? `${String(item.competencia).slice(0, 7)}-20` : "");

        return noPeriodo(
          dataReferencia,
          dataInicial,
          dataFinal,
        );
      }),
    [comissoes, dataInicial, dataFinal],
  );

  const lancamentosFluxo = useMemo(
    () =>
      lancamentos.filter(
        (item) =>
          noPeriodo(item.data, dataInicialFluxo, dataFinalFluxo) &&
          produtoCorresponde(item.produto, produtoFluxo),
      ),
    [
      lancamentos,
      dataInicialFluxo,
      dataFinalFluxo,
      produtoFluxo,
    ],
  );

  const folhasFluxo = useMemo(
    () =>
      folhas.filter((item) => {
        const competencia =
          String(item.competencia || "").slice(0, 7);

        if (!competencia) return false;

        const inicioMes = `${competencia}-01`;
        const fimMes = `${competencia}-31`;

        return (
          (!dataInicialFluxo || fimMes >= dataInicialFluxo) &&
          (!dataFinalFluxo || inicioMes <= dataFinalFluxo)
        );
      }),
    [folhas, dataInicialFluxo, dataFinalFluxo],
  );

  const comissoesFluxo = useMemo(
    () =>
      comissoes.filter((item) => {
        const dataReferencia =
          item.data_pagamento ||
          (item.competencia
            ? `${String(item.competencia).slice(0, 7)}-20`
            : "");

        return noPeriodo(
          dataReferencia,
          dataInicialFluxo,
          dataFinalFluxo,
        );
      }),
    [comissoes, dataInicialFluxo, dataFinalFluxo],
  );

  const indicadores = useMemo(() => {
    const producaoBruta = propostasFiltradas.reduce(
      (total, item) => total + Number(item.valorContrato || 0),
      0,
    );

    const valorLiquido = propostasFiltradas.reduce(
      (total, item) => total + Number(item.valorMeta || 0),
      0,
    );

    const comissaoPrevista = baixasFiltradas.reduce(
      (total, item) => total + Number(item.comissao_prevista || 0),
      0,
    );

    const comissaoRecebida = baixasFiltradas.reduce(
      (total, item) => total + Number(item.valor_recebido || 0),
      0,
    );

    const aReceber = baixasFiltradas
      .filter((item) => !item.data_recebimento)
      .reduce(
        (total, item) => total + Number(item.comissao_prevista || 0),
        0,
      );

    return {
      producaoBruta,
      valorLiquido,
      comissaoPrevista,
      comissaoRecebida,
      aReceber,
    };
  }, [propostasFiltradas, baixasFiltradas]);

  const fluxo = useMemo(() => {
    const entradas = lancamentosFluxo
      .filter((item) => item.tipo === "Entrada")
      .reduce((total, item) => total + Number(item.valor || 0), 0);

    const saidas = lancamentosFluxo
      .filter((item) => item.tipo === "Saída")
      .reduce((total, item) => total + Number(item.valor || 0), 0);

    const premiacoes = comissoesFluxo.reduce((total, item) => {
      if (produtoFluxo === "Compra de Dívida") {
        return total + Number(item.comissao_compra_divida || 0);
      }

      if (produtoFluxo === "CLT") {
        return total + Number(item.comissao_clt || 0);
      }

      if (
        produtoFluxo === "INSS" ||
        produtoFluxo === "Crédito Pessoal"
      ) {
        return total;
      }

      return total + Number(item.total_comissao || 0);
    }, 0);

    const assiduidade = folhasFluxo
      .filter((item) => item.assiduidade_ativa)
      .reduce(
        (total, item) => total + Number(item.valor_assiduidade || 0),
        0,
      );

    const folha = folhasFiltradas.reduce((total, item) => {
      const dia05 = Number(item.total_dia05 || 0);
      const assiduidadeItem = item.assiduidade_ativa
        ? Number(item.valor_assiduidade || 0)
        : 0;

      return total + Math.max(dia05 - assiduidadeItem, 0);
    }, 0);

    const lucroEmpresa = entradas - saidas - premiacoes - folha - assiduidade;

    return {
      entradas,
      saidas,
      premiacoes,
      folha,
      assiduidade,
      lucroEmpresa,
    };
  }, [
    lancamentosFluxo,
    comissoesFluxo,
    folhasFluxo,
    produtoFluxo,
  ]);

  return (
    <div className="financial-dashboard financial-dashboard-pro">
      <div className="financial-dashboard-heading">
        <div>
          <span>CENTRO FINANCEIRO</span>
          <h2>Visão geral da operação</h2>
          <p>Produção, recebimentos, despesas e lucro da empresa.</p>
        </div>

        <button type="button" onClick={() => void carregar()} disabled={carregando}>
          {carregando ? "Atualizando..." : "Atualizar dados ↻"}
        </button>
      </div>

      <section className="financial-filter-card">
        <div className="financial-filter-buttons">
          {(["Hoje", "Mês", "Ano", "Personalizado"] as PeriodoFinanceiro[]).map(
            (item) => (
              <button
                key={item}
                type="button"
                className={periodo === item ? "active" : ""}
                onClick={() => mudarPeriodo(item)}
              >
                {item === "Mês" ? "Este mês" : item === "Ano" ? "Este ano" : item}
              </button>
            ),
          )}
        </div>

        <div className="financial-filter-grid">
          <label>
            Data inicial
            <input
              type="date"
              value={dataInicial}
              onChange={(evento) => {
                setPeriodo("Personalizado");
                setDataInicial(evento.target.value);
              }}
            />
          </label>

          <label>
            Data final
            <input
              type="date"
              value={dataFinal}
              onChange={(evento) => {
                setPeriodo("Personalizado");
                setDataFinal(evento.target.value);
              }}
            />
          </label>

          <label>
            Produto
            <select
              value={produto}
              onChange={(evento) => setProduto(evento.target.value as ProdutoFinanceiro)}
            >
              <option>Todos</option>
              <option>Compra de Dívida</option>
              <option>CLT</option>
              <option>INSS</option>
              <option>Crédito Pessoal</option>
            </select>
          </label>
        </div>
      </section>

      {mensagem && <div className="financial-dashboard-message">{mensagem}</div>}

      <section className="financial-primary-cards">
        <article>
          <div className="financial-icon financial-icon-blue">▥</div>
          <div>
            <span>Produção bruta</span>
            <strong>{moeda(indicadores.producaoBruta)}</strong>
            <small>Contratos pagos no período</small>
          </div>
        </article>

        <article>
          <div className="financial-icon financial-icon-blue">▤</div>
          <div>
            <span>Valor líquido</span>
            <strong>{moeda(indicadores.valorLiquido)}</strong>
            <small>Base líquida das propostas pagas</small>
          </div>
        </article>

        <article>
          <div className="financial-icon financial-icon-blue">%</div>
          <div>
            <span>Comissão prevista</span>
            <strong>{moeda(indicadores.comissaoPrevista)}</strong>
            <small>Valor previsto dos bancos</small>
          </div>
        </article>
      </section>

      <section className="financial-secondary-cards">
        <article className="financial-kpi received">
          <div className="financial-icon financial-icon-green">↓</div>
          <div>
            <span>Comissão recebida</span>
            <strong>{moeda(indicadores.comissaoRecebida)}</strong>
            <small>Recebimentos no período</small>
          </div>
        </article>

        <article className="financial-kpi">
          <div className="financial-icon financial-icon-blue">◉</div>
          <div>
            <span>A receber</span>
            <strong>{moeda(indicadores.aReceber)}</strong>
            <small>Comissões pendentes</small>
          </div>
        </article>
      </section>

      <section className="financial-dashboard-main-grid single">
        <article className="financial-dashboard-panel financial-flow-panel">
          <div className="financial-dashboard-panel-title">
            <div>
              <span>FLUXO FINANCEIRO</span>
              <h3>Entradas, despesas e lucro</h3>
            </div>

            <b>
              {dataInicialFluxo || "—"} até {dataFinalFluxo || "—"}
            </b>
          </div>

          <div className="financial-flow-filter">
            <div className="financial-flow-filter-buttons">
              <button
                type="button"
                className={periodoFluxo === "Hoje" ? "active" : ""}
                onClick={() => mudarPeriodoFluxo("Hoje")}
              >
                Hoje
              </button>

              <button
                type="button"
                className={periodoFluxo === "Mês" ? "active" : ""}
                onClick={() => mudarPeriodoFluxo("Mês")}
              >
                Este mês
              </button>

              <button
                type="button"
                className={periodoFluxo === "Ano" ? "active" : ""}
                onClick={() => mudarPeriodoFluxo("Ano")}
              >
                Este ano
              </button>

              <button
                type="button"
                className={
                  periodoFluxo === "Personalizado" ? "active" : ""
                }
                onClick={() => setPeriodoFluxo("Personalizado")}
              >
                Personalizado
              </button>
            </div>

            <div className="financial-flow-filter-dates">
              <label>
                Data inicial
                <input
                  type="date"
                  value={dataInicialFluxo}
                  onChange={(evento) => {
                    setPeriodoFluxo("Personalizado");
                    setDataInicialFluxo(evento.target.value);
                  }}
                />
              </label>

              <label>
                Data final
                <input
                  type="date"
                  value={dataFinalFluxo}
                  onChange={(evento) => {
                    setPeriodoFluxo("Personalizado");
                    setDataFinalFluxo(evento.target.value);
                  }}
                />
              </label>

              <label>
                Produto
                <select
                  value={produtoFluxo}
                  onChange={(evento) =>
                    setProdutoFluxo(
                      evento.target.value as ProdutoFinanceiro,
                    )
                  }
                >
                  <option>Todos</option>
                  <option>Compra de Dívida</option>
                  <option>CLT</option>
                  <option>INSS</option>
                  <option>Crédito Pessoal</option>
                </select>
              </label>
            </div>
          </div>

          <div className="financial-flow-list">
            <div>
              <i className="flow-icon income">↓</i>
              <span><strong>Entradas</strong><small>Lançamentos de entrada</small></span>
              <b className="positive-text">{moeda(fluxo.entradas)}</b>
            </div>

            <div>
              <i className="flow-icon expense">↓</i>
              <span><strong>Saídas</strong><small>Despesas lançadas</small></span>
              <b className="negative-text">{moeda(fluxo.saidas)}</b>
            </div>

            <div>
              <i className="flow-icon neutral">▣</i>
              <span><strong>Premiação</strong><small>Premiação de vendas</small></span>
              <b>{moeda(fluxo.premiacoes)}</b>
            </div>

            <div>
              <i className="flow-icon payroll">▦</i>
              <span><strong>Folha</strong><small>Folha sem assiduidade</small></span>
              <b>{moeda(fluxo.folha)}</b>
            </div>

            <div>
              <i className="flow-icon attendance">♙</i>
              <span><strong>Assiduidade</strong><small>Prêmios de assiduidade</small></span>
              <b>{moeda(fluxo.assiduidade)}</b>
            </div>
          </div>

          <div className="financial-balance-box">
            <div>
              <strong>LUCRO DA EMPRESA</strong>
              <span>Entradas − saídas − premiação − folha − assiduidade</span>
            </div>

            <b className={fluxo.lucroEmpresa < 0 ? "negative-text" : "positive-text"}>
              {moeda(fluxo.lucroEmpresa)}
            </b>
          </div>
        </article>
      </section>

      <footer className="financial-dashboard-footer">
        <span>ⓘ Os valores obedecem aos filtros de período e produto.</span>
        <span>
          Última atualização: {ultimaAtualizacao ? `às ${ultimaAtualizacao}` : "agora"} ↻
        </span>
      </footer>
    </div>
  );
}