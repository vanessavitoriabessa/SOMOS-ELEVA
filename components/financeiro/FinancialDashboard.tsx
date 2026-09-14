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

type RegistroClt = {
  id?: string;
  consultora?: string;
  valorAprovado?: number;
  parcela?: number;
  status?: string;
  criadoEm?: string;
  atualizadoEm?: string;
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

function produtoCorresponde(
  valor: string | undefined,
  produto: ProdutoFinanceiro,
  produtoPadrao?: Exclude<ProdutoFinanceiro, "Todos">,
) {
  if (produto === "Todos") return true;

  const valorResolvido =
    String(valor || "").trim() ||
    String(produtoPadrao || "").trim();

  return normalizar(valorResolvido) === normalizar(produto);
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
  const [registrosClt, setRegistrosClt] = useState<RegistroClt[]>([]);
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
        respostaClt,
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
        fetch("/api/clt", {
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

      const conteudoClt = (await respostaClt.json()) as {
        registros?: RegistroClt[];
        erro?: string;
      };

      if (!respostaPropostas.ok) {
        throw new Error(conteudo.erro || "Não foi possível carregar as propostas.");
      }

      if (!respostaClt.ok) {
        throw new Error(conteudoClt.erro || "Não foi possível carregar os registros CLT.");
      }

      if (respostaBaixas.error) throw respostaBaixas.error;
      if (respostaFolhas.error) throw respostaFolhas.error;
      if (respostaComissoes.error) throw respostaComissoes.error;
      if (respostaLancamentos.error) throw respostaLancamentos.error;

      setPropostas(Array.isArray(conteudo.propostas) ? conteudo.propostas : []);
      setRegistrosClt(
        Array.isArray(conteudoClt.registros)
          ? conteudoClt.registros
          : [],
      );
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
          produtoCorresponde(
            item.produto,
            produto,
            "Compra de Dívida",
          ),
      ),
    [propostas, dataInicial, dataFinal, produto],
  );

  const registrosCltFiltrados = useMemo(
    () =>
      registrosClt.filter(
        (item) =>
          normalizar(item.status) === "pago" &&
          noPeriodo(item.dataPagamento, dataInicial, dataFinal) &&
          (produto === "Todos" || produto === "CLT"),
      ),
    [registrosClt, dataInicial, dataFinal, produto],
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
          produtoCorresponde(
            item.produto,
            produto,
            "Compra de Dívida",
          )
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
    const compraBruta = propostasFiltradas.reduce(
      (total, item) => total + Number(item.valorContrato || 0),
      0,
    );

    const compraLiquida = propostasFiltradas.reduce(
      (total, item) => total + Number(item.valorMeta || 0),
      0,
    );

    const cltValorLiquido = registrosCltFiltrados.reduce(
      (total, item) => total + Number(item.valorAprovado || 0),
      0,
    );

    const cltParcela = registrosCltFiltrados.reduce(
      (total, item) => total + Number(item.parcela || 0),
      0,
    );

    const producaoBruta =
      compraBruta + cltValorLiquido;

    const valorLiquido =
      compraLiquida + cltParcela;

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
      compraBruta,
      compraLiquida,
      cltValorLiquido,
      cltParcela,
      comissaoPrevista,
      comissaoRecebida,
      aReceber,
    };
  }, [
    propostasFiltradas,
    registrosCltFiltrados,
    baixasFiltradas,
  ]);

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
      <div className="financial-dashboard-heading financial-dashboard-heading-v2">
        <div>
          <span>CENTRO FINANCEIRO</span>
          <h2>Visão geral da operação</h2>
          <p>Resumo executivo da produção, recebimentos e resultado financeiro.</p>
        </div>

        <div className="financial-heading-actions">
          <div className="financial-update-status">
            <small>Última atualização</small>
            <strong>{ultimaAtualizacao ? `às ${ultimaAtualizacao}` : "agora"}</strong>
          </div>

          <button type="button" onClick={() => void carregar()} disabled={carregando}>
            {carregando ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      <section className="financial-filter-card financial-filter-card-v2">
        <div className="financial-filter-topline">
          <div>
            <span>PERÍODO DA ANÁLISE</span>
            <small>Use um período rápido ou personalize as datas.</small>
          </div>

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

      <section className="fd-section">
        <div className="fd-section-head">
          <div>
            <span>RESUMO FINANCEIRO</span>
            <h3>Resultado do período</h3>
          </div>
          <small>Visão de caixa e compromissos</small>
        </div>

        <div className="fd-card-grid fd-card-grid-4">
          <article className="fd-metric-card">
            <div className="fd-metric-icon positive">↓</div>
            <div>
              <span>Entradas</span>
              <strong className="positive-text">{moeda(fluxo.entradas)}</strong>
              <small>Receitas registradas</small>
            </div>
          </article>

          <article className="fd-metric-card">
            <div className="fd-metric-icon negative">↑</div>
            <div>
              <span>Saídas</span>
              <strong className="negative-text">{moeda(fluxo.saidas)}</strong>
              <small>Despesas registradas</small>
            </div>
          </article>

          <article className="fd-metric-card">
            <div className="fd-metric-icon receivable">◉</div>
            <div>
              <span>A receber</span>
              <strong>{moeda(indicadores.aReceber)}</strong>
              <small>Comissões pendentes</small>
            </div>
          </article>

          <article className="fd-metric-card fd-profit-card">
            <div className="fd-metric-icon result">◆</div>
            <div>
              <span>Lucro líquido</span>
              <strong className={fluxo.lucroEmpresa < 0 ? "negative-text" : "positive-text"}>
                {moeda(fluxo.lucroEmpresa)}
              </strong>
              <small>Resultado após todos os custos</small>
            </div>
          </article>
        </div>
      </section>

      <section className="fd-section">
        <div className="fd-section-head">
          <div>
            <span>PRODUÇÃO</span>
            <h3>Produção comercial</h3>
          </div>
          <small>Valores pagos no período selecionado</small>
        </div>

        <div className="fd-card-grid fd-card-grid-3">
          <article className="fd-production-card">
            <span>Compra de Dívida</span>
            <strong>{moeda(indicadores.compraBruta)}</strong>
            <small>Valor bruto dos contratos pagos</small>
          </article>

          <article className="fd-production-card">
            <span>CLT</span>
            <strong>{moeda(indicadores.cltValorLiquido)}</strong>
            <small>Valor liberado/aprovado pago</small>
          </article>

          <article className="fd-production-card fd-production-total">
            <span>Produção total</span>
            <strong>{moeda(indicadores.producaoBruta)}</strong>
            <small>Compra bruta + valor liberado CLT</small>
          </article>
        </div>
      </section>

      <section className="fd-section">
        <div className="fd-section-head">
          <div>
            <span>CUSTOS DA OPERAÇÃO</span>
            <h3>Compromissos do período</h3>
          </div>
          <small>Custos que impactam o resultado</small>
        </div>

        <div className="fd-card-grid fd-card-grid-4">
          <article className="fd-cost-card">
            <span>Folha</span>
            <strong>{moeda(fluxo.folha)}</strong>
            <small>Pagamento da equipe</small>
          </article>

          <article className="fd-cost-card">
            <span>Premiações</span>
            <strong>{moeda(fluxo.premiacoes)}</strong>
            <small>Premiação de vendas</small>
          </article>

          <article className="fd-cost-card">
            <span>Assiduidade</span>
            <strong>{moeda(fluxo.assiduidade)}</strong>
            <small>Prêmios de assiduidade</small>
          </article>

          <article className="fd-cost-card">
            <span>Outras despesas</span>
            <strong>{moeda(fluxo.saidas)}</strong>
            <small>Saídas operacionais lançadas</small>
          </article>
        </div>
      </section>

      <section className="fd-section fd-flow-section">
        <div className="fd-section-head">
          <div>
            <span>FLUXO DO MÊS</span>
            <h3>Composição do resultado</h3>
          </div>
          <small>{dataInicialFluxo || "—"} até {dataFinalFluxo || "—"}</small>
        </div>

        <div className="fd-flow-toolbar">
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
              className={periodoFluxo === "Personalizado" ? "active" : ""}
              onClick={() => setPeriodoFluxo("Personalizado")}
            >
              Personalizado
            </button>
          </div>

          <div className="fd-flow-filters">
            <input
              type="date"
              value={dataInicialFluxo}
              onChange={(evento) => {
                setPeriodoFluxo("Personalizado");
                setDataInicialFluxo(evento.target.value);
              }}
            />

            <input
              type="date"
              value={dataFinalFluxo}
              onChange={(evento) => {
                setPeriodoFluxo("Personalizado");
                setDataFinalFluxo(evento.target.value);
              }}
            />

            <select
              value={produtoFluxo}
              onChange={(evento) =>
                setProdutoFluxo(evento.target.value as ProdutoFinanceiro)
              }
            >
              <option>Todos</option>
              <option>Compra de Dívida</option>
              <option>CLT</option>
              <option>INSS</option>
              <option>Crédito Pessoal</option>
            </select>
          </div>
        </div>

        <div className="fd-flow-board">
          <div className="fd-flow-row">
            <span>Entradas</span>
            <strong className="positive-text">{moeda(fluxo.entradas)}</strong>
          </div>
          <div className="fd-flow-row">
            <span>Saídas</span>
            <strong className="negative-text">{moeda(fluxo.saidas)}</strong>
          </div>
          <div className="fd-flow-row">
            <span>Premiações</span>
            <strong>{moeda(fluxo.premiacoes)}</strong>
          </div>
          <div className="fd-flow-row">
            <span>Folha</span>
            <strong>{moeda(fluxo.folha)}</strong>
          </div>
          <div className="fd-flow-row">
            <span>Assiduidade</span>
            <strong>{moeda(fluxo.assiduidade)}</strong>
          </div>
          <div className="fd-flow-result">
            <div>
              <span>Resultado líquido</span>
              <small>Entradas − saídas − premiações − folha − assiduidade</small>
            </div>
            <strong className={fluxo.lucroEmpresa < 0 ? "negative-text" : "positive-text"}>
              {moeda(fluxo.lucroEmpresa)}
            </strong>
          </div>
        </div>
      </section>

      <footer className="financial-dashboard-footer">
        <span>ⓘ Valores atualizados conforme período e produto selecionados.</span>
      </footer>
    </div>
  );
}
