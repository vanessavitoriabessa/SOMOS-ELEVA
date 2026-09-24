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
  Bell,
  X,
  CheckCheck,
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
  | "gerenciador_whatsapps"
  | "configuracoes";

type PermissoesMenu = Partial<Record<ChavePermissaoMenu, boolean>>;
type NotificacaoSistema = {
  chave:string; tipo:"urgente"|"atencao"|"info"; titulo:string;
  descricao:string; href:string; dataReferencia?:string;
};

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
    "/gerenciador-whatsapps": "gerenciador_whatsapps",
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
  href: "/gerenciador-whatsapps",
  label: "Gerenciador de WhatsApps",
  icon: Workflow,
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
  const [notificacoes,setNotificacoes]=useState<NotificacaoSistema[]>([]);
  const [lidas,setLidas]=useState<Set<string>>(new Set());
  const [painelNotificacoes,setPainelNotificacoes]=useState(false);
  const [usuarioBancoId,setUsuarioBancoId]=useState("");
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

  const podeVerNotificacoes = ehAdministracao || ehCoordenacao;

  useEffect(() => {
    if (!podeVerNotificacoes) return;
    let ativo = true;
    const hojeIso=()=>new Date().toISOString().slice(0,10);
    const diasAte=(d:string)=>Math.round((new Date(`${String(d).slice(0,10)}T12:00:00`).getTime()-new Date(`${hojeIso()}T12:00:00`).getTime())/86400000);
    const br=(d:string)=>String(d||"").slice(0,10).split("-").reverse().join("/");
    const moeda=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

    async function carregarNotificacoes(){
      try{
        const {data:sessao}=await supabase.auth.getSession();
        const authId=sessao.session?.user.id||"";
        const login=localStorage.getItem("somos-eleva-usuario")||"";
        const matricula=localStorage.getItem("somos-eleva-matricula")||login;
        const nomeLocal=localStorage.getItem("somos-eleva-nome")||nome||"";
        const {data:us}=await supabase.from("usuarios").select("id,nome,email,matricula");
        const u=(us||[]).find((x:any)=>String(x.id||"")===authId||String(x.id||"")===login||String(x.matricula||"")===matricula||normalizarTexto(String(x.email||""))===normalizarTexto(login)||normalizarTexto(String(x.nome||""))===normalizarTexto(nomeLocal));
        const uid=String(u?.id||authId||""); if(!uid)return;
        if(ativo)setUsuarioBancoId(uid);

        const comp=hojeIso().slice(0,7);
        const [d,p,si,sp,ifg,ip,fo,lr]=await Promise.all([
          supabase.from("despesas_recorrentes").select("*").eq("ativo",true),
          supabase.from("despesas_recorrentes_pagamentos").select("despesa_recorrente_id").eq("competencia",comp),
          supabase.from("controle_simples_nacional").select("id,valor_imposto,vencimento,status"),
          supabase.from("simples_parcelas").select("id,numero_parcela,valor,vencimento,status"),
          supabase.from("controle_inss_fgts").select("id,tipo,valor,vencimento,status"),
          supabase.from("inss_parcelas").select("id,numero_parcela,valor,vencimento,status"),
          supabase.from("folha_pagamentos").select("id,total_dia05,pagamento_realizado").eq("competencia",comp),
          supabase.from("notificacoes_leituras").select("chave_notificacao").eq("usuario_id",uid),
        ]);
        const itens:NotificacaoSistema[]=[];
        const aviso=(chave:string,titulo:string,descricao:string,venc:string,href="/financeiro")=>{
          const dias=diasAte(venc); if(dias>5)return;
          if(dias<0)itens.push({chave,tipo:"urgente",titulo:`${titulo} atrasado`,descricao:`${descricao} • venceu ${br(venc)}`,href,dataReferencia:venc});
          else if(dias===0)itens.push({chave,tipo:"urgente",titulo:`${titulo} vence hoje`,descricao:`${descricao} • ${br(venc)}`,href,dataReferencia:venc});
          else itens.push({chave,tipo:"atencao",titulo:`${titulo} vence em ${dias} dia${dias===1?"":"s"}`,descricao:`${descricao} • ${br(venc)}`,href,dataReferencia:venc});
        };
        const pagos=new Set((p.data||[]).map((x:any)=>String(x.despesa_recorrente_id)));
        for(const x of d.data||[]){
          if(comp<String(x.inicio_competencia||"")||(x.fim_competencia&&comp>String(x.fim_competencia))||pagos.has(String(x.id)))continue;
          const [a,m]=comp.split("-").map(Number),ultimo=new Date(a,m,0).getDate(),dia=Math.min(Math.max(Number(x.dia_vencimento||1),1),ultimo);
          aviso(`despesa:${x.id}:${comp}`,String(x.nome||"Despesa"),moeda(Number(x.valor||0)),`${comp}-${String(dia).padStart(2,"0")}`);
        }
        for(const x of si.data||[])if(x.status!=="Pago")aviso(`simples:${x.id}`,"Simples Nacional",moeda(Number(x.valor_imposto||0)),x.vencimento);
        for(const x of sp.data||[])if(x.status!=="Pago")aviso(`simples-parcela:${x.id}`,`Parcela ${x.numero_parcela} do Simples`,moeda(Number(x.valor||0)),x.vencimento);
        for(const x of ifg.data||[])if(x.status!=="Pago")aviso(`encargo:${x.id}`,String(x.tipo||"INSS/FGTS"),moeda(Number(x.valor||0)),x.vencimento);
        for(const x of ip.data||[])if(x.status!=="Pago")aviso(`inss-parcela:${x.id}`,`Parcela ${x.numero_parcela} do INSS`,moeda(Number(x.valor||0)),x.vencimento);
        const folhas=(fo.data||[]).filter((x:any)=>!x.pagamento_realizado);
        if(folhas.length)aviso(`folha:${comp}`,"Folha de pagamento",`${folhas.length} pagamento(s) pendente(s) • ${moeda(folhas.reduce((t:number,x:any)=>t+Number(x.total_dia05||0),0))}`,`${comp}-05`);
        if(ativo){setNotificacoes(itens.sort((a,b)=>(a.dataReferencia||"").localeCompare(b.dataReferencia||"")));setLidas(new Set((lr.data||[]).map((x:any)=>String(x.chave_notificacao))))}
      }catch(e){console.error("Erro ao carregar notificações:",e)}
    }
    void carregarNotificacoes();
    const timer=window.setInterval(()=>void carregarNotificacoes(),300000);
    const foco=()=>void carregarNotificacoes(); window.addEventListener("focus",foco);
    return()=>{ativo=false;window.clearInterval(timer);window.removeEventListener("focus",foco)}
  },[podeVerNotificacoes,supabase,nome]);

  const notificacoesNaoLidas=notificacoes.filter(n=>!lidas.has(n.chave));
  async function marcarLida(n:NotificacaoSistema){
    if(!usuarioBancoId||lidas.has(n.chave))return;
    const {error}=await supabase.from("notificacoes_leituras").upsert({usuario_id:usuarioBancoId,chave_notificacao:n.chave,lida_em:new Date().toISOString()},{onConflict:"usuario_id,chave_notificacao"});
    if(!error)setLidas(a=>new Set([...Array.from(a),n.chave]));
  }
  async function marcarTodasLidas(){
    if(!usuarioBancoId||!notificacoesNaoLidas.length)return;
    const {error}=await supabase.from("notificacoes_leituras").upsert(notificacoesNaoLidas.map(n=>({usuario_id:usuarioBancoId,chave_notificacao:n.chave,lida_em:new Date().toISOString()})),{onConflict:"usuario_id,chave_notificacao"});
    if(!error)setLidas(new Set(notificacoes.map(n=>n.chave)));
  }

  useEffect(() => {
    let ativo = true;

    async function carregarPontosHeader() {
      try {
        const { data: sessao } = await supabase.auth.getSession();
        const authId = sessao.session?.user.id || "";

        let usuariosLocais: any[] = [];
        try {
          const bruto = JSON.parse(localStorage.getItem("somos-eleva-usuarios") || "[]");
          usuariosLocais = Array.isArray(bruto) ? bruto : [];
        } catch {
          usuariosLocais = [];
        }

        const login = localStorage.getItem("somos-eleva-usuario") || "";
        const matricula = localStorage.getItem("somos-eleva-matricula") || login;
        const nomeSalvo = localStorage.getItem("somos-eleva-nome") || nome || "";

        const usuarioLocal =
          usuariosLocais.find((u: any) => String(u.id || "") === authId) ||
          usuariosLocais.find((u: any) =>
            String(u.id || "") === login ||
            String(u.matricula || "") === login ||
            String(u.matricula || "") === matricula ||
            normalizarTexto(String(u.email || "")) === normalizarTexto(login)
          ) ||
          usuariosLocais.find((u: any) =>
            normalizarTexto(String(u.nome || "")) === normalizarTexto(nomeSalvo)
          );

        const nomeCarteira = String(usuarioLocal?.nome || nomeSalvo || nome || "").trim();
        const idsPossiveis = new Set(
          [usuarioLocal?.id, authId, login]
            .map((v) => String(v || "").trim())
            .filter(Boolean)
        );

        const { data: extratoCompleto, error: erroExtrato } = await supabase
          .from("pontos_extrato")
          .select("usuario_id, usuario_nome, tipo, pontos");

        if (erroExtrato) throw erroExtrato;

        const nomeNormalizado = normalizarTexto(nomeCarteira);
        const extratoUsuario = (extratoCompleto || []).filter((item: any) => {
          const id = String(item.usuario_id || "").trim();
          return (
            (Boolean(id) && idsPossiveis.has(id)) ||
            (Boolean(nomeNormalizado) &&
              normalizarTexto(String(item.usuario_nome || "")) === nomeNormalizado)
          );
        });

        const saldo = extratoUsuario.reduce((total: number, item: any) => {
          const valor = Number(item.pontos || 0);
          return item.tipo === "DEBITO"
            ? total - Math.abs(valor)
            : total + valor;
        }, 0);

        const saldoSeguro = Number.isFinite(saldo) ? Math.max(saldo, 0) : 0;

        if (ativo) {
          setPontosHeader(saldoSeguro);
          localStorage.setItem("somos-eleva-pontos-header", String(saldoSeguro));
        }
      } catch (erro) {
        console.error("Erro ao carregar pontos do cabeçalho:", erro);
        const valorSalvo = Number(localStorage.getItem("somos-eleva-pontos-header") || 0);
        if (ativo) setPontosHeader(Number.isFinite(valorSalvo) ? valorSalvo : 0);
      }
    }

    function atualizarPontosHeader(event?: Event) {
      if (event instanceof CustomEvent) {
        const valorEvento = Number(event.detail);
        if (Number.isFinite(valorEvento)) {
          setPontosHeader(valorEvento);
          localStorage.setItem(
            "somos-eleva-pontos-header",
            String(valorEvento)
          );
        }
      }
      void carregarPontosHeader();
    }

    void carregarPontosHeader();

    window.addEventListener(
      "somos-eleva-pontos-atualizados",
      atualizarPontosHeader
    );
    window.addEventListener("storage", atualizarPontosHeader);
    window.addEventListener("focus", atualizarPontosHeader);

    return () => {
      ativo = false;
      window.removeEventListener(
        "somos-eleva-pontos-atualizados",
        atualizarPontosHeader
      );
      window.removeEventListener("storage", atualizarPontosHeader);
      window.removeEventListener("focus", atualizarPontosHeader);
    };
  }, [supabase, nome]);

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

            {podeVerNotificacoes && (
              <button type="button" className="shell-notification-button" onClick={()=>setPainelNotificacoes(true)} title="Notificações">
                <Bell size={18} strokeWidth={2.2}/>
                {notificacoesNaoLidas.length>0&&<b>{notificacoesNaoLidas.length>99?"99+":notificacoesNaoLidas.length}</b>}
              </button>
            )}

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
      {podeVerNotificacoes&&painelNotificacoes&&<>
        <button type="button" className="shell-notification-overlay" onClick={()=>setPainelNotificacoes(false)} aria-label="Fechar notificações"/>
        <aside className="shell-notification-drawer">
          <header><div><span>CENTRAL DE ALERTAS</span><h2>Notificações</h2><p>{notificacoesNaoLidas.length} não lida(s)</p></div><button type="button" className="close" onClick={()=>setPainelNotificacoes(false)}><X size={20}/></button></header>
          <div className="shell-notification-toolbar"><strong>Vencimentos e pendências</strong>{notificacoesNaoLidas.length>0&&<button type="button" onClick={()=>void marcarTodasLidas()}><CheckCheck size={15}/> Marcar todas como lidas</button>}</div>
          <div className="shell-notification-list">
            {!notificacoesNaoLidas.length?<div className="shell-notification-empty"><Bell size={28}/><strong>Tudo conferido</strong><span>Não há novas notificações para você.</span></div>:
            notificacoesNaoLidas.map(n=><Link key={n.chave} href={n.href} className={`shell-notification-item ${n.tipo}`} onClick={()=>{void marcarLida(n);setPainelNotificacoes(false)}}><i/><div><strong>{n.titulo}</strong><span>{n.descricao}</span></div><button type="button" title="Marcar como lida" onClick={e=>{e.preventDefault();e.stopPropagation();void marcarLida(n)}}>✓</button></Link>)}
          </div>
        </aside>
      </>}
    </div>
  );
}