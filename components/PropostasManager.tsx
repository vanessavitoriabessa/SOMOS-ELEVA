"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type StatusProposta =
  | "Digitado"
  | "Aguardando pagamento"
  | "Pago"
  | "Cancelado";

type Produto = "Compra de Dívida" | "CLT";

type Proposta = {
  id: string;
  numero: string;
  cliente: string;
  cpf: string;
  banco: string;
  produto: Produto;
  valorOperacao: number;
  valorLiquido: number;
  consultora: string;
  dataDigitacao: string;
  dataPagamento: string;
  status: StatusProposta;
  observacoes: string;
  tabela?: string;
  comissaoPrevista?: number;
  valorRecebido?: number;
  percentualComissao?: number;
  diferenca?: number;
  statusFinanceiro?: string;
  origem?: string;
};

const CHAVE = "somos-eleva-propostas";

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string) {
  if (!data) return "—";
  return data.split("-").reverse().join("/");
}

function competencia(dataDigitacao: string) {
  if (!dataDigitacao) return "—";
  const [ano, mes] = dataDigitacao.split("-");
  return `${mes}/${ano}`;
}

export default function PropostasManager() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroProduto, setFiltroProduto] = useState("Todos");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    const salvas = localStorage.getItem(CHAVE);
    if (salvas) {
      try {
        setPropostas(JSON.parse(salvas));
      } catch {
        localStorage.removeItem(CHAVE);
      }
    }
  }, []);

  function salvar(novas: Proposta[]) {
    setPropostas(novas);
    localStorage.setItem(CHAVE, JSON.stringify(novas));
  }

  function cadastrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);

    const proposta: Proposta = {
      id: editandoId || crypto.randomUUID(),
      numero: String(dados.get("numero") || "").trim(),
      cliente: String(dados.get("cliente") || "").trim(),
      cpf: String(dados.get("cpf") || "").trim(),
      banco: String(dados.get("banco") || "").trim(),
      produto: String(dados.get("produto")) as Produto,
      valorOperacao: Number(dados.get("valorOperacao") || 0),
      valorLiquido: Number(dados.get("valorLiquido") || 0),
      consultora: String(dados.get("consultora") || "").trim(),
      dataDigitacao: String(dados.get("dataDigitacao") || ""),
      dataPagamento: String(dados.get("dataPagamento") || ""),
      status: String(dados.get("status")) as StatusProposta,
      observacoes: String(dados.get("observacoes") || "").trim(),
    };

    if (!proposta.numero || !proposta.cliente || !proposta.dataDigitacao) {
      alert("Preencha número da proposta, cliente e data de digitação.");
      return;
    }

    const duplicada = propostas.some(
      (item) => item.numero === proposta.numero && item.id !== proposta.id
    );

    if (duplicada) {
      alert("Já existe uma proposta com este número.");
      return;
    }

    if (editandoId) {
      salvar(propostas.map((item) => item.id === editandoId ? proposta : item));
    } else {
      salvar([proposta, ...propostas]);
    }

    setEditandoId(null);
    setMostrarFormulario(false);
    evento.currentTarget.reset();
  }

  function atualizarStatus(id: string, status: StatusProposta) {
    const hoje = new Date().toISOString().slice(0, 10);

    salvar(
      propostas.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              dataPagamento:
                status === "Pago" && !item.dataPagamento
                  ? hoje
                  : item.dataPagamento,
            }
          : item
      )
    );
  }

  function excluir(id: string) {
    if (!confirm("Deseja excluir esta proposta?")) return;
    salvar(propostas.filter((item) => item.id !== id));
  }

  function editar(proposta: Proposta) {
    setEditandoId(proposta.id);
    setMostrarFormulario(true);

    setTimeout(() => {
      const form = document.querySelector<HTMLFormElement>("#form-proposta");
      if (!form) return;

      const campos: Record<string, string> = {
        numero: proposta.numero,
        cliente: proposta.cliente,
        cpf: proposta.cpf,
        banco: proposta.banco,
        produto: proposta.produto,
        valorOperacao: String(proposta.valorOperacao),
        valorLiquido: String(proposta.valorLiquido),
        consultora: proposta.consultora,
        dataDigitacao: proposta.dataDigitacao,
        dataPagamento: proposta.dataPagamento,
        status: proposta.status,
        observacoes: proposta.observacoes,
      };

      Object.entries(campos).forEach(([nome, valor]) => {
        const campo = form.elements.namedItem(nome) as
          | HTMLInputElement
          | HTMLSelectElement
          | HTMLTextAreaElement
          | null;

        if (campo) campo.value = valor;
      });

      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  const filtradas = useMemo(() => {
    const texto = busca.toLowerCase().trim();

    return propostas.filter((item) => {
      const bateBusca =
        !texto ||
        [
          item.numero,
          item.cliente,
          item.cpf,
          item.banco,
          item.consultora,
          item.produto,
          item.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(texto);

      const bateStatus =
        filtroStatus === "Todos" || item.status === filtroStatus;

      const bateProduto =
        filtroProduto === "Todos" || item.produto === filtroProduto;

      return bateBusca && bateStatus && bateProduto;
    });
  }, [propostas, busca, filtroStatus, filtroProduto]);

  const totais = useMemo(() => {
    const pagas = propostas.filter((item) => item.status === "Pago");
    return {
      quantidade: propostas.length,
      pago: pagas.reduce((soma, item) => soma + Number(item.valorLiquido || 0), 0),
      pendente: propostas
        .filter((item) => item.status === "Aguardando pagamento")
        .reduce((soma, item) => soma + Number(item.valorLiquido || 0), 0),
    };
  }, [propostas]);

  return (
    <>
      <section className="mini-stats-grid">
        <article className="mini-stat">
          <span>Total de propostas</span>
          <strong>{totais.quantidade}</strong>
        </article>
        <article className="mini-stat">
          <span>Total pago</span>
          <strong>{moeda(totais.pago)}</strong>
        </article>
        <article className="mini-stat">
          <span>Aguardando pagamento</span>
          <strong>{moeda(totais.pendente)}</strong>
        </article>
      </section>

      <div className="toolbar proposal-toolbar">
        <div className="filters-group">
          <input
            className="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Pesquisar proposta, cliente, CPF, banco ou consultora..."
          />

          <select
            className="filter-select"
            value={filtroStatus}
            onChange={(evento) => setFiltroStatus(evento.target.value)}
          >
            <option>Todos</option>
            <option>Digitado</option>
            <option>Aguardando pagamento</option>
            <option>Pago</option>
            <option>Cancelado</option>
          </select>

          <select
            className="filter-select"
            value={filtroProduto}
            onChange={(evento) => setFiltroProduto(evento.target.value)}
          >
            <option>Todos</option>
            <option>Compra de Dívida</option>
            <option>CLT</option>
          </select>
        </div>

        <button
          className="button"
          onClick={() => {
            setEditandoId(null);
            setMostrarFormulario(!mostrarFormulario);
          }}
        >
          {mostrarFormulario ? "Fechar" : "+ Nova proposta"}
        </button>
      </div>

      {mostrarFormulario && (
        <form id="form-proposta" className="card form-grid" onSubmit={cadastrar}>
          <label>
            Nº da proposta
            <input name="numero" required />
          </label>

          <label>
            Cliente
            <input name="cliente" required />
          </label>

          <label>
            CPF
            <input name="cpf" />
          </label>

          <label>
            Banco
            <input name="banco" placeholder="Ex.: Master, Neo, C6..." />
          </label>

          <label>
            Produto
            <select name="produto" defaultValue="Compra de Dívida">
              <option>Compra de Dívida</option>
              <option>CLT</option>
            </select>
          </label>

          <label>
            Consultora
            <input name="consultora" placeholder="Nome da consultora" />
          </label>

          <label>
            Valor da operação
            <input name="valorOperacao" type="number" min="0" step="0.01" />
          </label>

          <label>
            Valor líquido
            <input name="valorLiquido" type="number" min="0" step="0.01" />
          </label>

          <label>
            Data de digitação
            <input name="dataDigitacao" type="date" required />
          </label>

          <label>
            Data de pagamento
            <input name="dataPagamento" type="date" />
          </label>

          <label>
            Status
            <select name="status" defaultValue="Digitado">
              <option>Digitado</option>
              <option>Aguardando pagamento</option>
              <option>Pago</option>
              <option>Cancelado</option>
            </select>
          </label>

          <label className="full-width">
            Observações
            <textarea
              name="observacoes"
              rows={3}
              placeholder="Informações importantes sobre a proposta..."
            />
          </label>

          <div className="form-actions full-width">
            <button className="button" type="submit">
              {editandoId ? "Salvar alterações" : "Salvar proposta"}
            </button>
          </div>
        </form>
      )}

      <div className="summary-line">
        <strong>{filtradas.length}</strong> proposta(s) encontrada(s)
      </div>

      <div className="table-wrap">
        <table className="proposal-table">
          <thead>
            <tr>
              <th>Nº proposta</th>
              <th>Cliente</th>
              <th>Produto</th>
              <th>Banco</th>
              <th>Valor líquido</th>
              <th>Consultora</th>
              <th>Digitação</th>
              <th>Competência</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={10}>Nenhuma proposta cadastrada.</td>
              </tr>
            ) : (
              filtradas.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.numero}</strong></td>
                  <td>
                    <strong>{item.cliente}</strong>
                    <small className="table-subtext">{item.cpf || "CPF não informado"}</small>
                  </td>
                  <td>{item.produto}</td>
                  <td>{item.banco || "—"}</td>
                  <td>{moeda(item.valorLiquido)}</td>
                  <td>{item.consultora || "—"}</td>
                  <td>{formatarData(item.dataDigitacao)}</td>
                  <td>{competencia(item.dataDigitacao)}</td>
                  <td>
                    <select
                      className={`status-select status-${item.status
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}
                      value={item.status}
                      onChange={(evento) =>
                        atualizarStatus(
                          item.id,
                          evento.target.value as StatusProposta
                        )
                      }
                    >
                      <option>Digitado</option>
                      <option>Aguardando pagamento</option>
                      <option>Pago</option>
                      <option>Cancelado</option>
                    </select>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="table-action" onClick={() => editar(item)}>
                        Editar
                      </button>
                      <button className="danger-link" onClick={() => excluir(item.id)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
