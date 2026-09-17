"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type WhatsAppItem = {
  id: number;
  nome: string;
  numero: string;
  ativo: boolean;
  identificacao_tipo?: string;
  identificacao?: string;
  numero_tipo?: string;
  numero_info?: string;
  consultor?: string;
};

type WhatsAppData = {
  sucesso?: boolean;
  numeros: WhatsAppItem[];
  ultimo_id?: number;
  erro?: string;
  mensagem?: string;
};

type Formulario = {
  nome: string;
  numero: string;
  identificacao_tipo: string;
  identificacao: string;
  numero_tipo: string;
  consultor: string;
};

const URL_API = "/api/whatsapps";

const CONSULTORES = [
  "Ana Carolina",
  "Andressa",
  "Dagna",
  "Erica",
  "Kalyta",
  "Lauandra",
  "Gabriela",
  "Valdenea",
  "Ana Laura",
  "Maria",
  "Raissa",
  "Vinicius",
  "Sthefane",
  "Geral",
];

const FORMULARIO_VAZIO: Formulario = {
  nome: "",
  numero: "",
  identificacao_tipo: "",
  identificacao: "",
  numero_tipo: "",
  consultor: "",
};

function formatarTelefone(numero: string) {
  const digitos = String(numero || "").replace(/\D/g, "");
  const nacional = digitos.startsWith("55")
    ? digitos.slice(2)
    : digitos;

  if (nacional.length === 11) {
    return `(${nacional.slice(0, 2)}) ${nacional.slice(
      2,
      7,
    )}-${nacional.slice(7)}`;
  }

  if (nacional.length === 10) {
    return `(${nacional.slice(0, 2)}) ${nacional.slice(
      2,
      6,
    )}-${nacional.slice(6)}`;
  }

  return numero;
}

function textoVinculo(item: WhatsAppItem) {
  if (item.identificacao_tipo === "perfil_bm") {
    return "NOME DO PERFIL/BM DO FACEBOOK";
  }

  if (item.identificacao_tipo === "aparelho") {
    return "NOME DO APARELHO CELULAR";
  }

  return "VÍNCULO DO WHATSAPP";
}

function textoTipoNumero(item: WhatsAppItem) {
  if (item.numero_tipo === "oficial") {
    return "Número Oficial Meta";
  }

  if (item.numero_tipo === "nao_oficial") {
    return "Número Não Oficial";
  }

  return "Não informado";
}

export default function WhatsAppManager() {
  const [dados, setDados] = useState<WhatsAppData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const [formulario, setFormulario] =
    useState<Formulario>(FORMULARIO_VAZIO);

  const [editando, setEditando] =
    useState<WhatsAppItem | null>(null);

  const [formEdicao, setFormEdicao] =
    useState<Formulario>(FORMULARIO_VAZIO);

  const [novoConsultor, setNovoConsultor] = useState("");

    async function carregar() {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await fetch(`${URL_API}?t=${Date.now()}`, {
        cache: "no-store",
      });

      const json = (await resposta.json()) as WhatsAppData;

      if (!resposta.ok || json.sucesso === false) {
        throw new Error(
          json.erro || "Não foi possível carregar os WhatsApps.",
        );
      }

      if (!Array.isArray(json.numeros)) {
        throw new Error("A lista de WhatsApps é inválida.");
      }

      setDados(json);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os WhatsApps.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  useEffect(() => {
    if (!mensagem && !erro) return;

    const timer = window.setTimeout(() => {
      setMensagem("");
      setErro("");
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [mensagem, erro]);

  const resumo = useMemo(() => {
    const numeros = dados?.numeros ?? [];
    const ativos = numeros.filter((item) => item.ativo).length;

    return {
      cadastrados: numeros.length,
      ativos,
      banidos: numeros.length - ativos,
      plano:
        ativos > 0
          ? "PLANO A - WHATSAPP"
          : "PLANO B - WEBSDK",
    };
  }, [dados]);

  async function executar(
    payload: Record<string, string | number | boolean>,
  ) {
    try {
      setProcessando(true);
      setErro("");
      setMensagem("");

      const resposta = await fetch(URL_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = (await resposta.json()) as WhatsAppData;

      if (!resposta.ok || json.sucesso === false) {
        throw new Error(
          json.erro || "Não foi possível concluir a operação.",
        );
      }

      setMensagem(
        json.mensagem || "Alteração realizada com sucesso.",
      );

      await carregar();

      return true;
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a operação.",
      );

      return false;
    } finally {
      setProcessando(false);
    }
  }

  function validarFormulario(form: Formulario) {
    if (!form.nome.trim()) {
      setErro("Informe o nome de identificação do WhatsApp.");
      return false;
    }

    if (!form.numero.replace(/\D/g, "")) {
      setErro("Informe o WhatsApp com DDD.");
      return false;
    }

    if (!form.identificacao_tipo) {
      setErro("Selecione o vínculo do WhatsApp.");
      return false;
    }

    if (!form.identificacao.trim()) {
      setErro("Informe o nome do Perfil/BM ou do aparelho.");
      return false;
    }

    if (!form.numero_tipo) {
      setErro("Selecione o tipo do número.");
      return false;
    }

    if (!form.consultor) {
      setErro("Selecione o Consultor(a).");
      return false;
    }

    return true;
  }

    async function incluir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validarFormulario(formulario)) return;

    const sucesso = await executar({
      acao: "incluir",
      nome: formulario.nome.trim(),
      numero: formulario.numero,
      identificacao_tipo: formulario.identificacao_tipo,
      identificacao: formulario.identificacao.trim(),
      numero_tipo: formulario.numero_tipo,
      numero_info: "",
      consultor: formulario.consultor,
    });

    if (sucesso) {
      setFormulario(FORMULARIO_VAZIO);
      setNovoConsultor("");
    }
  }

  async function alterarStatus(item: WhatsAppItem) {
    await executar({
      acao: "status",
      id: item.id,
      ativo: !item.ativo,
    });
  }

  async function excluir(item: WhatsAppItem) {
    const confirmou = window.confirm(
      `Tem certeza que deseja excluir este WhatsApp permanentemente?\n\n${item.nome}\n${formatarTelefone(item.numero)}`,
    );

    if (!confirmou) return;

    await executar({
      acao: "excluir",
      id: item.id,
    });
  }

  function abrirEdicao(item: WhatsAppItem) {
    setEditando(item);

    setFormEdicao({
      nome: item.nome || "",
      numero: formatarTelefone(item.numero || ""),
      identificacao_tipo: item.identificacao_tipo || "",
      identificacao: item.identificacao || "",
      numero_tipo: item.numero_tipo || "",
      consultor: item.consultor || "",
    });

    setMensagem("");
    setErro("");
  }

  function fecharEdicao() {
    setEditando(null);
    setFormEdicao(FORMULARIO_VAZIO);
  }

  async function salvarEdicao(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editando) return;
    if (!validarFormulario(formEdicao)) return;

    const sucesso = await executar({
      acao: "editar",
      id: editando.id,
      nome: formEdicao.nome.trim(),
      numero: formEdicao.numero,
      identificacao_tipo: formEdicao.identificacao_tipo,
      identificacao: formEdicao.identificacao.trim(),
      numero_tipo: formEdicao.numero_tipo,
      numero_info: "",
      consultor: formEdicao.consultor,
    });

    if (sucesso) {
      fecharEdicao();
    }
  }

  function adicionarNovoConsultor() {
    const nome = novoConsultor.trim();

    if (!nome) {
      setErro("Digite o nome do novo Consultor(a).");
      return;
    }

    setFormulario((atual) => ({
      ...atual,
      consultor: nome,
    }));

    setNovoConsultor("");
    setErro("");
  }

  const consultoresDisponiveis = useMemo(() => {
    const encontrados = (dados?.numeros ?? [])
      .map((item) => item.consultor || "")
      .filter(Boolean);

    return Array.from(
      new Set([...CONSULTORES, ...encontrados]),
    );
  }, [dados]);

  if (carregando && !dados) {
    return (
      <div
        style={{
          padding: 24,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
        }}
      >
        Carregando WhatsApps...
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {mensagem && (
        <div
          style={{
            padding: "13px 16px",
            background: "#e9f8ef",
            color: "#087b3d",
            borderRadius: 12,
            fontWeight: 700,
          }}
        >
          {mensagem}
        </div>
      )}

      {erro && (
        <div
          style={{
            padding: "13px 16px",
            background: "#ffe9e7",
            color: "#b42318",
            borderRadius: 12,
            fontWeight: 700,
          }}
        >
          {erro}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {[
          ["Cadastrados", resumo.cadastrados],
          ["Ativos", resumo.ativos],
          ["Banidos - Em Análise", resumo.banidos],
          ["Plano atual", resumo.plano],
        ].map(([titulo, valor]) => (
          <div
            key={String(titulo)}
            style={{
              padding: 18,
              background: "#ffffff",
              border: "1px solid #dbe5f5",
              borderRadius: 16,
            }}
          >
            <div
              style={{
                color: "#667085",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {titulo}
            </div>

            <strong
              style={{
                display: "block",
                marginTop: 8,
                color: "#08275c",
                fontSize:
                  titulo === "Plano atual" ? 18 : 24,
              }}
            >
              {valor}
            </strong>
          </div>
        ))}
      </div>

      {(dados?.numeros ?? []).map((item) => (
        <div
          key={item.id}
          style={{
            padding: 20,
            background: "#ffffff",
            border: "1px solid #dbe5f5",
            borderRadius: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "10px 14px",
                background: "#eef4ff",
                border: "1px solid #cddcff",
                borderRadius: 10,
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#08275c",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                {item.nome}
              </strong>

              <div
                style={{
                  marginTop: 5,
                  color: "#155eef",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                {formatarTelefone(item.numero)}
              </div>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: item.ativo
                  ? "#e8f8ef"
                  : "#fff3d6",
                color: item.ativo
                  ? "#08783e"
                  : "#a66400",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              ●{" "}
              {item.ativo
                ? "ATIVO"
                : "BANIDO - EM ANÁLISE"}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: 10,
              marginTop: 14,
            }}
          >
            <div
              style={{
                padding: 13,
                background: "#f6f8fc",
                borderRadius: 12,
              }}
            >
              <small
                style={{
                  color: "#667085",
                  fontWeight: 700,
                }}
              >
                {textoVinculo(item)}
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                  color: "#08275c",
                }}
              >
                {item.identificacao || "Não informado"}
              </strong>
            </div>

            <div
              style={{
                padding: 13,
                background: "#f6f8fc",
                borderRadius: 12,
              }}
            >
              <small
                style={{
                  color: "#667085",
                  fontWeight: 700,
                }}
              >
                TIPO DO NÚMERO
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                  color: "#08275c",
                }}
              >
                {textoTipoNumero(item)}
              </strong>
            </div>

            <div
              style={{
                padding: 13,
                background: "#f6f8fc",
                borderRadius: 12,
              }}
            >
              <small
                style={{
                  color: "#667085",
                  fontWeight: 700,
                }}
              >
                CONSULTOR(A)
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                  color: "#08275c",
                }}
              >
                {item.consultor || "Não informado"}
              </strong>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            <button
              type="button"
              onClick={() => abrirEdicao(item)}
              disabled={processando}
              style={{
                padding: "11px 16px",
                border: 0,
                borderRadius: 9,
                background: "#3b404a",
                color: "#ffffff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              EDITAR INFORMAÇÕES
            </button>

            <button
              type="button"
              onClick={() => void alterarStatus(item)}
              disabled={processando}
              style={{
                padding: "11px 16px",
                border: 0,
                borderRadius: 9,
                background: item.ativo
                  ? "#f4a000"
                  : "#139653",
                color: "#ffffff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {item.ativo
                ? "BANIDO - EM ANÁLISE"
                : "ATIVAR"}
            </button>

            <button
              type="button"
              onClick={() => void excluir(item)}
              disabled={processando}
              style={{
                padding: "11px 16px",
                border: 0,
                borderRadius: 9,
                background: "#d63b32",
                color: "#ffffff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              EXCLUIR NÚMERO
            </button>
          </div>
        </div>
      ))}
            <div
        style={{
          marginTop: 8,
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "12px 20px",
            background: "#3b404a",
            color: "#ffffff",
            borderRadius: 10,
            fontSize: 17,
            fontWeight: 800,
          }}
        >
          INCLUIR WHATSAPP
        </div>

        <form
          onSubmit={incluir}
          style={{
            display: "grid",
            gap: 20,
            marginTop: 14,
            padding: 22,
            background: "#ffffff",
            border: "1px solid #dbe5f5",
            borderRadius: 18,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                color: "#08275c",
                fontWeight: 800,
              }}
            >
              Nome de identificação do WhatsApp
            </label>

            <input
              type="text"
              value={formulario.nome}
              placeholder="Ex.: COMPRA DE DIVIDA 05"
              onChange={(event) =>
                setFormulario((atual) => ({
                  ...atual,
                  nome: event.target.value,
                }))
              }
              style={{
                width: "100%",
                padding: 13,
                border: "1px solid #cbd7f1",
                borderRadius: 9,
                fontSize: 15,
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                color: "#08275c",
                fontWeight: 800,
              }}
            >
              WhatsApp com DDD
            </label>

            <input
              type="text"
              value={formulario.numero}
              placeholder="Ex.: (62) 99999-9999"
              onChange={(event) =>
                setFormulario((atual) => ({
                  ...atual,
                  numero: event.target.value,
                }))
              }
              style={{
                width: "100%",
                padding: 13,
                border: "1px solid #cbd7f1",
                borderRadius: 9,
                fontSize: 15,
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 9,
                color: "#08275c",
                fontWeight: 800,
              }}
            >
              Este WhatsApp está vinculado a:
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "330px 1fr",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 9,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    minHeight: 48,
                    padding: "11px 13px",
                    background: "#f7f9ff",
                    border: "1px solid #dbe5ff",
                    borderRadius: 9,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="vinculo-novo"
                    checked={
                      formulario.identificacao_tipo ===
                      "perfil_bm"
                    }
                    onChange={() =>
                      setFormulario((atual) => ({
                        ...atual,
                        identificacao_tipo: "perfil_bm",
                      }))
                    }
                  />

                  Nome do Perfil/BM do Facebook
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    minHeight: 48,
                    padding: "11px 13px",
                    background: "#f7f9ff",
                    border: "1px solid #dbe5ff",
                    borderRadius: 9,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="vinculo-novo"
                    checked={
                      formulario.identificacao_tipo ===
                      "aparelho"
                    }
                    onChange={() =>
                      setFormulario((atual) => ({
                        ...atual,
                        identificacao_tipo: "aparelho",
                      }))
                    }
                  />

                  Nome do Aparelho Celular
                </label>
              </div>

              <textarea
                value={formulario.identificacao}
                placeholder="Digite aqui o nome do Perfil/BM ou do aparelho"
                onChange={(event) =>
                  setFormulario((atual) => ({
                    ...atual,
                    identificacao: event.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  minHeight: 105,
                  padding: 13,
                  resize: "vertical",
                  border: "1px solid #cbd7f1",
                  borderRadius: 9,
                  fontFamily: "inherit",
                  fontSize: 15,
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 9,
                color: "#08275c",
                fontWeight: 800,
              }}
            >
              Tipo do número:
            </label>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  minWidth: 220,
                  padding: "12px 14px",
                  background: "#f7f9ff",
                  border: "1px solid #dbe5ff",
                  borderRadius: 9,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="tipo-numero-novo"
                  checked={
                    formulario.numero_tipo === "oficial"
                  }
                  onChange={() =>
                    setFormulario((atual) => ({
                      ...atual,
                      numero_tipo: "oficial",
                    }))
                  }
                />

                Número Oficial Meta
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  minWidth: 220,
                  padding: "12px 14px",
                  background: "#f7f9ff",
                  border: "1px solid #dbe5ff",
                  borderRadius: 9,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="tipo-numero-novo"
                  checked={
                    formulario.numero_tipo ===
                    "nao_oficial"
                  }
                  onChange={() =>
                    setFormulario((atual) => ({
                      ...atual,
                      numero_tipo: "nao_oficial",
                    }))
                  }
                />

                Número Não Oficial
              </label>
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                color: "#08275c",
                fontWeight: 800,
              }}
            >
              Consultor(a):
            </label>

            <select
              value={formulario.consultor}
              onChange={(event) =>
                setFormulario((atual) => ({
                  ...atual,
                  consultor: event.target.value,
                }))
              }
              style={{
                width: "100%",
                padding: 13,
                background: "#ffffff",
                border: "1px solid #cbd7f1",
                borderRadius: 9,
                color: "#08275c",
                fontSize: 15,
              }}
            >
              <option value="">
                Selecione o Consultor(a)
              </option>

              {consultoresDisponiveis.map((consultor) => (
                <option
                  key={consultor}
                  value={consultor}
                >
                  {consultor}
                </option>
              ))}

              <option value="__incluir__">
                Incluir Consultor(a)
              </option>
            </select>
          </div>

          {formulario.consultor === "__incluir__" && (
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <input
                type="text"
                value={novoConsultor}
                placeholder="Digite o nome do novo Consultor(a)"
                onChange={(event) =>
                  setNovoConsultor(event.target.value)
                }
                style={{
                  flex: 1,
                  padding: 13,
                  border: "1px solid #cbd7f1",
                  borderRadius: 9,
                  fontSize: 15,
                }}
              />

              <button
                type="button"
                onClick={adicionarNovoConsultor}
                style={{
                  padding: "12px 16px",
                  border: 0,
                  borderRadius: 9,
                  background: "#3b404a",
                  color: "#ffffff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ADICIONAR
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={processando}
            style={{
              justifySelf: "start",
              padding: "13px 22px",
              border: 0,
              borderRadius: 9,
              background: "#155eef",
              color: "#ffffff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {processando
              ? "SALVANDO..."
              : "INCLUIR WHATSAPP"}
          </button>

          <div
            style={{
              color: "#6c7891",
              fontSize: 12,
            }}
          >
            Todo novo WhatsApp será incluído inicialmente
            como BANIDO - EM ANÁLISE. Depois de conferir o
            número, clique em ATIVAR.
          </div>
        </form>
      </div>
            {editando && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "rgba(15, 23, 42, 0.48)",
          }}
          onClick={fecharEdicao}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 760,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              background: "#ffffff",
              borderRadius: 18,
              boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 22,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#08275c",
                    fontSize: 22,
                  }}
                >
                  Editar informações
                </h2>

                <div
                  style={{
                    marginTop: 5,
                    color: "#667085",
                    fontSize: 13,
                  }}
                >
                  {editando.nome} ·{" "}
                  {formatarTelefone(editando.numero)}
                </div>
              </div>

              <button
                type="button"
                onClick={fecharEdicao}
                style={{
                  width: 36,
                  height: 36,
                  border: "1px solid #dbe3ef",
                  borderRadius: 9,
                  background: "#ffffff",
                  color: "#475467",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={salvarEdicao}
              style={{
                display: "grid",
                gap: 18,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "#08275c",
                    fontWeight: 800,
                  }}
                >
                  Nome de identificação do WhatsApp
                </label>

                <input
                  type="text"
                  value={formEdicao.nome}
                  onChange={(event) =>
                    setFormEdicao((atual) => ({
                      ...atual,
                      nome: event.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: 13,
                    border: "1px solid #cbd7f1",
                    borderRadius: 9,
                    fontSize: 15,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "#08275c",
                    fontWeight: 800,
                  }}
                >
                  WhatsApp com DDD
                </label>

                <input
                  type="text"
                  value={formEdicao.numero}
                  onChange={(event) =>
                    setFormEdicao((atual) => ({
                      ...atual,
                      numero: event.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: 13,
                    border: "1px solid #cbd7f1",
                    borderRadius: 9,
                    fontSize: 15,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 9,
                    color: "#08275c",
                    fontWeight: 800,
                  }}
                >
                  Este WhatsApp está vinculado a:
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "12px 14px",
                      background: "#f7f9ff",
                      border: "1px solid #dbe5ff",
                      borderRadius: 9,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="vinculo-edicao"
                      checked={
                        formEdicao.identificacao_tipo ===
                        "perfil_bm"
                      }
                      onChange={() =>
                        setFormEdicao((atual) => ({
                          ...atual,
                          identificacao_tipo: "perfil_bm",
                        }))
                      }
                    />

                    Nome do Perfil/BM do Facebook
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "12px 14px",
                      background: "#f7f9ff",
                      border: "1px solid #dbe5ff",
                      borderRadius: 9,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="vinculo-edicao"
                      checked={
                        formEdicao.identificacao_tipo ===
                        "aparelho"
                      }
                      onChange={() =>
                        setFormEdicao((atual) => ({
                          ...atual,
                          identificacao_tipo: "aparelho",
                        }))
                      }
                    />

                    Nome do Aparelho Celular
                  </label>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "#08275c",
                    fontWeight: 800,
                  }}
                >
                  Nome do Perfil/BM ou do Aparelho
                </label>

                <textarea
                  value={formEdicao.identificacao}
                  onChange={(event) =>
                    setFormEdicao((atual) => ({
                      ...atual,
                      identificacao: event.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    minHeight: 90,
                    padding: 13,
                    resize: "vertical",
                    border: "1px solid #cbd7f1",
                    borderRadius: 9,
                    fontFamily: "inherit",
                    fontSize: 15,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 9,
                    color: "#08275c",
                    fontWeight: 800,
                  }}
                >
                  Tipo do número:
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "12px 14px",
                      background: "#f7f9ff",
                      border: "1px solid #dbe5ff",
                      borderRadius: 9,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="tipo-numero-edicao"
                      checked={
                        formEdicao.numero_tipo === "oficial"
                      }
                      onChange={() =>
                        setFormEdicao((atual) => ({
                          ...atual,
                          numero_tipo: "oficial",
                        }))
                      }
                    />

                    Número Oficial Meta
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "12px 14px",
                      background: "#f7f9ff",
                      border: "1px solid #dbe5ff",
                      borderRadius: 9,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="tipo-numero-edicao"
                      checked={
                        formEdicao.numero_tipo ===
                        "nao_oficial"
                      }
                      onChange={() =>
                        setFormEdicao((atual) => ({
                          ...atual,
                          numero_tipo: "nao_oficial",
                        }))
                      }
                    />

                    Número Não Oficial
                  </label>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "#08275c",
                    fontWeight: 800,
                  }}
                >
                  Consultor(a):
                </label>

                <select
                  value={formEdicao.consultor}
                  onChange={(event) =>
                    setFormEdicao((atual) => ({
                      ...atual,
                      consultor: event.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: 13,
                    background: "#ffffff",
                    border: "1px solid #cbd7f1",
                    borderRadius: 9,
                    color: "#08275c",
                    fontSize: 15,
                  }}
                >
                  <option value="">
                    Selecione o Consultor(a)
                  </option>

                  {consultoresDisponiveis.map((consultor) => (
                    <option
                      key={consultor}
                      value={consultor}
                    >
                      {consultor}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 4,
                }}
              >
                <button
                  type="button"
                  onClick={fecharEdicao}
                  disabled={processando}
                  style={{
                    padding: "12px 18px",
                    border: 0,
                    borderRadius: 9,
                    background: "#3b404a",
                    color: "#ffffff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  CANCELAR
                </button>

                <button
                  type="submit"
                  disabled={processando}
                  style={{
                    padding: "12px 18px",
                    border: 0,
                    borderRadius: 9,
                    background: "#139653",
                    color: "#ffffff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {processando
                    ? "SALVANDO..."
                    : "SALVAR ALTERAÇÕES"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}