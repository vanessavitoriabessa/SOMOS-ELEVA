// VERSAO FINAL: PAGAMENTO DIA 05 E PREMIACAO DIA 20
"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import "./financeiro.css";

type Proposta = {
  id: string;
  cliente: string;
  vendedora: string;
  banco: string;
  tabela: string;
  valorContrato: number;
  percentualTabela: number;
  comissao: number;
  status: string;
};

type Lancamento = {
  id: string;
  tipo: "Entrada" | "Saída";
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
};

type UsuarioFinanceiro = {
  id: string;
  nome: string;
  email?: string;
  matricula: string;
  perfil?: string;
  equipe?: string;
  ativo?: boolean;
};

type RegistroFolha = {
  id: string;
  usuarioId: string;
  nome: string;
  matricula: string;
  competencia: string;
  salario: number;
  premioVendas: number;
  assiduidadeAtiva: boolean;
  valorAssiduidade: number;
  descontoInss: number;
  descontoVale: number;
  descontoFaltas: number;
  totalBrutoDia05: number;
  totalDescontosDia05: number;
  totalDia05: number;
  totalDia20: number;
  totalMensal: number;
  atualizadoEm: string;

  // Campos antigos mantidos apenas para abrir registros já salvos.
  comissao?: number;
  premiacoes?: number;
  totalBruto?: number;
  totalLiquido?: number;
  total?: number;
};


type RegistroRH = {
  id: string;
  colaboradoraId: string;
  nome: string;
  matricula: string;
  tipo:
    | "Vale"
    | "Falta"
    | "Atraso"
    | "Férias"
    | "Afastamento"
    | "Advertência"
    | "Outro";
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
const ENTRADAS = [
  "Receita operacional",
  "Premiação recebida",
  "Ajuste",
  "Outro",
];

const SAIDAS = [
  "Premiação de vendas",
  "Folha de pagamento",
  "Assiduidade",
  "Premiação",
  "Marketing",
  "Aluguel",
  "Impostos",
  "Fornecedor",
  "Ajuste",
  "Outro",
];

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const numero = (valor: string) => {
  const numeroConvertido = Number(
    valor
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );

  return Number.isFinite(numeroConvertido)
    ? numeroConvertido
    : 0;
};

const hoje = () =>
  new Date().toISOString().slice(0, 10);

const competenciaAtual = () =>
  new Date().toISOString().slice(0, 7);

function normalizarNome(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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

export default function FinancialManager() {
  const [propostas, setPropostas] =
    useState<Proposta[]>([]);

  const [lancamentos, setLancamentos] =
    useState<Lancamento[]>([]);

  const [usuarios, setUsuarios] =
    useState<UsuarioFinanceiro[]>([]);

 const [folhas, setFolhas] =
  useState<RegistroFolha[]>([]);

const [registrosRH, setRegistrosRH] =
  useState<RegistroRH[]>([]);

const [tipo, setTipo] =
  useState<"Entrada" | "Saída">("Entrada");

  const [categoria, setCategoria] =
    useState(ENTRADAS[0]);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [mensagem, setMensagem] = useState("");

  const [usuarioFolhaId, setUsuarioFolhaId] =
    useState("");

  const [competencia, setCompetencia] =
    useState(competenciaAtual());

  const [salario, setSalario] =
    useState("1.621,00");

  const [assiduidadeAtiva, setAssiduidadeAtiva] =
    useState(false);

  const [valorAssiduidade, setValorAssiduidade] =
  useState("");

const [descontoInss, setDescontoInss] =
  useState("");
  const [descontoVale, setDescontoVale] =
  useState("");

const [descontoFaltas, setDescontoFaltas] =
  useState("");

const [mensagemFolha, setMensagemFolha] =
  useState("");

  useEffect(() => {
    try {
      const propostasSalvas = JSON.parse(
        localStorage.getItem(
          "somos-eleva-propostas"
        ) || "[]"
      );

      setPropostas(
        Array.isArray(propostasSalvas)
          ? propostasSalvas
          : []
      );
    } catch {
      setPropostas([]);
    }

    try {
      const financeiroSalvo = JSON.parse(
        localStorage.getItem(
          "somos-eleva-financeiro"
        ) || "[]"
      );

      setLancamentos(
        Array.isArray(financeiroSalvo)
          ? financeiroSalvo
          : []
      );
    } catch {
      setLancamentos([]);
    }

    try {
      const usuariosSalvos = JSON.parse(
        localStorage.getItem(
          "somos-eleva-usuarios"
        ) || "[]"
      );

      const listaUsuarios: UsuarioFinanceiro[] =
        Array.isArray(usuariosSalvos)
          ? usuariosSalvos
          : [];

      const usuariosAtivos = listaUsuarios.filter(
        (usuario) => usuario.ativo !== false
      );

      setUsuarios(usuariosAtivos);

      if (usuariosAtivos.length) {
        setUsuarioFolhaId(
          usuariosAtivos[0].id
        );
      }
    } catch {
      setUsuarios([]);
    }

    try {
      const folhasSalvas = JSON.parse(
        localStorage.getItem(
          "somos-eleva-folha"
        ) || "[]"
      );

      setFolhas(
        Array.isArray(folhasSalvas)
          ? folhasSalvas
          : []
      );
    } catch {
  setFolhas([]);
}

try {
  const registrosRhSalvos = JSON.parse(
    localStorage.getItem(
      "somos-eleva-rh-registros"
    ) || "[]"
  );

  setRegistrosRH(
    Array.isArray(registrosRhSalvos)
      ? registrosRhSalvos
      : []
  );
} catch {
  setRegistrosRH([]);
}

}, []);

  function persistirLancamentos(
    lista: Lancamento[]
  ) {
    setLancamentos(lista);

    localStorage.setItem(
      "somos-eleva-financeiro",
      JSON.stringify(lista)
    );
  }

  function persistirFolhas(
    lista: RegistroFolha[]
  ) {
    setFolhas(lista);

    localStorage.setItem(
      "somos-eleva-folha",
      JSON.stringify(lista)
    );
  }

  const pagas = useMemo(
    () =>
      propostas.filter(
        (proposta) => proposta.status === "Pago"
      ),
    [propostas]
  );

  const usuarioSelecionado = useMemo(
    () =>
      usuarios.find(
        (usuario) =>
          usuario.id === usuarioFolhaId
      ),
    [usuarios, usuarioFolhaId]
  );

  const premiacaoVendasSelecionada = useMemo(() => {
    if (!usuarioSelecionado) return 0;

    const nomeUsuario = normalizarNome(
      usuarioSelecionado.nome
    );

    return pagas
      .filter(
        (proposta) =>
          normalizarNome(
            proposta.vendedora || ""
          ) === nomeUsuario
      )
      .reduce(
        (total, proposta) =>
          total + Number(proposta.comissao || 0),
        0
      );
  }, [pagas, usuarioSelecionado]);
  const registrosRhDaFolha = useMemo(() => {
  if (!usuarioSelecionado || !competencia) {
    return [];
  }

  const matriculaSelecionada = String(
    usuarioSelecionado.matricula || ""
  ).trim();

  const nomeSelecionado = normalizarNome(
    usuarioSelecionado.nome || ""
  );

  return registrosRH.filter((registro) => {
    const mesmaCompetencia =
      registro.competencia === competencia;

    const mesmaMatricula =
      matriculaSelecionada &&
      String(registro.matricula || "").trim() ===
        matriculaSelecionada;

    const mesmoNome =
      normalizarNome(registro.nome || "") ===
      nomeSelecionado;

    return (
      mesmaCompetencia &&
      (mesmaMatricula || mesmoNome)
    );
  });
}, [
  registrosRH,
  usuarioSelecionado,
  competencia,
]);
const resumoRhDaFolha = useMemo(() => {
  const registrosParaDesconto =
    registrosRhDaFolha.filter(
      (registro) => registro.descontarNaFolha
    );

  const totalVales = registrosParaDesconto
    .filter(
      (registro) => registro.tipo === "Vale"
    )
    .reduce(
      (total, registro) =>
        total + Number(registro.valor || 0),
      0
    );

  const totalFaltas = registrosParaDesconto
    .filter(
      (registro) =>
        registro.tipo === "Falta" ||
        registro.tipo === "Atraso"
    )
    .reduce(
      (total, registro) =>
        total + Number(registro.valor || 0),
      0
    );

  const cancelaAssiduidade =
    registrosRhDaFolha.some(
      (registro) =>
        registro.cancelaAssiduidade
    );

  return {
    totalVales,
    totalFaltas,
    cancelaAssiduidade,
  };
}, [registrosRhDaFolha]);


  useEffect(() => {
    if (!usuarioFolhaId || !competencia) {
      return;
    }

    const registroExistente = folhas.find(
      (registro) =>
        registro.usuarioId === usuarioFolhaId &&
        registro.competencia === competencia
    );

    if (registroExistente) {
  setSalario(
    registroExistente.salario
      .toFixed(2)
      .replace(".", ",")
  );

  setAssiduidadeAtiva(
    registroExistente.assiduidadeAtiva
  );

  setValorAssiduidade(
    registroExistente.valorAssiduidade
      .toFixed(2)
      .replace(".", ",")
  );

  setDescontoInss(
    Number(registroExistente.descontoInss || 0)
      .toFixed(2)
      .replace(".", ",")
  );

  setDescontoVale(
    Number(registroExistente.descontoVale || 0)
      .toFixed(2)
      .replace(".", ",")
  );

  setDescontoFaltas(
    Number(registroExistente.descontoFaltas || 0)
      .toFixed(2)
      .replace(".", ",")
  );
} else {
  setSalario("1.621,00");
  setAssiduidadeAtiva(false);
  setValorAssiduidade("");
  setDescontoInss("");
  setDescontoVale("");
  setDescontoFaltas("");
}


    setMensagemFolha("");
  }, [usuarioFolhaId, competencia, folhas]);

  useEffect(() => {
    if (!usuarioSelecionado || !competencia) {
      return;
    }

    const folhaJaSalva = folhas.some(
      (registro) =>
        registro.usuarioId === usuarioSelecionado.id &&
        registro.competencia === competencia
    );

    if (folhaJaSalva) {
      return;
    }

    setDescontoVale(
      resumoRhDaFolha.totalVales > 0
        ? resumoRhDaFolha.totalVales
            .toFixed(2)
            .replace(".", ",")
        : ""
    );

    setDescontoFaltas(
      resumoRhDaFolha.totalFaltas > 0
        ? resumoRhDaFolha.totalFaltas
            .toFixed(2)
            .replace(".", ",")
        : ""
    );

    if (resumoRhDaFolha.cancelaAssiduidade) {
      setAssiduidadeAtiva(false);
      setValorAssiduidade("");
    }
  }, [
    resumoRhDaFolha,
    usuarioSelecionado,
    competencia,
    folhas,
  ]);

  const calculoFolha = useMemo(() => {
    const valorSalario = numero(salario);
    const valorInss = numero(descontoInss);
    const valorVale = numero(descontoVale);
    const valorFaltas = numero(descontoFaltas);

    const assiduidade = assiduidadeAtiva
      ? numero(valorAssiduidade)
      : 0;

    const totalBrutoDia05 =
      valorSalario + assiduidade;

    const totalDescontosDia05 =
      valorInss + valorVale + valorFaltas;

    const totalDia05 = Math.max(
      totalBrutoDia05 - totalDescontosDia05,
      0
    );

    const totalDia20 = premiacaoVendasSelecionada;
    const totalMensal = totalDia05 + totalDia20;

    return {
      salario: valorSalario,
      premioVendas: premiacaoVendasSelecionada,
      assiduidade,
      descontoInss: valorInss,
      descontoVale: valorVale,
      descontoFaltas: valorFaltas,
      totalBrutoDia05,
      totalDescontosDia05,
      totalDia05,
      totalDia20,
      totalMensal,
    };
  }, [
    salario,
    assiduidadeAtiva,
    valorAssiduidade,
    descontoInss,
    descontoVale,
    descontoFaltas,
    premiacaoVendasSelecionada,
  ]);

  const resumo = useMemo(() => {
    const producao = pagas.reduce(
      (total, proposta) =>
        total +
        Number(proposta.valorContrato || 0),
      0
    );

    const premiacoesCalculadas = pagas.reduce(
      (total, proposta) =>
        total + Number(proposta.comissao || 0),
      0
    );

    const entradas = lancamentos
      .filter(
        (lancamento) =>
          lancamento.tipo === "Entrada"
      )
      .reduce(
        (total, lancamento) =>
          total + lancamento.valor,
        0
      );

    const saidas = lancamentos
      .filter(
        (lancamento) =>
          lancamento.tipo === "Saída"
      )
      .reduce(
        (total, lancamento) =>
          total + lancamento.valor,
        0
      );

    const folhaPrevista = folhas.reduce(
      (total, registro) =>
        total + Number(
          registro.totalMensal ??
            registro.total ??
            0
        ),
      0
    );

    const assiduidadePrevista = folhas
      .filter(
        (registro) =>
          registro.assiduidadeAtiva
      )
      .reduce(
        (total, registro) =>
          total +
          Number(
            registro.valorAssiduidade || 0
          ),
        0
      );

    return {
      producao,
      premiacoesCalculadas,
      entradas,
      saidas,
      saldo: entradas - saidas,
      folhaPrevista,
      assiduidadePrevista,
    };
  }, [pagas, lancamentos, folhas]);

  const lista = useMemo(
    () =>
      lancamentos
        .filter(
          (lancamento) =>
            filtro === "Todos" ||
            lancamento.tipo === filtro
        )
        .filter(
          (lancamento) =>
            !busca.trim() ||
            `${lancamento.descricao} ${lancamento.categoria}`
              .toLowerCase()
              .includes(busca.toLowerCase())
        )
        .sort((a, b) =>
          b.data.localeCompare(a.data)
        ),
    [lancamentos, filtro, busca]
  );

  const folhasOrdenadas = useMemo(
    () =>
      [...folhas].sort((a, b) => {
        const comparacaoCompetencia =
          b.competencia.localeCompare(
            a.competencia
          );

        if (comparacaoCompetencia !== 0) {
          return comparacaoCompetencia;
        }

        return a.nome.localeCompare(b.nome);
      }),
    [folhas]
  );

  function salvarLancamento(
    evento: FormEvent
  ) {
    evento.preventDefault();

    const valorConvertido = numero(valor);

    if (!descricao.trim()) {
      setMensagem("Informe a descrição.");
      return;
    }

    if (valorConvertido <= 0) {
      setMensagem(
        "Informe um valor maior que zero."
      );
      return;
    }

    const novo: Lancamento = {
      id: crypto.randomUUID(),
      tipo,
      categoria,
      descricao: descricao.trim(),
      valor: valorConvertido,
      data,
    };

    persistirLancamentos([
      novo,
      ...lancamentos,
    ]);

    setDescricao("");
    setValor("");
    setData(hoje());

    setMensagem(
      "Lançamento salvo com sucesso."
    );
  }

  function salvarFolha(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();
    setMensagemFolha("");

    if (!usuarioSelecionado) {
      setMensagemFolha(
        "Selecione uma colaboradora."
      );
      return;
    }

    if (!competencia) {
      setMensagemFolha(
        "Selecione a competência."
      );
      return;
    }

    if (calculoFolha.salario <= 0) {
      setMensagemFolha(
        "Informe o salário da colaboradora."
      );
      return;
    }

    if (
      assiduidadeAtiva &&
      calculoFolha.assiduidade <= 0
    ) {
      setMensagemFolha(
        "Informe o valor da assiduidade."
      );
      return;
    }

    const idRegistro =
      `${usuarioSelecionado.id}-${competencia}`;

    const novoRegistro: RegistroFolha = {
      id: idRegistro,
      usuarioId: usuarioSelecionado.id,
      nome: usuarioSelecionado.nome,
      matricula: usuarioSelecionado.matricula || "",
      competencia,
      salario: calculoFolha.salario,
      premioVendas: calculoFolha.premioVendas,
      assiduidadeAtiva,
      valorAssiduidade: calculoFolha.assiduidade,
      descontoInss: calculoFolha.descontoInss,
      descontoVale: calculoFolha.descontoVale,
      descontoFaltas: calculoFolha.descontoFaltas,
      totalBrutoDia05: calculoFolha.totalBrutoDia05,
      totalDescontosDia05:
        calculoFolha.totalDescontosDia05,
      totalDia05: calculoFolha.totalDia05,
      totalDia20: calculoFolha.totalDia20,
      totalMensal: calculoFolha.totalMensal,
      total: calculoFolha.totalMensal,
      atualizadoEm:
        new Date().toLocaleString("pt-BR"),
    };

    const registroExiste = folhas.some(
      (registro) =>
        registro.id === idRegistro
    );

    const listaAtualizada = registroExiste
      ? folhas.map((registro) =>
          registro.id === idRegistro
            ? novoRegistro
            : registro
        )
      : [novoRegistro, ...folhas];

    persistirFolhas(listaAtualizada);

    setMensagemFolha(
      registroExiste
        ? "Folha atualizada com sucesso."
        : "Folha salva com sucesso."
    );
  }

  function editarFolha(
    registro: RegistroFolha
  ) {
    setUsuarioFolhaId(registro.usuarioId);
    setCompetencia(registro.competencia);

    window.scrollTo({
      top: document.body.scrollHeight / 3,
      behavior: "smooth",
    });
  }

  function excluirFolha(id: string) {
    if (
      !window.confirm(
        "Deseja excluir este cálculo da folha?"
      )
    ) {
      return;
    }

    persistirFolhas(
      folhas.filter(
        (registro) => registro.id !== id
      )
    );
  }

  function mudarTipo(
    novoTipo: "Entrada" | "Saída"
  ) {
    setTipo(novoTipo);

    setCategoria(
      novoTipo === "Entrada"
        ? ENTRADAS[0]
        : SAIDAS[0]
    );
  }

  function excluirLancamento(id: string) {
    if (
      window.confirm(
        "Deseja excluir este lançamento?"
      )
    ) {
      persistirLancamentos(
        lancamentos.filter(
          (lancamento) =>
            lancamento.id !== id
        )
      );
    }
  }

  const categorias =
    tipo === "Entrada"
      ? ENTRADAS
      : SAIDAS;

  return (
    <div className="finance-page">
      <section className="finance-summary">
        <article>
          <span>Produção paga</span>
          <strong>
            {moeda(resumo.producao)}
          </strong>
          <small>Contratos pagos</small>
        </article>

        <article>
          <span>Premiações calculadas</span>
          <strong>
            {moeda(resumo.premiacoesCalculadas)}
          </strong>
          <small>Vendas pagas</small>
        </article>

        <article>
          <span>Entradas</span>
          <strong>
            {moeda(resumo.entradas)}
          </strong>
          <small>Lançamentos manuais</small>
        </article>

        <article>
          <span>Saídas</span>
          <strong>
            {moeda(resumo.saidas)}
          </strong>
          <small>Lançamentos manuais</small>
        </article>

        <article
          className={
            resumo.saldo < 0
              ? "negative"
              : "highlight"
          }
        >
          <span>Saldo</span>
          <strong>
            {moeda(resumo.saldo)}
          </strong>
          <small>Entradas − saídas</small>
        </article>

        <article>
          <span>Folha prevista</span>
          <strong>
            {moeda(resumo.folhaPrevista)}
          </strong>
          <small>
            Salários e benefícios
          </small>
        </article>

        <article>
          <span>Assiduidade</span>
          <strong>
            {moeda(
              resumo.assiduidadePrevista
            )}
          </strong>
          <small>Prêmios selecionados</small>
        </article>
      </section>

      <section className="finance-grid">
        <form
          className="finance-card"
          onSubmit={salvarLancamento}
        >
          <div className="finance-heading">
            <div>
              <span>NOVO LANÇAMENTO</span>
              <h2>
                Registrar movimentação
              </h2>
              <p>
                Cadastre receitas, despesas e
                ajustes.
              </p>
            </div>

            <b>R$</b>
          </div>

          <div className="finance-form-grid">
            <label>
              Tipo

              <select
                value={tipo}
                onChange={(evento) =>
                  mudarTipo(
                    evento.target.value as
                      | "Entrada"
                      | "Saída"
                  )
                }
              >
                <option>Entrada</option>
                <option>Saída</option>
              </select>
            </label>

            <label>
              Categoria

              <select
                value={categoria}
                onChange={(evento) =>
                  setCategoria(
                    evento.target.value
                  )
                }
              >
                {categorias.map(
                  (itemCategoria) => (
                    <option
                      key={itemCategoria}
                    >
                      {itemCategoria}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Descrição

              <input
                value={descricao}
                onChange={(evento) =>
                  setDescricao(
                    evento.target.value
                  )
                }
                placeholder="Ex.: Pagamento de campanha"
              />
            </label>

            <label>
              Valor

              <input
                value={valor}
                onChange={(evento) =>
                  setValor(
                    evento.target.value
                  )
                }
                placeholder="Ex.: 1.500,00"
                inputMode="decimal"
              />
            </label>

            <label>
              Data

              <input
                type="date"
                value={data}
                onChange={(evento) =>
                  setData(
                    evento.target.value
                  )
                }
              />
            </label>
          </div>

          {mensagem && (
            <div className="finance-message">
              {mensagem}
            </div>
          )}

          <div className="finance-actions">
            <button type="submit">
              Salvar lançamento
            </button>
          </div>
        </form>

        <section className="finance-card">
          <div className="finance-list-heading">
            <div>
              <span>MOVIMENTAÇÕES</span>
              <h2>Entradas e saídas</h2>
            </div>

            <b>{lista.length}</b>
          </div>

          <div className="finance-filters">
            <input
              value={busca}
              onChange={(evento) =>
                setBusca(
                  evento.target.value
                )
              }
              placeholder="Pesquisar descrição ou categoria"
            />

            <select
              value={filtro}
              onChange={(evento) =>
                setFiltro(
                  evento.target.value
                )
              }
            >
              <option>Todos</option>
              <option>Entrada</option>
              <option>Saída</option>
            </select>
          </div>

          {lista.length === 0 ? (
            <div className="finance-empty">
              <div>▥</div>
              <strong>
                Nenhum lançamento
              </strong>
              <p>
                Cadastre a primeira movimentação.
              </p>
            </div>
          ) : (
            <div className="finance-list">
              {lista.map((lancamento) => (
                <article key={lancamento.id}>
                  <i
                    className={
                      lancamento.tipo ===
                      "Entrada"
                        ? "entry"
                        : "exit"
                    }
                  >
                    {lancamento.tipo ===
                    "Entrada"
                      ? "+"
                      : "−"}
                  </i>

                  <div>
                    <strong>
                      {lancamento.descricao}
                    </strong>

                    <span>
                      {lancamento.categoria} •{" "}
                      {lancamento.data}
                    </span>
                  </div>

                  <div className="finance-value">
                    <strong
                      className={
                        lancamento.tipo ===
                        "Entrada"
                          ? "entry-text"
                          : "exit-text"
                      }
                    >
                      {lancamento.tipo ===
                      "Entrada"
                        ? "+"
                        : "−"}{" "}
                      {moeda(
                        lancamento.valor
                      )}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        excluirLancamento(
                          lancamento.id
                        )
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="finance-card payroll-card">
        <div className="finance-list-heading">
          <div>
            <span>FOLHA E BENEFÍCIOS</span>
            <h2>
              Pagamentos dos dias 05 e 20
            </h2>
          </div>

          <b>{folhas.length}</b>
        </div>

        <div className="payroll-layout">
          <form
            className="payroll-form"
            onSubmit={salvarFolha}
          >
            <div className="payroll-form-grid">
              <label>
                Competência

                <input
                  type="month"
                  value={competencia}
                  onChange={(evento) =>
                    setCompetencia(
                      evento.target.value
                    )
                  }
                />
              </label>

              <label>
                Colaboradora

                <select
                  value={usuarioFolhaId}
                  onChange={(evento) =>
                    setUsuarioFolhaId(
                      evento.target.value
                    )
                  }
                >
                  {!usuarios.length && (
                    <option value="">
                      Nenhuma usuária cadastrada
                    </option>
                  )}

                  {usuarios.map((usuario) => (
                    <option
                      key={usuario.id}
                      value={usuario.id}
                    >
                      {usuario.nome} —{" "}
                      {usuario.matricula ||
                        "Sem matrícula"}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Salário

                <input
                  value={salario}
                  onChange={(evento) =>
                    setSalario(
                      evento.target.value
                    )
                  }
                  placeholder="Ex.: 1.621,00"
                  inputMode="decimal"
                />
              </label>

              <label>
                Premiação — dia 20

                <div className="payroll-readonly">
                  {moeda(
                    premiacaoVendasSelecionada
                  )}
                </div>
              </label>

              <label>
                Desconto do INSS

                <input
                  value={descontoInss}
                  onChange={(evento) =>
                    setDescontoInss(
                      evento.target.value
                    )
                  }
                  placeholder="Ex.: 121,58"
                  inputMode="decimal"
                />
              </label>

              <label>
                Vale / adiantamento

                <input
                  value={descontoVale}
                  onChange={(evento) =>
                    setDescontoVale(
                      evento.target.value
                    )
                  }
                  placeholder="Ex.: 300,00"
                  inputMode="decimal"
                />
              </label>

              <label>
                Desconto de faltas

                <input
                  value={descontoFaltas}
                  onChange={(evento) =>
                    setDescontoFaltas(
                      evento.target.value
                    )
                  }
                  placeholder="Ex.: 80,00"
                  inputMode="decimal"
                />
              </label>
            </div>

            <div
              className={`attendance-box ${
                assiduidadeAtiva
                  ? "selected"
                  : ""
              }`}
            >
              <label className="attendance-switch">
                <input
                  type="checkbox"
                  checked={assiduidadeAtiva}
                  onChange={(evento) =>
                    setAssiduidadeAtiva(
                      evento.target.checked
                    )
                  }
                />

                <span>
                  Recebe prêmio de assiduidade
                </span>
              </label>

              <p>
                Marque quando a colaboradora não
                tiver faltas nem atrasos no mês.
              </p>

              <label>
                Valor da assiduidade

                <input
                  value={valorAssiduidade}
                  onChange={(evento) =>
                    setValorAssiduidade(
                      evento.target.value
                    )
                  }
                  placeholder="Ex.: 200,00"
                  inputMode="decimal"
                  disabled={!assiduidadeAtiva}
                />
              </label>
            </div>

            <div className="payroll-total">
              <div>
                <span>Salário — dia 05</span>
                <strong>
                  {moeda(calculoFolha.salario)}
                </strong>
              </div>

              <div>
                <span>Assiduidade — dia 05</span>
                <strong>
                  {moeda(calculoFolha.assiduidade)}
                </strong>
              </div>

              <div className="payroll-gross-total">
                <span>Bruto do dia 05</span>
                <strong>
                  {moeda(calculoFolha.totalBrutoDia05)}
                </strong>
              </div>

              <div className="payroll-deduction">
                <span>Desconto do INSS</span>
                <strong>
                  − {moeda(calculoFolha.descontoInss)}
                </strong>
              </div>

              <div className="payroll-deduction">
                <span>Vale / adiantamento</span>
                <strong>
                  − {moeda(calculoFolha.descontoVale)}
                </strong>
              </div>

              <div className="payroll-deduction">
                <span>Desconto de faltas</span>
                <strong>
                  − {moeda(calculoFolha.descontoFaltas)}
                </strong>
              </div>

              <div className="payroll-deduction">
                <span>Descontos do dia 05</span>
                <strong>
                  − {moeda(
                    calculoFolha.totalDescontosDia05
                  )}
                </strong>
              </div>

              <div className="payroll-grand-total">
                <span>Pagamento líquido — dia 05</span>
                <strong>
                  {moeda(calculoFolha.totalDia05)}
                </strong>
              </div>

              <div className="payroll-grand-total">
                <span>Premiação das vendas — dia 20</span>
                <strong>
                  {moeda(calculoFolha.totalDia20)}
                </strong>
              </div>

              <div className="payroll-grand-total">
                <span>Total recebido no mês</span>
                <strong>
                  {moeda(calculoFolha.totalMensal)}
                </strong>
              </div>
            </div>

            {mensagemFolha && (
              <div className="finance-message">
                {mensagemFolha}
              </div>
            )}

            <div className="finance-actions">
              <button
                type="submit"
                disabled={!usuarios.length}
              >
                Salvar cálculo da folha
              </button>
            </div>
          </form>

          <div className="payroll-history">
            <div className="payroll-history-title">
              <strong>
                Histórico de pagamentos
              </strong>

              <span>
                {folhasOrdenadas.length} registros
              </span>
            </div>

            {!folhasOrdenadas.length ? (
              <div className="finance-empty">
                <div>▥</div>

                <strong>
                  Nenhum cálculo salvo
                </strong>

                <p>
                  Selecione a colaboradora e
                  salve a primeira folha.
                </p>
              </div>
            ) : (
              <div className="payroll-list">
                {folhasOrdenadas.map(
                  (registro) => (
                    <article
                      key={registro.id}
                    >
                      <div className="payroll-person">
                        <div className="payroll-avatar">
                          {registro.nome
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {registro.nome}
                          </strong>

                          <span>
                            {formatarCompetencia(
                              registro.competencia
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="payroll-values">
                        <span>
                          Salário: {" "}
                          <strong>
                            {moeda(registro.salario)}
                          </strong>
                        </span>

                        <span>
                          Assiduidade: {" "}
                          <strong>
                            {registro.assiduidadeAtiva
                              ? moeda(
                                  registro.valorAssiduidade
                                )
                              : "Não recebe"}
                          </strong>
                        </span>

                        <span>
                          INSS: {" "}
                          <strong>
                            − {moeda(
                              Number(
                                registro.descontoInss || 0
                              )
                            )}
                          </strong>
                        </span>

                        <span>
                          Vale / adiantamento: {" "}
                          <strong>
                            − {moeda(
                              Number(
                                registro.descontoVale || 0
                              )
                            )}
                          </strong>
                        </span>

                        <span>
                          Faltas: {" "}
                          <strong>
                            − {moeda(
                              Number(
                                registro.descontoFaltas || 0
                              )
                            )}
                          </strong>
                        </span>

                        <span>
                          Pagamento do dia 05: {" "}
                          <strong>
                            {moeda(
                              Number(
                                registro.totalDia05 ??
                                  registro.totalLiquido ??
                                  registro.total ??
                                  0
                              )
                            )}
                          </strong>
                        </span>

                        <span>
                          Premiação do dia 20: {" "}
                          <strong>
                            {moeda(
                              Number(
                                registro.totalDia20 ??
                                  registro.premioVendas ??
                                  registro.comissao ??
                                  registro.premiacoes ??
                                  0
                              )
                            )}
                          </strong>
                        </span>
                      </div>

                      <div className="payroll-item-total">
                        <span>
                          Total recebido no mês
                        </span>

                        <strong>
                          {moeda(
                            Number(
                              registro.totalMensal ??
                                registro.total ??
                                0
                            )
                          )}
                        </strong>

                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              editarFolha(
                                registro
                              )
                            }
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="delete"
                            onClick={() =>
                              excluirFolha(
                                registro.id
                              )
                            }
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="finance-card paid-card">
        <div className="finance-list-heading">
          <div>
            <span>CONTRATOS PAGOS</span>
            <h2>
              Resumo automático das propostas
            </h2>
          </div>

          <b>{pagas.length}</b>
        </div>

        {pagas.length === 0 ? (
          <div className="paid-empty">
            Nenhuma proposta com status Pago.
          </div>
        ) : (
          <div className="paid-table">
            <div className="paid-row paid-head">
              <span>Cliente</span>
              <span>Vendedora</span>
              <span>Banco/Tabela</span>
              <span>Contrato</span>
              <span>%</span>
              <span>Premiação</span>
            </div>

            {pagas.map((proposta) => (
              <div
                className="paid-row"
                key={proposta.id}
              >
                <strong>
                  {proposta.cliente}
                </strong>

                <span>
                  {proposta.vendedora ||
                    "Não informada"}
                </span>

                <span>
                  {proposta.banco || "—"}

                  {proposta.tabela
                    ? ` • ${proposta.tabela}`
                    : ""}
                </span>

                <strong>
                  {moeda(
                    proposta.valorContrato
                  )}
                </strong>

                <span>
                  {String(
                    proposta.percentualTabela ||
                      0
                  ).replace(".", ",")}
                  %
                </span>

                <strong className="commission">
                  {moeda(
                    proposta.comissao
                  )}
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}