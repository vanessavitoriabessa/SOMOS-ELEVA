"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import BaixasManager from "@/components/BaixasManager";
import FinancialManager from "@/components/financeiro/FinancialManager";
import FinanceiroResumo from "@/components/financeiro/FinanceiroResumo";
import DespesasFixasManager from "@/components/financeiro/DespesasFixasManager";
import RelatoriosFinanceiros from "@/components/financeiro/RelatoriosFinanceiros";
import "@/components/financeiro/financeiro-unificado-final.css";

type Aba = "visao-geral" | "recebimentos" | "movimentacoes" | "despesas-fixas" | "folha" | "relatorios";

export default function FinanceiroPage() {
  const [aba, setAba] = useState<Aba>("visao-geral");
  const abas: Array<{ id: Aba; label: string }> = [
    { id: "visao-geral", label: "Visão Geral" },
    { id: "recebimentos", label: "Recebimentos" },
    { id: "movimentacoes", label: "Movimentações" },
    { id: "despesas-fixas", label: "Despesas Fixas" },
    { id: "folha", label: "Folha" },
    { id: "relatorios", label: "Relatórios" },
  ];

  return (
    <AppShell title="Financeiro" subtitle="Controle de recebimentos, despesas, movimentações e folha.">
      <div className="financeiro-unico-final">
        <nav className="financeiro-unico-tabs">
          {abas.map((item) => (
            <button key={item.id} type="button" className={aba === item.id ? "active" : ""} onClick={() => setAba(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        {aba === "visao-geral" && (
          <FinanceiroResumo
            onNavigate={(destino: any) => {
              if (destino === "a-receber" || destino === "recebidos") setAba("recebimentos");
              else if (destino === "movimentacoes") setAba("movimentacoes");
              else if (destino === "folha") setAba("folha");
              else if (destino === "relatorios") setAba("relatorios");
            }}
          />
        )}

        {aba === "recebimentos" && <BaixasManager modoInicial="A_RECEBER" compacto />}
        {aba === "movimentacoes" && <FinancialManager abaExterna="movimentacoes" ocultarCabecalho ocultarAbas />}
        {aba === "despesas-fixas" && <DespesasFixasManager />}
        {aba === "folha" && <FinancialManager abaExterna="folha" ocultarCabecalho ocultarAbas />}
        {aba === "relatorios" && <RelatoriosFinanceiros />}
      </div>
    </AppShell>
  );
}
