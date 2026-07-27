"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type StatusProposta =
  | "Digitado"
  | "Aguardando pagamento"
  | "Pago"
  | "Cancelado";

type Produto = "Compra de Dívida" | "CLT";

type PropostaBanco = {
  id: string;
  numero: string;
  cliente: string;
  cpf: string | null;
  banco: string | null;
  produto: Produto;
  valor_operacao: number | string | null;
  valor_liquido: number | string | null;
  consultora: string | null;
  data_digitacao: string;
  data_pagamento: string | null;
  status: StatusProposta;
  observacoes: string | null;
  tabela: string | null;
  comissao_prevista: number | string | null;
  valor_recebido: number | string | null;
  percentual_comissao: number | string | null;
  diferenca: number | string | null;
  status_financeiro: string | null;
  origem: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

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
};

function converterProposta(item: PropostaBanco): Proposta {
  return {
    id: item.id,
    numero: item.numero || "",
    cliente: item.cliente || "",
    cpf: item.cpf || "",
    banco: item.banco || "",
    produto: item.produto,
    valorOperacao: Number(item.valor_operacao || 0),
    valorLiquido: Number(item.valor_liquido || 0),
    consultora: item.consultora || "",
    dataDigitacao: item.data_digitacao || "",
    dataPagamento: item.data_pagamento || "",
    status: item.status,
    observacoes: item.observacoes || "",
  };
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string) {
  if (!data) return "—";

  const partes = data.split("-");

  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function competencia(dataDigitacao: string) {
  if (!dataDigitacao) return "—";

  const [ano, mes] = dataDigitacao.split("-");

  if (!ano || !mes) return "—";

  return `${mes}/${ano}`;
}

export default function ProposalManager() {
  const supabase = useMemo(() => createClient(), []);

  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroProduto, setFiltroProduto] = useState("Todos");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregarPropostas = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const lista = (data || []).map((item) =>
        converterProposta(item as PropostaBanco)
      );

      setPropostas(lista);
    } catch (error) {
      console.error("Erro ao carregar propostas:", error);

      setErro(
        "Não foi possível carregar as propostas. Atualize a página e tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }, [supabase]);

  useEffect(() => {
    carregarPropostas();
  }, [carregarPropostas]);

  async function cadastrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setErro("");
    setMensagem("");
    setSalvando(true);

    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);

    const numero = String(dados.get("numero") || "").trim();
    const cliente = String(dados.get("cliente") || "").trim();
    const cpf = String(dados.get("cpf") || "").trim();
    const banco = String(dados.get("banco") || "").trim();
    const produto = String(dados.get("produto")) as Produto;
    const valorOperacao = Number(dados.get("valorOperacao") || 0);
    const valorLiquido = Number(dados.get("valorLiquido") || 0);
    const consultora = String(dados.get("consultora") || "").trim();
    const dataDigitacao = String(dados.get("dataDigitacao") || "");
    const dataPagamentoInformada = String(
      dados.get("dataPagamento") || ""
    );
    const status = String(dados.get("status")) as StatusProposta;
    const observacoes = String(
      dados.get("observacoes") || ""
    ).trim();

    if (!numero || !cliente || !dataDigitacao) {
      setErro(
        "Preencha o número da proposta, o cliente e a data de digitação."
      );
      setSalvando(false);
      return;
    }

    let dataPagamento = dataPagamentoInformada || null;

    if (status === "Pago" && !dataPagamento) {
      dataPagamento = new Date().toISOString().slice(0, 10);
    }

    try {
      const {
        data: dadosUsuario,
        error: erroUsuario,
      } = await supabase.auth.getUser();

      if (erroUsuario || !dadosUsuario.user) {
        throw new Error("Usuário não autenticado.");
      }

      const registro = {
        numero,
        cliente,
        cpf: cpf || null,
        banco: banco || null,
        produto,
        valor_operacao: valorOperacao,
        valor_liquido: valorLiquido,
        consultora: consultora || null,
        data_digitacao: dataDigitacao,
        data_pagamento: dataPagamento,
        status,
        observacoes: observacoes || null,
        origem: "Manual",
        criado_por: dadosUsuario.user.id,
      };

      if (editandoId) {
        const { error } = await supabase
          .from("propostas")
          .update({
            numero: registro.numero,
            cliente: registro.cliente,
            cpf: registro.cpf,
            banco: registro.banco,
            produto: registro.produto,
            valor_operacao: registro.valor_operacao,
            valor_liquido: registro.valor_liquido,
            consultora: registro.consultora,
            data_digitacao: registro.data_digitacao,
            data_pagamento: registro.data_pagamento,
            status: registro.status,
            observacoes: registro.observacoes,
            origem: registro.origem,
          })
          .eq("id", editandoId);

        if (error) {
          if (error.code === "23505") {
            throw new Error(
              "Já existe uma proposta com este número."
            );
          }

          throw error;
        }

        setMensagem("Proposta atualizada com sucesso.");
      } else {
        const { error } = await supabase
          .from("propostas")
          .insert(registro);

        if (error) {
          if (error.code === "23505") {
            throw new Error(
              "Já existe uma proposta com este número."
            );
          }

          throw error;
        }

        setMensagem("Proposta cadastrada com sucesso.");
      }

      setEditandoId(null);
      setMostrarFormulario(false);
      formulario.reset();

      await carregarPropostas();
    } catch (error) {
      console.error("Erro ao salvar proposta:", error);

      const mensagemErro =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a proposta.";

      setErro(mensagemErro);
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarStatus(
    id: string,
    novoStatus: StatusProposta
  ) {
    setErro("");
    setMensagem("");

    const propostaAtual = propostas.find((item) => item.id === id);

    if (!propostaAtual) return;

    const hoje = new Date().toISOString().slice(0, 10);

    const dataPagamento =
      novoStatus === "Pago" && !propostaAtual.dataPagamento
        ? hoje
        : propostaAtual.dataPagamento || null;

    const propostasAnteriores = propostas;

    setPropostas((lista) =>
      lista.map((item) =>
        item.id === id
          ? {
              ...item,
              status: novoStatus,
              dataPagamento: dataPagamento || "",
            }
          : item
      )
    );

    try {
      const { error } = await supabase
        .from("propostas")
        .update({
          status: novoStatus,
          data_pagamento: dataPagamento,
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      setMensagem("Status atualizado com sucesso.");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);

      setPropostas(propostasAnteriores);

      setErro(
        "Não foi possível atualizar o status da proposta."
      );
    }
  }

  async function excluir(id: string) {
    const confirmar = window.confirm(
      "Deseja realmente excluir esta proposta?"
    );

    if (!confirmar) return;

    setErro("");
    setMensagem("");

    try {
      const { error } = await supabase
        .from("propostas")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setPropostas((lista) =>
        lista.filter((item) => item.id !== id)
      );

      setMensagem("Proposta excluída com sucesso.");
    } catch (error) {
      console.error("Erro ao excluir proposta:", error);

      setErro(
        "Não foi possível excluir a proposta. Tente novamente."
      );
    }
  }

  function editar(proposta: Proposta) {
    setErro("");
    setMensagem("");
    setEditandoId(proposta.id);
    setMostrarFormulario(true);

    setTimeout(() => {
      const form =
        document.querySelector<HTMLFormElement>("#form-proposta");

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

        if (campo) {
          campo.value = valor;
        }
      });

      form.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setMostrarFormulario(false);
    setErro("");
    setMensagem("");
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
        filtroProduto === "Todos" ||
        item.produto === filtroProduto;

      return bateBusca && bateStatus && bateProduto;
    });
  }, [propostas, busca, filtroStatus, filtroProduto]);

  const totais = useMemo(() => {
    const pagas = propostas.filter(
      (item) => item.status === "Pago"
    );

    const aguardando = propostas.filter(
      (item) => item.status === "Aguardando pagamento"
    );

    return {
      quantidade: propostas.length,

      pago: pagas.reduce(
        (soma, item) => soma + Number(item.valorLiquido || 0),
        0
      ),

      pendente: aguardando.reduce(
        (soma, item) => soma + Number(item.valorLiquido || 0),
        0
      ),
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

      {erro && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 10,
            background: "#fff1f1",
            color: "#b42318",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {erro}
        </div>
      )}

      {mensagem && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 10,
            background: "#ecfdf3",
            color: "#067647",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {mensagem}
        </div>
      )}

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
            onChange={(evento) =>
              setFiltroStatus(evento.target.value)
            }
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
            onChange={(evento) =>
              setFiltroProduto(evento.target.value)
            }
          >
            <option>Todos</option>
            <option>Compra de Dívida</option>
            <option>CLT</option>
          </select>
        </div>

        <button
          type="button"
          className="button"
          onClick={() => {
            if (mostrarFormulario) {
              cancelarEdicao();
              return;
            }

            setEditandoId(null);
            setMostrarFormulario(true);
            setErro("");
            setMensagem("");
          }}
        >
          {mostrarFormulario ? "Fechar" : "+ Nova proposta"}
        </button>
      </div>

      {mostrarFormulario && (
        <form
          id="form-proposta"
          className="card form-grid"
          onSubmit={cadastrar}
        >
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
            <input
              name="banco"
              placeholder="Ex.: Master, Neo, C6..."
            />
          </label>

          <label>
            Produto
            <select
              name="produto"
              defaultValue="Compra de Dívida"
            >
              <option>Compra de Dívida</option>
              <option>CLT</option>
            </select>
          </label>

          <label>
            Consultora
            <input
              name="consultora"
              placeholder="Nome da consultora"
            />
          </label>

          <label>
            Valor da operação
            <input
              name="valorOperacao"
              type="number"
              min="0"
              step="0.01"
            />
          </label>

          <label>
            Valor líquido
            <input
              name="valorLiquido"
              type="number"
              min="0"
              step="0.01"
            />
          </label>

          <label>
            Data de digitação
            <input
              name="dataDigitacao"
              type="date"
              required
            />
          </label>

          <label>
            Data de pagamento
            <input
              name="dataPagamento"
              type="date"
            />
          </label>

          <label>
            Status
            <select
              name="status"
              defaultValue="Digitado"
            >
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
            <button
              className="button"
              type="submit"
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : editandoId
                  ? "Salvar alterações"
                  : "Salvar proposta"}
            </button>

            {editandoId && (
              <button
                type="button"
                className="table-action"
                onClick={cancelarEdicao}
                disabled={salvando}
              >
                Cancelar edição
              </button>
            )}
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
            {carregando ? (
              <tr>
                <td colSpan={10}>
                  Carregando propostas...
                </td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  Nenhuma proposta cadastrada.
                </td>
              </tr>
            ) : (
              filtradas.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.numero}</strong>
                  </td>

                  <td>
                    <strong>{item.cliente}</strong>

                    <small className="table-subtext">
                      {item.cpf || "CPF não informado"}
                    </small>
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
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => editar(item)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="danger-link"
                        onClick={() => excluir(item.id)}
                      >
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