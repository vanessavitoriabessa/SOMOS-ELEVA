import { NextRequest, NextResponse } from "next/server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS = [
  "Novo lead",
  "Em análise",
  "Aguardando documentos",
  "Digitado",
  "Aprovado",
  "Pago",
  "Recusado",
] as const;

type StatusClt = (typeof STATUS)[number];

type Perfil = {
  id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
};

type RegistroRecebido = {
  id?: string;
  nome?: string;
  cpf?: string;
  dataNascimento?: string;
  nascimento?: string;
  telefone?: string;
  valorAprovado?: number;
  parcela?: number;
  banco?: string;
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
  telefone: string;
  valor_aprovado: number | string;
  parcela: number | string;
  banco: string;
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
  ].includes(normalizarTexto(perfil));
}

function linhaParaRegistro(linha: LinhaClt) {
  return {
    id: String(linha.id),
    nome: String(linha.nome || ""),
    cpf: apenasNumeros(linha.cpf),
    dataNascimento: String(linha.data_nascimento || ""),
    telefone: apenasNumeros(linha.telefone),
    valorAprovado: numeroSeguro(linha.valor_aprovado),
    parcela: numeroSeguro(linha.parcela),
    banco: String(linha.banco || ""),
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
    .select("id, nome, perfil, ativo")
    .eq("id", dadosAutenticacao.user.id)
    .single();

  if (erroPerfil || !perfil) {
    return {
      resposta: respostaErro("Não foi possível localizar seu perfil.", 403),
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

function chaveCpfConsultora(linha: Pick<LinhaClt, "cpf" | "consultora_id" | "consultora">) {
  const cpf = apenasNumeros(linha.cpf);

  if (!cpf) return "";

  return `${linha.consultora_id || normalizarTexto(linha.consultora)}|${cpf}`;
}

async function montarLinha(
  supabase: ReturnType<typeof createAdminClient>,
  perfil: Perfil,
  registro: RegistroRecebido,
  opcoes?: {
    consultoras?: Perfil[];
    importacao?: boolean;
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
  const valorAprovado = numeroSeguro(registro.valorAprovado);
  const parcela = numeroSeguro(registro.parcela);
  const banco = String(registro.banco || "").trim();

  if (!nome) throw new Error("Informe o nome completo.");
  if (cpf.length !== 11) throw new Error("O CPF precisa ter 11 números.");
  if (!dataNascimento) throw new Error("Informe a data de nascimento.");
  if (telefone.length < 10 || telefone.length > 11) {
    throw new Error("Informe um número de telefone válido.");
  }
  if (valorAprovado <= 0) throw new Error("Informe o valor aprovado.");
  if (parcela <= 0) throw new Error("Informe o valor da parcela.");
  if (!banco) throw new Error("Informe o banco.");

  const agora = new Date().toISOString();

  return {
    id,
    nome,
    cpf,
    data_nascimento: dataNascimento,
    telefone,
    valor_aprovado: valorAprovado,
    parcela,
    banco,
    consultora_id: consultora?.id || null,
    consultora: consultora?.nome || nomeConsultora,
    status: statusSeguro(registro.status),
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

    const { data, error } = await supabase
      .from("clt_registros")
      .select(
        `
        id,
        nome,
        cpf,
        data_nascimento,
        telefone,
        valor_aprovado,
        parcela,
        banco,
        consultora_id,
        consultora,
        status,
        criado_por,
        criado_em,
        atualizado_em
      `,
      )
      .order("atualizado_em", { ascending: false });

    if (error) {
      return respostaErro(
        `Não foi possível carregar os registros CLT: ${error.message}`,
        500,
      );
    }

    const linhas = (data || []) as LinhaClt[];
    const permitidas = perfilEhConsultora(perfil.perfil)
      ? linhas.filter((linha) => podeAlterarRegistro(perfil, linha))
      : linhas;

    return NextResponse.json({
      perfil: {
        id: perfil.id,
        nome: perfil.nome,
        perfil: perfil.perfil,
      },
      registros: permitidas.map(linhaParaRegistro),
    });
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
      const { data: existentesData, error: erroExistentes } = await supabase
        .from("clt_registros")
        .select("*");

      if (erroExistentes) {
        return respostaErro(
          `Não foi possível conferir os registros existentes: ${erroExistentes.message}`,
          500,
        );
      }

      const existentes = (existentesData || []) as LinhaClt[];
      const porId = new Map(existentes.map((linha) => [linha.id, linha]));
      const chavesCpf = new Set(
        existentes.map(chaveCpfConsultora).filter(Boolean),
      );

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
          });

          const existentePorId = porId.get(linha.id);

          if (existentePorId) {
            if (!podeAlterarRegistro(perfil, existentePorId)) {
              ignoradas += 1;
              continue;
            }

            linha.criado_por = existentePorId.criado_por || linha.criado_por;
            linha.criado_em = existentePorId.criado_em || linha.criado_em;
            linhas.push(linha);
            atualizadas += 1;
            continue;
          }

          const chaveCpf = chaveCpfConsultora(linha);

          if (chaveCpf && chavesCpf.has(chaveCpf)) {
            ignoradas += 1;
            continue;
          }

          linhas.push(linha);
          porId.set(linha.id, linha);
          if (chaveCpf) chavesCpf.add(chaveCpf);
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

    const { data: duplicado } = await supabase
      .from("clt_registros")
      .select("id")
      .eq("cpf", linha.cpf)
      .eq("consultora_id", linha.consultora_id)
      .maybeSingle();

    if (duplicado) {
      return respostaErro(
        "Já existe um registro CLT com esse CPF para essa consultora.",
        400,
      );
    }

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
        registro: linhaParaRegistro(data as LinhaClt),
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
    const dados = (await request.json()) as { registro?: RegistroRecebido };
    const registro = dados.registro;
    const id = String(registro?.id || "").trim();

    if (!registro || !id) {
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

    if (!podeAlterarRegistro(perfil, atual as LinhaClt)) {
      return respostaErro(
        "Você não pode alterar o registro CLT de outra consultora.",
        403,
      );
    }

    const linha = await montarLinha(supabase, perfil, registro);
    linha.criado_por = String((atual as LinhaClt).criado_por || "") || perfil.id;
    linha.criado_em = (atual as LinhaClt).criado_em;

    const { data: duplicado } = await supabase
      .from("clt_registros")
      .select("id")
      .eq("cpf", linha.cpf)
      .eq("consultora_id", linha.consultora_id)
      .neq("id", id)
      .maybeSingle();

    if (duplicado) {
      return respostaErro(
        "Já existe outro registro CLT com esse CPF para essa consultora.",
        400,
      );
    }

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
      registro: linhaParaRegistro(data as LinhaClt),
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

    if (!podeAlterarRegistro(perfil, atual as LinhaClt)) {
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
