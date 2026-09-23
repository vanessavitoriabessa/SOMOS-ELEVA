"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import "./fiscal-controls.css";

type Status = "Pendente" | "Pago";
type Tipo = "INSS" | "FGTS";
type Mensal = { id:string; tipo:Tipo; competencia:string; valor:number; vencimento:string; status:Status; data_pagamento:string|null; observacao:string };
type Parcelamento = { id:string; nome:string; valor_parcela:number; total_parcelas:number; primeiro_vencimento:string; dia_vencimento:number; ativo:boolean };
type Parcela = { id:string; parcelamento_id:string; numero_parcela:number; valor:number; vencimento:string; status:Status; data_pagamento:string|null };

const moeda=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const numero=(v:string)=>Number(String(v||"0").replace(/\./g,"").replace(",","."))||0;
const hoje=()=>new Date().toISOString().slice(0,10);
const mesAtual=()=>hoje().slice(0,7);
const dataBR=(v?:string|null)=>v?v.slice(0,10).split("-").reverse().join("/"):"—";
const situacao=(status:Status,vencimento:string)=>status==="Pago"?"Pago":String(vencimento||"").slice(0,10)<hoje()?"Atrasado":"Pendente";

export function ControleInssFgts(){
 const sb=useMemo(()=>createClient(),[]);
 const [mensais,setMensais]=useState<Mensal[]>([]);
 const [parcelamentos,setParcelamentos]=useState<Parcelamento[]>([]);
 const [parcelas,setParcelas]=useState<Parcela[]>([]);
 const [msg,setMsg]=useState("");
 const [modalMensal,setModalMensal]=useState(false);
 const [modalParcelamento,setModalParcelamento]=useState(false);
 const [editMensal,setEditMensal]=useState<Mensal|null>(null);
 const [editParcelamento,setEditParcelamento]=useState<Parcelamento|null>(null);
 const [mf,setMf]=useState({tipo:"INSS" as Tipo,competencia:mesAtual(),valor:"",vencimento:hoje(),observacao:""});
 const [pf,setPf]=useState({nome:"",valor:"",total:"",primeiro:hoje(),dia:"28"});

 async function carregar(){
  const [a,b,c]=await Promise.all([
   sb.from("controle_inss_fgts").select("*").order("vencimento",{ascending:false}),
   sb.from("inss_parcelamentos").select("*").order("criado_em",{ascending:false}),
   sb.from("inss_parcelas").select("*").order("vencimento",{ascending:true}),
  ]);
  const erro=a.error||b.error||c.error;
  if(erro){setMsg(erro.message);return}
  setMensais((a.data||[]) as Mensal[]);
  setParcelamentos((b.data||[]) as Parcelamento[]);
  setParcelas((c.data||[]) as Parcela[]);
 }
 useEffect(()=>{void carregar()},[]);

 const mensalPendente=mensais.filter(x=>x.status!=="Pago").reduce((s,x)=>s+Number(x.valor||0),0);
 const parcelaPendente=parcelas.filter(x=>x.status!=="Pago").reduce((s,x)=>s+Number(x.valor||0),0);

 function novoMensal(){setEditMensal(null);setMf({tipo:"INSS",competencia:mesAtual(),valor:"",vencimento:hoje(),observacao:""});setModalMensal(true)}
 function editarMensal(x:Mensal){setEditMensal(x);setMf({tipo:x.tipo,competencia:x.competencia,valor:String(x.valor),vencimento:x.vencimento,observacao:x.observacao||""});setModalMensal(true)}
 async function salvarMensal(e:FormEvent){
  e.preventDefault();setMsg("");
  const payload={tipo:mf.tipo,competencia:mf.competencia,valor:numero(mf.valor),vencimento:mf.vencimento,status:editMensal?.status||"Pendente",observacao:mf.observacao};
  if(payload.valor<=0||!payload.vencimento){setMsg("Informe o valor e o vencimento.");return}
  const op=editMensal?await sb.from("controle_inss_fgts").update(payload).eq("id",editMensal.id):await sb.from("controle_inss_fgts").insert(payload);
  if(op.error){setMsg(op.error.message);return}
  setModalMensal(false);setEditMensal(null);await carregar();
 }
 async function alternarMensal(x:Mensal){
  const pago=x.status!=="Pago";
  const {error}=await sb.from("controle_inss_fgts").update({status:pago?"Pago":"Pendente",data_pagamento:pago?hoje():null}).eq("id",x.id);
  if(error)setMsg(error.message);else await carregar();
 }
 async function excluirMensal(x:Mensal){
  if(!confirm("Excluir este lançamento?"))return;
  const {error}=await sb.from("controle_inss_fgts").delete().eq("id",x.id);
  if(error)setMsg(error.message);else await carregar();
 }

 function novoParcelamento(nome="",valor=""){setEditParcelamento(null);setPf({nome,valor,total:"",primeiro:hoje(),dia:"28"});setModalParcelamento(true)}
 function editarParcelamento(x:Parcelamento){setEditParcelamento(x);setPf({nome:x.nome,valor:String(x.valor_parcela),total:String(x.total_parcelas),primeiro:x.primeiro_vencimento,dia:String(x.dia_vencimento)});setModalParcelamento(true)}
 async function salvarParcelamento(e:FormEvent){
  e.preventDefault();setMsg("");
  const valor=numero(pf.valor),total=Number(pf.total||0),dia=Number(pf.dia||28);
  if(!pf.nome.trim()||valor<=0||total<=0||!pf.primeiro){setMsg("Informe nome, valor, quantidade de parcelas e primeiro vencimento.");return}
  const payload={nome:pf.nome.trim(),valor_parcela:valor,total_parcelas:total,primeiro_vencimento:pf.primeiro,dia_vencimento:dia,ativo:true};

  const montarParcelas=(parcelamentoId:string,anteriores:Parcela[]=[])=>{
   const [ano,mes,diaPrimeiro]=pf.primeiro.split("-").map(Number);
   return Array.from({length:total},(_,i)=>{
    const d=new Date(ano,mes-1+i,1,12);
    const ultimo=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    d.setDate(i===0?Math.min(diaPrimeiro,ultimo):Math.min(dia,ultimo));
    const anterior=anteriores.find(x=>x.numero_parcela===i+1);
    return {
     parcelamento_id:parcelamentoId,
     numero_parcela:i+1,
     valor,
     vencimento:d.toISOString().slice(0,10),
     status:anterior?.status||"Pendente",
     data_pagamento:anterior?.data_pagamento||null
    };
   });
  };

  if(editParcelamento){
   const antigas=parcelas.filter(x=>x.parcelamento_id===editParcelamento.id);
   const {error}=await sb.from("inss_parcelamentos").update(payload).eq("id",editParcelamento.id);
   if(error){setMsg(error.message);return}
   const del=await sb.from("inss_parcelas").delete().eq("parcelamento_id",editParcelamento.id);
   if(del.error){setMsg(del.error.message);return}
   const registros=montarParcelas(editParcelamento.id,antigas);
   const ins=await sb.from("inss_parcelas").insert(registros);
   if(ins.error){setMsg(ins.error.message);return}
  }else{
   const {data,error}=await sb.from("inss_parcelamentos").insert(payload).select("id").single();
   if(error||!data){setMsg(error?.message||"Não foi possível criar o parcelamento.");return}
   const registros=montarParcelas(String(data.id));
   const ins=await sb.from("inss_parcelas").insert(registros);
   if(ins.error){await sb.from("inss_parcelamentos").delete().eq("id",data.id);setMsg(ins.error.message);return}
  }
  setModalParcelamento(false);setEditParcelamento(null);await carregar();
 }
 async function alternarParcela(x:Parcela){
  const pago=x.status!=="Pago";
  const {error}=await sb.from("inss_parcelas").update({status:pago?"Pago":"Pendente",data_pagamento:pago?hoje():null}).eq("id",x.id);
  if(error)setMsg(error.message);else await carregar();
 }
 async function excluirParcelamento(x:Parcelamento){
  if(!confirm(`Excluir ${x.nome} e todas as parcelas?`))return;
  const {error}=await sb.from("inss_parcelamentos").delete().eq("id",x.id);
  if(error)setMsg(error.message);else await carregar();
 }

 return <section className="fc-tax fc-control-panel">
  {msg&&<div className="fc-msg">{msg}</div>}
  <header className="fc-control-head"><div><b>ENCARGOS MENSAIS</b><h2>Imposto INSS e FGTS</h2><p>Controle mensal, vencimentos, pagamentos e parcelamentos.</p></div><button type="button" onClick={novoMensal}>+ Novo lançamento</button></header>
  <div className="fc-kpis"><article><span>INSS / FGTS pendentes</span><strong>{moeda(mensalPendente)}</strong></article><article><span>Parcelamentos pendentes</span><strong>{moeda(parcelaPendente)}</strong></article><article><span>Total pendente</span><strong>{moeda(mensalPendente+parcelaPendente)}</strong></article></div>

  <div className="fc-section-title"><div><h3>INSS E FGTS MENSAIS</h3><small>Histórico por competência</small></div></div>
  <div className="fc-table"><table><thead><tr><th>Tipo</th><th>Competência</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Pagamento</th><th>Ações</th></tr></thead><tbody>
   {mensais.length?mensais.map(x=>{const st=situacao(x.status,x.vencimento);return <tr key={x.id}><td><strong>{x.tipo}</strong></td><td>{x.competencia}</td><td>{moeda(x.valor)}</td><td>{dataBR(x.vencimento)}</td><td><span className={`fc-inss-status ${st.toLowerCase()}`}>{st}</span></td><td>{dataBR(x.data_pagamento)}</td><td><div className="fc-actions"><button type="button" className={x.status==="Pago"?"fc-inss-reopen":"fc-inss-pay"} onClick={()=>void alternarMensal(x)}>{x.status==="Pago"?"Reabrir":"Marcar pago"}</button><button type="button" className="fc-edit" onClick={()=>editarMensal(x)}>Editar</button><button type="button" className="fc-delete" onClick={()=>void excluirMensal(x)}>Excluir</button></div></td></tr>}):<tr><td colSpan={7}>Nenhum lançamento cadastrado.</td></tr>}
  </tbody></table></div>

  <div className="fc-section-title"><div><h3>PARCELAMENTOS DO INSS</h3><small>Controle parcela por parcela</small></div><button type="button" onClick={()=>novoParcelamento()}>+ Novo parcelamento</button></div>

  {!parcelamentos.length&&<div className="fc-inss-suggestions">
   <div><b>Parcelamento 01</b><span>R$ 512,00 • vencimento dia 28</span><button type="button" onClick={()=>novoParcelamento("Parcelamento 01","512,00")}>Cadastrar</button></div>
   <div><b>Parcelamento 02</b><span>R$ 505,11 • vencimento dia 28</span><button type="button" onClick={()=>novoParcelamento("Parcelamento 02","505,11")}>Cadastrar</button></div>
  </div>}

  {parcelamentos.map(p=>{
   const lista=parcelas.filter(x=>x.parcelamento_id===p.id);
   const pagas=lista.filter(x=>x.status==="Pago").length;
   const saldo=lista.filter(x=>x.status!=="Pago").reduce((s,x)=>s+Number(x.valor||0),0);
   return <article className="fc-installment-card fc-inss-installment" key={p.id}><header><div><h4>{p.nome}</h4><p>{p.total_parcelas}x de {moeda(p.valor_parcela)} • vence dia {p.dia_vencimento}</p></div><div><b className="fc-inss-summary">{pagas}/{p.total_parcelas} pagas • saldo {moeda(saldo)}</b><button type="button" className="fc-edit" onClick={()=>editarParcelamento(p)}>Editar</button><button type="button" className="fc-delete" onClick={()=>void excluirParcelamento(p)}>Excluir</button></div></header><div className="fc-table"><table><thead><tr><th>Parcela</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Pagamento</th><th>Ação</th></tr></thead><tbody>{lista.map(x=>{const st=situacao(x.status,x.vencimento);return <tr key={x.id}><td>{x.numero_parcela}/{p.total_parcelas}</td><td>{moeda(x.valor)}</td><td>{dataBR(x.vencimento)}</td><td><span className={`fc-inss-status ${st.toLowerCase()}`}>{st}</span></td><td>{dataBR(x.data_pagamento)}</td><td><button type="button" className={x.status==="Pago"?"fc-inss-reopen":"fc-inss-pay"} onClick={()=>void alternarParcela(x)}>{x.status==="Pago"?"Reabrir":"Marcar pago"}</button></td></tr>})}</tbody></table></div></article>
  })}

  {modalMensal&&<div className="fc-bg"><form className="fc-modal" onSubmit={salvarMensal}><header><h2>{editMensal?"Editar":"Novo"} lançamento INSS/FGTS</h2><button type="button" onClick={()=>setModalMensal(false)}>×</button></header><div className="fc-form"><label>Tipo *<select value={mf.tipo} onChange={e=>setMf({...mf,tipo:e.target.value as Tipo})}><option value="INSS">INSS</option><option value="FGTS">FGTS</option></select></label><label>Competência *<input type="month" value={mf.competencia} onChange={e=>setMf({...mf,competencia:e.target.value})}/></label><label>Valor *<input value={mf.valor} onChange={e=>setMf({...mf,valor:e.target.value})}/></label><label>Vencimento *<input type="date" value={mf.vencimento} onChange={e=>setMf({...mf,vencimento:e.target.value})}/></label><label className="wide">Observação<input value={mf.observacao} onChange={e=>setMf({...mf,observacao:e.target.value})}/></label></div><footer><button type="button" onClick={()=>setModalMensal(false)}>Cancelar</button><button type="submit">Salvar lançamento</button></footer></form></div>}

  {modalParcelamento&&<div className="fc-bg"><form className="fc-modal" onSubmit={salvarParcelamento}><header><h2>{editParcelamento?"Editar":"Novo"} parcelamento INSS</h2><button type="button" onClick={()=>setModalParcelamento(false)}>×</button></header><div className="fc-form"><label>Nome *<input value={pf.nome} onChange={e=>setPf({...pf,nome:e.target.value})}/></label><label>Valor da parcela *<input value={pf.valor} onChange={e=>setPf({...pf,valor:e.target.value})}/></label><label>Total de parcelas *<input type="number" min="1" value={pf.total} onChange={e=>setPf({...pf,total:e.target.value})}/></label><label>Primeiro vencimento *<input type="date" value={pf.primeiro} onChange={e=>setPf({...pf,primeiro:e.target.value})}/></label><label>Dia do vencimento *<input type="number" min="1" max="31" value={pf.dia} onChange={e=>setPf({...pf,dia:e.target.value})}/></label></div><footer><button type="button" onClick={()=>setModalParcelamento(false)}>Cancelar</button><button type="submit">Gerar parcelamento</button></footer></form></div>}
 </section>;
}
