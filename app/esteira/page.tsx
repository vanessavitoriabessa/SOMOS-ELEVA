import AppShell from "@/components/AppShell";
import EsteiraPropostas from "@/components/EsteiraPropostas";

export default function EsteiraPage() {
  return (
    <AppShell
      title="COMPRA DE DÍVIDA"
      subtitle="Cadastre e acompanhe as propostas de compra de dívida."
    >
      <EsteiraPropostas />
    </AppShell>
  );
}
