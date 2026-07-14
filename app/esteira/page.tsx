import AppShell from "@/components/AppShell";
import EsteiraPropostas from "@/components/EsteiraPropostas";
export default function Esteira() {
  return (
    <AppShell title="Esteira de Acompanhamento" subtitle="Controle de protocolos, contatos e prazos das operações.">
      <main className="page-content"><EsteiraPropostas /></main>
    </AppShell>
  );
}
