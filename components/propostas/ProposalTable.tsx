import ProposalStatus from "./ProposalStatus";

type PropostaTabela = {
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
};

type Props = {
  propostas: PropostaTabela[];
  processando: boolean;
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
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export default function ProposalTable({
  propostas,
  processando,
  onEditar,
  onExcluir,
}: Props) {
  return (
    <div className="proposal-table-wrapper">
      <table className="proposal-table">
        <thead>
          <tr>
            <th>Nº</th>
            <th>Consultora</th>
            <th>Cliente</th>
            <th>Produto</th>
            <th>Banco / Tabela</th>
            <th>Valor</th>
            <th>Valor final</th>
            <th>Data / Digitação</th>
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

              <td>{proposta.vendedora || "—"}</td>

              <td>
                <strong>{proposta.cliente || "Cliente não informado"}</strong>
                <small>{formatarCpf(proposta.cpf)}</small>
              </td>

              <td>Compra de Dívida</td>

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

              <td>
                <strong>{formatarData(proposta.dataCadastro)}</strong>

                {proposta.dataPagamento && (
                  <small>
                    Pago em {formatarData(proposta.dataPagamento)}
                  </small>
                )}
              </td>

              <td>
                <ProposalStatus status={proposta.status} />
              </td>

              <td>
                <div className="proposal-table-actions">
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