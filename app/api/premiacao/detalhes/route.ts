import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Baixa = {
  proposta_id: string | null;
  numero_proposta: string | null;
  cliente: string | null;
  consultora: string | null;
  banco: string | null;
  tabela: string | null;
  valor_operacao: number | null;
  valor_liquido: number | null;
  data_pagamento_proposta: string | null;
  status: string | null;
};

type Regra = {
  id: string;
  banco: string | null;
  nome: string | null;
  codigo: string | null;
  orgao_convenio: string | null;
  percentual: number | null;
  percentual_comissao_banco: number | null;
  ativo: boolean | null;
};

function respostaErro(erro: string, status: number) {
  return NextResponse.json({ erro }, { status });
}

function normalizar(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function compactar(valor: unknown) {
  return normalizar(valor).replace(/[^A-Z0-9]/g, "");
}

function perfilPodeConferirPremiacao(perfil: unknown) {
  const texto = normalizar(perfil);
  return [
    "ADMINISTRADORA",
    "ADMINISTRADOR",
    "COORDENADORA",
    "COORDENADOR",
    "DIRETORIA",
    "DIRETORA",
    "DIRETOR GERAL",
    "DIRETORA GERAL",
  ].some((item) => texto.includes(item));
}

function encontrarRegra(baixa: Baixa, regras: Regra[]) {
  const banco = normalizar(baixa.banco);
  const tabela = normalizar(baixa.tabela);
  const tabelaCompacta = compactar(baixa.tabela);

  const candidatas = regras.filter(
    (regra) =>
      regra.ativo !== false &&
      normalizar(regra.banco) === banco,
  );

  const exata = candidatas.find(
    (regra) =>
      normalizar(regra.nome) === tabela ||
      normalizar(regra.codigo) === tabela,
  );
  if (exata) return exata;

  const porPrefixo = candidatas.find((regra) => {
    const nome = normalizar(regra.nome);
    return (
      tabela.length >= 6 &&
      (nome.startsWith(tabela) || tabela.startsWith(nome))
    );
  });
  if (porPrefixo) return porPrefixo;

  return (
    candidatas.find((regra) => {
      const nome = compactar(regra.nome);
      return (
        tabelaCompacta.length >= 6 &&
        (nome.startsWith(tabelaCompacta) ||
          tabelaCompacta.startsWith(nome))
      );
    }) || null
  );
}

async function autenticarGestao(request: NextRequest) {
  const autorizacao = request.headers.get("authorization");

  if (!autorizacao || !autorizacao.startsWith("Bearer ")) {
    return { resposta: respostaErro("Você precisa estar autenticada.", 401) };
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

  const verificador = createSupabaseClient(
    supabaseUrl,
    publishableKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { data: dadosAutenticacao, error: erroAutenticacao } =
    await verificador.auth.getUser(token);

  if (erroAutenticacao || !dadosAutenticacao.user) {
    return {
      resposta: respostaErro(
        "Sua sessão não é válida. Entre novamente.",
        401,
      ),
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
      resposta: respostaErro(
        `Não foi possível localizar seu perfil: ${erroPerfil?.message || "perfil inexistente"}`,
        403,
      ),
    };
  }

  if (!perfil.ativo || !perfilPodeConferirPremiacao(perfil.perfil)) {
    return {
      resposta: respostaErro(
        `Seu perfil interno (${String(perfil.perfil || "sem perfil")}) não possui acesso à conferência de premiação.`,
        403,
      ),
    };
  }

  return { supabase, perfil };
}

export async function GET(request: NextRequest) {
  try {
    const autenticacao = await autenticarGestao(request);
    if (autenticacao.resposta) return autenticacao.resposta;

    const supabase = autenticacao.supabase!;

    const [resultadoBaixas, resultadoRegras] = await Promise.all([
      supabase
        .from("baixas_pagamentos")
        .select(
          "proposta_id, numero_proposta, cliente, consultora, banco, tabela, valor_operacao, valor_liquido, data_pagamento_proposta, status",
        ),
      supabase
        .from("config_tabelas")
        .select(
          "id, banco, nome, codigo, orgao_convenio, percentual, percentual_comissao_banco, ativo",
        )
        .eq("ativo", true),
    ]);

    if (resultadoBaixas.error) {
      return respostaErro(
        `Erro ao consultar baixas_pagamentos: ${resultadoBaixas.error.message}`,
        500,
      );
    }

    if (resultadoRegras.error) {
      return respostaErro(
        `Erro ao consultar config_tabelas: ${resultadoRegras.error.message}`,
        500,
      );
    }

    const baixas = (resultadoBaixas.data || []) as Baixa[];
    const regras = (resultadoRegras.data || []) as Regra[];

    const itens = baixas
      .filter((baixa) => Boolean(baixa.proposta_id))
      .map((baixa) => {
        const regra = encontrarRegra(baixa, regras);
        const valorOperacao = Number(
          baixa.valor_operacao || baixa.valor_liquido || 0,
        );
        const pesoProducao = Number(regra?.percentual || 0);
        const percentualComissaoEmpresa = Number(
          regra?.percentual_comissao_banco || 0,
        );
        const producaoValida =
          valorOperacao * (pesoProducao / 100);
        const comissaoEmpresa =
          valorOperacao * (percentualComissaoEmpresa / 100);

        return {
          proposta_id: String(baixa.proposta_id || ""),
          numero_proposta: baixa.numero_proposta || "",
          cliente: baixa.cliente || "",
          consultora: baixa.consultora || "",
          banco: baixa.banco || "",
          tabela: baixa.tabela || "",
          valor_operacao: valorOperacao,
          valor_liquido: Number(baixa.valor_liquido || 0),
          data_pagamento_proposta:
            baixa.data_pagamento_proposta || "",
          status: baixa.status || "",
          regra_id: regra?.id || null,
          tabela_configurada: regra?.nome || null,
          codigo: regra?.codigo || null,
          orgao_convenio: regra?.orgao_convenio || null,
          peso_producao: pesoProducao,
          percentual_comissao_empresa: percentualComissaoEmpresa,
          producao_valida: Number(producaoValida.toFixed(2)),
          comissao_empresa: Number(comissaoEmpresa.toFixed(2)),
        };
      });

    return NextResponse.json(
      {
        itens,
        total: itens.length,
        diagnostico: {
          baixas: baixas.length,
          regras: regras.length,
          regrasEncontradas: itens.filter((item) => item.regra_id).length,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return respostaErro(
      error instanceof Error
        ? error.message
        : "Erro inesperado ao carregar a premiação.",
      500,
    );
  }
}
