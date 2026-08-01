import AppShell from "@/components/AppShell";
import BaixasManager from "@/components/BaixasManager";

export default function BaixasPage() {
  return (
    <AppShell
      title="Baixa de pagamentos"
      subtitle="Localize a proposta pelo número e confira o recebimento da comissão."
    >
      <BaixasManager />
    </AppShell>
  );
}