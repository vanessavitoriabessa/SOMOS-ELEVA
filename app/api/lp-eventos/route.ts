import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function apenasNumeros(valor: unknown) {
  return String(valor || "").replace(/\D/g, "");
}

function texto(valor: unknown, limite = 500) {
  return String(valor || "").trim().slice(0, limite);
}

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

    const { error } = await supabase.from("lp_eventos").upsert({
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

rodizio_recuperado: Boolean(dados.rodizio_recuperado),
rodizio_falhou: Boolean(dados.rodizio_falhou),

erro_rodizio:
  texto(dados.erro_rodizio, 500) || null,

origem: "servidor-publico",
}, {
  onConflict: "tentativa_id",
});

    if (error) {
      console.error("Falha ao registrar evento da LP:", error.message);

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