"use client";

import "./clientes.css";
import { createClient } from "@/lib/supabase/client";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Cliente = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  consultora: string;
  produto: string;
  status: string;
};

type PerfilAtual = {
  id: string;
  nome: string;
  perfil: string;
};

type RespostaClientes = {
  clientes?: Cliente[];
  cliente?: Cliente;
  perfil?: PerfilAtual;
  erro?: string;
  mensagem?: string;
};

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function perfilEhConsultora(perfil: unknown) {
  const texto = normalizarTexto(perfil);

  return (
    texto.includes("consultor") ||
    texto.includes("vendedor")
  );
}

export default function ClientesManager() {
  const supabase = useMemo(() => createClient(), []);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [perfilAtual, setPerfilAtual] =
    useState<PerfilAtual | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroConsultora, setFiltroConsultora] =
  useState("Todas");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [edicao, setEdicao] = useState({
    nome: "",
    telefone: "",
    consultora: "",
    produto: "Compra de Dívida",
    status: "Ativo",
  });

  const obterToken = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error("Sua sessão expirou. Entre novamente no sistema.");
    }

    return data.session.access_token;
  }, [supabase]);

  const chamarApiClientes = useCallback(
    async (
      method: "GET" | "POST" | "PATCH",
      body?: unknown
    ) => {
      const token = await obterToken();

      const resposta = await fetch("/api/clientes", {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });

      const conteudo =
        (await resposta.json()) as RespostaClientes;

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro ||
            "Não foi possível concluir a operação."
        );
      }

      return conteudo;
    },
    [obterToken]
  );

  const carregarClientes = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const conteudo = await chamarApiClientes("GET");
      const perfil = conteudo.perfil || null;
      const lista = Array.isArray(conteudo.clientes)
        ? conteudo.clientes
        : [];

      setPerfilAtual(perfil);

      // Proteção extra na tela:
      // mesmo que a API retorne algo indevido, consultora
      // continua vendo somente os clientes do próprio nome.
      const clientesPermitidos =
        perfil && perfilEhConsultora(perfil.perfil)
          ? lista.filter(
              (cliente) =>
                normalizarTexto(cliente.consultora) ===
                normalizarTexto(perfil.nome)
            )
          : lista;

      setClientes(clientesPermitidos);
    } catch (error) {
      console.error(error);
      setClientes([]);
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar clientes."
      );
    } finally {
      setCarregando(false);
    }
  }, [chamarApiClientes]);

  useEffect(() => {
    void carregarClientes();
  }, [carregarClientes]);

  function abrirEdicao(cliente: Cliente) {
    setClienteEditando(cliente);
    setEdicao({
      nome: cliente.nome || "",
      telefone: cliente.telefone || "",
      consultora:
        perfilAtual && perfilEhConsultora(perfilAtual.perfil)
          ? perfilAtual.nome
          : cliente.consultora || "",
      produto: cliente.produto || "Compra de Dívida",
      status: cliente.status || "Ativo",
    });
    setErro("");
  }

  function fecharEdicao() {
    if (salvando) return;
    setClienteEditando(null);
  }

  async function salvarEdicao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!clienteEditando) return;

    const nome = edicao.nome.trim();
    const consultora =
      perfilAtual && perfilEhConsultora(perfilAtual.perfil)
        ? perfilAtual.nome
        : edicao.consultora.trim();

    if (!nome) {
      setErro("Informe o nome do cliente.");
      return;
    }

    if (!consultora) {
      setErro("Selecione a consultora responsável.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const conteudo = await chamarApiClientes("PATCH", {
        cliente: {
          ...clienteEditando,
          nome,
          telefone: edicao.telefone.trim(),
          consultora,
          produto: edicao.produto,
          status: edicao.status,
        },
      });

      const atualizado = conteudo.cliente || {
        ...clienteEditando,
        nome,
        telefone: edicao.telefone.trim(),
        consultora,
        produto: edicao.produto,
        status: edicao.status,
      };

      setClientes((atuais) =>
        atuais.map((cliente) =>
          cliente.id === clienteEditando.id
            ? (atualizado as Cliente)
            : cliente
        )
      );

      setClienteEditando(null);
      await carregarClientes();
    } catch (error) {
      console.error(error);
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar cliente."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function cadastrar(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);

    const nome = String(dados.get("nome") || "").trim();
    const cpf = String(dados.get("cpf") || "").trim();
    const telefone = String(
      dados.get("telefone") || ""
    ).trim();

    const consultoraDigitada = String(
      dados.get("consultora") || ""
    ).trim();

    const consultora =
      perfilAtual &&
      perfilEhConsultora(perfilAtual.perfil)
        ? perfilAtual.nome
        : consultoraDigitada;

    const produto = String(
      dados.get("produto") || "Compra de Dívida"
    );

    if (!nome || !cpf) {
      alert("Preencha o nome e o CPF.");
      return;
    }

    if (!consultora) {
      alert("Informe a consultora responsável.");
      return;
    }

    const cpfNormalizado = cpf.replace(/\D/g, "");

    const cpfJaExiste = clientes.some(
      (cliente) =>
        String(cliente.cpf || "").replace(/\D/g, "") ===
        cpfNormalizado
    );

    if (cpfJaExiste) {
      alert("Já existe um cliente cadastrado com este CPF.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const conteudo = await chamarApiClientes("POST", {
        cliente: {
          nome,
          cpf,
          telefone,
          consultora,
          produto,
          status: "Ativo",
        },
      });

      if (conteudo.cliente) {
        setClientes((atuais) => [
          conteudo.cliente as Cliente,
          ...atuais,
        ]);
      } else {
        await carregarClientes();
      }

      formulario.reset();
      setMostrarFormulario(false);
    } catch (error) {
      console.error(error);
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar cliente."
      );
    } finally {
      setSalvando(false);
    }
  }
const listaConsultoras = useMemo(() => {
  const nomes = Array.from(
    new Set(
      clientes
        .map((cliente) => cliente.consultora.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return nomes.map((nome) => ({
    nome,
    quantidade: clientes.filter(
      (cliente) => cliente.consultora.trim() === nome
    ).length,
  }));
}, [clientes]);

  const filtrados = useMemo(() => {
  const termo = busca.trim().toLowerCase();

  return clientes.filter((cliente) => {
    const correspondeBusca =
      !termo ||
      [
        cliente.nome,
        cliente.cpf,
        cliente.telefone,
        cliente.consultora,
        cliente.produto,
        cliente.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo);

    const correspondeConsultora =
      filtroConsultora === "Todas" ||
      cliente.consultora === filtroConsultora;

    return correspondeBusca && correspondeConsultora;
  });
}, [busca, clientes, filtroConsultora]);

  const resumo = useMemo(
  () => ({
    total: filtrados.length,

    ativos: filtrados.filter(
      (cliente) => cliente.status === "Ativo"
    ).length,

    pendentes: filtrados.filter(
      (cliente) => cliente.status === "Pendente"
    ).length,

    finalizados: filtrados.filter(
      (cliente) => cliente.status === "Finalizado"
    ).length,
  }),
  [filtrados]
);

  const usuarioEhConsultora = Boolean(
    perfilAtual &&
      perfilEhConsultora(perfilAtual.perfil)
  );

  return (
    <div className="clientes-page">
      <div className="toolbar">
        <input
          className="search"
          value={busca}
          onChange={(evento) =>
            setBusca(evento.target.value)
          }
          placeholder="Pesquisar nome, CPF, telefone ou consultora..."
        />
<select
  value={filtroConsultora}
  onChange={(evento) =>
    setFiltroConsultora(evento.target.value)
  }
  disabled={usuarioEhConsultora}
>
  <option value="Todas">
    Todas as consultoras ({clientes.length})
  </option>

  {listaConsultoras.map((consultora) => (
    <option
      key={consultora.nome}
      value={consultora.nome}
    >
      {consultora.nome} ({consultora.quantidade})
    </option>
  ))}
</select>

        <button
          className="button"
          type="button"
          onClick={() =>
            setMostrarFormulario((atual) => !atual)
          }
        >
          {mostrarFormulario
            ? "Fechar"
            : "+ Novo cliente"}
        </button>
      </div>

      {erro && (
        <div className="card" role="alert">
          <strong>{erro}</strong>
        </div>
      )}

      {mostrarFormulario && (
        <form
          className="card form-grid"
          onSubmit={cadastrar}
        >
          <label>
            Nome completo
            <input
              name="nome"
              required
              disabled={salvando}
            />
          </label>

          <label>
            CPF
            <input
              name="cpf"
              required
              disabled={salvando}
            />
          </label>

          <label>
            Telefone
            <input
              name="telefone"
              disabled={salvando}
            />
          </label>

          <label>
            Consultora
            <input
              name="consultora"
              defaultValue={
                usuarioEhConsultora
                  ? perfilAtual?.nome || ""
                  : ""
              }
              readOnly={usuarioEhConsultora}
              disabled={salvando}
            />
          </label>

          <label>
            Produto
            <select
              name="produto"
              defaultValue="Compra de Dívida"
              disabled={salvando}
            >
              <option value="Compra de Dívida">
                Compra de Dívida
              </option>
              <option value="CLT">CLT</option>
            </select>
          </label>

          <div className="form-actions">
            <button
              className="button"
              type="submit"
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : "Salvar cliente"}
            </button>
          </div>
        </form>
      )}

      <div className="summary-grid">
        <div className="summary-card">
          <h4>Cadastrados</h4>
          <strong>{resumo.total}</strong>
        </div>

        <div className="summary-card">
          <h4>Ativos</h4>
          <strong>{resumo.ativos}</strong>
        </div>

        <div className="summary-card">
          <h4>Pendentes</h4>
          <strong>{resumo.pendentes}</strong>
        </div>

        <div className="summary-card">
          <h4>Finalizados</h4>
          <strong>{resumo.finalizados}</strong>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>Consultora</th>
              <th>Produto</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={7}>
                  Carregando clientes...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((cliente) => (
                <tr key={cliente.id}>
                  <td>
                    <strong>{cliente.nome}</strong>
                  </td>
                  <td>{cliente.cpf || "—"}</td>
                  <td>{cliente.telefone || "—"}</td>
                  <td>{cliente.consultora || "—"}</td>
                  <td>{cliente.produto || "—"}</td>
                  <td>
                    <span className="badge">
                      {cliente.status || "Ativo"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => abrirEdicao(cliente)}
                      aria-label={`Editar ${cliente.nome}`}
                      title="Editar cliente"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        border: "1px solid #dbe4ef",
                        background: "#fff",
                        cursor: "pointer",
                        fontSize: 18,
                      }}
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {clienteEditando && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Editar cliente"
          onClick={fecharEdicao}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 9999,
          }}
        >
          <form
            onSubmit={salvarEdicao}
            onClick={(evento) => evento.stopPropagation()}
            style={{
              width: "min(680px, 100%)",
              background: "#fff",
              borderRadius: 18,
              padding: 24,
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <small style={{ color: "#ff6b00", fontWeight: 800 }}>
                  EDITAR CLIENTE
                </small>
                <h2 style={{ margin: "4px 0 0" }}>Atualizar cadastro</h2>
              </div>

              <button
                type="button"
                onClick={fecharEdicao}
                disabled={salvando}
                style={{
                  width: 40,
                  height: 40,
                  border: 0,
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 22,
                }}
              >
                ×
              </button>
            </div>

            <div className="form-grid">
              <label>
                Nome completo
                <input
                  value={edicao.nome}
                  onChange={(evento) =>
                    setEdicao({ ...edicao, nome: evento.target.value })
                  }
                  disabled={salvando}
                  required
                />
              </label>

              <label>
                CPF
                <input value={clienteEditando.cpf || ""} readOnly />
              </label>

              <label>
                Telefone
                <input
                  value={edicao.telefone}
                  onChange={(evento) =>
                    setEdicao({ ...edicao, telefone: evento.target.value })
                  }
                  disabled={salvando}
                />
              </label>

              <label>
                Consultora responsável
                <select
                  value={edicao.consultora}
                  onChange={(evento) =>
                    setEdicao({ ...edicao, consultora: evento.target.value })
                  }
                  disabled={salvando || usuarioEhConsultora}
                  required
                >
                  <option value="">Selecione a consultora</option>
                  {edicao.consultora &&
                    !listaConsultoras.some(
                      (item) => item.nome === edicao.consultora
                    ) && (
                      <option value={edicao.consultora}>
                        {edicao.consultora}
                      </option>
                    )}
                  {listaConsultoras.map((consultora) => (
                    <option key={consultora.nome} value={consultora.nome}>
                      {consultora.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Produto
                <select
                  value={edicao.produto}
                  onChange={(evento) =>
                    setEdicao({ ...edicao, produto: evento.target.value })
                  }
                  disabled={salvando}
                >
                  <option value="Compra de Dívida">Compra de Dívida</option>
                  <option value="CLT">CLT</option>
                </select>
              </label>

              <label>
                Status
                <select
                  value={edicao.status}
                  onChange={(evento) =>
                    setEdicao({ ...edicao, status: evento.target.value })
                  }
                  disabled={salvando}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 24,
              }}
            >
              <button
                type="button"
                onClick={fecharEdicao}
                disabled={salvando}
                style={{
                  height: 46,
                  padding: "0 20px",
                  borderRadius: 10,
                  border: "1px solid #dbe4ef",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Cancelar
              </button>

              <button className="button" type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Atualizar cliente"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}