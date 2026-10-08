"use client";

import {FormEvent,useEffect,useMemo,useRef,useState} from "react";

import {createClient} from "@/lib/supabase/client";

import "./bate-ponto.css";



type Colab={id:string;nome:string;status:string};

type Ponto={id:string;colaboradora_id:string;jornada_id?:string|null;data:string;entrada:string;saida_almoco:string;retorno_almoco:string;saida:string;falta:boolean;tipo_dia?:string|null;observacao:string;periodo_falta?:string|null;apresentou_atestado?:boolean|null;periodo_reposicao?:string|null;data_falta_referencia?:string|null};

type LinhaImportacaoDigix={
 id:string;
 colaboradora_id:string;
 colaboradora_nome:string;
 data:string;
 entrada:string;
 saida_almoco:string;
 retorno_almoco:string;
 saida:string;
 jornada_id?:string|null;
 status:"ok"|"erro";
 mensagem:string;
 jaExiste:boolean;
 observacao:string;
};



const hoje=()=>new Date().toISOString().slice(0,10), mes=()=>hoje().slice(0,7);

const mins=(v:string)=>{if(!v||!v.includes(":"))return 0;const[h,m]=v.split(":").map(Number);return h*60+m};

const hm=(v:number)=>{const s=v<0?"-":"";v=Math.abs(Math.round(v));return `${s}${Math.floor(v/60)}h${String(v%60).padStart(2,"0")}`};

const fimSemana=(d:string)=>[0,6].includes(new Date(`${d}T12:00:00`).getDay());

const sabado=(d:string)=>new Date(`${d}T12:00:00`).getDay()===6;

const br=(d:string)=>d?d.split("-").reverse().join("/"):"—";

const numBR=(v:string)=>Number(String(v||"0").replace(/\./g,"").replace(",","."))||0;

const moeda=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const nomesDias=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const diasDoMes=(ym:string)=>{const [ano,mesN]=ym.split("-").map(Number);if(!ano||!mesN)return[];const qtd=new Date(ano,mesN,0).getDate();return Array.from({length:qtd},(_,i)=>{const d=`${ano}-${String(mesN).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;return{data:d,dia:nomesDias[new Date(`${d}T12:00:00`).getDay()]}})};

const normalizarDigix=(v:string)=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();

const horaDigix=(v:string)=>{const m=String(v||"").match(/(\d{1,2})[:hH](\d{2})/);if(!m)return "";return `${String(Number(m[1])).padStart(2,"0")}:${m[2]}`};

const dataDigix=(v:string)=>{
 const txt=String(v||"").trim();
 let m=txt.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
 if(m)return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
 m=txt.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
 if(m){const ano=m[3].length===2?`20${m[3]}`:m[3];return `${ano}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;}
 return "";
};

const dividirLinhaDigix=(linha:string,separador:string)=>{
 const partes:string[]=[];let atual="",aspas=false;
 for(let i=0;i<linha.length;i++){
  const c=linha[i];
  if(c==='"'){aspas=!aspas;continue}
  if(c===separador&&!aspas){partes.push(atual.trim());atual="";continue}
  atual+=c;
 }
 partes.push(atual.trim());
 return partes;
};

const separadorDigix=(linha:string)=>{
 if(linha.includes("\t"))return "\t";
 const pontoVirgula=(linha.match(/;/g)||[]).length;
 const virgula=(linha.match(/,/g)||[]).length;
 return pontoVirgula>=virgula?";":",";
};

const indiceCabecalhoDigix=(cabecalhos:string[],testes:Array<(v:string)=>boolean>)=>
 cabecalhos.findIndex((h)=>testes.some((teste)=>teste(normalizarDigix(h))));

const colunaCalculadaDigix=(cabecalho:string)=>{
 const h=normalizarDigix(cabecalho);
 return h.includes("total")||
  h.includes("saldo")||
  h.includes("formula")||
  h.includes("calculo")||
  h.includes("calculado")||
  h.includes("extra")||
  h.includes("devedor")||
  h.includes("devida")||
  h.includes("trabalhado")||
  h.includes("jornada")||
  h.includes("previsto")||
  h.includes("banco");
};

async function carregarPdfJsDigix(){
 const w=window as any;
 if(w.pdfjsLib)return w.pdfjsLib;
 await new Promise<void>((resolve,reject)=>{
  const existente=document.querySelector<HTMLScriptElement>('script[data-pdfjs-digix="true"]');
  if(existente){existente.addEventListener("load",()=>resolve(),{once:true});existente.addEventListener("error",()=>reject(new Error("Não foi possível carregar o leitor de PDF.")),{once:true});return}
  const script=document.createElement("script");
  script.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  script.async=true;
  script.dataset.pdfjsDigix="true";
  script.onload=()=>resolve();
  script.onerror=()=>reject(new Error("Não foi possível carregar o leitor de PDF."));
  document.head.appendChild(script);
 });
 const pdfjs=w.pdfjsLib;
 if(pdfjs?.GlobalWorkerOptions){
  pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
 }
 return pdfjs;
}

async function extrairTextoPdfDigix(arquivo:File){
 const pdfjs=await carregarPdfJsDigix();
 const data=await arquivo.arrayBuffer();
 const pdf=await pdfjs.getDocument({data}).promise;
 const linhas:string[]=[];
 for(let pagina=1;pagina<=pdf.numPages;pagina++){
  const page=await pdf.getPage(pagina);
  const content=await page.getTextContent();
  const itens=(content.items||[]).map((item:any)=>({
   texto:String(item.str||"").trim(),
   x:Number(item.transform?.[4]||0),
   y:Number(item.transform?.[5]||0)
  })).filter((item:any)=>item.texto);
  const grupos:any[]=[];
  itens.sort((a:any,b:any)=>b.y-a.y||a.x-b.x).forEach((item:any)=>{
   let grupo=grupos.find((g:any)=>Math.abs(g.y-item.y)<3);
   if(!grupo){grupo={y:item.y,itens:[]};grupos.push(grupo)}
   grupo.itens.push(item);
  });
  grupos.sort((a:any,b:any)=>b.y-a.y).forEach((grupo:any)=>{
   const linha=grupo.itens.sort((a:any,b:any)=>a.x-b.x).map((item:any)=>item.texto).join(" ").replace(/\s+/g," ").trim();
   if(linha)linhas.push(linha);
  });
 }
 return linhas.join("\n");
}








export default function ControlePontoRH({colaboradoras}:{colaboradoras:Colab[]}){

 const sb=useMemo(()=>createClient(),[]),[pontos,setPontos]=useState<Ponto[]>([]);

 type Jornada={id:string;nome:string;entrada:string;saidaAlmoco:string;retornoAlmoco:string;saida:string;carga:number;tolEntrada:number;tolSaida:number};

 const[jornadas,setJornadas]=useState<Jornada[]>([]);

 const[jornadaId,setJornadaId]=useState("");

 const[cfg,setCfg]=useState({nome:"Jornada 08:30",entrada:"08:30",saidaAlmoco:"12:00",retornoAlmoco:"13:30",saida:"18:00",carga:480,tolEntrada:5,tolSaida:5});

 const[mesRef,setMesRef]=useState(mes()),[pessoa,setPessoa]=useState(""),[modal,setModal]=useState(false),[edit,setEdit]=useState<string|null>(null),[msg,setMsg]=useState("");

 const[abaPonto,setAbaPonto]=useState<"registrar"|"espelho">("registrar"),[modalJornada,setModalJornada]=useState(false);

 const[vinculos,setVinculos]=useState<{colaboradora_id:string;jornada_id:string}[]>([]),[modalEquipe,setModalEquipe]=useState(false),[jornadaEquipe,setJornadaEquipe]=useState<Jornada|null>(null),[selecionados,setSelecionados]=useState<string[]>([]);

 const[modalJornadas,setModalJornadas]=useState(false);

 const[valorHora,setValorHora]=useState("7,71"),[adicionalSabado,setAdicionalSabado]=useState("50");

 const[modalFechamento,setModalFechamento]=useState(false);

 const[fechamentos,setFechamentos]=useState<any[]>([]),[tiposDia,setTiposDia]=useState<{id:string;nome:string}[]>([]),[novoTipoDia,setNovoTipoDia]=useState("");

 const[f,setF]=useState({colaboradora_id:"",jornada_id:"",data:hoje(),entrada:"08:30",saida_almoco:"12:00",retorno_almoco:"13:30",saida:"18:00",falta:false,tipo_dia:"normal",observacao:"",periodo_falta:"dia_inteiro",apresentou_atestado:false,periodo_reposicao:"tarde",data_falta_referencia:""});
 const arquivoDigixRef=useRef<HTMLInputElement>(null);
 const[modalImportacao,setModalImportacao]=useState(false);
 const[linhasImportacao,setLinhasImportacao]=useState<LinhaImportacaoDigix[]>([]);
 const[nomeArquivoDigix,setNomeArquivoDigix]=useState("");
 const[importandoDigix,setImportandoDigix]=useState(false);




 async function carregar(){

  const[a,b,c,d,e]=await Promise.all([sb.from("rh_ponto").select("*").order("data",{ascending:false}),sb.from("rh_jornadas").select("*").order("nome"),sb.from("rh_jornada_colaboradoras").select("*"),sb.from("rh_fechamento_ponto").select("*").order("criado_em",{ascending:false}),sb.from("rh_tipos_dia").select("*").order("nome")]);

  if(a.error||b.error||c.error||d.error||e.error){setMsg((a.error||b.error||c.error||d.error||e.error)!.message);return}

  setVinculos((c.data||[]).map((x:any)=>({colaboradora_id:String(x.colaboradora_id),jornada_id:String(x.jornada_id)}))); setFechamentos(d.data||[]);

  setPontos((a.data||[]) as Ponto[]); setTiposDia((e.data||[]).map((x:any)=>({id:String(x.id),nome:String(x.nome)})));

  const js=(b.data||[]).map((c:any)=>({id:String(c.id),nome:String(c.nome),entrada:String(c.entrada).slice(0,5),saidaAlmoco:String(c.saida_almoco).slice(0,5),retornoAlmoco:String(c.retorno_almoco).slice(0,5),saida:String(c.saida).slice(0,5),carga:Number(c.carga_diaria_min||480),tolEntrada:Number(c.tolerancia_entrada_min??5),tolSaida:Number(c.tolerancia_saida_min??5)}));

  setJornadas(js); if(!jornadaId&&js[0])setJornadaId(js[0].id);

 }

 useEffect(()=>{void carregar()},[]);

 const TOLERANCIA_EXTRA_MIN=10;

 const faltaParcial=(p:Ponto)=>p.tipo_dia==="falta"&&["manha","tarde"].includes(String(p.periodo_falta||""));

 const faltaIntegral=(p:Ponto)=>p.tipo_dia==="falta"&&!faltaParcial(p);

 const ehReposicao=(p:Ponto)=>p.tipo_dia==="reposicao";

 const trabReposicao=(p:Ponto)=>{if(p.periodo_reposicao==="manha")return Math.max(0,mins(p.saida_almoco)-mins(p.entrada));if(p.periodo_reposicao==="tarde")return Math.max(0,mins(p.saida)-mins(p.retorno_almoco));return Math.max(0,mins(p.saida_almoco)-mins(p.entrada))+Math.max(0,mins(p.saida)-mins(p.retorno_almoco));};

 const trabFaltaParcial=(p:Ponto)=>{if(p.periodo_falta==="manha")return Math.max(0,mins(p.saida)-mins(p.retorno_almoco));if(p.periodo_falta==="tarde")return Math.max(0,mins(p.saida_almoco)-mins(p.entrada));return 0;};

 const trab=(p:Ponto)=>faltaIntegral(p)||["feriado","folga","atestado","justificado"].includes(p.tipo_dia||"")||String(p.tipo_dia||"").startsWith("custom:")?0:ehReposicao(p)?trabReposicao(p):faltaParcial(p)?trabFaltaParcial(p):Math.max(0,mins(p.saida_almoco)-mins(p.entrada))+Math.max(0,mins(p.saida)-mins(p.retorno_almoco));

 const jornadaDo=(p:Ponto)=>jornadas.find(j=>j.id===p.jornada_id)||jornadas[0]||cfg;

 const extraDia=(p:Ponto)=>{
 const j=jornadaDo(p);
 const tipo=String(p.tipo_dia||"");
 if(faltaIntegral(p)||faltaParcial(p)||ehReposicao(p)||["feriado","folga","atestado","justificado","atestado_parcial","justificado_parcial"].includes(tipo)||tipo.startsWith("custom:"))return 0;
 if(fimSemana(p.data))return trab(p);
 const excedenteTotal=Math.max(0,trab(p)-(j.carga||480));
 const extraTotal=excedenteTotal>TOLERANCIA_EXTRA_MIN?excedenteTotal:0;
 const extraEntrada=Math.max(0,mins(j.entrada)-mins(p.entrada));
 const extraSaida=Math.max(0,mins(p.saida)-mins(j.saida));
 const extraPontas=(extraEntrada>TOLERANCIA_EXTRA_MIN?extraEntrada:0)+(extraSaida>TOLERANCIA_EXTRA_MIN?extraSaida:0);
 return Math.max(extraTotal,extraPontas);
};

 const devidaDia=(p:Ponto)=>{const j=jornadaDo(p);if(ehReposicao(p)||["feriado","folga","atestado","justificado","atestado_parcial","justificado_parcial"].includes(p.tipo_dia||"")||String(p.tipo_dia||"").startsWith("custom:"))return 0;const carga=j.carga||480;if(faltaIntegral(p))return p.apresentou_atestado?0:carga;if(fimSemana(p.data))return 0;const faltaMin=Math.max(0,carga-trab(p));if(faltaParcial(p)&&p.apresentou_atestado)return 0;const tolerancia=Math.max(j.tolEntrada,j.tolSaida);return faltaMin<=tolerancia?0:faltaMin};

 const creditoCompensacaoDia=(_p:Ponto)=>0;

 const saldo=(p:Ponto)=>extraDia(p)-devidaDia(p);

 const horasJustificadasDia=(p:Ponto)=>{const j=jornadaDo(p);const tipo=p.tipo_dia||"";if(["atestado_parcial","justificado_parcial"].includes(tipo)||(faltaParcial(p)&&p.apresentou_atestado))return Math.max(0,(j.carga||480)-trab(p));if(faltaIntegral(p)&&p.apresentou_atestado)return j.carga||480;return 0;};

 const lista=pontos.filter(p=>(!mesRef||p.data.slice(0,7)===mesRef)&&(!pessoa||p.colaboradora_id===pessoa));

 const calendario=useMemo(()=>diasDoMes(mesRef),[mesRef]);

 const calendarioPessoa=pessoa?calendario.map(d=>({ ...d, ponto: pontos.find(p=>p.colaboradora_id===pessoa&&p.data===d.data)||null })):[];

 const resumoBruto=lista.reduce((r,p)=>{if(faltaIntegral(p)&&!p.apresentou_atestado)r.faltas++;if(sabado(p.data)&&trab(p)>0&&!ehReposicao(p))r.sabados++;r.extras+=extraDia(p);r.devidas+=devidaDia(p);r.reposicao+=ehReposicao(p)?trab(p):0;return r},{extras:0,devidas:0,reposicao:0,faltas:0,sabados:0});

 const listaAnteriorPessoa=pessoa?pontos.filter(p=>p.colaboradora_id===pessoa&&p.data.slice(0,7)<mesRef):[];

 const saldoAnteriorMin=listaAnteriorPessoa.reduce((t,p)=>t+extraDia(p)+(ehReposicao(p)?trab(p):0)-devidaDia(p),0);

 const saldoAnteriorDevedor=Math.max(0,-saldoAnteriorMin);

 const saldoAnteriorCredito=Math.max(0,saldoAnteriorMin);

 const creditoBrutoMes=resumoBruto.reposicao+resumoBruto.extras;

 const compensadoSaldoAnterior=Math.min(saldoAnteriorDevedor,creditoBrutoMes);

 const creditoDepoisSaldoAnterior=Math.max(0,creditoBrutoMes-compensadoSaldoAnterior);

 const saldoAnteriorRestante=Math.max(0,saldoAnteriorDevedor-compensadoSaldoAnterior);

 const compensadoMesAtual=Math.min(creditoDepoisSaldoAnterior,resumoBruto.devidas);

 const devidasMesAtualRestante=Math.max(0,resumoBruto.devidas-compensadoMesAtual);

 const extrasRestantes=Math.max(0,creditoDepoisSaldoAnterior-resumoBruto.devidas);

 const resumo={...resumoBruto,extras:extrasRestantes,devidas:saldoAnteriorRestante+devidasMesAtualRestante,creditos:saldoAnteriorCredito,creditosDisponiveis:saldoAnteriorCredito,compensado:compensadoSaldoAnterior+compensadoMesAtual};

 const saldoLiquidoMin=resumo.extras-resumo.devidas;

 const saldoLiquidoAbs=Math.abs(saldoLiquidoMin);

 const horasTrabalhadas=lista.reduce((t,p)=>t+trab(p),0);

 const horasPrevistas=lista.filter(p=>!fimSemana(p.data)&&!["feriado","folga","atestado","justificado"].includes(p.tipo_dia||"")&&!String(p.tipo_dia||"").startsWith("custom:")).reduce((t,p)=>{const j=jornadaDo(p);return t+(j.carga||480)},0);

 const extrasSabado=lista.filter(p=>sabado(p.data)).reduce((t,p)=>t+extraDia(p),0);

 const extrasSabadoLiquidas=Math.min(extrasSabado,resumo.extras); const extrasDiasUteis=Math.max(0,resumo.extras-extrasSabadoLiquidas);

 const vh=numBR(valorHora), percSab=numBR(adicionalSabado);

 const valorExtraUtil=(extrasDiasUteis/60)*vh*1.5;

 const valorExtraSabado=(extrasSabadoLiquidas/60)*vh*(1+percSab/100);

 const valorExtrasTotal=valorExtraUtil+valorExtraSabado;

 const valorHorasDevedoras=(resumo.devidas/60)*vh;

 const saldoFinanceiro=valorExtrasTotal-valorHorasDevedoras;

 const fechamentoAtual=pessoa?fechamentos.find((x:any)=>x.colaboradora_id===pessoa&&x.competencia===mesRef):null;



 async function fecharCompetencia(){if(!pessoa){setMsg("Selecione uma colaboradora para fechar a competência.");return}const payload={colaboradora_id:pessoa,competencia:mesRef,horas_previstas_min:horasPrevistas,horas_trabalhadas_min:horasTrabalhadas,horas_extras_min:resumo.extras,horas_devedoras_min:resumo.devidas,faltas:resumo.faltas,valor_hora:vh,valor_extras:valorExtrasTotal,valor_devedoras:valorHorasDevedoras,saldo_financeiro:saldoFinanceiro,status:"FECHADO",fechado_em:new Date().toISOString()};const q=await sb.from("rh_fechamento_ponto").upsert(payload,{onConflict:"colaboradora_id,competencia"});if(q.error)setMsg(q.error.message);else{setMsg("Competência fechada com sucesso.");await carregar();setModalFechamento(false)}}

 async function reabrirCompetencia(){if(!fechamentoAtual)return;const q=await sb.from("rh_fechamento_ponto").update({status:"ABERTO",fechado_em:null}).eq("id",fechamentoAtual.id);if(q.error)setMsg(q.error.message);else{setMsg("Competência reaberta.");await carregar()}}

 function novo(dataAlvo?:string){setNovoTipoDia("");const cid=pessoa||colaboradoras.find(c=>c.status!=="Desligada")?.id||"";const jid=vinculos.find(v=>v.colaboradora_id===cid)?.jornada_id||jornadaId||jornadas[0]?.id||"";const j=jornadas.find(x=>x.id===jid)||jornadas[0]||cfg;setEdit(null);setF({colaboradora_id:cid,jornada_id:jid,data:dataAlvo||hoje(),entrada:j.entrada,saida_almoco:j.saidaAlmoco,retorno_almoco:j.retornoAlmoco,saida:j.saida,falta:false,tipo_dia:"normal",observacao:"",periodo_falta:"dia_inteiro",apresentou_atestado:false,periodo_reposicao:"tarde",data_falta_referencia:""});setModal(true)}

 function editar(p:Ponto){setNovoTipoDia("");setEdit(p.id);setF({colaboradora_id:p.colaboradora_id,jornada_id:p.jornada_id||"",data:p.data,entrada:String(p.entrada||cfg.entrada).slice(0,5),saida_almoco:String(p.saida_almoco||cfg.saidaAlmoco).slice(0,5),retorno_almoco:String(p.retorno_almoco||cfg.retornoAlmoco).slice(0,5),saida:String(p.saida||cfg.saida).slice(0,5),falta:p.falta,tipo_dia:p.tipo_dia||(p.falta?"falta":"normal"),observacao:p.observacao,periodo_falta:p.periodo_falta||"dia_inteiro",apresentou_atestado:!!p.apresentou_atestado,periodo_reposicao:p.periodo_reposicao||"tarde",data_falta_referencia:p.data_falta_referencia||""});setModal(true)}

 async function criarTipoDia(){

  const nome=novoTipoDia.trim();

  if(!nome){setMsg("Digite o nome do novo tipo do dia.");return}

  const q=await sb.from("rh_tipos_dia").insert({nome}).select("id,nome").single();

  if(q.error){setMsg(q.error.message);return}

  setTiposDia(a=>[...a,{id:String(q.data.id),nome:String(q.data.nome)}].sort((x,y)=>x.nome.localeCompare(y.nome)));

  setF({...f,tipo_dia:`custom:${q.data.id}`});

  setNovoTipoDia("");

 }

 async function salvar(e:FormEvent){e.preventDefault();const faltaDiaInteiro=f.tipo_dia==="falta"&&f.periodo_falta==="dia_inteiro";const semHorario=faltaDiaInteiro||["feriado","folga","atestado","justificado"].includes(f.tipo_dia)||f.tipo_dia.startsWith("custom:");const p={...f,falta:f.tipo_dia==="falta",periodo_falta:f.tipo_dia==="falta"?f.periodo_falta:null,apresentou_atestado:f.tipo_dia==="falta"?f.apresentou_atestado:false,periodo_reposicao:f.tipo_dia==="reposicao"?f.periodo_reposicao:null,data_falta_referencia:f.tipo_dia==="reposicao"&&f.data_falta_referencia?f.data_falta_referencia:null,entrada:semHorario?null:f.entrada,saida_almoco:semHorario?null:f.saida_almoco,retorno_almoco:semHorario?null:f.retorno_almoco,saida:semHorario?null:f.saida};const q=edit?await sb.from("rh_ponto").update(p).eq("id",edit):await sb.from("rh_ponto").insert(p);if(q.error)setMsg(q.error.message);else{setModal(false);await carregar()}}

 async function excluir(id:string){if(!confirm("Excluir este registro de ponto?"))return;const q=await sb.from("rh_ponto").delete().eq("id",id);if(q.error)setMsg(q.error.message);else await carregar()}

 function encontrarColaboradoraDigix(nome:string){
  const termo=normalizarDigix(nome);
  if(!termo)return null;
  return colaboradoras.find(c=>normalizarDigix(c.nome)===termo)
   || colaboradoras.find(c=>normalizarDigix(c.nome).includes(termo)||termo.includes(normalizarDigix(c.nome)));
 }

 async function lerArquivoDigix(e:any){
  const arquivo:File|undefined=e.target.files?.[0];
  e.target.value="";
  if(!arquivo)return;

  const colaboradoraSelecionada=colaboradoras.find(c=>c.id===pessoa)||null;
  if(!colaboradoraSelecionada){
   setMsg("Selecione primeiro a colaboradora e o mês de referência antes de anexar o arquivo do Digix.");
   return;
  }

  setMsg("");
  setNomeArquivoDigix(arquivo.name);
  setLinhasImportacao([]);

  const nome=arquivo.name.toLowerCase();
  if(nome.endsWith(".pdf")){
   try{
    const textoPdf=await extrairTextoPdfDigix(arquivo);
    const linhasPdf=textoPdf.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    const resultado:LinhaImportacaoDigix[]=[];

    linhasPdf.forEach((linha,idx)=>{
     const matchData=linha.match(/(?:Dom|Seg|Ter|Qua|Qui|Sex|Sab|Sáb)\s*[-–]\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
     if(!matchData)return;

     const ano=(matchData[3]?.length===4?matchData[3]:mesRef.slice(0,4));
     const data=`${ano}-${String(Number(matchData[2])).padStart(2,"0")}-${String(Number(matchData[1])).padStart(2,"0")}`;
     const horas=(linha.match(/\b\d{1,2}:\d{2}\b/g)||[]).map(horaDigix).filter(Boolean);
     if(!horas.length)return;

     const entrada=horas[0]||"";
     const saidaAlmoco=horas[1]||"";
     const retorno=horas[2]||"";
     const saida=horas[3]||"";
     const jornadaPadrao=vinculos.find(v=>v.colaboradora_id===colaboradoraSelecionada.id)?.jornada_id||jornadaId||jornadas[0]?.id||"";
     const existe=pontos.find(p=>p.colaboradora_id===colaboradoraSelecionada.id&&p.data===data);
     const erros:string[]=[];
     if(data.slice(0,7)!==mesRef)erros.push("Fora do mês selecionado");
     if(!entrada||!saidaAlmoco||!retorno||!saida)erros.push("Horários incompletos");

     resultado.push({
      id:`pdf-digix-${idx}`,
      colaboradora_id:colaboradoraSelecionada.id,
      colaboradora_nome:colaboradoraSelecionada.nome,
      data,
      entrada,
      saida_almoco:saidaAlmoco,
      retorno_almoco:retorno,
      saida,
      jornada_id:jornadaPadrao,
      status:(erros.length?"erro":"ok") as "ok"|"erro",
      mensagem:erros.join(" · ")||(existe?"Já existe ponto neste dia; será atualizado":"Pronto para importar"),
      jaExiste:Boolean(existe),
      observacao:`Importado do PDF Digix · ${arquivo.name}`
     });
    });

    if(!resultado.length){
     setMsg("Não consegui localizar marcações de ponto nesse PDF do Digix.");
     return;
    }

    setLinhasImportacao(resultado);
    setModalImportacao(true);
    return;
   }catch(erro){
    setMsg(erro instanceof Error?erro.message:"Não foi possível ler o PDF do Digix.");
    return;
   }
  }

  if(nome.endsWith(".xlsx")||nome.endsWith(".xls")){
   setMsg(`Arquivo selecionado para ${colaboradoraSelecionada.nome} em ${mesRef.split("-").reverse().join("/")}. O Excel aparece para anexar, mas a leitura automática de XLS/XLSX precisa de leitor próprio. Para importar agora, salve o arquivo como CSV ou TXT.`);
   return;
  }

  const conteudo=await arquivo.text();
  const linhas=conteudo.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(linhas.length<2){setMsg("Não encontrei linhas suficientes no arquivo do Digix.");return}

  const sep=separadorDigix(linhas[0]);
  const tabela=linhas.map(l=>dividirLinhaDigix(l,sep));
  const cab=tabela[0].map(c=>c.trim());
  const cabNorm=cab.map(normalizarDigix);

  const iNome=indiceCabecalhoDigix(cab,[
   h=>h.includes("colaborador"),
   h=>h.includes("funcionario"),
   h=>h==="nome",
   h=>h.includes("empregado")
  ]);
  const iData=indiceCabecalhoDigix(cab,[h=>h==="data"||h.includes("data")]);
  const iEntrada=indiceCabecalhoDigix(cab,[h=>h.includes("entrada")&&!h.includes("almoco")&&!h.includes("almoco")&&!h.includes("retorno")]);
  const iSaidaAlmoco=indiceCabecalhoDigix(cab,[
   h=>h.includes("saida")&&(h.includes("almoco")||h.includes("intervalo")),
   h=>h.includes("inicio")&&h.includes("intervalo"),
   h=>h.includes("almoco")&&!h.includes("retorno")
  ]);
  const iRetorno=indiceCabecalhoDigix(cab,[
   h=>h.includes("retorno"),
   h=>h.includes("volta"),
   h=>h.includes("fim")&&h.includes("intervalo")
  ]);
  const iSaida=indiceCabecalhoDigix(cab,[
   h=>h.includes("saida")&&!h.includes("almoco")&&!h.includes("intervalo"),
   h=>h.includes("saida final")
  ]);

  const selecionada=pessoa?colaboradoras.find(c=>c.id===pessoa)||null:null;
  const colunasHorarioPermitidas=cabNorm.map((h,idx)=>idx!==iNome&&idx!==iData&&!colunaCalculadaDigix(h));

  const resultado:LinhaImportacaoDigix[]=tabela.slice(1).map((cols,idx)=>{
   const horas=cols.map((valor,i)=>colunasHorarioPermitidas[i]?horaDigix(valor):"").filter(Boolean);
   const data=iData>=0?dataDigix(cols[iData]):(cols.map(dataDigix).find(Boolean)||"");
   const nomeColab=iNome>=0?String(cols[iNome]||"").trim():colaboradoraSelecionada.nome;
   const colab=colaboradoraSelecionada;
   const entrada=(iEntrada>=0?horaDigix(cols[iEntrada]):"")||horas[0]||"";
   const saidaAlmoco=(iSaidaAlmoco>=0?horaDigix(cols[iSaidaAlmoco]):"")||horas[1]||"";
   const retorno=(iRetorno>=0?horaDigix(cols[iRetorno]):"")||horas[2]||"";
   const saida=(iSaida>=0?horaDigix(cols[iSaida]):"")||horas[3]||"";
   const jornadaPadrao=colab?(vinculos.find(v=>v.colaboradora_id===colab.id)?.jornada_id||jornadaId||jornadas[0]?.id||""):"";
   const existe=colab?pontos.find(p=>p.colaboradora_id===colab.id&&p.data===data):null;
   const erros:string[]=[];
   if(!colab)erros.push("Colaboradora não localizada");
   if(!data)erros.push("Data não localizada");
   if(data&&mesRef&&data.slice(0,7)!==mesRef)erros.push("Fora do mês selecionado");
   if(!entrada||!saidaAlmoco||!retorno||!saida)erros.push("Horários incompletos");
   return{
    id:`digix-${idx}`,
    colaboradora_id:colab?.id||"",
    colaboradora_nome:colab?.nome||nomeColab||"Não localizada",
    data,
    entrada,
    saida_almoco:saidaAlmoco,
    retorno_almoco:retorno,
    saida,
    jornada_id:jornadaPadrao,
    status:(erros.length?"erro":"ok") as "ok"|"erro",
    mensagem:erros.join(" · ")||(existe?"Já existe ponto neste dia; será atualizado":"Pronto para importar"),
    jaExiste:Boolean(existe),
    observacao:`Importado do Digix${arquivo.name?` · ${arquivo.name}`:""}`
   };
  }).filter(l=>l.data||l.colaboradora_nome||l.entrada||l.saida);

  setLinhasImportacao(resultado);
  setModalImportacao(true);
 }

 async function confirmarImportacaoDigix(){
  const validas=linhasImportacao.filter(l=>l.status==="ok");
  if(!validas.length){setMsg("Nenhuma linha válida para importar.");return}
  setImportandoDigix(true);
  setMsg("");
  try{
   let salvas=0;
   for(const linha of validas){
    const payload={
     colaboradora_id:linha.colaboradora_id,
     jornada_id:linha.jornada_id||null,
     data:linha.data,
     entrada:linha.entrada,
     saida_almoco:linha.saida_almoco,
     retorno_almoco:linha.retorno_almoco,
     saida:linha.saida,
     falta:false,
     tipo_dia:"normal",
     observacao:linha.observacao,
     periodo_falta:null,
     apresentou_atestado:false,
     periodo_reposicao:null,
     data_falta_referencia:null
    };
    const existente=pontos.find(p=>p.colaboradora_id===linha.colaboradora_id&&p.data===linha.data);
    const q=existente?await sb.from("rh_ponto").update(payload).eq("id",existente.id):await sb.from("rh_ponto").insert(payload);
    if(q.error)throw q.error;
    salvas++;
   }
   setModalImportacao(false);
   setLinhasImportacao([]);
   setMsg(`${salvas} ponto(s) importado(s) do Digix com sucesso.`);
   await carregar();
  }catch(erro){
   setMsg(erro instanceof Error?erro.message:"Não foi possível importar o arquivo do Digix.");
  }finally{
   setImportandoDigix(false);
  }
 }


 function gerenciarEquipe(j:Jornada){setJornadaEquipe(j);setSelecionados(vinculos.filter(v=>v.jornada_id===j.id).map(v=>v.colaboradora_id));setModalEquipe(true)}

 async function salvarEquipe(){if(!jornadaEquipe)return;const ids=selecionados;const atuais=vinculos.filter(v=>v.jornada_id===jornadaEquipe.id).map(v=>v.colaboradora_id);const remover=atuais.filter(id=>!ids.includes(id));if(remover.length){const q=await sb.from("rh_jornada_colaboradoras").delete().eq("jornada_id",jornadaEquipe.id).in("colaboradora_id",remover);if(q.error){setMsg(q.error.message);return}}for(const cid of ids){const q=await sb.from("rh_jornada_colaboradoras").upsert({colaboradora_id:cid,jornada_id:jornadaEquipe.id},{onConflict:"colaboradora_id"});if(q.error){setMsg(q.error.message);return}}setModalEquipe(false);await carregar()}

 async function salvarJornada(){const payload={nome:cfg.nome,entrada:cfg.entrada,saida_almoco:cfg.saidaAlmoco,retorno_almoco:cfg.retornoAlmoco,saida:cfg.saida,carga_diaria_min:cfg.carga,tolerancia_entrada_min:cfg.tolEntrada,tolerancia_saida_min:cfg.tolSaida};const q=jornadaId?await sb.from("rh_jornadas").update(payload).eq("id",jornadaId):await sb.from("rh_jornadas").insert(payload);if(q.error)setMsg(q.error.message);else{setModalJornada(false);setJornadaId("");await carregar()}}

 function novaJornada(){setJornadaId("");setCfg({nome:"",entrada:"08:30",saidaAlmoco:"12:00",retornoAlmoco:"13:30",saida:"18:00",carga:480,tolEntrada:5,tolSaida:5});setModalJornada(true)}

 function editarJornada(j:Jornada){setJornadaId(j.id);setCfg({nome:j.nome,entrada:j.entrada,saidaAlmoco:j.saidaAlmoco,retornoAlmoco:j.retornoAlmoco,saida:j.saida,carga:j.carga,tolEntrada:j.tolEntrada,tolSaida:j.tolSaida});setModalJornada(true)}

 async function excluirJornada(id:string){if(!confirm("Excluir esta jornada?"))return;const q=await sb.from("rh_jornadas").delete().eq("id",id);if(q.error)setMsg(q.error.message);else await carregar()}



 return <div className="bp">{msg&&<div className="bp-msg">{msg}</div>}<input ref={arquivoDigixRef} type="file" style={{display:"none"}} onChange={lerArquivoDigix}/>

 <section className="bp-card bp-jornada-compacta"><div className="bp-jornadas-resumo"><div><b>JORNADAS / TURNOS</b><h2>{jornadas.length} horário(s) cadastrado(s)</h2><p>{vinculos.length} colaboradora(s) vinculada(s) aos turnos.</p></div><div className="bp-jornadas-resumo-acoes"><button type="button" className="sec" onClick={()=>setModalJornadas(true)}>Ver jornadas cadastradas</button><button type="button" onClick={novaJornada}>+ Nova jornada</button></div></div></section>

 <nav className="bp-subtabs"><button type="button" className={abaPonto==="registrar"?"on":""} onClick={()=>setAbaPonto("registrar")}>REGISTRAR PONTO</button><button type="button" className={abaPonto==="espelho"?"on":""} onClick={()=>setAbaPonto("espelho")}>ESPELHO / PONTOS CADASTRADOS</button></nav>

 {abaPonto==="registrar"&&<section className="bp-card bp-registro-home"><div><b>LANÇAMENTO MANUAL</b><h2>Registrar ponto</h2><p>Cadastre horários, faltas e observações de cada colaboradora.</p></div><button type="button" onClick={()=>novo()}>+ Novo ponto</button></section>}

 {abaPonto==="espelho"&&<>

 <div className="bp-resumo-faixa">

  <div><span>Horas extras</span><strong>{hm(resumo.extras)}</strong></div>

  <div><span>Crédito p/ compensar</span><strong>{hm(resumo.creditosDisponiveis)}</strong></div><div><span>Horas devedoras</span><strong>{hm(resumo.devidas)}</strong></div>

  <div><span>Saldo anterior</span><strong>{hm(saldoAnteriorDevedor)}</strong></div>

  <div><span>Restante anterior</span><strong>{hm(saldoAnteriorRestante)}</strong></div>

  <div><span>Faltas</span><strong>{resumo.faltas}</strong></div>

  <div><span>Sábados</span><strong>{resumo.sabados}</strong></div>

 </div>

 <section className="bp-fechamento-faixa bp-fechamento-individual">

  <div className="bp-fechamento-faixa-info"><b>FECHAMENTO INDIVIDUAL</b><span>{pessoa?(colaboradoras.find(c=>c.id===pessoa)?.nome||"Colaboradora"):"Selecione uma colaboradora"} · {mesRef.split("-").reverse().join("/")}</span></div>

  {pessoa&&<><div className={`bp-resultado-mini ${saldoLiquidoMin<0?"deve":saldoLiquidoMin>0?"recebe":"zerado"}`}><span>SALDO DO MÊS</span><strong>{saldoLiquidoMin<0?"COLABORADORA DEVE À EMPRESA":saldoLiquidoMin>0?"EMPRESA DEVE À COLABORADORA":"SEM SALDO DE HORAS"} · {hm(saldoLiquidoAbs)}</strong><small>Saldo já compensado automaticamente</small></div><button type="button" onClick={()=>setModalFechamento(true)}>{fechamentoAtual?.status==="FECHADO"?"Ver fechamento":"Fechar competência"}</button></>}

 </section>

 <section className="bp-card bp-espelho-grande"><div className="bp-importador-digix"><div><b>IMPORTAR ESPELHO DIGIX</b><span>Selecione o mês, a colaboradora e anexe o arquivo para preencher o espelho automaticamente.</span></div><label>Mês referência<input type="month" value={mesRef} onChange={e=>setMesRef(e.target.value)}/></label><label>Colaboradora<select value={pessoa} onChange={e=>setPessoa(e.target.value)}><option value="">Selecione uma colaboradora</option>{colaboradoras.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label><button type="button" onClick={()=>arquivoDigixRef.current?.click()} disabled={!pessoa}>ANEXAR PONTO DIX</button></div>

 {pessoa?<div className="bp-calendario-info"><div><b>ESPELHO MENSAL COMPLETO</b><span>{calendario.length} dias exibidos · dias sem lançamento ficam visíveis para conferência.</span></div><div className="bp-legenda"><span><i className="normal"></i>Normal</span><span><i className="devendo"></i>Devendo</span><span><i className="extra"></i>Extra</span><span><i className="fim"></i>Fim de semana</span><span><i className="feriado"></i>Feriado</span></div></div>:<div className="bp-calendario-aviso">Selecione uma colaboradora para visualizar todos os dias da competência.</div>}

 {pessoa&&<div className="bp-table bp-table-espelho"><table><thead><tr className="bp-head-grupo"><th rowSpan={2}>Data</th><th rowSpan={2}>Dia</th><th colSpan={4} className="bp-horarios-grupo">Horários</th><th rowSpan={2}>Trabalhado</th><th rowSpan={2}>Extra</th><th rowSpan={2}>Devedoras</th><th rowSpan={2}>Situação</th><th rowSpan={2}>Observação</th><th rowSpan={2}>Ação</th></tr><tr className="bp-head-sub"><th>Entrada</th><th>Almoço</th><th>Retorno</th><th>Saída</th></tr></thead><tbody>{calendarioPessoa.map(({data,dia,ponto})=>{const weekend=fimSemana(data);if(!ponto)return <tr key={data} className={weekend?"bp-dia-fimsemana":"bp-dia-pendente"}><td>{br(data)}</td><td>{dia}</td><td colSpan={6}>—</td><td>—</td><td><span className={`bp-status ${weekend?"folga":"pendente"}`}>{weekend?"Fim de semana":"Sem lançamento"}</span></td><td>—</td><td><button onClick={()=>novo(data)}>Registrar</button></td></tr>;const s=saldo(ponto),tipo=ponto.tipo_dia||(ponto.falta?"falta":"normal"),semHorario=["feriado","folga","atestado","justificado"].includes(tipo)||(tipo==="falta"&&!["manha","tarde"].includes(String(ponto.periodo_falta||"")))||tipo.startsWith("custom:");const tipoCustom=tipo.startsWith("custom:")?tiposDia.find(t=>`custom:${t.id}`===tipo)?.nome:"";const label=tipoCustom||(tipo==="reposicao"?"Reposição":tipo==="feriado"?"Feriado":tipo==="folga"?"Folga":tipo==="atestado"?"Atestado":tipo==="atestado_parcial"?"Atestado parcial":tipo==="justificado"?"Justificado":tipo==="justificado_parcial"?"Justificado parcial":tipo==="falta"?(ponto.apresentou_atestado?(ponto.periodo_falta==="dia_inteiro"?"Atestado":ponto.periodo_falta==="manha"?"Manhã justificada":"Tarde justificada"):(ponto.periodo_falta==="manha"?"Falta manhã":ponto.periodo_falta==="tarde"?"Falta tarde":"Falta")):weekend?"Hora extra":s<0?"Devendo":"Normal");return <tr key={data}><td>{br(data)}</td><td>{dia}</td><td>{semHorario||(tipo==="falta"&&ponto.periodo_falta==="manha")||(tipo==="reposicao"&&ponto.periodo_reposicao==="tarde")?"—":String(ponto.entrada).slice(0,5)}</td><td>{semHorario||(tipo==="falta"&&ponto.periodo_falta==="manha")||(tipo==="reposicao"&&ponto.periodo_reposicao==="tarde")?"—":String(ponto.saida_almoco).slice(0,5)}</td><td>{semHorario||(tipo==="falta"&&ponto.periodo_falta==="tarde")||(tipo==="reposicao"&&ponto.periodo_reposicao==="manha")?"—":String(ponto.retorno_almoco).slice(0,5)}</td><td>{semHorario||(tipo==="falta"&&ponto.periodo_falta==="tarde")||(tipo==="reposicao"&&ponto.periodo_reposicao==="manha")?"—":String(ponto.saida).slice(0,5)}</td><td>{semHorario?"—":hm(trab(ponto))}</td><td className="pos">{semHorario?"—":hm(extraDia(ponto))}</td><td className="neg">{["feriado","folga","atestado","justificado","atestado_parcial","justificado_parcial"].includes(tipo)||tipo.startsWith("custom:")?"0h00":hm(devidaDia(ponto))}</td><td><span className={`bp-status ${tipo==="reposicao"?"reposicao":tipo.startsWith("custom:")?"justificado":tipo==="feriado"?"feriado":tipo==="folga"?"folga":tipo==="atestado"||tipo==="atestado_parcial"?"atestado":tipo==="justificado"||tipo==="justificado_parcial"?"justificado":tipo==="falta"?"falta":weekend?"extra":s<0?"devendo":"normal"}`}>{label}</span></td><td>{(["atestado_parcial","justificado_parcial"].includes(tipo)||(tipo==="falta"&&ponto.apresentou_atestado))?`${ponto.observacao?`${ponto.observacao} · `:""}${hm(horasJustificadasDia(ponto))} justificadas`:tipo==="reposicao"?`${ponto.observacao?`${ponto.observacao} · `:""}${ponto.data_falta_referencia?`Reposição da falta de ${br(ponto.data_falta_referencia)}`:"Reposição de horas"}`:ponto.observacao||"—"}</td><td><button onClick={()=>editar(ponto)}>Editar</button></td></tr>})}</tbody></table></div>}

 </section>

 </>}

 {modalImportacao&&<div className="bp-bg"><div className="bp-modal bp-modal-importacao"><header><div><b className="bp-modal-eyebrow">IMPORTAÇÃO DIGIX</b><h2>Conferir arquivo de ponto</h2><small>{nomeArquivoDigix||"Arquivo selecionado"} · {linhasImportacao.filter(l=>l.status==="ok").length} linha(s) válida(s)</small></div><button type="button" onClick={()=>setModalImportacao(false)}>×</button></header><div className="bp-importacao-body"><div className="bp-importacao-aviso"><b>Antes de confirmar</b><span>Confira se colaboradora, data e horários foram reconhecidos corretamente. Linhas com erro não serão salvas.</span></div><div className="bp-importacao-table"><table><thead><tr><th>Status</th><th>Colaboradora</th><th>Data</th><th>Entrada</th><th>Almoço</th><th>Retorno</th><th>Saída</th><th>Mensagem</th></tr></thead><tbody>{linhasImportacao.map(l=><tr key={l.id} className={l.status==="ok"?"ok":"erro"}><td>{l.status==="ok"?"✓":"!"}</td><td>{l.colaboradora_nome}</td><td>{br(l.data)}</td><td>{l.entrada||"—"}</td><td>{l.saida_almoco||"—"}</td><td>{l.retorno_almoco||"—"}</td><td>{l.saida||"—"}</td><td>{l.mensagem}</td></tr>)}</tbody></table></div></div><footer><button type="button" onClick={()=>setModalImportacao(false)} disabled={importandoDigix}>Cancelar</button><button type="button" onClick={()=>void confirmarImportacaoDigix()} disabled={importandoDigix||!linhasImportacao.some(l=>l.status==="ok")}>{importandoDigix?"Importando...":"Confirmar importação"}</button></footer></div></div>}

 {modalFechamento&&pessoa&&<div className="bp-bg"><div className="bp-modal bp-modal-fechamento">

  <header><div><b className="bp-modal-eyebrow">FECHAMENTO INDIVIDUAL</b><h2>{colaboradoras.find(c=>c.id===pessoa)?.nome}</h2><small>Competência {mesRef.split("-").reverse().join("/")} {fechamentoAtual?.status==="FECHADO"?"· FECHADA":""}</small></div><button type="button" onClick={()=>setModalFechamento(false)}>×</button></header>

  <div className="bp-fechamento-modal-body">

   <div className="bp-modal-metricas"><article><span>Horas previstas</span><strong>{hm(horasPrevistas)}</strong></article><article><span>Horas trabalhadas</span><strong>{hm(horasTrabalhadas)}</strong></article><article><span>Horas extras</span><strong>{hm(resumo.extras)}</strong><small>{moeda(valorExtrasTotal)}</small></article><article><span>Horas de reposição</span><strong>{hm(resumoBruto.reposicao)}</strong><small>Horas trabalhadas especificamente para repor faltas</small></article><article><span>Saldo anterior</span><strong>{hm(saldoAnteriorDevedor)}</strong><small>Débito acumulado de competências anteriores</small></article><article><span>Abatido do saldo anterior</span><strong>{hm(compensadoSaldoAnterior)}</strong><small>Horas do mês usadas para compensar débitos antigos</small></article><article><span>Horas compensadas</span><strong>{hm(resumo.compensado)}</strong><small>Reposição e extras abatidas automaticamente das horas devedoras</small></article><article><span>Horas devedoras</span><strong>{hm(resumo.devidas)}</strong><small>Saldo restante devido à empresa</small></article><article><span>Faltas</span><strong>{resumo.faltas}</strong></article><article><span>Valor da hora</span><strong>{moeda(vh)}</strong></article></div>

   <div className="bp-origem-extras"><div className="bp-origem-extras-head"><b>DE ONDE VIERAM AS HORAS EXTRAS</b><span>{hm(resumo.extras)} no total</span></div>{lista.filter(p=>extraDia(p)>0).length?lista.filter(p=>extraDia(p)>0).map(p=>{const j=jornadaDo(p);return <div className="bp-extra-dia" key={p.id}><span><b>{br(p.data)}</b> · {j.nome}</span><span>Trabalhado {hm(trab(p))}</span><strong>+ {hm(extraDia(p))}</strong></div>}):<div className="bp-extra-vazio">Nenhum dia gerou hora extra nesta competência.</div>}</div>

   <div className={`bp-resultado-final ${saldoLiquidoMin<0?"deve":saldoLiquidoMin>0?"recebe":"zerado"}`}><div><span>RESULTADO DO FECHAMENTO</span><strong>{saldoLiquidoMin<0?"COLABORADORA DEVE À EMPRESA":saldoLiquidoMin>0?"EMPRESA DEVE À COLABORADORA":"SEM SALDO DE HORAS"}</strong><small>Saldo final após compensação automática das horas do mês.</small></div><b>{hm(saldoLiquidoAbs)}</b></div>

   <p className="bp-aviso-fechamento">O saldo do mês compensa horas extras e horas devedoras. O detalhamento acima preserva os dois valores separadamente para conferência.</p>

  </div>

  <footer>{fechamentoAtual?.status==="FECHADO"?<><button type="button" onClick={()=>setModalFechamento(false)}>Fechar</button><button type="button" onClick={()=>void reabrirCompetencia()}>Reabrir competência</button></>:<><button type="button" onClick={()=>setModalFechamento(false)}>Cancelar</button><button type="button" onClick={()=>void fecharCompetencia()}>Confirmar fechamento</button></>}</footer>

 </div></div>}

 {modalJornadas&&<div className="bp-bg"><div className="bp-modal bp-modal-jornadas"><header><div><h2>Jornadas cadastradas</h2><small>Escolha um horário para gerenciar equipe, editar ou excluir.</small></div><button type="button" onClick={()=>setModalJornadas(false)}>×</button></header><div className="bp-jornadas-modal-lista">{jornadas.length?jornadas.map(j=><article key={j.id}><div><strong>{j.nome}</strong><span>{j.entrada} às {j.saida} · almoço {j.saidaAlmoco}–{j.retornoAlmoco}</span><small>Tolerância: {j.tolEntrada} min entrada / {j.tolSaida} min saída · {vinculos.filter(v=>v.jornada_id===j.id).length} colaboradora(s)</small></div><div className="acoes"><button type="button" onClick={()=>{setModalJornadas(false);gerenciarEquipe(j)}}>Gerenciar equipe</button><button type="button" onClick={()=>{setModalJornadas(false);editarJornada(j)}}>Editar</button><button type="button" className="del" onClick={()=>void excluirJornada(j.id)}>Excluir</button></div></article>):<p className="bp-vazio">Nenhuma jornada cadastrada.</p>}</div><footer><button type="button" onClick={()=>setModalJornadas(false)}>Fechar</button><button type="button" onClick={()=>{setModalJornadas(false);novaJornada()}}>+ Nova jornada</button></footer></div></div>}

 {modalEquipe&&jornadaEquipe&&<div className="bp-bg"><div className="bp-modal"><header><div><h2>Equipe da jornada</h2><small>{jornadaEquipe.nome} · {jornadaEquipe.entrada}–{jornadaEquipe.saida}</small></div><button type="button" onClick={()=>setModalEquipe(false)}>×</button></header><div className="bp-equipe-lista">{colaboradoras.filter(c=>c.status!=="Desligada").map(c=>{const outro=vinculos.find(v=>v.colaboradora_id===c.id&&v.jornada_id!==jornadaEquipe.id);return <label key={c.id} className={outro?"ocupado":""}><input type="checkbox" checked={selecionados.includes(c.id)} onChange={e=>setSelecionados(a=>e.target.checked?[...a,c.id]:a.filter(id=>id!==c.id))}/><span><b>{c.nome}</b>{outro&&<small>Atualmente em: {jornadas.find(j=>j.id===outro.jornada_id)?.nome||"outra jornada"} — ao salvar será transferida.</small>}</span></label>})}</div><footer><button type="button" onClick={()=>setModalEquipe(false)}>Cancelar</button><button type="button" onClick={()=>void salvarEquipe()}>Salvar equipe</button></footer></div></div>}

 {modalJornada&&<div className="bp-bg"><div className="bp-modal"><header><h2>Configurar jornada</h2><button type="button" onClick={()=>setModalJornada(false)}>×</button></header><div className="bp-form"><label className="wide">Nome da jornada<input value={cfg.nome} onChange={e=>setCfg({...cfg,nome:e.target.value})} placeholder="Ex.: Jornada 08:00"/></label>{[["Entrada","entrada"],["Saída almoço","saidaAlmoco"],["Retorno almoço","retornoAlmoco"],["Saída","saida"]].map(([rotulo,chave])=><label key={chave}>{rotulo}<input type="time" value={(cfg as any)[chave]} onChange={e=>setCfg({...cfg,[chave]:e.target.value})}/></label>)}<label>Tolerância entrada (min)<input type="number" min="0" value={cfg.tolEntrada} onChange={e=>setCfg({...cfg,tolEntrada:Number(e.target.value||0)})}/></label><label>Tolerância saída (min)<input type="number" min="0" value={cfg.tolSaida} onChange={e=>setCfg({...cfg,tolSaida:Number(e.target.value||0)})}/></label></div><footer><button type="button" onClick={()=>setModalJornada(false)}>Cancelar</button><button type="button" onClick={()=>void salvarJornada()}>Salvar jornada</button></footer></div></div>}

 {modal&&<div className="bp-bg"><form className="bp-modal" onSubmit={salvar}><header><h2>{edit?"Editar":"Novo"} ponto</h2><button type="button" onClick={()=>setModal(false)}>×</button></header><div className="bp-form"><label>Colaboradora<select required value={f.colaboradora_id} onChange={e=>{const cid=e.target.value,jid=vinculos.find(v=>v.colaboradora_id===cid)?.jornada_id||"",j=jornadas.find(x=>x.id===jid);setF({...f,colaboradora_id:cid,jornada_id:jid,...(j?{entrada:j.entrada,saida_almoco:j.saidaAlmoco,retorno_almoco:j.retornoAlmoco,saida:j.saida}:{})})}}><option value="">Selecione</option>{colaboradoras.filter(c=>c.status!=="Desligada").map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label><label>Jornada / turno<select required value={f.jornada_id} disabled><option value="">Selecione</option>{jornadas.map(j=><option key={j.id} value={j.id}>{j.nome} · {j.entrada}–{j.saida}</option>)}</select></label><label>Data<input type="date" required value={f.data} onChange={e=>setF({...f,data:e.target.value})}/></label><label>Tipo do dia<select value={f.tipo_dia} onChange={e=>{const v=e.target.value;setF({...f,tipo_dia:v,falta:v==="falta",...(v==="falta"?{periodo_falta:f.periodo_falta||"dia_inteiro",apresentou_atestado:f.apresentou_atestado||false}:{periodo_falta:"dia_inteiro",apresentou_atestado:false})});if(v!=="__novo__")setNovoTipoDia("")}}><option value="normal">Dia normal</option><option value="falta">Falta</option><option value="reposicao">Reposição de horas</option><option value="feriado">Feriado — sem expediente</option><option value="folga">Folga</option><option value="atestado">Atestado — dia inteiro</option><option value="justificado">Justificado — dia inteiro</option>{tiposDia.map(t=><option key={t.id} value={`custom:${t.id}`}>{t.nome}</option>)}<option value="__novo__">+ Criar novo tipo do dia</option></select>{f.tipo_dia==="__novo__"&&<div className="bp-novo-tipo-dia"><input autoFocus value={novoTipoDia} onChange={e=>setNovoTipoDia(e.target.value)} placeholder="Ex.: Treinamento"/><button type="button" onClick={()=>void criarTipoDia()}>Salvar tipo</button></div>}</label>{f.tipo_dia==="falta"&&<><label>Período da falta<select value={f.periodo_falta} onChange={e=>setF({...f,periodo_falta:e.target.value})}><option value="manha">Parte da manhã</option><option value="tarde">Parte da tarde</option><option value="dia_inteiro">Dia inteiro</option></select></label><label>Justificativa<select value={f.apresentou_atestado?"sim":"nao"} onChange={e=>setF({...f,apresentou_atestado:e.target.value==="sim"})}><option value="nao">Sem atestado</option><option value="sim">Com atestado</option></select></label></>}{f.tipo_dia==="reposicao"&&<><label>Período trabalhado<select value={f.periodo_reposicao} onChange={e=>setF({...f,periodo_reposicao:e.target.value})}><option value="manha">Somente manhã</option><option value="tarde">Somente tarde</option><option value="personalizado">Horário personalizado</option></select></label><label>Referente à falta de<input type="date" value={f.data_falta_referencia} onChange={e=>setF({...f,data_falta_referencia:e.target.value})}/></label><div className="bp-reposicao-info wide"><b>REPOSIÇÃO DE HORAS</b><span>Essas horas abatem o saldo devedor e não geram hora extra, inclusive aos sábados e domingos.</span></div>{f.periodo_reposicao==="manha"&&<><label>Entrada pela manhã<input type="time" value={f.entrada} onChange={e=>setF({...f,entrada:e.target.value})}/></label><label>Saída da manhã<input type="time" value={f.saida_almoco} onChange={e=>setF({...f,saida_almoco:e.target.value})}/></label></>}{f.periodo_reposicao==="tarde"&&<><label>Entrada à tarde<input type="time" value={f.retorno_almoco} onChange={e=>setF({...f,retorno_almoco:e.target.value})}/></label><label>Saída<input type="time" value={f.saida} onChange={e=>setF({...f,saida:e.target.value})}/></label></>}{f.periodo_reposicao==="personalizado"&&<>{[["Entrada","entrada"],["Saída almoço","saida_almoco"],["Retorno almoço","retorno_almoco"],["Saída","saida"]].map(([rotulo,chave])=><label key={chave}>{rotulo}<input type="time" value={(f as any)[chave]} onChange={e=>setF({...f,[chave]:e.target.value})}/></label>)}</>}</>}

{f.tipo_dia==="normal"&&<>{[["Entrada","entrada"],["Saída almoço","saida_almoco"],["Retorno almoço","retorno_almoco"],["Saída","saida"]].map(([rotulo,chave])=><label key={chave}>{rotulo}<input type="time" value={(f as any)[chave]} onChange={e=>setF({...f,[chave]:e.target.value})}/></label>)}</>}

{f.tipo_dia==="falta"&&f.periodo_falta==="manha"&&<><div className="bp-falta-info wide"><b>FALTA NA PARTE DA MANHÃ</b><span>Informe somente o período que ela realmente trabalhou à tarde. Não precisa preencher horários zerados.</span></div><label>Entrada / retorno à tarde<input type="time" value={f.retorno_almoco} onChange={e=>setF({...f,retorno_almoco:e.target.value})}/></label><label>Saída do trabalho<input type="time" value={f.saida} onChange={e=>setF({...f,saida:e.target.value})}/></label></>}

{f.tipo_dia==="falta"&&f.periodo_falta==="tarde"&&<><div className="bp-falta-info wide"><b>FALTA NA PARTE DA TARDE</b><span>Informe somente o período que ela realmente trabalhou pela manhã. Não precisa preencher horários zerados.</span></div><label>Entrada pela manhã<input type="time" value={f.entrada} onChange={e=>setF({...f,entrada:e.target.value})}/></label><label>Saída / início da falta<input type="time" value={f.saida_almoco} onChange={e=>setF({...f,saida_almoco:e.target.value})}/></label></>}

{f.tipo_dia==="falta"&&f.periodo_falta==="dia_inteiro"&&<div className="bp-falta-info wide"><b>FALTA O DIA INTEIRO</b><span>{f.apresentou_atestado?"Com atestado: o dia fica justificado e não gera horas devedoras.":"Sem atestado: a carga completa do dia será considerada devedora."}</span></div>}<label className="wide">Observação<textarea value={f.observacao} onChange={e=>setF({...f,observacao:e.target.value})}/></label></div><footer><button type="button" onClick={()=>setModal(false)}>Cancelar</button><button>Salvar ponto</button></footer></form></div>}

 </div>

}