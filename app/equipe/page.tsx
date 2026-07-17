import AppShell from "@/components/AppShell";
import UserManager from "@/components/UserManager";

export default function EquipePage() {
  return (
    <AppShell
      title="Equipe e acessos"
      subtitle="Cadastre usuários, cargos, matrículas, senhas e permissões."
    >
      <UserManager />
    </AppShell>
  );
}
