"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import "./login.css";

const USUARIO_PADRAO = "admin@somosmaiseleva.com.br";
const SENHA_PADRAO = "Eleva@2026";

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");

  function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    const usuarioValido =
      usuario.trim().toLowerCase() === USUARIO_PADRAO ||
      usuario.trim() === "0001";

    if (!usuarioValido || senha !== SENHA_PADRAO) {
      setErro("E-mail, matrícula ou senha incorretos.");
      return;
    }

    localStorage.setItem("somos-eleva-logado", "sim");
    localStorage.setItem("somos-eleva-usuario", usuario.trim());
    router.push("/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-art">
        <img
          src="/login-left-eleva.jpg"
          alt="SOMOS ELEVA"
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
            <span></span>
            <strong>SOMOS ELEVA</strong>
            <span></span>
          </div>

          <h1>Entrar na plataforma</h1>
          <p className="login-subtitle">
            Informe suas credenciais para acessar
          </p>

          <label htmlFor="usuario">E-mail ou matrícula</label>
          <div className="input-wrapper">
            <svg className="input-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z" />
            </svg>
            <input
              id="usuario"
              type="text"
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
              placeholder="Digite seu e-mail ou matrícula"
              autoComplete="username"
              required
            />
          </div>

          <label htmlFor="senha">Senha</label>
          <div className="input-wrapper password-field">
            <svg className="input-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v10h14V10a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V6Zm3 9.73V18h-2v-2.27a2 2 0 1 1 2 0Z" />
            </svg>
            <input
              id="senha"
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              onClick={() => setMostrarSenha((valor) => !valor)}
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
