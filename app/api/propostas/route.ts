import { NextRequest, NextResponse } from "next/server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS = [
  "Solicitado",
  "Em andamento",
  "Aguardando boleto",
  "Nota promissória",
  "Ag. liberação de margem",
  "Ag. fazer anuência",
  "Enviado ao banco",
  "Pago",
  "Cancelado",
] as const;

type StatusProposta = (typeof STATUS)[number];

type Perfil = {
  id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
};

type PropostaRecebida = {
  id?: string;
  clienteId?: string;
  cliente?: string;
  cpf?: string;
  telefone?: string;
  vendedora?: string;
  consultora?: string;
  banco?: string;
  tabela?: string;
  percentualTabela?: number;
  valorContrato?: number;
  valorMeta?: number;
  comissao?: number;
  premiacao?: number;
  status?: string;
  dataCadastro?: string;
  dataPagamento?: string;
  observacao?: string;
  observacoes?: string;
};

type LinhaProposta = {
  id: string;
  cliente_id: string | null;
  cliente: string;
  cpf: string;
  telefone: string;
  consultora_id: string | null;
  vendedora: string;
  banco: string;
  tabela: string;
  percentual_tabela: number | string;
  valor_contrato: number | string;
  valor_meta: number | string;
  comissao: number | string;
  premiacao: number | string;
  status: string;
  data_cadastro: string | null;
  data_pagamento: string | null;
  observacao: string;
  criado_por: string | null;
  criado_em?: string;
  atualizado_em?: string;
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

function statusSeguro(valor: unknown): StatusProposta {
  const texto = String(valor || "") as StatusProposta;

  return STATUS.includes(texto) ? texto : "Solicitado";
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

function linhaParaProposta(linha: LinhaProposta) {
  return {
    id: String(linha.id),
    clienteId: String(linha.cliente_id || ""),
    cliente: String(linha.cliente || ""),
    cpf: apenasNumeros(linha.cpf),
    telefone: apenasNumeros(linha.telefone),
    vendedora: String(linha.vendedora || ""),
    banco: String(linha.banco || ""),
    tabela: String(linha.tabela || ""),
    percentualTabela: numeroSeguro(linha.percentual_tabela),
    valorContrato: numeroSeguro(linha.valor_contrato),
    valorMeta: numeroSeguro(linha.valor_meta),
    comissao: numeroSeguro(linha.comissao),
    premiacao: numeroSeguro(linha.premiacao),
    status: statusSeguro(linha.status),
    dataCadastro: String(linha.data_cadastro || ""),
    dataPagamento: String(linha.data_pagamento || ""),
    observacao: String(linha.observacao || ""),
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
      resposta: respostaErro("Seu perfil não possui acesso às propostas.", 403),
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

function podeAlterarProposta(perfil: Perfil, linha: LinhaProposta) {
  if (!perfilEhConsultora(perfil.perfil)) {
    return true;
  }

  return (
    linha.consultora_id === perfil.id ||
    nomesCorrespondem(linha.vendedora, perfil.nome)
  );
}

function chaveDuplicidadeProposta(linha: LinhaProposta) {
  const responsavel = linha.consultora_id || normalizarTexto(linha.vendedora);
  const identificadorCliente =
    apenasNumeros(linha.cpf) || normalizarTexto(linha.cliente);
  const valor = numeroSeguro(linha.valor_contrato).toFixed(2);
  const data = String(linha.data_cadastro || "");
  const tabela = normalizarTexto(linha.tabela);

  if (!responsavel || !identificadorCliente || Number(valor) <= 0) return "";

  return `${responsavel}|${identificadorCliente}|${valor}|${data}|${tabela}`;
}

async function montarLinha(
  supabase: ReturnType<typeof createAdminClient>,
  perfil: Perfil,
  proposta: PropostaRecebida,
  opcoes?: {
    consultoras?: Perfil[];
    importacao?: boolean;
  },
): Promise<LinhaProposta> {
  const consultoras =
    opcoes?.consultoras || (await listarConsultoras(supabase));

  const nomeRecebido = String(
    proposta.vendedora || proposta.consultora || "",
  ).trim();

  if (
    opcoes?.importacao &&
    perfilEhConsultora(perfil.perfil) &&
    nomeRecebido &&
    !nomesCorrespondem(nomeRecebido, perfil.nome)
  ) {
    throw new Error("A proposta pertence a outra consultora.");
  }

  const nomeConsultora = perfilEhConsultora(perfil.perfil)
    ? perfil.nome
    : nomeRecebido;

  if (!nomeConsultora) {
    throw new Error("Selecione a consultora responsável.");
  }

  const consultora = encontrarConsultora(consultoras, nomeConsultora);

  if (!consultora && !opcoes?.importacao) {
    throw new Error("A consultora selecionada não foi encontrada.");
  }

  if (consultora && !consultora.ativo && !opcoes?.importacao) {
    throw new Error("A consultora selecionada está inativa.");
  }

  const id = String(proposta.id || crypto.randomUUID()).trim();

  const cliente = String(proposta.cliente || "").trim();

  if (!cliente) {
    throw new Error("Informe o cliente da proposta.");
  }

  const valorContrato = numeroSeguro(proposta.valorContrato);

  if (valorContrato <= 0) {
    throw new Error("Informe o valor total do contrato.");
  }

  const percentualTabela = numeroSeguro(proposta.percentualTabela);

  const valorMetaInformado = numeroSeguro(proposta.valorMeta);

  const valorMeta =
    valorMetaInformado > 0
      ? valorMetaInformado
      : valorContrato * (percentualTabela / 100);

  return {
    id,
    cliente_id: String(proposta.clienteId || "").trim() || null,
    cliente,
    cpf: apenasNumeros(proposta.cpf),
    telefone: apenasNumeros(proposta.telefone),
    consultora_id: consultora?.id || null,
    vendedora: consultora?.nome || nomeConsultora,
    banco: String(proposta.banco || "").trim(),
    tabela: String(proposta.tabela || "").trim(),
    percentual_tabela: percentualTabela,
    valor_contrato: valorContrato,
    valor_meta: valorMeta,
    comissao: numeroSeguro(proposta.comissao),
    premiacao: numeroSeguro(proposta.premiacao),
    status: statusSeguro(proposta.status),
    data_cadastro: dataSegura(proposta.dataCadastro),
    data_pagamento:
      statusSeguro(proposta.status) === "Pago"
        ? dataSegura(proposta.dataPagamento)
        : null,
    observacao: String(
      proposta.observacao || proposta.observacoes || "",
    ).trim(),
    criado_por: perfil.id,
    atualizado_em: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { supabase, perfil } = autenticacao;

    const { data, error } = await supabase
      .from("propostas")
      .select(
        `
        id,
        cliente_id,
        cliente,
        cpf,
        telefone,
        consultora_id,
        vendedora,
        banco,
        tabela,
        percentual_tabela,
        valor_contrato,
        valor_meta,
        comissao,
        premiacao,
        status,
        data_cadastro,
        data_pagamento,
        observacao,
        criado_por,
        criado_em,
        atualizado_em
      `,
      )
      .order("data_cadastro", {
        ascending: false,
        nullsFirst: false,
      })
      .order("criado_em", {
        ascending: false,
      });

    if (error) {
      return respostaErro(
        `Não foi possível carregar as propostas: ${error.message}`,
        500,
      );
    }

    const linhas = (data || []) as LinhaProposta[];

    const permitidas = perfilEhConsultora(perfil.perfil)
      ? linhas.filter((linha) => podeAlterarProposta(perfil, linha))
      : linhas;

    return NextResponse.json({
      perfil: {
        id: perfil.id,
        nome: perfil.nome,
        perfil: perfil.perfil,
      },
      propostas: permitidas.map(linhaParaProposta),
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao carregar as propostas.",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { supabase, perfil } = autenticacao;

    const dados = (await request.json()) as {
      acao?: string;
      proposta?: PropostaRecebida;
      propostas?: PropostaRecebida[];
    };

    if (dados.acao === "importar_local") {
      const propostasRecebidas = Array.isArray(dados.propostas)
        ? dados.propostas
        : [];

      if (!propostasRecebidas.length) {
        return NextResponse.json({
          encontradas: 0,
          importadas: 0,
          atualizadas: 0,
          ignoradas: 0,
          falhas: 0,
          detalhesFalhas: [],
          mensagem: "Nenhuma proposta local para importar.",
        });
      }

      const consultoras = await listarConsultoras(supabase);
      const { data: existentesData, error: erroExistentes } = await supabase
        .from("propostas")
        .select("*");

      if (erroExistentes) {
        return respostaErro(
          `Não foi possível conferir as propostas existentes: ${erroExistentes.message}`,
          500,
        );
      }

      const existentes = (existentesData || []) as LinhaProposta[];
      const porId = new Map(existentes.map((linha) => [linha.id, linha]));
      const chavesExistentes = new Set(
        existentes.map(chaveDuplicidadeProposta).filter(Boolean),
      );

      let importadas = 0;
      let atualizadas = 0;
      let ignoradas = 0;
      let falhas = 0;
      const detalhesFalhas: Array<{
        id?: string;
        cliente?: string;
        erro?: string;
      }> = [];

      for (const proposta of propostasRecebidas.slice(0, 2000)) {
        try {
          const linha = await montarLinha(supabase, perfil, proposta, {
            consultoras,
            importacao: true,
          });

          const existentePorId = porId.get(linha.id);

          if (existentePorId && !podeAlterarProposta(perfil, existentePorId)) {
            ignoradas += 1;
            continue;
          }

          const chave = chaveDuplicidadeProposta(linha);

          if (!existentePorId && chave && chavesExistentes.has(chave)) {
            ignoradas += 1;
            continue;
          }

          if (existentePorId) {
            linha.criado_por = existentePorId.criado_por || linha.criado_por;
          }

          const { error } = await supabase.from("propostas").upsert(linha, {
            onConflict: "id",
          });

          if (error) {
            throw new Error(error.message);
          }

          if (existentePorId) {
            atualizadas += 1;
          } else {
            importadas += 1;
          }

          porId.set(linha.id, linha);
          if (chave) chavesExistentes.add(chave);
        } catch (erro) {
          falhas += 1;

          if (detalhesFalhas.length < 20) {
            detalhesFalhas.push({
              id: String(proposta.id || ""),
              cliente: String(proposta.cliente || ""),
              erro:
                erro instanceof Error
                  ? erro.message
                  : "Não foi possível importar esta proposta.",
            });
          }
        }
      }

      return NextResponse.json({
        encontradas: propostasRecebidas.length,
        importadas,
        atualizadas,
        ignoradas,
        falhas,
        detalhesFalhas,
        mensagem:
          falhas > 0
            ? "A sincronização terminou, mas algumas propostas não puderam ser enviadas."
            : "Propostas locais sincronizadas com o Supabase.",
      });
    }

    const proposta = dados.proposta;

    if (!proposta) {
      return respostaErro("Os dados da proposta não foram enviados.", 400);
    }

    const linha = await montarLinha(supabase, perfil, proposta);

    const { data, error } = await supabase
      .from("propostas")
      .insert(linha)
      .select()
      .single();

    if (error) {
      return respostaErro(
        `Não foi possível cadastrar a proposta: ${error.message}`,
        400,
      );
    }

    return NextResponse.json(
      {
        mensagem: "Proposta cadastrada com sucesso.",
        proposta: linhaParaProposta(data as LinhaProposta),
      },
      {
        status: 201,
      },
    );
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao cadastrar a proposta.",
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { supabase, perfil } = autenticacao;

    const dados = (await request.json()) as {
      proposta?: PropostaRecebida;
    };

    const proposta = dados.proposta;

    const id = String(proposta?.id || "").trim();

    if (!proposta || !id) {
      return respostaErro("A proposta não foi informada.", 400);
    }

    const { data: atual, error: erroAtual } = await supabase
      .from("propostas")
      .select("*")
      .eq("id", id)
      .single();

    if (erroAtual || !atual) {
      return respostaErro("Proposta não encontrada.", 404);
    }

    if (!podeAlterarProposta(perfil, atual as LinhaProposta)) {
      return respostaErro(
        "Você não pode alterar a proposta de outra consultora.",
        403,
      );
    }

    const linha = await montarLinha(supabase, perfil, proposta);

    linha.criado_por =
      String((atual as LinhaProposta).criado_por || "") || perfil.id;

    const { data, error } = await supabase
      .from("propostas")
      .update(linha)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return respostaErro(
        `Não foi possível atualizar a proposta: ${error.message}`,
        400,
      );
    }

    return NextResponse.json({
      mensagem: "Proposta atualizada com sucesso.",
      proposta: linhaParaProposta(data as LinhaProposta),
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao atualizar a proposta.",
      500,
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { supabase, perfil } = autenticacao;

    const dados = (await request.json()) as {
      id?: string;
    };

    const id = String(dados.id || "").trim();

    if (!id) {
      return respostaErro("A proposta não foi informada.", 400);
    }

    const { data: atual, error: erroAtual } = await supabase
      .from("propostas")
      .select("*")
      .eq("id", id)
      .single();

    if (erroAtual || !atual) {
      return respostaErro("Proposta não encontrada.", 404);
    }

    if (!podeAlterarProposta(perfil, atual as LinhaProposta)) {
      return respostaErro(
        "Você não pode excluir a proposta de outra consultora.",
        403,
      );
    }

    const { error } = await supabase.from("propostas").delete().eq("id", id);

    if (error) {
      return respostaErro(
        `Não foi possível excluir a proposta: ${error.message}`,
        400,
      );
    }

    return NextResponse.json({
      mensagem: "Proposta excluída com sucesso.",
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao excluir a proposta.",
      500,
    );
  }
}
