"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import "./clientes.css";

type Cliente = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  cidade: string;
  estado: string;
  banco: string;
  produto: string;
  consultora: string;
  status: string;
  observacoes: string;
  criadoEm: string;
  atualizadoEm: string;
};

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
  status: string;
  dataCadastro: string;
  dataPagamento: string;
  observacao: string;
};

const STATUS_CLIENTE = [
  "Ativo",
  "Em negociação",
  "Aguardando retorno",
  "Sem interesse",
  "Finalizado",
];

const PRODUTOS = [
  "Compra de Dívida",
  "CLT",
  "INSS",
  "Servidor",
  "Portabilidade",
  "Cartão consignado",
  "Outro",
];

const vazio = {
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
  cidade: "",
  estado: "",
  banco: "",
  produto: "Compra de Dívida",
  consultora: "",
  status: "Ativo",
  observacoes: "",
};

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

function formatarTelefone(valor: string) {
  const digitos = apenasNumeros(valor).slice(0, 11);

  if (digitos.length <= 10) {
    return digitos
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digitos
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ClientManager() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [form, setForm] = useState(vazio);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Cliente | null>(null);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  function carregar() {
    const clientesSalvos = localStorage.getItem("somos-eleva-clientes");
    const propostasSalvas = localStorage.getItem("somos-eleva-propostas");

    if (clientesSalvos) {
      try {
        setClientes(JSON.parse(clientesSalvos));
      } catch {
        setClientes([]);
      }
    }

    if (propostasSalvas) {
      try {
        setPropostas(JSON.parse(propostasSalvas));
      } catch {
        setPropostas([]);
      }
    }
  }

  function persistir(lista: Cliente[]) {
    setClientes(lista);
    localStorage.setItem("somos-eleva-clientes", JSON.stringify(lista));
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoNumerico = apenasNumeros(busca);

    return clientes.filter((cliente) => {
      const statusOk =
        filtroStatus === "Todos" || cliente.status === filtroStatus;

      const buscaOk =
        !termo ||
        cliente.nome.toLowerCase().includes(termo) ||
        cliente.cpf.includes(termoNumerico) ||
        cliente.telefone.includes(termoNumerico) ||
        cliente.consultora.toLowerCase().includes(termo) ||
        cliente.banco.toLowerCase().includes(termo);

      return statusOk && buscaOk;
    });
  }, [clientes, busca, filtroStatus]);

  const resumo = useMemo(() => {
    return {
      total: clientes.length,
      ativos: clientes.filter((item) => item.status === "Ativo").length,
      negociacao: clientes.filter((item) => item.status === "Em negociação").length,
      retorno: clientes.filter((item) => item.status === "Aguardando retorno").length,
      finalizados: clientes.filter((item) => item.status === "Finalizado").length,
    };
  }, [clientes]);

  function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem("");

    if (!form.nome.trim()) {
      setMensagem("Informe o nome do cliente.");
      return;
    }

    const cpfLimpo = apenasNumeros(form.cpf);

    if (cpfLimpo && cpfLimpo.length !== 11) {
      setMensagem("O CPF precisa ter 11 números.");
      return;
    }

    const cpfDuplicado = clientes.some(
      (item) => item.cpf === cpfLimpo && item.id !== editandoId
    );

    if (cpfLimpo && cpfDuplicado) {
      setMensagem("Já existe um cliente cadastrado com esse CPF.");
      return;
    }

    const agora = new Date().toLocaleString("pt-BR");
    const antigo = clientes.find((item) => item.id === editandoId);

    const cliente: Cliente = {
      id: editandoId || crypto.randomUUID(),
      nome: form.nome.trim(),
      cpf: cpfLimpo,
      telefone: apenasNumeros(form.telefone),
      email: form.email.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado.trim().toUpperCase(),
      banco: form.banco.trim(),
      produto: form.produto,
      consultora: form.consultora.trim(),
      status: form.status,
      observacoes: form.observacoes.trim(),
      criadoEm: antigo?.criadoEm || agora,
      atualizadoEm: agora,
    };

    const atualizados = editandoId
      ? clientes.map((item) => (item.id === editandoId ? cliente : item))
      : [cliente, ...clientes];

    persistir(atualizados);
    setForm(vazio);
    setEditandoId(null);
    setMensagem(
      editandoId
        ? "Cliente atualizado com sucesso."
        : "Cliente cadastrado com sucesso."
    );
  }

  function editar(cliente: Cliente) {
    setEditandoId(cliente.id);
    setForm({
      nome: cliente.nome,
      cpf: formatarCpf(cliente.cpf),
      telefone: formatarTelefone(cliente.telefone),
      email: cliente.email,
      cidade: cliente.cidade,
      estado: cliente.estado,
      banco: cliente.banco,
      produto: cliente.produto,
      consultora: cliente.consultora,
      status: cliente.status,
      observacoes: cliente.observacoes,
    });
    setDetalhe(null);
    setMensagem("Editando cliente selecionado.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function excluir(id: string) {
    const confirmar = window.confirm("Deseja realmente excluir este cliente?");
    if (!confirmar) return;

    persistir(clientes.filter((item) => item.id !== id));
    setDetalhe(null);

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

  function propostasDoCliente(cliente: Cliente) {
    const cpf = apenasNumeros(cliente.cpf);

    return propostas.filter((proposta) => {
      if (cpf && proposta.cpf === cpf) return true;

      return (
        !cpf &&
        proposta.cliente.trim().toLowerCase() === cliente.nome.trim().toLowerCase()
      );
    });
  }

  const propostasDetalhe = detalhe ? propostasDoCliente(detalhe) : [];
  const valorTotalDetalhe = propostasDetalhe.reduce(
    (total, item) => total + Number(item.valorContrato || 0),
    0
  );

  return (
    <div className="client-page">
      <section className="client-summary">
        <article>
          <span>Total de clientes</span>
          <strong>{resumo.total}</strong>
        </article>
        <article>
          <span>Ativos</span>
          <strong>{resumo.ativos}</strong>
        </article>
        <article>
          <span>Em negociação</span>
          <strong>{resumo.negociacao}</strong>
        </article>
        <article>
          <span>Aguardando retorno</span>
          <strong>{resumo.retorno}</strong>
        </article>
        <article className="client-summary-final">
          <span>Finalizados</span>
          <strong>{resumo.finalizados}</strong>
        </article>
      </section>

      <section className="client-layout">
        <form className="client-form" onSubmit={salvar}>
          <div className="client-form-heading">
            <div>
              <span>{editandoId ? "EDITAR CLIENTE" : "NOVO CLIENTE"}</span>
              <h2>{editandoId ? "Atualizar cadastro" : "Cadastrar cliente"}</h2>
              <p>Centralize informações, histórico e responsável pelo atendimento.</p>
            </div>
            <div className="client-form-badge">+</div>
          </div>

          <div className="client-form-grid">
            <label>
              Nome completo
              <input
                value={form.nome}
                onChange={(event) =>
                  setForm({ ...form, nome: event.target.value })
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
                  setForm({
                    ...form,
                    telefone: formatarTelefone(event.target.value),
                  })
                }
                placeholder="(62) 99999-9999"
                inputMode="numeric"
              />
            </label>

            <label>
              E-mail
              <input
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder="cliente@email.com"
                type="email"
              />
            </label>

            <label>
              Cidade
              <input
                value={form.cidade}
                onChange={(event) =>
                  setForm({ ...form, cidade: event.target.value })
                }
                placeholder="Cidade"
              />
            </label>

            <label>
              Estado
              <input
                value={form.estado}
                onChange={(event) =>
                  setForm({
                    ...form,
                    estado: event.target.value.slice(0, 2).toUpperCase(),
                  })
                }
                placeholder="GO"
                maxLength={2}
              />
            </label>

            <label>
              Banco principal
              <input
                value={form.banco}
                onChange={(event) =>
                  setForm({ ...form, banco: event.target.value })
                }
                placeholder="Ex.: NEO"
              />
            </label>

            <label>
              Produto
              <select
                value={form.produto}
                onChange={(event) =>
                  setForm({ ...form, produto: event.target.value })
                }
              >
                {PRODUTOS.map((produto) => (
                  <option key={produto}>{produto}</option>
                ))}
              </select>
            </label>

            <label>
              Consultora responsável
              <input
                value={form.consultora}
                onChange={(event) =>
                  setForm({ ...form, consultora: event.target.value })
                }
                placeholder="Nome da consultora"
              />
            </label>

            <label>
              Status do cliente
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value })
                }
              >
                {STATUS_CLIENTE.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="client-observations">
            Observações
            <textarea
              value={form.observacoes}
              onChange={(event) =>
                setForm({ ...form, observacoes: event.target.value })
              }
              placeholder="Informações importantes sobre o atendimento"
            />
          </label>

          {mensagem && <div className="client-message">{mensagem}</div>}

          <div className="client-actions">
            {editandoId && (
              <button type="button" className="cancel" onClick={cancelarEdicao}>
                Cancelar edição
              </button>
            )}
            <button type="submit" className="save">
              {editandoId ? "Atualizar cliente" : "Salvar cliente"}
            </button>
          </div>
        </form>

        <section className="client-list-card">
          <div className="client-list-heading">
            <div>
              <span>CARTEIRA DE CLIENTES</span>
              <h2>Clientes cadastrados</h2>
            </div>
            <b>{filtrados.length}</b>
          </div>

          <div className="client-filters">
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar por nome, CPF, telefone, banco ou consultora"
            />

            <select
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
            >
              <option>Todos</option>
              {STATUS_CLIENTE.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          {filtrados.length === 0 ? (
            <div className="client-empty">
              <div>♙</div>
              <strong>Nenhum cliente encontrado</strong>
              <p>Cadastre o primeiro cliente ou altere os filtros.</p>
            </div>
          ) : (
            <div className="client-list">
              {filtrados.map((cliente) => {
                const quantidadePropostas = propostasDoCliente(cliente).length;

                return (
                  <article key={cliente.id}>
                    <div className="client-item-top">
                      <div>
                        <strong>{cliente.nome}</strong>
                        <span>
                          {cliente.cpf
                            ? formatarCpf(cliente.cpf)
                            : "CPF não informado"}
                        </span>
                      </div>

                      <span
                        className={`client-status status-${cliente.status
                          .toLowerCase()
                          .replace(/\s/g, "-")
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")}`}
                      >
                        {cliente.status}
                      </span>
                    </div>

                    <div className="client-tags">
                      <span>{cliente.produto}</span>
                      {cliente.banco && <span>{cliente.banco}</span>}
                    </div>

                    <div className="client-values">
                      <div>
                        <small>Consultora</small>
                        <b>{cliente.consultora || "Não informada"}</b>
                      </div>
                      <div>
                        <small>Telefone</small>
                        <b>
                          {cliente.telefone
                            ? formatarTelefone(cliente.telefone)
                            : "Não informado"}
                        </b>
                      </div>
                      <div>
                        <small>Propostas</small>
                        <b>{quantidadePropostas}</b>
                      </div>
                    </div>

                    <footer>
                      <span>Atualizado em {cliente.atualizadoEm}</span>
                      <div>
                        <button onClick={() => setDetalhe(cliente)}>
                          Abrir
                        </button>
                        <button onClick={() => editar(cliente)}>Editar</button>
                        <button
                          className="delete"
                          onClick={() => excluir(cliente.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <section className="client-help">
        <strong>Integração ativa:</strong>
        <span>
          o sistema encontra automaticamente as propostas vinculadas ao mesmo CPF.
        </span>
      </section>

      {detalhe && (
        <div className="client-modal-overlay" onClick={() => setDetalhe(null)}>
          <section
            className="client-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>FICHA DO CLIENTE</span>
                <h3>{detalhe.nome}</h3>
              </div>
              <button onClick={() => setDetalhe(null)}>×</button>
            </header>

            <div className="client-modal-grid">
              <div>
                <span>CPF</span>
                <strong>
                  {detalhe.cpf ? formatarCpf(detalhe.cpf) : "Não informado"}
                </strong>
              </div>
              <div>
                <span>Telefone</span>
                <strong>
                  {detalhe.telefone
                    ? formatarTelefone(detalhe.telefone)
                    : "Não informado"}
                </strong>
              </div>
              <div>
                <span>E-mail</span>
                <strong>{detalhe.email || "Não informado"}</strong>
              </div>
              <div>
                <span>Cidade/UF</span>
                <strong>
                  {[detalhe.cidade, detalhe.estado].filter(Boolean).join(" / ") ||
                    "Não informado"}
                </strong>
              </div>
              <div>
                <span>Produto</span>
                <strong>{detalhe.produto}</strong>
              </div>
              <div>
                <span>Banco</span>
                <strong>{detalhe.banco || "Não informado"}</strong>
              </div>
              <div>
                <span>Consultora</span>
                <strong>{detalhe.consultora || "Não informada"}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{detalhe.status}</strong>
              </div>
            </div>

            <section className="client-history-summary">
              <article>
                <span>Propostas vinculadas</span>
                <strong>{propostasDetalhe.length}</strong>
              </article>
              <article>
                <span>Valor total dos contratos</span>
                <strong>{moeda(valorTotalDetalhe)}</strong>
              </article>
              <article>
                <span>Contratos pagos</span>
                <strong>
                  {
                    propostasDetalhe.filter((item) => item.status === "Pago")
                      .length
                  }
                </strong>
              </article>
            </section>

            {propostasDetalhe.length > 0 && (
              <section className="client-history">
                <h4>Histórico de propostas</h4>

                {propostasDetalhe.map((proposta) => (
                  <article key={proposta.id}>
                    <div>
                      <strong>
                        {proposta.banco || "Banco não informado"}
                        {proposta.tabela ? ` • ${proposta.tabela}` : ""}
                      </strong>
                      <span>
                        {proposta.status} • {proposta.dataCadastro}
                      </span>
                    </div>

                    <b>{moeda(proposta.valorContrato)}</b>
                  </article>
                ))}
              </section>
            )}

            {detalhe.observacoes && (
              <section className="client-modal-note">
                <span>Observações</span>
                <p>{detalhe.observacoes}</p>
              </section>
            )}

            <footer>
              <button onClick={() => editar(detalhe)}>Editar cadastro</button>
              <button onClick={() => setDetalhe(null)}>Fechar</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
