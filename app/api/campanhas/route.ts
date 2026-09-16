import { NextRequest, NextResponse } from "next/server";
import { createClient as verifyClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const bad = (erro: string, status = 400) =>
  NextResponse.json({ erro }, { status });

async function ctx(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { res: bad("Você precisa estar autenticada.", 401) };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    return { res: bad("A conexão com o Supabase não foi configurada.", 500) };
  }

  const verifier = verifyClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const token = authorization.replace("Bearer ", "").trim();
  const { data: authData, error: authError } =
    await verifier.auth.getUser(token);

  if (authError || !authData.user) {
    return { res: bad("Sua sessão não é válida. Entre novamente.", 401) };
  }

  const s = createAdminClient();

  const { data: p, error: profileError } = await s
    .from("profiles")
    .select("id,perfil,ativo")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !p || !p.ativo) {
    return { res: bad("Perfil inativo ou não encontrado.", 403) };
  }

  return {
    s,
    p,
    admin: String(p.perfil || "").trim() === "Administradora",
  };
}

function perfilPodeVerTodasCampanhas(perfil?: string | null) {
  const texto = String(perfil || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  return [
    "administradora",
    "supervisora",
    "operacional",
    "coordenadora",
  ].includes(texto);
}

const pack = (body: any, userId: string) => ({
  nome: String(body.nome || "").trim(),
  descricao: String(body.descricao || "").trim() || null,
  capa_url: String(body.capa_url || "").trim() || null,
  capa_ajuste: body.capa_ajuste === "preencher" ? "preencher" : "conter",
  capa_zoom: Math.max(50, Math.min(Number(body.capa_zoom || 100), 180)),
  premio_titulo: String(body.premio_titulo || "").trim() || null,
  premio_descricao: String(body.premio_descricao || "").trim() || null,
  meta_valor: Number(body.meta_valor || 0),
  data_inicio: body.data_inicio || null,
  data_fim: body.data_fim || null,
  produto: body.produto || "Todos",
  status_proposta: body.status_proposta || "Paga",

  // Regra fixa das campanhas:
  // Compra de Dívida = produção da Compra.
  // CLT = produção pelo valor das parcelas.
  criterio_ranking: "Produção",
  tipo_ranking: "Vendedora",

  // Mantém valor compatível com a constraint criada no Supabase.
  // As participantes específicas ficam em campanhas_participantes.
  abrangencia: "Toda empresa",
  time_id: null,
  quantidade_ganhadores: 1,
  situacao: body.situacao || "Rascunho",
  ativo: true,
  atualizado_por: userId,
});

async function salvarParticipantes(
  supabase: ReturnType<typeof createAdminClient>,
  campanhaId: string,
  ids: string[],
) {
  const idsUnicos = Array.from(
    new Set(ids.map(String).map((id) => id.trim()).filter(Boolean)),
  );

  const { error: deleteError } = await supabase
    .from("campanhas_participantes")
    .delete()
    .eq("campanha_id", campanhaId);

  if (deleteError) throw deleteError;

  if (!idsUnicos.length) return;

  const { error: insertError } = await supabase
    .from("campanhas_participantes")
    .insert(
      idsUnicos.map((profile_id) => ({
        campanha_id: campanhaId,
        profile_id,
      })),
    );

  if (insertError) throw insertError;
}

export async function GET(request: NextRequest) {
  try {
    const c = await ctx(request);
    if ("res" in c) return c.res;

    const [campanhasResponse, profilesResponse] = await Promise.all([
      c.s
        .from("campanhas")
        .select("*, campanhas_participantes(profile_id)")
        .eq("ativo", true)
        .order("criado_em", { ascending: false }),

      // Busca os perfis ativos primeiro e filtra as Consultoras em JS.
      // Isso evita a lista vazia por diferenças de texto/espaço no perfil.
      c.s
        .from("profiles")
        .select("id,nome,perfil,equipe,time_id,ativo,foto_url")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    ]);

    if (campanhasResponse.error) {
      return bad(
        `Não foi possível carregar as campanhas: ${campanhasResponse.error.message}`,
        500,
      );
    }

    if (profilesResponse.error) {
      return bad(
        `Não foi possível carregar as vendedoras: ${profilesResponse.error.message}`,
        500,
      );
    }

    // Em Campanhas, qualquer pessoa que possua usuário ATIVO no sistema
    // pode ser escolhida como participante, independentemente do cargo/perfil.
    const vendedoras = (profilesResponse.data || [])
      .filter((perfil: any) =>
        Boolean(perfil.id) &&
        Boolean(String(perfil.nome || "").trim()) &&
        perfil.ativo === true
      )
      .map((perfil: any) => ({
        id: perfil.id,
        nome: perfil.nome,
        perfil: perfil.perfil,
        equipe: perfil.equipe || null,
        time_id: perfil.time_id || null,
        foto_url: perfil.foto_url || null,
      }));

    const podeVerTodas = perfilPodeVerTodasCampanhas(c.p.perfil);

    const campanhas = (campanhasResponse.data || [])
      .map((item: any) => ({
        ...item,
        participantes: (item.campanhas_participantes || []).map(
          (participante: any) => participante.profile_id,
        ),
        campanhas_participantes: undefined,
      }))
      .filter((campanha: any) => {
        // Administradora, Supervisora, Operacional e Coordenadora
        // enxergam todas as campanhas.
        if (podeVerTodas) return true;

        // Demais usuários só recebem as campanhas
        // em que o próprio usuário foi selecionado.
        return Array.isArray(campanha.participantes) &&
          campanha.participantes.includes(c.p.id);
      });

    return NextResponse.json({
      campanhas,
      vendedoras,
      podeEditar: c.admin,
      podeVerTodas,
    });
  } catch (error) {
    return bad(
      error instanceof Error
        ? error.message
        : "Erro ao carregar campanhas.",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const c = await ctx(request);
    if ("res" in c) return c.res;

    if (!c.admin) {
      return bad("Somente uma Administradora ativa pode criar campanhas.", 403);
    }

    const body = await request.json();

    const participantes = Array.isArray(body.participantes)
      ? body.participantes.map(String).filter(Boolean)
      : [];

    if (!participantes.length) {
      return bad(
        "Selecione pelo menos uma vendedora para participar da campanha.",
      );
    }

    const dados = {
      ...pack(body, c.p.id),
      criado_por: c.p.id,
    };

    if (!dados.nome) {
      return bad("Informe o nome da campanha.");
    }

    const { data, error } = await c.s
      .from("campanhas")
      .insert(dados)
      .select()
      .single();

    if (error || !data) {
      return bad(error?.message || "Erro ao criar campanha.");
    }

    try {
      await salvarParticipantes(c.s, data.id, participantes);
    } catch (participantError) {
      await c.s.from("campanhas").delete().eq("id", data.id);
      throw participantError;
    }

    return NextResponse.json(
      {
        campanha: {
          ...data,
          participantes,
        },
        mensagem: "Campanha criada com sucesso.",
      },
      { status: 201 },
    );
  } catch (error) {
    return bad(
      error instanceof Error
        ? error.message
        : "Erro ao criar campanha.",
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const c = await ctx(request);
    if ("res" in c) return c.res;

    if (!c.admin) {
      return bad("Somente uma Administradora ativa pode editar campanhas.", 403);
    }

    const body = await request.json();
    const id = String(body.id || "").trim();

    if (!id) {
      return bad("Campanha não informada.");
    }

    if (body.acao === "fixar") {
      const { error: limparErro } = await c.s
        .from("campanhas")
        .update({ fixada: false, atualizado_por: c.p.id })
        .eq("fixada", true);

      if (limparErro) {
        return bad(`Não foi possível desafixar a campanha anterior: ${limparErro.message}`, 500);
      }

      const { data: fixada, error: fixarErro } = await c.s
        .from("campanhas")
        .update({ fixada: true, atualizado_por: c.p.id })
        .eq("id", id)
        .select()
        .single();

      if (fixarErro || !fixada) {
        return bad(fixarErro?.message || "Não foi possível fixar a campanha.", 500);
      }

      return NextResponse.json({
        campanha: fixada,
        mensagem: `Campanha "${fixada.nome}" fixada no topo.`,
      });
    }

    const participantes = Array.isArray(body.participantes)
      ? body.participantes.map(String).filter(Boolean)
      : [];

    if (!participantes.length) {
      return bad(
        "Selecione pelo menos uma vendedora para participar da campanha.",
      );
    }

    const dados = pack(body, c.p.id);

    if (!dados.nome) {
      return bad("Informe o nome da campanha.");
    }

    const { data, error } = await c.s
      .from("campanhas")
      .update(dados)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return bad(error?.message || "Erro ao atualizar campanha.");
    }

    await salvarParticipantes(c.s, id, participantes);

    return NextResponse.json({
      campanha: {
        ...data,
        participantes,
      },
      mensagem: "Campanha atualizada com sucesso.",
    });
  } catch (error) {
    return bad(
      error instanceof Error
        ? error.message
        : "Erro ao atualizar campanha.",
      500,
    );
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const c = await ctx(request);
    if ("res" in c) return c.res;

    if (!c.admin) {
      return bad("Somente uma Administradora ativa pode excluir campanhas.", 403);
    }

    const body = await request.json();
    const id = String(body.id || "").trim();

    if (!id) {
      return bad("Campanha não informada.");
    }

    const { data: campanha, error: campanhaErro } = await c.s
      .from("campanhas")
      .select("id,nome")
      .eq("id", id)
      .maybeSingle();

    if (campanhaErro) return bad(campanhaErro.message, 500);
    if (!campanha) return bad("Campanha não encontrada.", 404);

    const { error: participantesErro } = await c.s
      .from("campanhas_participantes")
      .delete()
      .eq("campanha_id", id);

    if (participantesErro) {
      return bad(
        `Não foi possível remover os participantes: ${participantesErro.message}`,
        500,
      );
    }

    const { error: campanhaDeleteErro } = await c.s
      .from("campanhas")
      .delete()
      .eq("id", id);

    if (campanhaDeleteErro) {
      return bad(
        `Não foi possível excluir a campanha: ${campanhaDeleteErro.message}`,
        500,
      );
    }

    return NextResponse.json({
      mensagem: `Campanha "${campanha.nome}" excluída com sucesso.`,
    });
  } catch (error) {
    return bad(
      error instanceof Error ? error.message : "Erro ao excluir campanha.",
      500,
    );
  }
}
