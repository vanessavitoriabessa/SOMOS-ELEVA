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



type Folha={id:string;competencia?:string;total_dia05?:number;total_mensal?:number;pagamento_realizado?:boolean;valor_pago?:number;movimento_id?:string|null};



type Baixa={id:string;comissao_prevista?:number;valor_recebido?:number;data_prevista_recebimento?:string|null};



type Usuario = { id: string; nome?: string; cargo?: string; ativo?: boolean };







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



      supabase.from("usuarios").select("id,nome,cargo,ativo"),



      supabase.from("folha_pagamentos").select("id,competencia,total_dia05,total_mensal,pagamento_realizado,valor_pago,movimento_id"),



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



    const mesCompra = deslocarMes(competencia, -1);



    const mes3RN = deslocarMes(competencia, -2);







    const compra = notas



      .filter(x =>



        normalizar(x.produto) === normalizar("Compra de Dívida") &&



        !normalizar(x.fornecedor).includes("3rn") &&



        mesDaData(x.referencia_inicio || x.data_solicitacao) === mesCompra



      )



      .reduce((t, x) => t + Number(x.valor_nota || 0), 0);







    const rn = notas



      .filter(x =>



        normalizar(x.fornecedor).includes("3rn") &&



        mesDaData(x.referencia_inicio || x.data_solicitacao) === mes3RN



      )



      .reduce((t, x) => t + Number(x.valor_nota || 0), 0);







    const comissaoRecebida=compra+rn;



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



    const sm=simples.filter(x=>String(x.competencia||"").slice(0,7)===competencia),spm=simplesParcelas.filter(x=>mesDaData(x.vencimento)===competencia);



    const simplesPagos=sm.filter(x=>normalizar(x.status)==="pago").reduce((t,x)=>t+Number(x.valor_imposto||0),0)+spm.filter(x=>normalizar(x.status)==="pago").reduce((t,x)=>t+Number(x.valor||0),0);



    const simplesPendentes=sm.filter(x=>normalizar(x.status)!=="pago").reduce((t,x)=>t+Number(x.valor_imposto||0),0)+spm.filter(x=>normalizar(x.status)!=="pago").reduce((t,x)=>t+Number(x.valor||0),0);



    // IR das notas: entra somente quando estiver lançado na competência.
    // Sem lançamento, o total é R$ 0,00.
    const irNotas=notas
      .filter(x=>mesDaData(x.referencia_inicio||x.data_solicitacao)===competencia)
      .reduce((t,x)=>t+Number(x.valor_ir||0),0);

    const fm=folhas.filter(x=>String(x.competencia||"").slice(0,7)===competencia);



    const folhaPaga=fm.filter(x=>x.pagamento_realizado).reduce((t,x)=>t+Number(x.valor_pago||0),0);



    const folhaPendente=fm.filter(x=>!x.pagamento_realizado).reduce((t,x)=>t+Number(x.total_dia05||x.total_mensal||0),0);



    const idsFixas=new Set(pagFixas.map(x=>String(x.movimento_id||"")).filter(Boolean)),idsFolha=new Set(fm.map(x=>String(x.movimento_id||"")).filter(Boolean));



    const ctl=new Set(["imposto","impostos","parcelamento","parcelamentos","premiacao","premiacoes","folha de pagamento"]);



    const outras=movimentos.filter(x=>x.tipo==="Saída"&&(dataDe||dataAte?dentroPeriodo(x.data,dataDe,dataAte):mesDaData(x.data)===competencia)&&!idsFixas.has(String(x.id||""))&&!idsFolha.has(String(x.id||""))&&!ctl.has(normalizar(x.categoria))).reduce((t,x)=>t+Number(x.valor||0),0);



    const encargosTotal=em.reduce((t,x)=>t+Number(x.valor||0),0)+ep.reduce((t,x)=>t+Number(x.valor||0),0);
    const simplesTotal=sm.reduce((t,x)=>t+Number(x.valor_imposto||0),0)+spm.reduce((t,x)=>t+Number(x.valor||0),0);
    const premiacoesTotal=pm.filter(x=>normalizar(x.status)!=="recusado").reduce((t,x)=>t+Number(x.valor_reais||x.pontos_solicitados||0),0);
    const folhaTotal=fm.reduce((t,x)=>t+Number(x.total_dia05||x.total_mensal||x.valor_pago||0),0);

    // Fechamento total da competência: pago ou pendente entra do mesmo jeito.
    const despesaBruta=fixasTotal+irNotas+simplesTotal+encargosTotal+folhaTotal+premiacoesTotal;
    const lucroBruto=comissaoRecebida,lucroLiquido=lucroBruto-despesaBruta;
    const vendedores=usuarios.filter(x=>x.ativo!==false&&ehVendedora(x.cargo));
    const custoPA=vendedores.length?despesaBruta/vendedores.length:0;

    return{
      mesCompra,mes3RN,compra,rn,comissaoRecebida,comissaoReceber,
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



      <section className="rf-head">



        <div>



          <span>RELATÓRIOS FINANCEIROS</span>



          <h2>Resultado mensal da empresa</h2>



          <p>Fechamento usa despesas fixas e somente os lançamentos existentes da competência; se não foi lançado, fica R$ 0,00.</p>



        </div>



        <div className="rf-periodo">



          <label>DATA COMPETÊNCIA<input type="month" value={competencia} onChange={e=>setCompetencia(e.target.value)} /></label>

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



        <article className={`rf-metric ${d.lucroLiquido<0?"negative":"positive"}`}><span>Lucro líquido empresa</span><strong>{moeda(d.lucroLiquido)}</strong><small>Lucro bruto − todas as despesas</small></article>



      </section>



      <section className="rf-status-cards">



        {[



          ["Despesas fixas — total",d.fixasTotal,"Total da competência",""],



          ["Despesas fixas pagas",d.fixasPagas,"Valores já quitados","positive"],



          ["Despesas fixas pendentes",d.fixasPendentes,"Valores ainda em aberto","negative"],
          ["Imposto de Renda lançado",d.irNotas,"Somente IR lançado nas notas da competência",d.irNotas>0?"":"negative"],



          ["Premiações pagas",d.premiacoesPagas,"Saques finalizados","positive"],



          ["Premiações pendentes",d.premiacoesPendentes,"Solicitadas e ainda não pagas","negative"],



          ["INSS / FGTS / parcelamentos pagos",d.encargosPagos,"Encargos já pagos","positive"],



          ["INSS / FGTS / parcelamentos pendentes",d.encargosPendentes,"Encargos em aberto","negative"],



          ["Simples Nacional / parcelamento pagos",d.simplesPagos,"Imposto e parcelas já pagos","positive"],



          ["Simples Nacional / parcelamento pendentes",d.simplesPendentes,"Imposto e parcelas em aberto","negative"],



          ["Folha de pagamento paga",d.folhaPaga,"Folhas marcadas como pagas","positive"],



          ["Folha de pagamento pendente",d.folhaPendente,"Folhas ainda não pagas","negative"],



          ["Custo por PA",d.custoPA,`${d.vendedores.length} vendedora(s) ativa(s) no rateio`,""]



        ].map(([titulo,valor,sub,classe])=><article className={`rf-metric ${classe}`} key={String(titulo)}><span>{titulo}</span><strong>{moeda(Number(valor))}</strong><small>{sub}</small></article>)}



      </section>



      <section className="rf-summary">



        <div><span>Compra de Dívida — mês anterior</span><strong>{moeda(d.compra)}</strong><small>{nomeMes(d.mesCompra)}</small></div>



        <div><span>3RN — mês retrasado</span><strong>{moeda(d.rn)}</strong><small>{nomeMes(d.mes3RN)}</small></div>



        <div><span>Despesa bruta da competência</span><strong>{moeda(d.despesaBruta)}</strong><small>Fechamento total — pago ou pendente</small></div>



      </section>



      <section className="rf-grid">



        <article className="rf-card">



          <header>



            <span>FORMAÇÃO DO LUCRO BRUTO</span>



            <h3>Notas consideradas</h3>



          </header>



          <div className="rf-bars">



            <div className="rf-row">



              <div><strong>Compra de Dívida — {nomeMes(d.mesCompra)}</strong><small>{moeda(d.compra)}</small></div>



            </div>



            <div className="rf-row">



              <div><strong>3RN — {nomeMes(d.mes3RN)}</strong><small>{moeda(d.rn)}</small></div>



            </div>



            <div className="rf-row">



              <div><strong>Lucro bruto</strong><small>{moeda(d.lucroBruto)}</small></div>



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