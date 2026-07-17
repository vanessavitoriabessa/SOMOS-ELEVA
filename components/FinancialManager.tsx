"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import "./financeiro.css";

type Proposta = {
  id: string;
  cliente: string;
  vendedora: string;
  banco: string;
  tabela: string;
  valorContrato: number;
  percentualTabela: number;
  comissao: number;
  status: string;
};

type Lancamento = {
  id: string;
  tipo: "Entrada" | "Saída";
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
};

const ENTRADAS = ["Receita operacional", "Comissão recebida", "Ajuste", "Outro"];
const SAIDAS = ["Comissão consultora", "Folha de pagamento", "Marketing", "Aluguel", "Impostos", "Fornecedor", "Ajuste", "Outro"];

const moeda = (v:number) => Number(v || 0).toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
const numero = (v:string) => {
  const n = Number(v.replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",","."));
  return Number.isFinite(n) ? n : 0;
};
const hoje = () => new Date().toISOString().slice(0,10);

export default function FinancialManager() {
  const [propostas,setPropostas] = useState<Proposta[]>([]);
  const [lancamentos,setLancamentos] = useState<Lancamento[]>([]);
  const [tipo,setTipo] = useState<"Entrada"|"Saída">("Entrada");
  const [categoria,setCategoria] = useState(ENTRADAS[0]);
  const [descricao,setDescricao] = useState("");
  const [valor,setValor] = useState("");
  const [data,setData] = useState(hoje());
  const [busca,setBusca] = useState("");
  const [filtro,setFiltro] = useState("Todos");
  const [mensagem,setMensagem] = useState("");

  useEffect(() => {
    try { setPropostas(JSON.parse(localStorage.getItem("somos-eleva-propostas") || "[]")); } catch {}
    try { setLancamentos(JSON.parse(localStorage.getItem("somos-eleva-financeiro") || "[]")); } catch {}
  }, []);

  function persistir(lista:Lancamento[]) {
    setLancamentos(lista);
    localStorage.setItem("somos-eleva-financeiro", JSON.stringify(lista));
  }

  const pagas = useMemo(() => propostas.filter(p => p.status === "Pago"), [propostas]);
  const resumo = useMemo(() => {
    const producao = pagas.reduce((t,p)=>t+Number(p.valorContrato||0),0);
    const comissoes = pagas.reduce((t,p)=>t+Number(p.comissao||0),0);
    const entradas = lancamentos.filter(l=>l.tipo==="Entrada").reduce((t,l)=>t+l.valor,0);
    const saidas = lancamentos.filter(l=>l.tipo==="Saída").reduce((t,l)=>t+l.valor,0);
    return {producao,comissoes,entradas,saidas,saldo:entradas-saidas};
  }, [pagas,lancamentos]);

  const lista = useMemo(() => lancamentos
    .filter(l => filtro==="Todos" || l.tipo===filtro)
    .filter(l => !busca.trim() || `${l.descricao} ${l.categoria}`.toLowerCase().includes(busca.toLowerCase()))
    .sort((a,b)=>b.data.localeCompare(a.data)), [lancamentos,filtro,busca]);

  function salvar(e:FormEvent) {
    e.preventDefault();
    const v = numero(valor);
    if (!descricao.trim()) return setMensagem("Informe a descrição.");
    if (v <= 0) return setMensagem("Informe um valor maior que zero.");
    const novo:Lancamento = {id:crypto.randomUUID(),tipo,categoria,descricao:descricao.trim(),valor:v,data};
    persistir([novo,...lancamentos]);
    setDescricao(""); setValor(""); setData(hoje()); setMensagem("Lançamento salvo com sucesso.");
  }

  function mudarTipo(novo:"Entrada"|"Saída") {
    setTipo(novo);
    setCategoria(novo==="Entrada" ? ENTRADAS[0] : SAIDAS[0]);
  }

  function excluir(id:string) {
    if (window.confirm("Deseja excluir este lançamento?")) persistir(lancamentos.filter(l=>l.id!==id));
  }

  const categorias = tipo==="Entrada" ? ENTRADAS : SAIDAS;

  return (
    <div className="finance-page">
      <section className="finance-summary">
        <article><span>Produção paga</span><strong>{moeda(resumo.producao)}</strong><small>Contratos pagos</small></article>
        <article><span>Comissões calculadas</span><strong>{moeda(resumo.comissoes)}</strong><small>Das propostas</small></article>
        <article><span>Entradas</span><strong>{moeda(resumo.entradas)}</strong><small>Lançamentos manuais</small></article>
        <article><span>Saídas</span><strong>{moeda(resumo.saidas)}</strong><small>Lançamentos manuais</small></article>
        <article className={resumo.saldo<0?"negative":"highlight"}><span>Saldo</span><strong>{moeda(resumo.saldo)}</strong><small>Entradas − saídas</small></article>
      </section>

      <section className="finance-grid">
        <form className="finance-card" onSubmit={salvar}>
          <div className="finance-heading"><div><span>NOVO LANÇAMENTO</span><h2>Registrar movimentação</h2><p>Cadastre receitas, despesas e ajustes.</p></div><b>R$</b></div>
          <div className="finance-form-grid">
            <label>Tipo<select value={tipo} onChange={e=>mudarTipo(e.target.value as "Entrada"|"Saída")}><option>Entrada</option><option>Saída</option></select></label>
            <label>Categoria<select value={categoria} onChange={e=>setCategoria(e.target.value)}>{categorias.map(c=><option key={c}>{c}</option>)}</select></label>
            <label>Descrição<input value={descricao} onChange={e=>setDescricao(e.target.value)} placeholder="Ex.: Pagamento de campanha"/></label>
            <label>Valor<input value={valor} onChange={e=>setValor(e.target.value)} placeholder="Ex.: 1.500,00" inputMode="decimal"/></label>
            <label>Data<input type="date" value={data} onChange={e=>setData(e.target.value)}/></label>
          </div>
          {mensagem && <div className="finance-message">{mensagem}</div>}
          <div className="finance-actions"><button type="submit">Salvar lançamento</button></div>
        </form>

        <section className="finance-card">
          <div className="finance-list-heading"><div><span>MOVIMENTAÇÕES</span><h2>Entradas e saídas</h2></div><b>{lista.length}</b></div>
          <div className="finance-filters">
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar descrição ou categoria"/>
            <select value={filtro} onChange={e=>setFiltro(e.target.value)}><option>Todos</option><option>Entrada</option><option>Saída</option></select>
          </div>
          {lista.length===0 ? <div className="finance-empty"><div>▥</div><strong>Nenhum lançamento</strong><p>Cadastre a primeira movimentação.</p></div> :
            <div className="finance-list">{lista.map(l=><article key={l.id}>
              <i className={l.tipo==="Entrada"?"entry":"exit"}>{l.tipo==="Entrada"?"+":"−"}</i>
              <div><strong>{l.descricao}</strong><span>{l.categoria} • {l.data}</span></div>
              <div className="finance-value"><strong className={l.tipo==="Entrada"?"entry-text":"exit-text"}>{l.tipo==="Entrada"?"+":"−"} {moeda(l.valor)}</strong><button onClick={()=>excluir(l.id)}>Excluir</button></div>
            </article>)}</div>}
        </section>
      </section>

      <section className="finance-card paid-card">
        <div className="finance-list-heading"><div><span>CONTRATOS PAGOS</span><h2>Resumo automático das propostas</h2></div><b>{pagas.length}</b></div>
        {pagas.length===0 ? <div className="paid-empty">Nenhuma proposta com status Pago.</div> :
        <div className="paid-table">
          <div className="paid-row paid-head"><span>Cliente</span><span>Vendedora</span><span>Banco/Tabela</span><span>Contrato</span><span>%</span><span>Comissão</span></div>
          {pagas.map(p=><div className="paid-row" key={p.id}>
            <strong>{p.cliente}</strong><span>{p.vendedora||"Não informada"}</span><span>{p.banco||"—"}{p.tabela?` • ${p.tabela}`:""}</span><strong>{moeda(p.valorContrato)}</strong><span>{String(p.percentualTabela||0).replace(".",",")}%</span><strong className="commission">{moeda(p.comissao)}</strong>
          </div>)}
        </div>}
      </section>
    </div>
  );
}
