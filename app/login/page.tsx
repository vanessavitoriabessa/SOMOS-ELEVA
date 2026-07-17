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
            <span></span>
            <strong>SOMOS ELEVA</strong>
            <span></span>
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
            onChange={(e) => setUsuario(e.target.value)}
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
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
            >
              {mostrarSenha ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          <button
            type="button"
            className="forgot-password"
          >
            Esqueci minha senha
          </button>

          {erro && <div className="login-error">{erro}</div>}

          <button
            type="submit"
            className="login-button"
          >
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