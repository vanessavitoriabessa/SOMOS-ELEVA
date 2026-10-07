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
  const [simplesParcelas, setSimplesParcelas] = useState<any[]>([]);
  const [inss, setInss] = useState<any[]>([]);
  const [parcelasInss, setParcelasInss] = useState<any[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]);

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
      respostaSimplesParcelas,
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
        .from("simples_parcelas")
        .select("id,valor,vencimento,status"),

      sb
        .from("controle_inss_fgts")
        .select("id,tipo,competencia,valor"),

      sb
        .from("inss_parcelas")
        .select("id,valor,vencimento,status"),

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
      respostaSimplesParcelas,
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
    setSimplesParcelas(respostaSimplesParcelas.data || []);
    setInss(respostaInss.data || []);
    setParcelasInss(respostaParcelasInss.data || []);
    setOperadores(respostaOperadores.data || []);
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

    // Folha no Custo por Operador:
    // usa o mesmo mês selecionado em Data Referência e soma apenas folhas pagas,
    // considerando o valor bruto: Salário + Assiduidade.
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

      Data Referência Outubro/2026:
      - soma o imposto mensal do Simples da competência Setembro/2026;
      - soma as parcelas do Simples com vencimento em Outubro/2026.

      Não existe valor fixo: se você alterar o valor da parcela para R$ 0,78,
      o Custo por Operador muda automaticamente ao atualizar/recarregar.
    */
    const competenciaSimples = mesAnterior(competencia);

    const impostoSimplesMensal = simples
      .filter(
        (item) =>
          String(item.competencia || "").slice(0, 7) === competenciaSimples
      )
      .reduce((soma, item) => soma + Number(item.valor_imposto || 0), 0);

    const parcelamentoSimplesMensal = simplesParcelas
      .filter(
        (item) =>
          String(item.vencimento || "").slice(0, 7) === competencia
      )
      .reduce((soma, item) => soma + Number(item.valor || 0), 0);

    const si = impostoSimplesMensal + parcelamentoSimplesMensal;

    /*
      REGRA DO INSS E FGTS NO CUSTO POR OPERADOR

      Data Referência Outubro/2026:
      - soma FGTS + INSS da competência Setembro/2026;
      - soma Parcelamento 1 + Parcelamento 2 com vencimento em Outubro/2026.

      Não existe valor fixo: se você alterar o valor das parcelas, o resultado muda automaticamente.
      Quando as parcelas terminarem, elas deixam de entrar automaticamente,
      pois o cálculo olha apenas as parcelas existentes com vencimento na data referência.
    */
    const competenciaEncargos = mesAnterior(competencia);

    const impostosCompetencia = inss
      .filter(
        (item) =>
          String(item.competencia || "").slice(0, 7) === competenciaEncargos
      )
      .reduce((soma, item) => soma + Number(item.valor || 0), 0);

    const parcelamentosCompetencia = parcelasInss
      .filter(
        (item) =>
          String(item.vencimento || "").slice(0, 7) === competencia
      )
      .reduce((soma, item) => soma + Number(item.valor || 0), 0);

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
    simplesParcelas,
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
    </div>
  );
}
