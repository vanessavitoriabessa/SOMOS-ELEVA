import AppShell from "@/components/AppShell";
import ClientManager from "@/components/ClientManager";

export default function ClientesPage() {
  return (
    <AppShell
      title="Clientes"
      subtitle="Cadastre, pesquise e acompanhe o histórico completo de cada cliente."
    >
      <ClientManager />
    </AppShell>
  );
}
