"use client";
// ELEVA | FINANCEIRO | RECEBIMENTOS CLT | 29/10/2026

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import "../baixas.css";

type SituacaoFiltro = "TODOS" | "A_RECEBER" | "PARCIAL" | "FINALIZADO";

type RecebimentoCltItem = {
  id: string;
  cltRegistroId: string;
  numeroProposta: string;
  cliente: string;
  cpf: string;
  consultora: string;
  banco: string;
  tabela: string;
  codigoTabela: string;
  valorOperacao: number;
  dataEmissao: string;
  percentualComissao: number;
  comissaoPrevista: number;
  valorRecebido: number;
  dataRecebimento: string | null;
  observacao: string | null;
  recebimentoId: string | null;
  comissaoConfigurada: boolean;
};

type RespostaApi = {
  itens?: RecebimentoCltItem[];
  semComissaoConfigurada?: number;
  totalPagosClt?: number;
  erro?: string;
  mensagem?: string;
};

type LinhaComSituacao = RecebimentoCltItem & {
  situacaoExibicao: SituacaoFiltro;
};

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(valor?: string | null) {
  if (!valor) return "—";
  const [ano, mes, dia] = String(valor).slice(0, 10).split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : String(valor);
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizar(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function somenteNumeros(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

function formatarCpf(valor: string) {
  const numeros = somenteNumeros(valor).slice(0, 11);
  return numeros
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function converterValor(valor: string) {
  const texto = String(valor || "")
    .trim()
    .replace(/[^\d,.-]/g, "");
  if (!texto) return 0;

  let normalizado = texto;
  if (texto.includes(",") && texto.includes(".")) {
    normalizado = texto.replace(/\./g, "").replace(",", ".");
  } else if (texto.includes(",")) {
    normalizado = texto.replace(",", ".");
  }

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function valorParaInput(valor: number) {
  return Number(valor || 0).toFixed(2).replace(".", ",");
}

function calcularSituacao(item: RecebimentoCltItem): SituacaoFiltro {
  const previsto = Number(item.comissaoPrevista || 0);
  const recebido = Number(item.valorRecebido || 0);

  if (!item.dataRecebimento || recebido <= 0) return "A_RECEBER";
  if (recebido + 0.01 < previsto) return "PARCIAL";
  return "FINALIZADO";
}

function textoSituacao(situacao: SituacaoFiltro) {
  if (situacao === "A_RECEBER") return "À RECEBER";
  if (situacao === "PARCIAL") return "REC. PARCIAL";
  if (situacao === "FINALIZADO") return "FINALIZADO";
  return "TODOS";
}

function classeSituacao(situacao: SituacaoFiltro) {
  if (situacao === "A_RECEBER") return "situacao-receber";
  if (situacao === "PARCIAL") return "situacao-parcial";
  if (situacao === "FINALIZADO") return "situacao-finalizado";
  return "";
}

export default function RecebimentosCltManager() {
  const supabase = useMemo(() => createClient(), []);

  const [itens, setItens] = useState<RecebimentoCltItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [semComissaoConfigurada, setSemComissaoConfigurada] = useState(0);

  const [busca, setBusca] = useState("");
  const [filtroBanco, setFiltroBanco] = useState("TODOS");
  const [filtroSituacao, setFiltroSituacao] =
    useState<SituacaoFiltro>("A_RECEBER");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  const [selecionada, setSelecionada] = useState<RecebimentoCltItem | null>(null);
  const [selecionadasIds, setSelecionadasIds] = useState<Set<string>>(new Set());
  const [valorRecebidoEditavel, setValorRecebidoEditavel] = useState("");
  const [dataRecebimentoEditavel, setDataRecebimentoEditavel] = useState(hojeIso());
  const [observacaoEditavel, setObservacaoEditavel] = useState("");
  const [motivoAlteracao, setMotivoAlteracao] = useState("");

  const obterToken = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      throw new Error("Sua sessão expirou. Entre novamente no sistema.");
    }
    return data.session.access_token;
  }, [supabase]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setMensagem("");

    try {
      const token = await obterToken();
      const resposta = await fetch("/api/financeiro/recebimentos-clt", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const conteudo = (await resposta.json()) as RespostaApi;

      if (!resposta.ok) {
        throw new Error(conteudo.erro || "Não foi possível carregar os recebimentos CLT.");
      }

      setItens(Array.isArray(conteudo.itens) ? conteudo.itens : []);
      setSemComissaoConfigurada(Number(conteudo.semComissaoConfigurada || 0));
    } catch (erro) {
      setItens([]);
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar os recebimentos CLT.",
      );
    } finally {
      setCarregando(false);
    }
  }, [obterToken]);

  useEffect(() => {
    void carregar();
    const atualizar = () => void carregar();
    window.addEventListener("focus", atualizar);
    return () => window.removeEventListener("focus", atualizar);
  }, [carregar]);

  const linhas = useMemo<LinhaComSituacao[]>(
    () =>
      itens.map((item) => ({
        ...item,
        situacaoExibicao: calcularSituacao(item),
      })),
    [itens],
  );

  const bancos = useMemo(
    () =>
      Array.from(
        new Set(
          linhas
            .map((item) => String(item.banco || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [linhas],
  );

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);
    const numeros = somenteNumeros(busca);

    return linhas.filter((item) => {
      const correspondeBusca =
        !termo ||
        normalizar(item.numeroProposta).includes(termo) ||
        normalizar(item.cltRegistroId).includes(termo) ||
        normalizar(item.cliente).includes(termo) ||
        (numeros.length > 0 && somenteNumeros(item.cpf).includes(numeros)) ||
        normalizar(item.consultora).includes(termo) ||
        normalizar(item.banco).includes(termo) ||
        normalizar(item.tabela).includes(termo) ||
        normalizar(item.codigoTabela).includes(termo);

      const numeroPesquisado = somenteNumeros(busca);
      const numeroDaProposta = somenteNumeros(item.numeroProposta);
      if (
        numeroPesquisado.length > 0 &&
        numeroDaProposta &&
        numeroDaProposta === numeroPesquisado
      ) {
        return true;
      }

      const correspondeBanco =
        filtroBanco === "TODOS" || item.banco === filtroBanco;
      const correspondeSituacao =
        filtroSituacao === "TODOS" || item.situacaoExibicao === filtroSituacao;
      const emissao = String(item.dataEmissao || "").slice(0, 10);
      const correspondeDatas =
        (!dataInicial || emissao >= dataInicial) &&
        (!dataFinal || emissao <= dataFinal);

      return (
        correspondeBusca &&
        correspondeBanco &&
        correspondeSituacao &&
        correspondeDatas
      );
    });
  }, [linhas, busca, filtroBanco, filtroSituacao, dataInicial, dataFinal]);

  const resumo = useMemo(() => {
    const aReceber = linhas.filter((item) => item.situacaoExibicao === "A_RECEBER");
    const parciais = linhas.filter((item) => item.situacaoExibicao === "PARCIAL");
    const finalizadas = linhas.filter((item) => item.situacaoExibicao === "FINALIZADO");

    return {
      aReceber: aReceber.length,
      parciais: parciais.length,
      finalizadas: finalizadas.length,
      comissoesAReceber: aReceber.reduce(
        (total, item) => total + Number(item.comissaoPrevista || 0),
        0,
      ),
      saldoParcial: parciais.reduce(
        (total, item) =>
          total +
          Math.max(
            0,
            Number(item.comissaoPrevista || 0) - Number(item.valorRecebido || 0),
          ),
        0,
      ),
      recebido: linhas.reduce(
        (total, item) => total + Number(item.valorRecebido || 0),
        0,
      ),
    };
  }, [linhas]);

  const selecionadas = useMemo(
    () => linhas.filter((item) => selecionadasIds.has(item.id)),
    [linhas, selecionadasIds],
  );

  const totalSelecionado = useMemo(
    () =>
      selecionadas.reduce(
        (total, item) => total + Number(item.comissaoPrevista || 0),
        0,
      ),
    [selecionadas],
  );

  const todasFiltradasSelecionadas =
    filtradas.length > 0 && filtradas.every((item) => selecionadasIds.has(item.id));

  function alternarSelecao(id: string) {
    setSelecionadasIds((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function selecionarTodasFiltradas() {
    setSelecionadasIds((atual) => {
      const proximo = new Set(atual);
      if (todasFiltradasSelecionadas) {
        filtradas.forEach((item) => proximo.delete(item.id));
      } else {
        filtradas.forEach((item) => proximo.add(item.id));
      }
      return proximo;
    });
  }

  function limparSelecao() {
    setSelecionadasIds(new Set());
  }

  function abrirRecebimento(item: RecebimentoCltItem) {
    setSelecionada(item);
    setValorRecebidoEditavel(
      item.valorRecebido > 0
        ? valorParaInput(item.valorRecebido)
        : valorParaInput(item.comissaoPrevista),
    );
    setDataRecebimentoEditavel(item.dataRecebimento || hojeIso());
    setObservacaoEditavel(item.observacao || "");
    setMotivoAlteracao("");
    setMensagem("");
  }

  async function salvarRecebimento() {
    if (!selecionada) return;

    const valorRecebido = converterValor(valorRecebidoEditavel);
    if (valorRecebido <= 0) {
      setMensagem("Informe um valor recebido válido.");
      return;
    }
    if (!dataRecebimentoEditavel) {
      setMensagem("Informe a data do pagamento.");
      return;
    }
    if (selecionada.dataRecebimento && !motivoAlteracao.trim()) {
      setMensagem(
        "Informe o motivo da alteração para corrigir um recebimento já registrado.",
      );
      return;
    }

    setProcessando(true);
    setMensagem("");

    try {
      const token = await obterToken();
      const resposta = await fetch("/api/financeiro/recebimentos-clt", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cltRegistroId: selecionada.cltRegistroId,
          valorRecebido,
          dataRecebimento: dataRecebimentoEditavel,
          observacao: observacaoEditavel.trim(),
          motivoAlteracao: motivoAlteracao.trim(),
        }),
      });

      const conteudo = (await resposta.json()) as RespostaApi;
      if (!resposta.ok) {
        throw new Error(conteudo.erro || "Não foi possível salvar o recebimento CLT.");
      }

      setMensagem(conteudo.mensagem || "Recebimento CLT salvo com sucesso.");
      setSelecionada(null);
      setMotivoAlteracao("");
      setSelecionadasIds((atual) => {
        const proximo = new Set(atual);
        proximo.delete(selecionada.id);
        return proximo;
      });
      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error ? erro.message : "Não foi possível salvar o recebimento CLT.",
      );
    } finally {
      setProcessando(false);
    }
  }

  const esperadoSelecionado = Number(selecionada?.comissaoPrevista || 0);
  const recebidoSelecionado = converterValor(valorRecebidoEditavel);
  const saldoSelecionado = Math.max(0, esperadoSelecionado - recebidoSelecionado);

  return (
    <div className="baixas-page baixas-livecred-eleva baixas-compacto-financeiro">
      {semComissaoConfigurada > 0 && (
        <div
          className="baixas-live-mensagem"
          style={{
            borderColor: "#f2cc7b",
            background: "#fff8e8",
            color: "#805300",
          }}
        >
          {semComissaoConfigurada} contrato(s) CLT pago(s) ainda não entram no total porque estão sem tabela vinculada ou sem % comissão banco configurada.
        </div>
      )}

      <section className="baixas-live-card">
        <div className="baixas-live-actions">
          <button
            type="button"
            className={filtroSituacao === "A_RECEBER" ? "active" : ""}
            onClick={() => setFiltroSituacao("A_RECEBER")}
          >
            RECEBER
          </button>
          <button
            type="button"
            className={filtroSituacao === "PARCIAL" ? "active" : ""}
            onClick={() => setFiltroSituacao("PARCIAL")}
          >
            REC. PARCIAL
          </button>
          <button
            type="button"
            className={filtroSituacao === "FINALIZADO" ? "active" : ""}
            onClick={() => setFiltroSituacao("FINALIZADO")}
          >
            FINALIZADOS
          </button>
          <button
            type="button"
            className={filtroSituacao === "TODOS" ? "active" : ""}
            onClick={() => setFiltroSituacao("TODOS")}
          >
            TODOS
          </button>

          <div className="baixas-live-selected">
            <span>{selecionadasIds.size}</span>
            {selecionadasIds.size === 1 ? "SELECIONADO" : "SELECIONADOS"}
          </div>
        </div>

        <div className="baixas-live-total">
          <div className="baixas-live-total-principal">
            <span>
              {selecionadasIds.size > 0
                ? "COMISSÕES CLT SELECIONADAS"
                : "COMISSÕES CLT À RECEBER"}
            </span>
            <strong>
              {selecionadasIds.size > 0
                ? moeda(totalSelecionado)
                : moeda(resumo.comissoesAReceber)}
            </strong>
          </div>

          <div className="baixas-live-selection-actions">
            <button
              type="button"
              onClick={selecionarTodasFiltradas}
              disabled={filtradas.length === 0}
            >
              {todasFiltradasSelecionadas ? "Desmarcar filtradas" : "Selecionar tudo"}
            </button>

            {selecionadasIds.size === 1 && (
              <button
                type="button"
                className="baixas-live-action"
                onClick={() => {
                  const item = selecionadas[0];
                  if (item) abrirRecebimento(item);
                }}
              >
                Dar baixa no selecionado
              </button>
            )}

            {selecionadasIds.size > 0 && (
              <button type="button" className="secondary" onClick={limparSelecao}>
                Limpar seleção
              </button>
            )}
          </div>
        </div>

        <div className="baixas-live-filtros">
          <label className="filtro-busca">
            <span>PESQUISAR</span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Proposta, cliente, CPF, banco ou consultora"
            />
          </label>

          <label>
            <span>BANCO</span>
            <select value={filtroBanco} onChange={(event) => setFiltroBanco(event.target.value)}>
              <option value="TODOS">Todos os bancos</option>
              {bancos.map((banco) => (
                <option key={banco} value={banco}>
                  {banco}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>SITUAÇÃO</span>
            <select
              value={filtroSituacao}
              onChange={(event) => setFiltroSituacao(event.target.value as SituacaoFiltro)}
            >
              <option value="TODOS">Todas</option>
              <option value="A_RECEBER">À receber</option>
              <option value="PARCIAL">Rec. parcial</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </label>

          <label>
            <span>EMISSÃO DE</span>
            <input type="date" value={dataInicial} onChange={(event) => setDataInicial(event.target.value)} />
          </label>

          <label>
            <span>EMISSÃO ATÉ</span>
            <input type="date" value={dataFinal} onChange={(event) => setDataFinal(event.target.value)} />
          </label>
        </div>

        <div className="baixas-live-table-wrapper">
          <table className="baixas-live-table">
            <thead>
              <tr>
                <th></th>
                <th>EMISSÃO</th>
                <th>CPF</th>
                <th>CLIENTE</th>
                <th>BANCO / TABELA</th>
                <th>VL. LIBERADO</th>
                <th>TX. COMISS.</th>
                <th>COMISS. LÍQ.</th>
                <th>RECEBIDO</th>
                <th>SITUAÇÃO</th>
                <th>ESTEIRA</th>
                <th>DATA PAGAMENTO</th>
                <th>AÇÃO</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={13} className="baixas-live-vazio">
                    Carregando comissões CLT...
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={13} className="baixas-live-vazio">
                    Nenhuma comissão CLT encontrada nos filtros.
                  </td>
                </tr>
              ) : (
                filtradas.map((item) => {
                  const ativa = selecionadasIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={ativa ? "selected" : ""}
                      onClick={() => abrirRecebimento(item)}
                      title="Clique na linha para informar o valor e a data do recebimento"
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={ativa}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => alternarSelecao(item.id)}
                        />
                      </td>

                      <td>
                        {dataBR(item.dataEmissao)}
                        <small>{item.numeroProposta}</small>
                      </td>

                      <td>{formatarCpf(item.cpf)}</td>

                      <td>
                        <strong>{item.cliente || "—"}</strong>
                        <small>{item.consultora || "—"}</small>
                      </td>

                      <td>
                        <strong>{item.banco || "—"}</strong>
                        <small>
                          {item.tabela || "—"}
                          {item.codigoTabela ? ` • ${item.codigoTabela}` : ""}
                        </small>
                      </td>

                      <td>
                        <strong>{moeda(item.valorOperacao)}</strong>
                      </td>

                      <td>{item.percentualComissao.toFixed(2).replace(".", ",")}%</td>

                      <td>
                        <strong className="comissao-pill">
                          {moeda(item.comissaoPrevista)}
                        </strong>
                      </td>

                      <td>{moeda(item.valorRecebido)}</td>

                      <td>
                        <span className={`baixas-live-status ${classeSituacao(item.situacaoExibicao)}`}>
                          {textoSituacao(item.situacaoExibicao)}
                        </span>
                      </td>

                      <td>
                        <span className="baixas-live-esteira">● CLT Pago</span>
                      </td>

                      <td>{dataBR(item.dataRecebimento)}</td>

                      <td>
                        <button
                          type="button"
                          className="baixas-live-action"
                          onClick={(event) => {
                            event.stopPropagation();
                            abrirRecebimento(item);
                          }}
                        >
                          {item.situacaoExibicao === "A_RECEBER"
                            ? "Dar baixa"
                            : "Editar baixa"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selecionada && (
        <div className="baixas-live-overlay" onClick={() => setSelecionada(null)}>
          <section className="baixas-live-modal" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>RECEBER COMISSÃO CLT</span>
                <h2>{selecionada.cliente}</h2>
                <p>
                  {selecionada.numeroProposta} • {selecionada.banco}
                  {selecionada.tabela ? ` • ${selecionada.tabela}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setSelecionada(null)}>
                ×
              </button>
            </header>

            <div className="baixas-live-modal-resumo">
              <article>
                <span>EMISSÃO</span>
                <strong>{dataBR(selecionada.dataEmissao)}</strong>
              </article>
              <article>
                <span>VALOR LIBERADO</span>
                <strong>{moeda(selecionada.valorOperacao)}</strong>
              </article>
              <article>
                <span>COMISSÃO ESPERADA</span>
                <strong>{moeda(selecionada.comissaoPrevista)}</strong>
              </article>
              <article>
                <span>SALDO APÓS BAIXA</span>
                <strong>{moeda(saldoSelecionado)}</strong>
              </article>
            </div>

            <div className="baixas-live-modal-grid">
              <label>
                <span>VALOR RECEBIDO</span>
                <input
                  value={valorRecebidoEditavel}
                  onChange={(event) => setValorRecebidoEditavel(event.target.value)}
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  disabled={processando}
                />
              </label>
              <label>
                <span>DATA DO PAGAMENTO</span>
                <input
                  type="date"
                  value={dataRecebimentoEditavel}
                  onChange={(event) => setDataRecebimentoEditavel(event.target.value)}
                  disabled={processando}
                />
              </label>
            </div>

            <label className="baixas-live-observacao">
              <span>OBSERVAÇÃO</span>
              <textarea
                value={observacaoEditavel}
                onChange={(event) => setObservacaoEditavel(event.target.value)}
                placeholder="Observação opcional"
                disabled={processando}
              />
            </label>

            {selecionada.dataRecebimento && (
              <label className="baixas-live-observacao">
                <span>MOTIVO DA ALTERAÇÃO *</span>
                <textarea
                  value={motivoAlteracao}
                  onChange={(event) => setMotivoAlteracao(event.target.value)}
                  placeholder="Informe por que esta baixa está sendo alterada"
                  disabled={processando}
                />
              </label>
            )}

            <footer>
              <button type="button" className="secondary" onClick={() => setSelecionada(null)}>
                Cancelar
              </button>
              <button type="button" onClick={() => void salvarRecebimento()} disabled={processando}>
                {processando
                  ? "Salvando..."
                  : saldoSelecionado > 0
                    ? "Salvar recebimento parcial"
                    : "Finalizar recebimento"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {mensagem && <div className="baixas-live-mensagem">{mensagem}</div>}
    </div>
  );
}