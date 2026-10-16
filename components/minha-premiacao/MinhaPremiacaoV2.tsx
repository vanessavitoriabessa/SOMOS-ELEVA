"use client";
// ELEVA | TITULOS MAIUSCULOS + VALOR ENQUADRADO | 16/10/2026 | ARQUIVO COMPLETO V4

import { useEffect, type FormEvent, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ResumoCustoPa } from "@/lib/financeiro/custo-pa";

import {

  BadgeDollarSign,

  CalendarDays,

  Check,

  CheckCircle2,

  ChevronRight,

  Clock3,

  Coins,

  History,

  Landmark,

  RefreshCcw,

  Search,

  ShieldCheck,

  WalletCards,

  X,

} from "lucide-react";

import "./minha-premiacao-v2.css";

export type MovimentoPremiacao = {

  id: string;

  propostaId: string;

  produto: "Compra de Dívida" | "CLT";

  cliente: string;

  descricao: string;

  data: string;

  banco: string;

  tabela: string;
  tabelaBancoId?: string | null;
  tabelaCodigo?: string;
  tabelaPrazo?: number | null;

  valorContrato: number;

  pesoTabela: number;

  producaoValida: number;

  comissaoEmpresa: number;

  valorParcelaClt: number;

  dataDigitacao?: string;

  dataPagamento?: string;

  valorBruto?: number;

  percentualVendedor?: number;

};

export type SaquePremiacao = {

  id: string;

  usuario_id: string;

  usuario_nome: string;

  competencia_id?: string | null;

  pontos_solicitados: number;

  valor_reais?: number | null;

  status: "SOLICITADO" | "PAGO" | "RECUSADO";

  chave_pix?: string | null;

  tipo_chave_pix?: string | null;

  solicitado_em: string;

  processado_em?: string | null;

  motivo_recusa?: string | null;

};

const TODOS_CONSULTORES = "__TODOS__";

function moverCompetencia(valor: string, deslocamento: number) {
  const [ano, mes] = String(valor || "").split("-").map(Number);
  const base = new Date(ano || new Date().getFullYear(), (mes || 1) - 1 + deslocamento, 1, 12);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
}

/** Dados opcionais: preencher somente com valores reais da mesma pessoa/referência.
 * O chamador atual não fornece estes dois valores de CLT; ausência não vira zero.
 */
type ResumoEmpresaClt = {
  referencia: string;
  operador: string;
  liquidoEmpresaPago: number | null;
  comissaoEmpresaBruta: number | null;
};

type Props = {
  financeiroClt?: ResumoEmpresaClt | null;
  /** Metas visuais opcionais. Não alteram faixas, premiação ou regras no banco. */
  metasVisuais?: { clt?: number | null; compra?: number | null };

  nomeUsuario: string;

  nomeExibido: string;

  carteiraNome?: string;

  perfilUsuario: string;

  podeGerenciar: boolean;

  nomesConsultoras?: string[];

  pixPorColaboradora?: Record<string, { chave: string; tipo: string }>;

  consultoraSelecionada: string;

  competencia: string;

  producaoCompra: number;

  producaoClt: number;

  producaoDigitada: number;

  producaoConfirmada: number;

  producaoEmFormacao: number;

  valorPagoBruto: number;

  contratosDigitados: number;

  contratosConfirmados: number;

  contratosEmFormacao: number;

  contratosForaPrazo?: number;

  pontosCompraPrevistos: number;

  pontosCltPrevistos: number;

  pontosTotalPrevisto: number;

  faixaCompra: string;

  faixaClt: string;

  complementoCompraComClt: number;

  comissaoEmpresa: number;
  // Compatibilidade de tipos com chamadores antigos: não é mais fonte de cálculo.
  custoEmpresaCompetencia?: number;
  custoPaFinanceiro?: ResumoCustoPa | null;
  carregandoCustoPa?: boolean;
  erroCustoPa?: string | null;
  quantidadeVendedorasAtivas?: number;

  movimentos?: MovimentoPremiacao[];

  saldoPontos: number;

  saldoDisponivelSaque: number;

  premiacaoJaLiberada: boolean;

  saques?: SaquePremiacao[];

  extrato?: any[];

  processando: boolean;

  onConsultoraChange: (nome: string) => void;

  onCompetenciaChange: (competencia: string) => void;

  onAtualizar: () => void | Promise<void>;

  onLiberarPremiacao: (

    pontosCompra: number,

    pontosClt: number,

  ) => Promise<void>;

  onSolicitarSaque: (

    pontos: number,

    chavePix: string,

  ) => Promise<void>;

  onProcessarSaque: (

    saqueId: string,

    acao: "PAGO" | "RECUSADO",

  ) => Promise<void>;

  onSalvarPix: (

    usuarioId: string,

    tipoPix: string,

    chavePix: string,

  ) => Promise<void>;

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

function porcentagem(valor: number) {

  return Number(valor || 0).toLocaleString("pt-BR", {

    minimumFractionDigits: 0,

    maximumFractionDigits: 2,

  });

}

function dataPt(valor?: string | null) {

  if (!valor) return "—";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleDateString("pt-BR");

}

function nomeTabelaContrato(item: MovimentoPremiacao): string {
  if (item.produto === "CLT") {
    if (!item.tabelaBancoId) return "Sem tabela selecionada";
    return item.tabela?.trim() || "Tabela vinculada indisponível";
  }
  return item.tabela || item.descricao || "Sem tabela selecionada";
}

type ProdutoEdicaoPremiacao = "CLT" | "COMPRA" | "TOTAL";

type AjustePremiacaoLocal = {
  contexto: string;
  clt: number | null;
  compra: number | null;
};

/** Aceita reais/pontos com até duas casas, sem transformar 10.50 em 1050. */
function lerValorPremiacao(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!limpo) return null;
  let normalizado: string;
  if (limpo.includes(",")) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(limpo)) return null;
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else {
    if (/^\d{1,3}(?:\.\d{3})+$/.test(limpo)) normalizado = limpo.replace(/\./g, "");
    else if (/^\d+(?:\.\d{1,2})?$/.test(limpo)) normalizado = limpo;
    else return null;
  }
  const valor = Number(normalizado);
  const centavos = Math.round(valor * 100);
  return Number.isFinite(valor) && valor >= 0 && Number.isSafeInteger(centavos)
    ? centavos / 100 : null;
}

function valorPremiacaoSeguro(valor: number): number {
  return Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 100) / 100 : 0;
}

function somarPremiacoes(clt: number, compra: number): number {
  return (Math.round(clt * 100) + Math.round(compra * 100)) / 100;
}

function textoValorPremiacao(valor: number): string {
  return valorPremiacaoSeguro(valor).toFixed(2).replace(".", ",");
}

function progressoMetaPremiacao(producao: number, meta: number | null): number {
  if (meta === null || !Number.isFinite(meta) || meta <= 0) return 0;
  if (!Number.isFinite(producao) || producao <= 0) return 0;
  // Não arredonda para 100% antes de atingir a meta.
  return Math.min(100, Math.floor((producao / meta) * 100));
}

function metaPositiva(valor: number | null | undefined, padrao: number | null): number | null {
  if (valor === null) return null;
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0 ? valor : padrao;
}

function valorFinanceiroValido(valor: number | null | undefined): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

/** Modal fora dos contêineres do dashboard para não ficar preso à lateral. */
function EdicaoPremiacaoModal({ tipo, nome, clt, compra, automaticoClt, automaticoCompra, onFechar, onSalvar }: {
  tipo: ProdutoEdicaoPremiacao;
  nome: string;
  clt: number;
  compra: number;
  automaticoClt: number;
  automaticoCompra: number;
  onFechar: () => void;
  onSalvar: (clt: number, compra: number) => void;
}) {
  const [textoClt, setTextoClt] = useState(textoValorPremiacao(clt));
  const [textoCompra, setTextoCompra] = useState(textoValorPremiacao(compra));
  const [erro, setErro] = useState("");
  const painel = useRef<HTMLDivElement>(null);
  const valorClt = lerValorPremiacao(textoClt);
  const valorCompra = lerValorPremiacao(textoCompra);
  const total = valorClt === null || valorCompra === null ? null : somarPremiacoes(valorClt, valorCompra);

  useEffect(() => {
    const focoAnterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    painel.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      document.body.style.overflow = overflowAnterior;
      focoAnterior?.focus();
    };
  }, []);

  function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (valorClt === null || valorCompra === null || total === null) {
      setErro("Informe um valor válido, não negativo, com no máximo duas casas decimais.");
      return;
    }
    onSalvar(valorClt, valorCompra);
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="eleva-premio-modal-mask" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div ref={painel} className="eleva-premio-modal" role="dialog" aria-modal="true" aria-labelledby="eleva-premio-edicao-titulo"
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onFechar(); }
          if (e.key !== "Tab") return;
          const focaveis = Array.from(painel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"]') || []);
          const primeiro = focaveis[0];
          const ultimo = focaveis[focaveis.length - 1];
          if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo?.focus(); }
          else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro?.focus(); }
        }}>
        <header><div><span>CONFERÊNCIA DA PREMIAÇÃO</span>
          <h3 id="eleva-premio-edicao-titulo">{tipo === "TOTAL" ? "Conferir as duas premiações" : `Editar premiação ${tipo === "CLT" ? "CLT" : "Compra de Dívida"}`}</h3>
          <p>{nome}</p></div><button type="button" aria-label="Fechar edição" onClick={onFechar}>×</button></header>
        <form onSubmit={salvar}>
          <div className="eleva-premio-edit-inputs">
            {tipo !== "COMPRA" && <label>Premiação acumulada CLT
              <div><input aria-label="Valor da premiação CLT" inputMode="decimal" value={textoClt} onChange={(e) => { setTextoClt(e.target.value); setErro(""); }} /><b>pts</b></div>
              <small>Sistema: {pontos(automaticoClt)} pts</small></label>}
            {tipo !== "CLT" && <label>Premiação acumulada Compra de Dívida
              <div><input aria-label="Valor da premiação Compra de Dívida" inputMode="decimal" value={textoCompra} onChange={(e) => { setTextoCompra(e.target.value); setErro(""); }} /><b>pts</b></div>
              <small>Sistema: {pontos(automaticoCompra)} pts</small></label>}
          </div>
          <div className="eleva-premio-edit-total"><span>Total premiação acumulada</span><strong>{total === null ? "—" : `${pontos(total)} pts`}</strong>
            <small>CLT + Compra de Dívida. O total nunca é editado separado das parcelas.</small></div>
          <p className="eleva-premio-edit-note">Este ajuste é uma conferência local. Não altera Custo PA, comissão da empresa nem libera pontos. Ao trocar a pessoa, a referência ou recarregar a página, o ajuste é descartado.</p>
          {erro && <p className="eleva-premio-edit-error" role="alert">{erro}</p>}
          <footer><button type="button" onClick={onFechar}>Cancelar</button><button type="submit">Salvar ajuste</button></footer>
        </form>
      </div>
    </div>, document.body,
  );
}

function BarraMetaPremiacao({ titulo, producao, meta, observacao, liberada = false }: {
  titulo: string;
  producao: number;
  meta: number | null;
  observacao?: string;
  liberada?: boolean;
}) {
  const percentual = liberada ? 100 : progressoMetaPremiacao(producao, meta);
  const faltante = meta === null ? null : Math.max(meta - producao, 0);
  return <article className="eleva-meta-produto" title={observacao}>
    <div className="eleva-meta-head"><h3>{titulo}</h3><b>{meta === null && !liberada ? "—" : `${percentual}%`}</b></div>
    <div className="eleva-meta-progress" role="progressbar" aria-label={titulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentual} aria-valuetext={meta === null && !liberada ? "Sem meta individual definida" : `${percentual}%`}>
      <i style={{ width: `${percentual}%` }} />
    </div>
    <p><b>{moeda(producao)}</b>{meta !== null ? <> de {moeda(meta)} · {liberada ? "Liberada pela regra de CLT" : faltante && faltante > 0 ? `Faltam ${moeda(faltante)}` : "Meta atingida"}</> : " · Sem meta separada definida"}</p>
    {observacao && <small className="eleva-classic-sr-only">{observacao}</small>}
  </article>;
}


/** Ajuste visual apenas: conserva todos os dígitos e não altera o valor financeiro. */
function ValorAguardandoEnquadrado({ valor }: { valor: number }) {
  const caixaRef = useRef<HTMLElement>(null);
  const textoRef = useRef<HTMLSpanElement>(null);
  const texto = moeda(valor);

  useEffect(() => {
    const caixa = caixaRef.current;
    const conteudo = textoRef.current;
    if (!caixa || !conteudo) return;

    let ativo = true;
    let quadro = 0;
    let ultimaLargura = -1;

    function ajustar() {
      if (!ativo || !caixa || !conteudo) return;
      const disponivel = Math.max(0, caixa.clientWidth - 2);
      if (disponivel <= 0) return;

      // Mede com a fonte normal e reduz somente quando o número não cabe.
      const fonteBase = Number.parseFloat(window.getComputedStyle(caixa).fontSize) || 24;
      conteudo.style.fontSize = `${fonteBase}px`;
      let fonte = fonteBase;
      for (let tentativa = 0; tentativa < 5; tentativa += 1) {
        const larguraTexto = conteudo.getBoundingClientRect().width;
        if (larguraTexto <= disponivel || larguraTexto <= 0) break;
        fonte = Math.max(1, Math.floor(fonte * disponivel / larguraTexto * 100) / 100);
        conteudo.style.fontSize = `${fonte}px`;
      }
    }

    function agendar() {
      if (!ativo) return;
      window.cancelAnimationFrame(quadro);
      quadro = window.requestAnimationFrame(ajustar);
    }

    const observador = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver((entradas) => {
          const largura = entradas[0]?.contentRect.width ?? 0;
          // Alterar a fonte pode mudar a altura; só a largura exige novo ajuste.
          if (Math.abs(largura - ultimaLargura) > 0.25) {
            ultimaLargura = largura;
            agendar();
          }
        })
      : null;
    observador?.observe(caixa);
    window.addEventListener("resize", agendar);
    document.fonts?.addEventListener("loadingdone", agendar);
    void document.fonts?.ready.then(agendar, () => undefined);
    ajustar();

    return () => {
      ativo = false;
      window.cancelAnimationFrame(quadro);
      observador?.disconnect();
      window.removeEventListener("resize", agendar);
      document.fonts?.removeEventListener("loadingdone", agendar);
    };
  }, [texto]);

  return (
    <strong ref={caixaRef} className="eleva-classic-wait-value" title={texto}>
      <span ref={textoRef}>{texto}</span>
    </strong>
  );
}

export default function MinhaPremiacaoV2(props: Props) {
  const [mostrarContratosSecundarios, setMostrarContratosSecundarios] = useState(false);

  const {

    nomeUsuario,

    nomeExibido,

    carteiraNome = nomeExibido,

    podeGerenciar,

    nomesConsultoras = [],

    pixPorColaboradora = {},

    consultoraSelecionada,

    competencia,

    producaoCompra,

    producaoClt,

    producaoDigitada,

    producaoConfirmada,

    producaoEmFormacao,

    valorPagoBruto,

    contratosDigitados,

    contratosConfirmados,

    contratosEmFormacao,

    contratosForaPrazo = 0,

    pontosCompraPrevistos,

    pontosCltPrevistos,

    pontosTotalPrevisto,

    faixaCompra,

    faixaClt,

    complementoCompraComClt,

    comissaoEmpresa,
    custoPaFinanceiro = null,
    carregandoCustoPa = false,
    erroCustoPa = null,

    movimentos = [],

    saldoPontos,

    saldoDisponivelSaque,

    premiacaoJaLiberada,

    saques = [],

    extrato = [],

    processando,

    onConsultoraChange,

    onCompetenciaChange,

    onAtualizar,

    onLiberarPremiacao,

    onSolicitarSaque,

    onProcessarSaque,

    onSalvarPix,

  } = props;
const [abaAdmin, setAbaAdmin] = useState<

    "conferencia" | "liberados" | "saques"

  >("conferencia");

  const [visaoGestor, setVisaoGestor] = useState<"gestao" | "carteira">("gestao");

  const [filtroProduto, setFiltroProduto] = useState<
    "todos" | "compra" | "clt"
  >("todos");

  const [secaoV7, setSecaoV7] = useState<
    "visao" | "colaboradoras" | "conferencia"
  >("visao");
  const [colaboradoraEditando, setColaboradoraEditando] = useState<string | null>(null);
  const [pixEdicaoTipo, setPixEdicaoTipo] = useState("");
  const [pixEdicaoChave, setPixEdicaoChave] = useState("");

  const [edicaoPremiacao, setEdicaoPremiacao] = useState<{ contexto: string; tipo: ProdutoEdicaoPremiacao } | null>(null);
  const [ajustePremiacao, setAjustePremiacao] = useState<AjustePremiacaoLocal>({ contexto: "", clt: null, compra: null });

  const [busca, setBusca] = useState("");

  const [modalConferencia, setModalConferencia] = useState(false);

  const [modalSaque, setModalSaque] = useState(false);

  const [pontosCompraLiberar, setPontosCompraLiberar] = useState(

    String(Number(pontosCompraPrevistos ?? 0) || 0),

  );

  const [pontosCltLiberar, setPontosCltLiberar] = useState(

    String(Number(pontosCltPrevistos ?? 0) || 0),

  );

  const [pontosSaque, setPontosSaque] = useState("");

  const [chavePix, setChavePix] = useState("");

  const [erroModal, setErroModal] = useState("");

  const [pixCopiado, setPixCopiado] = useState("");

  const [modalPix, setModalPix] = useState(false);

  const [tipoPixCadastro, setTipoPixCadastro] = useState("CPF");

  const [chavePixCadastro, setChavePixCadastro] = useState("");

  const compraPrevistaSegura = Number(pontosCompraPrevistos ?? 0) || 0;

  const cltPrevistaSegura = Number(pontosCltPrevistos ?? 0) || 0;

  const consultorasFiltradas = nomesConsultoras.filter((nome) =>

    nome.toLowerCase().includes(busca.trim().toLowerCase()),

  );
  const consultorasComVanessa = useMemo(() => {
    const lista = [...consultorasFiltradas];
    const vanessa = "Vanessa Vitoria Nunes de Bessa";
    if (!lista.some((nome) => String(nome).toLowerCase().includes("vanessa"))) {
      lista.push(vanessa);
    }
    return lista.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [consultorasFiltradas]);

  const saquesPendentes = saques.filter(

    (saque) => saque.status === "SOLICITADO",

  );

  const saquesProcessados = saques.filter(

    (saque) => saque.status !== "SOLICITADO",

  );

  const creditosLiberados = useMemo(

    () => extrato.filter((item) => item.tipo === "CREDITO"),

    [extrato],

  );

  const movimentosFiltrados = useMemo(() => {

    if (filtroProduto === "compra") {

      return movimentos.filter(

        (item) => item.produto === "Compra de Dívida",

      );

    }

    if (filtroProduto === "clt") {

      return movimentos.filter((item) => item.produto === "CLT");

    }

    return movimentos;

  }, [movimentos, filtroProduto]);

  const movimentosCompra = movimentos.filter((m) => m.produto === "Compra de Dívida");

  const movimentosClt = movimentos.filter((m) => m.produto === "CLT");

  const compraLiquidaPaga = movimentosCompra.reduce((t,m)=>t+Number(m.producaoValida||0),0);

  const compraBrutaPaga = movimentosCompra.reduce((t,m)=>t+Number(m.valorBruto ?? m.valorContrato ?? 0),0);

  const contextoPremiacao = `${competencia}|${consultoraSelecionada}|${nomeExibido}`;
  const ajusteAtual = ajustePremiacao.contexto === contextoPremiacao
    ? ajustePremiacao : { contexto: contextoPremiacao, clt: null, compra: null };
  const premiacaoCltAutomatica = valorPremiacaoSeguro(pontosCltPrevistos);
  const premiacaoCompraAutomatica = valorPremiacaoSeguro(pontosCompraPrevistos);
  const premiacaoCltExibida = ajusteAtual.clt ?? premiacaoCltAutomatica;
  const premiacaoCompraExibida = ajusteAtual.compra ?? premiacaoCompraAutomatica;
  const premiacaoAutomaticaTotal = somarPremiacoes(premiacaoCltAutomatica, premiacaoCompraAutomatica);
  const premiacaoExibida = somarPremiacoes(premiacaoCltExibida, premiacaoCompraExibida);
  const temAjusteManual = ajusteAtual.clt !== null || ajusteAtual.compra !== null;
  const premiacaoDivergente = ![pontosCltPrevistos, pontosCompraPrevistos, pontosTotalPrevisto].every((v) => Number.isFinite(v) && v >= 0)
    || Math.abs(premiacaoAutomaticaTotal - valorPremiacaoSeguro(pontosTotalPrevisto)) > 0.009;
  const todosSelecionados = consultoraSelecionada === TODOS_CONSULTORES;
  const podeEditarPremiacao = podeGerenciar && !processando && !premiacaoJaLiberada && !todosSelecionados;

  useEffect(() => {
    setEdicaoPremiacao(null);
    setAjustePremiacao({ contexto: contextoPremiacao, clt: null, compra: null });
    setModalConferencia(false);
  }, [contextoPremiacao]);

  function abrirEdicaoPremiacao(tipo: ProdutoEdicaoPremiacao = "TOTAL") {
    if (!podeEditarPremiacao) return;
    setEdicaoPremiacao({ contexto: contextoPremiacao, tipo });
  }

  function salvarEdicaoPremiacao(cltConferido: number, compraConferida: number) {
    if (!podeEditarPremiacao || edicaoPremiacao?.contexto !== contextoPremiacao) return;
    setAjustePremiacao({
      contexto: contextoPremiacao,
      clt: cltConferido === premiacaoCltAutomatica ? null : cltConferido,
      compra: compraConferida === premiacaoCompraAutomatica ? null : compraConferida,
    });
    setEdicaoPremiacao(null);
  }

  function abrirEdicaoColaboradora(nome: string) {
    const pix = pixDaColaboradora(nome);
    setColaboradoraEditando(nome);
    setPixEdicaoTipo(String(pix.tipo || "CPF"));
    setPixEdicaoChave(String(pix.chave || ""));
  }

  async function salvarPixColaboradora() {
    if (!colaboradoraEditando) return;
    await onSalvarPix(colaboradoraEditando, pixEdicaoChave, pixEdicaoTipo);
    setColaboradoraEditando(null);
  }

  const nomeMetaNormalizado = String(nomeExibido || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const ehSthefane = nomeMetaNormalizado.includes("sthefane");
  const ehVinicius = nomeMetaNormalizado.includes("vinicius");
  const ehVanessa = nomeMetaNormalizado.includes("vanessa");
  const ehRaissa = nomeMetaNormalizado.includes("raissa");

  const cltParcelasPagas = movimentosClt.reduce((total, movimento) => total + Number(movimento.valorParcelaClt ?? 0), 0);
  const primeiroNomeMeta = todosSelecionados ? "Todos" : (nomeExibido.trim().split(/\s+/)[0] || "Operador(a)");
  // Para consultoras, a meta visual CLT acompanha o fallback de 20 mil já
  // existente em PremiacaoManagerV3. Compra mantém os 30 mil do arquivo recebido.
  // Não usa valor liberado como parcelas, inclusive na visão da coordenação.
  const metaCltPadrao = todosSelecionados || ehSthefane || ehVinicius ? null : ehVanessa ? 1500000 : ehRaissa ? 500000 : 20000;
  const metaCompraPadrao = todosSelecionados ? null : ehSthefane ? 500000 : ehVinicius ? 1000000 : ehVanessa ? 260000 : ehRaissa ? 500000 : 30000;
  const metaCltVisual = metaPositiva(props.metasVisuais?.clt, metaCltPadrao);
  const metaCompraVisual = metaPositiva(props.metasVisuais?.compra, metaCompraPadrao);
  const producaoMetaClt = ehVanessa ? Number(producaoClt || 0) : cltParcelasPagas;
  const compraLiberadaMetaClt = ehVanessa && Number(producaoClt || 0) >= 1500000;
  const observacaoMetaClt = todosSelecionados ? "Metas individuais: selecione uma colaboradora."
    : ehVanessa ? "Coordenação: meta sobre o valor liberado pago, não sobre parcelas."
    : ehRaissa ? "Parcela CLT da meta conjunta de R$ 500.000,00. Não é uma segunda meta."
    : ehSthefane || ehVinicius ? "A regra deste perfil não define uma meta CLT separada."
    : "Progresso sobre as parcelas CLT pagas da operadora.";
  const observacaoMetaCompra = todosSelecionados ? "Metas individuais: selecione uma colaboradora."
    : ehVanessa && compraLiberadaMetaClt ? "Compra liberada pela meta CLT: sem meta mínima de Compra, conforme regra existente."
    : ehRaissa ? `Meta conjunta (CLT + Compra): ${moeda(compraLiquidaPaga + cltParcelasPagas)} de ${moeda(500000)}.`
    : ehSthefane || ehVinicius ? "Meta de Compra da empresa, conforme regra existente deste perfil."
    : "Progresso sobre a produção líquida paga de Compra de Dívida.";

  // Consome apenas o resumo financeiro da MESMA referência.
  // Não soma premiação manual, não reaproveita outro mês e não recalcula o rateio.
  const custoConfirmado = !erroCustoPa && custoPaFinanceiro?.referencia === competencia
    ? custoPaFinanceiro : null;
  const custoPa = custoConfirmado?.custoPa ?? null;
  const moedaFinanceira = (valor: number | null | undefined) =>
    typeof valor === "number" && Number.isFinite(valor) ? moeda(valor) : "—";
  const referenciaCustoLabel = /^\d{4}-\d{2}$/.test(competencia)
    ? `${competencia.slice(5, 7)}/${competencia.slice(0, 4)}` : "não selecionada";

  // Os movimentos vêm da apuração existente de contratos pagos. Os filtros de
  // referência/status seguem no Manager e NÃO são modificados por esta tela.
  const comissaoEmpresaBruta = movimentosCompra.reduce((t,m)=>t+Number(m.comissaoEmpresa||0),0);
  const comissaoEmpresaLiquida = custoPa === null ? null : Math.max(comissaoEmpresaBruta - custoPa, 0);
  const financeiroCltConfirmado = props.financeiroClt?.referencia === competencia
    && chaveNomePix(props.financeiroClt.operador) === chaveNomePix(nomeExibido)
      ? props.financeiroClt : null;
  // Nunca interpreta o comissaoEmpresa: 0 do CLT legado como comissão conhecida.
  // Sem contratos CLT na apuração a soma é zero; com contratos e sem dados, é —.
  const liquidoEmpresaClt = financeiroCltConfirmado
    ? valorFinanceiroValido(financeiroCltConfirmado.liquidoEmpresaPago)
    : movimentosClt.length === 0 ? 0 : null;
  const comissaoEmpresaClt = financeiroCltConfirmado
    ? valorFinanceiroValido(financeiroCltConfirmado.comissaoEmpresaBruta)
    : movimentosClt.length === 0 ? 0 : null;
  // Mantém o piso zero já existente neste card de Minha Premiação.
  // O relatório de Lucro por Operador (que pode mostrar prejuízo) não é alterado.
  const comissaoLiquidaCard = custoPa === null || comissaoEmpresaClt === null
    ? null : Math.max(comissaoEmpresaBruta + comissaoEmpresaClt - custoPa, 0);
  const brutoSelecionado = Math.max(movimentos.reduce((t,m)=>t+Number(m.valorBruto ?? m.valorContrato ?? 0),0),0);

  const movimentosComFinanceiro = movimentosFiltrados.map((item) => {
    const valorBrutoItem = Number(item.valorBruto ?? item.valorContrato ?? 0);
    const percentualComissao = valorBrutoItem > 0 ? (Number(item.comissaoEmpresa||0)/valorBrutoItem)*100 : 0;
    const custoRateado = custoPa === null ? null : brutoSelecionado > 0 ? custoPa*(valorBrutoItem/brutoSelecionado) : 0;
    const lucroBruto = Number(item.comissaoEmpresa||0);
    return {
      ...item,
      percentualComissaoEmpresa: percentualComissao,
      custoPaRateado: custoRateado,
      lucroBrutoEmpresa: lucroBruto,
      lucroLiquidoEmpresa: custoRateado === null ? null : lucroBruto-custoRateado,
    };
  });

  function chaveNomePix(nome: string) {

    return String(nome || "")

      .normalize("NFD")

      .replace(/[\u0300-\u036f]/g, "")

      .trim()

      .toLowerCase();

  }

  function pixDaColaboradora(nome: string) {

    return pixPorColaboradora[chaveNomePix(nome)] || { chave: "", tipo: "" };

  }

  async function copiarPix(nome: string) {

    const pix = pixDaColaboradora(nome).chave;

    if (!pix) return;

    try {

      await navigator.clipboard.writeText(pix);

      setPixCopiado(nome);

      window.setTimeout(() => setPixCopiado(""), 1600);

    } catch {

      setPixCopiado("");

    }

  }

  function abrirConferencia() {
    setPontosCompraLiberar(textoValorPremiacao(premiacaoCompraExibida));
    setPontosCltLiberar(textoValorPremiacao(premiacaoCltExibida));
    setErroModal("");
    setModalConferencia(true);
  }

  async function confirmarLiberacao(evento: FormEvent<HTMLFormElement>) {

    evento.preventDefault();

    const compra = lerValorPremiacao(pontosCompraLiberar);
    const clt = lerValorPremiacao(pontosCltLiberar);
    if (compra === null || clt === null) {
      setErroModal("Informe valores válidos e não negativos para CLT e Compra, com até duas casas decimais.");
      return;
    }

    try {

      await onLiberarPremiacao(compra, clt);

      setModalConferencia(false);

    } catch (erro) {

      setErroModal(

        erro instanceof Error ? erro.message : "Não foi possível liberar.",

      );

    }

  }

  async function enviarSaque(evento: FormEvent<HTMLFormElement>) {

    evento.preventDefault();

    setErroModal("");

    const quantidade = Number(

      String(pontosSaque).replace(/\./g, "").replace(",", "."),

    );

    if (!Number.isFinite(quantidade) || quantidade <= 0) {

      setErroModal("Informe quantos pontos deseja sacar.");

      return;

    }

    if (quantidade > saldoDisponivelSaque) {

      setErroModal("A quantidade é maior que o saldo disponível.");

      return;

    }

    if (chavePix.trim().length < 3) {

      setErroModal("Informe uma chave PIX válida.");

      return;

    }

    try {

      await onSolicitarSaque(quantidade, chavePix.trim());

      setModalSaque(false);

      setPontosSaque("");

      setChavePix("");

    } catch (erro) {

      setErroModal(

        erro instanceof Error

          ? erro.message

          : "Não foi possível solicitar o saque.",

      );

    }

  }

  if (podeGerenciar && visaoGestor === "gestao") {

    return (

      <div className="premio-v4-page eleva-premiacao-cards-v2">

        <nav className="premio-v8-nav">
          <button type="button" className={`premio-v8-nav-card blue ${secaoV7 === "visao" && abaAdmin === "conferencia" ? "active" : ""}`} onClick={() => { setAbaAdmin("conferencia"); setSecaoV7("visao"); }}>
            <i className="premio-v8-icon">⌂</i><span><strong>Visão Geral</strong><small>Resumo completo</small></span>
          </button>
          <button type="button" className="premio-v8-nav-card green" onClick={() => setVisaoGestor("carteira")}>
            <i className="premio-v8-icon">▥</i><span><strong>Minha Produção</strong><small>Acompanhe seus resultados</small></span>
          </button>
          <button type="button" className={`premio-v8-nav-card gold ${abaAdmin === "liberados" ? "active-soft" : ""}`} onClick={() => setAbaAdmin("liberados")}>
            <i className="premio-v8-icon">🏆</i><span><strong>Pontos Liberados</strong><small>Consulte seus pontos</small></span>
          </button>
          <button type="button" className={`premio-v8-nav-card purple ${abaAdmin === "saques" ? "active-soft" : ""}`} onClick={() => setAbaAdmin("saques")}>
            <i className="premio-v8-icon">▣</i><span><strong>Solicitar Saque</strong><small>Resgate seus pontos</small></span>
          </button>
          <button type="button" className={`premio-v8-nav-card rose ${secaoV7 === "colaboradoras" ? "active-soft" : ""}`} onClick={() => { setAbaAdmin("conferencia"); setSecaoV7("colaboradoras"); }}>
            <i className="premio-v8-icon">♟</i><span><strong>Colaboradoras</strong><small>Veja o time completo</small></span>
          </button>
          <button type="button" className={`premio-v8-nav-card cyan ${secaoV7 === "conferencia" ? "active-soft" : ""}`} onClick={() => { setAbaAdmin("conferencia"); setSecaoV7("conferencia"); }}>
            <i className="premio-v8-icon">▦</i><span><strong>Conferência do Mês</strong><small>Analise e publique</small></span>
          </button>
        </nav>

        <section className="eleva-classic-person" aria-label="Colaboradora e referência">
          <div className="eleva-classic-identity">
            <div className="eleva-classic-avatar" aria-hidden="true">{nomeExibido.charAt(0).toUpperCase()}</div>
            <div className="eleva-classic-person-copy">
              <h2>{nomeExibido}</h2>
              <p>{todosSelecionados ? "Visão consolidada dos consultores" : props.perfilUsuario && (ehVanessa || ehRaissa || ehSthefane || ehVinicius) ? "Conferência da colaboradora" : "Vendedora"}
                {!todosSelecionados && <> · {pixDaColaboradora(nomeExibido).tipo || "CPF"}: {pixDaColaboradora(nomeExibido).chave || "—"}</>}
              </p>
            </div>
            {!todosSelecionados && <span className="eleva-classic-pix">{pixDaColaboradora(nomeExibido).chave ? "PIX cadastrado" : "PIX não cadastrado"}</span>}
          </div>
          <div className="eleva-classic-person-controls">
            <label><span>Consultor(a)</span><select value={consultoraSelecionada} onChange={(e) => onConsultoraChange(e.target.value)}>
              {podeGerenciar && <option value={TODOS_CONSULTORES}>Todos</option>}
              {consultorasComVanessa.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
            </select></label>
            <label><span>Referência</span><div className="eleva-classic-month">
              <button aria-label="Mês anterior" title="Mês anterior" type="button" onClick={() => onCompetenciaChange(moverCompetencia(competencia,-1))}>‹</button>
              <input aria-label="Referência da premiação" type="month" value={competencia} onChange={(e) => onCompetenciaChange(e.target.value)} />
              <button aria-label="Próximo mês" title="Próximo mês" type="button" onClick={() => onCompetenciaChange(moverCompetencia(competencia,1))}>›</button>
            </div></label>
            <button type="button" className="eleva-classic-update" onClick={() => void onAtualizar()} disabled={processando}>↻ {processando ? "Atualizando..." : "Atualizar e recalcular"}</button>
          </div>
        </section>

        {abaAdmin === "conferencia" && secaoV7 === "colaboradoras" && (
          <section className="premio-v7-collaborators-panel">
            <div className="premio-v7-collab-head">
              <div><span>COLABORADORAS</span><h2>Equipe e conferência</h2><p>Selecione uma colaboradora para abrir a conferência individual.</p></div>
              <div className="premio-v7-collab-count">{consultorasComVanessa.length}<small>colaboradoras</small></div>
            </div>
            <div className="premio-v7-collab-grid">
              {consultorasComVanessa.map((nome) => {
                const pix = pixDaColaboradora(nome);
                return (
                  <button type="button" key={nome} className={nome === consultoraSelecionada ? "active" : ""} onClick={() => abrirEdicaoColaboradora(nome)}>
                    <i>{nome.charAt(0).toUpperCase()}</i>
                    <span><strong>{nome}</strong><small>{pix.chave ? "PIX cadastrado" : "PIX não cadastrado"}</small></span>
                    <b title="Editar colaboradora">✎</b>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {abaAdmin === "conferencia" && secaoV7 !== "colaboradoras" && (

          <>

            <div className="eleva-classic-scope">
              <section className="eleva-classic-summary" aria-label="Indicadores de CLT, Compra de Dívida e empresa">
                <article className="eleva-classic-kpi tone-blue" data-card="clt-parcelas">
                  <span>CLT - PARCELAS OPERADOR PAGAS</span>
                  <strong>{moeda(cltParcelasPagas)}</strong>
                  <small>{faixaClt || "Abaixo da primeira faixa"}</small>
                </article>
                <article className="eleva-classic-kpi tone-green" data-card="clt-liquido">
                  <span>CLT - LIQUIDO EMPRESA PAGO</span>
                  <strong>{moedaFinanceira(liquidoEmpresaClt)}</strong>
                  <small>{liquidoEmpresaClt === null ? "Valor CLT não informado" : "Valor informado pela apuração CLT"}</small>
                </article>
                <article className="eleva-classic-kpi tone-gold" data-card="clt-comissao">
                  <span>CLT - COMISSÃO EMPRESA BRUTO</span>
                  <strong>{moedaFinanceira(comissaoEmpresaClt)}</strong>
                  <small>{comissaoEmpresaClt === null ? "Comissão CLT não informada" : "Comissão da empresa, antes do custo"}</small>
                </article>
                <article className="eleva-classic-kpi tone-green" data-card="compra-liquido">
                  <span>COMPRA DE DIVIDA - LIQUIDO OPERADOR PAGO</span>
                  <strong>{moeda(compraLiquidaPaga)}</strong>
                  <small>{faixaCompra || "Abaixo da primeira faixa"}</small>
                </article>
                <article className="eleva-classic-kpi tone-lilac" data-card="compra-bruto">
                  <span>COMPRA DE DIVIDA - BRUTO EMPRESA PAGO</span>
                  <strong>{moeda(compraBrutaPaga)}</strong>
                  <small>{movimentosCompra.length} contrato(s) na apuração</small>
                </article>
                <article className="eleva-classic-kpi tone-gold" data-card="compra-comissao">
                  <span>COMPRA DE DIVIDA - COMISSÃO EMPRESA BRUTO</span>
                  <strong>{moeda(comissaoEmpresaBruta)}</strong>
                  <small>Antes do Custo por Operador</small>
                </article>
                <article className="eleva-classic-kpi tone-blue" data-card="custo" aria-live="polite" aria-busy={carregandoCustoPa}>
                  <span>CUSTO POR OPERADOR</span>
                  <strong>{moedaFinanceira(custoPa)}</strong>
                  <small title={erroCustoPa || (custoConfirmado ? `${moeda(custoConfirmado.custoTotal)} ÷ ${custoConfirmado.quantidadeOperadores} operador(es)` : undefined)}>
                    {carregandoCustoPa ? "Atualizando Custo PA..." : custoConfirmado ? `Financeiro · Referência ${referenciaCustoLabel}` : "Custo indisponível nesta referência"}
                  </small>
                </article>
                <article className="eleva-classic-kpi tone-pink" data-card="comissao-liquida">
                  <span>COMISSÃO LIQUIDA EMPRESA</span>
                  <strong>{moedaFinanceira(comissaoLiquidaCard)}</strong>
                  <small title={comissaoEmpresaClt === null ? `Total ainda indisponível. Parcial de Compra pela regra atual: ${moedaFinanceira(comissaoEmpresaLiquida)}` : undefined}>
                    {custoPa === null ? "Aguardando Custo PA da referência" : comissaoEmpresaClt === null ? "Aguardando comissão CLT" : "Comissão CLT + Compra − Custo PA"}
                  </small>
                </article>
              </section>

              <section className="eleva-classic-bottom" aria-label="Premiações acumuladas e metas do mês">
                <article className="eleva-classic-panel eleva-classic-wait">
                  <span>⌛ AGUARDANDO PAGAR</span>
                  <ValorAguardandoEnquadrado valor={producaoEmFormacao} />
                  <small>{contratosEmFormacao} proposta(s)</small>
                </article>
                <article className="eleva-classic-panel eleva-classic-award area-clt" data-award="clt">
                  <header><h3>🏆 Premiação acumulada CLT</h3><button type="button" disabled={!podeEditarPremiacao} onClick={() => abrirEdicaoPremiacao("CLT")} aria-label="Editar premiação CLT"><span aria-hidden="true">✏️</span> Editar</button></header>
                  <strong>{pontos(premiacaoCltExibida)} <em>pts</em></strong>
                  <small>{ajusteAtual.clt === null ? "Calculado automaticamente" : "Ajustado manualmente"} · {moeda(premiacaoCltExibida)}</small>
                  {complementoCompraComClt > 0 && <small>Inclui complemento de {moeda(complementoCompraComClt)}.</small>}
                  {ehVinicius && <small>Bônus de meta da empresa, conforme a regra de Qualidade.</small>}
                </article>
                <article className="eleva-classic-panel eleva-classic-award area-compra" data-award="compra">
                  <header><h3>🏆 Premiação acumulada Compra de Dívida</h3><button type="button" disabled={!podeEditarPremiacao} onClick={() => abrirEdicaoPremiacao("COMPRA")} aria-label="Editar premiação Compra de Dívida"><span aria-hidden="true">✏️</span> Editar</button></header>
                  <strong>{pontos(premiacaoCompraExibida)} <em>pts</em></strong>
                  <small>{ajusteAtual.compra === null ? "Calculado automaticamente" : "Ajustado manualmente"} · {moeda(premiacaoCompraExibida)}</small>
                </article>
                <article className="eleva-classic-panel eleva-classic-award area-total" data-award="total">
                  <header><h3>🏆 Total premiação acumulada</h3><button type="button" disabled={!podeEditarPremiacao} onClick={() => abrirEdicaoPremiacao("TOTAL")} aria-label="Editar composição do total da premiação"><span aria-hidden="true">✏️</span> Editar</button></header>
                  <strong>{pontos(premiacaoExibida)} <em>pts</em></strong>
                  <small>CLT + Compra de Dívida · {moeda(premiacaoExibida)}</small>
                </article>
                <section className="eleva-classic-panel eleva-classic-goals" aria-label="Metas por produto">
                  <BarraMetaPremiacao titulo={`🎯 Meta do mês CLT — ${primeiroNomeMeta}`} producao={producaoMetaClt} meta={metaCltVisual} observacao={observacaoMetaClt} />
                  <BarraMetaPremiacao titulo={`🎯 Meta do mês Compra de Dívida — ${primeiroNomeMeta}`} producao={compraLiquidaPaga} meta={metaCompraVisual} liberada={compraLiberadaMetaClt} observacao={observacaoMetaCompra} />
                </section>
                <article className="eleva-classic-panel eleva-classic-motivation"><b aria-hidden="true">🏆</b><div><strong>Você está no<br />caminho certo!</strong><small>Consistência gera conquistas.</small></div></article>
              </section>
              {premiacaoDivergente && <p className="eleva-classic-notice" role="alert">A soma de CLT + Compra ({pontos(premiacaoAutomaticaTotal)} pts) difere do total recebido ({pontos(pontosTotalPrevisto)} pts). Confira a origem antes de liberar.</p>}
              {temAjusteManual && <p className="eleva-classic-notice">Ajuste local da pessoa e referência selecionadas. Os valores editados serão levados à conferência; salvar não libera pontos.</p>}
              {todosSelecionados && <p className="eleva-classic-notice">Selecione uma colaboradora para editar a premiação e visualizar as metas individuais.</p>}
            </div>

            <section className="premio-v4-layout">

              <aside className="premio-v4-pessoas">

                <div className="premio-v4-side-head">

                  <span>COLABORADORAS</span>

                  <h3>Conferência do mês</h3>

                </div>

                <div className="premio-v4-search">

                  <Search size={16} />

                  <input

                    placeholder="Pesquisar colaboradora..."

                    value={busca}

                    onChange={(e) => setBusca(e.target.value)}

                  />

                </div>

                <div className="premio-v4-pessoas-list">

                  {consultorasComVanessa.map((nome) => (

                    <button

                      type="button"

                      key={nome}

                      className={

                        nome === consultoraSelecionada ? "active" : ""

                      }

                      onClick={() => onConsultoraChange(nome)}

                    >

                      <span>{nome.charAt(0).toUpperCase()}</span>

                      <div>

                        <strong>{nome}</strong>

                        <small className={pixDaColaboradora(nome).chave ? "premio-v4-pix-ok" : "premio-v4-pix-missing"}>

                          {pixDaColaboradora(nome).chave ? "PIX cadastrado" : "Sem PIX cadastrado"}

                        </small>

                      </div>

                      <ChevronRight size={16} />

                    </button>

                  ))}

                </div>

              </aside>

              <main className="premio-v4-main">

                <section className="premio-v4-resumo">

                  <div className="premio-v4-resumo-head">

                    <div>

                      <span>PRÉVIA AUTOMÁTICA</span>

                      <h3>{nomeExibido}</h3>

                      <p>

                        {contratosConfirmados} contrato(s) confirmado(s) na

                        referência.

                      </p>

                    </div>

                    <div className="premio-v4-pix-box">

                      <span>PIX DA COLABORADORA</span>

                      {pixDaColaboradora(nomeExibido).chave ? (

                        <>

                          <small>{pixDaColaboradora(nomeExibido).tipo || "PIX"}</small>

                          <div>

                            <strong>{pixDaColaboradora(nomeExibido).chave}</strong>

                            <button type="button" onClick={() => void copiarPix(nomeExibido)}>

                              {pixCopiado === nomeExibido ? "Copiado ✓" : "Copiar PIX"}

                            </button>

                            <button type="button" onClick={() => {

                              const atual = pixDaColaboradora(nomeExibido);

                              setTipoPixCadastro(atual.tipo || "CPF");

                              setChavePixCadastro(atual.chave || "");

                              setModalPix(true);

                            }}>Editar</button>

                          </div>

                        </>

                      ) : (

                        <button type="button" className="premio-v4-cadastrar-pix" onClick={() => {

                          setTipoPixCadastro("CPF");

                          setChavePixCadastro("");

                          setModalPix(true);

                        }}>+ Cadastrar PIX</button>

                      )}

                    </div>

                    <span

                      className={

                        premiacaoJaLiberada

                          ? "premio-v4-status released"

                          : "premio-v4-status"

                      }

                    >

                      {premiacaoJaLiberada ? (

                        <>

                          <Check size={14} /> Liberada

                        </>

                      ) : (

                        <>

                          <Clock3 size={14} /> Aguardando conferência

                        </>

                      )}

                    </span>

                  </div>

                  <div className="premio-v4-resumo-grid">

                    <article>

                      <span>Digitadas</span>

                      <strong>{moeda(producaoDigitada)}</strong>

                      <small>{contratosDigitados} proposta(s) da referência</small>

                    </article>

                    <article>

                      <span>Contratos pagos</span>

                      <strong>{moeda(valorPagoBruto)}</strong>

                      <small>

                        {movimentos.filter((m) => m.produto === "Compra de Dívida").length} contrato(s) pago(s) até dia 19

                        {contratosForaPrazo > 0

                          ? ` • ${contratosForaPrazo} pago(s) fora do prazo`

                          : ""}

                      </small>

                    </article>

                    <article>

                      <span>Aguardando pagar</span>

                      <strong>{moeda(producaoEmFormacao)}</strong>

                      <small>{contratosEmFormacao} proposta(s) ainda não paga(s)</small>

                    </article>

                    <article>

                      <span>Premiação</span>

                      <strong>{pontos(premiacaoExibida)} pts</strong>

                      <small>{premiacaoJaLiberada ? "Premiação paga / liberada" : "Aguardando sua conferência"}</small>

                    </article>

                  </div>

                  {complementoCompraComClt > 0 && (

                    <div className="premio-v4-rule">

                      <BadgeDollarSign size={18} />

                      <div>

                        <strong>Regra de 1% — CLT + Compra</strong>

                        <span>

                          A meta de CLT ou Compra ativou{" "}

                          <b>{moeda(complementoCompraComClt)}</b> de

                          complemento de 1%.

                        </span>

                      </div>

                    </div>

                  )}

                  <div className="premio-v4-total">

                    <div>

                      <span>Pontuação prevista</span>

                      <strong>{pontos(premiacaoExibida)} pts</strong>

                      <small>

                        Equivalente a {moeda(premiacaoExibida)}

                      </small>

                    </div>

                    <button

                      type="button"

                      onClick={abrirConferencia}

                      disabled={premiacaoJaLiberada || processando}

                    >

                      {premiacaoJaLiberada

                        ? "Premiação já liberada"

                        : "Conferir e liberar"}

                    </button>

                  </div>

                </section>

                <section className="premio-v4-detail">

                  <div className="premio-v4-section-head">

                    <div>

                      <span>MEUS CONTRATOS</span>

                      <h3>Meus contratos</h3>

                      <p>

                        Os contratos não ganham pontos individualmente. Cada

                        contrato forma a produção válida; a faixa é aplicada

                        sobre o total.

                      </p>

                    </div>

                    <div

                      style={{

                        display: "flex",

                        alignItems: "center",

                        gap: 10,

                        flexWrap: "wrap",

                        justifyContent: "flex-end",

                      }}

                    >

                      <div

                        style={{

                          display: "flex",

                          alignItems: "center",

                          gap: 5,

                          padding: 4,

                          border: "1px solid #dce5f2",

                          borderRadius: 10,

                          background: "#f7f9fc",

                        }}

                      >

                        <button

                          type="button"

                          onClick={() => setFiltroProduto("todos")}

                          style={{

                            minHeight: 32,

                            padding: "0 11px",

                            border: 0,

                            borderRadius: 7,

                            background:

                              filtroProduto === "todos" ? "#1f61ee" : "transparent",

                            color:

                              filtroProduto === "todos" ? "#ffffff" : "#6c7c94",

                            cursor: "pointer",

                            fontSize: 11,

                            fontWeight: 800,

                          }}

                        >

                          Todos

                        </button>

                        <button

                          type="button"

                          onClick={() => setFiltroProduto("compra")}

                          style={{

                            minHeight: 32,

                            padding: "0 11px",

                            border: 0,

                            borderRadius: 7,

                            background:

                              filtroProduto === "compra" ? "#1f61ee" : "transparent",

                            color:

                              filtroProduto === "compra" ? "#ffffff" : "#6c7c94",

                            cursor: "pointer",

                            fontSize: 11,

                            fontWeight: 800,

                          }}

                        >

                          Compra de Dívida

                        </button>

                        <button

                          type="button"

                          onClick={() => setFiltroProduto("clt")}

                          style={{

                            minHeight: 32,

                            padding: "0 11px",

                            border: 0,

                            borderRadius: 7,

                            background:

                              filtroProduto === "clt" ? "#1f61ee" : "transparent",

                            color:

                              filtroProduto === "clt" ? "#ffffff" : "#6c7c94",

                            cursor: "pointer",

                            fontSize: 11,

                            fontWeight: 800,

                          }}

                        >

                          CLT

                        </button>

                      </div>

                      <b>{movimentosFiltrados.length}</b>

                    </div>

                  </div>

                  <div className="premio-v4-rule">

                    <BadgeDollarSign size={18} />

                    <div>

                      <strong>Produção válida para a faixa: {moeda(producaoCompra)}</strong>

                      <span>

                        Faixa automática: {pontosCompraPrevistos > 0 ? `${pontos(pontosCompraPrevistos)} pts` : "ainda não atingida"}.

                        Os pontos são calculados sobre o total, não por contrato.

                      </span>

                    </div>

                  </div>

                  <div className="premio-v4-table-wrap">

                    <table className="premio-v4-table">

                      <thead><tr>
                          <th>Data digitação</th><th>Data pagamento cliente</th><th>Cliente</th><th>Produto</th><th>Banco</th>
                          <th>Valor parcela / líquido</th><th>% vendedor(a)</th><th>Valor bruto</th><th>Tabela</th>
                          <th>% comissão empresa</th><th>Valor comissão empresa</th><th>Lucro bruto empresa</th>
                          <th>Custo PA</th><th>Lucro líquido empresa</th>
                        </tr></thead>
                        <tbody>
                          {movimentosComFinanceiro.length===0 ? (
                            <tr><td colSpan={14}><div className="premio-v4-empty">Nenhum contrato encontrado para o filtro selecionado.</div></td></tr>
                          ) : movimentosComFinanceiro.map((item)=>(
                            <tr key={item.id}>
                              <td>{dataPt(item.dataDigitacao || item.data)}</td>
                              <td>{dataPt(item.dataPagamento || item.data)}</td>
                              <td><strong>{item.cliente}</strong></td>
                              <td><span className="premio-v4-product">{item.produto}</span></td>
                              <td>{item.banco || "Não informado"}</td>
                              <td><b>{moeda(item.produto==="CLT" ? item.valorParcelaClt : item.producaoValida)}</b></td>
                              <td>{item.produto==="CLT" ? "100%" : `${porcentagem(item.percentualVendedor ?? item.pesoTabela)}%`}</td>
                              <td>{moeda(item.valorBruto ?? item.valorContrato ?? 0)}</td>
                              <td>
                                <span style={item.produto === "CLT" && !item.tabelaBancoId ? { color: "#9a6400", fontWeight: 700 } : undefined}>
                                  {nomeTabelaContrato(item)}
                                </span>
                                {item.produto === "CLT" && item.tabelaBancoId && (
                                  <small style={{ display: "block", marginTop: 3, color: "#617391" }}>
                                    {[item.tabelaCodigo, item.tabelaPrazo ? `${item.tabelaPrazo} meses` : ""].filter(Boolean).join(" • ")}
                                  </small>
                                )}
                              </td>
                              <td className="internal-col">{item.produto==="Compra de Dívida" ? `${porcentagem(item.percentualComissaoEmpresa || 0)}%` : "—"}</td>
                              <td className="internal-col">{item.produto==="Compra de Dívida" ? moeda(item.comissaoEmpresa) : "—"}</td>
                              <td className="internal-col">{moeda(item.lucroBrutoEmpresa || 0)}</td>
                              <td>{moedaFinanceira(item.custoPaRateado)}</td>
                              <td><strong>{moedaFinanceira(item.lucroLiquidoEmpresa)}</strong></td>
                            </tr>
                          ))}
                        </tbody>

                    </table>

                  </div>

                </section>

              </main>

            </section>

          </>

        )}

        {abaAdmin === "liberados" && (

          <section className="premio-v4-panel">

            <div className="premio-v4-section-head premio-v8-liberados-head">
              <div>
                <span>HISTÓRICO INTERNO</span>
                <h3>Pontos liberados</h3>
                <p>Créditos já confirmados pela gestão.</p>
              </div>
              <div className="premio-v8-liberados-actions">
                <button
                  type="button"
                  className={mostrarContratosSecundarios ? "active" : ""}
                  onClick={() => setMostrarContratosSecundarios((atual) => !atual)}
                >
                  <span className="premio-v8-contract-icon">▣</span>
                  <span>Meus Contratos</span>
                </button>
              </div>
            </div>

            {mostrarContratosSecundarios && (
              <div className="premio-v8-secondary-contracts">
                <div className="premio-v8-secondary-contracts-head">
                  <div>
                    <strong>Contratos de {nomeExibido}</strong>
                    <small>Contratos usados na formação da produção da referência.</small>
                  </div>
                  <span>{movimentosFiltrados.length} contrato(s)</span>
                </div>

                <div className="premio-v8-contract-filter">
                  <button type="button" className={filtroProduto === "todos" ? "active" : ""} onClick={() => setFiltroProduto("todos")}>Todos</button>
                  <button type="button" className={filtroProduto === "compra" ? "active" : ""} onClick={() => setFiltroProduto("compra")}>Compra de Dívida</button>
                  <button type="button" className={filtroProduto === "clt" ? "active" : ""} onClick={() => setFiltroProduto("clt")}>CLT</button>
                </div>

                {movimentosFiltrados.length === 0 ? (
                  <div className="premio-v8-secondary-empty">Nenhum contrato encontrado para esta colaboradora na referência.</div>
                ) : (
                  <div className="premio-v8-secondary-list">
                    {movimentosFiltrados.map((item) => (
                      <article key={`lib-${item.id}`}>
                        <div>
                          <strong>{item.cliente || "Cliente"}</strong>
                          <small>
                            {item.produto} • Banco: {item.banco || "Não informado"} • {nomeTabelaContrato(item)}
                             {" • "}Digitação: {dataPt(item.dataDigitacao || item.data)} • Pagamento: {dataPt(item.dataPagamento || item.data)}
                          </small>
                        </div>
                        <div className="premio-v8-secondary-value">
                          <span>{item.produto === "CLT" ? "Parcela" : "Líquido"}</span>
                          <b>{moeda(item.produto === "CLT" ? Number(item.valorParcelaClt || 0) : Number(item.producaoValida || 0))}</b>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="premio-v4-history">

              {creditosLiberados.length === 0 ? (

                <div className="premio-v4-empty">

                  Nenhuma premiação liberada ainda.

                </div>

              ) : (

                creditosLiberados.map((item) => (

                  <article key={item.id}>

                    <div>

                      <strong>{item.usuario_nome || "Colaboradora"}</strong>

                      <span>

                        {item.descricao || "Premiação liberada"} ·{" "}

                        {dataPt(item.criado_em)}

                      </span>

                    </div>

                    {Number(item.pontos || 0)>0

                      ? <b>+ {pontos(Number(item.pontos || 0))} pts</b>

                      : <b style={{color:"#d92d3a"}}>NÃO BATEU META</b>}

                  </article>

                ))

              )}

            </div>

          </section>

        )}

        {abaAdmin === "saques" && (

          <section className="premio-v4-panel premio-v8-saques-panel">

            <div className="premio-v4-section-head">

              <div>

                <span>CONTROLE DE SAQUES</span>

                <h3>Solicitações das colaboradoras</h3>

                <p>

                  Tudo que elas solicitarem aparece automaticamente aqui.

                </p>

              </div>

              <b>{saquesPendentes.length}</b>

            </div>

            <div className="premio-v4-saque-list">

              {saquesPendentes.length === 0 ? (

                <div className="premio-v4-empty">

                  Nenhuma solicitação pendente.

                </div>

              ) : (

                saquesPendentes.map((saque) => (

                  <article key={saque.id}>

                    <div className="premio-v4-saque-user">

                      <span>

                        {saque.usuario_nome?.charAt(0).toUpperCase() || "U"}

                      </span>

                      <div>

                        <strong>{saque.usuario_nome}</strong>

                        <small>

                          Solicitado em {dataPt(saque.solicitado_em)}

                        </small>

                      </div>

                    </div>

                    <div>

                      <span>Pontos</span>

                      <strong>

                        {pontos(Number(saque.pontos_solicitados || 0))}

                      </strong>

                    </div>

                    <div>

                      <span>Valor</span>

                      <strong>

                        {moeda(

                          Number(

                            saque.valor_reais ||

                              saque.pontos_solicitados ||

                              0,

                          ),

                        )}

                      </strong>

                    </div>

                    <div>

                      <span>PIX</span>

                      <strong>{saque.chave_pix || "Não informado"}</strong>

                    </div>

                    <div className="premio-v4-saque-actions">

                      <button

                        type="button"

                        className="pay"

                        onClick={() =>

                          void onProcessarSaque(saque.id, "PAGO")

                        }

                        disabled={processando}

                      >

                        <Check size={15} />

                        Marcar pago

                      </button>

                      <button

                        type="button"

                        className="reject"

                        onClick={() =>

                          void onProcessarSaque(saque.id, "RECUSADO")

                        }

                        disabled={processando}

                      >

                        <X size={15} />

                        Recusar

                      </button>

                    </div>

                  </article>

                ))

              )}

            </div>

            {saquesProcessados.length > 0 && (

              <div className="premio-v4-processed">

                <h4>Histórico processado</h4>

                {saquesProcessados.slice(0, 20).map((saque) => (

                  <div key={saque.id}>

                    <span>{saque.usuario_nome}</span>

                    <span>{pontos(saque.pontos_solicitados)} pts</span>

                    <b className={saque.status.toLowerCase()}>

                      {saque.status}

                    </b>

                  </div>

                ))}

              </div>

            )}

          </section>

        )}

        {modalPix && (

          <div className="premio-v4-modal-bg" onClick={() => setModalPix(false)}>

            <form

              className="premio-v4-modal"

              onSubmit={async (e) => {

                e.preventDefault();

                setErroModal("");

                if (!chavePixCadastro.trim()) {

                  setErroModal("Informe a chave PIX.");

                  return;

                }

                try {

                  await onSalvarPix(nomeExibido, tipoPixCadastro, chavePixCadastro.trim());

                  setModalPix(false);

                } catch (erro) {

                  setErroModal(erro instanceof Error ? erro.message : "Não foi possível salvar o PIX.");

                }

              }}

              onClick={(e) => e.stopPropagation()}

            >

              <div className="premio-v4-modal-head">

                <div>

                  <span>PIX DA COLABORADORA</span>

                  <h3>{nomeExibido}</h3>

                  <p>Cadastre a chave que será usada para pagamento da premiação.</p>

                </div>

                <button type="button" onClick={() => setModalPix(false)}>×</button>

              </div>

              <label className="premio-v4-modal-field">

                Tipo da chave

                <select value={tipoPixCadastro} onChange={(e) => setTipoPixCadastro(e.target.value)}>

                  <option>CPF</option>

                  <option>Celular</option>

                  <option>E-mail</option>

                  <option>Chave aleatória</option>

                </select>

              </label>

              <label className="premio-v4-modal-field">

                Chave PIX

                <input value={chavePixCadastro} onChange={(e) => setChavePixCadastro(e.target.value)}

                  placeholder="Digite a chave PIX" />

              </label>

              {erroModal && <div className="premio-v4-modal-error">{erroModal}</div>}

              <div className="premio-v4-modal-actions">

                <button type="button" onClick={() => setModalPix(false)}>Cancelar</button>

                <button type="submit" className="primary" disabled={processando}>Salvar PIX</button>

              </div>

            </form>

          </div>

        )}

        {edicaoPremiacao?.contexto === contextoPremiacao && podeEditarPremiacao && (
          <EdicaoPremiacaoModal
            key={`${edicaoPremiacao.contexto}|${edicaoPremiacao.tipo}`}
            tipo={edicaoPremiacao.tipo}
            nome={nomeExibido}
            clt={premiacaoCltExibida}
            compra={premiacaoCompraExibida}
            automaticoClt={premiacaoCltAutomatica}
            automaticoCompra={premiacaoCompraAutomatica}
            onFechar={() => setEdicaoPremiacao(null)}
            onSalvar={salvarEdicaoPremiacao}
          />
        )}
        <style>{`
/* ELEVA - Mesmo estilo da tela original. Somente apresentação. */
.eleva-premiacao-cards-v2 { min-width:0; max-width:100%; box-sizing:border-box; }
.eleva-classic-scope { width:100%; min-width:0; container:eleva-premiacao / inline-size; display:block; }
.eleva-classic-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin:16px 0 14px; }
.eleva-classic-kpi,.eleva-classic-panel { min-width:0; box-sizing:border-box; border:1px solid #dce5f2; border-radius:18px; box-shadow:0 2px 7px rgba(23,54,96,.025); }
.eleva-classic-kpi { container:eleva-valor / inline-size; min-height:132px; padding:18px 20px; display:flex; flex-direction:column; align-items:stretch; justify-content:flex-start; background:#f7fbff; }
.eleva-classic-kpi.tone-blue { background:#f5faff; }
.eleva-classic-kpi.tone-green { background:#f0faf5; }
.eleva-classic-kpi.tone-lilac { background:#f5f2ff; }
.eleva-classic-kpi.tone-gold { background:#fff9e9; }
.eleva-classic-kpi.tone-pink { background:#fff2f6; }
.eleva-classic-kpi>span { display:block; min-height:34px; margin:0; color:#617895; font-size:13px; line-height:1.3; font-weight:650; text-transform:uppercase; letter-spacing:0; overflow-wrap:normal; word-break:normal; }
.eleva-classic-kpi>strong { display:block; margin:8px 0 0; color:#12355e; font-family:inherit; font-size:29px; font-size:clamp(22px,10.7cqw,32px); font-weight:800; line-height:1.12; letter-spacing:-.6px; font-variant-numeric:tabular-nums; white-space:nowrap; word-break:normal; overflow-wrap:normal; }
.eleva-classic-kpi>small { display:block; margin:10px 0 0; color:#8391a5; font-size:10.5px; line-height:1.4; font-weight:400; }
.eleva-classic-bottom { display:grid; grid-template-columns:minmax(0,1fr) repeat(3,minmax(0,1.1fr)) minmax(0,2.45fr) minmax(0,1.2fr); grid-template-areas:"wait awardclt awardcompra awardtotal goals motive"; gap:12px; align-items:stretch; margin:0 0 14px; }
.eleva-classic-panel { padding:17px 15px; background:#f5f9ff; }
.eleva-classic-wait { grid-area:wait; display:flex; flex-direction:column; min-width:0; }
.eleva-classic-wait>span { color:#365b8b; font-size:12px; line-height:1.4; font-weight:750; }
.eleva-classic-wait>strong { display:block; width:100%; min-width:0; max-width:100%; box-sizing:border-box; margin-top:13px; color:#153d70; font-size:24px; font-weight:800; letter-spacing:-.5px; line-height:1.15; white-space:nowrap; }
/* Não usa corte, reticências ou arredondamento. O texto é medido e encaixado. */
.eleva-classic-wait>.eleva-classic-wait-value { min-height:28px; padding:0; border:0; overflow:visible; text-overflow:clip; }
.eleva-classic-wait>.eleva-classic-wait-value>span { display:inline-block; width:max-content; max-width:none; margin:0; padding:0; font-family:inherit; font-weight:inherit; line-height:inherit; color:inherit; letter-spacing:inherit; white-space:nowrap; word-break:normal; overflow-wrap:normal; vertical-align:top; }
.eleva-classic-panel small { display:block; font-size:10px; color:#8492a6; font-weight:400; line-height:1.5; }
.eleva-classic-wait>small { margin-top:8px; }
.eleva-classic-award { background:#f1f7ff; display:flex; flex-direction:column; }
.eleva-classic-award.area-clt { grid-area:awardclt; }
.eleva-classic-award.area-compra { grid-area:awardcompra; }
.eleva-classic-award.area-total { grid-area:awardtotal; background:#edf5ff; }
.eleva-classic-award>header { display:flex; align-items:flex-start; justify-content:space-between; gap:7px; min-height:64px; padding:0; border:0; margin:0; background:transparent; }
.eleva-classic-award h3 { flex:1 1 0; min-width:0; margin:0; font-size:11.5px; line-height:1.35; color:#235183; font-weight:750; text-transform:none; letter-spacing:0; }
.eleva-classic-award header button { flex:none; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; width:44px; min-height:38px; box-sizing:border-box; border:1px solid #cbdcf7; border-radius:8px; padding:3px 4px; background:#fff; color:#1261e8; font-family:inherit; font-size:9px; font-weight:750; line-height:1.1; cursor:pointer; }
.eleva-classic-award header button span { color:inherit; font-size:12px; }
.eleva-classic-award header button:disabled { opacity:.55; cursor:not-allowed; }
.eleva-classic-award>strong { display:block; margin:12px 0 0; color:#1564ef; font-size:27px; font-weight:800; line-height:1.15; letter-spacing:-.5px; white-space:nowrap; }
.eleva-classic-award em { font-style:normal; font-size:17px; }
.eleva-classic-award>small { margin-top:9px; }
.eleva-classic-goals { grid-area:goals; background:#fff; padding:17px 18px; }
.eleva-meta-produto { min-width:0; }
.eleva-meta-produto+.eleva-meta-produto { margin-top:14px; }
.eleva-meta-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.eleva-meta-head h3 { font-size:12px; line-height:1.35; font-weight:750; color:#173d6b; margin:0; letter-spacing:0; }
.eleva-meta-head>b { font-size:12px; line-height:1.35; color:#183c67; white-space:nowrap; }
.eleva-meta-progress { margin:9px 0 6px; height:11px; box-sizing:border-box; border:1px solid #d5e0ed; border-radius:20px; background:#eaf1f9; overflow:hidden; }
.eleva-meta-progress>i { display:block; height:100%; border-radius:20px; background:#1766ef; transition:width .25s ease; }
.eleva-meta-produto>p { margin:0; color:#8695a9; font-size:9.5px; line-height:1.5; font-weight:400; }
.eleva-meta-produto>p b { font-weight:600; }
.eleva-classic-motivation { grid-area:motive; display:flex; align-items:center; justify-content:center; gap:12px; background:linear-gradient(135deg,#fff9e9,#f3f8ff); }
.eleva-classic-motivation>b { font-size:37px; line-height:1; flex:none; }
.eleva-classic-motivation strong { font-size:14px; line-height:1.25; font-weight:750; color:#19426d; }
.eleva-classic-motivation small { margin-top:7px; font-size:9px; }
.eleva-classic-notice { margin:8px 0 14px; padding:9px 12px; border:1px solid #dce7f6; border-radius:10px; background:#f4f8ff; color:#607b9f; font-size:11px; line-height:1.45; }
.eleva-classic-notice[role="alert"] { background:#fff8e9; color:#856018; border-color:#eeddb9; }
.eleva-classic-sr-only { position:absolute!important; width:1px!important; height:1px!important; padding:0!important; margin:-1px!important; overflow:hidden!important; clip-path:inset(50%)!important; white-space:nowrap!important; border:0!important; }
/* A identidade e filtros ficam alinhados, sem avatar sozinho numa coluna larga. */
.eleva-classic-person { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:18px 24px; padding:20px; margin:16px 0 0; border:1px solid #dce5f2; border-radius:18px; background:#fff; box-sizing:border-box; }
.eleva-classic-identity { flex:1 1 330px; min-width:0; display:flex; align-items:center; gap:13px; }
.eleva-classic-avatar { width:54px; height:54px; flex:none; border-radius:50%; display:grid; place-items:center; color:#1769f2; background:#eaf2ff; font-size:25px; font-weight:800; }
.eleva-classic-person-copy { min-width:0; }
.eleva-classic-person h2 { color:#12365f; font-size:21px; line-height:1.25; margin:0; font-weight:750; overflow-wrap:break-word; }
.eleva-classic-person p { color:#8793a6; font-size:11px; line-height:1.5; margin:5px 0 0; }
.eleva-classic-pix { background:#dff8ea; color:#188750; font-size:10px; font-weight:750; border-radius:16px; padding:7px 9px; flex:0 0 auto; }
.eleva-classic-person-controls { flex:1.4 1 640px; display:grid; grid-template-columns:minmax(170px,1fr) minmax(210px,.95fr) auto; align-items:end; gap:12px; min-width:0; }
.eleva-classic-person-controls label { display:flex; flex-direction:column; min-width:0; gap:6px; }
.eleva-classic-person-controls label>span { font-size:10px; line-height:1.3; color:#8190a5; font-weight:500; }
.eleva-classic-person-controls select,.eleva-classic-person-controls input { height:40px; padding:0 11px; border:1px solid #d5e1f4; border-radius:9px; background:#fff; box-sizing:border-box; color:#163b68; width:100%; min-width:0; font-family:inherit; font-size:11px; }
.eleva-classic-month { display:grid; grid-template-columns:30px minmax(0,1fr) 30px; gap:5px; min-width:0; }
.eleva-classic-month button { width:30px; height:40px; padding:0; border:1px solid #d5e1f4; border-radius:9px; background:#fff; color:#1967ef; font-size:23px; cursor:pointer; }
.eleva-classic-person .eleva-classic-update { height:40px; border:0; border-radius:9px; padding:0 18px; background:#1464ef; color:#fff; font-family:inherit; font-size:12px; font-weight:650; cursor:pointer; white-space:nowrap; }
.eleva-classic-update:disabled { opacity:.65; cursor:wait; }
.eleva-classic-person button:focus-visible,.eleva-classic-person select:focus-visible,.eleva-classic-person input:focus-visible,.eleva-classic-award button:focus-visible { outline:3px solid #ffb05a; outline-offset:2px; }
@container eleva-premiacao (min-width:1850px) { .eleva-classic-summary { grid-template-columns:repeat(8,minmax(0,1fr)); } }
@container eleva-premiacao (max-width:1199px) {
 .eleva-classic-bottom { grid-template-columns:repeat(3,minmax(0,1fr)); grid-template-areas:"awardclt awardcompra awardtotal" "goals goals wait" "goals goals motive"; }
 .eleva-classic-award { min-height:140px; }
 .eleva-classic-award>header { min-height:38px; }
 .eleva-classic-goals { display:flex; flex-direction:column; justify-content:center; }
 .eleva-classic-motivation { padding:12px; }
 .eleva-classic-wait { padding:12px 16px; }
}
@container eleva-premiacao (max-width:1000px) { .eleva-classic-summary { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@container eleva-premiacao (max-width:620px) {
 .eleva-classic-bottom { grid-template-columns:repeat(2,minmax(0,1fr)); grid-template-areas:"awardclt awardcompra" "awardtotal wait" "goals goals" "motive motive"; }
 .eleva-classic-panel { padding:15px; }
 .eleva-classic-motivation { justify-content:flex-start; }
 .eleva-classic-award>strong { font-size:25px; }
 .eleva-classic-award>header { min-height:52px; }
}
@container eleva-premiacao (max-width:450px) {
 .eleva-classic-summary { grid-template-columns:minmax(0,1fr); gap:10px; }
 .eleva-classic-kpi { min-height:125px; padding:18px; }
 .eleva-classic-kpi>span { min-height:0; }
 .eleva-classic-bottom { grid-template-columns:minmax(0,1fr); grid-template-areas:"awardclt" "awardcompra" "awardtotal" "goals" "wait" "motive"; gap:10px; }
 .eleva-classic-award>header { min-height:30px; }
 .eleva-classic-award { min-height:125px; }
 .eleva-classic-award>strong { margin-top:8px; }
 .eleva-classic-motivation strong br { display:none; }
}
@media(max-width:760px) {
 .eleva-classic-person { padding:16px; }
 .eleva-classic-person-controls { flex-basis:100%; grid-template-columns:1fr; }
 .eleva-classic-person .eleva-classic-update { width:100%; }
 .eleva-classic-pix { display:none; }
 .eleva-classic-person h2 { font-size:19px; }
}
@media(prefers-reduced-motion:reduce) { .eleva-meta-progress>i { transition:none; } }

.eleva-premio-modal-mask { position:fixed; inset:0; z-index:100000; display:flex; justify-content:center; align-items:center; padding:16px; box-sizing:border-box; background:rgba(9,29,57,.5); }
.eleva-premio-modal { width:min(620px,100%); max-height:calc(100dvh - 32px); overflow-y:auto; box-sizing:border-box; background:white; border:1px solid #d5e2f4; border-radius:18px; padding:22px; box-shadow:0 22px 90px rgba(10,32,75,.25); font-family:inherit; }
.eleva-premio-modal header { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; border-bottom:1px solid #e4ecf7; padding-bottom:14px; }
.eleva-premio-modal header span { color:#1468f5; font-size:10px; font-weight:850; letter-spacing:.06em; }
.eleva-premio-modal header h3 { color:#123769; margin:7px 0; font-size:21px; line-height:1.3; }
.eleva-premio-modal header p { color:#6c82a1; font-size:12px; margin:0; }
.eleva-premio-modal header button { width:34px; height:34px; background:#eef4fc; color:#224a7c; border:0; border-radius:9px; font-size:25px; cursor:pointer; flex:none; }
.eleva-premio-edit-inputs { display:grid; gap:16px; margin:18px 0; }
.eleva-premio-edit-inputs label { display:grid; gap:7px; color:#284974; font-size:12px; font-weight:800; }
.eleva-premio-edit-inputs label > div { display:flex; border:1px solid #ceddf2; border-radius:10px; overflow:hidden; }
.eleva-premio-edit-inputs input { width:100%; min-width:0; border:0; padding:10px 12px; height:44px; font:inherit; font-size:19px; color:#12386b; box-sizing:border-box; }
.eleva-premio-edit-inputs label b { padding:13px; color:#195de1; background:#f6f9ff; font-size:12px; }
.eleva-premio-edit-inputs small { color:#8596ad; font-weight:500; font-size:11px; }
.eleva-premio-edit-total { padding:14px; border:1px solid #c5d9fa; border-radius:12px; background:#f2f7ff; }
.eleva-premio-edit-total span { display:block; color:#5d789d; font-size:11px; font-weight:750; }
.eleva-premio-edit-total strong { display:block; color:#195fe0; margin:7px 0; font-size:27px; }
.eleva-premio-edit-total small { display:block; color:#6d85a5; font-size:11px; line-height:1.5; }
.eleva-premio-edit-note { color:#617b9b; font-size:11px; line-height:1.6; }
.eleva-premio-edit-error { padding:10px; color:#b82031; background:#fff1f2; border:1px solid #f4cad0; border-radius:9px; font-size:12px; }
.eleva-premio-modal footer { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:9px; margin-top:16px; }
.eleva-premio-modal footer button { min-height:40px; border:1px solid #cddcf1; padding:0 14px; border-radius:9px; font:inherit; font-size:13px; font-weight:800; background:#fff; color:#35608d; cursor:pointer; }
.eleva-premio-modal footer button[type="submit"] { background:#1468f5; border-color:#1468f5; color:#fff; }
.eleva-award-card button:focus-visible,.eleva-premio-modal button:focus-visible,.eleva-premio-modal input:focus-visible { outline:3px solid #ffa14c; outline-offset:2px; }

        `}</style>

      <style jsx>{`
        .premio-v7-award-edit-head{display:flex;justify-content:space-between;align-items:center}.premio-v7-award-edit-head button{border:1px solid #b9d0ff;background:#fff;color:#1267f5;border-radius:7px;padding:4px 7px;font-size:8px;font-weight:900;cursor:pointer}
        .premio-v7-edit-award-backdrop{position:fixed;inset:0;background:rgba(5,25,58,.42);display:grid;place-items:center;z-index:9999}.premio-v7-edit-award{width:min(470px,94vw);background:#fff;border-radius:18px;padding:19px;box-shadow:0 24px 65px rgba(6,35,78,.24)}.premio-v7-edit-award header{display:flex;justify-content:space-between;border-bottom:1px solid #e7eef8;padding-bottom:12px}.premio-v7-edit-award header span{font-size:9px;color:#1267f5;font-weight:900}.premio-v7-edit-award header h3{margin:4px 0;color:#092e67}.premio-v7-edit-award header button{border:0;background:#f1f5fb;border-radius:8px;width:31px;height:31px;font-size:20px}.premio-v7-edit-award>article{margin:14px 0;background:#f2f7ff;border:1px solid #cbdcff;border-radius:11px;padding:11px}.premio-v7-edit-award>article span,.premio-v7-edit-award label>span{display:block;font-size:9px;color:#7083a1}.premio-v7-edit-award>article strong{display:block;font-size:20px;color:#0b3470;margin-top:4px}.premio-v7-edit-award label>div{display:flex;border:1px solid #d5e1f1;border-radius:10px;overflow:hidden;margin-top:6px}.premio-v7-edit-award input{height:42px;flex:1;border:0;outline:0;padding:0 12px;font-size:17px;font-weight:900}.premio-v7-edit-award label b{padding:13px;color:#1267f5}.premio-v7-edit-award p{background:#eef5ff;border:1px solid #cbdcff;border-radius:9px;padding:9px;color:#557096;font-size:9px}.premio-v7-edit-award footer{display:flex;justify-content:flex-end;gap:8px}.premio-v7-edit-award footer button{height:38px;border:1px solid #d5e0ef;background:#fff;border-radius:8px;padding:0 14px;font-weight:900}.premio-v7-edit-award footer .save{background:#1267f5;border-color:#1267f5;color:#fff}
      `}</style>

      {colaboradoraEditando && (
        <div className="premio-v8-collab-modal-backdrop" onMouseDown={() => setColaboradoraEditando(null)}>
          <section className="premio-v8-collab-modal" onMouseDown={(e) => e.stopPropagation()}>
            <header>
              <div className="premio-v8-collab-avatar">{colaboradoraEditando.charAt(0).toUpperCase()}</div>
              <div><span>COLABORADORA</span><h3>{colaboradoraEditando}</h3><small>Gerencie os dados de recebimento da premiação.</small></div>
              <button type="button" onClick={() => setColaboradoraEditando(null)}>×</button>
            </header>
            <div className="premio-v8-pix-status">
              <i>✓</i><div><strong>{pixEdicaoChave ? "PIX cadastrado" : "PIX não cadastrado"}</strong><small>{pixEdicaoChave ? "Chave disponível para recebimento." : "Cadastre uma chave para a colaboradora."}</small></div>
            </div>
            <div className="premio-v8-pix-fields">
              <label><span>Tipo da chave PIX</span><select value={pixEdicaoTipo} onChange={(e) => setPixEdicaoTipo(e.target.value)}><option value="CPF">CPF</option><option value="CNPJ">CNPJ</option><option value="EMAIL">E-mail</option><option value="TELEFONE">Telefone</option><option value="ALEATORIA">Chave aleatória</option></select></label>
              <label><span>Chave PIX</span><input value={pixEdicaoChave} onChange={(e) => setPixEdicaoChave(e.target.value)} placeholder="Digite a chave PIX" /></label>
            </div>
            <div className="premio-v8-collab-note">🔐 Alterar o PIX não interfere na produção nem na conferência da colaboradora.</div>
            <footer><button type="button" className="cancel" onClick={() => setColaboradoraEditando(null)}>Cancelar</button><button type="button" className="save" onClick={() => void salvarPixColaboradora()}>Salvar PIX</button></footer>
          </section>
        </div>
      )}

      {modalConferencia && (

          <div

            className="premio-v4-modal-bg"

            onClick={() => setModalConferencia(false)}

          >

            <form

              className="premio-v4-modal"

              onSubmit={confirmarLiberacao}

              onClick={(e) => e.stopPropagation()}

            >

              <div className="premio-v4-modal-head">

                <div>

                  <span>CONFERÊNCIA FINAL</span>

                  <h3>{nomeExibido}</h3>

                  <p>

                    O sistema calculou automaticamente. Você pode corrigir

                    antes de liberar.

                  </p>

                </div>

                <button

                  type="button"

                  onClick={() => setModalConferencia(false)}

                >

                  ×

                </button>

              </div>

              <div className="premio-v4-modal-grid">

                <label>

                  Pontos Compra

                  <input

                    value={pontosCompraLiberar}

                    onChange={(e) =>

                      setPontosCompraLiberar(e.target.value)

                    }

                  />

                  <small>

                    Automático: {pontos(compraPrevistaSegura)} pts

                  </small>

                </label>

                <label>

                  Pontos CLT / complemento

                  <input

                    value={pontosCltLiberar}

                    onChange={(e) => setPontosCltLiberar(e.target.value)}

                  />

                  <small>

                    Automático: {pontos(cltPrevistaSegura)} pts

                  </small>

                </label>

              </div>

              <div className="premio-v4-modal-total">

                <span>Total a liberar</span>

                <strong>

                  {pontos(somarPremiacoes(
                    lerValorPremiacao(pontosCompraLiberar) ?? 0,
                    lerValorPremiacao(pontosCltLiberar) ?? 0,
                  ))}{" "}
                  pts

                </strong>

              </div>

              {erroModal && (

                <div className="premio-v4-modal-error">{erroModal}</div>

              )}

              <div className="premio-v4-modal-actions">

                <button

                  type="button"

                  onClick={() => setModalConferencia(false)}

                >

                  Cancelar

                </button>

                <button

                  type="submit"

                  className="primary"

                  disabled={processando}

                >

                  Confirmar e liberar pontos

                </button>

              </div>

            </form>

          </div>

        )}

      <style jsx global>{`
        /* V8.9 — Pontos Liberados: somente UM botão azul */
        .premio-v8-liberados-head {
          display:flex !important;
          align-items:center !important;
          justify-content:flex-end !important;
          min-height:68px !important;
        }
        .premio-v8-liberados-head > div:first-child {
          display:none !important;
        }
        .premio-v8-liberados-head::before,
        .premio-v8-liberados-head::after {
          content:none !important;
          display:none !important;
        }
        .premio-v8-liberados-actions {
          margin-left:auto !important;
          display:flex !important;
          align-items:center !important;
          justify-content:flex-end !important;
          gap:0 !important;
        }
        .premio-v8-liberados-actions button {
          display:flex !important;
          align-items:center !important;
          justify-content:center !important;
          gap:8px !important;
          min-width:168px !important;
          height:44px !important;
          padding:0 18px !important;
          border:1px solid #1267f5 !important;
          border-radius:11px !important;
          background:#1267f5 !important;
          color:#fff !important;
          font-size:14px !important;
          font-weight:900 !important;
          box-shadow:0 7px 16px rgba(18,103,245,.16) !important;
          cursor:pointer !important;
        }
        .premio-v8-liberados-actions button:hover,
        .premio-v8-liberados-actions button.active {
          background:#0d5ce5 !important;
          border-color:#0d5ce5 !important;
          color:#fff !important;
        }
        .premio-v8-liberados-actions button span,
        .premio-v8-contract-icon {
          color:#fff !important;
          font-size:14px !important;
          font-weight:900 !important;
        }
        .premio-v8-liberados-count {
          display:none !important;
        }
        /* PONTOS LIBERADOS — contratos na visão da gestão */
        .premio-v8-secondary-contracts {
          margin:14px 0 20px !important;
          border:1px solid #d9e5f5 !important;
          border-radius:14px !important;
          overflow:hidden !important;
          background:#fff !important;
        }
        .premio-v8-secondary-contracts-head {
          display:flex !important;
          justify-content:space-between !important;
          align-items:center !important;
          gap:16px !important;
          padding:15px 17px !important;
          background:#f5f8fd !important;
          border-bottom:1px solid #e1eaf6 !important;
        }
        .premio-v8-secondary-contracts-head > div {display:flex !important;flex-direction:column !important;gap:4px !important;}
        .premio-v8-secondary-contracts-head strong {font-size:16px !important;color:#092e67 !important;font-weight:900 !important;}
        .premio-v8-secondary-contracts-head small {font-size:12px !important;color:#6d809d !important;}
        .premio-v8-secondary-contracts-head > span {font-size:13px !important;font-weight:800 !important;color:#1267f5 !important;background:#eaf2ff !important;padding:6px 10px !important;border-radius:8px !important;}
        .premio-v8-contract-filter {display:flex !important;gap:7px !important;padding:10px 16px !important;border-bottom:1px solid #edf1f7 !important;background:#fff !important;}
        .premio-v8-contract-filter button {border:1px solid #d7e2f1 !important;background:#fff !important;color:#557096 !important;border-radius:8px !important;min-height:34px !important;padding:0 12px !important;font-size:12px !important;font-weight:800 !important;cursor:pointer !important;}
        .premio-v8-contract-filter button.active {background:#1267f5 !important;border-color:#1267f5 !important;color:#fff !important;}
        .premio-v8-secondary-list article {display:flex !important;justify-content:space-between !important;align-items:center !important;gap:18px !important;padding:14px 17px !important;border-bottom:1px solid #edf1f7 !important;}
        .premio-v8-secondary-list article:last-child {border-bottom:0 !important;}
        .premio-v8-secondary-list article > div:first-child {display:flex !important;flex-direction:column !important;gap:4px !important;}
        .premio-v8-secondary-list article strong {font-size:14px !important;color:#092e67 !important;font-weight:900 !important;}
        .premio-v8-secondary-list article small {font-size:12px !important;color:#6d809d !important;}
        .premio-v8-secondary-value {text-align:right !important;min-width:125px !important;}
        .premio-v8-secondary-value span {display:block !important;font-size:10px !important;color:#71839e !important;margin-bottom:3px !important;}
        .premio-v8-secondary-value b {font-size:15px !important;color:#087f3f !important;font-weight:900 !important;}
        .premio-v8-secondary-empty {padding:28px !important;text-align:center !important;color:#7587a3 !important;font-size:14px !important;}

        /* V8.7 — TIPOGRAFIA REAL DA ABA SOLICITAR SAQUE NA VISÃO DA GESTÃO */
        .premio-v8-saques-panel .premio-v4-section-head > div > span {
          font-size: 14px !important;
          font-weight: 900 !important;
          letter-spacing: .06em !important;
        }
        .premio-v8-saques-panel .premio-v4-section-head h3 {
          font-size: 25px !important;
          line-height: 1.15 !important;
          font-weight: 900 !important;
        }
        .premio-v8-saques-panel .premio-v4-section-head p {
          font-size: 16px !important;
          line-height: 1.5 !important;
        }
        .premio-v8-saques-panel .premio-v4-empty {
          font-size: 17px !important;
          font-weight: 700 !important;
          padding: 38px 20px !important;
        }
        .premio-v8-saques-panel .premio-v4-processed {
          margin-top: 22px !important;
        }
        .premio-v8-saques-panel .premio-v4-processed h4 {
          font-size: 21px !important;
          font-weight: 900 !important;
          color: #092e67 !important;
          margin: 0 0 14px !important;
        }
        .premio-v8-saques-panel .premio-v4-processed > div {
          min-height: 58px !important;
          padding: 12px 4px !important;
          display: grid !important;
          grid-template-columns: minmax(260px,1fr) 160px 100px !important;
          align-items: center !important;
          column-gap: 20px !important;
        }
        .premio-v8-saques-panel .premio-v4-processed > div > span:first-child {
          font-size: 17px !important;
          font-weight: 800 !important;
          color: #17345f !important;
        }
        .premio-v8-saques-panel .premio-v4-processed > div > span:nth-child(2) {
          font-size: 17px !important;
          font-weight: 800 !important;
          color: #17345f !important;
        }
        .premio-v8-saques-panel .premio-v4-processed > div > b {
          font-size: 13px !important;
          font-weight: 900 !important;
          padding: 6px 11px !important;
          justify-self: start !important;
        }
        .premio-v8-saques-panel .premio-v4-saque-user strong {
          font-size: 18px !important;
          font-weight: 900 !important;
        }
        .premio-v8-saques-panel .premio-v4-saque-user small,
        .premio-v8-saques-panel .premio-v4-saque-list article > div > span {
          font-size: 14px !important;
        }
        .premio-v8-saques-panel .premio-v4-saque-list article > div > strong {
          font-size: 17px !important;
        }
        .premio-v8-saques-panel .premio-v4-saque-actions button {
          font-size: 14px !important;
          min-height: 42px !important;
          padding: 0 15px !important;
        }
      `}</style>

      </div>

    );

  }

  const meusSaquesPendentes = saques.filter(

    (saque) =>

      saque.status === "SOLICITADO" &&

      saque.usuario_nome &&

      saque.usuario_nome.toLowerCase() === (carteiraNome || nomeUsuario).toLowerCase(),

  );

  return (

    <div className="premio-v4-page colaborador">

      <section className="premio-v4-colab-hero">

        <div>

          {podeGerenciar && (

            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>

              <button

                type="button"

                onClick={() => setVisaoGestor("gestao")}

                style={{

                  minHeight: 38, padding: "0 14px", borderRadius: 10,

                  border: "1px solid #d7e1f0", background: "#fff",

                  color: "#17345f", fontWeight: 800, cursor: "pointer"

                }}

              >

                Gestão da premiação

              </button>

              <button

                type="button"

                style={{

                  minHeight: 38, padding: "0 14px", borderRadius: 10,

                  border: "1px solid #1f61ee", background: "#1f61ee",

                  color: "#fff", fontWeight: 800

                }}

              >

                Minha carteira

              </button>

            </div>

          )}

          <span>MINHA PREMIAÇÃO</span>

          <h2>Olá, {carteiraNome || nomeUsuario}!</h2>

          <p>

            Aqui aparecem somente os pontos que já foram conferidos e

            liberados pela gestão.

          </p>

        </div>

        <label>

          <CalendarDays size={17} />

          <input

            type="month"

            value={competencia}

            onChange={(e) => onCompetenciaChange(e.target.value)}

          />

        </label>

      </section>

      <section className="premio-v4-colab-cards">

        <article className="wallet">

          <div>

            <Coins size={23} />

            <span>PONTOS DISPONÍVEIS</span>

          </div>

          <strong>{pontos(saldoPontos)}</strong>

          <p>1 ponto = R$ 1,00</p>

          <footer>

            <span>{carteiraNome || nomeUsuario}</span>

            <b>{moeda(saldoPontos)}</b>

          </footer>

        </article>

        <article>

          <Landmark size={23} />

          <span>Disponível para novo saque</span>

          <strong>{pontos(saldoDisponivelSaque)} pts</strong>

          <small>{moeda(saldoDisponivelSaque)}</small>

        </article>

        <article>

          <History size={23} />

          <span>Solicitações pendentes</span>

          <strong>{meusSaquesPendentes.length}</strong>

          <small>Aguardando a gestão</small>

        </article>

      </section>

      <section className="premio-v4-colab-actions">

        <button

          type="button"

          disabled={saldoDisponivelSaque <= 0}

          onClick={() => {

            setErroModal("");

            setPontosSaque(

              saldoDisponivelSaque > 0

                ? String(saldoDisponivelSaque)

                : "",

            );

            const pixPessoal = pixDaColaboradora(carteiraNome || nomeUsuario);

            setChavePix(pixPessoal.chave || "");

            setModalSaque(true);

          }}

        >

          <span>

            <WalletCards size={21} />

          </span>

          <div>

            <strong>Solicitar saque</strong>

            <small>

              Envie a solicitação para a gestão. O pagamento será baixado

              pelo sistema.

            </small>

          </div>

          <ChevronRight size={17} />

        </button>

      </section>

      <section className="premio-v4-panel">

        <div className="premio-v4-section-head">

          <div>

            <span>MEU EXTRATO</span>

            <h3>Pontos e saques</h3>

            <p>Histórico do que já foi liberado ou pago.</p>

          </div>

        </div>

        <div className="premio-v4-history">

          {extrato.length === 0 ? (

            <div className="premio-v4-empty">

              Nenhum lançamento disponível.

            </div>

          ) : (

            extrato.slice(0, 30).map((item) => (

              <article key={item.id}>

                <div>

                  <strong>{item.descricao || item.origem}</strong>

                  <span>{dataPt(item.criado_em)}</span>

                </div>

                <b

                  className={

                    item.tipo === "DEBITO" ? "negative" : "positive"

                  }

                >

                  {item.tipo === "DEBITO" ? "−" : "+"}{" "}

                  {pontos(Math.abs(Number(item.pontos || 0)))} pts

                </b>

              </article>

            ))

          )}

        </div>

      </section>

      {modalSaque && (

        <div

          className="premio-v4-modal-bg"

          onClick={() => setModalSaque(false)}

        >

          <form

            className="premio-v4-modal"

            onSubmit={enviarSaque}

            onClick={(e) => e.stopPropagation()}

          >

            <div className="premio-v4-modal-head">

              <div>

                <span>SOLICITAR SAQUE</span>

                <h3>Resgatar pontos</h3>

                <p>

                  1 ponto vale R$ 1,00. A solicitação aparecerá

                  automaticamente para a gestão.

                </p>

              </div>

              <button type="button" onClick={() => setModalSaque(false)}>

                ×

              </button>

            </div>

            <div className="premio-v4-modal-balance">

              <span>Saldo disponível</span>

              <strong>{pontos(saldoDisponivelSaque)} pts</strong>

              <b>{moeda(saldoDisponivelSaque)}</b>

            </div>

            <label className="premio-v4-modal-field">

              Quantos pontos deseja sacar?

              <input

                value={pontosSaque}

                onChange={(e) => setPontosSaque(e.target.value)}

                placeholder="Ex.: 500"

              />

            </label>

            <label className="premio-v4-modal-field">

              Chave PIX

              {pixDaColaboradora(carteiraNome || nomeUsuario).tipo && (

                <small>

                  {pixDaColaboradora(carteiraNome || nomeUsuario).tipo}

                </small>

              )}

              <input

                value={chavePix}

                onChange={(e) => setChavePix(e.target.value)}

                readOnly={Boolean(pixDaColaboradora(carteiraNome || nomeUsuario).chave)}

                placeholder="CPF, celular, e-mail ou chave aleatória"

              />

              {pixDaColaboradora(carteiraNome || nomeUsuario).chave && (

                <small>PIX cadastrado pela gestão.</small>

              )}

            </label>

            {erroModal && (

              <div className="premio-v4-modal-error">{erroModal}</div>

            )}

            <div className="premio-v4-modal-actions">

              <button type="button" onClick={() => setModalSaque(false)}>

                Cancelar

              </button>

              <button type="submit" className="primary">

                Enviar solicitação

              </button>

            </div>

          </form>

        </div>

      )}

      <style jsx global>{`
        /* V8.5 — classes REAIS das abas Pontos Liberados / Solicitar Saque */
        .premio-v8-saques-panel .premio-v4-section-head > div > span { font-size: 12px !important; letter-spacing: .08em; }
        .premio-v8-saques-panel .premio-v4-section-head h3 { font-size: 23px !important; line-height: 1.15; }
        .premio-v8-saques-panel .premio-v4-section-head p { font-size: 14px !important; line-height: 1.5; }
        .premio-v8-saques-panel .premio-v4-section-head > b { font-size: 17px !important; }
        .premio-v8-saques-panel .premio-v4-saque-list article { padding: 18px 16px !important; }
        .premio-v8-saques-panel .premio-v4-saque-user strong { font-size: 17px !important; }
        .premio-v8-saques-panel .premio-v4-saque-user small { font-size: 13px !important; }
        .premio-v8-saques-panel .premio-v4-saque-list article > div > span { font-size: 12px !important; }
        .premio-v8-saques-panel .premio-v4-saque-list article > div > strong { font-size: 16px !important; }
        .premio-v8-saques-panel .premio-v4-saque-actions button { font-size: 13px !important; min-height: 38px; padding: 0 13px !important; }
        .premio-v8-saques-panel .premio-v4-processed h4 { font-size: 17px !important; }
        .premio-v8-saques-panel .premio-v4-processed > div { min-height: 42px; font-size: 13px !important; }
        .premio-v8-saques-panel .premio-v4-processed span,
        .premio-v8-saques-panel .premio-v4-processed b { font-size: 16px !important; }

        /* SAQUES — legibilidade reforçada */
        .premio-v8-saques-panel { font-size: 16px !important; }
        .premio-v8-saques-panel .premio-v4-empty {
          font-size: 16px !important;
          font-weight: 600 !important;
          padding: 34px 20px !important;
        }
        .premio-v8-saques-panel .premio-v4-processed {
          margin-top: 20px !important;
        }
        .premio-v8-saques-panel .premio-v4-processed h4 {
          font-size: 19px !important;
          font-weight: 900 !important;
          margin-bottom: 12px !important;
          color: #092e67 !important;
        }
        .premio-v8-saques-panel .premio-v4-processed > div {
          min-height: 52px !important;
          padding: 10px 4px !important;
          align-items: center !important;
        }
        .premio-v8-saques-panel .premio-v4-processed > div > span:first-child {
          font-size: 16px !important;
          font-weight: 700 !important;
          color: #17345f !important;
        }
        .premio-v8-saques-panel .premio-v4-processed > div > span:nth-child(2) {
          font-size: 16px !important;
          font-weight: 800 !important;
          color: #17345f !important;
        }
        .premio-v8-saques-panel .premio-v4-processed > div > b {
          font-size: 12px !important;
          font-weight: 900 !important;
          padding: 5px 10px !important;
          border-radius: 999px !important;
        }
        .premio-v8-saques-panel .premio-v4-section-head > b {
          min-width: 44px !important;
          height: 44px !important;
          display: grid !important;
          place-items: center !important;
          font-size: 17px !important;
          border-radius: 11px !important;
        }

        .premio-v8-liberados-head { align-items: center; }
        .premio-v8-liberados-actions { display:flex; align-items:center; gap:10px; }
        .premio-v8-liberados-actions button {
          border:1px solid #bcd1f7; background:#fff; color:#0b4fbf; border-radius:10px;
          min-height:38px; padding:0 14px; font-size:13px; font-weight:900; cursor:pointer;
        }
        .premio-v8-liberados-actions button {
          display:flex !important;
          align-items:center !important;
          justify-content:center !important;
          gap:8px !important;
          min-width:160px !important;
          height:44px !important;
          padding:0 18px !important;
          border:1px solid #1267f5 !important;
          border-radius:11px !important;
          background:#1267f5 !important;
          color:#fff !important;
          font-size:14px !important;
          font-weight:900 !important;
          box-shadow:0 7px 16px rgba(18,103,245,.16) !important;
          cursor:pointer !important;
        }
        .premio-v8-liberados-actions button:hover,
        .premio-v8-liberados-actions button.active {
          background:#0d5ce5 !important;
          color:#fff !important;
          border-color:#0d5ce5 !important;
        }
        .premio-v8-contract-icon { font-size:15px !important; color:#fff !important; }
        .premio-v8-liberados-count {
          min-width:44px !important;
          height:44px !important;
          padding:0 10px !important;
          display:grid !important;
          place-items:center !important;
          border-radius:11px !important;
          background:#eef4ff !important;
          border:1px solid #d6e3fb !important;
          color:#1267f5 !important;
          font-size:16px !important;
          font-weight:900 !important;
          margin-left:4px !important;
        }
        .premio-v8-liberados-actions > b {
          min-width:38px; height:38px; display:grid; place-items:center; border-radius:10px;
          background:#eef4ff; color:#1267f5; font-size:14px;
        }
        .premio-v8-secondary-contracts {
          margin: 14px 0 20px;
          border: 1px solid #dce7f6;
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
        }
        .premio-v8-secondary-contracts-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: #f5f8fd;
          border-bottom: 1px solid #e2eaf5;
        }
        .premio-v8-secondary-contracts-head strong { font-size: 15px !important; color: #092e67; }
        .premio-v8-secondary-contracts-head span { font-size: 12px !important; color: #60789a; }
        .premio-v8-secondary-contracts-head > div { display:flex; flex-direction:column; gap:3px; }
        .premio-v8-secondary-contracts-head small { font-size:12px !important; color:#6d809d; }
        .premio-v8-contract-filter { display:flex; gap:7px; padding:10px 16px; border-bottom:1px solid #edf1f7; background:#fff; }
        .premio-v8-contract-filter button { border:1px solid #d7e2f1; background:#fff; color:#557096; border-radius:8px; min-height:32px; padding:0 11px; font-size:12px; font-weight:800; cursor:pointer; }
        .premio-v8-contract-filter button.active { background:#1267f5; border-color:#1267f5; color:#fff; }
        .premio-v8-secondary-value { text-align:right; min-width:120px; }
        .premio-v8-secondary-value span { display:block; font-size:10px !important; color:#71839e; margin-bottom:3px; }

        .premio-v8-secondary-list article {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          padding: 13px 16px;
          border-bottom: 1px solid #edf1f7;
        }
        .premio-v8-secondary-list article:last-child { border-bottom: 0; }
        .premio-v8-secondary-list article strong { display:block; font-size:14px !important; color:#092e67; }
        .premio-v8-secondary-list article small { display:block; margin-top:4px; font-size:11px !important; color:#6d809d; }
        .premio-v8-secondary-list article > b { font-size:14px !important; color:#087f3f; white-space:nowrap; }
        .premio-v8-secondary-empty { padding: 24px; text-align:center; color:#7587a3; font-size:13px; }
      `}</style>
</div>

  );

}

// FIM DO ARQUIVO COMPLETO - MinhaPremiacaoV2.tsx - TITULOS E VALOR V4
