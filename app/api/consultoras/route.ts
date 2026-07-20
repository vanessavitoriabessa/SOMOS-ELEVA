import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
) {
  try {
    const autorizacao =
      request.headers.get("authorization");

    if (
      !autorizacao ||
      !autorizacao.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          erro:
            "Você precisa estar autenticada.",
        },
        {
          status: 401,
        }
      );
    }

    const token = autorizacao
      .replace("Bearer ", "")
      .trim();

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const publishableKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (
      !supabaseUrl ||
      !publishableKey
    ) {
      return NextResponse.json(
        {
          erro:
            "A conexão com o Supabase não foi configurada.",
        },
        {
          status: 500,
        }
      );
    }

    const verificador =
      createSupabaseClient(
        supabaseUrl,
        publishableKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        }
      );

    const {
      data: dadosAutenticacao,
      error: erroAutenticacao,
    } = await verificador.auth.getUser(
      token
    );

    if (
      erroAutenticacao ||
      !dadosAutenticacao.user
    ) {
      return NextResponse.json(
        {
          erro:
            "Sua sessão não é válida. Entre novamente.",
        },
        {
          status: 401,
        }
      );
    }

    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select("id, nome, perfil, equipe")
      .eq("ativo", true)
      .eq("perfil", "Consultora")
      .order("nome", {
        ascending: true,
      });

    if (error) {
      return NextResponse.json(
        {
          erro:
            "Não foi possível carregar as consultoras.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      consultoras: data || [],
    });
  } catch {
    return NextResponse.json(
      {
        erro:
          "Ocorreu um erro ao carregar as consultoras.",
      },
      {
        status: 500,
      }
    );
  }
}