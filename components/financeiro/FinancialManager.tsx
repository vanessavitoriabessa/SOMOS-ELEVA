"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import "./financeiro.css";

type Proposta = {
  id: string;
  cliente: string;
  vendedora: string;
  banco: string;
  tabela: string;
  valorContrato: number;
  valorMeta?: number;
  percentualTabela: number;
  comissao: number;
  status: string;
  dataCadastro?: string;
  dataPagamento?: string;
};

type Lancamento = {
  id: string;
  tipo: "Entrada" | "Saída";
  produto: string;
  banco: string;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
};

type TipoConfigFinanceiro =
  | "produto"
  | "banco"
  | "categoria_entrada"
  | "categoria_saida";

type ConfigFinanceiroItem = {
  id: string;
  tipo: TipoConfigFinanceiro;
  nome: string;
  ativo: boolean;
  ordem: number;
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


type RegistroComissao = {
  id: string;
  usuarioId: string;
  nome: string;
  competencia: string;
  comissaoCompraDivida: number;
  comissaoClt: number;
  outrasPremiacoes: number;
  ajusteManual: number;
  totalComissao: number;
  dataPagamento: string;
  observacao: string;
  atualizadoEm: string;
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
const PRODUTOS_PADRAO = [
  "Compra de Dívida",
  "CLT",
  "INSS",
  "Crédito Pessoal",
];

const BANCOS_PADRAO = [
  "NEO",
  "Amigoz",
  "3RN",
  "C6",
];

const ENTRADAS_PADRAO = [
  "Comissão do banco",
];

const SAIDAS_PADRAO = [
  "Premiação de venda",
  "Folha de pagamento",
  "Imposto",
  "Aluguel",
  "Energia",
  "Água",
  "Contabilidade",
  "Internet",
  "Limpeza",
  "Sistema de consulta",
  "Rescisão",
  "Assiduidade",
  "Hyperflow",
  "CRM de gestão",
  "FGTS",
  "INSS",
  "Parcelamento INSS",
  "Parcelamento Imposto de Renda",
  "Supermercado",
  "Papelaria",
  "Bate Ponto Dix",
  "Discadora Argus",
  "Telefonia",
  "Tráfego pago",
  "Jurídico",
  "Consertos",
  "Pró-labore",
  "Gestor de tráfego",
  "Acessórios empresa",
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
  const supabase = useMemo(() => createClient(), []);

  const [propostas, setPropostas] =
    useState<Proposta[]>([]);

  const [carregandoPropostas, setCarregandoPropostas] =
    useState(false);

  const [lancamentos, setLancamentos] =
    useState<Lancamento[]>([]);

  const [configFinanceiro, setConfigFinanceiro] =
    useState<ConfigFinanceiroItem[]>([]);

  const [usuarios, setUsuarios] =
    useState<UsuarioFinanceiro[]>([]);

 const [folhas, setFolhas] =
  useState<RegistroFolha[]>([]);

const [registrosRH, setRegistrosRH] =
  useState<RegistroRH[]>([]);

const [tipo, setTipo] =
  useState<"Entrada" | "Saída">("Entrada");

  const [categoria, setCategoria] =
    useState(ENTRADAS_PADRAO[0]);
  const [produtoLancamento, setProdutoLancamento] =
    useState(PRODUTOS_PADRAO[0]);
  const [bancoLancamento, setBancoLancamento] =
    useState(BANCOS_PADRAO[0]);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [filtroProduto, setFiltroProduto] = useState("Todos");
  const [filtroBanco, setFiltroBanco] = useState("Todos");
  const [filtroDataInicial, setFiltroDataInicial] = useState("");
  const [filtroDataFinal, setFiltroDataFinal] = useState("");
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

  const [comissoes, setComissoes] =
    useState<RegistroComissao[]>([]);
  const [mensagemComissao, setMensagemComissao] =
    useState("");
  const [comissaoCompraDia20, setComissaoCompraDia20] = useState("");
  const [comissaoCltDia20, setComissaoCltDia20] = useState("");
  const [outrasPremiacoesDia20, setOutrasPremiacoesDia20] = useState("");
  const [ajusteDia20, setAjusteDia20] = useState("");
  const [dataPagamentoComissao, setDataPagamentoComissao] = useState(hoje());
  const [observacaoComissao, setObservacaoComissao] = useState("");

  const carregarPropostas = useCallback(async () => {
    setCarregandoPropostas(true);

    try {
      const { data: sessao, error: erroSessao } =
        await supabase.auth.getSession();

      if (erroSessao || !sessao.session?.access_token) {
        throw new Error(
          "Sua sessão expirou. Entre novamente no sistema."
        );
      }

      const resposta = await fetch("/api/propostas", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessao.session.access_token}`,
        },
        cache: "no-store",
      });

      const conteudo = (await resposta.json()) as {
        propostas?: Proposta[];
        erro?: string;
      };

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro ||
            "Não foi possível carregar as propostas pagas."
        );
      }

      setPropostas(
        Array.isArray(conteudo.propostas)
          ? conteudo.propostas
          : []
      );
    } catch (erro) {
      console.error(
        "Erro ao carregar propostas no Financeiro:",
        erro
      );
      setPropostas([]);
    } finally {
      setCarregandoPropostas(false);
    }
  }, [supabase]);

  useEffect(() => {
    void carregarPropostas();

    const atualizarAoFocar = () => {
      void carregarPropostas();
    };

    const atualizarAoVoltar = () => {
      if (document.visibilityState === "visible") {
        void carregarPropostas();
      }
    };

    window.addEventListener("focus", atualizarAoFocar);
    document.addEventListener(
      "visibilitychange",
      atualizarAoVoltar
    );

    void (async () => {
      try {
        const [
          respostaUsuarios,
          respostaFolhas,
          respostaComissoes,
          respostaLancamentos,
          respostaConfigFinanceiro,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(`
              id,
              nome,
              email,
              perfil,
              equipe,
              ativo
            `)
            .order("nome", {
              ascending: true,
            }),

          supabase
            .from("folha_pagamentos")
            .select("*")
            .order("competencia", {
              ascending: false,
            })
            .order("atualizado_em", {
              ascending: false,
            }),

          supabase
            .from("comissoes_pagamentos")
            .select("*")
            .order("competencia", {
              ascending: false,
            })
            .order("atualizado_em", {
              ascending: false,
            }),

          supabase
            .from("movimentos_financeiros")
            .select("*")
            .order("data", {
              ascending: false,
            })
            .order("criado_em", {
              ascending: false,
            }),

          supabase
            .from("config_financeiro_itens")
            .select("id, tipo, nome, ativo, ordem")
            .order("tipo", { ascending: true })
            .order("ordem", { ascending: true })
            .order("nome", { ascending: true }),
        ]);

        if (respostaUsuarios.error) {
          throw respostaUsuarios.error;
        }

        if (respostaFolhas.error) {
          throw respostaFolhas.error;
        }

        if (respostaComissoes.error) {
          throw respostaComissoes.error;
        }

        if (respostaLancamentos.error) {
          throw respostaLancamentos.error;
        }

        if (respostaConfigFinanceiro.error) {
          throw respostaConfigFinanceiro.error;
        }

        const listaUsuarios: UsuarioFinanceiro[] =
          (
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
          }));

        const usuariosAtivos =
          listaUsuarios.filter(
            (usuario) =>
              usuario.ativo !== false
          );

        setUsuarios(usuariosAtivos);

        if (usuariosAtivos.length) {
          setUsuarioFolhaId((atual) =>
            atual || usuariosAtivos[0].id
          );
        }

        const mapaUsuarios = new Map(
          listaUsuarios.map((usuario) => [
            usuario.id,
            usuario,
          ])
        );

        const listaFolhas: RegistroFolha[] =
          (
            Array.isArray(respostaFolhas.data)
              ? respostaFolhas.data
              : []
          ).map((registro) => {
            const usuario = mapaUsuarios.get(
              String(registro.usuario_id || "")
            );

            return {
              id: String(registro.id),
              usuarioId: String(
                registro.usuario_id || ""
              ),
              nome: usuario?.nome || "Colaboradora",
              matricula: usuario?.matricula || "",
              competencia: String(
                registro.competencia || ""
              ),
              salario: Number(registro.salario || 0),
              premioVendas: Number(
                registro.premio_vendas || 0
              ),
              assiduidadeAtiva: Boolean(
                registro.assiduidade_ativa
              ),
              valorAssiduidade: Number(
                registro.valor_assiduidade || 0
              ),
              descontoInss: Number(
                registro.desconto_inss || 0
              ),
              descontoVale: Number(
                registro.desconto_vale || 0
              ),
              descontoFaltas: Number(
                registro.desconto_faltas || 0
              ),
              totalBrutoDia05: Number(
                registro.total_bruto_dia05 || 0
              ),
              totalDescontosDia05: Number(
                registro.total_descontos_dia05 || 0
              ),
              totalDia05: Number(
                registro.total_dia05 || 0
              ),
              totalDia20: Number(
                registro.total_dia20 || 0
              ),
              totalMensal: Number(
                registro.total_mensal || 0
              ),
              atualizadoEm: String(
                registro.atualizado_em || ""
              ),
            };
          });

        setFolhas(listaFolhas);

        const listaComissoes: RegistroComissao[] =
          (Array.isArray(respostaComissoes.data)
            ? respostaComissoes.data
            : []
          ).map((registro) => {
            const usuario = mapaUsuarios.get(
              String(registro.usuario_id || "")
            );

            return {
              id: String(registro.id),
              usuarioId: String(registro.usuario_id || ""),
              nome: usuario?.nome || "Colaboradora",
              competencia: String(registro.competencia || ""),
              comissaoCompraDivida: Number(
                registro.comissao_compra_divida || 0
              ),
              comissaoClt: Number(registro.comissao_clt || 0),
              outrasPremiacoes: Number(
                registro.outras_premiacoes || 0
              ),
              ajusteManual: Number(registro.ajuste_manual || 0),
              totalComissao: Number(registro.total_comissao || 0),
              dataPagamento: String(registro.data_pagamento || ""),
              observacao: String(registro.observacao || ""),
              atualizadoEm: String(registro.atualizado_em || ""),
            };
          });

        setComissoes(listaComissoes);

        const listaLancamentos: Lancamento[] =
          (
            Array.isArray(respostaLancamentos.data)
              ? respostaLancamentos.data
              : []
          ).map((registro) => ({
            id: String(registro.id),
            tipo:
              String(registro.tipo) === "Saída"
                ? "Saída"
                : "Entrada",
            produto: String(registro.produto || ""),
            banco: String(registro.banco || ""),
            categoria: String(registro.categoria || ""),
            descricao: String(registro.descricao || ""),
            valor: Number(registro.valor || 0),
            data: String(registro.data || ""),
          }));

        setLancamentos(listaLancamentos);

        setConfigFinanceiro(
          (
            Array.isArray(respostaConfigFinanceiro.data)
              ? respostaConfigFinanceiro.data
              : []
          ).map((item: any) => ({
            id: String(item.id),
            tipo: String(item.tipo) as TipoConfigFinanceiro,
            nome: String(item.nome || ""),
            ativo: item.ativo !== false,
            ordem: Number(item.ordem || 0),
          }))
        );
      } catch (erro) {
        console.error(
          "Erro ao carregar colaboradoras e folha:",
          erro
        );
        setUsuarios([]);
        setFolhas([]);
      }
    })();

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

    return () => {
      window.removeEventListener("focus", atualizarAoFocar);
      document.removeEventListener(
        "visibilitychange",
        atualizarAoVoltar
      );
    };
  }, [carregarPropostas]);



  const pagas = useMemo(
    () =>
      propostas.filter(
        (proposta) =>
          normalizarNome(proposta.status || "") === "pago" &&
          Boolean(proposta.dataPagamento)
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

  const premiacaoCompraSelecionada = useMemo(() => {
    if (!usuarioSelecionado || !competencia) return 0;

    const nomeUsuario = normalizarNome(
      usuarioSelecionado.nome
    );

    return pagas
      .filter((proposta) => {
        const mesmaConsultora =
          normalizarNome(proposta.vendedora || "") ===
          nomeUsuario;

        const mesmaCompetencia =
          String(proposta.dataPagamento || "").slice(0, 7) ===
          competencia;

        return mesmaConsultora && mesmaCompetencia;
      })
      .reduce(
        (total, proposta) =>
          total + Number(proposta.comissao || 0),
        0
      );
  }, [pagas, usuarioSelecionado, competencia]);
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

  // Registros antigos guardavam apenas o total do dia 20.
  // Mantemos esse total preservado como "Outras premiações" depois
  // de descontar a comissão automática da Compra de Dívida.
  const restanteDia20 =
    Number(registroExistente.premioVendas || 0) -
    premiacaoCompraSelecionada;

  setComissaoCltDia20("");
  setOutrasPremiacoesDia20(
    restanteDia20 > 0
      ? restanteDia20.toFixed(2).replace(".", ",")
      : ""
  );
  setAjusteDia20(
    restanteDia20 < 0
      ? restanteDia20.toFixed(2).replace(".", ",")
      : ""
  );
} else {
  setSalario("1.621,00");
  setAssiduidadeAtiva(false);
  setValorAssiduidade("");
  setDescontoInss("");
  setDescontoVale("");
  setDescontoFaltas("");
  setComissaoCltDia20("");
  setOutrasPremiacoesDia20("");
  setAjusteDia20("");
}


    setMensagemFolha("");
  }, [
    usuarioFolhaId,
    competencia,
    folhas,
    premiacaoCompraSelecionada,
  ]);

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

    const totalBrutoDia05 = valorSalario + assiduidade;
    const totalDescontosDia05 =
      valorInss + valorVale + valorFaltas;
    const totalDia05 = Math.max(
      totalBrutoDia05 - totalDescontosDia05,
      0
    );

    return {
      salario: valorSalario,
      premioVendas: 0,
      assiduidade,
      descontoInss: valorInss,
      descontoVale: valorVale,
      descontoFaltas: valorFaltas,
      totalBrutoDia05,
      totalDescontosDia05,
      totalDia05,
      totalDia20: 0,
      totalMensal: totalDia05,
    };
  }, [
    salario,
    assiduidadeAtiva,
    valorAssiduidade,
    descontoInss,
    descontoVale,
    descontoFaltas,
  ]);

  const calculoComissao = useMemo(() => {
    const comissaoCompraDivida = numero(comissaoCompraDia20);
    const comissaoClt = numero(comissaoCltDia20);
    const outrasPremiacoes = numero(outrasPremiacoesDia20);
    const ajusteManual = numero(ajusteDia20);

    const totalComissao = Math.max(
      comissaoCompraDivida +
        comissaoClt +
        outrasPremiacoes +
        ajusteManual,
      0
    );

    return {
      comissaoCompraDivida,
      comissaoClt,
      outrasPremiacoes,
      ajusteManual,
      totalComissao,
    };
  }, [
    comissaoCompraDia20,
    comissaoCltDia20,
    outrasPremiacoesDia20,
    ajusteDia20,
  ]);

  const comissoesOrdenadas = useMemo(
    () =>
      [...comissoes].sort((a, b) => {
        const comparacao = b.competencia.localeCompare(a.competencia);
        return comparacao !== 0
          ? comparacao
          : a.nome.localeCompare(b.nome);
      }),
    [comissoes]
  );


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

  const produtosDisponiveis = useMemo(() => {
    const lista = configFinanceiro
      .filter(
        (item) =>
          item.tipo === "produto" &&
          item.ativo
      )
      .sort(
        (a: ConfigFinanceiroItem, b: ConfigFinanceiroItem) =>
          a.ordem - b.ordem
      )
      .map((item: ConfigFinanceiroItem) => item.nome);

    return lista.length ? lista : PRODUTOS_PADRAO;
  }, [configFinanceiro]);

  const bancosDisponiveis = useMemo(() => {
    const lista = configFinanceiro
      .filter(
        (item) =>
          item.tipo === "banco" &&
          item.ativo
      )
      .sort(
        (a: ConfigFinanceiroItem, b: ConfigFinanceiroItem) =>
          a.ordem - b.ordem
      )
      .map((item: ConfigFinanceiroItem) => item.nome);

    return lista.length ? lista : BANCOS_PADRAO;
  }, [configFinanceiro]);

  const entradasDisponiveis = useMemo(() => {
    const lista = configFinanceiro
      .filter(
        (item) =>
          item.tipo === "categoria_entrada" &&
          item.ativo
      )
      .sort(
        (a: ConfigFinanceiroItem, b: ConfigFinanceiroItem) =>
          a.ordem - b.ordem
      )
      .map((item: ConfigFinanceiroItem) => item.nome);

    return lista.length ? lista : ENTRADAS_PADRAO;
  }, [configFinanceiro]);

  const saidasDisponiveis = useMemo(() => {
    const lista = configFinanceiro
      .filter(
        (item) =>
          item.tipo === "categoria_saida" &&
          item.ativo
      )
      .sort(
        (a: ConfigFinanceiroItem, b: ConfigFinanceiroItem) =>
          a.ordem - b.ordem
      )
      .map((item: ConfigFinanceiroItem) => item.nome);

    return lista.length ? lista : SAIDAS_PADRAO;
  }, [configFinanceiro]);

  useEffect(() => {
    if (!produtosDisponiveis.includes(produtoLancamento)) {
      setProdutoLancamento(produtosDisponiveis[0] || "");
    }
  }, [produtosDisponiveis, produtoLancamento]);

  useEffect(() => {
    if (!bancosDisponiveis.includes(bancoLancamento)) {
      setBancoLancamento(bancosDisponiveis[0] || "");
    }
  }, [bancosDisponiveis, bancoLancamento]);

  useEffect(() => {
    const categoriasAtuais =
      tipo === "Entrada"
        ? entradasDisponiveis
        : saidasDisponiveis;

    if (!categoriasAtuais.includes(categoria)) {
      setCategoria(categoriasAtuais[0] || "");
    }
  }, [
    tipo,
    categoria,
    entradasDisponiveis,
    saidasDisponiveis,
  ]);

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
            filtroProduto === "Todos" ||
            lancamento.produto === filtroProduto
        )
        .filter(
          (lancamento) =>
            filtroBanco === "Todos" ||
            lancamento.banco === filtroBanco
        )
        .filter(
          (lancamento) =>
            !filtroDataInicial ||
            lancamento.data >= filtroDataInicial
        )
        .filter(
          (lancamento) =>
            !filtroDataFinal ||
            lancamento.data <= filtroDataFinal
        )
        .filter(
          (lancamento) =>
            !busca.trim() ||
            `${lancamento.descricao} ${lancamento.categoria} ${lancamento.produto} ${lancamento.banco}`
              .toLowerCase()
              .includes(busca.toLowerCase())
        )
        .sort((a, b) =>
          b.data.localeCompare(a.data)
        ),
    [
      lancamentos,
      filtro,
      filtroProduto,
      filtroBanco,
      filtroDataInicial,
      filtroDataFinal,
      busca,
    ]
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

  async function salvarLancamento(
    evento: FormEvent
  ) {
    evento.preventDefault();
    setMensagem("");

    const valorConvertido = numero(valor);

    if (!descricao.trim()) {
      setMensagem("Informe a descrição.");
      return;
    }

    if (valorConvertido <= 0) {
      setMensagem("Informe um valor maior que zero.");
      return;
    }

    try {
      const { data: sessao } = await supabase.auth.getSession();

      const payload = {
        tipo,
        produto: produtoLancamento,
        banco: bancoLancamento,
        categoria,
        descricao: descricao.trim(),
        valor: valorConvertido,
        data,
        criado_por: sessao.session?.user.id || null,
        atualizado_em: new Date().toISOString(),
      };

      const { data: salvo, error } = await supabase
        .from("movimentos_financeiros")
        .insert(payload)
        .select("*")
        .single();

      if (error || !salvo) {
        throw new Error(
          error?.message ||
            "Não foi possível salvar o lançamento."
        );
      }

      const novo: Lancamento = {
        id: String(salvo.id),
        tipo:
          String(salvo.tipo) === "Saída"
            ? "Saída"
            : "Entrada",
        produto: String(salvo.produto || ""),
        banco: String(salvo.banco || ""),
        categoria: String(salvo.categoria || ""),
        descricao: String(salvo.descricao || ""),
        valor: Number(salvo.valor || 0),
        data: String(salvo.data || ""),
      };

      setLancamentos((atuais) => [novo, ...atuais]);

      setDescricao("");
      setValor("");
      setData(hoje());
      setMensagem("Lançamento salvo com sucesso.");
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar o lançamento."
      );
    }
  }

  async function salvarFolha(
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

    try {
      const payload = {
        usuario_id: usuarioSelecionado.id,
        competencia,
        salario: calculoFolha.salario,
        premio_vendas: calculoFolha.premioVendas,
        assiduidade_ativa: assiduidadeAtiva,
        valor_assiduidade: calculoFolha.assiduidade,
        desconto_inss: calculoFolha.descontoInss,
        desconto_vale: calculoFolha.descontoVale,
        desconto_faltas: calculoFolha.descontoFaltas,
        total_bruto_dia05: calculoFolha.totalBrutoDia05,
        total_descontos_dia05: calculoFolha.totalDescontosDia05,
        total_dia05: calculoFolha.totalDia05,
        total_dia20: calculoFolha.totalDia20,
        total_mensal: calculoFolha.totalMensal,
        atualizado_em: new Date().toISOString(),
      };

      const { data: registroExistenteBanco, error: erroConsulta } =
        await supabase
          .from("folha_pagamentos")
          .select("id")
          .eq("usuario_id", usuarioSelecionado.id)
          .eq("competencia", competencia)
          .maybeSingle();

      if (erroConsulta) {
        throw new Error(
          `Não foi possível verificar a folha existente: ${erroConsulta.message}`
        );
      }

      let registroSalvo: any = null;

      if (registroExistenteBanco?.id) {
        const { data: atualizado, error: erroAtualizacao } =
          await supabase
            .from("folha_pagamentos")
            .update(payload)
            .eq("id", registroExistenteBanco.id)
            .select("*")
            .single();

        if (erroAtualizacao) {
          throw new Error(
            `Não foi possível atualizar a folha: ${erroAtualizacao.message}`
          );
        }

        registroSalvo = atualizado;
      } else {
        const { data: inserido, error: erroInsercao } =
          await supabase
            .from("folha_pagamentos")
            .insert(payload)
            .select("*")
            .single();

        if (erroInsercao) {
          throw new Error(
            `Não foi possível salvar a folha: ${erroInsercao.message}`
          );
        }

        registroSalvo = inserido;
      }

      if (!registroSalvo) {
        throw new Error("Não foi possível salvar a folha.");
      }

      const novoRegistro: RegistroFolha = {
        id: String(registroSalvo.id),
        usuarioId: usuarioSelecionado.id,
        nome: usuarioSelecionado.nome,
        matricula: usuarioSelecionado.matricula || "",
        competencia: String(registroSalvo.competencia),
        salario: Number(registroSalvo.salario || 0),
        premioVendas: Number(registroSalvo.premio_vendas || 0),
        assiduidadeAtiva: Boolean(registroSalvo.assiduidade_ativa),
        valorAssiduidade: Number(registroSalvo.valor_assiduidade || 0),
        descontoInss: Number(registroSalvo.desconto_inss || 0),
        descontoVale: Number(registroSalvo.desconto_vale || 0),
        descontoFaltas: Number(registroSalvo.desconto_faltas || 0),
        totalBrutoDia05: Number(registroSalvo.total_bruto_dia05 || 0),
        totalDescontosDia05: Number(registroSalvo.total_descontos_dia05 || 0),
        totalDia05: Number(registroSalvo.total_dia05 || 0),
        totalDia20: Number(registroSalvo.total_dia20 || 0),
        totalMensal: Number(registroSalvo.total_mensal || 0),
        total: Number(registroSalvo.total_mensal || 0),
        atualizadoEm: String(registroSalvo.atualizado_em || ""),
      };

      setFolhas((atuais) => {
        const indice = atuais.findIndex(
          (registro) =>
            registro.usuarioId === novoRegistro.usuarioId &&
            registro.competencia === novoRegistro.competencia
        );

        if (indice === -1) {
          return [novoRegistro, ...atuais];
        }

        return atuais.map((registro, atual) =>
          atual === indice ? novoRegistro : registro
        );
      });

      setMensagemFolha(
        "Folha salva no sistema com sucesso."
      );
    } catch (erro) {
      console.error("Erro ao salvar folha:", erro);
      setMensagemFolha(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar a folha."
      );
    }
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

  async function excluirFolha(
    id: string
  ) {
    if (
      !window.confirm(
        "Deseja excluir este cálculo da folha?"
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("folha_pagamentos")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setFolhas((atuais) =>
        atuais.filter(
          (registro) => registro.id !== id
        )
      );

      setMensagemFolha(
        "Cálculo da folha excluído."
      );
    } catch (erro) {
      console.error("Erro ao excluir folha:", erro);
      setMensagemFolha(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir a folha."
      );
    }
  }

  async function salvarComissao(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();
    setMensagemComissao("");

    if (!usuarioSelecionado) {
      setMensagemComissao("Selecione uma colaboradora.");
      return;
    }

    if (!competencia) {
      setMensagemComissao("Selecione a competência.");
      return;
    }

    try {
      const payload = {
        usuario_id: usuarioSelecionado.id,
        competencia,
        comissao_compra_divida:
          calculoComissao.comissaoCompraDivida,
        comissao_clt: calculoComissao.comissaoClt,
        outras_premiacoes:
          calculoComissao.outrasPremiacoes,
        ajuste_manual: calculoComissao.ajusteManual,
        total_comissao: calculoComissao.totalComissao,
        data_pagamento: dataPagamentoComissao || null,
        observacao: observacaoComissao.trim() || null,
        atualizado_em: new Date().toISOString(),
      };

      const existente = comissoes.find(
        (item) =>
          item.usuarioId === usuarioSelecionado.id &&
          item.competencia === competencia
      );

      const consulta = existente
        ? supabase
            .from("comissoes_pagamentos")
            .update(payload)
            .eq("id", existente.id)
        : supabase
            .from("comissoes_pagamentos")
            .insert(payload);

      const { data: salvo, error } =
        await consulta.select("*").single();

      if (error || !salvo) {
        throw new Error(
          error?.message ||
            "Não foi possível salvar a comissão."
        );
      }

      const novo: RegistroComissao = {
        id: String(salvo.id),
        usuarioId: usuarioSelecionado.id,
        nome: usuarioSelecionado.nome,
        competencia: String(salvo.competencia || competencia),
        comissaoCompraDivida: Number(
          salvo.comissao_compra_divida || 0
        ),
        comissaoClt: Number(salvo.comissao_clt || 0),
        outrasPremiacoes: Number(
          salvo.outras_premiacoes || 0
        ),
        ajusteManual: Number(salvo.ajuste_manual || 0),
        totalComissao: Number(salvo.total_comissao || 0),
        dataPagamento: String(salvo.data_pagamento || ""),
        observacao: String(salvo.observacao || ""),
        atualizadoEm: String(salvo.atualizado_em || ""),
      };

      setComissoes((atuais) => [
        novo,
        ...atuais.filter((item) => item.id !== novo.id),
      ]);

      setMensagemComissao(
        "Comissão do dia 20 salva com sucesso."
      );
    } catch (erro) {
      console.error("Erro ao salvar comissão:", erro);
      setMensagemComissao(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar a comissão."
      );
    }
  }

  function editarComissao(registro: RegistroComissao) {
    setUsuarioFolhaId(registro.usuarioId);
    setCompetencia(registro.competencia);
    setComissaoCompraDia20(
      registro.comissaoCompraDivida.toFixed(2).replace(".", ",")
    );
    setComissaoCltDia20(
      registro.comissaoClt.toFixed(2).replace(".", ",")
    );
    setOutrasPremiacoesDia20(
      registro.outrasPremiacoes.toFixed(2).replace(".", ",")
    );
    setAjusteDia20(
      registro.ajusteManual.toFixed(2).replace(".", ",")
    );
    setDataPagamentoComissao(registro.dataPagamento || hoje());
    setObservacaoComissao(registro.observacao || "");
    setMensagemComissao("");
  }

  async function excluirComissao(id: string) {
    if (!window.confirm("Deseja excluir esta comissão?")) {
      return;
    }

    const { error } = await supabase
      .from("comissoes_pagamentos")
      .delete()
      .eq("id", id);

    if (error) {
      setMensagemComissao(
        `Não foi possível excluir a comissão: ${error.message}`
      );
      return;
    }

    setComissoes((atuais) =>
      atuais.filter((item) => item.id !== id)
    );
    setMensagemComissao("Comissão excluída.");
  }

  function mudarTipo(
    novoTipo: "Entrada" | "Saída"
  ) {
    setTipo(novoTipo);

    setCategoria(
      novoTipo === "Entrada"
        ? entradasDisponiveis[0] || ""
        : saidasDisponiveis[0] || ""
    );
  }

  async function excluirLancamento(id: string) {
    if (!window.confirm("Deseja excluir este lançamento?")) {
      return;
    }

    const { error } = await supabase
      .from("movimentos_financeiros")
      .delete()
      .eq("id", id);

    if (error) {
      setMensagem(
        `Não foi possível excluir o lançamento: ${error.message}`
      );
      return;
    }

    setLancamentos((atuais) =>
      atuais.filter((lancamento) => lancamento.id !== id)
    );
    setMensagem("Lançamento excluído.");
  }

  const categorias =
    tipo === "Entrada"
      ? entradasDisponiveis
      : saidasDisponiveis;

  return (
    <div className="finance-page">
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
              Produto

              <select
                value={produtoLancamento}
                onChange={(evento) =>
                  setProdutoLancamento(evento.target.value)
                }
              >
                {produtosDisponiveis.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              Banco

              <select
                value={bancoLancamento}
                onChange={(evento) =>
                  setBancoLancamento(evento.target.value)
                }
              >
                {bancosDisponiveis.map((item) => (
                  <option key={item}>{item}</option>
                ))}
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
                setBusca(evento.target.value)
              }
              placeholder="Pesquisar descrição ou categoria"
            />

            <select
              value={filtro}
              onChange={(evento) =>
                setFiltro(evento.target.value)
              }
            >
              <option>Todos</option>
              <option>Entrada</option>
              <option>Saída</option>
            </select>

            <select
              value={filtroProduto}
              onChange={(evento) =>
                setFiltroProduto(evento.target.value)
              }
            >
              <option>Todos</option>
              {produtosDisponiveis.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={filtroBanco}
              onChange={(evento) =>
                setFiltroBanco(evento.target.value)
              }
            >
              <option>Todos</option>
              {bancosDisponiveis.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <input
              type="date"
              value={filtroDataInicial}
              onChange={(evento) =>
                setFiltroDataInicial(evento.target.value)
              }
              title="Data inicial"
            />

            <input
              type="date"
              value={filtroDataFinal}
              onChange={(evento) =>
                setFiltroDataFinal(evento.target.value)
              }
              title="Data final"
            />
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
                      {lancamento.produto} •{" "}
                      {lancamento.banco || "Sem banco"} •{" "}
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
            <h2>Folha — pagamento do dia 05</h2>
          </div>
          <b>{folhas.length}</b>
        </div>

        <div className="payroll-layout">
          <form className="payroll-form" onSubmit={salvarFolha}>
            <div className="payroll-form-grid">
              <label>
                Competência
                <input
                  type="month"
                  value={competencia}
                  onChange={(evento) =>
                    setCompetencia(evento.target.value)
                  }
                />
              </label>

              <label>
                Colaboradora
                <select
                  value={usuarioFolhaId}
                  onChange={(evento) =>
                    setUsuarioFolhaId(evento.target.value)
                  }
                >
                  {!usuarios.length && (
                    <option value="">Nenhuma usuária cadastrada</option>
                  )}
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Salário
                <input
                  value={salario}
                  onChange={(evento) => setSalario(evento.target.value)}
                  placeholder="Ex.: 1.621,00"
                  inputMode="decimal"
                />
              </label>

              <label>
                Desconto do INSS
                <input
                  value={descontoInss}
                  onChange={(evento) =>
                    setDescontoInss(evento.target.value)
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
                    setDescontoVale(evento.target.value)
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
                    setDescontoFaltas(evento.target.value)
                  }
                  placeholder="Ex.: 80,00"
                  inputMode="decimal"
                />
              </label>
            </div>

            <div className={`attendance-box ${assiduidadeAtiva ? "selected" : ""}`}>
              <label className="attendance-switch">
                <input
                  type="checkbox"
                  checked={assiduidadeAtiva}
                  onChange={(evento) =>
                    setAssiduidadeAtiva(evento.target.checked)
                  }
                />
                <span>Recebe prêmio de assiduidade</span>
              </label>

              <label>
                Valor da assiduidade
                <input
                  value={valorAssiduidade}
                  onChange={(evento) =>
                    setValorAssiduidade(evento.target.value)
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
                <strong>{moeda(calculoFolha.salario)}</strong>
              </div>
              <div>
                <span>Assiduidade — dia 05</span>
                <strong>{moeda(calculoFolha.assiduidade)}</strong>
              </div>
              <div className="payroll-deduction">
                <span>Descontos do dia 05</span>
                <strong>− {moeda(calculoFolha.totalDescontosDia05)}</strong>
              </div>
              <div className="payroll-grand-total">
                <span>PAGAMENTO LÍQUIDO — DIA 05</span>
                <strong>{moeda(calculoFolha.totalDia05)}</strong>
              </div>
            </div>

            {mensagemFolha && (
              <div className="finance-message">{mensagemFolha}</div>
            )}

            <div className="finance-actions">
              <button type="submit" disabled={!usuarios.length}>
                Salvar folha do dia 05
              </button>
            </div>
          </form>

          <div className="payroll-history">
            <div className="payroll-history-title">
              <strong>Histórico da folha — dia 05</strong>
              <span>{folhasOrdenadas.length} registros</span>
            </div>

            {!folhasOrdenadas.length ? (
              <div className="finance-empty">
                <strong>Nenhuma folha salva</strong>
              </div>
            ) : (
              <div className="payroll-list">
                {folhasOrdenadas.map((registro) => (
                  <article key={registro.id}>
                    <div className="payroll-person">
                      <div className="payroll-avatar">
                        {registro.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{registro.nome}</strong>
                        <span>{formatarCompetencia(registro.competencia)}</span>
                      </div>
                    </div>

                    <div className="payroll-values">
                      <span>Salário: <strong>{moeda(registro.salario)}</strong></span>
                      <span>Assiduidade: <strong>{registro.assiduidadeAtiva ? moeda(registro.valorAssiduidade) : "Não recebe"}</strong></span>
                      <span>INSS: <strong>− {moeda(registro.descontoInss)}</strong></span>
                      <span>Vale: <strong>− {moeda(registro.descontoVale)}</strong></span>
                      <span>Faltas: <strong>− {moeda(registro.descontoFaltas)}</strong></span>
                    </div>

                    <div className="payroll-item-total">
                      <span>Pagamento dia 05</span>
                      <strong>{moeda(registro.totalDia05)}</strong>
                      <div>
                        <button type="button" onClick={() => editarFolha(registro)}>Editar</button>
                        <button type="button" className="delete" onClick={() => excluirFolha(registro.id)}>Excluir</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="finance-card payroll-card commission-day20-card">
        <div className="finance-list-heading">
          <div>
            <span>COMISSÕES</span>
            <h2>Pagamento do dia 20</h2>
          </div>
          <b>{comissoes.length}</b>
        </div>

        <div className="payroll-layout">
          <form className="payroll-form" onSubmit={salvarComissao}>
            <div className="payroll-form-grid">
              <label>
                Competência
                <input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
              </label>

              <label>
                Colaboradora
                <select value={usuarioFolhaId} onChange={(e) => setUsuarioFolhaId(e.target.value)}>
                  {!usuarios.length && <option value="">Nenhuma usuária cadastrada</option>}
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </label>

              <label>
                Comissão Compra de Dívida
                <input
                  value={comissaoCompraDia20}
                  onChange={(e) => setComissaoCompraDia20(e.target.value)}
                  placeholder="Ex.: 1.250,00"
                  inputMode="decimal"
                />
                <small>Informe manualmente o valor da comissão do dia 20</small>
              </label>

              <label>
                Comissão CLT
                <input value={comissaoCltDia20} onChange={(e) => setComissaoCltDia20(e.target.value)} placeholder="Ex.: 850,00" inputMode="decimal" />
              </label>

              <label>
                Outras premiações
                <input value={outrasPremiacoesDia20} onChange={(e) => setOutrasPremiacoesDia20(e.target.value)} placeholder="Ex.: 200,00" inputMode="decimal" />
              </label>

              <label>
                Ajuste manual (+ ou −)
                <input value={ajusteDia20} onChange={(e) => setAjusteDia20(e.target.value)} placeholder="Ex.: 70,00 ou -70,00" inputMode="decimal" />
              </label>

              <label>
                Data do pagamento
                <input type="date" value={dataPagamentoComissao} onChange={(e) => setDataPagamentoComissao(e.target.value)} />
              </label>

              <label>
                Observação
                <input value={observacaoComissao} onChange={(e) => setObservacaoComissao(e.target.value)} placeholder="Opcional" />
              </label>
            </div>

            <div className="payroll-total">
              <div><span>Compra de Dívida</span><strong>{moeda(calculoComissao.comissaoCompraDivida)}</strong></div>
              <div><span>CLT</span><strong>{moeda(calculoComissao.comissaoClt)}</strong></div>
              <div><span>Outras premiações</span><strong>{moeda(calculoComissao.outrasPremiacoes)}</strong></div>
              <div><span>Ajuste</span><strong>{moeda(calculoComissao.ajusteManual)}</strong></div>
              <div className="payroll-grand-total"><span>TOTAL DA COMISSÃO — DIA 20</span><strong>{moeda(calculoComissao.totalComissao)}</strong></div>
            </div>

            {mensagemComissao && <div className="finance-message">{mensagemComissao}</div>}

            <div className="finance-actions">
              <button type="submit" disabled={!usuarios.length}>Salvar comissão do dia 20</button>
            </div>
          </form>

          <div className="payroll-history">
            <div className="payroll-history-title">
              <strong>Histórico de comissões — dia 20</strong>
              <span>{comissoesOrdenadas.length} registros</span>
            </div>

            {!comissoesOrdenadas.length ? (
              <div className="finance-empty"><strong>Nenhuma comissão salva</strong></div>
            ) : (
              <div className="payroll-list">
                {comissoesOrdenadas.map((r) => (
                  <article key={r.id}>
                    <div className="payroll-person">
                      <div className="payroll-avatar">{r.nome.charAt(0).toUpperCase()}</div>
                      <div><strong>{r.nome}</strong><span>{formatarCompetencia(r.competencia)}</span></div>
                    </div>
                    <div className="payroll-values">
                      <span>Compra de Dívida: <strong>{moeda(r.comissaoCompraDivida)}</strong></span>
                      <span>CLT: <strong>{moeda(r.comissaoClt)}</strong></span>
                      <span>Outras: <strong>{moeda(r.outrasPremiacoes)}</strong></span>
                      <span>Ajuste: <strong>{moeda(r.ajusteManual)}</strong></span>
                      <span>Pagamento: <strong>{r.dataPagamento || "—"}</strong></span>
                    </div>
                    <div className="payroll-item-total">
                      <span>Total dia 20</span>
                      <strong>{moeda(r.totalComissao)}</strong>
                      <div>
                        <button type="button" onClick={() => editarComissao(r)}>Editar</button>
                        <button type="button" className="delete" onClick={() => excluirComissao(r.id)}>Excluir</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
