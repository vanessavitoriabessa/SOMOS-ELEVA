"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CircleMinus,
  CirclePlus,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "./AjustePontosModal.css";

type ProdutoAjuste = "Compra de Dívida" | "CLT";

type AjustePontos = {
  id: string;
  consultora: string;
  competencia: string;
  produto: ProdutoAjuste;
  pontos: number;
  motivo: string;
  criado_por?: string | null;
  criado_em: string;
};

type AjustePontosModalProps = {
  aberto: boolean;
  consultora: string;
  competencia: string;
  saldoAtual: number;
  criadoPor: string;
  onFechar: () => void;
  onAtualizado: () => void | Promise<void>;
};

function formatarPontos(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarData(valor: string) {
  if (!valor) return "Data não informada";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AjustePontosModal({
  aberto,
  consultora,
  competencia,
  saldoAtual,
  criadoPor,
  onFechar,
  onAtualizado,
}: AjustePontosModalProps) {
  const supabase = useMemo(() => createClient(), []);

  const [historico, setHistorico] = useState<AjustePontos[]>([]);
  const [produto, setProduto] =
    useState<ProdutoAjuste>("Compra de Dívida");
  const [tipo, setTipo] = useState<"adicionar" | "retirar">("adicionar");
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [ajusteEditando, setAjusteEditando] =
    useState<AjustePontos | null>(null);

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const valorDigitado = Number(
    String(quantidade || "0").replace(",", ".")
  );

  const valorAssinado =
    tipo === "retirar"
      ? -Math.abs(valorDigitado || 0)
      : Math.abs(valorDigitado || 0);

  const novoSaldo = Math.max(saldoAtual + valorAssinado, 0);

  async function carregarHistorico() {
    if (!consultora || !competencia) {
      setHistorico([]);
      return;
    }

    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("ajustes_pontos")
      .select(
        "id, consultora, competencia, produto, pontos, motivo, criado_por, criado_em"
      )
      .eq("consultora", consultora)
      .eq("competencia", competencia)
      .order("criado_em", { ascending: false });

    if (error) {
      setErro(error.message);
      setHistorico([]);
    } else {
      setHistorico((data || []) as AjustePontos[]);
    }

    setCarregando(false);
  }

  useEffect(() => {
    if (!aberto) return;

    setProduto("Compra de Dívida");
    setTipo("adicionar");
    setQuantidade("");
    setMotivo("");
    setAjusteEditando(null);
    setErro("");
    setMensagem("");

    void carregarHistorico();
  }, [aberto, consultora, competencia]);

  function limparFormulario() {
    setProduto("Compra de Dívida");
    setTipo("adicionar");
    setQuantidade("");
    setMotivo("");
    setAjusteEditando(null);
  }

  function iniciarEdicao(ajuste: AjustePontos) {
    setAjusteEditando(ajuste);
    setProduto(ajuste.produto);
    setTipo(ajuste.pontos < 0 ? "retirar" : "adicionar");
    setQuantidade(String(Math.abs(Number(ajuste.pontos || 0))));
    setMotivo(ajuste.motivo || "");
    setErro("");
    setMensagem("");
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    if (!consultora) {
      setErro("Selecione uma consultora.");
      return;
    }

    if (!competencia) {
      setErro("Selecione uma competência.");
      return;
    }

    if (!Number.isFinite(valorDigitado) || valorDigitado <= 0) {
      setErro("Informe uma quantidade de pontos maior que zero.");
      return;
    }

    if (motivo.trim().length < 3) {
      setErro("Informe o motivo do ajuste.");
      return;
    }

    if (novoSaldo < 0) {
      setErro("O ajuste não pode deixar o saldo negativo.");
      return;
    }

    setSalvando(true);

    try {
      if (ajusteEditando) {
        const { error } = await supabase
          .from("ajustes_pontos")
          .update({
            produto,
            pontos: valorAssinado,
            motivo: motivo.trim(),
            criado_por: criadoPor || "Administradora",
          })
          .eq("id", ajusteEditando.id);

        if (error) throw error;

        setMensagem("Ajuste atualizado com sucesso.");
      } else {
        const { error } = await supabase
          .from("ajustes_pontos")
          .insert({
            consultora,
            competencia,
            produto,
            pontos: valorAssinado,
            motivo: motivo.trim(),
            criado_por: criadoPor || "Administradora",
          });

        if (error) throw error;

        setMensagem("Ajuste salvo com sucesso.");
      }

      limparFormulario();
      await carregarHistorico();
      await onAtualizado();
    } catch (error: unknown) {
  console.error("ERRO AO SALVAR AJUSTE DE PONTOS:", error);

  const mensagemErro =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error
        ? String(
            (error as { message?: unknown }).message ||
              "Não foi possível salvar o ajuste."
          )
        : "Não foi possível salvar o ajuste.";

  setErro(mensagemErro);
} finally {
      setSalvando(false);
    }
  }

  async function excluir(ajuste: AjustePontos) {
    const confirmou = window.confirm(
      `Deseja excluir o ajuste de ${formatarPontos(
        ajuste.pontos
      )} pontos?`
    );

    if (!confirmou) return;

    setErro("");
    setMensagem("");

    const { error } = await supabase
      .from("ajustes_pontos")
      .delete()
      .eq("id", ajuste.id);

    if (error) {
      setErro(error.message);
      return;
    }

    if (ajusteEditando?.id === ajuste.id) {
      limparFormulario();
    }

    setMensagem("Ajuste excluído com sucesso.");
    await carregarHistorico();
    await onAtualizado();
  }

  if (!aberto) return null;

  return (
    <div
      className="ajp-fundo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          onFechar();
        }
      }}
    >
      <section className="ajp-modal">
        <header className="ajp-topo">
          <div>
            <span>ADMINISTRAÇÃO DA PREMIAÇÃO</span>
            <h2>Ajustar pontos</h2>
            <p>
              Adicione ou retire pontos com registro de motivo e histórico.
            </p>
          </div>

          <button
            type="button"
            className="ajp-fechar"
            onClick={onFechar}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        <div className="ajp-identificacao">
          <div>
            <span>Consultora</span>
            <strong>{consultora || "Não selecionada"}</strong>
          </div>

          <div>
            <span>Competência</span>
            <strong>{competencia || "Não selecionada"}</strong>
          </div>
        </div>

        {erro && <div className="ajp-alerta erro">{erro}</div>}
        {mensagem && (
          <div className="ajp-alerta sucesso">{mensagem}</div>
        )}

        <div className="ajp-layout">
          <form className="ajp-formulario" onSubmit={salvar}>
            <div className="ajp-formulario-titulo">
              <div>
                <span>
                  {ajusteEditando ? "EDITANDO AJUSTE" : "NOVO AJUSTE"}
                </span>
                <h3>
                  {ajusteEditando
                    ? "Atualizar lançamento"
                    : "Registrar lançamento"}
                </h3>
              </div>

              {ajusteEditando && (
                <button
                  type="button"
                  className="ajp-cancelar-edicao"
                  onClick={limparFormulario}
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <label className="ajp-campo">
              Produto

              <select
                value={produto}
                onChange={(evento) =>
                  setProduto(evento.target.value as ProdutoAjuste)
                }
              >
                <option value="Compra de Dívida">
                  Compra de Dívida
                </option>
                <option value="CLT">CLT</option>
              </select>
            </label>

            <div className="ajp-tipo">
              <button
                type="button"
                className={tipo === "adicionar" ? "ativo adicionar" : ""}
                onClick={() => setTipo("adicionar")}
              >
                <CirclePlus size={18} />
                Adicionar pontos
              </button>

              <button
                type="button"
                className={tipo === "retirar" ? "ativo retirar" : ""}
                onClick={() => setTipo("retirar")}
              >
                <CircleMinus size={18} />
                Retirar pontos
              </button>
            </div>

            <label className="ajp-campo">
              Quantidade de pontos

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantidade}
                onChange={(evento) => setQuantidade(evento.target.value)}
                placeholder="Ex.: 2000"
                required
              />
            </label>

            <label className="ajp-campo">
              Motivo

              <textarea
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value)}
                placeholder="Ex.: contrato pago não importado"
                required
              />
            </label>

            <div className="ajp-preview">
              <div>
                <span>Saldo atual</span>
                <strong>{formatarPontos(saldoAtual)} pts</strong>
              </div>

              <div className="ajp-preview-seta">→</div>

              <div>
                <span>Novo saldo</span>
                <strong>{formatarPontos(novoSaldo)} pts</strong>
              </div>
            </div>

            <button
              type="submit"
              className="ajp-salvar"
              disabled={salvando}
            >
              <Save size={18} />
              {salvando
                ? "Salvando..."
                : ajusteEditando
                  ? "Atualizar ajuste"
                  : "Salvar ajuste"}
            </button>
          </form>

          <aside className="ajp-historico">
            <div className="ajp-historico-topo">
              <div>
                <span>HISTÓRICO</span>
                <h3>Ajustes da competência</h3>
              </div>

              <b>{historico.length}</b>
            </div>

            {carregando ? (
              <div className="ajp-vazio">Carregando ajustes...</div>
            ) : historico.length === 0 ? (
              <div className="ajp-vazio">
                Nenhum ajuste registrado nesta competência.
              </div>
            ) : (
              <div className="ajp-lista">
                {historico.map((ajuste) => (
                  <article key={ajuste.id}>
                    <div
                      className={`ajp-valor ${
                        ajuste.pontos >= 0 ? "positivo" : "negativo"
                      }`}
                    >
                      {ajuste.pontos >= 0 ? "+" : ""}
                      {formatarPontos(ajuste.pontos)} pts
                    </div>

                    <strong>{ajuste.produto}</strong>
                    <p>{ajuste.motivo}</p>

                    <div className="ajp-meta">
                      <span>{formatarData(ajuste.criado_em)}</span>
                      <span>
                        Por {ajuste.criado_por || "Administradora"}
                      </span>
                    </div>

                    <div className="ajp-acoes">
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(ajuste)}
                      >
                        <Pencil size={15} />
                        Editar
                      </button>

                      <button
                        type="button"
                        className="excluir"
                        onClick={() => void excluir(ajuste)}
                      >
                        <Trash2 size={15} />
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}