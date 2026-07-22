"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

import "./dashboard.css";

type PerfilAtual = {
  id?: string;
  nome?: string;
  perfil?: string;
};

type PropostaCompra = {
  id?: string;
  cliente?: string;
  cpf?: string;
  vendedora?: string;
  consultora?: string;
  tabela?: string;
  percentualTabela?: number;
  valorContrato?: number;
  valorMeta?: number;
  parcela?: number;
  status?: string;
  dataCadastro?: string;
  dataPagamento?: string;
};

type RegistroClt = {
  id?: string;
  nome?: string;
  cpf?: string;
  consultora?: string;
  valorAprovado?: number;
  parcela?: number;
  prazo?: number;
  status?: string;
  criadoEm?: string;
  atualizadoEm?: string;
  dataPagamento?: string;
};

type RespostaApi = {
  erro?: string;
  perfil?: PerfilAtual;
  propostas?: PropostaCompra[];
  registros?: RegistroClt[];
};

type Periodo =
  | "Hoje"
  | "Este mês"
  | "Este ano"
  | "Tudo"
  | "Personalizado";

type LinhaEquipe = {
  nome: string;
  propostasCompra: number;
  propostasClt: number;
  propostas: number;
  compraBruta: number;
  compraFinal: number;
  cltBruto: number;
  cltFinal: number;
  valorBruto: number;
  valorFinal: number;
  percentual: number;
};

const TABELAS = [
  {
    nome: "NEO NORMAL",
    percentual: 100,
  },
  {
    nome: "NEO FLEX 1",
    percentual: 82,
  },
  {
    nome: "NEO FLEX 2",
    percentual: 67,
  },
  {
    nome: "NEO FLEX 3",
    percentual: 52,
  },
  {
    nome: "NEO FLEX 4",
    percentual: 37,
  },
  {
    nome: "NEO FLEX 5",
    percentual: 17,
  },
];

function normalizarTexto(
  valor: unknown,
) {
  return String(valor || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .trim()
    .toLowerCase();
}

function perfilEhConsultora(
  perfil: string,
) {
  const texto =
    normalizarTexto(perfil);

  return (
    texto.includes("consultor") ||
    texto.includes("vendedor")
  );
}

function moeda(
  valor: number,
) {
  return Number(valor || 0)
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
}

function numero(
  valor: number,
) {
  return Number(valor || 0)
    .toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    });
}

function hojeIso() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function primeiroDiaMes() {
  const hoje = new Date();

  return new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    1,
  )
    .toISOString()
    .slice(0, 10);
}

function converterData(
  valor?: string,
) {
  if (!valor) {
    return null;
  }

  const texto =
    String(valor).trim();

  const iso = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  );

  if (iso) {
    return new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
    );
  }

  const brasileira =
    texto.match(
      /(\d{2})\/(\d{2})\/(\d{4})/,
    );

  if (brasileira) {
    return new Date(
      Number(brasileira[3]),
      Number(brasileira[2]) - 1,
      Number(brasileira[1]),
    );
  }

  const tentativa =
    new Date(texto);

  return Number.isNaN(
    tentativa.getTime(),
  )
    ? null
    : tentativa;
}

function mesmaData(
  data: Date,
  referencia: Date,
) {
  return (
    data.getFullYear() ===
      referencia.getFullYear() &&
    data.getMonth() ===
      referencia.getMonth() &&
    data.getDate() ===
      referencia.getDate()
  );
}

function estaNoPeriodo(
  data: Date | null,
  periodo: Periodo,
  inicio: string,
  fim: string,
) {
  if (!data) {
    return false;
  }

  const hoje = new Date();

  if (periodo === "Hoje") {
    return mesmaData(data, hoje);
  }

  if (periodo === "Este mês") {
    return (
      data.getFullYear() ===
        hoje.getFullYear() &&
      data.getMonth() ===
        hoje.getMonth()
    );
  }

  if (periodo === "Este ano") {
    return (
      data.getFullYear() ===
      hoje.getFullYear()
    );
  }

  if (periodo === "Tudo") {
    return true;
  }

  const dataInicial =
    converterData(inicio);

  const dataFinal =
    converterData(fim);

  if (!dataInicial || !dataFinal) {
    return true;
  }

  dataInicial.setHours(
    0,
    0,
    0,
    0,
  );

  dataFinal.setHours(
    23,
    59,
    59,
    999,
  );

  return (
    data >= dataInicial &&
    data <= dataFinal
  );
}

function percentualTabela(
  proposta: PropostaCompra,
) {
  const nome =
    normalizarTexto(
      proposta.tabela,
    );

  const encontrada =
    TABELAS.find((tabela) =>
      nome.startsWith(
        normalizarTexto(
          tabela.nome,
        ),
      ),
    );

  if (encontrada) {
    return encontrada.percentual;
  }

  return Number(
    proposta.percentualTabela ||
      0,
  );
}

function valorFinalCompra(
  proposta: PropostaCompra,
) {
  const valorSalvo =
    Number(
      proposta.valorMeta || 0,
    );

  if (valorSalvo > 0) {
    return valorSalvo;
  }

  return (
    Number(
      proposta.valorContrato || 0,
    ) *
    (percentualTabela(proposta) /
      100)
  );
}

function dataCompra(
  proposta: PropostaCompra,
) {
  return converterData(
    proposta.dataPagamento ||
      proposta.dataCadastro,
  );
}

function dataClt(
  registro: RegistroClt,
) {
  return converterData(
    registro.dataPagamento ||
      registro.atualizadoEm ||
      registro.criadoEm,
  );
}

function nomeResponsavelCompra(
  proposta: PropostaCompra,
) {
  return (
    proposta.vendedora ||
    proposta.consultora ||
    "Sem consultora"
  ).trim();
}

function nomeResponsavelClt(
  registro: RegistroClt,
) {
  return (
    registro.consultora ||
    "Sem consultora"
  ).trim();
}

export default function DashboardClient() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [
    perfilAtual,
    setPerfilAtual,
  ] = useState<PerfilAtual | null>(
    null,
  );

  const [
    propostas,
    setPropostas,
  ] = useState<PropostaCompra[]>(
    [],
  );

  const [
    registrosClt,
    setRegistrosClt,
  ] = useState<RegistroClt[]>(
    [],
  );

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    mensagem,
    setMensagem,
  ] = useState("");

  const [
    periodo,
    setPeriodo,
  ] = useState<Periodo>(
    "Este mês",
  );

  const [
    dataInicial,
    setDataInicial,
  ] = useState(
    primeiroDiaMes(),
  );

  const [
    dataFinal,
    setDataFinal,
  ] = useState(
    hojeIso(),
  );

  const [
    status,
    setStatus,
  ] = useState("Pagas");

  const [
    busca,
    setBusca,
  ] = useState("");

  async function obterSessao() {
    const {
      data,
      error,
    } =
      await supabase.auth.getSession();

    if (
      error ||
      !data.session?.access_token
    ) {
      throw new Error(
        "Sua sessão expirou. Entre novamente no sistema.",
      );
    }

    return data.session;
  }

  async function consultarApi(
    url: string,
    token: string,
  ): Promise<RespostaApi> {
    const resposta =
      await fetch(url, {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        cache: "no-store",
      });

    let conteudo: RespostaApi;

    try {
      conteudo =
        (await resposta.json()) as RespostaApi;
    } catch {
      throw new Error(
        "O servidor retornou uma resposta inválida.",
      );
    }

    if (!resposta.ok) {
      throw new Error(
        conteudo.erro ||
          "Não foi possível carregar os dados.",
      );
    }

    return conteudo;
  }

  async function carregarDados() {
    setCarregando(true);
    setMensagem("");

    try {
      const sessao =
        await obterSessao();

      const token =
        sessao.access_token;

      const [
        respostaPropostas,
        respostaClt,
      ] = await Promise.all([
        consultarApi(
          "/api/propostas",
          token,
        ),
        consultarApi(
          "/api/clt",
          token,
        ),
      ]);

      setPerfilAtual(
        respostaPropostas.perfil ||
          respostaClt.perfil ||
          null,
      );

      setPropostas(
        Array.isArray(
          respostaPropostas.propostas,
        )
          ? respostaPropostas.propostas
          : [],
      );

      setRegistrosClt(
        Array.isArray(
          respostaClt.registros,
        )
          ? respostaClt.registros
          : [],
      );
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar o Dashboard.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarDados();
  }, [supabase]);

  const ehConsultora =
    Boolean(
      perfilAtual &&
        perfilEhConsultora(
          perfilAtual.perfil ||
            "",
        ),
    );

  const nomeUsuario =
    perfilAtual?.nome ||
    "Equipe Eleva";

  const resultado =
    useMemo(() => {
      const nomeUsuarioNormalizado =
        normalizarTexto(
          perfilAtual?.nome,
        );

      const compraFiltrada =
        propostas.filter(
          (proposta) => {
            if (
              ehConsultora &&
              normalizarTexto(
                nomeResponsavelCompra(
                  proposta,
                ),
              ) !==
                nomeUsuarioNormalizado
            ) {
              return false;
            }

            if (
              status === "Pagas" &&
              proposta.status !==
                "Pago"
            ) {
              return false;
            }

            if (
              status ===
                "Em andamento" &&
              [
                "Pago",
                "Cancelado",
              ].includes(
                proposta.status ||
                  "",
              )
            ) {
              return false;
            }

            return estaNoPeriodo(
              dataCompra(proposta),
              periodo,
              dataInicial,
              dataFinal,
            );
          },
        );

      const cltFiltrado =
        registrosClt.filter(
          (registro) => {
            if (
              ehConsultora &&
              normalizarTexto(
                nomeResponsavelClt(
                  registro,
                ),
              ) !==
                nomeUsuarioNormalizado
            ) {
              return false;
            }

            if (
              status === "Pagas" &&
              registro.status !==
                "Pago"
            ) {
              return false;
            }

            if (
              status ===
                "Em andamento" &&
              [
                "Pago",
                "Recusado",
              ].includes(
                registro.status ||
                  "",
              )
            ) {
              return false;
            }

            return estaNoPeriodo(
              dataClt(registro),
              periodo,
              dataInicial,
              dataFinal,
            );
          },
        );

      const linhas =
        new Map<
          string,
          LinhaEquipe
        >();

      compraFiltrada.forEach(
        (proposta) => {
          const nome =
            nomeResponsavelCompra(
              proposta,
            );

          const atual =
            linhas.get(nome) || {
              nome,
              propostasCompra: 0,
              propostasClt: 0,
              propostas: 0,
              compraBruta: 0,
              compraFinal: 0,
              cltBruto: 0,
              cltFinal: 0,
              valorBruto: 0,
              valorFinal: 0,
              percentual: 0,
            };

          atual.propostasCompra +=
            1;

          atual.propostas += 1;

          atual.compraBruta +=
            Number(
              proposta.valorContrato ||
                0,
            );

          atual.compraFinal +=
            valorFinalCompra(
              proposta,
            );

          linhas.set(nome, atual);
        },
      );

      cltFiltrado.forEach(
        (registro) => {
          const nome =
            nomeResponsavelClt(
              registro,
            );

          const atual =
            linhas.get(nome) || {
              nome,
              propostasCompra: 0,
              propostasClt: 0,
              propostas: 0,
              compraBruta: 0,
              compraFinal: 0,
              cltBruto: 0,
              cltFinal: 0,
              valorBruto: 0,
              valorFinal: 0,
              percentual: 0,
            };

          atual.propostasClt +=
            1;

          atual.propostas += 1;

          atual.cltBruto +=
            Number(
              registro.valorAprovado ||
                0,
            );

          atual.cltFinal +=
            Number(
              registro.parcela || 0,
            );

          linhas.set(nome, atual);
        },
      );

      const lista =
        Array.from(
          linhas.values(),
        ).map((linha) => ({
          ...linha,
          valorBruto:
            linha.compraBruta +
            linha.cltBruto,
          valorFinal:
            linha.compraFinal +
            linha.cltFinal,
        }));

      const termo =
        normalizarTexto(busca);

      const listaFiltrada =
        lista
          .filter(
            (linha) =>
              !termo ||
              normalizarTexto(
                linha.nome,
              ).includes(termo),
          )
          .sort(
            (a, b) =>
              b.valorFinal -
              a.valorFinal,
          );

      const totalFinal =
        listaFiltrada.reduce(
          (total, linha) =>
            total +
            linha.valorFinal,
          0,
        );

      const linhasComPercentual =
        listaFiltrada.map(
          (linha) => ({
            ...linha,
            percentual:
              totalFinal > 0
                ? (linha.valorFinal /
                    totalFinal) *
                  100
                : 0,
          }),
        );

      const totalBruto =
        linhasComPercentual.reduce(
          (total, linha) =>
            total +
            linha.valorBruto,
          0,
        );

      const totalPropostas =
        linhasComPercentual.reduce(
          (total, linha) =>
            total +
            linha.propostas,
          0,
        );

      const totalCompra =
        linhasComPercentual.reduce(
          (total, linha) =>
            total +
            linha.compraFinal,
          0,
        );

      const totalClt =
        linhasComPercentual.reduce(
          (total, linha) =>
            total +
            linha.cltFinal,
          0,
        );

      return {
        linhas:
          linhasComPercentual,
        totalFinal,
        totalBruto,
        totalPropostas,
        totalCompra,
        totalClt,
        equipesAtivas:
          linhasComPercentual.length,
      };
    }, [
      propostas,
      registrosClt,
      perfilAtual,
      ehConsultora,
      status,
      periodo,
      dataInicial,
      dataFinal,
      busca,
    ]);

  const maiorValor =
    Math.max(
      ...resultado.linhas.map(
        (linha) =>
          linha.valorFinal,
      ),
      1,
    );

  const maiorQuantidade =
    Math.max(
      ...resultado.linhas.map(
        (linha) =>
          linha.propostas,
      ),
      1,
    );

  const linhasGrafico =
    resultado.linhas.slice(
      0,
      8,
    );

  return (
    <div className="eleva-dashboard">
      <section className="eleva-dashboard-title">
        <div>
          <span>
            VISÃO GERAL
          </span>

          <h2>
            Dashboard Eleva
          </h2>

          <p>
            {ehConsultora
              ? `Olá, ${nomeUsuario}. Acompanhe seus resultados.`
              : "Acompanhe a produção e o desempenho de toda a equipe."}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void carregarDados()
          }
          disabled={carregando}
        >
          ↻{" "}
          {carregando
            ? "Atualizando"
            : "Atualizar dados"}
        </button>
      </section>

      {mensagem && (
        <div className="eleva-dashboard-message">
          {mensagem}
        </div>
      )}

      <section className="eleva-dashboard-kpis">
        <article>
          <div className="eleva-kpi-icon blue">
            ◫
          </div>

          <div>
            <span>
              Propostas
            </span>

            <strong>
              {numero(
                resultado.totalPropostas,
              )}
            </strong>

            <small>
              Período selecionado
            </small>
          </div>
        </article>

        <article>
          <div className="eleva-kpi-icon orange">
            ◆
          </div>

          <div>
            <span>
              Compra de Dívida
            </span>

            <strong>
              {moeda(
                resultado.totalCompra,
              )}
            </strong>

            <small>
              Valor conforme tabela
            </small>
          </div>
        </article>

        <article>
          <div className="eleva-kpi-icon green">
            $
          </div>

          <div>
            <span>
              Produção CLT
            </span>

            <strong>
              {moeda(
                resultado.totalClt,
              )}
            </strong>

            <small>
              Soma das parcelas
            </small>
          </div>
        </article>

        <article className="eleva-kpi-highlight">
          <div className="eleva-kpi-icon purple">
            R$
          </div>

          <div>
            <span>
              Produção total
            </span>

            <strong>
              {moeda(
                resultado.totalFinal,
              )}
            </strong>

            <small>
              Compra de Dívida + CLT
            </small>
          </div>
        </article>
      </section>

      <section className="eleva-performance">
        <div className="eleva-performance-head">
          <div>
            <span>
              DESEMPENHO
            </span>

            <h3>
              Faturamento por consultora
            </h3>
          </div>

          <div className="eleva-performance-total">
            <small>
              Valor bruto
            </small>

            <strong>
              {moeda(
                resultado.totalBruto,
              )}
            </strong>
          </div>
        </div>

        <div className="eleva-filter-area">
          <div className="eleva-filter-group">
            <span>
              Período
            </span>

            <div className="eleva-period-buttons">
              {(
                [
                  "Hoje",
                  "Este mês",
                  "Este ano",
                  "Tudo",
                ] as Periodo[]
              ).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={
                    periodo === item
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPeriodo(item)
                  }
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <label>
            <span>
              Data inicial
            </span>

            <input
              type="date"
              value={dataInicial}
              onChange={(event) => {
                setDataInicial(
                  event.target.value,
                );

                setPeriodo(
                  "Personalizado",
                );
              }}
            />
          </label>

          <label>
            <span>
              Data final
            </span>

            <input
              type="date"
              value={dataFinal}
              onChange={(event) => {
                setDataFinal(
                  event.target.value,
                );

                setPeriodo(
                  "Personalizado",
                );
              }}
            />
          </label>

          <label>
            <span>
              Status
            </span>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value,
                )
              }
            >
              <option>
                Pagas
              </option>

              <option>
                Em andamento
              </option>

              <option>
                Todas
              </option>
            </select>
          </label>
        </div>

        <div className="eleva-filter-summary">
          <article>
            <span>
              Propostas
            </span>

            <strong>
              {resultado.totalPropostas}
            </strong>
          </article>

          <article>
            <span>
              Produção final
            </span>

            <strong>
              {moeda(
                resultado.totalFinal,
              )}
            </strong>
          </article>

          <article>
            <span>
              Valor bruto
            </span>

            <strong>
              {moeda(
                resultado.totalBruto,
              )}
            </strong>
          </article>

          <article>
            <span>
              Consultoras ativas
            </span>

            <strong>
              {resultado.equipesAtivas}
            </strong>
          </article>
        </div>

        {carregando ? (
          <div className="eleva-dashboard-empty">
            Carregando os dados do Dashboard...
          </div>
        ) : linhasGrafico.length ===
          0 ? (
          <div className="eleva-dashboard-empty">
            Nenhuma produção encontrada no período selecionado.
          </div>
        ) : (
          <div className="eleva-chart">
            <div className="eleva-chart-legend">
              <span>
                <i className="bar" />
                Valor final pago
              </span>

              <span>
                <i className="line" />
                Propostas
              </span>
            </div>

            <div className="eleva-chart-area">
              {linhasGrafico.map(
                (linha, indice) => {
                  const altura =
                    Math.max(
                      (linha.valorFinal /
                        maiorValor) *
                        100,
                      5,
                    );

                  const alturaLinha =
                    Math.max(
                      (linha.propostas /
                        maiorQuantidade) *
                        85,
                      8,
                    );

                  return (
                    <div
                      className="eleva-chart-column"
                      key={linha.nome}
                    >
                      <div className="eleva-chart-values">
                        <small>
                          Bruto{" "}
                          {moeda(
                            linha.valorBruto,
                          )}
                        </small>

                        <strong>
                          {moeda(
                            linha.valorFinal,
                          )}
                        </strong>
                      </div>

                      <div className="eleva-chart-track">
                        <div
                          className={`eleva-chart-bar color-${
                            (indice %
                              5) +
                            1
                          }`}
                          style={{
                            height:
                              `${altura}%`,
                          }}
                        />

                      </div>

                      <div className="eleva-chart-name">
  <strong>
    {linha.nome}
  </strong>

  <small>
    {linha.propostas}{" "}
    {linha.propostas === 1
      ? "proposta"
      : "propostas"}
  </small>
</div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        <div className="eleva-table-title">
          <div>
            <span>
              DETALHAMENTO
            </span>

            <h3>
              Produção por consultora
            </h3>
          </div>

          <input
            value={busca}
            placeholder="Pesquisar consultora"
            onChange={(event) =>
              setBusca(
                event.target.value,
              )
            }
          />
        </div>

        <div className="eleva-table-wrapper">
          <table className="eleva-dashboard-table">
            <thead>
              <tr>
                <th>
                  #
                </th>

                <th>
                  Consultora
                </th>

                <th>
                  Compra
                </th>

                <th>
                  CLT
                </th>

                <th>
                  Propostas
                </th>

                <th>
                  Valor final
                </th>

                <th>
                  Valor bruto
                </th>

                <th>
                  % do total
                </th>
              </tr>
            </thead>

            <tbody>
              {resultado.linhas.map(
                (linha, indice) => (
                  <tr key={linha.nome}>
                    <td>
                      <b>
                        #{indice + 1}
                      </b>
                    </td>

                    <td>
                      <strong>
                        {linha.nome}
                      </strong>

                      <small>
                        {
                          linha.propostasCompra
                        }{" "}
                        Compra de Dívida •{" "}
                        {
                          linha.propostasClt
                        }{" "}
                        CLT
                      </small>
                    </td>

                    <td>
                      {moeda(
                        linha.compraFinal,
                      )}
                    </td>

                    <td>
                      {moeda(
                        linha.cltFinal,
                      )}
                    </td>

                    <td>
                      <strong>
                        {linha.propostas}
                      </strong>
                    </td>

                    <td className="final-value">
                      {moeda(
                        linha.valorFinal,
                      )}
                    </td>

                    <td>
                      {moeda(
                        linha.valorBruto,
                      )}
                    </td>

                    <td>
                      <div className="eleva-percent">
                        <div>
                          <i
                            style={{
                              width:
                                `${Math.min(
                                  linha.percentual,
                                  100,
                                )}%`,
                            }}
                          />
                        </div>

                        <span>
                          {linha.percentual.toFixed(
                            0,
                          )}
                          %
                        </span>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>

            <tfoot>
              <tr>
                <td colSpan={4}>
                  TOTAL GERAL
                </td>

                <td>
                  {
                    resultado.totalPropostas
                  }
                </td>

                <td>
                  {moeda(
                    resultado.totalFinal,
                  )}
                </td>

                <td>
                  {moeda(
                    resultado.totalBruto,
                  )}
                </td>

                <td>
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}