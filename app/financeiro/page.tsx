import AppShell from "@/components/AppShell";
import FinancialManager from "@/components/FinancialManager";

export default function FinanceiroPage() {
  return (
    <AppShell title="Financeiro" subtitle="Acompanhe produção paga, comissões, entradas e saídas.">
      <FinancialManager />
    </AppShell>
  );
}
