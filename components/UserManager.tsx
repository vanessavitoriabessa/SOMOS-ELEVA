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
  ativo: boolean;
  foto: string;
};

type UsuarioRecebido = {
  id: string;
  nome?: string;
  email?: string;
  perfil?: Perfil;
  equipe?: string;
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

  function editar(
    usuario: Usuario
  ) {
    setEditandoId(usuario.id);

    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      perfil: usuario.perfil,
      equipe: usuario.equipe,
      ativo: usuario.ativo,
      foto: usuario.foto,
    });

    setMensagem(
      "Editando usuário selecionado. Deixe a senha vazia para mantê-la."
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(formularioVazio);
    setMensagem("");
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

      <section className="users-layout">
        <form
          className="users-card"
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

            <b>+</b>
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
            {editandoId && (
              <button
                type="button"
                className="cancel"
                onClick={
                  cancelarEdicao
                }
                disabled={processando}
              >
                Cancelar
              </button>
            )}

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

            <b>{filtrados.length}</b>
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