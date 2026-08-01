import AppShell from "@/components/AppShell";
import ProtocolosPage from "@/components/protocolos/ProtocolosPage";

export default function Page() {
  return (
    <AppShell
      title="Protocolos"
      subtitle="Acompanhe solicitações, prazos, ligações e recebimento de boletos."
    >
      <ProtocolosPage />
    </AppShell>
  );
}