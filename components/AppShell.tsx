"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Calculator,
  CircleDollarSign,
  ClipboardList,
  Database,
  FileText,
  Gift,
  LayoutDashboard,
  Settings,
  Trophy,
  UserCog,
  UsersRound,
  Workflow,
  WalletCards,
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

type ChavePermissaoMenu =
  | "dashboard"
  | "clientes"
  | "simulacao"
  | "gestao_propostas"
  | "clt"
  | "protocolos"
  | "ranking"
  | "campanhas"
  | "minha_premiacao"
  | "loja_premios"
  | "financeiro"
  | "equipe"
  | "rh"
  | "dados_importados"
  | "configuracoes";

type PermissoesMenu = Partial<Record<ChavePermissaoMenu, boolean>>;

const CHAVE_POR_ROTA: Record<string, ChavePermissaoMenu> = {
  "/dashboard": "dashboard",
  "/clientes": "clientes",
  "/simulacao": "simulacao",
  "/esteira": "gestao_propostas",
  "/propostas": "gestao_propostas",
  "/clt": "clt",
  "/protocolos": "protocolos",
  "/ranking": "ranking",
  "/campanhas": "campanhas",
  "/minha-premiacao": "minha_premiacao",
  "/loja-premios": "loja_premios",
  "/financeiro": "financeiro",
  "/equipe": "equipe",
  "/rh": "rh",
  "/dados-importados": "dados_importados",
  "/configuracoes": "configuracoes",
};

function chavePermissaoDaRota(rota: string) {
  return CHAVE_POR_ROTA[rota] || null;
}

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
    href: "/protocolos",
    label: "Protocolos",
    icon: ClipboardList,
  },
];


const itensGestao: ItemMenu[] = [
  {
    href: "/ranking",
    label: "Ranking",
    icon: Trophy,
  },
  {
    href: "/campanhas",
    label: "Campanhas",
    icon: Trophy,
  },
  {
    href: "/minha-premiacao",
    label: "Minha Premiação",
    icon: WalletCards,
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
  "/esteira",
  "/clt",
  "/protocolos",
  "/minha-premiacao",
  "/loja-premios",
  "/perfil",
];

const ROTAS_PERMITIDAS_COORDENACAO = [
  "/dashboard",
  "/clientes",
  "/propostas",
  "/simulacao",
  "/esteira",
  "/clt",
  "/ranking",
  "/minha-premiacao",
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

function perfilEhRh(perfil: string) {
  const texto = normalizarTexto(perfil);
  return (
    texto === "rh" ||
    texto === "financeiro" ||
    texto.includes("recursos humanos")
  );
}

function normalizarPerfilLegado(perfil: string) {
  const valor = String(perfil || "").trim();
  return normalizarTexto(valor) === "financeiro" ? "RH" : valor;
}

function perfilEhCoordenacao(perfil: string) {
  const texto = normalizarTexto(perfil);
  return texto.includes("coordenador") || texto.includes("coordenadora");
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
  const supabase = useMemo(() => createClient(), []);

  const [nome, setNome] = useState("Colaboradora");
  const [cargo, setCargo] = useState("Consultora");
  const [foto, setFoto] = useState("");
  const [pontosHeader, setPontosHeader] = useState(0);
  const [permissaoCarregada, setPermissaoCarregada] = useState(false);
  const [permissoesMenu, setPermissoesMenu] = useState<PermissoesMenu | null>(null);

  const ehAdministracao = perfilEhAdministracao(cargo);
  const ehConsultora = perfilEhConsultora(cargo);
  const ehSupervisao = perfilEhSupervisao(cargo);
  const ehOperacional = perfilEhOperacional(cargo);
  const ehCoordenacao = perfilEhCoordenacao(cargo);
  const ehRh = perfilEhRh(cargo);

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

    const cargoResolvido = normalizarPerfilLegado(
      usuarioEncontrado?.perfil?.trim() ||
      usuarioEncontrado?.cargo?.trim() ||
      cargoSalvo?.trim() ||
      "Consultora"
    );

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
    (nomeResolvido === "Tay" ? "/avatar.png" : "")
);

  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregarPermissoesDoPerfil() {
      setPermissaoCarregada(false);

      const chavesPossiveis = Array.from(
        new Set(
          [
            cargo,
            normalizarTexto(cargo) === "rh" ? "RH" : "",
            normalizarTexto(cargo) === "rh" ? "Financeiro" : "",
          ].filter(Boolean),
        ),
      );

      let permissoesEncontradas: PermissoesMenu | null = null;

      for (const chave of chavesPossiveis) {
        const { data, error } = await supabase
          .from("config_permissoes")
          .select("permissoes")
          .eq("perfil_chave", chave)
          .maybeSingle();

        if (!error && data?.permissoes && typeof data.permissoes === "object") {
          permissoesEncontradas = data.permissoes as PermissoesMenu;
          break;
        }
      }

      if (!ativo) return;

      setPermissoesMenu(permissoesEncontradas);
      setPermissaoCarregada(true);
    }

    void carregarPermissoesDoPerfil();

    return () => {
      ativo = false;
    };
  }, [cargo, supabase]);

  useEffect(() => {
    function atualizarPontosHeader(event?: Event) {
      if (event instanceof CustomEvent) {
        const valorEvento = Number(event.detail);
        setPontosHeader(Number.isFinite(valorEvento) ? valorEvento : 0);
        return;
      }

      const valorSalvo = Number(
        localStorage.getItem("somos-eleva-pontos-header") || 0
      );

      setPontosHeader(Number.isFinite(valorSalvo) ? valorSalvo : 0);
    }

    atualizarPontosHeader();

    window.addEventListener(
      "somos-eleva-pontos-atualizados",
      atualizarPontosHeader
    );
    window.addEventListener("storage", atualizarPontosHeader);
    window.addEventListener("focus", atualizarPontosHeader);

    return () => {
      window.removeEventListener(
        "somos-eleva-pontos-atualizados",
        atualizarPontosHeader
      );
      window.removeEventListener("storage", atualizarPontosHeader);
      window.removeEventListener("focus", atualizarPontosHeader);
    };
  }, []);

  const pontosFormatados = pontosHeader.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const itensOperacaoVisiveis = useMemo(() => {
    if (permissoesMenu) {
      return itensOperacao.filter((item) => {
        const chave = chavePermissaoDaRota(item.href);
        return chave ? permissoesMenu[chave] === true : false;
      });
    }

    // Compatibilidade: se ainda não existir configuração salva para o perfil,
    // mantém as regras antigas para não bloquear o usuário.
    if (ehAdministracao || ehCoordenacao) return itensOperacao;

    if (ehConsultora) {
      const permitidos = ["/dashboard", "/clientes", "/simulacao", "/esteira", "/clt", "/protocolos"];
      return itensOperacao.filter((item) => permitidos.includes(item.href));
    }

    if (ehOperacional || ehSupervisao) {
      const permitidos = ["/dashboard", "/clientes", "/esteira", "/simulacao", "/clt", "/protocolos"];
      return itensOperacao.filter((item) => permitidos.includes(item.href));
    }

    if (ehRh) {
      return itensOperacao.filter((item) => ["/dashboard", "/esteira"].includes(item.href));
    }

    return itensOperacao.filter((item) => item.href === "/dashboard");
  }, [
    permissoesMenu,
    ehAdministracao,
    ehConsultora,
    ehSupervisao,
    ehOperacional,
    ehCoordenacao,
    ehRh,
  ]);

  const itensGestaoVisiveis = useMemo(() => {
    if (permissoesMenu) {
      return itensGestao.filter((item) => {
        const chave = chavePermissaoDaRota(item.href);
        return chave ? permissoesMenu[chave] === true : false;
      });
    }

    if (ehAdministracao || ehCoordenacao) return itensGestao;

    if (ehConsultora || ehOperacional) {
      return itensGestao.filter((item) =>
        ["/campanhas", "/minha-premiacao", "/loja-premios"].includes(item.href),
      );
    }

    if (ehSupervisao) {
      return itensGestao.filter((item) => ["/ranking", "/campanhas"].includes(item.href));
    }

    if (ehRh) {
      return itensGestao.filter((item) => ["/ranking", "/campanhas", "/rh"].includes(item.href));
    }

    return [];
  }, [
    permissoesMenu,
    ehAdministracao,
    ehConsultora,
    ehSupervisao,
    ehOperacional,
    ehCoordenacao,
    ehRh,
  ]);

  const rotaNegada = useMemo(() => {
    if (!permissaoCarregada) return false;

    // Meu Perfil é sempre permitido para o próprio usuário.
    if (rotaComecaCom(pathname, "/perfil")) return false;

    if (permissoesMenu) {
      const rotaConfigurada = Object.keys(CHAVE_POR_ROTA)
        .sort((a, b) => b.length - a.length)
        .find((rota) => rotaComecaCom(pathname, rota));

      if (!rotaConfigurada) return true;

      const chave = chavePermissaoDaRota(rotaConfigurada);
      return !chave || permissoesMenu[chave] !== true;
    }

    // Fallback legado somente para perfis que ainda não possuem registro
    // em config_permissoes.
    if (ehAdministracao || ehCoordenacao) return false;

    if (ehConsultora) {
      return !estaEmAlgumaRota(pathname, ROTAS_PERMITIDAS_CONSULTORA);
    }

    if (ehOperacional) {
      return !estaEmAlgumaRota(pathname, [
        "/dashboard", "/clientes", "/propostas", "/simulacao", "/esteira",
        "/clt", "/protocolos", "/campanhas", "/minha-premiacao", "/loja-premios", "/perfil",
      ]);
    }

    if (ehSupervisao) {
      return !estaEmAlgumaRota(pathname, [
        "/dashboard", "/clientes", "/propostas", "/simulacao", "/esteira",
        "/clt", "/protocolos", "/ranking", "/campanhas", "/perfil",
      ]);
    }

    if (ehRh) {
      return !estaEmAlgumaRota(pathname, [
        "/dashboard", "/esteira", "/ranking", "/campanhas", "/rh", "/perfil",
      ]);
    }

    return !rotaComecaCom(pathname, "/dashboard");
  }, [
    pathname,
    permissaoCarregada,
    permissoesMenu,
    ehAdministracao,
    ehConsultora,
    ehSupervisao,
    ehOperacional,
    ehCoordenacao,
    ehRh,
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

            <Link
              href="/minha-premiacao"
              aria-label="Abrir meus pontos"
              title="Abrir Minha Premiação"
              style={{
                display: "flex",
                minWidth: 92,
                height: 40,
                padding: "0 12px",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                border: "1px solid #dbe3ef",
                borderRadius: 11,
                background: "#ffffff",
                color: "#244dcc",
                textDecoration: "none",
                boxShadow: "0 5px 14px rgba(31, 57, 128, 0.06)",
              }}
            >
              <Gift size={16} strokeWidth={2.2} />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  lineHeight: 1.05,
                }}
              >
                <span
                  style={{
                    color: "#7d879a",
                    fontSize: 8,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Pontos
                </span>

                <strong
                  style={{
                    marginTop: 3,
                    color: "#244dcc",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {pontosFormatados}
                </strong>
              </div>
            </Link>

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