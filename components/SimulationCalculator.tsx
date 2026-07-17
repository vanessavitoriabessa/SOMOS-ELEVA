"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./simulacao.css";

type Tabela = {
  id: string;
  nome: string;
  banco: string;
  percentual: number;
  fator: number;
  prazo: number;
};

type Historico = {
  id: string;
  cliente: string;
  parcela: number;
  margem: number;
  tabela: string;
  saldoDevedor: number;
  valorLiberado: number;
  troco: number;
  criadoEm: string;
};

const TABELAS: Tabela[] = [
  {
    id: "neo-normal-100",
    nome: "NEO NORMAL — 100%",
    banco: "NEO",
    percentual: 100,
    fator: 0.04199,
    prazo: 22,
  },
];

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function numero(valor: string) {
  const limpo = valor.replace(/[^\d,.-]/g, "").replace(".", "").replace(",", ".");
  const convertido = Number(limpo);
  return Number.isFinite(convertido) ? convertido : 0;
}

export default function SimulationCalculator() {
  const router = useRouter();
  const [parcela, setParcela] = useState("");
  const [margem, setMargem] = useState("");
  const [cliente, setCliente] = useState("");
  const [tabelaId, setTabelaId] = useState(TABELAS[0].id);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const salvo = localStorage.getItem("somos-eleva-historico-simulacoes");
    if (salvo) {
      try {
        setHistorico(JSON.parse(salvo));
      } catch {
        setHistorico([]);
      }
    }
  }, []);

  const tabela = useMemo(
    () => TABELAS.find((item) => item.id === tabelaId) || TABELAS[0],
    [tabelaId]
  );

  const resultado = useMemo(() => {
    const valorParcela = numero(parcela);
    const margemAdicional = numero(margem);
    const saldoDevedor = valorParcela * tabela.prazo;
    const valorLiberado =
      tabela.fator > 0 ? (valorParcela + margemAdicional) / tabela.fator : 0;
    const troco = valorLiberado - saldoDevedor;

    return {
      valorParcela,
      margemAdicional,
      saldoDevedor,
      valorLiberado,
      troco,
    };
  }, [parcela, margem, tabela]);

  function salvarNoHistorico() {
    if (resultado.valorParcela <= 0) {
      setMensagem("Informe o valor da parcela para salvar a simulação.");
      return;
    }

    const nova: Historico = {
      id: crypto.randomUUID(),
      cliente: cliente.trim() || "Cliente não informado",
      parcela: resultado.valorParcela,
      margem: resultado.margemAdicional,
      tabela: tabela.nome,
      saldoDevedor: resultado.saldoDevedor,
      valorLiberado: resultado.valorLiberado,
      troco: resultado.troco,
      criadoEm: new Date().toLocaleString("pt-BR"),
    };

    const atualizado = [nova, ...historico].slice(0, 10);
    setHistorico(atualizado);
    localStorage.setItem(
      "somos-eleva-historico-simulacoes",
      JSON.stringify(atualizado)
    );
    setMensagem("Simulação salva no histórico.");
  }

  async function copiarSimulacao() {
    if (resultado.valorParcela <= 0) {
      setMensagem("Informe o valor da parcela antes de copiar.");
      return;
    }

    const texto = [
      "SIMULAÇÃO SOMOS ELEVA",
      "",
      `Cliente: ${cliente.trim() || "Não informado"}`,
      `Banco/Tabela: ${tabela.nome}`,
      `Parcela: ${moeda(resultado.valorParcela)}`,
      `Prazo: ${tabela.prazo} parcelas`,
      `Saldo devedor: ${moeda(resultado.saldoDevedor)}`,
      `Valor liberado: ${moeda(resultado.valorLiberado)}`,
      `Margem adicional: ${moeda(resultado.margemAdicional)}`,
      `Troco estimado: ${moeda(resultado.troco)}`,
      `Fator utilizado: ${tabela.fator.toFixed(5).replace(".", ",")}`,
    ].join("\n");

    await navigator.clipboard.writeText(texto);
    setMensagem("Simulação copiada. Agora é só colar no WhatsApp.");
  }

  function criarProposta() {
    if (resultado.valorParcela <= 0) {
      setMensagem("Informe o valor da parcela antes de criar a proposta.");
      return;
    }

    const rascunho = {
      cliente: cliente.trim(),
      banco: tabela.banco,
      tabela: tabela.nome,
      parcela: resultado.valorParcela,
      saldoDevedor: resultado.saldoDevedor,
      valorLiberado: resultado.valorLiberado,
      troco: resultado.troco,
      fator: tabela.fator,
      prazo: tabela.prazo,
    };

    localStorage.setItem(
      "somos-eleva-rascunho-proposta",
      JSON.stringify(rascunho)
    );
    router.push("/propostas");
  }

  function limpar() {
    setParcela("");
    setMargem("");
    setCliente("");
    setMensagem("");
  }

  return (
    <div className="simulation-page">
      <section className="simulation-card">
        <div className="simulation-heading">
          <div>
            <span className="simulation-kicker">SIMULADOR AUTOMÁTICO</span>
            <h2>Compra de dívida</h2>
            <p>
              Digite a parcela e o sistema calcula automaticamente os valores.
            </p>
          </div>

          <div className="simulation-badge">NEO</div>
        </div>

        <div className="simulation-form-grid">
          <label>
            Nome do cliente <small>(opcional)</small>
            <input
              value={cliente}
              onChange={(event) => setCliente(event.target.value)}
              placeholder="Digite o nome do cliente"
            />
          </label>

          <label>
            Valor da parcela
            <input
              value={parcela}
              onChange={(event) => setParcela(event.target.value)}
              placeholder="Ex.: 500,00"
              inputMode="decimal"
            />
          </label>

          <label>
            Tabela
            <select
              value={tabelaId}
              onChange={(event) => setTabelaId(event.target.value)}
            >
              {TABELAS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>

          <label>
            Margem adicional
            <input
              value={margem}
              onChange={(event) => setMargem(event.target.value)}
              placeholder="Ex.: 0,00"
              inputMode="decimal"
            />
          </label>
        </div>

        <div className="simulation-info">
          <div>
            <span>Prazo</span>
            <strong>{tabela.prazo} parcelas</strong>
          </div>
          <div>
            <span>Fator</span>
            <strong>{tabela.fator.toFixed(5).replace(".", ",")}</strong>
          </div>
          <div>
            <span>Percentual</span>
            <strong>{tabela.percentual}%</strong>
          </div>
          <div>
            <span>Banco</span>
            <strong>{tabela.banco}</strong>
          </div>
        </div>

        <div className="simulation-results">
          <article>
            <span>Saldo devedor</span>
            <strong>{moeda(resultado.saldoDevedor)}</strong>
            <small>
              Parcela × {tabela.prazo}
            </small>
          </article>

          <article>
            <span>Valor liberado</span>
            <strong>{moeda(resultado.valorLiberado)}</strong>
            <small>
              (Parcela + margem) ÷ fator
            </small>
          </article>

          <article className={resultado.troco < 0 ? "negative" : "highlight"}>
            <span>Troco estimado</span>
            <strong>{moeda(resultado.troco)}</strong>
            <small>Valor liberado − saldo devedor</small>
          </article>
        </div>

        {mensagem && <div className="simulation-message">{mensagem}</div>}

        <div className="simulation-actions">
          <button type="button" className="secondary" onClick={limpar}>
            Limpar
          </button>
          <button type="button" className="secondary" onClick={salvarNoHistorico}>
            Salvar
          </button>
          <button type="button" className="copy" onClick={copiarSimulacao}>
            Copiar simulação
          </button>
          <button type="button" className="primary" onClick={criarProposta}>
            Criar proposta
          </button>
        </div>
      </section>

      <aside className="simulation-history">
        <div className="history-heading">
          <div>
            <span>ÚLTIMAS SIMULAÇÕES</span>
            <h3>Histórico</h3>
          </div>
          <b>{historico.length}</b>
        </div>

        {historico.length === 0 ? (
          <div className="history-empty">
            <div>🧮</div>
            <strong>Nenhuma simulação salva</strong>
            <p>As últimas simulações aparecerão aqui.</p>
          </div>
        ) : (
          <div className="history-list">
            {historico.map((item) => (
              <article key={item.id}>
                <div className="history-top">
                  <strong>{item.cliente}</strong>
                  <time>{item.criadoEm}</time>
                </div>
                <span>{item.tabela}</span>
                <div className="history-values">
                  <div>
                    <small>Parcela</small>
                    <b>{moeda(item.parcela)}</b>
                  </div>
                  <div>
                    <small>Troco</small>
                    <b>{moeda(item.troco)}</b>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </aside>

      <section className="simulation-warning">
        <strong>Primeira versão do módulo</strong>
        <p>
          O cálculo já está funcionando com a tabela NEO NORMAL e fator
          0,04199. As demais tabelas serão adicionadas quando você enviar os
          coeficientes oficiais.
        </p>
      </section>
    </div>
  );
}
