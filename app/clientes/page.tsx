import AppShell from "@/components/AppShell";
import ClientesManager from "@/components/ClientesManager";

export default function Clientes() {
  return (
    <AppShell title="Clientes" subtitle="Cadastre e acompanhe a carteira de clientes.">
      <main className="page">
        <ClientesManager />
      </main>
    </AppShell>
  );
}
