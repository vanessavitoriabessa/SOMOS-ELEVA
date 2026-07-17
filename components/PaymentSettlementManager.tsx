"use client";

import { useEffect, useMemo, useState } from "react";
import "./baixas.css";

type Proposta = {
  id: string;
  cliente: string;
  cpf: string;
  telefone: string;
  vendedora: string;
  banco: string;
  tabela: string;
  valorContrato: number;
  percentualTabela: number;
  comissao: number;
  status: string;
  dataCadastro: string;
  dataPagamento: string;
  observacao: string;
};

const PERCENTUAIS = [1, 2, 3.25, 5, 7, 10, 16.5, 20.5, 24.5, 28.5];

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function apenasNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function PaymentSettlementManager() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [busca, setBusca] = useState("");
  const [selecionadaId, setSelecionadaId] = useState("");
  const [percentual, setPercentual] = useState("3,25");
  const [dataPagamento, setDataPagamento] = useState(hojeIso());
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  function carregar() {
    try {
      setPropostas(JSON.parse(localStorage.getItem("somos-eleva-propostas") || "[]"));
    } catch {
      setPropostas([]);
    }
  }

  function persistir(lista: Proposta[]) {
    setPropostas(lista);
    localStorage.setItem("somos-eleva-propostas", JSON.stringify(lista));
  }

  const pendentes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const numerico = apenasNumeros(busca);

    return propostas
      .filter((item) => item.status !== "Pago" && item.status !== "Cancelado")
      .filter(
        (item) =>
          !termo ||
          item.cliente.toLowerCase().includes(termo) ||
          item.cpf.includes(numerico) ||
          item.vendedora.toLowerCase().includes(termo) ||
          item.banco.toLowerCase().includes(termo)
      );
  }, [propostas, busca]);

  const pagas = useMemo(
    () =>
      propostas
        .filter((item) => item.status === "Pago")
        .sort((a, b) => (b.dataPagamento || "").localeCompare(a.dataPagamento || "")),
    [propostas]
  );

  const selecionada = propostas.find((item) => item.id === selecionadaId) || null;
  const percentualNumero = Number(percentual.replace(",", ".")) || 0;
  const comissaoPrevista = selecionada
    ? selecionada.valorContrato * (percentualNumero / 100)
    : 0;

  const resumo = useMemo(() => {
    const valorPago = pagas.reduce((total, item) => total + Number(item.valorContrato || 0), 0);
    const comissoes = pagas.reduce((total, item) => total + Number(item.comissao || 0), 0);

    return {
      pendentes: propostas.filter(
        (item) => item.status !== "Pago" && item.status !== "Cancelado"
      ).length,
      pagas: pagas.length,
      valorPago,
      comissoes,
    };
  }, [propostas, pagas]);

  function darBaixa() {
    setMensagem("");

    if (!selecionada) {
      setMensagem("Selecione um contrato para dar baixa.");
      return;
    }

    if (percentualNumero <= 0) {
      setMensagem("Informe um percentual maior que zero.");
      return;
    }

    const atualizadas = propostas.map((item) =>
      item.id === selecionada.id
        ? {
            ...item,
            status: "Pago",
            percentualTabela: percentualNumero,
            comissao: item.valorContrato * (percentualNumero / 100),
            dataPagamento,
          }
        : item
    );

    persistir(atualizadas);
    setMensagem(
      `Pagamento baixado. Comissão calculada: ${moeda(
        selecionada.valorContrato * (percentualNumero / 100)
      )}.`
    );
    setSelecionadaId("");
  }

  function desfazerBaixa(id: string) {
    if (!window.confirm("Deseja desfazer a baixa deste contrato?")) return;

    const atualizadas = propostas.map((item) =>
      item.id === id
        ? {
            ...item,
            status: "Em andamento",
            percentualTabela: 0,
            comissao: 0,
            dataPagamento: "",
          }
        : item
    );

    persistir(atualizadas);
    setMensagem("Baixa desfeita. O contrato voltou para Em andamento.");
  }

  return (
    <div className="settlement-page">
      <section className="settlement-summary">
        <article>
          <span>Contratos pendentes</span>
          <strong>{resumo.pendentes}</strong>
        </article>
        <article>
          <span>Contratos pagos</span>
          <strong>{resumo.pagas}</strong>
        </article>
        <article>
          <span>Valor pago</span>
          <strong>{moeda(resumo.valorPago)}</strong>
        </article>
        <article className="settlement-highlight">
          <span>Comissão gerada</span>
          <strong>{moeda(resumo.comissoes)}</strong>
        </article>
      </section>

      <section className="settlement-grid">
        <section className="settlement-card">
          <div className="settlement-heading">
            <div>
              <span>LOCALIZAR CONTRATO</span>
              <h2>Selecionar proposta</h2>
              <p>Pesquise por cliente, CPF, banco ou consultora.</p>
            </div>
            <b>⌕</b>
          </div>

          <input
            className="settlement-search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Digite para pesquisar"
          />

          <div className="settlement-pending-list">
            {pendentes.length === 0 ? (
              <div className="settlement-empty">
                <strong>Nenhum contrato pendente</strong>
                <p>Cadastre uma proposta ou altere os filtros.</p>
              </div>
            ) : (
              pendentes.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={selecionadaId === item.id ? "selected" : ""}
                  onClick={() => setSelecionadaId(item.id)}
                >
                  <div>
                    <strong>{item.cliente}</strong>
                    <span>
                      {item.banco || "Banco não informado"}
                      {item.tabela ? ` • ${item.tabela}` : ""}
                    </span>
                  </div>

                  <div>
                    <strong>{moeda(item.valorContrato)}</strong>
                    <span>{item.vendedora || "Sem consultora"}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="settlement-card">
          <div className="settlement-heading">
            <div>
              <span>BAIXA DO PAGAMENTO</span>
              <h2>Confirmar contrato pago</h2>
              <p>Informe a porcentagem da tabela para calcular a comissão.</p>
            </div>
            <b>✓</b>
          </div>

          {!selecionada ? (
            <div className="settlement-no-selection">
              <div>▤</div>
              <strong>Nenhum contrato selecionado</strong>
              <p>Escolha uma proposta na lista ao lado.</p>
            </div>
          ) : (
            <>
              <section className="settlement-selected">
                <div>
                  <span>Cliente</span>
                  <strong>{selecionada.cliente}</strong>
                </div>
                <div>
                  <span>Consultora</span>
                  <strong>{selecionada.vendedora || "Não informada"}</strong>
                </div>
                <div>
                  <span>Banco/Tabela</span>
                  <strong>
                    {selecionada.banco || "—"}
                    {selecionada.tabela ? ` • ${selecionada.tabela}` : ""}
                  </strong>
                </div>
                <div>
                  <span>Valor do contrato</span>
                  <strong>{moeda(selecionada.valorContrato)}</strong>
                </div>
              </section>

              <div className="settlement-form-grid">
                <label>
                  Porcentagem da tabela
                  <select
                    value={percentual}
                    onChange={(event) => setPercentual(event.target.value)}
                  >
                    {PERCENTUAIS.map((item) => (
                      <option key={item} value={String(item).replace(".", ",")}>
                        {String(item).replace(".", ",")}%
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Digitar outra porcentagem
                  <input
                    value={percentual}
                    onChange={(event) => setPercentual(event.target.value)}
                    placeholder="Ex.: 3,25"
                    inputMode="decimal"
                  />
                </label>

                <label>
                  Data do pagamento
                  <input
                    type="date"
                    value={dataPagamento}
                    onChange={(event) => setDataPagamento(event.target.value)}
                  />
                </label>
              </div>

              <section className="settlement-calculation">
                <div>
                  <span>Contrato</span>
                  <strong>{moeda(selecionada.valorContrato)}</strong>
                </div>
                <b>×</b>
                <div>
                  <span>Percentual</span>
                  <strong>{percentualNumero.toFixed(2).replace(".", ",")}%</strong>
                </div>
                <b>=</b>
                <div className="settlement-result">
                  <span>Comissão</span>
                  <strong>{moeda(comissaoPrevista)}</strong>
                </div>
              </section>

              <button className="settlement-confirm" onClick={darBaixa}>
                Confirmar pagamento
              </button>
            </>
          )}

          {mensagem && <div className="settlement-message">{mensagem}</div>}
        </section>
      </section>

      <section className="settlement-card paid-history">
        <div className="settlement-list-heading">
          <div>
            <span>HISTÓRICO DE BAIXAS</span>
            <h2>Contratos pagos</h2>
          </div>
          <b>{pagas.length}</b>
        </div>

        {pagas.length === 0 ? (
          <div className="paid-history-empty">Nenhum contrato pago.</div>
        ) : (
          <div className="paid-history-table">
            <div className="paid-history-row paid-history-head">
              <span>Cliente</span>
              <span>Consultora</span>
              <span>Banco/Tabela</span>
              <span>Contrato</span>
              <span>Percentual</span>
              <span>Comissão</span>
              <span>Data</span>
              <span>Ação</span>
            </div>

            {pagas.map((item) => (
              <div className="paid-history-row" key={item.id}>
                <strong>{item.cliente}</strong>
                <span>{item.vendedora || "Não informada"}</span>
                <span>
                  {item.banco || "—"}
                  {item.tabela ? ` • ${item.tabela}` : ""}
                </span>
                <strong>{moeda(item.valorContrato)}</strong>
                <span>{String(item.percentualTabela || 0).replace(".", ",")}%</span>
                <strong className="settlement-commission">
                  {moeda(item.comissao)}
                </strong>
                <span>{item.dataPagamento || "—"}</span>
                <button onClick={() => desfazerBaixa(item.id)}>Desfazer</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="settlement-help">
        <strong>Integração automática:</strong>
        <span>
          ao confirmar o pagamento, a proposta é atualizada e passa a aparecer no
          Ranking e no Financeiro.
        </span>
      </section>
    </div>
  );
}
