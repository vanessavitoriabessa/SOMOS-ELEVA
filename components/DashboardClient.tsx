"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Proposta = {
  id: string;
  numero: string;
  cliente: string;
  cpf: string;
  produto: "Compra de Dívida" | "CLT";
  valorLiquido: number;
  consultora: string;
  status: "Digitado" | "Aguardando pagamento" | "Pago" | "Cancelado";
  dataDigitacao: string;
};

type Cliente = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  vendedora: string;
  produto: "Compra de Dívida" | "CLT";
  status: string;
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function DashboardClient() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clt, setClt] = useState<Array<{ consultora: string; producao: number; status: string }>>([]);

  useEffect(() => {
    const propostasSalvas = localStorage.getItem("somos-eleva-propostas");
    const clientesSalvos = localStorage.getItem("somos-eleva-clientes");

    if (propostasSalvas) setPropostas(JSON.parse(propostasSalvas));
    if (clientesSalvos) setClientes(JSON.parse(clientesSalvos));
    const cltSalvo = localStorage.getItem("somos-eleva-clt");
    if (cltSalvo) setClt(JSON.parse(cltSalvo));
  }, []);

  const resumo = useMemo(() => {
    const pagas = propostas.filter((p) => p.status === "Pago");
    const totalPago = pagas.reduce((soma, p) => soma + Number(p.valorLiquido || 0), 0);
    const compra = pagas
      .filter((p) => p.produto === "Compra de Dívida")
      .reduce((soma, p) => soma + Number(p.valorLiquido || 0), 0);
    const cltPropostas = pagas
      .filter((p) => p.produto === "CLT")
      .reduce((soma, p) => soma + Number(p.valorLiquido || 0), 0);
    const cltMensal = clt
      .filter((item) => item.status !== "PENDENTE")
      .reduce((soma, item) => soma + Number(item.producao || 0), 0);
    const cltTotal = cltPropostas + cltMensal;

    const hoje = new Date().toISOString().slice(0, 10);
    const pagoHoje = pagas
      .filter((p) => p.dataDigitacao === hoje)
      .reduce((soma, p) => soma + Number(p.valorLiquido || 0), 0);

    const rankingMap = new Map<string, number>();
    pagas.forEach((p) => {
      const nome = p.consultora || "Sem consultora";
      rankingMap.set(nome, (rankingMap.get(nome) || 0) + Number(p.valorLiquido || 0));
    });
    clt.forEach((item) => {
      if (item.status === "PENDENTE") return;
      const nome = item.consultora || "Sem consultora";
      rankingMap.set(nome, (rankingMap.get(nome) || 0) + Number(item.producao || 0));
    });

    const ranking = [...rankingMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return { totalPago: totalPago + cltMensal, compra, clt: cltTotal, pagoHoje, ranking };
  }, [propostas, clt]);

  const meta = 1800000;
  const percentualMeta = Math.min(100, Math.round((resumo.totalPago / meta) * 100));
  const falta = Math.max(0, meta - resumo.totalPago);

  const stats = [
    { label: "Produção hoje", value: moeda(resumo.pagoHoje), detail: `${propostas.length} propostas`, icon: "📈" },
    { label: "Produção no mês", value: moeda(resumo.totalPago), detail: `${clientes.length} clientes`, icon: "💰" },
    { label: "Compra de Dívida", value: moeda(resumo.compra), detail: `${resumo.totalPago ? Math.round(resumo.compra / resumo.totalPago * 100) : 0}% do total`, icon: "💳" },
    { label: "CLT", value: moeda(resumo.clt), detail: `${resumo.totalPago ? Math.round(resumo.clt / resumo.totalPago * 100) : 0}% do total`, icon: "💼" },
  ];

  return (
    <main className="page-content">
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">SOMOS ELEVA</span>
          <h2>Olá, Tay! 👋</h2>
          <p>Agora o dashboard usa os clientes e as propostas cadastradas no sistema.</p>
        </div>
        <Link className="primary-button" href="/propostas">+ Nova proposta</Link>
      </section>

      <section className="stats-grid">
        {stats.map((item) => (
          <article className="stat-card" key={item.label}>
            <div className="stat-card-top">
              <span className="stat-icon">{item.icon}</span>
              <span className="stat-detail">{item.detail}</span>
            </div>
            <span className="stat-label">{item.label}</span>
            <strong className="stat-value">{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">DESEMPENHO</span>
              <h3>Propostas por status</h3>
            </div>
          </div>

          <div className="status-summary">
            {["Digitado", "Aguardando pagamento", "Pago", "Cancelado"].map((status) => {
              const quantidade = propostas.filter((p) => p.status === status).length;
              return (
                <div className="status-box" key={status}>
                  <span>{status}</span>
                  <strong>{quantidade}</strong>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">META DA EMPRESA</span>
              <h3>Progresso mensal</h3>
            </div>
            <strong className="goal-percentage">{percentualMeta}%</strong>
          </div>

          <div
            className="goal-circle"
            style={{
              background: `conic-gradient(var(--blue) 0 ${percentualMeta}%, #edf1f5 ${percentualMeta}% 100%)`,
            }}
          >
            <div>
              <strong>{moeda(resumo.totalPago)}</strong>
              <span>de {moeda(meta)}</span>
            </div>
          </div>

          <div className="goal-details">
            <span>Faltam</span>
            <strong>{moeda(falta)}</strong>
          </div>
        </article>
      </section>

      <section className="dashboard-grid bottom-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">EQUIPE</span>
              <h3>Ranking das consultoras</h3>
            </div>
          </div>

          <div className="ranking-list">
            {resumo.ranking.length === 0 ? (
              <p className="empty-text">Cadastre propostas pagas para gerar o ranking.</p>
            ) : (
              resumo.ranking.map(([nome, valor], index) => {
                const maior = resumo.ranking[0][1] || 1;
                const progresso = Math.round((valor / maior) * 100);
                return (
                  <div className="ranking-item" key={nome}>
                    <div className="rank-position">
                      {index < 3 ? ["🥇", "🥈", "🥉"][index] : index + 1}
                    </div>
                    <div className="ranking-person">
                      <strong>{nome}</strong>
                      <div className="mini-progress">
                        <span style={{ width: `${progresso}%` }} />
                      </div>
                    </div>
                    <strong>{moeda(valor)}</strong>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">ACESSO RÁPIDO</span>
              <h3>Atalhos</h3>
            </div>
          </div>
          <div className="quick-grid">
            <Link className="quick-card" href="/clientes"><span>👤</span><div><strong>Novo cliente</strong><small>Cadastre um cliente</small></div><b>›</b></Link>
            <Link className="quick-card" href="/propostas"><span>📄</span><div><strong>Nova proposta</strong><small>Registre uma operação</small></div><b>›</b></Link>
            <Link className="quick-card" href="/baixas"><span>💰</span><div><strong>Baixa de pagamento</strong><small>Localize uma proposta</small></div><b>›</b></Link>
          </div>
        </article>
      </section>
    </main>
  );
}
