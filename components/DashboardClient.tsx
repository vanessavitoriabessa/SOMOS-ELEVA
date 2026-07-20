"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PainelDoDia from "./PainelDoDia";
import "./dashboard.css";

type PropostaCompraDivida = {
  id?: string;
  cliente?: string;
  vendedora?: string;
  tabela?: string;
  valorContrato?: number;
  valorMeta?: number;
  percentualTabela?: number;
  status?: string;
  dataCadastro?: string;
  dataPagamento?: string;
};

type RegistroClt = {
  id?: string;
  nome?: string;
  consultora?: string;
  parcela?: number;
  status?: string;
  criadoEm?: string;
  atualizadoEm?: string;
  dataPagamento?: string;
};

type Atividade = {
  id: string;
  tipo: "compra" | "clt";
  titulo: string;
  cliente: string;
  valor: number;
  data: Date;
};

const META_INDIVIDUAL = 30000;
const META_EMPRESA = 350000;

const TABELAS_COMPRA_DIVIDA = [
  { nome: "NEO NORMAL", percentual: 100 },
  { nome: "NEO FLEX 1", percentual: 82 },
  { nome: "NEO FLEX 2", percentual: 67 },
  { nome: "NEO FLEX 4", percentual: 37 },
  { nome: "NEO FLEX 5", percentual: 17 },
];

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function nomeBonito(valor: string) {
  if (!valor) return "Colaboradora";
  if (valor === "0001") return "Vanessa";

  const base = valor.includes("@") ? valor.split("@")[0] : valor;
  const nome = base.split(/[._-]/)[0];

  return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
}

function perfilEhConsultora(perfil: string) {
  const texto = normalizarTexto(perfil);

  return (
    texto.includes("consultor") ||
    texto.includes("consultora") ||
    texto.includes("vendedor") ||
    texto.includes("vendedora")
  );
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function numero(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function converterData(valor?: string) {
  if (!valor) return null;

  const texto = String(valor).trim();

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const brasileira = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (brasileira) {
    return new Date(
      Number(brasileira[3]),
      Number(brasileira[2]) - 1,
      Number(brasileira[1])
    );
  }

  const tentativa = new Date(texto);

  return Number.isNaN(tentativa.getTime()) ? null : tentativa;
}

function mesmaData(data: Date, referencia: Date) {
  return (
    data.getFullYear() === referencia.getFullYear() &&
    data.getMonth() === referencia.getMonth() &&
    data.getDate() === referencia.getDate()
  );
}

function mesmoMes(data: Date, referencia: Date) {
  return (
    data.getFullYear() === referencia.getFullYear() &&
    data.getMonth() === referencia.getMonth()
  );
}

function tabelaPeloNome(nome?: string) {
  const nomeNormalizado = normalizarTexto(nome || "");

  return TABELAS_COMPRA_DIVIDA.find((item) => {
    const tabelaNormalizada = normalizarTexto(item.nome);

    return (
      nomeNormalizado === tabelaNormalizada ||
      nomeNormalizado.startsWith(tabelaNormalizada)
    );
  });
}

function percentualDaTabela(proposta: PropostaCompraDivida) {
  const tabela = tabelaPeloNome(proposta.tabela);

  if (tabela) return tabela.percentual;

  const percentualSalvo = Number(proposta.percentualTabela || 0);

  const permitido = TABELAS_COMPRA_DIVIDA.some(
    (item) => Math.abs(item.percentual - percentualSalvo) < 0.01
  );

  return permitido ? percentualSalvo : 0;
}

function valorValidoCompra(proposta: PropostaCompraDivida) {
  const salvo = Number(proposta.valorMeta || 0);

  if (salvo > 0) return salvo;

  return (
    Number(proposta.valorContrato || 0) *
    (percentualDaTabela(proposta) / 100)
  );
}

function competenciaCompra(proposta: PropostaCompraDivida) {
  const digitacao = converterData(proposta.dataCadastro);
  const pagamento = converterData(proposta.dataPagamento);

  if (!pagamento) return null;
  if (!digitacao) return pagamento;

  const limite = new Date(
    digitacao.getFullYear(),
    digitacao.getMonth() + 1,
    19,
    23,
    59,
    59
  );

  return pagamento <= limite ? digitacao : pagamento;
}

function dataClt(registro: RegistroClt) {
  return converterData(
    registro.dataPagamento ||
      registro.atualizadoEm ||
      registro.criadoEm
  );
}

function pontosDoGrafico(valores: number[]) {
  const larguraInicial = 35;
  const larguraFinal = 740;
  const alturaSuperior = 20;
  const alturaInferior = 205;

  const maior = Math.max(...valores, 1);
  const quantidade = Math.max(valores.length - 1, 1);

  return valores
    .map((valor, indice) => {
      const x =
        larguraInicial +
        ((larguraFinal - larguraInicial) * indice) / quantidade;

      const y =
        alturaInferior -
        ((alturaInferior - alturaSuperior) * valor) / maior;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function horarioOuData(data: Date) {
  const hoje = new Date();

  if (mesmaData(data, hoje)) {
    return data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function DashboardClient() {
  const router = useRouter();

  const [nome, setNome] = useState("Colaboradora");
  const [perfil, setPerfil] = useState("Consultora");
  const [propostas, setPropostas] = useState<PropostaCompraDivida[]>([]);
  const [registrosClt, setRegistrosClt] = useState<RegistroClt[]>([]);
const [painelDiaAberto, setPainelDiaAberto] = useState(false);

  useEffect(() => {
    function carregar() {
      const nomeSalvo = localStorage.getItem("somos-eleva-nome");
      const usuario =
        localStorage.getItem("somos-eleva-usuario") || "0001";
      const perfilSalvo =
        localStorage.getItem("somos-eleva-cargo") || "Consultora";

      setNome(nomeSalvo?.trim() || nomeBonito(usuario));
      setPerfil(perfilSalvo);

      try {
        const lista = JSON.parse(
          localStorage.getItem("somos-eleva-propostas") || "[]"
        );

        setPropostas(Array.isArray(lista) ? lista : []);
      } catch {
        setPropostas([]);
      }

      try {
        const lista = JSON.parse(
          localStorage.getItem("somos-eleva-clt") || "[]"
        );

        setRegistrosClt(Array.isArray(lista) ? lista : []);
      } catch {
        setRegistrosClt([]);
      }
    }

    carregar();

    window.addEventListener("storage", carregar);
    window.addEventListener("focus", carregar);

    return () => {
      window.removeEventListener("storage", carregar);
      window.removeEventListener("focus", carregar);
    };
  }, []);

  const ehConsultora = perfilEhConsultora(perfil);
  const hoje = useMemo(() => new Date(), []);
  const metaDoMes = ehConsultora ? META_INDIVIDUAL : META_EMPRESA;

  const dados = useMemo(() => {
    const nomeNormalizado = normalizarTexto(nome);

    const propostasFiltradas = propostas.filter((proposta) => {
      if (proposta.status !== "Pago") return false;

      if (!ehConsultora) return true;

      return normalizarTexto(proposta.vendedora || "") === nomeNormalizado;
    });

    const cltFiltrados = registrosClt.filter((registro) => {
      if (registro.status !== "Pago") return false;

      if (!ehConsultora) return true;

      return normalizarTexto(registro.consultora || "") === nomeNormalizado;
    });

    const comprasMes = propostasFiltradas.filter((proposta) => {
      const competencia = competenciaCompra(proposta);
      return Boolean(competencia) && mesmoMes(competencia as Date, hoje);
    });

    const cltMes = cltFiltrados.filter((registro) => {
      const data = dataClt(registro);
      return Boolean(data) && mesmoMes(data as Date, hoje);
    });

    const comprasHoje = propostasFiltradas.filter((proposta) => {
      const pagamento = converterData(proposta.dataPagamento);
      return Boolean(pagamento) && mesmaData(pagamento as Date, hoje);
    });

    const cltHoje = cltFiltrados.filter((registro) => {
      const data = dataClt(registro);
      return Boolean(data) && mesmaData(data as Date, hoje);
    });

    const producaoCompraMes = comprasMes.reduce(
      (total, proposta) => total + valorValidoCompra(proposta),
      0
    );

    const producaoCltMes = cltMes.reduce(
      (total, registro) => total + Number(registro.parcela || 0),
      0
    );

    const producaoCompraHoje = comprasHoje.reduce(
      (total, proposta) => total + valorValidoCompra(proposta),
      0
    );

    const producaoCltHoje = cltHoje.reduce(
      (total, registro) => total + Number(registro.parcela || 0),
      0
    );

    const producaoMes = producaoCompraMes + producaoCltMes;
    const producaoHoje = producaoCompraHoje + producaoCltHoje;
    const vendasMes = comprasMes.length + cltMes.length;
    const vendasHoje = comprasHoje.length + cltHoje.length;
    const ticketMedio = vendasMes > 0 ? producaoMes / vendasMes : 0;

    const atividadesCompra: Atividade[] = comprasMes.map(
      (proposta, indice) => ({
        id: `compra-${proposta.id || indice}`,
        tipo: "compra",
        titulo: "Compra de Dívida paga",
        cliente: proposta.cliente || "Cliente não informado",
        valor: valorValidoCompra(proposta),
        data:
          converterData(proposta.dataPagamento) ||
          converterData(proposta.dataCadastro) ||
          hoje,
      })
    );

    const atividadesClt: Atividade[] = cltMes.map((registro, indice) => ({
      id: `clt-${registro.id || indice}`,
      tipo: "clt",
      titulo: "Contrato CLT pago",
      cliente: registro.nome || "Cliente não informado",
      valor: Number(registro.parcela || 0),
      data: dataClt(registro) || hoje,
    }));

    const atividades = [...atividadesCompra, ...atividadesClt]
      .sort((a, b) => b.data.getTime() - a.data.getTime())
      .slice(0, 5);

    const quantidadeDias = new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      0
    ).getDate();

    const diarioCompra = Array.from(
      { length: quantidadeDias },
      () => 0
    );

    const diarioClt = Array.from({ length: quantidadeDias }, () => 0);

    comprasMes.forEach((proposta) => {
      const data =
        converterData(proposta.dataCadastro) ||
        converterData(proposta.dataPagamento);

      if (data && mesmoMes(data, hoje)) {
        diarioCompra[data.getDate() - 1] += valorValidoCompra(proposta);
      }
    });

    cltMes.forEach((registro) => {
      const data = dataClt(registro);

      if (data && mesmoMes(data, hoje)) {
        diarioClt[data.getDate() - 1] += Number(registro.parcela || 0);
      }
    });

    const acumuladoCompra: number[] = [];
    const acumuladoClt: number[] = [];
    const acumuladoTotal: number[] = [];

    diarioCompra.forEach((valor, indice) => {
      acumuladoCompra[indice] =
        valor + (acumuladoCompra[indice - 1] || 0);

      acumuladoClt[indice] =
        diarioClt[indice] + (acumuladoClt[indice - 1] || 0);

      acumuladoTotal[indice] =
        acumuladoCompra[indice] + acumuladoClt[indice];
    });

    return {
  producaoCompraMes,
  producaoCltMes,
  producaoCompraHoje,
  producaoCltHoje,
  producaoMes,
      producaoHoje,
      vendasMes,
      vendasHoje,
      ticketMedio,
      atividades,
      pontosCompra: pontosDoGrafico(acumuladoCompra),
      pontosClt: pontosDoGrafico(acumuladoClt),
      pontosTotal: pontosDoGrafico(acumuladoTotal),
    };
  }, [propostas, registrosClt, nome, ehConsultora, hoje]);

  const percentualMeta =
    metaDoMes > 0 ? (dados.producaoMes / metaDoMes) * 100 : 0;

  const percentualExibido = Math.round(percentualMeta);
  const percentualBarra = Math.min(Math.max(percentualMeta, 0), 100);
  const faltaParaMeta = Math.max(metaDoMes - dados.producaoMes, 0);

  const mesAtual = hoje.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="dash-final">
      <section className="dash-welcome">
        <div>
          <h2>Olá, {nome.toUpperCase()}! 👋</h2>
          <p>
            {ehConsultora
              ? "Acompanhe somente a sua produção"
              : "Visão geral da operação SOMOS ELEVA"}
          </p>
        </div>

        <button
  type="button"
  onClick={() => setPainelDiaAberto(true)}
>
  ▦&nbsp;&nbsp; Painel do dia
</button>
      </section>

      <section className="dash-banner">
        <img src="/dashboard-banner-final.jpg" alt="" />

        <div className="dash-banner-copy">
          <h3>
            Somos Eleva,
            <br />
            vamos <strong>mais longe!</strong>
          </h3>

          <p>
            Foco, disciplina e atitude constroem
            <br />
            resultados extraordinários.
          </p>
        </div>
      </section>

      <section className="dash-kpis">
        <article>
          <div className="kpi-icon blue">✓</div>

          <div>
            <span>
              {ehConsultora ? "Minhas vendas hoje" : "Vendas pagas hoje"}
            </span>
            <strong>{dados.vendasHoje}</strong>
            <small>Contratos pagos hoje</small>
          </div>
        </article>

        <article>
          <div className="kpi-icon green">R$</div>

          <div>
            <span>Produção hoje</span>
            <strong>{moeda(dados.producaoHoje)}</strong>
            <small>
              {ehConsultora ? "Somente a sua produção" : "Produção da equipe"}
            </small>
          </div>
        </article>

        <article>
          <div className="kpi-icon orange">◆</div>

          <div>
            <span>
              {ehConsultora ? "Minha produção no mês" : "Produção no mês"}
            </span>
            <strong>{moeda(dados.producaoMes)}</strong>
            <small>{dados.vendasMes} contratos pagos</small>
          </div>
        </article>

        <article>
          <div className="kpi-icon purple">▥</div>

          <div className="kpi-wide">
            <span>
              {ehConsultora ? "Minha meta do mês" : "Meta da empresa"}
            </span>

            <strong>{moeda(metaDoMes)}</strong>

            <div className="kpi-progress">
              <i style={{ width: `${percentualBarra}%` }} />
              <b>{percentualExibido}%</b>
            </div>
          </div>
        </article>
      </section>

      <section className="dash-grid">
        <article className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              {ehConsultora ? "Minha produção do mês" : "Resumo do mês"}
            </h3>

            <select value={mesAtual} onChange={() => {}}>
              <option>{mesAtual}</option>
            </select>
          </div>

          <div className="dash-summary">
            <div>
              <span>Compra de Dívida</span>
              <strong>{moeda(dados.producaoCompraMes)}</strong>
              <small>Produção válida</small>
            </div>

            <div>
              <span>CLT</span>
              <strong>{moeda(dados.producaoCltMes)}</strong>
              <small>Total das parcelas</small>
            </div>

            <div>
              <span>Produção total</span>
              <strong>{moeda(dados.producaoMes)}</strong>
              <small>{dados.vendasMes} vendas pagas</small>
            </div>

            <div>
              <span>
                {faltaParaMeta > 0 ? "Falta para a meta" : "Meta superada"}
              </span>
              <strong>
                {faltaParaMeta > 0
                  ? moeda(faltaParaMeta)
                  : `${numero(percentualMeta - 100)}%`}
              </strong>
              <small>
                {faltaParaMeta > 0
                  ? `Meta de ${moeda(metaDoMes)}`
                  : "Parabéns pelo resultado"}
              </small>
            </div>
          </div>

          <div className="dash-chart-title">
            <b>Desempenho no mês</b>
            <span>
              — Compra de Dívida &nbsp;&nbsp; — CLT &nbsp;&nbsp; — Total
            </span>
          </div>

          <svg className="dash-chart" viewBox="0 0 760 220">
            <g className="grid">
              <line x1="35" y1="30" x2="740" y2="30" />
              <line x1="35" y1="75" x2="740" y2="75" />
              <line x1="35" y1="120" x2="740" y2="120" />
              <line x1="35" y1="165" x2="740" y2="165" />
              <line x1="35" y1="205" x2="740" y2="205" />
            </g>

            <polyline className="p-blue" points={dados.pontosCompra} />
            <polyline className="p-green" points={dados.pontosClt} />
            <polyline className="p-orange" points={dados.pontosTotal} />
          </svg>

          <button
            className="dash-report"
            onClick={() =>
              router.push(ehConsultora ? "/loja-premios" : "/ranking")
            }
          >
            {ehConsultora
              ? "Ver meus pontos e premiação →"
              : "Ver relatório completo →"}
          </button>
        </article>

        <article className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              {ehConsultora
                ? "Minhas atividades recentes"
                : "Atividades recentes"}
            </h3>

            <button
              onClick={() =>
                router.push(ehConsultora ? "/loja-premios" : "/propostas")
              }
            >
              {ehConsultora ? "Ver meus pontos" : "Ver todas"}
            </button>
          </div>

          {dados.atividades.length === 0 ? (
            <div
              style={{
                padding: "35px 15px",
                color: "#8a91a1",
                textAlign: "center",
                fontSize: 12,
              }}
            >
              Nenhuma venda paga encontrada neste mês.
            </div>
          ) : (
            <ul className="dash-activity">
              {dados.atividades.map((atividade) => (
                <li key={atividade.id}>
                  <i className={atividade.tipo === "clt" ? "money" : "ok"}>
                    {atividade.tipo === "clt" ? "CLT" : "✓"}
                  </i>

                  <div>
                    <strong>{atividade.titulo}</strong>
                    <span>
                      {atividade.cliente} • {moeda(atividade.valor)}
                    </span>
                  </div>

                  <time>{horarioOuData(atividade.data)}</time>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
            <PainelDoDia
        aberto={painelDiaAberto}
        aoFechar={() => setPainelDiaAberto(false)}
        ehConsultora={ehConsultora}
        dataHoje={hoje.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
        vendasHoje={dados.vendasHoje}
        producaoHoje={dados.producaoHoje}
        producaoCompraHoje={dados.producaoCompraHoje}
        producaoCltHoje={dados.producaoCltHoje}
        producaoMes={dados.producaoMes}
        metaDoMes={metaDoMes}
        percentualMeta={percentualMeta}
        percentualExibido={percentualExibido}
        percentualBarra={percentualBarra}
        faltaParaMeta={faltaParaMeta}
        aoVerPropostas={() => {
          setPainelDiaAberto(false);
          router.push("/propostas");
        }}
        aoVerRanking={() => {
          setPainelDiaAberto(false);
          router.push("/ranking");
        }}
      />
    </div>
  );
}
