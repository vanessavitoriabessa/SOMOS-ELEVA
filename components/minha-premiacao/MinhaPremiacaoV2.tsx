"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  History,
  Landmark,
  RefreshCcw,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import "./minha-premiacao-v2.css";

export type MovimentoPremiacao = {
  id: string;
  propostaId: string;
  produto: "Compra de Dívida" | "CLT";
  cliente: string;
  descricao: string;
  data: string;
  banco: string;
  tabela: string;
  valorContrato: number;
  pesoTabela: number;
  producaoValida: number;
  comissaoEmpresa: number;
  valorParcelaClt: number;
};

export type SaquePremiacao = {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  competencia_id?: string | null;
  pontos_solicitados: number;
  valor_reais?: number | null;
  status: "SOLICITADO" | "PAGO" | "RECUSADO";
  chave_pix?: string | null;
  tipo_chave_pix?: string | null;
  solicitado_em: string;
  processado_em?: string | null;
  motivo_recusa?: string | null;
};

type Props = {
  nomeUsuario: string;
  nomeExibido: string;
  perfilUsuario: string;
  podeGerenciar: boolean;

  nomesConsultoras?: string[];
  pixPorColaboradora?: Record<string, { chave: string; tipo: string }>;
  consultoraSelecionada: string;
  competencia: string;

  producaoCompra: number;
  producaoClt: number;
  producaoDigitada: number;
  producaoConfirmada: number;
  producaoEmFormacao: number;
  valorPagoBruto: number;
  contratosDigitados: number;
  contratosConfirmados: number;
  contratosEmFormacao: number;
  contratosForaPrazo?: number;

  pontosCompraPrevistos: number;
  pontosCltPrevistos: number;
  pontosTotalPrevisto: number;
  faixaCompra: string;
  faixaClt: string;
  complementoCompraComClt: number;
  comissaoEmpresa: number;

  movimentos?: MovimentoPremiacao[];
  saldoPontos: number;
  saldoDisponivelSaque: number;
  premiacaoJaLiberada: boolean;

  saques?: SaquePremiacao[];
  extrato?: any[];
  processando: boolean;

  onConsultoraChange: (nome: string) => void;
  onCompetenciaChange: (competencia: string) => void;
  onAtualizar: () => void | Promise<void>;
  onLiberarPremiacao: (
    pontosCompra: number,
    pontosClt: number,
  ) => Promise<void>;
  onSolicitarSaque: (
    pontos: number,
    chavePix: string,
  ) => Promise<void>;
  onProcessarSaque: (
    saqueId: string,
    acao: "PAGO" | "RECUSADO",
  ) => Promise<void>;
  onSalvarPix: (
    usuarioId: string,
    tipoPix: string,
    chavePix: string,
  ) => Promise<void>;
};

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function pontos(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function porcentagem(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function dataPt(valor?: string | null) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString("pt-BR");
}

export default function MinhaPremiacaoV2(props: Props) {
  const {
    nomeUsuario,
    nomeExibido,
    podeGerenciar,
    nomesConsultoras = [],
    pixPorColaboradora = {},
    consultoraSelecionada,
    competencia,
    producaoCompra,
    producaoClt,
    producaoDigitada,
    producaoConfirmada,
    producaoEmFormacao,
    valorPagoBruto,
    contratosDigitados,
    contratosConfirmados,
    contratosEmFormacao,
    contratosForaPrazo = 0,
    pontosCompraPrevistos,
    pontosCltPrevistos,
    pontosTotalPrevisto,
    faixaCompra,
    faixaClt,
    complementoCompraComClt,
    comissaoEmpresa,
    movimentos = [],
    saldoPontos,
    saldoDisponivelSaque,
    premiacaoJaLiberada,
    saques = [],
    extrato = [],
    processando,
    onConsultoraChange,
    onCompetenciaChange,
    onAtualizar,
    onLiberarPremiacao,
    onSolicitarSaque,
    onProcessarSaque,
    onSalvarPix,
  } = props;

  const [abaAdmin, setAbaAdmin] = useState<
    "conferencia" | "liberados" | "saques"
  >("conferencia");
  const [filtroProduto, setFiltroProduto] = useState<
    "todos" | "compra" | "clt"
  >("todos");
  const [busca, setBusca] = useState("");
  const [modalConferencia, setModalConferencia] = useState(false);
  const [modalSaque, setModalSaque] = useState(false);
  const [pontosCompraLiberar, setPontosCompraLiberar] = useState(
    String(Number(pontosCompraPrevistos ?? 0) || 0),
  );
  const [pontosCltLiberar, setPontosCltLiberar] = useState(
    String(Number(pontosCltPrevistos ?? 0) || 0),
  );
  const [pontosSaque, setPontosSaque] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [erroModal, setErroModal] = useState("");
  const [pixCopiado, setPixCopiado] = useState("");
  const [modalPix, setModalPix] = useState(false);
  const [tipoPixCadastro, setTipoPixCadastro] = useState("CPF");
  const [chavePixCadastro, setChavePixCadastro] = useState("");
  const compraPrevistaSegura = Number(pontosCompraPrevistos ?? 0) || 0;
  const cltPrevistaSegura = Number(pontosCltPrevistos ?? 0) || 0;

  const consultorasFiltradas = nomesConsultoras.filter((nome) =>
    nome.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  const saquesPendentes = saques.filter(
    (saque) => saque.status === "SOLICITADO",
  );
  const saquesProcessados = saques.filter(
    (saque) => saque.status !== "SOLICITADO",
  );

  const creditosLiberados = useMemo(
    () => extrato.filter((item) => item.tipo === "CREDITO"),
    [extrato],
  );

  const movimentosFiltrados = useMemo(() => {
    if (filtroProduto === "compra") {
      return movimentos.filter(
        (item) => item.produto === "Compra de Dívida",
      );
    }

    if (filtroProduto === "clt") {
      return movimentos.filter((item) => item.produto === "CLT");
    }

    return movimentos;
  }, [movimentos, filtroProduto]);

  function chaveNomePix(nome: string) {
    return String(nome || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function pixDaColaboradora(nome: string) {
    return pixPorColaboradora[chaveNomePix(nome)] || { chave: "", tipo: "" };
  }

  async function copiarPix(nome: string) {
    const pix = pixDaColaboradora(nome).chave;
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix);
      setPixCopiado(nome);
      window.setTimeout(() => setPixCopiado(""), 1600);
    } catch {
      setPixCopiado("");
    }
  }

  function abrirConferencia() {
    setPontosCompraLiberar(String(compraPrevistaSegura));
    setPontosCltLiberar(String(cltPrevistaSegura));
    setErroModal("");
    setModalConferencia(true);
  }

  async function confirmarLiberacao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const compra = Number(
      String(pontosCompraLiberar).replace(/\./g, "").replace(",", "."),
    );
    const clt = Number(
      String(pontosCltLiberar).replace(/\./g, "").replace(",", "."),
    );

    if (!Number.isFinite(compra) || compra < 0) {
      setErroModal("Informe uma pontuação válida para Compra.");
      return;
    }

    if (!Number.isFinite(clt) || clt < 0) {
      setErroModal("Informe uma pontuação válida para CLT.");
      return;
    }

    try {
      await onLiberarPremiacao(compra, clt);
      setModalConferencia(false);
    } catch (erro) {
      setErroModal(
        erro instanceof Error ? erro.message : "Não foi possível liberar.",
      );
    }
  }

  async function enviarSaque(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroModal("");

    const quantidade = Number(
      String(pontosSaque).replace(/\./g, "").replace(",", "."),
    );

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      setErroModal("Informe quantos pontos deseja sacar.");
      return;
    }

    if (quantidade > saldoDisponivelSaque) {
      setErroModal("A quantidade é maior que o saldo disponível.");
      return;
    }

    if (chavePix.trim().length < 3) {
      setErroModal("Informe uma chave PIX válida.");
      return;
    }

    try {
      await onSolicitarSaque(quantidade, chavePix.trim());
      setModalSaque(false);
      setPontosSaque("");
      setChavePix("");
    } catch (erro) {
      setErroModal(
        erro instanceof Error
          ? erro.message
          : "Não foi possível solicitar o saque.",
      );
    }
  }

  if (podeGerenciar) {
    return (
      <div className="premio-v4-page">
        <section className="premio-v4-hero">
          <div>
            <span>GESTÃO DE PREMIAÇÃO</span>
            <h2>Central de Premiação</h2>
            <p>
              O sistema calcula automaticamente. Você confere e só depois
              libera os pontos para a colaboradora.
            </p>
          </div>

          <div className="premio-v4-periodo">
            <label>
              <span>Competência</span>
              <div>
                <CalendarDays size={17} />
                <input
                  type="month"
                  value={competencia}
                  onChange={(e) => onCompetenciaChange(e.target.value)}
                />
              </div>
            </label>
            <button
              type="button"
              className="premio-v4-refresh"
              onClick={() => void onAtualizar()}
              disabled={processando}
            >
              <RefreshCcw
                size={17}
                className={processando ? "is-spinning" : ""}
              />
              {processando ? "Atualizando..." : "Atualizar e recalcular"}
            </button>
          </div>
        </section>

        <nav className="premio-v4-tabs">
          <button
            type="button"
            className={abaAdmin === "conferencia" ? "active" : ""}
            onClick={() => setAbaAdmin("conferencia")}
          >
            <ShieldCheck size={17} />
            Conferência
          </button>
          <button
            type="button"
            className={abaAdmin === "liberados" ? "active" : ""}
            onClick={() => setAbaAdmin("liberados")}
          >
            <CheckCircle2 size={17} />
            Pontos liberados
          </button>
          <button
            type="button"
            className={abaAdmin === "saques" ? "active" : ""}
            onClick={() => setAbaAdmin("saques")}
          >
            <WalletCards size={17} />
            Solicitações de saque
            {saquesPendentes.length > 0 && (
              <b>{saquesPendentes.length}</b>
            )}
          </button>
        </nav>

        {abaAdmin === "conferencia" && (
          <>
            <section className="premio-v4-kpis">
              <article>
                <span>Produção válida Compra</span>
                <strong>{moeda(producaoCompra)}</strong>
                <small>{faixaCompra || "Abaixo da primeira faixa"}</small>
              </article>
              <article>
                <span>Produção CLT</span>
                <strong>{moeda(producaoClt)}</strong>
                <small>{faixaClt || "Abaixo da primeira faixa"}</small>
              </article>
              <article className="internal">
                <span>Comissão gerada para a empresa</span>
                <strong>{moeda(comissaoEmpresa)}</strong>
                <small>Informação interna da gestão</small>
              </article>
              <article className="points">
                <span>Pontuação automática</span>
                <strong>{pontos(pontosTotalPrevisto)} pts</strong>
                <small>1 ponto = R$ 1,00</small>
              </article>
            </section>

            <section className="premio-v4-layout">
              <aside className="premio-v4-pessoas">
                <div className="premio-v4-side-head">
                  <span>COLABORADORAS</span>
                  <h3>Conferência do mês</h3>
                </div>

                <div className="premio-v4-search">
                  <Search size={16} />
                  <input
                    placeholder="Pesquisar colaboradora..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>

                <div className="premio-v4-pessoas-list">
                  {consultorasFiltradas.map((nome) => (
                    <button
                      type="button"
                      key={nome}
                      className={
                        nome === consultoraSelecionada ? "active" : ""
                      }
                      onClick={() => onConsultoraChange(nome)}
                    >
                      <span>{nome.charAt(0).toUpperCase()}</span>
                      <div>
                        <strong>{nome}</strong>
                        <small className={pixDaColaboradora(nome).chave ? "premio-v4-pix-ok" : "premio-v4-pix-missing"}>
                          {pixDaColaboradora(nome).chave ? "PIX cadastrado" : "Sem PIX cadastrado"}
                        </small>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              </aside>

              <main className="premio-v4-main">
                <section className="premio-v4-resumo">
                  <div className="premio-v4-resumo-head">
                    <div>
                      <span>PRÉVIA AUTOMÁTICA</span>
                      <h3>{nomeExibido}</h3>
                      <p>
                        {contratosConfirmados} contrato(s) confirmado(s) na
                        competência.
                      </p>
                    </div>

                    <div className="premio-v4-pix-box">
                      <span>PIX DA COLABORADORA</span>
                      {pixDaColaboradora(nomeExibido).chave ? (
                        <>
                          <small>{pixDaColaboradora(nomeExibido).tipo || "PIX"}</small>
                          <div>
                            <strong>{pixDaColaboradora(nomeExibido).chave}</strong>
                            <button type="button" onClick={() => void copiarPix(nomeExibido)}>
                              {pixCopiado === nomeExibido ? "Copiado ✓" : "Copiar PIX"}
                            </button>
                            <button type="button" onClick={() => {
                              const atual = pixDaColaboradora(nomeExibido);
                              setTipoPixCadastro(atual.tipo || "CPF");
                              setChavePixCadastro(atual.chave || "");
                              setModalPix(true);
                            }}>Editar</button>
                          </div>
                        </>
                      ) : (
                        <button type="button" className="premio-v4-cadastrar-pix" onClick={() => {
                          setTipoPixCadastro("CPF");
                          setChavePixCadastro("");
                          setModalPix(true);
                        }}>+ Cadastrar PIX</button>
                      )}
                    </div>

                    <span
                      className={
                        premiacaoJaLiberada
                          ? "premio-v4-status released"
                          : "premio-v4-status"
                      }
                    >
                      {premiacaoJaLiberada ? (
                        <>
                          <Check size={14} /> Liberada
                        </>
                      ) : (
                        <>
                          <Clock3 size={14} /> Aguardando conferência
                        </>
                      )}
                    </span>
                  </div>

                  <div className="premio-v4-resumo-grid">
                    <article>
                      <span>Digitadas</span>
                      <strong>{moeda(producaoDigitada)}</strong>
                      <small>{contratosDigitados} proposta(s) da competência</small>
                    </article>
                    <article>
                      <span>Contratos pagos</span>
                      <strong>{moeda(valorPagoBruto)}</strong>
                      <small>
                        {movimentos.filter((m) => m.produto === "Compra de Dívida").length} contrato(s) pago(s) até dia 19
                        {contratosForaPrazo > 0
                          ? ` • ${contratosForaPrazo} pago(s) fora do prazo`
                          : ""}
                      </small>
                    </article>
                    <article>
                      <span>Aguardando pagar</span>
                      <strong>{moeda(producaoEmFormacao)}</strong>
                      <small>{contratosEmFormacao} proposta(s) ainda não paga(s)</small>
                    </article>
                    <article>
                      <span>Premiação</span>
                      <strong>{pontos(pontosCompraPrevistos + pontosCltPrevistos)} pts</strong>
                      <small>{premiacaoJaLiberada ? "Premiação paga / liberada" : "Aguardando sua conferência"}</small>
                    </article>
                  </div>

                  {complementoCompraComClt > 0 && (
                    <div className="premio-v4-rule">
                      <BadgeDollarSign size={18} />
                      <div>
                        <strong>Regra CLT + Compra abaixo de R$ 30 mil</strong>
                        <span>
                          O CLT ativou a premiação e a Compra gerou{" "}
                          <b>{moeda(complementoCompraComClt)}</b> de
                          complemento de 1%.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="premio-v4-total">
                    <div>
                      <span>Pontuação prevista</span>
                      <strong>{pontos(pontosTotalPrevisto)} pts</strong>
                      <small>
                        Equivalente a {moeda(pontosTotalPrevisto)}
                      </small>
                    </div>

                    <button
                      type="button"
                      onClick={abrirConferencia}
                      disabled={premiacaoJaLiberada || processando}
                    >
                      {premiacaoJaLiberada
                        ? "Premiação já liberada"
                        : "Conferir e liberar"}
                    </button>
                  </div>
                </section>

                <section className="premio-v4-detail">
                  <div className="premio-v4-section-head">
                    <div>
                      <span>DETALHAMENTO DOS CONTRATOS</span>
                      <h3>Como a produção foi formada</h3>
                      <p>
                        Os contratos não ganham pontos individualmente. Cada
                        contrato forma a produção válida; a faixa é aplicada
                        sobre o total.
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: 4,
                          border: "1px solid #dce5f2",
                          borderRadius: 10,
                          background: "#f7f9fc",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setFiltroProduto("todos")}
                          style={{
                            minHeight: 32,
                            padding: "0 11px",
                            border: 0,
                            borderRadius: 7,
                            background:
                              filtroProduto === "todos" ? "#1f61ee" : "transparent",
                            color:
                              filtroProduto === "todos" ? "#ffffff" : "#6c7c94",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          Todos
                        </button>

                        <button
                          type="button"
                          onClick={() => setFiltroProduto("compra")}
                          style={{
                            minHeight: 32,
                            padding: "0 11px",
                            border: 0,
                            borderRadius: 7,
                            background:
                              filtroProduto === "compra" ? "#1f61ee" : "transparent",
                            color:
                              filtroProduto === "compra" ? "#ffffff" : "#6c7c94",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          Compra de Dívida
                        </button>

                        <button
                          type="button"
                          onClick={() => setFiltroProduto("clt")}
                          style={{
                            minHeight: 32,
                            padding: "0 11px",
                            border: 0,
                            borderRadius: 7,
                            background:
                              filtroProduto === "clt" ? "#1f61ee" : "transparent",
                            color:
                              filtroProduto === "clt" ? "#ffffff" : "#6c7c94",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          CLT
                        </button>
                      </div>

                      <b>{movimentosFiltrados.length}</b>
                    </div>
                  </div>

                  <div className="premio-v4-rule">
                    <BadgeDollarSign size={18} />
                    <div>
                      <strong>Produção válida para a faixa: {moeda(producaoCompra)}</strong>
                      <span>
                        Faixa automática: {pontosCompraPrevistos > 0 ? `${pontos(pontosCompraPrevistos)} pts` : "ainda não atingida"}.
                        Os pontos são calculados sobre o total, não por contrato.
                      </span>
                    </div>
                  </div>
                  <div className="premio-v4-table-wrap">
                    <table className="premio-v4-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Cliente</th>
                          <th>Produto</th>
                          <th>Valor contrato</th>
                          <th>Peso tabela</th>
                          <th>Produção válida</th>
                          <th className="internal-col">Comissão empresa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimentosFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan={7}>
                              <div className="premio-v4-empty">
                                Nenhum contrato encontrado para o filtro selecionado.
                              </div>
                            </td>
                          </tr>
                        ) : (
                          movimentosFiltrados.map((item) => (
                            <tr key={item.id}>
                              <td>{dataPt(item.data)}</td>
                              <td>
                                <strong>{item.cliente}</strong>
                                <small>
                                  {item.tabela || item.descricao || "—"}
                                </small>
                              </td>
                              <td>
                                <span className="premio-v4-product">
                                  {item.produto}
                                </span>
                              </td>
                              <td>
                                {item.produto === "Compra de Dívida"
                                  ? moeda(item.valorContrato)
                                  : "—"}
                              </td>
                              <td>
                                {item.produto === "Compra de Dívida"
                                  ? `${porcentagem(item.pesoTabela)}%`
                                  : "—"}
                              </td>
                              <td>
                                <b>{moeda(item.producaoValida)}</b>
                              </td>
                              <td className="internal-col">
                                {item.produto === "Compra de Dívida"
                                  ? moeda(item.comissaoEmpresa)
                                  : "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </main>
            </section>
          </>
        )}

        {abaAdmin === "liberados" && (
          <section className="premio-v4-panel">
            <div className="premio-v4-section-head">
              <div>
                <span>HISTÓRICO INTERNO</span>
                <h3>Pontos liberados</h3>
                <p>Créditos já confirmados pela gestão.</p>
              </div>
              <b>{creditosLiberados.length}</b>
            </div>

            <div className="premio-v4-history">
              {creditosLiberados.length === 0 ? (
                <div className="premio-v4-empty">
                  Nenhuma premiação liberada ainda.
                </div>
              ) : (
                creditosLiberados.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.usuario_nome || "Colaboradora"}</strong>
                      <span>
                        {item.descricao || "Premiação liberada"} ·{" "}
                        {dataPt(item.criado_em)}
                      </span>
                    </div>
                    <b>+ {pontos(Number(item.pontos || 0))} pts</b>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {abaAdmin === "saques" && (
          <section className="premio-v4-panel">
            <div className="premio-v4-section-head">
              <div>
                <span>CONTROLE DE SAQUES</span>
                <h3>Solicitações das colaboradoras</h3>
                <p>
                  Tudo que elas solicitarem aparece automaticamente aqui.
                </p>
              </div>
              <b>{saquesPendentes.length}</b>
            </div>

            <div className="premio-v4-saque-list">
              {saquesPendentes.length === 0 ? (
                <div className="premio-v4-empty">
                  Nenhuma solicitação pendente.
                </div>
              ) : (
                saquesPendentes.map((saque) => (
                  <article key={saque.id}>
                    <div className="premio-v4-saque-user">
                      <span>
                        {saque.usuario_nome?.charAt(0).toUpperCase() || "U"}
                      </span>
                      <div>
                        <strong>{saque.usuario_nome}</strong>
                        <small>
                          Solicitado em {dataPt(saque.solicitado_em)}
                        </small>
                      </div>
                    </div>

                    <div>
                      <span>Pontos</span>
                      <strong>
                        {pontos(Number(saque.pontos_solicitados || 0))}
                      </strong>
                    </div>

                    <div>
                      <span>Valor</span>
                      <strong>
                        {moeda(
                          Number(
                            saque.valor_reais ||
                              saque.pontos_solicitados ||
                              0,
                          ),
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>PIX</span>
                      <strong>{saque.chave_pix || "Não informado"}</strong>
                    </div>

                    <div className="premio-v4-saque-actions">
                      <button
                        type="button"
                        className="pay"
                        onClick={() =>
                          void onProcessarSaque(saque.id, "PAGO")
                        }
                        disabled={processando}
                      >
                        <Check size={15} />
                        Marcar pago
                      </button>
                      <button
                        type="button"
                        className="reject"
                        onClick={() =>
                          void onProcessarSaque(saque.id, "RECUSADO")
                        }
                        disabled={processando}
                      >
                        <X size={15} />
                        Recusar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            {saquesProcessados.length > 0 && (
              <div className="premio-v4-processed">
                <h4>Histórico processado</h4>
                {saquesProcessados.slice(0, 20).map((saque) => (
                  <div key={saque.id}>
                    <span>{saque.usuario_nome}</span>
                    <span>{pontos(saque.pontos_solicitados)} pts</span>
                    <b className={saque.status.toLowerCase()}>
                      {saque.status}
                    </b>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {modalPix && (
          <div className="premio-v4-modal-bg" onClick={() => setModalPix(false)}>
            <form
              className="premio-v4-modal"
              onSubmit={async (e) => {
                e.preventDefault();
                setErroModal("");
                if (!chavePixCadastro.trim()) {
                  setErroModal("Informe a chave PIX.");
                  return;
                }
                try {
                  await onSalvarPix("", tipoPixCadastro, chavePixCadastro.trim());
                  setModalPix(false);
                } catch (erro) {
                  setErroModal(erro instanceof Error ? erro.message : "Não foi possível salvar o PIX.");
                }
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="premio-v4-modal-head">
                <div>
                  <span>PIX DA COLABORADORA</span>
                  <h3>{nomeExibido}</h3>
                  <p>Cadastre a chave que será usada para pagamento da premiação.</p>
                </div>
                <button type="button" onClick={() => setModalPix(false)}>×</button>
              </div>
              <label className="premio-v4-modal-field">
                Tipo da chave
                <select value={tipoPixCadastro} onChange={(e) => setTipoPixCadastro(e.target.value)}>
                  <option>CPF</option>
                  <option>Celular</option>
                  <option>E-mail</option>
                  <option>Chave aleatória</option>
                </select>
              </label>
              <label className="premio-v4-modal-field">
                Chave PIX
                <input value={chavePixCadastro} onChange={(e) => setChavePixCadastro(e.target.value)}
                  placeholder="Digite a chave PIX" />
              </label>
              {erroModal && <div className="premio-v4-modal-error">{erroModal}</div>}
              <div className="premio-v4-modal-actions">
                <button type="button" onClick={() => setModalPix(false)}>Cancelar</button>
                <button type="submit" className="primary" disabled={processando}>Salvar PIX</button>
              </div>
            </form>
          </div>
        )}

        {modalConferencia && (
          <div
            className="premio-v4-modal-bg"
            onClick={() => setModalConferencia(false)}
          >
            <form
              className="premio-v4-modal"
              onSubmit={confirmarLiberacao}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="premio-v4-modal-head">
                <div>
                  <span>CONFERÊNCIA FINAL</span>
                  <h3>{nomeExibido}</h3>
                  <p>
                    O sistema calculou automaticamente. Você pode corrigir
                    antes de liberar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalConferencia(false)}
                >
                  ×
                </button>
              </div>

              <div className="premio-v4-modal-grid">
                <label>
                  Pontos Compra
                  <input
                    value={pontosCompraLiberar}
                    onChange={(e) =>
                      setPontosCompraLiberar(e.target.value)
                    }
                  />
                  <small>
                    Automático: {pontos(compraPrevistaSegura)} pts
                  </small>
                </label>

                <label>
                  Pontos CLT / complemento
                  <input
                    value={pontosCltLiberar}
                    onChange={(e) => setPontosCltLiberar(e.target.value)}
                  />
                  <small>
                    Automático: {pontos(cltPrevistaSegura)} pts
                  </small>
                </label>
              </div>

              <div className="premio-v4-modal-total">
                <span>Total a liberar</span>
                <strong>
                  {pontos(
                    (Number(
                      String(pontosCompraLiberar || "0").replace(",", "."),
                    ) || 0) +
                      (Number(
                        String(pontosCltLiberar || "0").replace(",", "."),
                      ) || 0),
                  )}{" "}
                  pts
                </strong>
              </div>

              {erroModal && (
                <div className="premio-v4-modal-error">{erroModal}</div>
              )}

              <div className="premio-v4-modal-actions">
                <button
                  type="button"
                  onClick={() => setModalConferencia(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={processando}
                >
                  Confirmar e liberar pontos
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  const meusSaquesPendentes = saques.filter(
    (saque) =>
      saque.status === "SOLICITADO" &&
      saque.usuario_nome &&
      saque.usuario_nome.toLowerCase() === nomeUsuario.toLowerCase(),
  );

  return (
    <div className="premio-v4-page colaborador">
      <section className="premio-v4-colab-hero">
        <div>
          <span>MINHA PREMIAÇÃO</span>
          <h2>Olá, {nomeExibido || nomeUsuario}!</h2>
          <p>
            Aqui aparecem somente os pontos que já foram conferidos e
            liberados pela gestão.
          </p>
        </div>

        <label>
          <CalendarDays size={17} />
          <input
            type="month"
            value={competencia}
            onChange={(e) => onCompetenciaChange(e.target.value)}
          />
        </label>
      </section>

      <section className="premio-v4-colab-cards">
        <article className="wallet">
          <div>
            <Coins size={23} />
            <span>PONTOS DISPONÍVEIS</span>
          </div>
          <strong>{pontos(saldoPontos)}</strong>
          <p>1 ponto = R$ 1,00</p>
          <footer>
            <span>{nomeExibido}</span>
            <b>{moeda(saldoPontos)}</b>
          </footer>
        </article>

        <article>
          <Landmark size={23} />
          <span>Disponível para novo saque</span>
          <strong>{pontos(saldoDisponivelSaque)} pts</strong>
          <small>{moeda(saldoDisponivelSaque)}</small>
        </article>

        <article>
          <History size={23} />
          <span>Solicitações pendentes</span>
          <strong>{meusSaquesPendentes.length}</strong>
          <small>Aguardando a gestão</small>
        </article>
      </section>

      <section className="premio-v4-colab-actions">
        <button
          type="button"
          disabled={saldoDisponivelSaque <= 0}
          onClick={() => {
            setErroModal("");
            setPontosSaque(
              saldoDisponivelSaque > 0
                ? String(saldoDisponivelSaque)
                : "",
            );
            setModalSaque(true);
          }}
        >
          <span>
            <WalletCards size={21} />
          </span>
          <div>
            <strong>Solicitar saque</strong>
            <small>
              Envie a solicitação para a gestão. O pagamento será baixado
              pelo sistema.
            </small>
          </div>
          <ChevronRight size={17} />
        </button>
      </section>

      <section className="premio-v4-panel">
        <div className="premio-v4-section-head">
          <div>
            <span>MEU EXTRATO</span>
            <h3>Pontos e saques</h3>
            <p>Histórico do que já foi liberado ou pago.</p>
          </div>
        </div>

        <div className="premio-v4-history">
          {extrato.length === 0 ? (
            <div className="premio-v4-empty">
              Nenhum lançamento disponível.
            </div>
          ) : (
            extrato.slice(0, 30).map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.descricao || item.origem}</strong>
                  <span>{dataPt(item.criado_em)}</span>
                </div>
                <b
                  className={
                    item.tipo === "DEBITO" ? "negative" : "positive"
                  }
                >
                  {item.tipo === "DEBITO" ? "−" : "+"}{" "}
                  {pontos(Math.abs(Number(item.pontos || 0)))} pts
                </b>
              </article>
            ))
          )}
        </div>
      </section>

      {modalSaque && (
        <div
          className="premio-v4-modal-bg"
          onClick={() => setModalSaque(false)}
        >
          <form
            className="premio-v4-modal"
            onSubmit={enviarSaque}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="premio-v4-modal-head">
              <div>
                <span>SOLICITAR SAQUE</span>
                <h3>Resgatar pontos</h3>
                <p>
                  1 ponto vale R$ 1,00. A solicitação aparecerá
                  automaticamente para a gestão.
                </p>
              </div>
              <button type="button" onClick={() => setModalSaque(false)}>
                ×
              </button>
            </div>

            <div className="premio-v4-modal-balance">
              <span>Saldo disponível</span>
              <strong>{pontos(saldoDisponivelSaque)} pts</strong>
              <b>{moeda(saldoDisponivelSaque)}</b>
            </div>

            <label className="premio-v4-modal-field">
              Quantos pontos deseja sacar?
              <input
                value={pontosSaque}
                onChange={(e) => setPontosSaque(e.target.value)}
                placeholder="Ex.: 500"
              />
            </label>

            <label className="premio-v4-modal-field">
              Chave PIX
              <input
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                placeholder="CPF, celular, e-mail ou chave aleatória"
              />
            </label>

            {erroModal && (
              <div className="premio-v4-modal-error">{erroModal}</div>
            )}

            <div className="premio-v4-modal-actions">
              <button type="button" onClick={() => setModalSaque(false)}>
                Cancelar
              </button>
              <button type="submit" className="primary">
                Enviar solicitação
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
