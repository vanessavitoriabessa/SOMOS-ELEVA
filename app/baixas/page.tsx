import AppShell from "@/components/AppShell";
import PaymentSettlementManager from "@/components/PaymentSettlementManager";

export default function BaixasPage() {
  return (
    <AppShell
      title="Baixa de pagamentos"
      subtitle="Localize contratos, marque como pagos e calcule a comissão automaticamente."
    >
      <PaymentSettlementManager />
    </AppShell>
  );
}
