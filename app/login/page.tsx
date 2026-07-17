"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import "./login.css";

const USUARIO_PADRAO = "admin@somosmaiseleva.com.br";
const MATRICULA_PADRAO = "0001";
const SENHA_PADRAO = "Eleva@2026";

type UsuarioSalvo = {
  id?: string;
  nome?: string;
  email?: string;
  matricula?: string;
  senha?: string;
  perfil?: string;
  cargo?: string;
  equipe?: string;
  foto?: string;
  ativo?: boolean | string;
  status?: string;
};

function normalizar(valor: string) {
  return String(valor || "")
    .trim()
    .toLowerCase();
}

function usuarioEstaAtivo(usuario: UsuarioSalvo) {
  if (typeof usuario.ativo === "boolean") {
    return usuario.ativo;
  }

  const ativoTexto = normalizar(String(usuario.ativo || ""));
  const statusTexto = normalizar(usuario.status || "");

  if (ativoTexto) {
    return !["false", "nao", "não", "inativo", "desativado"].includes(
      ativoTexto
    );
  }

  if (statusTexto) {
    return !["inativo", "desativado", "bloqueado"].includes(statusTexto);
  }

  return true;
}

export default function LoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");

  function salvarSessao(dados: {
    login: string;
    nome: string;
    matricula: string;
    perfil: string;
    equipe?: string;
    foto?: string;
  }) {
    localStorage.setItem("somos-eleva-logado", "sim");
    localStorage.setItem("somos-eleva-usuario", dados.login);
    localStorage.setItem("somos-eleva-nome", dados.nome);
    localStorage.setItem("somos-eleva-matricula", dados.matricula);
    localStorage.setItem("somos-eleva-cargo", dados.perfil);
    localStorage.setItem("somos-eleva-equipe", dados.equipe || "");
    localStorage.setItem("somos-eleva-status", "Ativo");
    localStorage.setItem("somos-eleva-foto", dados.foto || "");
  }

  function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    const loginDigitado = usuario.trim();
    const loginNormalizado = normalizar(loginDigitado);

    if (!loginDigitado || !senha) {
      setErro("Informe o e-mail ou matrícula e a senha.");
      return;
    }

    const ehAdministradorPadrao =
      (loginNormalizado === normalizar(USUARIO_PADRAO) ||
        loginDigitado === MATRICULA_PADRAO) &&
      senha === SENHA_PADRAO;

    if (ehAdministradorPadrao) {
      salvarSessao({
        login: MATRICULA_PADRAO,
        nome: "Vanessa",
        matricula: MATRICULA_PADRAO,
        perfil: "Administradora",
        equipe: "Administração",
      });

      router.replace("/dashboard");
      return;
    }

    let usuariosSalvos: UsuarioSalvo[] = [];

    try {
      const conteudo = localStorage.getItem("somos-eleva-usuarios");
      const lista = conteudo ? JSON.parse(conteudo) : [];

      usuariosSalvos = Array.isArray(lista) ? lista : [];
    } catch {
      setErro("Não foi possível ler os usuários cadastrados.");
      return;
    }

    const usuarioEncontrado = usuariosSalvos.find((item) => {
      const email = normalizar(item.email || "");
      const matricula = String(item.matricula || "").trim();
      const id = String(item.id || "").trim();

      return (
        email === loginNormalizado ||
        matricula === loginDigitado ||
        id === loginDigitado
      );
    });

    if (!usuarioEncontrado) {
      setErro("E-mail, matrícula ou senha incorretos.");
      return;
    }

    if (!usuarioEstaAtivo(usuarioEncontrado)) {
      setErro("Este usuário está desativado. Procure a Administração.");
      return;
    }

    if (String(usuarioEncontrado.senha || "") !== senha) {
      setErro("E-mail, matrícula ou senha incorretos.");
      return;
    }

    const matricula =
      String(usuarioEncontrado.matricula || "").trim() ||
      String(usuarioEncontrado.id || "").trim() ||
      loginDigitado;

    const perfil =
      String(
        usuarioEncontrado.perfil ||
          usuarioEncontrado.cargo ||
          "Consultora"
      ).trim();

    salvarSessao({
      login: matricula,
      nome: String(usuarioEncontrado.nome || "Colaboradora").trim(),
      matricula,
      perfil,
      equipe: String(usuarioEncontrado.equipe || "").trim(),
      foto: String(usuarioEncontrado.foto || ""),
    });

    router.replace("/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-art">
        <img
          src="/banner-login.png"
          alt="Banner Eleva"
          className="login-art-image"
        />
      </section>

      <section className="login-access">
        <form className="login-card" onSubmit={entrar}>
          <img
            src="/logo-eleva-oficial.png"
            alt="Eleva Promotora de Crédito"
            className="login-logo"
          />

          <div className="login-divider">
            <span />
            <strong>SOMOS ELEVA</strong>
            <span />
          </div>

          <h1>Entrar na plataforma</h1>

          <p className="login-subtitle">
            Informe suas credenciais para acessar
          </p>

          <label htmlFor="usuario">E-mail ou matrícula</label>

          <input
            id="usuario"
            type="text"
            value={usuario}
            onChange={(event) => {
              setUsuario(event.target.value);
              setErro("");
            }}
            placeholder="Digite seu e-mail ou matrícula"
            autoComplete="username"
            required
          />

          <label htmlFor="senha">Senha</label>

          <div className="password-field">
            <input
              id="senha"
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              onChange={(event) => {
                setSenha(event.target.value);
                setErro("");
              }}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              onClick={() => setMostrarSenha((atual) => !atual)}
            >
              {mostrarSenha ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          <button type="button" className="forgot-password">
            Esqueci minha senha
          </button>

          {erro && <div className="login-error">{erro}</div>}

          <button type="submit" className="login-button">
            Entrar
          </button>

          <p className="login-security">
            Acesso exclusivo para colaboradores autorizados.
          </p>

          <footer>
            © 2026 SOMOS ELEVA. Todos os direitos reservados.
          </footer>
        </form>
      </section>
    </main>
  );
}
