"use client";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import "./coordenacao.css";

type Periodo="Hoje"|"Semana"|"Mês"|"Personalizado";
type Produto="Todos"|"Compra de Dívida"|"CLT";
type Item={id:string;nome:string;contratos:number;producaoCompra:number|null;producaoClt:number|null;producao:number|null};
type Resp={contratosPagos:number;consultoras:number;ranking:Item[]};
type PropostaOp={id:string;numeroProposta?:string;cliente?:string;nome?:string;cpf?:string;status:string;vendedora?:string;consultora?:string;dataCadastro?:string;dataPagamento?:string;criadoEm?:string;atualizadoEm?:string};
type BaixaFinanceira={produto?:string;comissao_prevista?:number;valor_recebido?:number;data_pagamento_proposta?:string;data_prevista_recebimento?:string;data_recebimento?:string|null};
type MovimentoFinanceiro={tipo?:"Entrada"|"Saída";produto?:string;valor?:number;data?:string};
type FolhaFinanceira={competencia?:string;assiduidade_ativa?:boolean;valor_assiduidade?:number;total_dia05?:number};
type ComissaoFinanceira={competencia?:string;comissao_compra_divida?:number;comissao_clt?:number;total_comissao?:number;data_pagamento?:string|null};
type ColaboradoraRHCoord={id?:string;status?:string};
type RegistroRHCoord={id?:string;tipo?:string;data?:string;competencia?:string};
type SetorFechamento="Supervisão"|"Qualidade"|"Operacional"|"Financeiro"|"RH";
type StatusFechamento="Pendente"|"Concluído"|"Com pendência";
type FechamentoCoord={
  id?:string;
  data:string;
  setor:SetorFechamento;
  status:StatusFechamento;
  responsavel_id?:string|null;
  responsavel_nome?:string;
  observacao?:string;
  horario?:string|null;
};



const brl=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmt=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function faixa(p:Exclude<Periodo,"Personalizado">){const n=new Date();if(p==="Hoje"){const h=fmt(n);return[h,h]}if(p==="Semana"){const i=new Date(n),x=i.getDay();i.setDate(i.getDate()+(x===0?-6:1-x));return[fmt(i),fmt(n)]}return[fmt(new Date(n.getFullYear(),n.getMonth(),1)),fmt(new Date(n.getFullYear(),n.getMonth()+1,0))]}

export default function CoordenacaoGeral(){
 const supabase=useMemo(()=>createClient(),[]);
 const [inicioMes,fimMes]=faixa("Mês");
 const [periodo,setPeriodo]=useState<Periodo>("Hoje");
 const [produto,setProduto]=useState<Produto>("Todos");
 const [consultora,setConsultora]=useState("Todos");
 const [dataInicial,setDataInicial]=useState(inicioMes);
 const [dataFinal,setDataFinal]=useState(fimMes);
 const [dados,setDados]=useState<Resp|null>(null),[propostas,setPropostas]=useState<PropostaOp[]>([]);
 const [baixas,setBaixas]=useState<BaixaFinanceira[]>([]),[movimentos,setMovimentos]=useState<MovimentoFinanceiro[]>([]),[folhas,setFolhas]=useState<FolhaFinanceira[]>([]),[comissoes,setComissoes]=useState<ComissaoFinanceira[]>([]);
 const [colaboradorasRH,setColaboradorasRH]=useState<ColaboradoraRHCoord[]>([]),[registrosRH,setRegistrosRH]=useState<RegistroRHCoord[]>([]);
 const [loading,setLoading]=useState(false),[erro,setErro]=useState("");
 const [fechamentos,setFechamentos]=useState<FechamentoCoord[]>([]);
 const [setorAberto,setSetorAberto]=useState<SetorFechamento|null>(null);
 const [statusFechamento,setStatusFechamento]=useState<StatusFechamento>("Pendente");
 const [observacaoFechamento,setObservacaoFechamento]=useState("");
 const [salvandoFechamento,setSalvandoFechamento]=useState(false);
 const [erroFechamento,setErroFechamento]=useState("");
 const [alertaAberto,setAlertaAberto]=useState<"atrasadas"|"receber"|"resultado"|"faltas"|"atrasos"|"pessoas"|null>(null);


 function aplicarPeriodo(p:Exclude<Periodo,"Personalizado">){const[a,b]=faixa(p);setPeriodo(p);setDataInicial(a);setDataFinal(b)}
 function intervaloAtual(){return periodo==="Personalizado"?[dataInicial,dataFinal]:faixa(periodo as Exclude<Periodo,"Personalizado">)}


 const setoresFechamento:SetorFechamento[]=["Supervisão","Qualidade","Operacional","Financeiro","RH"];
 const hojeFechamento=()=>fmt(new Date());

 async function carregarFechamentos(){
   const {data,error}=await supabase
     .from("coordenacao_fechamentos")
     .select("id,data,setor,status,responsavel_id,responsavel_nome,observacao,horario")
     .eq("data",hojeFechamento())
     .order("setor",{ascending:true});
   if(error){
     console.error("Erro ao carregar fechamentos:",error);
     setErroFechamento("Não foi possível carregar os fechamentos de hoje.");
     return;
   }
   setFechamentos((data||[]) as FechamentoCoord[]);
 }

 function abrirFechamento(setor:SetorFechamento){
   const existente=fechamentos.find(x=>x.setor===setor);
   setSetorAberto(setor);
   setStatusFechamento(existente?.status||"Pendente");
   setObservacaoFechamento(existente?.observacao||"");
   setErroFechamento("");
 }

 function fecharModalFechamento(){
   if(salvandoFechamento)return;
   setSetorAberto(null);
   setObservacaoFechamento("");
   setErroFechamento("");
 }

 async function salvarFechamento(){
   if(!setorAberto)return;
   if(statusFechamento==="Com pendência"&&!observacaoFechamento.trim()){
     setErroFechamento("Informe a pendência ou observação antes de salvar.");
     return;
   }

   setSalvandoFechamento(true);
   setErroFechamento("");

   try{
     const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
     if(sessionError||!sessionData.session?.user)throw new Error("Sua sessão expirou.");

     const usuario=sessionData.session.user;
     let responsavelNome=
       String(usuario.user_metadata?.nome||usuario.user_metadata?.name||usuario.email||"Usuário");

     const {data:perfil}=await supabase
       .from("profiles")
       .select("nome")
       .eq("id",usuario.id)
       .maybeSingle();

     if(perfil?.nome)responsavelNome=String(perfil.nome);

     const agora=new Date();
     const payload={
       data:hojeFechamento(),
       setor:setorAberto,
       status:statusFechamento,
       responsavel_id:usuario.id,
       responsavel_nome:responsavelNome,
       observacao:observacaoFechamento.trim(),
       horario:agora.toTimeString().slice(0,8),
       atualizado_em:agora.toISOString()
     };

     const {error}=await supabase
       .from("coordenacao_fechamentos")
       .upsert(payload,{onConflict:"data,setor"});

     if(error)throw error;

     await carregarFechamentos();
     setSetorAberto(null);
     setObservacaoFechamento("");
   }catch(e){
     setErroFechamento(e instanceof Error?e.message:"Não foi possível salvar o fechamento.");
   }finally{
     setSalvandoFechamento(false);
   }
 }

 function classeFechamento(status:StatusFechamento){
   if(status==="Concluído")return"done";
   if(status==="Com pendência")return"issue";
   return"pending";
 }

 function horaCurta(valor?:string|null){
   if(!valor)return"";
   return String(valor).slice(0,5);
 }

 async function carregar(){
  setLoading(true);setErro("");
  try{
    const{data,error}=await supabase.auth.getSession();
    if(error||!data.session?.access_token)throw new Error("Sua sessão expirou.");
    const[a,b]=intervaloAtual(),token=data.session.access_token;
    const q=new URLSearchParams({periodo:periodo==="Personalizado"?"Mês":periodo,dataInicial:a,dataFinal:b,produto,timeId:"Todos"});
    const[rr,rp,rb,rm,rf,rc,rhc,rhr]=await Promise.all([
      fetch(`/api/ranking?${q}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"}),
      fetch("/api/propostas",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"}),
      supabase.from("baixas_pagamentos").select("*"),
      supabase.from("movimentos_financeiros").select("*"),
      supabase.from("folha_pagamentos").select("*"),
      supabase.from("comissoes_pagamentos").select("*"),
      supabase.from("rh_colaboradoras").select("id,status"),
      supabase.from("rh_registros").select("id,tipo,data,competencia")
    ]);
    const[jr,jp]=await Promise.all([rr.json(),rp.json()]);
    if(rb.error)throw rb.error;if(rm.error)throw rm.error;if(rf.error)throw rf.error;if(rc.error)throw rc.error;if(rhc.error)throw rhc.error;if(rhr.error)throw rhr.error;
    if(!rr.ok)throw new Error(jr.erro||"Erro ao carregar Comercial.");
    if(!rp.ok)throw new Error(jp.erro||"Erro ao carregar Operacional.");
    setDados(jr);setPropostas(jp.propostas||[]);
    setBaixas((rb.data||[]) as BaixaFinanceira[]);
    setMovimentos((rm.data||[]) as MovimentoFinanceiro[]);
    setFolhas((rf.data||[]) as FolhaFinanceira[]);
    setComissoes((rc.data||[]) as ComissaoFinanceira[]);
    setColaboradorasRH((rhc.data||[]) as ColaboradoraRHCoord[]);
    setRegistrosRH((rhr.data||[]) as RegistroRHCoord[])
  }catch(e){setErro(e instanceof Error?e.message:"Erro ao carregar.");setDados(null);setPropostas([]);setBaixas([]);setMovimentos([]);setFolhas([]);setComissoes([]);setColaboradorasRH([]);setRegistrosRH([])}finally{setLoading(false)}
 }
 useEffect(()=>{void carregar()},[periodo,dataInicial,dataFinal,produto]);
 useEffect(()=>{void carregarFechamentos()},[]);

 const normalizar=(v:string)=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
 const opcoesConsultoras=useMemo(()=>{
   const nomes=new Set<string>();
   (dados?.ranking||[]).forEach(x=>{if(x.nome)nomes.add(x.nome)});
   propostas.forEach(p=>{const n=p.vendedora||p.consultora||"";if(n)nomes.add(n)});
   return Array.from(nomes).sort((a,b)=>a.localeCompare(b,"pt-BR"));
 },[dados,propostas]);
 const r=useMemo(()=>{
   const todos=dados?.ranking||[];
   const a=consultora==="Todos"?todos:todos.filter(x=>normalizar(x.nome)===normalizar(consultora));
   const compra=a.reduce((t,x)=>t+Number(x.producaoCompra||0),0);
   const clt=a.reduce((t,x)=>t+Number(x.producaoClt||0),0);
   const top=[...a].sort((x,y)=>Number(y.producao||0)-Number(x.producao||0));
   return{
     compra,clt,total:compra+clt,
     contratos:a.reduce((t,x)=>t+Number(x.contratos||0),0),
     consultoras:a.filter(x=>Number(x.producao||0)>0||Number(x.contratos||0)>0).length,
     top
   }
 },[dados,consultora]);
 const op=useMemo(()=>{
   const[inicio,fim]=intervaloAtual();
   if(produto==="CLT")return{andamento:0,boleto:0,margem:0,pagas:0,canceladas:0,atrasadas:0};
   const base=propostas.filter(p=>{
     const d=(p.dataPagamento||p.dataCadastro||p.criadoEm||"").slice(0,10);
     const nome=p.vendedora||p.consultora||"";
     const bateConsultora=consultora==="Todos"||normalizar(nome)===normalizar(consultora);
     return !!d&&d>=inicio&&d<=fim&&bateConsultora
   });
   const aberto=(s:string)=>s!=="PAGO"&&s!=="CANCELADA";
   const limites:Record<string,number>={"AG. BOLETO":1,"AG. ASS TERMO":1,"AG. VÍDEO":1,"AG. ASS PROPOSTA":1,"AG. QUITAÇÃO":2,"BOLETO QUITADO":2,"AG. LIBERAÇÃO MARGEM":3};
   const hoje=new Date();hoje.setHours(0,0,0,0);
   const atrasada=(p:PropostaOp)=>{
     const lim=limites[p.status];if(!lim||!aberto(p.status))return false;
     const ref=p.atualizadoEm||p.criadoEm||p.dataCadastro;if(!ref)return false;
     const d=new Date(ref);if(Number.isNaN(d.getTime()))return false;
     d.setHours(0,0,0,0);
     return Math.floor((hoje.getTime()-d.getTime())/86400000)>lim
   };
   return{
     andamento:base.filter(p=>aberto(p.status)).length,
     boleto:base.filter(p=>p.status==="AG. BOLETO").length,
     margem:base.filter(p=>p.status==="AG. LIBERAÇÃO MARGEM"||p.status==="AVERBADO").length,
     pagas:base.filter(p=>p.status==="PAGO").length,
     canceladas:base.filter(p=>p.status==="CANCELADA").length,
     atrasadas:base.filter(atrasada).length
   }
 },[propostas,periodo,dataInicial,dataFinal,produto,consultora]);

 const financeiro=useMemo(()=>{
   const[inicio,fim]=intervaloAtual();
   const soData=(v?:string|null)=>String(v||"").match(/\d{4}-\d{2}-\d{2}/)?.[0]||"";
   const noPeriodo=(v?:string|null)=>{const d=soData(v);return !!d&&(!inicio||d>=inicio)&&(!fim||d<=fim)};
   const produtoOk=(v?:string)=>produto==="Todos"||normalizar(v||"")===normalizar(produto);

   const baixasFiltradas=baixas.filter(x=>{
     const data=x.data_recebimento||x.data_pagamento_proposta||x.data_prevista_recebimento;
     return noPeriodo(data)&&produtoOk(x.produto||"Compra de Dívida");
   });
   const comissaoRecebida=baixasFiltradas.reduce((t,x)=>t+Number(x.valor_recebido||0),0);
   const aReceber=baixasFiltradas.filter(x=>!x.data_recebimento).reduce((t,x)=>t+Number(x.comissao_prevista||0),0);

   const mov=movimentos.filter(x=>noPeriodo(x.data)&&produtoOk(x.produto));
   const entradas=mov.filter(x=>x.tipo==="Entrada").reduce((t,x)=>t+Number(x.valor||0),0);
   const despesas=mov.filter(x=>x.tipo==="Saída").reduce((t,x)=>t+Number(x.valor||0),0);

   const competenciaNoPeriodo=(c?:string)=>{
     const comp=String(c||"").slice(0,7);if(!comp)return false;
     return `${comp}-31`>=inicio&&`${comp}-01`<=fim;
   };
   const folhasPeriodo=folhas.filter(x=>competenciaNoPeriodo(x.competencia));
   const folha=folhasPeriodo.reduce((t,x)=>t+Math.max(Number(x.total_dia05||0)-(x.assiduidade_ativa?Number(x.valor_assiduidade||0):0),0),0);
   const assiduidade=folhasPeriodo.filter(x=>x.assiduidade_ativa).reduce((t,x)=>t+Number(x.valor_assiduidade||0),0);

   const comissoesPeriodo=comissoes.filter(x=>noPeriodo(x.data_pagamento||(x.competencia?`${String(x.competencia).slice(0,7)}-20`:"")));
   const premiacoes=comissoesPeriodo.reduce((t,x)=>{
     if(produto==="Compra de Dívida")return t+Number(x.comissao_compra_divida||0);
     if(produto==="CLT")return t+Number(x.comissao_clt||0);
     return t+Number(x.total_comissao||0);
   },0);

   return{comissaoRecebida,aReceber,entradas,despesas,lucro:entradas-despesas-premiacoes-folha-assiduidade};
 },[baixas,movimentos,folhas,comissoes,periodo,dataInicial,dataFinal,produto]);

 const pessoas=useMemo(()=>{
   const[inicio,fim]=intervaloAtual();
   const registrosPeriodo=registrosRH.filter(x=>{
     const d=String(x.data||"").slice(0,10);
     return !!d&&d>=inicio&&d<=fim;
   });
   return{
     ativos:colaboradorasRH.filter(x=>normalizar(x.status||"")==="ativa").length,
     ferias:colaboradorasRH.filter(x=>normalizar(x.status||"")==="ferias").length,
     afastados:colaboradorasRH.filter(x=>normalizar(x.status||"")==="afastada").length,
     faltas:registrosPeriodo.filter(x=>normalizar(x.tipo||"")==="falta").length,
     atrasos:registrosPeriodo.filter(x=>normalizar(x.tipo||"")==="atraso").length
   };
 },[colaboradorasRH,registrosRH,periodo,dataInicial,dataFinal]);

 const detalhesAtencao=useMemo(()=>{
   const[inicio,fim]=intervaloAtual();
   const base=propostas.filter(p=>{
     const d=(p.dataPagamento||p.dataCadastro||p.criadoEm||"").slice(0,10);
     const nome=p.vendedora||p.consultora||"";
     return !!d&&d>=inicio&&d<=fim&&(consultora==="Todos"||normalizar(nome)===normalizar(consultora));
   });
   const limites:Record<string,number>={"AG. BOLETO":1,"AG. ASS TERMO":1,"AG. VÍDEO":1,"AG. ASS PROPOSTA":1,"AG. QUITAÇÃO":2,"BOLETO QUITADO":2,"AG. LIBERAÇÃO MARGEM":3};
   const hoje=new Date();hoje.setHours(0,0,0,0);
   const atrasadas=base.map(p=>{
     const ref=p.atualizadoEm||p.criadoEm||p.dataCadastro||"";
     const d=new Date(ref);if(Number.isNaN(d.getTime()))return null;
     d.setHours(0,0,0,0);
     const dias=Math.floor((hoje.getTime()-d.getTime())/86400000);
     const limite=limites[p.status];
     return limite&&p.status!=="PAGO"&&p.status!=="CANCELADA"&&dias>limite?{...p,dias}:null;
   }).filter(Boolean) as (PropostaOp&{dias:number})[];

   const faltas=registrosRH.filter(x=>String(x.data||"").slice(0,10)>=inicio&&String(x.data||"").slice(0,10)<=fim&&normalizar(x.tipo||"")==="falta");
   const atrasos=registrosRH.filter(x=>String(x.data||"").slice(0,10)>=inicio&&String(x.data||"").slice(0,10)<=fim&&normalizar(x.tipo||"")==="atraso");
   return{atrasadas,faltas,atrasos};
 },[propostas,registrosRH,periodo,dataInicial,dataFinal,consultora]);

 const alertas=useMemo(()=>{
   const itens:{id:"atrasadas"|"receber"|"resultado"|"faltas"|"atrasos"|"pessoas";classe:string;tipo:string;titulo:string;texto:string;valor:string}[]=[];

   if(op.atrasadas>0){
     itens.push({
       id:"atrasadas",
       classe:"red",
       tipo:"URGENTE",
       titulo:`${op.atrasadas} ${op.atrasadas===1?"proposta acima do prazo":"propostas acima do prazo"}`,
       texto:"Ação necessária no Operacional.",
       valor:String(op.atrasadas)
     });
   }

   if(financeiro.aReceber>0){
     itens.push({
       id:"receber",
       classe:"yellow",
       tipo:"FINANCEIRO",
       titulo:`${brl(financeiro.aReceber)} a receber`,
       texto:"Acompanhar os recebimentos pendentes.",
       valor:brl(financeiro.aReceber)
     });
   }

   if(financeiro.lucro<0){
     itens.push({
       id:"resultado",
       classe:"red",
       tipo:"FINANCEIRO",
       titulo:`Resultado negativo de ${brl(Math.abs(financeiro.lucro))}`,
       texto:"Verificar despesas, folha, premiações e assiduidade do período.",
       valor:brl(financeiro.lucro)
     });
   }

   if(pessoas.faltas>0){
     itens.push({
       id:"faltas",
       classe:"yellow",
       tipo:"RH",
       titulo:`${pessoas.faltas} ${pessoas.faltas===1?"falta registrada":"faltas registradas"}`,
       texto:"Verificar os registros de falta do período.",
       valor:String(pessoas.faltas)
     });
   }

   if(pessoas.atrasos>0){
     itens.push({
       id:"atrasos",
       classe:"blue",
       tipo:"RH",
       titulo:`${pessoas.atrasos} ${pessoas.atrasos===1?"atraso registrado":"atrasos registrados"}`,
       texto:"Acompanhar os registros de atraso do período.",
       valor:String(pessoas.atrasos)
     });
   }

   if(pessoas.ferias>0||pessoas.afastados>0){
     itens.push({
       id:"pessoas",
       classe:"blue",
       tipo:"PESSOAS",
       titulo:`${pessoas.ferias} em férias • ${pessoas.afastados} afastados`,
       texto:"Acompanhar disponibilidade da equipe.",
       valor:String(pessoas.ferias+pessoas.afastados)
     });
   }

   return itens;
 },[op.atrasadas,financeiro.aReceber,financeiro.lucro,pessoas.faltas,pessoas.atrasos,pessoas.ferias,pessoas.afastados]);
 const maior=Math.max(r.compra,r.clt,1);
 return <div className="cg">
  <section className="hero hero-filter"><div><span>CENTRAL EXECUTIVA</span><h1>Visão geral da operação</h1><p>Produção, operação, financeiro, pessoas e prioridades da Eleva.</p></div><div className="filter-area"><div className="periodo"><button className={periodo==="Hoje"?"on":""} onClick={()=>aplicarPeriodo("Hoje")}>Hoje</button><button className={periodo==="Semana"?"on":""} onClick={()=>aplicarPeriodo("Semana")}>Esta semana</button><button className={periodo==="Mês"?"on":""} onClick={()=>aplicarPeriodo("Mês")}>Este mês</button></div><div className="select-filter">
<label><span>PRODUTO</span><select value={produto} onChange={e=>setProduto(e.target.value as Produto)}><option value="Todos">Todos os produtos</option><option value="Compra de Dívida">Compra de Dívida</option><option value="CLT">CLT</option></select></label>
<label><span>CONSULTORA</span><select value={consultora} onChange={e=>setConsultora(e.target.value)}><option value="Todos">Todas as consultoras</option>{opcoesConsultoras.map(nome=><option key={nome} value={nome}>{nome}</option>)}</select></label>
</div><div className="date-filter"><label><span>DATA INICIAL</span><input type="date" value={dataInicial} onChange={e=>{setDataInicial(e.target.value);setPeriodo("Personalizado")}}/></label><label><span>DATA FINAL</span><input type="date" value={dataFinal} min={dataInicial} onChange={e=>{setDataFinal(e.target.value);setPeriodo("Personalizado")}}/></label><button className="apply-date" onClick={()=>void carregar()}>Atualizar</button></div></div></section>
  <section className="kpis"><K t="PRODUÇÃO TOTAL" v={loading?"...":brl(r.total)} s="Compra + CLT" c="blue"/><K t="COMPRA DE DÍVIDA" v={brl(r.compra)} s="Produção paga"/><K t="CLT" v={brl(r.clt)} s="Parcelas pagas"/><K t="CONTRATOS PAGOS" v={String(r.contratos)} s="Efetivados"/><K t="PENDÊNCIAS CRÍTICAS" v={String(op.atrasadas)} s="Operacional" c="orange"/></section>
  {erro&&<div className="erro">{erro}</div>}
  <section className="main">
   <article className="panel comercial"><Head a="COMERCIAL" b="Desempenho de vendas" tag="DADOS REAIS"/><div className="resumo"><Mini t="Produção total" v={brl(r.total)}/><Mini t="Contratos pagos" v={String(r.contratos)}/><Mini t="Consultoras" v={String(r.consultoras)}/></div><div className="bars"><Bar t="Compra de Dívida" v={brl(r.compra)} w={r.compra/maior*100}/><Bar t="CLT" v={brl(r.clt)} w={r.clt/maior*100}/></div><div className="destaque"><b>★</b><div><span>DESTAQUE DO PERÍODO</span><strong>{r.top[0]?.nome||"Sem produção"}</strong><small>{r.top[0]?`${brl(Number(r.top[0].producao||0))} • ${r.top[0].contratos} contratos`:"—"}</small></div></div><div className="top5"><h3>TOP 5 DO PERÍODO</h3>{r.top.slice(0,5).map((x,i)=><div key={x.id}><b>{i+1}</b><span>{x.nome}</span><small>{x.contratos} contratos</small><strong>{brl(Number(x.producao||0))}</strong></div>)}</div></article>
   <article className="panel"><Head a="OPERAÇÃO" b="Fluxo de propostas" tag={produto==="CLT"?"NÃO SE APLICA AO CLT":"DADOS REAIS"}/><div className="lista"><div><span>Em andamento</span><strong>{op.andamento}</strong></div><div><span>Aguardando boleto</span><strong>{op.boleto}</strong></div><div><span>Aguardando averbação / margem</span><strong>{op.margem}</strong></div><div><span>Propostas pagas</span><strong>{op.pagas}</strong></div><div><span>Canceladas</span><strong>{op.canceladas}</strong></div><div><span>Acima do prazo</span><strong>{op.atrasadas}</strong></div></div></article>
  </section>
  <section className="duas"><article className="panel"><Head a="FINANCEIRO" b="Resultado da empresa" tag="DADOS REAIS"/><div className="lista financeiro-real">
<div><span>Comissão recebida</span><strong>{brl(financeiro.comissaoRecebida)}</strong></div>
<div><span>A receber</span><strong>{brl(financeiro.aReceber)}</strong></div>
<div><span>Entradas</span><strong>{brl(financeiro.entradas)}</strong></div>
<div><span>Despesas</span><strong>{brl(financeiro.despesas)}</strong></div>
<div className={financeiro.lucro<0?"finance-negative":"finance-positive"}><span>Resultado / lucro</span><strong>{brl(financeiro.lucro)}</strong></div>
</div></article><article className="panel"><Head a="PESSOAS" b="Gestão da equipe" tag="DADOS REAIS"/><div className="lista pessoas-real">
<div><span>Colaboradores ativos</span><strong>{pessoas.ativos}</strong></div>
<div><span>Em férias</span><strong>{pessoas.ferias}</strong></div>
<div><span>Afastados</span><strong>{pessoas.afastados}</strong></div>
<div><span>Faltas no período</span><strong>{pessoas.faltas}</strong></div>
<div><span>Atrasos no período</span><strong>{pessoas.atrasos}</strong></div>
</div></article></section>
  <section className="panel"><Head a="CENTRAL DE ATENÇÃO" b="O que precisa de ação" tag="ATUALIZADO AGORA"/>
   {alertas.length===0
    ? <div className="attention-ok"><div>✓</div><strong>Nenhuma pendência crítica</strong><span>Operação, Financeiro e RH sem alertas para o período selecionado.</span></div>
    : <div className="alertas auto">{alertas.map((item,index)=><button type="button" className={`attention-card ${item.classe}`} key={`${item.tipo}-${index}`} onClick={()=>setAlertaAberto(item.id)}><div className="alert-top"><b>{item.tipo}</b><strong>{item.valor}</strong></div><h3>{item.titulo}</h3><span>{item.texto}</span><small>Clique para ver detalhes →</small></button>)}</div>}
  </section>
  <section className="panel fechamento-panel">
   <Head a="FECHAMENTO DOS SETORES" b="Acompanhamento diário" tag="HOJE"/>
   {erroFechamento&&!setorAberto&&<div className="closing-inline-error">{erroFechamento}</div>}
   <div className="fechamento">
    {setoresFechamento.map(setor=>{
      const item=fechamentos.find(x=>x.setor===setor);
      const status=item?.status||"Pendente";
      return <button type="button" className={`closing-card ${classeFechamento(status)}`} key={setor} onClick={()=>abrirFechamento(setor)}>
        <div className="closing-card-top"><span>{setor}</span><b>{status}</b></div>
        {item
          ? <><small>{item.responsavel_nome||"Responsável não informado"}{item.horario?` • ${horaCurta(item.horario)}`:""}</small><p>{item.observacao||"Sem observações."}</p></>
          : <><small>Aguardando fechamento</small><p>Clique para registrar.</p></>}
      </button>
    })}
   </div>
  </section>

  {alertaAberto&&<div className="attention-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setAlertaAberto(null)}}>
    <div className="attention-modal">
      <div className="attention-modal-head">
        <div><span>CENTRAL DE ATENÇÃO</span><h2>{alertaAberto==="atrasadas"?"Propostas acima do prazo":alertaAberto==="receber"?"Valores a receber":alertaAberto==="resultado"?"Resultado financeiro":alertaAberto==="faltas"?"Faltas no período":alertaAberto==="atrasos"?"Atrasos no período":"Disponibilidade da equipe"}</h2></div>
        <button type="button" onClick={()=>setAlertaAberto(null)}>×</button>
      </div>

      {alertaAberto==="atrasadas"&&<div className="attention-table">
        <div className="attention-table-head"><span>CLIENTE</span><span>CONSULTORA</span><span>STATUS</span><span>TEMPO</span></div>
        {detalhesAtencao.atrasadas.map(p=><div className="attention-table-row" key={p.id}><span><b>{p.cliente||p.nome||p.numeroProposta||"Proposta"}</b><small>{p.numeroProposta||p.cpf||""}</small></span><span>{p.vendedora||p.consultora||"—"}</span><span><i>{p.status}</i></span><span><strong>{p.dias} dias</strong></span></div>)}
        {!detalhesAtencao.atrasadas.length&&<div className="attention-modal-empty">Nenhuma proposta acima do prazo.</div>}
      </div>}

      {alertaAberto==="receber"&&<div className="attention-summary-detail"><b>Comissão a receber</b><strong>{brl(financeiro.aReceber)}</strong><p>Valor pendente de recebimento no período selecionado. Consulte o Financeiro para conferir as baixas individualmente.</p></div>}
      {alertaAberto==="resultado"&&<div className="attention-summary-detail"><b>Resultado / lucro</b><strong className={financeiro.lucro<0?"negative":""}>{brl(financeiro.lucro)}</strong><p>Resultado após entradas, despesas, folha, premiações e assiduidade consideradas pela Coordenação.</p></div>}
      {alertaAberto==="faltas"&&<div className="attention-summary-detail"><b>Faltas registradas</b><strong>{pessoas.faltas}</strong><p>Existem {pessoas.faltas} registros de falta no período selecionado. Consulte o RH para os detalhes de cada ocorrência.</p></div>}
      {alertaAberto==="atrasos"&&<div className="attention-summary-detail"><b>Atrasos registrados</b><strong>{pessoas.atrasos}</strong><p>Existem {pessoas.atrasos} registros de atraso no período selecionado.</p></div>}
      {alertaAberto==="pessoas"&&<div className="attention-summary-detail"><b>Disponibilidade da equipe</b><strong>{pessoas.ferias+pessoas.afastados}</strong><p>{pessoas.ferias} em férias e {pessoas.afastados} afastados.</p></div>}

      <div className="attention-modal-actions">
        {alertaAberto==="atrasadas"&&<a href="/propostas">Abrir Gestão de Propostas</a>}
        {alertaAberto==="receber"||alertaAberto==="resultado"?<a href="/financeiro">Abrir Financeiro</a>:null}
        {alertaAberto==="faltas"||alertaAberto==="atrasos"||alertaAberto==="pessoas"?<a href="/rh">Abrir RH</a>:null}
        <button type="button" onClick={()=>setAlertaAberto(null)}>Fechar</button>
      </div>
    </div>
  </div>}

  {setorAberto&&<div className="closing-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)fecharModalFechamento()}}>
    <div className="closing-modal" role="dialog" aria-modal="true" aria-label={`Fechamento de ${setorAberto}`}>
      <div className="closing-modal-head">
        <div><span>FECHAMENTO DO SETOR</span><h2>{setorAberto}</h2><p>{new Date().toLocaleDateString("pt-BR")}</p></div>
        <button type="button" className="closing-close" onClick={fecharModalFechamento}>×</button>
      </div>

      <div className="closing-status-options">
        {(["Pendente","Concluído","Com pendência"] as StatusFechamento[]).map(status=>
          <button type="button" key={status} className={`${statusFechamento===status?"selected":""} ${classeFechamento(status)}`} onClick={()=>setStatusFechamento(status)}>
            <i>{status==="Concluído"?"✓":status==="Com pendência"?"!":"○"}</i>
            <span>{status}</span>
          </button>
        )}
      </div>

      <label className="closing-observation">
        <span>OBSERVAÇÃO DO DIA {statusFechamento==="Com pendência"&&<b>*</b>}</span>
        <textarea value={observacaoFechamento} onChange={e=>setObservacaoFechamento(e.target.value)} placeholder={statusFechamento==="Com pendência"?"Descreva a pendência que precisa de acompanhamento...":"Registre informações importantes do fechamento (opcional)."} rows={5}/>
      </label>

      {erroFechamento&&<div className="closing-modal-error">{erroFechamento}</div>}

      <div className="closing-modal-actions">
        <button type="button" className="secondary" onClick={fecharModalFechamento} disabled={salvandoFechamento}>Cancelar</button>
        <button type="button" className="primary" onClick={()=>void salvarFechamento()} disabled={salvandoFechamento}>{salvandoFechamento?"Salvando...":"Salvar fechamento"}</button>
      </div>
    </div>
  </div>}
 </div>
}
function K({t,v,s,c=""}:{t:string;v:string;s:string;c?:string}){return <article className={`kpi ${c}`}><i>{c==="orange"?"!":"↗"}</i><div><span>{t}</span><strong>{v}</strong><small>{s}</small></div></article>}
function Head({a,b,tag}:{a:string;b:string;tag:string}){return <header><div><span>{a}</span><h2>{b}</h2></div><b>{tag}</b></header>}
function Mini({t,v}:{t:string;v:string}){return <div><span>{t}</span><strong>{v}</strong></div>}
function Bar({t,v,w}:{t:string;v:string;w:number}){return <div><label><span>{t}</span><b>{v}</b></label><div className="track"><i style={{width:`${w}%`}}/></div></div>}
function Lista({itens}:{itens:string[]}){return <div className="lista">{itens.map(x=><div key={x}><span>{x}</span><strong>—</strong></div>)}</div>}