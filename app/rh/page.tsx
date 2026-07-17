import AppShell from "@/components/AppShell";
import RHManager from "@/components/RHManager";

export default function RHPage() {
  return (
    <AppShell
      title="Recursos Humanos"
      subtitle="Cadastre e acompanhe as informações das colaboradoras."
    >
      <RHManager />
    </AppShell>
  );
}