import Sidebar from "./Sidebar";

export default function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="app-shell">
      <Sidebar />
      <section className="main-area">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <span>⌕</span>
              <input placeholder="Pesquisar cliente, CPF ou proposta..." />
            </label>
            <button className="icon-button">🔔</button>
            <div className="topbar-user">
              <div className="topbar-avatar">T</div>
              <div><strong>Tay</strong><span>Administradora</span></div>
            </div>
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}
