import AppShell from "@/components/AppShell";
import SimulationCalculator from "@/components/SimulationCalculator";

export default function SimulacaoPage() {
  return (
    <AppShell
      title="Simulação"
      subtitle="Calcule saldo devedor, valor liberado e troco automaticamente."
    >
      <SimulationCalculator />
    </AppShell>
  );
}
