import AppShell from "@/components/AppShell";

export default function Page() {
  return (
    <AppShell title="Ranking" subtitle="Classificação completa das consultoras.">
      <main className="page-content">
        <article className="panel empty-state">
          <span>🚧</span>
          <h2>Ranking</h2>
          <p>Este módulo será conectado aos dados da Eleva na próxima etapa.</p>
        </article>
      </main>
    </AppShell>
  );
}
