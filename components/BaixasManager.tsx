"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./baixas.css";

type BaixaPagamento = {
  id: string;
  proposta_id: string;
  numero_proposta: string;
  cliente: string;
  cpf: string;
  consultora: string;
  banco: string;
  tabela: string;
  valor_operacao: number;
  valor_liquido: number;
  data_pagamento_proposta: string;
  data_prevista_recebimento: string;
  data_recebimento: string | null;
  comissao_prevista: number;
  valor_recebido: number;
  diferenca: number;
  status: string;
  observacao: string | null;
  data_emissao?: string;
};

type SituacaoFiltro =
  | "TODOS"
  | "A_RECEBER"
  | "PARCIAL"
  | "FINALIZADO";

type LinhaComSituacao = BaixaPagamento & {
  situacaoExibicao: SituacaoFiltro;
  taxaComissao: number;
};

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(valor?: string | null) {
  if (!valor) return "—";

  const [ano, mes, dia] = String(valor)
    .slice(0, 10)
    .split("-");

  return ano && mes && dia
    ? `${dia}/${mes}/${ano}`
    : valor;
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
    normalizado = texto
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (texto.includes(",")) {
    normalizado = texto.replace(",", ".");
  }

  const numero = Number(normalizado);

  return Number.isFinite(numero) ? numero : 0;
}

function valorParaInput(valor: number) {
  return Number(valor || 0)
    .toFixed(2)
    .replace(".", ",");
}

function calcularSituacao(
  item: BaixaPagamento,
): SituacaoFiltro {
  const previsto = Number(item.comissao_prevista || 0);
  const recebido = Number(item.valor_recebido || 0);

  if (!item.data_recebimento || recebido <= 0) {
    return "A_RECEBER";
  }

  if (recebido + 0.01 < previsto) {
    return "PARCIAL";
  }

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

export default function BaixasManager() {
  const supabase = useMemo(() => createClient(), []);

  const [baixas, setBaixas] =
    useState<BaixaPagamento[]>([]);
  const [carregando, setCarregando] =
    useState(true);
  const [processando, setProcessando] =
    useState(false);
  const [mensagem, setMensagem] =
    useState("");

  const [busca, setBusca] = useState("");
  const [filtroBanco, setFiltroBanco] =
    useState("TODOS");
  const [filtroSituacao, setFiltroSituacao] =
    useState<SituacaoFiltro>("A_RECEBER");

  const [dataInicial, setDataInicial] =
    useState("");
  const [dataFinal, setDataFinal] =
    useState("");

  const [selecionada, setSelecionada] =
    useState<BaixaPagamento | null>(null);

  const [selecionadasIds, setSelecionadasIds] =
    useState<Set<string>>(new Set());

  const [
    valorRecebidoEditavel,
    setValorRecebidoEditavel,
  ] = useState("");

  const [
    dataRecebimentoEditavel,
    setDataRecebimentoEditavel,
  ] = useState(hojeIso());

  const [
    observacaoEditavel,
    setObservacaoEditavel,
  ] = useState("");

  const [motivoAlteracao, setMotivoAlteracao] =
    useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);

    try {
      const { data, error } = await supabase
        .from("baixas_pagamentos")
        .select("*")
        .order("data_pagamento_proposta", {
          ascending: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      const registros =
        (data || []) as BaixaPagamento[];

      /*
       * A data de emissão é a data da digitação da proposta.
       * Ela fica na tabela de propostas como data_cadastro.
       * Buscamos somente as propostas necessárias e enriquecemos
       * as linhas da baixa sem alterar a tabela baixas_pagamentos.
       */
      const ids = Array.from(
        new Set(
          registros
            .map((item) => item.proposta_id)
            .filter(Boolean),
        ),
      );

      let emissoes = new Map<string, string>();

      if (ids.length) {
        const { data: propostas, error: erroPropostas } =
          await supabase
            .from("propostas")
            .select("id, data_cadastro")
            .in("id", ids);

        if (!erroPropostas && propostas) {
          emissoes = new Map(
            propostas.map((item) => [
              String(item.id),
              String(item.data_cadastro || ""),
            ]),
          );
        }
      }

      setBaixas(
        registros.map((item) => ({
          ...item,
          data_emissao:
            emissoes.get(item.proposta_id) ||
            item.data_pagamento_proposta ||
            "",
        })),
      );
    } catch (erro) {
      console.error(erro);
      setBaixas([]);

      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar as comissões.",
      );
    } finally {
      setCarregando(false);
    }
  }, [supabase]);

  useEffect(() => {
    void carregar();

    const atualizar = () => void carregar();

    window.addEventListener("focus", atualizar);

    return () =>
      window.removeEventListener(
        "focus",
        atualizar,
      );
  }, [carregar]);

  const linhas = useMemo<LinhaComSituacao[]>(
    () =>
      baixas.map((item) => ({
        ...item,
        situacaoExibicao:
          calcularSituacao(item),
        taxaComissao:
          Number(item.valor_operacao || 0) > 0
            ? (Number(
                item.comissao_prevista || 0,
              ) /
                Number(
                  item.valor_operacao || 0,
                )) *
              100
            : 0,
      })),
    [baixas],
  );

  const bancos = useMemo(
    () =>
      Array.from(
        new Set(
          linhas
            .map((item) =>
              String(item.banco || "").trim(),
            )
            .filter(Boolean),
        ),
      ).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [linhas],
  );

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);
    const numeros = somenteNumeros(busca);

    return linhas.filter((item) => {
      const correspondeBusca =
        !termo ||
        normalizar(item.numero_proposta).includes(
          termo,
        ) ||
        normalizar(item.cliente).includes(
          termo,
        ) ||
        somenteNumeros(item.cpf).includes(
          numeros,
        ) ||
        normalizar(item.consultora).includes(
          termo,
        ) ||
        normalizar(item.banco).includes(
          termo,
        ) ||
        normalizar(item.tabela).includes(
          termo,
        );

      const correspondeBanco =
        filtroBanco === "TODOS" ||
        item.banco === filtroBanco;

      const correspondeSituacao =
        filtroSituacao === "TODOS" ||
        item.situacaoExibicao ===
          filtroSituacao;

      const emissao = String(
        item.data_emissao || "",
      ).slice(0, 10);

      const correspondeDatas =
        (!dataInicial ||
          emissao >= dataInicial) &&
        (!dataFinal || emissao <= dataFinal);

      return (
        correspondeBusca &&
        correspondeBanco &&
        correspondeSituacao &&
        correspondeDatas
      );
    });
  }, [
    linhas,
    busca,
    filtroBanco,
    filtroSituacao,
    dataInicial,
    dataFinal,
  ]);

  const resumo = useMemo(() => {
    const aReceber = linhas.filter(
      (item) =>
        item.situacaoExibicao ===
        "A_RECEBER",
    );

    const parciais = linhas.filter(
      (item) =>
        item.situacaoExibicao === "PARCIAL",
    );

    const finalizadas = linhas.filter(
      (item) =>
        item.situacaoExibicao ===
        "FINALIZADO",
    );

    const comissoesAReceber = aReceber.reduce(
      (total, item) =>
        total +
        Number(item.comissao_prevista || 0),
      0,
    );

    const saldoParcial = parciais.reduce(
      (total, item) =>
        total +
        Math.max(
          0,
          Number(
            item.comissao_prevista || 0,
          ) -
            Number(
              item.valor_recebido || 0,
            ),
        ),
      0,
    );

    const recebido = linhas.reduce(
      (total, item) =>
        total +
        Number(item.valor_recebido || 0),
      0,
    );

    return {
      quantidade: linhas.length,
      aReceber: aReceber.length,
      parciais: parciais.length,
      finalizadas: finalizadas.length,
      comissoesAReceber,
      saldoParcial,
      recebido,
    };
  }, [linhas]);

  const selecionadas = useMemo(
    () =>
      linhas.filter((item) =>
        selecionadasIds.has(item.id),
      ),
    [linhas, selecionadasIds],
  );

  const totalSelecionado = useMemo(
    () =>
      selecionadas.reduce(
        (total, item) =>
          total +
          Number(item.comissao_prevista || 0),
        0,
      ),
    [selecionadas],
  );

  const todasFiltradasSelecionadas =
    filtradas.length > 0 &&
    filtradas.every((item) =>
      selecionadasIds.has(item.id),
    );

  function alternarSelecao(id: string) {
    setSelecionadasIds((atual) => {
      const proximo = new Set(atual);

      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        proximo.add(id);
      }

      return proximo;
    });
  }

  function selecionarTodasFiltradas() {
    setSelecionadasIds((atual) => {
      const proximo = new Set(atual);

      if (todasFiltradasSelecionadas) {
        filtradas.forEach((item) =>
          proximo.delete(item.id),
        );
      } else {
        filtradas.forEach((item) =>
          proximo.add(item.id),
        );
      }

      return proximo;
    });
  }

  function limparSelecao() {
    setSelecionadasIds(new Set());
  }

  function abrirRecebimento(
    item: BaixaPagamento,
  ) {
    setSelecionada(item);

    setValorRecebidoEditavel(
      item.valor_recebido > 0
        ? valorParaInput(item.valor_recebido)
        : valorParaInput(
            item.comissao_prevista,
          ),
    );

    setDataRecebimentoEditavel(
      item.data_recebimento || hojeIso(),
    );

    setObservacaoEditavel(
      item.observacao || "",
    );

    setMotivoAlteracao("");
    setMensagem("");
  }

  async function salvarRecebimento() {
    if (!selecionada) return;

    const valorRecebido =
      converterValor(
        valorRecebidoEditavel,
      );

    if (valorRecebido <= 0) {
      setMensagem(
        "Informe um valor recebido válido.",
      );
      return;
    }

    if (!dataRecebimentoEditavel) {
      setMensagem(
        "Informe a data do pagamento.",
      );
      return;
    }

    const jaTinhaRecebimento =
      Boolean(selecionada.data_recebimento);

    if (
      jaTinhaRecebimento &&
      !motivoAlteracao.trim()
    ) {
      setMensagem(
        "Informe o motivo da alteração para corrigir um recebimento já registrado.",
      );
      return;
    }

    setProcessando(true);
    setMensagem("");

    try {
      const esperado = Number(
        selecionada.comissao_prevista || 0,
      );

      const diferenca =
        valorRecebido - esperado;

      const situacao: SituacaoFiltro =
        valorRecebido + 0.01 < esperado
          ? "PARCIAL"
          : "FINALIZADO";

      const statusBanco =
        situacao === "PARCIAL"
          ? "RECEBIMENTO PARCIAL"
          : "FINALIZADO";

      const { data: usuario } =
        await supabase.auth.getUser();

      const historicoAnterior =
        jaTinhaRecebimento
          ? [
              `ALTERAÇÃO MANUAL EM ${new Date().toLocaleString(
                "pt-BR",
              )}`,
              `Valor anterior: ${moeda(
                selecionada.valor_recebido,
              )}`,
              `Data anterior: ${dataBR(
                selecionada.data_recebimento,
              )}`,
              `Motivo: ${motivoAlteracao.trim()}`,
            ].join(" | ")
          : "";

      const observacaoFinal = [
        observacaoEditavel.trim(),
        historicoAnterior,
      ]
        .filter(Boolean)
        .join("\n");

      const { error } = await supabase
        .from("baixas_pagamentos")
        .update({
          data_recebimento:
            dataRecebimentoEditavel,
          valor_recebido: valorRecebido,
          diferenca,
          status: statusBanco,
          observacao:
            observacaoFinal || null,
          baixado_por:
            usuario.user?.id || null,
          atualizado_em:
            new Date().toISOString(),
        })
        .eq("id", selecionada.id);

      if (error) {
        throw new Error(error.message);
      }

      setMensagem(
        situacao === "PARCIAL"
          ? `Recebimento parcial salvo. Ainda falta ${moeda(
              Math.max(
                0,
                esperado - valorRecebido,
              ),
            )}.`
          : "Recebimento finalizado com sucesso.",
      );

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
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar o recebimento.",
      );
    } finally {
      setProcessando(false);
    }
  }

  const esperadoSelecionado = Number(
    selecionada?.comissao_prevista || 0,
  );

  const recebidoSelecionado =
    converterValor(
      valorRecebidoEditavel,
    );

  const saldoSelecionado = Math.max(
    0,
    esperadoSelecionado -
      recebidoSelecionado,
  );

  return (
    <div className="baixas-page baixas-livecred-eleva">
      <section className="baixas-resumo-live">
        <article>
          <span>COMISSÕES À RECEBER</span>
          <strong>
            {moeda(
              resumo.comissoesAReceber +
                resumo.saldoParcial,
            )}
          </strong>
          <small>
            À receber + saldo dos parciais
          </small>
        </article>

        <article>
          <span>À RECEBER</span>
          <strong>{resumo.aReceber}</strong>
          <small>Contratos sem recebimento</small>
        </article>

        <article className="resumo-parcial">
          <span>REC. PARCIAL</span>
          <strong>{resumo.parciais}</strong>
          <small>
            Saldo: {moeda(resumo.saldoParcial)}
          </small>
        </article>

        <article className="resumo-finalizado">
          <span>FINALIZADOS</span>
          <strong>{resumo.finalizadas}</strong>
          <small>
            Recebido: {moeda(resumo.recebido)}
          </small>
        </article>
      </section>

      <section className="baixas-live-card">
        <div className="baixas-live-actions">
          <button
            type="button"
            className={
              filtroSituacao ===
              "A_RECEBER"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltroSituacao(
                "A_RECEBER",
              )
            }
          >
            RECEBER
          </button>

          <button
            type="button"
            className={
              filtroSituacao === "PARCIAL"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltroSituacao("PARCIAL")
            }
          >
            REC. PARCIAL
          </button>

          <button
            type="button"
            className={
              filtroSituacao ===
              "FINALIZADO"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltroSituacao(
                "FINALIZADO",
              )
            }
          >
            FINALIZADOS
          </button>

          <button
            type="button"
            className={
              filtroSituacao === "TODOS"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltroSituacao("TODOS")
            }
          >
            TODOS
          </button>

          <div className="baixas-live-selected">
            <span>
              {selecionadasIds.size}
            </span>
            {selecionadasIds.size === 1
              ? "SELECIONADO"
              : "SELECIONADOS"}
          </div>
        </div>

        <div className="baixas-live-total">
          <div className="baixas-live-total-principal">
            <span>
              {selecionadasIds.size > 0
                ? "COMISSÕES SELECIONADAS"
                : "COMISSÕES À RECEBER"}
            </span>

            <strong>
              {selecionadasIds.size > 0
                ? moeda(totalSelecionado)
                : moeda(
                    resumo.comissoesAReceber +
                      resumo.saldoParcial,
                  )}
            </strong>
          </div>

          <div className="baixas-live-selection-actions">
            <button
              type="button"
              onClick={selecionarTodasFiltradas}
              disabled={filtradas.length === 0}
            >
              {todasFiltradasSelecionadas
                ? "Desmarcar filtradas"
                : "Selecionar tudo"}
            </button>

            {selecionadasIds.size > 0 && (
              <button
                type="button"
                className="secondary"
                onClick={limparSelecao}
              >
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
              onChange={(event) =>
                setBusca(event.target.value)
              }
              placeholder="Proposta, cliente, CPF, banco ou consultora"
            />
          </label>

          <label>
            <span>BANCO</span>
            <select
              value={filtroBanco}
              onChange={(event) =>
                setFiltroBanco(
                  event.target.value,
                )
              }
            >
              <option value="TODOS">
                Todos os bancos
              </option>

              {bancos.map((banco) => (
                <option
                  key={banco}
                  value={banco}
                >
                  {banco}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>SITUAÇÃO</span>
            <select
              value={filtroSituacao}
              onChange={(event) =>
                setFiltroSituacao(
                  event.target
                    .value as SituacaoFiltro,
                )
              }
            >
              <option value="TODOS">
                Todas
              </option>
              <option value="A_RECEBER">
                À receber
              </option>
              <option value="PARCIAL">
                Rec. parcial
              </option>
              <option value="FINALIZADO">
                Finalizado
              </option>
            </select>
          </label>

          <label>
            <span>EMISSÃO DE</span>
            <input
              type="date"
              value={dataInicial}
              onChange={(event) =>
                setDataInicial(
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            <span>EMISSÃO ATÉ</span>
            <input
              type="date"
              value={dataFinal}
              onChange={(event) =>
                setDataFinal(
                  event.target.value,
                )
              }
            />
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
                  <td
                    colSpan={13}
                    className="baixas-live-vazio"
                  >
                    Carregando comissões...
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="baixas-live-vazio"
                  >
                    Nenhuma comissão encontrada nos filtros.
                  </td>
                </tr>
              ) : (
                filtradas.map((item) => {
                  const ativa =
                    selecionadasIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={
                        ativa ? "selected" : ""
                      }
                      onClick={() =>
                        alternarSelecao(item.id)
                      }
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={ativa}
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                          onChange={() =>
                            alternarSelecao(item.id)
                          }
                        />
                      </td>

                      <td>
                        {dataBR(
                          item.data_emissao,
                        )}
                      </td>

                      <td>
                        {formatarCpf(
                          item.cpf,
                        )}
                      </td>

                      <td>
                        <strong>
                          {item.cliente || "—"}
                        </strong>
                        <small>
                          {item.consultora || "—"}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {item.banco || "—"}
                        </strong>
                        <small>
                          {item.tabela || "—"}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {moeda(
                            item.valor_operacao,
                          )}
                        </strong>
                      </td>

                      <td>
                        {item.taxaComissao
                          .toFixed(2)
                          .replace(".", ",")}
                        %
                      </td>

                      <td>
                        <strong className="comissao-pill">
                          {moeda(
                            item.comissao_prevista,
                          )}
                        </strong>
                      </td>

                      <td>
                        {moeda(
                          item.valor_recebido,
                        )}
                      </td>

                      <td>
                        <span
                          className={`baixas-live-status ${classeSituacao(
                            item.situacaoExibicao,
                          )}`}
                        >
                          {textoSituacao(
                            item.situacaoExibicao,
                          )}
                        </span>
                      </td>

                      <td>
                        <span className="baixas-live-esteira">
                          ● Proposta Paga
                        </span>
                      </td>

                      <td>
                        {dataBR(
                          item.data_recebimento,
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="baixas-live-action"
                          onClick={(event) => {
                            event.stopPropagation();
                            abrirRecebimento(
                              item,
                            );
                          }}
                        >
                          {item.situacaoExibicao ===
                          "A_RECEBER"
                            ? "Receber"
                            : "Editar"}
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
        <div
          className="baixas-live-overlay"
          onClick={() =>
            setSelecionada(null)
          }
        >
          <section
            className="baixas-live-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <header>
              <div>
                <span>RECEBER COMISSÃO</span>
                <h2>
                  {selecionada.cliente}
                </h2>
                <p>
                  Proposta{" "}
                  {selecionada.numero_proposta}
                  {" • "}
                  {selecionada.banco}
                  {selecionada.tabela
                    ? ` • ${selecionada.tabela}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelecionada(null)
                }
              >
                ×
              </button>
            </header>

            <div className="baixas-live-modal-resumo">
              <article>
                <span>EMISSÃO</span>
                <strong>
                  {dataBR(
                    selecionada.data_emissao,
                  )}
                </strong>
              </article>

              <article>
                <span>VALOR LIBERADO</span>
                <strong>
                  {moeda(
                    selecionada.valor_operacao,
                  )}
                </strong>
              </article>

              <article>
                <span>COMISSÃO ESPERADA</span>
                <strong>
                  {moeda(
                    selecionada.comissao_prevista,
                  )}
                </strong>
              </article>

              <article>
                <span>SALDO APÓS BAIXA</span>
                <strong>
                  {moeda(
                    saldoSelecionado,
                  )}
                </strong>
              </article>
            </div>

            <div className="baixas-live-modal-grid">
              <label>
                <span>VALOR RECEBIDO</span>
                <input
                  value={
                    valorRecebidoEditavel
                  }
                  onChange={(event) =>
                    setValorRecebidoEditavel(
                      event.target.value,
                    )
                  }
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  disabled={processando}
                />
              </label>

              <label>
                <span>DATA DO PAGAMENTO</span>
                <input
                  type="date"
                  value={
                    dataRecebimentoEditavel
                  }
                  onChange={(event) =>
                    setDataRecebimentoEditavel(
                      event.target.value,
                    )
                  }
                  disabled={processando}
                />
              </label>
            </div>

            <label className="baixas-live-observacao">
              <span>OBSERVAÇÃO</span>
              <textarea
                value={observacaoEditavel}
                onChange={(event) =>
                  setObservacaoEditavel(
                    event.target.value,
                  )
                }
                placeholder="Observação opcional"
                disabled={processando}
              />
            </label>

            {selecionada.data_recebimento && (
              <label className="baixas-live-observacao">
                <span>
                  MOTIVO DA ALTERAÇÃO *
                </span>
                <textarea
                  value={motivoAlteracao}
                  onChange={(event) =>
                    setMotivoAlteracao(
                      event.target.value,
                    )
                  }
                  placeholder="Informe por que esta baixa está sendo alterada"
                  disabled={processando}
                />
              </label>
            )}

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setSelecionada(null)
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  void salvarRecebimento()
                }
                disabled={processando}
              >
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

      {mensagem && (
        <div className="baixas-live-mensagem">
          {mensagem}
        </div>
      )}
    </div>
  );
}