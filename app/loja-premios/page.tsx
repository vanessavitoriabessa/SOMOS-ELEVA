import AppShell from "../../components/AppShell";
import LojaPremiosManager from "../../components/LojaPremiosManager";

export default function LojaPremiosPage() {
  return (
    <AppShell
      title="Loja de Prêmios"
      subtitle="Acompanhe seus pontos, premiações e solicitações de saque."
    >
      <LojaPremiosManager />
    </AppShell>
  );
}