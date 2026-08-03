"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  CalendarDays,
  ChevronRight,
  Gift,
  History,
  Landmark,
  Medal,
  Pencil,
  PiggyBank,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import AjustePontosModal from "../loja-premios/AjustePontosModal";
import "./minha-premiacao-v2.css";

export type MovimentoPremiacao = {
  id: string;
  produto: "Compra de Dívida" | "CLT";
  descricao: string;
  pontos: number;
  data: string;
};

type MinhaPremiacaoV2Props = {
  nomeUsuario: string;
  nomeExibido: string;
  perfilUsuario: string;
  podeGerenciar: boolean;

  nomesConsultoras: string[];
  consultoraSelecionada: string;
  competencia: string;

  pontosCompra: number;
  pontosClt: number;
  pontosTotal: number;
  premioCompra: number;
  premioClt: number;
  premioTotal: number;

  producaoDigitada: number;
  producaoConfirmada: number;
  producaoEmFormacao: number;
  contratosDigitados: number;
  contratosConfirmados: number;
  contratosEmFormacao: number;

  saquesPagos: number;
  progresso: number;
  faltaParaMeta: number;
  meta: number;
  movimentos: MovimentoPremiacao[];
  posicaoRanking: number;
  totalRanking: number;

  podeSolicitar: boolean;
  solicitacaoPendente: boolean;

  onConsultoraChange: (nome: string) => void;
  onCompetenciaChange: (competencia: string) => void;
  onAtualizar: () => void | Promise<void>;
  onSolicitarSaque: (chavePix: string) => void;
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

function competenciaFormatada(valor: string) {
  const [ano, mes] = valor.split("-").map(Number);

  if (!ano || !mes) return valor;

  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function competenciaCurta(valor: string) {
  const [ano, mes] = valor.split("-");
  return mes && ano ? `${mes}/${ano}` : valor;
}

function dataMovimento(valor: string) {
  if (!valor) return "Data não informada";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleDateString("pt-BR");
}

export default function MinhaPremiacaoV2({
  nomeUsuario,
  nomeExibido,
  perfilUsuario,
  podeGerenciar,
  nomesConsultoras,
  consultoraSelecionada,
  competencia,
  pontosCompra,
  pontosClt,
  pontosTotal,
  premioCompra,
  premioClt,
  premioTotal,
  producaoDigitada,
  producaoConfirmada,
  producaoEmFormacao,
  contratosDigitados,
  contratosConfirmados,
  contratosEmFormacao,
  saquesPagos,
  progresso,
  faltaParaMeta,
  meta,
  movimentos,
  posicaoRanking,
  totalRanking,
  podeSolicitar,
  solicitacaoPendente,
  onConsultoraChange,
  onCompetenciaChange,
  onAtualizar,
  onSolicitarSaque,
}: MinhaPremiacaoV2Props) {
  const router = useRouter();

  const [modalSaqueAberto, setModalSaqueAberto] = useState(false);
  const [modalAjusteAberto, setModalAjusteAberto] = useState(false);
  const [chavePix, setChavePix] = useState("");
  const [erroPix, setErroPix] = useState("");

  const barras = useMemo(() => {
    const grupos = [0, 0, 0, 0, 0, 0, 0];

    movimentos.forEach((movimento) => {
      const data = new Date(movimento.data);
      const dia = Number.isNaN(data.getTime()) ? 1 : data.getDate();
      const indice = Math.min(6, Math.floor((Math.max(dia, 1) - 1) / 5));
      grupos[indice] += Number(movimento.pontos || 0);
    });

    const maior = Math.max(...grupos, 1);

    return grupos.map((valor, indice) => ({
      dia: ["01", "05", "10", "15", "20", "25", "30"][indice],
      altura: valor > 0 ? Math.max(12, (valor / maior) * 100) : 0,
    }));
  }, [movimentos]);

  function enviarSaque(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const pix = chavePix.trim();

    if (pix.length < 3) {
      setErroPix("Informe uma chave PIX válida.");
      return;
    }

    onSolicitarSaque(pix);
    setChavePix("");
    setErroPix("");
    setModalSaqueAberto(false);
  }

  return (
    <div className="mpv3-page">
      <section className="mpv3-cabecalho">
        <div>
          <span className="mpv3-etiqueta">CARTEIRA ELEVA</span>

          <h2>Olá, {nomeExibido || nomeUsuario || "Consultora"}!</h2>

          <p>
            Acompanhe seus ganhos, pontos e evolução mensal com dados reais.
          </p>
        </div>

        <div className="mpv3-admin-filtros">
          {podeGerenciar && (
            <label className="mpv3-seletor-admin">
              <span>Consultora</span>

              <select
                value={consultoraSelecionada}
                onChange={(evento) =>
                  onConsultoraChange(evento.target.value)
                }
              >
                {nomesConsultoras.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="mpv3-competencia">
            <CalendarDays size={18} />

            <div>
              <span>Competência atual</span>

              <input
                type="month"
                value={competencia}
                onChange={(evento) =>
                  onCompetenciaChange(evento.target.value)
                }
              />
            </div>

            <ChevronRight size={17} />
          </label>
        </div>
      </section>

      <section className="mpv3-principal">
        <div className="mpv3-cartao">
          <div className="mpv3-cartao-brilho" />

          <div className="mpv3-cartao-topo">
            <div className="mpv3-marca">
              <div className="mpv3-marca-icone">
                <WalletCards size={22} />
              </div>

              <div>
                <span>CARTEIRA ELEVA</span>
                <strong>Conta de premiação</strong>
              </div>
            </div>

            <div className="mpv3-cartao-status-acoes">
              <span className="mpv3-status">
                {pontosTotal >= meta ? "Meta ativada" : "Conta ativa"}
              </span>

              {podeGerenciar && (
                <button
                  type="button"
                  className="mpv3-editar-pontos"
                  onClick={() => setModalAjusteAberto(true)}
                  aria-label="Ajustar pontos"
                  title="Ajustar pontos"
                >
                  <Pencil size={17} />
                </button>
              )}
            </div>
          </div>

          <div className="mpv3-saldo">
            <span>Premiação disponível</span>
            <h3>{moeda(premioTotal)}</h3>

            <p>
              <Sparkles size={15} />
              {pontos(pontosTotal)} pontos acumulados
            </p>
          </div>

          <div className="mpv3-cartao-rodape">
            <div>
              <span>Titular</span>
              <strong>{nomeExibido}</strong>
            </div>

            <div>
              <span>Perfil</span>
              <strong>{perfilUsuario || "Consultora"}</strong>
            </div>

            <div>
              <span>Competência</span>
              <strong>{competenciaCurta(competencia)}</strong>
            </div>
          </div>
        </div>

        <aside className="mpv3-acoes">
          <button
            type="button"
            disabled={!podeSolicitar}
            onClick={() => {
              if (podeSolicitar) setModalSaqueAberto(true);
            }}
          >
            <div className="mpv3-acao-icone saque">
              <PiggyBank size={21} />
            </div>

            <div>
              <strong>
                {solicitacaoPendente
                  ? "Saque solicitado"
                  : "Solicitar saque"}
              </strong>

              <span>
                {solicitacaoPendente
                  ? "Aguardando pagamento"
                  : podeSolicitar
                    ? "Receba por PIX"
                    : "Meta ainda não ativada"}
              </span>
            </div>

            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            onClick={() => {
              document
                .getElementById("extrato-premiacao")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
            }}
          >
            <div className="mpv3-acao-icone extrato">
              <History size={21} />
            </div>

            <div>
              <strong>Ver extrato</strong>
              <span>Movimentações da competência</span>
            </div>

            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            onClick={() => router.push("/loja-premios")}
          >
            <div className="mpv3-acao-icone loja">
              <Gift size={21} />
            </div>

            <div>
              <strong>Loja de Prêmios</strong>
              <span>Troque seus pontos</span>
            </div>

            <ChevronRight size={18} />
          </button>
        </aside>
      </section>

      <section className="mpv3-resumo">
        <article>
          <div className="mpv3-resumo-topo">
            <div className="mpv3-resumo-icone entrada">
              <ArrowDownLeft size={18} />
            </div>
          </div>

          <span>Produção confirmada</span>
          <strong>{moeda(producaoConfirmada)}</strong>
          <small>{contratosConfirmados} contrato(s) pago(s)</small>
        </article>

        <article>
          <div className="mpv3-resumo-topo">
            <div className="mpv3-resumo-icone saida">
              <ArrowUpRight size={18} />
            </div>
          </div>

          <span>Saques pagos</span>
          <strong>{moeda(saquesPagos)}</strong>
          <small>Pagamentos concluídos</small>
        </article>

        <article>
          <div className="mpv3-resumo-topo">
            <div className="mpv3-resumo-icone formacao">
              <Landmark size={18} />
            </div>
          </div>

          <span>Em formação</span>
          <strong>{moeda(producaoEmFormacao)}</strong>
          <small>{contratosEmFormacao} contrato(s)</small>
        </article>

        <article>
          <div className="mpv3-resumo-topo">
            <div className="mpv3-resumo-icone pontos">
              <Award size={18} />
            </div>
          </div>

          <span>Pontos disponíveis</span>
          <strong>{pontos(pontosTotal)}</strong>
          <small>
            Compra {pontos(pontosCompra)} · CLT {pontos(pontosClt)}
          </small>
        </article>
      </section>

      <section className="mpv3-conteudo">
        <div className="mpv3-coluna-principal">
          <section className="mpv3-grafico-card">
            <div className="mpv3-secao-topo">
              <div>
                <span>EVOLUÇÃO MENSAL</span>
                <h3>Produção da competência</h3>
              </div>

              <div className="mpv3-grafico-total">
                <span>Produção digitada</span>
                <strong>{moeda(producaoDigitada)}</strong>
              </div>
            </div>

            <div className="mpv3-grafico">
              <div className="mpv3-grafico-linhas">
                <span />
                <span />
                <span />
                <span />
              </div>

              <div className="mpv3-barras">
                {barras.map((item) => (
                  <div className="mpv3-barra-item" key={item.dia}>
                    <div className="mpv3-barra-area">
                      <div
                        className="mpv3-barra"
                        style={{ height: `${item.altura}%` }}
                      />
                    </div>

                    <span>{item.dia}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mpv3-grafico-rodape">
              <span>{contratosDigitados} contrato(s) digitado(s)</span>
              <strong>
                {Math.round(progresso)}% da meta concluída
              </strong>
            </div>
          </section>

          <section
            id="extrato-premiacao"
            className="mpv3-extrato"
          >
            <div className="mpv3-secao-topo">
              <div>
                <span>MOVIMENTAÇÕES</span>
                <h3>Extrato da competência</h3>
              </div>

              <strong>{movimentos.length} lançamento(s)</strong>
            </div>

            {movimentos.length === 0 ? (
              <div className="mpv3-extrato-vazio">
                Nenhum contrato pago gerou pontos nesta competência.
              </div>
            ) : (
              <div className="mpv3-extrato-lista">
                {movimentos.slice(0, 8).map((movimento) => (
                  <article key={movimento.id}>
                    <div className="mpv3-movimento-icone entrada">
                      <ArrowDownLeft size={18} />
                    </div>

                    <div className="mpv3-movimento-info">
                      <strong>{movimento.descricao}</strong>
                      <span>{movimento.produto}</span>
                      <small>{dataMovimento(movimento.data)}</small>
                    </div>

                    <div className="mpv3-movimento-valor positivo">
                      <strong>
                        + {pontos(movimento.pontos)} pts
                      </strong>
                      <span>Confirmado</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="mpv3-coluna-lateral">
          <section className="mpv3-meta-card">
            <div className="mpv3-secao-topo">
              <div>
                <span>MINHA META</span>
                <h3>Progresso mensal</h3>
              </div>

              <Target size={21} />
            </div>

            <div
              className="mpv3-meta-circulo"
              style={{
                background: `conic-gradient(#244dcc ${Math.min(
                  100,
                  progresso
                )}%, #e8edf7 0)`,
              }}
            >
              <div>
                <strong>{Math.round(progresso)}%</strong>
                <span>concluído</span>
              </div>
            </div>

            <div className="mpv3-meta-valores">
              <div>
                <span>Pontos atuais</span>
                <strong>{pontos(pontosTotal)}</strong>
              </div>

              <div>
                <span>Meta mínima</span>
                <strong>{pontos(meta)}</strong>
              </div>
            </div>

            <div className="mpv3-falta-meta">
              <TrendingUp size={18} />

              <div>
                <span>
  {faltaParaMeta > 0
    ? "Faltam para ativar a meta"
    : "Meta mínima atingida"}
</span>

<strong>
  {faltaParaMeta > 0
    ? `${pontos(faltaParaMeta)} pontos`
    : "Produção acima de R$ 30.000"}
</strong>
              </div>
            </div>
          </section>

          <section className="mpv3-ranking-card">
            <div className="mpv3-ranking-icone">
              <Medal size={28} />
            </div>

            <span>POSIÇÃO NO RANKING</span>
            <strong>
              {posicaoRanking > 0
                ? `${posicaoRanking}º lugar`
                : "Sem posição"}
            </strong>

            <p>
              {totalRanking > 0
                ? `Entre ${totalRanking} consultora(s) nesta competência.`
                : "Ainda não há dados suficientes para o ranking."}
            </p>

            <button
              type="button"
              onClick={() => router.push("/ranking")}
            >
              Ver ranking completo
              <ChevronRight size={16} />
            </button>
          </section>

          <section className="mpv3-conquista">
            <div className="mpv3-conquista-icone">
              <Award size={23} />
            </div>

            <div>
              <span>PRÓXIMA CONQUISTA</span>
              <strong>Meta de {pontos(meta)} pontos</strong>
              <p>
                {faltaParaMeta > 0
                  ? `Faltam ${pontos(faltaParaMeta)} pontos.`
                  : "Meta ativada nesta competência."}
              </p>
            </div>
          </section>
        </aside>
      </section>

      {modalSaqueAberto && (
        <div
          className="mpv3-modal-fundo"
          onClick={() => setModalSaqueAberto(false)}
        >
          <form
            className="mpv3-modal-saque"
            onClick={(evento) => evento.stopPropagation()}
            onSubmit={enviarSaque}
          >
            <div className="mpv3-modal-topo">
              <div>
                <span>CARTEIRA ELEVA</span>
                <h3>Solicitar saque</h3>
                <p>Informe a chave PIX para receber sua premiação.</p>
              </div>

              <button
                type="button"
                onClick={() => setModalSaqueAberto(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="mpv3-modal-saldo">
              <span>Valor disponível</span>
              <strong>{moeda(premioTotal)}</strong>
            </div>

            <label className="mpv3-modal-campo">
              Chave PIX

              <input
                type="text"
                value={chavePix}
                onChange={(evento) => {
                  setChavePix(evento.target.value);
                  setErroPix("");
                }}
                placeholder="CPF, celular, e-mail ou chave aleatória"
                required
              />

              {erroPix && <small>{erroPix}</small>}
            </label>

            <div className="mpv3-modal-aviso">
              A solicitação ficará aguardando aprovação da gestão.
            </div>

            <div className="mpv3-modal-acoes">
              <button
                type="button"
                className="cancelar"
                onClick={() => setModalSaqueAberto(false)}
              >
                Cancelar
              </button>

              <button type="submit" className="confirmar">
                Solicitar saque
              </button>
            </div>
          </form>
        </div>
      )}

      <AjustePontosModal
        aberto={modalAjusteAberto}
        consultora={nomeExibido}
        competencia={competencia}
        saldoAtual={pontosTotal}
        criadoPor={nomeUsuario}
        onFechar={() => setModalAjusteAberto(false)}
        onAtualizado={async () => {
          await onAtualizar();
        }}
      />
    </div>
  );
}