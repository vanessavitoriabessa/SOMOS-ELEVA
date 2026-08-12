"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
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
  perfil: Perfil;
  equipe: string;
  timeId: string;
  ativo: boolean;
  criadoEm: string;
  foto: string;
};

type FormularioUsuario = {
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil;
  equipe: string;
  timeId: string;
  ativo: boolean;
  foto: string;
};

type UsuarioRecebido = {
  id: string;
  nome?: string;
  email?: string;
  perfil?: Perfil;
  equipe?: string;
  time_id?: string | null;
  ativo?: boolean;
  foto_url?: string;
  criado_em?: string;
};

type RespostaApi = {
  erro?: string;
  mensagem?: string;
  usuario?: UsuarioRecebido;
  usuarios?: UsuarioRecebido[];
};

type SupervisoraTime = { id: string; nome?: string; email?: string; ativo?: boolean };
type TimeComercial = {
  id: string; nome: string; supervisor_id?: string | null; ativo: boolean;
  supervisora?: SupervisoraTime | null;
  quantidade_membros?: number; quantidade_consultoras?: number;
};
type RespostaTimesApi = {
  erro?: string; mensagem?: string; times?: TimeComercial[]; supervisoras?: SupervisoraTime[];
};

const PERFIS: Perfil[] = [
  "Administradora",
  "Coordenadora",
  "Supervisora",
  "Consultora",
  "Operacional",
  "Financeiro",
];

const formularioVazio: FormularioUsuario = {
  nome: "",
  email: "",
  senha: "",
  perfil: "Consultora",
  equipe: "",
  timeId: "",
  ativo: true,
  foto: "",
};

function transformarUsuario(
  usuario: UsuarioRecebido
): Usuario {
  return {
    id: usuario.id,
    nome:
      String(usuario.nome || "").trim() ||
      "Colaboradora",
    email: String(usuario.email || "")
      .trim()
      .toLowerCase(),
    perfil:
      usuario.perfil || "Consultora",
    equipe: String(
      usuario.equipe || ""
    ).trim(),
    timeId: String(usuario.time_id || "").trim(),
    ativo:
      usuario.ativo !== false,
    criadoEm: usuario.criado_em
      ? new Date(
          usuario.criado_em
        ).toLocaleString("pt-BR")
      : "",
    foto: String(
      usuario.foto_url || ""
    ),
  };
}

function compactarFoto(
  arquivo: File
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      if (
        !arquivo.type.startsWith(
          "image/"
        )
      ) {
        reject(
          new Error(
            "Selecione um arquivo de imagem."
          )
        );
        return;
      }

      if (
        arquivo.size >
        8 * 1024 * 1024
      ) {
        reject(
          new Error(
            "A imagem deve ter no máximo 8 MB."
          )
        );
        return;
      }

      const leitor =
        new FileReader();

      leitor.onload = () => {
        const imagem =
          new Image();

        imagem.onload = () => {
          const tamanho = 320;

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = tamanho;
          canvas.height = tamanho;

          const contexto =
            canvas.getContext("2d");

          if (!contexto) {
            reject(
              new Error(
                "Não foi possível processar a imagem."
              )
            );
            return;
          }

          const escala = Math.max(
            tamanho / imagem.width,
            tamanho / imagem.height
          );

          const largura =
            imagem.width * escala;

          const altura =
            imagem.height * escala;

          const posicaoX =
            (tamanho - largura) / 2;

          const posicaoY =
            (tamanho - altura) / 2;

          contexto.drawImage(
            imagem,
            posicaoX,
            posicaoY,
            largura,
            altura
          );

          resolve(
            canvas.toDataURL(
              "image/jpeg",
              0.82
            )
          );
        };

        imagem.onerror = () => {
          reject(
            new Error(
              "Não foi possível abrir a imagem."
            )
          );
        };

        imagem.src = String(
          leitor.result
        );
      };

      leitor.onerror = () => {
        reject(
          new Error(
            "Não foi possível ler a imagem."
          )
        );
      };

      leitor.readAsDataURL(
        arquivo
      );
    }
  );
}

export default function UserManager() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [usuarios, setUsuarios] =
    useState<Usuario[]>([]);

  const [form, setForm] =
    useState<FormularioUsuario>(
      formularioVazio
    );

  const [editandoId, setEditandoId] =
    useState<string | null>(null);

  const [busca, setBusca] =
    useState("");

  const [
    filtroPerfil,
    setFiltroPerfil,
  ] = useState("Todos");

  const [mensagem, setMensagem] =
    useState("");

  const [
    processandoFoto,
    setProcessandoFoto,
  ] = useState(false);

  const [
    processando,
    setProcessando,
  ] = useState(false);

  const [carregando, setCarregando] =
    useState(true);

const [formularioAberto, setFormularioAberto] =
  useState(false);

  const [times, setTimes] = useState<TimeComercial[]>([]);
  const [supervisoras, setSupervisoras] = useState<SupervisoraTime[]>([]);
  const [nomeTime, setNomeTime] = useState("");
  const [supervisorTimeId, setSupervisorTimeId] = useState("");
  const [timeEditandoId, setTimeEditandoId] = useState<string | null>(null);
  const [mensagemTime, setMensagemTime] = useState("");
  const [processandoTime, setProcessandoTime] = useState(false);

  function salvarCopiaLocal(
    lista: Usuario[]
  ) {
    try {
      const copia = lista.map(
        (usuario) => ({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          cargo: usuario.perfil,
          equipe: usuario.equipe,
          time_id: usuario.timeId,
          ativo: usuario.ativo,
          status: usuario.ativo
            ? "Ativo"
            : "Inativo",
          foto: usuario.foto,
          senha: "",
          matricula: "",
        })
      );

      localStorage.setItem(
        "somos-eleva-usuarios",
        JSON.stringify(copia)
      );
    } catch {
      // Mantém o Supabase como fonte principal.
    }
  }

  async function obterToken() {
    const {
      data,
      error,
    } =
      await supabase.auth.getSession();

    if (
      error ||
      !data.session?.access_token
    ) {
      throw new Error(
        "Sua sessão expirou. Saia e entre novamente."
      );
    }

    return data.session.access_token;
  }

  async function carregarTimes() {
    try {
      const token = await obterToken();
      const resposta = await fetch("/api/times", {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const conteudo = (await resposta.json()) as RespostaTimesApi;
      if (!resposta.ok) throw new Error(conteudo.erro || "Não foi possível carregar os times.");
      setTimes(Array.isArray(conteudo.times) ? conteudo.times : []);
      setSupervisoras(Array.isArray(conteudo.supervisoras) ? conteudo.supervisoras : []);
    } catch (erro) {
      setMensagemTime(erro instanceof Error ? erro.message : "Não foi possível carregar os times.");
    }
  }

  async function enviarApiTimes(metodo: "POST" | "PATCH" | "DELETE", dados: Record<string, unknown>) {
    const token = await obterToken();
    const resposta = await fetch("/api/times", {
      method: metodo,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(dados),
    });
    const conteudo = (await resposta.json()) as RespostaTimesApi;
    if (!resposta.ok) throw new Error(conteudo.erro || "Não foi possível concluir a operação.");
    return conteudo;
  }

  async function salvarTime(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!nomeTime.trim()) { setMensagemTime("Informe o nome do time."); return; }
    setProcessandoTime(true); setMensagemTime("");
    try {
      const conteudo = await enviarApiTimes(timeEditandoId ? "PATCH" : "POST", {
        ...(timeEditandoId ? { id: timeEditandoId } : {}),
        nome: nomeTime.trim(), supervisor_id: supervisorTimeId || null, ativo: true,
      });
      setMensagemTime(conteudo.mensagem || "Time salvo com sucesso.");
      setNomeTime(""); setSupervisorTimeId(""); setTimeEditandoId(null);
      await Promise.all([carregarTimes(), carregarUsuarios()]);
    } catch (erro) {
      setMensagemTime(erro instanceof Error ? erro.message : "Não foi possível salvar o time.");
    } finally { setProcessandoTime(false); }
  }

  function editarTime(time: TimeComercial) {
    setTimeEditandoId(time.id); setNomeTime(time.nome);
    setSupervisorTimeId(String(time.supervisor_id || ""));
  }

  async function alternarStatusTime(time: TimeComercial) {
    setProcessandoTime(true);
    try {
      await enviarApiTimes("PATCH", {
        id: time.id, nome: time.nome, supervisor_id: time.supervisor_id || null, ativo: !time.ativo,
      });
      await carregarTimes();
    } catch (erro) {
      setMensagemTime(erro instanceof Error ? erro.message : "Não foi possível alterar o time.");
    } finally { setProcessandoTime(false); }
  }

  async function excluirTime(time: TimeComercial) {
    if (!window.confirm(`Deseja excluir o time ${time.nome}?`)) return;
    setProcessandoTime(true);
    try {
      await enviarApiTimes("DELETE", { id: time.id });
      await Promise.all([carregarTimes(), carregarUsuarios()]);
    } catch (erro) {
      setMensagemTime(erro instanceof Error ? erro.message : "Não foi possível excluir o time.");
    } finally { setProcessandoTime(false); }
  }

  async function carregarUsuarios() {
    setCarregando(true);
    setMensagem("");

    try {
      const token =
        await obterToken();

      const resposta = await fetch(
        "/api/usuarios",
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const conteudo =
        (await resposta.json()) as RespostaApi;

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro ||
            "Não foi possível carregar os usuários."
        );
      }

      const lista = Array.isArray(
        conteudo.usuarios
      )
        ? conteudo.usuarios.map(
            transformarUsuario
          )
        : [];

      setUsuarios(lista);
      salvarCopiaLocal(lista);
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar os usuários."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarUsuarios();
    void carregarTimes();
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca
      .trim()
      .toLowerCase();

    return usuarios
      .filter(
        (usuario) =>
          filtroPerfil === "Todos" ||
          usuario.perfil ===
            filtroPerfil
      )
      .filter(
        (usuario) =>
          !termo ||
          usuario.nome
            .toLowerCase()
            .includes(termo) ||
          usuario.email
            .toLowerCase()
            .includes(termo) ||
          usuario.equipe
            .toLowerCase()
            .includes(termo)
      );
  }, [
    usuarios,
    busca,
    filtroPerfil,
  ]);

  const resumo = useMemo(
    () => ({
      total: usuarios.length,

      ativos: usuarios.filter(
        (item) => item.ativo
      ).length,

      consultoras: usuarios.filter(
        (item) =>
          item.perfil ===
          "Consultora"
      ).length,

      gestao: usuarios.filter(
        (item) =>
          [
            "Administradora",
            "Coordenadora",
            "Supervisora",
          ].includes(item.perfil)
      ).length,
    }),
    [usuarios]
  );

  async function selecionarFoto(
    evento: ChangeEvent<HTMLInputElement>
  ) {
    const arquivo =
      evento.target.files?.[0];

    if (!arquivo) return;

    setMensagem("");
    setProcessandoFoto(true);

    try {
      const fotoCompactada =
        await compactarFoto(
          arquivo
        );

      setForm(
        (dadosAtuais) => ({
          ...dadosAtuais,
          foto: fotoCompactada,
        })
      );
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar a foto."
      );
    } finally {
      setProcessandoFoto(false);
      evento.target.value = "";
    }
  }

  function removerFoto() {
    setForm(
      (dadosAtuais) => ({
        ...dadosAtuais,
        foto: "",
      })
    );

    setMensagem(
      "Foto removida do cadastro."
    );
  }

  async function enviarApi(
    metodo:
      | "POST"
      | "PATCH"
      | "DELETE",
    dados: Record<
      string,
      unknown
    >
  ) {
    const token =
      await obterToken();

    const resposta = await fetch(
      "/api/usuarios",
      {
        method: metodo,
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${token}`,
        },
        body: JSON.stringify(
          dados
        ),
      }
    );

    const conteudo =
      (await resposta.json()) as RespostaApi;

    if (!resposta.ok) {
      throw new Error(
        conteudo.erro ||
          "Não foi possível concluir a operação."
      );
    }

    return conteudo;
  }

  async function salvar(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();
    setMensagem("");

    if (!form.nome.trim()) {
      setMensagem(
        "Informe o nome da colaboradora."
      );
      return;
    }

    const email = form.email
      .trim()
      .toLowerCase();

    const emailValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      );

    if (!emailValido) {
      setMensagem(
        "Informe um endereço de e-mail válido."
      );
      return;
    }

    if (
      !editandoId &&
      form.senha.length < 6
    ) {
      setMensagem(
        "A senha precisa ter pelo menos 6 caracteres."
      );
      return;
    }

    if (
      editandoId &&
      form.senha &&
      form.senha.length < 6
    ) {
      setMensagem(
        "A nova senha precisa ter pelo menos 6 caracteres."
      );
      return;
    }

    setProcessando(true);

    try {
      const conteudo =
        await enviarApi(
          editandoId
            ? "PATCH"
            : "POST",
          {
            ...(editandoId
              ? { id: editandoId }
              : {}),
            nome:
              form.nome.trim(),
            email,
            senha: form.senha,
            perfil: form.perfil,
            equipe: form.equipe,
            time_id: form.timeId || null,
            ativo: form.ativo,
            foto_url: form.foto,
          }
        );

      setMensagem(
        conteudo.mensagem ||
          (editandoId
            ? "Usuário atualizado com sucesso."
            : "Usuário criado com sucesso.")
      );

      setForm(formularioVazio);
      setEditandoId(null);
      setFormularioAberto(false);

      await carregarUsuarios();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar o usuário."
      );
    } finally {
      setProcessando(false);
    }
  }
  function abrirNovoUsuario() {
  setEditandoId(null);
  setForm(formularioVazio);
  setMensagem("");
  setFormularioAberto(true);
}
function editar(usuario: Usuario) {
  setEditandoId(usuario.id);

  setForm({
    nome: usuario.nome,
    email: usuario.email,
    senha: "",
    perfil: usuario.perfil,
    equipe: usuario.equipe,
    timeId: usuario.timeId,
    ativo: usuario.ativo,
    foto: usuario.foto,
  });

  setMensagem(
    "Editando usuário selecionado. Deixe a senha vazia para mantê-la."
  );

  setFormularioAberto(true);
}

  function cancelarEdicao() {
  setEditandoId(null);
  setForm(formularioVazio);
  setMensagem("");
  setFormularioAberto(false);
}

  async function alternarStatus(
    usuario: Usuario
  ) {
    setMensagem("");
    setProcessando(true);

    try {
      const conteudo =
        await enviarApi(
          "PATCH",
          {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            senha: "",
            perfil: usuario.perfil,
            equipe: usuario.equipe,
            time_id: usuario.timeId || null,
            ativo: !usuario.ativo,
            foto_url: usuario.foto,
          }
        );

      setMensagem(
        conteudo.mensagem ||
          "Status atualizado com sucesso."
      );

      await carregarUsuarios();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível alterar o status."
      );
    } finally {
      setProcessando(false);
    }
  }

  async function excluir(
    usuario: Usuario
  ) {
    const confirmar =
      window.confirm(
        `Deseja excluir o usuário ${usuario.nome}?`
      );

    if (!confirmar) {
      return;
    }

    setMensagem("");
    setProcessando(true);

    try {
      const conteudo =
        await enviarApi(
          "DELETE",
          {
            id: usuario.id,
          }
        );

      setMensagem(
        conteudo.mensagem ||
          "Usuário excluído com sucesso."
      );

      if (
        editandoId ===
        usuario.id
      ) {
        cancelarEdicao();
      }

      await carregarUsuarios();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir o usuário."
      );
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="users-page">
      <section className="users-summary">
        <article>
          <span>
            Total de usuários
          </span>
          <strong>
            {resumo.total}
          </strong>
        </article>

        <article>
          <span>
            Usuários ativos
          </span>
          <strong>
            {resumo.ativos}
          </strong>
        </article>

        <article>
          <span>Consultoras</span>
          <strong>
            {resumo.consultoras}
          </strong>
        </article>

        <article className="users-highlight">
          <span>Gestão</span>
          <strong>
            {resumo.gestao}
          </strong>
        </article>
      </section>

      <section className="teams-management">
        <div className="teams-management-head">
          <div><span>GESTÃO COMERCIAL</span><h2>Times e supervisoras</h2>
            <p>Organize as consultoras por time sem alterar produtos e acessos.</p></div>
          <div className="teams-count"><strong>{times.length}</strong><span>times cadastrados</span></div>
        </div>

        <div className="teams-management-grid">
          <form className="teams-create-card" onSubmit={salvarTime}>
            <span>{timeEditandoId ? "EDITAR TIME" : "NOVO TIME"}</span>
            <h3>{timeEditandoId ? "Atualizar time" : "Criar time comercial"}</h3>
            <label>Nome do time
              <input value={nomeTime} onChange={(e) => setNomeTime(e.target.value)}
                placeholder="Ex.: Time Compra 01" disabled={processandoTime} />
            </label>
            <label>Supervisora
              <select value={supervisorTimeId} onChange={(e) => setSupervisorTimeId(e.target.value)} disabled={processandoTime}>
                <option value="">Sem supervisora definida</option>
                {supervisoras.filter((s) => s.ativo !== false).map((s) => (
                  <option key={s.id} value={s.id}>{s.nome || s.email || "Supervisora"}</option>
                ))}
              </select>
            </label>
            {mensagemTime && <div className="teams-message">{mensagemTime}</div>}
            <div className="teams-form-actions">
              {timeEditandoId && <button type="button" className="teams-cancel"
                onClick={() => { setTimeEditandoId(null); setNomeTime(""); setSupervisorTimeId(""); }}>Cancelar</button>}
              <button type="submit" className="teams-save" disabled={processandoTime}>
                {processandoTime ? "Salvando..." : timeEditandoId ? "Atualizar time" : "+ Criar time"}
              </button>
            </div>
          </form>

          <div className="teams-list-card">
            <div className="teams-list-title"><div><span>TIMES CADASTRADOS</span><h3>Estrutura comercial</h3></div><b>{times.length}</b></div>
            <div className="teams-list">
              {!times.length && <div className="teams-empty">Nenhum time cadastrado ainda.</div>}
              {times.map((time) => (
                <article key={time.id} className={time.ativo ? "" : "team-inactive"}>
                  <div className="team-icon">{time.nome.charAt(0).toUpperCase()}</div>
                  <div className="team-main">
                    <strong>{time.nome}</strong>
                    <span>Supervisora: {time.supervisora?.nome || "Não definida"}</span>
                    <div><b>{time.quantidade_consultoras || 0} consultoras</b><b>{time.quantidade_membros || 0} membros</b></div>
                  </div>
                  <div className="team-status"><span className={time.ativo ? "active" : "inactive"}>{time.ativo ? "Ativo" : "Inativo"}</span></div>
                  <div className="team-actions">
                    <button type="button" onClick={() => editarTime(time)}>Editar</button>
                    <button type="button" onClick={() => void alternarStatusTime(time)}>{time.ativo ? "Desativar" : "Ativar"}</button>
                    <button type="button" className="delete" onClick={() => void excluirTime(time)}>Excluir</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="users-layout">
        {formularioAberto && (
  <button
    type="button"
    className="users-drawer-backdrop"
    aria-label="Fechar formulário"
    onClick={cancelarEdicao}
  />
)}

<form
  className={`users-card users-form-panel ${
    formularioAberto ? "open" : ""
  }`}
  onSubmit={salvar}
>
          <div className="users-heading">
            <div>
              <span>
                {editandoId
                  ? "EDITAR ACESSO"
                  : "NOVO ACESSO"}
              </span>

              <h2>
                {editandoId
                  ? "Atualizar usuário"
                  : "Cadastrar usuário"}
              </h2>

              <p>
                Cada colaboradora terá
                login próprio e poderá
                acessar o sistema em
                qualquer computador.
              </p>
            </div>

            <button
  type="button"
  className="users-drawer-close"
  onClick={cancelarEdicao}
  aria-label="Fechar"
>
  ×
</button>
          </div>

          <div className="users-photo-area">
            <div className="users-photo-preview">
              {form.foto ? (
                <img
                  src={form.foto}
                  alt="Foto selecionada"
                />
              ) : (
                <span>
                  {form.nome.trim()
                    ? form.nome
                        .charAt(0)
                        .toUpperCase()
                    : "👤"}
                </span>
              )}
            </div>

            <div className="users-photo-information">
              <strong>
                Foto de perfil
              </strong>

              <p>
                Selecione uma foto da
                colaboradora. O sistema
                ajustará a imagem.
              </p>

              <div className="users-photo-actions">
                <label className="users-photo-button">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={
                      selecionarFoto
                    }
                    disabled={
                      processandoFoto ||
                      processando
                    }
                  />

                  <span>
                    {processandoFoto
                      ? "Processando..."
                      : form.foto
                        ? "Trocar foto"
                        : "Selecionar foto"}
                  </span>
                </label>

                {form.foto && (
                  <button
                    type="button"
                    className="users-photo-remove"
                    onClick={
                      removerFoto
                    }
                    disabled={
                      processando
                    }
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="users-form-grid">
            <label>
              Nome completo

              <input
                value={form.nome}
                onChange={(evento) =>
                  setForm({
                    ...form,
                    nome:
                      evento.target
                        .value,
                  })
                }
                placeholder="Nome da colaboradora"
                disabled={processando}
              />
            </label>

            <label>
              E-mail

              <input
                value={form.email}
                onChange={(evento) =>
                  setForm({
                    ...form,
                    email:
                      evento.target
                        .value,
                  })
                }
                placeholder="colaboradora@somosmaiseleva.com.br"
                type="email"
                disabled={processando}
              />
            </label>

            <label>
              {editandoId
                ? "Nova senha (opcional)"
                : "Senha"}

              <input
                value={form.senha}
                onChange={(evento) =>
                  setForm({
                    ...form,
                    senha:
                      evento.target
                        .value,
                  })
                }
                placeholder={
                  editandoId
                    ? "Deixe vazio para manter"
                    : "Mínimo de 6 caracteres"
                }
                type="password"
                disabled={processando}
              />
            </label>

            <label>
              Perfil

              <select
                value={form.perfil}
                onChange={(evento) =>
                  setForm({
                    ...form,
                    perfil:
                      evento.target
                        .value as Perfil,
                  })
                }
                disabled={processando}
              >
                {PERFIS.map(
                  (perfil) => (
                    <option
                      key={perfil}
                      value={perfil}
                    >
                      {perfil}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Equipe

              <select
                value={form.equipe}
                onChange={(evento) =>
                  setForm({
                    ...form,
                    equipe:
                      evento.target
                        .value,
                  })
                }
                disabled={processando}
              >
                <option value="">
                  Selecione a equipe
                </option>

                <option value="Compra de Dívida">
                  Compra de Dívida
                </option>

                <option value="CLT">
                  CLT
                </option>

                <option value="Compra de Dívida e CLT">
                  Compra de Dívida e CLT
                </option>

                <option value="Diretoria">
                  Diretoria
                </option>

                <option value="Administrativo">
                  Administrativo
                </option>
              </select>
            </label>

            <label>
              Time comercial
              <select value={form.timeId} onChange={(e) => setForm({ ...form, timeId: e.target.value })} disabled={processando}>
                <option value="">Sem time definido</option>
                {times.filter((time) => time.ativo).map((time) => (
                  <option key={time.id} value={time.id}>{time.nome}</option>
                ))}
              </select>
            </label>

            <label className="users-switch">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(evento) =>
                  setForm({
                    ...form,
                    ativo:
                      evento.target
                        .checked,
                  })
                }
                disabled={processando}
              />

              <span>
                Usuário ativo
              </span>
            </label>
          </div>

          {mensagem && (
            <div className="users-message">
              {mensagem}
            </div>
          )}

          <div className="users-actions">
            <button
  type="button"
  className="cancel"
  onClick={cancelarEdicao}
  disabled={processando}
>
  Cancelar
</button>

            <button
              type="submit"
              className="save"
              disabled={
                processando ||
                processandoFoto
              }
            >
              {processando
                ? "Salvando..."
                : editandoId
                  ? "Atualizar usuário"
                  : "Criar usuário"}
            </button>
          </div>
        </form>

        <section className="users-card">
          <div className="users-list-heading">
            <div>
              <span>
                EQUIPE CADASTRADA
              </span>

              <h2>
                Usuários e permissões
              </h2>
            </div>

            <div className="users-heading-actions">
  <b>{filtrados.length}</b>

  <button
    type="button"
    className="users-new-button"
    onClick={abrirNovoUsuario}
  >
    + Novo usuário
  </button>
</div>
          </div>

          <div className="users-filters">
            <input
              value={busca}
              onChange={(evento) =>
                setBusca(
                  evento.target.value
                )
              }
              placeholder="Pesquisar nome, e-mail ou equipe"
            />

            <select
              value={filtroPerfil}
              onChange={(evento) =>
                setFiltroPerfil(
                  evento.target.value
                )
              }
            >
              <option>
                Todos
              </option>

              {PERFIS.map(
                (perfil) => (
                  <option
                    key={perfil}
                    value={perfil}
                  >
                    {perfil}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="users-list">
            {carregando && (
              <p>
                Carregando usuários...
              </p>
            )}

            {!carregando &&
              !filtrados.length && (
                <p>
                  Nenhum usuário
                  encontrado.
                </p>
              )}

            {filtrados.map(
              (usuario) => (
                <article
                  key={usuario.id}
                >
                  <div className="user-avatar">
                    {usuario.foto ? (
                      <img
                        src={
                          usuario.foto
                        }
                        alt={`Foto de ${usuario.nome}`}
                      />
                    ) : (
                      usuario.nome
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>

                  <div className="user-main">
                    <strong>
                      {usuario.nome}
                    </strong>

                    <span>
                      {usuario.email}
                    </span>

                    <div>
                      <b>
                        {usuario.perfil}
                      </b>

                      {usuario.equipe && (
                        <b>
                          {
                            usuario.equipe
                          }
                        </b>
                      )}
                      {usuario.timeId && (
                        <b className="user-time-badge">
                          {times.find((time) => time.id === usuario.timeId)?.nome || "Time"}
                        </b>
                      )}
                    </div>
                  </div>

                  <div className="user-status">
                    <span
                      className={
                        usuario.ativo
                          ? "active"
                          : "inactive"
                      }
                    >
                      {usuario.ativo
                        ? "Ativo"
                        : "Inativo"}
                    </span>
                  </div>

                  <div className="user-actions">
                    <button
                      type="button"
                      onClick={() =>
                        editar(usuario)
                      }
                      disabled={
                        processando
                      }
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void alternarStatus(
                          usuario
                        )
                      }
                      disabled={
                        processando
                      }
                    >
                      {usuario.ativo
                        ? "Desativar"
                        : "Ativar"}
                    </button>

                    <button
                      type="button"
                      className="delete"
                      onClick={() =>
                        void excluir(
                          usuario
                        )
                      }
                      disabled={
                        processando
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      </section>

      <section className="users-warning">
        <strong>
          Dados centralizados:
        </strong>

        <span>
          os usuários e acessos agora são
          armazenados no Supabase e podem
          ser utilizados em diferentes
          navegadores e computadores.
        </span>
      </section>
    </div>
  );
}