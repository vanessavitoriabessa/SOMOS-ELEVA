import { NextRequest, NextResponse } from "next/server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function apenasNumeros(valor: unknown) {
  return String(valor || "").replace(/\D/g, "");
}

function texto(valor: unknown, limite = 500) {
  return String(valor || "").trim().slice(0, limite);
}

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
| Recebe os eventos enviados pela Landing Page.
| Protegido pela LP_MONITOR_SECRET.
|--------------------------------------------------------------------------
*/

export async function POST(request: NextRequest) {
  try {
    const secretRecebida = request.headers.get("x-lp-monitor-secret");
    const secretEsperada = process.env.LP_MONITOR_SECRET;

    if (!secretEsperada) {
      console.error("LP_MONITOR_SECRET não configurada no servidor.");

      return NextResponse.json(
        {
          sucesso: false,
          erro: "Monitor da LP não configurado.",
        },
        {
          status: 500,
        },
      );
    }

    if (secretRecebida !== secretEsperada) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Não autorizado.",
        },
        {
          status: 401,
        },
      );
    }

    const dados = (await request.json()) as {
      tentativa_id?: string;
      telefone?: string;
      plano?: string;
      etapa?: string;
      erro?: string;

      destino_numero?: string;
      destino_nome?: string;
      destino_consultor?: string;

      resultado?: string;
      fallback?: boolean;
      retrabalho_status?: string;

      rodizio_recuperado?: boolean;
      rodizio_falhou?: boolean;
      erro_rodizio?: string;
    };

    const tentativaId = texto(dados.tentativa_id, 100);
    const telefone = apenasNumeros(dados.telefone);
    const etapa = texto(dados.etapa, 100);
    const resultado = texto(dados.resultado, 100);

    if (!tentativaId || !telefone || !etapa || !resultado) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Evento incompleto.",
        },
        {
          status: 400,
        },
      );
    }

    if (!/^55\d{10,11}$/.test(telefone)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Telefone inválido.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from("lp_eventos").upsert(
      {
        tentativa_id: tentativaId,
        telefone,
        plano: texto(dados.plano, 10) || null,
        etapa,
        erro: texto(dados.erro, 500) || null,

        destino_numero:
          apenasNumeros(dados.destino_numero) || null,

        destino_nome:
          texto(dados.destino_nome, 150) || null,

        destino_consultor:
          texto(dados.destino_consultor, 150) || null,

        resultado,
        fallback: Boolean(dados.fallback),

        retrabalho_status:
          texto(dados.retrabalho_status, 50) || null,

        rodizio_recuperado:
          Boolean(dados.rodizio_recuperado),

        rodizio_falhou:
          Boolean(dados.rodizio_falhou),

        erro_rodizio:
          texto(dados.erro_rodizio, 500) || null,

        origem: "servidor-publico",
      },
      {
        onConflict: "tentativa_id",
      },
    );

    if (error) {
      console.error(
        "Falha ao registrar evento da LP:",
        error.message,
      );

      return NextResponse.json(
        {
          sucesso: false,
          erro: "Não foi possível registrar o evento.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      sucesso: true,
    });
  } catch (erro) {
    console.error("Erro na API lp-eventos:", erro);

    return NextResponse.json(
      {
        sucesso: false,
        erro: "Não foi possível registrar o evento.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| Consulta o Monitor da LP.
| Exige login válido no Somos Eleva e perfil autorizado.
|--------------------------------------------------------------------------
*/

export async function GET(request: NextRequest) {
  try {
    /*
    |--------------------------------------------------------------------------
    | AUTENTICAÇÃO
    |--------------------------------------------------------------------------
    */

    const autorizacao = request.headers.get("authorization");

    if (!autorizacao || !autorizacao.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Você precisa estar autenticada.",
        },
        {
          status: 401,
        },
      );
    }

    const token = autorizacao.replace("Bearer ", "").trim();

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !publishableKey) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "A conexão com o Supabase não foi configurada.",
        },
        {
          status: 500,
        },
      );
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

    const {
      data: dadosAutenticacao,
      error: erroAutenticacao,
    } = await verificador.auth.getUser(token);

    if (
      erroAutenticacao ||
      !dadosAutenticacao.user
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Sua sessão não é válida. Entre novamente.",
        },
        {
          status: 401,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PERFIL DO USUÁRIO
    |--------------------------------------------------------------------------
    */

    const admin = createAdminClient();

    const {
      data: perfil,
      error: erroPerfil,
    } = await admin
      .from("profiles")
      .select("id, perfil, ativo")
      .eq("id", dadosAutenticacao.user.id)
      .single();

    if (
      erroPerfil ||
      !perfil ||
      !perfil.ativo
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Seu perfil não possui acesso ao Monitor da LP.",
        },
        {
          status: 403,
        },
      );
    }

    const perfilNormalizado =
      normalizarTexto(perfil.perfil);

    const perfisPermitidos = [
      "administradora",
      "diretora geral",
      "coordenadora",
      "supervisora",
      "qualidade",
      "operacional",
    ];

    if (
      !perfisPermitidos.includes(perfilNormalizado)
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Seu perfil não possui acesso ao Monitor da LP.",
        },
        {
          status: 403,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PERÍODO
    |--------------------------------------------------------------------------
    */

    const { searchParams } =
      new URL(request.url);

    const dataInicio =
      searchParams.get("inicio");

    const dataFim =
      searchParams.get("fim");

    if (!dataInicio || !dataFim) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Informe o período do monitor.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * O período informado pelo painel representa
     * o horário de Brasília.
     */
    const inicio = new Date(
      `${dataInicio}T00:00:00-03:00`,
    );

    const fim = new Date(
      `${dataFim}T23:59:59.999-03:00`,
    );

    if (
      Number.isNaN(inicio.getTime()) ||
      Number.isNaN(fim.getTime())
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Período inválido.",
        },
        {
          status: 400,
        },
      );
    }

    if (inicio.getTime() > fim.getTime()) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            "A data inicial não pode ser maior que a data final.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CONSULTAR EVENTOS
    |--------------------------------------------------------------------------
    */

    const { data, error } = await admin
      .from("lp_eventos")
      .select(
        `
          id,
          tentativa_id,
          criado_em,
          telefone,
          plano,
          etapa,
          erro,
          destino_numero,
          destino_nome,
          destino_consultor,
          resultado,
          fallback,
          retrabalho_status,
          rodizio_recuperado,
          rodizio_falhou,
          erro_rodizio
        `,
      )
      .eq("origem", "servidor-publico")
      .gte(
        "criado_em",
        inicio.toISOString(),
      )
      .lte(
        "criado_em",
        fim.toISOString(),
      )
      .order(
        "criado_em",
        {
          ascending: false,
        },
      );

    if (error) {
      console.error(
        "Falha ao consultar monitor da LP:",
        error.message,
      );

      return NextResponse.json(
        {
          sucesso: false,
          erro:
            "Não foi possível carregar o Monitor da LP.",
        },
        {
          status: 500,
        },
      );
    }

    const eventos = data ?? [];

    /*
    |--------------------------------------------------------------------------
    | MÉTRICAS
    |--------------------------------------------------------------------------
    */

    const telefones = eventos
      .map((item) =>
        String(item.telefone || ""),
      )
      .filter(Boolean);

    const telefonesUnicos =
      new Set(telefones).size;

    const contagemPorTelefone =
      telefones.reduce<Record<string, number>>(
        (acumulador, numero) => {
          acumulador[numero] =
            (acumulador[numero] || 0) + 1;

          return acumulador;
        },
        {},
      );

    /*
     * Conta quantos CLIENTES diferentes
     * fizeram mais de uma tentativa.
     *
     * Exemplo:
     * mesmo telefone tentou 10 vezes
     * = 1 cliente repetido.
     */
    const clientesRepetidos =
      Object.values(contagemPorTelefone)
        .filter(
          (quantidade) =>
            quantidade > 1,
        )
        .length;

    const totalTelefoneSalvo = eventos.filter(
  (item) => item.etapa === "telefone_salvo",
).length;

const telefonesUnicosSalvosHyperflow = new Set(
  eventos
    .filter((item) => item.etapa === "telefone_salvo")
    .map((item) => String(item.telefone || ""))
    .filter(Boolean),
).size;

const repeticoesTelefoneLp = Math.max(
  eventos.length - telefonesUnicos,
  0,
);

const repetidosHyperflow = Math.max(
  totalTelefoneSalvo - telefonesUnicosSalvosHyperflow,
  0,
);

const telefonesQueIniciaramAtendimento = new Set(
  eventos
    .filter(
      (item) => item.resultado === "plano_b_websdk",
    )
    .map((item) => String(item.telefone || ""))
    .filter(Boolean),
).size;

const percentualIniciaramAtendimento =
  telefonesUnicos > 0
    ? Number(
        (
          (telefonesQueIniciaramAtendimento /
            telefonesUnicos) *
          100
        ).toFixed(1),
      )
    : 0;

const resumo = {
  tentativas: eventos.length,

  telefones_unicos: telefonesUnicos,

  clientes_repetidos: clientesRepetidos,

  repeticoes_telefone_lp: repeticoesTelefoneLp,

  salvos_hyperflow: totalTelefoneSalvo,

  unicos_salvos_hyperflow:
    telefonesUnicosSalvosHyperflow,

  repetidos_hyperflow: repetidosHyperflow,

  total_salvo_hyperflow: totalTelefoneSalvo,

  iniciaram_atendimento:
    telefonesQueIniciaramAtendimento,

  iniciaram_atendimento_percentual:
    percentualIniciaramAtendimento,

  plano_a: eventos.filter(
    (item) =>
      item.resultado === "plano_a_whatsapp",
  ).length,

  plano_b: eventos.filter(
    (item) =>
      item.resultado === "plano_b_websdk",
  ).length,

  fallback: eventos.filter(
    (item) =>
      item.resultado === "fallback_whatsapp",
  ).length,

  falhas_sem_atendimento: eventos.filter(
    (item) =>
      item.resultado === "falha_sem_atendimento",
  ).length,

  retrabalhos_pendentes: eventos.filter(
    (item) =>
      item.retrabalho_status === "pendente",
  ).length,

  rodizio_recuperado: eventos.filter(
    (item) => item.rodizio_recuperado === true,
  ).length,

  rodizio_falhou: eventos.filter(
    (item) => item.rodizio_falhou === true,
  ).length,
};

    /*
    |--------------------------------------------------------------------------
    | FALHAS / CONTINGÊNCIAS
    |--------------------------------------------------------------------------
    */

    const falhas = eventos.filter(
      (item) =>
        item.resultado ===
          "fallback_whatsapp" ||
        item.resultado ===
          "falha_sem_atendimento" ||
        item.rodizio_recuperado ===
          true ||
        item.rodizio_falhou ===
          true,
    );

    return NextResponse.json({
      sucesso: true,

      periodo: {
        inicio: dataInicio,
        fim: dataFim,
      },

      resumo,
      eventos,
      falhas,
    });
  } catch (erro) {
    console.error(
      "Erro ao consultar Monitor da LP:",
      erro,
    );

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          "Não foi possível carregar o Monitor da LP.",
      },
      {
        status: 500,
      },
    );
  }
}