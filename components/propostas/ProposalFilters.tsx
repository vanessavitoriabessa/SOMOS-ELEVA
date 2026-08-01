type Props = {
  busca: string;
  filtroStatus: string;
  status: string[];
  onBuscaChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export default function ProposalFilters({
  busca,
  filtroStatus,
  status,
  onBuscaChange,
  onStatusChange,
}: Props) {
  return (
    <div className="proposal-filters">
      <input
        placeholder="Pesquisar cliente, CPF, consultora, banco ou tabela"
        value={busca}
        onChange={(e) => onBuscaChange(e.target.value)}
      />

      <select
        value={filtroStatus}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        <option value="Todos">Todos</option>

        {status.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}