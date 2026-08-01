import AppShell from "@/components/AppShell";
import SettingsManager from "@/components/configuracoes/SettingsManager";

export default function ConfiguracoesPage() {
  return (
    <AppShell
      title="Configurações"
      subtitle="Gerencie bancos, tabelas, percentuais, metas e parâmetros do sistema."
    >
      <SettingsManager />
    </AppShell>
  );
}
