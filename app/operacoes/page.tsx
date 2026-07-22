import AppShell from "@/components/AppShell";
import OperationsManager from "@/components/OperationsManager";

export default function OperacoesPage() {
  return (
    <AppShell
      title="Operações"
      subtitle="Cadastre clientes e operações em um único lugar."
    >
      <OperationsManager />
    </AppShell>
  );
}