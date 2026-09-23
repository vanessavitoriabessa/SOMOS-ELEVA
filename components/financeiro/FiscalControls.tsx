"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import "./fiscal-controls.css";
import { ControleSimples } from "./ControlesImpostos";
import { ControleInssFgts } from "./ControleInssFgts";

type Produto="CLT"|"Compra de Dívida";
type Nota={id:string;produto:Produto;fornecedor:string;valor:number;qtd:number;inicio:string;fim:string;liquido:number;parcela:number;bruto:number;ir:number;comprovante:string};
const moeda=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const n=(v:string)=>Number(String(v||"0").replace(/\./g,"").replace(",", "."))||0;
const hoje=()=>new Date().toISOString().slice(0,10);
const mes=()=>new Date().toISOString().slice(0,7);

type AbaFiscal = "notas" | "simples" | "inss";

type FornecedorNota = {
  id: string;
  tipo: "fornecedor_neo" | "fornecedor_3rn";
  nome: string;
  ativo: boolean;
};

type FiscalControlsProps = {
  abaInicial?: AbaFiscal;
  ocultarAbasPrincipais?: boolean;
};

export default function FiscalControls({
  abaInicial = "notas",
  ocultarAbasPrincipais = false,
}: FiscalControlsProps){
 const supabase=useMemo(()=>createClient(),[]);
 const [aba,setAba]=useState<AbaFiscal>(abaInicial);
 useEffect(()=>{setAba(abaInicial)},[abaInicial]);
 const [produto,setProduto]=useState<Produto|"Geral">("CLT");
 const [ordem,setOrdem]=useState<"recentes"|"antigas">("recentes");
 const [filtroPeriodo,setFiltroPeriodo]=useState<"todos"|"periodo">("periodo");
 const [mesFiltro,setMesFiltro]=useState(mes());
 const [dataInicialFiltro,setDataInicialFiltro]=useState("");
 const [dataFinalFiltro,setDataFinalFiltro]=useState("");
 const [modal,setModal]=useState(false);
 const [editando,setEditando]=useState<Nota|null>(null);
 const [notas,setNotas]=useState<Nota[]>([]);
 const [fornecedores,setFornecedores]=useState<FornecedorNota[]>([]);
 const [arquivo,setArquivo]=useState<File|null>(null);
 const [msg,setMsg]=useState("");
 async function carregar(){
   const [
     {data,error},
     {data:fornecedoresData,error:fornecedoresError},
   ] = await Promise.all([
     supabase.from("controle_notas_fiscais").select("*").order("data_solicitacao",{ascending:false}),
     supabase
       .from("config_financeiro_itens")
       .select("id,tipo,nome,ativo")
       .in("tipo",["fornecedor_neo","fornecedor_3rn"])
       .eq("ativo",true)
       .order("nome",{ascending:true}),
   ]);

   if(error){setMsg(error.message);return}
   if(fornecedoresError){setMsg(fornecedoresError.message);return}

   setNotas((data||[]).map((r:any)=>({
     id:String(r.id),
     produto:r.produto,
     fornecedor:String(r.fornecedor||""),
     valor:Number(r.valor_nota||0),
     qtd:Number(r.quantidade_operacoes||0),
     inicio:String(r.referencia_inicio||r.data_solicitacao||""),
     fim:String(r.referencia_fim||r.data_solicitacao||""),
     liquido:Number(r.producao_liquida||0),
     parcela:Number(r.valor_parcela||0),
     bruto:Number(r.valor_bruto_operacao||0),
     ir:Number(r.valor_ir||0),
     comprovante:String(r.comprovante_path||""),
   })));

   setFornecedores((fornecedoresData||[]) as FornecedorNota[]);
 }
 useEffect(()=>{void carregar()},[]);
 const [f,setF]=useState({fornecedor:"",valor:"",qtd:"",inicio:hoje(),fim:hoje(),liquido:"",parcela:"",bruto:"",irValor:"",comprovante:""});
 const lista=useMemo(()=>{
   const filtradas=notas.filter(x=>{
     const produtoOk=produto==="Geral" ? true : x.produto===produto;
      const periodoOk=filtroPeriodo==="todos"
        ? true
        : (!dataInicialFiltro || x.inicio>=dataInicialFiltro) &&
          (!dataFinalFiltro || x.inicio<=dataFinalFiltro);
      return produtoOk&&periodoOk;
   });
   return [...filtradas].sort((a,b)=>{
     const dataA=new Date(a.inicio||"1900-01-01").getTime();
     const dataB=new Date(b.inicio||"1900-01-01").getTime();
     return ordem==="recentes" ? dataB-dataA : dataA-dataB;
   });
 },[notas,produto,ordem,filtroPeriodo,dataInicialFiltro,dataFinalFiltro]);
 const totalNotas=lista.reduce((s,x)=>s+x.valor,0), totalProd=lista.reduce((s,x)=>s+(x.produto==="CLT"?x.liquido:x.bruto),0), totalParcela=lista.reduce((s,x)=>s+x.parcela,0), totalIr=lista.reduce((s,x)=>s+x.ir,0);
 function abrirNovaNota(){
   setEditando(null);
   setArquivo(null);
   setF({fornecedor:"",valor:"",qtd:"",inicio:hoje(),fim:hoje(),liquido:"",parcela:"",bruto:"",irValor:"",comprovante:""});
   setModal(true);
 }

 function abrirEdicao(x:Nota){
   setEditando(x);
   setArquivo(null);
   setProduto(x.produto);
   setF({
     fornecedor:x.fornecedor,
     valor:String(x.valor||""),
     qtd:String(x.qtd||""),
     inicio:x.inicio||hoje(),
     fim:x.fim||hoje(),
     liquido:String(x.liquido||""),
     parcela:String(x.parcela||""),
     bruto:String(x.bruto||""),
     irValor:String(x.ir||""),
     comprovante:x.comprovante||"",
   });
   setModal(true);
 }

 async function excluirNota(x:Nota){
   const confirmou=window.confirm(`Excluir a nota de ${x.fornecedor} no valor de ${moeda(x.valor)}?`);
   if(!confirmou)return;
   setMsg("");
   try{
     const {error}=await supabase.from("controle_notas_fiscais").delete().eq("id",x.id);
     if(error)throw error;
     if(x.comprovante){
       await supabase.storage.from("financeiro-comprovantes").remove([x.comprovante]);
     }
     await carregar();
   }catch(err){
     setMsg(err instanceof Error?err.message:"Não foi possível excluir a nota.");
   }
 }

 async function salvar(e:FormEvent){
  e.preventDefault();setMsg("");
  try{
   const valor=n(f.valor),valorIr=n(f.irValor);
   if(!f.fornecedor||valor<=0)throw new Error("Informe fornecedor e valor da nota.");
   
   const {data:ss}=await supabase.auth.getSession();const uid=ss.session?.user.id;if(!uid)throw new Error("Sua sessão expirou.");
   let path="";
   let nomeComprovante="";

   if(arquivo){
     const ext=arquivo.name.split(".").pop()||"bin";
     path=`${uid}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
     const up=await supabase.storage.from("financeiro-comprovantes").upload(path,arquivo);
     if(up.error)throw up.error;
     nomeComprovante=arquivo.name;
   }

   const payload={
     produto: produto as Produto,
     fornecedor:f.fornecedor,
     valor_nota:valor,
     quantidade_operacoes:Number(f.qtd||0),
     data_solicitacao:f.inicio,
     referencia_inicio:f.inicio,
     referencia_fim:f.fim,
     producao_liquida:produto==="CLT"?n(f.liquido):0,
     valor_parcela:produto==="CLT"?n(f.parcela):0,
     valor_bruto_operacao:produto==="Compra de Dívida"?n(f.bruto):0,
     aliquota_ir:0,
     valor_ir:valorIr,
     comprovante_path:path || editando?.comprovante || "",
     comprovante_nome:nomeComprovante,
     criado_por:uid
   };

   const operacao=editando
     ? await supabase.from("controle_notas_fiscais").update(payload).eq("id",editando.id)
     : await supabase.from("controle_notas_fiscais").insert(payload);

   if(operacao.error){
     if(path){
       await supabase.storage.from("financeiro-comprovantes").remove([path]);
     }
     throw operacao.error;
   }

   if(editando?.comprovante && path && editando.comprovante!==path){
     await supabase.storage.from("financeiro-comprovantes").remove([editando.comprovante]);
   }

   setModal(false);
   setEditando(null);
   setArquivo(null);
   await carregar();
  }catch(err){setMsg(err instanceof Error?err.message:"Não foi possível salvar.");}
 }
 const fornecedoresDaNota = fornecedores.filter(
    (item: FornecedorNota) => item.ativo
  );

  return <div className="fc">{msg&&<div className="fc-msg">{msg}</div>}
  {!ocultarAbasPrincipais&&<nav className="fc-tabs"><button className={aba==="notas"?"on":""} onClick={()=>setAba("notas")}>Controle de Notas</button><button className={aba==="simples"?"on":""} onClick={()=>setAba("simples")}>Imposto Simples Nacional</button><button className={aba==="inss"?"on":""} onClick={()=>setAba("inss")}>Imposto INSS e FGTS</button></nav>}
  {aba==="notas"&&<><header className="fc-head"><div><b>CONTROLE FISCAL</b><h2>Controle de Notas</h2><p>Notas emitidas, valores, impostos e comprovantes.</p></div>{produto!=="Geral"&&<button onClick={abrirNovaNota}>+ Nova nota</button>}</header>
   <div className="fc-sub fc-sub-three"><button className={produto==="Geral"?"on":""} onClick={()=>setProduto("Geral")}>Controle de notas Geral</button><button className={produto==="CLT"?"on":""} onClick={()=>setProduto("CLT")}>Controle de notas CLT</button><button className={produto==="Compra de Dívida"?"on":""} onClick={()=>setProduto("Compra de Dívida")}>Controle de notas Compra de Dívida</button></div>
   <div className="fc-kpis"><article><span>Valor total das notas</span><strong>{moeda(totalNotas)}</strong></article><article><span>{produto==="CLT"?"Produção valor líquido":"Valor bruto da operação"}</span><strong>{moeda(totalProd)}</strong></article>{produto==="CLT"&&<article><span>Valor das parcelas</span><strong>{moeda(totalParcela)}</strong></article>}<article><span>Imposto de renda</span><strong>{moeda(totalIr)}</strong></article></div>
   <div className="fc-list-toolbar fc-filter-toolbar">
     <div><strong>{produto==="Geral"?"Todas as notas — Geral":"Todas as notas"}</strong><span>{lista.length} {lista.length===1?"nota encontrada":"notas encontradas"}</span></div>
     <div className="fc-filter-group">
       <label>EMISSÃO DE<input type="date" value={dataInicialFiltro} onChange={e=>{setDataInicialFiltro(e.target.value);setFiltroPeriodo("periodo")}}/></label>
        <label>EMISSÃO ATÉ<input type="date" min={dataInicialFiltro||undefined} value={dataFinalFiltro} onChange={e=>{setDataFinalFiltro(e.target.value);setFiltroPeriodo("periodo")}}/></label>
        {(dataInicialFiltro||dataFinalFiltro)&&<button type="button" className="fc-clear-period" onClick={()=>{setDataInicialFiltro("");setDataFinalFiltro("");setFiltroPeriodo("todos")}}>Limpar período</button>}
        <label>Ordenar<select value={ordem} onChange={e=>setOrdem(e.target.value as "recentes"|"antigas")}><option value="recentes">Mais recentes primeiro</option><option value="antigas">Mais antigas primeiro</option></select></label>
     </div>
   </div>
   <div className="fc-table"><table><thead><tr><th>#</th><th>Fornecedor</th><th>Valor nota</th><th>Qtd.</th><th>Referência</th><th>{produto==="CLT"?"Produção líquida":"Valor bruto"}</th>{produto==="CLT"&&<th>Parcela</th>}<th>IR</th><th>Comprovante</th><th>Ações</th></tr></thead><tbody>{lista.length?lista.map((x,i)=><tr key={x.id}><td>{i+1}</td><td>{x.fornecedor}</td><td>{moeda(x.valor)}</td><td>{x.qtd}</td><td>{x.inicio} a {x.fim}</td><td>{moeda(x.produto==="CLT"?x.liquido:x.bruto)}</td>{produto==="CLT"&&<td>{moeda(x.parcela)}</td>}<td>{moeda(x.ir)}</td><td>{x.comprovante?"✓ Anexado":"—"}</td><td><div className="fc-actions"><button type="button" className="fc-edit" onClick={()=>abrirEdicao(x)}>Editar</button><button type="button" className="fc-delete" onClick={()=>void excluirNota(x)}>Excluir</button></div></td></tr>):<tr><td colSpan={10}>Nenhuma nota cadastrada.</td></tr>}</tbody></table></div>
  </>}
  {aba==="simples"&&<ControleSimples />}
  {aba==="inss"&&<ControleInssFgts />}
   {modal&&<div className="fc-bg"><form className="fc-modal" onSubmit={salvar}><header><h2>{editando?"Editar nota fiscal":"Nova nota fiscal"} — {produto}</h2><button type="button" onClick={()=>{setModal(false);setEditando(null)}}>×</button></header><div className="fc-form"><label>Fornecedor *
  <div className="fc-select-wrap fc-select-wrap-clean">
    <select className="fc-select fc-select-clean" value={f.fornecedor} onChange={e=>setF({...f,fornecedor:e.target.value})} required>
      <option value="">Selecione o fornecedor</option>
      {fornecedoresDaNota.map((item)=><option key={item.id} value={item.nome}>{item.nome}</option>)}
    </select>
    <span className="fc-select-arrow">⌄</span>
  </div>
</label><label>Valor da nota *<input value={f.valor} onChange={e=>setF({...f,valor:e.target.value})}/></label><label>Quantidade de operações<input type="number" value={f.qtd} onChange={e=>setF({...f,qtd:e.target.value})}/></label><label>Referência inicial<input type="date" value={f.inicio} onChange={e=>setF({...f,inicio:e.target.value})}/></label><label>Referência final<input type="date" value={f.fim} onChange={e=>setF({...f,fim:e.target.value})}/></label>{produto==="CLT"?<><label>Produção valor líquido<input value={f.liquido} onChange={e=>setF({...f,liquido:e.target.value})}/></label><label>Valor parcela<input value={f.parcela} onChange={e=>setF({...f,parcela:e.target.value})}/></label></>:<label>Valor bruto da operação<input value={f.bruto} onChange={e=>setF({...f,bruto:e.target.value})}/></label>}<label>Valor do IR (R$) — opcional<input inputMode="decimal" value={f.irValor} onChange={e=>setF({...f,irValor:e.target.value})} placeholder="R$ 0,00"/></label><label className="wide">Comprovante — opcional<input type="file" accept="image/*,.pdf" onChange={e=>{const arq=e.target.files?.[0]||null;setArquivo(arq);setF({...f,comprovante:arq?.name||""})}}/><small>{f.comprovante||"Imagem ou PDF"}</small></label></div><footer><button type="button" onClick={()=>{setModal(false);setEditando(null)}}>Cancelar</button><button type="submit">{editando?"Salvar alterações":"Salvar nota"}</button></footer></form></div>}
 </div>
}
