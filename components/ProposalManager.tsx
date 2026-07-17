"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import "./propostas.css";

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

const STATUS: StatusProposta[] = [
  "Solicitado",
  "Em andamento",
  "Aguardando boleto",
  "Enviado ao banco",
  "Pago",
  "Cancelado",
];

const PERCENTUAIS_RAPIDOS = [0, 1, 2, 3.25, 5, 7, 10, 16.5, 20.5, 24.5, 28.5];

function numero(valor: string) {
  const limpo = valor.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const convertido = Number(limpo);
  return Number.isFinite(convertido) ? convertido : 0;
}

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
  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

const vazio = {
  cliente: "",
  cpf: "",
  telefone: "",
  vendedora: "",
  banco: "",
  tabela: "",
  valorContrato: "",
  percentualTabela: "0",
  status: "Solicitado" as StatusProposta,
  dataPagamento: "",
  observacao: "",
};

export default function ProposalManager() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [form, setForm] = useState(vazio);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const salvo = localStorage.getItem("somos-eleva-propostas");
    if (salvo) {
      try {
        setPropostas(JSON.parse(salvo));
      } catch {
        setPropostas([]);
      }
    }

    const rascunho = localStorage.getItem("somos-eleva-rascunho-proposta");
    if (rascunho) {
      try {
        const dados = JSON.parse(rascunho);
        setForm((atual) => ({
          ...atual,
          cliente: dados.cliente || "",
          banco: dados.banco || "",
          tabela: dados.tabela || "",
          valorContrato: dados.valorLiberado
            ? String(dados.valorLiberado.toFixed(2)).replace(".", ",")
            : "",
        }));
        setMensagem("Rascunho da simulação carregado. Complete os dados da proposta.");
        localStorage.removeItem("somos-eleva-rascunho-proposta");
      } catch {
        localStorage.removeItem("somos-eleva-rascunho-proposta");
      }
    }
  }, []);

  function persistir(lista: Proposta[]) {
    setPropostas(lista);
    localStorage.setItem("somos-eleva-propostas", JSON.stringify(lista));
  }

  const valorContrato = numero(form.valorContrato);
  const percentual = numero(form.percentualTabela);
  const comissaoCalculada =
    form.status === "Pago" ? valorContrato * (percentual / 100) : 0;

  const propostasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return propostas.filter((proposta) => {
      const correspondeStatus =
        filtroStatus === "Todos" || proposta.status === filtroStatus;

      const correspondeBusca =
        !termo ||
        proposta.cliente.toLowerCase().includes(termo) ||
        proposta.cpf.includes(apenasNumeros(termo)) ||
        proposta.vendedora.toLowerCase().includes(termo) ||
        proposta.banco.toLowerCase().includes(termo);

      return correspondeStatus && correspondeBusca;
    });
  }, [propostas, busca, filtroStatus]);

  const resumo = useMemo(() => {
    const pagas = propostas.filter((item) => item.status === "Pago");
    const valorPago = pagas.reduce((total, item) => total + item.valorContrato, 0);
    const comissoes = pagas.reduce((total, item) => total + item.comissao, 0);
    const emAndamento = propostas.filter(
      (item) =>
        item.status !== "Pago" &&
        item.status !== "Cancelado"
    ).length;

    return {
      total: propostas.length,
      pagas: pagas.length,
      emAndamento,
      valorPago,
      comissoes,
    };
  }, [propostas]);

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem("");

    if (!form.cliente.trim()) {
      setMensagem("Informe o nome do cliente.");
      return;
    }

    if (valorContrato <= 0) {
      setMensagem("Informe o valor total do contrato.");
      return;
    }

    if (form.status === "Pago" && percentual <= 0) {
      setMensagem("Selecione ou informe a porcentagem da tabela para contrato pago.");
      return;
    }

    const proposta: Proposta = {
      id: editandoId || crypto.randomUUID(),
      cliente: form.cliente.trim(),
      cpf: apenasNumeros(form.cpf),
      telefone: form.telefone.trim(),
      vendedora: form.vendedora.trim(),
      banco: form.banco.trim(),
      tabela: form.tabela.trim(),
      valorContrato,
      percentualTabela: percentual,
      comissao: comissaoCalculada,
      status: form.status,
      dataCadastro:
        editandoId
          ? propostas.find((item) => item.id === editandoId)?.dataCadastro ||
            new Date().toLocaleString("pt-BR")
          : new Date().toLocaleString("pt-BR"),
      dataPagamento:
        form.status === "Pago"
          ? form.dataPagamento || hojeIso()
          : "",
      observacao: form.observacao.trim(),
    };

    const atualizadas = editandoId
      ? propostas.map((item) => (item.id === editandoId ? proposta : item))
      : [proposta, ...propostas];

    persistir(atualizadas);
    setForm(vazio);
    setEditandoId(null);
    setMensagem(
      editandoId
        ? "Proposta atualizada com sucesso."
        : "Proposta cadastrada com sucesso."
    );
  }

  function editar(proposta: Proposta) {
    setEditandoId(proposta.id);
    setForm({
      cliente: proposta.cliente,
      cpf: formatarCpf(proposta.cpf),
      telefone: proposta.telefone,
      vendedora: proposta.vendedora,
      banco: proposta.banco,
      tabela: proposta.tabela,
      valorContrato: proposta.valorContrato.toFixed(2).replace(".", ","),
      percentualTabela: String(proposta.percentualTabela).replace(".", ","),
      status: proposta.status,
      dataPagamento: proposta.dataPagamento,
      observacao: proposta.observacao,
    });
    setMensagem("Editando proposta selecionada.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function excluir(id: string) {
    const confirmar = window.confirm("Deseja realmente excluir esta proposta?");
    if (!confirmar) return;

    persistir(propostas.filter((item) => item.id !== id));
    if (editandoId === id) {
      setEditandoId(null);
      setForm(vazio);
    }
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(vazio);
    setMensagem("");
  }

  return (
    <div className="proposal-page">
      <section className="proposal-summary">
        <article>
          <span>Total de propostas</span>
          <strong>{resumo.total}</strong>
        </article>
        <article>
          <span>Em andamento</span>
          <strong>{resumo.emAndamento}</strong>
        </article>
        <article>
          <span>Contratos pagos</span>
          <strong>{resumo.pagas}</strong>
        </article>
        <article>
          <span>Valor pago</span>
          <strong>{moeda(resumo.valorPago)}</strong>
        </article>
        <article className="commission-summary">
          <span>Comissões calculadas</span>
          <strong>{moeda(resumo.comissoes)}</strong>
        </article>
      </section>

      <section className="proposal-layout">
        <form className="proposal-form" onSubmit={enviar}>
          <div className="proposal-form-heading">
            <div>
              <span>{editandoId ? "EDITAR PROPOSTA" : "NOVA PROPOSTA"}</span>
              <h2>{editandoId ? "Atualizar contrato" : "Cadastrar contrato"}</h2>
              <p>
                A comissão é calculada automaticamente apenas quando o status for Pago.
              </p>
            </div>
            <div className="proposal-form-badge">%</div>
          </div>

          <div className="proposal-form-grid">
            <label>
              Nome do cliente
              <input
                value={form.cliente}
                onChange={(event) =>
                  setForm({ ...form, cliente: event.target.value })
                }
                placeholder="Digite o nome completo"
              />
            </label>

            <label>
              CPF
              <input
                value={form.cpf}
                onChange={(event) =>
                  setForm({ ...form, cpf: formatarCpf(event.target.value) })
                }
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </label>

            <label>
              Telefone
              <input
                value={form.telefone}
                onChange={(event) =>
                  setForm({ ...form, telefone: event.target.value })
                }
                placeholder="(62) 99999-9999"
              />
            </label>

            <label>
              Vendedora
              <input
                value={form.vendedora}
                onChange={(event) =>
                  setForm({ ...form, vendedora: event.target.value })
                }
                placeholder="Nome da consultora"
              />
            </label>

            <label>
              Banco
              <input
                value={form.banco}
                onChange={(event) =>
                  setForm({ ...form, banco: event.target.value })
                }
                placeholder="Ex.: NEO"
              />
            </label>

            <label>
              Tabela utilizada
              <input
                value={form.tabela}
                onChange={(event) =>
                  setForm({ ...form, tabela: event.target.value })
                }
                placeholder="Ex.: NEO NORMAL"
              />
            </label>

            <label>
              Valor total do contrato
              <input
                value={form.valorContrato}
                onChange={(event) =>
                  setForm({ ...form, valorContrato: event.target.value })
                }
                placeholder="Ex.: 20.000,00"
                inputMode="decimal"
              />
            </label>

            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as StatusProposta,
                    dataPagamento:
                      event.target.value === "Pago"
                        ? form.dataPagamento || hojeIso()
                        : "",
                  })
                }
              >
                {STATUS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>

          {form.status === "Pago" && (
            <section className="paid-section">
              <div className="paid-section-heading">
                <div>
                  <span>CONTRATO PAGO</span>
                  <h3>Tabela e comissão</h3>
                </div>
                <strong>{moeda(comissaoCalculada)}</strong>
              </div>

              <div className="paid-grid">
                <label>
                  Porcentagem da tabela
                  <select
                    value={form.percentualTabela}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        percentualTabela: event.target.value,
                      })
                    }
                  >
                    {PERCENTUAIS_RAPIDOS.map((item) => (
                      <option key={item} value={item}>
                        {String(item).replace(".", ",")}%
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Digitar outra porcentagem
                  <input
                    value={form.percentualTabela}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        percentualTabela: event.target.value,
                      })
                    }
                    placeholder="Ex.: 3,25"
                    inputMode="decimal"
                  />
                </label>

                <label>
                  Data do pagamento
                  <input
                    type="date"
                    value={form.dataPagamento}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        dataPagamento: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="commission-calculation">
                <div>
                  <span>Valor do contrato</span>
                  <strong>{moeda(valorContrato)}</strong>
                </div>
                <div className="formula">×</div>
                <div>
                  <span>Percentual</span>
                  <strong>{percentual.toFixed(2).replace(".", ",")}%</strong>
                </div>
                <div className="formula">=</div>
                <div className="commission-result">
                  <span>Comissão</span>
                  <strong>{moeda(comissaoCalculada)}</strong>
                </div>
              </div>
            </section>
          )}

          <label className="proposal-observation">
            Observações
            <textarea
              value={form.observacao}
              onChange={(event) =>
                setForm({ ...form, observacao: event.target.value })
              }
              placeholder="Informações importantes sobre o contrato"
            />
          </label>

          {mensagem && <div className="proposal-message">{mensagem}</div>}

          <div className="proposal-actions">
            {editandoId && (
              <button type="button" className="cancel" onClick={cancelarEdicao}>
                Cancelar edição
              </button>
            )}
            <button type="submit" className="save">
              {editandoId ? "Atualizar proposta" : "Salvar proposta"}
            </button>
          </div>
        </form>

        <section className="proposal-list-card">
          <div className="proposal-list-heading">
            <div>
              <span>ACOMPANHAMENTO</span>
              <h2>Propostas cadastradas</h2>
            </div>
            <b>{propostasFiltradas.length}</b>
          </div>

          <div className="proposal-filters">
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar cliente, CPF, vendedora ou banco"
            />
            <select
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
            >
              <option>Todos</option>
              {STATUS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          {propostasFiltradas.length === 0 ? (
            <div className="proposal-empty">
              <div>▤</div>
              <strong>Nenhuma proposta encontrada</strong>
              <p>Cadastre a primeira proposta ou altere os filtros.</p>
            </div>
          ) : (
            <div className="proposal-list">
              {propostasFiltradas.map((proposta) => (
                <article key={proposta.id}>
                  <div className="proposal-item-top">
                    <div>
                      <strong>{proposta.cliente}</strong>
                      <span>
                        {proposta.banco || "Banco não informado"}
                        {proposta.tabela ? ` • ${proposta.tabela}` : ""}
                      </span>
                    </div>
                    <span
                      className={`status status-${proposta.status
                        .toLowerCase()
                        .replace(/\s/g, "-")
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")}`}
                    >
                      {proposta.status}
                    </span>
                  </div>

                  <div className="proposal-item-values">
                    <div>
                      <small>Contrato</small>
                      <b>{moeda(proposta.valorContrato)}</b>
                    </div>
                    <div>
                      <small>Tabela</small>
                      <b>
                        {proposta.status === "Pago"
                          ? `${String(proposta.percentualTabela).replace(".", ",")}%`
                          : "—"}
                      </b>
                    </div>
                    <div>
                      <small>Comissão</small>
                      <b>{moeda(proposta.comissao)}</b>
                    </div>
                  </div>

                  <div className="proposal-item-footer">
                    <span>
                      {proposta.vendedora || "Vendedora não informada"} •{" "}
                      {proposta.dataCadastro}
                    </span>
                    <div>
                      <button onClick={() => editar(proposta)}>Editar</button>
                      <button className="delete" onClick={() => excluir(proposta.id)}>
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="proposal-note">
        <strong>Como funciona:</strong>
        <span>
          quando o status for <b>Pago</b>, informe a porcentagem da tabela. O
          sistema calcula: valor total do contrato × percentual.
        </span>
      </section>
    </div>
  );
}
