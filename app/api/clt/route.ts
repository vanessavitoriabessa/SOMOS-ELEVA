import { NextRequest, NextResponse } from "next/server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  bancosCltCorrespondem,
  ehTabelaClt,
  prazoTabelaCompativel,
  tabelaCltPublica,
  type TabelaCltOpcao,
} from "@/lib/clt/tabelas";

export const dynamic = "force-dynamic";

const STATUS = [

  "Novo lead",

  "Em análise",

  "Aguardando documentos",

  "Digitado",

  "Aprovado",

  "Pago",

  "Cancelado",

  "Recusado",

] as const;

type StatusClt = (typeof STATUS)[number];

type Perfil = {

  id: string;

  nome: string;

  perfil: string;

  equipe?: string | null;

  time_id?: string | null;

  ativo: boolean;

};

type RegistroRecebido = {

  id?: string;

  nome?: string;

  cpf?: string;

  dataNascimento?: string;

  nascimento?: string;

  dataPagamento?: string;

  telefone?: string;

  valorAprovado?: number;

  parcela?: number;

  prazo?: number;

  banco?: string;

  tabelaBancoId?: string | null;

  consultora?: string;

  status?: string;

  criadoEm?: string;

  atualizadoEm?: string;

};

type LinhaClt = {

  id: string;

  nome: string;

  cpf: string;

  data_nascimento: string | null;

  data_pagamento: string | null;

  telefone: string;

  valor_aprovado: number | string;

  prazo: number | string;

  parcela: number | string;

  banco: string;

  tabela_banco_id: string | null;

  consultora_id: string | null;

  consultora: string;

  status: string;

  criado_por: string | null;

  criado_em: string;

  atualizado_em: string;

};

function respostaErro(erro: string, status: number) {

  return NextResponse.json({ erro }, { status });

}

function normalizarTexto(valor: unknown) {

  return String(valor || "")

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .trim()

    .toLowerCase();

}

function apenasNumeros(valor: unknown) {

  return String(valor || "").replace(/\D/g, "");

}

function numeroSeguro(valor: unknown) {

  const numero = Number(valor || 0);

  return Number.isFinite(numero) ? numero : 0;

}

function dataSegura(valor: unknown) {

  const texto = String(valor || "").trim();

  if (!texto) return null;

  const encontrada = texto.match(/^\d{4}-\d{2}-\d{2}/);

  return encontrada ? encontrada[0] : null;

}

function dataHoraSegura(valor: unknown, fallback = new Date().toISOString()) {

  const texto = String(valor || "").trim();

  if (!texto) return fallback;

  const direta = new Date(texto);

  if (!Number.isNaN(direta.getTime())) {

    return direta.toISOString();

  }

  const brasileira = texto.match(

    /^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/,

  );

  if (!brasileira) return fallback;

  const [, dia, mes, ano, hora = "00", minuto = "00", segundo = "00"] =

    brasileira;

  const convertida = new Date(

    `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}-03:00`,

  );

  return Number.isNaN(convertida.getTime()) ? fallback : convertida.toISOString();

}

function formatarDataHora(valor: unknown) {

  const texto = String(valor || "").trim();

  if (!texto) return "";

  const data = new Date(texto);

  if (Number.isNaN(data.getTime())) return texto;

  return new Intl.DateTimeFormat("pt-BR", {

    dateStyle: "short",

    timeStyle: "medium",

    timeZone: "America/Sao_Paulo",

  }).format(data);

}

function statusSeguro(valor: unknown): StatusClt {

  const texto = String(valor || "") as StatusClt;

  return STATUS.includes(texto) ? texto : "Novo lead";

}

function perfilEhConsultora(perfil: string) {

  return normalizarTexto(perfil).includes("consultor");

}

function perfilEhSupervisora(perfil: string) {

  return normalizarTexto(perfil).includes("supervisor");

}

async function idsConsultorasDoTime(

  supabase: ReturnType<typeof createAdminClient>,

  perfil: Perfil,

) {

  if (!perfil.time_id) return [] as string[];

  const { data, error } = await supabase

    .from("profiles")

    .select("id, perfil, ativo, time_id")

    .eq("ativo", true)

    .eq("time_id", perfil.time_id);

  if (error) {

    throw new Error(`Não foi possível identificar as consultoras do time: ${error.message}`);

  }

  return (data || [])

    .filter((item) => perfilEhConsultora(String(item.perfil || "")))

    .map((item) => String(item.id))

    .filter(Boolean);

}

function nomesCorrespondem(nomeA: unknown, nomeB: unknown) {

  const a = normalizarTexto(nomeA);

  const b = normalizarTexto(nomeB);

  if (!a || !b) return false;

  if (a === b) return true;

  const menor = a.length <= b.length ? a : b;

  const maior = a.length > b.length ? a : b;

  return menor.length >= 5 && maior.includes(menor);

}

function perfilPodeAcessar(perfil: string) {

  return [

    "administradora",

    "coordenadora",

    "supervisora",

    "operacional",

    "financeiro",

    "consultora",

    "rh",

  ].includes(normalizarTexto(perfil));

}

function linhaParaRegistro(linha: LinhaClt, tabela?: TabelaCltOpcao) {

  return {

    id: String(linha.id),

    nome: String(linha.nome || ""),

    cpf: apenasNumeros(linha.cpf),

    dataNascimento: String(linha.data_nascimento || ""),

    dataPagamento: String(linha.data_pagamento || ""),

    telefone: apenasNumeros(linha.telefone),

    valorAprovado: numeroSeguro(linha.valor_aprovado),

    parcela: numeroSeguro(linha.parcela),

    prazo: numeroSeguro(linha.prazo),

    banco: String(linha.banco || ""),
    tabelaBancoId: linha.tabela_banco_id || null,
    tabela: tabela?.nome || "",
    tabelaCodigo: tabela?.codigo || "",
    tabelaPrazo: tabela?.prazo ?? null,
    tabelaAtiva: tabela?.ativo ?? false,
    tabelaEncontrada: Boolean(tabela),

    consultora: String(linha.consultora || ""),

    status: statusSeguro(linha.status),

    criadoEm: formatarDataHora(linha.criado_em),

    atualizadoEm: formatarDataHora(linha.atualizado_em),

  };

}

async function autenticar(request: NextRequest) {

  const autorizacao = request.headers.get("authorization");

  if (!autorizacao || !autorizacao.startsWith("Bearer ")) {

    return {

      resposta: respostaErro("Você precisa estar autenticada.", 401),

    };

  }

  const token = autorizacao.replace("Bearer ", "").trim();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey =

    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||

    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {

    return {

      resposta: respostaErro(

        "A conexão com o Supabase não foi configurada.",

        500,

      ),

    };

  }

  const verificador = createSupabaseClient(supabaseUrl, publishableKey, {

    auth: {

      autoRefreshToken: false,

      persistSession: false,

      detectSessionInUrl: false,

    },

  });

  const { data: dadosAutenticacao, error: erroAutenticacao } =

    await verificador.auth.getUser(token);

  if (erroAutenticacao || !dadosAutenticacao.user) {

    return {

      resposta: respostaErro("Sua sessão não é válida. Entre novamente.", 401),

    };

  }

  const supabase = createAdminClient();

  const { data: perfil, error: erroPerfil } = await supabase

  .from("profiles")

  .select("id, nome, perfil, equipe, time_id, ativo")

  .eq("id", dadosAutenticacao.user.id)

  .maybeSingle();

if (erroPerfil) {

  console.error("Erro ao buscar profile:", erroPerfil);

  return {

    resposta: respostaErro(

      `Erro ao buscar profile: ${erroPerfil.message}`,

      500

    ),

  };

}

if (!perfil) {

  console.error("Usuário autenticado:", dadosAutenticacao.user.id);

  return {

    resposta: respostaErro(

      `Profile não encontrado para o usuário ${dadosAutenticacao.user.id}`,

      404

    ),

  };

}

  const perfilAtual = perfil as Perfil;

  if (!perfilAtual.ativo || !perfilPodeAcessar(perfilAtual.perfil)) {

    return {

      resposta: respostaErro("Seu perfil não possui acesso ao módulo CLT.", 403),

    };

  }

  return {

    supabase,

    perfil: perfilAtual,

  };

}

async function listarConsultoras(

  supabase: ReturnType<typeof createAdminClient>,

) {

  const { data, error } = await supabase

    .from("profiles")

    .select("id, nome, perfil, ativo");

  if (error) {

    throw new Error("Não foi possível consultar as consultoras.");

  }

  return (data || []).filter((perfil) =>

    perfilEhConsultora(String(perfil.perfil || "")),

  ) as Perfil[];

}

function encontrarConsultora(consultoras: Perfil[], nome: string) {

  return consultoras.find((consultora) =>

    nomesCorrespondem(consultora.nome, nome),

  );

}

function podeAlterarRegistro(perfil: Perfil, linha: LinhaClt) {

  if (!perfilEhConsultora(perfil.perfil)) return true;

  return (

    linha.consultora_id === perfil.id ||

    nomesCorrespondem(linha.consultora, perfil.nome)

  );

}

// Somente metadados: nenhum percentual financeiro é consultado ou enviado por este fluxo.
const COLUNAS_TABELA_CLT = "id, banco, nome, codigo, prazo, orgao_convenio, ativo";

async function carregarCatalogoTabelasClt(supabase: ReturnType<typeof createAdminClient>) {
  const tabelas: TabelaCltOpcao[] = [];
  const tamanho = 1000;
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error } = await supabase
      .from("config_tabelas")
      .select(COLUNAS_TABELA_CLT)
      .eq("ativo", true)
      .order("id", { ascending: true })
      .range(inicio, inicio + tamanho - 1);
    if (error) throw new Error(`Não foi possível carregar as tabelas CLT: ${error.message}`);
    const pagina = (data || []) as unknown as Record<string, unknown>[];
    tabelas.push(...pagina.map(tabelaCltPublica).filter((tabela) => ehTabelaClt(tabela.orgaoConvenio)));
    if (pagina.length < tamanho) break;
  }
  return tabelas.sort((a, b) =>
    a.banco.localeCompare(b.banco, "pt-BR") ||
    a.nome.localeCompare(b.nome, "pt-BR") ||
    Number(a.prazo || 0) - Number(b.prazo || 0),
  );
}

async function carregarMapaTabelasClt(
  supabase: ReturnType<typeof createAdminClient>,
  linhas: LinhaClt[],
): Promise<Map<string, TabelaCltOpcao>> {
  const ids = Array.from(new Set(linhas.map((linha) => linha.tabela_banco_id).filter(Boolean))) as string[];
  const mapa = new Map<string, TabelaCltOpcao>();
  // Inclui inativas já vinculadas, sem oferecê-las para novos vínculos.
  for (let inicio = 0; inicio < ids.length; inicio += 100) {
    const { data, error } = await supabase
      .from("config_tabelas")
      .select(COLUNAS_TABELA_CLT)
      .in("id", ids.slice(inicio, inicio + 100));
    if (error) throw new Error(`Não foi possível ler as tabelas vinculadas: ${error.message}`);
    for (const item of (data || []) as unknown as Record<string, unknown>[]) {
      const tabela = tabelaCltPublica(item);
      mapa.set(tabela.id, tabela);
    }
  }
  return mapa;
}

function idTabelaRecebido(registro: RegistroRecebido, anterior?: LinhaClt): string | null {
  // Cliente antigo da API que não envia este campo NÃO apaga o vínculo existente.
  if (!Object.prototype.hasOwnProperty.call(registro, "tabelaBancoId")) {
    return anterior?.tabela_banco_id || null;
  }
  if (registro.tabelaBancoId === null || registro.tabelaBancoId === "") return null;
  if (typeof registro.tabelaBancoId !== "string") throw new Error("Selecione uma tabela válida.");
  const id = registro.tabelaBancoId.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("O identificador da tabela bancária é inválido.");
  }
  return id;
}

async function validarVinculoTabelaClt(
  supabase: ReturnType<typeof createAdminClient>,
  banco: string,
  prazo: number,
  id: string | null,
  anterior?: LinhaClt,
): Promise<void> {
  // Não há inferência por banco/prazo. Sem escolha explícita, permanece sem tabela.
  if (!id) return;
  const { data, error } = await supabase
    .from("config_tabelas")
    .select(COLUNAS_TABELA_CLT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível validar a tabela: ${error.message}`);
  if (!data) throw new Error("A tabela selecionada não foi encontrada.");
  const tabela = tabelaCltPublica(data as unknown as Record<string, unknown>);
  if (!ehTabelaClt(tabela.orgaoConvenio)) throw new Error("Selecione uma tabela do produto CLT.");
  if (!bancosCltCorrespondem(tabela.banco, banco)) {
    throw new Error("A tabela selecionada não pertence ao banco deste contrato.");
  }
  if (!prazoTabelaCompativel(tabela.prazo, prazo)) {
    throw new Error("O prazo do contrato não corresponde ao prazo da tabela selecionada.");
  }
  if (!tabela.ativo && anterior?.tabela_banco_id !== id) {
    throw new Error("Esta tabela está inativa. Selecione uma tabela ativa.");
  }
}

async function podeAlterarRegistroSeguro(
  supabase: ReturnType<typeof createAdminClient>,
  perfil: Perfil,
  linha: LinhaClt,
): Promise<boolean> {
  if (!podeAlterarRegistro(perfil, linha)) return false;
  if (!perfilEhSupervisora(perfil.perfil)) return true;
  const ids = await idsConsultorasDoTime(supabase, perfil);
  return Boolean(linha.consultora_id) && ids.includes(String(linha.consultora_id));
}

async function registroComTabela(
  supabase: ReturnType<typeof createAdminClient>,
  linha: LinhaClt,
) {
  const mapa = await carregarMapaTabelasClt(supabase, [linha]);
  return linhaParaRegistro(linha, mapa.get(linha.tabela_banco_id || ""));
}

async function carregarTodosRegistrosClt(

  supabase: ReturnType<typeof createAdminClient>,

) {

  const tamanhoPagina = 1000;

  const todos: LinhaClt[] = [];

  let inicio = 0;

  while (true) {

    const fim = inicio + tamanhoPagina - 1;

    const { data, error } = await supabase

      .from("clt_registros")

      .select(

        `

        id,

        nome,

        cpf,

        data_nascimento,

        data_pagamento,

        telefone,

        valor_aprovado,

        parcela,

        prazo,

        banco,

        tabela_banco_id,

        consultora_id,

        consultora,

        status,

        criado_por,

        criado_em,

        atualizado_em

      `,

      )

      .order("atualizado_em", { ascending: false })

      .range(inicio, fim);

    if (error) {

      throw new Error(

        `Não foi possível carregar os registros CLT: ${error.message}`,

      );

    }

    const pagina = (data || []) as LinhaClt[];

    todos.push(...pagina);

    if (pagina.length < tamanhoPagina) {

      break;

    }

    inicio += tamanhoPagina;

  }

  return todos;

}

async function montarLinha(

  supabase: ReturnType<typeof createAdminClient>,

  perfil: Perfil,

  registro: RegistroRecebido,

  opcoes?: {

    consultoras?: Perfil[];

    importacao?: boolean;

    existente?: LinhaClt;

  },

): Promise<LinhaClt> {

  const consultoras =

    opcoes?.consultoras || (await listarConsultoras(supabase));

  const nomeRecebido = String(registro.consultora || "").trim();

  if (

    opcoes?.importacao &&

    perfilEhConsultora(perfil.perfil) &&

    nomeRecebido &&

    !nomesCorrespondem(nomeRecebido, perfil.nome)

  ) {

    throw new Error("Registro pertence a outra consultora.");

  }

  const nomeConsultora = perfilEhConsultora(perfil.perfil)

    ? perfil.nome

    : nomeRecebido;

  if (!nomeConsultora) {

    throw new Error("Selecione a consultora responsável.");

  }

  const consultora = perfilEhConsultora(perfil.perfil)

    ? perfil

    : encontrarConsultora(consultoras, nomeConsultora);

  if (!consultora && !opcoes?.importacao) {

    throw new Error("A consultora selecionada não foi encontrada.");

  }

  if (consultora && !consultora.ativo && !opcoes?.importacao) {

    throw new Error("A consultora selecionada está inativa.");

  }

  const id = String(registro.id || crypto.randomUUID()).trim();

  const nome = String(registro.nome || "").trim();

  const cpf = apenasNumeros(registro.cpf);

  const telefone = apenasNumeros(registro.telefone);

  const dataNascimento = dataSegura(

    registro.dataNascimento || registro.nascimento,

  );

  const status = statusSeguro(registro.status);

const dataPagamento = dataSegura(registro.dataPagamento);

  const valorAprovado = numeroSeguro(registro.valorAprovado);

  const parcela = numeroSeguro(registro.parcela);

  const prazo = numeroSeguro(registro.prazo);

  const banco = String(registro.banco || "").trim();
  // Backups antigos normalizados no navegador podem enviar null. A importação
  // não desfaz uma conferência de tabela já feita; remoção exige edição explícita.
  const registroParaVinculo = opcoes?.importacao && opcoes.existente?.tabela_banco_id &&
    (registro.tabelaBancoId == null || registro.tabelaBancoId === "")
      ? { ...registro, tabelaBancoId: opcoes.existente.tabela_banco_id }
      : registro;
  const tabelaBancoId = idTabelaRecebido(registroParaVinculo, opcoes?.existente);
  await validarVinculoTabelaClt(supabase, banco, prazo, tabelaBancoId, opcoes?.existente);

  if (!nome) throw new Error("Informe o nome completo.");

  if (cpf.length !== 11) throw new Error("O CPF precisa ter 11 números.");

  if (!dataNascimento) throw new Error("Informe a data de nascimento.");

  if (telefone.length < 10 || telefone.length > 11) {

    throw new Error("Informe um número de telefone válido.");

  }

  if (valorAprovado <= 0) throw new Error("Informe o valor aprovado.");

  if (parcela <= 0) throw new Error("Informe o valor da parcela.");

  if (prazo <= 0) throw new Error("Informe o prazo em meses.");

  if (!banco) throw new Error("Informe o banco.");

if (status === "Pago" && !dataPagamento) {

  throw new Error("Informe a data do pagamento.");

}

const agora = new Date().toISOString();

  return {

  id,

  nome,

  cpf,

  data_nascimento: dataNascimento,

  data_pagamento: status === "Pago" ? dataPagamento : null,

  telefone,

    valor_aprovado: valorAprovado,

    parcela,

    prazo,

    banco,

    tabela_banco_id: tabelaBancoId,

    consultora_id: consultora?.id || null,

consultora: consultora?.nome || nomeConsultora,

status,

criado_por: perfil.id,

criado_em: dataHoraSegura(registro.criadoEm, agora),

atualizado_em: dataHoraSegura(registro.atualizadoEm, agora),

  };

}

export async function GET(request: NextRequest) {

  try {

    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) return autenticacao.resposta;

    const { supabase, perfil } = autenticacao;

    if (request.nextUrl.searchParams.get("modo") === "tabelas") {
      const [tabelas, respostaBancos] = await Promise.all([
        carregarCatalogoTabelasClt(supabase),
        supabase.from("config_bancos").select("id, nome, ativo").eq("ativo", true).order("nome"),
      ]);
      if (respostaBancos.error) {
        throw new Error(`Não foi possível carregar os bancos: ${respostaBancos.error.message}`);
      }
      return NextResponse.json(
        { tabelas, bancos: respostaBancos.data || [] },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const linhas = await carregarTodosRegistrosClt(supabase);

    let permitidas = linhas;

    if (perfilEhConsultora(perfil.perfil)) {

      permitidas = linhas.filter((linha) => podeAlterarRegistro(perfil, linha));

    } else if (perfilEhSupervisora(perfil.perfil)) {

      const idsDoTime = new Set(await idsConsultorasDoTime(supabase, perfil));

      permitidas = linhas.filter((linha) => Boolean(linha.consultora_id) && idsDoTime.has(String(linha.consultora_id)));

    }

    const tabelasVinculadas = await carregarMapaTabelasClt(supabase, permitidas);

    return NextResponse.json({

      perfil: {

        id: perfil.id,

        nome: perfil.nome,

        perfil: perfil.perfil,

      },

      registros: permitidas.map((linha) =>
        linhaParaRegistro(linha, tabelasVinculadas.get(linha.tabela_banco_id || "")),
      ),

    }, { headers: { "Cache-Control": "private, no-store" } });

  } catch (erro) {

    return respostaErro(

      erro instanceof Error

        ? erro.message

        : "Ocorreu um erro ao carregar os registros CLT.",

      500,

    );

  }

}

export async function POST(request: NextRequest) {

  try {

    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) return autenticacao.resposta;

    const { supabase, perfil } = autenticacao;

    const dados = (await request.json()) as {

      acao?: string;

      registro?: RegistroRecebido;

      registros?: RegistroRecebido[];

    };

    if (dados.acao === "importar_local") {

      const recebidos = Array.isArray(dados.registros) ? dados.registros : [];

      if (!recebidos.length) {

        return NextResponse.json({

          encontradas: 0,

          importadas: 0,

          atualizadas: 0,

          ignoradas: 0,

          falhas: 0,

          mensagem: "Nenhum registro CLT local para importar.",

        });

      }

      const consultoras = await listarConsultoras(supabase);

      const existentes = await carregarTodosRegistrosClt(supabase);

      const porId = new Map(existentes.map((linha) => [linha.id, linha]));

const linhas: LinhaClt[] = [];

      let importadas = 0;

      let atualizadas = 0;

      let ignoradas = 0;

      let falhas = 0;

      for (const registro of recebidos.slice(0, 2000)) {

        try {

          const linha = await montarLinha(supabase, perfil, registro, {

            consultoras,

            importacao: true,

            existente: porId.get(String(registro.id || "")),

          });

          const existentePorId = porId.get(linha.id);

          if (existentePorId) {

            if (!(await podeAlterarRegistroSeguro(supabase, perfil, existentePorId))) {

              ignoradas += 1;

              continue;

            }

            linha.criado_por = existentePorId.criado_por || linha.criado_por;

            linha.criado_em = existentePorId.criado_em || linha.criado_em;

            linhas.push(linha);

            atualizadas += 1;

            continue;

          }

linhas.push(linha);

          porId.set(linha.id, linha);

importadas += 1;

        } catch {

          falhas += 1;

        }

      }

      if (linhas.length) {

        const { error } = await supabase.from("clt_registros").upsert(linhas, {

          onConflict: "id",

        });

        if (error) {

          return respostaErro(

            `Não foi possível importar os registros CLT: ${error.message}`,

            500,

          );

        }

      }

      return NextResponse.json({

        encontradas: recebidos.length,

        importadas,

        atualizadas,

        ignoradas,

        falhas,

        mensagem:

          falhas > 0

            ? "A sincronização terminou, mas alguns registros incompletos não puderam ser enviados."

            : "Registros CLT antigos sincronizados com o Supabase.",

      });

    }

    const registro = dados.registro;

    if (!registro) {

      return respostaErro("Os dados do registro CLT não foram enviados.", 400);

    }

    const linha = await montarLinha(supabase, perfil, registro);

const { data, error } = await supabase

      .from("clt_registros")

      .insert(linha)

      .select()

      .single();

    if (error) {

      return respostaErro(

        `Não foi possível cadastrar o registro CLT: ${error.message}`,

        400,

      );

    }

    return NextResponse.json(

      {

        mensagem: "Cliente CLT cadastrado com sucesso.",

        registro: await registroComTabela(supabase, data as LinhaClt),

      },

      { status: 201 },

    );

  } catch (erro) {

    return respostaErro(

      erro instanceof Error

        ? erro.message

        : "Ocorreu um erro ao cadastrar o registro CLT.",

      500,

    );

  }

}

export async function PATCH(request: NextRequest) {

  try {

    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) return autenticacao.resposta;

    const { supabase, perfil } = autenticacao;

    const dados = (await request.json()) as {
      registro?: RegistroRecebido;
      acao?: string;
      id?: string;
      tabelaBancoId?: string | null;
    };
    const somenteTabela = dados.acao === "vincular_tabela";

    const registro = dados.registro;

    const id = String(somenteTabela ? dados.id || "" : registro?.id || "").trim();

    if (!id || (!somenteTabela && !registro)) {

      return respostaErro("O registro CLT não foi informado.", 400);

    }

    const { data: atual, error: erroAtual } = await supabase

      .from("clt_registros")

      .select("*")

      .eq("id", id)

      .single();

    if (erroAtual || !atual) {

      return respostaErro("Registro CLT não encontrado.", 404);

    }

    if (!(await podeAlterarRegistroSeguro(supabase, perfil, atual as LinhaClt))) {

      return respostaErro(

        "Você não pode alterar o registro CLT de outra consultora.",

        403,

      );

    }

    if (somenteTabela) {
      if (!Object.prototype.hasOwnProperty.call(dados, "tabelaBancoId")) {
        return respostaErro("Informe a tabela, ou null para remover o vínculo.", 400);
      }
      const idTabela = idTabelaRecebido({ tabelaBancoId: dados.tabelaBancoId });
      await validarVinculoTabelaClt(
        supabase, String(atual.banco || ""), numeroSeguro(atual.prazo), idTabela, atual as LinhaClt,
      );
      const { data: salvo, error: erroVinculo } = await supabase
        .from("clt_registros")
        .update({ tabela_banco_id: idTabela })
        .eq("id", id)
        .select()
        .single();
      if (erroVinculo) return respostaErro(`Não foi possível salvar a tabela: ${erroVinculo.message}`, 400);
      return NextResponse.json({
        mensagem: idTabela ? "Tabela vinculada ao contrato." : "Contrato mantido sem tabela selecionada.",
        registro: await registroComTabela(supabase, salvo as LinhaClt),
      });
    }

    if (!registro) return respostaErro("Os dados do registro CLT não foram enviados.", 400);
    const linha = await montarLinha(supabase, perfil, registro, { existente: atual as LinhaClt });

    linha.criado_por = String((atual as LinhaClt).criado_por || "") || perfil.id;

    linha.criado_em = (atual as LinhaClt).criado_em;

const { data, error } = await supabase

      .from("clt_registros")

      .update(linha)

      .eq("id", id)

      .select()

      .single();

    if (error) {

      return respostaErro(

        `Não foi possível atualizar o registro CLT: ${error.message}`,

        400,

      );

    }

    return NextResponse.json({

      mensagem: "Registro CLT atualizado com sucesso.",

      registro: await registroComTabela(supabase, data as LinhaClt),

    });

  } catch (erro) {

    return respostaErro(

      erro instanceof Error

        ? erro.message

        : "Ocorreu um erro ao atualizar o registro CLT.",

      500,

    );

  }

}

export async function DELETE(request: NextRequest) {

  try {

    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) return autenticacao.resposta;

    const { supabase, perfil } = autenticacao;

    const dados = (await request.json()) as { id?: string };

    const id = String(dados.id || "").trim();

    if (!id) {

      return respostaErro("O registro CLT não foi informado.", 400);

    }

    const { data: atual, error: erroAtual } = await supabase

      .from("clt_registros")

      .select("*")

      .eq("id", id)

      .single();

    if (erroAtual || !atual) {

      return respostaErro("Registro CLT não encontrado.", 404);

    }

    if (!(await podeAlterarRegistroSeguro(supabase, perfil, atual as LinhaClt))) {

      return respostaErro(

        "Você não pode excluir o registro CLT de outra consultora.",

        403,

      );

    }

    const { error } = await supabase.from("clt_registros").delete().eq("id", id);

    if (error) {

      return respostaErro(

        `Não foi possível excluir o registro CLT: ${error.message}`,

        400,

      );

    }

    return NextResponse.json({

      mensagem: "Registro CLT excluído com sucesso.",

    });

  } catch (erro) {

    return respostaErro(

      erro instanceof Error

        ? erro.message

        : "Ocorreu um erro ao excluir o registro CLT.",

      500,

    );

  }

}