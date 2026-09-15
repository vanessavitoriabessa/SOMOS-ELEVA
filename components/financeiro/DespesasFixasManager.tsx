"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import "./despesas-fixas.css";

type Despesa = {
  id: string;
  nome: string;
  categoria: string;
  fornecedor: string;
  valor: number;
  dia_vencimento: number;
  inicio_competencia: string;
  fim_competencia: string | null;
  ativo: boolean;
};

type Pagamento = {
  id: string;
  despesa_recorrente_id: string;
  competencia: string;
  movimento_id: string | null;
  pago_em: string;
  valor_pago: number;
};

const moeda = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const competenciaAtual = () => new Date().toISOString().slice(0, 7);
const hoje = () => new Date().toISOString().slice(0, 10);

const numero = (v: string) =>
  Number(v.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "") || 0);

function iconeCategoria(categoria: string) {
  const chave = categoria.trim().toLowerCase();
  if (chave === "aluguel") return "🏠";
  if (chave === "sistemas") return "💻";
  if (chave === "internet") return "🌐";
  if (chave === "telefonia") return "📞";
  if (chave === "contabilidade") return "🧾";
  if (chave === "jurídico") return "⚖️";
  if (chave === "tráfego pago") return "📣";
  if (chave === "impostos") return "🏛️";
  if (chave === "parcelamentos") return "💳";
  if (chave === "pró-labore") return "👤";
  return "📌";
}

export default function DespesasFixasManager() {
  const supabase = useMemo(() => createClient(), []);

  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [form, setForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Sistemas");
  const [fornecedor, setFornecedor] = useState("");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("10");
  const [inicio, setInicio] = useState(competenciaAtual());

  const carregar = useCallback(async () => {
    const [d, p] = await Promise.all([
      supabase.from("despesas_recorrentes").select("*").order("dia_vencimento"),
      supabase
        .from("despesas_recorrentes_pagamentos")
        .select("*")
        .eq("competencia", competencia),
    ]);

    if (d.error) {
      setMensagem(d.error.message);
      return;
    }

    if (p.error) {
      setMensagem(p.error.message);
      return;
    }

    setDespesas((d.data || []) as Despesa[]);
    setPagamentos((p.data || []) as Pagamento[]);
  }, [competencia, supabase]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const ativas = useMemo(
    () =>
      despesas.filter(
        (d) =>
          d.ativo &&
          competencia >= d.inicio_competencia &&
          (!d.fim_competencia || competencia <= d.fim_competencia),
      ),
    [despesas, competencia],
  );

  const pagos = new Set(pagamentos.map((p) => p.despesa_recorrente_id));
  const previsto = ativas.reduce((t, d) => t + Number(d.valor || 0), 0);
  const pago = pagamentos.reduce((t, p) => t + Number(p.valor_pago || 0), 0);

  function limparFormulario() {
    setNome("");
    setCategoria("Sistemas");
    setFornecedor("");
    setValor("");
    setDia("10");
    setInicio(competenciaAtual());
    setEditandoId(null);
  }

  function abrirNovaDespesa() {
    if (form && !editandoId) {
      setForm(false);
      limparFormulario();
      return;
    }

    limparFormulario();
    setMensagem("");
    setForm(true);
  }

  function editar(item: Despesa) {
    setEditandoId(item.id);
    setNome(item.nome || "");
    setCategoria(item.categoria || "Sistemas");
    setFornecedor(item.fornecedor || "");
    setValor(
      Number(item.valor || 0)
        .toFixed(2)
        .replace(".", ","),
    );
    setDia(String(item.dia_vencimento || 10));
    setInicio(item.inicio_competencia || competenciaAtual());
    setMensagem("");
    setForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setMensagem("");

    const v = numero(valor);
    const venc = Number(dia);

    if (!nome.trim() || v <= 0 || venc < 1 || venc > 31) {
      setMensagem("Preencha nome, valor e vencimento corretamente.");
      return;
    }

    const dados = {
      nome: nome.trim(),
      categoria,
      fornecedor: fornecedor.trim(),
      valor: v,
      dia_vencimento: venc,
      inicio_competencia: inicio,
      fim_competencia: null,
      ativo: true,
      atualizado_em: new Date().toISOString(),
    };

    if (editandoId) {
      const { error } = await supabase
        .from("despesas_recorrentes")
        .update(dados)
        .eq("id", editandoId);

      if (error) {
        setMensagem(error.message);
        return;
      }

      setMensagem("Despesa fixa atualizada com sucesso.");
    } else {
      const { error } = await supabase
        .from("despesas_recorrentes")
        .insert(dados);

      if (error) {
        setMensagem(error.message);
        return;
      }

      setMensagem("Despesa fixa cadastrada para os próximos meses.");
    }

    limparFormulario();
    setForm(false);
    await carregar();
  }

  async function marcarPago(item: Despesa) {
    if (pagos.has(item.id)) return;

    const data = window.prompt(`Data do pagamento de ${item.nome}:`, hoje());
    if (!data) return;

    const digitado = window.prompt(
      "Valor pago:",
      Number(item.valor).toFixed(2).replace(".", ","),
    );
    if (!digitado) return;

    const v = numero(digitado);
    if (v <= 0) return;

    const { data: sessao } = await supabase.auth.getSession();

    const { data: mov, error: em } = await supabase
      .from("movimentos_financeiros")
      .insert({
        tipo: "Saída",
        produto: "",
        banco: null,
        parceiro: item.fornecedor || null,
        categoria: item.categoria || "Despesa fixa",
        descricao: `${item.nome} — ${competencia}`,
        valor: v,
        data,
        criado_por: sessao.session?.user.id || null,
        atualizado_em: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (em || !mov) {
      setMensagem(em?.message || "Erro ao gerar saída.");
      return;
    }

    const { error: ep } = await supabase
      .from("despesas_recorrentes_pagamentos")
      .insert({
        despesa_recorrente_id: item.id,
        competencia,
        movimento_id: mov.id,
        pago_em: data,
        valor_pago: v,
      });

    if (ep) {
      setMensagem(ep.message);
      return;
    }

    setMensagem(`${item.nome} marcado como pago.`);
    await carregar();
  }

  async function pausar(item: Despesa) {
    const { error } = await supabase
      .from("despesas_recorrentes")
      .update({
        ativo: false,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setMensagem(error.message);
      return;
    }

    if (editandoId === item.id) {
      limparFormulario();
      setForm(false);
    }

    await carregar();
  }

  return (
    <div className="df-page">
      <section className="df-head">
        <div>
          <span>DESPESAS FIXAS</span>
          <h2>Compromissos recorrentes</h2>
          <p>
            Cadastre uma vez e o sistema considera a despesa automaticamente em
            cada mês.
          </p>
        </div>

        <button type="button" onClick={abrirNovaDespesa}>
          {form && !editandoId ? "Fechar" : "+ Nova despesa fixa"}
        </button>
      </section>

      <section className="df-toolbar">
        <label>
          Competência
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
          />
        </label>

        <div className="df-kpis">
          <div>
            <span>Previsto</span>
            <strong>{moeda(previsto)}</strong>
          </div>
          <div>
            <span>Pago</span>
            <strong>{moeda(pago)}</strong>
          </div>
          <div>
            <span>Pendente</span>
            <strong>{moeda(Math.max(previsto - pago, 0))}</strong>
          </div>
        </div>
      </section>

      {form && (
        <form className="df-form" onSubmit={salvar}>
          {editandoId && (
            <div className="df-editing-banner">
              <strong>Editando despesa fixa</strong>
              <span>
                Altere os campos abaixo e clique em “Salvar alterações”.
              </span>
            </div>
          )}

          <label>
            Despesa
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Hyperflow"
            />
          </label>

          <label>
            Categoria
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {[
                "Sistemas",
                "Aluguel",
                "Internet",
                "Telefonia",
                "Contabilidade",
                "Jurídico",
                "Tráfego pago",
                "Impostos",
                "Parcelamentos",
                "Pró-labore",
                "Outros",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>

          <label>
            Fornecedor
            <input
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
            />
          </label>

          <label>
            Valor mensal
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="1.500,00"
            />
          </label>

          <label>
            Vencimento
            <input
              type="number"
              min="1"
              max="31"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
            />
          </label>

          <label>
            Início
            <input
              type="month"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </label>

          <button type="submit">
            {editandoId ? "Salvar alterações" : "Salvar"}
          </button>

          {editandoId && (
            <button
              type="button"
              className="df-cancel-edit"
              onClick={() => {
                limparFormulario();
                setForm(false);
              }}
            >
              Cancelar edição
            </button>
          )}
        </form>
      )}

      {mensagem && <div className="df-message">{mensagem}</div>}

      <section className="df-list df-list-modern">
        <div className="df-list-head">
          <span>Despesa</span>
          <span>Categoria</span>
          <span>Vencimento</span>
          <span>Valor</span>
          <span>Status</span>
          <span>Ações</span>
        </div>

        {ativas.length === 0 ? (
          <div className="df-empty">
            Nenhuma despesa fixa nesta competência.
          </div>
        ) : (
          ativas.map((item) => (
            <article key={item.id} className="df-expense-row">
              <div className="df-expense-name">
                <strong>{item.nome}</strong>
                <small>{item.fornecedor || "Sem fornecedor"}</small>
              </div>

              <div>
                <span className="df-category-pill">
                  <b className="df-category-icon">
                    {iconeCategoria(item.categoria)}
                  </b>
                  {item.categoria}
                </span>
              </div>

              <div className="df-due">
                <span className="df-due-icon" aria-hidden="true">
                  📅
                </span>
                <strong>Dia {item.dia_vencimento}</strong>
              </div>

              <strong className="df-value">{moeda(item.valor)}</strong>

              <span
                className={`df-status ${
                  pagos.has(item.id) ? "pago" : "pendente"
                }`}
              >
                <b>{pagos.has(item.id) ? "✓" : "⌛"}</b>
                {pagos.has(item.id) ? "Pago" : "Pendente"}
              </span>

              <div className="df-actions">
                <button
                  type="button"
                  className="edit"
                  onClick={() => editar(item)}
                >
                  ✎ Editar
                </button>

                {!pagos.has(item.id) && (
                  <button
                    type="button"
                    className="primary"
                    onClick={() => void marcarPago(item)}
                  >
                    Marcar pago
                  </button>
                )}

                <button
                  type="button"
                  className="secondary"
                  onClick={() => void pausar(item)}
                >
                  Ⅱ&nbsp;&nbsp;Pausar
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
