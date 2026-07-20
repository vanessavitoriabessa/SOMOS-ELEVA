"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
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

function criarAdminPadrao(): Usuario {
  return {
    id: "admin-padrao",
    nome: "Tay",
    email: "admin@somosmaiseleva.com.br",
    matricula: "",
    senha: "Eleva@2026",
    perfil: "Administradora",
    equipe: "Diretoria",
    ativo: true,
    criadoEm: new Date().toLocaleString("pt-BR"),
    foto: "",
  };
}

function compactarFoto(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!arquivo.type.startsWith("image/")) {
      reject(new Error("Selecione um arquivo de imagem."));
      return;
    }

    if (arquivo.size > 8 * 1024 * 1024) {
      reject(new Error("A imagem deve ter no máximo 8 MB."));
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      const imagem = new Image();

      imagem.onload = () => {
        const tamanho = 320;
        const canvas = document.createElement("canvas");

        canvas.width = tamanho;
        canvas.height = tamanho;

        const contexto = canvas.getContext("2d");

        if (!contexto) {
          reject(new Error("Não foi possível processar a imagem."));
          return;
        }

        const escala = Math.max(
          tamanho / imagem.width,
          tamanho / imagem.height
        );

        const largura = imagem.width * escala;
        const altura = imagem.height * escala;

        const posicaoX = (tamanho - largura) / 2;
        const posicaoY = (tamanho - altura) / 2;

        contexto.drawImage(
          imagem,
          posicaoX,
          posicaoY,
          largura,
          altura
        );

        const fotoCompactada = canvas.toDataURL(
          "image/jpeg",
          0.82
        );

        resolve(fotoCompactada);
      };

      imagem.onerror = () => {
        reject(new Error("Não foi possível abrir a imagem."));
      };

      imagem.src = String(leitor.result);
    };

    leitor.onerror = () => {
      reject(new Error("Não foi possível ler a imagem."));
    };

    leitor.readAsDataURL(arquivo);
  });
}

export default function UserManager() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] =
    useState<FormularioUsuario>(formularioVazio);

  const [editandoId, setEditandoId] =
    useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("Todos");
  const [mensagem, setMensagem] = useState("");
  const [processandoFoto, setProcessandoFoto] = useState(false);

  useEffect(() => {
    const salvo = localStorage.getItem("somos-eleva-usuarios");

    if (!salvo) {
      const inicial = [criarAdminPadrao()];

      setUsuarios(inicial);

      localStorage.setItem(
        "somos-eleva-usuarios",
        JSON.stringify(inicial)
      );

      return;
    }

    try {
      const lista = JSON.parse(salvo);

      if (!Array.isArray(lista) || !lista.length) {
        const inicial = [criarAdminPadrao()];

        setUsuarios(inicial);

        localStorage.setItem(
          "somos-eleva-usuarios",
          JSON.stringify(inicial)
        );

        return;
      }

      const listaAtualizada: Usuario[] = lista.map(
        (usuario: Usuario) => ({
          ...usuario,
          foto: usuario.foto || "",
        })
      );

      setUsuarios(listaAtualizada);

      localStorage.setItem(
        "somos-eleva-usuarios",
        JSON.stringify(listaAtualizada)
      );
    } catch {
      const inicial = [criarAdminPadrao()];

      setUsuarios(inicial);

      localStorage.setItem(
        "somos-eleva-usuarios",
        JSON.stringify(inicial)
      );
    }
  }, []);

  function persistir(lista: Usuario[]) {
    setUsuarios(lista);

    try {
      localStorage.setItem(
        "somos-eleva-usuarios",
        JSON.stringify(lista)
      );
    } catch {
      setMensagem(
        "Não foi possível salvar. Tente utilizar uma foto menor."
      );
    }
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return usuarios
      .filter(
        (usuario) =>
          filtroPerfil === "Todos" ||
          usuario.perfil === filtroPerfil
      )
      .filter(
        (usuario) =>
          !termo ||
          usuario.nome.toLowerCase().includes(termo) ||
          usuario.email.toLowerCase().includes(termo) ||
          usuario.equipe.toLowerCase().includes(termo)
      );
  }, [usuarios, busca, filtroPerfil]);

  const resumo = useMemo(
    () => ({
      total: usuarios.length,

      ativos: usuarios.filter((item) => item.ativo).length,

      consultoras: usuarios.filter(
        (item) => item.perfil === "Consultora"
      ).length,

      gestao: usuarios.filter((item) =>
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
    const arquivo = evento.target.files?.[0];

    if (!arquivo) return;

    setMensagem("");
    setProcessandoFoto(true);

    try {
      const fotoCompactada = await compactarFoto(arquivo);

      setForm((dadosAtuais) => ({
        ...dadosAtuais,
        foto: fotoCompactada,
      }));
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
    setForm((dadosAtuais) => ({
      ...dadosAtuais,
      foto: "",
    }));

    setMensagem("Foto removida do cadastro.");
  }

  function salvar(evento: FormEvent<HTMLFormElement>) {
  evento.preventDefault();
  setMensagem("");

  if (!form.nome.trim()) {
    setMensagem("Informe o nome da colaboradora.");
    return;
  }

  if (!form.email.trim()) {
    setMensagem("Informe o e-mail da colaboradora.");
    return;
  }

  const email = form.email.trim().toLowerCase();

  const emailValido =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailValido) {
    setMensagem("Informe um endereço de e-mail válido.");
    return;
  }

  if (form.senha.length < 6) {
    setMensagem(
      "A senha precisa ter pelo menos 6 caracteres."
    );
    return;
  }

  const duplicado = usuarios.some(
    (item) =>
      item.id !== editandoId &&
      item.email.toLowerCase() === email
  );

  if (duplicado) {
    setMensagem(
      "Já existe um usuário com esse e-mail."
    );
    return;
  }

  const antigo = usuarios.find(
    (item) => item.id === editandoId
  );

  const estavaEditando = Boolean(editandoId);

  const usuario: Usuario = {
    id: editandoId || crypto.randomUUID(),
    nome: form.nome.trim(),
    email,
    matricula: "",
    senha: form.senha,
    perfil: form.perfil,
    equipe: form.equipe.trim(),
    ativo: form.ativo,
    foto: form.foto,
    criadoEm:
      antigo?.criadoEm ||
      new Date().toLocaleString("pt-BR"),
  };

  const atualizados = editandoId
    ? usuarios.map((item) =>
        item.id === editandoId
          ? usuario
          : item
      )
    : [usuario, ...usuarios];

  persistir(atualizados);

  setForm(formularioVazio);
  setEditandoId(null);

  setMensagem(
    estavaEditando
      ? "Usuário atualizado com sucesso."
      : "Usuário criado com sucesso."
  );
}

function editar(usuario: Usuario) {
  setEditandoId(usuario.id);

  setForm({
    nome: usuario.nome,
    email: usuario.email,
    senha: usuario.senha,
    perfil: usuario.perfil,
    equipe: usuario.equipe,
    ativo: usuario.ativo,
    foto: usuario.foto || "",
  });

  setMensagem("Editando usuário selecionado.");

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

function alternarStatus(id: string) {
  persistir(
    usuarios.map((item) =>
      item.id === id
        ? {
            ...item,
            ativo: !item.ativo,
          }
        : item
    )
  );
}

function excluir(id: string) {
  const usuario = usuarios.find(
    (item) => item.id === id
  );

  const quantidadeAdministradoras =
    usuarios.filter(
      (item) =>
        item.perfil === "Administradora"
    ).length;

  if (
    usuario?.perfil === "Administradora" &&
    quantidadeAdministradoras === 1
  ) {
    setMensagem(
      "Não é possível excluir a única administradora."
    );
    return;
  }

  const confirmar = window.confirm(
    "Deseja excluir este usuário?"
  );

  if (!confirmar) {
    return;
  }

  persistir(
    usuarios.filter(
      (item) => item.id !== id
    )
  );
}

  return (
    <div className="users-page">
      <section className="users-summary">
        <article>
          <span>Total de usuários</span>
          <strong>{resumo.total}</strong>
        </article>

        <article>
          <span>Usuários ativos</span>
          <strong>{resumo.ativos}</strong>
        </article>

        <article>
          <span>Consultoras</span>
          <strong>{resumo.consultoras}</strong>
        </article>

        <article className="users-highlight">
          <span>Gestão</span>
          <strong>{resumo.gestao}</strong>
        </article>
      </section>

      <section className="users-layout">
        <form className="users-card" onSubmit={salvar}>
          <div className="users-heading">
            <div>
              <span>
                {editandoId ? "EDITAR ACESSO" : "NOVO ACESSO"}
              </span>

              <h2>
                {editandoId
                  ? "Atualizar usuário"
                  : "Cadastrar usuário"}
              </h2>

              <p>
                Cada colaboradora terá login próprio, nome e
                foto exibidos no sistema.
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
                    ? form.nome.charAt(0).toUpperCase()
                    : "👤"}
                </span>
              )}
            </div>

            <div className="users-photo-information">
              <strong>Foto de perfil</strong>

              <p>
                Selecione uma foto da colaboradora. O sistema
                ajustará a imagem automaticamente.
              </p>

              <div className="users-photo-actions">
                <label className="users-photo-button">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={selecionarFoto}
                    disabled={processandoFoto}
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
                    onClick={removerFoto}
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
                    nome: evento.target.value,
                  })
                }
                placeholder="Nome da colaboradora"
              />
            </label>

            <label>
              E-mail

              <input
                value={form.email}
                onChange={(evento) =>
                  setForm({
                    ...form,
                    email: evento.target.value,
                  })
                }
                placeholder="colaboradora@somosmaiseleva.com.br"
                type="email"
              />
            </label>

            <label>
              Senha

              <input
                value={form.senha}
                onChange={(evento) =>
                  setForm({
                    ...form,
                    senha: evento.target.value,
                  })
                }
                placeholder="Mínimo de 6 caracteres"
                type="text"
              />
            </label>

            <label>
              Perfil

              <select
                value={form.perfil}
                onChange={(evento) =>
                  setForm({
                    ...form,
                    perfil: evento.target.value as Perfil,
                  })
                }
              >
                {PERFIS.map((perfil) => (
                  <option key={perfil}>{perfil}</option>
                ))}
              </select>
            </label>

            <label>
  Equipe

  <select
    value={form.equipe}
    onChange={(evento) =>
      setForm({
        ...form,
        equipe: evento.target.value,
      })
    }
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
  </select>
</label>

            <label className="users-switch">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(evento) =>
                  setForm({
                    ...form,
                    ativo: evento.target.checked,
                  })
                }
              />

              <span>Usuário ativo</span>
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
                onClick={cancelarEdicao}
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              className="save"
              disabled={processandoFoto}
            >
              {editandoId
                ? "Atualizar usuário"
                : "Criar usuário"}
            </button>
          </div>
        </form>

        <section className="users-card">
          <div className="users-list-heading">
            <div>
              <span>EQUIPE CADASTRADA</span>
              <h2>Usuários e permissões</h2>
            </div>

            <b>{filtrados.length}</b>
          </div>

          <div className="users-filters">
            <input
              value={busca}
              onChange={(evento) =>
                setBusca(evento.target.value)
              }
              placeholder="Pesquisar nome, e-mail ou equipe"
            />

            <select
              value={filtroPerfil}
              onChange={(evento) =>
                setFiltroPerfil(evento.target.value)
              }
            >
              <option>Todos</option>

              {PERFIS.map((perfil) => (
                <option key={perfil}>{perfil}</option>
              ))}
            </select>
          </div>

          <div className="users-list">
            {filtrados.map((usuario) => (
              <article key={usuario.id}>
                <div className="user-avatar">
                  {usuario.foto ? (
                    <img
                      src={usuario.foto}
                      alt={`Foto de ${usuario.nome}`}
                    />
                  ) : (
                    usuario.nome.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="user-main">
                  <strong>{usuario.nome}</strong>

                  <span>{usuario.email}</span>

                  <div>
                    <b>{usuario.perfil}</b>

                    {usuario.equipe && (
                      <b>{usuario.equipe}</b>
                    )}
                  </div>
                </div>

                <div className="user-status">
                  <span
                    className={
                      usuario.ativo ? "active" : "inactive"
                    }
                  >
                    {usuario.ativo ? "Ativo" : "Inativo"}
                  </span>

                </div>

                <div className="user-actions">
                  <button
                    type="button"
                    onClick={() => editar(usuario)}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      alternarStatus(usuario.id)
                    }
                  >
                    {usuario.ativo
                      ? "Desativar"
                      : "Ativar"}
                  </button>

                  <button
                    type="button"
                    className="delete"
                    onClick={() => excluir(usuario.id)}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="users-warning">
        <strong>Importante:</strong>

        <span>
          esta primeira versão salva os acessos e as fotos no
          navegador. Depois faremos a migração para o Supabase
          para segurança real e uso em vários computadores.
        </span>
      </section>
    </div>
  );
}