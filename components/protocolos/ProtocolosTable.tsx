import type { Protocolo } from "./types";
import { Button } from "@/components/ui";

type Props = {
  protocolos: Protocolo[];
  onEditar: (protocolo: Protocolo) => void;
};

function formatarData(valor: string) {
  if (!valor) return "—";

  return new Date(`${valor}T12:00:00`).toLocaleDateString("pt-BR");
}

function formatarMargem(valor: number) {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProtocolosTable({
  protocolos,
  onEditar,
}: Props) {
  if (!protocolos.length) {
    return (
      <div className="protocolos-vazio">
        Nenhum protocolo encontrado.
      </div>
    );
  }

  return (
    <div className="protocolos-table-wrapper">
      <table className="protocolos-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>CPF</th>
            <th>Protocolo</th>
            <th>Ligação</th>
            <th>15 dias</th>
            <th>Governo</th>
            <th>Status</th>
            <th>Vendedora</th>
            <th>Margem</th>
            <th>Ligou hoje?</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {protocolos.map((item) => {
            const vencido =
              new Date(item.dataLimite) < new Date();

            return (
              <tr key={item.id}>
                <td>
                  <strong>{item.nome}</strong>
                  <small>{item.telefone}</small>
                </td>

                <td>{item.cpf}</td>
                <td>{item.numeroProtocolo}</td>
                <td>{formatarData(item.dataLigacao)}</td>

                <td>
                  <span className={vencido ? "prazo-vencido" : ""}>
                    {formatarData(item.dataLimite)}
                  </span>
                </td>

                <td>{item.governo}</td>

                <td>
                  <span className="status-protocolo">
                    {item.status}
                  </span>
                </td>

                <td>{item.vendedor}</td>
                <td>{formatarMargem(item.margem)}</td>

                <td>
                  <span
                    className={
                      item.ligouBancoHoje
                        ? "ligacao-sim"
                        : "ligacao-nao"
                    }
                  >
                    {item.ligouBancoHoje ? "Sim" : "Não"}
                  </span>
                </td>

                <td>
                  <Button
  variant="outline"
  size="small"
  onClick={() => onEditar(item)}
>
  Editar
</Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}