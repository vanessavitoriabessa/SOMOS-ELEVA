import AppShell from "@/components/AppShell";
import KanbanBoard from "@/components/KanbanBoard";

export default function EsteiraPage() {
  return (
    <AppShell
      title="Esteira de propostas"
      subtitle="Acompanhe cada contrato do solicitado ao pagamento."
    >
      <KanbanBoard />
    </AppShell>
  );
}
