import AppShell from "@/components/AppShell";
import EsteiraPropostas from "@/components/EsteiraPropostas";

export default function EsteiraPage() {
  return (
    <AppShell
      title="Gestão de Propostas"
      subtitle="Acompanhe o andamento e os status de todas as propostas."
    >
      <EsteiraPropostas />
    </AppShell>
  );
}