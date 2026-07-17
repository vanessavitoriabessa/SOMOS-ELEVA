"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
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
    let listaUsuarios: UsuarioSistema[] = [];

    try {
      const usuariosSalvos = JSON.parse(
        localStorage.getItem(
          "somos-eleva-usuarios"
        ) || "[]"
      );

      listaUsuarios = Array.isArray(usuariosSalvos)
        ? usuariosSalvos
        : [];
    } catch {
      listaUsuarios = [];
    }

    setUsuarios(listaUsuarios);

    try {
      const rhSalvo = JSON.parse(
        localStorage.getItem(
          "somos-eleva-rh-colaboradoras"
        ) || "[]"
      );

      const listaRH: ColaboradoraRH[] =
        Array.isArray(rhSalvo) ? rhSalvo : [];

      const usuariosNaoCadastrados =
        listaUsuarios.filter(
          (usuario) =>
            !listaRH.some(
              (colaboradora) =>
                colaboradora.usuarioId === usuario.id ||
                (usuario.matricula &&
                  colaboradora.matricula ===
                    usuario.matricula)
            )
        );

      const listaCompleta = [
        ...listaRH,
        ...usuariosNaoCadastrados.map(
          criarColaboradoraDoUsuario
        ),
      ];

      setColaboradoras(listaCompleta);

      localStorage.setItem(
        "somos-eleva-rh-colaboradoras",
        JSON.stringify(listaCompleta)
      );

      if (listaCompleta.length) {
        setFormRegistro((dados) => ({
          ...dados,
          colaboradoraId: listaCompleta[0].id,
        }));
      }
    } catch {
      const listaInicial = listaUsuarios.map(
        criarColaboradoraDoUsuario
      );

      setColaboradoras(listaInicial);

      localStorage.setItem(
        "somos-eleva-rh-colaboradoras",
        JSON.stringify(listaInicial)
      );
    }

    try {
      const registrosSalvos = JSON.parse(
        localStorage.getItem(
          "somos-eleva-rh-registros"
        ) || "[]"
      );

      setRegistros(
        Array.isArray(registrosSalvos)
          ? registrosSalvos
          : []
      );
    } catch {
      setRegistros([]);
    }
  }, []);

  function persistirColaboradoras(
    lista: ColaboradoraRH[]
  ) {
    setColaboradoras(lista);

    localStorage.setItem(
      "somos-eleva-rh-colaboradoras",
      JSON.stringify(lista)
    );
  }

  function persistirRegistros(
    lista: RegistroRH[]
  ) {
    setRegistros(lista);

    localStorage.setItem(
      "somos-eleva-rh-registros",
      JSON.stringify(lista)
    );
  }

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
      matricula: usuario.matricula || "",
      email: usuario.email || "",
      cargo: usuario.perfil || "",
      equipe: usuario.equipe || "",
      status:
        usuario.ativo === false
          ? "Desligada"
          : "Ativa",
    });
  }

  function salvarColaboradora(
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

    if (!formColaboradora.matricula.trim()) {
      setMensagemColaboradora(
        "Informe a matrícula da colaboradora."
      );
      return;
    }

    const matricula = somenteNumeros(
      formColaboradora.matricula
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
        new Date().toLocaleString("pt-BR"),
    };

    const listaAtualizada =
      editandoColaboradoraId
        ? colaboradoras.map((colaboradora) =>
            colaboradora.id ===
            editandoColaboradoraId
              ? novaColaboradora
              : colaboradora
          )
        : [novaColaboradora, ...colaboradoras];

    persistirColaboradoras(listaAtualizada);

    setFormColaboradora(colaboradoraVazia);
    setEditandoColaboradoraId(null);

    setMensagemColaboradora(
      editandoColaboradoraId
        ? "Ficha atualizada com sucesso."
        : "Colaboradora cadastrada com sucesso."
    );
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
    matricula: colaboradora.matricula || "",
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
    setFormColaboradora(colaboradoraVazia);
    setEditandoColaboradoraId(null);
    setMensagemColaboradora("");
  }

  function excluirColaboradora(id: string) {
    if (
      !window.confirm(
        "Deseja excluir esta ficha do RH?"
      )
    ) {
      return;
    }

    persistirColaboradoras(
      colaboradoras.filter(
        (colaboradora) => colaboradora.id !== id
      )
    );

    persistirRegistros(
      registros.filter(
        (registro) =>
          registro.colaboradoraId !== id
      )
    );
  }

  function salvarRegistro(
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
      criadoEm: new Date().toLocaleString("pt-BR"),
    };

    persistirRegistros([
      novoRegistro,
      ...registros,
    ]);

    setFormRegistro({
      ...registroVazio,
      colaboradoraId: colaboradora.id,
      tipo: formRegistro.tipo,
    });

    setMensagemRegistro(
      "Registro salvo com sucesso."
    );
  }

  function excluirRegistro(id: string) {
    if (
      !window.confirm(
        "Deseja excluir este registro?"
      )
    ) {
      return;
    }

    persistirRegistros(
      registros.filter(
        (registro) => registro.id !== id
      )
    );
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
                onChange={(evento) =>
                  setFormColaboradora({
                    ...formColaboradora,
                    matricula: somenteNumeros(
                      evento.target.value
                    ),
                  })
                }
                placeholder="Ex.: 0012"
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