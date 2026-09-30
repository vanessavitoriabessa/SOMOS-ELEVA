"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Config={id:number;chave:string;nome:string;ativo:boolean;ordem:number};
type Extra={id:string;competencia:string;nome:string;valor:number;observacao?:string|null;ativo:boolean};

const moeda=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const mesAtual=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`};
const nomeMes=(v:string)=>{const [a,m]=v.split("-").map(Number);const s=new Date(a,m-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});return s.charAt(0).toUpperCase()+s.slice(1)};

export default function CustoPorOperadorManager(){
 const sb=useMemo(()=>createClient(),[]);
 const [competencia,setCompetencia]=useState(mesAtual());
 const [dataDe, setDataDe] = useState("");
const [dataAte, setDataAte] = useState("");
 const [config,setConfig]=useState<Config[]>([]);
 const [extras,setExtras]=useState<Extra[]>([]);
 const [fixas,setFixas]=useState<any[]>([]),[folhas,setFolhas]=useState<any[]>([]),[premios,setPremios]=useState<any[]>([]);
 const [simples,setSimples]=useState<any[]>([]),[inss,setInss]=useState<any[]>([]),[operadores,setOperadores]=useState<any[]>([]);
 const [form,setForm]=useState(false),[nome,setNome]=useState(""),[valor,setValor]=useState(""),[obs,setObs]=useState("");

 const carregar=useCallback(async()=>{
  const [a,b,c,d,e,f,g,h]=await Promise.all([
   sb.from("custo_operador_config").select("id,chave,nome,ativo,ordem").order("ordem"),
   sb.from("custo_operador_adicionais").select("id,competencia,nome,valor,observacao,ativo").order("criado_em",{ascending:false}),
   sb.from("despesas_recorrentes").select("id,valor,inicio_competencia,fim_competencia,ativo").eq("ativo",true),
   sb.from("folha_pagamentos").select("id,competencia,total_dia05,total_mensal,valor_pago"),
   sb.from("pontos_saques").select("id,pontos_solicitados,valor_reais,status,processado_em").eq("status","PAGO"),
   sb.from("controle_simples_nacional").select("id,competencia,valor_imposto"),
   sb.from("controle_inss_fgts").select("id,tipo,competencia,valor"),
   sb.from("profiles").select("id,nome,perfil,ativo").eq("ativo",true),
  ]);
  for(const r of [a,b,c,d,e,f,g,h]) if(r.error) throw r.error;
  setConfig((a.data||[]) as Config[]);setExtras((b.data||[]) as Extra[]);setFixas(c.data||[]);setFolhas(d.data||[]);
  setPremios(e.data||[]);setSimples(f.data||[]);setInss(g.data||[]);setOperadores(h.data||[]);
 },[sb]);
 useEffect(()=>{carregar().catch(console.error)},[carregar]);

 const ativa=(k:string)=>config.find(x=>x.chave===k)?.ativo??true;
 const calc=useMemo(()=>{
  const df=fixas.filter(x=>{const i=String(x.inicio_competencia||"0000-00").slice(0,7),f=x.fim_competencia?String(x.fim_competencia).slice(0,7):null;return i<=competencia&&(!f||f>=competencia)}).reduce((s,x)=>s+Number(x.valor||0),0);
  const fo=folhas.filter(x=>String(x.competencia||"").slice(0,7)===competencia).reduce((s,x)=>s+Number(x.total_mensal??x.total_dia05??x.valor_pago??0),0);
  const pr=premios.filter(x=>String(x.processado_em||"").slice(0,7)===competencia).reduce((s,x)=>s+Number(x.valor_reais??x.pontos_solicitados??0),0);
  const si=simples.filter(x=>String(x.competencia||"").slice(0,7)===competencia).reduce((s,x)=>s+Number(x.valor_imposto||0),0);
  const inf=inss.filter(x=>String(x.competencia||"").slice(0,7)===competencia).reduce((s,x)=>s+Number(x.valor||0),0);
  const ex=extras.filter(x=>x.competencia===competencia),ad=ex.filter(x=>x.ativo).reduce((s,x)=>s+Number(x.valor||0),0);
  const qtd=operadores.filter(x=>{const p=String(x.perfil||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();return p.includes("consultor")||p.includes("vendedor")}).length;
  const total=(ativa("despesas_fixas")?df:0)+(ativa("folha")?fo:0)+(ativa("premiacoes_pagas")?pr:0)+(ativa("simples_nacional")?si:0)+(ativa("inss_fgts")?inf:0)+ad;
  return {df,fo,pr,si,inf,ad,ex,qtd,total,unit:qtd?total/qtd:0};
 },[competencia,config,extras,fixas,folhas,premios,simples,inss,operadores]);

 async function toggleConfig(x:Config){
  const ativo=!x.ativo;const {error}=await sb.from("custo_operador_config").update({ativo}).eq("id",x.id);
  if(error)return alert("Não foi possível alterar a composição.");
  setConfig(v=>v.map(i=>i.id===x.id?{...i,ativo}:i));
 }
 async function adicionar(){
  const n=nome.trim(),v=Number(valor.replace(/\./g,"").replace(",","."));
  if(!n)return alert("Informe o nome do custo.");if(!Number.isFinite(v)||v<=0)return alert("Informe um valor válido.");
  const {error}=await sb.from("custo_operador_adicionais").insert({competencia,nome:n,valor:v,observacao:obs.trim()||null,ativo:true});
  if(error)return alert("Não foi possível adicionar o custo.");
  setNome("");setValor("");setObs("");setForm(false);await carregar();
 }
 async function toggleExtra(x:Extra){const {error}=await sb.from("custo_operador_adicionais").update({ativo:!x.ativo}).eq("id",x.id);if(error)return alert("Não foi possível alterar o custo.");await carregar()}
 async function excluir(x:Extra){if(!confirm(`Excluir "${x.nome}"?`))return;const {error}=await sb.from("custo_operador_adicionais").delete().eq("id",x.id);if(error)return alert("Não foi possível excluir.");await carregar()}

 const card:React.CSSProperties={background:"#fff",border:"1px solid #dce5f2",borderRadius:16,padding:20};
 const btn:React.CSSProperties={height:42,border:0,borderRadius:10,padding:"0 16px",background:"#155eef",color:"#fff",fontWeight:900,cursor:"pointer"};
 const itens=[["despesas_fixas","Despesas Fixas",calc.df],["folha","Folha",calc.fo],["premiacoes_pagas","Premiações Pagas",calc.pr],["simples_nacional","Simples Nacional",calc.si],["inss_fgts","INSS e FGTS",calc.inf]] as const;

 return <div style={{display:"grid",gap:16}}>
  <section style={{...card,display:"flex",justifyContent:"space-between",alignItems:"center",gap:18,flexWrap:"wrap"}}>
   <div><span style={{color:"#155eef",fontSize:10,fontWeight:900}}>CENTRO FINANCEIRO</span><h2 style={{margin:"6px 0",color:"#102d57",fontSize:25}}>Custo por Operador(a)-PA</h2><p style={{margin:0,color:"#73829a",fontSize:12}}>Gerencie a composição sem precisar alterar o código.</p></div>
   <div style={{display:"flex",alignItems:"flex-end",gap:10,flexWrap:"wrap"}}>
    <div
  style={{
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
    flexWrap: "wrap",
  }}
>
  <label
    style={{
      display: "grid",
      gap: 6,
      fontSize: 10,
      fontWeight: 900,
      color: "#102d57",
    }}
  >
    DE
    <input
      type="date"
      value={dataDe}
      onChange={(e) => setDataDe(e.target.value)}
      style={{
        height: 42,
        width: 150,
        border: "1px solid #ccd8ea",
        borderRadius: 10,
        padding: "0 12px",
        color: "#102d57",
        fontWeight: 800,
        background: "#fff",
      }}
    />
  </label>

  <label
    style={{
      display: "grid",
      gap: 6,
      fontSize: 10,
      fontWeight: 900,
      color: "#102d57",
    }}
  >
    ATÉ
    <input
      type="date"
      value={dataAte}
      onChange={(e) => setDataAte(e.target.value)}
      style={{
        height: 42,
        width: 150,
        border: "1px solid #ccd8ea",
        borderRadius: 10,
        padding: "0 12px",
        color: "#102d57",
        fontWeight: 800,
        background: "#fff",
      }}
    />
  </label>

  <label
    style={{
      display: "grid",
      gap: 6,
      fontSize: 10,
      fontWeight: 900,
      color: "#102d57",
    }}
  >
    DATA COMPETÊNCIA
    <input
      type="month"
      value={competencia}
      onChange={(e) => setCompetencia(e.target.value)}
      style={{
        height: 42,
        width: 190,
        border: "1px solid #ccd8ea",
        borderRadius: 10,
        padding: "0 12px",
        color: "#102d57",
        fontWeight: 800,
        background: "#fff",
      }}
    />
  </label>
</div>
    <button type="button" onClick={()=>void carregar()} style={btn}>ATUALIZAR</button>
    <button type="button" onClick={()=>setForm(v=>!v)} style={btn}>+ ADICIONAR CUSTO</button>
   </div>
  </section>

  <section style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14}}>
   {[
    ["CUSTO POR OPERADOR(A)-PA",moeda(calc.unit),nomeMes(competencia)],
    ["CUSTO TOTAL",moeda(calc.total),"Total incluído na composição"],
    ["OPERADORES(AS)",String(calc.qtd),"Consultores(as) / vendedores(as) ativos"],
    ["CÁLCULO",moeda(calc.unit),`${moeda(calc.total)} ÷ ${calc.qtd}`],
   ].map(([t,v,d])=><article key={t} style={{...card,minHeight:105}}><span style={{fontSize:10,fontWeight:900,color:"#65758d"}}>{t}</span><strong style={{display:"block",marginTop:9,fontSize:24,color:t==="CÁLCULO"?"#079447":"#102d57"}}>{v}</strong><small style={{display:"block",marginTop:7,color:"#8794a8"}}>{d}</small></article>)}
  </section>

  {form&&<section style={card}>
   <h3 style={{margin:"0 0 14px",color:"#102d57"}}>Adicionar custo — {nomeMes(competencia)}</h3>
   <div style={{display:"grid",gridTemplateColumns:"1.3fr .7fr 1.4fr auto",gap:10,alignItems:"end"}}>
    <label style={{display:"grid",gap:5,fontSize:10,fontWeight:800}}>NOME<input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex.: aluguel extra" style={{height:40,border:"1px solid #ccd8ea",borderRadius:9,padding:"0 10px"}}/></label>
    <label style={{display:"grid",gap:5,fontSize:10,fontWeight:800}}>VALOR<input value={valor} onChange={e=>setValor(e.target.value)} placeholder="0,00" style={{height:40,border:"1px solid #ccd8ea",borderRadius:9,padding:"0 10px"}}/></label>
    <label style={{display:"grid",gap:5,fontSize:10,fontWeight:800}}>OBSERVAÇÃO<input value={obs} onChange={e=>setObs(e.target.value)} placeholder="Opcional" style={{height:40,border:"1px solid #ccd8ea",borderRadius:9,padding:"0 10px"}}/></label>
    <button type="button" onClick={()=>void adicionar()} style={btn}>SALVAR</button>
   </div>
  </section>}

  <section style={{display:"grid",gridTemplateColumns:"minmax(0,1.25fr) minmax(320px,.75fr)",gap:14,alignItems:"start"}}>
   <article style={card}>
    <span style={{color:"#155eef",fontSize:10,fontWeight:900}}>COMPOSIÇÃO DO CUSTO</span>
    <h3 style={{margin:"6px 0 4px",color:"#102d57"}}>O que está entrando na soma</h3>
    <p style={{margin:"0 0 14px",color:"#8794a8",fontSize:11}}>Ative ou desative categorias automáticas diretamente aqui.</p>
    {itens.map(([chave,nomeItem,valorItem])=>{
     const cfg=config.find(x=>x.chave===chave),ativo=cfg?.ativo??true;
     return <div key={chave} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:12,alignItems:"center",padding:"12px 0",borderBottom:"1px solid #edf1f6"}}>
      <div><strong style={{color:"#102d57",fontSize:12}}>{nomeItem}</strong><small style={{display:"block",marginTop:3,color:ativo?"#079447":"#a0a9b7"}}>{ativo?"Incluído no cálculo":"Fora do cálculo"}</small></div>
      <strong style={{color:"#102d57"}}>{moeda(Number(valorItem))}</strong>
      <button type="button" disabled={!cfg} onClick={()=>cfg&&void toggleConfig(cfg)} style={{border:"1px solid #ccd8ea",borderRadius:9,padding:"7px 10px",background:ativo?"#eef8f2":"#f5f6f8",cursor:cfg?"pointer":"default",fontWeight:800}}>{ativo?"ATIVO":"INATIVO"}</button>
     </div>
    })}
    <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,paddingTop:14}}><strong>Custos adicionais ativos</strong><strong>{moeda(calc.ad)}</strong></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,paddingTop:12,marginTop:12,borderTop:"2px solid #e6ecf5"}}><strong style={{color:"#102d57"}}>CUSTO TOTAL</strong><strong style={{color:"#155eef",fontSize:20}}>{moeda(calc.total)}</strong></div>
   </article>

   <article style={card}>
    <span style={{color:"#155eef",fontSize:10,fontWeight:900}}>CUSTOS ADICIONAIS</span>
    <h3 style={{margin:"6px 0 4px",color:"#102d57"}}>{nomeMes(competencia)}</h3>
    <p style={{margin:"0 0 14px",color:"#8794a8",fontSize:11}}>Itens cadastrados manualmente para esta competência.</p>
    {calc.ex.length===0?<div style={{padding:"16px 0",color:"#8794a8",fontSize:11}}>Nenhum custo adicional cadastrado.</div>:calc.ex.map(x=><div key={x.id} style={{padding:"12px 0",borderBottom:"1px solid #edf1f6"}}>
     <div style={{display:"flex",justifyContent:"space-between",gap:10}}><div><strong style={{color:"#102d57",fontSize:12}}>{x.nome}</strong>{x.observacao&&<small style={{display:"block",marginTop:3,color:"#8794a8"}}>{x.observacao}</small>}</div><strong style={{color:x.ativo?"#102d57":"#a0a9b7"}}>{moeda(x.valor)}</strong></div>
     <div style={{display:"flex",gap:7,marginTop:8}}><button type="button" onClick={()=>void toggleExtra(x)} style={{border:"1px solid #ccd8ea",borderRadius:8,padding:"5px 8px",background:"#fff",cursor:"pointer"}}>{x.ativo?"DESATIVAR":"ATIVAR"}</button><button type="button" onClick={()=>void excluir(x)} style={{border:"1px solid #f1caca",borderRadius:8,padding:"5px 8px",background:"#fff",cursor:"pointer"}}>EXCLUIR</button></div>
    </div>)}
   </article>
  </section>
 </div>;
}
