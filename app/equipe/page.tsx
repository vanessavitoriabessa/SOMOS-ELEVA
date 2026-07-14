import AppShell from "@/components/AppShell";

export default function Page() {
  return (
    <AppShell title="Equipe" subtitle="Gestão de consultoras, coordenadora e operacional.">
      <main className="page-content">
        <article className="panel empty-state">
          <span>🚧</span>
          <h2>Equipe</h2>
          <p>Este módulo será conectado aos dados da Eleva na próxima etapa.</p>
        </article>
      </main>
    </AppShell>
  );
}
