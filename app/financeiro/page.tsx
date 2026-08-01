import AppShell from "@/components/AppShell";
import FinancialDashboard from "@/components/financeiro/FinancialDashboard";
import FinancialManager from "@/components/financeiro/FinancialManager";

export default function FinanceiroPage() {
  return (
    <AppShell
      title="Financeiro"
      subtitle="Acompanhe produção, comissões, recebimentos, entradas e saídas."
    >
      <FinancialDashboard />
      <FinancialManager />
    </AppShell>
  );
}