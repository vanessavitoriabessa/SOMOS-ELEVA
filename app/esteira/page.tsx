import AppShell from "@/components/AppShell";
import KanbanBoard from "@/components/KanbanBoard";

export default function EsteiraPage() {
  return (
    <AppShell
      title="Gestão de Propostas"
      subtitle="Acompanhe o andamento e os status de todas as propostas."
    >
      <KanbanBoard />
    </AppShell>
  );
}