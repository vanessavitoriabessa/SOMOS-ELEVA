"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Calculator,
  CircleDollarSign,
  Database,
  FileText,
  Gift,
  LayoutDashboard,
  Settings,
  Trophy,
  UserCog,
  UsersRound,
  Workflow,
} from "lucide-react";
import "./app-shell.css";

type AppShellProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

type UsuarioSalvo = {
  id?: string;
  nome?: string;
  email?: string;
  matricula?: string;
  perfil?: string;
  cargo?: string;
  foto?: string;
};

type ItemMenu = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const itensOperacao: ItemMenu[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: UsersRound,
  },
  {
    href: "/propostas",
    label: "Propostas",
    icon: FileText,
  },
  {
    href: "/simulacao",
    label: "Simulação",
    icon: Calculator,
  },
  {
    href: "/esteira",
    label: "Gestão de Propostas",
    icon: Workflow,
  },
  {
    href: "/clt",
    label: "CLT",
    icon: BadgeDollarSign,
  },
  {
    href: "/baixas",
    label: "Baixa de pagamentos",
    icon: CircleDollarSign,
  },
];

const itensGestao: ItemMenu[] = [
  {
    href: "/ranking",
    label: "Ranking",
    icon: Trophy,
  },
  {
    href: "/loja-premios",
    label: "Loja de Prêmios",
    icon: Gift,
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: CircleDollarSign,
  },
  {
    href: "/equipe",
    label: "Equipe",
    icon: UserCog,
  },
  {
    href: "/rh",
    label: "RH",
    icon: BriefcaseBusiness,
  },
  {
    href: "/dados-importados",
    label: "Dados importados",
    icon: Database,
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: Settings,
  },
];

const ROTAS_PERMITIDAS_CONSULTORA = [
  "/dashboard",
  "/clientes",
  "/simulacao",
  "/clt",
  "/loja-premios",
  "/perfil",
];

const ROTAS_PERMITIDAS_SUPERVISAO_OPERACIONAL = [
  "/dashboard",
  "/clientes",
  "/propostas",
  "/simulacao",
  "/clt",
  "/ranking",
  "/loja-premios",
  "/perfil",
];

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function perfilEhAdministracao(perfil: string) {
  const texto = normalizarTexto(perfil);

  return (
    texto.includes("administrador") ||
    texto.includes("administradora") ||
    texto === "admin"
  );
}

function perfilEhConsultora(perfil: string) {
  const texto = normalizarTexto(perfil);

  return (
    texto.includes("consultor") ||
    texto.includes("consultora") ||
    texto.includes("vendedor") ||
    texto.includes("vendedora")
  );
}

function perfilEhSupervisao(perfil: string) {
  const texto = normalizarTexto(perfil);

  return (
    texto.includes("supervisor") ||
    texto.includes("supervisora")
  );
}

function perfilEhOperacional(perfil: string) {
  return normalizarTexto(perfil).includes("operacional");
}

function nomeBonito(valor: string) {
  if (!valor) return "Colaboradora";
  if (valor === "0001") return "Vanessa";

  const base = valor.includes("@") ? valor.split("@")[0] : valor;
  const nome = base.split(/[._-]/)[0];

  return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
}

function rotaComecaCom(pathname: string, rota: string) {
  return pathname === rota || pathname.startsWith(`${rota}/`);
}

function estaEmAlgumaRota(pathname: string, rotas: string[]) {
  return rotas.some((rota) => rotaComecaCom(pathname, rota));
}

export default function AppShell({
  title = "Dashboard",
  subtitle = "",
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [nome, setNome] = useState("Colaboradora");
  const [cargo, setCargo] = useState("Consultora");
  const [foto, setFoto] = useState("");
  const [permissaoCarregada, setPermissaoCarregada] = useState(false);

  const ehAdministracao = perfilEhAdministracao(cargo);
  const ehConsultora = perfilEhConsultora(cargo);
  const ehSupervisao = perfilEhSupervisao(cargo);
  const ehOperacional = perfilEhOperacional(cargo);
  const ehSupervisaoOuOperacional = ehSupervisao || ehOperacional;

  useEffect(() => {
    const usuarioLogado =
      localStorage.getItem("somos-eleva-usuario") || "";

    const matriculaSalva =
      localStorage.getItem("somos-eleva-matricula") || usuarioLogado;

    let usuarioEncontrado: UsuarioSalvo | undefined;

    try {
      const usuariosSalvos = localStorage.getItem("somos-eleva-usuarios");

      const usuarios: UsuarioSalvo[] = usuariosSalvos
        ? JSON.parse(usuariosSalvos)
        : [];

      const login = normalizarTexto(usuarioLogado);

      usuarioEncontrado = usuarios.find((usuario) => {
        return (
          String(usuario.id || "") === usuarioLogado ||
          String(usuario.matricula || "") === usuarioLogado ||
          String(usuario.matricula || "") === matriculaSalva ||
          normalizarTexto(usuario.email || "") === login ||
          normalizarTexto(usuario.nome || "") === login
        );
      });
    } catch {
      usuarioEncontrado = undefined;
    }

    const nomeSalvo = localStorage.getItem("somos-eleva-nome");
    const cargoSalvo = localStorage.getItem("somos-eleva-cargo");

    const nomeResolvido =
      usuarioEncontrado?.nome?.trim() ||
      nomeSalvo?.trim() ||
      nomeBonito(usuarioLogado);

    const cargoResolvido =
      usuarioEncontrado?.perfil?.trim() ||
      usuarioEncontrado?.cargo?.trim() ||
      cargoSalvo?.trim() ||
      "Consultora";

    setNome(nomeResolvido);
    setCargo(cargoResolvido);

    localStorage.setItem("somos-eleva-nome", nomeResolvido);
    localStorage.setItem("somos-eleva-cargo", cargoResolvido);

    if (usuarioEncontrado?.matricula) {
      localStorage.setItem(
        "somos-eleva-matricula",
        usuarioEncontrado.matricula
      );
    }

    setFoto(
      usuarioEncontrado?.foto ||
        localStorage.getItem("somos-eleva-foto") ||
        ""
    );

    setPermissaoCarregada(true);
  }, []);

  const itensOperacaoVisiveis = useMemo(() => {
    if (ehAdministracao) return itensOperacao;

    if (ehConsultora) {
      const permitidos = [
        "/dashboard",
        "/clientes",
        "/simulacao",
        "/clt",
      ];

      return itensOperacao.filter((item) =>
        permitidos.includes(item.href)
      );
    }

    if (ehSupervisaoOuOperacional) {
      const permitidos = [
        "/dashboard",
        "/clientes",
        "/propostas",
        "/simulacao",
        "/clt",
      ];

      return itensOperacao.filter((item) =>
        permitidos.includes(item.href)
      );
    }

    return itensOperacao.filter(
      (item) => item.href === "/dashboard"
    );
  }, [
    ehAdministracao,
    ehConsultora,
    ehSupervisaoOuOperacional,
  ]);

  const itensGestaoVisiveis = useMemo(() => {
    if (ehAdministracao) return itensGestao;

    if (ehConsultora) {
      return itensGestao.filter(
        (item) => item.href === "/loja-premios"
      );
    }

    if (ehSupervisaoOuOperacional) {
      const permitidos = [
        "/ranking",
        "/loja-premios",
      ];

      return itensGestao.filter((item) =>
        permitidos.includes(item.href)
      );
    }

    return [];
  }, [
    ehAdministracao,
    ehConsultora,
    ehSupervisaoOuOperacional,
  ]);

  const rotaNegada = useMemo(() => {
    if (!permissaoCarregada) return false;
    if (ehAdministracao) return false;

    if (ehConsultora) {
      return !estaEmAlgumaRota(
        pathname,
        ROTAS_PERMITIDAS_CONSULTORA
      );
    }

    if (ehSupervisaoOuOperacional) {
      return !estaEmAlgumaRota(
        pathname,
        ROTAS_PERMITIDAS_SUPERVISAO_OPERACIONAL
      );
    }

    return !rotaComecaCom(pathname, "/dashboard");
  }, [
    pathname,
    permissaoCarregada,
    ehAdministracao,
    ehConsultora,
    ehSupervisaoOuOperacional,
  ]);

  useEffect(() => {
    if (!permissaoCarregada || !rotaNegada) return;
    router.replace("/dashboard");
  }, [permissaoCarregada, rotaNegada, router]);

  function sair() {
    localStorage.removeItem("somos-eleva-logado");
    localStorage.removeItem("somos-eleva-usuario");
    localStorage.removeItem("somos-eleva-nome");
    localStorage.removeItem("somos-eleva-cargo");
    localStorage.removeItem("somos-eleva-matricula");
    localStorage.removeItem("somos-eleva-equipe");
    localStorage.removeItem("somos-eleva-status");
    localStorage.removeItem("somos-eleva-foto");

    router.replace("/login");
  }

  function renderAvatar(tamanhoPequeno = false) {
    return (
      <div
        className={`shell-avatar ${tamanhoPequeno ? "small" : ""}`}
      >
        {foto ? (
          <img
            src={foto}
            alt={`Foto de ${nome}`}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "inherit",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          nome.charAt(0).toUpperCase()
        )}
      </div>
    );
  }

  function renderItem(item: ItemMenu) {
  const ativo = rotaComecaCom(pathname, item.href);
  const Icone = item.icon;

  return (
    <Link
      key={item.href}
      href={item.href}
      className={`shell-link ${ativo ? "ativo" : ""}`}
    >
      <span className="shell-link-icon">
        <Icone size={18} strokeWidth={2} />
      </span>

      <span>{item.label}</span>
    </Link>
  );
}

  return (
    <div className="shell-layout">
      <aside className="shell-sidebar">
        <div className="shell-brand">
  <i className="shell-brand-line" />

  <strong>SOMOS ELEVA</strong>

  <i className="shell-brand-line" />
</div>

        <nav className="shell-nav">
          <p className="shell-section-title">OPERAÇÃO</p>
          {itensOperacaoVisiveis.map(renderItem)}

          {itensGestaoVisiveis.length > 0 && (
            <>
              <p className="shell-section-title gestao">GESTÃO</p>
              {itensGestaoVisiveis.map(renderItem)}
            </>
          )}
        </nav>

        <Link
          href="/perfil"
          className="shell-user"
          aria-label="Abrir meu perfil"
          style={{
            textDecoration: "none",
            color: "inherit",
          }}
        >
          {renderAvatar()}

          <div>
            <strong>{nome}</strong>
            <span>{cargo}</span>
          </div>
        </Link>

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
            <div className="shell-search">
              ⌕&nbsp;&nbsp;Pesquisar cliente, CPF ou proposta...
            </div>

            <button className="shell-notification">
              ♧
              <b>3</b>
            </button>

            <Link
              href="/perfil"
              className="shell-top-user"
              aria-label="Abrir meu perfil"
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              {renderAvatar(true)}

              <div>
                <strong>{nome}</strong>
                <span>{cargo}</span>
              </div>
            </Link>
          </div>
        </header>

        <main className="shell-main">
          {!permissaoCarregada ? (
            <div
              style={{
                padding: 30,
                color: "#71798d",
              }}
            >
              Carregando permissões...
            </div>
          ) : rotaNegada ? (
            <div
              style={{
                padding: 30,
                border: "1px solid #e4e8f0",
                borderRadius: 16,
                background: "#ffffff",
                color: "#71798d",
              }}
            >
              Redirecionando para uma área permitida...
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
