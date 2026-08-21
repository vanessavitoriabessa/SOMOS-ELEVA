import AppShell from "@/components/AppShell";
import CoordenacaoGeral from "../../components/coordenacao/CoordenacaoGeral";

export default function CoordenacaoPage() {
  return (
    <AppShell
      title="Coordenação Geral"
      subtitle="Visão executiva da operação, prioridades e acompanhamento dos setores."
    >
      <CoordenacaoGeral />
    </AppShell>
  );
}