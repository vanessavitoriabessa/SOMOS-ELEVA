import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type DadosTime = {
  id?: string;
  nome?: string;
  supervisor_id?: string | null;
  ativo?: boolean;
};

function respostaErro(
  erro: string,
  status: number,
) {
  return NextResponse.json(
    { erro },
    { status },
  );
}

async function autenticarAdministradora(
  request: NextRequest,
) {
  const autorizacao =
    request.headers.get("authorization");

  if (
    !autorizacao ||
    !autorizacao.startsWith("Bearer ")
  ) {
    return {
      resposta: respostaErro(
        "Você precisa estar autenticada.",
        401,
      ),
    };
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
    return {
      resposta: respostaErro(
        "A conexão com o Supabase não foi configurada.",
        500,
      ),
    };
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
      },
    );

  const {
    data: dadosAutenticacao,
    error: erroAutenticacao,
  } = await verificador.auth.getUser(
    token,
  );

  if (
    erroAutenticacao ||
    !dadosAutenticacao.user
  ) {
    return {
      resposta: respostaErro(
        "Sua sessão não é válida. Entre novamente.",
        401,
      ),
    };
  }

  const supabase =
    createAdminClient();

  const {
    data: perfilAdministradora,
    error: erroPerfil,
  } = await supabase
    .from("profiles")
    .select("perfil, ativo")
    .eq(
      "id",
      dadosAutenticacao.user.id,
    )
    .single();

  if (erroPerfil) {
    return {
      resposta: respostaErro(
        `Não foi possível consultar seu perfil: ${erroPerfil.message}`,
        500,
      ),
    };
  }

  if (
    !perfilAdministradora ||
    ![
      "Administradora",
      "Supervisora",
    ].includes(
      String(
        perfilAdministradora.perfil ||
          "",
      ),
    ) ||
    !perfilAdministradora.ativo
  ) {
    return {
      resposta: respostaErro(
        "Seu perfil não possui acesso aos times.",
        403,
      ),
    };
  }

  return {
    supabase,
    usuarioId:
      dadosAutenticacao.user.id,
    perfil:
      String(
        perfilAdministradora.perfil ||
          "",
      ),
  };
}

async function validarSupervisora(
  supabase: ReturnType<
    typeof createAdminClient
  >,
  supervisorId?: string | null,
) {
  const id = String(
    supervisorId || "",
  ).trim();

  if (!id) {
    return {
      supervisorId: null,
    };
  }

  const {
    data: supervisora,
    error,
  } = await supabase
    .from("profiles")
    .select(
      "id, nome, perfil, ativo",
    )
    .eq("id", id)
    .single();

  if (
    error ||
    !supervisora
  ) {
    return {
      erro:
        "A supervisora selecionada não foi encontrada.",
    };
  }

  if (
    supervisora.perfil !==
      "Supervisora"
  ) {
    return {
      erro:
        "O usuário selecionado precisa ter o perfil Supervisora.",
    };
  }

  if (!supervisora.ativo) {
    return {
      erro:
        "A supervisora selecionada está inativa.",
    };
  }

  return {
    supervisorId:
      supervisora.id,
  };
}

export async function GET(
  request: NextRequest,
) {
  try {
    const autenticacao =
      await autenticarAdministradora(
        request,
      );

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const {
      supabase,
      usuarioId,
      perfil,
    } = autenticacao;

    let consultaTimes = supabase
      .from("times")
      .select(`
        id,
        nome,
        supervisor_id,
        ativo,
        criado_em,
        atualizado_em
      `);

    if (
      perfil === "Supervisora"
    ) {
      consultaTimes =
        consultaTimes.eq(
          "supervisor_id",
          usuarioId,
        );
    }

    const {
      data: times,
      error: erroTimes,
    } = await consultaTimes
      .order("nome", {
        ascending: true,
      });

    if (erroTimes) {
      return respostaErro(
        `Não foi possível carregar os times: ${erroTimes.message}`,
        500,
      );
    }

    const {
      data: perfis,
      error: erroPerfis,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        nome,
        email,
        perfil,
        equipe,
        ativo,
        time_id
      `);

    if (erroPerfis) {
      return respostaErro(
        `Não foi possível carregar os usuários dos times: ${erroPerfis.message}`,
        500,
      );
    }

    const supervisores =
      (perfis || []).filter(
        (perfil) =>
          perfil.perfil ===
          "Supervisora",
      );

    const timesComDetalhes =
      (times || []).map(
        (time) => {
          const supervisora =
            supervisores.find(
              (perfil) =>
                perfil.id ===
                time.supervisor_id,
            ) || null;

          const membros =
            (perfis || []).filter(
              (perfil) =>
                perfil.time_id ===
                time.id,
            );

          return {
            ...time,
            supervisora,
            membros,
            quantidade_membros:
              membros.length,
            quantidade_consultoras:
              membros.filter(
                (membro) =>
                  membro.perfil ===
                  "Consultora",
              ).length,
          };
        },
      );

    return NextResponse.json({
      perfil: {
        id: usuarioId,
        perfil,
      },
      times: timesComDetalhes,
      supervisoras:
        perfil === "Administradora"
          ? supervisores
          : [],
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao carregar os times.",
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const autenticacao =
      await autenticarAdministradora(
        request,
      );

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const {
      supabase,
      perfil,
    } = autenticacao;

    if (
      perfil !== "Administradora"
    ) {
      return respostaErro(
        "Somente uma Administradora pode criar times.",
        403,
      );
    }

    const dados =
      (await request.json()) as DadosTime;

    const nome = String(
      dados.nome || "",
    ).trim();

    if (!nome) {
      return respostaErro(
        "Informe o nome do time.",
        400,
      );
    }

    const validacaoSupervisora =
      await validarSupervisora(
        supabase,
        dados.supervisor_id,
      );

    if (
      "erro" in
      validacaoSupervisora
    ) {
      return respostaErro(
  validacaoSupervisora.erro ||
    "Não foi possível validar a supervisora.",
  400,
);
    }

    const {
      data: duplicado,
    } = await supabase
      .from("times")
      .select("id")
      .ilike("nome", nome)
      .maybeSingle();

    if (duplicado) {
      return respostaErro(
        "Já existe um time com esse nome.",
        400,
      );
    }

    const {
      data: timeCriado,
      error,
    } = await supabase
      .from("times")
      .insert({
        nome,
        supervisor_id:
          validacaoSupervisora
            .supervisorId,
        ativo:
          dados.ativo !== false,
        atualizado_em:
          new Date()
            .toISOString(),
      })
      .select(`
        id,
        nome,
        supervisor_id,
        ativo,
        criado_em,
        atualizado_em
      `)
      .single();

    if (
      error ||
      !timeCriado
    ) {
      return respostaErro(
        `Não foi possível criar o time: ${
          error?.message ||
          "erro desconhecido"
        }`,
        500,
      );
    }

    if (
      validacaoSupervisora
        .supervisorId
    ) {
      const {
        error:
          erroVinculoSupervisora,
      } = await supabase
        .from("profiles")
        .update({
          time_id:
            timeCriado.id,
        })
        .eq(
          "id",
          validacaoSupervisora
            .supervisorId,
        );

      if (
        erroVinculoSupervisora
      ) {
        return respostaErro(
          `O time foi criado, mas não foi possível vincular a supervisora: ${erroVinculoSupervisora.message}`,
          500,
        );
      }
    }

    return NextResponse.json(
      {
        mensagem:
          "Time criado com sucesso.",
        time: timeCriado,
      },
      {
        status: 201,
      },
    );
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao criar o time.",
      500,
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const autenticacao =
      await autenticarAdministradora(
        request,
      );

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const {
      supabase,
      perfil,
    } = autenticacao;

    if (
      perfil !== "Administradora"
    ) {
      return respostaErro(
        "Somente uma Administradora pode alterar times.",
        403,
      );
    }

    const dados =
      (await request.json()) as DadosTime;

    const id = String(
      dados.id || "",
    ).trim();

    const nome = String(
      dados.nome || "",
    ).trim();

    if (!id) {
      return respostaErro(
        "Time não informado.",
        400,
      );
    }

    if (!nome) {
      return respostaErro(
        "Informe o nome do time.",
        400,
      );
    }

    const {
      data: timeAnterior,
      error:
        erroTimeAnterior,
    } = await supabase
      .from("times")
      .select(
        "id, supervisor_id",
      )
      .eq("id", id)
      .single();

    if (
      erroTimeAnterior ||
      !timeAnterior
    ) {
      return respostaErro(
        "Time não encontrado.",
        404,
      );
    }

    const validacaoSupervisora =
      await validarSupervisora(
        supabase,
        dados.supervisor_id,
      );

    if (
      "erro" in
      validacaoSupervisora
    ) {
      return respostaErro(
  validacaoSupervisora.erro ||
    "Não foi possível validar a supervisora.",
  400,
);
    }

    const {
      data: duplicado,
    } = await supabase
      .from("times")
      .select("id")
      .ilike("nome", nome)
      .neq("id", id)
      .maybeSingle();

    if (duplicado) {
      return respostaErro(
        "Já existe outro time com esse nome.",
        400,
      );
    }

    const novoSupervisorId =
      validacaoSupervisora
        .supervisorId;

    if (
      timeAnterior.supervisor_id &&
      timeAnterior.supervisor_id !==
        novoSupervisorId
    ) {
      await supabase
        .from("profiles")
        .update({
          time_id: null,
        })
        .eq(
          "id",
          timeAnterior
            .supervisor_id,
        )
        .eq(
          "time_id",
          id,
        );
    }

    const {
      data: timeAtualizado,
      error,
    } = await supabase
      .from("times")
      .update({
        nome,
        supervisor_id:
          novoSupervisorId,
        ativo:
          dados.ativo !== false,
        atualizado_em:
          new Date()
            .toISOString(),
      })
      .eq("id", id)
      .select(`
        id,
        nome,
        supervisor_id,
        ativo,
        criado_em,
        atualizado_em
      `)
      .single();

    if (
      error ||
      !timeAtualizado
    ) {
      return respostaErro(
        `Não foi possível atualizar o time: ${
          error?.message ||
          "erro desconhecido"
        }`,
        500,
      );
    }

    if (novoSupervisorId) {
      const {
        error:
          erroVinculoSupervisora,
      } = await supabase
        .from("profiles")
        .update({
          time_id: id,
        })
        .eq(
          "id",
          novoSupervisorId,
        );

      if (
        erroVinculoSupervisora
      ) {
        return respostaErro(
          `O time foi atualizado, mas não foi possível vincular a supervisora: ${erroVinculoSupervisora.message}`,
          500,
        );
      }
    }

    return NextResponse.json({
      mensagem:
        "Time atualizado com sucesso.",
      time: timeAtualizado,
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao atualizar o time.",
      500,
    );
  }
}

export async function DELETE(
  request: NextRequest,
) {
  try {
    const autenticacao =
      await autenticarAdministradora(
        request,
      );

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const {
      supabase,
      perfil,
    } = autenticacao;

    if (
      perfil !== "Administradora"
    ) {
      return respostaErro(
        "Somente uma Administradora pode excluir times.",
        403,
      );
    }

    const dados =
      (await request.json()) as {
        id?: string;
      };

    const id = String(
      dados.id || "",
    ).trim();

    if (!id) {
      return respostaErro(
        "Time não informado.",
        400,
      );
    }

    const {
      data: time,
      error:
        erroTime,
    } = await supabase
      .from("times")
      .select(
        "id, nome",
      )
      .eq("id", id)
      .single();

    if (
      erroTime ||
      !time
    ) {
      return respostaErro(
        "Time não encontrado.",
        404,
      );
    }

    const {
      error:
        erroDesvinculo,
    } = await supabase
      .from("profiles")
      .update({
        time_id: null,
      })
      .eq("time_id", id);

    if (erroDesvinculo) {
      return respostaErro(
        `Não foi possível desvincular os usuários do time: ${erroDesvinculo.message}`,
        500,
      );
    }

    const {
      error:
        erroExclusao,
    } = await supabase
      .from("times")
      .delete()
      .eq("id", id);

    if (erroExclusao) {
      return respostaErro(
        `Não foi possível excluir o time: ${erroExclusao.message}`,
        500,
      );
    }

    return NextResponse.json({
      mensagem:
        `Time "${time.nome}" excluído com sucesso.`,
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao excluir o time.",
      500,
    );
  }
}