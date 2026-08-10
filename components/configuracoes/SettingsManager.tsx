"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import "./configuracoes.css";

type Banco = {
  id: string;
  nome: string;
  ativo: boolean;
};

type Tabela = {
  id: string;
  banco: string;
  orgaoConvenio: string;
  nome: string;
  codigo: string;
  percentual: number;
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
  { id: "neo-normal-399", banco: "NEO", orgaoConvenio: "", nome: "NORMAL", codigo: "399", percentual: 100, ativo: true },
  { id: "neo-flex-1-379", banco: "NEO", orgaoConvenio: "", nome: "FLEX 1", codigo: "379", percentual: 75, ativo: true },
  { id: "neo-flex-2-359", banco: "NEO", orgaoConvenio: "", nome: "FLEX 2", codigo: "359", percentual: 50, ativo: true },
  { id: "neo-flex-3-339", banco: "NEO", orgaoConvenio: "", nome: "FLEX 3", codigo: "339", percentual: 40, ativo: true },
  { id: "neo-flex-4-319", banco: "NEO", orgaoConvenio: "", nome: "FLEX 4", codigo: "319", percentual: 20, ativo: true },
  { id: "neo-flex-5-299", banco: "NEO", orgaoConvenio: "", nome: "FLEX 5", codigo: "299", percentual: 8, ativo: true },
];

const configPadrao: ConfiguracaoGeral = {
  nomeSistema: "SOMOS ELEVA",
  nomeEmpresa: "Eleva Promotora de Crédito",
  multiplicadorSaldo: 22,
  moeda: "BRL",
};

function numero(valor: string) {
  const texto = String(valor || "")
    .trim()
    .replace(/[^\d,.-]/g, "");

  if (!texto) return 0;

  let normalizado = texto;

  if (texto.includes(",") && texto.includes(".")) {
    normalizado = texto.replace(/\./g, "").replace(",", ".");
  } else if (texto.includes(",")) {
    normalizado = texto.replace(",", ".");
  }

  const convertido = Number(normalizado);

  return Number.isFinite(convertido) ? convertido : 0;
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function SettingsManager() {
  const supabase = useMemo(() => createClient(), []);

  const [aba, setAba] = useState<"geral" | "bancos" | "tabelas" | "metas">("geral");
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [geral, setGeral] = useState<ConfiguracaoGeral>(configPadrao);
  const [mensagem, setMensagem] = useState("");
  const [processando, setProcessando] = useState(false);

  const [novoBanco, setNovoBanco] = useState("");
  const [novaTabela, setNovaTabela] = useState({
    banco: "NEO",
    orgaoConvenio: "",
    nome: "",
    codigo: "",
    percentual: "",
  });

  const [editandoTabelaId, setEditandoTabelaId] = useState<string | null>(null);
  const [edicaoTabela, setEdicaoTabela] = useState({
    banco: "NEO",
    orgaoConvenio: "",
    nome: "",
    codigo: "",
    percentual: "",
  });
  const [novaMeta, setNovaMeta] = useState({
    nome: "",
    tipo: "Empresa" as Meta["tipo"],
    responsavel: "",
    valor: "",
    inicio: hoje(),
    fim: hoje(),
  });

  async function obterToken() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error(
        "Sua sessão expirou. Entre novamente no sistema.",
      );
    }

    return data.session.access_token;
  }

  async function chamarApi(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    body?: unknown,
  ) {
    const token = await obterToken();

    const resposta = await fetch("/api/configuracoes", {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body
          ? {
              "Content-Type": "application/json",
            }
          : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const conteudo = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        conteudo.erro ||
          "Não foi possível concluir a operação.",
      );
    }

    return conteudo;
  }

  async function carregar() {
    setProcessando(true);

    try {
      const conteudo = await chamarApi("GET");

      const bancosApi = Array.isArray(conteudo.bancos)
        ? conteudo.bancos.map((item: Record<string, unknown>) => ({
            id: String(item.id || ""),
            nome: String(item.nome || ""),
            ativo: item.ativo !== false,
          }))
        : [];

      const tabelasApi = Array.isArray(conteudo.tabelas)
        ? conteudo.tabelas.map((item: Record<string, unknown>) => ({
            id: String(item.id || ""),
            banco: String(item.banco || ""),
            orgaoConvenio: String(item.orgao_convenio || ""),
            nome: String(item.nome || ""),
            codigo: String(item.codigo || ""),
            percentual: Number(item.percentual || 0),
            ativo: item.ativo !== false,
          }))
        : [];

      setBancos(bancosApi);
      setTabelas(tabelasApi);

      // Metas e geral permanecem locais por enquanto.
      try {
        setMetas(
          JSON.parse(
            localStorage.getItem("somos-eleva-config-metas") || "[]",
          ),
        );
      } catch {
        setMetas([]);
      }

      try {
        const salvo = JSON.parse(
          localStorage.getItem("somos-eleva-config-geral") || "null",
        );
        setGeral(salvo || configPadrao);
      } catch {
        setGeral(configPadrao);
      }
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar as configurações.",
      );

      setBancos(bancosPadrao);
      setTabelas(tabelasPadrao);
    } finally {
      setProcessando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [supabase]);

  function salvarGeral() {
    localStorage.setItem("somos-eleva-config-geral", JSON.stringify(geral));
    setMensagem("Configurações gerais salvas.");
  }

  async function adicionarBanco(event: FormEvent) {
    event.preventDefault();

    const nome = novoBanco.trim().toUpperCase();

    if (!nome) {
      setMensagem("Informe o nome do banco.");
      return;
    }

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("POST", {
        acao: "criar_banco",
        banco: {
          nome,
        },
      });

      setNovoBanco("");
      setMensagem(
        conteudo.mensagem ||
          "Banco cadastrado com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível cadastrar o banco.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function alternarBanco(id: string) {
    const banco = bancos.find((item) => item.id === id);

    if (!banco) return;

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("PATCH", {
        acao: "editar_banco",
        banco: {
          id,
          ativo: !banco.ativo,
        },
      });

      setMensagem(
        conteudo.mensagem ||
          "Banco atualizado com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar o banco.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function excluirBanco(id: string) {
    if (!window.confirm("Deseja excluir este banco?")) return;

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("DELETE", {
        tipo: "banco",
        id,
      });

      setMensagem(
        conteudo.mensagem ||
          "Banco excluído com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir o banco.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function adicionarTabela(event: FormEvent) {
    event.preventDefault();

    const nome = novaTabela.nome.trim().toUpperCase();
    const codigo = novaTabela.codigo.trim();
    const percentual = numero(novaTabela.percentual);

    if (!novaTabela.banco) return setMensagem("Selecione o banco.");
    if (!nome) return setMensagem("Informe o nome da tabela.");
    if (!codigo) return setMensagem("Informe o código da tabela.");
    if (percentual <= 0 || percentual > 100) {
      return setMensagem("Informe um percentual entre 0,01% e 100%.");
    }

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("POST", {
        acao: "criar_tabela",
        tabela: {
          banco: novaTabela.banco,
          orgaoConvenio: novaTabela.orgaoConvenio,
          nome,
          codigo,
          percentual,
        },
      });

      setNovaTabela({
        banco: bancos.find((item) => item.ativo)?.nome || "",
        orgaoConvenio: "",
        nome: "",
        codigo: "",
        percentual: "",
      });

      setMensagem(
        conteudo.mensagem ||
          "Tabela cadastrada com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível cadastrar a tabela.",
      );
    } finally {
      setProcessando(false);
    }
  }

  function iniciarEdicaoTabela(tabela: Tabela) {
    setEditandoTabelaId(tabela.id);
    setEdicaoTabela({
      banco: tabela.banco,
      orgaoConvenio: tabela.orgaoConvenio || "",
      nome: tabela.nome,
      codigo: tabela.codigo,
      percentual: String(tabela.percentual).replace(".", ","),
    });
    setMensagem("");
  }

  function cancelarEdicaoTabela() {
    setEditandoTabelaId(null);
    setEdicaoTabela({
      banco: "NEO",
      orgaoConvenio: "",
      nome: "",
      codigo: "",
      percentual: "",
    });
  }

  async function salvarEdicaoTabela() {
    if (!editandoTabelaId) return;

    const nome = edicaoTabela.nome.trim().toUpperCase();
    const codigo = edicaoTabela.codigo.trim();
    const percentual = numero(edicaoTabela.percentual);

    if (!edicaoTabela.banco) return setMensagem("Selecione o banco.");
    if (!nome) return setMensagem("Informe o nome da tabela.");
    if (!codigo) return setMensagem("Informe o código da tabela.");
    if (percentual <= 0 || percentual > 100) {
      return setMensagem("Informe um percentual entre 0,01% e 100%.");
    }

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("PATCH", {
        acao: "editar_tabela",
        tabela: {
          id: editandoTabelaId,
          banco: edicaoTabela.banco,
          orgaoConvenio: edicaoTabela.orgaoConvenio,
          nome,
          codigo,
          percentual,
        },
      });

      cancelarEdicaoTabela();

      setMensagem(
        conteudo.mensagem ||
          "Tabela atualizada com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar a tabela.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function alternarTabela(id: string) {
    const tabela = tabelas.find((item) => item.id === id);

    if (!tabela) return;

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("PATCH", {
        acao: "editar_tabela",
        tabela: {
          id,
          ativo: !tabela.ativo,
        },
      });

      setMensagem(
        conteudo.mensagem ||
          "Tabela atualizada com sucesso.",
      );

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível atualizar a tabela.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function excluirTabela(id: string) {
    if (!window.confirm("Deseja excluir esta tabela?")) return;

    setProcessando(true);
    setMensagem("");

    try {
      const conteudo = await chamarApi("DELETE", {
        tipo: "tabela",
        id,
      });

      setMensagem(
        conteudo.mensagem ||
          "Tabela excluída com sucesso.",
      );

      if (editandoTabelaId === id) {
        cancelarEdicaoTabela();
      }

      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir a tabela.",
      );
    } finally {
      setProcessando(false);
    }
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
                    <button onClick={() => void alternarBanco(banco.id)}>{banco.ativo ? "Desativar" : "Ativar"}</button>
                    <button className="delete" onClick={() => void excluirBanco(banco.id)}>Excluir</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {aba === "tabelas" && (
        <section className="settings-grid settings-grid-tabelas">
          <form className="settings-card" onSubmit={adicionarTabela}>
            <div className="settings-heading">
              <div>
                <span>NOVA TABELA</span>
                <h2>Cadastrar tabela</h2>
                <p>
                  Banco, código e percentual ficam salvos no Supabase e valem para toda a equipe.
                </p>
              </div>
              <b>%</b>
            </div>

            <div className="settings-form-grid">
              <label>
                Banco
                <select
                  value={novaTabela.banco}
                  onChange={(e) =>
                    setNovaTabela({
                      ...novaTabela,
                      banco: e.target.value,
                    })
                  }
                  disabled={processando}
                >
                  {bancos
                    .filter((banco) => banco.ativo)
                    .map((banco) => (
                      <option key={banco.id} value={banco.nome}>
                        {banco.nome}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Órgão / Convênio
                <select
                  value={novaTabela.orgaoConvenio}
                  onChange={(e) =>
                    setNovaTabela({
                      ...novaTabela,
                      orgaoConvenio: e.target.value,
                    })
                  }
                  disabled={processando}
                >
                  <option value="">Sem órgão específico</option>
<option value="GOVERNO DE SP">GOVERNO DE SP</option>
<option value="GOVERNO MA">GOVERNO MA</option>
<option value="PREFEITURA">PREFEITURA</option>
                </select>
              </label>

              <label>
                Nome da tabela
                <input
                  value={novaTabela.nome}
                  onChange={(e) =>
                    setNovaTabela({
                      ...novaTabela,
                      nome: e.target.value,
                    })
                  }
                  placeholder="Ex.: FLEX 1"
                  disabled={processando}
                />
              </label>

              <label>
                Código da tabela
                <input
                  value={novaTabela.codigo}
                  onChange={(e) =>
                    setNovaTabela({
                      ...novaTabela,
                      codigo: e.target.value,
                    })
                  }
                  placeholder="Ex.: 379"
                  inputMode="numeric"
                  disabled={processando}
                />
              </label>

              <label>
                % para produção
                <input
                  value={novaTabela.percentual}
                  onChange={(e) =>
                    setNovaTabela({
                      ...novaTabela,
                      percentual: e.target.value,
                    })
                  }
                  placeholder="Ex.: 75"
                  inputMode="decimal"
                  disabled={processando}
                />
              </label>
            </div>

            <div className="settings-actions">
              <button type="submit" disabled={processando}>
                {processando ? "Salvando..." : "Adicionar tabela"}
              </button>
            </div>
          </form>

          <section className="settings-card">
            <div className="settings-list-heading">
              <div>
                <span>TABELAS CADASTRADAS</span>
                <h2>Regras de produção</h2>
                <p>
                  Alterações feitas aqui ficam disponíveis para todos os usuários do sistema.
                </p>
              </div>
              <b>{tabelas.length}</b>
            </div>

            <div className="settings-table-head settings-table-grid">
              <span>Tabela</span>
              <span>Banco</span>
              <span>Órgão / Convênio</span>
              <span>Código</span>
              <span>% Produção</span>
              <span>Status</span>
              <span>Ações</span>
            </div>

            <div className="settings-table-list">
              {tabelas.map((tabela) => {
                const editando = editandoTabelaId === tabela.id;

                return (
                  <article
                    key={tabela.id}
                    className="settings-table-grid settings-table-row-new"
                  >
                    {editando ? (
                      <>
                        <div>
                          <input
                            value={edicaoTabela.nome}
                            onChange={(e) =>
                              setEdicaoTabela({
                                ...edicaoTabela,
                                nome: e.target.value,
                              })
                            }
                            disabled={processando}
                          />
                        </div>

                        <div>
                          <select
                            value={edicaoTabela.banco}
                            onChange={(e) =>
                              setEdicaoTabela({
                                ...edicaoTabela,
                                banco: e.target.value,
                              })
                            }
                            disabled={processando}
                          >
                            {bancos
                              .filter((banco) => banco.ativo)
                              .map((banco) => (
                                <option key={banco.id} value={banco.nome}>
                                  {banco.nome}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <select
                            value={edicaoTabela.orgaoConvenio}
                            onChange={(e) =>
                              setEdicaoTabela({
                                ...edicaoTabela,
                                orgaoConvenio: e.target.value,
                              })
                            }
                            disabled={processando}
                          >
                            <option value="">Sem órgão específico</option>
                            <option value="GOVERNO DE SP">GOVERNO DE SP</option>
                            <option value="GOVERNO MA">GOVERNO MA</option>
                          </select>
                        </div>

                        <div>
                          <input
                            value={edicaoTabela.codigo}
                            onChange={(e) =>
                              setEdicaoTabela({
                                ...edicaoTabela,
                                codigo: e.target.value,
                              })
                            }
                            inputMode="numeric"
                            disabled={processando}
                          />
                        </div>

                        <div>
                          <input
                            value={edicaoTabela.percentual}
                            onChange={(e) =>
                              setEdicaoTabela({
                                ...edicaoTabela,
                                percentual: e.target.value,
                              })
                            }
                            inputMode="decimal"
                            disabled={processando}
                          />
                        </div>

                        <span
                          className={
                            tabela.ativo
                              ? "status-active"
                              : "status-inactive"
                          }
                        >
                          {tabela.ativo ? "Ativa" : "Inativa"}
                        </span>

                        <div className="settings-row-actions">
                          <button
                            type="button"
                            className="save-edit"
                            onClick={() => void salvarEdicaoTabela()}
                            disabled={processando}
                          >
                            Salvar
                          </button>

                          <button
                            type="button"
                            onClick={cancelarEdicaoTabela}
                            disabled={processando}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <strong>{tabela.nome}</strong>
                          <span>
                            {tabela.banco} • Código {tabela.codigo || "—"}
                          </span>
                        </div>

                        <div>
                          <strong>{tabela.banco}</strong>
                        </div>

                        <div>
                          <strong>{tabela.orgaoConvenio || "—"}</strong>
                        </div>

                        <div>
                          <b>{tabela.codigo || "—"}</b>
                        </div>

                        <div>
                          <b className="settings-percent-value">
                            {String(tabela.percentual).replace(".", ",")}%
                          </b>
                        </div>

                        <span
                          className={
                            tabela.ativo
                              ? "status-active"
                              : "status-inactive"
                          }
                        >
                          {tabela.ativo ? "Ativa" : "Inativa"}
                        </span>

                        <div className="settings-row-actions">
                          <button
                            type="button"
                            onClick={() => iniciarEdicaoTabela(tabela)}
                            disabled={processando}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => void alternarTabela(tabela.id)}
                            disabled={processando}
                          >
                            {tabela.ativo ? "Desativar" : "Ativar"}
                          </button>

                          <button
                            type="button"
                            className="delete"
                            onClick={() => void excluirTabela(tabela.id)}
                            disabled={processando}
                          >
                            Excluir
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
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