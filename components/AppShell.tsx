"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import "./app-shell.css";

type AppShellProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

const itensOperacao = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/clientes", label: "Clientes", icon: "♙" },
  { href: "/propostas", label: "Propostas", icon: "▤" },
  { href: "/simulacao", label: "Simulação", icon: "▧" },
  { href: "/esteira", label: "Compra de Dívida", icon: "⇄" },
  { href: "/clt", label: "CLT", icon: "▣" },
  { href: "/baixas", label: "Baixa de pagamentos", icon: "◉" },
];

const itensGestao = [
  { href: "/ranking", label: "Ranking", icon: "♜" },
  { href: "/financeiro", label: "Financeiro", icon: "▥" },
  { href: "/equipe", label: "Equipe", icon: "♧" },
  { href: "/dados-importados", label: "Dados importados", icon: "⇩" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙" },
];

function nomeBonito(valor: string) {
  if (!valor) return "Colaboradora";
  if (valor === "0001") return "Tay";
  const base = valor.includes("@") ? valor.split("@")[0] : valor;
  const nome = base.split(/[._-]/)[0];
  return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
}

export default function AppShell({ title = "Dashboard", subtitle = "", children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [nome, setNome] = useState("Tay");
  const [cargo, setCargo] = useState("Administradora");

  useEffect(() => {
    const nomeSalvo = localStorage.getItem("somos-eleva-nome");
    const usuario = localStorage.getItem("somos-eleva-usuario") || "0001";
    const cargoSalvo = localStorage.getItem("somos-eleva-cargo");

    setNome(nomeSalvo?.trim() || nomeBonito(usuario));
    setCargo(cargoSalvo?.trim() || "Administradora");
  }, []);

  function sair() {
    localStorage.removeItem("somos-eleva-logado");
    localStorage.removeItem("somos-eleva-usuario");
    localStorage.removeItem("somos-eleva-nome");
    localStorage.removeItem("somos-eleva-cargo");
    router.replace("/login");
  }

  const renderItem = (item: { href: string; label: string; icon: string }) => {
    const ativo = pathname === item.href;
    return (
      <Link key={item.href} href={item.href} className={`shell-link ${ativo ? "ativo" : ""}`}>
        <span className="shell-link-icon">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="shell-layout">
      <aside className="shell-sidebar">
        <div className="shell-brand">
          <strong>SOMOS ELEVA</strong>
          <span>Gestão inteligente • V8</span>
        </div>

        <nav className="shell-nav">
          <p className="shell-section-title">OPERAÇÃO</p>
          {itensOperacao.map(renderItem)}

          <p className="shell-section-title gestao">GESTÃO</p>
          {itensGestao.map(renderItem)}
        </nav>

        <div className="shell-user">
          <div className="shell-avatar">{nome.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{nome}</strong>
            <span>{cargo}</span>
          </div>
        </div>

        <button className="shell-logout" onClick={sair}>
          <span>↪</span>
          Sair
        </button>
      </aside>

      <div className="shell-content">
        <header className="shell-topbar">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <div className="shell-top-actions">
            <div className="shell-search">⌕&nbsp;&nbsp;Pesquisar cliente, CPF ou proposta...</div>
            <button className="shell-notification">♧<b>3</b></button>
            <div className="shell-top-user">
              <div className="shell-avatar small">{nome.charAt(0).toUpperCase()}</div>
              <div><strong>{nome}</strong><span>{cargo}</span></div>
            </div>
          </div>
        </header>

        <main className="shell-main">{children}</main>
      </div>
    </div>
  );
}
