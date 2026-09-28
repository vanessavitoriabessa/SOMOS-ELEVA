"use client";



import { useEffect, FormEvent, useMemo, useState } from "react";

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



type Props = {

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
  custoEmpresaCompetencia?: number;
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
    custoEmpresaCompetencia = 0,
    quantidadeVendedorasAtivas = 1,

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
  const [filtroDataInicialPremiacao,setFiltroDataInicialPremiacao]=useState("");
  const [filtroDataFinalPremiacao,setFiltroDataFinalPremiacao]=useState("");

  const [secaoV7, setSecaoV7] = useState<
    "visao" | "colaboradoras" | "conferencia"
  >("visao");
  const [colaboradoraEditando, setColaboradoraEditando] = useState<string | null>(null);
  const [pixEdicaoTipo, setPixEdicaoTipo] = useState("");
  const [pixEdicaoChave, setPixEdicaoChave] = useState("");

  const [editarPremiacaoAberto,setEditarPremiacaoAberto]=useState(false);
  const [premiacaoManual,setPremiacaoManual]=useState<number|null>(null);
  const [premiacaoManualTexto,setPremiacaoManualTexto]=useState("");

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




  const passaData=(valor?:string|null)=>{
    const d=String(valor||"").slice(0,10);
    if(filtroDataInicialPremiacao&&(!d||d<filtroDataInicialPremiacao)) return false;
    if(filtroDataFinalPremiacao&&(!d||d>filtroDataFinalPremiacao)) return false;
    return true;
  };
  const saquesPendentes=saques.filter(s=>s.status==="SOLICITADO"&&passaData(s.solicitado_em));
  const saquesProcessados=saques.filter(s=>s.status!=="SOLICITADO"&&passaData(s.processado_em||s.solicitado_em));



  const creditosLiberados = useMemo(

    () => extrato.filter((item) => item.tipo === "CREDITO"),

    [extrato],

  );



  const movimentosFiltrados=useMemo(()=>movimentos.filter(item=>{
    if(filtroProduto==="compra"&&item.produto!=="Compra de Dívida") return false;
    if(filtroProduto==="clt"&&item.produto!=="CLT") return false;
    const d=String(item.dataPagamento||item.data||"").slice(0,10);
    if(filtroDataInicialPremiacao&&(!d||d<filtroDataInicialPremiacao)) return false;
    if(filtroDataFinalPremiacao&&(!d||d>filtroDataFinalPremiacao)) return false;
    return true;
  }),[movimentos,filtroProduto,filtroDataInicialPremiacao,filtroDataFinalPremiacao]);

  const movimentosCompra = movimentos.filter((m) => m.produto === "Compra de Dívida");

  const movimentosClt = movimentos.filter((m) => m.produto === "CLT");

  const compraLiquidaPaga = movimentosCompra.reduce((t,m)=>t+Number(m.producaoValida||0),0);

  const compraBrutaPaga = movimentosCompra.reduce((t,m)=>t+Number(m.valorBruto ?? m.valorContrato ?? 0),0);

  useEffect(()=>{
    setPremiacaoManual(null);
    setPremiacaoManualTexto("");
    setEditarPremiacaoAberto(false);
  },[consultoraSelecionada,competencia]);

  const premiacaoExibida=premiacaoManual??pontosTotalPrevisto;
  function abrirEdicaoPremiacao(){
    setPremiacaoManualTexto(String(premiacaoExibida.toFixed(2)).replace(".",","));
    setEditarPremiacaoAberto(true);
  }
  function salvarEdicaoPremiacao(){
    const valor=Number(premiacaoManualTexto.replace(/\./g,"").replace(",","."));
    if(!Number.isFinite(valor)||valor<0)return;
    setPremiacaoManual(valor);
    setEditarPremiacaoAberto(false);
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

  // Sthefane: meta exclusiva de Compra de Dívida da empresa.
  // R$ 500 mil = R$ 250; R$ 1 milhão = R$ 500 (faixa não cumulativa).
  const metaVisualValor = ehSthefane ? 500000 : ehVinicius ? 1000000 : 30000;
  const producaoVisualMeta = ehSthefane || ehVinicius ? compraLiquidaPaga : compraLiquidaPaga;
  const percentualVisualMeta = Math.min(
    100,
    Math.round((producaoVisualMeta / Math.max(metaVisualValor, 1)) * 100),
  );
  const faltanteVisualMeta = Math.max(metaVisualValor - producaoVisualMeta, 0);

  const cltParcelasPagas = movimentosClt.reduce((t,m)=>t+Number(m.valorParcelaClt||m.producaoValida||0),0);

  const custoPa = Number(custoEmpresaCompetencia || 0) / Math.max(Number(quantidadeVendedorasAtivas || 1), 1);
  const comissaoEmpresaBruta = movimentosCompra.reduce((t,m)=>t+Number(m.comissaoEmpresa||0),0);
  const comissaoEmpresaLiquida = Math.max(comissaoEmpresaBruta - custoPa, 0);
  const brutoSelecionado = Math.max(movimentos.reduce((t,m)=>t+Number(m.valorBruto ?? m.valorContrato ?? 0),0),0);

  const movimentosComFinanceiro = movimentosFiltrados.map((item) => {
    const valorBrutoItem = Number(item.valorBruto ?? item.valorContrato ?? 0);
    const percentualComissao = valorBrutoItem > 0 ? (Number(item.comissaoEmpresa||0)/valorBrutoItem)*100 : 0;
    const custoRateado = brutoSelecionado > 0 ? custoPa*(valorBrutoItem/brutoSelecionado) : 0;
    const lucroBruto = Number(item.comissaoEmpresa||0);
    return {
      ...item,
      percentualComissaoEmpresa: percentualComissao,
      custoPaRateado: custoRateado,
      lucroBrutoEmpresa: lucroBruto,
      lucroLiquidoEmpresa: lucroBruto-custoRateado,
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

    setPontosCompraLiberar(String(compraPrevistaSegura));

    setPontosCltLiberar(String(cltPrevistaSegura));

    setErroModal("");

    setModalConferencia(true);

  }



  async function confirmarLiberacao(evento: FormEvent<HTMLFormElement>) {

    evento.preventDefault();



    const compra = Number(

      String(pontosCompraLiberar).replace(/\./g, "").replace(",", "."),

    );

    const clt = Number(

      String(pontosCltLiberar).replace(/\./g, "").replace(",", "."),

    );



    if (!Number.isFinite(compra) || compra < 0) {

      setErroModal("Informe uma pontuação válida para Compra.");

      return;

    }



    if (!Number.isFinite(clt) || clt < 0) {

      setErroModal("Informe uma pontuação válida para CLT.");

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

      <div className="premio-v4-page">

        <nav className="premio-v8-nav">
          <button type="button" className={`premio-v8-nav-card blue ${secaoV7 === "visao" && abaAdmin === "conferencia" ? "active" : ""}`} onClick={() => { setAbaAdmin("conferencia"); setSecaoV7("visao"); }}>
            <i className="premio-v8-icon">▦</i><span><strong>Conferência do Mês</strong><small>Analise e publique</small></span>
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

        </nav>

        <div className="premio-v8-global-filters">
          <label><span>Competência</span><input type="month" value={competencia} onChange={e=>onCompetenciaChange(e.target.value)}/></label>
          <label><span>Data inicial</span><input type="date" value={filtroDataInicialPremiacao} onChange={e=>setFiltroDataInicialPremiacao(e.target.value)}/></label>
          <label><span>Data final</span><input type="date" value={filtroDataFinalPremiacao} onChange={e=>setFiltroDataFinalPremiacao(e.target.value)}/></label>
          {podeGerenciar&&<label><span>Consultor(a)</span><select value={consultoraSelecionada} onChange={e=>onConsultoraChange(e.target.value)}>{consultorasComVanessa.map(n=><option key={n} value={n}>{n}</option>)}</select></label>}
          <label><span>Produto</span><select value={filtroProduto} onChange={e=>setFiltroProduto(e.target.value as "todos"|"compra"|"clt")}><option value="todos">Todos</option><option value="compra">Compra de Dívida</option><option value="clt">CLT</option></select></label>
        </div>

        {abaAdmin !== "saques" && (
        <section className="premio-v7-person">
          <div className="premio-v7-avatar">{nomeExibido.charAt(0).toUpperCase()}</div>
          <div className="premio-v7-person-copy">
            <div className="premio-v7-person-name"><h2>{nomeExibido}</h2><span>PIX cadastrado</span></div>
            <p>Vendedora <b>|</b> {pixDaColaboradora(nomeExibido).tipo || "CPF"}: {pixDaColaboradora(nomeExibido).chave || "—"}</p>
          </div>
          <label className="premio-v7-colab-select"><span>Colaboradora</span><select value={consultoraSelecionada} onChange={(e) => onConsultoraChange(e.target.value)}>{consultorasComVanessa.map((nome) => <option key={nome} value={nome}>{nome}</option>)}</select></label>
          <label className="premio-v7-period"><span>Competência atual</span><input type="month" value={competencia} onChange={(e) => onCompetenciaChange(e.target.value)} /><small>ⓘ Compra: digitadas no mês anterior<br />(pagamento até dia 19)</small></label>
          <button type="button" className="premio-v7-update" onClick={() => void onAtualizar()} disabled={processando}>↻ {processando ? "Atualizando..." : "Atualizar e recalcular"}</button>
        </section>
        )}

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

            <section className="premio-v4-kpis">
                <article><span>{ehVanessa ? "CLT — valor bruto/liberado pago" : "CLT — parcelas pagas"}</span><strong>{moeda(ehVanessa ? Number(producaoClt || 0) : cltParcelasPagas)}</strong><small>{faixaClt || "Abaixo da primeira faixa"}</small></article>
                <article><span>Compra de Dívida — líquido pago</span><strong>{moeda(compraLiquidaPaga)}</strong><small>{faixaCompra || "Abaixo da primeira faixa"}</small></article>
                <article><span>Compra de Dívida — bruto pago</span><strong>{moeda(compraBrutaPaga)}</strong><small>{movimentosCompra.length} contrato(s) elegível(is)</small></article>
                <article className="internal"><span>Comissão empresa — bruto</span><strong>{moeda(comissaoEmpresaBruta)}</strong><small>Antes do Custo PA</small></article>
                <article className="internal"><span>Comissão empresa — líquido</span><strong>{moeda(comissaoEmpresaLiquida)}</strong><small>Comissão bruta menos Custo PA</small></article>
                <article><span>Custo PA</span><strong>{moeda(custoPa)}</strong><small>{moeda(custoEmpresaCompetencia)} ÷ {quantidadeVendedorasAtivas} vendedora(s)</small></article>
                <article><span>Aguardando pagar</span><strong>{moeda(producaoEmFormacao)}</strong><small>{contratosEmFormacao} proposta(s) ainda não paga(s)</small></article>
                <article className="points"><span>Premiação automática</span><strong>{pontos(pontosTotalPrevisto)} pts</strong><small>{pontosTotalPrevisto > 0 ? "1 ponto = R$ 1,00" : "NÃO BATEU META"}</small></article>
              </section>

            <section className="premio-v7-goal-row">
              <article className="premio-v7-wait"><span>⌛ Aguardando pagar</span><strong>{moeda(producaoEmFormacao)}</strong><small>{contratosEmFormacao} proposta(s)</small></article>
              <article className="premio-v7-award">
                <div className="premio-v7-award-edit-head"><span>🏆 Premiação acumulada</span><button type="button" onClick={abrirEdicaoPremiacao}>✏️ Editar</button></div>
                <strong>{pontos(premiacaoExibida)} pts</strong>
                <small>{premiacaoManual===null?`Calculado automaticamente • ${moeda(pontosTotalPrevisto)}`:`Sistema: ${pontos(pontosTotalPrevisto)} pts • Ajustado manualmente`}</small>
              </article>
              {ehVanessa ? (
              <article className="premio-v7-goal premio-v7-goal-vanessa">
                <div>
                  <span>🎯 CLT bruto/liberado — Vanessa • mês de produção</span>
                  <b>{Math.min(100, Math.floor((Number(producaoClt || 0) / 1500000) * 100))}%</b>
                </div>
                <div className="premio-v7-progress">
                  <i style={{width: `${Math.min(100, (Number(producaoClt || 0) / 1500000) * 100)}%`}} />
                </div>
                <small>
                  <b>{moeda(Number(producaoClt || 0))}</b> de {moeda(1500000)}
                  {Number(producaoClt || 0) < 1500000
                    ? ` • Faltam ${moeda(1500000 - Number(producaoClt || 0))}`
                    : " • Meta CLT atingida"}
                </small>

                <div style={{height: 1, background: "#e3ebf7", margin: "10px 0"}} />

                <div>
                  <span>💰 COMPRA DE DÍVIDA LÍQUIDA — EMPRESA</span>
                  <b>{Number(producaoClt || 0) >= 1500000 ? "100%" : `${Math.min(100, Math.floor((compraLiquidaPaga / 260000) * 100))}%`}</b>
                </div>
                <div className="premio-v7-progress">
                  <i style={{width: `${Number(producaoClt || 0) >= 1500000 ? 100 : Math.min(100, (compraLiquidaPaga / 260000) * 100)}%`}} />
                </div>
                <small>
                  <b>{moeda(compraLiquidaPaga)}</b>
                  {Number(producaoClt || 0) >= 1500000
                    ? " • LIBERADA — sem meta mínima de Compra"
                    : ` de ${moeda(260000)} • Faltam ${moeda(Math.max(260000 - compraLiquidaPaga, 0))}`}
                </small>
              </article>
            ) : ehRaissa ? (
              <article className="premio-v7-goal">
                {(() => {
                  const totalRaissa = compraLiquidaPaga + cltParcelasPagas;
                  const metaRaissa = 500000;
                  const percentualRaissa = Math.min(100, Math.floor((totalRaissa / metaRaissa) * 100));
                  const faltanteRaissa = Math.max(metaRaissa - totalRaissa, 0);
                  return (
                    <>
                      <div>
                        <span>🎯 Meta Supervisão — Raissa</span>
                        <b>{percentualRaissa}%</b>
                      </div>
                      <div className="premio-v7-progress"><i style={{width: `${percentualRaissa}%`}} /></div>
                      <small>
                        <b>{moeda(totalRaissa)}</b> de {moeda(metaRaissa)}
                        {faltanteRaissa > 0 ? ` • Faltam ${moeda(faltanteRaissa)}` : " • Meta atingida"}
                      </small>
                      <small>Compra líquida {moeda(compraLiquidaPaga)} + parcelas CLT {moeda(cltParcelasPagas)}</small>
                    </>
                  );
                })()}
              </article>
            ) : (
              <article className="premio-v7-goal">
                <div>
                  <span>🎯 Meta do mês — {nomeExibido.split(" ")[0]}</span>
                  <b>{percentualVisualMeta}%</b>
                </div>
                <div className="premio-v7-progress"><i style={{width: `${percentualVisualMeta}%`}} /></div>
                <small>
                  <b>{moeda(producaoVisualMeta)}</b> de {moeda(metaVisualValor)}
                  {faltanteVisualMeta > 0 ? ` • Faltam ${moeda(faltanteVisualMeta)}` : " • Meta atingida"}
                </small>
              </article>
            )}
              <article className="premio-v7-motivation"><b>🏆</b><div><strong>Você está no<br/>caminho certo!</strong><small>Consistência gera conquistas.</small></div></article>
            </section>

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

                        competência.

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

                      <small>{contratosDigitados} proposta(s) da competência</small>

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

                      <strong>{pontos(pontosCompraPrevistos + pontosCltPrevistos)} pts</strong>

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

                      <strong>{pontos(pontosTotalPrevisto)} pts</strong>

                      <small>

                        Equivalente a {moeda(pontosTotalPrevisto)}

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
                          <th>Data digitação</th><th>Data pagamento cliente</th><th>Cliente</th><th>Produto</th>
                          <th>Valor parcela / líquido</th><th>% vendedor(a)</th><th>Valor bruto</th><th>Tabela</th>
                          <th>% comissão empresa</th><th>Valor comissão empresa</th><th>Lucro bruto empresa</th>
                          <th>Custo PA</th><th>Lucro líquido empresa</th>
                        </tr></thead>
                        <tbody>
                          {movimentosComFinanceiro.length===0 ? (
                            <tr><td colSpan={13}><div className="premio-v4-empty">Nenhum contrato encontrado para o filtro selecionado.</div></td></tr>
                          ) : movimentosComFinanceiro.map((item)=>(
                            <tr key={item.id}>
                              <td>{dataPt(item.dataDigitacao || item.data)}</td>
                              <td>{dataPt(item.dataPagamento || item.data)}</td>
                              <td><strong>{item.cliente}</strong></td>
                              <td><span className="premio-v4-product">{item.produto}</span></td>
                              <td><b>{moeda(item.produto==="CLT" ? item.valorParcelaClt : item.producaoValida)}</b></td>
                              <td>{item.produto==="CLT" ? "100%" : `${porcentagem(item.percentualVendedor ?? item.pesoTabela)}%`}</td>
                              <td>{moeda(item.valorBruto ?? item.valorContrato ?? 0)}</td>
                              <td>{item.tabela || item.descricao || "—"}</td>
                              <td className="internal-col">{item.produto==="Compra de Dívida" ? `${porcentagem(item.percentualComissaoEmpresa || 0)}%` : "—"}</td>
                              <td className="internal-col">{item.produto==="Compra de Dívida" ? moeda(item.comissaoEmpresa) : "—"}</td>
                              <td className="internal-col">{moeda(item.lucroBrutoEmpresa || 0)}</td>
                              <td>{moeda(item.custoPaRateado || 0)}</td>
                              <td><strong>{moeda(item.lucroLiquidoEmpresa || 0)}</strong></td>
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
              {abaAdmin === "liberados" && (
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
              )}
            </div>

            {abaAdmin === "liberados" && mostrarContratosSecundarios && (
              <div className="premio-v8-secondary-contracts">
                <div className="premio-v8-secondary-contracts-head">
                  <div>
                    <strong>Contratos de {nomeExibido}</strong>
                    <small>Contratos usados na formação da produção da competência.</small>
                  </div>
                  <span>{movimentosFiltrados.length} contrato(s)</span>
                </div>

                <div className="premio-v8-contract-filter">
                  <button type="button" className={filtroProduto === "todos" ? "active" : ""} onClick={() => setFiltroProduto("todos")}>Todos</button>
                  <button type="button" className={filtroProduto === "compra" ? "active" : ""} onClick={() => setFiltroProduto("compra")}>Compra de Dívida</button>
                  <button type="button" className={filtroProduto === "clt" ? "active" : ""} onClick={() => setFiltroProduto("clt")}>CLT</button>
                </div>

                {movimentosFiltrados.length === 0 ? (
                  <div className="premio-v8-secondary-empty">Nenhum contrato encontrado para esta colaboradora na competência.</div>
                ) : (
                  <div className="premio-v8-secondary-list">
                    {movimentosFiltrados.map((item) => (
                      <article key={`lib-${item.id}`}>
                        <div>
                          <strong>{item.cliente || "Cliente"}</strong>
                          <small>
                            {item.produto} • Digitação: {dataPt(item.dataDigitacao || item.data)} • Pagamento: {dataPt(item.dataPagamento || item.data)}
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



        {editarPremiacaoAberto&&(
        <div className="premio-v7-edit-award-backdrop" onMouseDown={()=>setEditarPremiacaoAberto(false)}>
          <div className="premio-v7-edit-award" onMouseDown={(e)=>e.stopPropagation()}>
            <header><div><span>CONFERÊNCIA DA PREMIAÇÃO</span><h3>Editar valor antes de liberar</h3></div><button type="button" onClick={()=>setEditarPremiacaoAberto(false)}>×</button></header>
            <article><span>Calculado pelo sistema</span><strong>{pontos(pontosTotalPrevisto)} pts</strong></article>
            <label><span>Valor conferido</span><div><input value={premiacaoManualTexto} onChange={(e)=>setPremiacaoManualTexto(e.target.value)} inputMode="decimal"/><b>pts</b></div></label>
            <p>🔒 Salvar o ajuste não libera pontos. A liberação continua somente em “Conferir e liberar”.</p>
            <footer><button type="button" onClick={()=>setEditarPremiacaoAberto(false)}>Cancelar</button><button type="button" className="save" onClick={salvarEdicaoPremiacao}>Salvar ajuste</button></footer>
          </div>
        </div>
      )}

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

                  {pontos(

                    (Number(

                      String(pontosCompraLiberar || "0").replace(",", "."),

                    ) || 0) +

                      (Number(

                        String(pontosCltLiberar || "0").replace(",", "."),

                      ) || 0),

                  )}{" "}

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
.premio-v8-global-filters{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:14px 0;padding:12px;border:1px solid #dce7f6;border-radius:14px;background:#fff}.premio-v8-global-filters label{display:flex;flex-direction:column;gap:5px}.premio-v8-global-filters label span{font-size:10px;font-weight:900;color:#60728f;text-transform:uppercase}.premio-v8-global-filters input,.premio-v8-global-filters select{min-height:39px;border:1px solid #dce5f2;border-radius:9px;padding:0 10px;background:#fff;color:#102d55;font-weight:700}@media(max-width:1100px){.premio-v8-global-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.premio-v8-global-filters{grid-template-columns:1fr}}

        /* V8.14 — Solicitar Saque é uma tela independente */
        .premio-v8-saques-panel .premio-v8-liberados-head,
        .premio-v8-saques-panel .premio-v8-liberados-actions,
        .premio-v8-saques-panel .premio-v8-secondary-contracts {
          display:none !important;
        }

        /* V8.15 — Saque sem qualquer atalho/contador de contratos */
        .premio-v8-saques-panel > .premio-v4-section-head:not(.premio-v8-saque-head) {
          display:none !important;
        }
        .premio-v8-saques-panel > button,
        .premio-v8-saques-panel > .premio-v8-liberados-head,
        .premio-v8-saques-panel > .premio-v8-liberados-actions,
        .premio-v8-saques-panel > .premio-v8-secondary-contracts {
          display:none !important;
        }

        /* V8.10 — menu principal sem duplicidade */
        .premio-v8-nav {
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        }
        @media (max-width: 1100px) {
          .premio-v8-nav {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 720px) {
          .premio-v8-nav {
            grid-template-columns: 1fr !important;
          }
        }

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
