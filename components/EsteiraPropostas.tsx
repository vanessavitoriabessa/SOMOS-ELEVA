"use client";

import { useEffect, useMemo, useState } from "react";

type Proposta = {
  id: string;
  numero: string;
  cliente: string;
  cpf: string;
  banco?: string;
  produto: string;
  valorLiquido?: number;
  consultora: string;
  dataDigitacao: string;
  dataPagamento?: string;
  status: "Digitado" | "Aguardando pagamento" | "Pago" | "Cancelado";
  observacoes?: string;
  protocolo?: string;
  dataSolicitacao?: string;
  ultimoContato?: string;
  proximoContato?: string;
  situacaoContato?: string;
};

const CHAVE = "somos-eleva-propostas";

function moeda(valor?: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(valor?: string) {
  return valor ? valor.split("-").reverse().join("/") : "—";
}

function diasDesde(data?: string) {
  if (!data) return null;
  const inicio = new Date(`${data}T00:00:00`);
  const hoje = new Date();
  const atual = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.floor((atual.getTime() - inicio.getTime()) / 86400000);
}

function acaoDoDia(item: Proposta) {
  if (item.status === "Pago") return ["Finalizada", "acao-finalizada"];
  if (item.status === "Cancelado") return ["Cancelada", "acao-cancelada"];

  const dias = diasDesde(item.dataSolicitacao || item.dataDigitacao);
  if (dias === null) return ["Cadastrar data", "acao-neutra"];
  if (dias >= 15) return ["Prazo estourado", "acao-urgente"];
  if (dias >= 10) return ["Cobrar diariamente", "acao-alerta"];
  if (dias >= 2) return ["Ligar novamente", "acao-ligar"];
  return ["Acompanhar", "acao-neutra"];
}

export default function EsteiraPropostas() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [selecionada, setSelecionada] = useState<Proposta | null>(null);

  useEffect(() => {
    const salvas = localStorage.getItem(CHAVE);
    if (salvas) setPropostas(JSON.parse(salvas));
  }, []);

  function salvar(novas: Proposta[]) {
    setPropostas(novas);
    localStorage.setItem(CHAVE, JSON.stringify(novas));
  }

  function atualizar(campo: keyof Proposta, valor: string) {
    if (!selecionada) return;
    const nova = { ...selecionada, [campo]: valor };
    setSelecionada(nova);
    salvar(propostas.map((item) => item.id === nova.id ? nova : item));
  }

  function mudarStatus(status: Proposta["status"]) {
    if (!selecionada) return;
    const hoje = new Date().toISOString().slice(0, 10);
    const nova = {
      ...selecionada,
      status,
      dataPagamento: status === "Pago" ? (selecionada.dataPagamento || hoje) : selecionada.dataPagamento,
    };
    setSelecionada(nova);
    salvar(propostas.map((item) => item.id === nova.id ? nova : item));
  }

  const filtradas = useMemo(() => {
    const texto = busca.toLowerCase().trim();

    return propostas.filter((item) => {
      const bateBusca =
        !texto ||
        [item.numero, item.cliente, item.cpf, item.consultora, item.protocolo, item.banco]
          .join(" ")
          .toLowerCase()
          .includes(texto);

      const [acao] = acaoDoDia(item);
      const bateFiltro =
        filtro === "Todas" ||
        (filtro === "Urgentes" && ["Prazo estourado", "Cobrar diariamente"].includes(acao)) ||
        (filtro === "Ligar hoje" && acao === "Ligar novamente") ||
        (filtro === "Pagas" && item.status === "Pago") ||
        (filtro === "Canceladas" && item.status === "Cancelado");

      return bateBusca && bateFiltro;
    });
  }, [propostas, busca, filtro]);

  const resumo = useMemo(() => {
    const acoes = propostas.map((item) => acaoDoDia(item)[0]);
    return {
      total: propostas.length,
      urgentes: acoes.filter((acao) => ["Prazo estourado", "Cobrar diariamente"].includes(acao)).length,
      ligar: acoes.filter((acao) => acao === "Ligar novamente").length,
      pagas: propostas.filter((item) => item.status === "Pago").length,
    };
  }, [propostas]);

  return (
    <>
      <section className="mini-stats-grid">
        <article className="mini-stat"><span>Total na esteira</span><strong>{resumo.total}</strong></article>
        <article className="mini-stat"><span>Urgentes</span><strong>{resumo.urgentes}</strong></article>
        <article className="mini-stat"><span>Ligar novamente</span><strong>{resumo.ligar}</strong></article>
        <article className="mini-stat"><span>Pagas</span><strong>{resumo.pagas}</strong></article>
      </section>

      <div className="toolbar proposal-toolbar">
        <div className="filters-group">
          <input className="search" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar cliente, CPF, proposta ou protocolo..." />
          <select className="filter-select" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option>Todas</option><option>Urgentes</option><option>Ligar hoje</option>
            <option>Pagas</option><option>Canceladas</option>
          </select>
        </div>
      </div>

      <div className="pipeline-layout">
        <div className="table-wrap">
          <table className="pipeline-table">
            <thead><tr><th>Cliente</th><th>Proposta</th><th>Consultora</th><th>Solicitação</th><th>Protocolo</th><th>Ação do dia</th><th>Status</th></tr></thead>
            <tbody>
              {filtradas.map((item) => {
                const [acao, classe] = acaoDoDia(item);
                return (
                  <tr key={item.id} onClick={() => setSelecionada(item)}>
                    <td><strong>{item.cliente}</strong><small className="table-subtext">{item.cpf || "CPF não informado"}</small></td>
                    <td>{item.numero}</td><td>{item.consultora || "—"}</td>
                    <td>{dataBR(item.dataSolicitacao || item.dataDigitacao)}</td>
                    <td>{item.protocolo || "Não cadastrado"}</td>
                    <td><span className={`acao-badge ${classe}`}>{acao}</span></td>
                    <td>{item.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="proposal-detail">
          {!selecionada ? (
            <div className="empty-detail"><span>📄</span><h3>Selecione uma proposta</h3><p>Clique em uma linha para abrir a ficha completa.</p></div>
          ) : (
            <>
              <div className="detail-header">
                <div><span className="panel-kicker">FICHA DA PROPOSTA</span><h3>{selecionada.cliente}</h3><p>{selecionada.numero} • {selecionada.produto}</p></div>
                <button className="icon-button" onClick={() => setSelecionada(null)}>✕</button>
              </div>

              <div className="detail-grid">
                <div><span>CPF</span><strong>{selecionada.cpf || "—"}</strong></div>
                <div><span>Consultora</span><strong>{selecionada.consultora || "—"}</strong></div>
                <div><span>Banco</span><strong>{selecionada.banco || "—"}</strong></div>
                <div><span>Valor líquido</span><strong>{moeda(selecionada.valorLiquido)}</strong></div>
              </div>

              <label className="detail-label">Protocolo
                <input value={selecionada.protocolo || ""} onChange={(e) => atualizar("protocolo", e.target.value)} />
              </label>

              <div className="detail-two-columns">
                <label className="detail-label">Data da solicitação
                  <input type="date" value={selecionada.dataSolicitacao || selecionada.dataDigitacao || ""} onChange={(e) => atualizar("dataSolicitacao", e.target.value)} />
                </label>
                <label className="detail-label">Último contato
                  <input type="date" value={selecionada.ultimoContato || ""} onChange={(e) => atualizar("ultimoContato", e.target.value)} />
                </label>
              </div>

              <div className="detail-two-columns">
                <label className="detail-label">Próximo contato
                  <input type="date" value={selecionada.proximoContato || ""} onChange={(e) => atualizar("proximoContato", e.target.value)} />
                </label>
                <label className="detail-label">Situação do contato
                  <select value={selecionada.situacaoContato || ""} onChange={(e) => atualizar("situacaoContato", e.target.value)}>
                    <option value="">Selecionar</option><option>Ligado</option><option>Não atendeu</option>
                    <option>Retornar depois</option><option>Aguardando documento</option><option>Aguardando banco</option>
                  </select>
                </label>
              </div>

              <label className="detail-label">Observações
                <textarea rows={4} value={selecionada.observacoes || ""} onChange={(e) => atualizar("observacoes", e.target.value)} />
              </label>

              <div className="current-action"><span>Ação automática de hoje</span>
                <strong className={`acao-badge ${acaoDoDia(selecionada)[1]}`}>{acaoDoDia(selecionada)[0]}</strong>
              </div>

              <div className="status-actions">
                <button onClick={() => mudarStatus("Aguardando pagamento")}>Aguardando</button>
                <button className="success-action" onClick={() => mudarStatus("Pago")}>Marcar como pago</button>
                <button className="danger-action" onClick={() => mudarStatus("Cancelado")}>Cancelar</button>
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
