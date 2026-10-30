"use client";
// ELEVA | FINANCEIRO — RECEBIMENTOS COMPRA + CLT | 29/10/2026 | ARQUIVO COMPLETO

import { useState } from "react";
import AppShell from "@/components/AppShell";
import BaixasManager from "@/components/BaixasManager";
import RecebimentosCltManager from "@/components/financeiro/RecebimentosCltManager";
import FinancialManager from "@/components/financeiro/FinancialManager";
import FinanceiroResumo from "@/components/financeiro/FinanceiroResumo";
import DespesasFixasManager from "@/components/financeiro/DespesasFixasManager";
import RelatoriosFinanceiros from "@/components/financeiro/RelatoriosFinanceiros";
import FiscalControls from "@/components/financeiro/FiscalControls";
import "@/components/financeiro/financeiro-unificado-final.css";
import CustoPorOperadorManager from "@/components/financeiro/CustoPorOperadorManager";
import PremiacaoManagerV3 from "@/components/minha-premiacao/PremiacaoManagerV3";

type Aba =
  | "visao-geral"
  | "recebimentos-compra"
  | "recebimentos-clt"
  | "movimentacoes"
  | "despesas-fixas"
  | "folha"
  | "premiacoes-pagas"
  | "controle-notas"
  | "simples-nacional"
  | "inss-fgts"
  | "custo-operador"
  | "lucro-operador"
  | "relatorios";

export default function FinanceiroPage() {
  const [aba, setAba] = useState<Aba>("visao-geral");

  const abas: Array<{ id: Aba; label: string }> = [
    { id: "visao-geral", label: "Visão Geral" },
    { id: "recebimentos-compra", label: "Recebimentos Compra de Dívida" },
    { id: "recebimentos-clt", label: "Recebimentos CLT" },
    { id: "movimentacoes", label: "Movimentações" },
    { id: "despesas-fixas", label: "Despesas Fixas" },
    { id: "folha", label: "Folha" },
    { id: "premiacoes-pagas", label: "Premiações Pagas" },
    { id: "controle-notas", label: "Controle de Notas" },
    { id: "simples-nacional", label: "Imposto Simples Nacional" },
    { id: "inss-fgts", label: "Imposto INSS e FGTS" },
    { id: "custo-operador", label: "Custo por Operador" },
    { id: "lucro-operador", label: "Lucro por Operador" },
    { id: "relatorios", label: "Relatórios" },
  ];

  return (
    <AppShell
      title="Financeiro"
      subtitle="Controle de recebimentos, despesas, movimentações e folha."
    >
      <div className="financeiro-unico-final eleva-financeiro-layout-v1">
        <div className="eleva-financeiro-navegacao-v1">
        <nav className="financeiro-unico-tabs" aria-label="Seções do Financeiro">
          {abas.map((item) => (
            <button
              key={item.id}
              type="button"
              className={aba === item.id ? "active" : ""}
              aria-current={aba === item.id ? "page" : undefined}
              onClick={() => setAba(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        </div>

        {aba === "visao-geral" && (
          <div className="eleva-financeiro-overview-v1">
          <FinanceiroResumo
            onNavigate={(destino: any) => {
              if (
                destino === "a-receber" ||
                destino === "recebidos"
              ) {
                setAba("recebimentos-compra");
              } else if (destino === "movimentacoes") {
                setAba("movimentacoes");
              } else if (destino === "folha") {
                setAba("folha");
              } else if (
                destino === "premiacoes" ||
                destino === "premiacoes-pagas"
              ) {
                setAba("premiacoes-pagas");
              } else if (destino === "relatorios") {
                setAba("relatorios");
              }
            }}
          />
          </div>
        )}

        {aba === "recebimentos-compra" && (
          <BaixasManager modoInicial="A_RECEBER" compacto />
        )}

        {aba === "recebimentos-clt" && (
          <RecebimentosCltManager />
        )}

        {aba === "movimentacoes" && (
          <FinancialManager
            abaExterna="movimentacoes"
            ocultarCabecalho
            ocultarAbas
          />
        )}

        {aba === "despesas-fixas" && (
          <DespesasFixasManager />
        )}

        {aba === "folha" && (
          <FinancialManager
            abaExterna="folha"
            ocultarCabecalho
            ocultarAbas
          />
        )}

        {aba === "premiacoes-pagas" && (
          <FinancialManager
            abaExterna="premiacoes"
            ocultarCabecalho
            ocultarAbas
          />
        )}

        {aba === "controle-notas" && (
          <FiscalControls abaInicial="notas" ocultarAbasPrincipais />
        )}

        {aba === "simples-nacional" && (
          <FiscalControls abaInicial="simples" ocultarAbasPrincipais />
        )}

        {aba === "inss-fgts" && (
          <FiscalControls abaInicial="inss" ocultarAbasPrincipais />
        )}
        {aba === "custo-operador" && (
          <CustoPorOperadorManager />
        )}

        {aba === "lucro-operador" && (
          <PremiacaoManagerV3 modo="lucro-operador" />
        )}

        {aba === "relatorios" && (
          <RelatoriosFinanceiros />
        )}
        <style>{ESTILOS_LAYOUT_FINANCEIRO}</style>
      </div>
    </AppShell>
  );
}

// Estilos locais ao Financeiro. Não depende de um novo arquivo CSS.
const ESTILOS_LAYOUT_FINANCEIRO = `
/* ELEVA — ajuste visual restrito ao menu Financeiro e à Visão Geral.
   Não altera consultas, valores, fórmulas nem os componentes das outras abas. */
.financeiro-unico-final.eleva-financeiro-layout-v1 {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  gap: 16px;
  box-sizing: border-box;
}
.eleva-financeiro-layout-v1 .eleva-financeiro-navegacao-v1 {
  container-name: elevaFinanceiroMenu;
  container-type: inline-size;
  min-width: 0;
  width: 100%;
}
.eleva-financeiro-layout-v1 .eleva-financeiro-navegacao-v1 > .financeiro-unico-tabs {
  display: grid !important;
  grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  grid-auto-rows: minmax(52px, auto) !important;
  gap: 6px !important;
  align-items: stretch !important;
  justify-content: stretch !important;
  width: 100% !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 6px !important;
  box-sizing: border-box !important;
  overflow: visible !important;
  background: #f7f9fd !important;
  border: 1px solid #dbe5f2 !important;
  border-radius: 16px !important;
  box-shadow: 0 4px 16px rgba(16, 45, 87, 0.035) !important;
}
.eleva-financeiro-layout-v1 .eleva-financeiro-navegacao-v1 > .financeiro-unico-tabs > button {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 52px !important;
  height: auto !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 8px 7px !important;
  box-sizing: border-box !important;
  border: 1px solid #dce5f2 !important;
  border-radius: 11px !important;
  background: #ffffff !important;
  color: #17365d !important;
  font-family: inherit !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  line-height: 1.3 !important;
  letter-spacing: 0 !important;
  text-align: center !important;
  text-transform: uppercase !important;
  white-space: normal !important;
  overflow: visible !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
  text-overflow: clip !important;
  cursor: pointer !important;
  transform: none !important;
  box-shadow: none !important;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease !important;
}
.eleva-financeiro-layout-v1 .eleva-financeiro-navegacao-v1 > .financeiro-unico-tabs > button:hover:not(.active) {
  background: #edf4ff !important;
  border-color: #b8cef6 !important;
  color: #155eef !important;
}
.eleva-financeiro-layout-v1 .eleva-financeiro-navegacao-v1 > .financeiro-unico-tabs > button.active {
  color: #ffffff !important;
  border-color: #1768f2 !important;
  background: #1f66ed !important;
  box-shadow: 0 4px 12px rgba(31, 102, 237, 0.16) !important;
}
.eleva-financeiro-layout-v1 .eleva-financeiro-navegacao-v1 > .financeiro-unico-tabs > button:focus-visible,
.eleva-financeiro-overview-v1 button:focus-visible,
.eleva-financeiro-overview-v1 input:focus-visible {
  outline: 3px solid #f59a45 !important;
  outline-offset: 2px !important;
}
@container elevaFinanceiroMenu (min-width: 1240px) {
  .eleva-financeiro-layout-v1 .eleva-financeiro-navegacao-v1 > .financeiro-unico-tabs {
    grid-template-columns: minmax(0,.72fr) minmax(0,1.28fr) minmax(0,.92fr) minmax(0,1fr) minmax(0,.92fr) minmax(0,.68fr) minmax(0,1.02fr) minmax(0,.98fr) minmax(0,1.18fr) minmax(0,1.16fr) minmax(0,1.05fr) minmax(0,1.05fr) minmax(0,.78fr) !important;
  }
  .eleva-financeiro-layout-v1 .eleva-financeiro-navegacao-v1 > .financeiro-unico-tabs > button {
    font-size: 10.5px !important;
    padding: 8px 5px !important;
  }
}
@container elevaFinanceiroMenu (max-width: 759px) {
  .eleva-financeiro-layout-v1 .eleva-financeiro-navegacao-v1 > .financeiro-unico-tabs {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
}
@container elevaFinanceiroMenu (max-width: 459px) {
  .eleva-financeiro-layout-v1 .eleva-financeiro-navegacao-v1 > .financeiro-unico-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

/* Este contêiner só existe na Visão Geral. Custo PA, Lucro por Operador,
   relatórios e os respectivos modais não recebem estes estilos. */
.eleva-financeiro-overview-v1 {
  width: 100%;
  min-width: 0;
  container-name: elevaFinanceiroResumo;
  container-type: inline-size;
}
.eleva-financeiro-overview-v1 .fin-home {
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
  width: 100% !important;
  min-width: 0 !important;
  margin: 0 !important;
}
.eleva-financeiro-overview-v1 .fin-home > section,
.eleva-financeiro-overview-v1 .fin-home article,
.eleva-financeiro-overview-v1 .fin-home aside {
  min-width: 0;
  box-sizing: border-box;
}
.eleva-financeiro-overview-v1 .fin-home-top.modern {
  display: grid !important;
  grid-template-columns: minmax(220px, 1fr) auto !important;
  align-items: center !important;
  gap: 20px !important;
  padding: 24px !important;
  margin: 0 !important;
  border: 1px solid #dce5f2 !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  box-shadow: none !important;
}
.eleva-financeiro-overview-v1 .fin-home-top.modern h2 {
  margin: 6px 0 0 !important;
  color: #102d57 !important;
  font-size: 27px !important;
  line-height: 1.25 !important;
  letter-spacing: -.5px !important;
}
.eleva-financeiro-overview-v1 .fin-home-top.modern p {
  margin: 7px 0 0 !important;
  color: #71809a !important;
  font-size: 12px !important;
  line-height: 1.5 !important;
}
.eleva-financeiro-overview-v1 .fin-top-actions.fin-period-control {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-end !important;
  flex-wrap: wrap !important;
  gap: 14px !important;
  min-width: 0 !important;
}
.eleva-financeiro-overview-v1 .fin-period-buttons {
  display: flex !important;
  align-items: stretch !important;
  gap: 4px !important;
  padding: 4px !important;
  border: 1px solid #dce5f2 !important;
  border-radius: 12px !important;
  background: #f6f8fc !important;
}
.eleva-financeiro-overview-v1 .fin-period-buttons > button {
  width: auto !important;
  min-width: 0 !important;
  min-height: 40px !important;
  padding: 0 14px !important;
  border: 1px solid transparent !important;
  border-radius: 8px !important;
  font-size: 11px !important;
  line-height: 1.3 !important;
  font-weight: 800 !important;
  box-shadow: none !important;
}
.eleva-financeiro-overview-v1 .fin-period-buttons > button:not(.active) {
  background: transparent !important;
  color: #536784 !important;
}
.eleva-financeiro-overview-v1 .fin-period-buttons > button.active {
  background: #155eef !important;
  color: #ffffff !important;
}
.eleva-financeiro-overview-v1 .fin-period-label {
  min-width: 136px !important;
  text-align: right !important;
}
.eleva-financeiro-overview-v1 .fin-period-label small {
  display: block !important;
  color: #7b8ba3 !important;
  font-size: 10px !important;
}
.eleva-financeiro-overview-v1 .fin-period-label strong {
  display: block !important;
  margin-top: 5px !important;
  color: #17365d !important;
  font-size: 13px !important;
  line-height: 1.4 !important;
}
.eleva-financeiro-overview-v1 .fin-update-button {
  min-height: 44px !important;
  padding: 0 18px !important;
  border-radius: 10px !important;
  font-size: 11px !important;
}
.eleva-financeiro-overview-v1 .fin-custom-dates {
  display: flex !important;
  gap: 10px !important;
  flex-wrap: wrap !important;
  min-width: 0 !important;
}
.eleva-financeiro-overview-v1 .fin-custom-dates label {
  min-width: 0 !important;
  font-size: 10px !important;
}
.eleva-financeiro-overview-v1 .fin-custom-dates input {
  min-width: 0 !important;
  width: 150px !important;
  min-height: 42px !important;
  box-sizing: border-box !important;
  font-size: 12px !important;
}

/* Quatro indicadores principais. Valores e ações continuam vindo do componente. */
.eleva-financeiro-overview-v1 .fin-home-kpis.modern {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 14px !important;
  margin: 0 !important;
}
.eleva-financeiro-overview-v1 .fin-home-kpis.modern > article {
  min-height: 122px !important;
  padding: 19px 20px !important;
  border-radius: 16px !important;
  box-shadow: none !important;
}
.eleva-financeiro-overview-v1 .fin-home-kpis.modern > article > span {
  display: block !important;
  font-size: 12px !important;
  line-height: 1.4 !important;
}
.eleva-financeiro-overview-v1 .fin-home-kpis.modern > article > strong {
  display: block !important;
  margin-top: 10px !important;
  font-size: clamp(21px, 2.2cqw, 29px) !important;
  line-height: 1.25 !important;
  letter-spacing: -.5px !important;
  overflow-wrap: anywhere;
}
.eleva-financeiro-overview-v1 .fin-home-kpis.modern > article > small {
  display: block !important;
  margin-top: 8px !important;
  font-size: 10.5px !important;
  line-height: 1.5 !important;
}

/* O resumo antigo inclui um terceiro artigo sem formatação (Custo PA).
   Apenas na faixa imediatamente depois dos quatro indicadores, oculta-se
   o primeiro artigo SE há exatamente três. Os dois artigos restantes são
   "Outras despesas pagas" e "Premiações pagas", conforme a fonte conferida.
   Não altera o cálculo; a aba Custo por Operador continua disponível. */
.eleva-financeiro-overview-v1 .fin-home > .fin-home-kpis + section:not([class]) {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 14px !important;
  margin: 0 !important;
}
.eleva-financeiro-overview-v1 .fin-home > .fin-home-kpis + section:not([class]) > article:first-child:nth-last-child(3) {
  display: none !important;
}
.eleva-financeiro-overview-v1 .fin-home > .fin-home-kpis + section:not([class]) > article {
  min-height: 98px !important;
  padding: 17px 20px !important;
  border-radius: 15px !important;
  box-shadow: none !important;
}
.eleva-financeiro-overview-v1 .fin-home > .fin-home-kpis + section:not([class]) > article > span {
  display: block !important;
  font-size: 11px !important;
  line-height: 1.4 !important;
}
.eleva-financeiro-overview-v1 .fin-home > .fin-home-kpis + section:not([class]) > article > strong {
  display: block !important;
  margin-top: 7px !important;
  font-size: 23px !important;
  line-height: 1.25 !important;
}
.eleva-financeiro-overview-v1 .fin-home > .fin-home-kpis + section:not([class]) > article > small {
  display: block !important;
  margin-top: 6px !important;
  font-size: 10.5px !important;
  line-height: 1.5 !important;
}
.eleva-financeiro-overview-v1 .fin-modern-grid {
  display: grid !important;
  grid-template-columns: minmax(0, 1.8fr) minmax(310px, 1fr) !important;
  align-items: start !important;
  gap: 14px !important;
  margin: 0 !important;
}
.eleva-financeiro-overview-v1 .fin-chart-card,
.eleva-financeiro-overview-v1 .fin-commitments-card {
  border-radius: 17px !important;
  box-shadow: none !important;
}
.eleva-financeiro-overview-v1 .fin-chart-card > header,
.eleva-financeiro-overview-v1 .fin-commitments-card > header {
  padding: 20px 20px 12px !important;
  gap: 14px !important;
  flex-wrap: wrap !important;
}
.eleva-financeiro-overview-v1 .fin-chart-card h3,
.eleva-financeiro-overview-v1 .fin-commitments-card h3 {
  font-size: 21px !important;
  line-height: 1.3 !important;
}
.eleva-financeiro-overview-v1 .fin-chart-card .fin-bars {
  gap: 8px !important;
  padding-left: 16px !important;
  padding-right: 16px !important;
}
.eleva-financeiro-overview-v1 .fin-chart-card .fin-bar-group {
  min-width: 0 !important;
}
.eleva-financeiro-overview-v1 .fin-chart-card .fin-bar {
  width: clamp(10px, 2cqw, 22px) !important;
}
.eleva-financeiro-overview-v1 .fin-chart-summary {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 10px !important;
  padding: 12px 16px 18px !important;
}
.eleva-financeiro-overview-v1 .fin-chart-summary > div {
  min-width: 0 !important;
  padding: 10px 8px !important;
}
.eleva-financeiro-overview-v1 .fin-chart-summary strong {
  font-size: 17px !important;
  line-height: 1.35 !important;
  overflow-wrap: anywhere;
}
.eleva-financeiro-overview-v1 .fin-commitment-item {
  grid-template-columns: 42px minmax(0, 1fr) auto !important;
  gap: 10px !important;
}
.eleva-financeiro-overview-v1 .fin-commitment-item > div {
  min-width: 0;
}
.eleva-financeiro-overview-v1 .fin-commitment-item strong {
  white-space: normal;
  overflow-wrap: anywhere;
}
.eleva-financeiro-overview-v1 .fin-commitment-item > b {
  white-space: nowrap;
}
.eleva-financeiro-overview-v1 .fin-home-table {
  overflow-x: auto;
}
@container elevaFinanceiroResumo (max-width: 1059px) {
  .eleva-financeiro-overview-v1 .fin-home-top.modern {
    grid-template-columns: minmax(0, 1fr) !important;
  }
  .eleva-financeiro-overview-v1 .fin-top-actions.fin-period-control {
    justify-content: flex-start !important;
  }
  .eleva-financeiro-overview-v1 .fin-modern-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }
}
@container elevaFinanceiroResumo (max-width: 859px) {
  .eleva-financeiro-overview-v1 .fin-home-kpis.modern {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}
@container elevaFinanceiroResumo (max-width: 539px) {
  .eleva-financeiro-overview-v1 .fin-home-top.modern {
    padding: 18px !important;
  }
  .eleva-financeiro-overview-v1 .fin-period-label {
    text-align: left !important;
  }
  .eleva-financeiro-overview-v1 .fin-home-kpis.modern,
  .eleva-financeiro-overview-v1 .fin-home > .fin-home-kpis + section:not([class]) {
    grid-template-columns: minmax(0, 1fr) !important;
  }
  .eleva-financeiro-overview-v1 .fin-chart-summary {
    grid-template-columns: minmax(0, 1fr) !important;
  }
  .eleva-financeiro-overview-v1 .fin-home-table-head,
  .eleva-financeiro-overview-v1 .fin-home-table-row {
    min-width: 680px;
  }
}
`;

// FIM DO ARQUIVO COMPLETO — app/financeiro/page.tsx — ELEVA
