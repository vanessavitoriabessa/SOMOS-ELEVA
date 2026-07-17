"use client";

import { useEffect, useState } from "react";
import "./dashboard.css";

function nomeBonito(valor: string) {
  if (!valor) return "Colaboradora";
  if (valor === "0001") return "Tay";
  const base = valor.includes("@") ? valor.split("@")[0] : valor;
  const nome = base.split(/[._-]/)[0];
  return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
}

export default function DashboardClient() {
  const [nome, setNome] = useState("Tay");

  useEffect(() => {
    const nomeSalvo = localStorage.getItem("somos-eleva-nome");
    const usuario = localStorage.getItem("somos-eleva-usuario") || "0001";
    setNome(nomeSalvo?.trim() || nomeBonito(usuario));
  }, []);

  return (
    <div className="dash-final">
      <section className="dash-welcome">
        <div>
          <h2>Olá, {nome}! 👋</h2>
          <p>Bem-vinda ao SOMOS ELEVA</p>
        </div>
        <button>▦&nbsp;&nbsp; Painel do dia</button>
      </section>

      <section className="dash-banner">
        <img src="/dashboard-banner-final.jpg" alt="" />
        <div className="dash-banner-copy">
          <h3>Somos Eleva,<br />vamos <strong>mais longe!</strong></h3>
          <p>Foco, disciplina e atitude constroem<br />resultados extraordinários.</p>
        </div>
      </section>

      <section className="dash-kpis">
        <article><div className="kpi-icon blue">♙</div><div><span>Propostas hoje</span><strong>23</strong><small>+15% vs ontem ↗</small></div></article>
        <article><div className="kpi-icon green">✓</div><div><span>Aprovadas hoje</span><strong>11</strong><small>+22% vs ontem ↗</small></div></article>
        <article><div className="kpi-icon orange">R$</div><div><span>Valor aprovado hoje</span><strong>R$ 86.540,00</strong><small>+18% vs ontem ↗</small></div></article>
        <article><div className="kpi-icon purple">▥</div><div className="kpi-wide"><span>Meta do mês</span><strong>R$ 350.000,00</strong><div className="kpi-progress"><i></i><b>68%</b></div></div></article>
      </section>

      <section className="dash-grid">
        <article className="dash-panel">
          <div className="dash-panel-head"><h3>Resumo do mês</h3><select><option>Julho/2026</option></select></div>
          <div className="dash-summary">
            <div><span>Propostas</span><strong>312</strong><small>Total do mês</small></div>
            <div><span>Aprovadas</span><strong>156</strong><small>Total do mês</small></div>
            <div><span>Valor aprovado</span><strong>R$ 238.780,00</strong><small>Total do mês</small></div>
            <div><span>Ticket médio</span><strong>R$ 1.531,28</strong><small>Total do mês</small></div>
          </div>
          <div className="dash-chart-title"><b>Desempenho no mês</b><span>— Propostas &nbsp;&nbsp; — Aprovadas &nbsp;&nbsp; — Valor aprovado</span></div>
          <svg className="dash-chart" viewBox="0 0 760 220">
            <g className="grid"><line x1="35" y1="30" x2="740" y2="30"/><line x1="35" y1="75" x2="740" y2="75"/><line x1="35" y1="120" x2="740" y2="120"/><line x1="35" y1="165" x2="740" y2="165"/><line x1="35" y1="205" x2="740" y2="205"/></g>
            <polyline className="p-blue" points="35,195 90,170 145,158 200,170 255,148 310,160 365,132 420,125 475,137 530,110 585,105 640,88 695,78 740,67"/>
            <polyline className="p-green" points="35,204 90,190 145,182 200,189 255,178 310,185 365,164 420,156 475,162 530,146 585,142 640,128 695,118 740,110"/>
            <polyline className="p-orange" points="35,187 90,148 145,128 200,142 255,118 310,135 365,92 420,76 475,88 530,61 585,54 640,34 695,27 740,14"/>
          </svg>
          <button className="dash-report">Ver relatório completo →</button>
        </article>

        <article className="dash-panel">
          <div className="dash-panel-head"><h3>Atividades recentes</h3><button>Ver todas</button></div>
          <ul className="dash-activity">
            <li><i className="ok">✓</i><div><strong>Proposta aprovada</strong><span>Cliente: João da Silva</span></div><time>08:34</time></li>
            <li><i className="doc">▤</i><div><strong>Nova proposta cadastrada</strong><span>Cliente: Maria Aparecida</span></div><time>08:21</time></li>
            <li><i className="money">R$</i><div><strong>Simulação realizada</strong><span>Valor: R$ 800,00 de parcela</span></div><time>08:15</time></li>
            <li><i className="user">+</i><div><strong>Novo cliente cadastrado</strong><span>Cliente: Carlos Eduardo</span></div><time>08:10</time></li>
            <li><i className="ok">✓</i><div><strong>Proposta aprovada</strong><span>Cliente: Ana Paula Lima</span></div><time>07:58</time></li>
          </ul>
        </article>
      </section>
    </div>
  );
}
