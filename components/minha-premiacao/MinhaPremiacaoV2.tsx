"use client";

import { useState } from "react";
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
  PiggyBank,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import "./minha-premiacao-v2.css";

const dadosGrafico = [
  { dia: "01", valor: 28 },
  { dia: "05", valor: 42 },
  { dia: "10", valor: 35 },
  { dia: "15", valor: 61 },
  { dia: "20", valor: 53 },
  { dia: "25", valor: 78 },
  { dia: "30", valor: 72 },
];

export default function MinhaPremiacaoV2() {
  const router = useRouter();
  const [modalSaqueAberto, setModalSaqueAberto] = useState(false);
  const [competencia, setCompetencia] = useState("2026-07");

  return (
    <div className="mpv3-page">
      <section className="mpv3-cabecalho">
        <div>
          <span className="mpv3-etiqueta">CARTEIRA ELEVA</span>
          <h2>Olá, Tay!</h2>
          <p>Acompanhe seus ganhos, pontos e evolução mensal.</p>
        </div>

        <label className="mpv3-competencia">
  <CalendarDays size={18} />

  <div>
    <span>Competência atual</span>

    <input
      type="month"
      value={competencia}
      onChange={(evento) =>
        setCompetencia(evento.target.value)
      }
    />
  </div>

  <ChevronRight size={17} />
</label>
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
            <span className="mpv3-status">Conta ativa</span>
          </div>

          <div className="mpv3-saldo">
            <span>Saldo disponível</span>
            <h3>R$ 3.580,00</h3>
            <p>
              <Sparkles size={15} />
              35.800 pontos acumulados
            </p>
          </div>

          <div className="mpv3-cartao-rodape">
            <div>
              <span>Titular</span>
              <strong>Tay</strong>
            </div>
            <div>
              <span>Conta</span>
              <strong>Premium</strong>
            </div>
            <div>
              <span>Competência</span>
              <strong>07/2026</strong>
            </div>
          </div>
        </div>

        <aside className="mpv3-acoes">
          <button
            type="button"
            onClick={() => setModalSaqueAberto(true)}
          >
            <div className="mpv3-acao-icone saque">
              <PiggyBank size={21} />
            </div>
            <div>
              <strong>Solicitar saque</strong>
              <span>Receba por PIX</span>
            </div>
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            onClick={() => {
              document
                .getElementById("extrato-premiacao")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <div className="mpv3-acao-icone extrato">
              <History size={21} />
            </div>
            <div>
              <strong>Ver extrato</strong>
              <span>Movimentações completas</span>
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
            <span className="mpv3-variacao positiva">+18%</span>
          </div>
          <span>Entradas no mês</span>
          <strong>R$ 4.820,00</strong>
          <small>Valores confirmados</small>
        </article>

        <article>
          <div className="mpv3-resumo-topo">
            <div className="mpv3-resumo-icone saida">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <span>Saídas</span>
          <strong>R$ 1.240,00</strong>
          <small>Saques e resgates</small>
        </article>

        <article>
          <div className="mpv3-resumo-topo">
            <div className="mpv3-resumo-icone formacao">
              <Landmark size={18} />
            </div>
          </div>
          <span>Em formação</span>
          <strong>R$ 2.150,00</strong>
          <small>Aguardando confirmação</small>
        </article>

        <article>
          <div className="mpv3-resumo-topo">
            <div className="mpv3-resumo-icone pontos">
              <Award size={18} />
            </div>
          </div>
          <span>Pontos disponíveis</span>
          <strong>35.800</strong>
          <small>Prontos para resgate</small>
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
                <span>Produção atual</span>
                <strong>R$ 72.000,00</strong>
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
                {dadosGrafico.map((item) => (
                  <div className="mpv3-barra-item" key={item.dia}>
                    <div className="mpv3-barra-area">
                      <div
                        className="mpv3-barra"
                        style={{ height: `${item.valor}%` }}
                      />
                    </div>
                    <span>{item.dia}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mpv3-grafico-rodape">
              <span>Início da competência</span>
              <strong>72% da meta concluída</strong>
            </div>
          </section>

          <section id="extrato-premiacao" className="mpv3-extrato">
            <div className="mpv3-secao-topo">
              <div>
                <span>MOVIMENTAÇÕES</span>
                <h3>Extrato recente</h3>
              </div>
              <button
  type="button"
  onClick={() => {
    alert("Em breve vamos abrir o extrato completo.");
  }}
>
  Ver extrato completo
  <ChevronRight size={16} />
</button>
            </div>

            <div className="mpv3-extrato-lista">
              <article>
                <div className="mpv3-movimento-icone entrada">
                  <ArrowDownLeft size={18} />
                </div>
                <div className="mpv3-movimento-info">
                  <strong>Produção paga</strong>
                  <span>Compra de Dívida</span>
                  <small>30 de julho · 14:32</small>
                </div>
                <div className="mpv3-movimento-valor positivo">
                  <strong>+ R$ 820,00</strong>
                  <span>Confirmado</span>
                </div>
              </article>

              <article>
                <div className="mpv3-movimento-icone saida">
                  <ArrowUpRight size={18} />
                </div>
                <div className="mpv3-movimento-info">
                  <strong>Saque PIX</strong>
                  <span>Transferência realizada</span>
                  <small>28 de julho · 09:10</small>
                </div>
                <div className="mpv3-movimento-valor negativo">
                  <strong>- R$ 500,00</strong>
                  <span>Concluído</span>
                </div>
              </article>

              <article>
                <div className="mpv3-movimento-icone bonus">
                  <Sparkles size={18} />
                </div>
                <div className="mpv3-movimento-info">
                  <strong>Bônus de meta</strong>
                  <span>Campanha mensal</span>
                  <small>25 de julho · 18:20</small>
                </div>
                <div className="mpv3-movimento-valor positivo">
                  <strong>+ R$ 250,00</strong>
                  <span>Confirmado</span>
                </div>
              </article>
            </div>
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

            <div className="mpv3-meta-circulo">
              <div>
                <strong>72%</strong>
                <span>concluído</span>
              </div>
            </div>

            <div className="mpv3-meta-valores">
              <div>
                <span>Produção atual</span>
                <strong>R$ 72.000</strong>
              </div>
              <div>
                <span>Meta individual</span>
                <strong>R$ 100.000</strong>
              </div>
            </div>

            <div className="mpv3-falta-meta">
              <TrendingUp size={18} />
              <div>
                <span>Faltam para sua meta</span>
                <strong>R$ 28.000,00</strong>
              </div>
            </div>
          </section>

          <section className="mpv3-ranking-card">
            <div className="mpv3-ranking-icone">
              <Medal size={28} />
            </div>
            <span>POSIÇÃO NO RANKING</span>
            <strong>8º lugar</strong>
            <p>
              Você está entre as melhores consultoras da competência.
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
              <strong>Meta de R$ 100 mil</strong>
              <p>Faltam apenas 28% para desbloquear.</p>
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
            onSubmit={(evento) => {
              evento.preventDefault();
              alert("Solicitação de saque enviada.");
              setModalSaqueAberto(false);
            }}
          >
            <div className="mpv3-modal-topo">
              <div>
                <span>CARTEIRA ELEVA</span>
                <h3>Solicitar saque</h3>
                <p>Informe o valor que deseja receber por PIX.</p>
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
              <span>Saldo disponível</span>
              <strong>R$ 3.580,00</strong>
            </div>

            <label className="mpv3-modal-campo">
              Valor do saque
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="R$ 0,00"
                required
              />
            </label>

            <label className="mpv3-modal-campo">
              Chave PIX
              <input
                type="text"
                placeholder="CPF, celular, e-mail ou chave aleatória"
                required
              />
            </label>

            <label className="mpv3-modal-campo">
              Tipo da chave
              <select defaultValue="CPF">
                <option value="CPF">CPF</option>
                <option value="CELULAR">Celular</option>
                <option value="EMAIL">E-mail</option>
                <option value="ALEATORIA">Chave aleatória</option>
              </select>
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
    </div>
  );
}