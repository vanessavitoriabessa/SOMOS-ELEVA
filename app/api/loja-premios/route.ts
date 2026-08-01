import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function normalizar(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function respostaErro(erro: string, status = 400) {
  return NextResponse.json({ erro }, { status });
}

async function autenticar(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return { resposta: respostaErro("Sessão não informada.", 401) };
  }

  const token = authorization.slice(7);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chave) {
    return {
      resposta: respostaErro(
        "As variáveis públicas do Supabase não estão configuradas.",
        500
      ),
    };
  }

  const clienteAutenticado = createSupabaseClient(url, chave, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data, error } = await clienteAutenticado.auth.getUser(token);

  if (error || !data.user) {
    return { resposta: respostaErro("Sessão inválida ou expirada.", 401) };
  }

  const admin = createAdminClient();

  let perfil: {
  id?: string;
  nome?: string;
  email?: string;
  cargo?: string;
  ativo?: boolean;
} | null = null;

  if (data.user.email) {
    const { data: usuarioPorEmail } = await admin
      .from("usuarios")
      .select("id, nome, email, cargo, ativo")
      .ilike("email", data.user.email.trim())
      .maybeSingle();

    perfil = usuarioPorEmail;
  }

  if (!perfil) {
    const { data: usuarioPorId } = await admin
      .from("usuarios")
      .select("id, nome, email, cargo, ativo")
      .eq("id", data.user.id)
      .maybeSingle();

    perfil = usuarioPorId;
  }

  return {
    admin,
    user: data.user,
    perfil,
  };
}

function perfilPodeGerenciar(perfil: unknown) {
  const texto = normalizar(perfil);

  return (
    texto.includes("administrador") ||
    texto.includes("administradora") ||
    texto.includes("coordenador") ||
    texto.includes("coordenadora")
  );
}
function usuarioPodeGerenciar(
  perfil: {
    cargo?: string;
    nome?: string;
    email?: string;
  } | null,
  user: {
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  }
) {
  const textoCompleto = [
    perfil?.cargo,
    perfil?.nome,
    perfil?.email,
    user.user_metadata?.cargo,
    user.user_metadata?.role,
    user.app_metadata?.cargo,
    user.app_metadata?.role,
  ]
    .filter(Boolean)
    .join(" ");

  return perfilPodeGerenciar(textoCompleto);
}

export async function POST(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { admin, user, perfil } = autenticacao;


    console.log("DEBUG PERMISSAO LOJA", {
  emailAutenticado: user.email,
  idAutenticado: user.id,
  nomeEncontrado: perfil?.nome,
  emailEncontrado: perfil?.email,
  perfilEncontrado: perfil?.cargo,
  cargoEncontrado: perfil?.cargo,
});
    const body = await request.json();
    const acao = String(body.acao || "");

    if (acao === "criar_premio") {
      if (!usuarioPodeGerenciar(perfil, user)) {
        return respostaErro(
          "Você não possui permissão para cadastrar prêmios.",
          403
        );
      }

      const premio = body.premio || {};

      if (!String(premio.nome || "").trim()) {
        return respostaErro("Informe o nome do prêmio.");
      }

      const { data, error } = await admin
        .from("premios_loja")
        .insert({
          nome: String(premio.nome || "").trim(),
          categoria: String(premio.categoria || "Outros").trim(),
          descricao: String(premio.descricao || "").trim(),
          imagem_url: String(premio.imagem_url || "").trim(),
          pontos: Number(premio.pontos || 0),
          estoque: Number(premio.estoque || 0),
          ativo: Boolean(premio.ativo),
          destaque: Boolean(premio.destaque),
          ordem: Number(premio.ordem || 0),
          criado_por: perfil?.nome || user.email || user.id,
        })
        .select()
        .single();

      if (error) {
        return respostaErro(error.message, 400);
      }

      return NextResponse.json({ premio: data });
    }

    if (acao === "criar_pedido") {
      const premioId = String(body.premioId || "");
      const saldoInformado = Number(body.saldoInformado || 0);
      const nomeUsuario =
        String(perfil?.nome || body.nomeUsuario || "").trim();

      if (!premioId) {
        return respostaErro("Prêmio não informado.");
      }

      if (!nomeUsuario) {
        return respostaErro("Usuário não identificado.");
      }

      const { data: premio, error: premioError } = await admin
        .from("premios_loja")
        .select("id, nome, imagem_url, pontos, estoque, ativo")
        .eq("id", premioId)
        .single();

      if (premioError || !premio) {
        return respostaErro("Prêmio não encontrado.", 404);
      }

      if (!premio.ativo) {
        return respostaErro("Este prêmio está inativo.");
      }

      if (Number(premio.estoque || 0) <= 0) {
        return respostaErro("Este prêmio está sem estoque.");
      }

      if (saldoInformado < Number(premio.pontos || 0)) {
        return respostaErro("Saldo de pontos insuficiente.");
      }

      const { data: pedido, error: pedidoError } = await admin
        .from("pedidos_loja")
        .insert({
          usuario_id: perfil?.id || user.id,
          consultora: nomeUsuario,
          perfil: perfil?.cargo || body.perfilUsuario || "",
          premio_id: premio.id,
          nome_premio: premio.nome,
          imagem_url: premio.imagem_url || "",
          quantidade: 1,
          pontos_unitarios: Number(premio.pontos || 0),
          pontos_total: Number(premio.pontos || 0),
          status: "SOLICITADO",
        })
        .select()
        .single();

      if (pedidoError) {
        return respostaErro(pedidoError.message, 400);
      }

      return NextResponse.json({ pedido });
    }

    return respostaErro("Ação não reconhecida.");
  } catch (error) {
    console.error(error);

    return respostaErro(
      error instanceof Error
        ? error.message
        : "Erro interno ao processar a Loja de Prêmios.",
      500
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }


    const { admin, user, perfil } = autenticacao;


    console.log("DEBUG PATCH PERMISSAO LOJA", {
  emailAutenticado: user.email,
  idAutenticado: user.id,
  nomeEncontrado: perfil?.nome,
  emailEncontrado: perfil?.email,
  cargoEncontrado: perfil?.cargo,
  metadataUsuario: user.user_metadata,
  metadataAplicacao: user.app_metadata,
});

    if (!usuarioPodeGerenciar(perfil, user)) {
  return respostaErro(
    "Você não possui permissão para alterar a Loja de Prêmios.",
    403
  );
}

    const body = await request.json();
    const acao = String(body.acao || "");

    if (acao === "atualizar_premio") {
      const premio = body.premio || {};
      const id = String(premio.id || "");

      if (!id) {
        return respostaErro("Prêmio não informado.");
      }

      const { data, error } = await admin
        .from("premios_loja")
        .update({
          nome: String(premio.nome || "").trim(),
          categoria: String(premio.categoria || "Outros").trim(),
          descricao: String(premio.descricao || "").trim(),
          imagem_url: String(premio.imagem_url || "").trim(),
          pontos: Number(premio.pontos || 0),
          estoque: Number(premio.estoque || 0),
          ativo: Boolean(premio.ativo),
          destaque: Boolean(premio.destaque),
          ordem: Number(premio.ordem || 0),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return respostaErro(error.message, 400);
      }

      return NextResponse.json({ premio: data });
    }

    if (acao === "atualizar_pedido") {
      const pedidoId = String(body.pedidoId || "");
      const novoStatus = String(body.status || "");

      const permitidos = [
        "SOLICITADO",
        "APROVADO",
        "EM PREPARAÇÃO",
        "ENTREGUE",
        "RECUSADO",
        "CANCELADO",
      ];

      if (!pedidoId || !permitidos.includes(novoStatus)) {
        return respostaErro("Pedido ou status inválido.");
      }

      const { data: pedidoAtual, error: pedidoAtualError } = await admin
        .from("pedidos_loja")
        .select("id, premio_id, quantidade, status")
        .eq("id", pedidoId)
        .single();

      if (pedidoAtualError || !pedidoAtual) {
        return respostaErro("Pedido não encontrado.", 404);
      }

      const statusComReserva = [
        "APROVADO",
        "EM PREPARAÇÃO",
        "ENTREGUE",
      ];

      const tinhaReserva = statusComReserva.includes(
        pedidoAtual.status
      );
      const teraReserva = statusComReserva.includes(novoStatus);

      if (!tinhaReserva && teraReserva) {
        const { data: premio, error: premioError } = await admin
          .from("premios_loja")
          .select("id, estoque")
          .eq("id", pedidoAtual.premio_id)
          .single();

        if (premioError || !premio) {
          return respostaErro("Prêmio do pedido não encontrado.", 404);
        }

        const novoEstoque =
          Number(premio.estoque || 0) -
          Number(pedidoAtual.quantidade || 1);

        if (novoEstoque < 0) {
          return respostaErro(
            "Não há estoque suficiente para aprovar este pedido."
          );
        }

        const { error: estoqueError } = await admin
          .from("premios_loja")
          .update({ estoque: novoEstoque })
          .eq("id", premio.id);

        if (estoqueError) {
          return respostaErro(estoqueError.message, 400);
        }
      }

      if (tinhaReserva && !teraReserva) {
        const { data: premio, error: premioError } = await admin
          .from("premios_loja")
          .select("id, estoque")
          .eq("id", pedidoAtual.premio_id)
          .single();

        if (!premioError && premio) {
          await admin
            .from("premios_loja")
            .update({
              estoque:
                Number(premio.estoque || 0) +
                Number(pedidoAtual.quantidade || 1),
            })
            .eq("id", premio.id);
        }
      }

      const atualizacao: Record<string, unknown> = {
        status: novoStatus,
        processado_por: perfil?.nome || user.email || user.id,
      };

      if (novoStatus === "APROVADO") {
        atualizacao.aprovado_em = new Date().toISOString();
      }

      if (novoStatus === "ENTREGUE") {
        atualizacao.entregue_em = new Date().toISOString();
      }

      if (
        novoStatus === "CANCELADO" ||
        novoStatus === "RECUSADO"
      ) {
        atualizacao.cancelado_em = new Date().toISOString();
      }

      const { data, error } = await admin
        .from("pedidos_loja")
        .update(atualizacao)
        .eq("id", pedidoId)
        .select()
        .single();

      if (error) {
        return respostaErro(error.message, 400);
      }

      return NextResponse.json({ pedido: data });
    }

    return respostaErro("Ação não reconhecida.");
  } catch (error) {
    console.error(error);

    return respostaErro(
      error instanceof Error
        ? error.message
        : "Erro interno ao atualizar a Loja de Prêmios.",
      500
    );
  }
}
