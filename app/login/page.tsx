"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "./login.css";

type PerfilUsuario = {
  nome: string;
  email: string;
  perfil: string;
  equipe: string;
  ativo: boolean;
  foto_url: string;
};

export default function LoginPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [usuario, setUsuario] =
    useState("");

  const [senha, setSenha] =
    useState("");

  const [mostrarSenha, setMostrarSenha] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [entrando, setEntrando] =
    useState(false);

  async function entrar(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErro("");

    const email =
      usuario.trim().toLowerCase();

    if (!email || !senha) {
      setErro(
        "Informe o e-mail e a senha."
      );
      return;
    }

    setEntrando(true);

    try {
      const {
        data: dadosLogin,
        error: erroLogin,
      } =
        await supabase.auth.signInWithPassword(
          {
            email,
            password: senha,
          }
        );

      if (
        erroLogin ||
        !dadosLogin.user
      ) {
        setErro(
          "E-mail ou senha incorretos."
        );
        return;
      }

      const {
        data: perfil,
        error: erroPerfil,
      } = await supabase
        .from("profiles")
        .select(
          `
            nome,
            email,
            perfil,
            equipe,
            ativo,
            foto_url
          `
        )
        .eq(
          "id",
          dadosLogin.user.id
        )
        .single<PerfilUsuario>();

      if (erroPerfil || !perfil) {
        await supabase.auth.signOut();

        setErro(
          "O perfil deste usuário não foi encontrado. Procure a Administração."
        );
        return;
      }

      if (!perfil.ativo) {
        await supabase.auth.signOut();

        setErro(
          "Este usuário está desativado. Procure a Administração."
        );
        return;
      }

      localStorage.setItem(
        "somos-eleva-logado",
        "sim"
      );

      localStorage.setItem(
        "somos-eleva-usuario",
        perfil.email || email
      );

      localStorage.setItem(
        "somos-eleva-nome",
        perfil.nome ||
          "Colaboradora"
      );

      localStorage.setItem(
        "somos-eleva-matricula",
        ""
      );

      localStorage.setItem(
        "somos-eleva-cargo",
        perfil.perfil ||
          "Consultora"
      );

      localStorage.setItem(
        "somos-eleva-equipe",
        perfil.equipe || ""
      );

      localStorage.setItem(
        "somos-eleva-status",
        "Ativo"
      );

      localStorage.setItem(
        "somos-eleva-foto",
        perfil.foto_url || ""
      );

      localStorage.setItem(
        "somos-eleva-supabase-user-id",
        dadosLogin.user.id
      );

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setErro(
        "Não foi possível entrar. Verifique sua conexão e tente novamente."
      );
    } finally {
      setEntrando(false);
    }
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
        <form
          className="login-card"
          onSubmit={entrar}
        >
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

          <h1>
            Entrar na plataforma
          </h1>

          <p className="login-subtitle">
            Informe suas credenciais
            para acessar
          </p>

          <label htmlFor="usuario">
            E-mail
          </label>

          <input
            id="usuario"
            type="email"
            value={usuario}
            onChange={(event) => {
              setUsuario(
                event.target.value
              );
              setErro("");
            }}
            placeholder="Digite seu e-mail"
            autoComplete="username"
            required
          />

          <label htmlFor="senha">
            Senha
          </label>

          <div className="password-field">
            <input
              id="senha"
              type={
                mostrarSenha
                  ? "text"
                  : "password"
              }
              value={senha}
              onChange={(event) => {
                setSenha(
                  event.target.value
                );
                setErro("");
              }}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              onClick={() =>
                setMostrarSenha(
                  (atual) => !atual
                )
              }
            >
              {mostrarSenha
                ? "Ocultar"
                : "Mostrar"}
            </button>
          </div>

          <button
            type="button"
            className="forgot-password"
          >
            Esqueci minha senha
          </button>

          {erro && (
            <div className="login-error">
              {erro}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={entrando}
          >
            {entrando
              ? "Entrando..."
              : "Entrar"}
          </button>

          <p className="login-security">
            Acesso exclusivo para
            colaboradores autorizados.
          </p>

          <footer>
            © 2026 SOMOS ELEVA. Todos
            os direitos reservados.
          </footer>
        </form>
      </section>
    </main>
  );
}