import AppShell from "@/components/AppShell";
import ImportManager from "@/components/ImportManager";

export default function DadosImportadosPage() {
  return (
    <AppShell
      title="Dados importados"
      subtitle="Importe planilhas CSV, confira os dados e envie para Clientes ou Propostas."
    >
      <ImportManager />
    </AppShell>
  );
}
