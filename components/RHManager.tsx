"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import "./rh.css";

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
  cancelaAssiduidade: boolean;
  descricao: string;
  criadoEm: string;
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

const hoje = () =>
  new Date().toISOString().slice(0, 10);

const competenciaAtual = () =>
  new Date().toISOString().slice(0, 7);

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
          cancelaAssiduidade: Boolean(
            registro.cancela_assiduidade
          ),
          descricao: String(registro.descricao || ""),
          criadoEm: String(registro.criado_em || ""),
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
                  cancela_assiduidade:
                    registro.cancelaAssiduidade,
                  descricao: registro.descricao || "",
                  criado_em:
                    new Date().toISOString(),
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

        listaUsuarios = listaUsuarios.map((usuario) => {
          const ficha = listaColaboradoras.find(
            (colaboradora) =>
              colaboradora.usuarioId === usuario.id
          );

          return {
            ...usuario,
            matricula: ficha?.matricula || "",
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
        setMensagemColaboradora(
          "Não foi possível carregar os dados do RH."
        );
      }
    }

    void carregarRH();

    return () => {
      cancelado = true;
    };
  }, [supabase]);

  const colaboradorasFiltradas = useMemo(() => {
    const termo = buscaColaboradora
      .trim()
      .toLowerCase();

    return colaboradoras
      .filter(
        (colaboradora) =>
          filtroStatus === "Todos" ||
          colaboradora.status === filtroStatus
      )
      .filter(
        (colaboradora) =>
          !termo ||
          colaboradora.nome
            .toLowerCase()
            .includes(termo) ||
          colaboradora.matricula.includes(termo) ||
          colaboradora.cargo
            .toLowerCase()
            .includes(termo) ||
          colaboradora.equipe
            .toLowerCase()
            .includes(termo)
      );
  }, [
    colaboradoras,
    buscaColaboradora,
    filtroStatus,
  ]);

  const registrosOrdenados = useMemo(
    () =>
      [...registros].sort((a, b) =>
        b.data.localeCompare(a.data)
      ),
    [registros]
  );

  const resumo = useMemo(() => {
    const competencia = competenciaAtual();

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
  }, [colaboradoras, registros]);

  function selecionarUsuario(usuarioId: string) {
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
    }
  }

  function editarColaboradora(
  colaboradora: ColaboradoraRH
) {
  const salarioConvertido = Number(
    colaboradora.salarioBase || 0
  );

  setEditandoColaboradoraId(colaboradora.id);

  setFormColaboradora({
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
  });

  setMensagemColaboradora(
    `Editando a ficha de ${colaboradora.nome}.`
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
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
    if (
      !window.confirm(
        "Deseja excluir esta ficha do RH?"
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("rh_colaboradoras")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setColaboradoras((atuais) =>
        atuais.filter(
          (colaboradora) =>
            colaboradora.id !== id
        )
      );

      setRegistros((atuais) =>
        atuais.filter(
          (registro) =>
            registro.colaboradoraId !== id
        )
      );
    } catch (erro) {
      console.error(
        "Erro ao excluir ficha do RH:",
        erro
      );
      setMensagemColaboradora(
        "Não foi possível excluir esta ficha."
      );
    }
  }

  async function salvarRegistro(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();
    setMensagemRegistro("");

    const colaboradora = colaboradoras.find(
      (item) =>
        item.id === formRegistro.colaboradoraId
    );

    if (!colaboradora) {
      setMensagemRegistro(
        "Selecione uma colaboradora."
      );
      return;
    }

    if (!formRegistro.data) {
      setMensagemRegistro(
        "Informe a data do registro."
      );
      return;
    }

    const novoRegistro: RegistroRH = {
      id: crypto.randomUUID(),
      colaboradoraId: colaboradora.id,
      nome: colaboradora.nome,
      matricula: colaboradora.matricula,
      tipo: formRegistro.tipo,
      data: formRegistro.data,
      competencia: formRegistro.competencia,
      valor: converterNumero(formRegistro.valor),
      quantidade:
        converterNumero(formRegistro.quantidade) ||
        1,
      unidade: formRegistro.unidade,
      justificada: formRegistro.justificada,
      descontarNaFolha:
        formRegistro.descontarNaFolha,
      cancelaAssiduidade:
        formRegistro.cancelaAssiduidade,
      descricao: formRegistro.descricao.trim(),
      criadoEm: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from("rh_registros")
        .insert({
          id: novoRegistro.id,
          colaboradora_id:
            novoRegistro.colaboradoraId,
          nome: novoRegistro.nome,
          matricula: novoRegistro.matricula,
          tipo: novoRegistro.tipo,
          data: novoRegistro.data,
          competencia: novoRegistro.competencia,
          valor: novoRegistro.valor,
          quantidade: novoRegistro.quantidade,
          unidade: novoRegistro.unidade,
          justificada: novoRegistro.justificada,
          descontar_na_folha:
            novoRegistro.descontarNaFolha,
          cancela_assiduidade:
            novoRegistro.cancelaAssiduidade,
          descricao: novoRegistro.descricao,
          criado_em: novoRegistro.criadoEm,
        });

      if (error) throw error;

      setRegistros((atuais) => [
        novoRegistro,
        ...atuais,
      ]);

      setFormRegistro({
        ...registroVazio,
        colaboradoraId: colaboradora.id,
        tipo: formRegistro.tipo,
      });

      setMensagemRegistro(
        "Registro salvo com sucesso."
      );
    } catch (erro) {
      console.error(
        "Erro ao salvar registro de RH:",
        erro
      );
      setMensagemRegistro(
        "Não foi possível salvar o registro."
      );
    }
  }

  async function excluirRegistro(id: string) {
    if (
      !window.confirm(
        "Deseja excluir este registro?"
      )
    ) {
      return;
    }

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
      setMensagemRegistro(
        "Não foi possível excluir o registro."
      );
    }
  }

  return (
    <div className="rh-page">
      <section className="rh-summary">
        <article>
          <span>Total de colaboradoras</span>
          <strong>{resumo.total}</strong>
        </article>

        <article>
          <span>Colaboradoras ativas</span>
          <strong>{resumo.ativas}</strong>
        </article>

        <article>
          <span>Vales no mês</span>
          <strong>{moeda(resumo.totalVales)}</strong>
        </article>

        <article>
          <span>Faltas no mês</span>
          <strong>{resumo.faltas}</strong>
        </article>

        <article>
          <span>Atrasos no mês</span>
          <strong>{resumo.atrasos}</strong>
        </article>
      </section>

      <section className="rh-main-grid">
        <form
          className="rh-card"
          onSubmit={salvarColaboradora}
        >
          <div className="rh-heading">
            <div>
              <span>
                {editandoColaboradoraId
                  ? "EDITAR FICHA"
                  : "NOVA COLABORADORA"}
              </span>

              <h2>
                {editandoColaboradoraId
                  ? "Atualizar informações"
                  : "Cadastrar colaboradora"}
              </h2>

              <p>
                Dados pessoais, profissionais e
                contratuais.
              </p>
            </div>

            <b>RH</b>
          </div>

          <div className="rh-form-grid">
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
            {editandoColaboradoraId && (
              <button
                type="button"
                className="rh-cancel"
                onClick={cancelarEdicao}
              >
                Cancelar
              </button>
            )}

            <button type="submit">
              {editandoColaboradoraId
                ? "Salvar alterações"
                : "Cadastrar colaboradora"}
            </button>
          </div>
        </form>

        <section className="rh-card">
          <div className="rh-list-heading">
            <div>
              <span>COLABORADORAS</span>
              <h2>Fichas cadastradas</h2>
            </div>

            <b>{colaboradorasFiltradas.length}</b>
          </div>

          <div className="rh-filters">
            <input
              value={buscaColaboradora}
              onChange={(evento) =>
                setBuscaColaboradora(
                  evento.target.value
                )
              }
              placeholder="Pesquisar nome, matrícula, cargo ou equipe"
            />

            <select
              value={filtroStatus}
              onChange={(evento) =>
                setFiltroStatus(
                  evento.target.value
                )
              }
            >
              <option>Todos</option>
              <option>Ativa</option>
              <option>Férias</option>
              <option>Afastada</option>
              <option>Desligada</option>
            </select>
          </div>

          <div className="rh-employee-list">
            {colaboradorasFiltradas.map(
              (colaboradora) => (
                <article key={colaboradora.id}>
                  <div className="rh-avatar">
                    {colaboradora.foto ? (
                      <img
                        src={colaboradora.foto}
                        alt={colaboradora.nome}
                      />
                    ) : (
                      colaboradora.nome
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>

                  <div className="rh-employee-main">
                    <strong>
                      {colaboradora.nome}
                    </strong>

                    <span>
                      Matrícula:{" "}
                      {colaboradora.matricula}
                    </span>

                    <div>
                      <b>{colaboradora.cargo}</b>
                      <b>{colaboradora.equipe}</b>
                    </div>
                  </div>

                  <div className="rh-employee-status">
                    <span
                      className={colaboradora.status
                        .toLowerCase()
                        .replace("é", "e")}
                    >
                      {colaboradora.status}
                    </span>

                    <small>
                      {colaboradora.tipoContrato}
                    </small>
                  </div>

                  <div className="rh-employee-actions">
                    <button
                      type="button"
                      onClick={() =>
                        editarColaboradora(
                          colaboradora
                        )
                      }
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="delete"
                      onClick={() =>
                        excluirColaboradora(
                          colaboradora.id
                        )
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      </section>

      <section className="rh-card rh-events-card">
        <div className="rh-list-heading">
          <div>
            <span>FREQUÊNCIA E BENEFÍCIOS</span>
            <h2>
              Vales, faltas, atrasos e ocorrências
            </h2>
          </div>

          <b>{registros.length}</b>
        </div>

        <div className="rh-events-grid">
          <form
            className="rh-event-form"
            onSubmit={salvarRegistro}
          >
            <label>
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
                {!colaboradoras.length && (
                  <option value="">
                    Nenhuma colaboradora
                  </option>
                )}

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

            <label className="rh-event-check">
              <input
                type="checkbox"
                checked={formRegistro.justificada}
                onChange={(evento) =>
                  setFormRegistro({
                    ...formRegistro,
                    justificada:
                      evento.target.checked,
                  })
                }
              />

              <span>Ocorrência justificada</span>
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

            <button type="submit">
              Salvar registro
            </button>
          </form>

          <div className="rh-event-history">
            {!registrosOrdenados.length ? (
              <div className="rh-empty">
                <div>RH</div>

                <strong>
                  Nenhum registro cadastrado
                </strong>

                <p>
                  Os vales, faltas e atrasos
                  aparecerão aqui.
                </p>
              </div>
            ) : (
              registrosOrdenados.map(
                (registro) => (
                  <article key={registro.id}>
                    <div className="rh-event-icon">
                      {registro.tipo === "Vale"
                        ? "R$"
                        : registro.tipo === "Falta"
                          ? "F"
                          : registro.tipo === "Atraso"
                            ? "A"
                            : "RH"}
                    </div>

                    <div className="rh-event-main">
                      <strong>
                        {registro.nome}
                      </strong>

                      <span>
                        {registro.tipo} •{" "}
                        {registro.data}
                      </span>

                      <p>
                        {registro.descricao ||
                          "Sem observação"}
                      </p>

                      <div>
                        <b>
                          {formatarCompetencia(
                            registro.competencia
                          )}
                        </b>

                        {registro.descontarNaFolha && (
                          <b>Descontar na folha</b>
                        )}

                        {registro.cancelaAssiduidade && (
                          <b>
                            Cancela assiduidade
                          </b>
                        )}
                      </div>
                    </div>

                    <div className="rh-event-value">
                      <strong>
                        {registro.valor > 0
                          ? moeda(registro.valor)
                          : `${registro.quantidade} ${registro.unidade}`}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          excluirRegistro(
                            registro.id
                          )
                        }
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                )
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}