"use client";



import { useEffect, useMemo, useState } from "react";



import { createClient } from "@/lib/supabase/client";



import "./relatorios-financeiros.css";



type Movimento = { id?: string; tipo?: "Entrada" | "Saída"; categoria?: string; valor?: number; data?: string };



type Fixa = { id: string; valor?: number; inicio_competencia?: string; fim_competencia?: string | null; ativo?: boolean };



type PagFixa = { id:string; competencia?:string; movimento_id?:string|null; valor_pago?:number };



type Premiacao = { id:string; pontos_solicitados?:number; valor_reais?:number; status?:string; processado_em?:string|null; solicitado_em?:string|null };



type Nota = { id: string; produto?: string; fornecedor?: string; valor_nota?: number; valor_ir?: number; referencia_inicio?: string | null; data_solicitacao?: string | null };



type Simples = { id:string; competencia?:string; valor_imposto?:number; status?:string };



type Parcela = { id:string; valor?:number; vencimento?:string; status?:string };



type InssFgts = { id:string; tipo?:string; competencia?:string; valor?:number; status?:string };



type Folha={id:string;competencia?:string;salario?:number;assiduidade_ativa?:boolean;valor_assiduidade?:number;total_dia05?:number;total_mensal?:number;pagamento_realizado?:boolean;valor_pago?:number;movimento_id?:string|null};



type Baixa={id:string;comissao_prevista?:number;valor_recebido?:number;data_prevista_recebimento?:string|null};



type Usuario = { id: string; nome?: string; cargo?: string; perfil?: string; ativo?: boolean };



const moeda = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });



const agora = new Date();



const competenciaAtual = () => `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;



function normalizar(v?: string | null) {



  return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();



}



function mesDaData(v?: string | null) { return String(v || "").slice(0, 7); }



function dentroPeriodo(v?:string|null,de?:string,ate?:string){const d=String(v||"").slice(0,10);if(!d)return false;return (!de||d>=de)&&(!ate||d<=ate)}



function deslocarMes(comp: string, delta: number) {



  const [a, m] = comp.split("-").map(Number);



  const d = new Date(a, m - 1 + delta, 1, 12);



  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;



}



function nomeMes(comp: string) {



  const [a, m] = comp.split("-").map(Number);



  return new Date(a, m - 1, 1, 12).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });



}



function ehVendedora(cargo?: string | null) {



  const c = normalizar(cargo);



  return c.includes("consultor") ||



         c.includes("vendedor") ||



         c === "vendas" ||



         c === "comercial";



}



export default function RelatoriosFinanceiros() {



  const supabase = useMemo(() => createClient(), []);



  const [competencia, setCompetencia] = useState(competenciaAtual());



 const [dataDe,setDataDe]=useState("");



 const [dataAte,setDataAte]=useState("");



  const [movimentos, setMovimentos] = useState<Movimento[]>([]);



  const [fixas, setFixas] = useState<Fixa[]>([]);



  const [pagFixas, setPagFixas] = useState<PagFixa[]>([]);



  const [premiacoes, setPremiacoes] = useState<Premiacao[]>([]);



  const [notas, setNotas] = useState<Nota[]>([]);



  const [simples, setSimples] = useState<Simples[]>([]);



  const [simplesParcelas, setSimplesParcelas] = useState<Parcela[]>([]);



  const [inssFgts, setInssFgts] = useState<InssFgts[]>([]);



  const [inssParcelas, setInssParcelas] = useState<Parcela[]>([]);



  const [usuarios, setUsuarios] = useState<Usuario[]>([]);



  const [folhas,setFolhas]=useState<Folha[]>([]);



  const [baixas,setBaixas]=useState<Baixa[]>([]);



  const [carregando, setCarregando] = useState(true);



  const [mensagem, setMensagem] = useState("");



  async function carregar() {



    setCarregando(true);



    setMensagem("");



    const [m,f,pf,p,n,s,sp,i,ip,u,fo,b] = await Promise.all([



      supabase.from("movimentos_financeiros").select("id,tipo,categoria,valor,data"),



      supabase.from("despesas_recorrentes").select("id,valor,inicio_competencia,fim_competencia,ativo"),



      supabase.from("despesas_recorrentes_pagamentos").select("id,competencia,movimento_id,valor_pago"),



      supabase.from("pontos_saques").select("id,pontos_solicitados,valor_reais,status,processado_em,solicitado_em"),



      supabase.from("controle_notas_fiscais").select("id,produto,fornecedor,valor_nota,valor_ir,referencia_inicio,data_solicitacao"),



      supabase.from("controle_simples_nacional").select("id,competencia,valor_imposto,status"),



      supabase.from("simples_parcelas").select("id,valor,vencimento,status"),



      supabase.from("controle_inss_fgts").select("id,tipo,competencia,valor,status"),



      supabase.from("inss_parcelas").select("id,valor,vencimento,status"),



      supabase.from("profiles").select("id,nome,perfil,ativo"),



      supabase.from("folha_pagamentos").select("id,competencia,salario,assiduidade_ativa,valor_assiduidade,total_dia05,total_mensal,pagamento_realizado,valor_pago,movimento_id"),



      supabase.from("baixas_pagamentos").select("id,comissao_prevista,valor_recebido,data_prevista_recebimento"),



    ]);



    const erro = m.error || f.error || pf.error || p.error || n.error || s.error || sp.error || i.error || ip.error || u.error || fo.error || b.error;



    if (erro) {



      setMensagem(erro.message || "Erro ao carregar o relatório.");



      setCarregando(false);



      return;



    }



    setMovimentos((m.data || []) as Movimento[]);



    setFixas((f.data || []) as Fixa[]);



    setPagFixas((pf.data || []) as PagFixa[]);



    setPremiacoes((p.data || []) as Premiacao[]);



    setNotas((n.data || []) as Nota[]);



    setSimples((s.data || []) as Simples[]);



    setSimplesParcelas((sp.data || []) as Parcela[]);



    setInssFgts((i.data || []) as InssFgts[]);



    setInssParcelas((ip.data || []) as Parcela[]);



    setUsuarios((u.data || []) as Usuario[]);



    setFolhas((fo.data||[]) as Folha[]);



    setBaixas((b.data||[]) as Baixa[]);



    setCarregando(false);



  }



  useEffect(() => { void carregar(); }, []);



  const d = useMemo(() => {



    const mesLucro = deslocarMes(competencia, -1);

    const valorNotasPorFornecedor = (match: (fornecedorNormalizado: string, nota: Nota) => boolean) =>
      notas
        .filter((x) => {
          const fornecedor = normalizar(x.fornecedor);
          return (
            match(fornecedor, x) &&
            mesDaData(x.referencia_inicio || x.data_solicitacao) === mesLucro
          );
        })
        .reduce((t, x) => t + Number(x.valor_nota || 0), 0);

    const lucroNotas = [
      {
        nome: "NEO",
        valor: valorNotasPorFornecedor(
          (fornecedor, nota) =>
            fornecedor.includes("neo") ||
            (normalizar(nota.produto) === normalizar("Compra de Dívida") &&
              !fornecedor.includes("3rn") &&
              !fornecedor.includes("c6") &&
              !fornecedor.includes("futuro") &&
              !fornecedor.includes("amigoz") &&
              !fornecedor.includes("finanbank"))
        ),
      },
      {
        nome: "3RN",
        valor: valorNotasPorFornecedor(
          (fornecedor) => fornecedor === "3rn"
        ),
      },
      {
        nome: "C6-PARCEIRO 3RN",
        valor: valorNotasPorFornecedor(
          (fornecedor) => fornecedor.includes("c6") && fornecedor.includes("3rn")
        ),
      },
      {
        nome: "FUTURO-FINANBANK",
        valor: valorNotasPorFornecedor(
          (fornecedor) => fornecedor.includes("futuro") && fornecedor.includes("finanbank")
        ),
      },
      {
        nome: "AMIGOZ-FINANBANK",
        valor: valorNotasPorFornecedor(
          (fornecedor) => fornecedor.includes("amigoz") && fornecedor.includes("finanbank")
        ),
      },
    ];

    const compra = lucroNotas.find((item) => item.nome === "NEO")?.valor || 0;
    const rn = lucroNotas.find((item) => item.nome === "3RN")?.valor || 0;

    const comissaoRecebida=lucroNotas.reduce((t,item)=>t+item.valor,0);



    const comissaoReceber=baixas.filter(x=>mesDaData(x.data_prevista_recebimento)===competencia).reduce((t,x)=>t+Math.max(Number(x.comissao_prevista||0)-Number(x.valor_recebido||0),0),0);



    const fixasMes=fixas.filter(x=>x.ativo&&competencia>=String(x.inicio_competencia||"0000-00")&&(!x.fim_competencia||competencia<=x.fim_competencia));



    const fixasTotal=fixasMes.reduce((t,x)=>t+Number(x.valor||0),0);



    const fixasPagas=pagFixas.filter(x=>String(x.competencia||"").slice(0,7)===competencia).reduce((t,x)=>t+Number(x.valor_pago||0),0);



    const fixasPendentes=Math.max(fixasTotal-fixasPagas,0);



    const pm=premiacoes.filter(x=>dataDe||dataAte?dentroPeriodo(x.processado_em||x.solicitado_em,dataDe,dataAte):mesDaData(x.processado_em||x.solicitado_em)===competencia);



    const premiacoesPagas=pm.filter(x=>normalizar(x.status)==="pago").reduce((t,x)=>t+Number(x.valor_reais||x.pontos_solicitados||0),0);



    const premiacoesPendentes=pm.filter(x=>!["pago","recusado"].includes(normalizar(x.status))).reduce((t,x)=>t+Number(x.valor_reais||x.pontos_solicitados||0),0);



    const em=inssFgts.filter(x=>String(x.competencia||"").slice(0,7)===competencia);



    const ep=inssParcelas.filter(x=>mesDaData(x.vencimento)===competencia);



    const encargosPagos=em.filter(x=>normalizar(x.status)==="pago").reduce((t,x)=>t+Number(x.valor||0),0)+ep.filter(x=>normalizar(x.status)==="pago").reduce((t,x)=>t+Number(x.valor||0),0);



    const encargosPendentes=em.filter(x=>normalizar(x.status)!=="pago").reduce((t,x)=>t+Number(x.valor||0),0)+ep.filter(x=>normalizar(x.status)!=="pago").reduce((t,x)=>t+Number(x.valor||0),0);



    const competenciaSimples = deslocarMes(competencia, -1);

    const sm = simples.filter(
      x => String(x.competencia || "").slice(0, 7) === competenciaSimples
    );

    const impostoSimplesTotal = sm.reduce(
      (t, x) => t + Number(x.valor_imposto || 0),
      0
    );

    const impostoSimplesPago = sm
      .filter(x => normalizar(x.status) === "pago")
      .reduce((t, x) => t + Number(x.valor_imposto || 0), 0);

    const impostoSimplesPendente = sm
      .filter(x => normalizar(x.status) !== "pago")
      .reduce((t, x) => t + Number(x.valor_imposto || 0), 0);

    const parcelamentoSimplesMensal = 370;

    const simplesPagos = impostoSimplesPago;

    const simplesPendentes =
      impostoSimplesPendente + parcelamentoSimplesMensal;

    // IR das notas: entra somente quando estiver lançado na competência.



    // Sem lançamento, o total é R$ 0,00.



    const irNotas=notas



      .filter(x=>mesDaData(x.referencia_inicio||x.data_solicitacao)===competencia)



      .reduce((t,x)=>t+Number(x.valor_ir||0),0);



    const fm=folhas.filter(x=>String(x.competencia||"").slice(0,7)===competencia);



    const valorFolhaBruto=(x:any)=>
      Number(x.salario||0)+Number(x.assiduidade_ativa?x.valor_assiduidade||0:0);



    const folhaPaga=fm.filter(x=>x.pagamento_realizado).reduce((t,x)=>t+valorFolhaBruto(x),0);



    const folhaPendente=fm.filter(x=>!x.pagamento_realizado).reduce((t,x)=>t+valorFolhaBruto(x),0);



    const idsFixas=new Set(pagFixas.map(x=>String(x.movimento_id||"")).filter(Boolean)),idsFolha=new Set(fm.map(x=>String(x.movimento_id||"")).filter(Boolean));



    const ctl=new Set(["imposto","impostos","parcelamento","parcelamentos","premiacao","premiacoes","folha de pagamento"]);



    const outras=movimentos.filter(x=>x.tipo==="Saída"&&(dataDe||dataAte?dentroPeriodo(x.data,dataDe,dataAte):mesDaData(x.data)===competencia)&&!idsFixas.has(String(x.id||""))&&!idsFolha.has(String(x.id||""))&&!ctl.has(normalizar(x.categoria))).reduce((t,x)=>t+Number(x.valor||0),0);



    const encargosTotal=em.reduce((t,x)=>t+Number(x.valor||0),0)+ep.reduce((t,x)=>t+Number(x.valor||0),0);



    const simplesTotal =
      impostoSimplesTotal +
      parcelamentoSimplesMensal;



    const premiacoesTotal=pm.filter(x=>normalizar(x.status)!=="recusado").reduce((t,x)=>t+Number(x.valor_reais||x.pontos_solicitados||0),0);



    const folhaTotal=fm.reduce((t,x)=>t+valorFolhaBruto(x),0);



    // Fechamento total da competência: pago ou pendente entra do mesmo jeito.



    const despesaBruta=fixasTotal+irNotas+simplesTotal+encargosTotal+folhaTotal+premiacoesTotal;



    const lucroBruto=comissaoRecebida,lucroLiquido=lucroBruto-despesaBruta;



    const vendedores=usuarios.filter(x=>x.ativo!==false&&ehVendedora(x.cargo || x.perfil));



    const custoPA=vendedores.length?despesaBruta/vendedores.length:0;



    return{



      mesLucro,lucroNotas,compra,rn,comissaoRecebida,comissaoReceber,



      fixasTotal,fixasPagas,fixasPendentes,irNotas,



      premiacoesPagas,premiacoesPendentes,premiacoesTotal,



      encargosPagos,encargosPendentes,encargosTotal,



      simplesPagos,simplesPendentes,simplesTotal,



      folhaPaga,folhaPendente,folhaTotal,



      outras,despesaBruta,lucroBruto,lucroLiquido,vendedores,custoPA,



      composicao:[



        ["Despesas fixas",fixasTotal],



        ["Imposto de Renda das notas",irNotas],



        ["Simples Nacional mensal + parcelamentos",simplesTotal],



        ["INSS / FGTS + parcelamentos",encargosTotal],



        ["Folha de pagamento",folhaTotal],



        ["Premiações",premiacoesTotal]



      ] as Array<[string,number]>



    };



  }, [competencia,dataDe,dataAte,movimentos,fixas,pagFixas,premiacoes,notas,simples,simplesParcelas,inssFgts,inssParcelas,usuarios,folhas,baixas]);



  return (



    <div className="rf-page">

        <style jsx global>{`

          .rf-status-cards{

            display:grid;

            grid-template-columns:repeat(5,minmax(0,1fr));

            gap:14px;

            align-items:start;

          }



          .rf-status-column{

            display:flex;

            flex-direction:column;

            gap:10px;

            min-width:0;

          }



          .rf-status-column-title{

            margin:0 0 2px;

            color:#0f2d55;

            font-size:11px;

            font-weight:900;

            letter-spacing:.08em;

            text-transform:uppercase;

          }



          .rf-status-cards .rf-metric{

            min-height:104px;

          }



          .rf-total-card{

            background:#fff!important;

            border-color:#dce6f4!important;

          }



          .rf-paid-card{

            background:#eaf8ee!important;

            border-color:#bfe8cc!important;

          }



          .rf-pending-card{

            background:#fdeeee!important;

            border-color:#f2c7c7!important;

          }



          .rf-pa-card{

            grid-column:1/-1;

            background:#fff6cf!important;

            border-color:#ecd071!important;

          }



          .rf-total-card span,

          .rf-total-card strong,

          .rf-total-card small,

          .rf-paid-card span,

          .rf-paid-card strong,

          .rf-paid-card small,

          .rf-pending-card span,

          .rf-pending-card strong,

          .rf-pending-card small,

          .rf-pa-card span,

          .rf-pa-card strong,

          .rf-pa-card small{

            color:#111827!important;

          }



          .rf-pa-card strong{

            font-weight:900!important;

          }



          @media(max-width:1300px){

            .rf-status-cards{grid-template-columns:repeat(3,minmax(0,1fr));}

          }



          @media(max-width:900px){

            .rf-status-cards{grid-template-columns:repeat(2,minmax(0,1fr));}

          }



          @media(max-width:650px){

            .rf-status-cards{grid-template-columns:1fr;}

          }



          .rf-main-cards{
            grid-template-columns:repeat(5,minmax(0,1fr))!important;
            align-items:stretch!important;
          }

          .rf-despesa-bruta-card{
            background:#fdeeee!important;
            border-color:#f2c7c7!important;
          }

          .rf-despesa-bruta-card span,
          .rf-despesa-bruta-card strong,
          .rf-despesa-bruta-card small{
            color:#111827!important;
          }

          .rf-lucro-liquido-main-card{
            min-height:118px!important;
            padding:20px!important;
          }

          .rf-lucro-liquido-main-card span{
            font-size:12px!important;
            letter-spacing:.05em!important;
          }

          .rf-lucro-liquido-main-card strong{
            font-size:25px!important;
            font-weight:900!important;
          }

          @media(max-width:1450px){
            .rf-main-cards{grid-template-columns:repeat(3,minmax(0,1fr))!important;}
          }

          @media(max-width:900px){
            .rf-main-cards{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
          }

          @media(max-width:650px){
            .rf-main-cards{grid-template-columns:1fr!important;}
          }

          .rf-highlight-result{
            margin-top:10px;
            padding:14px 16px!important;
            border:1px solid #dce3ee!important;
            border-radius:14px!important;
            background:#f3f6fa!important;
          }

          .rf-highlight-result strong{
            color:#0f2d55!important;
            font-weight:900!important;
            text-transform:uppercase;
          }

          .rf-highlight-result small{
            color:#0f2d55!important;
            font-size:16px!important;
            font-weight:900!important;
          }

        `}</style>





      <section className="rf-head">



        <div>



          <span>RELATÓRIOS FINANCEIROS</span>



          <h2>Resultado mensal da empresa</h2>



          <p>Fechamento usa despesas fixas e somente os lançamentos existentes da competência; se não foi lançado, fica R$ 0,00.</p>



        </div>



        <div className="rf-periodo">



          <label>DATA REFERÊNCIA<input type="month" value={competencia} onChange={e=>setCompetencia(e.target.value)} /></label>



           <label>DE<input type="date" value={dataDe} onChange={e=>setDataDe(e.target.value)} /></label>



           <label>ATÉ<input type="date" min={dataDe||undefined} value={dataAte} onChange={e=>setDataAte(e.target.value)} /></label>



          <button type="button" onClick={() => void carregar()} disabled={carregando}>



            {carregando ? "Atualizando..." : "Atualizar"}



          </button>



        </div>



      </section>



      {mensagem && <div className="rf-message">{mensagem}</div>}



      <section className="rf-main-cards">



        <article className="rf-metric positive"><span>Total comissão recebida</span><strong>{moeda(d.comissaoRecebida)}</strong><small>Controle de Notas: Compra de Dívida + 3RN</small></article>



        <article className="rf-metric"><span>Comissão a receber</span><strong>{moeda(d.comissaoReceber)}</strong><small>Comissões previstas ainda pendentes</small></article>



        <article className="rf-metric positive"><span>Lucro bruto empresa</span><strong>{moeda(d.lucroBruto)}</strong><small>Total de comissão recebida</small></article>



        <article className="rf-metric rf-despesa-bruta-card"><span>Despesas bruta</span><strong>{moeda(d.despesaBruta)}</strong><small>Pago ou pendente</small></article>



        <article className={`rf-metric rf-lucro-liquido-main-card ${d.lucroLiquido<0?"negative":"positive"}`}><span>LUCRO LÍQUIDO EMPRESA</span><strong>{moeda(d.lucroLiquido)}</strong><small>Lucro bruto − todas as despesas</small></article>



      </section>



      <section className="rf-status-cards">



        <div className="rf-status-column">

          <h3 className="rf-status-column-title">Despesas Fixas</h3>



          <article className="rf-metric rf-total-card">

            <span>Total</span>

            <strong>{moeda(d.fixasTotal)}</strong>

            <small>Total da competência</small>

          </article>



          <article className="rf-metric rf-pending-card">

            <span>Pendentes</span>

            <strong>{moeda(d.fixasPendentes)}</strong>

            <small>Valores em aberto</small>

          </article>



          <article className="rf-metric rf-paid-card">

            <span>Pagas</span>

            <strong>{moeda(d.fixasPagas)}</strong>

            <small>Valores já quitados</small>

          </article>

        </div>



        <div className="rf-status-column">

          <h3 className="rf-status-column-title">Premiações</h3>



          <article className="rf-metric rf-total-card">

            <span>Total</span>

            <strong>{moeda(d.premiacoesTotal)}</strong>

            <small>Pagas + pendentes</small>

          </article>



          <article className="rf-metric rf-pending-card">

            <span>Pendentes</span>

            <strong>{moeda(d.premiacoesPendentes)}</strong>

            <small>Solicitadas e ainda não pagas</small>

          </article>



          <article className="rf-metric rf-paid-card">

            <span>Pagas</span>

            <strong>{moeda(d.premiacoesPagas)}</strong>

            <small>Saques finalizados</small>

          </article>

        </div>



        <div className="rf-status-column">

          <h3 className="rf-status-column-title">INSS / FGTS / Parcelamentos</h3>



          <article className="rf-metric rf-total-card">

            <span>Total</span>

            <strong>{moeda(d.encargosTotal)}</strong>

            <small>Encargos pagos + pendentes</small>

          </article>



          <article className="rf-metric rf-pending-card">

            <span>Pendentes</span>

            <strong>{moeda(d.encargosPendentes)}</strong>

            <small>Encargos em aberto</small>

          </article>



          <article className="rf-metric rf-paid-card">

            <span>Pagos</span>

            <strong>{moeda(d.encargosPagos)}</strong>

            <small>Encargos já pagos</small>

          </article>

        </div>



        <div className="rf-status-column">

          <h3 className="rf-status-column-title">Simples Nacional / Parcelamentos</h3>



          <article className="rf-metric rf-total-card">

            <span>Total</span>

            <strong>{moeda(d.simplesTotal)}</strong>

            <small>Imposto + parcelas</small>

          </article>



          <article className="rf-metric rf-pending-card">

            <span>Pendentes</span>

            <strong>{moeda(d.simplesPendentes)}</strong>

            <small>Imposto e parcelas em aberto</small>

          </article>



          <article className="rf-metric rf-paid-card">

            <span>Pagos</span>

            <strong>{moeda(d.simplesPagos)}</strong>

            <small>Imposto e parcelas já pagos</small>

          </article>

        </div>



        <div className="rf-status-column">

          <h3 className="rf-status-column-title">Folha de Pagamento</h3>



          <article className="rf-metric rf-total-card">

            <span>Total</span>

            <strong>{moeda(d.folhaTotal)}</strong>

            <small>Folhas pagas + pendentes</small>

          </article>



          <article className="rf-metric rf-pending-card">

            <span>Pendentes</span>

            <strong>{moeda(d.folhaPendente)}</strong>

            <small>Folhas ainda não pagas</small>

          </article>



          <article className="rf-metric rf-paid-card">

            <span>Pagas</span>

            <strong>{moeda(d.folhaPaga)}</strong>

            <small>Folhas marcadas como pagas</small>

          </article>

        </div>



        <article className="rf-metric rf-pa-card">

          <span>Custo por Operador</span>

          <strong>{moeda(d.custoPA)}</strong>

          <small>{d.vendedores.length} vendedora(s) ativa(s) no rateio</small>

        </article>



      </section>



      <section className="rf-summary">

        {d.lucroNotas.map((item) => (
          <div key={item.nome}>
            <span>{item.nome} — mês passado</span>
            <strong>{moeda(item.valor)}</strong>
            <small>{nomeMes(d.mesLucro)}</small>
          </div>
        ))}

      </section>



      <section className="rf-grid">



        <article className="rf-card">



          <header>



            <span>FORMAÇÃO DO LUCRO BRUTO</span>



            <h3>Notas consideradas</h3>



          </header>



          <div className="rf-bars">

            {d.lucroNotas.map((item) => (
              <div className="rf-row" key={item.nome}>
                <div>
                  <strong>{item.nome} — {nomeMes(d.mesLucro)}</strong>
                  <small>{moeda(item.valor)}</small>
                </div>
              </div>
            ))}

            <div className="rf-row rf-highlight-result">
              <div><strong>LUCRO BRUTO</strong><small>{moeda(d.lucroBruto)}</small></div>
            </div>

          </div>



        </article>



        <article className="rf-card">



          <header>



            <span>DESPESA BRUTA</span>



            <h3>Composição do custo mensal</h3>



          </header>



          <div className="rf-bars">



            {d.composicao.map(([nome, valor]) => (

              <div className="rf-row" key={nome}>
                <div><strong>{nome}</strong><small>{moeda(valor)}</small></div>
              </div>

            ))}

            <div className="rf-row rf-highlight-result">
              <div>
                <strong>RESULTADO DE DESPESA BRUTA</strong>
                <small>{moeda(d.despesaBruta)}</small>
              </div>
            </div>

          </div>



        </article>



      </section>



      <section className="rf-result">



        <div>



          <span>FECHAMENTO DA COMPETÊNCIA</span>



          <h3>{d.lucroLiquido >= 0 ? "Lucro líquido positivo" : "Lucro líquido negativo"}</h3>



          <p>



            {moeda(d.lucroBruto)} de lucro bruto − {moeda(d.despesaBruta)} de despesa bruta.



            Custo por PA: {moeda(d.custoPA)}.



          </p>



        </div>



        <strong className={d.lucroLiquido < 0 ? "negative-text" : "positive-text"}>



          {moeda(d.lucroLiquido)}



        </strong>



      </section>



    </div>



  );



}