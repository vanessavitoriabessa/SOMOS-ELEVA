"use client";

import { useEffect, useMemo, useState } from "react";
import "./ranking.css";

type Periodo = "Hoje" | "Semana" | "Mês" | "Todos";

type PropostaCompraDivida = {
  id: string;
  cliente: string;
  vendedora: string;
  tabela: string;
  valorContrato: number;
  valorMeta?: number;
  percentualTabela?: number;
  status: string;
  dataCadastro: string;
  dataPagamento: string;
};

type RegistroClt = {
  id: string;
  nome: string;
  consultora: string;
  parcela: number;
  status: string;
  criadoEm: string;
  atualizadoEm: string;
  dataPagamento?: string;
};

type FaixaPremiacao = {
  meta: number;
  percentualCompra: number;
  premiacaoClt: number;
  nome: string;
};

type RankingItem = {
  nome: string;
  contratosCompra: number;
  contratosClt: number;
  contratosTotal: number;
  producaoCompra: number;
  producaoClt: number;
  producaoTotal: number;
  metaAtivada: boolean;
  faixa: FaixaPremiacao | null;
  premiacaoCompra: number;
  premiacaoClt: number;
  premiacaoTotal: number;
};

const META_MINIMA = 30000;

const TABELAS_COMPRA_DIVIDA = [
  { nome: "NEO NORMAL", percentual: 100 },
  { nome: "NEO FLEX 1", percentual: 82 },
  { nome: "NEO FLEX 2", percentual: 67 },
  { nome: "NEO FLEX 4", percentual: 37 },
  { nome: "NEO FLEX 5", percentual: 17 },
];

/*
 * A produção total (Compra de Dívida + CLT) ativa a faixa.
 *
 * Depois:
 * - Compra de Dívida: percentual da faixa × produção válida da Compra.
 * - CLT: valor fixo da faixa, desde que exista produção CLT.
 * - Premiação total: soma das duas premiações.
 */
const FAIXAS_PREMIACAO: FaixaPremiacao[] = [
  {
    meta: 30000,
    percentualCompra: 1.5,
    premiacaoClt: 300,
    nome: "Faixa 1",
  },
  {
    meta: 40000,
    percentualCompra: 2,
    premiacaoClt: 400,
    nome: "Faixa 2",
  },
  {
    meta: 50000,
    percentualCompra: 2.05,
    premiacaoClt: 600,
    nome: "Faixa 3",
  },
  {
    meta: 60000,
    percentualCompra: 2.1,
    premiacaoClt: 800,
    nome: "Faixa 4",
  },
  {
    meta: 70000,
    percentualCompra: 2.3,
    premiacaoClt: 2000,
    nome: "Faixa 5",
  },
  {
    meta: 80000,
    percentualCompra: 2.5,
    premiacaoClt: 2500,
    nome: "Faixa 6",
  },
  {
    meta: 90000,
    percentualCompra: 2.7,
    premiacaoClt: 2700,
    nome: "Faixa 7",
  },
  {
    meta: 100000,
    percentualCompra: 3,
    premiacaoClt: 3500,
    nome: "Faixa 8",
  },
  {
    meta: 110000,
    percentualCompra: 3,
    premiacaoClt: 3200,
    nome: "Faixa 8",
  },
  {
    meta: 120000,
    percentualCompra: 3.05,
    premiacaoClt: 3400,
    nome: "Faixa 9",
  },
  {
    meta: 130000,
    percentualCompra: 3.05,
    premiacaoClt: 3600,
    nome: "Faixa 9",
  },
  {
    meta: 140000,
    percentualCompra: 3.1,
    premiacaoClt: 3800,
    nome: "Faixa 10",
  },
  {
    meta: 150000,
    percentualCompra: 3.1,
    premiacaoClt: 5000,
    nome: "Faixa 10",
  },
  {
    meta: 160000,
    percentualCompra: 3.15,
    premiacaoClt: 5000,
    nome: "Faixa 11",
  },
  {
    meta: 180000,
    percentualCompra: 3.2,
    premiacaoClt: 5000,
    nome: "Faixa 12",
  },
  {
    meta: 200000,
    percentualCompra: 3.25,
    premiacaoClt: 5000,
    nome: "Faixa 13",
  },
  {
    meta: 220000,
    percentualCompra: 3.3,
    premiacaoClt: 5000,
    nome: "Faixa 14",
  },
  {
    meta: 240000,
    percentualCompra: 3.35,
    premiacaoClt: 5000,
    nome: "Faixa 15",
  },
  {
    meta: 260000,
    percentualCompra: 3.4,
    premiacaoClt: 5000,
    nome: "Faixa 16",
  },
  {
    meta: 280000,
    percentualCompra: 3.45,
    premiacaoClt: 5000,
    nome: "Faixa 17",
  },
  {
    meta: 300000,
    percentualCompra: 3.5,
    premiacaoClt: 5000,
    nome: "Faixa 18",
  },
  {
    meta: 320000,
    percentualCompra: 3.55,
    premiacaoClt: 5000,
    nome: "Faixa 19",
  },
  {
    meta: 340000,
    percentualCompra: 3.6,
    premiacaoClt: 5000,
    nome: "Faixa 20",
  },
  {
    meta: 360000,
    percentualCompra: 3.65,
    premiacaoClt: 5000,
    nome: "Faixa 21",
  },
  {
    meta: 380000,
    percentualCompra: 3.7,
    premiacaoClt: 5000,
    nome: "Faixa 22",
  },
  {
    meta: 400000,
    percentualCompra: 3.75,
    premiacaoClt: 5000,
    nome: "Faixa 23",
  },
  {
    meta: 420000,
    percentualCompra: 3.8,
    premiacaoClt: 5000,
    nome: "Faixa 24",
  },
  {
    meta: 440000,
    percentualCompra: 3.85,
    premiacaoClt: 5000,
    nome: "Faixa 25",
  },
  {
    meta: 460000,
    percentualCompra: 3.9,
    premiacaoClt: 5000,
    nome: "Faixa 26",
  },
  {
    meta: 480000,
    percentualCompra: 3.95,
    premiacaoClt: 5000,
    nome: "Faixa 27",
  },
  {
    meta: 500000,
    percentualCompra: 4,
    premiacaoClt: 5000,
    nome: "Faixa 28",
  },
];

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarPercentual(valor: number) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function inicioDoDia(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function inicioDaSemana(data: Date) {
  const atual = inicioDoDia(data);
  const dia = atual.getDay();
  const diferenca = dia === 0 ? -6 : 1 - dia;

  atual.setDate(atual.getDate() + diferenca);
  return atual;
}

function inicioDoMes(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function converterData(valor: string) {
  if (!valor) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
  }

  const parteData = valor.split(",")[0].trim();
  const partes = parteData.split("/").map(Number);

  if (partes.length === 3 && partes.every(Number.isFinite)) {
    return new Date(partes[2], partes[1] - 1, partes[0]);
  }

  return null;
}

function mesmaCompetencia(data: Date, referencia: Date) {
  return (
    data.getFullYear() === referencia.getFullYear() &&
    data.getMonth() === referencia.getMonth()
  );
}

function estaNoPeriodo(
  data: Date | null,
  periodo: Periodo,
  usarCompetenciaMensal = false
) {
  if (periodo === "Todos") return true;
  if (!data) return false;

  const hoje = new Date();
  const alvo = inicioDoDia(data);

  if (periodo === "Hoje") {
    return alvo.getTime() === inicioDoDia(hoje).getTime();
  }

  if (periodo === "Semana") {
    return alvo >= inicioDaSemana(hoje);
  }

  if (periodo === "Mês") {
    if (usarCompetenciaMensal) {
      return mesmaCompetencia(alvo, hoje);
    }

    return alvo >= inicioDoMes(hoje);
  }

  return true;
}

function tabelaPeloNome(nome: string) {
  const nomeNormalizado = normalizarTexto(nome);

  return TABELAS_COMPRA_DIVIDA.find((item) => {
    const tabelaNormalizada = normalizarTexto(item.nome);

    return (
      nomeNormalizado === tabelaNormalizada ||
      nomeNormalizado.startsWith(tabelaNormalizada)
    );
  });
}

function percentualDaTabela(proposta: PropostaCompraDivida) {
  const tabela = tabelaPeloNome(proposta.tabela);

  if (tabela) {
    return tabela.percentual;
  }

  const percentualNoNome = String(proposta.tabela || "").match(
    /(\d+(?:[.,]\d+)?)\s*%/
  );

  if (percentualNoNome) {
    const percentual = Number(
      percentualNoNome[1].replace(",", ".")
    );

    if (Number.isFinite(percentual)) {
      return percentual;
    }
  }

  const percentualSalvo = Number(proposta.percentualTabela || 0);

  const permitido = TABELAS_COMPRA_DIVIDA.some(
    (item) =>
      Math.abs(item.percentual - percentualSalvo) < 0.01
  );

  return permitido ? percentualSalvo : 0;
}

function valorValidoCompraDivida(proposta: PropostaCompraDivida) {
  const valorMetaSalvo = Number(proposta.valorMeta || 0);

  if (valorMetaSalvo > 0) {
    return valorMetaSalvo;
  }

  const valorContrato = Number(proposta.valorContrato || 0);
  const percentual = percentualDaTabela(proposta);

  return valorContrato * (percentual / 100);
}

function competenciaCompraDivida(proposta: PropostaCompraDivida) {
  const digitacao = converterData(proposta.dataCadastro);
  const pagamento = converterData(proposta.dataPagamento);

  if (!pagamento) return null;
  if (!digitacao) return inicioDoMes(pagamento);

  const limite = new Date(
    digitacao.getFullYear(),
    digitacao.getMonth() + 1,
    19,
    23,
    59,
    59
  );

  if (pagamento <= limite) {
    return inicioDoMes(digitacao);
  }

  return inicioDoMes(pagamento);
}

function dataClt(registro: RegistroClt) {
  return converterData(
    registro.dataPagamento ||
      registro.atualizadoEm ||
      registro.criadoEm
  );
}

function faixaDaProducao(producaoTotal: number) {
  if (producaoTotal < META_MINIMA) {
    return null;
  }

  const faixasAtingidas = FAIXAS_PREMIACAO.filter(
    (faixa) => producaoTotal >= faixa.meta
  );

  return faixasAtingidas.at(-1) || null;
}

export default function RankingManager() {
  const [propostas, setPropostas] =
    useState<PropostaCompraDivida[]>([]);

  const [registrosClt, setRegistrosClt] =
    useState<RegistroClt[]>([]);

  const [periodo, setPeriodo] =
    useState<Periodo>("Mês");

  const [busca, setBusca] = useState("");

  const [podeVerPremiacao, setPodeVerPremiacao] =
    useState(false);

  useEffect(() => {
    identificarPermissao();
    carregar();
  }, []);

  function identificarPermissao() {
    try {
      const cargoSalvo = String(
        localStorage.getItem("somos-eleva-cargo") || ""
      );

      const usuarioLogado = String(
        localStorage.getItem("somos-eleva-usuario") || ""
      );

      const usuariosSalvos = JSON.parse(
        localStorage.getItem("somos-eleva-usuarios") || "[]"
      );

      const usuarioAtual = Array.isArray(usuariosSalvos)
        ? usuariosSalvos.find(
            (usuario: Record<string, unknown>) =>
              String(usuario.id || "") === usuarioLogado ||
              String(usuario.email || "") === usuarioLogado ||
              String(usuario.matricula || "") === usuarioLogado ||
              String(usuario.nome || "") === usuarioLogado
          )
        : null;

      const perfilAtual = normalizarTexto(
        String(
          usuarioAtual?.perfil ||
            usuarioAtual?.cargo ||
            cargoSalvo
        )
      );

      setPodeVerPremiacao(
        perfilAtual.includes("administrador") ||
          perfilAtual.includes("administradora") ||
          perfilAtual === "admin"
      );
    } catch {
      setPodeVerPremiacao(false);
    }
  }

  function carregar() {
    try {
      const propostasSalvas = JSON.parse(
        localStorage.getItem("somos-eleva-propostas") || "[]"
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
      const cltSalvos = JSON.parse(
        localStorage.getItem("somos-eleva-clt") || "[]"
      );

      setRegistrosClt(
        Array.isArray(cltSalvos)
          ? cltSalvos
          : []
      );
    } catch {
      setRegistrosClt([]);
    }
  }

  const ranking = useMemo(() => {
    const agrupado = new Map<string, RankingItem>();

    propostas
      .filter((proposta) => proposta.status === "Pago")
      .forEach((proposta) => {
        const competencia = competenciaCompraDivida(proposta);
        const pagamento = converterData(proposta.dataPagamento);

        const entraNoPeriodo =
          periodo === "Mês"
            ? estaNoPeriodo(competencia, periodo, true)
            : estaNoPeriodo(pagamento, periodo);

        if (!entraNoPeriodo) return;

        const nome =
          proposta.vendedora?.trim() || "Sem consultora";

        const chave = normalizarTexto(nome);

        const atual = agrupado.get(chave) || {
          nome,
          contratosCompra: 0,
          contratosClt: 0,
          contratosTotal: 0,
          producaoCompra: 0,
          producaoClt: 0,
          producaoTotal: 0,
          metaAtivada: false,
          faixa: null,
          premiacaoCompra: 0,
          premiacaoClt: 0,
          premiacaoTotal: 0,
        };

        atual.contratosCompra += 1;
        atual.producaoCompra += valorValidoCompraDivida(proposta);

        agrupado.set(chave, atual);
      });

    registrosClt
      .filter((registro) => registro.status === "Pago")
      .forEach((registro) => {
        const data = dataClt(registro);

        if (!estaNoPeriodo(data, periodo)) return;

        const nome =
          registro.consultora?.trim() || "Sem consultora";

        const chave = normalizarTexto(nome);

        const atual = agrupado.get(chave) || {
          nome,
          contratosCompra: 0,
          contratosClt: 0,
          contratosTotal: 0,
          producaoCompra: 0,
          producaoClt: 0,
          producaoTotal: 0,
          metaAtivada: false,
          faixa: null,
          premiacaoCompra: 0,
          premiacaoClt: 0,
          premiacaoTotal: 0,
        };

        atual.contratosClt += 1;
        atual.producaoClt += Number(registro.parcela || 0);

        agrupado.set(chave, atual);
      });

    return Array.from(agrupado.values())
      .map((item) => {
        const contratosTotal =
          item.contratosCompra + item.contratosClt;

        const producaoTotal =
          item.producaoCompra + item.producaoClt;

        const faixa = faixaDaProducao(producaoTotal);

        const premiacaoCompra =
          faixa && item.producaoCompra > 0
            ? item.producaoCompra *
              (faixa.percentualCompra / 100)
            : 0;

        const premiacaoClt =
          faixa && item.producaoClt > 0
            ? faixa.premiacaoClt
            : 0;

        const premiacaoTotal =
          premiacaoCompra + premiacaoClt;

        return {
          ...item,
          contratosTotal,
          producaoTotal,
          metaAtivada: Boolean(faixa),
          faixa,
          premiacaoCompra,
          premiacaoClt,
          premiacaoTotal,
        };
      })
      .filter((item) =>
        item.nome
          .toLowerCase()
          .includes(busca.trim().toLowerCase())
      )
      .sort((a, b) => b.producaoTotal - a.producaoTotal);
  }, [propostas, registrosClt, periodo, busca]);

  const resumo = useMemo(() => {
    return {
      consultoras: ranking.length,
      contratos: ranking.reduce(
        (total, item) => total + item.contratosTotal,
        0
      ),
      compraDivida: ranking.reduce(
        (total, item) => total + item.producaoCompra,
        0
      ),
      clt: ranking.reduce(
        (total, item) => total + item.producaoClt,
        0
      ),
      total: ranking.reduce(
        (total, item) => total + item.producaoTotal,
        0
      ),
      premiacao: ranking.reduce(
        (total, item) => total + item.premiacaoTotal,
        0
      ),
    };
  }, [ranking]);

  const podium = ranking.slice(0, 3);
  const maiorValor = ranking[0]?.producaoTotal || 1;

  const colunasTabela = podeVerPremiacao
    ? "70px minmax(145px, 1.1fr) 75px 125px 100px 125px 100px 115px 115px minmax(130px, 1fr)"
    : "80px minmax(170px, 1.2fr) 90px 145px 125px 145px 120px minmax(145px, 1fr)";

  return (
    <div className="ranking-page">
      <section className="ranking-summary">
        <article>
          <span>Consultoras no ranking</span>
          <strong>{resumo.consultoras}</strong>
        </article>

        <article>
          <span>Contratos pagos</span>
          <strong>{resumo.contratos}</strong>
        </article>

        <article>
          <span>Compra de Dívida válida</span>
          <strong>{moeda(resumo.compraDivida)}</strong>
        </article>

        <article>
          <span>Parcelas CLT</span>
          <strong>{moeda(resumo.clt)}</strong>
        </article>

        <article className="ranking-summary-highlight">
          <span>Produção válida total</span>
          <strong>{moeda(resumo.total)}</strong>
        </article>

        {podeVerPremiacao && (
          <article className="ranking-summary-highlight">
            <span>Premiação total prevista</span>
            <strong>{moeda(resumo.premiacao)}</strong>
          </article>
        )}
      </section>

      <section className="ranking-toolbar">
        <div>
          <span>DESEMPENHO DA EQUIPE</span>
          <h2>Ranking de produção válida</h2>
          <p>
            A produção dos dois produtos ativa a faixa. A premiação da
            Compra de Dívida e a premiação do CLT são calculadas
            separadamente e depois somadas.
          </p>
        </div>

        <div className="ranking-filters">
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Pesquisar consultora"
          />

          <select
            value={periodo}
            onChange={(event) =>
              setPeriodo(event.target.value as Periodo)
            }
          >
            <option>Hoje</option>
            <option>Semana</option>
            <option>Mês</option>
            <option>Todos</option>
          </select>

          <button type="button" onClick={carregar}>
            Atualizar
          </button>
        </div>
      </section>

      {ranking.length === 0 ? (
        <section className="ranking-empty">
          <div>🏆</div>
          <strong>Nenhuma produção paga neste período</strong>
          <p>
            O ranking considera contratos pagos de Compra de Dívida e
            registros CLT com status Pago.
          </p>
        </section>
      ) : (
        <>
          <section className="ranking-podium">
            {podium.map((item, index) => (
              <article
                key={item.nome}
                className={`podium-card podium-${index + 1}`}
              >
                <div className="podium-position">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                </div>

                <div className="podium-avatar">
                  {iniciais(item.nome)}
                </div>

                <strong className="podium-name">
                  {item.nome}
                </strong>

                <span className="podium-label">
                  {index === 0
                    ? "1º lugar"
                    : index === 1
                      ? "2º lugar"
                      : "3º lugar"}
                </span>

                <div className="podium-value">
                  {moeda(item.producaoTotal)}
                </div>

                <div className="podium-details">
                  <div>
                    <span>Compra de Dívida</span>
                    <strong>{moeda(item.producaoCompra)}</strong>
                  </div>

                  <div>
                    <span>CLT</span>
                    <strong>{moeda(item.producaoClt)}</strong>
                  </div>
                </div>

                {podeVerPremiacao && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px",
                      borderRadius: 10,
                      background: "#f2f5ff",
                      color: "#263d9d",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    <div>
                      Compra: {moeda(item.premiacaoCompra)}
                    </div>
                    <div>
                      CLT: {moeda(item.premiacaoClt)}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      Total: {moeda(item.premiacaoTotal)}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 10px",
                    borderRadius: 9,
                    background: item.metaAtivada
                      ? "#e7f8ef"
                      : "#fff6e8",
                    color: item.metaAtivada
                      ? "#15804d"
                      : "#a66a12",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {item.metaAtivada
                    ? `${item.faixa?.nome} ativada`
                    : `Faltam ${moeda(
                        Math.max(
                          META_MINIMA - item.producaoTotal,
                          0
                        )
                      )}`}
                </div>
              </article>
            ))}
          </section>

          <section className="ranking-table-card">
            <div className="ranking-table-heading">
              <div>
                <span>CLASSIFICAÇÃO COMPLETA</span>
                <h3>Resultados por consultora</h3>
              </div>

              <b>{periodo}</b>
            </div>

            <div className="ranking-table">
              <div
                className="ranking-row ranking-head"
                style={{ gridTemplateColumns: colunasTabela }}
              >
                <span>Posição</span>
                <span>Consultora</span>
                <span>Contratos</span>
                <span>Compra</span>
                <span>CLT</span>
                <span>Produção total</span>
                <span>Faixa</span>

                {podeVerPremiacao && (
                  <>
                    <span>Prêmio Compra</span>
                    <span>Prêmio CLT</span>
                  </>
                )}

                <span>
                  {podeVerPremiacao
                    ? "Premiação total"
                    : "Desempenho"}
                </span>
              </div>

              {ranking.map((item, index) => {
                const progresso = Math.max(
                  4,
                  Math.round(
                    (item.producaoTotal / maiorValor) * 100
                  )
                );

                return (
                  <div
                    className="ranking-row"
                    key={item.nome}
                    style={{ gridTemplateColumns: colunasTabela }}
                  >
                    <span className="ranking-position">
                      {index + 1}º
                    </span>

                    <div className="ranking-person">
                      <div className="ranking-avatar">
                        {iniciais(item.nome)}
                      </div>
                      <strong>{item.nome}</strong>
                    </div>

                    <strong>{item.contratosTotal}</strong>
                    <strong>{moeda(item.producaoCompra)}</strong>
                    <span>{moeda(item.producaoClt)}</span>
                    <strong>{moeda(item.producaoTotal)}</strong>

                    <span
                      style={{
                        color: item.metaAtivada
                          ? "#16824d"
                          : "#a66a12",
                        fontWeight: 800,
                      }}
                    >
                      {item.faixa
                        ? `${item.faixa.nome} • ${formatarPercentual(
                            item.faixa.percentualCompra
                          )}`
                        : "Pendente"}
                    </span>

                    {podeVerPremiacao && (
                      <>
                        <span className="ranking-commission">
                          {moeda(item.premiacaoCompra)}
                        </span>

                        <span className="ranking-commission">
                          {moeda(item.premiacaoClt)}
                        </span>
                      </>
                    )}

                    {podeVerPremiacao ? (
                      <span className="ranking-commission">
                        {moeda(item.premiacaoTotal)}
                      </span>
                    ) : (
                      <div className="ranking-progress">
                        <div>
                          <i style={{ width: `${progresso}%` }} />
                        </div>
                        <b>{progresso}%</b>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section className="ranking-help">
        <strong>Exemplo:</strong>
        <span>
          R$ 20.000,00 válidos em Compra de Dívida + R$ 10.000,00 em
          parcelas CLT ativam a primeira faixa. A Compra gera R$ 300,00
          (1,50% de R$ 20.000,00), o CLT gera R$ 300,00 e a premiação
          total fica em R$ 600,00.
        </span>
      </section>
    </div>
  );
}
