import AppShell from "@/components/AppShell";
import TabelasComissaoManager from "@/components/TabelasComissaoManager";

export default function TabelasComissaoPage() {
  return (
    <AppShell
      title="Tabelas Comissão"
      subtitle="Configure as regras de comissão por produto e fornecedor."
    >
      <TabelasComissaoManager />
    </AppShell>
  );
}
