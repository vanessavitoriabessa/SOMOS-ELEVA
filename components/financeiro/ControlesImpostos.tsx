"use client";















import{FormEvent,useEffect,useMemo,useState}from"react";















import{createClient}from"@/lib/supabase/client";















import"./fiscal-controls.css";















type S="Pendente"|"Pago";type I={id:string;competencia:string;valor_emitido:number;aliquota?:number;valor_imposto:number;vencimento:string;status:S;data_pagamento:string|null};type P={id:string;nome:string;valor_parcela:number;total_parcelas:number;primeiro_vencimento:string;dia_vencimento:number};type X={id:string;parcelamento_id:string;numero_parcela:number;valor:number;vencimento:string;status:S;data_pagamento:string|null};







type NF={id:string;produto?:string;fornecedor?:string;valor_nota?:number;referencia_inicio?:string|null;data_solicitacao?:string|null};















const m=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),n=(v:string)=>Number(v.replace(/\./g,"").replace(",","."))||0,h=()=>new Date().toISOString().slice(0,10),mes=()=>h().slice(0,7),br=(v:string|null)=>v?v.slice(0,10).split("-").reverse().join("/"):"—";















const calcAliquota=(emitido:number,imposto:number)=>emitido>0?(imposto/emitido)*100:0;















const pct=(v:number)=>`${Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}%`;







const norm=(v?:string|null)=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();







const ym=(v?:string|null)=>String(v||"").slice(0,7);

const valorBanco=(v:unknown)=>{

 if(typeof v==="number")return Number.isFinite(v)?v:0;

 const raw=String(v??"").trim();

 if(!raw)return 0;

 const limpo=raw.includes(",")?raw.replace(/\./g,"").replace(",",".").replace(/[^\d.-]/g,""):raw.replace(/[^\d.-]/g,"");

 const num=Number(limpo);

 return Number.isFinite(num)?num:0;

};





const competenciaBR=(v?:string|null)=>{



 const [ano,mes]=String(v||"").slice(0,7).split("-");



 const nomes=["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];



 const i=Number(mes)-1;



 return ano&&i>=0&&i<12?`${nomes[i]} / ${ano}`:"—";



};







const shift=(c:string,d:number)=>{const[a,b]=c.split("-").map(Number),z=new Date(a,b-1+d,1,12);return`${z.getFullYear()}-${String(z.getMonth()+1).padStart(2,"0")}`};







const due20=(c:string)=>`${c}-20`;























const situacao=(status:S,vencimento:string)=>status==="Pago"?"Pago":String(vencimento||"").slice(0,10)<h()?"Atrasado":"Pendente";















export function ControleSimples(){const sb=useMemo(()=>createClient(),[]),[is,setIs]=useState<I[]>([]),[ps,setPs]=useState<P[]>([]),[xs,setXs]=useState<X[]>([]),[mi,setMi]=useState(false),[mp,setMp]=useState(false),[mx,setMx]=useState(false),[ei,setEi]=useState<I|null>(null),[ep,setEp]=useState<P|null>(null),[ex,setEx]=useState<X|null>(null),[msg,setMsg]=useState("");const[competenciaFiltro,setCompetenciaFiltro]=useState(""),[dataDeFiltro,setDataDeFiltro]=useState(""),[dataAteFiltro,setDataAteFiltro]=useState("");const[fi,setFi]=useState({competencia:mes(),valorEmitido:"",valorImposto:"",vencimento:h(),status:"Pendente" as S,dataPagamento:""}),[fp,setFp]=useState({nome:"Parcelamento 01",valor:"370,00",total:"59",primeiro:h(),dia:"28"}),[fx,setFx]=useState({valor:"",vencimento:h(),status:"Pendente" as S,dataPagamento:""});















async function load(){
 const[a,b,c,d]=await Promise.all([
  sb.from("controle_simples_nacional").select("*"),
  sb.from("simples_parcelamentos").select("*").order("criado_em",{ascending:false}),
  sb.from("simples_parcelas").select("*").order("vencimento"),
  sb.from("controle_notas_fiscais").select("id,produto,fornecedor,valor_nota,referencia_inicio")
 ]);
 const erro=a.error||b.error||c.error||d.error;
 if(erro){setMsg(erro.message);return}

 let impostos=(a.data||[]) as I[];
 const notas=(d.data||[]) as NF[];
 const mesAtualCalendario=mes();

 // Para decidir a próxima competência automática, IGNORA registros do mês atual/futuro
 // que possam ter sido criados por versões antigas.
 const competenciasFechadasExistentes=impostos
  .map(x=>String(x.competencia||"").slice(0,7))
  .filter(c=>c && c < mesAtualCalendario)
  .sort();

 const ultimaFechada=competenciasFechadasExistentes.at(-1)||"2026-08";
 const proxima=shift(ultimaFechada,1);

 // Nunca gera o mês atual ou futuro.
 const competenciaFechada=proxima < mesAtualCalendario;

 // Exemplo SET/2026:
 // NEO referência SET/2026 + 3RN referência AGO/2026.
 const mesNeo=proxima;
 const mes3RN=shift(proxima,-1);

 const notasNeo=notas.filter(x=>
  norm(x.fornecedor)==="neo" &&
  ym(x.referencia_inicio)===mesNeo
 );
 const notas3RN=notas.filter(x=>
  norm(x.fornecedor)==="3rn" &&
  ym(x.referencia_inicio)===mes3RN
 );

 const valorNeo=notasNeo.reduce((t,x)=>t+valorBanco(x.valor_nota),0);
 const valor3RN=notas3RN.reduce((t,x)=>t+valorBanco(x.valor_nota),0);
 const temNeo=notasNeo.length>0 && valorNeo>0;
 const tem3RN=notas3RN.length>0 && valor3RN>0;
 const jaExiste=impostos.some(x=>String(x.competencia||"").slice(0,7)===proxima);

 // TRAVA ABSOLUTA: sem as duas notas exatas + mês fechado, não insere nada.
 if(competenciaFechada && !jaExiste && temNeo && tem3RN){
  const base=Number((valorNeo+valor3RN).toFixed(2));
  const imposto=Number((base*0.08).toFixed(2));
  const vencimento=`${shift(proxima,1)}-20`;

  const q=await sb.from("controle_simples_nacional").insert({
   competencia:proxima,
   valor_emitido:base,
   aliquota:8,
   valor_imposto:imposto,
   vencimento,
   status:"Pendente",
   data_pagamento:null
  }).select("*").single();

  if(q.error){setMsg(q.error.message);return}
  if(q.data){
   impostos=[...impostos,q.data as I];
   setMsg(`Simples ${competenciaBR(proxima)} gerado somente após fechamento: NEO ${competenciaBR(mesNeo)} + 3RN ${competenciaBR(mes3RN)} × 8%.`);
  }
 }

 impostos.sort((x,y)=>{
  const sx=situacao(x.status,x.vencimento),sy=situacao(y.status,y.vencimento);
  const prioridade=(st:string)=>st==="Atrasado"?0:st==="Pendente"?1:2;
  const dif=prioridade(sx)-prioridade(sy);
  if(dif!==0)return dif;
  return String(x.vencimento).localeCompare(String(y.vencimento));
 });

 setIs(impostos);
 setPs((b.data||[]) as P[]);
 setXs((c.data||[]) as X[]);
}

useEffect(()=>{void load()},[]);

const impostosFiltrados=is.filter(x=>{
 const comp=String(x.competencia||"").slice(0,7),data=String(x.vencimento||"").slice(0,10);
 return (!competenciaFiltro||comp===competenciaFiltro)&&(!dataDeFiltro||data>=dataDeFiltro)&&(!dataAteFiltro||data<=dataAteFiltro);
});
const parcelasFiltradas=xs.filter(x=>{
 const data=String(x.vencimento||"").slice(0,10);
 return (!competenciaFiltro||data.slice(0,7)===competenciaFiltro)&&(!dataDeFiltro||data>=dataDeFiltro)&&(!dataAteFiltro||data<=dataAteFiltro);
});















function novoI(){setEi(null);setFi({competencia:mes(),valorEmitido:"",valorImposto:"",vencimento:h(),status:"Pendente",dataPagamento:""});setMi(true)}function editI(x:I){setEi(x);setFi({competencia:x.competencia,valorEmitido:String(x.valor_emitido),valorImposto:String(x.valor_imposto),vencimento:x.vencimento,status:x.status,dataPagamento:x.data_pagamento||""});setMi(true)}















async function saveI(e:FormEvent){e.preventDefault();const ve=n(fi.valorEmitido),vi=n(fi.valorImposto),al=calcAliquota(ve,vi);if(ve<=0||vi<=0){setMsg("Informe o valor emitido e o valor do imposto.");return}const p={competencia:fi.competencia,valor_emitido:ve,aliquota:al,valor_imposto:vi,vencimento:fi.vencimento,status:fi.status,data_pagamento:fi.status==="Pago"?(fi.dataPagamento||h()):null};const q=ei?await sb.from("controle_simples_nacional").update(p).eq("id",ei.id):await sb.from("controle_simples_nacional").insert(p);if(q.error)setMsg(q.error.message);else{setMi(false);await load()}}















async function payI(x:I){const pago=x.status!=="Pago",q=await sb.from("controle_simples_nacional").update({status:pago?"Pago":"Pendente",data_pagamento:pago?h():null}).eq("id",x.id);if(q.error)setMsg(q.error.message);else await load()}async function del(t:string,id:string){if(!confirm("Deseja excluir este lançamento?"))return;const q=await sb.from(t).delete().eq("id",id);if(q.error)setMsg(q.error.message);else await load()}















function novoP(atual=false){setEp(null);setFp(atual?{nome:"Parcelamento 01",valor:"370,00",total:"59",primeiro:h(),dia:"28"}:{nome:"",valor:"",total:"",primeiro:h(),dia:"28"});setMp(true)}function editP(x:P){setEp(x);setFp({nome:x.nome,valor:String(x.valor_parcela),total:String(x.total_parcelas),primeiro:x.primeiro_vencimento,dia:String(x.dia_vencimento)});setMp(true)}















async function saveP(e:FormEvent){e.preventDefault();const valor=n(fp.valor),total=Number(fp.total),dia=Number(fp.dia),p={nome:fp.nome,valor_parcela:valor,total_parcelas:total,primeiro_vencimento:fp.primeiro,dia_vencimento:dia,ativo:true};if(ep){const antigas=xs.filter(x=>x.parcelamento_id===ep.id);const q=await sb.from("simples_parcelamentos").update(p).eq("id",ep.id);if(q.error){setMsg(q.error.message);return}const del=await sb.from("simples_parcelas").delete().eq("parcelamento_id",ep.id);if(del.error){setMsg(del.error.message);return}const[a,b,d]=fp.primeiro.split("-").map(Number),rows=Array.from({length:total},(_,i)=>{const z=new Date(a,b-1+i,1,12),u=new Date(z.getFullYear(),z.getMonth()+1,0).getDate();z.setDate(i===0?Math.min(d,u):Math.min(dia,u));const ant=antigas.find(x=>x.numero_parcela===i+1);return{parcelamento_id:ep.id,numero_parcela:i+1,valor,vencimento:z.toISOString().slice(0,10),status:ant?.status||"Pendente",data_pagamento:ant?.data_pagamento||null}});const r=await sb.from("simples_parcelas").insert(rows);if(r.error){setMsg(r.error.message);return}}else{const q=await sb.from("simples_parcelamentos").insert(p).select("id").single();if(q.error||!q.data){setMsg(q.error?.message||"Erro");return}const[a,b,d]=fp.primeiro.split("-").map(Number),rows=Array.from({length:total},(_,i)=>{const z=new Date(a,b-1+i,1,12),u=new Date(z.getFullYear(),z.getMonth()+1,0).getDate();z.setDate(i===0?Math.min(d,u):Math.min(dia,u));return{parcelamento_id:q.data.id,numero_parcela:i+1,valor,vencimento:z.toISOString().slice(0,10),status:"Pendente"}});const r=await sb.from("simples_parcelas").insert(rows);if(r.error){setMsg(r.error.message);return}}setMp(false);await load()}















function editX(x:X){setEx(x);setFx({valor:String(x.valor||""),vencimento:x.vencimento||h(),status:x.status,dataPagamento:x.data_pagamento||""});setMx(true)}















async function saveX(e:FormEvent){e.preventDefault();if(!ex)return;const valor=n(fx.valor);if(valor<=0||!fx.vencimento){setMsg("Informe o valor e o vencimento da parcela.");return}const p={valor,vencimento:fx.vencimento,status:fx.status,data_pagamento:fx.status==="Pago"?(fx.dataPagamento||h()):null};const q=await sb.from("simples_parcelas").update(p).eq("id",ex.id);if(q.error){setMsg(q.error.message);return}setMx(false);setEx(null);await load()}















async function payX(x:X){const pago=x.status!=="Pago",q=await sb.from("simples_parcelas").update({status:pago?"Pago":"Pendente",data_pagamento:pago?h():null}).eq("id",x.id);if(q.error)setMsg(q.error.message);else await load()}















const ip=impostosFiltrados.filter(x=>x.status!=="Pago").reduce((a,x)=>a+x.valor_imposto,0),















      impostosAtrasados=impostosFiltrados.filter(x=>x.status!=="Pago"&&x.vencimento<h()).reduce((a,x)=>a+x.valor_imposto,0),















      impostosPagos=impostosFiltrados.filter(x=>x.status==="Pago").reduce((a,x)=>a+x.valor_imposto,0),















      pp=parcelasFiltradas.filter(x=>x.status!=="Pago").reduce((a,x)=>a+x.valor,0),















      parcelasAtrasadas=parcelasFiltradas.filter(x=>x.status!=="Pago"&&x.vencimento<h()).reduce((a,x)=>a+x.valor,0),















      parcelasPagas=parcelasFiltradas.filter(x=>x.status==="Pago").reduce((a,x)=>a+x.valor,0);















return <section className="fc-tax">{msg&&<div className="fc-msg">{msg}</div>}<header className="fc-control-head"><div><b>CONTROLE DE IMPOSTOS</b><h2>Imposto Simples Nacional</h2><p>Impostos mensais e parcelamentos com controle de pagamento.</p></div><button onClick={novoI}>+ Novo imposto</button></header><div className="fc-filter-toolbar"><div className="fc-filter-group">
<label>DE<input type="date" value={dataDeFiltro} onChange={e=>setDataDeFiltro(e.target.value)}/></label>
<label>ATÉ<input type="date" min={dataDeFiltro||undefined} value={dataAteFiltro} onChange={e=>setDataAteFiltro(e.target.value)}/></label>
<label>DATA COMPETÊNCIA<input type="month" value={competenciaFiltro} onChange={e=>setCompetenciaFiltro(e.target.value)}/></label>
{(competenciaFiltro||dataDeFiltro||dataAteFiltro)&&<button type="button" className="fc-clear-period" onClick={()=>{setCompetenciaFiltro("");setDataDeFiltro("");setDataAteFiltro("")}}>Limpar filtros</button>}
</div></div><div className="fc-kpis fc-kpis-simples-resumo fc-kpis-simples-seis">















  <article className="fc-kpi-pendente"><span>Impostos pendentes</span><strong>{m(ip)}</strong><small>Inclui impostos atrasados</small></article>















  <article className="fc-kpi-atrasado"><span>Impostos atrasados</span><strong>{m(impostosAtrasados)}</strong><small>Vencidos e não pagos</small></article>















  <article className="fc-kpi-pago"><span>Impostos pagos</span><strong>{m(impostosPagos)}</strong><small>Valores já quitados</small></article>















  <article className="fc-kpi-pendente"><span>Parcelamentos pendentes</span><strong>{m(pp)}</strong><small>Inclui parcelas atrasadas</small></article>















  <article className="fc-kpi-atrasado"><span>Parcelamentos atrasados</span><strong>{m(parcelasAtrasadas)}</strong><small>Parcelas vencidas não pagas</small></article>















  <article className="fc-kpi-pago"><span>Parcelamentos pagos</span><strong>{m(parcelasPagas)}</strong><small>Parcelas já quitadas</small></article>















 </div><h3>IMPOSTOS MENSAIS</h3><div className="fc-table"><table><thead><tr><th>Competência</th><th>Valor emitido</th><th>Imposto</th><th>Alíquota efetiva</th><th>Vencimento</th><th>Status</th><th>Pagamento</th><th>Ações</th></tr></thead><tbody>{impostosFiltrados.map(x=>{const st=situacao(x.status,x.vencimento),al=Number(x.aliquota||0)>0?Number(x.aliquota):calcAliquota(Number(x.valor_emitido||0),Number(x.valor_imposto||0));return <tr key={x.id} className={`fc-simples-row fc-simples-${st.toLowerCase()}`}><td>{competenciaBR(x.competencia)}</td><td>{m(x.valor_emitido)}</td><td>{m(x.valor_imposto)}</td><td><span className="fc-aliquota">{pct(al)}</span></td><td>{br(x.vencimento)}</td><td><span className={`fc-status-simples ${st.toLowerCase()}`}>{st==="Pago"?"✓ Pago":st==="Atrasado"?"● Atrasado":"● Pendente"}</span></td><td>{br(x.data_pagamento)}</td><td><div className="fc-actions"><button className={x.status==="Pago"?"fc-reabrir":"fc-marcar-pago"} onClick={()=>void payI(x)}>{x.status==="Pago"?"Reabrir":"✓ Marcar pago"}</button><button onClick={()=>editI(x)}>Editar</button><button className="fc-delete" onClick={()=>void del("controle_simples_nacional",x.id)}>Excluir</button></div></td></tr>})}</tbody></table></div><div className="fc-section-title"><div><h3>PARCELAMENTOS DO SIMPLES</h3><small>Controle parcela por parcela</small></div><button onClick={()=>novoP(false)}>+ Novo parcelamento</button></div>{!ps.length&&<div className="fc-current-installment"><div><b>PARCELAMENTO 01</b><p>59x de R$ 370,00 • vencimento todo dia 28 • total R$ 21.830,00</p></div><button onClick={()=>novoP(true)}>Cadastrar este parcelamento</button></div>}{ps.map(p=>{const l=parcelasFiltradas.filter(x=>x.parcelamento_id===p.id),pagas=l.filter(x=>x.status==="Pago").length,saldo=l.filter(x=>x.status!=="Pago").reduce((a,x)=>a+x.valor,0);return <article className="fc-installment-card" key={p.id}><header><div><h4>{p.nome}</h4><p>{p.total_parcelas}x de {m(p.valor_parcela)} • vence dia {p.dia_vencimento}</p></div><div><b>{pagas}/{p.total_parcelas} pagas • saldo {m(saldo)}</b> <button onClick={()=>editP(p)}>Editar</button> <button className="fc-delete" onClick={()=>void del("simples_parcelamentos",p.id)}>Excluir</button></div></header><div className="fc-table"><table><thead><tr><th>Parcela</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Pagamento</th><th>Ação</th></tr></thead><tbody>{l.map(x=>{const st=situacao(x.status,x.vencimento);return <tr key={x.id}><td>{x.numero_parcela}/{p.total_parcelas}</td><td>{m(x.valor)}</td><td>{br(x.vencimento)}</td><td><span className={`fc-status-simples ${st.toLowerCase()}`}>{st==="Pago"?"✓ Pago":st==="Atrasado"?"● Atrasado":"● Pendente"}</span></td><td>{br(x.data_pagamento)}</td><td><div className="fc-parcela-actions"><button className={x.status==="Pago"?"fc-reabrir":"fc-marcar-pago"} onClick={()=>void payX(x)}>{x.status==="Pago"?"Reabrir":"✓ Marcar pago"}</button><button type="button" className="fc-edit fc-parcela-edit" onClick={()=>editX(x)}>Editar</button></div></td></tr>})}</tbody></table></div></article>})}{mi&&<div className="fc-bg"><form className="fc-modal" onSubmit={saveI}><header><h2>{ei?"Editar":"Novo"} imposto</h2><button type="button" onClick={()=>setMi(false)}>×</button></header><div className="fc-form"><label>Competência<input type="month" value={fi.competencia} onChange={e=>setFi({...fi,competencia:e.target.value})}/></label><label>Valor emitido<input value={fi.valorEmitido} onChange={e=>setFi({...fi,valorEmitido:e.target.value})}/></label><label>Valor do imposto<input value={fi.valorImposto} onChange={e=>setFi({...fi,valorImposto:e.target.value})}/></label><label>Alíquota efetiva (%)<div className="fc-aliquota-preview"><strong>{pct(calcAliquota(n(fi.valorEmitido),n(fi.valorImposto)))}</strong><small>Calculada automaticamente</small></div></label><label>Vencimento<input type="date" value={fi.vencimento} onChange={e=>setFi({...fi,vencimento:e.target.value})}/></label><label>Status<select value={fi.status} onChange={e=>setFi({...fi,status:e.target.value as S,dataPagamento:e.target.value==="Pago"?(fi.dataPagamento||h()):""})}><option value="Pendente">Pendente</option><option value="Pago">Pago</option></select></label>{fi.status==="Pago"&&<label>Data do pagamento<input type="date" value={fi.dataPagamento} onChange={e=>setFi({...fi,dataPagamento:e.target.value})}/></label>}</div><footer><button type="button" onClick={()=>setMi(false)}>Cancelar</button><button>Salvar</button></footer></form></div>}{mp&&<div className="fc-bg"><form className="fc-modal" onSubmit={saveP}><header><h2>{ep?"Editar":"Novo"} parcelamento</h2><button type="button" onClick={()=>setMp(false)}>×</button></header><div className="fc-form"><label>Nome<input value={fp.nome} onChange={e=>setFp({...fp,nome:e.target.value})}/></label><label>Valor da parcela<input value={fp.valor} onChange={e=>setFp({...fp,valor:e.target.value})}/></label><label>Total de parcelas<input type="number" value={fp.total} onChange={e=>setFp({...fp,total:e.target.value})}/></label><label>Primeiro vencimento<input type="date" value={fp.primeiro} onChange={e=>setFp({...fp,primeiro:e.target.value})}/></label><label>Dia do vencimento<input type="number" value={fp.dia} onChange={e=>setFp({...fp,dia:e.target.value})}/></label></div><footer><button type="button" onClick={()=>setMp(false)}>Cancelar</button><button>Gerar parcelamento</button></footer></form></div>}{mx&&ex&&<div className="fc-bg"><form className="fc-modal fc-modal-parcela" onSubmit={saveX}><header><div><small>PARCELA {ex.numero_parcela}</small><h2>Editar parcela do Simples</h2></div><button type="button" onClick={()=>{setMx(false);setEx(null)}}>×</button></header><div className="fc-form"><label>Valor da parcela<input value={fx.valor} onChange={e=>setFx({...fx,valor:e.target.value})}/></label><label>Vencimento<input type="date" value={fx.vencimento} onChange={e=>setFx({...fx,vencimento:e.target.value})}/></label><label>Status<select value={fx.status} onChange={e=>setFx({...fx,status:e.target.value as S,dataPagamento:e.target.value==="Pago"?(fx.dataPagamento||h()):""})}><option value="Pendente">Pendente</option><option value="Pago">Pago</option></select></label>{fx.status==="Pago"&&<label>Data do pagamento<input type="date" value={fx.dataPagamento} onChange={e=>setFx({...fx,dataPagamento:e.target.value})}/></label>}</div><footer><button type="button" onClick={()=>{setMx(false);setEx(null)}}>Cancelar</button><button type="submit">Salvar parcela</button></footer></form></div>}</section>}