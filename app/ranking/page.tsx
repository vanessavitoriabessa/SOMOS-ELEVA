import AppShell from "@/components/AppShell";
import RankingManager from "@/components/ranking/RankingManager";

export default function RankingPage() {
  return (
    <AppShell
      title="Ranking"
      subtitle="Acompanhe produção, contratos pagos, comissões e desempenho da equipe."
    >
      <RankingManager />
    </AppShell>
  );
}