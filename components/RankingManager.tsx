"use client";

import { useEffect, useMemo, useState } from "react";
import "./ranking.css";

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

type Periodo = "Hoje" | "Semana" | "Mês" | "Todos";

type RankingItem = {
  nome: string;
  contratos: number;
  valorPago: number;
  comissao: number;
  ticketMedio: number;
  pontos: number;
};

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function inicioDoDia(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function inicioDaSemana(data: Date) {
  const atual = inicioDoDia(data);
  const dia = atual.getDay();
  const diferenca = dia === 0 ? -6 : 1 - dia;
  atual.setDate(atual.getDate() + diferenca);
  return atual;
}

function inicioDoMes(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function converterData(valor: string) {
  if (!valor) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
  }

  const parteData = valor.split(",")[0].trim();
  const partes = parteData.split("/").map(Number);

  if (partes.length === 3) {
    return new Date(partes[2], partes[1] - 1, partes[0]);
  }

  return null;
}

function estaNoPeriodo(dataValor: string, periodo: Periodo) {
  if (periodo === "Todos") return true;

  const data = converterData(dataValor);
  if (!data) return false;

  const hoje = new Date();
  const alvo = inicioDoDia(data);

  if (periodo === "Hoje") {
    return alvo.getTime() === inicioDoDia(hoje).getTime();
  }

  if (periodo === "Semana") {
    return alvo >= inicioDaSemana(hoje);
  }

  if (periodo === "Mês") {
    return alvo >= inicioDoMes(hoje);
  }

  return true;
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

export default function RankingManager() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("Mês");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  function carregar() {
    const salvo = localStorage.getItem("somos-eleva-propostas");

    if (!salvo) {
      setPropostas([]);
      return;
    }

    try {
      setPropostas(JSON.parse(salvo));
    } catch {
      setPropostas([]);
    }
  }

  const ranking = useMemo(() => {
    const pagas = propostas.filter(
      (item) =>
        item.status === "Pago" &&
        estaNoPeriodo(item.dataPagamento || item.dataCadastro, periodo)
    );

    const agrupado = new Map<string, RankingItem>();

    pagas.forEach((proposta) => {
      const nome = proposta.vendedora?.trim() || "Sem consultora";
      const atual = agrupado.get(nome) || {
        nome,
        contratos: 0,
        valorPago: 0,
        comissao: 0,
        ticketMedio: 0,
        pontos: 0,
      };

      atual.contratos += 1;
      atual.valorPago += Number(proposta.valorContrato || 0);
      atual.comissao += Number(proposta.comissao || 0);
      atual.pontos += Number(proposta.valorContrato || 0) / 100;

      agrupado.set(nome, atual);
    });

    return Array.from(agrupado.values())
      .map((item) => ({
        ...item,
        ticketMedio:
          item.contratos > 0 ? item.valorPago / item.contratos : 0,
      }))
      .filter((item) =>
        item.nome.toLowerCase().includes(busca.trim().toLowerCase())
      )
      .sort((a, b) => b.valorPago - a.valorPago);
  }, [propostas, periodo, busca]);

  const resumo = useMemo(() => {
    return {
      consultoras: ranking.length,
      contratos: ranking.reduce((total, item) => total + item.contratos, 0),
      valorPago: ranking.reduce((total, item) => total + item.valorPago, 0),
      comissao: ranking.reduce((total, item) => total + item.comissao, 0),
    };
  }, [ranking]);

  const podium = ranking.slice(0, 3);
  const maiorValor = ranking[0]?.valorPago || 1;

  return (
    <div className="ranking-page">
      <section className="ranking-summary">
        <article>
          <span>Consultoras no ranking</span>
          <strong>{resumo.consultoras}</strong>
        </article>
        <article>
          <span>Contratos pagos</span>
          <strong>{resumo.contratos}</strong>
        </article>
        <article>
          <span>Produção total</span>
          <strong>{moeda(resumo.valorPago)}</strong>
        </article>
        <article className="ranking-summary-highlight">
          <span>Comissão gerada</span>
          <strong>{moeda(resumo.comissao)}</strong>
        </article>
      </section>

      <section className="ranking-toolbar">
        <div>
          <span>DESEMPENHO DA EQUIPE</span>
          <h2>Ranking de produção</h2>
          <p>O ranking usa somente contratos com status Pago.</p>
        </div>

        <div className="ranking-filters">
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Pesquisar consultora"
          />

          <select
            value={periodo}
            onChange={(event) => setPeriodo(event.target.value as Periodo)}
          >
            <option>Hoje</option>
            <option>Semana</option>
            <option>Mês</option>
            <option>Todos</option>
          </select>

          <button type="button" onClick={carregar}>
            Atualizar
          </button>
        </div>
      </section>

      {ranking.length === 0 ? (
        <section className="ranking-empty">
          <div>🏆</div>
          <strong>Nenhum contrato pago neste período</strong>
          <p>
            Quando uma proposta for marcada como Pago, ela aparecerá
            automaticamente aqui.
          </p>
        </section>
      ) : (
        <>
          <section className="ranking-podium">
            {podium.map((item, index) => (
              <article
                key={item.nome}
                className={`podium-card podium-${index + 1}`}
              >
                <div className="podium-position">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                </div>

                <div className="podium-avatar">{iniciais(item.nome)}</div>

                <strong className="podium-name">{item.nome}</strong>
                <span className="podium-label">
                  {index === 0 ? "1º lugar" : index === 1 ? "2º lugar" : "3º lugar"}
                </span>

                <div className="podium-value">{moeda(item.valorPago)}</div>

                <div className="podium-details">
                  <div>
                    <span>Contratos</span>
                    <strong>{item.contratos}</strong>
                  </div>
                  <div>
                    <span>Comissão</span>
                    <strong>{moeda(item.comissao)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="ranking-table-card">
            <div className="ranking-table-heading">
              <div>
                <span>CLASSIFICAÇÃO COMPLETA</span>
                <h3>Resultados por consultora</h3>
              </div>

              <b>{periodo}</b>
            </div>

            <div className="ranking-table">
              <div className="ranking-row ranking-head">
                <span>Posição</span>
                <span>Consultora</span>
                <span>Contratos</span>
                <span>Produção</span>
                <span>Ticket médio</span>
                <span>Comissão</span>
                <span>Desempenho</span>
              </div>

              {ranking.map((item, index) => {
                const progresso = Math.max(
                  4,
                  Math.round((item.valorPago / maiorValor) * 100)
                );

                return (
                  <div className="ranking-row" key={item.nome}>
                    <span className="ranking-position">
                      {index + 1}º
                    </span>

                    <div className="ranking-person">
                      <div className="ranking-avatar">{iniciais(item.nome)}</div>
                      <strong>{item.nome}</strong>
                    </div>

                    <strong>{item.contratos}</strong>
                    <strong>{moeda(item.valorPago)}</strong>
                    <span>{moeda(item.ticketMedio)}</span>
                    <span className="ranking-commission">
                      {moeda(item.comissao)}
                    </span>

                    <div className="ranking-progress">
                      <div>
                        <i style={{ width: `${progresso}%` }} />
                      </div>
                      <b>{progresso}%</b>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section className="ranking-help">
        <strong>Atualização automática:</strong>
        <span>
          o ranking lê os contratos pagos do módulo Propostas e da Esteira.
        </span>
      </section>
    </div>
  );
}
