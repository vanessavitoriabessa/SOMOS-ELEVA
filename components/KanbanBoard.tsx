"use client";

import { DragEvent, useEffect, useMemo, useState } from "react";
import "./esteira.css";

type StatusProposta =
  | "Solicitado"
  | "Em andamento"
  | "Aguardando boleto"
  | "Enviado ao banco"
  | "Pago"
  | "Cancelado";

type Proposta = {
  id: string;
  cliente: string;
  cpf: string;
  telefone: string;
  vendedora: string;
  banco: string;
  tabela: string;
  valorContrato: number;
  percentualTabela: number;
  comissao: number;
  status: StatusProposta;
  dataCadastro: string;
  dataPagamento: string;
  observacao: string;
};

type Coluna = {
  status: StatusProposta;
  titulo: string;
  cor: string;
};

const COLUNAS: Coluna[] = [
  { status: "Solicitado", titulo: "Solicitado", cor: "yellow" },
  { status: "Em andamento", titulo: "Em andamento", cor: "blue" },
  { status: "Aguardando boleto", titulo: "Aguardando boleto", cor: "orange" },
  { status: "Enviado ao banco", titulo: "Enviado ao banco", cor: "purple" },
  { status: "Pago", titulo: "Pago", cor: "green" },
  { status: "Cancelado", titulo: "Cancelado", cor: "red" },
];

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function apenasNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarCpf(valor: string) {
  const digitos = apenasNumeros(valor).slice(0, 11);
  if (!digitos) return "CPF não informado";

  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function KanbanBoard() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroVendedora, setFiltroVendedora] = useState("Todas");
  const [mensagem, setMensagem] = useState("");
  const [detalhe, setDetalhe] = useState<Proposta | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  function carregar() {
    const salvo = localStorage.getItem("somos-eleva-propostas");

    if (!salvo) {
      setPropostas([]);
      return;
    }

    try {
      setPropostas(JSON.parse(salvo));
    } catch {
      setPropostas([]);
    }
  }

  function persistir(lista: Proposta[]) {
    setPropostas(lista);
    localStorage.setItem("somos-eleva-propostas", JSON.stringify(lista));
  }

  const vendedoras = useMemo(() => {
    return Array.from(
      new Set(
        propostas
          .map((item) => item.vendedora?.trim())
          .filter(Boolean)
      )
    ).sort();
  }, [propostas]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return propostas.filter((item) => {
      const buscaOk =
        !termo ||
        item.cliente.toLowerCase().includes(termo) ||
        item.cpf.includes(apenasNumeros(termo)) ||
        item.vendedora.toLowerCase().includes(termo) ||
        item.banco.toLowerCase().includes(termo);

      const vendedoraOk =
        filtroVendedora === "Todas" || item.vendedora === filtroVendedora;

      return buscaOk && vendedoraOk;
    });
  }, [propostas, busca, filtroVendedora]);

  const resumo = useMemo(() => {
    const pagas = propostas.filter((item) => item.status === "Pago");
    return {
      total: propostas.length,
      pagas: pagas.length,
      valorPago: pagas.reduce((total, item) => total + item.valorContrato, 0),
      comissao: pagas.reduce((total, item) => total + item.comissao, 0),
      emAberto: propostas.filter(
        (item) => item.status !== "Pago" && item.status !== "Cancelado"
      ).length,
    };
  }, [propostas]);

  function iniciarArraste(id: string) {
    setArrastandoId(id);
  }

  function permitirSoltar(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function soltarNaColuna(novoStatus: StatusProposta) {
    if (!arrastandoId) return;

    const proposta = propostas.find((item) => item.id === arrastandoId);
    if (!proposta || proposta.status === novoStatus) {
      setArrastandoId(null);
      return;
    }

    let percentual = proposta.percentualTabela || 0;
    let comissao = proposta.comissao || 0;
    let dataPagamento = proposta.dataPagamento || "";

    if (novoStatus === "Pago") {
      if (percentual <= 0) {
        const resposta = window.prompt(
          "Informe a porcentagem da tabela para calcular a comissão.\nExemplo: 3,25"
        );

        if (resposta === null) {
          setArrastandoId(null);
          return;
        }

        percentual = Number(
          resposta.replace(/[^\d,.-]/g, "").replace(",", ".")
        );

        if (!Number.isFinite(percentual) || percentual <= 0) {
          setMensagem("Percentual inválido. A proposta não foi movida para Pago.");
          setArrastandoId(null);
          return;
        }
      }

      comissao = proposta.valorContrato * (percentual / 100);
      dataPagamento = hojeIso();
    }

    if (proposta.status === "Pago" && novoStatus !== "Pago") {
      comissao = 0;
      dataPagamento = "";
    }

    const atualizadas = propostas.map((item) =>
      item.id === arrastandoId
        ? {
            ...item,
            status: novoStatus,
            percentualTabela: percentual,
            comissao,
            dataPagamento,
          }
        : item
    );

    persistir(atualizadas);
    setArrastandoId(null);

    setMensagem(
      novoStatus === "Pago"
        ? `Contrato marcado como Pago. Comissão calculada: ${moeda(comissao)}.`
        : `Proposta movida para ${novoStatus}.`
    );
  }

  function moverComSelect(id: string, novoStatus: StatusProposta) {
    setArrastandoId(id);
    setTimeout(() => soltarNaColuna(novoStatus), 0);
  }

  function excluir(id: string) {
    const confirmar = window.confirm(
      "Deseja realmente excluir esta proposta da esteira?"
    );

    if (!confirmar) return;

    persistir(propostas.filter((item) => item.id !== id));
    setDetalhe(null);
  }

  return (
    <div className="kanban-page">
      <section className="kanban-summary">
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
          <strong>{moeda(resumo.valorPago)}</strong>
        </article>
        <article className="kanban-summary-highlight">
          <span>Comissão gerada</span>
          <strong>{moeda(resumo.comissao)}</strong>
        </article>
      </section>

      <section className="kanban-toolbar">
        <div>
          <span>ESTEIRA OPERACIONAL</span>
          <h2>Propostas por etapa</h2>
          <p>Arraste os cards ou altere o status pelo seletor.</p>
        </div>

        <div className="kanban-filters">
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Pesquisar cliente, CPF, banco ou vendedora"
          />

          <select
            value={filtroVendedora}
            onChange={(event) => setFiltroVendedora(event.target.value)}
          >
            <option>Todas</option>
            {vendedoras.map((vendedora) => (
              <option key={vendedora}>{vendedora}</option>
            ))}
          </select>

          <button type="button" onClick={carregar}>
            Atualizar
          </button>
        </div>
      </section>

      {mensagem && <div className="kanban-message">{mensagem}</div>}

      <section className="kanban-board">
        {COLUNAS.map((coluna) => {
          const itens = filtradas.filter(
            (item) => item.status === coluna.status
          );

          return (
            <div
              key={coluna.status}
              className={`kanban-column column-${coluna.cor}`}
              onDragOver={permitirSoltar}
              onDrop={() => soltarNaColuna(coluna.status)}
            >
              <header>
                <div>
                  <i></i>
                  <strong>{coluna.titulo}</strong>
                </div>
                <b>{itens.length}</b>
              </header>

              <div className="kanban-column-body">
                {itens.length === 0 ? (
                  <div className="kanban-empty">
                    <span>+</span>
                    <p>Nenhuma proposta</p>
                  </div>
                ) : (
                  itens.map((proposta) => (
                    <article
                      key={proposta.id}
                      className={`kanban-card ${
                        arrastandoId === proposta.id ? "dragging" : ""
                      }`}
                      draggable
                      onDragStart={() => iniciarArraste(proposta.id)}
                      onDragEnd={() => setArrastandoId(null)}
                    >
                      <div className="kanban-card-top">
                        <div>
                          <strong>{proposta.cliente}</strong>
                          <span>{formatarCpf(proposta.cpf)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDetalhe(proposta)}
                          aria-label="Abrir detalhes"
                        >
                          ⋯
                        </button>
                      </div>

                      <div className="kanban-tags">
                        <span>{proposta.banco || "Banco não informado"}</span>
                        {proposta.tabela && <span>{proposta.tabela}</span>}
                      </div>

                      <div className="kanban-card-value">
                        <span>Valor do contrato</span>
                        <strong>{moeda(proposta.valorContrato)}</strong>
                      </div>

                      {proposta.status === "Pago" && (
                        <div className="kanban-paid">
                          <div>
                            <span>Tabela</span>
                            <strong>
                              {String(proposta.percentualTabela).replace(".", ",")}%
                            </strong>
                          </div>
                          <div>
                            <span>Comissão</span>
                            <strong>{moeda(proposta.comissao)}</strong>
                          </div>
                        </div>
                      )}

                      <footer>
                        <div>
                          <span>Consultora</span>
                          <strong>
                            {proposta.vendedora || "Não informada"}
                          </strong>
                        </div>

                        <select
                          value={proposta.status}
                          onChange={(event) =>
                            moverComSelect(
                              proposta.id,
                              event.target.value as StatusProposta
                            )
                          }
                        >
                          {COLUNAS.map((item) => (
                            <option key={item.status} value={item.status}>
                              {item.titulo}
                            </option>
                          ))}
                        </select>
                      </footer>
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="kanban-help">
        <strong>Automação ativa:</strong>
        <span>
          ao mover uma proposta para <b>Pago</b>, o sistema solicita a
          porcentagem da tabela, calcula a comissão e registra a data do
          pagamento.
        </span>
      </section>

      {detalhe && (
        <div className="kanban-modal-overlay" onClick={() => setDetalhe(null)}>
          <section
            className="kanban-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>DETALHES DA PROPOSTA</span>
                <h3>{detalhe.cliente}</h3>
              </div>
              <button onClick={() => setDetalhe(null)}>×</button>
            </header>

            <div className="kanban-modal-grid">
              <div>
                <span>CPF</span>
                <strong>{formatarCpf(detalhe.cpf)}</strong>
              </div>
              <div>
                <span>Telefone</span>
                <strong>{detalhe.telefone || "Não informado"}</strong>
              </div>
              <div>
                <span>Vendedora</span>
                <strong>{detalhe.vendedora || "Não informada"}</strong>
              </div>
              <div>
                <span>Banco</span>
                <strong>{detalhe.banco || "Não informado"}</strong>
              </div>
              <div>
                <span>Tabela</span>
                <strong>{detalhe.tabela || "Não informada"}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{detalhe.status}</strong>
              </div>
              <div>
                <span>Valor do contrato</span>
                <strong>{moeda(detalhe.valorContrato)}</strong>
              </div>
              <div>
                <span>Comissão</span>
                <strong>{moeda(detalhe.comissao)}</strong>
              </div>
            </div>

            {detalhe.observacao && (
              <div className="kanban-modal-note">
                <span>Observações</span>
                <p>{detalhe.observacao}</p>
              </div>
            )}

            <footer>
              <button className="delete" onClick={() => excluir(detalhe.id)}>
                Excluir proposta
              </button>
              <button onClick={() => setDetalhe(null)}>Fechar</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
