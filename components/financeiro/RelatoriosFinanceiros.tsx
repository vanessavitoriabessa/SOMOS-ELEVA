"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import "./relatorios-financeiros.css";

type Baixa = {
  id: string;
  banco?: string;
  comissao_prevista?: number;
  valor_recebido?: number;
  data_recebimento?: string | null;
  data_prevista_recebimento?: string | null;
};

type Movimento = {
  id?: string;
  tipo?: "Entrada" | "Saída";
  categoria?: string;
  valor?: number;
  data?: string;
};

type Fixa = {
  id: string;
  valor?: number;
  inicio_competencia?: string;
  fim_competencia?: string | null;
  ativo?: boolean;
};

type PremiacaoPaga = {
  id: string;
  usuario_nome?: string;
  pontos_solicitados?: number;
  valor_reais?: number;
  status?: string;
  processado_em?: string | null;
};

const moeda = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const hoje = new Date();
const inicioMes = () =>
  `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

const fimMes = () => {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

const dentro = (
  d: string | null | undefined,
  i: string,
  f: string,
) => {
  const v = String(d || "").slice(0, 10);
  return !!v && v >= i && v <= f;
};

export default function RelatoriosFinanceiros() {
  const supabase = useMemo(() => createClient(), []);
  const [inicio, setInicio] = useState(inicioMes());
  const [fim, setFim] = useState(fimMes());
  const [baixas, setBaixas] = useState<Baixa[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [fixas, setFixas] = useState<Fixa[]>([]);
  const [premiacoesPagas, setPremiacoesPagas] = useState<PremiacaoPaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  async function carregar() {
    setCarregando(true);
    setMensagem("");

    const [b, m, f, p] = await Promise.all([
      supabase
        .from("baixas_pagamentos")
        .select("id,banco,comissao_prevista,valor_recebido,data_recebimento,data_prevista_recebimento"),
      supabase
        .from("movimentos_financeiros")
        .select("id,tipo,categoria,valor,data"),
      supabase
        .from("despesas_recorrentes")
        .select("id,valor,inicio_competencia,fim_competencia,ativo"),
      supabase
        .from("pontos_saques")
        .select("id,usuario_nome,pontos_solicitados,valor_reais,status,processado_em")
        .eq("status", "PAGO"),
    ]);

    if (b.error || m.error || f.error || p.error) {
      setMensagem(
        b.error?.message ||
          m.error?.message ||
          f.error?.message ||
          p.error?.message ||
          "Erro ao carregar.",
      );
      setCarregando(false);
      return;
    }

    setBaixas((b.data || []) as Baixa[]);
    setMovimentos((m.data || []) as Movimento[]);
    setFixas((f.data || []) as Fixa[]);
    setPremiacoesPagas((p.data || []) as PremiacaoPaga[]);
    setCarregando(false);
  }

  useEffect(() => {
    void carregar();
  }, []);

  const dados = useMemo(() => {
    const mov = movimentos.filter((x) => dentro(x.data, inicio, fim));

    const recebido = baixas
      .filter((x) => dentro(x.data_recebimento, inicio, fim))
      .reduce((t, x) => t + Number(x.valor_recebido || 0), 0);

    const entradas = mov
      .filter((x) => x.tipo === "Entrada")
      .reduce((t, x) => t + Number(x.valor || 0), 0);

    const saidasMovimentos = mov
      .filter((x) => x.tipo === "Saída")
      .reduce((t, x) => t + Number(x.valor || 0), 0);

    const premiacoesPeriodo = premiacoesPagas.filter((x) =>
      dentro(x.processado_em, inicio, fim),
    );

    const totalPremiacoes = premiacoesPeriodo.reduce(
      (t, x) => t + Number(x.valor_reais || x.pontos_solicitados || 0),
      0,
    );

    const totalPontosPremiacao = premiacoesPeriodo.reduce(
      (t, x) => t + Number(x.pontos_solicitados || 0),
      0,
    );

    const saidas = saidasMovimentos + totalPremiacoes;

    const pendente = baixas
      .filter((x) => dentro(x.data_prevista_recebimento, inicio, fim))
      .reduce(
        (t, x) =>
          t +
          Math.max(
            Number(x.comissao_prevista || 0) - Number(x.valor_recebido || 0),
            0,
          ),
        0,
      );

    const ci = inicio.slice(0, 7);
    const cf = fim.slice(0, 7);

    const fixasPrev = fixas
      .filter(
        (x) =>
          x.ativo &&
          String(x.inicio_competencia || "0000-00") <= cf &&
          (!x.fim_competencia || String(x.fim_competencia) >= ci),
      )
      .reduce((t, x) => t + Number(x.valor || 0), 0);

    const bancos = new Map<string, { recebido: number; pendente: number }>();
    baixas.forEach((x) => {
      const nome = x.banco || "Não informado";
      const atual = bancos.get(nome) || { recebido: 0, pendente: 0 };
      if (dentro(x.data_recebimento, inicio, fim)) {
        atual.recebido += Number(x.valor_recebido || 0);
      }
      if (dentro(x.data_prevista_recebimento, inicio, fim)) {
        atual.pendente += Math.max(
          Number(x.comissao_prevista || 0) - Number(x.valor_recebido || 0),
          0,
        );
      }
      bancos.set(nome, atual);
    });

    const categorias = new Map<string, number>();
    mov
      .filter((x) => x.tipo === "Saída")
      .forEach((x) => {
        const categoria = x.categoria || "Sem categoria";
        categorias.set(
          categoria,
          (categorias.get(categoria) || 0) + Number(x.valor || 0),
        );
      });

    if (totalPremiacoes > 0) {
      categorias.set(
        "Premiações pagas",
        (categorias.get("Premiações pagas") || 0) + totalPremiacoes,
      );
    }

    const totalEntradas = recebido + entradas;
    const realizado = totalEntradas - saidas;
    const projetado = totalEntradas + pendente - saidas - fixasPrev;

    return {
      recebido: totalEntradas,
      saidas,
      saidasMovimentos,
      totalPremiacoes,
      totalPontosPremiacao,
      quantidadePremiacoes: premiacoesPeriodo.length,
      pendente,
      fixasPrev,
      realizado,
      projetado,
      bancos: [...bancos.entries()]
        .map(([nome, v]) => ({ nome, ...v, total: v.recebido + v.pendente }))
        .filter((x) => x.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 8),
      categorias: [...categorias.entries()]
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 8),
    };
  }, [baixas, movimentos, fixas, premiacoesPagas, inicio, fim]);

  const maxBanco = Math.max(1, ...dados.bancos.map((x) => x.total));
  const maxCat = Math.max(1, ...dados.categorias.map((x) => x.valor));

  return (
    <div className="rf-page">
      <section className="rf-head">
        <div>
          <span>RELATÓRIOS FINANCEIROS</span>
          <h2>Análise do período</h2>
          <p>Veja de onde o dinheiro entrou, para onde saiu e o resultado real da empresa.</p>
        </div>

        <div className="rf-periodo">
          <label>
            De
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </label>
          <label>
            Até
            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </label>
          <button type="button" onClick={() => void carregar()} disabled={carregando}>
            {carregando ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </section>

      {mensagem && <div className="rf-message">{mensagem}</div>}

      <section className="rf-kpis">
        <article>
          <span>Total recebido</span>
          <strong>{moeda(dados.recebido)}</strong>
          <small>Entradas efetivamente realizadas</small>
        </article>
        <article>
          <span>Total pago</span>
          <strong>{moeda(dados.saidas)}</strong>
          <small>Todas as despesas realizadas</small>
        </article>
        <article className={dados.realizado < 0 ? "negative" : "positive"}>
          <span>Resultado realizado</span>
          <strong>{moeda(dados.realizado)}</strong>
          <small>Recebido − tudo que já foi pago</small>
        </article>
        <article className={dados.projetado < 0 ? "negative" : "positive"}>
          <span>Resultado projetado</span>
          <strong>{moeda(dados.projetado)}</strong>
          <small>Considera pendências e despesas previstas</small>
        </article>
      </section>

      <section className="rf-summary">
        <div>
          <span>Outras despesas pagas</span>
          <strong>{moeda(dados.saidasMovimentos)}</strong>
        </div>
        <div>
          <span>Premiações pagas</span>
          <strong>{moeda(dados.totalPremiacoes)}</strong>
          <small>
            {dados.quantidadePremiacoes} pagamento(s) ·{" "}
            {dados.totalPontosPremiacao.toLocaleString("pt-BR")} pts
          </small>
        </div>
        <div>
          <span>Comissões a receber</span>
          <strong>{moeda(dados.pendente)}</strong>
        </div>
        <div>
          <span>Despesas fixas previstas</span>
          <strong>{moeda(dados.fixasPrev)}</strong>
        </div>
      </section>

      <section className="rf-grid">
        <article className="rf-card">
          <header>
            <span>RECEITAS</span>
            <h3>Recebimentos por banco</h3>
          </header>
          <div className="rf-bars">
            {dados.bancos.length === 0 ? (
              <div className="rf-empty">Nenhum recebimento no período.</div>
            ) : (
              dados.bancos.map((x) => (
                <div className="rf-row" key={x.nome}>
                  <div>
                    <strong>{x.nome}</strong>
                    <small>{moeda(x.total)}</small>
                  </div>
                  <div className="rf-track">
                    <i style={{ width: `${(x.total / maxBanco) * 100}%` }} />
                  </div>
                  <p>
                    Recebido {moeda(x.recebido)} · Falta receber {moeda(x.pendente)}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rf-card">
          <header>
            <span>DESPESAS</span>
            <h3>Para onde o dinheiro saiu</h3>
          </header>
          <div className="rf-bars">
            {dados.categorias.length === 0 ? (
              <div className="rf-empty">Nenhuma despesa no período.</div>
            ) : (
              dados.categorias.map((x) => (
                <div className="rf-row" key={x.nome}>
                  <div>
                    <strong>{x.nome}</strong>
                    <small>{moeda(x.valor)}</small>
                  </div>
                  <div className="rf-track expense">
                    <i style={{ width: `${(x.valor / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="rf-result">
        <div>
          <span>FECHAMENTO DO PERÍODO</span>
          <h3>
            {dados.realizado >= 0
              ? "Resultado realizado positivo"
              : "Resultado realizado negativo"}
          </h3>
          <p>
            As premiações marcadas como pagas na Central de Premiação já fazem parte das despesas realizadas.
          </p>
        </div>
        <strong className={dados.realizado < 0 ? "negative-text" : "positive-text"}>
          {moeda(dados.realizado)}
        </strong>
      </section>
    </div>
  );
}
