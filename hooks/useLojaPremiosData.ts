import { useEffect, useState } from "react";

export function useLojaPremiosData() {
  const [propostas, setPropostas] = useState<any[]>([]);
  const [registrosClt, setRegistrosClt] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [saques, setSaques] = useState<any[]>([]);
  const [nomeLogado, setNomeLogado] = useState("");
  const [perfilLogado, setPerfilLogado] = useState("");
  const [carregado, setCarregado] = useState(false);

  function carregar() {
    try {
      setPropostas(
        JSON.parse(localStorage.getItem("somos-eleva-propostas") || "[]")
      );
    } catch {
      setPropostas([]);
    }

    try {
      setRegistrosClt(
        JSON.parse(localStorage.getItem("somos-eleva-clt") || "[]")
      );
    } catch {
      setRegistrosClt([]);
    }

    let listaUsuarios: any[] = [];

    try {
      listaUsuarios = JSON.parse(
        localStorage.getItem("somos-eleva-usuarios") || "[]"
      );

      setUsuarios(listaUsuarios);
    } catch {
      setUsuarios([]);
    }

    try {
      setSaques(
        JSON.parse(
          localStorage.getItem("somos-eleva-saques-premios") || "[]"
        )
      );
    } catch {
      setSaques([]);
    }

    const login = localStorage.getItem("somos-eleva-usuario") || "";

    const matricula =
      localStorage.getItem("somos-eleva-matricula") || login;

    const usuario = listaUsuarios.find((item) => {
      return (
        String(item.id || "") === login ||
        String(item.matricula || "") === login ||
        String(item.matricula || "") === matricula
      );
    });

    setNomeLogado(
      usuario?.nome ||
        localStorage.getItem("somos-eleva-nome") ||
        ""
    );

    setPerfilLogado(
      usuario?.perfil ||
        usuario?.cargo ||
        localStorage.getItem("somos-eleva-cargo") ||
        "Consultora"
    );

    setCarregado(true);
  }

  useEffect(() => {
    carregar();

    const intervalo = window.setInterval(carregar, 3000);

    window.addEventListener("storage", carregar);
    window.addEventListener("focus", carregar);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("storage", carregar);
      window.removeEventListener("focus", carregar);
    };
  }, []);

  return {
    propostas,
    registrosClt,
    usuarios,
    saques,
    nomeLogado,
    perfilLogado,
    carregado,
    carregar,
    setSaques,
  };
}