"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import "./esteira.css";
import "./esteira-lista.css";

type StatusProposta =
  | "Solicitado"
  | "Em andamento"
  | "Aguardando boleto"
  | "Enviado ao banco"
  | "Pago"
  | "Cancelado";

type Proposta = {
  id: string;
  clienteId?: string;
  cliente: string;
  cpf: string;
  telefone: string;
  vendedora: string;
  banco: string;
  tabela: string;
  valorContrato: number;
  percentualTabela: number;
  comissao: number;
  premiacao?: number;
  status: StatusProposta;
  dataCadastro: string;
  dataPagamento: string;
  observacao: string;
};

const STATUS: StatusProposta[] = [
  "Solicitado",
  "Em andamento",
  "Aguardando boleto",
  "Enviado ao banco",
  "Pago",
  "Cancelado",
];

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function apenasNumeros(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

function formatarCpf(valor: string) {
  const digitos = apenasNumeros(valor).slice(
    0,
    11
  );

  if (!digitos) {
    return "CPF não informado";
  }

  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(
      /^(\d{3})\.(\d{3})(\d)/,
      "$1.$2.$3"
    )
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatarTelefone(valor: string) {
  const digitos = apenasNumeros(valor).slice(
    0,
    11
  );

  if (!digitos) {
    return "Não informado";
  }

  if (digitos.length <= 10) {
    return digitos
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digitos
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatarPercentual(valor: number) {
  return `${Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}%`;
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizarProposta(
  item: Partial<Proposta> &
    Record<string, unknown>
): Proposta {
  const valorContrato = Number(
    item.valorContrato ??
      item.valorOperacao ??
      0
  );

  const premiacao = Number(
    item.premiacao ??
      item.comissao ??
      item.comissaoPrevista ??
      0
  );

  const percentualInformado = Number(
    item.percentualTabela ??
      item.percentualComissao ??
      0
  );

  const percentualCalculado =
    valorContrato > 0 && premiacao > 0
      ? (premiacao / valorContrato) * 100
      : 0;

  const percentualTabela =
    percentualCalculado > 0 &&
    Math.abs(
      percentualInformado -
        percentualCalculado
    ) > 0.01
      ? percentualCalculado
      : percentualInformado;

  const status = STATUS.includes(
    item.status as StatusProposta
  )
    ? (item.status as StatusProposta)
    : "Solicitado";

  return {
    id: String(
      item.id || crypto.randomUUID()
    ),
    clienteId: String(
      item.clienteId || ""
    ),
    cliente: String(item.cliente || ""),
    cpf: apenasNumeros(
      String(item.cpf || "")
    ),
    telefone: apenasNumeros(
      String(item.telefone || "")
    ),
    vendedora: String(
      item.vendedora ||
        item.consultora ||
        ""
    ),
    banco: String(item.banco || ""),
    tabela: String(item.tabela || ""),
    valorContrato: Number.isFinite(
      valorContrato
    )
      ? valorContrato
      : 0,
    percentualTabela: Number.isFinite(
      percentualTabela
    )
      ? percentualTabela
      : 0,
    comissao: Number.isFinite(premiacao)
      ? premiacao
      : 0,
    premiacao: Number.isFinite(premiacao)
      ? premiacao
      : 0,
    status,
    dataCadastro: String(
      item.dataCadastro || ""
    ),
    dataPagamento: String(
      item.dataPagamento || ""
    ),
    observacao: String(
      item.observacao ||
        item.observacoes ||
        ""
    ),
  };
}

export default function KanbanBoard() {
  const [propostas, setPropostas] =
    useState<Proposta[]>([]);

  const [busca, setBusca] = useState("");

  const [filtroStatus, setFiltroStatus] =
    useState("Todos");

  const [
    filtroVendedora,
    setFiltroVendedora,
  ] = useState("Todas");

  const [mensagem, setMensagem] =
    useState("");

  const [detalhe, setDetalhe] =
    useState<Proposta | null>(null);

  const [
    podeVerPremiacao,
    setPodeVerPremiacao,
  ] = useState(false);

  useEffect(() => {
    identificarPermissao();
    carregar();
  }, []);

  function identificarPermissao() {
    try {
      const cargoSalvo = String(
        localStorage.getItem(
          "somos-eleva-cargo"
        ) || ""
      );

      const usuarioLogado = String(
        localStorage.getItem(
          "somos-eleva-usuario"
        ) || ""
      );

      const usuariosSalvos = JSON.parse(
        localStorage.getItem(
          "somos-eleva-usuarios"
        ) || "[]"
      );

      const usuarioAtual = Array.isArray(
        usuariosSalvos
      )
        ? usuariosSalvos.find(
            (
              usuario: Record<
                string,
                unknown
              >
            ) =>
              String(usuario.id || "") ===
                usuarioLogado ||
              String(usuario.email || "") ===
                usuarioLogado ||
              String(
                usuario.matricula || ""
              ) === usuarioLogado ||
              String(usuario.nome || "") ===
                usuarioLogado
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
        perfilAtual.includes(
          "administrador"
        ) ||
          perfilAtual.includes(
            "administradora"
          ) ||
          perfilAtual === "admin"
      );
    } catch {
      setPodeVerPremiacao(false);
    }
  }

  function carregar() {
    const salvo = localStorage.getItem(
      "somos-eleva-propostas"
    );

    if (!salvo) {
      setPropostas([]);
      return;
    }

    try {
      const lista = JSON.parse(salvo);

      const normalizadas = Array.isArray(
        lista
      )
        ? lista.map(normalizarProposta)
        : [];

      setPropostas(normalizadas);

      localStorage.setItem(
        "somos-eleva-propostas",
        JSON.stringify(normalizadas)
      );
    } catch {
      setPropostas([]);
    }
  }

  function persistir(lista: Proposta[]) {
    setPropostas(lista);

    localStorage.setItem(
      "somos-eleva-propostas",
      JSON.stringify(lista)
    );
  }

  const vendedoras = useMemo(() => {
    return Array.from(
      new Set(
        propostas
          .map((item) =>
            item.vendedora?.trim()
          )
          .filter(Boolean)
      )
    ).sort();
  }, [propostas]);

  const filtradas = useMemo(() => {
    const termo = busca
      .trim()
      .toLowerCase();

    return [...propostas]
      .filter((item) => {
        const buscaOk =
          !termo ||
          item.cliente
            .toLowerCase()
            .includes(termo) ||
          item.cpf.includes(
            apenasNumeros(termo)
          ) ||
          item.vendedora
            .toLowerCase()
            .includes(termo) ||
          item.banco
            .toLowerCase()
            .includes(termo) ||
          item.tabela
            .toLowerCase()
            .includes(termo);

        const statusOk =
          filtroStatus === "Todos" ||
          item.status === filtroStatus;

        const vendedoraOk =
          filtroVendedora === "Todas" ||
          item.vendedora ===
            filtroVendedora;

        return (
          buscaOk &&
          statusOk &&
          vendedoraOk
        );
      })
      .sort((a, b) =>
        a.cliente.localeCompare(
          b.cliente
        )
      );
  }, [
    propostas,
    busca,
    filtroStatus,
    filtroVendedora,
  ]);

  const resumo = useMemo(() => {
    const pagas = propostas.filter(
      (item) => item.status === "Pago"
    );

    return {
      total: propostas.length,
      pagas: pagas.length,
      valorPago: pagas.reduce(
        (total, item) =>
          total +
          Number(
            item.valorContrato || 0
          ),
        0
      ),
      premiacao: pagas.reduce(
        (total, item) =>
          total +
          Number(
            item.premiacao ??
              item.comissao ??
              0
          ),
        0
      ),
      emAberto: propostas.filter(
        (item) =>
          item.status !== "Pago" &&
          item.status !== "Cancelado"
      ).length,
    };
  }, [propostas]);

  function alterarStatus(
    id: string,
    novoStatus: StatusProposta
  ) {
    const proposta = propostas.find(
      (item) => item.id === id
    );

    if (!proposta) {
      return;
    }

    let percentual = Number(
      proposta.percentualTabela || 0
    );

    let premiacao = Number(
      proposta.premiacao ??
        proposta.comissao ??
        0
    );

    let dataPagamento =
      proposta.dataPagamento || "";

    if (novoStatus === "Pago") {
      if (
        percentual <= 0 &&
        podeVerPremiacao
      ) {
        const resposta = window.prompt(
          "Informe a porcentagem da premiação.\nExemplo: 3,25"
        );

        if (resposta === null) {
          return;
        }

        percentual = Number(
          resposta
            .replace(/[^\d,.-]/g, "")
            .replace(",", ".")
        );

        if (
          !Number.isFinite(percentual) ||
          percentual <= 0
        ) {
          setMensagem(
            "Percentual inválido. O status não foi alterado."
          );
          return;
        }
      }

      premiacao =
        percentual > 0
          ? proposta.valorContrato *
            (percentual / 100)
          : 0;

      dataPagamento =
        proposta.dataPagamento ||
        hojeIso();
    }

    if (
      proposta.status === "Pago" &&
      novoStatus !== "Pago"
    ) {
      premiacao = 0;
      dataPagamento = "";
    }

    const atualizadas = propostas.map(
      (item) =>
        item.id === id
          ? {
              ...item,
              status: novoStatus,
              percentualTabela:
                percentual,
              comissao: premiacao,
              premiacao,
              dataPagamento,
            }
          : item
    );

    persistir(atualizadas);

    setMensagem(
      novoStatus === "Pago"
        ? podeVerPremiacao
          ? `Contrato marcado como Pago. Premiação calculada: ${moeda(
              premiacao
            )}.`
          : "Contrato marcado como Pago. A premiação deverá ser conferida pela administração."
        : `Proposta alterada para ${novoStatus}.`
    );
  }

  function excluir(id: string) {
    const confirmar = window.confirm(
      "Deseja realmente excluir esta proposta?"
    );

    if (!confirmar) {
      return;
    }

    persistir(
      propostas.filter(
        (item) => item.id !== id
      )
    );

    setDetalhe(null);
  }

  return (
    <div className="pipeline-page">
      <section className="pipeline-summary">
        <article>
          <span>Total de propostas</span>
          <strong>{resumo.total}</strong>
        </article>

        <article>
          <span>Em aberto</span>
          <strong>{resumo.emAberto}</strong>
        </article>

        <article>
          <span>Contratos pagos</span>
          <strong>{resumo.pagas}</strong>
        </article>

        <article>
          <span>Valor pago</span>
          <strong>
            {moeda(resumo.valorPago)}
          </strong>
        </article>

        {podeVerPremiacao && (
          <article className="pipeline-summary-highlight">
            <span>Premiação gerada</span>

            <strong>
              {moeda(
                resumo.premiacao
              )}
            </strong>
          </article>
        )}
      </section>

      <section className="pipeline-toolbar">
        <div>
          <span>ESTEIRA OPERACIONAL</span>

          <h2>Lista de propostas</h2>

          <p>
            Filtre a etapa desejada e acompanhe as
            propostas em linhas horizontais.
          </p>
        </div>

        <div className="pipeline-filters">
          <input
            value={busca}
            onChange={(event) =>
              setBusca(event.target.value)
            }
            placeholder="Pesquisar cliente, CPF, banco, tabela ou consultora"
          />

          <select
            value={filtroStatus}
            onChange={(event) =>
              setFiltroStatus(
                event.target.value
              )
            }
          >
            <option>Todos</option>

            {STATUS.map((status) => (
              <option key={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={filtroVendedora}
            onChange={(event) =>
              setFiltroVendedora(
                event.target.value
              )
            }
          >
            <option>Todas</option>

            {vendedoras.map(
              (vendedora) => (
                <option key={vendedora}>
                  {vendedora}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            onClick={carregar}
          >
            Atualizar
          </button>
        </div>
      </section>

      {mensagem && (
        <div className="pipeline-message">
          {mensagem}
        </div>
      )}

      <section className="pipeline-list-card">
        <div className="pipeline-list-heading">
          <div>
            <span>RESULTADO DO FILTRO</span>

            <h3>
              {filtroStatus === "Todos"
                ? "Todas as propostas"
                : filtroStatus}
            </h3>
          </div>

          <b>{filtradas.length}</b>
        </div>

        {!filtradas.length ? (
          <div className="pipeline-empty">
            <div>▤</div>

            <strong>
              Nenhuma proposta encontrada
            </strong>

            <p>
              Altere o filtro ou pesquise por outro
              cliente.
            </p>
          </div>
        ) : (
          <div className="pipeline-list">
            {filtradas.map((proposta) => {
              const premiacao = Number(
                proposta.premiacao ??
                  proposta.comissao ??
                  0
              );

              return (
                <article
                  className="pipeline-row"
                  key={proposta.id}
                >
                  <div className="pipeline-client">
                    <strong>
                      {proposta.cliente}
                    </strong>

                    <span>
                      {formatarCpf(
                        proposta.cpf
                      )}
                    </span>

                    <div>
                      <b>
                        {proposta.banco ||
                          "Banco não informado"}
                      </b>

                      {proposta.tabela && (
                        <b>
                          {proposta.tabela}
                        </b>
                      )}
                    </div>
                  </div>

                  <div className="pipeline-data">
                    <span>
                      Valor do contrato
                    </span>

                    <strong>
                      {moeda(
                        proposta.valorContrato
                      )}
                    </strong>
                  </div>

                  <div className="pipeline-data">
                    <span>Consultora</span>

                    <strong>
                      {proposta.vendedora ||
                        "Não informada"}
                    </strong>
                  </div>

                  {podeVerPremiacao &&
                    proposta.status ===
                      "Pago" && (
                      <>
                        <div className="pipeline-data">
                          <span>
                            Percentual
                          </span>

                          <strong>
                            {formatarPercentual(
                              proposta.percentualTabela
                            )}
                          </strong>
                        </div>

                        <div className="pipeline-data pipeline-prize">
                          <span>
                            Premiação
                          </span>

                          <strong>
                            {moeda(premiacao)}
                          </strong>
                        </div>
                      </>
                    )}

                  <div className="pipeline-status">
                    <span>Status</span>

                    <select
                      className={`pipeline-status-select status-${proposta.status
                        .toLowerCase()
                        .replace(/\s/g, "-")
                        .normalize("NFD")
                        .replace(
                          /[\u0300-\u036f]/g,
                          ""
                        )}`}
                      value={proposta.status}
                      onChange={(event) =>
                        alterarStatus(
                          proposta.id,
                          event.target
                            .value as StatusProposta
                        )
                      }
                    >
                      {STATUS.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="pipeline-details-button"
                    onClick={() =>
                      setDetalhe(proposta)
                    }
                  >
                    Abrir
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="pipeline-help">
        <strong>Organização:</strong>

        <span>
          selecione um status no filtro para mostrar
          somente as propostas daquela etapa. O
          status também pode ser alterado diretamente
          em cada linha.
        </span>
      </section>

      {detalhe && (
        <div
          className="pipeline-modal-overlay"
          onClick={() =>
            setDetalhe(null)
          }
        >
          <section
            className="pipeline-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <header>
              <div>
                <span>
                  DETALHES DA PROPOSTA
                </span>

                <h3>{detalhe.cliente}</h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetalhe(null)
                }
              >
                ×
              </button>
            </header>

            <div className="pipeline-modal-grid">
              <div>
                <span>CPF</span>

                <strong>
                  {formatarCpf(
                    detalhe.cpf
                  )}
                </strong>
              </div>

              <div>
                <span>Telefone</span>

                <strong>
                  {formatarTelefone(
                    detalhe.telefone
                  )}
                </strong>
              </div>

              <div>
                <span>Consultora</span>

                <strong>
                  {detalhe.vendedora ||
                    "Não informada"}
                </strong>
              </div>

              <div>
                <span>Banco</span>

                <strong>
                  {detalhe.banco ||
                    "Não informado"}
                </strong>
              </div>

              <div>
                <span>Tabela</span>

                <strong>
                  {detalhe.tabela ||
                    "Não informada"}
                </strong>
              </div>

              <div>
                <span>Status</span>

                <strong>
                  {detalhe.status}
                </strong>
              </div>

              <div>
                <span>
                  Valor do contrato
                </span>

                <strong>
                  {moeda(
                    detalhe.valorContrato
                  )}
                </strong>
              </div>

              {podeVerPremiacao && (
                <>
                  <div>
                    <span>
                      Percentual
                    </span>

                    <strong>
                      {formatarPercentual(
                        detalhe.percentualTabela
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Premiação</span>

                    <strong>
                      {moeda(
                        Number(
                          detalhe.premiacao ??
                            detalhe.comissao ??
                            0
                        )
                      )}
                    </strong>
                  </div>
                </>
              )}
            </div>

            {detalhe.observacao && (
              <div className="pipeline-modal-note">
                <span>Observações</span>

                <p>
                  {detalhe.observacao}
                </p>
              </div>
            )}

            <footer>
              <button
                type="button"
                className="delete"
                onClick={() =>
                  excluir(detalhe.id)
                }
              >
                Excluir proposta
              </button>

              <button
                type="button"
                onClick={() =>
                  setDetalhe(null)
                }
              >
                Fechar
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
