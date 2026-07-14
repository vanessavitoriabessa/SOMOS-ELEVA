import AppShell from "@/components/AppShell";
import PropostasManager from "@/components/PropostasManager";

export default function Propostas() {
  return (
    <AppShell
      title="Gestão de Propostas"
      subtitle="Cadastre, filtre e acompanhe Compra de Dívida e CLT."
    >
      <main className="page-content">
        <PropostasManager />
      </main>
    </AppShell>
  );
}
