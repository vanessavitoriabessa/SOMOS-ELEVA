"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";

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
};

type FiltroConciliacao =
  | "TODOS"
  | "AGUARDANDO"
  | "ATRASADAS"
  | "RECEBIDAS"
  | "A_MENOS"
  | "A_MAIS";

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(valor?: string | null) {
  if (!valor) return "—";
  const [ano, mes, dia] = String(valor).slice(0, 10).split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizarNumero(valor: string) {
  return String(valor || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function converterValor(valor: string) {
  const convertido = Number(
    String(valor || "")
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );

  return Number.isFinite(convertido) ? convertido : 0;
}

function valorParaInput(valor: number) {
  return Number(valor || 0).toFixed(2).replace(".", ",");
}

function statusAtual(item: BaixaPagamento) {
  if (item.data_recebimento) {
    const diferenca = Number(item.diferenca || 0);

    if (Math.abs(diferenca) < 0.01) return "VALOR RECEBIDO";
    return diferenca > 0 ? "RECEBEU A MAIS" : "RECEBEU A MENOS";
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const prevista = new Date(`${item.data_prevista_recebimento}T00:00:00`);

  return prevista < hoje
    ? "COMISSÃO ATRASADA"
    : "AGUARDANDO RECEBIMENTO";
}

function classeStatus(status: string) {
  if (status === "VALOR RECEBIDO") return "status-ok";
  if (status === "RECEBEU A MAIS") return "status-mais";
  if (status === "RECEBEU A MENOS") return "status-menos";
  if (status === "COMISSÃO ATRASADA") return "status-atrasada";
  return "status-aguardando";
}

export default function BaixasManager() {
  const supabase = useMemo(() => createClient(), []);

  const [baixas, setBaixas] = useState<BaixaPagamento[]>([]);
  const [numeroProposta, setNumeroProposta] = useState("");
  const [selecionada, setSelecionada] =
    useState<BaixaPagamento | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [valorRecebidoEditavel, setValorRecebidoEditavel] = useState("");
  const [dataRecebimentoEditavel, setDataRecebimentoEditavel] =
    useState(hojeIso());
  const [observacaoEditavel, setObservacaoEditavel] = useState("");
  const [motivoAlteracao, setMotivoAlteracao] = useState("");

  const [filtro, setFiltro] = useState<FiltroConciliacao>("TODOS");
  const [buscaHistorico, setBuscaHistorico] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);

    try {
      const { data, error } = await supabase
        .from("baixas_pagamentos")
        .select("*")
        .order("data_prevista_recebimento", { ascending: false });

      if (error) throw new Error(error.message);

      const registros = (data || []) as BaixaPagamento[];
      setBaixas(registros);

      if (numeroProposta.trim()) {
        const localizada =
          registros.find(
            (item) =>
              normalizarNumero(item.numero_proposta) ===
              normalizarNumero(numeroProposta),
          ) || null;

        setSelecionada(localizada);
      }
    } catch (erro) {
      console.error(erro);
      setBaixas([]);
      setSelecionada(null);
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar as comissões.",
      );
    } finally {
      setCarregando(false);
    }
  }, [supabase, numeroProposta]);

  useEffect(() => {
    void carregar();

    const atualizar = () => void carregar();
    window.addEventListener("focus", atualizar);

    return () => window.removeEventListener("focus", atualizar);
  }, [carregar]);

  useEffect(() => {
    const termo = normalizarNumero(numeroProposta);

    if (!termo) {
      setSelecionada(null);
      setValorRecebidoEditavel("");
      setDataRecebimentoEditavel(hojeIso());
      setObservacaoEditavel("");
      setMotivoAlteracao("");
      return;
    }

    const localizada =
      baixas.find(
        (item) => normalizarNumero(item.numero_proposta) === termo,
      ) || null;

    setSelecionada(localizada);

    if (localizada) {
      setValorRecebidoEditavel(
        localizada.data_recebimento
          ? valorParaInput(localizada.valor_recebido)
          : valorParaInput(localizada.comissao_prevista),
      );
      setDataRecebimentoEditavel(
        localizada.data_recebimento || hojeIso(),
      );
      setObservacaoEditavel(localizada.observacao || "");
      setMotivoAlteracao("");
      setMensagem("");
    } else {
      setValorRecebidoEditavel("");
      setDataRecebimentoEditavel(hojeIso());
      setObservacaoEditavel("");
      setMotivoAlteracao("");
    }
  }, [numeroProposta, baixas]);

  const resumo = useMemo(() => {
    const itens = baixas.map((item) => ({
      ...item,
      statusCalculado: statusAtual(item),
    }));

    const prevista = itens.reduce(
      (total, item) => total + Number(item.comissao_prevista || 0),
      0,
    );

    const recebida = itens.reduce(
      (total, item) => total + Number(item.valor_recebido || 0),
      0,
    );

    return {
      prevista,
      recebida,
      aReceber: itens
        .filter((item) => !item.data_recebimento)
        .reduce(
          (total, item) => total + Number(item.comissao_prevista || 0),
          0,
        ),
      atrasada: itens
        .filter((item) => item.statusCalculado === "COMISSÃO ATRASADA")
        .reduce(
          (total, item) => total + Number(item.comissao_prevista || 0),
          0,
        ),
      diferenca: itens
        .filter((item) => Boolean(item.data_recebimento))
        .reduce(
          (total, item) => total + Number(item.diferenca || 0),
          0,
        ),
      aguardando: itens.filter((item) => !item.data_recebimento).length,
      recebidas: itens.filter((item) => Boolean(item.data_recebimento))
        .length,
    };
  }, [baixas]);

  const listaConciliacao = useMemo(() => {
    const termo = normalizarNumero(buscaHistorico);

    return baixas
      .map((item) => ({
        ...item,
        statusCalculado: statusAtual(item),
      }))
      .filter((item) => {
        if (!termo) return true;

        return normalizarNumero(
          [
            item.numero_proposta,
            item.cliente,
            item.cpf,
            item.consultora,
            item.banco,
            item.tabela,
          ].join(" "),
        ).includes(termo);
      })
      .filter((item) => {
        if (filtro === "TODOS") return true;
        if (filtro === "AGUARDANDO") {
          return item.statusCalculado === "AGUARDANDO RECEBIMENTO";
        }
        if (filtro === "ATRASADAS") {
          return item.statusCalculado === "COMISSÃO ATRASADA";
        }
        if (filtro === "RECEBIDAS") {
          return Boolean(item.data_recebimento);
        }
        if (filtro === "A_MENOS") {
          return item.statusCalculado === "RECEBEU A MENOS";
        }

        return item.statusCalculado === "RECEBEU A MAIS";
      });
  }, [baixas, buscaHistorico, filtro]);

  const valorRecebidoCalculado = converterValor(valorRecebidoEditavel);

  const diferencaCalculada = selecionada
    ? valorRecebidoCalculado -
      Number(selecionada.comissao_prevista || 0)
    : 0;

  const statusCalculado = !selecionada
    ? ""
    : Math.abs(diferencaCalculada) < 0.01
      ? "VALOR RECEBIDO"
      : diferencaCalculada > 0
        ? "RECEBEU A MAIS"
        : "RECEBEU A MENOS";

  function localizarProposta() {
    const termo = normalizarNumero(numeroProposta);

    if (!termo) {
      setSelecionada(null);
      setMensagem("Digite o número da proposta.");
      return;
    }

    const localizada =
      baixas.find(
        (item) => normalizarNumero(item.numero_proposta) === termo,
      ) || null;

    setSelecionada(localizada);

    if (!localizada) {
      setMensagem(
        "Proposta não encontrada nas comissões. Verifique se ela já foi marcada como PAGO.",
      );
      return;
    }

    setMensagem("");
  }

  function abrirParaEditar(item: BaixaPagamento) {
    setNumeroProposta(item.numero_proposta);
    setSelecionada(item);
    setValorRecebidoEditavel(
      item.data_recebimento
        ? valorParaInput(item.valor_recebido)
        : valorParaInput(item.comissao_prevista),
    );
    setDataRecebimentoEditavel(item.data_recebimento || hojeIso());
    setObservacaoEditavel(item.observacao || "");
    setMotivoAlteracao("");
    setMensagem("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarBaixa(item: BaixaPagamento) {
    const valorRecebido = converterValor(valorRecebidoEditavel);
    const jaTinhaBaixa = Boolean(item.data_recebimento);

    if (valorRecebido <= 0) {
      setMensagem("Informe um valor recebido válido.");
      return;
    }

    if (!dataRecebimentoEditavel) {
      setMensagem("Informe a data do recebimento.");
      return;
    }

    if (jaTinhaBaixa && !motivoAlteracao.trim()) {
      setMensagem(
        "Informe o motivo da alteração para corrigir uma baixa já realizada.",
      );
      return;
    }

    setProcessando(true);
    setMensagem("");

    try {
      const diferenca =
        valorRecebido - Number(item.comissao_prevista || 0);

      const status =
        Math.abs(diferenca) < 0.01
          ? "VALOR RECEBIDO"
          : diferenca > 0
            ? "RECEBEU A MAIS"
            : "RECEBEU A MENOS";

      const { data: usuario } = await supabase.auth.getUser();

      const historicoAnterior = jaTinhaBaixa
        ? [
            `ALTERAÇÃO MANUAL EM ${new Date().toLocaleString("pt-BR")}`,
            `Valor anterior: ${moeda(item.valor_recebido)}`,
            `Data anterior: ${dataBR(item.data_recebimento)}`,
            `Status anterior: ${statusAtual(item)}`,
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
          data_recebimento: dataRecebimentoEditavel,
          valor_recebido: valorRecebido,
          diferenca,
          status,
          observacao: observacaoFinal || null,
          baixado_por: usuario.user?.id || null,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw new Error(error.message);

      setMensagem(
        jaTinhaBaixa
          ? "Baixa atualizada manualmente e valores recalculados."
          : status === "VALOR RECEBIDO"
            ? "Baixa registrada com o valor correto."
            : status === "RECEBEU A MAIS"
              ? `Baixa registrada. Recebido a mais: ${moeda(diferenca)}.`
              : `Baixa registrada. Valor faltante: ${moeda(
                  Math.abs(diferenca),
                )}.`,
      );

      setMotivoAlteracao("");
      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar a baixa.",
      );
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="baixas-page">
      <section className="baixas-resumo baixas-resumo-expandido">
        <article>
          <span>Comissão prevista</span>
          <strong>{moeda(resumo.prevista)}</strong>
        </article>
        <article>
          <span>Comissão recebida</span>
          <strong>{moeda(resumo.recebida)}</strong>
        </article>
        <article>
          <span>A receber</span>
          <strong>{moeda(resumo.aReceber)}</strong>
        </article>
        <article>
          <span>Em atraso</span>
          <strong>{moeda(resumo.atrasada)}</strong>
        </article>
        <article>
          <span>Diferença total</span>
          <strong>{moeda(resumo.diferenca)}</strong>
        </article>
        <article>
          <span>Aguardando / recebidas</span>
          <strong>
            {resumo.aguardando} / {resumo.recebidas}
          </strong>
        </article>
      </section>

      <section className="baixas-localizar">
        <div>
          <span>LOCALIZAR PROPOSTA</span>
          <h2>Digite o número da proposta</h2>
          <p>
            Ao informar o número exato, os dados da comissão aparecem
            automaticamente.
          </p>
        </div>

        <div className="baixas-busca">
          <input
            value={numeroProposta}
            onChange={(evento) => setNumeroProposta(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") localizarProposta();
            }}
            placeholder="Ex.: 12345678"
            inputMode="numeric"
            autoComplete="off"
          />

          <button
            type="button"
            onClick={localizarProposta}
            disabled={carregando}
          >
            Localizar
          </button>
        </div>
      </section>

      {mensagem && <div className="baixas-mensagem">{mensagem}</div>}

      <section className="baixas-tabela-card">
        {carregando ? (
          <div className="baixas-vazio">Carregando comissões...</div>
        ) : !numeroProposta.trim() ? (
          <div className="baixas-vazio">
            Digite o número da proposta para localizar.
          </div>
        ) : !selecionada ? (
          <div className="baixas-vazio">
            Nenhuma proposta localizada com esse número.
          </div>
        ) : (
          <div className="baixa-edicao">
            <div className="baixa-edicao-cabecalho">
              <div>
                <span>PROPOSTA {selecionada.numero_proposta}</span>
                <h3>{selecionada.cliente}</h3>
                <p>
                  {selecionada.banco || "—"} •{" "}
                  {selecionada.tabela || "—"} •{" "}
                  {selecionada.consultora || "—"}
                </p>
              </div>

              <span className={`baixa-status ${classeStatus(
                selecionada.data_recebimento
                  ? statusCalculado
                  : statusAtual(selecionada),
              )}`}>
                {selecionada.data_recebimento
                  ? statusCalculado
                  : statusAtual(selecionada)}
              </span>
            </div>

            <div className="baixa-edicao-grid">
              <label>
                <span>Valor bruto</span>
                <strong>{moeda(selecionada.valor_operacao)}</strong>
              </label>

              <label>
                <span>Comissão prevista</span>
                <strong>{moeda(selecionada.comissao_prevista)}</strong>
              </label>

              <label>
                <span>Valor recebido</span>
                <input
                  value={valorRecebidoEditavel}
                  onChange={(evento) =>
                    setValorRecebidoEditavel(evento.target.value)
                  }
                  placeholder="R$ 0,00"
                  inputMode="decimal"
                  disabled={processando}
                />
              </label>

              <label>
                <span>Data do recebimento</span>
                <input
                  type="date"
                  value={dataRecebimentoEditavel}
                  onChange={(evento) =>
                    setDataRecebimentoEditavel(evento.target.value)
                  }
                  disabled={processando}
                />
              </label>

              <label>
                <span>Diferença calculada</span>
                <strong>{moeda(diferencaCalculada)}</strong>
                <small>
                  {Math.abs(diferencaCalculada) < 0.01
                    ? "Sem diferença"
                    : diferencaCalculada > 0
                      ? "Recebido a mais"
                      : "Valor faltante"}
                </small>
              </label>

              <label>
                <span>Status calculado</span>
                <strong>{statusCalculado}</strong>
              </label>
            </div>

            <div className="baixa-edicao-textos">
              <label>
                <span>Observação</span>
                <textarea
                  value={observacaoEditavel}
                  onChange={(evento) =>
                    setObservacaoEditavel(evento.target.value)
                  }
                  placeholder="Observação opcional sobre o pagamento"
                  disabled={processando}
                />
              </label>

              {selecionada.data_recebimento && (
                <label>
                  <span>Motivo da alteração manual *</span>
                  <textarea
                    value={motivoAlteracao}
                    onChange={(evento) =>
                      setMotivoAlteracao(evento.target.value)
                    }
                    placeholder="Ex.: valor conferido novamente no extrato bancário"
                    disabled={processando}
                  />
                </label>
              )}
            </div>

            <div className="baixa-edicao-acoes">
              <button
                type="button"
                disabled={processando}
                onClick={() => void salvarBaixa(selecionada)}
              >
                {selecionada.data_recebimento
                  ? "Salvar alteração manual"
                  : "Confirmar baixa"}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="baixas-conciliacao">
        <div className="baixas-conciliacao-topo">
          <div>
            <span>PAINEL DE CONCILIAÇÃO</span>
            <h2>Comissões e divergências</h2>
          </div>

          <div className="baixas-conciliacao-filtros">
            <input
              value={buscaHistorico}
              onChange={(evento) =>
                setBuscaHistorico(evento.target.value)
              }
              placeholder="Proposta, cliente, banco ou consultora"
            />

            <select
              value={filtro}
              onChange={(evento) =>
                setFiltro(evento.target.value as FiltroConciliacao)
              }
            >
              <option value="TODOS">Todos</option>
              <option value="AGUARDANDO">Aguardando</option>
              <option value="ATRASADAS">Em atraso</option>
              <option value="RECEBIDAS">Recebidas</option>
              <option value="A_MENOS">Recebeu a menos</option>
              <option value="A_MAIS">Recebeu a mais</option>
            </select>
          </div>
        </div>

        <div className="baixas-tabela-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nº proposta</th>
                <th>Cliente</th>
                <th>Banco / tabela</th>
                <th>Previsto</th>
                <th>Recebido</th>
                <th>Diferença</th>
                <th>Previsão</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {listaConciliacao.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="baixas-vazio">
                      Nenhuma comissão encontrada nesse filtro.
                    </div>
                  </td>
                </tr>
              ) : (
                listaConciliacao.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.numero_proposta}</strong>
                    </td>
                    <td>
                      <strong>{item.cliente}</strong>
                      <small>{item.consultora || "—"}</small>
                    </td>
                    <td>
                      <strong>{item.banco || "—"}</strong>
                      <small>{item.tabela || "—"}</small>
                    </td>
                    <td>{moeda(item.comissao_prevista)}</td>
                    <td>{moeda(item.valor_recebido)}</td>
                    <td>{moeda(item.diferenca)}</td>
                    <td>{dataBR(item.data_prevista_recebimento)}</td>
                    <td>
                      <span
                        className={`baixa-status ${classeStatus(
                          item.statusCalculado,
                        )}`}
                      >
                        {item.statusCalculado}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => abrirParaEditar(item)}
                      >
                        {item.data_recebimento
                          ? "Editar baixa"
                          : "Dar baixa"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}