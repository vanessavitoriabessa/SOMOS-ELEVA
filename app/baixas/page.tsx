import AppShell from "@/components/AppShell";
import BaixasManager from "@/components/BaixasManager";

export default function Baixas() {
  return (
    <AppShell
      title="Baixa de Pagamentos"
      subtitle="Localize uma proposta e marque o pagamento."
    >
      <main className="page-content">
        <BaixasManager />
      </main>
    </AppShell>
  );
}
