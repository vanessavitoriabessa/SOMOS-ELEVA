"use client";

import AppShell from "@/components/AppShell";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import "./perfil.css";

type DadosPerfil = {
  nome: string;
  cargo: string;
  matricula: string;
  equipe: string;
  status: string;
  foto: string;
};

type UsuarioCadastrado = {
  id: string;
  nome: string;
  email: string;
  matricula: string;
  senha: string;
  perfil: string;
  equipe: string;
  ativo: boolean;
  criadoEm: string;
  foto?: string;
};

const historicoMensal = [
  {
    mes: "Maio/2026",
    producao: "R$ 0,00",
    propostas: 0,
    pagas: 0,
    comissao: "R$ 0,00",
  },
  {
    mes: "Junho/2026",
    producao: "R$ 0,00",
    propostas: 0,
    pagas: 0,
    comissao: "R$ 0,00",
  },
  {
    mes: "Julho/2026",
    producao: "R$ 0,00",
    propostas: 0,
    pagas: 0,
    comissao: "R$ 0,00",
  },
];

const perfilInicial: DadosPerfil = {
  nome: "Tay",
  cargo: "Administradora",
  matricula: "0001",
  equipe: "Administração",
  status: "Ativa",
  foto: "",
};

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
          reject(
            new Error("Não foi possível processar a imagem.")
          );
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

        resolve(
          canvas.toDataURL("image/jpeg", 0.82)
        );
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

export default function PerfilPage() {
  const [perfil, setPerfil] =
    useState<DadosPerfil>(perfilInicial);

  const [formulario, setFormulario] =
    useState<DadosPerfil>(perfilInicial);

  const [editando, setEditando] = useState(false);
  const [processandoFoto, setProcessandoFoto] =
    useState(false);

  const [mensagemFoto, setMensagemFoto] =
    useState("");

  useEffect(() => {
    const usuarioLogado =
      localStorage.getItem("somos-eleva-usuario") || "0001";

    const matriculaSalva =
      localStorage.getItem("somos-eleva-matricula") ||
      perfilInicial.matricula;

    let usuarioEncontrado: UsuarioCadastrado | undefined;

    try {
      const usuariosSalvos = localStorage.getItem(
        "somos-eleva-usuarios"
      );

      const usuarios: UsuarioCadastrado[] = usuariosSalvos
        ? JSON.parse(usuariosSalvos)
        : [];

      usuarioEncontrado = usuarios.find((usuario) => {
        const login = usuarioLogado.toLowerCase();

        return (
          usuario.matricula === usuarioLogado ||
          usuario.matricula === matriculaSalva ||
          usuario.email?.toLowerCase() === login
        );
      });
    } catch {
      usuarioEncontrado = undefined;
    }

    const dadosSalvos: DadosPerfil = {
      nome:
        localStorage.getItem("somos-eleva-nome") ||
        usuarioEncontrado?.nome ||
        perfilInicial.nome,

      cargo:
        localStorage.getItem("somos-eleva-cargo") ||
        usuarioEncontrado?.perfil ||
        perfilInicial.cargo,

      matricula:
        matriculaSalva ||
        usuarioEncontrado?.matricula ||
        perfilInicial.matricula,

      equipe:
        localStorage.getItem("somos-eleva-equipe") ||
        usuarioEncontrado?.equipe ||
        perfilInicial.equipe,

      status:
        localStorage.getItem("somos-eleva-status") ||
        (usuarioEncontrado?.ativo === false
          ? "Inativa"
          : perfilInicial.status),

      foto:
        localStorage.getItem("somos-eleva-foto") ||
        usuarioEncontrado?.foto ||
        "",
    };

    setPerfil(dadosSalvos);
    setFormulario(dadosSalvos);
  }, []);

  function abrirEdicao() {
    setFormulario(perfil);
    setMensagemFoto("");
    setEditando(true);
  }

  function fecharEdicao() {
    setFormulario(perfil);
    setMensagemFoto("");
    setEditando(false);
  }

  function alterarCampo(
    campo: keyof DadosPerfil,
    valor: string
  ) {
    setFormulario((dadosAtuais) => ({
      ...dadosAtuais,
      [campo]: valor,
    }));
  }

  async function selecionarFoto(
    evento: ChangeEvent<HTMLInputElement>
  ) {
    const arquivo = evento.target.files?.[0];

    if (!arquivo) return;

    setMensagemFoto("");
    setProcessandoFoto(true);

    try {
      const fotoCompactada = await compactarFoto(arquivo);

      setFormulario((dadosAtuais) => ({
        ...dadosAtuais,
        foto: fotoCompactada,
      }));

      setMensagemFoto("Foto selecionada com sucesso.");
    } catch (erro) {
      setMensagemFoto(
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
    setFormulario((dadosAtuais) => ({
      ...dadosAtuais,
      foto: "",
    }));

    setMensagemFoto("A foto será removida ao salvar.");
  }

  function atualizarUsuarioCadastrado(
    dadosAtualizados: DadosPerfil
  ) {
    try {
      const usuariosSalvos = localStorage.getItem(
        "somos-eleva-usuarios"
      );

      if (!usuariosSalvos) return;

      const usuarios: UsuarioCadastrado[] =
        JSON.parse(usuariosSalvos);

      const usuarioLogado =
        localStorage.getItem("somos-eleva-usuario") || "0001";

      const listaAtualizada = usuarios.map((usuario) => {
        const pertenceAoPerfil =
          usuario.matricula === perfil.matricula ||
          usuario.matricula === dadosAtualizados.matricula ||
          usuario.matricula === usuarioLogado ||
          usuario.email?.toLowerCase() ===
            usuarioLogado.toLowerCase();

        if (!pertenceAoPerfil) {
          return usuario;
        }

        return {
          ...usuario,
          nome: dadosAtualizados.nome,
          matricula: dadosAtualizados.matricula,
          equipe: dadosAtualizados.equipe,
          foto: dadosAtualizados.foto,
          ativo: dadosAtualizados.status !== "Inativa",
        };
      });

      localStorage.setItem(
        "somos-eleva-usuarios",
        JSON.stringify(listaAtualizada)
      );
    } catch {
      console.error(
        "Não foi possível atualizar a foto no cadastro."
      );
    }
  }

  function salvarPerfil(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    const dadosAtualizados: DadosPerfil = {
      nome:
        formulario.nome.trim() || perfilInicial.nome,

      cargo:
        formulario.cargo.trim() || perfilInicial.cargo,

      matricula:
        formulario.matricula.trim() ||
        perfilInicial.matricula,

      equipe:
        formulario.equipe.trim() ||
        perfilInicial.equipe,

      status:
        formulario.status.trim() ||
        perfilInicial.status,

      foto: formulario.foto,
    };

    localStorage.setItem(
      "somos-eleva-nome",
      dadosAtualizados.nome
    );

    localStorage.setItem(
      "somos-eleva-cargo",
      dadosAtualizados.cargo
    );

    localStorage.setItem(
      "somos-eleva-matricula",
      dadosAtualizados.matricula
    );

    localStorage.setItem(
      "somos-eleva-equipe",
      dadosAtualizados.equipe
    );

    localStorage.setItem(
      "somos-eleva-status",
      dadosAtualizados.status
    );

    if (dadosAtualizados.foto) {
      localStorage.setItem(
        "somos-eleva-foto",
        dadosAtualizados.foto
      );
    } else {
      localStorage.removeItem("somos-eleva-foto");
    }

    atualizarUsuarioCadastrado(dadosAtualizados);

    setPerfil(dadosAtualizados);
    setEditando(false);

    window.location.reload();
  }

  return (
    <AppShell
      title="Meu Perfil"
      subtitle="Acompanhe seus resultados, pontos e evolução"
    >
      <main className="perfil-page">
        <section className="perfil-cabecalho">
          <div className="perfil-identificacao">
            <div className="perfil-avatar-box">
              <img
                src={perfil.foto || "/avatar.png"}
                className="perfil-avatar"
                alt={`Foto de ${perfil.nome}`}
              />
            </div>

            <div className="perfil-dados">
              <span className="perfil-etiqueta">
                MEU PERFIL
              </span>

              <h1>{perfil.nome}</h1>
              <p>{perfil.cargo}</p>

              <div className="perfil-informacoes">
                <span>
                  Matrícula: {perfil.matricula}
                </span>

                <span>
                  Equipe: {perfil.equipe}
                </span>

                <span>
                  Status: {perfil.status}
                </span>
              </div>
            </div>
          </div>

          <button
            className="perfil-botao-editar"
            type="button"
            onClick={abrirEdicao}
          >
            ✏️ Editar perfil
          </button>
        </section>

        <section className="perfil-indicadores">
          <article className="perfil-indicador">
            <div className="perfil-indicador-icone">
              💰
            </div>

            <div>
              <span>Produção no mês</span>
              <strong>R$ 0,00</strong>
            </div>
          </article>

          <article className="perfil-indicador">
            <div className="perfil-indicador-icone">
              📄
            </div>

            <div>
              <span>Propostas</span>
              <strong>0</strong>
            </div>
          </article>

          <article className="perfil-indicador">
            <div className="perfil-indicador-icone">
              ✅
            </div>

            <div>
              <span>Propostas pagas</span>
              <strong>0</strong>
            </div>
          </article>

          <article className="perfil-indicador">
            <div className="perfil-indicador-icone">
              🏆
            </div>

            <div>
              <span>Posição no ranking</span>
              <strong>—</strong>
            </div>
          </article>

          <article className="perfil-indicador">
            <div className="perfil-indicador-icone">
              ⭐
            </div>

            <div>
              <span>Pontos acumulados</span>
              <strong>0 pontos</strong>
            </div>
          </article>

          <article className="perfil-indicador">
            <div className="perfil-indicador-icone">
              💳
            </div>

            <div>
              <span>Comissão estimada</span>
              <strong>R$ 0,00</strong>
            </div>
          </article>
        </section>

        <section className="perfil-conteudo">
          <div className="perfil-coluna-principal">
            <article className="perfil-painel">
              <div className="perfil-painel-titulo">
                <div>
                  <span>DESEMPENHO</span>
                  <h2>Evolução da meta mensal</h2>
                </div>

                <strong>0%</strong>
              </div>

              <div className="perfil-meta-valores">
                <div>
                  <span>Produção atual</span>
                  <strong>R$ 0,00</strong>
                </div>

                <div>
                  <span>Meta individual</span>
                  <strong>R$ 100.000,00</strong>
                </div>
              </div>

              <div className="perfil-barra-meta">
                <div className="perfil-barra-preenchimento" />
              </div>

              <div className="perfil-meta-rodape">
                <span>Início da competência</span>
                <span>Faltam R$ 100.000,00</span>
              </div>
            </article>

            <article className="perfil-painel">
              <div className="perfil-painel-titulo">
                <div>
                  <span>PROPOSTAS</span>
                  <h2>Últimas propostas</h2>
                </div>

                <button
                  className="perfil-link"
                  type="button"
                >
                  Ver todas
                </button>
              </div>

              <div className="perfil-vazio">
                <div className="perfil-vazio-icone">
                  📄
                </div>

                <strong>
                  Nenhuma proposta encontrada
                </strong>

                <p>
                  As propostas cadastradas aparecerão aqui.
                </p>
              </div>
            </article>

            <article className="perfil-painel">
              <div className="perfil-painel-titulo">
                <div>
                  <span>HISTÓRICO</span>
                  <h2>Resumo mensal</h2>
                </div>
              </div>

              <div className="perfil-tabela-container">
                <table className="perfil-tabela">
                  <thead>
                    <tr>
                      <th>Competência</th>
                      <th>Produção</th>
                      <th>Propostas</th>
                      <th>Pagas</th>
                      <th>Comissão</th>
                    </tr>
                  </thead>

                  <tbody>
                    {historicoMensal.map((item) => (
                      <tr key={item.mes}>
                        <td>{item.mes}</td>
                        <td>{item.producao}</td>
                        <td>{item.propostas}</td>
                        <td>{item.pagas}</td>
                        <td>{item.comissao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <aside className="perfil-coluna-lateral">
            <article className="perfil-painel">
              <div className="perfil-painel-titulo">
                <div>
                  <span>RANKING</span>
                  <h2>Minha posição</h2>
                </div>
              </div>

              <div className="perfil-ranking">
                <div className="perfil-ranking-posicao">
                  —
                </div>

                <div>
                  <strong>Ainda sem posição</strong>

                  <p>
                    A posição aparecerá após o início da
                    produção.
                  </p>
                </div>
              </div>
            </article>

            <article className="perfil-painel">
              <div className="perfil-painel-titulo">
                <div>
                  <span>PONTOS</span>
                  <h2>Resumo de pontos</h2>
                </div>
              </div>

              <div className="perfil-lista-resumo">
                <div>
                  <span>Propostas pagas</span>
                  <strong>0 pontos</strong>
                </div>

                <div>
                  <span>Campanhas</span>
                  <strong>0 pontos</strong>
                </div>

                <div>
                  <span>Premiações</span>
                  <strong>0 pontos</strong>
                </div>

                <div className="perfil-total-pontos">
                  <span>Total acumulado</span>
                  <strong>0 pontos</strong>
                </div>
              </div>
            </article>

            <article className="perfil-painel">
              <div className="perfil-painel-titulo">
                <div>
                  <span>CAMPANHAS</span>
                  <h2>Campanhas ativas</h2>
                </div>
              </div>

              <div className="perfil-campanha-vazia">
                <span>🎯</span>
                <strong>Nenhuma campanha ativa</strong>

                <p>
                  As campanhas e premiações aparecerão aqui.
                </p>
              </div>
            </article>

            <article className="perfil-painel perfil-painel-comissao">
              <span>COMISSÃO ESTIMADA</span>
              <strong>R$ 0,00</strong>

              <p>
                Valor previsto para a competência atual.
              </p>

              <button type="button">
                Ver detalhes financeiros
              </button>
            </article>
          </aside>
        </section>

        {editando && (
          <div className="perfil-modal-fundo">
            <form
              className="perfil-modal"
              onSubmit={salvarPerfil}
            >
              <div className="perfil-modal-cabecalho">
                <div>
                  <span>MEU PERFIL</span>
                  <h2>Editar informações</h2>

                  <p>
                    Atualize os dados e a foto exibidos no
                    sistema.
                  </p>
                </div>

                <button
                  type="button"
                  className="perfil-modal-fechar"
                  onClick={fecharEdicao}
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>

              <div className="perfil-edicao-foto-area">
                <div className="perfil-edicao-foto-preview">
                  <img
                    src={
                      formulario.foto || "/avatar.png"
                    }
                    alt="Foto do perfil"
                  />
                </div>

                <div className="perfil-edicao-foto-info">
                  <strong>Foto de perfil</strong>

                  <p>
                    Escolha uma foto do seu computador. A
                    imagem será ajustada automaticamente.
                  </p>

                  <div className="perfil-edicao-foto-acoes">
                    <label className="perfil-edicao-foto-botao">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={selecionarFoto}
                        disabled={processandoFoto}
                      />

                      <span>
                        {processandoFoto
                          ? "Processando..."
                          : formulario.foto
                            ? "Trocar foto"
                            : "Selecionar foto"}
                      </span>
                    </label>

                    {formulario.foto && (
                      <button
                        type="button"
                        className="perfil-edicao-foto-remover"
                        onClick={removerFoto}
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  {mensagemFoto && (
                    <small>{mensagemFoto}</small>
                  )}
                </div>
              </div>

              <div className="perfil-formulario">
                <label className="perfil-campo">
                  <span>Nome</span>

                  <input
                    type="text"
                    value={formulario.nome}
                    onChange={(evento) =>
                      alterarCampo(
                        "nome",
                        evento.target.value
                      )
                    }
                    required
                  />
                </label>

                <label className="perfil-campo">
                  <span>Cargo</span>

                  <input
                    type="text"
                    value={formulario.cargo}
                    onChange={(evento) =>
                      alterarCampo(
                        "cargo",
                        evento.target.value
                      )
                    }
                    required
                  />
                </label>

                <label className="perfil-campo">
                  <span>Matrícula</span>

                  <input
                    type="text"
                    value={formulario.matricula}
                    onChange={(evento) =>
                      alterarCampo(
                        "matricula",
                        evento.target.value
                      )
                    }
                    required
                  />
                </label>

                <label className="perfil-campo">
                  <span>Equipe</span>

                  <input
                    type="text"
                    value={formulario.equipe}
                    onChange={(evento) =>
                      alterarCampo(
                        "equipe",
                        evento.target.value
                      )
                    }
                    required
                  />
                </label>

                <label className="perfil-campo perfil-campo-completo">
                  <span>Status</span>

                  <select
                    value={formulario.status}
                    onChange={(evento) =>
                      alterarCampo(
                        "status",
                        evento.target.value
                      )
                    }
                  >
                    <option value="Ativa">Ativa</option>
                    <option value="Férias">Férias</option>
                    <option value="Afastada">
                      Afastada
                    </option>
                    <option value="Inativa">Inativa</option>
                  </select>
                </label>
              </div>

              <div className="perfil-modal-acoes">
                <button
                  type="button"
                  className="perfil-cancelar"
                  onClick={fecharEdicao}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="perfil-salvar"
                  disabled={processandoFoto}
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </AppShell>
  );
}