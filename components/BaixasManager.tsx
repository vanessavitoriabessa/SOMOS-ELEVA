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

type ItemComStatus = BaixaPagamento & {
  statusCalculado: string;
  dataPrevistaCalculada: string;
};

type GrupoSemanal = {
  chave: string;
  dataPrevista: string;
  itens: ItemComStatus[];
  previsto: number;
  recebido: number;
  pendente: number;
  quantidade: number;
  quantidadeRecebida: number;
  quantidadePendente: number;
  atrasado: boolean;
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
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function dataIsoLocal(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function tercaDaSemanaIso(referencia = new Date()) {
  const data = new Date(
    referencia.getFullYear(),
    referencia.getMonth(),
    referencia.getDate(),
  );

  const diaSemana = data.getDay();

  // Segunda aponta para a terça seguinte. De terça a domingo,
  // mantém a terça da semana corrente.
  const deslocamento = diaSemana === 1 ? 1 : diaSemana === 0 ? -5 : 2 - diaSemana;
  data.setDate(data.getDate() + deslocamento);

  return dataIsoLocal(data);
}


function calcularDataPrevistaRecebimento(
  dataPagamentoProposta?: string | null,
  dataPrevistaSalva?: string | null,
) {
  const pagamentoTexto = String(dataPagamentoProposta || "").slice(0, 10);

  if (!pagamentoTexto) {
    return String(dataPrevistaSalva || "").slice(0, 10);
  }

  const pagamento = new Date(`${pagamentoTexto}T00:00:00`);

  if (Number.isNaN(pagamento.getTime())) {
    return String(dataPrevistaSalva || "").slice(0, 10);
  }

  // A produção é fechada de segunda a domingo e recebida
  // na terça-feira imediatamente seguinte.
  const diaSemana = pagamento.getDay();
  const diasAteDomingo = diaSemana === 0 ? 0 : 7 - diaSemana;

  const domingo = new Date(pagamento);
  domingo.setDate(domingo.getDate() + diasAteDomingo);

  const tercaRecebimento = new Date(domingo);
  tercaRecebimento.setDate(tercaRecebimento.getDate() + 2);

  return dataIsoLocal(tercaRecebimento);
}

function dataPrevistaDoItem(item: BaixaPagamento) {
  return calcularDataPrevistaRecebimento(
    item.data_pagamento_proposta,
    item.data_prevista_recebimento,
  );
}

function intervaloProducaoDaPrevisao(dataPrevista: string) {
  const prevista = new Date(`${dataPrevista}T00:00:00`);
  const fim = new Date(prevista);
  fim.setDate(fim.getDate() - 2); // domingo anterior

  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - 6); // segunda anterior

  return `${dataBR(dataIsoLocal(inicio))} a ${dataBR(dataIsoLocal(fim))}`;
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

  const prevista = new Date(`${dataPrevistaDoItem(item)}T00:00:00`);

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
  const [selecionada, setSelecionada] = useState<BaixaPagamento | null>(null);

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
  const [semanaSelecionada, setSemanaSelecionada] = useState("TODAS");

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
      setDataRecebimentoEditavel(localizada.data_recebimento || hojeIso());
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

  const itensComStatus = useMemo<ItemComStatus[]>(
    () =>
      baixas.map((item) => ({
        ...item,
        statusCalculado: statusAtual(item),
        dataPrevistaCalculada: dataPrevistaDoItem(item),
      })),
    [baixas],
  );

  const tercaReferencia = useMemo(() => tercaDaSemanaIso(), []);

  const resumo = useMemo(() => {
    const destaTerca = itensComStatus.filter(
      (item) =>
        String(item.dataPrevistaCalculada || "").slice(0, 10) ===
        tercaReferencia,
    );

    const atrasadasAnteriores = itensComStatus.filter(
      (item) =>
        !item.data_recebimento &&
        String(item.dataPrevistaCalculada || "").slice(0, 10) <
          tercaReferencia,
    );

    const semanasPendentes = new Set(
      atrasadasAnteriores.map((item) =>
        String(item.dataPrevistaCalculada || "").slice(0, 10),
      ),
    ).size;

    const previstoDestaTerca = destaTerca.reduce(
      (total, item) => total + Number(item.comissao_prevista || 0),
      0,
    );

    const recebidoDestaTerca = destaTerca
      .filter((item) => Boolean(item.data_recebimento))
      .reduce(
        (total, item) => total + Number(item.valor_recebido || 0),
        0,
      );

    const faltaDestaTerca = destaTerca
      .filter((item) => !item.data_recebimento)
      .reduce(
        (total, item) => total + Number(item.comissao_prevista || 0),
        0,
      );

    const atrasoAnterior = atrasadasAnteriores.reduce(
      (total, item) => total + Number(item.comissao_prevista || 0),
      0,
    );

    return {
      previstoDestaTerca,
      recebidoDestaTerca,
      faltaDestaTerca,
      atrasoAnterior,
      propostasDestaTerca: destaTerca.length,
      propostasPendentesDestaTerca: destaTerca.filter(
        (item) => !item.data_recebimento,
      ).length,
      semanasPendentes,
    };
  }, [itensComStatus, tercaReferencia]);

  const listaConciliacao = useMemo(() => {
    const termo = normalizarNumero(buscaHistorico);

    return itensComStatus
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
        if (semanaSelecionada === "TODAS") return true;

        return (
          String(item.dataPrevistaCalculada || "").slice(0, 10) ===
          semanaSelecionada
        );
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
  }, [itensComStatus, buscaHistorico, filtro, semanaSelecionada]);

  const gruposSemanais = useMemo<GrupoSemanal[]>(() => {
    const grupos = new Map<string, ItemComStatus[]>();

    listaConciliacao.forEach((item) => {
      const chave =
        String(item.dataPrevistaCalculada || "").slice(0, 10) ||
        "SEM_DATA";

      grupos.set(chave, [...(grupos.get(chave) || []), item]);
    });

    return Array.from(grupos.entries())
      .map(([chave, itens]) => {
        const previsto = itens.reduce(
          (total, item) => total + Number(item.comissao_prevista || 0),
          0,
        );

        const recebido = itens
          .filter((item) => Boolean(item.data_recebimento))
          .reduce(
            (total, item) => total + Number(item.valor_recebido || 0),
            0,
          );

        const pendentes = itens.filter((item) => !item.data_recebimento);
        const pendente = pendentes.reduce(
          (total, item) => total + Number(item.comissao_prevista || 0),
          0,
        );

        return {
          chave,
          dataPrevista: chave,
          itens,
          previsto,
          recebido,
          pendente,
          quantidade: itens.length,
          quantidadeRecebida: itens.length - pendentes.length,
          quantidadePendente: pendentes.length,
          atrasado: chave !== "SEM_DATA" && chave < hojeIso() && pendentes.length > 0,
        };
      })
      .sort((a, b) => b.chave.localeCompare(a.chave));
  }, [listaConciliacao]);

  const semanasDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(
          itensComStatus
            .map((item) =>
              String(item.dataPrevistaCalculada || "").slice(0, 10),
            )
            .filter(Boolean),
        ),
      ).sort((a, b) => b.localeCompare(a)),
    [itensComStatus],
  );

  const valorRecebidoCalculado = converterValor(valorRecebidoEditavel);

  const diferencaCalculada = selecionada
    ? valorRecebidoCalculado - Number(selecionada.comissao_prevista || 0)
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
      <section className="baixas-ciclo-atual">
        <div>
          <span>RECEBIMENTO DA SEMANA</span>
          <h2>Terça-feira, {dataBR(tercaReferencia)}</h2>
          <p>
            Produção considerada: {intervaloProducaoDaPrevisao(tercaReferencia)}
          </p>
        </div>

        <div className="baixas-ciclo-indicador">
          <span>Falta conferir</span>
          <strong>{moeda(resumo.faltaDestaTerca)}</strong>
          <small>{resumo.propostasPendentesDestaTerca} proposta(s)</small>
        </div>
      </section>

      <section className="baixas-resumo baixas-resumo-semanal">
        <article className="resumo-previsto">
          <span>Previsto para esta terça</span>
          <strong>{moeda(resumo.previstoDestaTerca)}</strong>
          <small>{resumo.propostasDestaTerca} proposta(s) previstas</small>
        </article>

        <article className="resumo-recebido">
          <span>Recebido referente a esta terça</span>
          <strong>{moeda(resumo.recebidoDestaTerca)}</strong>
          <small>Valores já conferidos e baixados</small>
        </article>

        <article className="resumo-pendente">
          <span>Falta receber desta terça</span>
          <strong>{moeda(resumo.faltaDestaTerca)}</strong>
          <small>{resumo.propostasPendentesDestaTerca} pendência(s)</small>
        </article>

        <article className="resumo-atrasado">
          <span>Atrasado de semanas anteriores</span>
          <strong>{moeda(resumo.atrasoAnterior)}</strong>
          <small>{resumo.semanasPendentes} semana(s) pendente(s)</small>
        </article>
      </section>

      <section className="baixas-localizar">
        <div>
          <span>LOCALIZAR PROPOSTA</span>
          <h2>Conferência individual</h2>
          <p>
            Digite o número da proposta para conferir ou corrigir uma baixa.
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

      {selecionada && (
        <section className="baixas-tabela-card">
          <div className="baixa-edicao">
            <div className="baixa-edicao-cabecalho">
              <div>
                <span>PROPOSTA {selecionada.numero_proposta}</span>
                <h3>{selecionada.cliente}</h3>
                <p>
                  {selecionada.banco || "—"} • {selecionada.tabela || "—"} •{" "}
                  {selecionada.consultora || "—"}
                </p>
              </div>

              <span
                className={`baixa-status ${classeStatus(
                  selecionada.data_recebimento
                    ? statusCalculado
                    : statusAtual(selecionada),
                )}`}
              >
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
                <span>Comissão esperada</span>
                <strong>{moeda(selecionada.comissao_prevista)}</strong>
              </label>

              <label>
                <span>Pagamento previsto</span>
                <strong>{dataBR(dataPrevistaDoItem(selecionada))}</strong>
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
        </section>
      )}

      <section className="baixas-conciliacao">
        <div className="baixas-conciliacao-topo">
          <div>
            <span>CONFERÊNCIA POR SEMANA</span>
            <h2>Recebimentos previstos por terça-feira</h2>
            <p>
              Abra uma semana para ver as propostas, conferir os valores e dar
              baixa individualmente.
            </p>
          </div>

          <div className="baixas-conciliacao-filtros">
            <input
              value={buscaHistorico}
              onChange={(evento) => setBuscaHistorico(evento.target.value)}
              placeholder="Proposta, cliente, banco ou consultora"
            />

            <select
              value={semanaSelecionada}
              onChange={(evento) => setSemanaSelecionada(evento.target.value)}
            >
              <option value="TODAS">Todas as semanas</option>
              {semanasDisponiveis.map((semana) => (
                <option key={semana} value={semana}>
                  Recebimento {dataBR(semana)}
                </option>
              ))}
            </select>

            <select
              value={filtro}
              onChange={(evento) =>
                setFiltro(evento.target.value as FiltroConciliacao)
              }
            >
              <option value="TODOS">Todos os status</option>
              <option value="AGUARDANDO">Aguardando</option>
              <option value="ATRASADAS">Em atraso</option>
              <option value="RECEBIDAS">Recebidas</option>
              <option value="A_MENOS">Recebeu a menos</option>
              <option value="A_MAIS">Recebeu a mais</option>
            </select>
          </div>
        </div>

        <div className="baixas-semanas-lista">
          {carregando ? (
            <div className="baixas-vazio">Carregando comissões...</div>
          ) : gruposSemanais.length === 0 ? (
            <div className="baixas-vazio">
              Nenhuma comissão encontrada nos filtros selecionados.
            </div>
          ) : (
            gruposSemanais.map((grupo, indice) => (
              <details
                className={`baixas-semana-card ${grupo.atrasado ? "semana-atrasada" : ""}`}
                key={grupo.chave}
                open={
                  grupo.dataPrevista === tercaReferencia ||
                  (indice === 0 && semanaSelecionada !== "TODAS")
                }
              >
                <summary>
                  <div className="baixas-semana-titulo">
                    <span>
                      {grupo.atrasado
                        ? "SEMANA EM ATRASO"
                        : grupo.dataPrevista === tercaReferencia
                          ? "RECEBIMENTO DESTA TERÇA"
                          : "SEMANA DE RECEBIMENTO"}
                    </span>
                    <h3>Terça-feira, {dataBR(grupo.dataPrevista)}</h3>
                    <small>
                      Produção de {intervaloProducaoDaPrevisao(grupo.dataPrevista)}
                    </small>
                  </div>

                  <div className="baixas-semana-resumo">
                    <div>
                      <span>Previsto</span>
                      <strong>{moeda(grupo.previsto)}</strong>
                    </div>
                    <div>
                      <span>Recebido</span>
                      <strong>{moeda(grupo.recebido)}</strong>
                    </div>
                    <div>
                      <span>Pendente</span>
                      <strong>{moeda(grupo.pendente)}</strong>
                    </div>
                    <div>
                      <span>Propostas</span>
                      <strong>
                        {grupo.quantidadeRecebida}/{grupo.quantidade}
                      </strong>
                    </div>
                  </div>
                </summary>

                <div className="baixas-tabela-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Nº proposta</th>
                        <th>Cliente / consultora</th>
                        <th>Banco / tabela</th>
                        <th>Comissão esperada</th>
                        <th>Recebido</th>
                        <th>Diferença</th>
                        <th>Status</th>
                        <th>Ação</th>
                      </tr>
                    </thead>

                    <tbody>
                      {grupo.itens.map((item) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))
          )}
        </div>
      </section>
    </div>
  );
}