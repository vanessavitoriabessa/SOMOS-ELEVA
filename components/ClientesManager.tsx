"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Cliente = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  vendedora: string;
  produto: "Compra de Dívida" | "CLT";
  status: "Ativo" | "Pendente" | "Finalizado";
};

const chave = "somos-eleva-clientes";

export default function ClientesManager() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    const salvos = localStorage.getItem(chave);
    if (salvos) setClientes(JSON.parse(salvos));
  }, []);

  function salvar(novos: Cliente[]) {
    setClientes(novos);
    localStorage.setItem(chave, JSON.stringify(novos));
  }

  function cadastrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);

    const novo: Cliente = {
      id: crypto.randomUUID(),
      nome: String(dados.get("nome") || "").trim(),
      cpf: String(dados.get("cpf") || "").trim(),
      telefone: String(dados.get("telefone") || "").trim(),
      vendedora: String(dados.get("vendedora") || "").trim(),
      produto: String(dados.get("produto")) as Cliente["produto"],
      status: "Ativo",
    };

    if (!novo.nome || !novo.cpf) {
      alert("Preencha pelo menos o nome e o CPF.");
      return;
    }

    if (clientes.some((cliente) => cliente.cpf === novo.cpf)) {
      alert("Já existe um cliente cadastrado com este CPF.");
      return;
    }

    salvar([novo, ...clientes]);
    evento.currentTarget.reset();
    setMostrarFormulario(false);
  }

  function excluir(id: string) {
    if (!confirm("Deseja excluir este cliente?")) return;
    salvar(clientes.filter((cliente) => cliente.id !== id));
  }

  const filtrados = useMemo(() => {
    const texto = busca.toLowerCase().trim();
    if (!texto) return clientes;
    return clientes.filter((cliente) =>
      [cliente.nome, cliente.cpf, cliente.telefone, cliente.vendedora, cliente.produto]
        .join(" ")
        .toLowerCase()
        .includes(texto)
    );
  }, [clientes, busca]);

  return (
    <>
      <div className="toolbar">
        <input
          className="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Pesquisar por nome, CPF, telefone ou consultora..."
        />
        <button className="button" onClick={() => setMostrarFormulario(!mostrarFormulario)}>
          {mostrarFormulario ? "Fechar" : "+ Novo cliente"}
        </button>
      </div>

      {mostrarFormulario && (
        <form className="card form-grid" onSubmit={cadastrar}>
          <label>
            Nome completo
            <input name="nome" required />
          </label>
          <label>
            CPF
            <input name="cpf" required />
          </label>
          <label>
            Telefone
            <input name="telefone" />
          </label>
          <label>
            Consultora
            <input name="vendedora" />
          </label>
          <label>
            Produto
            <select name="produto" defaultValue="Compra de Dívida">
              <option>Compra de Dívida</option>
              <option>CLT</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button" type="submit">Salvar cliente</button>
          </div>
        </form>
      )}

      <div className="summary-line">
        <strong>{filtrados.length}</strong> cliente(s) encontrado(s)
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7}>Nenhum cliente cadastrado.</td>
              </tr>
            ) : (
              filtrados.map((cliente) => (
                <tr key={cliente.id}>
                  <td><strong>{cliente.nome}</strong></td>
                  <td>{cliente.cpf}</td>
                  <td>{cliente.telefone || "—"}</td>
                  <td>{cliente.vendedora || "—"}</td>
                  <td>{cliente.produto}</td>
                  <td><span className="badge">{cliente.status}</span></td>
                  <td>
                    <button className="danger-link" onClick={() => excluir(cliente.id)}>
                      Excluir
                    </button>
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
