"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import "./configuracoes.css";

type Banco = {
  id: string;
  nome: string;
  ativo: boolean;
};

type Tabela = {
  id: string;
  banco: string;
  nome: string;
  percentual: number;
  fator: number;
  prazo: number;
  ativo: boolean;
};

type Meta = {
  id: string;
  nome: string;
  tipo: "Empresa" | "Equipe" | "Consultora";
  responsavel: string;
  valor: number;
  inicio: string;
  fim: string;
  ativo: boolean;
};

type ConfiguracaoGeral = {
  nomeSistema: string;
  nomeEmpresa: string;
  multiplicadorSaldo: number;
  moeda: string;
};

const hoje = () => new Date().toISOString().slice(0, 10);

const bancosPadrao: Banco[] = [
  { id: "neo", nome: "NEO", ativo: true },
  { id: "aki-capital", nome: "AKI CAPITAL", ativo: true },
  { id: "amigoz", nome: "AMIGOZ", ativo: true },
  { id: "futuro", nome: "FUTURO", ativo: true },
  { id: "v8", nome: "V8", ativo: true },
  { id: "c6", nome: "C6", ativo: true },
  { id: "finanbank", nome: "FINANBANK", ativo: true },
];

const tabelasPadrao: Tabela[] = [
  {
    id: "neo-normal-100",
    banco: "NEO",
    nome: "NEO NORMAL — 100%",
    percentual: 100,
    fator: 0.04199,
    prazo: 22,
    ativo: true,
  },
];

const configPadrao: ConfiguracaoGeral = {
  nomeSistema: "SOMOS ELEVA",
  nomeEmpresa: "Eleva Promotora de Crédito",
  multiplicadorSaldo: 22,
  moeda: "BRL",
};

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

export default function SettingsManager() {
  const [aba, setAba] = useState<"geral" | "bancos" | "tabelas" | "metas">("geral");
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [geral, setGeral] = useState<ConfiguracaoGeral>(configPadrao);
  const [mensagem, setMensagem] = useState("");

  const [novoBanco, setNovoBanco] = useState("");
  const [novaTabela, setNovaTabela] = useState({
    banco: "NEO",
    nome: "",
    percentual: "",
    fator: "",
    prazo: "22",
  });
  const [novaMeta, setNovaMeta] = useState({
    nome: "",
    tipo: "Empresa" as Meta["tipo"],
    responsavel: "",
    valor: "",
    inicio: hoje(),
    fim: hoje(),
  });

  useEffect(() => {
    carregar();
  }, []);

  function carregar() {
    try {
      const salvo = JSON.parse(localStorage.getItem("somos-eleva-config-bancos") || "null");
      const lista = Array.isArray(salvo) && salvo.length ? salvo : bancosPadrao;
      setBancos(lista);
      localStorage.setItem("somos-eleva-config-bancos", JSON.stringify(lista));
    } catch {
      setBancos(bancosPadrao);
    }

    try {
      const salvo = JSON.parse(localStorage.getItem("somos-eleva-config-tabelas") || "null");
      const lista = Array.isArray(salvo) && salvo.length ? salvo : tabelasPadrao;
      setTabelas(lista);
      localStorage.setItem("somos-eleva-config-tabelas", JSON.stringify(lista));
    } catch {
      setTabelas(tabelasPadrao);
    }

    try {
      setMetas(JSON.parse(localStorage.getItem("somos-eleva-config-metas") || "[]"));
    } catch {
      setMetas([]);
    }

    try {
      const salvo = JSON.parse(localStorage.getItem("somos-eleva-config-geral") || "null");
      setGeral(salvo || configPadrao);
    } catch {
      setGeral(configPadrao);
    }
  }

  function salvarGeral() {
    localStorage.setItem("somos-eleva-config-geral", JSON.stringify(geral));
    setMensagem("Configurações gerais salvas.");
  }

  function adicionarBanco(event: FormEvent) {
    event.preventDefault();
    const nome = novoBanco.trim().toUpperCase();

    if (!nome) return setMensagem("Informe o nome do banco.");
    if (bancos.some((item) => item.nome === nome)) {
      return setMensagem("Esse banco já está cadastrado.");
    }

    const lista = [
      ...bancos,
      { id: crypto.randomUUID(), nome, ativo: true },
    ];

    setBancos(lista);
    localStorage.setItem("somos-eleva-config-bancos", JSON.stringify(lista));
    setNovoBanco("");
    setMensagem("Banco cadastrado.");
  }

  function alternarBanco(id: string) {
    const lista = bancos.map((item) =>
      item.id === id ? { ...item, ativo: !item.ativo } : item
    );
    setBancos(lista);
    localStorage.setItem("somos-eleva-config-bancos", JSON.stringify(lista));
  }

  function excluirBanco(id: string) {
    if (!window.confirm("Deseja excluir este banco?")) return;
    const banco = bancos.find((item) => item.id === id);
    const lista = bancos.filter((item) => item.id !== id);
    setBancos(lista);
    localStorage.setItem("somos-eleva-config-bancos", JSON.stringify(lista));

    if (banco) {
      const novasTabelas = tabelas.filter((item) => item.banco !== banco.nome);
      setTabelas(novasTabelas);
      localStorage.setItem("somos-eleva-config-tabelas", JSON.stringify(novasTabelas));
    }
  }

  function adicionarTabela(event: FormEvent) {
    event.preventDefault();

    const fator = numero(novaTabela.fator);
    const percentual = numero(novaTabela.percentual);
    const prazo = Number(novaTabela.prazo);

    if (!novaTabela.nome.trim()) return setMensagem("Informe o nome da tabela.");
    if (fator <= 0) return setMensagem("Informe um fator maior que zero.");
    if (percentual <= 0) return setMensagem("Informe o percentual da tabela.");
    if (prazo <= 0) return setMensagem("Informe um prazo válido.");

    const tabela: Tabela = {
      id: crypto.randomUUID(),
      banco: novaTabela.banco,
      nome: novaTabela.nome.trim().toUpperCase(),
      percentual,
      fator,
      prazo,
      ativo: true,
    };

    const lista = [...tabelas, tabela];
    setTabelas(lista);
    localStorage.setItem("somos-eleva-config-tabelas", JSON.stringify(lista));
    setNovaTabela({
      banco: bancos.find((item) => item.ativo)?.nome || "",
      nome: "",
      percentual: "",
      fator: "",
      prazo: "22",
    });
    setMensagem("Tabela cadastrada.");
  }

  function alternarTabela(id: string) {
    const lista = tabelas.map((item) =>
      item.id === id ? { ...item, ativo: !item.ativo } : item
    );
    setTabelas(lista);
    localStorage.setItem("somos-eleva-config-tabelas", JSON.stringify(lista));
  }

  function excluirTabela(id: string) {
    if (!window.confirm("Deseja excluir esta tabela?")) return;
    const lista = tabelas.filter((item) => item.id !== id);
    setTabelas(lista);
    localStorage.setItem("somos-eleva-config-tabelas", JSON.stringify(lista));
  }

  function adicionarMeta(event: FormEvent) {
    event.preventDefault();

    const valor = numero(novaMeta.valor);
    if (!novaMeta.nome.trim()) return setMensagem("Informe o nome da meta.");
    if (valor <= 0) return setMensagem("Informe um valor de meta maior que zero.");

    const meta: Meta = {
      id: crypto.randomUUID(),
      nome: novaMeta.nome.trim(),
      tipo: novaMeta.tipo,
      responsavel: novaMeta.responsavel.trim(),
      valor,
      inicio: novaMeta.inicio,
      fim: novaMeta.fim,
      ativo: true,
    };

    const lista = [meta, ...metas];
    setMetas(lista);
    localStorage.setItem("somos-eleva-config-metas", JSON.stringify(lista));
    setNovaMeta({
      nome: "",
      tipo: "Empresa",
      responsavel: "",
      valor: "",
      inicio: hoje(),
      fim: hoje(),
    });
    setMensagem("Meta cadastrada.");
  }

  function alternarMeta(id: string) {
    const lista = metas.map((item) =>
      item.id === id ? { ...item, ativo: !item.ativo } : item
    );
    setMetas(lista);
    localStorage.setItem("somos-eleva-config-metas", JSON.stringify(lista));
  }

  function excluirMeta(id: string) {
    if (!window.confirm("Deseja excluir esta meta?")) return;
    const lista = metas.filter((item) => item.id !== id);
    setMetas(lista);
    localStorage.setItem("somos-eleva-config-metas", JSON.stringify(lista));
  }

  const resumo = useMemo(
    () => ({
      bancosAtivos: bancos.filter((item) => item.ativo).length,
      tabelasAtivas: tabelas.filter((item) => item.ativo).length,
      metasAtivas: metas.filter((item) => item.ativo).length,
    }),
    [bancos, tabelas, metas]
  );

  return (
    <div className="settings-page">
      <section className="settings-summary">
        <article><span>Bancos ativos</span><strong>{resumo.bancosAtivos}</strong></article>
        <article><span>Tabelas ativas</span><strong>{resumo.tabelasAtivas}</strong></article>
        <article><span>Metas ativas</span><strong>{resumo.metasAtivas}</strong></article>
        <article className="settings-highlight"><span>Multiplicador do saldo</span><strong>{geral.multiplicadorSaldo}x</strong></article>
      </section>

      <nav className="settings-tabs">
        <button className={aba === "geral" ? "active" : ""} onClick={() => setAba("geral")}>Geral</button>
        <button className={aba === "bancos" ? "active" : ""} onClick={() => setAba("bancos")}>Bancos</button>
        <button className={aba === "tabelas" ? "active" : ""} onClick={() => setAba("tabelas")}>Tabelas</button>
        <button className={aba === "metas" ? "active" : ""} onClick={() => setAba("metas")}>Metas</button>
      </nav>

      {mensagem && <div className="settings-message">{mensagem}</div>}

      {aba === "geral" && (
        <section className="settings-card">
          <div className="settings-heading">
            <div><span>CONFIGURAÇÕES GERAIS</span><h2>Identidade e cálculo padrão</h2><p>Esses parâmetros serão usados pelos demais módulos.</p></div>
            <b>⚙</b>
          </div>

          <div className="settings-form-grid">
            <label>Nome do sistema<input value={geral.nomeSistema} onChange={e=>setGeral({...geral,nomeSistema:e.target.value})}/></label>
            <label>Nome da empresa<input value={geral.nomeEmpresa} onChange={e=>setGeral({...geral,nomeEmpresa:e.target.value})}/></label>
            <label>Multiplicador do saldo<input value={geral.multiplicadorSaldo} onChange={e=>setGeral({...geral,multiplicadorSaldo:Number(e.target.value)||0})} type="number"/></label>
            <label>Moeda<select value={geral.moeda} onChange={e=>setGeral({...geral,moeda:e.target.value})}><option value="BRL">Real brasileiro (BRL)</option></select></label>
          </div>

          <div className="settings-actions"><button onClick={salvarGeral}>Salvar configurações</button></div>
        </section>
      )}

      {aba === "bancos" && (
        <section className="settings-grid">
          <form className="settings-card" onSubmit={adicionarBanco}>
            <div className="settings-heading"><div><span>NOVO BANCO</span><h2>Cadastrar banco</h2></div><b>+</b></div>
            <label className="settings-single-label">Nome do banco<input value={novoBanco} onChange={e=>setNovoBanco(e.target.value)} placeholder="Ex.: BANCO MASTER"/></label>
            <div className="settings-actions"><button type="submit">Adicionar banco</button></div>
          </form>

          <section className="settings-card">
            <div className="settings-list-heading"><div><span>BANCOS CADASTRADOS</span><h2>Instituições disponíveis</h2></div><b>{bancos.length}</b></div>
            <div className="settings-list">
              {bancos.map(banco=>(
                <article key={banco.id}>
                  <div className="settings-icon">B</div>
                  <div><strong>{banco.nome}</strong><span>{banco.ativo ? "Disponível no sistema" : "Desativado"}</span></div>
                  <span className={banco.ativo ? "status-active" : "status-inactive"}>{banco.ativo ? "Ativo" : "Inativo"}</span>
                  <div className="settings-row-actions">
                    <button onClick={()=>alternarBanco(banco.id)}>{banco.ativo ? "Desativar" : "Ativar"}</button>
                    <button className="delete" onClick={()=>excluirBanco(banco.id)}>Excluir</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {aba === "tabelas" && (
        <section className="settings-grid">
          <form className="settings-card" onSubmit={adicionarTabela}>
            <div className="settings-heading"><div><span>NOVA TABELA</span><h2>Cadastrar fator e percentual</h2></div><b>%</b></div>
            <div className="settings-form-grid">
              <label>Banco<select value={novaTabela.banco} onChange={e=>setNovaTabela({...novaTabela,banco:e.target.value})}>{bancos.filter(b=>b.ativo).map(b=><option key={b.id}>{b.nome}</option>)}</select></label>
              <label>Nome da tabela<input value={novaTabela.nome} onChange={e=>setNovaTabela({...novaTabela,nome:e.target.value})} placeholder="Ex.: NEO FLEX 1"/></label>
              <label>Percentual<input value={novaTabela.percentual} onChange={e=>setNovaTabela({...novaTabela,percentual:e.target.value})} placeholder="Ex.: 82" inputMode="decimal"/></label>
              <label>Fator<input value={novaTabela.fator} onChange={e=>setNovaTabela({...novaTabela,fator:e.target.value})} placeholder="Ex.: 0,04199" inputMode="decimal"/></label>
              <label>Prazo<input value={novaTabela.prazo} onChange={e=>setNovaTabela({...novaTabela,prazo:e.target.value})} type="number"/></label>
            </div>
            <div className="settings-actions"><button type="submit">Adicionar tabela</button></div>
          </form>

          <section className="settings-card">
            <div className="settings-list-heading"><div><span>TABELAS CADASTRADAS</span><h2>Fatores e percentuais</h2></div><b>{tabelas.length}</b></div>
            <div className="settings-table-list">
              {tabelas.map(tabela=>(
                <article key={tabela.id}>
                  <div><strong>{tabela.nome}</strong><span>{tabela.banco}</span></div>
                  <div><small>Percentual</small><b>{String(tabela.percentual).replace(".",",")}%</b></div>
                  <div><small>Fator</small><b>{tabela.fator.toFixed(5).replace(".",",")}</b></div>
                  <div><small>Prazo</small><b>{tabela.prazo}x</b></div>
                  <span className={tabela.ativo ? "status-active" : "status-inactive"}>{tabela.ativo ? "Ativa" : "Inativa"}</span>
                  <div className="settings-row-actions">
                    <button onClick={()=>alternarTabela(tabela.id)}>{tabela.ativo ? "Desativar" : "Ativar"}</button>
                    <button className="delete" onClick={()=>excluirTabela(tabela.id)}>Excluir</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {aba === "metas" && (
        <section className="settings-grid">
          <form className="settings-card" onSubmit={adicionarMeta}>
            <div className="settings-heading"><div><span>NOVA META</span><h2>Cadastrar objetivo</h2></div><b>◎</b></div>
            <div className="settings-form-grid">
              <label>Nome da meta<input value={novaMeta.nome} onChange={e=>setNovaMeta({...novaMeta,nome:e.target.value})} placeholder="Ex.: Meta mensal Compra de Dívida"/></label>
              <label>Tipo<select value={novaMeta.tipo} onChange={e=>setNovaMeta({...novaMeta,tipo:e.target.value as Meta["tipo"]})}><option>Empresa</option><option>Equipe</option><option>Consultora</option></select></label>
              <label>Responsável<input value={novaMeta.responsavel} onChange={e=>setNovaMeta({...novaMeta,responsavel:e.target.value})} placeholder="Empresa, equipe ou consultora"/></label>
              <label>Valor da meta<input value={novaMeta.valor} onChange={e=>setNovaMeta({...novaMeta,valor:e.target.value})} placeholder="Ex.: 500.000,00" inputMode="decimal"/></label>
              <label>Data inicial<input type="date" value={novaMeta.inicio} onChange={e=>setNovaMeta({...novaMeta,inicio:e.target.value})}/></label>
              <label>Data final<input type="date" value={novaMeta.fim} onChange={e=>setNovaMeta({...novaMeta,fim:e.target.value})}/></label>
            </div>
            <div className="settings-actions"><button type="submit">Adicionar meta</button></div>
          </form>

          <section className="settings-card">
            <div className="settings-list-heading"><div><span>METAS CADASTRADAS</span><h2>Objetivos da operação</h2></div><b>{metas.length}</b></div>
            <div className="settings-list">
              {metas.length===0 ? <div className="settings-empty">Nenhuma meta cadastrada.</div> :
                metas.map(meta=>(
                  <article key={meta.id}>
                    <div className="settings-icon">◎</div>
                    <div><strong>{meta.nome}</strong><span>{meta.tipo}{meta.responsavel ? ` • ${meta.responsavel}` : ""}</span></div>
                    <div><strong>{moeda(meta.valor)}</strong><span>{meta.inicio} até {meta.fim}</span></div>
                    <span className={meta.ativo ? "status-active" : "status-inactive"}>{meta.ativo ? "Ativa" : "Inativa"}</span>
                    <div className="settings-row-actions">
                      <button onClick={()=>alternarMeta(meta.id)}>{meta.ativo ? "Desativar" : "Ativar"}</button>
                      <button className="delete" onClick={()=>excluirMeta(meta.id)}>Excluir</button>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        </section>
      )}

      <section className="settings-warning">
        <strong>Integração preparada:</strong>
        <span>as tabelas e metas ficam centralizadas para serem usadas pelos módulos de Simulação, Propostas, Dashboard e Ranking.</span>
      </section>
    </div>
  );
}
