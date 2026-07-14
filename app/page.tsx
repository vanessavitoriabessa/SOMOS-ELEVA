import AppShell from "@/components/AppShell";
import DashboardClient from "@/components/DashboardClient";

export default function Dashboard() {
  return (
    <AppShell title="Dashboard" subtitle="Visão geral da operação — competência atual">
      <DashboardClient />
    </AppShell>
  );
}
