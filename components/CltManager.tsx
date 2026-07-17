"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import "./clt.css";

type StatusClt =
  | "Novo lead"
  | "Em análise"
  | "Aguardando documentos"
  | "Digitado"
  | "Aprovado"
  | "Pago"
  | "Recusado";

type RegistroClt = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  empresa: string;
  salario: number;
  margem: number;
  valorSolicitado: number;
  valorAprovado: number;
  banco: string;
  consultora: string;
  status: StatusClt;
  observacoes: string;
  criadoEm: string;
  atualizadoEm: string;
};

const STATUS: StatusClt[] = [
  "Novo lead",
  "Em análise",
  "Aguardando documentos",
  "Digitado",
  "Aprovado",
  "Pago",
  "Recusado",
];

const vazio = {
  nome: "",
  cpf: "",
  telefone: "",
  empresa: "",
  salario: "",
  margem: "",
  valorSolicitado: "",
  valorAprovado: "",
  banco: "",
  consultora: "",
  status: "Novo lead" as StatusClt,
  observacoes: "",
};

function apenasNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarCpf(valor: string) {
  const digitos = apenasNumeros(valor).slice(0, 11);
  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatarTelefone(valor: string) {
  const digitos = apenasNumeros(valor).slice(0, 11);
  if (digitos.length <= 10) {
    return digitos
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digitos
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function numero(valor: string) {
  const limpo = valor.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const convertido = Number(limpo);
  return Number.isFinite(convertido) ? convertido : 0;
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function CltManager() {
  const [registros, setRegistros] = useState<RegistroClt[]>([]);
  const [form, setForm] = useState(vazio);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    try {
      setRegistros(JSON.parse(localStorage.getItem("somos-eleva-clt") || "[]"));
    } catch {
      setRegistros([]);
    }
  }, []);

  function persistir(lista: RegistroClt[]) {
    setRegistros(lista);
    localStorage.setItem("somos-eleva-clt", JSON.stringify(lista));
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const numerico = apenasNumeros(busca);

    return registros.filter((item) => {
      const statusOk = filtroStatus === "Todos" || item.status === filtroStatus;
      const buscaOk =
        !termo ||
        item.nome.toLowerCase().includes(termo) ||
        item.cpf.includes(numerico) ||
        item.telefone.includes(numerico) ||
        item.empresa.toLowerCase().includes(termo) ||
        item.consultora.toLowerCase().includes(termo) ||
        item.banco.toLowerCase().includes(termo);

      return statusOk && buscaOk;
    });
  }, [registros, busca, filtroStatus]);

  const resumo = useMemo(() => ({
    total: registros.length,
    analise: registros.filter((item) => item.status === "Em análise").length,
    aprovados: registros.filter((item) => item.status === "Aprovado").length,
    pagos: registros.filter((item) => item.status === "Pago").length,
    valorPago: registros
      .filter((item) => item.status === "Pago")
      .reduce((total, item) => total + item.valorAprovado, 0),
  }), [registros]);

  function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem("");

    if (!form.nome.trim()) return setMensagem("Informe o nome do cliente.");

    const cpf = apenasNumeros(form.cpf);
    if (cpf && cpf.length !== 11) return setMensagem("O CPF precisa ter 11 números.");

    const duplicado = registros.some(
      (item) => item.id !== editandoId && cpf && item.cpf === cpf
    );
    if (duplicado) return setMensagem("Já existe um registro CLT com esse CPF.");

    const agora = new Date().toLocaleString("pt-BR");
    const antigo = registros.find((item) => item.id === editandoId);

    const registro: RegistroClt = {
      id: editandoId || crypto.randomUUID(),
      nome: form.nome.trim(),
      cpf,
      telefone: apenasNumeros(form.telefone),
      empresa: form.empresa.trim(),
      salario: numero(form.salario),
      margem: numero(form.margem),
      valorSolicitado: numero(form.valorSolicitado),
      valorAprovado: numero(form.valorAprovado),
      banco: form.banco.trim(),
      consultora: form.consultora.trim(),
      status: form.status,
      observacoes: form.observacoes.trim(),
      criadoEm: antigo?.criadoEm || agora,
      atualizadoEm: agora,
    };

    const lista = editandoId
      ? registros.map((item) => (item.id === editandoId ? registro : item))
      : [registro, ...registros];

    persistir(lista);
    setForm(vazio);
    setEditandoId(null);
    setMensagem(editandoId ? "Registro atualizado." : "Cliente CLT cadastrado.");
  }

  function editar(item: RegistroClt) {
    setEditandoId(item.id);
    setForm({
      nome: item.nome,
      cpf: formatarCpf(item.cpf),
      telefone: formatarTelefone(item.telefone),
      empresa: item.empresa,
      salario: item.salario ? String(item.salario).replace(".", ",") : "",
      margem: item.margem ? String(item.margem).replace(".", ",") : "",
      valorSolicitado: item.valorSolicitado ? String(item.valorSolicitado).replace(".", ",") : "",
      valorAprovado: item.valorAprovado ? String(item.valorAprovado).replace(".", ",") : "",
      banco: item.banco,
      consultora: item.consultora,
      status: item.status,
      observacoes: item.observacoes,
    });
    setMensagem("Editando registro selecionado.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function excluir(id: string) {
    if (!window.confirm("Deseja excluir este registro CLT?")) return;
    persistir(registros.filter((item) => item.id !== id));
  }

  return (
    <div className="clt-page">
      <section className="clt-summary">
        <article><span>Total de registros</span><strong>{resumo.total}</strong></article>
        <article><span>Em análise</span><strong>{resumo.analise}</strong></article>
        <article><span>Aprovados</span><strong>{resumo.aprovados}</strong></article>
        <article><span>Pagos</span><strong>{resumo.pagos}</strong></article>
        <article className="clt-highlight"><span>Valor pago</span><strong>{moeda(resumo.valorPago)}</strong></article>
      </section>

      <section className="clt-layout">
        <form className="clt-card" onSubmit={salvar}>
          <div className="clt-heading">
            <div>
              <span>{editandoId ? "EDITAR REGISTRO" : "NOVO CLIENTE CLT"}</span>
              <h2>{editandoId ? "Atualizar análise" : "Cadastrar análise"}</h2>
              <p>Centralize os dados do cliente e o andamento da operação.</p>
            </div>
            <b>CLT</b>
          </div>

          <div className="clt-form-grid">
            <label>Nome completo<input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Nome do cliente"/></label>
            <label>CPF<input value={form.cpf} onChange={e=>setForm({...form,cpf:formatarCpf(e.target.value)})} placeholder="000.000.000-00" inputMode="numeric"/></label>
            <label>Telefone<input value={form.telefone} onChange={e=>setForm({...form,telefone:formatarTelefone(e.target.value)})} placeholder="(62) 99999-9999" inputMode="numeric"/></label>
            <label>Empresa empregadora<input value={form.empresa} onChange={e=>setForm({...form,empresa:e.target.value})} placeholder="Nome da empresa"/></label>
            <label>Salário<input value={form.salario} onChange={e=>setForm({...form,salario:e.target.value})} placeholder="Ex.: 3.500,00" inputMode="decimal"/></label>
            <label>Margem disponível<input value={form.margem} onChange={e=>setForm({...form,margem:e.target.value})} placeholder="Ex.: 500,00" inputMode="decimal"/></label>
            <label>Valor solicitado<input value={form.valorSolicitado} onChange={e=>setForm({...form,valorSolicitado:e.target.value})} placeholder="Ex.: 10.000,00" inputMode="decimal"/></label>
            <label>Valor aprovado<input value={form.valorAprovado} onChange={e=>setForm({...form,valorAprovado:e.target.value})} placeholder="Ex.: 8.500,00" inputMode="decimal"/></label>
            <label>Banco<input value={form.banco} onChange={e=>setForm({...form,banco:e.target.value})} placeholder="Ex.: C6"/></label>
            <label>Consultora<input value={form.consultora} onChange={e=>setForm({...form,consultora:e.target.value})} placeholder="Nome da consultora"/></label>
            <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as StatusClt})}>{STATUS.map(status=><option key={status}>{status}</option>)}</select></label>
          </div>

          <label className="clt-observations">Observações<textarea value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} placeholder="Documentos pendentes, retorno, detalhes da análise..."/></label>

          {mensagem && <div className="clt-message">{mensagem}</div>}

          <div className="clt-actions">
            {editandoId && <button type="button" className="cancel" onClick={()=>{setEditandoId(null);setForm(vazio);setMensagem("");}}>Cancelar</button>}
            <button type="submit" className="save">{editandoId ? "Atualizar registro" : "Salvar registro"}</button>
          </div>
        </form>

        <section className="clt-card">
          <div className="clt-list-heading">
            <div><span>CARTEIRA CLT</span><h2>Clientes e análises</h2></div>
            <b>{filtrados.length}</b>
          </div>

          <div className="clt-filters">
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar cliente, CPF, empresa, banco ou consultora"/>
            <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}><option>Todos</option>{STATUS.map(status=><option key={status}>{status}</option>)}</select>
          </div>

          {filtrados.length === 0 ? (
            <div className="clt-empty"><div>▣</div><strong>Nenhum registro CLT</strong><p>Cadastre o primeiro cliente.</p></div>
          ) : (
            <div className="clt-list">
              {filtrados.map(item=>(
                <article key={item.id}>
                  <div className="clt-item-top">
                    <div><strong>{item.nome}</strong><span>{item.cpf ? formatarCpf(item.cpf) : "CPF não informado"} • {item.empresa || "Empresa não informada"}</span></div>
                    <span className={`clt-status status-${item.status.toLowerCase().replace(/\s/g,"-").normalize("NFD").replace(/[\u0300-\u036f]/g,"")}`}>{item.status}</span>
                  </div>

                  <div className="clt-values">
                    <div><small>Salário</small><b>{moeda(item.salario)}</b></div>
                    <div><small>Margem</small><b>{moeda(item.margem)}</b></div>
                    <div><small>Solicitado</small><b>{moeda(item.valorSolicitado)}</b></div>
                    <div><small>Aprovado</small><b>{moeda(item.valorAprovado)}</b></div>
                  </div>

                  <footer>
                    <span>{item.consultora || "Sem consultora"} • {item.banco || "Sem banco"} • {item.atualizadoEm}</span>
                    <div>
                      <button onClick={()=>editar(item)}>Editar</button>
                      <button className="delete" onClick={()=>excluir(item.id)}>Excluir</button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="clt-help">
        <strong>Próxima integração:</strong>
        <span>os registros pagos poderão alimentar automaticamente Dashboard, Ranking e Financeiro.</span>
      </section>
    </div>
  );
}
