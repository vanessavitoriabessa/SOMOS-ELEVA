"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { createClient } from "@/lib/supabase/client";

type Config = {
  id: number;
  chave: string;
  nome: string;
  ativo: boolean;
  ordem: number;
};

type Extra = {
  id: string;
  competencia: string;
  nome: string;
  valor: number;
  observacao?: string | null;
  ativo: boolean;
};

type Proposta = {
  id: string;
  cliente?: string;
  vendedora?: string;
  banco?: string;
  tabela?: string;
  valorContrato?: number;
  valorMeta?: number;
  percentualTabela?: number;
  comissao?: number;
  status?: string;
  dataCadastro?: string;
  dataPagamento?: string;
};

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const mesAtual = () => {
  const data = new Date();
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
};

const mesAnterior = (competencia: string) => {
  const [ano, mes] = competencia.split("-").map(Number);
  const data = new Date(ano, mes - 2, 1, 12);

  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
};

const nomeMes = (competencia: string) => {
  const [ano, mes] = competencia.split("-").map(Number);

  const texto = new Date(ano, mes - 1, 1, 12).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const moverMes = (competencia: string, deslocamento: number) => {
  const [ano, mes] = competencia.split("-").map(Number);
  const data = new Date(ano, mes - 1 + deslocamento, 1, 12);

  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
};

const normalizarTexto = (valor?: string | null) =>
  String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const nomesCorrespondem = (a?: string | null, b?: string | null) => {
  const nomeA = normalizarTexto(a);
  const nomeB = normalizarTexto(b);

  if (!nomeA || !nomeB) return false;
  if (nomeA === nomeB) return true;

  const menor = nomeA.length <= nomeB.length ? nomeA : nomeB;
  const maior = nomeA.length > nomeB.length ? nomeA : nomeB;

  return menor.length >= 5 && maior.includes(menor);
};

const competenciaDaData = (valor?: string | null) => {
  const texto = String(valor || "").trim();

  const iso = texto.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;

  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}`;

  return texto.slice(0, 7);
};

export default function CustoPorOperadorManager() {
  const sb = useMemo(() => createClient(), []);

  const [competencia, setCompetencia] = useState(mesAtual());
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");

  const [config, setConfig] = useState<Config[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);

  const [fixas, setFixas] = useState<any[]>([]);
  const [folhas, setFolhas] = useState<any[]>([]);
  const [premios, setPremios] = useState<any[]>([]);
  const [simples, setSimples] = useState<any[]>([]);
  const [inss, setInss] = useState<any[]>([]);
  const [parcelasInss, setParcelasInss] = useState<any[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [filtroLucroOperador, setFiltroLucroOperador] = useState("todos");
  const [detalheLucroOperador, setDetalheLucroOperador] = useState<null | {
    nome: string;
    propostas: Array<Proposta & { lucroCalculado: number }>;
    lucroBruto: number;
    lucroLiquido: number;
  }>(null);

  const [form, setForm] = useState(false);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");

  const carregar = useCallback(async () => {
    const [
      respostaConfig,
      respostaExtras,
      respostaFixas,
      respostaFolhas,
      respostaPremios,
      respostaSimples,
      respostaInss,
      respostaParcelasInss,
      respostaOperadores,
    ] = await Promise.all([
      sb
        .from("custo_operador_config")
        .select("id,chave,nome,ativo,ordem")
        .order("ordem"),

      sb
        .from("custo_operador_adicionais")
        .select("id,competencia,nome,valor,observacao,ativo")
        .order("criado_em", { ascending: false }),

      sb
        .from("despesas_recorrentes")
        .select("id,valor,inicio_competencia,fim_competencia,ativo")
        .eq("ativo", true),

      sb
        .from("folha_pagamentos")
        .select("id,competencia,salario,assiduidade_ativa,valor_assiduidade,pagamento_realizado,total_dia05,total_mensal,valor_pago"),

      sb
        .from("pontos_saques")
        .select("id,pontos_solicitados,valor_reais,status,processado_em")
        .eq("status", "PAGO"),

      sb
        .from("controle_simples_nacional")
        .select("id,competencia,valor_imposto,status"),

      sb
        .from("controle_inss_fgts")
        .select("id,tipo,competencia,valor"),

      sb
        .from("inss_parcelamentos")
        .select("valor_parcela,ativo")
        .eq("ativo", true),

      sb
        .from("profiles")
        .select("id,nome,perfil,ativo")
        .eq("ativo", true),
    ]);

    for (const resposta of [
      respostaConfig,
      respostaExtras,
      respostaFixas,
      respostaFolhas,
      respostaPremios,
      respostaSimples,
      respostaInss,
      respostaParcelasInss,
      respostaOperadores,
    ]) {
      if (resposta.error) {
        throw resposta.error;
      }
    }

    setConfig((respostaConfig.data || []) as Config[]);
    setExtras((respostaExtras.data || []) as Extra[]);
    setFixas(respostaFixas.data || []);
    setFolhas(respostaFolhas.data || []);
    setPremios(respostaPremios.data || []);
    setSimples(respostaSimples.data || []);
    setInss(respostaInss.data || []);
    setParcelasInss(respostaParcelasInss.data || []);
    setOperadores(respostaOperadores.data || []);

    try {
      const { data: sessao } = await sb.auth.getSession();

      if (sessao.session?.access_token) {
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

        setPropostas(Array.isArray(conteudo.propostas) ? conteudo.propostas : []);
      }
    } catch (erro) {
      console.error("Erro ao carregar propostas para lucro por operador:", erro);
      setPropostas([]);
    }
  }, [sb]);

  useEffect(() => {
    carregar().catch(console.error);
  }, [carregar]);

  const ativa = (chave: string) =>
    config.find((item) => item.chave === chave)?.ativo ?? true;

  const calc = useMemo(() => {
    const df = fixas
      .filter((item) => {
        const inicio = String(item.inicio_competencia || "0000-00").slice(0, 7);
        const fim = item.fim_competencia
          ? String(item.fim_competencia).slice(0, 7)
          : null;

        return inicio <= competencia && (!fim || fim >= competencia);
      })
      .reduce((soma, item) => soma + Number(item.valor || 0), 0);

    const fo = folhas
      .filter(
        (item) =>
          String(item.competencia || "").slice(0, 7) === competencia &&
          item.pagamento_realizado === true
      )
      .reduce(
        (soma, item) =>
          soma +
          Number(item.salario || 0) +
          Number(item.assiduidade_ativa ? item.valor_assiduidade || 0 : 0),
        0
      );

    const pr = premios
      .filter((item) => String(item.processado_em || "").slice(0, 7) === competencia)
      .reduce(
        (soma, item) =>
          soma + Number(item.valor_reais ?? item.pontos_solicitados ?? 0),
        0
      );

    /*
      REGRA DO SIMPLES NACIONAL NO CUSTO POR OPERADOR

      Competência selecionada Outubro/2026:
      - pega o imposto mensal do Simples de Setembro/2026;
      - soma R$ 370,00 do parcelamento mensal.

      Competência selecionada Novembro/2026:
      - pega o imposto mensal do Simples de Outubro/2026;
      - soma R$ 370,00 do parcelamento mensal.
    */
    const competenciaSimples = mesAnterior(competencia);

    const impostoSimplesMensal = simples
      .filter(
        (item) =>
          String(item.competencia || "").slice(0, 7) === competenciaSimples
      )
      .reduce((soma, item) => soma + Number(item.valor_imposto || 0), 0);

    const parcelamentoSimplesMensal = 370;

    const si = impostoSimplesMensal + parcelamentoSimplesMensal;

    const impostosCompetencia = inss
      .filter((item) => String(item.competencia || "").slice(0, 7) === competencia)
      .reduce((soma, item) => soma + Number(item.valor || 0), 0);

    const parcelamentosCompetencia = parcelasInss.reduce(
      (soma, item) => soma + Number(item.valor_parcela || 0),
      0
    );

    const inf = impostosCompetencia + parcelamentosCompetencia;

    const ex = extras.filter((item) => item.competencia === competencia);

    const ad = ex
      .filter((item) => item.ativo)
      .reduce((soma, item) => soma + Number(item.valor || 0), 0);

    const qtd = operadores.filter((item) => {
      const perfil = String(item.perfil || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      return perfil.includes("consultor") || perfil.includes("vendedor");
    }).length;

    const total =
      (ativa("despesas_fixas") ? df : 0) +
      (ativa("folha") ? fo : 0) +
      (ativa("premiacoes_pagas") ? pr : 0) +
      (ativa("simples_nacional") ? si : 0) +
      (ativa("inss_fgts") ? inf : 0) +
      ad;

    return {
      df,
      fo,
      pr,
      si,
      inf,
      ad,
      ex,
      qtd,
      total,
      unit: qtd ? total / qtd : 0,
    };
  }, [
    competencia,
    config,
    extras,
    fixas,
    folhas,
    premios,
    simples,
    inss,
    parcelasInss,
    operadores,
  ]);

  async function toggleConfig(item: Config) {
    const ativo = !item.ativo;

    const { error } = await sb
      .from("custo_operador_config")
      .update({ ativo })
      .eq("id", item.id);

    if (error) {
      alert("Não foi possível alterar a composição.");
      return;
    }

    setConfig((atuais) =>
      atuais.map((configItem) =>
        configItem.id === item.id ? { ...configItem, ativo } : configItem
      )
    );
  }

  async function adicionar() {
    const nomeLimpo = nome.trim();
    const valorNumerico = Number(valor.replace(/\./g, "").replace(",", "."));

    if (!nomeLimpo) {
      alert("Informe o nome do custo.");
      return;
    }

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    const { error } = await sb.from("custo_operador_adicionais").insert({
      competencia,
      nome: nomeLimpo,
      valor: valorNumerico,
      observacao: obs.trim() || null,
      ativo: true,
    });

    if (error) {
      alert("Não foi possível adicionar o custo.");
      return;
    }

    setNome("");
    setValor("");
    setObs("");
    setForm(false);
    await carregar();
  }

  async function toggleExtra(item: Extra) {
    const { error } = await sb
      .from("custo_operador_adicionais")
      .update({ ativo: !item.ativo })
      .eq("id", item.id);

    if (error) {
      alert("Não foi possível alterar o custo.");
      return;
    }

    await carregar();
  }

  async function excluir(item: Extra) {
    if (!confirm(`Excluir "${item.nome}"?`)) return;

    const { error } = await sb
      .from("custo_operador_adicionais")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Não foi possível excluir.");
      return;
    }

    await carregar();
  }

  const card: CSSProperties = {
    background: "#fff",
    border: "1px solid #dce5f2",
    borderRadius: 16,
    padding: 20,
  };

  const btn: CSSProperties = {
    height: 42,
    border: 0,
    borderRadius: 10,
    padding: "0 16px",
    background: "#155eef",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };

  const itens = [
    ["despesas_fixas", "Despesas Fixas", calc.df],
    ["folha", "Folha", calc.fo],
    ["premiacoes_pagas", "Premiações Pagas", calc.pr],
    ["simples_nacional", "Simples Nacional", calc.si],
    ["inss_fgts", "INSS e FGTS", calc.inf],
  ] as const;

  const operadoresElegiveis = useMemo(
    () =>
      operadores
        .filter((item) => {
          const perfil = normalizarTexto(item.perfil);

          return (
            item.ativo !== false &&
            (perfil.includes("consultor") || perfil.includes("vendedor"))
          );
        })
        .sort((a, b) =>
          String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
        ),
    [operadores]
  );

  const lucroPorOperador = useMemo(() => {
    const propostasPagas = propostas.filter(
      (proposta) =>
        normalizarTexto(proposta.status) === "pago" &&
        competenciaDaData(proposta.dataPagamento || proposta.dataCadastro) ===
          competencia
    );

    const lista = operadoresElegiveis.map((operador) => {
      const propostasOperador = propostasPagas
        .filter((proposta) => nomesCorrespondem(proposta.vendedora, operador.nome))
        .map((proposta) => ({
          ...proposta,
          lucroCalculado: Number(proposta.comissao || 0),
        }));

      const lucroBruto = propostasOperador.reduce(
        (soma, proposta) => soma + proposta.lucroCalculado,
        0
      );

      return {
        id: String(operador.id),
        nome: String(operador.nome || "Operador(a)"),
        lucroBruto,
        custoOperador: calc.unit,
        lucroLiquido: lucroBruto - calc.unit,
        propostas: propostasOperador,
      };
    });

    return lista.filter(
      (item) => filtroLucroOperador === "todos" || item.id === filtroLucroOperador
    );
  }, [propostas, operadoresElegiveis, competencia, calc.unit, filtroLucroOperador]);

  const resumoLucroOperador = useMemo(() => {
    const lucroBruto = lucroPorOperador.reduce(
      (soma, item) => soma + item.lucroBruto,
      0
    );
    const custoTotal = lucroPorOperador.reduce(
      (soma, item) => soma + item.custoOperador,
      0
    );

    return {
      lucroBruto,
      custoTotal,
      lucroLiquido: lucroBruto - custoTotal,
    };
  }, [lucroPorOperador]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          ...card,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span style={{ color: "#155eef", fontSize: 10, fontWeight: 900 }}>
            CENTRO FINANCEIRO
          </span>

          <h2 style={{ margin: "6px 0", color: "#102d57", fontSize: 25 }}>
            Custo por Operador(a)-PA
          </h2>

          <p style={{ margin: 0, color: "#73829a", fontSize: 12 }}>
            Gerencie a composição sem precisar alterar o código.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 6,
                fontSize: 10,
                fontWeight: 900,
                color: "#102d57",
              }}
            >
              DE
              <input
                type="date"
                value={dataDe}
                onChange={(evento) => setDataDe(evento.target.value)}
                style={{
                  height: 42,
                  width: 150,
                  border: "1px solid #ccd8ea",
                  borderRadius: 10,
                  padding: "0 12px",
                  color: "#102d57",
                  fontWeight: 800,
                  background: "#fff",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 6,
                fontSize: 10,
                fontWeight: 900,
                color: "#102d57",
              }}
            >
              ATÉ
              <input
                type="date"
                value={dataAte}
                onChange={(evento) => setDataAte(evento.target.value)}
                style={{
                  height: 42,
                  width: 150,
                  border: "1px solid #ccd8ea",
                  borderRadius: 10,
                  padding: "0 12px",
                  color: "#102d57",
                  fontWeight: 800,
                  background: "#fff",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 6,
                fontSize: 10,
                fontWeight: 900,
                color: "#102d57",
              }}
            >
              DATA REFERÊNCIA
              <input
                type="month"
                value={competencia}
                onChange={(evento) => setCompetencia(evento.target.value)}
                style={{
                  height: 42,
                  width: 190,
                  border: "1px solid #ccd8ea",
                  borderRadius: 10,
                  padding: "0 12px",
                  color: "#102d57",
                  fontWeight: 800,
                  background: "#fff",
                }}
              />
            </label>
          </div>

          <button type="button" onClick={() => void carregar()} style={btn}>
            ATUALIZAR
          </button>

          <button type="button" onClick={() => setForm((valor) => !valor)} style={btn}>
            + ADICIONAR CUSTO
          </button>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,minmax(0,1fr))",
          gap: 14,
        }}
      >
        {[
          ["CUSTO POR OPERADOR(A)-PA", moeda(calc.unit), nomeMes(competencia)],
          ["CUSTO TOTAL", moeda(calc.total), "Total incluído na composição"],
          [
            "OPERADORES(AS)",
            String(calc.qtd),
            "Consultores(as) / vendedores(as) ativos",
          ],
          ["CÁLCULO", moeda(calc.unit), `${moeda(calc.total)} ÷ ${calc.qtd}`],
        ].map(([titulo, valorCard, descricao]) => (
          <article key={titulo} style={{ ...card, minHeight: 105 }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: "#65758d" }}>
              {titulo}
            </span>

            <strong
              style={{
                display: "block",
                marginTop: 9,
                fontSize: 24,
                color: titulo === "CÁLCULO" ? "#079447" : "#102d57",
              }}
            >
              {valorCard}
            </strong>

            <small style={{ display: "block", marginTop: 7, color: "#8794a8" }}>
              {descricao}
            </small>
          </article>
        ))}
      </section>

      {form && (
        <section style={card}>
          <h3 style={{ margin: "0 0 14px", color: "#102d57" }}>
            Adicionar custo — {nomeMes(competencia)}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr .7fr 1.4fr auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 5,
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              NOME
              <input
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                placeholder="Ex.: aluguel extra"
                style={{
                  height: 40,
                  border: "1px solid #ccd8ea",
                  borderRadius: 9,
                  padding: "0 10px",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 5,
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              VALOR
              <input
                value={valor}
                onChange={(evento) => setValor(evento.target.value)}
                placeholder="0,00"
                style={{
                  height: 40,
                  border: "1px solid #ccd8ea",
                  borderRadius: 9,
                  padding: "0 10px",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 5,
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              OBSERVAÇÃO
              <input
                value={obs}
                onChange={(evento) => setObs(evento.target.value)}
                placeholder="Opcional"
                style={{
                  height: 40,
                  border: "1px solid #ccd8ea",
                  borderRadius: 9,
                  padding: "0 10px",
                }}
              />
            </label>

            <button type="button" onClick={() => void adicionar()} style={btn}>
              SALVAR
            </button>
          </div>
        </section>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.25fr) minmax(320px,.75fr)",
          gap: 14,
          alignItems: "start",
        }}
      >
        <article style={card}>
          <span style={{ color: "#155eef", fontSize: 10, fontWeight: 900 }}>
            COMPOSIÇÃO DO CUSTO
          </span>

          <h3 style={{ margin: "6px 0 4px", color: "#102d57" }}>
            O que está entrando na soma
          </h3>

          <p style={{ margin: "0 0 14px", color: "#8794a8", fontSize: 11 }}>
            Ative ou desative categorias automáticas diretamente aqui.
          </p>

          {itens.map(([chave, nomeItem, valorItem]) => {
            const cfg = config.find((item) => item.chave === chave);
            const ativo = cfg?.ativo ?? true;

            return (
              <div
                key={chave}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid #edf1f6",
                }}
              >
                <div>
                  <strong style={{ color: "#102d57", fontSize: 12 }}>
                    {nomeItem}
                  </strong>

                  <small
                    style={{
                      display: "block",
                      marginTop: 3,
                      color: ativo ? "#079447" : "#a0a9b7",
                    }}
                  >
                    {ativo ? "Incluído no cálculo" : "Fora do cálculo"}
                  </small>
                </div>

                <strong style={{ color: "#102d57" }}>
                  {moeda(Number(valorItem))}
                </strong>

                <button
                  type="button"
                  disabled={!cfg}
                  onClick={() => cfg && void toggleConfig(cfg)}
                  style={{
                    border: "1px solid #ccd8ea",
                    borderRadius: 9,
                    padding: "7px 10px",
                    background: ativo ? "#eef8f2" : "#f5f6f8",
                    cursor: cfg ? "pointer" : "default",
                    fontWeight: 800,
                  }}
                >
                  {ativo ? "ATIVO" : "INATIVO"}
                </button>
              </div>
            );
          })}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              paddingTop: 14,
            }}
          >
            <strong>Custos adicionais ativos</strong>
            <strong>{moeda(calc.ad)}</strong>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              paddingTop: 12,
              marginTop: 12,
              borderTop: "2px solid #e6ecf5",
            }}
          >
            <strong style={{ color: "#102d57" }}>CUSTO TOTAL</strong>
            <strong style={{ color: "#155eef", fontSize: 20 }}>
              {moeda(calc.total)}
            </strong>
          </div>
        </article>

        <article style={card}>
          <span style={{ color: "#155eef", fontSize: 10, fontWeight: 900 }}>
            CUSTOS ADICIONAIS
          </span>

          <h3 style={{ margin: "6px 0 4px", color: "#102d57" }}>
            {nomeMes(competencia)}
          </h3>

          <p style={{ margin: "0 0 14px", color: "#8794a8", fontSize: 11 }}>
            Itens cadastrados manualmente para esta competência.
          </p>

          {calc.ex.length === 0 ? (
            <div style={{ padding: "16px 0", color: "#8794a8", fontSize: 11 }}>
              Nenhum custo adicional cadastrado.
            </div>
          ) : (
            calc.ex.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid #edf1f6",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <strong style={{ color: "#102d57", fontSize: 12 }}>
                      {item.nome}
                    </strong>

                    {item.observacao && (
                      <small
                        style={{
                          display: "block",
                          marginTop: 3,
                          color: "#8794a8",
                        }}
                      >
                        {item.observacao}
                      </small>
                    )}
                  </div>

                  <strong style={{ color: item.ativo ? "#102d57" : "#a0a9b7" }}>
                    {moeda(item.valor)}
                  </strong>
                </div>

                <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => void toggleExtra(item)}
                    style={{
                      border: "1px solid #ccd8ea",
                      borderRadius: 8,
                      padding: "5px 8px",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {item.ativo ? "DESATIVAR" : "ATIVAR"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void excluir(item)}
                    style={{
                      border: "1px solid #f1caca",
                      borderRadius: 8,
                      padding: "5px 8px",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    EXCLUIR
                  </button>
                </div>
              </div>
            ))
          )}
        </article>
      </section>

      <section style={{ ...card, display: "grid", gap: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span style={{ color: "#155eef", fontSize: 10, fontWeight: 900 }}>
              RESULTADO POR OPERADOR
            </span>

            <h3 style={{ margin: "6px 0 4px", color: "#102d57", fontSize: 24 }}>
              Lucro por Operador
            </h3>

            <p style={{ margin: 0, color: "#8794a8", fontSize: 12 }}>
              Lucro gerado pelo operador menos o custo por operador da referência.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setCompetencia(moverMes(competencia, -1))}
              style={{ ...btn, background: "#fff", color: "#155eef", border: "1px solid #ccd8ea" }}
            >
              ◀
            </button>

            <label
              style={{
                display: "grid",
                gap: 6,
                fontSize: 10,
                fontWeight: 900,
                color: "#102d57",
              }}
            >
              DATA REFERÊNCIA
              <input
                type="month"
                value={competencia}
                onChange={(evento) => setCompetencia(evento.target.value)}
                style={{
                  height: 42,
                  width: 190,
                  border: "1px solid #ccd8ea",
                  borderRadius: 10,
                  padding: "0 12px",
                  color: "#102d57",
                  fontWeight: 800,
                  background: "#fff",
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => setCompetencia(moverMes(competencia, 1))}
              style={{ ...btn, background: "#fff", color: "#155eef", border: "1px solid #ccd8ea" }}
            >
              ▶
            </button>

            <label
              style={{
                display: "grid",
                gap: 6,
                fontSize: 10,
                fontWeight: 900,
                color: "#102d57",
              }}
            >
              OPERADOR(A)
              <select
                value={filtroLucroOperador}
                onChange={(evento) => setFiltroLucroOperador(evento.target.value)}
                style={{
                  height: 42,
                  minWidth: 230,
                  border: "1px solid #ccd8ea",
                  borderRadius: 10,
                  padding: "0 12px",
                  color: "#102d57",
                  fontWeight: 800,
                  background: "#fff",
                }}
              >
                <option value="todos">Todos os operadores</option>
                {operadoresElegiveis.map((operador) => (
                  <option key={operador.id} value={String(operador.id)}>
                    {operador.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: 12,
          }}
        >
          <article style={{ ...card, background: "#f8fbff" }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: "#65758d" }}>
              LUCRO GERADO
            </span>
            <strong style={{ display: "block", marginTop: 8, fontSize: 22, color: "#102d57" }}>
              {moeda(resumoLucroOperador.lucroBruto)}
            </strong>
            <small style={{ color: "#8794a8" }}>
              Soma das comissões/propostas pagas
            </small>
          </article>

          <article style={{ ...card, background: "#fff6cf", borderColor: "#ecd071" }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: "#111827" }}>
              CUSTO RATEADO
            </span>
            <strong style={{ display: "block", marginTop: 8, fontSize: 22, color: "#111827" }}>
              {moeda(resumoLucroOperador.custoTotal)}
            </strong>
            <small style={{ color: "#111827" }}>
              {lucroPorOperador.length} operador(es) × {moeda(calc.unit)}
            </small>
          </article>

          <article
            style={{
              ...card,
              background: resumoLucroOperador.lucroLiquido >= 0 ? "#eaf8ee" : "#fdeeee",
              borderColor: resumoLucroOperador.lucroLiquido >= 0 ? "#bfe8cc" : "#f2c7c7",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 900, color: "#111827" }}>
              LUCRO LÍQUIDO DOS OPERADORES
            </span>
            <strong style={{ display: "block", marginTop: 8, fontSize: 22, color: "#111827" }}>
              {moeda(resumoLucroOperador.lucroLiquido)}
            </strong>
            <small style={{ color: "#111827" }}>
              Lucro gerado − custo por operador
            </small>
          </article>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {lucroPorOperador.length === 0 ? (
            <div style={{ padding: 20, color: "#8794a8", fontSize: 12 }}>
              Nenhum operador encontrado para este filtro.
            </div>
          ) : (
            lucroPorOperador.map((item) => (
              <article
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(220px,1fr) repeat(3,minmax(130px,.7fr)) auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "14px 0",
                  borderBottom: "1px solid #edf1f6",
                }}
              >
                <div>
                  <strong style={{ color: "#102d57", fontSize: 13 }}>{item.nome}</strong>
                  <small style={{ display: "block", marginTop: 4, color: "#8794a8" }}>
                    {item.propostas.length} proposta(s) considerada(s)
                  </small>
                </div>

                <div>
                  <small style={{ display: "block", color: "#8794a8", fontSize: 10, fontWeight: 900 }}>
                    LUCRO
                  </small>
                  <strong style={{ color: "#102d57" }}>{moeda(item.lucroBruto)}</strong>
                </div>

                <div>
                  <small style={{ display: "block", color: "#8794a8", fontSize: 10, fontWeight: 900 }}>
                    CUSTO
                  </small>
                  <strong style={{ color: "#102d57" }}>{moeda(item.custoOperador)}</strong>
                </div>

                <div>
                  <small style={{ display: "block", color: "#8794a8", fontSize: 10, fontWeight: 900 }}>
                    RESULTADO
                  </small>
                  <strong style={{ color: item.lucroLiquido >= 0 ? "#079447" : "#d92d20" }}>
                    {moeda(item.lucroLiquido)}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setDetalheLucroOperador({
                      nome: item.nome,
                      propostas: item.propostas,
                      lucroBruto: item.lucroBruto,
                      lucroLiquido: item.lucroLiquido,
                    })
                  }
                  style={{
                    border: "1px solid #ccd8ea",
                    borderRadius: 9,
                    background: "#fff",
                    color: "#155eef",
                    padding: "8px 12px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Ver propostas
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      {detalheLucroOperador && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,35,65,.42)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "min(1050px,96vw)",
              maxHeight: "90vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 18,
              border: "1px solid #dce5f2",
              boxShadow: "0 24px 80px rgba(16,45,87,.25)",
            }}
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
                alignItems: "flex-start",
                padding: 22,
                borderBottom: "1px solid #edf1f6",
              }}
            >
              <div>
                <span style={{ color: "#155eef", fontSize: 10, fontWeight: 900 }}>
                  PROPOSTAS DO OPERADOR
                </span>
                <h3 style={{ margin: "6px 0", color: "#102d57", fontSize: 23 }}>
                  {detalheLucroOperador.nome}
                </h3>
                <p style={{ margin: 0, color: "#8794a8", fontSize: 12 }}>
                  {nomeMes(competencia)} · Lucro {moeda(detalheLucroOperador.lucroBruto)} · Resultado {moeda(detalheLucroOperador.lucroLiquido)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetalheLucroOperador(null)}
                style={{
                  border: 0,
                  borderRadius: 10,
                  background: "#f3f6fa",
                  width: 38,
                  height: 38,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </header>

            <div style={{ padding: 22 }}>
              {detalheLucroOperador.propostas.length === 0 ? (
                <div style={{ padding: 26, textAlign: "center", color: "#8794a8" }}>
                  Nenhuma proposta paga encontrada para este operador na data referência.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                    <thead>
                      <tr>
                        {["Cliente", "Banco", "Tabela", "Data pagamento", "Status", "Lucro"].map((coluna) => (
                          <th
                            key={coluna}
                            style={{
                              textAlign: "left",
                              padding: "11px 10px",
                              background: "#f4f7fb",
                              color: "#65758d",
                              fontSize: 10,
                              fontWeight: 900,
                              textTransform: "uppercase",
                              borderBottom: "1px solid #dce5f2",
                            }}
                          >
                            {coluna}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detalheLucroOperador.propostas.map((proposta) => (
                        <tr key={proposta.id}>
                          <td style={{ padding: "11px 10px", borderBottom: "1px solid #edf1f6" }}>
                            {proposta.cliente || "—"}
                          </td>
                          <td style={{ padding: "11px 10px", borderBottom: "1px solid #edf1f6" }}>
                            {proposta.banco || "—"}
                          </td>
                          <td style={{ padding: "11px 10px", borderBottom: "1px solid #edf1f6" }}>
                            {proposta.tabela || "—"}
                          </td>
                          <td style={{ padding: "11px 10px", borderBottom: "1px solid #edf1f6" }}>
                            {proposta.dataPagamento || proposta.dataCadastro || "—"}
                          </td>
                          <td style={{ padding: "11px 10px", borderBottom: "1px solid #edf1f6" }}>
                            {proposta.status || "—"}
                          </td>
                          <td style={{ padding: "11px 10px", borderBottom: "1px solid #edf1f6", fontWeight: 900 }}>
                            {moeda(proposta.lucroCalculado)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
