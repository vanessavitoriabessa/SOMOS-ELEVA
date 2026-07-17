"use client";

import { useEffect, useMemo, useState } from "react";

type Proposta = {
  id: string;
  numero: string;
  cliente: string;
  cpf: string;
  banco: string;
  produto: "Compra de Dívida" | "CLT";
  valorOperacao: number;
  valorLiquido: number;
  consultora: string;
  dataDigitacao: string;
  dataPagamento: string;
  status: "Digitado" | "Aguardando pagamento" | "Pago" | "Cancelado";
  observacoes: string;
};

const CHAVE = "somos-eleva-propostas";

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function BaixasManager() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const salvas = localStorage.getItem(CHAVE);
    if (salvas) setPropostas(JSON.parse(salvas));
  }, []);

  function salvar(novas: Proposta[]) {
    setPropostas(novas);
    localStorage.setItem(CHAVE, JSON.stringify(novas));
  }

  function marcarComoPago(id: string) {
    const hoje = new Date().toISOString().slice(0, 10);

    salvar(
      propostas.map((item) =>
        item.id === id
          ? { ...item, status: "Pago", dataPagamento: item.dataPagamento || hoje }
          : item
      )
    );
  }

  const encontradas = useMemo(() => {
    const texto = busca.toLowerCase().trim();
    if (!texto) return propostas.filter((item) => item.status !== "Pago");

    return propostas.filter((item) =>
      [item.numero, item.cliente, item.cpf, item.consultora]
        .join(" ")
        .toLowerCase()
        .includes(texto)
    );
  }, [propostas, busca]);

  return (
    <>
      <div className="toolbar">
        <input
          className="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Pesquisar número da proposta, cliente ou CPF..."
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Proposta</th>
              <th>Cliente</th>
              <th>Produto</th>
              <th>Valor líquido</th>
              <th>Consultora</th>
              <th>Status atual</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {encontradas.length === 0 ? (
              <tr>
                <td colSpan={7}>Nenhuma proposta encontrada.</td>
              </tr>
            ) : (
              encontradas.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.numero}</strong></td>
                  <td>{item.cliente}</td>
                  <td>{item.produto}</td>
                  <td>{moeda(item.valorLiquido)}</td>
                  <td>{item.consultora || "—"}</td>
                  <td>{item.status}</td>
                  <td>
                    {item.status !== "Pago" && item.status !== "Cancelado" ? (
                      <button
                        className="button compact-button"
                        onClick={() => marcarComoPago(item.id)}
                      >
                        Dar baixa
                      </button>
                    ) : (
                      <span className="badge">Pago</span>
                    )}
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
