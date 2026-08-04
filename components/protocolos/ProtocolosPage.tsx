"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import "./protocolos.css";

type Protocolo = {
  id: string;
  cliente_id?: string | null;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  numero_protocolo: string;
  segundo_protocolo: string;
  data_ligacao: string;
  data_limite: string;
  ultima_ligacao?: string | null;
  proxima_ligacao?: string | null;
  matricula: string;
  senha_portal: string;
  governo: string;
  margem: number;
  consultora_id?: string | null;
  consultora: string;
  status: string;
  observacao: string;
  criado_em: string;
};

type Historico = {
  id: string;
  protocolo_id: string;
  tipo: string;
  descricao: string;
  numero_protocolo: string;
  data_contato: string;
  registrado_por_nome: string;
  criado_em: string;
};

type ClienteApi = {
  id: string;
  nome: string;
  cpf: string;
  telefone?: string;
  email?: string;
  matricula?: string;
  convenioEstado?: string;
  consultora?: string;
};

type ConsultoraApi = {
  id?: string;
  nome?: string;
};
type FiltroPrazo =
  | "TODOS"
  | "ATE_15"
  | "ACIMA_15"
  | "ACIMA_30";

const STATUS = [
  "AG. BOLETO",
  "EM ACOMPANHAMENTO",
  "PROTOCOLO RENOVADO",
  "BOLETO RECEBIDO",
  "FINALIZADO",
  "CANCELADO",
];

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function apenasNumeros(valor: unknown) {
  return String(valor || "").replace(/\D/g, "");
}

function formatarCpf(valor: unknown) {
  return apenasNumeros(valor)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function moeda(valor: unknown) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(valor?: string | null) {
  if (!valor) return "—";
  const data = String(valor).slice(0, 10).split("-");
  if (data.length !== 3) return String(valor);
  return `${data[2]}/${data[1]}/${data[0]}`;
}

function diasRestantes(dataLimite?: string) {
  if (!dataLimite) return 0;
  const hoje = new Date(`${hojeIso()}T00:00:00`);
  const limite = new Date(`${dataLimite.slice(0, 10)}T00:00:00`);
  return Math.ceil((limite.getTime() - hoje.getTime()) / 86400000);
}
function diasDeAtraso(dataLimite?: string) {
  const dias = diasRestantes(dataLimite);

  return dias < 0 ? Math.abs(dias) : 0;
}
const FORM_VAZIO = {
  clienteId: "",
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
  numeroProtocolo: "",
  dataLigacao: hojeIso(),
  matricula: "",
  senhaPortal: "",
  governo: "",
  margem: "",
  consultoraId: "",
  consultora: "",
  status: "AG. BOLETO",
  observacao: "",
};

export default function ProtocolosPage() {
  const supabase = useMemo(() => createClient(), []);

  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [clientes, setClientes] = useState<ClienteApi[]>([]);
  const [consultoras, setConsultoras] = useState<ConsultoraApi[]>([]);

  const [busca, setBusca] = useState("");
const [filtroStatus, setFiltroStatus] = useState("Todos");
const [filtroConsultora, setFiltroConsultora] = useState("Todas");
const [filtroPrazo, setFiltroPrazo] =
  useState<FiltroPrazo>("TODOS");
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Protocolo | null>(null);
  const [selecionado, setSelecionado] = useState<Protocolo | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [cpfBusca, setCpfBusca] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [descricaoContato, setDescricaoContato] = useState("");
  const [novoNumeroProtocolo, setNovoNumeroProtocolo] = useState("");
  const [proximaLigacao, setProximaLigacao] = useState("");
  const [tipoContato, setTipoContato] = useState("LIGAÇÃO");

  const obterToken = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error("Sua sessão expirou. Entre novamente.");
    }

    return data.session.access_token;
  }, [supabase]);

  const carregarTudo = useCallback(async () => {
    setCarregando(true);
    setMensagem("");

    try {
      const token = await obterToken();

      const [respostaProtocolos, respostaClientes, respostaConsultoras] =
        await Promise.all([
          fetch("/api/protocolos", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch("/api/clientes", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch("/api/consultoras", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
        ]);

      const dadosProtocolos = await respostaProtocolos.json();
      const dadosClientes = await respostaClientes.json();
      const dadosConsultoras = await respostaConsultoras.json();

      if (!respostaProtocolos.ok) {
        throw new Error(
          dadosProtocolos.erro || "Não foi possível carregar os protocolos.",
        );
      }

      setProtocolos(
        Array.isArray(dadosProtocolos.protocolos)
          ? dadosProtocolos.protocolos
          : [],
      );
      setHistorico(
        Array.isArray(dadosProtocolos.historico)
          ? dadosProtocolos.historico
          : [],
      );
      setClientes(
        respostaClientes.ok && Array.isArray(dadosClientes.clientes)
          ? dadosClientes.clientes
          : [],
      );
      setConsultoras(
        respostaConsultoras.ok && Array.isArray(dadosConsultoras.consultoras)
          ? dadosConsultoras.consultoras
          : [],
      );
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar os protocolos.",
      );
    } finally {
      setCarregando(false);
    }
  }, [obterToken]);

  useEffect(() => {
    void carregarTudo();
  }, [carregarTudo]);

  const filtrados = useMemo(() => {
  const termo = busca.trim().toLowerCase();

  return protocolos.filter((item) => {
    const correspondeBusca =
      !termo ||
      [
        item.nome,
        item.cpf,
        item.numero_protocolo,
        item.segundo_protocolo,
        item.consultora,
        item.governo,
        item.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo);

    const correspondeStatus =
      filtroStatus === "Todos" ||
      item.status === filtroStatus;

    const correspondeConsultora =
      filtroConsultora === "Todas" ||
      item.consultora === filtroConsultora;

    const atraso = diasDeAtraso(item.data_limite);

    let correspondePrazo = true;

    if (filtroPrazo === "ATE_15") {
  correspondePrazo = atraso > 0 && atraso <= 15;
}

    if (filtroPrazo === "ACIMA_15") {
      correspondePrazo = atraso > 15;
    }

    if (filtroPrazo === "ACIMA_30") {
      correspondePrazo = atraso > 30;
    }

    return (
      correspondeBusca &&
      correspondeStatus &&
      correspondeConsultora &&
      correspondePrazo
    );
  });
}, [
  protocolos,
  busca,
  filtroStatus,
  filtroConsultora,
  filtroPrazo,
]);

 const resumo = useMemo(() => {
  const termo = busca.trim().toLowerCase();

  const protocolosDoResumo = protocolos.filter((item) => {
    const correspondeBusca =
      !termo ||
      [
        item.nome,
        item.cpf,
        item.numero_protocolo,
        item.segundo_protocolo,
        item.consultora,
        item.governo,
        item.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo);

    const correspondeStatus =
      filtroStatus === "Todos" ||
      item.status === filtroStatus;

    const correspondeConsultora =
      filtroConsultora === "Todas" ||
      item.consultora === filtroConsultora;

    return (
      correspondeBusca &&
      correspondeStatus &&
      correspondeConsultora
    );
  });

  const ativos = protocolosDoResumo.filter(
    (item) =>
      !["FINALIZADO", "CANCELADO"].includes(item.status),
  );

  return {
    ativos: ativos.length,

    vencendoHoje: ativos.filter(
      (item) => diasRestantes(item.data_limite) === 0,
    ).length,

    acima15: ativos.filter(
      (item) => diasDeAtraso(item.data_limite) > 15,
    ).length,

    acima30: ativos.filter(
      (item) => diasDeAtraso(item.data_limite) > 30,
    ).length,

    boletos: protocolosDoResumo.filter(
      (item) => item.status === "BOLETO RECEBIDO",
    ).length,

    finalizados: protocolosDoResumo.filter(
      (item) => item.status === "FINALIZADO",
    ).length,
  };
}, [
  protocolos,
  busca,
  filtroStatus,
  filtroConsultora,
]);

  function abrirNovo() {
    setEditando(null);
    setForm({ ...FORM_VAZIO, dataLigacao: hojeIso() });
    setCpfBusca("");
    setMensagem("");
    setModalAberto(true);
  }

  function abrirEdicao(protocolo: Protocolo) {
    setEditando(protocolo);
    setCpfBusca(formatarCpf(protocolo.cpf));
    setMensagem("");

    setForm({
      clienteId: String(protocolo.cliente_id || ""),
      nome: protocolo.nome || "",
      cpf: apenasNumeros(protocolo.cpf),
      telefone: protocolo.telefone || "",
      email: protocolo.email || "",
      numeroProtocolo: protocolo.numero_protocolo || "",
      dataLigacao: String(protocolo.data_ligacao || "").slice(0, 10),
      matricula: protocolo.matricula || "",
      senhaPortal: protocolo.senha_portal || "",
      governo: protocolo.governo || "",
      margem: String(protocolo.margem || ""),
      consultoraId: String(protocolo.consultora_id || ""),
      consultora: protocolo.consultora || "",
      status: protocolo.status || "AG. BOLETO",
      observacao: protocolo.observacao || "",
    });

    setModalAberto(true);
  }

  function localizarCliente() {
    const cpf = apenasNumeros(cpfBusca);

    if (cpf.length !== 11) {
      setMensagem("Digite um CPF completo.");
      return;
    }

    const cliente = clientes.find(
      (item) => apenasNumeros(item.cpf) === cpf,
    );

    if (!cliente) {
      setMensagem(
        "Cliente não encontrado. Cadastre-o primeiro na página Clientes.",
      );
      return;
    }

    const consultora = String(cliente.consultora || "");

    setForm((atual) => ({
      ...atual,
      clienteId: cliente.id,
      nome: cliente.nome,
      cpf,
      telefone: String(cliente.telefone || ""),
      email: String(cliente.email || ""),
      matricula: String(cliente.matricula || ""),
      governo: String(cliente.convenioEstado || ""),
      consultora,
      consultoraId:
        String(
          consultoras.find(
            (item) =>
              String(item.nome || "").toLowerCase() ===
              consultora.toLowerCase(),
          )?.id || "",
        ),
    }));

    setMensagem("Cliente encontrado. Os dados foram preenchidos.");
  }

  async function salvarProtocolo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!form.nome.trim()) {
      setMensagem("Localize o cliente pelo CPF.");
      return;
    }

    if (!form.numeroProtocolo.trim()) {
      setMensagem("Informe o número do protocolo.");
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      const token = await obterToken();

      const resposta = await fetch("/api/protocolos", {
        method: editando ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          protocolo: editando
            ? {
                ...form,
                id: editando.id,
                segundoProtocolo: editando.segundo_protocolo || "",
                ultimaLigacao: editando.ultima_ligacao || null,
                proximaLigacao: editando.proxima_ligacao || null,
              }
            : form,
        }),
      });

      const conteudo = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro || "Não foi possível salvar o protocolo.",
        );
      }

      setModalAberto(false);
      setEditando(null);
      setForm(FORM_VAZIO);
      setMensagem(
        editando
          ? "Protocolo atualizado com sucesso."
          : "Protocolo cadastrado com sucesso.",
      );
      await carregarTudo();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar o protocolo.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarStatus(
    protocolo: Protocolo,
    novoStatus: string,
  ) {
    setMensagem("");

    try {
      const token = await obterToken();

      const resposta = await fetch("/api/protocolos", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          protocolo: {
            id: protocolo.id,
            nome: protocolo.nome,
            cpf: protocolo.cpf,
            telefone: protocolo.telefone,
            email: protocolo.email,
            numeroProtocolo: protocolo.numero_protocolo,
            segundoProtocolo: protocolo.segundo_protocolo,
            dataLigacao: protocolo.data_ligacao,
            ultimaLigacao: protocolo.ultima_ligacao,
            proximaLigacao: protocolo.proxima_ligacao,
            matricula: protocolo.matricula,
            senhaPortal: protocolo.senha_portal,
            governo: protocolo.governo,
            margem: protocolo.margem,
            consultoraId: protocolo.consultora_id,
            consultora: protocolo.consultora,
            status: novoStatus,
            observacao: protocolo.observacao,
          },
        }),
      });

      const conteudo = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro || "Não foi possível atualizar o protocolo.",
        );
      }

      await carregarTudo();
      setSelecionado(
        conteudo.protocolo ? conteudo.protocolo : selecionado,
      );
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar o protocolo.",
      );
    }
  }

  async function registrarContato() {
    if (!selecionado || !descricaoContato.trim()) {
      setMensagem("Descreva o retorno recebido do banco.");
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      const token = await obterToken();

      const resposta = await fetch("/api/protocolos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "registrar_historico",
          protocoloId: selecionado.id,
          tipo: tipoContato,
          descricao: descricaoContato,
          numeroProtocolo: novoNumeroProtocolo,
          dataContato: hojeIso(),
          proximaLigacao: proximaLigacao || null,
          status: novoNumeroProtocolo
            ? "PROTOCOLO RENOVADO"
            : "EM ACOMPANHAMENTO",
        }),
      });

      const conteudo = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro || "Não foi possível registrar o contato.",
        );
      }

      setDescricaoContato("");
      setNovoNumeroProtocolo("");
      setProximaLigacao("");
      await carregarTudo();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível registrar o contato.",
      );
    } finally {
      setSalvando(false);
    }
  }

  const historicoSelecionado = selecionado
    ? historico.filter(
        (item) => item.protocolo_id === selecionado.id,
      )
    : [];

  return (
    <div className="protocolos-page">
      <section className="protocolos-cards">
        <article>
          <span>Protocolos ativos</span>
          <strong>{resumo.ativos}</strong>
        </article>
        <article>
          <span>Vencendo hoje</span>
          <strong>{resumo.vencendoHoje}</strong>
        </article>
        <article className="alerta">
  <span>Mais de 15 dias atrasados</span>
  <strong>{resumo.acima15}</strong>
</article>

<article className="alerta">
  <span>Atrasados acima de 30 dias</span>
  <strong>{resumo.acima30}</strong>
</article>
        <article>
          <span>Boletos recebidos</span>
          <strong>{resumo.boletos}</strong>
        </article>
        <article>
          <span>Finalizados</span>
          <strong>{resumo.finalizados}</strong>
        </article>
      </section>

      <section className="protocolos-toolbar">
        <div>
          <span>ACOMPANHAMENTO</span>
          <h2>Protocolos e ligações</h2>
        </div>

        <div className="protocolos-filtros">
  <input
    value={busca}
    onChange={(evento) => setBusca(evento.target.value)}
    placeholder="Cliente, CPF ou protocolo..."
  />

  <select
    value={filtroConsultora}
    onChange={(evento) =>
      setFiltroConsultora(evento.target.value)
    }
  >
    <option value="Todas">Todas as consultoras</option>

    {consultoras.map((consultora) => {
      const nome = String(consultora.nome || "");

      return (
        <option key={String(consultora.id || nome)} value={nome}>
          {nome}
        </option>
      );
    })}
  </select>

  <select
    value={filtroPrazo}
    onChange={(evento) =>
      setFiltroPrazo(evento.target.value as FiltroPrazo)
    }
  >
    <option value="TODOS">Todos os prazos</option>
    <option value="ATE_15">Até 15 dias de atraso</option>
    <option value="ACIMA_15">Mais de 15 dias atrasados</option>
<option value="ACIMA_30">Mais de 30 dias atrasados</option>
  </select>

  <select
    value={filtroStatus}
    onChange={(evento) =>
      setFiltroStatus(evento.target.value)
    }
  >
    <option value="Todos">Todos os status</option>

    {STATUS.map((status) => (
      <option key={status}>{status}</option>
    ))}
  </select>

  <button type="button" onClick={abrirNovo}>
    + Novo protocolo
  </button>
</div>
      </section>

      {mensagem && (
        <div className="protocolos-mensagem">{mensagem}</div>
      )}

      <section className="protocolos-tabela-card">
        {carregando ? (
          <div className="protocolos-vazio">
            Carregando protocolos...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="protocolos-vazio">
            Nenhum protocolo encontrado.
          </div>
        ) : (
          <div className="protocolos-tabela-wrapper">
            <table className="protocolos-tabela">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Protocolo</th>
                  <th>Consultora</th>
                  <th>Governo</th>
                  <th>Margem</th>
                  <th>Data da ligação</th>
                  <th>Prazo</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((item) => {
                  const dias = diasRestantes(item.data_limite);

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.nome}</strong>
                        <small>{formatarCpf(item.cpf)}</small>
                      </td>
                      <td>
                        <strong>{item.numero_protocolo}</strong>
                        {item.segundo_protocolo && (
                          <small>2º: {item.segundo_protocolo}</small>
                        )}
                      </td>
                      <td>{item.consultora || "—"}</td>
                      <td>{item.governo || "—"}</td>
                      <td>{moeda(item.margem)}</td>
                      <td>{dataBR(item.data_ligacao)}</td>
                      <td>
                        <strong
                          className={
                            dias < 0
                              ? "prazo-atrasado"
                              : dias === 0
                                ? "prazo-hoje"
                                : ""
                          }
                        >
                          {dias < 0
                            ? `${Math.abs(dias)} dia(s) atrasado`
                            : dias === 0
                              ? "Vence hoje"
                              : `${dias} dia(s)`}
                        </strong>
                        <small>{dataBR(item.data_limite)}</small>
                      </td>
                      <td>
                        <span className="protocolo-status">
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div className="protocolos-acoes">
                          <button
                            type="button"
                            className="botao-editar"
                            title="Editar protocolo"
                            aria-label={`Editar protocolo de ${item.nome}`}
                            onClick={() => abrirEdicao(item)}
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            className="botao-ver"
                            onClick={() => setSelecionado(item)}
                          >
                            Acompanhar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalAberto && (
        <div
          className="protocolos-overlay"
          onClick={() => setModalAberto(false)}
        >
          <form
            className="protocolos-modal"
            onSubmit={salvarProtocolo}
            onClick={(evento) => evento.stopPropagation()}
          >
            <header>
              <div>
                <span>{editando ? "EDITAR PROTOCOLO" : "NOVO PROTOCOLO"}</span>
                <h2>
                  {editando
                    ? "Corrigir dados do acompanhamento"
                    : "Cadastrar acompanhamento"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalAberto(false);
                  setEditando(null);
                }}
              >
                ×
              </button>
            </header>

            <div className="busca-cpf">
              <label>
                CPF do cliente
                <input
                  value={cpfBusca}
                  onChange={(evento) => {
                    const cpf = apenasNumeros(evento.target.value).slice(
                      0,
                      11,
                    );
                    setCpfBusca(formatarCpf(cpf));
                  }}
                  placeholder="000.000.000-00"
                />
              </label>
              <button type="button" onClick={localizarCliente}>
                Buscar cliente
              </button>
            </div>

            <div className="protocolos-form-grid">
              <label>
                Cliente
                <input value={form.nome} readOnly />
              </label>

              <label>
                Telefone
                <input value={form.telefone} readOnly />
              </label>

              <label>
                Número do protocolo
                <input
                  value={form.numeroProtocolo}
                  onChange={(evento) =>
                    setForm({
                      ...form,
                      numeroProtocolo: evento.target.value,
                    })
                  }
                />
              </label>

              <label>
                Data da ligação
                <input
                  type="date"
                  value={form.dataLigacao}
                  onChange={(evento) =>
                    setForm({
                      ...form,
                      dataLigacao: evento.target.value,
                    })
                  }
                />
              </label>

              <label>
                Matrícula
                <input
                  value={form.matricula}
                  onChange={(evento) =>
                    setForm({ ...form, matricula: evento.target.value })
                  }
                />
              </label>

              <label>
                Senha do portal
                <input
                  value={form.senhaPortal}
                  onChange={(evento) =>
                    setForm({
                      ...form,
                      senhaPortal: evento.target.value,
                    })
                  }
                />
              </label>

              <label>
                Governo
                <input
                  value={form.governo}
                  onChange={(evento) =>
                    setForm({ ...form, governo: evento.target.value })
                  }
                />
              </label>

              <label>
                Margem
                <input
                  value={form.margem}
                  onChange={(evento) =>
                    setForm({ ...form, margem: evento.target.value })
                  }
                  placeholder="0,00"
                />
              </label>

              <label>
                Consultora
                <select
                  value={form.consultora}
                  onChange={(evento) => {
                    const nome = evento.target.value;
                    const consultora = consultoras.find(
                      (item) => item.nome === nome,
                    );

                    setForm({
                      ...form,
                      consultora: nome,
                      consultoraId: String(consultora?.id || ""),
                    });
                  }}
                >
                  <option value="">Selecione</option>
                  {consultoras.map((item) => (
                    <option key={String(item.id || item.nome)}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select
                  value={form.status}
                  onChange={(evento) =>
                    setForm({ ...form, status: evento.target.value })
                  }
                >
                  {STATUS.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label className="campo-total">
                Observação
                <textarea
                  rows={4}
                  value={form.observacao}
                  onChange={(evento) =>
                    setForm({
                      ...form,
                      observacao: evento.target.value,
                    })
                  }
                />
              </label>
            </div>

            <footer>
              <button
                type="button"
                className="secundario"
                onClick={() => {
                  setModalAberto(false);
                  setEditando(null);
                }}
              >
                Cancelar
              </button>
              <button type="submit" disabled={salvando}>
                {salvando
                  ? editando
                    ? "Atualizando..."
                    : "Salvando..."
                  : editando
                    ? "Salvar alterações"
                    : "Salvar protocolo"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {selecionado && (
        <div
          className="protocolos-overlay"
          onClick={() => setSelecionado(null)}
        >
          <aside
            className="protocolos-drawer"
            onClick={(evento) => evento.stopPropagation()}
          >
            <header>
              <div>
                <span>ACOMPANHAMENTO DO PROTOCOLO</span>
                <h2>{selecionado.nome}</h2>
                <p>{selecionado.numero_protocolo}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelecionado(null)}
              >
                ×
              </button>
            </header>

            <div className="protocolo-resumo">
              <div>
                <span>CPF</span>
                <strong>{formatarCpf(selecionado.cpf)}</strong>
              </div>
              <div>
                <span>Consultora</span>
                <strong>{selecionado.consultora || "—"}</strong>
              </div>
              <div>
                <span>Prazo</span>
                <strong>{dataBR(selecionado.data_limite)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selecionado.status}</strong>
              </div>
            </div>

            <div className="acoes-status">
              <button
                type="button"
                onClick={() =>
                  void atualizarStatus(
                    selecionado,
                    "BOLETO RECEBIDO",
                  )
                }
              >
                Boleto recebido
              </button>
              <button
                type="button"
                onClick={() =>
                  void atualizarStatus(selecionado, "FINALIZADO")
                }
              >
                Finalizar
              </button>
            </div>

            <section className="novo-contato">
              <h3>Registrar novo contato</h3>

              <select
                value={tipoContato}
                onChange={(evento) =>
                  setTipoContato(evento.target.value)
                }
              >
                <option>LIGAÇÃO</option>
                <option>RETORNO DO BANCO</option>
                <option>NOVO PROTOCOLO</option>
                <option>OBSERVAÇÃO</option>
              </select>

              <textarea
                rows={4}
                value={descricaoContato}
                onChange={(evento) =>
                  setDescricaoContato(evento.target.value)
                }
                placeholder="Informe o que o banco respondeu..."
              />

              <div className="contato-grid">
                <label>
                  Novo número de protocolo
                  <input
                    value={novoNumeroProtocolo}
                    onChange={(evento) =>
                      setNovoNumeroProtocolo(evento.target.value)
                    }
                  />
                </label>

                <label>
                  Próxima ligação
                  <input
                    type="date"
                    value={proximaLigacao}
                    onChange={(evento) =>
                      setProximaLigacao(evento.target.value)
                    }
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={salvando}
                onClick={() => void registrarContato()}
              >
                {salvando ? "Registrando..." : "Registrar contato"}
              </button>
            </section>

            <section className="historico-protocolo">
              <h3>Histórico</h3>

              {historicoSelecionado.length === 0 ? (
                <p>Nenhum contato registrado.</p>
              ) : (
                historicoSelecionado.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.tipo}</strong>
                      <span>{dataBR(item.data_contato)}</span>
                    </div>
                    <p>{item.descricao}</p>
                    {item.numero_protocolo && (
                      <small>
                        Protocolo: {item.numero_protocolo}
                      </small>
                    )}
                    <small>
                      Registrado por {item.registrado_por_nome || "—"}
                    </small>
                  </article>
                ))
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}