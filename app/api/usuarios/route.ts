import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PERFIS_PERMITIDOS = [
  "Administradora",
  "Coordenadora",
  "Supervisora",
  "Consultora",
  "Operacional",
  "Financeiro",
] as const;

type PerfilPermitido =
  (typeof PERFIS_PERMITIDOS)[number];

type DadosUsuario = {
  id?: string;
  nome?: string;
  email?: string;
  senha?: string;
  perfil?: string;
  equipe?: string;
  ativo?: boolean;
  foto_url?: string;
};

function respostaErro(
  erro: string,
  status: number
) {
  return NextResponse.json(
    { erro },
    { status }
  );
}

function perfilValido(
  valor: string
): valor is PerfilPermitido {
  return PERFIS_PERMITIDOS.includes(
    valor as PerfilPermitido
  );
}

async function autenticarAdministradora(
  request: NextRequest
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
        401
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
        500
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
    return {
      resposta: respostaErro(
        "Sua sessão não é válida. Entre novamente.",
        401
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
      dadosAutenticacao.user.id
    )
    .single();

  if (erroPerfil) {
    return {
      resposta: respostaErro(
        `Não foi possível consultar seu perfil: ${erroPerfil.message}`,
        500
      ),
    };
  }

  if (
    !perfilAdministradora ||
    perfilAdministradora.perfil !==
      "Administradora" ||
    !perfilAdministradora.ativo
  ) {
    return {
      resposta: respostaErro(
        "Somente uma Administradora ativa pode gerenciar usuários.",
        403
      ),
    };
  }

  return {
    supabase,
    administradoraId:
      dadosAutenticacao.user.id,
  };
}

function tratarErroSupabase(
  mensagem?: string
) {
  const texto =
    String(mensagem || "").toLowerCase();

  if (
    texto.includes("already") ||
    texto.includes("registered") ||
    texto.includes("duplicate")
  ) {
    return "Já existe um usuário com esse e-mail.";
  }

  return (
    mensagem ||
    "Não foi possível concluir a operação."
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const autenticacao =
      await autenticarAdministradora(
        request
      );

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { supabase } =
      autenticacao;

    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        nome,
        email,
        perfil,
        equipe,
        ativo,
        foto_url,
        criado_em
      `)
      .order("nome", {
        ascending: true,
      });

    if (error) {
      return respostaErro(
        "Não foi possível carregar os usuários.",
        500
      );
    }

    return NextResponse.json({
      usuarios: data || [],
    });
  } catch {
    return respostaErro(
      "Ocorreu um erro ao carregar os usuários.",
      500
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const autenticacao =
      await autenticarAdministradora(
        request
      );

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { supabase } =
      autenticacao;

    const dados =
      (await request.json()) as DadosUsuario;

    const nome = String(
      dados.nome || ""
    ).trim();

    const email = String(
      dados.email || ""
    )
      .trim()
      .toLowerCase();

    const senha = String(
      dados.senha || ""
    );

    const perfil = String(
      dados.perfil || ""
    ).trim();

    const equipe = String(
      dados.equipe || ""
    ).trim();

    const fotoUrl = String(
      dados.foto_url || ""
    );

    if (!nome) {
      return respostaErro(
        "Informe o nome da colaboradora.",
        400
      );
    }

    const emailValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      );

    if (!emailValido) {
      return respostaErro(
        "Informe um endereço de e-mail válido.",
        400
      );
    }

    if (senha.length < 6) {
      return respostaErro(
        "A senha precisa ter pelo menos 6 caracteres.",
        400
      );
    }

    if (!perfilValido(perfil)) {
      return respostaErro(
        "Selecione um perfil válido.",
        400
      );
    }

    const {
      data: usuarioCriado,
      error: erroCriacao,
    } =
      await supabase.auth.admin.createUser(
        {
          email,
          password: senha,
          email_confirm: true,
          user_metadata: {
            nome,
            perfil,
            equipe,
            foto_url: fotoUrl,
          },
        }
      );

    if (
      erroCriacao ||
      !usuarioCriado.user
    ) {
      return respostaErro(
        tratarErroSupabase(
          erroCriacao?.message
        ),
        400
      );
    }

    const ativo =
      dados.ativo !== false;

    const {
      data: perfilCriado,
      error: erroPerfil,
    } = await supabase
      .from("profiles")
      .update({
        nome,
        email,
        perfil,
        equipe,
        ativo,
        foto_url: fotoUrl,
      })
      .eq(
        "id",
        usuarioCriado.user.id
      )
      .select(`
        id,
        nome,
        email,
        perfil,
        equipe,
        ativo,
        foto_url,
        criado_em
      `)
      .single();

    if (erroPerfil) {
      await supabase
        .auth
        .admin
        .deleteUser(
          usuarioCriado.user.id
        );

      return respostaErro(
        "O acesso foi criado, mas não foi possível salvar o perfil. Tente novamente.",
        500
      );
    }

    return NextResponse.json(
      {
        mensagem:
          "Usuário criado com sucesso.",
        usuario: perfilCriado,
      },
      {
        status: 201,
      }
    );
  } catch {
    return respostaErro(
      "Ocorreu um erro ao criar o usuário.",
      500
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const autenticacao =
      await autenticarAdministradora(
        request
      );

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { supabase } =
      autenticacao;

    const dados =
      (await request.json()) as DadosUsuario;

    const id = String(
      dados.id || ""
    ).trim();

    const nome = String(
      dados.nome || ""
    ).trim();

    const email = String(
      dados.email || ""
    )
      .trim()
      .toLowerCase();

    const senha = String(
      dados.senha || ""
    );

    const perfil = String(
      dados.perfil || ""
    ).trim();

    const equipe = String(
      dados.equipe || ""
    ).trim();

    const fotoUrl = String(
      dados.foto_url || ""
    );

    const ativo =
      dados.ativo !== false;

    if (!id) {
      return respostaErro(
        "Usuário não informado.",
        400
      );
    }

    if (!nome) {
      return respostaErro(
        "Informe o nome da colaboradora.",
        400
      );
    }

    const emailValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      );

    if (!emailValido) {
      return respostaErro(
        "Informe um endereço de e-mail válido.",
        400
      );
    }

    if (
      senha &&
      senha.length < 6
    ) {
      return respostaErro(
        "A nova senha precisa ter pelo menos 6 caracteres.",
        400
      );
    }

    if (!perfilValido(perfil)) {
      return respostaErro(
        "Selecione um perfil válido.",
        400
      );
    }

    const {
      data: perfilAnterior,
      error: erroPerfilAnterior,
    } = await supabase
      .from("profiles")
      .select(
        "id, perfil, ativo, email"
      )
      .eq("id", id)
      .single();

    if (
      erroPerfilAnterior ||
      !perfilAnterior
    ) {
      return respostaErro(
        "Usuário não encontrado.",
        404
      );
    }

    const deixaraDeSerAdminAtiva =
      perfilAnterior.perfil ===
        "Administradora" &&
      perfilAnterior.ativo &&
      (
        perfil !==
          "Administradora" ||
        !ativo
      );

    if (
      deixaraDeSerAdminAtiva
    ) {
      const {
        count,
        error: erroContagem,
      } = await supabase
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "perfil",
          "Administradora"
        )
        .eq("ativo", true)
        .neq("id", id);

      if (erroContagem) {
        return respostaErro(
          "Não foi possível verificar as administradoras.",
          500
        );
      }

      if (!count) {
        return respostaErro(
          "Não é possível desativar ou alterar a única Administradora ativa.",
          400
        );
      }
    }

    const atributosAuth: {
      email?: string;
      password?: string;
      email_confirm?: boolean;
      user_metadata: {
        nome: string;
        perfil: string;
        equipe: string;
        foto_url: string;
      };
    } = {
      user_metadata: {
        nome,
        perfil,
        equipe,
        foto_url: fotoUrl,
      },
    };

    if (
      email !==
      String(
        perfilAnterior.email || ""
      ).toLowerCase()
    ) {
      atributosAuth.email = email;
      atributosAuth.email_confirm = true;
    }

    if (senha) {
      atributosAuth.password = senha;
    }

    const {
      error: erroAtualizacaoAuth,
    } =
      await supabase
        .auth
        .admin
        .updateUserById(
          id,
          atributosAuth
        );

    if (erroAtualizacaoAuth) {
      return respostaErro(
        tratarErroSupabase(
          erroAtualizacaoAuth.message
        ),
        400
      );
    }

    const {
      data: perfilAtualizado,
      error: erroAtualizacaoPerfil,
    } = await supabase
      .from("profiles")
      .update({
        nome,
        email,
        perfil,
        equipe,
        ativo,
        foto_url: fotoUrl,
      })
      .eq("id", id)
      .select(`
        id,
        nome,
        email,
        perfil,
        equipe,
        ativo,
        foto_url,
        criado_em
      `)
      .single();

    if (
      erroAtualizacaoPerfil ||
      !perfilAtualizado
    ) {
      return respostaErro(
        "O acesso foi atualizado, mas não foi possível atualizar o perfil.",
        500
      );
    }

    return NextResponse.json({
      mensagem:
        "Usuário atualizado com sucesso.",
      usuario: perfilAtualizado,
    });
  } catch {
    return respostaErro(
      "Ocorreu um erro ao atualizar o usuário.",
      500
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const autenticacao =
      await autenticarAdministradora(
        request
      );

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const {
      supabase,
      administradoraId,
    } = autenticacao;

    const dados =
      (await request.json()) as {
        id?: string;
      };

    const id = String(
      dados.id || ""
    ).trim();

    if (!id) {
      return respostaErro(
        "Usuário não informado.",
        400
      );
    }

    if (
      id === administradoraId
    ) {
      return respostaErro(
        "Você não pode excluir o próprio usuário enquanto está conectada.",
        400
      );
    }

    const {
      data: perfilExcluido,
      error: erroPerfil,
    } = await supabase
      .from("profiles")
      .select(
        "perfil, ativo"
      )
      .eq("id", id)
      .single();

    if (
      erroPerfil ||
      !perfilExcluido
    ) {
      return respostaErro(
        "Usuário não encontrado.",
        404
      );
    }

    if (
      perfilExcluido.perfil ===
        "Administradora" &&
      perfilExcluido.ativo
    ) {
      const {
        count,
        error: erroContagem,
      } = await supabase
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "perfil",
          "Administradora"
        )
        .eq("ativo", true)
        .neq("id", id);

      if (erroContagem) {
        return respostaErro(
          "Não foi possível verificar as administradoras.",
          500
        );
      }

      if (!count) {
        return respostaErro(
          "Não é possível excluir a única Administradora ativa.",
          400
        );
      }
    }

    const {
      error: erroExclusao,
    } =
      await supabase
        .auth
        .admin
        .deleteUser(id);

    if (erroExclusao) {
      return respostaErro(
        tratarErroSupabase(
          erroExclusao.message
        ),
        400
      );
    }

    return NextResponse.json({
      mensagem:
        "Usuário excluído com sucesso.",
    });
  } catch {
    return respostaErro(
      "Ocorreu um erro ao excluir o usuário.",
      500
    );
  }
}