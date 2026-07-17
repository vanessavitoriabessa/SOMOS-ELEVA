import AppShell from "@/components/AppShell";
import CltManager from "@/components/CltManager";

export default function CltPage() {
  return (
    <AppShell
      title="CLT"
      subtitle="Cadastre clientes, acompanhe análises e organize propostas de empréstimo CLT."
    >
      <CltManager />
    </AppShell>
  );
}
