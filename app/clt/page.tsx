import AppShell from "@/components/AppShell";
import CltManager from "@/components/CltManager";

export default function CltPage() {
  return (
    <AppShell
      title="CLT"
      subtitle="Cadastro e acompanhamento de contratos CLT."
    >
      <CltManager />
    </AppShell>
  );
}
