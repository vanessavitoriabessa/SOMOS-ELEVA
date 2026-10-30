import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Perfil = {
  id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
};

type LinhaClt = {
  id: string;
  nome: string;
  cpf: string;
  consultora: string;
  banco: string;
  tabela_banco_id: string | null;
  valor_aprovado: number | string;
  status: string;
  data_pagamento: string | null;
  criado_em: string;
};

type TabelaConfig = {
  id: string;
  banco: string | null;
  nome: string | null;
  codigo: string | null;
  percentual_comissao_banco: number | string | null;
};

type RecebimentoClt = {
  id: string;
  clt_registro_id: string;
  comissao_prevista: number | string;
  percentual_comissao: number | string;
  data_recebimento: string | null;
  valor_recebido: number | string;
  diferenca: number | string;
  status: string;
  observacao: string | null;
  baixado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

function respostaErro(erro: string, status: number) {
  return NextResponse.json({ erro }, { status });
}

function normalizar(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function numero(valor: unknown) {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

function dataSegura(valor: unknown) {
  const texto = String(valor ?? "").trim();
  const encontrada = texto.match(/^\d{4}-\d{2}-\d{2}/);
  return encontrada ? encontrada[0] : "";
}

function criarAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const segredo =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!url || !segredo) {
    throw new Error(
      "A chave administrativa do Supabase não está configurada no servidor.",
    );
  }

  return createSupabaseClient(url, segredo, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

type SupabaseAdmin = ReturnType<typeof criarAdmin>;

function perfilPodeAcessarFinanceiro(perfil: unknown) {
  const texto = normalizar(perfil);

  return (
    texto.includes("administrador") ||
    texto.includes("administradora") ||
    texto.includes("coordenador") ||
    texto.includes("coordenadora") ||
    texto.includes("diretor") ||
    texto.includes("diretora") ||
    texto.includes("financeiro")
  );
}

async function autenticar(request: NextRequest) {
  const autorizacao = request.headers.get("authorization");

  if (!autorizacao || !autorizacao.startsWith("Bearer ")) {
    return { resposta: respostaErro("Você precisa estar autenticada.", 401) };
  }

  const token = autorizacao.replace("Bearer ", "").trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chavePublica =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chavePublica) {
    return {
      resposta: respostaErro(
        "A conexão pública com o Supabase não está configurada.",
        500,
      ),
    };
  }

  const verificador = createSupabaseClient(url, chavePublica, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await verificador.auth.getUser(token);

  if (error || !data.user) {
    return {
      resposta: respostaErro("Sua sessão não é válida. Entre novamente.", 401),
    };
  }

  const admin = criarAdmin();

  const { data: perfil, error: erroPerfil } = await admin
    .from("profiles")
    .select("id, nome, perfil, ativo")
    .eq("id", data.user.id)
    .maybeSingle();

  if (erroPerfil || !perfil) {
    return {
      resposta: respostaErro("Não foi possível localizar seu perfil.", 403),
    };
  }

  const perfilAtual = perfil as Perfil;

  if (!perfilAtual.ativo || !perfilPodeAcessarFinanceiro(perfilAtual.perfil)) {
    return {
      resposta: respostaErro(
        "Seu perfil não possui acesso aos recebimentos do Financeiro.",
        403,
      ),
    };
  }

  return { admin, perfil: perfilAtual };
}

async function carregarTodosClt(admin: SupabaseAdmin) {
  const todos: LinhaClt[] = [];
  const tamanhoPagina = 1000;

  for (let inicio = 0; ; inicio += tamanhoPagina) {
    const { data, error } = await admin
      .from("clt_registros")
      .select(
        "id, nome, cpf, consultora, banco, tabela_banco_id, valor_aprovado, status, data_pagamento, criado_em",
      )
      .order("criado_em", { ascending: false })
      .range(inicio, inicio + tamanhoPagina - 1);

    if (error) {
      throw new Error(
        `Não foi possível carregar os registros CLT: ${error.message}`,
      );
    }

    const pagina = (data || []) as LinhaClt[];
    todos.push(...pagina);

    if (pagina.length < tamanhoPagina) break;
  }

  return todos;
}

async function carregarTabelas(
  admin: SupabaseAdmin,
  ids: string[],
) {
  const mapa = new Map<string, TabelaConfig>();

  for (let inicio = 0; inicio < ids.length; inicio += 100) {
    const lote = ids.slice(inicio, inicio + 100);
    if (!lote.length) continue;

    const { data, error } = await admin
      .from("config_tabelas")
      .select("id, banco, nome, codigo, percentual_comissao_banco")
      .in("id", lote);

    if (error) {
      throw new Error(
        `Não foi possível carregar as tabelas CLT: ${error.message}`,
      );
    }

    for (const item of (data || []) as TabelaConfig[]) {
      mapa.set(String(item.id), item);
    }
  }

  return mapa;
}

async function carregarRecebimentos(
  admin: SupabaseAdmin,
  ids: string[],
) {
  const mapa = new Map<string, RecebimentoClt>();
  let tabelaExiste = true;

  for (let inicio = 0; inicio < ids.length; inicio += 100) {
    const lote = ids.slice(inicio, inicio + 100);
    if (!lote.length) continue;

    const { data, error } = await admin
      .from("clt_recebimentos")
      .select(
        "id, clt_registro_id, comissao_prevista, percentual_comissao, data_recebimento, valor_recebido, diferenca, status, observacao, baixado_por, criado_em, atualizado_em",
      )
      .in("clt_registro_id", lote);

    if (error) {
      if (String(error.code || "") === "42P01") {
        tabelaExiste = false;
        break;
      }

      throw new Error(
        `Não foi possível carregar as baixas CLT: ${error.message}`,
      );
    }

    for (const item of (data || []) as RecebimentoClt[]) {
      mapa.set(String(item.clt_registro_id), item);
    }
  }

  return { mapa, tabelaExiste };
}

function numeroPropostaClt(id: string) {
  const limpo = String(id || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  return `CLT-${limpo.slice(0, 10) || "SEM-ID"}`;
}

async function montarItens(admin: SupabaseAdmin) {
  const registros = await carregarTodosClt(admin);

  const idsTabela = Array.from(
    new Set(
      registros
        .map((item) => String(item.tabela_banco_id || "").trim())
        .filter(Boolean),
    ),
  );

  const idsRegistros = registros.map((item) => String(item.id));

  const [tabelas, recebimentosResultado] = await Promise.all([
    carregarTabelas(admin, idsTabela),
    carregarRecebimentos(admin, idsRegistros),
  ]);

  let semComissaoConfigurada = 0;

  const itens = registros.map((registro) => {
    const tabela = registro.tabela_banco_id
      ? tabelas.get(String(registro.tabela_banco_id))
      : undefined;

    const recebimento = recebimentosResultado.mapa.get(String(registro.id));

    const percentualTabela = numero(tabela?.percentual_comissao_banco);
    const percentualSnapshot = numero(recebimento?.percentual_comissao);
    const percentual =
      percentualSnapshot > 0 ? percentualSnapshot : percentualTabela;

    const valorOperacao = numero(registro.valor_aprovado);
    const comissaoCalculada = Number(
      (valorOperacao * (percentual / 100)).toFixed(2),
    );

    const comissaoSnapshot = numero(recebimento?.comissao_prevista);
    const comissaoPrevista =
      recebimento && comissaoSnapshot >= 0
        ? comissaoSnapshot
        : comissaoCalculada;

    const comissaoConfigurada = Boolean(
      recebimento ||
        (registro.tabela_banco_id &&
          tabela &&
          percentualTabela > 0 &&
          comissaoCalculada > 0),
    );

    if (!comissaoConfigurada) {
      semComissaoConfigurada += 1;
    }

    return {
      id: String(registro.id),
      cltRegistroId: String(registro.id),
      numeroProposta: numeroPropostaClt(String(registro.id)),
      cliente: String(registro.nome || ""),
      cpf: String(registro.cpf || ""),
      consultora: String(registro.consultora || ""),
      banco: String(registro.banco || tabela?.banco || ""),
      tabela: String(tabela?.nome || ""),
      codigoTabela: String(tabela?.codigo || ""),
      valorOperacao,
      dataEmissao:
        dataSegura(registro.criado_em) ||
        dataSegura(registro.data_pagamento),
      percentualComissao: percentual,
      comissaoPrevista: comissaoConfigurada ? comissaoPrevista : 0,
      valorRecebido: numero(recebimento?.valor_recebido),
      dataRecebimento: dataSegura(recebimento?.data_recebimento) || null,
      observacao: recebimento?.observacao || null,
      recebimentoId: recebimento?.id || null,
      comissaoConfigurada,
      esteiraStatus: String(registro.status || ""),
      dataPagamentoCliente: dataSegura(registro.data_pagamento) || null,
    };
  });

  return {
    itens,
    totalRegistrosClt: registros.length,
    semComissaoConfigurada,
    tabelaRecebimentosExiste: recebimentosResultado.tabelaExiste,
  };
}

export async function GET(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);
    if ("resposta" in autenticacao) return autenticacao.resposta;

    const resultado = await montarItens(autenticacao.admin);

    return NextResponse.json(resultado, {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível carregar os recebimentos CLT.",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);
    if ("resposta" in autenticacao) return autenticacao.resposta;

    const admin = autenticacao.admin;
    const perfil = autenticacao.perfil;

    const body = (await request.json()) as {
      cltRegistroId?: string;
      valorRecebido?: number | string;
      dataRecebimento?: string;
      observacao?: string;
      motivoAlteracao?: string;
    };

    const cltRegistroId = String(body.cltRegistroId || "").trim();
    const valorRecebido = numero(body.valorRecebido);
    const dataRecebimento = dataSegura(body.dataRecebimento);

    if (!cltRegistroId) {
      return respostaErro("Informe o contrato CLT.", 400);
    }

    if (valorRecebido <= 0) {
      return respostaErro("Informe um valor recebido válido.", 400);
    }

    if (!dataRecebimento) {
      return respostaErro("Informe a data do pagamento.", 400);
    }

    const { data: registro, error: erroRegistro } = await admin
      .from("clt_registros")
      .select(
        "id, nome, banco, tabela_banco_id, valor_aprovado, status, data_pagamento, criado_em",
      )
      .eq("id", cltRegistroId)
      .maybeSingle();

    if (erroRegistro || !registro) {
      return respostaErro("Contrato CLT não encontrado.", 404);
    }

    const {
      data: existente,
      error: erroExistente,
    } = await admin
      .from("clt_recebimentos")
      .select("*")
      .eq("clt_registro_id", cltRegistroId)
      .maybeSingle();

    if (erroExistente) {
      if (String(erroExistente.code || "") === "42P01") {
        return respostaErro(
          "A tabela de recebimentos CLT ainda não foi criada. Execute o SQL do módulo Recebimentos CLT no Supabase.",
          500,
        );
      }

      throw new Error(erroExistente.message);
    }

    if (existente && !String(body.motivoAlteracao || "").trim()) {
      return respostaErro(
        "Informe o motivo da alteração para corrigir um recebimento CLT já registrado.",
        400,
      );
    }

    let percentual = numero(existente?.percentual_comissao);
    let comissaoPrevista = numero(existente?.comissao_prevista);

    if (percentual <= 0 || comissaoPrevista <= 0) {
      const tabelaId = String(registro.tabela_banco_id || "").trim();

      if (!tabelaId) {
        return respostaErro(
          "Este contrato CLT está sem tabela vinculada. Vincule a tabela no módulo CLT antes de dar baixa.",
          400,
        );
      }

      const { data: tabela, error: erroTabela } = await admin
        .from("config_tabelas")
        .select("id, percentual_comissao_banco")
        .eq("id", tabelaId)
        .maybeSingle();

      if (erroTabela || !tabela) {
        return respostaErro(
          "A tabela vinculada ao contrato CLT não foi encontrada.",
          400,
        );
      }

      percentual = numero(tabela.percentual_comissao_banco);

      if (percentual <= 0) {
        return respostaErro(
          "A tabela CLT está sem % comissão banco. Preencha esse percentual em Configurações > Tabelas.",
          400,
        );
      }

      comissaoPrevista = Number(
        (
          numero(registro.valor_aprovado) *
          (percentual / 100)
        ).toFixed(2),
      );
    }

    const diferenca = valorRecebido - comissaoPrevista;
    const status =
      valorRecebido + 0.01 < comissaoPrevista
        ? "RECEBIMENTO PARCIAL"
        : "FINALIZADO";

    const historicoAnterior = existente
      ? [
          `ALTERAÇÃO MANUAL EM ${new Date().toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })}`,
          `Valor anterior: ${numero(existente.valor_recebido).toFixed(2)}`,
          `Data anterior: ${dataSegura(existente.data_recebimento) || "não informada"}`,
          `Motivo: ${String(body.motivoAlteracao || "").trim()}`,
        ].join(" | ")
      : "";

    const observacaoFinal = [
      String(body.observacao || "").trim(),
      historicoAnterior,
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await admin
      .from("clt_recebimentos")
      .upsert(
        {
          clt_registro_id: cltRegistroId,
          comissao_prevista: comissaoPrevista,
          percentual_comissao: percentual,
          data_recebimento: dataRecebimento,
          valor_recebido: valorRecebido,
          diferenca,
          status,
          observacao: observacaoFinal || null,
          baixado_por: perfil.id,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "clt_registro_id" },
      );

    if (error) {
      throw new Error(
        `Não foi possível salvar o recebimento CLT: ${error.message}`,
      );
    }

    return NextResponse.json({
      mensagem:
        status === "RECEBIMENTO PARCIAL"
          ? `Recebimento parcial CLT salvo. Saldo restante: ${(
              comissaoPrevista - valorRecebido
            ).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}.`
          : "Recebimento CLT finalizado com sucesso.",
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível salvar o recebimento CLT.",
      500,
    );
  }
}
