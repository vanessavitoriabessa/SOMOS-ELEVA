"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import "./usuarios.css";

type Perfil =
  | "Administradora"
  | "Coordenadora"
  | "Supervisora"
  | "Consultora"
  | "Operacional"
  | "Financeiro";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  matricula: string;
  senha: string;
  perfil: Perfil;
  equipe: string;
  ativo: boolean;
  criadoEm: string;
};

const PERFIS: Perfil[] = [
  "Administradora",
  "Coordenadora",
  "Supervisora",
  "Consultora",
  "Operacional",
  "Financeiro",
];

const vazio = {
  nome: "",
  email: "",
  matricula: "",
  senha: "",
  perfil: "Consultora" as Perfil,
  equipe: "",
  ativo: true,
};

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function criarAdminPadrao(): Usuario {
  return {
    id: "admin-padrao",
    nome: "Tay",
    email: "admin@somosmaiseleva.com.br",
    matricula: "0001",
    senha: "Eleva@2026",
    perfil: "Administradora",
    equipe: "Diretoria",
    ativo: true,
    criadoEm: new Date().toLocaleString("pt-BR"),
  };
}

export default function UserManager() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState(vazio);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("Todos");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const salvo = localStorage.getItem("somos-eleva-usuarios");

    if (!salvo) {
      const inicial = [criarAdminPadrao()];
      setUsuarios(inicial);
      localStorage.setItem("somos-eleva-usuarios", JSON.stringify(inicial));
      return;
    }

    try {
      const lista = JSON.parse(salvo);
      setUsuarios(Array.isArray(lista) && lista.length ? lista : [criarAdminPadrao()]);
    } catch {
      const inicial = [criarAdminPadrao()];
      setUsuarios(inicial);
      localStorage.setItem("somos-eleva-usuarios", JSON.stringify(inicial));
    }
  }, []);

  function persistir(lista: Usuario[]) {
    setUsuarios(lista);
    localStorage.setItem("somos-eleva-usuarios", JSON.stringify(lista));
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return usuarios
      .filter((usuario) => filtroPerfil === "Todos" || usuario.perfil === filtroPerfil)
      .filter(
        (usuario) =>
          !termo ||
          usuario.nome.toLowerCase().includes(termo) ||
          usuario.email.toLowerCase().includes(termo) ||
          usuario.matricula.includes(termo) ||
          usuario.equipe.toLowerCase().includes(termo)
      );
  }, [usuarios, busca, filtroPerfil]);

  const resumo = useMemo(
    () => ({
      total: usuarios.length,
      ativos: usuarios.filter((item) => item.ativo).length,
      consultoras: usuarios.filter((item) => item.perfil === "Consultora").length,
      gestao: usuarios.filter((item) =>
        ["Administradora", "Coordenadora", "Supervisora"].includes(item.perfil)
      ).length,
    }),
    [usuarios]
  );

  function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem("");

    if (!form.nome.trim()) return setMensagem("Informe o nome do usuário.");
    if (!form.email.trim() && !form.matricula.trim()) {
      return setMensagem("Informe o e-mail ou a matrícula.");
    }
    if (form.senha.length < 6) {
      return setMensagem("A senha precisa ter pelo menos 6 caracteres.");
    }

    const email = form.email.trim().toLowerCase();
    const matricula = somenteNumeros(form.matricula);

    const duplicado = usuarios.some(
      (item) =>
        item.id !== editandoId &&
        ((email && item.email.toLowerCase() === email) ||
          (matricula && item.matricula === matricula))
    );

    if (duplicado) {
      return setMensagem("Já existe um usuário com esse e-mail ou matrícula.");
    }

    const antigo = usuarios.find((item) => item.id === editandoId);

    const usuario: Usuario = {
      id: editandoId || crypto.randomUUID(),
      nome: form.nome.trim(),
      email,
      matricula,
      senha: form.senha,
      perfil: form.perfil,
      equipe: form.equipe.trim(),
      ativo: form.ativo,
      criadoEm: antigo?.criadoEm || new Date().toLocaleString("pt-BR"),
    };

    const atualizados = editandoId
      ? usuarios.map((item) => (item.id === editandoId ? usuario : item))
      : [usuario, ...usuarios];

    persistir(atualizados);
    setForm(vazio);
    setEditandoId(null);
    setMensagem(editandoId ? "Usuário atualizado." : "Usuário criado com sucesso.");
  }

  function editar(usuario: Usuario) {
    setEditandoId(usuario.id);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      matricula: usuario.matricula,
      senha: usuario.senha,
      perfil: usuario.perfil,
      equipe: usuario.equipe,
      ativo: usuario.ativo,
    });
    setMensagem("Editando usuário selecionado.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function alternarStatus(id: string) {
    persistir(
      usuarios.map((item) =>
        item.id === id ? { ...item, ativo: !item.ativo } : item
      )
    );
  }

  function excluir(id: string) {
    const usuario = usuarios.find((item) => item.id === id);
    if (usuario?.perfil === "Administradora" && usuarios.filter((u) => u.perfil === "Administradora").length === 1) {
      setMensagem("Não é possível excluir a única administradora.");
      return;
    }

    if (!window.confirm("Deseja excluir este usuário?")) return;
    persistir(usuarios.filter((item) => item.id !== id));
  }

  return (
    <div className="users-page">
      <section className="users-summary">
        <article><span>Total de usuários</span><strong>{resumo.total}</strong></article>
        <article><span>Usuários ativos</span><strong>{resumo.ativos}</strong></article>
        <article><span>Consultoras</span><strong>{resumo.consultoras}</strong></article>
        <article className="users-highlight"><span>Gestão</span><strong>{resumo.gestao}</strong></article>
      </section>

      <section className="users-layout">
        <form className="users-card" onSubmit={salvar}>
          <div className="users-heading">
            <div>
              <span>{editandoId ? "EDITAR ACESSO" : "NOVO ACESSO"}</span>
              <h2>{editandoId ? "Atualizar usuário" : "Cadastrar usuário"}</h2>
              <p>Cada colaboradora terá login próprio e nome exibido no sistema.</p>
            </div>
            <b>+</b>
          </div>

          <div className="users-form-grid">
            <label>Nome completo<input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Nome da colaboradora"/></label>
            <label>E-mail<input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="colaboradora@somosmaiseleva.com.br" type="email"/></label>
            <label>Matrícula<input value={form.matricula} onChange={e=>setForm({...form,matricula:somenteNumeros(e.target.value)})} placeholder="Ex.: 0012" inputMode="numeric"/></label>
            <label>Senha<input value={form.senha} onChange={e=>setForm({...form,senha:e.target.value})} placeholder="Mínimo de 6 caracteres" type="text"/></label>
            <label>Perfil<select value={form.perfil} onChange={e=>setForm({...form,perfil:e.target.value as Perfil})}>{PERFIS.map(perfil=><option key={perfil}>{perfil}</option>)}</select></label>
            <label>Equipe<input value={form.equipe} onChange={e=>setForm({...form,equipe:e.target.value})} placeholder="Ex.: Compra de Dívida"/></label>
            <label className="users-switch"><input type="checkbox" checked={form.ativo} onChange={e=>setForm({...form,ativo:e.target.checked})}/><span>Usuário ativo</span></label>
          </div>

          {mensagem && <div className="users-message">{mensagem}</div>}

          <div className="users-actions">
            {editandoId && <button type="button" className="cancel" onClick={()=>{setEditandoId(null);setForm(vazio);setMensagem("");}}>Cancelar</button>}
            <button type="submit" className="save">{editandoId ? "Atualizar usuário" : "Criar usuário"}</button>
          </div>
        </form>

        <section className="users-card">
          <div className="users-list-heading">
            <div><span>EQUIPE CADASTRADA</span><h2>Usuários e permissões</h2></div>
            <b>{filtrados.length}</b>
          </div>

          <div className="users-filters">
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar nome, e-mail, matrícula ou equipe"/>
            <select value={filtroPerfil} onChange={e=>setFiltroPerfil(e.target.value)}><option>Todos</option>{PERFIS.map(perfil=><option key={perfil}>{perfil}</option>)}</select>
          </div>

          <div className="users-list">
            {filtrados.map(usuario=>(
              <article key={usuario.id}>
                <div className="user-avatar">{usuario.nome.charAt(0).toUpperCase()}</div>
                <div className="user-main">
                  <strong>{usuario.nome}</strong>
                  <span>{usuario.email || `Matrícula ${usuario.matricula}`}</span>
                  <div><b>{usuario.perfil}</b>{usuario.equipe && <b>{usuario.equipe}</b>}</div>
                </div>
                <div className="user-status">
                  <span className={usuario.ativo ? "active" : "inactive"}>{usuario.ativo ? "Ativo" : "Inativo"}</span>
                  <small>Matrícula: {usuario.matricula || "—"}</small>
                </div>
                <div className="user-actions">
                  <button onClick={()=>editar(usuario)}>Editar</button>
                  <button onClick={()=>alternarStatus(usuario.id)}>{usuario.ativo ? "Desativar" : "Ativar"}</button>
                  <button className="delete" onClick={()=>excluir(usuario.id)}>Excluir</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="users-warning">
        <strong>Importante:</strong>
        <span>esta primeira versão salva os acessos no navegador. Depois faremos a migração para o Supabase para segurança real e uso em vários computadores.</span>
      </section>
    </div>
  );
}
