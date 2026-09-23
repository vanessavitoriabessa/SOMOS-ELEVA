"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

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
    mensagem?: string;
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
    mensagem: string;
};

type MonitorResumo = {
  tentativas: number;
  telefones_unicos: number;
  clientes_repetidos: number;
  salvos_hyperflow: number;
  plano_a: number;
  plano_b: number;
  fallback: number;
  falhas_sem_atendimento: number;
  retrabalhos_pendentes: number;
  rodizio_recuperado: number;
  rodizio_falhou: number;
};

type MonitorEvento = {
  id: number;
  tentativa_id: string;
  criado_em: string;
  telefone: string;
  plano: string | null;
  etapa: string;
  erro: string | null;
  destino_numero: string | null;
  destino_nome: string | null;
  destino_consultor: string | null;
  resultado: string;
  fallback: boolean;
  retrabalho_status: string | null;
  rodizio_recuperado: boolean;
  rodizio_falhou: boolean;
  erro_rodizio: string | null;
};

type MonitorData = {
  sucesso: boolean;
  erro?: string;
  resumo: MonitorResumo;
  eventos: MonitorEvento[];
  falhas: MonitorEvento[];
};

const URL_API = "/api/whatsapps";
const URL_MONITOR = "/api/lp-eventos";

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
  mensagem: "",
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


function dataBrasiliaDeslocada(dias: number) {
  const agora = new Date();
  agora.setDate(agora.getDate() + dias);

  return agora.toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

function formatarDataHoraBrasilia(valor: string) {
  if (!valor) return "—";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return valor;

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(data);
}

function textoResultadoMonitor(item: MonitorEvento) {
  if (item.resultado === "plano_a_whatsapp") {
    return "WhatsApp aberto normalmente";
  }

  if (item.resultado === "plano_b_websdk") {
    return "Atendimento iniciado pelo WebSDK";
  }

  if (item.resultado === "fallback_whatsapp") {
    return "Cliente encaminhado pelo fallback WhatsApp";
  }

  if (item.resultado === "falha_sem_atendimento") {
    return "Atendimento NÃO iniciado";
  }

  return item.resultado || "Em processamento";
}

type WhatsAppManagerProps = { modo?: "gerenciador" | "historico" };

export default function WhatsAppManager({ modo = "gerenciador" }: WhatsAppManagerProps) {
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

  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const [dataInicioMonitor, setDataInicioMonitor] = useState(hoje);
  const [dataFimMonitor, setDataFimMonitor] = useState(hoje);
  const [monitor, setMonitor] = useState<MonitorData | null>(null);
  const [carregandoMonitor, setCarregandoMonitor] = useState(false);
  const [erroMonitor, setErroMonitor] = useState("");

  const [filtrosStatus, setFiltrosStatus] = useState<string[]>([]);
  const [filtrosTipo, setFiltrosTipo] = useState<string[]>([]);
  const [filtrosConsultor, setFiltrosConsultor] = useState<string[]>([]);

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

  async function carregarMonitor(
    inicio = dataInicioMonitor,
    fim = dataFimMonitor,
  ) {
    try {
      setCarregandoMonitor(true);
      setErroMonitor("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        throw new Error(
          "Sua sessão não foi encontrada. Entre novamente no sistema.",
        );
      }

      const resposta = await fetch(
        `${URL_MONITOR}?inicio=${encodeURIComponent(
          inicio,
        )}&fim=${encodeURIComponent(fim)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const json = (await resposta.json()) as MonitorData;

      if (!resposta.ok || json.sucesso === false) {
        throw new Error(
          json.erro || "Não foi possível carregar o Monitor da LP.",
        );
      }

      setMonitor(json);
    } catch (error) {
      setMonitor(null);
      setErroMonitor(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o Monitor da LP.",
      );
    } finally {
      setCarregandoMonitor(false);
    }
  }

  function aplicarPeriodoMonitor(tipo: "hoje" | "ontem" | "7dias") {
    if (tipo === "hoje") {
      const data = dataBrasiliaDeslocada(0);
      setDataInicioMonitor(data);
      setDataFimMonitor(data);
      void carregarMonitor(data, data);
      return;
    }

    if (tipo === "ontem") {
      const data = dataBrasiliaDeslocada(-1);
      setDataInicioMonitor(data);
      setDataFimMonitor(data);
      void carregarMonitor(data, data);
      return;
    }

    const fim = dataBrasiliaDeslocada(0);
    const inicio = dataBrasiliaDeslocada(-6);

    setDataInicioMonitor(inicio);
    setDataFimMonitor(fim);
    void carregarMonitor(inicio, fim);
  }

  useEffect(() => {
    void carregar();
    void carregarMonitor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      mensagem: formulario.mensagem.trim(),
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
        mensagem: item.mensagem || "",
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
mensagem: formEdicao.mensagem.trim(),
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


  function alternarFiltro(valor: string, selecionados: string[], definir: (valores: string[]) => void) {
    definir(
      selecionados.includes(valor)
        ? selecionados.filter((item) => item !== valor)
        : [...selecionados, valor],
    );
  }

  const numerosFiltrados = useMemo(() => {
    return (dados?.numeros ?? []).filter((item) => {
      const status = item.ativo ? "ativo" : "banido";
      const tipo = item.numero_tipo || "";
      const consultor = item.consultor || "";

      return (
        (filtrosStatus.length === 0 || filtrosStatus.includes(status)) &&
        (filtrosTipo.length === 0 || filtrosTipo.includes(tipo)) &&
        (filtrosConsultor.length === 0 || filtrosConsultor.includes(consultor))
      );
    });
  }, [dados, filtrosStatus, filtrosTipo, filtrosConsultor]);

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

  if (modo === "historico") {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <section style={{ padding: 22, background: "#ffffff", border: "1px solid #dbe5f5", borderRadius: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, color: "#08275c", fontSize: 22, fontWeight: 900 }}>Histórico de Atendimentos</h2>
              <div style={{ marginTop: 5, color: "#667085", fontSize: 13 }}>Consulte os atendimentos registrados pela landing page.</div>
            </div>
            <button type="button" onClick={() => void carregarMonitor()} disabled={carregandoMonitor}
              style={{ padding: "11px 16px", border: 0, borderRadius: 9, background: "#155eef", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
              {carregandoMonitor ? "ATUALIZANDO..." : "ATUALIZAR"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
            {[["Hoje", "hoje"], ["Ontem", "ontem"], ["Últimos 7 dias", "7dias"]].map(([titulo, tipo]) => (
              <button key={tipo} type="button"
                onClick={() => aplicarPeriodoMonitor(tipo as "hoje" | "ontem" | "7dias")}
                style={{ padding: "10px 14px", border: "1px solid #cddcff", borderRadius: 9, background: "#eef4ff", color: "#155eef", fontWeight: 800, cursor: "pointer" }}>
                {titulo}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginTop: 14, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800 }}>
              DATA INICIAL
              <input type="date" value={dataInicioMonitor} onChange={(e) => setDataInicioMonitor(e.target.value)}
                style={{ padding: 11, border: "1px solid #cbd7f1", borderRadius: 9 }} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800 }}>
              DATA FINAL
              <input type="date" value={dataFimMonitor} onChange={(e) => setDataFimMonitor(e.target.value)}
                style={{ padding: 11, border: "1px solid #cbd7f1", borderRadius: 9 }} />
            </label>
            <button type="button" onClick={() => void carregarMonitor(dataInicioMonitor, dataFimMonitor)}
              style={{ minHeight: 42, padding: "11px 18px", border: 0, borderRadius: 9, background: "#3b404a", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
              FILTRAR PERÍODO
            </button>
          </div>

          {erroMonitor && <div style={{ marginTop: 16, padding: "12px 14px", background: "#ffe9e7", color: "#b42318", borderRadius: 10, fontWeight: 700 }}>{erroMonitor}</div>}

          <div style={{ marginTop: 20, overflowX: "auto", border: "1px solid #e4eaf3", borderRadius: 12 }}>
            <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr style={{ background: "#f7f9fc" }}>
                  {["Data", "Horário", "Telefone", "Plano", "Destino", "Consultor(a)", "Resultado"].map((titulo) => (
                    <th key={titulo} style={{ padding: "14px 15px", textAlign: "left", color: "#475467", fontSize: 14, fontWeight: 900, borderBottom: "1px solid #e4eaf3", whiteSpace: "nowrap" }}>{titulo}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(monitor?.eventos ?? []).map((item) => {
                  const dt = new Date(item.criado_em);
                  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(dt);
                  const horario = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(dt);
                  return (
                    <tr key={item.id}>
                      <td style={{ padding: "15px 15px", borderBottom: "1px solid #eef1f6", whiteSpace: "nowrap", fontSize: 14 }}>{data}</td>
                      <td style={{ padding: "15px 15px", borderBottom: "1px solid #eef1f6", whiteSpace: "nowrap", fontWeight: 800, fontSize: 14 }}>{horario}</td>
                      <td style={{ padding: "15px 15px", borderBottom: "1px solid #eef1f6", whiteSpace: "nowrap", fontSize: 14 }}>{formatarTelefone(item.telefone)}</td>
                      <td style={{ padding: "15px 15px", borderBottom: "1px solid #eef1f6", fontWeight: 900, fontSize: 14 }}>{item.plano || "—"}</td>
                      <td style={{ padding: "15px 15px", borderBottom: "1px solid #eef1f6", fontSize: 14 }}>{item.destino_nome || (item.plano === "B" ? "WEBSDK" : "—")}</td>
                      <td style={{ padding: "15px 15px", borderBottom: "1px solid #eef1f6", fontSize: 14 }}>{item.destino_consultor || "—"}</td>
                      <td style={{ padding: "15px 15px", borderBottom: "1px solid #eef1f6", fontWeight: 800, fontSize: 14 }}>{textoResultadoMonitor(item)}</td>
                    </tr>
                  );
                })}
                {!carregandoMonitor && (monitor?.eventos.length ?? 0) === 0 && (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#667085", fontWeight: 700 }}>Nenhum atendimento encontrado no período selecionado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
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

      <section
        style={{
          padding: 22,
          background: "#ffffff",
          border: "1px solid #dbe5f5",
          borderRadius: 18,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: "#08275c",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              Monitor da LP
            </h2>

            <div
              style={{
                marginTop: 5,
                color: "#667085",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Acompanhe os atendimentos da landing page Servidor Público.
            </div>
          </div>

          <button
            type="button"
            onClick={() => void carregarMonitor()}
            disabled={carregandoMonitor}
            style={{
              padding: "11px 16px",
              border: 0,
              borderRadius: 9,
              background: "#155eef",
              color: "#ffffff",
              fontWeight: 800,
              cursor: carregandoMonitor ? "wait" : "pointer",
              opacity: carregandoMonitor ? 0.7 : 1,
            }}
          >
            {carregandoMonitor ? "ATUALIZANDO..." : "ATUALIZAR"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 18,
          }}
        >
          {[
            ["Hoje", "hoje"],
            ["Ontem", "ontem"],
            ["Últimos 7 dias", "7dias"],
          ].map(([titulo, tipo]) => (
            <button
              key={tipo}
              type="button"
              onClick={() =>
                aplicarPeriodoMonitor(
                  tipo as "hoje" | "ontem" | "7dias",
                )
              }
              disabled={carregandoMonitor}
              style={{
                padding: "10px 14px",
                border: "1px solid #cddcff",
                borderRadius: 9,
                background: "#eef4ff",
                color: "#155eef",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {titulo}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginTop: 14,
            alignItems: "end",
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 6,
              color: "#344054",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            DATA INICIAL
            <input
              type="date"
              value={dataInicioMonitor}
              onChange={(event) =>
                setDataInicioMonitor(event.target.value)
              }
              style={{
                padding: 11,
                border: "1px solid #cbd7f1",
                borderRadius: 9,
                fontSize: 14,
              }}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 6,
              color: "#344054",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            DATA FINAL
            <input
              type="date"
              value={dataFimMonitor}
              onChange={(event) =>
                setDataFimMonitor(event.target.value)
              }
              style={{
                padding: 11,
                border: "1px solid #cbd7f1",
                borderRadius: 9,
                fontSize: 14,
              }}
            />
          </label>

          <button
            type="button"
            onClick={() =>
              void carregarMonitor(
                dataInicioMonitor,
                dataFimMonitor,
              )
            }
            disabled={carregandoMonitor}
            style={{
              minHeight: 42,
              padding: "11px 18px",
              border: 0,
              borderRadius: 9,
              background: "#3b404a",
              color: "#ffffff",
              fontWeight: 800,
              cursor: carregandoMonitor ? "wait" : "pointer",
            }}
          >
            FILTRAR PERÍODO
          </button>
        </div>

        {erroMonitor && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              background: "#ffe9e7",
              color: "#b42318",
              borderRadius: 10,
              fontWeight: 700,
            }}
          >
            {erroMonitor}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
            marginTop: 18,
          }}
        >
          {[
            ["Tentativas na LP", monitor?.resumo.tentativas ?? 0, "#08275c"],
            ["Telefones únicos", monitor?.resumo.telefones_unicos ?? 0, "#08275c"],
            ["Clientes repetidos", monitor?.resumo.clientes_repetidos ?? 0, "#08275c"],
            ["Salvos na Hyperflow", monitor?.resumo.salvos_hyperflow ?? 0, "#08783e"],
            ["Plano A → WhatsApp", monitor?.resumo.plano_a ?? 0, "#08783e"],
            ["Plano B → WebSDK", monitor?.resumo.plano_b ?? 0, "#155eef"],
            ["Fallback → WhatsApp", monitor?.resumo.fallback ?? 0, "#a66400"],
            ["Falhas sem atendimento", monitor?.resumo.falhas_sem_atendimento ?? 0, "#b42318"],
            ["Retrabalhos pendentes", monitor?.resumo.retrabalhos_pendentes ?? 0, "#a66400"],
            ["Rodízio recuperado 2ª tentativa", monitor?.resumo.rodizio_recuperado ?? 0, "#08783e"],
            ["Falha técnica do rodízio", monitor?.resumo.rodizio_falhou ?? 0, "#b42318"],
          ].map(([titulo, valor, cor]) => (
            <div
              key={String(titulo)}
              style={{
                minHeight: 104,
                padding: 16,
                background: "#f8faff",
                border: "1px solid #dbe5f5",
                borderRadius: 14,
              }}
            >
              <div
                style={{
                  color: "#667085",
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1.35,
                }}
              >
                {titulo}
              </div>

              <strong
                style={{
                  display: "block",
                  marginTop: 10,
                  color: String(cor),
                  fontSize: 27,
                  fontWeight: 900,
                }}
              >
                {valor}
              </strong>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid #e4eaf3",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color: "#08275c",
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                Falhas da LP
              </h3>
              <div
                style={{
                  marginTop: 4,
                  color: "#667085",
                  fontSize: 12,
                }}
              >
                Fallbacks, falhas sem atendimento e ocorrências do rodízio.
              </div>
            </div>

            <div
              style={{
                color: "#667085",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {monitor?.falhas.length ?? 0} ocorrência(s)
            </div>
          </div>

          {!carregandoMonitor &&
            monitor &&
            monitor.falhas.length === 0 && (
              <div
                style={{
                  marginTop: 14,
                  padding: 18,
                  background: "#f7f9fc",
                  borderRadius: 12,
                  color: "#667085",
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                Nenhuma falha ou contingência no período selecionado.
              </div>
            )}

          {(monitor?.falhas.length ?? 0) > 0 && (
            <div
              style={{
                marginTop: 14,
                overflowX: "auto",
                border: "1px solid #e4eaf3",
                borderRadius: 12,
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 1120,
                  borderCollapse: "collapse",
                  background: "#ffffff",
                }}
              >
                <thead>
                  <tr style={{ background: "#f7f9fc" }}>
                    {[
                      "Data/Hora",
                      "Telefone",
                      "Plano",
                      "Etapa",
                      "Erro",
                      "Destino",
                      "Consultor(a)",
                      "Resultado",
                    ].map((titulo) => (
                      <th
                        key={titulo}
                        style={{
                          padding: "12px 13px",
                          textAlign: "left",
                          color: "#475467",
                          fontSize: 11,
                          fontWeight: 900,
                          borderBottom: "1px solid #e4eaf3",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {(monitor?.falhas ?? []).map((item) => {
                    const erroExibido =
                      item.erro ||
                      item.erro_rodizio ||
                      (item.rodizio_recuperado
                        ? "1ª consulta do rodízio falhou; 2ª tentativa recuperou."
                        : item.rodizio_falhou
                          ? "Rodízio indisponível após 2 tentativas."
                          : "—");

                    return (
                      <tr key={item.id}>
                        <td
                          style={{
                            padding: 13,
                            borderBottom: "1px solid #eef1f6",
                            whiteSpace: "nowrap",
                            fontSize: 12,
                          }}
                        >
                          {formatarDataHoraBrasilia(item.criado_em)}
                        </td>

                        <td
                          style={{
                            padding: 13,
                            borderBottom: "1px solid #eef1f6",
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatarTelefone(item.telefone)}
                        </td>

                        <td
                          style={{
                            padding: 13,
                            borderBottom: "1px solid #eef1f6",
                            fontWeight: 900,
                          }}
                        >
                          {item.plano || "—"}
                        </td>

                        <td
                          style={{
                            padding: 13,
                            borderBottom: "1px solid #eef1f6",
                            fontSize: 12,
                          }}
                        >
                          {item.etapa || "—"}
                        </td>

                        <td
                          style={{
                            padding: 13,
                            borderBottom: "1px solid #eef1f6",
                            color:
                              item.resultado === "falha_sem_atendimento"
                                ? "#b42318"
                                : "#475467",
                            fontSize: 12,
                            maxWidth: 280,
                          }}
                        >
                          {erroExibido}
                        </td>

                        <td
                          style={{
                            padding: 13,
                            borderBottom: "1px solid #eef1f6",
                            fontSize: 12,
                          }}
                        >
                          {item.destino_nome ||
                            (item.destino_numero
                              ? formatarTelefone(item.destino_numero)
                              : "—")}
                        </td>

                        <td
                          style={{
                            padding: 13,
                            borderBottom: "1px solid #eef1f6",
                            fontSize: 12,
                          }}
                        >
                          {item.destino_consultor || "—"}
                        </td>

                        <td
                          style={{
                            padding: 13,
                            borderBottom: "1px solid #eef1f6",
                            color:
                              item.resultado === "falha_sem_atendimento"
                                ? "#b42318"
                                : item.resultado === "fallback_whatsapp"
                                  ? "#08783e"
                                  : "#344054",
                            fontSize: 12,
                            fontWeight: 900,
                          }}
                        >
                          {textoResultadoMonitor(item)}
                          {item.resultado === "fallback_whatsapp"
                            ? " ✅"
                            : item.resultado === "falha_sem_atendimento"
                              ? " 🔴"
                              : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section
        style={{
          padding: "18px 20px",
          background: "#ffffff",
          border: "1px solid #dbe5f5",
          borderRadius: 16,
          boxShadow: "0 6px 18px rgba(15, 23, 42, 0.035)",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#08275c",
            fontSize: 21,
            fontWeight: 900,
          }}
        >
          Gerenciador de WhatsApps
        </h2>

        <div
          style={{
            marginTop: 3,
            color: "#667085",
            fontSize: 13,
          }}
        >
          Filtre e gerencie os números utilizados no tráfego pago.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.8fr 1fr 1.7fr",
            gap: 10,
            marginTop: 13,
            alignItems: "start",
          }}
        >
          <div
            style={{
              padding: "11px 12px",
              background: "#f8faff",
              border: "1px solid #e1e8f5",
              borderRadius: 10,
            }}
          >
            <strong
              style={{
                color: "#08275c",
                fontSize: 12,
                letterSpacing: "0.02em",
              }}
            >
              STATUS
            </strong>

            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              {[["ativo", "Ativo"], ["banido", "Banido - Em Análise"]].map(
                ([valor, titulo]) => (
                  <label
                    key={valor}
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      cursor: "pointer",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filtrosStatus.includes(valor)}
                      onChange={() =>
                        alternarFiltro(
                          valor,
                          filtrosStatus,
                          setFiltrosStatus,
                        )
                      }
                    />
                    {titulo}
                  </label>
                ),
              )}
            </div>
          </div>

          <div
            style={{
              padding: "11px 12px",
              background: "#f8faff",
              border: "1px solid #e1e8f5",
              borderRadius: 10,
            }}
          >
            <strong
              style={{
                color: "#08275c",
                fontSize: 12,
                letterSpacing: "0.02em",
              }}
            >
              TIPO DO NÚMERO
            </strong>

            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              {[
                ["oficial", "Oficial Meta"],
                ["nao_oficial", "Não Oficial"],
              ].map(([valor, titulo]) => (
                <label
                  key={valor}
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    cursor: "pointer",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={filtrosTipo.includes(valor)}
                    onChange={() =>
                      alternarFiltro(
                        valor,
                        filtrosTipo,
                        setFiltrosTipo,
                      )
                    }
                  />
                  {titulo}
                </label>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: "11px 12px",
              background: "#f8faff",
              border: "1px solid #e1e8f5",
              borderRadius: 10,
            }}
          >
            <strong
              style={{
                color: "#08275c",
                fontSize: 12,
                letterSpacing: "0.02em",
              }}
            >
              CONSULTOR(A)
            </strong>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                columnGap: 12,
                rowGap: 6,
                marginTop: 8,
              }}
            >
              {consultoresDisponiveis.map((consultor) => (
                <label
                  key={consultor}
                  style={{
                    display: "flex",
                    gap: 5,
                    alignItems: "center",
                    cursor: "pointer",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={filtrosConsultor.includes(consultor)}
                    onChange={() =>
                      alternarFiltro(
                        consultor,
                        filtrosConsultor,
                        setFiltrosConsultor,
                      )
                    }
                  />
                  {consultor}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: 10,
          }}
        >
          <div
            style={{
              color: "#667085",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Exibindo {numerosFiltrados.length} de{" "}
            {(dados?.numeros ?? []).length} número(s)
          </div>

          {(filtrosStatus.length > 0 ||
            filtrosTipo.length > 0 ||
            filtrosConsultor.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setFiltrosStatus([]);
                setFiltrosTipo([]);
                setFiltrosConsultor([]);
              }}
              style={{
                padding: "7px 11px",
                border: "1px solid #cddcff",
                borderRadius: 8,
                background: "#ffffff",
                color: "#155eef",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              LIMPAR FILTROS
            </button>
          )}
        </div>
      </section>

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

      {numerosFiltrados.map((item) => (
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

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                color: "#08275c",
                fontWeight: 800,
              }}
            >
              Mensagem que será enviada pelo cliente
            </label>

            <textarea
              value={formulario.mensagem}
              placeholder="Ex.: Olá, tudo bem?"
              onChange={(event) =>
                setFormulario((atual) => ({
                  ...atual,
                  mensagem: event.target.value,
                }))
              }
              maxLength={200}
              style={{
                width: "100%",
                minHeight: 80,
                padding: 13,
                resize: "vertical",
                border: "1px solid #cbd7f1",
                borderRadius: 9,
                fontFamily: "inherit",
                fontSize: 15,
                outline: "none",
              }}
            />

            <div
              style={{
                marginTop: 5,
                color: "#667085",
                fontSize: 12,
              }}
            >
              Esta mensagem aparecerá preenchida quando o cliente for
              direcionado para este WhatsApp.
            </div>
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
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "#08275c",
                    fontWeight: 800,
                  }}
                >
                  Mensagem que será enviada pelo cliente
                </label>

                <textarea
                  value={formEdicao.mensagem}
                  placeholder="Ex.: Olá, tudo bem?"
                  onChange={(event) =>
                    setFormEdicao((atual) => ({
                      ...atual,
                      mensagem: event.target.value,
                    }))
                  }
                  maxLength={200}
                  style={{
                    width: "100%",
                    minHeight: 80,
                    padding: 13,
                    resize: "vertical",
                    border: "1px solid #cbd7f1",
                    borderRadius: 9,
                    fontFamily: "inherit",
                    fontSize: 15,
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    marginTop: 5,
                    color: "#667085",
                    fontSize: 12,
                  }}
                >
                  Esta será a mensagem preenchida automaticamente quando
                  o cliente for direcionado para este WhatsApp.
                </div>
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