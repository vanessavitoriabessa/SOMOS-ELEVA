import AppShell from "@/components/AppShell";
import DashboardPage from "@/components/dashboard/DashboardPage";

export default function DashboardRoute() {
  return (
    <AppShell
      title="Dashboard"
      subtitle="Acompanhe a produção e o desempenho de toda a equipe."
    >
      <DashboardPage />
    </AppShell>
  );
}