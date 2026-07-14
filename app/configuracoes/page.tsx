import AppShell from "@/components/AppShell";

export default function Page() {
  return (
    <AppShell title="Configurações" subtitle="Metas, percentuais, usuários e regras do sistema.">
      <main className="page-content">
        <article className="panel empty-state">
          <span>🚧</span>
          <h2>Configurações</h2>
          <p>Este módulo será conectado aos dados da Eleva na próxima etapa.</p>
        </article>
      </main>
    </AppShell>
  );
}
