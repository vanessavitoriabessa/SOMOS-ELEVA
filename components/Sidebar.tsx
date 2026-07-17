import Link from "next/link";

const operation = [
  ["▦", "Dashboard", "/"],
  ["👥", "Clientes", "/clientes"],
  ["📄", "Propostas", "/propostas"],
  ["💳", "Compra de Dívida", "/propostas"],
  ["💼", "CLT", "/propostas"],
  ["💰", "Baixa de pagamentos", "/baixas"],
  ["📞", "Esteira", "/esteira"],
];

const management = [
  ["🏆", "Ranking", "/ranking"],
  ["📊", "Financeiro", "/financeiro"],
  ["👩‍💼", "Equipe", "/equipe"],
  ["📥", "Dados importados", "/dados-importados"],
  ["⚙", "Configurações", "/configuracoes"],
];

function Menu({ items }: { items: string[][] }) {
  return (
    <nav className="menu-list">
      {items.map(([icon, label, href], index) => (
        <Link className={`menu-link ${label === "Dashboard" ? "active" : ""}`} href={href} key={label}>
          <span className="menu-icon">{icon}</span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">E</div>
        <div>
          <strong>SOMOS ELEVA</strong>
          <span>Gestão inteligente • V8</span>
        </div>
      </div>

      <p className="menu-section">OPERAÇÃO</p>
      <Menu items={operation} />

      <p className="menu-section">GESTÃO</p>
      <Menu items={management} />

      <div className="sidebar-footer">
        <div className="user-mini">
          <div className="user-avatar">T</div>
          <div><strong>Tay</strong><span>Administradora</span></div>
        </div>
        <button className="logout-button">Sair</button>
      </div>
    </aside>
  );
}
