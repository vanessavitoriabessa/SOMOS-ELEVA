"use client";

import ProposalStatus from "./ProposalStatus";

export type PropostaTabela = {
  id: string;
  cliente: string;
  cpf: string;
  telefone: string;
  vendedora: string;
  banco: string;
  tabela: string;
  percentualTabela: number;
  valorContrato: number;
  valorMeta: number;
  status: string;
  dataCadastro: string;
  dataPagamento: string;
  observacao?: string;
  motivoCancelamento?: string;
};

type Props = {
  propostas: PropostaTabela[];
  processando: boolean;
  onVer: (proposta: PropostaTabela) => void;
  onEditar: (proposta: PropostaTabela) => void;
  onExcluir: (id: string) => void;
};

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor: string) {
  if (!valor) return "—";

  const data = String(valor).slice(0, 10);
  const partes = data.split("-");

  if (partes.length !== 3) return valor;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarCpf(valor: string) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);

  return numeros
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3}).(\d{3})(\d)/, "$1.$2.$3")
    .replace(/.(\d{3})(\d)/, ".$1-$2");
}

export default function ProposalTable({
  propostas,
  processando,
  onVer,
  onEditar,
  onExcluir,
}: Props) {
  return (
    <div className="proposal-table-wrapper">
      <table className="proposal-table proposal-table-pro">
        <thead>
          <tr>
            <th>Nº</th>
            <th>Cliente / consultora</th>
            <th>Banco / tabela</th>
            <th>Valor bruto</th>
            <th>Valor líquido</th>
            <th>Digitado</th>
            <th>Pago</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {propostas.map((proposta, indice) => (
            <tr key={proposta.id}>
              <td>
                <strong className="proposal-number">
                  PROP-{String(indice + 1).padStart(5, "0")}
                </strong>
              </td>

              <td>
                <strong>{proposta.cliente || "Cliente não informado"}</strong>
                <small>
                  {proposta.vendedora || "—"} • {formatarCpf(proposta.cpf)}
                </small>
              </td>

              <td>
                <strong>{proposta.banco || "—"}</strong>
                <small>
                  {proposta.tabela || "Tabela não informada"}
                  {proposta.percentualTabela
                    ? ` • ${proposta.percentualTabela}%`
                    : ""}
                </small>
              </td>

              <td>{moeda(proposta.valorContrato)}</td>

              <td>
                <strong className="proposal-final-value">
                  {moeda(proposta.valorMeta)}
                </strong>
              </td>

              <td>{formatarData(proposta.dataCadastro)}</td>

              <td>{formatarData(proposta.dataPagamento)}</td>

              <td>
                <ProposalStatus status={proposta.status} />
              </td>

              <td>
                <div className="proposal-table-actions proposal-table-actions-pro">
                  <button
                    type="button"
                    className="view"
                    disabled={processando}
                    onClick={() => onVer(proposta)}
                  >
                    Ver
                  </button>

                  <button
                    type="button"
                    title="Editar proposta"
                    disabled={processando}
                    onClick={() => onEditar(proposta)}
                  >
                    ✎
                  </button>

                  <button
                    type="button"
                    className="delete"
                    title="Excluir proposta"
                    disabled={processando}
                    onClick={() => onExcluir(proposta.id)}
                  >
                    ×
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}