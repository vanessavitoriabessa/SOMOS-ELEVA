import AppShell from "@/components/AppShell";

export default function Page() {
  return (
    <AppShell title="Financeiro" subtitle="Receitas, comissões, custos e resultado da empresa.">
      <main className="page-content">
        <article className="panel empty-state">
          <span>🚧</span>
          <h2>Financeiro</h2>
          <p>Este módulo será conectado aos dados da Eleva na próxima etapa.</p>
        </article>
      </main>
    </AppShell>
  );
}
