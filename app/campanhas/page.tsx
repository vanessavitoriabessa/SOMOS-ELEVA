"use client";

import {ChangeEvent,FormEvent,useEffect,useMemo,useState} from "react";
import {Trophy,Plus,Edit3,Target,CalendarDays,Gift,X,ImagePlus,Upload,UsersRound,Trash2,Pin} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import "./campanhas.css";

type Vendedora={id:string;nome:string;equipe?:string|null;time_id?:string|null;foto_url?:string|null};
type PropostaCompra={vendedora?:string;consultora?:string;tabela?:string;percentualTabela?:number;valorContrato?:number;valorMeta?:number;status?:string;dataCadastro?:string;dataPagamento?:string};
type RegistroClt={consultora?:string;parcela?:number;status?:string;criadoEm?:string;dataPagamento?:string};
type LinhaRanking={nome:string;compra:number;clt:number;producao:number;contratos:number;percentualMeta:number;faltaMeta:number};
type C={id:string;nome:string;descricao:string|null;capa_url:string|null;capa_ajuste?:"conter"|"preencher";capa_zoom?:number;premio_titulo:string|null;premio_descricao:string|null;meta_valor:number;data_inicio:string|null;data_fim:string|null;produto:string;status_proposta:string;criterio_ranking:string;tipo_ranking:string;situacao:string;fixada?:boolean;capa_pos_x?:number;capa_pos_y?:number;participantes?:string[]};

const blank={nome:"",descricao:"",capa_url:"",capa_ajuste:"conter" as "conter"|"preencher",capa_zoom:100,premio_titulo:"",premio_descricao:"",meta_valor:"",data_inicio:"",data_fim:"",produto:"Todos",status_proposta:"Paga",criterio_ranking:"Produção",tipo_ranking:"Vendedora",situacao:"Rascunho",capa_pos_x:50,capa_pos_y:50,participantes:[] as string[]};

const br=(x:string|null)=>x?x.slice(0,10).split("-").reverse().join("/"):"A definir";
const money=(n:number)=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const tabelasCompra=[{nome:"NEO NORMAL",percentual:100},{nome:"NEO FLEX 1",percentual:82},{nome:"NEO FLEX 2",percentual:67},{nome:"NEO FLEX 3",percentual:52},{nome:"NEO FLEX 4",percentual:37},{nome:"NEO FLEX 5",percentual:17}];
const norm=(v:unknown)=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
const statusNorm=(v?:string)=>norm(v).replace(/\s+/g," ");
function dt(v?:string){if(!v)return null;const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);const d=new Date(v);return Number.isNaN(d.getTime())?null:d}
function noPeriodo(v:string|undefined,ini:string|null,fim:string|null){const d=dt(v);if(!d)return false;if(ini){const i=dt(ini);if(i&&d<i)return false}if(fim){const f=dt(fim);if(f){f.setHours(23,59,59,999);if(d>f)return false}}return true}
function nomeCompra(p:PropostaCompra){return String(p.vendedora||p.consultora||"").trim()}
function producaoCompra(p:PropostaCompra){const salvo=Number(p.valorMeta||0);if(salvo>0)return salvo;const nome=norm(p.tabela);const t=tabelasCompra.find(x=>nome.startsWith(norm(x.nome)));return Number(p.valorContrato||0)*((t?.percentual??Number(p.percentualTabela||0))/100)}

export default function Campanhas(){
 const s=useMemo(()=>createClient(),[]),[list,setList]=useState<C[]>([]),[vendedoras,setVendedoras]=useState<Vendedora[]>([]),[admin,setAdmin]=useState(false),[modal,setModal]=useState(false),[edit,setEdit]=useState<C|null>(null),[f,setF]=useState(blank),[msg,setMsg]=useState(""),[uploading,setUploading]=useState(false),[buscaVendedora,setBuscaVendedora]=useState(""),[propostas,setPropostas]=useState<PropostaCompra[]>([]),[registrosClt,setRegistrosClt]=useState<RegistroClt[]>([]);

 async function api(method="GET",body?:any){const{data}=await s.auth.getSession();const r=await fetch("/api/campanhas",{method,headers:{Authorization:`Bearer ${data.session?.access_token}`,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"});const j=await r.json();if(!r.ok)throw Error(j.erro);return j}
 async function load(){
  try{
   const j=await api();
   setList(j.campanhas||[]);
   setAdmin(!!j.podeEditar);

   let lista:Vendedora[]=j.vendedoras||[];

   // Fallback: usa a API de consultoras que já existe no Somos Eleva.
   // Assim os nomes aparecem mesmo que a API de campanhas ainda não os devolva.
   if(!lista.length){
    const{data}=await s.auth.getSession();
    const token=data.session?.access_token;
    if(token){
     const resposta=await fetch("/api/consultoras",{
      headers:{Authorization:`Bearer ${token}`},
      cache:"no-store"
     });
     const json=await resposta.json();
     if(resposta.ok){
      lista=(json.consultoras||[])
       .filter((item:any)=>String(item.perfil||"").toLowerCase().includes("consult"))
       .map((item:any)=>({
        id:String(item.id),
        nome:String(item.nome||""),
        equipe:item.equipe||null,
        time_id:item.time_id||null,
        foto_url:item.foto_url||null
       }))
       .filter((item:Vendedora)=>item.id&&item.nome);
     }
    }
   }

   setVendedoras(lista);
   const{data:sessao}=await s.auth.getSession();const token=sessao.session?.access_token;
   if(token){
    const[rp,rc]=await Promise.all([fetch("/api/propostas",{headers:{Authorization:`Bearer ${token}`},cache:"no-store",credentials:"omit"}),fetch("/api/clt",{headers:{Authorization:`Bearer ${token}`},cache:"no-store",credentials:"omit"})]);
    if(rp.ok){const j=await rp.json();setPropostas(Array.isArray(j.propostas)?j.propostas:[])}
    if(rc.ok){const j=await rc.json();setRegistrosClt(Array.isArray(j.registros)?j.registros:[])}
   }
  }catch(e){
   setMsg(e instanceof Error?e.message:"Erro")
  }
 }
 useEffect(()=>{void load()},[]);

 const campanhasAtivas=list.filter(x=>x.situacao==="Ativa").sort((a,b)=>Number(!!b.fixada)-Number(!!a.fixada));
 const campanhasNaoAtivas=list.filter(x=>x.situacao!=="Ativa");

 function rankingDaCampanha(campanha:C):LinhaRanking[]{
  const ids=new Set(campanha.participantes||[]),map=new Map<string,LinhaRanking>();
  vendedoras.filter(v=>ids.has(v.id)).forEach(v=>map.set(norm(v.nome),{nome:v.nome,compra:0,clt:0,producao:0,contratos:0,percentualMeta:0,faltaMeta:Number(campanha.meta_valor||0)}));
  if(campanha.produto!=="CLT")propostas.forEach(p=>{const l=map.get(norm(nomeCompra(p)));if(!l)return;const ok=campanha.status_proposta==="Paga"
   ? statusNorm(p.status)==="pago"&&noPeriodo(p.dataCadastro,campanha.data_inicio,campanha.data_fim)&&noPeriodo(p.dataPagamento,campanha.data_inicio,campanha.data_fim)
   : noPeriodo(p.dataCadastro,campanha.data_inicio,campanha.data_fim);if(ok){l.compra+=producaoCompra(p);l.contratos++}});
  if(campanha.produto!=="Compra de Dívida")registrosClt.forEach(r=>{const l=map.get(norm(r.consultora));if(!l)return;const ok=campanha.status_proposta==="Paga"
   ? statusNorm(r.status)==="pago"&&noPeriodo(r.criadoEm,campanha.data_inicio,campanha.data_fim)&&noPeriodo(r.dataPagamento,campanha.data_inicio,campanha.data_fim)
   : noPeriodo(r.criadoEm,campanha.data_inicio,campanha.data_fim);if(ok){l.clt+=Number(r.parcela||0);l.contratos++}});
  const meta=Number(campanha.meta_valor||0);
  return[...map.values()].map(l=>{const producao=l.compra+l.clt;return{...l,producao,percentualMeta:meta>0?producao/meta*100:0,faltaMeta:Math.max(meta-producao,0)}}).sort((a,b)=>b.producao-a.producao);
 }

 function open(c?:C){setBuscaVendedora("");if(c){setEdit(c);setF({...blank,...c,meta_valor:String(c.meta_valor||""),descricao:c.descricao||"",capa_url:c.capa_url||"",capa_ajuste:c.capa_ajuste||"conter",capa_zoom:Number(c.capa_zoom||100),capa_pos_x:Number(c.capa_pos_x??50),capa_pos_y:Number(c.capa_pos_y??50),premio_titulo:c.premio_titulo||"",premio_descricao:c.premio_descricao||"",data_inicio:c.data_inicio||"",data_fim:c.data_fim||"",criterio_ranking:"Produção",tipo_ranking:"Vendedora",participantes:c.participantes||[]})}else{setEdit(null);setF(blank)}setModal(true)}

 async function uploadCover(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMsg("Use uma imagem JPG, PNG ou WEBP.");return}if(file.size>10*1024*1024){setMsg("A capa deve ter no máximo 10 MB.");return}setUploading(true);try{const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";const name=`${Date.now()}-${crypto.randomUUID()}.${ext}`;const{error}=await s.storage.from("campanhas-capas").upload(name,file,{contentType:file.type,cacheControl:"3600",upsert:false});if(error)throw error;const{data}=s.storage.from("campanhas-capas").getPublicUrl(name);setF({...f,capa_url:data.publicUrl});}catch(e){setMsg(e instanceof Error?e.message:"Erro ao enviar capa")}finally{setUploading(false);e.target.value=""}}

 function toggleParticipante(id:string){setF(a=>({...a,participantes:a.participantes.includes(id)?a.participantes.filter(x=>x!==id):[...a.participantes,id]}))}
 const vendedorasFiltradas=vendedoras.filter(v=>v.nome.toLowerCase().includes(buscaVendedora.trim().toLowerCase()));
 function selecionarTodas(){setF(a=>({...a,participantes:vendedoras.map(v=>v.id)}))}
 function limparParticipantes(){setF(a=>({...a,participantes:[]}))}

 async function save(e:FormEvent){e.preventDefault();if(!f.participantes.length){setMsg("Selecione pelo menos uma vendedora para participar da campanha.");return}try{const j=await api(edit?"PATCH":"POST",{...f,...(edit?{id:edit.id}:{}),criterio_ranking:"Produção",tipo_ranking:"Vendedora",meta_valor:Number(f.meta_valor.replace(/\./g,"").replace(",","."))});setMsg(j.mensagem);setModal(false);await load()}catch(e){setMsg(e instanceof Error?e.message:"Erro")}}
 async function excluirCampanha(c:C){
  if(!window.confirm(`Tem certeza que deseja excluir a campanha "${c.nome}"? Essa ação removerá a campanha e seus participantes e não poderá ser desfeita.`))return;
  try{const j=await api("DELETE",{id:c.id});setMsg(j.mensagem||"Campanha excluída com sucesso.");if(edit?.id===c.id){setModal(false);setEdit(null)}await load()}catch(e){setMsg(e instanceof Error?e.message:"Erro ao excluir campanha")}
 }
 async function fixarCampanha(c:C){
  try{const j=await api("PATCH",{acao:"fixar",id:c.id});setMsg(j.mensagem||"Campanha fixada no topo.");await load()}catch(e){setMsg(e instanceof Error?e.message:"Erro ao fixar campanha")}
 }

 return <AppShell
  title="Campanhas"
  subtitle="Acompanhe campanhas ativas, ranking e resultados."
>
  <main className="camp"><header><div><small>GESTÃO COMERCIAL</small><h1><Trophy/> Campanhas</h1><p>Acompanhe campanhas ativas, ranking e resultados.</p></div>{admin&&<button className="blue" onClick={()=>open()}><Plus/> Nova campanha</button>}</header>{msg&&<div className="msg">{msg}</div>}

 {campanhasAtivas.length===0?<section className="empty"><Trophy/><h2>Nenhuma campanha ativa</h2><p>Crie uma nova campanha ou ative uma campanha existente.</p>{admin&&<button className="blue" onClick={()=>open()}><Plus/> Criar campanha</button>}</section>:
 campanhasAtivas.map(campanha=>{
  const ranking=rankingDaCampanha(campanha),lider=ranking[0]||null,producaoLider=lider?.producao||0,percentualLider=lider?.percentualMeta||0;
  return <section className="active-campaign-block" key={campanha.id}>
   <section className={`hero hero-real-image ${campanha.capa_url?"has-cover":""}`}>
    {campanha.capa_url&&<div className="hero-cover-stage"><img src={campanha.capa_url} alt={`Capa da campanha ${campanha.nome}`} className="hero-cover-img campaign-cover-natural"/></div>}
    <div className="hero-shade"/>
    <div className="hero-copy"><b>● CAMPANHA ATIVA {campanha.fixada&&<span className="campaign-pinned-label">• 📌 FIXADA</span>}</b><h2>{campanha.nome}</h2><p>{campanha.descricao}</p></div>
    {admin&&<div className="hero-admin-actions">
     {campanha.fixada
      ? <button type="button" className="hero-pin-button pinned" disabled title="Esta campanha está fixada no topo"><Pin/> Campanha fixada</button>
      : <button type="button" className="hero-pin-button" onClick={()=>void fixarCampanha(campanha)}><Pin/> Fixar campanha</button>}
     <button className="hero-edit-button" onClick={()=>open(campanha)}><Edit3/> Editar campanha</button>
     <button className="hero-delete-button" onClick={()=>void excluirCampanha(campanha)}><Trash2/> Excluir</button>
    </div>}
   </section>
   <section className="cards"><article><Target/><div><small>Meta</small><strong>{money(campanha.meta_valor)}</strong></div></article><article><CalendarDays/><div><small>Período</small><strong>{campanha.data_inicio&&campanha.data_fim?`${br(campanha.data_inicio)} → ${br(campanha.data_fim)}`:"A definir"}</strong></div></article><article><Gift/><div><small>Premiação</small><strong>{campanha.premio_titulo||"A definir"}</strong><p>{campanha.premio_descricao}</p></div></article><article><Trophy/><div><small>Líder da campanha</small><strong>{lider?lider.nome:"—"}</strong><p>{lider?`${money(producaoLider)} • ${percentualLider.toLocaleString("pt-BR",{maximumFractionDigits:1})}% da meta`:"Aguardando produção"}</p></div></article></section>
   <section className="rank campaign-live-rank"><div className="campaign-rank-head"><div><small>RANKING AO VIVO</small><h2>🏆 Ranking da campanha</h2><p>{campanha.status_proposta==="Paga"?`Só contam propostas digitadas de ${br(campanha.data_inicio)} até ${br(campanha.data_fim)} e pagas até ${br(campanha.data_fim)}. Meta individual por participante.`:campanha.produto==="CLT"?"Produção pelo valor das parcelas CLT.":campanha.produto==="Compra de Dívida"?"Produção pelo valor líquido da Compra de Dívida.":"Compra líquida + parcelas CLT."}</p></div><span>{campanha.status_proposta} • {campanha.produto}</span></div><div className="campaign-goal"><strong>{lider?`${lider.nome} — ${money(producaoLider)}`:"Aguardando produção"} <small>{lider?`de ${money(campanha.meta_valor)} • meta individual`:""}</small></strong><div><i style={{width:`${Math.min(percentualLider,100)}%`}}/></div></div><div className="campaign-rank-table"><div className="campaign-rank-row labels"><span>#</span><span>Participante</span><span>Compra</span><span>CLT Parcela</span><span>Contratos</span><span>Produção</span><span>% Meta</span></div>{ranking.map((l,i)=><div className="campaign-rank-row" key={l.nome}><b>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</b><div><strong>{l.nome}</strong><small>Faltam {money(l.faltaMeta)}</small></div><span>{money(l.compra)}</span><span>{money(l.clt)}</span><strong>{l.contratos}</strong><strong className="prod">{money(l.producao)}</strong><div className="pct"><i style={{width:`${Math.min(l.percentualMeta,100)}%`}}/><span>{l.percentualMeta.toLocaleString("pt-BR",{maximumFractionDigits:1})}%</span></div></div>)}</div></section>
  </section>
 })}
 <section className="history"><h2>Campanhas não ativas</h2>{campanhasNaoAtivas.length===0?<div className="campaign-history-empty">Nenhuma campanha encerrada, pausada, agendada ou em rascunho.</div>:campanhasNaoAtivas.map(c=><div className="row" key={c.id}><strong>{c.nome}</strong><span>{c.situacao}</span><span>{money(c.meta_valor)}</span>{admin&&<div className="campaign-row-actions"><button onClick={()=>open(c)}>Editar</button><button className="delete-campaign" onClick={()=>void excluirCampanha(c)}>Excluir</button></div>}</div>)}</section>

 {modal&&<div className="back"><form className="modal modal-final" onSubmit={save}>
 <div className="mt"><div><small>NOVA CAMPANHA</small><h2>{edit?"Editar campanha":"Criar nova campanha"}</h2><p>Configure a campanha sem precisar alterar o sistema depois.</p></div><button type="button" onClick={()=>setModal(false)}><X/></button></div>

 <div className="modal-body">
  <section className="form-section"><div className="section-title"><b>1</b><div><h3>Identificação</h3><p>Nome, mensagem e imagem principal.</p></div></div>
   <label>Nome<input required value={f.nome} onChange={e=>setF({...f,nome:e.target.value})}/></label>
   <label>Descrição<textarea value={f.descricao} onChange={e=>setF({...f,descricao:e.target.value})}/></label>
   <div className="cover-field"><b>Capa da campanha</b>
   {f.capa_url?<div className="cover-preview cover-preview-natural">
     <img src={f.capa_url} alt="Prévia da capa"/>
     <button type="button" onClick={()=>setF({...f,capa_url:""})}>Remover capa</button>
    </div>:<div className="cover-empty"><ImagePlus/><span>Nenhuma capa selecionada</span></div>}
    <div className="cover-simple-info">
     <strong>Imagem completa, sem cortes</strong>
     <span>A capa será exibida na proporção original da arte.</span>
    </div>
    <label className="upload-btn"><Upload/>{uploading?"Enviando...":"Selecionar imagem"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={uploadCover}/></label>
  </div>
  </section>

  <section className="form-section"><div className="section-title"><b>2</b><div><h3>Período e meta</h3><p>As datas podem ser definidas depois.</p></div></div><div className="g">
   <label>Meta<input value={f.meta_valor} onChange={e=>setF({...f,meta_valor:e.target.value})} placeholder="1.000.000,00"/></label>
   <label>Situação<select value={f.situacao} onChange={e=>setF({...f,situacao:e.target.value})}><option>Rascunho</option><option>Agendada</option><option>Ativa</option><option>Pausada</option><option>Encerrada</option></select></label>
   <label>Início<input type="date" value={f.data_inicio} onChange={e=>setF({...f,data_inicio:e.target.value})}/></label>
   <label>Fim<input type="date" value={f.data_fim} onChange={e=>setF({...f,data_fim:e.target.value})}/></label>
  </div></section>

  <section className="form-section"><div className="section-title"><b>3</b><div><h3>Regras da campanha</h3><p>O ranking é sempre calculado por produção. Em CLT, a produção corresponde ao valor das parcelas.</p></div></div><div className="g">
   <label>Produto<select value={f.produto} onChange={e=>setF({...f,produto:e.target.value})}><option>Todos</option><option>Compra de Dívida</option><option>CLT</option></select></label>
   <label>Considerar<select value={f.status_proposta} onChange={e=>setF({...f,status_proposta:e.target.value})}><option>Digitada</option><option>Paga</option></select></label>
   <div className="participantes-field"><div className="participantes-top"><div><b>Participantes da campanha</b><span>{f.participantes.length} vendedora(s) selecionada(s)</span></div><div><button type="button" onClick={selecionarTodas}>Selecionar todas</button><button type="button" onClick={limparParticipantes}>Limpar seleção</button></div></div><label className="participantes-search"><input value={buscaVendedora} onChange={e=>setBuscaVendedora(e.target.value)} placeholder="Pesquisar vendedora..."/></label><div className="participantes-list">{vendedorasFiltradas.map(v=><button type="button" key={v.id} className={f.participantes.includes(v.id)?"selected":""} onClick={()=>toggleParticipante(v.id)}><span className="participant-check">{f.participantes.includes(v.id)?"✓":""}</span><span><strong>{v.nome}</strong><small>{v.equipe||"Consultora"}</small></span></button>)}</div></div>
  </div></section>

  <section className="form-section"><div className="section-title"><b>4</b><div><h3>Premiação</h3><p>Informe o prêmio exibido na campanha.</p></div></div>
   <label>Premiação<input value={f.premio_titulo} onChange={e=>setF({...f,premio_titulo:e.target.value})} placeholder="Ex.: Viagem para Angra dos Reis"/></label>
   <label>Detalhes do prêmio<input value={f.premio_descricao} onChange={e=>setF({...f,premio_descricao:e.target.value})} placeholder="Ex.: Com direito a 1 acompanhante"/></label>
  </section>
 </div>

 <footer className="modal-footer"><button type="button" className="cancel" onClick={()=>setModal(false)}>Cancelar</button><button className="blue" type="submit" disabled={uploading}>{edit?"Salvar alterações":"Criar campanha"}</button></footer>
 </form></div>}</main>
</AppShell>
}
