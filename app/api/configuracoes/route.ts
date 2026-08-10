import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type BancoPayload = {
  id?: string;
  nome?: string;
  ativo?: boolean;
};

type TabelaPayload = {
  id?: string;
  banco?: string;
  orgaoConvenio?: string;
  nome?: string;
  codigo?: string;
  percentual?: number | string;
  ativo?: boolean;
};

async function autenticar(
  request: NextRequest,
) {
  const autorizacao =
    request.headers.get("authorization");

  if (
    !autorizacao ||
    !autorizacao.startsWith("Bearer ")
  ) {
    return {
      erro: NextResponse.json(
        {
          erro:
            "Você precisa estar autenticada.",
        },
        {
          status: 401,
        },
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

  if (!supabaseUrl || !publishableKey) {
    return {
      erro: NextResponse.json(
        {
          erro:
            "A conexão com o Supabase não foi configurada.",
        },
        {
          status: 500,
        },
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
      erro: NextResponse.json(
        {
          erro:
            "Sua sessão não é válida. Entre novamente.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  return {
    usuario: dadosAutenticacao.user,
  };
}

function numero(valor: unknown) {
  const convertido = Number(
    String(valor ?? "")
      .replace(/[^\d,.-]/g, "")
      .replace(",", "."),
  );

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}

export async function GET(
  request: NextRequest,
) {
  try {
    const auth = await autenticar(request);

    if ("erro" in auth) {
      return auth.erro;
    }

    const supabase =
      createAdminClient();

    const [
      bancosResposta,
      tabelasResposta,
    ] = await Promise.all([
      supabase
        .from("config_bancos")
        .select(
          "id, nome, ativo, criado_em, atualizado_em",
        )
        .order("nome", {
          ascending: true,
        }),

      supabase
        .from("config_tabelas")
        .select(
          "id, banco, orgao_convenio, nome, codigo, percentual, ativo, criado_em, atualizado_em",
        )
        .order("banco", {
          ascending: true,
        })
        .order("nome", {
          ascending: true,
        }),
    ]);

    if (bancosResposta.error) {
      throw new Error(
        bancosResposta.error.message,
      );
    }

    if (tabelasResposta.error) {
      throw new Error(
        tabelasResposta.error.message,
      );
    }

    return NextResponse.json({
      bancos: bancosResposta.data || [],
      tabelas: tabelasResposta.data || [],
    });
  } catch (erro) {
    console.error(erro);

    return NextResponse.json(
      {
        erro:
          erro instanceof Error
            ? erro.message
            : "Não foi possível carregar as configurações.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const auth = await autenticar(request);

    if ("erro" in auth) {
      return auth.erro;
    }

    const body =
      (await request.json()) as {
        acao?: string;
        banco?: BancoPayload;
        tabela?: TabelaPayload;
      };

    const supabase =
      createAdminClient();

    if (body.acao === "criar_banco") {
      const nome = String(
        body.banco?.nome || "",
      )
        .trim()
        .toUpperCase();

      if (!nome) {
        return NextResponse.json(
          {
            erro:
              "Informe o nome do banco.",
          },
          {
            status: 400,
          },
        );
      }

      const {
        data,
        error,
      } = await supabase
        .from("config_bancos")
        .insert({
          nome,
          ativo: true,
          atualizado_em:
            new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        if (
          error.code === "23505"
        ) {
          return NextResponse.json(
            {
              erro:
                "Esse banco já está cadastrado.",
            },
            {
              status: 409,
            },
          );
        }

        throw new Error(error.message);
      }

      return NextResponse.json({
        banco: data,
        mensagem:
          "Banco cadastrado com sucesso.",
      });
    }

    if (body.acao === "criar_tabela") {
      const banco = String(
        body.tabela?.banco || "",
      )
        .trim()
        .toUpperCase();

      const orgaoConvenio = String(
        body.tabela?.orgaoConvenio || "",
      )
        .trim()
        .toUpperCase();

      const nome = String(
        body.tabela?.nome || "",
      )
        .trim()
        .toUpperCase();

      const codigo = String(
        body.tabela?.codigo || "",
      ).trim();

      const percentual =
        numero(
          body.tabela?.percentual,
        );

      if (!banco) {
        return NextResponse.json(
          {
            erro:
              "Selecione o banco.",
          },
          {
            status: 400,
          },
        );
      }

      if (!nome) {
        return NextResponse.json(
          {
            erro:
              "Informe o nome da tabela.",
          },
          {
            status: 400,
          },
        );
      }

      if (!codigo) {
        return NextResponse.json(
          {
            erro:
              "Informe o código da tabela.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        percentual <= 0 ||
        percentual > 100
      ) {
        return NextResponse.json(
          {
            erro:
              "Informe um percentual entre 0,01% e 100%.",
          },
          {
            status: 400,
          },
        );
      }

      const {
        data,
        error,
      } = await supabase
        .from("config_tabelas")
        .insert({
          banco,
          orgao_convenio: orgaoConvenio || null,
          nome,
          codigo,
          percentual,
          ativo: true,
          atualizado_em:
            new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        if (
          error.code === "23505"
        ) {
          return NextResponse.json(
            {
              erro:
                "Já existe uma tabela com esse mesmo banco, órgão/convênio e nome.",
            },
            {
              status: 409,
            },
          );
        }

        throw new Error(error.message);
      }

      return NextResponse.json({
        tabela: data,
        mensagem:
          "Tabela cadastrada com sucesso.",
      });
    }

    return NextResponse.json(
      {
        erro:
          "Ação inválida.",
      },
      {
        status: 400,
      },
    );
  } catch (erro) {
    console.error(erro);

    return NextResponse.json(
      {
        erro:
          erro instanceof Error
            ? erro.message
            : "Não foi possível salvar a configuração.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const auth = await autenticar(request);

    if ("erro" in auth) {
      return auth.erro;
    }

    const body =
      (await request.json()) as {
        acao?: string;
        banco?: BancoPayload;
        tabela?: TabelaPayload;
      };

    const supabase =
      createAdminClient();

    if (body.acao === "editar_banco") {
      const id = String(
        body.banco?.id || "",
      );

      const nome = String(
        body.banco?.nome || "",
      )
        .trim()
        .toUpperCase();

      if (!id) {
        return NextResponse.json(
          {
            erro:
              "Banco não informado.",
          },
          {
            status: 400,
          },
        );
      }

      const atualizacao: Record<
        string,
        unknown
      > = {
        atualizado_em:
          new Date().toISOString(),
      };

      if (nome) {
        atualizacao.nome = nome;
      }

      if (
        typeof body.banco?.ativo ===
        "boolean"
      ) {
        atualizacao.ativo =
          body.banco.ativo;
      }

      const {
        data,
        error,
      } = await supabase
        .from("config_bancos")
        .update(atualizacao)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        banco: data,
        mensagem:
          "Banco atualizado com sucesso.",
      });
    }

    if (body.acao === "editar_tabela") {
      const id = String(
        body.tabela?.id || "",
      );

      if (!id) {
        return NextResponse.json(
          {
            erro:
              "Tabela não informada.",
          },
          {
            status: 400,
          },
        );
      }

      const atualizacao: Record<
        string,
        unknown
      > = {
        atualizado_em:
          new Date().toISOString(),
      };

      if (body.tabela?.banco) {
        atualizacao.banco =
          String(
            body.tabela.banco,
          )
            .trim()
            .toUpperCase();
      }

      if (body.tabela?.orgaoConvenio !== undefined) {
        const orgaoConvenio = String(
          body.tabela.orgaoConvenio || "",
        )
          .trim()
          .toUpperCase();

        atualizacao.orgao_convenio = orgaoConvenio || null;
      }

      if (body.tabela?.nome) {
        atualizacao.nome =
          String(
            body.tabela.nome,
          )
            .trim()
            .toUpperCase();
      }

      if (
        body.tabela?.codigo !==
        undefined
      ) {
        atualizacao.codigo =
          String(
            body.tabela.codigo,
          ).trim();
      }

      if (
        body.tabela?.percentual !==
        undefined
      ) {
        const percentual =
          numero(
            body.tabela.percentual,
          );

        if (
          percentual <= 0 ||
          percentual > 100
        ) {
          return NextResponse.json(
            {
              erro:
                "Informe um percentual entre 0,01% e 100%.",
            },
            {
              status: 400,
            },
          );
        }

        atualizacao.percentual =
          percentual;
      }

      if (
        typeof body.tabela?.ativo ===
        "boolean"
      ) {
        atualizacao.ativo =
          body.tabela.ativo;
      }

      const {
        data,
        error,
      } = await supabase
        .from("config_tabelas")
        .update(atualizacao)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        tabela: data,
        mensagem:
          "Tabela atualizada com sucesso.",
      });
    }

    return NextResponse.json(
      {
        erro:
          "Ação inválida.",
      },
      {
        status: 400,
      },
    );
  } catch (erro) {
    console.error(erro);

    return NextResponse.json(
      {
        erro:
          erro instanceof Error
            ? erro.message
            : "Não foi possível atualizar a configuração.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
) {
  try {
    const auth = await autenticar(request);

    if ("erro" in auth) {
      return auth.erro;
    }

    const body =
      (await request.json()) as {
        tipo?: "banco" | "tabela";
        id?: string;
      };

    const id = String(
      body.id || "",
    );

    if (!id) {
      return NextResponse.json(
        {
          erro:
            "Registro não informado.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      createAdminClient();

    if (body.tipo === "banco") {
      const {
        data: banco,
        error: erroBanco,
      } = await supabase
        .from("config_bancos")
        .select("nome")
        .eq("id", id)
        .single();

      if (erroBanco) {
        throw new Error(
          erroBanco.message,
        );
      }

      const {
        error: erroTabelas,
      } = await supabase
        .from("config_tabelas")
        .delete()
        .eq("banco", banco.nome);

      if (erroTabelas) {
        throw new Error(
          erroTabelas.message,
        );
      }

      const {
        error,
      } = await supabase
        .from("config_bancos")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        mensagem:
          "Banco excluído com sucesso.",
      });
    }

    if (body.tipo === "tabela") {
      const {
        error,
      } = await supabase
        .from("config_tabelas")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        mensagem:
          "Tabela excluída com sucesso.",
      });
    }

    return NextResponse.json(
      {
        erro:
          "Tipo inválido.",
      },
      {
        status: 400,
      },
    );
  } catch (erro) {
    console.error(erro);

    return NextResponse.json(
      {
        erro:
          erro instanceof Error
            ? erro.message
            : "Não foi possível excluir a configuração.",
      },
      {
        status: 500,
      },
    );
  }
}