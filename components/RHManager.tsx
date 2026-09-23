"use client";

import {
  type FormEvent,
  type ReactNode,
  useId,
  useRef,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import "./rh-moderno.css";
import ControlePontoRH from "./ControlePontoRH";
import OcorrenciasEmpresaRH from "./OcorrenciasEmpresaRH";

type StatusColaboradora =
  | "Ativa"
  | "Férias"
  | "Afastada"
  | "Desligada";

type TipoContrato =
  | "CLT"
  | "Estágio"
  | "Prestadora"
  | "Outro";

type TipoRegistro =
  | "Vale"
  | "Falta"
  | "Atraso"
  | "Férias"
  | "Afastamento"
  | "Advertência"
  | "Outro";

type UsuarioSistema = {
  id: string;
  nome: string;
  email?: string;
  matricula?: string;
  perfil?: string;
  equipe?: string;
  ativo?: boolean;
  foto?: string;
};

type ColaboradoraRH = {
  id: string;
  usuarioId: string;
  nome: string;
  foto: string;
  matricula: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  email: string;
  endereco: string;
  cargo: string;
  equipe: string;
  dataAdmissao: string;
  tipoContrato: TipoContrato;
  salarioBase: number;
  jornada: string;
  status: StatusColaboradora;
  contatoEmergencia: string;
  telefoneEmergencia: string;
  observacoes: string;
  criadaEm: string;
};

type RegistroRH = {
  id: string;
  colaboradoraId: string;
  nome: string;
  matricula: string;
  tipo: TipoRegistro;
  data: string;
  competencia: string;
  valor: number;
  quantidade: number;
  unidade: "Dias" | "Horas" | "Ocorrência";
  justificada: boolean;
  descontarNaFolha: boolean;
  descontarPremiacao: boolean;
  cancelaAssiduidade: boolean;
  descricao: string;
  criadoEm: string;
  descontadoNaFolha: boolean;
  dataDesconto: string;
};

type FormularioColaboradora = {
  usuarioId: string;
  nome: string;
  foto: string;
  matricula: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  email: string;
  endereco: string;
  cargo: string;
  equipe: string;
  dataAdmissao: string;
  tipoContrato: TipoContrato;
  salarioBase: string;
  jornada: string;
  status: StatusColaboradora;
  contatoEmergencia: string;
  telefoneEmergencia: string;
  observacoes: string;
};

type FormularioRegistro = {
  colaboradoraId: string;
  tipo: TipoRegistro;
  data: string;
  competencia: string;
  valor: string;
  quantidade: string;
  unidade: "Dias" | "Horas" | "Ocorrência";
  justificada: boolean;
  descontarNaFolha: boolean;
  descontarPremiacao: boolean;
  cancelaAssiduidade: boolean;
  descricao: string;
};

const TIPOS_REGISTRO: TipoRegistro[] = [
  "Vale",
  "Falta",
  "Atraso",
  "Férias",
  "Afastamento",
  "Advertência",
  "Outro",
];

const hoje = () => dataAtualRH();

const competenciaAtual = () => hoje().slice(0, 7);

const colaboradoraVazia: FormularioColaboradora = {
  usuarioId: "",
  nome: "",
  foto: "",
  matricula: "",
  cpf: "",
  dataNascimento: "",
  telefone: "",
  email: "",
  endereco: "",
  cargo: "",
  equipe: "",
  dataAdmissao: "",
  tipoContrato: "CLT",
  salarioBase: "1.621,00",
  jornada: "08:30 às 18:00",
  status: "Ativa",
  contatoEmergencia: "",
  telefoneEmergencia: "",
  observacoes: "",
};

const registroVazio: FormularioRegistro = {
  colaboradoraId: "",
  tipo: "Vale",
  data: hoje(),
  competencia: competenciaAtual(),
  valor: "",
  quantidade: "1",
  unidade: "Ocorrência",
  justificada: false,
  descontarNaFolha: true,
  descontarPremiacao: false,
  cancelaAssiduidade: false,
  descricao: "",
};

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function proximaMatricula(
  colaboradoras: ColaboradoraRH[]
) {
  const numeros = colaboradoras
    .map((colaboradora) =>
      Number(
        somenteNumeros(
          colaboradora.matricula || ""
        )
      )
    )
    .filter(
      (numero) =>
        Number.isFinite(numero) &&
        numero > 0
    );

  const maior =
    numeros.length > 0
      ? Math.max(...numeros)
      : 0;

  return String(maior + 1).padStart(4, "0");
}


function garantirMatriculasUnicas(
  lista: ColaboradoraRH[],
  jaUsadas: string[] = []
) {
  const usadas = new Set(
    jaUsadas
      .map((valor) => somenteNumeros(valor))
      .filter(Boolean)
  );

  let maior = Math.max(
    0,
    ...Array.from(usadas)
      .map((valor) => Number(valor))
      .filter((numero) => Number.isFinite(numero))
  );

  return lista.map((colaboradora) => {
    let matricula = somenteNumeros(
      colaboradora.matricula || ""
    );

    if (!matricula || usadas.has(matricula)) {
      do {
        maior += 1;
        matricula = String(maior).padStart(4, "0");
      } while (usadas.has(matricula));
    }

    usadas.add(matricula);

    return {
      ...colaboradora,
      matricula,
    };
  });
}

function converterNumero(valor: string) {
  const convertido = Number(
    valor
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );

  return Number.isFinite(convertido) ? convertido : 0;
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarCompetencia(valor: string) {
  if (!valor) return "—";

  const [ano, mes] = valor.split("-");

  return new Date(
    Number(ano),
    Number(mes) - 1,
    1
  ).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function criarColaboradoraDoUsuario(
  usuario: UsuarioSistema
): ColaboradoraRH {
  return {
    id: `rh-${usuario.id}`,
    usuarioId: usuario.id,
    nome: usuario.nome,
    foto: usuario.foto || "",
    matricula: usuario.matricula || "",
    cpf: "",
    dataNascimento: "",
    telefone: "",
    email: usuario.email || "",
    endereco: "",
    cargo: usuario.perfil || "",
    equipe: usuario.equipe || "",
    dataAdmissao: "",
    tipoContrato: "CLT",
    salarioBase: 1621,
    jornada: "08:30 às 18:00",
    status:
      usuario.ativo === false ? "Desligada" : "Ativa",
    contatoEmergencia: "",
    telefoneEmergencia: "",
    observacoes: "",
    criadaEm: new Date().toLocaleString("pt-BR"),
  };
}

type AbaRH = "visao" | "colaboradoras" | "registros" | "ponto" | "ocorrencias" | "ferias" | "aniversarios";
type AbaFicha = "resumo" | "pessoal" | "contrato" | "historico";
type IconeNome = "pessoas" | "mais" | "busca" | "calendario" | "relogio" | "carteira" | "dinheiro" | "alerta" | "presente" | "seta" | "fechar" | "editar" | "excluir" | "painel" | "arquivo";

function IconeRH({ nome, tamanho = 20 }: { nome: IconeNome; tamanho?: number }) {
  const caminhos: Record<IconeNome, ReactNode> = {
    pessoas: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5.65"/></>,
    mais: <path d="M12 5v14M5 12h14"/>,
    busca: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    calendario: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/></>,
    relogio: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    carteira: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 8h18M16 12h5v5h-5a2.5 2.5 0 0 1 0-5"/></>,
    dinheiro: <><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M7 9H5v2M17 15h2v-2"/></>,
    alerta: <><path d="M10.2 4a2 2 0 0 1 3.6 0l7 13A2 2 0 0 1 19 20H5a2 2 0 0 1-1.8-3Z"/><path d="M12 9v4M12 16h.01"/></>,
    presente: <><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8H8a2.5 2.5 0 1 1 2.3-3.5L12 8ZM12 8h4a2.5 2.5 0 1 0-2.3-3.5L12 8Z"/></>,
    seta: <path d="m9 5 7 7-7 7"/>,
    fechar: <path d="m6 6 12 12M6 18 18 6"/>,
    editar: <><path d="m16 3 5 5-12 12-6 1 1-6ZM14 5l5 5"/></>,
    excluir: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
    painel: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    arquivo: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></>,
  };
  return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{caminhos[nome]}</svg>;
}

function normalizarRH(valor: string) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function dataAtualRH() {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const valor = (tipo: string) => partes.find((item) => item.type === tipo)?.value || "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function dataRH(valor: string) {
  const data = String(valor || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return valor || "Não informado";
  return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
}

function iniciaisRH(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return partes.length > 1 ? `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase() : (partes[0] || "RH").slice(0, 2).toUpperCase();
}

function camposPendentesRH(item: ColaboradoraRH): string[] {
  const campos: Array<[string, string]> = [
    [item.cpf, "CPF"], [item.dataNascimento, "nascimento"], [item.telefone, "telefone"],
    [item.cargo, "cargo"], [item.equipe, "equipe"], [item.dataAdmissao, "admissão"],
  ];
  return campos.filter(([valor]) => !String(valor || "").trim()).map(([, rotulo]) => rotulo);
}

function AvatarRH({ pessoa, grande = false }: { pessoa: Pick<ColaboradoraRH, "nome" | "foto">; grande?: boolean }) {
  const [fotoComErro, setFotoComErro] = useState(false);
  useEffect(() => setFotoComErro(false), [pessoa.foto]);
  return <span className={`hrm-avatar${grande ? " hrm-avatar-large" : ""}`}>
    {pessoa.foto && !fotoComErro ? <img src={pessoa.foto} alt="" onError={() => setFotoComErro(true)} /> : iniciaisRH(pessoa.nome)}
  </span>;
}

function StatusRH({ status }: { status: string }) {
  return <span className={`hrm-badge hrm-status-${normalizarRH(status)}`}><span className="hrm-dot" />{status}</span>;
}

function CampoFichaRH({ titulo, valor }: { titulo: string; valor?: ReactNode }) {
  return <div className="hrm-info-field"><dt>{titulo}</dt><dd>{valor || "Não informado"}</dd></div>;
}

function JanelaRH({ titulo, subtitulo, children, aoFechar, ocupada = false, ampla = false }: {
  titulo: string; subtitulo?: string; children: ReactNode; aoFechar: () => void; ocupada?: boolean; ampla?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const elemento = ref.current;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    if (elemento && !elemento.open) elemento.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (elemento?.open) elemento.close();
      document.body.style.overflow = overflow;
      if (anterior?.isConnected) anterior.focus();
    };
  }, []);
  return <dialog ref={ref} className={`hrm-dialog${ampla ? " hrm-dialog-wide" : ""}`} aria-labelledby={id}
    onCancel={(e) => { e.preventDefault(); if (!ocupada) aoFechar(); }}>
    <header className="hrm-dialog-heading"><div><span className="hrm-eyebrow">GESTÃO DE PESSOAS</span><h2 id={id}>{titulo}</h2>{subtitulo && <p>{subtitulo}</p>}</div>
      <button type="button" className="hrm-icon-button" aria-label="Fechar janela" onClick={aoFechar} disabled={ocupada}><IconeRH nome="fechar" /></button>
    </header>
    <div className="hrm-dialog-content">{children}</div>
  </dialog>;
}


export default function RHManager() {
  const supabase = useMemo(() => createClient(), []);

  const [usuarios, setUsuarios] =
    useState<UsuarioSistema[]>([]);

  const [colaboradoras, setColaboradoras] =
    useState<ColaboradoraRH[]>([]);

  const [registros, setRegistros] =
    useState<RegistroRH[]>([]);

  const [formColaboradora, setFormColaboradora] =
    useState<FormularioColaboradora>(
      colaboradoraVazia
    );

  const [formRegistro, setFormRegistro] =
    useState<FormularioRegistro>(registroVazio);

  const [
    editandoColaboradoraId,
    setEditandoColaboradoraId,
  ] = useState<string | null>(null);

  const [buscaColaboradora, setBuscaColaboradora] =
    useState("");

  const [filtroStatus, setFiltroStatus] =
    useState("Todos");

  const [mensagemColaboradora, setMensagemColaboradora] =
    useState("");

  const [mensagemRegistro, setMensagemRegistro] =
    useState("");

  const [abaRH, setAbaRH] = useState<AbaRH>("visao");
  const [mesReferencia, setMesReferencia] = useState(competenciaAtual());
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [somentePendentes, setSomentePendentes] = useState(false);
  const [buscaRegistro, setBuscaRegistro] = useState("");
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState("");
  const [filtroPessoaRegistro, setFiltroPessoaRegistro] = useState("");
  const [mesHistorico, setMesHistorico] = useState("");
  const [filtroDescontoVale, setFiltroDescontoVale] = useState<"pendentes" | "descontados" | "todos">("pendentes");
  const [mesAniversarios, setMesAniversarios] = useState(competenciaAtual().slice(5, 7));
  const [paginaPessoas, setPaginaPessoas] = useState(1);
  const [paginaRegistros, setPaginaRegistros] = useState(1);
  const [modalColaboradora, setModalColaboradora] = useState(false);
  const [modalRegistro, setModalRegistro] = useState(false);
  const [editandoRegistroId, setEditandoRegistroId] = useState<string | null>(null);
  const [fichaAbertaId, setFichaAbertaId] = useState<string | null>(null);
  const [abaFicha, setAbaFicha] = useState<AbaFicha>("resumo");
  const [carregandoRH, setCarregandoRH] = useState(true);
  const [erroCarregamentoRH, setErroCarregamentoRH] = useState("");
  const [recarregarRH, setRecarregarRH] = useState(0);
  const [salvandoPessoa, setSalvandoPessoa] = useState(false);
  const [salvandoEvento, setSalvandoEvento] = useState(false);
  const [excluindoRH, setExcluindoRH] = useState("");
  const [avisoRH, setAvisoRH] = useState("");
  const baseFormularioRH = useRef(JSON.stringify(colaboradoraVazia));
  const baseRegistroRH = useRef(JSON.stringify(registroVazio));


  useEffect(() => {
    if (
      editandoColaboradoraId ||
      formColaboradora.matricula
    ) {
      return;
    }

    setFormColaboradora((atual) => ({
      ...atual,
      matricula:
        proximaMatricula(colaboradoras),
    }));
  }, [
    colaboradoras,
    editandoColaboradoraId,
    formColaboradora.matricula,
  ]);

  useEffect(() => {
    let cancelado = false;

    async function carregarRH() {
      setCarregandoRH(true);
      setErroCarregamentoRH("");
      try {
        const [
          respostaUsuarios,
          respostaColaboradoras,
          respostaRegistros,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(`
              id,
              nome,
              email,
              perfil,
              equipe,
              ativo,
              foto_url
            `)
            .order("nome", {
              ascending: true,
            }),

          supabase
            .from("rh_colaboradoras")
            .select("*")
            .order("nome", {
              ascending: true,
            }),

          supabase
            .from("rh_registros")
            .select("*")
            .order("data", {
              ascending: false,
            }),
        ]);

        if (respostaUsuarios.error) {
          throw respostaUsuarios.error;
        }

        if (respostaColaboradoras.error) {
          throw respostaColaboradoras.error;
        }

        if (respostaRegistros.error) {
          throw respostaRegistros.error;
        }

        let listaUsuarios: UsuarioSistema[] = (
          Array.isArray(respostaUsuarios.data)
            ? respostaUsuarios.data
            : []
        ).map((usuario) => ({
          id: String(usuario.id),
          nome: String(usuario.nome || ""),
          email: String(usuario.email || ""),
          matricula: "",
          perfil: String(usuario.perfil || ""),
          equipe: String(usuario.equipe || ""),
          ativo: usuario.ativo !== false,
          foto: String(usuario.foto_url || ""),
        }));

        let listaColaboradoras: ColaboradoraRH[] = (
          Array.isArray(respostaColaboradoras.data)
            ? respostaColaboradoras.data
            : []
        ).map((registro) => ({
          id: String(registro.id),
          usuarioId: String(registro.usuario_id || ""),
          nome: String(registro.nome || ""),
          foto: String(registro.foto || ""),
          matricula: String(registro.matricula || ""),
          cpf: String(registro.cpf || ""),
          dataNascimento: String(
            registro.data_nascimento || ""
          ),
          telefone: String(registro.telefone || ""),
          email: String(registro.email || ""),
          endereco: String(registro.endereco || ""),
          cargo: String(registro.cargo || ""),
          equipe: String(registro.equipe || ""),
          dataAdmissao: String(
            registro.data_admissao || ""
          ),
          tipoContrato:
            (registro.tipo_contrato || "CLT") as TipoContrato,
          salarioBase: Number(
            registro.salario_base || 0
          ),
          jornada: String(registro.jornada || ""),
          status:
            (registro.status || "Ativa") as StatusColaboradora,
          contatoEmergencia: String(
            registro.contato_emergencia || ""
          ),
          telefoneEmergencia: String(
            registro.telefone_emergencia || ""
          ),
          observacoes: String(
            registro.observacoes || ""
          ),
          criadaEm: String(registro.criada_em || ""),
        }));

        let listaRegistros: RegistroRH[] = (
          Array.isArray(respostaRegistros.data)
            ? respostaRegistros.data
            : []
        ).map((registro) => ({
          id: String(registro.id),
          colaboradoraId: String(
            registro.colaboradora_id || ""
          ),
          nome: String(registro.nome || ""),
          matricula: String(registro.matricula || ""),
          tipo: registro.tipo as TipoRegistro,
          data: String(registro.data || ""),
          competencia: String(
            registro.competencia || ""
          ),
          valor: Number(registro.valor || 0),
          quantidade: Number(registro.quantidade || 0),
          unidade:
            (registro.unidade || "Ocorrência") as
              | "Dias"
              | "Horas"
              | "Ocorrência",
          justificada: Boolean(registro.justificada),
          descontarNaFolha: Boolean(
            registro.descontar_na_folha
          ),
          descontarPremiacao: Boolean(
            registro.descontar_premiacao
          ),
          cancelaAssiduidade: Boolean(
            registro.cancela_assiduidade
          ),
          descricao: String(registro.descricao || ""),
          criadoEm: String(registro.criado_em || ""),
          descontadoNaFolha: Boolean(registro.descontado_na_folha),
          dataDesconto: String(registro.data_desconto || ""),
        }));

        // Migra automaticamente o que já existia no navegador.
        if (!listaColaboradoras.length) {
          try {
            const antigas = JSON.parse(
              localStorage.getItem(
                "somos-eleva-rh-colaboradoras"
              ) || "[]"
            );

            if (Array.isArray(antigas) && antigas.length) {
              const antigasComMatricula =
                garantirMatriculasUnicas(
                  antigas as ColaboradoraRH[]
                );

              const payload = antigasComMatricula.map(
                (colaboradora) => ({
                  id: colaboradora.id,
                  usuario_id:
                    colaboradora.usuarioId || null,
                  nome: colaboradora.nome,
                  foto: colaboradora.foto || "",
                  matricula:
                    colaboradora.matricula,
                  cpf: colaboradora.cpf || "",
                  data_nascimento:
                    colaboradora.dataNascimento || null,
                  telefone:
                    colaboradora.telefone || "",
                  email: colaboradora.email || "",
                  endereco:
                    colaboradora.endereco || "",
                  cargo: colaboradora.cargo || "",
                  equipe: colaboradora.equipe || "",
                  data_admissao:
                    colaboradora.dataAdmissao || null,
                  tipo_contrato:
                    colaboradora.tipoContrato || "CLT",
                  salario_base: Number(
                    colaboradora.salarioBase || 0
                  ),
                  jornada:
                    colaboradora.jornada || "",
                  status:
                    colaboradora.status || "Ativa",
                  contato_emergencia:
                    colaboradora.contatoEmergencia || "",
                  telefone_emergencia:
                    colaboradora.telefoneEmergencia || "",
                  observacoes:
                    colaboradora.observacoes || "",
                  // Datas antigas estavam em pt-BR (ex.: 13/08/2026, 10:00:34).
                  // O Supabase espera timestamptz válido, então usamos ISO na migração.
                  criada_em:
                    new Date().toISOString(),
                })
              );

              const { error } = await supabase
                .from("rh_colaboradoras")
                .upsert(payload, {
                  onConflict: "id",
                });

              if (error) throw error;
              listaColaboradoras =
                antigasComMatricula;
            }
          } catch (erroMigracao) {
            console.error(
              "Não foi possível migrar as fichas antigas do RH:",
              erroMigracao
            );
          }
        }

        if (!listaRegistros.length) {
          try {
            const antigos = JSON.parse(
              localStorage.getItem(
                "somos-eleva-rh-registros"
              ) || "[]"
            );

            if (Array.isArray(antigos) && antigos.length) {
              const payload = antigos.map(
                (registro: RegistroRH) => ({
                  id: registro.id,
                  colaboradora_id:
                    registro.colaboradoraId,
                  nome: registro.nome,
                  matricula: registro.matricula,
                  tipo: registro.tipo,
                  data: registro.data,
                  competencia: registro.competencia,
                  valor: Number(registro.valor || 0),
                  quantidade: Number(
                    registro.quantidade || 0
                  ),
                  unidade: registro.unidade,
                  justificada: registro.justificada,
                  descontar_na_folha:
                    registro.descontarNaFolha,
                  descontar_premiacao:
                    registro.descontarPremiacao || false,
                  cancela_assiduidade:
                    registro.cancelaAssiduidade,
                  descricao: registro.descricao || "",
                  criado_em:
                    new Date().toISOString(),
                  descontado_na_folha: false,
                  data_desconto: null,
                })
              );

              const { error } = await supabase
                .from("rh_registros")
                .upsert(payload, {
                  onConflict: "id",
                });

              if (error) throw error;
              listaRegistros = antigos;
            }
          } catch (erroMigracao) {
            console.error(
              "Não foi possível migrar os registros antigos do RH:",
              erroMigracao
            );
          }
        }

        // Garante que cada usuária do sistema tenha ficha-base no RH.
        const usuariosSemFicha = listaUsuarios.filter(
          (usuario) =>
            !listaColaboradoras.some(
              (colaboradora) =>
                colaboradora.usuarioId === usuario.id
            )
        );

        if (usuariosSemFicha.length) {
          const novasSemMatricula =
            usuariosSemFicha.map(
              criarColaboradoraDoUsuario
            );

          const novas =
            garantirMatriculasUnicas(
              novasSemMatricula,
              listaColaboradoras.map(
                (colaboradora) =>
                  colaboradora.matricula
              )
            );

          const payload = novas.map(
            (colaboradora) => ({
              id: colaboradora.id,
              usuario_id: colaboradora.usuarioId,
              nome: colaboradora.nome,
              foto: colaboradora.foto,
              matricula: colaboradora.matricula,
              cpf: colaboradora.cpf,
              data_nascimento: null,
              telefone: colaboradora.telefone,
              email: colaboradora.email,
              endereco: colaboradora.endereco,
              cargo: colaboradora.cargo,
              equipe: colaboradora.equipe,
              data_admissao: null,
              tipo_contrato: colaboradora.tipoContrato,
              salario_base: colaboradora.salarioBase,
              jornada: colaboradora.jornada,
              status: colaboradora.status,
              contato_emergencia:
                colaboradora.contatoEmergencia,
              telefone_emergencia:
                colaboradora.telefoneEmergencia,
              observacoes: colaboradora.observacoes,
              criada_em: new Date().toISOString(),
            })
          );

          const { error } = await supabase
            .from("rh_colaboradoras")
            .upsert(payload, {
              onConflict: "id",
            });

          if (error) throw error;

          listaColaboradoras = [
            ...listaColaboradoras,
            ...novas,
          ];
        }

        // Sincroniza a foto do RH com a foto já cadastrada em Equipe / profiles.
        // Prioridade: profiles.foto_url -> foto própria do RH -> iniciais.
        const fotoPorUsuario = new Map(
          listaUsuarios.map((usuario) => [usuario.id, usuario.foto || ""])
        );

        listaColaboradoras = listaColaboradoras.map((colaboradora) => {
          const fotoEquipe = colaboradora.usuarioId
            ? fotoPorUsuario.get(colaboradora.usuarioId) || ""
            : "";

          return {
            ...colaboradora,
            foto: fotoEquipe || colaboradora.foto || "",
          };
        });

        listaUsuarios = listaUsuarios.map((usuario) => {
          const ficha = listaColaboradoras.find(
            (colaboradora) =>
              colaboradora.usuarioId === usuario.id
          );

          return {
            ...usuario,
            matricula: ficha?.matricula || "",
            foto: usuario.foto || ficha?.foto || "",
          };
        });

        if (cancelado) return;

        setUsuarios(listaUsuarios);
        setColaboradoras(listaColaboradoras);
        setRegistros(listaRegistros);

        if (listaColaboradoras.length) {
          setFormRegistro((dados) => ({
            ...dados,
            colaboradoraId:
              dados.colaboradoraId ||
              listaColaboradoras[0].id,
          }));
        }
      } catch (erro) {
        console.error(
          "Erro ao carregar RH do Supabase:",
          erro
        );
        if (!cancelado) setErroCarregamentoRH("Não foi possível carregar os dados do RH. Nenhuma ficha foi removida por esta tela.");
      } finally {
        if (!cancelado) setCarregandoRH(false);
      }
    }

    void carregarRH();

    return () => {
      cancelado = true;
    };
  }, [supabase, recarregarRH]);

  const colaboradorasFiltradas = useMemo(() => {
    const termo = normalizarRH(buscaColaboradora);
    return colaboradoras.filter((item) => (filtroStatus === "Todos" || item.status === filtroStatus) &&
      (!termo || normalizarRH(`${item.nome} ${item.matricula} ${item.cargo} ${item.equipe}`).includes(termo)));
  }, [colaboradoras, buscaColaboradora, filtroStatus]);

  const registrosOrdenados = useMemo(
    () =>
      [...registros].sort((a, b) =>
        b.data.localeCompare(a.data)
      ),
    [registros]
  );

  const resumo = useMemo(() => {
    const competencia = mesReferencia;

    const registrosMes = registros.filter(
      (registro) =>
        registro.competencia === competencia
    );

    const totalVales = registrosMes
      .filter(
        (registro) => registro.tipo === "Vale"
      )
      .reduce(
        (total, registro) =>
          total + Number(registro.valor || 0),
        0
      );

    const faltas = registrosMes.filter(
      (registro) => registro.tipo === "Falta"
    ).length;

    const atrasos = registrosMes.filter(
      (registro) => registro.tipo === "Atraso"
    ).length;

    return {
      total: colaboradoras.length,
      ativas: colaboradoras.filter(
        (colaboradora) =>
          colaboradora.status === "Ativa"
      ).length,
      totalVales,
      faltas,
      atrasos,
    };
  }, [colaboradoras, registros, mesReferencia]);

  function selecionarUsuario(usuarioId: string) {
    const fichaExistente = colaboradoras.find((item) => item.usuarioId && item.usuarioId === usuarioId);
    if (fichaExistente) {
      editarColaboradora(fichaExistente);
      return;
    }
    const usuario = usuarios.find(
      (item) => item.id === usuarioId
    );

    if (!usuario) {
      setFormColaboradora(colaboradoraVazia);
      return;
    }

    setEditandoColaboradoraId(null);

    setFormColaboradora({
      ...colaboradoraVazia,
      usuarioId: usuario.id,
      nome: usuario.nome,
      foto: usuario.foto || "",
      matricula:
        usuario.matricula ||
        proximaMatricula(colaboradoras),
      email: usuario.email || "",
      cargo: usuario.perfil || "",
      equipe: usuario.equipe || "",
      status:
        usuario.ativo === false
          ? "Desligada"
          : "Ativa",
    });
  }

  async function salvarColaboradora(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();
    setMensagemColaboradora("");

    if (!formColaboradora.nome.trim()) {
      setMensagemColaboradora(
        "Informe o nome da colaboradora."
      );
      return;
    }

    const matricula = somenteNumeros(
      formColaboradora.matricula ||
        proximaMatricula(colaboradoras)
    );

    const matriculaDuplicada = colaboradoras.some(
      (colaboradora) =>
        colaboradora.id !==
          editandoColaboradoraId &&
        colaboradora.matricula === matricula
    );

    if (matriculaDuplicada) {
      setMensagemColaboradora(
        "Já existe uma colaboradora com essa matrícula."
      );
      return;
    }

    const antiga = colaboradoras.find(
      (colaboradora) =>
        colaboradora.id === editandoColaboradoraId
    );

    const novaColaboradora: ColaboradoraRH = {
      id:
        editandoColaboradoraId ||
        crypto.randomUUID(),
      usuarioId: formColaboradora.usuarioId,
      nome: formColaboradora.nome.trim(),
      foto: formColaboradora.foto,
      matricula,
      cpf: somenteNumeros(formColaboradora.cpf),
      dataNascimento:
        formColaboradora.dataNascimento,
      telefone: formColaboradora.telefone.trim(),
      email: formColaboradora.email
        .trim()
        .toLowerCase(),
      endereco: formColaboradora.endereco.trim(),
      cargo: formColaboradora.cargo.trim(),
      equipe: formColaboradora.equipe.trim(),
      dataAdmissao: formColaboradora.dataAdmissao,
      tipoContrato: formColaboradora.tipoContrato,
      salarioBase: converterNumero(
        formColaboradora.salarioBase
      ),
      jornada: formColaboradora.jornada.trim(),
      status: formColaboradora.status,
      contatoEmergencia:
        formColaboradora.contatoEmergencia.trim(),
      telefoneEmergencia:
        formColaboradora.telefoneEmergencia.trim(),
      observacoes:
        formColaboradora.observacoes.trim(),
      criadaEm:
        antiga?.criadaEm ||
        new Date().toISOString(),
    };

    if (salvandoPessoa) return;
    setSalvandoPessoa(true);
    try {
      const { error } = await supabase
        .from("rh_colaboradoras")
        .upsert(
          {
            id: novaColaboradora.id,
            usuario_id:
              novaColaboradora.usuarioId || null,
            nome: novaColaboradora.nome,
            foto: novaColaboradora.foto || "",
            matricula: novaColaboradora.matricula,
            cpf: novaColaboradora.cpf || "",
            data_nascimento:
              novaColaboradora.dataNascimento || null,
            telefone:
              novaColaboradora.telefone || "",
            email: novaColaboradora.email || "",
            endereco:
              novaColaboradora.endereco || "",
            cargo: novaColaboradora.cargo || "",
            equipe: novaColaboradora.equipe || "",
            data_admissao:
              novaColaboradora.dataAdmissao || null,
            tipo_contrato:
              novaColaboradora.tipoContrato,
            salario_base:
              novaColaboradora.salarioBase,
            jornada: novaColaboradora.jornada,
            status: novaColaboradora.status,
            contato_emergencia:
              novaColaboradora.contatoEmergencia,
            telefone_emergencia:
              novaColaboradora.telefoneEmergencia,
            observacoes:
              novaColaboradora.observacoes,
            criada_em: novaColaboradora.criadaEm,
            atualizado_em:
              new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        );

      if (error) throw error;

      setColaboradoras((atuais) =>
        editandoColaboradoraId
          ? atuais.map((colaboradora) =>
              colaboradora.id ===
              editandoColaboradoraId
                ? novaColaboradora
                : colaboradora
            )
          : [novaColaboradora, ...atuais]
      );

      setUsuarios((atuais) =>
        atuais.map((usuario) =>
          usuario.id === novaColaboradora.usuarioId
            ? {
                ...usuario,
                matricula:
                  novaColaboradora.matricula,
              }
            : usuario
        )
      );

      setFormColaboradora({
        ...colaboradoraVazia,
        matricula: proximaMatricula([
          ...colaboradoras,
          novaColaboradora,
        ]),
      });
      setEditandoColaboradoraId(null);

      setMensagemColaboradora(
        editandoColaboradoraId
          ? "Ficha atualizada com sucesso."
          : "Colaboradora cadastrada com sucesso."
      );
      setAvisoRH(editandoColaboradoraId ? "Ficha atualizada com sucesso." : "Colaboradora cadastrada com sucesso.");
      setModalColaboradora(false);
    } catch (erro) {
      console.error(
        "Erro ao salvar colaboradora no Supabase:",
        erro
      );
      setMensagemColaboradora(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar a colaboradora."
      );
    } finally {
      setSalvandoPessoa(false);
    }
  }

  function editarColaboradora(
  colaboradora: ColaboradoraRH
) {
  const salarioConvertido = Number(
    colaboradora.salarioBase || 0
  );

  setEditandoColaboradoraId(colaboradora.id);

  const dadosFormulario: FormularioColaboradora = {
    usuarioId: colaboradora.usuarioId || "",
    nome: colaboradora.nome || "",
    foto: colaboradora.foto || "",
    matricula:
      colaboradora.matricula ||
      proximaMatricula(colaboradoras),
    cpf: colaboradora.cpf || "",
    dataNascimento:
      colaboradora.dataNascimento || "",
    telefone: colaboradora.telefone || "",
    email: colaboradora.email || "",
    endereco: colaboradora.endereco || "",
    cargo: colaboradora.cargo || "",
    equipe: colaboradora.equipe || "",
    dataAdmissao:
      colaboradora.dataAdmissao || "",
    tipoContrato:
      colaboradora.tipoContrato || "CLT",
    salarioBase: salarioConvertido
      .toFixed(2)
      .replace(".", ","),
    jornada:
      colaboradora.jornada || "08:30 às 18:00",
    status: colaboradora.status || "Ativa",
    contatoEmergencia:
      colaboradora.contatoEmergencia || "",
    telefoneEmergencia:
      colaboradora.telefoneEmergencia || "",
    observacoes:
      colaboradora.observacoes || "",
  };
  setFormColaboradora(dadosFormulario);
  baseFormularioRH.current = JSON.stringify(dadosFormulario);
  setFichaAbertaId(null);
  setModalColaboradora(true);

  setMensagemColaboradora(
    `Editando a ficha de ${colaboradora.nome}.`
  );


}
  function cancelarEdicao() {
    setFormColaboradora({
      ...colaboradoraVazia,
      matricula: proximaMatricula(colaboradoras),
    });
    setEditandoColaboradoraId(null);
    setMensagemColaboradora("");
  }

  async function excluirColaboradora(id: string) {
    if (excluindoRH) return;

    const colaboradoraExcluir = colaboradoras.find((item) => item.id === id);
    if (!colaboradoraExcluir) {
      setAvisoRH("Colaboradora não encontrada.");
      return;
    }

    const temHistorico = registros.some(
      (item) => item.colaboradoraId === id
    );

    const aviso = temHistorico
      ? `ATENÇÃO: ${colaboradoraExcluir.nome} possui histórico no RH.\n\nAo continuar, os registros vinculados a esta ficha também serão excluídos.\n\nEsta ação não poderá ser desfeita.\n\nDeseja excluir definitivamente?`
      : `Deseja excluir definitivamente ${colaboradoraExcluir.nome} do RH?\n\nEsta ação não poderá ser desfeita.`;

    if (!window.confirm(aviso)) return;

    setExcluindoRH(id);
    setAvisoRH("");

    try {
      // 1. Exclui o histórico desta ficha.
      const { error: erroRegistros } = await supabase
        .from("rh_registros")
        .delete()
        .eq("colaboradora_id", id);

      if (erroRegistros) throw erroRegistros;

      // 2. Exclui os pontos vinculados, caso existam.
      const { error: erroPonto } = await supabase
        .from("rh_ponto")
        .delete()
        .eq("colaboradora_id", id);

      if (
        erroPonto &&
        !/does not exist|Could not find|schema cache/i.test(
          erroPonto.message || ""
        )
      ) {
        throw erroPonto;
      }

      // 3. Exclui a ficha.
      const { error: erroColaboradora } = await supabase
        .from("rh_colaboradoras")
        .delete()
        .eq("id", id);

      if (erroColaboradora) throw erroColaboradora;

      // 4. Atualiza a tela usando somente os estados existentes neste arquivo.
      setRegistros((atuais) =>
        atuais.filter((item) => item.colaboradoraId !== id)
      );

      setColaboradoras((atuais) =>
        atuais.filter((item) => item.id !== id)
      );

      if (fichaAbertaId === id) {
        setFichaAbertaId(null);
      }

      if (editandoColaboradoraId === id) {
        setEditandoColaboradoraId(null);
        setModalColaboradora(false);
      }

      setAvisoRH(
        `${colaboradoraExcluir.nome} foi excluída definitivamente do RH.`
      );
    } catch (erro) {
      console.error("Erro ao excluir colaboradora do RH:", erro);

      setAvisoRH(
        erro instanceof Error
          ? `Não foi possível excluir: ${erro.message}`
          : "Não foi possível excluir a colaboradora. Os dados foram mantidos."
      );
    } finally {
      setExcluindoRH("");
    }
  }

  async function salvarRegistro(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();
    setMensagemRegistro("");

    const pessoa = colaboradoras.find(
      (item) => item.id === formRegistro.colaboradoraId
    );

    if (!pessoa) {
      setMensagemRegistro("Selecione a colaboradora.");
      return;
    }

    if (!formRegistro.data || !formRegistro.competencia) {
      setMensagemRegistro("Informe a data e a competência.");
      return;
    }

    const anterior = editandoRegistroId
      ? registros.find((item) => item.id === editandoRegistroId)
      : null;

    const novoRegistro: RegistroRH = {
      id: editandoRegistroId || crypto.randomUUID(),
      colaboradoraId: pessoa.id,
      nome: pessoa.nome,
      matricula: pessoa.matricula,
      tipo: formRegistro.tipo,
      data: formRegistro.data,
      competencia: formRegistro.competencia,
      valor: converterNumero(formRegistro.valor),
      quantidade: Number(formRegistro.quantidade || 0),
      unidade: formRegistro.unidade,
      justificada: formRegistro.justificada,
      descontarNaFolha: formRegistro.descontarNaFolha,
      descontarPremiacao: formRegistro.descontarPremiacao,
      cancelaAssiduidade: formRegistro.cancelaAssiduidade,
      descricao: formRegistro.descricao.trim(),
      criadoEm: anterior?.criadoEm || new Date().toISOString(),
      descontadoNaFolha: anterior?.descontadoNaFolha || false,
      dataDesconto: anterior?.dataDesconto || "",
    };

    if (salvandoEvento) return;
    setSalvandoEvento(true);

    try {
      const { error } = await supabase
        .from("rh_registros")
        .upsert(
          {
            id: novoRegistro.id,
            colaboradora_id: novoRegistro.colaboradoraId,
            nome: novoRegistro.nome,
            matricula: novoRegistro.matricula,
            tipo: novoRegistro.tipo,
            data: novoRegistro.data,
            competencia: novoRegistro.competencia,
            valor: novoRegistro.valor,
            quantidade: novoRegistro.quantidade,
            unidade: novoRegistro.unidade,
            justificada: novoRegistro.justificada,
            descontar_na_folha: novoRegistro.descontarNaFolha,
            descontar_premiacao: novoRegistro.descontarPremiacao,
            cancela_assiduidade: novoRegistro.cancelaAssiduidade,
            descricao: novoRegistro.descricao,
            criado_em: novoRegistro.criadoEm,
            descontado_na_folha: novoRegistro.descontadoNaFolha,
            data_desconto: novoRegistro.dataDesconto || null,
          },
          { onConflict: "id" }
        );

      if (error) throw error;

      setRegistros((atuais) =>
        editandoRegistroId
          ? atuais.map((item) =>
              item.id === editandoRegistroId ? novoRegistro : item
            )
          : [novoRegistro, ...atuais]
      );

      setAvisoRH(
        editandoRegistroId
          ? "Registro atualizado com sucesso."
          : "Registro salvo com sucesso."
      );

      setModalRegistro(false);
      setEditandoRegistroId(null);
      setMensagemRegistro("");
    } catch (erro) {
      console.error("Erro ao salvar registro do RH:", erro);
      setMensagemRegistro(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar o registro."
      );
    } finally {
      setSalvandoEvento(false);
    }
  }

  async function marcarValeDescontado(item: RegistroRH) {
    if (item.descontadoNaFolha || excluindoRH) return;

    const dataDesconto = hoje();
    setExcluindoRH(item.id);

    try {
      const { error } = await supabase
        .from("rh_registros")
        .update({
          descontado_na_folha: true,
          data_desconto: dataDesconto,
        })
        .eq("id", item.id);

      if (error) throw error;

      setRegistros((atuais) =>
        atuais.map((registro) =>
          registro.id === item.id
            ? {
                ...registro,
                descontadoNaFolha: true,
                dataDesconto,
              }
            : registro
        )
      );

      setAvisoRH("Registro marcado como descontado na folha.");
    } catch (erro) {
      console.error("Erro ao marcar desconto na folha:", erro);
      setAvisoRH("Não foi possível atualizar o registro.");
    } finally {
      setExcluindoRH("");
    }
  }

  function editarRegistroRH(item: RegistroRH) {
    setEditandoRegistroId(item.id);
    setFormRegistro({colaboradoraId:item.colaboradoraId,tipo:item.tipo,data:item.data.slice(0,10),competencia:item.competencia,valor:item.valor?item.valor.toFixed(2).replace(".",","):"",quantidade:String(item.quantidade||1),unidade:item.unidade,justificada:item.justificada,descontarNaFolha:item.descontarNaFolha,descontarPremiacao:item.descontarPremiacao,cancelaAssiduidade:item.cancelaAssiduidade,descricao:item.descricao||""});
    setModalRegistro(true);
  }

  async function excluirRegistro(id: string) {
    if (excluindoRH) return;
    if (
      !window.confirm(
        "Deseja excluir este registro?"
      )
    ) {
      return;
    }

    setExcluindoRH(id);
    try {
      const { error } = await supabase
        .from("rh_registros")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setRegistros((atuais) =>
        atuais.filter(
          (registro) => registro.id !== id
        )
      );
    } catch (erro) {
      console.error(
        "Erro ao excluir registro do RH:",
        erro
      );
      setAvisoRH("Não foi possível excluir o registro. Os dados foram mantidos.");
    } finally {
      setExcluindoRH("");
    }
  }

  const equipesRH = useMemo(() => Array.from(new Set(colaboradoras.map((item) => item.equipe.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")), [colaboradoras]);
  const listaEquipeRH = useMemo(() => colaboradorasFiltradas
    .filter((item) => !filtroEquipe || item.equipe === filtroEquipe)
    .filter((item) => !somentePendentes || (item.status !== "Desligada" && camposPendentesRH(item).length > 0))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [colaboradorasFiltradas, filtroEquipe, somentePendentes]);
  // Colaboradoras: exibe todas em uma única lista, sem paginação.
  const pessoasPagina = listaEquipeRH;

  const listaHistoricoRH = useMemo(() => registrosOrdenados.filter((item) => {
    const termo = normalizarRH(buscaRegistro);
    return (!filtroTipoRegistro || item.tipo === filtroTipoRegistro) &&
      (!filtroPessoaRegistro || item.colaboradoraId === filtroPessoaRegistro) &&
      (!mesHistorico || item.competencia === mesHistorico) &&
      (filtroTipoRegistro !== "Vale" || filtroDescontoVale === "todos" || (filtroDescontoVale === "descontados" ? item.descontadoNaFolha : !item.descontadoNaFolha)) &&
      (abaRH !== "ferias" || item.tipo === "Férias" || item.tipo === "Afastamento") &&
      (!termo || normalizarRH(`${item.nome} ${item.matricula} ${item.tipo} ${item.descricao}`).includes(termo));
  }), [registrosOrdenados, buscaRegistro, filtroTipoRegistro, filtroPessoaRegistro, mesHistorico, abaRH, filtroDescontoVale]);
  const totalPaginasRegistros = Math.max(1, Math.ceil(listaHistoricoRH.length / 10));
  const paginaRegistrosAtual = Math.min(paginaRegistros, totalPaginasRegistros);
  const registrosPagina = listaHistoricoRH.slice((paginaRegistrosAtual - 1) * 10, paginaRegistrosAtual * 10);
  useEffect(() => setPaginaRegistros(1), [buscaRegistro, filtroTipoRegistro, filtroPessoaRegistro, mesHistorico, abaRH]);

  const pessoasPendentesRH = useMemo(() => colaboradoras.filter((item) => item.status !== "Desligada" && camposPendentesRH(item).length > 0), [colaboradoras]);
  const pessoasFeriasRH = useMemo(() => colaboradoras.filter((item) => item.status === "Férias" || item.status === "Afastada"), [colaboradoras]);
  const aniversariantesRH = useMemo(() => colaboradoras.filter((item) => item.status !== "Desligada" && /^\d{4}-\d{2}-\d{2}$/.test(item.dataNascimento.slice(0,10)) && item.dataNascimento.slice(5,7) === mesAniversarios).sort((a,b) => a.dataNascimento.slice(8,10).localeCompare(b.dataNascimento.slice(8,10))), [colaboradoras, mesAniversarios]);
  const aniversariantesReferencia = useMemo(() => colaboradoras.filter((item) => item.status !== "Desligada" && /^\d{4}-\d{2}-\d{2}$/.test(item.dataNascimento.slice(0,10)) && item.dataNascimento.slice(5,7) === mesReferencia.slice(5,7)).sort((a,b) => a.dataNascimento.slice(8,10).localeCompare(b.dataNascimento.slice(8,10))), [colaboradoras, mesReferencia]);
  const eventosReferencia = useMemo(() => registrosOrdenados.filter((item) => item.competencia === mesReferencia), [registrosOrdenados, mesReferencia]);
  const fichaAberta = colaboradoras.find((item) => item.id === fichaAbertaId) || null;
  const historicoFicha = registrosOrdenados.filter((item) => item.colaboradoraId === fichaAbertaId);
  const dadosProntosRH = !carregandoRH && !erroCarregamentoRH;
  const totalFeriasRH = colaboradoras.filter((item) => item.status === "Férias").length;

  function abrirNovaColaboradora() {
    const novo = { ...colaboradoraVazia, matricula: proximaMatricula(colaboradoras) };
    setFormColaboradora(novo);
    baseFormularioRH.current = JSON.stringify(novo);
    setEditandoColaboradoraId(null);
    setMensagemColaboradora("");
    setModalColaboradora(true);
    setFichaAbertaId(null);
  }

  function fecharFormularioColaboradora() {
    if (salvandoPessoa) return;
    if (JSON.stringify(formColaboradora) !== baseFormularioRH.current && !window.confirm("Descartar as alterações que ainda não foram salvas?")) return;
    setModalColaboradora(false);
    cancelarEdicao();
  }

  function abrirFichaRH(item: ColaboradoraRH) {
    setFichaAbertaId(item.id);
    setAbaFicha("resumo");
  }

  function abrirRegistroRH(tipo: TipoRegistro = "Vale", pessoaId = "") {
    setEditandoRegistroId(null);
    const novo: FormularioRegistro = { ...registroVazio, colaboradoraId: pessoaId, tipo, data: hoje(), competencia: competenciaAtual(), unidade: tipo === "Férias" || tipo === "Falta" || tipo === "Afastamento" ? "Dias" : tipo === "Atraso" ? "Horas" : "Ocorrência" };
    setFormRegistro(novo);
    baseRegistroRH.current = JSON.stringify(novo);
    setMensagemRegistro("");
    setModalRegistro(true);
    setFichaAbertaId(null);
  }

  function fecharFormularioRegistro() {
    if (salvandoEvento) return;
    if (JSON.stringify(formRegistro) !== baseRegistroRH.current && !window.confirm("Descartar o registro que ainda não foi salvo?")) return;
    setModalRegistro(false);
    setMensagemRegistro("");
  }

  function verOcorrenciasRH(tipo = "", competencia = mesReferencia) {
    setAbaRH("registros"); setFiltroTipoRegistro(tipo); setMesHistorico(competencia); setFiltroPessoaRegistro(""); setBuscaRegistro("");
  }

  function limparFiltrosEquipe() {
    setBuscaColaboradora(""); setFiltroStatus("Todos"); setFiltroEquipe(""); setSomentePendentes(false);
  }

  function selecionarAbaRH(aba: AbaRH) {
    setAbaRH(aba);
    if (aba === "ferias" || aba === "registros") {
      setFiltroTipoRegistro(""); setFiltroPessoaRegistro(""); setMesHistorico(""); setBuscaRegistro("");
    }
  }

  function renderRegistroRH(item: RegistroRH, excluir = true) {
    const pessoa=colaboradoras.find((c)=>c.id===item.colaboradoraId),pendente=item.descontarNaFolha&&!item.descontadoNaFolha;
    return <article key={item.id} className="hrm-record-row hrm-record-modern"><span className={`hrm-record-icon ${item.tipo==="Vale"?"hrm-money-icon":item.tipo==="Falta"?"hrm-falta-icon":item.tipo==="Atraso"?"hrm-atraso-icon":"hrm-default-record-icon"}`}><IconeRH nome={item.tipo==="Vale"?"dinheiro":item.tipo==="Atraso"?"relogio":"calendario"} tamanho={20}/></span><div className="hrm-record-main"><strong className="hrm-record-person">{pessoa?.nome||item.nome}</strong><span className="hrm-record-type">{item.tipo==="Vale"?"VALE":item.tipo.toUpperCase()} · {dataRH(item.data)} · Competência {formatarCompetencia(item.competencia)}</span>{item.descricao&&<p>{item.descricao}</p>}<div className="hrm-tags">{item.justificada?<span className="hrm-tag-justificada">{item.tipo==="Falta"?"COM ATESTADO / JUSTIFICADO":"OCORRÊNCIA JUSTIFICADA"}</span>:<span className="hrm-tag-nao-justificada">{item.tipo==="Falta"?"SEM ATESTADO / NÃO JUSTIFICADO":"OCORRÊNCIA NÃO JUSTIFICADA"}</span>}{pendente&&<span className="hrm-tag-pendente">PENDENTE NA FOLHA</span>}{item.descontarPremiacao&&<span className="hrm-tag-premiacao">DESCONTAR DIA 20 · PREMIAÇÃO</span>}{item.descontadoNaFolha&&<span className="hrm-tag-descontado">✓ DESCONTADO NA FOLHA · {dataRH(item.dataDesconto)}</span>}{item.cancelaAssiduidade&&<span className="hrm-tag-assiduidade">ASSIDUIDADE CANCELADA</span>}</div></div><div className="hrm-record-value"><strong>{item.valor>0?moeda(item.valor):`${item.quantidade} ${item.unidade}`}</strong><div className="hrm-record-actions">{pendente&&<button type="button" className="hrm-action-done" onClick={()=>void marcarValeDescontado(item)}>Marcar como descontado</button>}<button type="button" className="hrm-action-edit" onClick={()=>editarRegistroRH(item)}>Editar</button>{excluir&&<button type="button" className="hrm-action-delete" onClick={()=>void excluirRegistro(item.id)}>Excluir registro</button>}</div></div></article>;
  }

  const painelEquipeRH = <section className="hrm-panel hrm-team-panel">
    <div className="hrm-section-heading"><div><span className="hrm-eyebrow">COLABORADORAS</span><h2>Sua equipe, em um só lugar</h2></div><span className="hrm-count">{dadosProntosRH ? listaEquipeRH.length : "—"}</span></div>
    <div className="hrm-team-filters">
      <label className="hrm-search"><IconeRH nome="busca" tamanho={18} /><input aria-label="Pesquisar colaboradoras" value={buscaColaboradora} onChange={(e) => setBuscaColaboradora(e.target.value)} placeholder="Nome, matrícula, cargo ou equipe" /></label>
      <select aria-label="Filtrar por status" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}><option value="Todos">Todos os status</option>{["Ativa", "Férias", "Afastada", "Desligada"].map((status) => <option key={status}>{status}</option>)}</select>
      <select aria-label="Filtrar por equipe" value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)}><option value="">Todas as equipes</option>{equipesRH.map((equipe) => <option key={equipe}>{equipe}</option>)}</select>
    </div>
    {(buscaColaboradora || filtroStatus !== "Todos" || filtroEquipe || somentePendentes) && <div className="hrm-filter-state"><span>{somentePendentes ? "Exibindo fichas com dados a completar" : "Filtros aplicados à equipe"}</span><button type="button" className="hrm-link" onClick={limparFiltrosEquipe}>Limpar filtros</button></div>}
    {carregandoRH ? <div className="hrm-empty" role="status">Carregando as fichas do RH…</div> : erroCarregamentoRH ? <div className="hrm-empty">Não foi possível consultar as fichas. Use “Tentar novamente” no aviso.</div> : !listaEquipeRH.length ? <div className="hrm-empty"><IconeRH nome="pessoas" tamanho={28}/><strong>Nenhuma colaboradora encontrada</strong><p>{colaboradoras.length ? "Altere a pesquisa ou limpe os filtros." : "Cadastre uma colaboradora para começar."}</p></div> : <>
      <div className="hrm-team-table"><div className="hrm-team-table-head"><span>COLABORADORA</span><span>CARGO / EQUIPE</span><span>SITUAÇÃO</span><span>FICHA</span></div>
        {pessoasPagina.map((item) => <article className="hrm-team-row" key={item.id}>
          <button className="hrm-person-button" type="button" onClick={() => abrirFichaRH(item)}><AvatarRH pessoa={item}/><span><strong>{item.nome}</strong><small>Matrícula {item.matricula || "não informada"} · {item.tipoContrato}</small></span></button>
          <div className="hrm-job"><strong>{item.cargo || "Cargo não informado"}</strong><span>{item.equipe || "Equipe não informada"}</span></div>
          <StatusRH status={item.status}/><div className="hrm-team-actions"><button type="button" className="hrm-open-profile" onClick={() => abrirFichaRH(item)} aria-label={`Abrir ficha de ${item.nome}`}>Abrir <IconeRH nome="seta" tamanho={15}/></button><button type="button" className="hrm-delete-person" disabled={Boolean(excluindoRH)} onClick={() => void excluirColaboradora(item.id)} aria-label={`Excluir ${item.nome}`} title="Excluir colaboradora"><IconeRH nome="excluir" tamanho={16}/><span>Excluir</span></button></div>
        </article>)}
      </div>
      <footer className="hrm-pagination hrm-pagination-all"><span>{listaEquipeRH.length} colaboradora(s) exibida(s)</span></footer>
    </>}
  </section>;

  return (
    <div className="rh-workspace">
      <section className="hrm-hero">
        <div><span className="hrm-eyebrow">ELEVA PROMOTORA DE CRÉDITO</span><h1>Gestão de pessoas</h1><p>Equipe, rotinas e informações para cuidar de quem faz a empresa acontecer.</p></div>
        <div className="hrm-hero-actions"><button type="button" className="hrm-button hrm-secondary" onClick={() => abrirRegistroRH()} disabled={!dadosProntosRH || !colaboradoras.length}><IconeRH nome="arquivo" tamanho={18}/>Registrar ocorrência</button><button type="button" className="hrm-button hrm-primary" onClick={abrirNovaColaboradora} disabled={!dadosProntosRH}><IconeRH nome="mais" tamanho={19}/>Nova colaboradora</button></div>
      </section>

      <nav className="hrm-navigation" aria-label="Áreas do RH">
        {([
          ["visao", "Visão geral", "painel"], ["colaboradoras", "Colaboradoras", "pessoas"], ["registros", "Frequência e vales", "relogio"], ["ponto", "Bate-ponto", "relogio"], ["ocorrencias", "Ocorrências", "alerta"], ["ferias", "Férias e afastamentos", "calendario"], ["aniversarios", "Aniversários", "presente"],
        ] as Array<[AbaRH, string, IconeNome]>).map(([aba, nome, icone]) => <button type="button" key={aba} className={abaRH === aba ? "active" : ""} aria-pressed={abaRH === aba} onClick={() => selecionarAbaRH(aba)}><IconeRH nome={icone} tamanho={18}/>{nome}</button>)}
      </nav>

      {avisoRH && <div className="hrm-notice" role="status"><span>{avisoRH}</span><button type="button" className="hrm-icon-button" aria-label="Fechar aviso" onClick={() => setAvisoRH("")}><IconeRH nome="fechar" tamanho={17}/></button></div>}
      {erroCarregamentoRH && <div className="hrm-error" role="alert"><span>{erroCarregamentoRH}</span><button type="button" className="hrm-button hrm-secondary" onClick={() => setRecarregarRH((n) => n+1)}>Tentar novamente</button></div>}

      {abaRH === "visao" && <>
        <div className="hrm-overview-title"><div><h2>Um olhar para o seu RH</h2><p>Equipe: situação atual. Vales, faltas e atrasos: competência selecionada.</p></div><label>Mês de referência<input type="month" value={mesReferencia} onChange={(e) => { if(e.target.value) setMesReferencia(e.target.value); }} /></label></div>
        <div className="hrm-metrics">
          <button type="button" className="hrm-metric" onClick={() => { limparFiltrosEquipe(); setAbaRH("colaboradoras"); }}><span className="hrm-metric-top">Colaboradoras<IconeRH nome="pessoas"/></span><strong>{dadosProntosRH ? resumo.total : "—"}</strong><small>{dadosProntosRH ? `${resumo.ativas} com status Ativa` : "Consultando cadastros"}</small></button>
          <button type="button" className="hrm-metric" onClick={() => { limparFiltrosEquipe(); setFiltroStatus("Férias"); setAbaRH("colaboradoras"); }}><span className="hrm-metric-top">Em férias<IconeRH nome="calendario"/></span><strong>{dadosProntosRH ? totalFeriasRH : "—"}</strong><small>Situação atual das fichas</small></button>
          <button type="button" className="hrm-metric hrm-metric-blue" onClick={() => verOcorrenciasRH("Vale")}><span className="hrm-metric-top">Vales na competência<IconeRH nome="carteira"/></span><strong>{dadosProntosRH ? moeda(resumo.totalVales) : "—"}</strong><small>Valores lançados no RH</small></button>
          <button type="button" className="hrm-metric" onClick={() => verOcorrenciasRH("Falta")}><span className="hrm-metric-top">Faltas<IconeRH nome="alerta"/></span><strong>{dadosProntosRH ? resumo.faltas : "—"}</strong><small>Ocorrências na competência</small></button>
          <button type="button" className="hrm-metric" onClick={() => verOcorrenciasRH("Atraso")}><span className="hrm-metric-top">Atrasos<IconeRH nome="relogio"/></span><strong>{dadosProntosRH ? resumo.atrasos : "—"}</strong><small>Ocorrências na competência</small></button>
        </div>
        <div className="hrm-overview-grid">
          <div className="hrm-main-column">{painelEquipeRH}
            <section className="hrm-panel"><div className="hrm-section-heading"><div><span className="hrm-eyebrow">ROTINA DO RH</span><h2>Últimos registros da competência</h2></div><button type="button" className="hrm-link" onClick={() => verOcorrenciasRH()}>Ver histórico <IconeRH nome="seta" tamanho={15}/></button></div>
              {dadosProntosRH && eventosReferencia.length ? eventosReferencia.slice(0,3).map((item) => renderRegistroRH(item, false)) : <div className="hrm-empty compact">{dadosProntosRH ? "Nenhum registro lançado nesta competência." : "Consultando registros…"}</div>}
            </section>
          </div>
          <aside className="hrm-side-column">
            <section className="hrm-panel hrm-attention"><span className="hrm-side-icon"><IconeRH nome="alerta"/></span><h2>Atenção aos cadastros</h2><p>{dadosProntosRH ? `${pessoasPendentesRH.length} ficha(s) com informações a completar.` : "Consultando informações…"}</p>
              {dadosProntosRH && pessoasPendentesRH.slice(0,3).map((pessoa) => <button type="button" key={pessoa.id} className="hrm-pending-person" onClick={() => editarColaboradora(pessoa)}><strong>{pessoa.nome}</strong><span>{camposPendentesRH(pessoa).join(" · ")}</span></button>)}
              {dadosProntosRH && pessoasPendentesRH.length > 0 && <button type="button" className="hrm-link" onClick={() => { limparFiltrosEquipe(); setSomentePendentes(true); setAbaRH("colaboradoras"); }}>Revisar fichas <IconeRH nome="seta" tamanho={15}/></button>}
              <small>Conferência dos campos da ficha; não indica documentos enviados.</small>
            </section>
            <section className="hrm-panel"><div className="hrm-section-heading"><div><span className="hrm-eyebrow">DATAS ESPECIAIS</span><h2>Aniversários do mês</h2></div><IconeRH nome="presente"/></div>
              {dadosProntosRH && aniversariantesReferencia.length ? aniversariantesReferencia.slice(0,4).map((pessoa) => <button type="button" key={pessoa.id} className="hrm-birthday-small" onClick={() => abrirFichaRH(pessoa)}><span className="hrm-date-tile">{pessoa.dataNascimento.slice(8,10)}</span><span><strong>{pessoa.nome}</strong><small>{pessoa.cargo || "Cargo não informado"}</small></span></button>) : <p className="hrm-muted">{dadosProntosRH ? "Nenhum aniversário cadastrado neste mês." : "Consultando datas…"}</p>}
              <button type="button" className="hrm-link" onClick={() => { setMesAniversarios(mesReferencia.slice(5,7)); setAbaRH("aniversarios"); }}>Ver aniversários <IconeRH nome="seta" tamanho={15}/></button>
            </section>
            <section className="hrm-quick-panel"><span className="hrm-eyebrow">AÇÕES RÁPIDAS</span><h2>O que precisa registrar?</h2><div>{([['Falta','Registrar falta'],['Atraso','Registrar atraso'],['Vale','Lançar vale']] as Array<[TipoRegistro,string]>).map(([tipo,nome]) => <button key={tipo} type="button" disabled={!dadosProntosRH || !colaboradoras.length} onClick={() => abrirRegistroRH(tipo)}>{nome}<IconeRH nome="mais" tamanho={16}/></button>)}</div></section>
          </aside>
        </div>
      </>}

      {abaRH === "colaboradoras" && painelEquipeRH}

      {abaRH === "ponto" && <ControlePontoRH colaboradoras={colaboradoras.map(({id,nome,status})=>({id,nome,status}))} />}

      {abaRH === "ocorrencias" && <OcorrenciasEmpresaRH />}

      {(abaRH === "registros" || abaRH === "ferias") && <>
        {abaRH === "ferias" && <section className="hrm-panel"><div className="hrm-section-heading"><div><span className="hrm-eyebrow">SITUAÇÃO DA EQUIPE</span><h2>Férias e afastamentos</h2><p>Fichas com esses status neste momento, independentemente da competência.</p></div><button type="button" className="hrm-button hrm-primary" onClick={() => abrirRegistroRH("Férias")} disabled={!dadosProntosRH || !colaboradoras.length}><IconeRH nome="mais" tamanho={17}/>Registrar férias</button></div>
          <div className="hrm-away-grid">{pessoasFeriasRH.map((pessoa) => <button type="button" className="hrm-away-person" key={pessoa.id} onClick={() => abrirFichaRH(pessoa)}><AvatarRH pessoa={pessoa}/><span><strong>{pessoa.nome}</strong><StatusRH status={pessoa.status}/></span></button>)}</div>
          {!pessoasFeriasRH.length && <p className="hrm-muted">{dadosProntosRH ? "Nenhuma ficha está marcada como Férias ou Afastada." : "Consultando fichas…"}</p>}
          <p className="hrm-footnote">Esta versão organiza os registros existentes. Não calcula saldo de férias ou vencimentos. Registrar uma ocorrência não altera automaticamente o status da ficha.</p>
        </section>}
        <section className="hrm-panel"><div className="hrm-section-heading"><div><span className="hrm-eyebrow">HISTÓRICO</span><h2>{abaRH === "ferias" ? "Registros de férias e afastamentos" : "Frequência, vales e ocorrências"}</h2><p>Consulte por pessoa, tipo e competência da folha.</p></div><button type="button" className="hrm-button hrm-secondary" onClick={() => abrirRegistroRH(abaRH === "ferias" ? "Férias" : "Vale")} disabled={!dadosProntosRH || !colaboradoras.length}><IconeRH nome="mais" tamanho={17}/>Novo registro</button></div>
          <div className="hrm-history-filters"><label className="hrm-search"><IconeRH nome="busca" tamanho={18}/><input value={buscaRegistro} onChange={(e) => setBuscaRegistro(e.target.value)} placeholder="Pesquisar no histórico" aria-label="Pesquisar registros"/></label>
            <select aria-label="Colaboradora do registro" value={filtroPessoaRegistro} onChange={(e) => setFiltroPessoaRegistro(e.target.value)}><option value="">Todas as colaboradoras</option>{colaboradoras.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select>
            <select aria-label="Tipo do registro" value={filtroTipoRegistro} onChange={(e) => setFiltroTipoRegistro(e.target.value)}><option value="">Todos os tipos</option>{TIPOS_REGISTRO.filter((tipo) => abaRH !== "ferias" || tipo === "Férias" || tipo === "Afastamento").map((tipo) => <option key={tipo}>{tipo}</option>)}</select>
            <input type="month" value={mesHistorico} onChange={(e) => setMesHistorico(e.target.value)} aria-label="Competência do histórico" title="Em branco: todas as competências"/>
          </div>
          {filtroTipoRegistro === "Vale" && <div className="hrm-filter-state"><span>Status dos vales</span><div><button type="button" className={filtroDescontoVale==="pendentes" ? "active" : ""} onClick={()=>setFiltroDescontoVale("pendentes")}>Pendentes</button><button type="button" className={filtroDescontoVale==="descontados" ? "active" : ""} onClick={()=>setFiltroDescontoVale("descontados")}>Descontados</button><button type="button" className={filtroDescontoVale==="todos" ? "active" : ""} onClick={()=>setFiltroDescontoVale("todos")}>Todos</button></div></div>}
          <div className="hrm-filter-state"><span>{mesHistorico ? `Competência: ${formatarCompetencia(mesHistorico)}` : "Todas as competências"} · {dadosProntosRH ? `${listaHistoricoRH.length} registro(s)` : "Consultando…"}</span><button type="button" className="hrm-link" onClick={() => {setBuscaRegistro("");setFiltroPessoaRegistro("");setFiltroTipoRegistro("");setMesHistorico("");}}>Limpar filtros</button></div>
          {!dadosProntosRH ? <div className="hrm-empty">{carregandoRH ? "Carregando histórico…" : "Não foi possível carregar os registros."}</div> : !listaHistoricoRH.length ? <div className="hrm-empty"><IconeRH nome="arquivo" tamanho={28}/><strong>Nenhum registro neste filtro</strong><p>Revise os filtros ou cadastre uma ocorrência.</p></div> : <>{registrosPagina.map((item) => renderRegistroRH(item))}<footer className="hrm-pagination"><span>{(paginaRegistrosAtual-1)*10+1}–{Math.min(paginaRegistrosAtual*10,listaHistoricoRH.length)} de {listaHistoricoRH.length} registros</span><div><button type="button" disabled={paginaRegistrosAtual === 1} onClick={() => setPaginaRegistros(paginaRegistrosAtual-1)}>Anterior</button><span>{paginaRegistrosAtual} / {totalPaginasRegistros}</span><button type="button" disabled={paginaRegistrosAtual === totalPaginasRegistros} onClick={() => setPaginaRegistros(paginaRegistrosAtual+1)}>Próxima</button></div></footer></>}
        </section>
      </>}

      {abaRH === "aniversarios" && <section className="hrm-panel"><div className="hrm-section-heading"><div><span className="hrm-eyebrow">CALENDÁRIO DA EQUIPE</span><h2>Aniversários</h2><p>Datas das fichas cadastradas, sem incluir colaboradoras desligadas.</p></div><select aria-label="Mês dos aniversários" value={mesAniversarios} onChange={(e) => setMesAniversarios(e.target.value)}>{["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map((nome,indice) => <option key={nome} value={String(indice+1).padStart(2,"0")}>{nome}</option>)}</select></div>
        {!dadosProntosRH ? <div className="hrm-empty">{carregandoRH ? "Consultando datas…" : "Não foi possível carregar as datas."}</div> : <div className="hrm-birthday-grid">{aniversariantesRH.map((pessoa) => <button type="button" className="hrm-birthday-card" key={pessoa.id} onClick={() => abrirFichaRH(pessoa)}><span className="hrm-date-tile">{pessoa.dataNascimento.slice(8,10)}<small>dia</small></span><AvatarRH pessoa={pessoa} grande/><strong>{pessoa.nome}</strong><span>{pessoa.cargo || "Cargo não informado"}</span><small>{pessoa.equipe || "Equipe não informada"}</small></button>)}</div>}
        {dadosProntosRH && !aniversariantesRH.length && <div className="hrm-empty"><IconeRH nome="presente" tamanho={30}/><strong>Nenhum aniversário cadastrado para este mês</strong></div>}
      </section>}

      {modalColaboradora && <JanelaRH titulo={editandoColaboradoraId ? "Editar ficha da colaboradora" : "Nova colaboradora"} subtitulo="Dados pessoais, vínculo profissional e contato de emergência." aoFechar={fecharFormularioColaboradora} ocupada={salvandoPessoa} ampla>
                <form
          className="hrm-employee-form"
          onSubmit={salvarColaboradora}
        >
          <fieldset className="hrm-form-fieldset" disabled={salvandoPessoa}>
          <div className="rh-form-grid">
            <h3 className="hrm-form-caption">Identificação e contato</h3>
            <label className="rh-full-field">
              Usuária do sistema

              <select
                value={formColaboradora.usuarioId}
                onChange={(evento) =>
                  selecionarUsuario(
                    evento.target.value
                  )
                }
              >
                <option value="">
                  Cadastro sem acesso ao sistema
                </option>

                {usuarios.map((usuario) => (
                  <option
                    key={usuario.id}
                    value={usuario.id}
                  >
                    {usuario.nome} —{" "}
                    {usuario.matricula ||
                      "sem matrícula"}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nome completo

              <input
                required
                value={formColaboradora.nome}
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    nome: evento.target.value,
                  })
                }
                placeholder="Nome da colaboradora"
              />
            </label>

            <label>
              Matrícula

              <input
                value={formColaboradora.matricula}
                readOnly
                placeholder="Gerada automaticamente"
              />
            </label>

            <label>
              CPF

              <input
                value={formColaboradora.cpf}
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    cpf: somenteNumeros(
                      evento.target.value
                    ),
                  })
                }
                placeholder="Somente números"
              />
            </label>

            <label>
              Data de nascimento

              <input
                type="date"
                value={
                  formColaboradora.dataNascimento
                }
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    dataNascimento:
                      evento.target.value,
                  })
                }
              />
            </label>

            <label>
              Telefone

              <input
                value={formColaboradora.telefone}
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    telefone: evento.target.value,
                  })
                }
                placeholder="(62) 99999-9999"
              />
            </label>

            <label>
              E-mail

              <input
                type="email"
                value={formColaboradora.email}
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    email: evento.target.value,
                  })
                }
                placeholder="colaboradora@email.com"
              />
            </label>

            <label className="rh-full-field">
              Endereço

              <input
                value={formColaboradora.endereco}
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    endereco: evento.target.value,
                  })
                }
                placeholder="Rua, número, bairro e cidade"
              />
            </label>

            <h3 className="hrm-form-caption">Informações profissionais</h3>
            <label>
              Cargo

              <input
                value={formColaboradora.cargo}
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    cargo: evento.target.value,
                  })
                }
                placeholder="Ex.: Consultora"
              />
            </label>

            <label>
              Equipe

              <input
                value={formColaboradora.equipe}
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    equipe: evento.target.value,
                  })
                }
                placeholder="Ex.: Compra de Dívida"
              />
            </label>

            <label>
              Data de admissão

              <input
                type="date"
                value={formColaboradora.dataAdmissao}
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    dataAdmissao:
                      evento.target.value,
                  })
                }
              />
            </label>

            <label>
              Tipo de contrato

              <select
                value={
                  formColaboradora.tipoContrato
                }
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    tipoContrato:
                      evento.target
                        .value as TipoContrato,
                  })
                }
              >
                <option>CLT</option>
                <option>Estágio</option>
                <option>Prestadora</option>
                <option>Outro</option>
              </select>
            </label>

            <label>
              Salário-base

              <input
                value={formColaboradora.salarioBase}
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    salarioBase:
                      evento.target.value,
                  })
                }
                placeholder="Ex.: 1.621,00"
              />
            </label>

            <label>
              Jornada

              <input
                value={formColaboradora.jornada}
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    jornada: evento.target.value,
                  })
                }
                placeholder="Ex.: 08:30 às 18:00"
              />
            </label>

            <label>
              Status

              <select
                value={formColaboradora.status}
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    status:
                      evento.target
                        .value as StatusColaboradora,
                  })
                }
              >
                <option>Ativa</option>
                <option>Férias</option>
                <option>Afastada</option>
                <option>Desligada</option>
              </select>
            </label>

            <h3 className="hrm-form-caption">Contato de emergência e observações</h3>
            <label>
              Contato de emergência

              <input
                value={
                  formColaboradora.contatoEmergencia
                }
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    contatoEmergencia:
                      evento.target.value,
                  })
                }
                placeholder="Nome do contato"
              />
            </label>

            <label>
              Telefone de emergência

              <input
                value={
                  formColaboradora.telefoneEmergencia
                }
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    telefoneEmergencia:
                      evento.target.value,
                  })
                }
                placeholder="(62) 99999-9999"
              />
            </label>

            <label className="rh-full-field">
              Observações

              <textarea
                value={
                  formColaboradora.observacoes
                }
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    observacoes:
                      evento.target.value,
                  })
                }
                placeholder="Informações internas importantes"
              />
            </label>
          </div>

          {mensagemColaboradora && (
            <div className="rh-message">
              {mensagemColaboradora}
            </div>
          )}

          <div className="rh-actions">
            {(
              <button
                type="button"
                className="rh-cancel"
                onClick={fecharFormularioColaboradora}
              >
                Cancelar
              </button>
            )}

            <button type="submit">
              {salvandoPessoa ? "Salvando…" : editandoColaboradoraId
                ? "Salvar alterações"
                : "Cadastrar colaboradora"}
            </button>
          </div>
          </fieldset>
        </form>
      </JanelaRH>}

      {modalRegistro && <JanelaRH titulo={editandoRegistroId ? "Editar registro" : "Registrar ocorrência"} subtitulo="Vales, frequência, férias e informações internas do RH." aoFechar={fecharFormularioRegistro} ocupada={salvandoEvento}>
                  <form
            className="rh-event-form"
            onSubmit={salvarRegistro}
          >
            <fieldset className="hrm-form-fieldset rh-form-grid" disabled={salvandoEvento}>
            <label className="rh-full-field">
              Colaboradora

              <select
                value={
                  formRegistro.colaboradoraId
                }
                onChange={(evento) =>
                  setFormRegistro({
                    ...formRegistro,
                    colaboradoraId:
                      evento.target.value,
                  })
                }
              >
                <option value="">Selecione a colaboradora</option>

                {colaboradoras.map(
                  (colaboradora) => (
                    <option
                      key={colaboradora.id}
                      value={colaboradora.id}
                    >
                      {colaboradora.nome} —{" "}
                      {colaboradora.matricula}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Tipo de registro

              <select
                value={formRegistro.tipo}
                onChange={(evento) =>
                  setFormRegistro({
                    ...formRegistro,
                    tipo: evento.target
                      .value as TipoRegistro,
                  })
                }
              >
                {TIPOS_REGISTRO.map((tipo) => (
                  <option key={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Data

              <input
                type="date"
                value={formRegistro.data}
                onChange={(evento) =>
                  setFormRegistro({
                    ...formRegistro,
                    data: evento.target.value,
                  })
                }
              />
            </label>

            <label>
              Competência da folha

              <input
                type="month"
                value={formRegistro.competencia}
                onChange={(evento) =>
                  setFormRegistro({
                    ...formRegistro,
                    competencia:
                      evento.target.value,
                  })
                }
              />
            </label>

            <label>
              Valor

              <input
                value={formRegistro.valor}
                onChange={(evento) =>
                  setFormRegistro({
                    ...formRegistro,
                    valor: evento.target.value,
                  })
                }
                placeholder="Ex.: 300,00"
              />
            </label>

            <label>
              Quantidade

              <input
                inputMode="decimal"
                value={formRegistro.quantidade}
                onChange={(evento) =>
                  setFormRegistro({
                    ...formRegistro,
                    quantidade:
                      evento.target.value,
                  })
                }
                placeholder="Ex.: 1"
              />
            </label>

            <label>
              Unidade

              <select
                value={formRegistro.unidade}
                onChange={(evento) =>
                  setFormRegistro({
                    ...formRegistro,
                    unidade: evento.target
                      .value as
                      | "Dias"
                      | "Horas"
                      | "Ocorrência",
                  })
                }
              >
                <option>Dias</option>
                <option>Horas</option>
                <option>Ocorrência</option>
              </select>
            </label>

            <label className="rh-event-check rh-check-justificada">
              <input type="checkbox" checked={formRegistro.justificada}
                onChange={() => setFormRegistro({...formRegistro, justificada:true})}/>
              <span>Ocorrência justificada</span>
            </label>

            <label className="rh-event-check rh-check-nao-justificada">
              <input type="checkbox" checked={!formRegistro.justificada}
                onChange={() => setFormRegistro({...formRegistro, justificada:false})}/>
              <span>Ocorrência não justificada</span>
            </label>

            <label className="rh-event-check">
              <input
                type="checkbox"
                checked={
                  formRegistro.descontarNaFolha
                }
                onChange={(evento) =>
                  setFormRegistro({
                    ...formRegistro,
                    descontarNaFolha:
                      evento.target.checked,
                  })
                }
              />

              <span>Descontar nesta folha</span>
            </label>

            <label className="rh-event-check rh-check-premiacao">
              <input type="checkbox" checked={formRegistro.descontarPremiacao}
                onChange={(evento) => setFormRegistro({...formRegistro, descontarPremiacao:evento.target.checked})}/>
              <span>Descontar dia 20 - Premiação</span>
            </label>

            <label className="rh-event-check">
              <input
                type="checkbox"
                checked={
                  formRegistro.cancelaAssiduidade
                }
                onChange={(evento) =>
                  setFormRegistro({
                    ...formRegistro,
                    cancelaAssiduidade:
                      evento.target.checked,
                  })
                }
              />

              <span>Cancela a assiduidade</span>
            </label>

            <label className="rh-full-field">
              Descrição ou observação

              <textarea
                value={formRegistro.descricao}
                onChange={(evento) =>
                  setFormRegistro({
                    ...formRegistro,
                    descricao:
                      evento.target.value,
                  })
                }
                placeholder="Detalhes do vale, falta, atraso ou ocorrência"
              />
            </label>

            {mensagemRegistro && (
              <div className="rh-message">
                {mensagemRegistro}
              </div>
            )}

            <div className="rh-actions rh-full-field">
              <button type="button" className="rh-cancel" onClick={fecharFormularioRegistro}>Cancelar</button>
              <button type="submit">{salvandoEvento ? "Salvando…" : editandoRegistroId ? "Salvar alterações" : "Salvar registro"}</button>
            </div>
            </fieldset>
          </form>
      </JanelaRH>}

      {fichaAberta && <JanelaRH titulo="Ficha da colaboradora" subtitulo="Consulta individual do cadastro e dos registros de RH." aoFechar={() => setFichaAbertaId(null)} ampla>
        <section className="hrm-profile-hero"><AvatarRH pessoa={fichaAberta} grande/><div><h2>{fichaAberta.nome}</h2><p>{fichaAberta.cargo || "Cargo não informado"} · {fichaAberta.equipe || "Equipe não informada"}</p><div className="hrm-tags"><span>Matrícula {fichaAberta.matricula || "não informada"}</span><span>{fichaAberta.tipoContrato}</span></div></div><StatusRH status={fichaAberta.status}/></section>
        <nav className="hrm-profile-tabs" aria-label="Seções da ficha">{([["resumo","Visão geral"],["pessoal","Dados pessoais"],["contrato","Contrato"],["historico","Histórico"]] as Array<[AbaFicha,string]>).map(([aba,nome]) => <button key={aba} type="button" className={abaFicha===aba ? "active" : ""} aria-pressed={abaFicha===aba} onClick={() => setAbaFicha(aba)}>{nome}</button>)}</nav>
        {abaFicha === "resumo" && <><dl className="hrm-info-grid"><CampoFichaRH titulo="Cargo" valor={fichaAberta.cargo}/><CampoFichaRH titulo="Equipe" valor={fichaAberta.equipe}/><CampoFichaRH titulo="Admissão" valor={dataRH(fichaAberta.dataAdmissao)}/><CampoFichaRH titulo="Jornada" valor={fichaAberta.jornada}/><CampoFichaRH titulo="Telefone" valor={fichaAberta.telefone}/><CampoFichaRH titulo="E-mail" valor={fichaAberta.email}/></dl>
          {camposPendentesRH(fichaAberta).length > 0 && <div className="hrm-profile-warning"><IconeRH nome="alerta" tamanho={18}/><span>Completar no cadastro: {camposPendentesRH(fichaAberta).join(", ")}.</span></div>}
          <h3 className="hrm-subheading">Últimos registros</h3>{historicoFicha.length ? historicoFicha.slice(0,3).map((item) => renderRegistroRH(item, false)) : <p className="hrm-muted">Ainda não há registros vinculados a esta ficha.</p>}
        </>}
        {abaFicha === "pessoal" && <dl className="hrm-info-grid"><CampoFichaRH titulo="Nome completo" valor={fichaAberta.nome}/><CampoFichaRH titulo="CPF" valor={fichaAberta.cpf}/><CampoFichaRH titulo="Nascimento" valor={dataRH(fichaAberta.dataNascimento)}/><CampoFichaRH titulo="Telefone" valor={fichaAberta.telefone}/><CampoFichaRH titulo="E-mail" valor={fichaAberta.email}/><CampoFichaRH titulo="Endereço" valor={fichaAberta.endereco}/><CampoFichaRH titulo="Contato de emergência" valor={fichaAberta.contatoEmergencia}/><CampoFichaRH titulo="Telefone de emergência" valor={fichaAberta.telefoneEmergencia}/></dl>}
        {abaFicha === "contrato" && <><dl className="hrm-info-grid"><CampoFichaRH titulo="Tipo de contrato" valor={fichaAberta.tipoContrato}/><CampoFichaRH titulo="Data de admissão" valor={dataRH(fichaAberta.dataAdmissao)}/><CampoFichaRH titulo="Salário-base cadastrado" valor={moeda(fichaAberta.salarioBase)}/><CampoFichaRH titulo="Jornada" valor={fichaAberta.jornada}/><CampoFichaRH titulo="Cargo no RH" valor={fichaAberta.cargo}/><CampoFichaRH titulo="Equipe" valor={fichaAberta.equipe}/><CampoFichaRH titulo="Situação" valor={fichaAberta.status}/><CampoFichaRH titulo="Usuária vinculada" valor={usuarios.find((usuario) => usuario.id === fichaAberta.usuarioId)?.nome || (fichaAberta.usuarioId ? "Usuária vinculada" : "Sem vínculo de acesso")}/></dl><div className="hrm-note-block"><h3>Observações internas</h3><p>{fichaAberta.observacoes || "Nenhuma observação cadastrada."}</p></div></>}
        {abaFicha === "historico" && <div className="hrm-profile-history">{historicoFicha.length ? historicoFicha.map((item) => renderRegistroRH(item, false)) : <div className="hrm-empty">Nenhum registro vinculado a esta colaboradora.</div>}</div>}
        <footer className="hrm-profile-footer"><button type="button" className="hrm-text-danger" disabled={Boolean(excluindoRH)} onClick={() => void excluirColaboradora(fichaAberta.id)}>Excluir ficha</button><div><button type="button" className="hrm-button hrm-secondary" onClick={() => abrirRegistroRH("Vale",fichaAberta.id)}><IconeRH nome="mais" tamanho={17}/>Novo registro</button><button type="button" className="hrm-button hrm-primary" onClick={() => editarColaboradora(fichaAberta)}><IconeRH nome="editar" tamanho={17}/>Editar ficha</button></div></footer>
      </JanelaRH>}
      <footer className="hrm-page-footer">RH · ELEVA PROMOTORA DE CRÉDITO <span>Cadastros e registros conectados ao Supabase</span></footer>
    </div>
  );
}
