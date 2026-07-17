import AppShell from "@/components/AppShell";
import ProposalManager from "@/components/ProposalManager";

export default function PropostasPage() {
  return (
    <AppShell
      title="Propostas"
      subtitle="Cadastre, acompanhe e calcule automaticamente a comissão dos contratos pagos."
    >
      <ProposalManager />
    </AppShell>
  );
}
