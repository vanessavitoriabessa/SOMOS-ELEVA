import AppShell from "@/components/AppShell";

export default function DadosImportados() {
  return (
    <AppShell
      title="Dados importados"
      subtitle="Resumo da migração da planilha para o SOMOS ELEVA."
    >
      <main className="page-content">
        <section className="mini-stats-grid">
          <article className="mini-stat"><span>Propostas importadas</span><strong>26</strong></article>
          <article className="mini-stat"><span>Clientes únicos</span><strong>26</strong></article>
          <article className="mini-stat"><span>Lançamentos CLT</span><strong>12</strong></article>
        </section>
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">MIGRAÇÃO CONCLUÍDA</span>
              <h3>Planilha carregada no sistema</h3>
            </div>
          </div>
          <p className="empty-text" style={{ textAlign: "left", padding: 0 }}>
            Foram importados clientes, propostas de Compra de Dívida, valores,
            datas, bancos/tabelas, consultoras, status financeiros, diferenças,
            comissões previstas e os lançamentos mensais de CLT.
          </p>
        </article>
      </main>
    </AppShell>
  );
}
