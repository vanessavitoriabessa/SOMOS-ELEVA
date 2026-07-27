import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Perfil = {
  id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
};

type LinhaBanco = {
  id: string;
  nome: string;
  ativo: boolean;
};

type LinhaTabelaBanco = {
  id: string;
  banco_id: string;
  nome: string;
  percentual: number | string | null;
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

async function autenticar(request: NextRequest) {
  const autorizacao = request.headers.get("authorization");

  if (!autorizacao || !autorizacao.startsWith("Bearer ")) {
    return {
      resposta: respostaErro(
        "Você precisa estar autenticada.",
        401
      ),
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
        500
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
    }
  );

  const {
    data: dadosAutenticacao,
    error: erroAutenticacao,
  } = await verificador.auth.getUser(token);

  if (erroAutenticacao || !dadosAutenticacao.user) {
    return {
      resposta: respostaErro(
        "Sua sessão não é válida. Entre novamente.",
        401
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
        "Não foi possível localizar seu perfil.",
        403
      ),
    };
  }

  const perfilAtual = perfil as Perfil;

  if (
    !perfilAtual.ativo ||
    !perfilPodeAcessar(perfilAtual.perfil)
  ) {
    return {
      resposta: respostaErro(
        "Seu perfil não possui acesso aos bancos.",
        403
      ),
    };
  }

  return {
    supabase,
    perfil: perfilAtual,
  };
}

export async function GET(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { supabase } = autenticacao;

    const [
      { data: bancosData, error: erroBancos },
      { data: tabelasData, error: erroTabelas },
    ] = await Promise.all([
      supabase
        .from("bancos")
        .select("id, nome, ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true }),

      supabase
        .from("tabelas_bancos")
        .select("id, banco_id, nome, percentual")
        .order("nome", { ascending: true }),
    ]);

    if (erroBancos) {
      return respostaErro(
        `Não foi possível carregar os bancos: ${erroBancos.message}`,
        500
      );
    }

    if (erroTabelas) {
      return respostaErro(
        `Não foi possível carregar as tabelas: ${erroTabelas.message}`,
        500
      );
    }

    const bancos = ((bancosData || []) as LinhaBanco[]).map(
      (banco) => ({
        id: String(banco.id),
        nome: String(banco.nome || ""),
      })
    );

    const idsBancosAtivos = new Set(
      bancos.map((banco) => banco.id)
    );

    const tabelas = (
      (tabelasData || []) as LinhaTabelaBanco[]
    )
      .filter((tabela) =>
        idsBancosAtivos.has(String(tabela.banco_id))
      )
      .map((tabela) => ({
        id: String(tabela.id),
        bancoId: String(tabela.banco_id),
        nome: String(tabela.nome || ""),
        percentual: Number(tabela.percentual || 0),
      }));

    return NextResponse.json({
      bancos,
      tabelas,
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao carregar bancos e tabelas.",
      500
    );
  }
}