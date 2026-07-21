"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import "./clt.css";

type StatusClt =
  | "Novo lead"
  | "Em análise"
  | "Aguardando documentos"
  | "Digitado"
  | "Aprovado"
  | "Pago"
  | "Recusado";

type RegistroClt = {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  valorAprovado: number;
  parcela: number;
  banco: string;
  consultora: string;
  status: StatusClt;
  criadoEm: string;
  atualizadoEm: string;
};

type FormularioClt = {
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  valorAprovado: string;
  parcela: string;
  banco: string;
  consultora: string;
  status: StatusClt;
};

type PerfilAtual = {
  id: string;
  nome: string;
  perfil: string;
};

type RespostaClt = {
  registros?: RegistroClt[];
  registro?: RegistroClt;
  perfil?: PerfilAtual;
  mensagem?: string;
  erro?: string;
  encontradas?: number;
  importadas?: number;
  atualizadas?: number;
  ignoradas?: number;
  falhas?: number;
};

const STATUS: StatusClt[] = [
  "Novo lead",
  "Em análise",
  "Aguardando documentos",
  "Digitado",
  "Aprovado",
  "Pago",
  "Recusado",
];

function formularioVazio(): FormularioClt {
  return {
    nome: "",
    cpf: "",
    dataNascimento: "",
    telefone: "",
    valorAprovado: "",
    parcela: "",
    banco: "",
    consultora: "",
    status: "Novo lead",
  };
}

function apenasNumeros(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

function formatarCpf(valor: string) {
  const digitos = apenasNumeros(valor).slice(0, 11);

  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatarTelefone(valor: string) {
  const digitos = apenasNumeros(valor).slice(0, 11);

  if (digitos.length <= 10) {
    return digitos
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digitos
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function numero(valor: string) {
  const limpo = valor
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const convertido = Number(limpo);

  return Number.isFinite(convertido) ? convertido : 0;
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string) {
  if (!data) return "Não informada";

  const [ano, mes, dia] = data.slice(0, 10).split("-");

  if (!ano || !mes || !dia) return data;

  return `${dia}/${mes}/${ano}`;
}

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function perfilEhConsultora(perfil: string) {
  return normalizarTexto(perfil).includes("consultor");
}

function nomesCorrespondem(nomeA: string, nomeB: string) {
  const a = normalizarTexto(nomeA);
  const b = normalizarTexto(nomeB);

  if (!a || !b) return false;
  if (a === b) return true;

  const menor = a.length <= b.length ? a : b;
  const maior = a.length > b.length ? a : b;

  return menor.length >= 5 && maior.includes(menor);
}

function normalizarRegistro(
  item: Partial<RegistroClt> & Record<string, unknown>,
): RegistroClt {
  return {
    id: String(item.id || crypto.randomUUID()),
    nome: String(item.nome || ""),
    cpf: apenasNumeros(String(item.cpf || "")),
    dataNascimento: String(item.dataNascimento || item.nascimento || "").slice(
      0,
      10,
    ),
    telefone: apenasNumeros(String(item.telefone || "")),
    valorAprovado: Number(item.valorAprovado || 0),
    parcela: Number(item.parcela || 0),
    banco: String(item.banco || ""),
    consultora: String(item.consultora || ""),
    status: STATUS.includes(item.status as StatusClt)
      ? (item.status as StatusClt)
      : "Novo lead",
    criadoEm: String(item.criadoEm || ""),
    atualizadoEm: String(item.atualizadoEm || ""),
  };
}

function mesclarPorId(principais: RegistroClt[], adicionais: RegistroClt[]) {
  const ids = new Set(principais.map((item) => item.id));

  return [
    ...principais,
    ...adicionais.filter((item) => !ids.has(item.id)),
  ];
}

function chaveCpf(item: RegistroClt, nomePadrao = "") {
  const cpf = apenasNumeros(item.cpf);

  if (!cpf) return "";

  return `${normalizarTexto(item.consultora || nomePadrao)}|${cpf}`;
}

/*
 * Alguns navegadores antigos possuem linhas de modelo como CLT-001, CLT-002,
 * sem nenhum dado de cliente. Elas não devem aparecer como registros pendentes.
 * Registros parcialmente preenchidos continuam sendo preservados para conferência.
 */
function registroPossuiAlgumDado(item: RegistroClt) {
  return Boolean(
    String(item.nome || "").trim() ||
      apenasNumeros(String(item.cpf || "")) ||
      String(item.dataNascimento || "").trim() ||
      apenasNumeros(String(item.telefone || "")) ||
      Number(item.valorAprovado || 0) > 0 ||
      Number(item.parcela || 0) > 0 ||
      String(item.banco || "").trim(),
  );
}

export default function CltManager() {
  const supabase = useMemo(() => createClient(), []);

  const [registros, setRegistros] = useState<RegistroClt[]>([]);
  const [registrosAntigosPendentes, setRegistrosAntigosPendentes] = useState<
    RegistroClt[]
  >([]);
  const [consultoras, setConsultoras] = useState<string[]>([]);
  const [perfilAtual, setPerfilAtual] = useState<PerfilAtual | null>(null);
  const [form, setForm] = useState<FormularioClt>(formularioVazio());
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);

  function formularioLimpo(perfil = perfilAtual): FormularioClt {
    return {
      ...formularioVazio(),
      consultora:
        perfil && perfilEhConsultora(perfil.perfil) ? perfil.nome : "",
    };
  }

  async function obterSessaoAtual() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error("Sua sessão expirou. Entre novamente no sistema.");
    }

    return data.session;
  }

  async function chamarApiClt(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    body?: unknown,
  ) {
    const sessao = await obterSessaoAtual();

    const resposta = await fetch("/api/clt", {
      method,
      headers: {
        Authorization: `Bearer ${sessao.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const conteudo = (await resposta.json()) as RespostaClt;

    if (!resposta.ok) {
      throw new Error(conteudo.erro || "Não foi possível concluir a operação.");
    }

    return { conteudo, sessao };
  }

  function lerListaLocal(chave: string) {
    const salvo = localStorage.getItem(chave);

    if (!salvo) return [] as RegistroClt[];

    try {
      const lista = JSON.parse(salvo);

      return Array.isArray(lista)
        ? lista.map((item) => normalizarRegistro(item))
        : [];
    } catch {
      return [] as RegistroClt[];
    }
  }

  function localizarPendentes(
    origem: RegistroClt[],
    listaSupabase: RegistroClt[],
    perfil: PerfilAtual,
  ) {
    if (!perfilEhConsultora(perfil.perfil)) return [] as RegistroClt[];

    const candidatos = origem.filter(
      (item) =>
        registroPossuiAlgumDado(item) &&
        (!item.consultora.trim() ||
          nomesCorrespondem(item.consultora, perfil.nome)),
    );

    const idsSupabase = new Set(listaSupabase.map((item) => item.id));
    const cpfsSupabase = new Set(
      listaSupabase.map((item) => chaveCpf(item, perfil.nome)).filter(Boolean),
    );
    const idsIncluidos = new Set<string>();
    const cpfsIncluidos = new Set<string>();

    return candidatos.filter((item) => {
      const chave = chaveCpf(item, perfil.nome);

      if (idsSupabase.has(item.id) || idsIncluidos.has(item.id)) return false;
      if (chave && (cpfsSupabase.has(chave) || cpfsIncluidos.has(chave))) {
        return false;
      }

      idsIncluidos.add(item.id);
      if (chave) cpfsIncluidos.add(chave);
      return true;
    });
  }

  async function carregarRegistrosDoSupabase() {
    setCarregando(true);

    try {
      const listaLocalAtual = lerListaLocal("somos-eleva-clt");
      const { conteudo, sessao } = await chamarApiClt("GET");
      const perfil = conteudo.perfil || null;
      const listaSupabase = Array.isArray(conteudo.registros)
        ? conteudo.registros.map((item) => normalizarRegistro(item))
        : [];

      setPerfilAtual(perfil);

      if (perfil && perfilEhConsultora(perfil.perfil)) {
        setForm((atual) => ({ ...atual, consultora: perfil.nome }));
      }

      let pendentes: RegistroClt[] = [];

      if (perfil) {
        const chaveBackup = `somos-eleva-clt-backup-migracao-v1-${sessao.user.id}`;
        const chaveImportacao = `somos-eleva-clt-importados-supabase-v1-${sessao.user.id}`;
        const backupExistente = lerListaLocal(chaveBackup);
        const origemCompleta = mesclarPorId(listaLocalAtual, backupExistente);

        if (origemCompleta.length) {
          localStorage.setItem(chaveBackup, JSON.stringify(origemCompleta));
        }

        const importacaoConcluida =
          localStorage.getItem(chaveImportacao) === "sim";

        if (!importacaoConcluida) {
          pendentes = localizarPendentes(origemCompleta, listaSupabase, perfil);
        }
      }

      setRegistrosAntigosPendentes(pendentes);
      setRegistros(mesclarPorId(listaSupabase, pendentes));

      if (!pendentes.length) {
        localStorage.setItem("somos-eleva-clt", JSON.stringify(listaSupabase));
      }
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar os registros CLT.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarRegistrosDoSupabase();
  }, [supabase]);

  useEffect(() => {
    let componenteAtivo = true;

    async function carregarConsultoras() {
      try {
        const sessao = await obterSessaoAtual();
        const resposta = await fetch("/api/consultoras", {
          method: "GET",
          headers: { Authorization: `Bearer ${sessao.access_token}` },
          cache: "no-store",
        });
        const conteudo = (await resposta.json()) as {
          consultoras?: Array<{ nome?: string }>;
          erro?: string;
        };

        if (!resposta.ok) {
          throw new Error(
            conteudo.erro || "Não foi possível carregar as consultoras.",
          );
        }

        const nomes = (conteudo.consultoras || [])
          .map((consultora) => String(consultora.nome || "").trim())
          .filter(Boolean);

        if (componenteAtivo) {
          setConsultoras(
            Array.from(new Set(nomes)).sort((a, b) =>
              a.localeCompare(b, "pt-BR"),
            ),
          );
        }
      } catch {
        if (componenteAtivo) setConsultoras([]);
      }
    }

    void carregarConsultoras();

    return () => {
      componenteAtivo = false;
    };
  }, [supabase]);

  const idsPendentes = useMemo(
    () => new Set(registrosAntigosPendentes.map((item) => item.id)),
    [registrosAntigosPendentes],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const numerico = apenasNumeros(busca);

    return registros.filter((item) => {
      const statusOk =
        filtroStatus === "Todos" || item.status === filtroStatus;
      const buscaOk =
        !termo ||
        item.nome.toLowerCase().includes(termo) ||
        item.cpf.includes(numerico) ||
        item.telefone.includes(numerico) ||
        item.consultora.toLowerCase().includes(termo) ||
        item.banco.toLowerCase().includes(termo);

      return statusOk && buscaOk;
    });
  }, [registros, busca, filtroStatus]);

  const resumo = useMemo(
    () => ({
      total: registros.length,
      analise: registros.filter((item) => item.status === "Em análise").length,
      aprovados: registros.filter((item) => item.status === "Aprovado").length,
      pagos: registros.filter((item) => item.status === "Pago").length,
      valorPago: registros
        .filter((item) => item.status === "Pago")
        .reduce(
          (total, item) => total + Number(item.valorAprovado || 0),
          0,
        ),
    }),
    [registros],
  );

  async function sincronizarRegistrosAntigos() {
    if (!registrosAntigosPendentes.length || !perfilAtual) return;

    const confirmar = window.confirm(
      `Encontramos ${registrosAntigosPendentes.length} registro(s) CLT antigo(s) neste navegador. Confirme somente se eles pertencem à usuária ${perfilAtual.nome}.`,
    );

    if (!confirmar) return;

    setProcessando(true);
    setMensagem("");

    try {
      const { conteudo, sessao } = await chamarApiClt("POST", {
        acao: "importar_local",
        registros: registrosAntigosPendentes,
      });

      const falhas = Number(conteudo.falhas || 0);

      if (falhas === 0) {
        const chaveImportacao = `somos-eleva-clt-importados-supabase-v1-${sessao.user.id}`;
        localStorage.setItem(chaveImportacao, "sim");
      }

      await carregarRegistrosDoSupabase();

      setMensagem(
        `${Number(conteudo.encontradas || 0)} encontrada(s) • ${Number(
          conteudo.importadas || 0,
        )} importada(s) • ${Number(
          conteudo.atualizadas || 0,
        )} atualizada(s) • ${Number(
          conteudo.ignoradas || 0,
        )} já existente(s)${falhas ? ` • ${falhas} com falha` : ""}.`,
      );
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível sincronizar os registros antigos.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem("");

    if (!form.nome.trim()) {
      setMensagem("Informe o nome completo.");
      return;
    }

    const cpf = apenasNumeros(form.cpf);

    if (cpf.length !== 11) {
      setMensagem("O CPF precisa ter 11 números.");
      return;
    }

    if (!form.dataNascimento) {
      setMensagem("Informe a data de nascimento.");
      return;
    }

    const telefone = apenasNumeros(form.telefone);

    if (telefone.length < 10 || telefone.length > 11) {
      setMensagem("Informe um número de telefone válido.");
      return;
    }

    const valorAprovado = numero(form.valorAprovado);

    if (valorAprovado <= 0) {
      setMensagem("Informe o valor aprovado.");
      return;
    }

    const parcela = numero(form.parcela);

    if (parcela <= 0) {
      setMensagem("Informe o valor da parcela.");
      return;
    }

    if (!form.banco.trim()) {
      setMensagem("Informe o banco.");
      return;
    }

    const consultoraResponsavel =
      perfilAtual && perfilEhConsultora(perfilAtual.perfil)
        ? perfilAtual.nome
        : form.consultora.trim();

    if (!consultoraResponsavel) {
      setMensagem("Informe a consultora.");
      return;
    }

    const duplicado = registros.some(
      (item) =>
        item.id !== editandoId &&
        item.cpf === cpf &&
        nomesCorrespondem(item.consultora, consultoraResponsavel),
    );

    if (duplicado) {
      setMensagem("Já existe um registro CLT com esse CPF para essa consultora.");
      return;
    }

    const agora = new Date().toLocaleString("pt-BR");
    const antigo = registros.find((item) => item.id === editandoId);
    const registro: RegistroClt = {
      id: editandoId || crypto.randomUUID(),
      nome: form.nome.trim(),
      cpf,
      dataNascimento: form.dataNascimento,
      telefone,
      valorAprovado,
      parcela,
      banco: form.banco.trim(),
      consultora: consultoraResponsavel,
      status: form.status,
      criadoEm: antigo?.criadoEm || agora,
      atualizadoEm: agora,
    };
    const estavaEditando = Boolean(editandoId);

    setProcessando(true);

    try {
      await chamarApiClt(estavaEditando ? "PATCH" : "POST", { registro });
      await carregarRegistrosDoSupabase();
      setForm(formularioLimpo(perfilAtual));
      setEditandoId(null);
      setMensagem(
        estavaEditando
          ? "Registro atualizado com sucesso."
          : "Cliente CLT cadastrado com sucesso.",
      );
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar o registro CLT.",
      );
    } finally {
      setProcessando(false);
    }
  }

  function editar(item: RegistroClt) {
    if (idsPendentes.has(item.id)) {
      setMensagem("Sincronize os registros antigos antes de editar este cliente.");
      return;
    }

    setEditandoId(item.id);
    setForm({
      nome: item.nome,
      cpf: formatarCpf(item.cpf),
      dataNascimento: item.dataNascimento || "",
      telefone: formatarTelefone(item.telefone),
      valorAprovado: item.valorAprovado
        ? item.valorAprovado.toFixed(2).replace(".", ",")
        : "",
      parcela: item.parcela
        ? item.parcela.toFixed(2).replace(".", ",")
        : "",
      banco: item.banco,
      consultora: item.consultora,
      status: item.status,
    });
    setMensagem("Editando registro selecionado.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluir(id: string) {
    if (idsPendentes.has(id)) {
      setMensagem("Sincronize os registros antigos antes de excluir este cliente.");
      return;
    }

    if (!window.confirm("Deseja excluir este registro CLT?")) return;

    setProcessando(true);
    setMensagem("");

    try {
      await chamarApiClt("DELETE", { id });
      await carregarRegistrosDoSupabase();

      if (editandoId === id) {
        setEditandoId(null);
        setForm(formularioLimpo(perfilAtual));
      }

      setMensagem("Registro CLT excluído com sucesso.");
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir o registro CLT.",
      );
    } finally {
      setProcessando(false);
    }
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(formularioLimpo(perfilAtual));
    setMensagem("");
  }

  const usuarioEhConsultora = Boolean(
    perfilAtual && perfilEhConsultora(perfilAtual.perfil),
  );

  return (
    <div className="clt-page">
      {usuarioEhConsultora && registrosAntigosPendentes.length > 0 && (
        <section
          className="clt-help"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <span>
            <strong>{registrosAntigosPendentes.length} registros antigos encontrados.</strong>{" "}
            Um backup foi criado neste navegador. Clique para enviar tudo ao
            Supabase sem recadastrar.
          </span>

          <button
            type="button"
            onClick={sincronizarRegistrosAntigos}
            disabled={processando}
            style={{
              border: 0,
              borderRadius: 10,
              padding: "12px 18px",
              fontWeight: 800,
              cursor: processando ? "wait" : "pointer",
            }}
          >
            {processando ? "Sincronizando..." : "Sincronizar registros antigos"}
          </button>
        </section>
      )}

      <section className="clt-summary">
        <article>
          <span>Total de registros</span>
          <strong>{resumo.total}</strong>
        </article>
        <article>
          <span>Em análise</span>
          <strong>{resumo.analise}</strong>
        </article>
        <article>
          <span>Aprovados</span>
          <strong>{resumo.aprovados}</strong>
        </article>
        <article>
          <span>Pagos</span>
          <strong>{resumo.pagos}</strong>
        </article>
        <article className="clt-highlight">
          <span>Valor pago</span>
          <strong>{moeda(resumo.valorPago)}</strong>
        </article>
      </section>

      <section className="clt-layout">
        <form className="clt-card" onSubmit={salvar}>
          <div className="clt-heading">
            <div>
              <span>{editandoId ? "EDITAR REGISTRO" : "NOVO CLIENTE CLT"}</span>
              <h2>{editandoId ? "Atualizar análise" : "Cadastrar análise"}</h2>
              <p>Cadastre os dados essenciais da operação CLT.</p>
            </div>
            <b>CLT</b>
          </div>

          <div className="clt-form-grid">
            <label>
              Nome completo
              <input
                value={form.nome}
                disabled={processando}
                onChange={(event) =>
                  setForm({ ...form, nome: event.target.value })
                }
                placeholder="Nome do cliente"
              />
            </label>

            <label>
              CPF
              <input
                value={form.cpf}
                disabled={processando}
                onChange={(event) =>
                  setForm({ ...form, cpf: formatarCpf(event.target.value) })
                }
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </label>

            <label>
              Data de nascimento
              <input
                type="date"
                value={form.dataNascimento}
                disabled={processando}
                onChange={(event) =>
                  setForm({ ...form, dataNascimento: event.target.value })
                }
              />
            </label>

            <label>
              Número de telefone
              <input
                value={form.telefone}
                disabled={processando}
                onChange={(event) =>
                  setForm({
                    ...form,
                    telefone: formatarTelefone(event.target.value),
                  })
                }
                placeholder="(62) 99999-9999"
                inputMode="numeric"
              />
            </label>

            <label>
              Valor aprovado
              <input
                value={form.valorAprovado}
                disabled={processando}
                onChange={(event) =>
                  setForm({ ...form, valorAprovado: event.target.value })
                }
                placeholder="Ex.: 8.500,00"
                inputMode="decimal"
              />
            </label>

            <label>
              Parcela
              <input
                value={form.parcela}
                disabled={processando}
                onChange={(event) =>
                  setForm({ ...form, parcela: event.target.value })
                }
                placeholder="Ex.: 450,00"
                inputMode="decimal"
              />
            </label>

            <label>
              Banco
              <input
                value={form.banco}
                disabled={processando}
                onChange={(event) =>
                  setForm({ ...form, banco: event.target.value })
                }
                placeholder="Ex.: C6"
              />
            </label>

            <label>
              Consultora
              <select
                value={form.consultora}
                disabled={processando || usuarioEhConsultora}
                onChange={(event) =>
                  setForm({ ...form, consultora: event.target.value })
                }
              >
                <option value="">Selecione a consultora</option>
                {form.consultora && !consultoras.includes(form.consultora) && (
                  <option value={form.consultora}>{form.consultora}</option>
                )}
                {consultoras.map((consultora) => (
                  <option key={consultora} value={consultora}>
                    {consultora}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select
                value={form.status}
                disabled={processando}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as StatusClt,
                  })
                }
              >
                {STATUS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>

          {mensagem && <div className="clt-message">{mensagem}</div>}

          <div className="clt-actions">
            {editandoId && (
              <button
                type="button"
                className="cancel"
                disabled={processando}
                onClick={cancelarEdicao}
              >
                Cancelar
              </button>
            )}
            <button type="submit" className="save" disabled={processando}>
              {processando
                ? "Aguarde..."
                : editandoId
                  ? "Atualizar registro"
                  : "Salvar registro"}
            </button>
          </div>
        </form>

        <section className="clt-card">
          <div className="clt-list-heading">
            <div>
              <span>CARTEIRA CLT</span>
              <h2>Clientes e análises</h2>
            </div>
            <b>{filtrados.length}</b>
          </div>

          <div className="clt-filters">
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar cliente, CPF, telefone, banco ou consultora"
            />
            <select
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
            >
              <option>Todos</option>
              {STATUS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          {carregando ? (
            <div className="clt-empty">
              <div>◌</div>
              <strong>Carregando registros CLT...</strong>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="clt-empty">
              <div>▣</div>
              <strong>Nenhum registro CLT</strong>
              <p>Cadastre o primeiro cliente.</p>
            </div>
          ) : (
            <div className="clt-list">
              {filtrados.map((item) => {
                const pendente = idsPendentes.has(item.id);

                return (
                  <article key={item.id}>
                    <div className="clt-item-top">
                      <div>
                        <strong>{item.nome}</strong>
                        <span>
                          {item.cpf ? formatarCpf(item.cpf) : "CPF não informado"}{" "}
                          • Nascimento: {formatarData(item.dataNascimento)}
                          {pendente ? " • Aguardando sincronização" : ""}
                        </span>
                      </div>
                      <span
                        className={`clt-status status-${item.status
                          .toLowerCase()
                          .replace(/\s/g, "-")
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="clt-values">
                      <div>
                        <small>Telefone</small>
                        <b>
                          {item.telefone
                            ? formatarTelefone(item.telefone)
                            : "Não informado"}
                        </b>
                      </div>
                      <div>
                        <small>Valor aprovado</small>
                        <b>{moeda(item.valorAprovado)}</b>
                      </div>
                      <div>
                        <small>Parcela</small>
                        <b>{moeda(item.parcela)}</b>
                      </div>
                      <div>
                        <small>Banco</small>
                        <b>{item.banco || "Não informado"}</b>
                      </div>
                    </div>

                    <footer>
                      <span>
                        {item.consultora || "Sem consultora"} • Atualizado em{" "}
                        {item.atualizadoEm || "Não informado"}
                      </span>
                      <div>
                        <button
                          type="button"
                          disabled={processando || pendente}
                          onClick={() => editar(item)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="delete"
                          disabled={processando || pendente}
                          onClick={() => excluir(item.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <section className="clt-help">
        <strong>Cadastro CLT:</strong>
        <span>
          acompanhe cada cliente pelo status da análise e pelo valor aprovado.
        </span>
      </section>
    </div>
  );
}