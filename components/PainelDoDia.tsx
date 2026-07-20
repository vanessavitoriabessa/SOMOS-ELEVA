"use client";

import {
  type CSSProperties,
  useEffect,
} from "react";

type PainelDoDiaProps = {
  aberto: boolean;
  aoFechar: () => void;
  ehConsultora: boolean;
  dataHoje: string;
  vendasHoje: number;
  producaoHoje: number;
  producaoCompraHoje: number;
  producaoCltHoje: number;
  producaoMes: number;
  metaDoMes: number;
  percentualMeta: number;
  percentualExibido: number;
  percentualBarra: number;
  faltaParaMeta: number;
  aoVerPropostas: () => void;
  aoVerRanking: () => void;
};

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

export default function PainelDoDia({
  aberto,
  aoFechar,
  ehConsultora,
  dataHoje,
  vendasHoje,
  producaoHoje,
  producaoCompraHoje,
  producaoCltHoje,
  producaoMes,
  metaDoMes,
  percentualMeta,
  percentualExibido,
  percentualBarra,
  faltaParaMeta,
  aoVerPropostas,
  aoVerRanking,
}: PainelDoDiaProps) {
  useEffect(() => {
    if (!aberto) return;

    const rolagemAnterior =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function fecharComEsc(
      evento: KeyboardEvent
    ) {
      if (evento.key === "Escape") {
        aoFechar();
      }
    }

    window.addEventListener(
      "keydown",
      fecharComEsc
    );

    return () => {
      document.body.style.overflow =
        rolagemAnterior;

      window.removeEventListener(
        "keydown",
        fecharComEsc
      );
    };
  }, [aberto, aoFechar]);

  if (!aberto) {
    return null;
  }

  return (
    <div
      role="presentation"
      onClick={aoFechar}
      style={fundo}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Painel do dia"
        onClick={(evento) =>
          evento.stopPropagation()
        }
        style={painel}
      >
        <header style={cabecalho}>
          <div>
            <span style={tituloMenor}>
              RESUMO OPERACIONAL
            </span>

            <h2 style={titulo}>
              Painel do dia
            </h2>

            <p style={data}>
              {dataHoje}
            </p>
          </div>

          <button
            type="button"
            aria-label="Fechar painel"
            onClick={aoFechar}
            style={botaoFechar}
          >
            ×
          </button>
        </header>

        <section style={grade}>
          <article style={cartao}>
            <span style={legenda}>
              Contratos pagos hoje
            </span>

            <strong style={numero}>
              {vendasHoje}
            </strong>

            <small style={detalhe}>
              Compra de Dívida e CLT
            </small>
          </article>

          <article style={cartao}>
            <span style={legenda}>
              Produção válida hoje
            </span>

            <strong style={numero}>
              {moeda(producaoHoje)}
            </strong>

            <small style={detalhe}>
              {ehConsultora
                ? "Somente a sua produção"
                : "Produção de toda a equipe"}
            </small>
          </article>

          <article style={cartao}>
            <span style={legenda}>
              Compra de Dívida hoje
            </span>

            <strong style={numero}>
              {moeda(
                producaoCompraHoje
              )}
            </strong>

            <small style={detalhe}>
              Produção válida dos contratos
            </small>
          </article>

          <article style={cartao}>
            <span style={legenda}>
              CLT hoje
            </span>

            <strong style={numero}>
              {moeda(producaoCltHoje)}
            </strong>

            <small style={detalhe}>
              Total das parcelas pagas
            </small>
          </article>
        </section>

        <section style={metaCartao}>
          <div style={metaCabecalho}>
            <div>
              <span style={legenda}>
                {ehConsultora
                  ? "Minha produção no mês"
                  : "Produção da empresa no mês"}
              </span>

              <strong style={metaNumero}>
                {moeda(producaoMes)}
              </strong>
            </div>

            <strong
              style={{
                ...percentual,
                color:
                  percentualMeta >= 100
                    ? "#079447"
                    : "#2355e8",
              }}
            >
              {percentualExibido}%
            </strong>
          </div>

          <div style={barraFundo}>
            <div
              style={{
                ...barraPreenchida,
                width: `${percentualBarra}%`,
                background:
                  percentualMeta >= 100
                    ? "linear-gradient(90deg, #0eb765, #079447)"
                    : "linear-gradient(90deg, #175cff, #6541f3)",
              }}
            />
          </div>

          <div style={metaRodape}>
            <span>
              Meta: {moeda(metaDoMes)}
            </span>

            <span>
              {faltaParaMeta > 0
                ? `Faltam ${moeda(
                    faltaParaMeta
                  )}`
                : "Meta superada"}
            </span>
          </div>
        </section>

        <section style={aviso}>
          <span style={avisoLegenda}>
            Visão rápida
          </span>

          <h3 style={avisoTitulo}>
            {vendasHoje > 0
              ? "A operação já possui pagamentos hoje."
              : "Nenhum pagamento registrado hoje."}
          </h3>

          <p style={avisoTexto}>
            Os valores são atualizados
            conforme os contratos são
            marcados como pagos no
            sistema.
          </p>
        </section>

        <footer style={acoes}>
          <button
            type="button"
            onClick={aoVerPropostas}
            style={botaoSecundario}
          >
            Ver propostas
          </button>

          <button
            type="button"
            onClick={aoVerRanking}
            style={botaoPrincipal}
          >
            Ver ranking
          </button>
        </footer>
      </aside>
    </div>
  );
}

const fundo: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  justifyContent: "flex-end",
  background: "rgba(4, 15, 55, 0.48)",
  backdropFilter: "blur(3px)",
};

const painel: CSSProperties = {
  width: "min(440px, calc(100vw - 20px))",
  height: "100%",
  overflowY: "auto",
  padding: 28,
  background: "#f7f9fd",
  boxShadow:
    "-18px 0 45px rgba(4, 24, 82, 0.24)",
};

const cabecalho: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 20,
  marginBottom: 25,
};

const tituloMenor: CSSProperties = {
  color: "#ff6b00",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 1.4,
};

const titulo: CSSProperties = {
  margin: "7px 0 5px",
  color: "#08194f",
  fontSize: 27,
};

const data: CSSProperties = {
  margin: 0,
  color: "#69748e",
  fontSize: 14,
  textTransform: "capitalize",
};

const botaoFechar: CSSProperties = {
  width: 42,
  height: 42,
  border: "1px solid #dfe5f0",
  borderRadius: 12,
  background: "#ffffff",
  color: "#0b1d54",
  fontSize: 21,
  cursor: "pointer",
};

const grade: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const cartao: CSSProperties = {
  minHeight: 130,
  padding: 18,
  border: "1px solid #dfe5f1",
  borderRadius: 17,
  background: "#ffffff",
  boxShadow:
    "0 8px 25px rgba(14, 42, 105, 0.06)",
};

const legenda: CSSProperties = {
  display: "block",
  color: "#68748d",
  fontSize: 12,
  lineHeight: 1.3,
};

const numero: CSSProperties = {
  display: "block",
  marginTop: 10,
  color: "#07194f",
  fontSize: 21,
  lineHeight: 1.15,
};

const detalhe: CSSProperties = {
  display: "block",
  marginTop: 9,
  color: "#8992a5",
  fontSize: 11,
  lineHeight: 1.35,
};

const metaCartao: CSSProperties = {
  marginTop: 18,
  padding: 22,
  border: "1px solid #dfe5f1",
  borderRadius: 18,
  background: "#ffffff",
};

const metaCabecalho: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 15,
};

const metaNumero: CSSProperties = {
  display: "block",
  marginTop: 7,
  color: "#07194f",
  fontSize: 22,
};

const percentual: CSSProperties = {
  fontSize: 18,
};

const barraFundo: CSSProperties = {
  height: 10,
  marginTop: 18,
  overflow: "hidden",
  borderRadius: 999,
  background: "#e9edf5",
};

const barraPreenchida: CSSProperties = {
  height: "100%",
  borderRadius: 999,
};

const metaRodape: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 10,
  color: "#69748e",
  fontSize: 12,
};

const aviso: CSSProperties = {
  marginTop: 18,
  padding: 22,
  borderRadius: 18,
  background:
    "linear-gradient(135deg, #0e319e, #165ce2)",
  color: "#ffffff",
};

const avisoLegenda: CSSProperties = {
  fontSize: 12,
  opacity: 0.78,
};

const avisoTitulo: CSSProperties = {
  margin: "8px 0",
  fontSize: 20,
};

const avisoTexto: CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.5,
  opacity: 0.88,
};

const acoes: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 20,
};

const botaoPrincipal: CSSProperties = {
  minHeight: 48,
  border: 0,
  borderRadius: 13,
  background: "#1555ed",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const botaoSecundario: CSSProperties = {
  minHeight: 48,
  border: "1px solid #d8dfec",
  borderRadius: 13,
  background: "#ffffff",
  color: "#15306e",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};