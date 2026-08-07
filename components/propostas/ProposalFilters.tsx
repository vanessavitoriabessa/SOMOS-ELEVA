"use client";

export type PeriodoProposta =
  | "Hoje"
  | "Esta semana"
  | "Este mês"
  | "Todos"
  | "Personalizado";

type Props = {
  busca: string;
  filtroStatus: string;
  status: string[];
  periodo: PeriodoProposta;
  dataInicial: string;
  dataFinal: string;
  consultora: string;
  banco: string;
  tabela: string;
  consultoras: string[];
  bancos: string[];
  tabelas: string[];
  onBuscaChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPeriodoChange: (value: PeriodoProposta) => void;
  onDataInicialChange: (value: string) => void;
  onDataFinalChange: (value: string) => void;
  onConsultoraChange: (value: string) => void;
  onBancoChange: (value: string) => void;
  onTabelaChange: (value: string) => void;
};

export default function ProposalFilters({
  busca,
  filtroStatus,
  status,
  periodo,
  dataInicial,
  dataFinal,
  consultora,
  banco,
  tabela,
  consultoras,
  bancos,
  tabelas,
  onBuscaChange,
  onStatusChange,
  onPeriodoChange,
  onDataInicialChange,
  onDataFinalChange,
  onConsultoraChange,
  onBancoChange,
  onTabelaChange,
}: Props) {
  return (
    <section className="proposal-filters-pro">
      <div className="proposal-period-buttons">
        {(["Hoje", "Esta semana", "Este mês", "Todos"] as PeriodoProposta[]).map(
          (item) => (
            <button
              type="button"
              key={item}
              className={periodo === item ? "active" : ""}
              onClick={() => onPeriodoChange(item)}
            >
              {item}
            </button>
          ),
        )}
      </div>

      <div className="proposal-filter-grid">
        <label className="proposal-search-wide">
          <span>Pesquisar</span>
          <input
            placeholder="Cliente, CPF, consultora, banco ou tabela"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
          />
        </label>

        <label>
          <span>Consultora</span>
          <select
            value={consultora}
            onChange={(e) => onConsultoraChange(e.target.value)}
          >
            <option value="Todas">Todas as consultoras</option>

            {consultoras.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Banco</span>
          <select
            value={banco}
            onChange={(e) => onBancoChange(e.target.value)}
          >
            <option value="Todos">Todos os bancos</option>

            {bancos.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Tabela</span>
          <select
            value={tabela}
            onChange={(e) => onTabelaChange(e.target.value)}
          >
            <option value="Todas">Todas as tabelas</option>

            {tabelas.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Status</span>
          <select
            value={filtroStatus}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="Todos">Todos os status</option>

            {status.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Data inicial</span>
          <input
            type="date"
            value={dataInicial}
            onChange={(e) => {
              onDataInicialChange(e.target.value);
              onPeriodoChange("Personalizado");
            }}
          />
        </label>

        <label>
          <span>Data final</span>
          <input
            type="date"
            value={dataFinal}
            onChange={(e) => {
              onDataFinalChange(e.target.value);
              onPeriodoChange("Personalizado");
            }}
          />
        </label>
      </div>
    </section>
  );
}