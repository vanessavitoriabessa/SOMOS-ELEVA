import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Perfil = {
  id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
};

type ProdutoRanking =
  | "Todos"
  | "Compra de Dívida"
  | "CLT";

type ConsultoraRanking = {
  id: string;
  nome: string;
  fotoUrl: string;
  timeId: string | null;
};

type LinhaProposta = {
  consultora_id?: string | null;
  vendedora?: string | null;
  valor_contrato?: number | string | null;
  valor_meta?: number | string | null;
  percentual_tabela?: number | string | null;
  status?: string | null;
  data_cadastro?: string | null;
  data_pagamento?: string | null;
};

type LinhaClt = {
  consultora_id?: string | null;
  consultora?: string | null;
  parcela?: number | string | null;
  status?: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
  data_pagamento?: string | null;
};

type AcumuladoRanking = {
  id: string;
  nome: string;
  fotoUrl: string;
  timeId: string | null;
  contratosCompra: number;
  contratosClt: number;
  producaoCompra: number;
  producaoClt: number;
};

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function numeroSeguro(valor: unknown) {
  const numero = Number(valor || 0);
  return Number.isFinite(numero) ? numero : 0;
}

function perfilEhConsultora(perfil: unknown) {
  const texto = normalizarTexto(perfil);

  return (
    texto === "consultora" ||
    texto === "consultor" ||
    texto.includes("consultora de vendas") ||
    texto.includes("consultor de vendas") ||
    texto.includes("vendedora") ||
    texto.includes("vendedor")
  );
}

function perfilPodeVerTodos(perfil: unknown) {
  const texto = normalizarTexto(perfil);

  return (
    texto.includes("administrador") ||
    texto.includes("administradora") ||
    texto.includes("supervisor") ||
    texto.includes("supervisora") ||
    texto.includes("coordenador") ||
    texto.includes("coordenadora") ||
    texto === "admin"
  );
}

function statusEhPago(status: unknown) {
  return normalizarTexto(status) === "pago";
}

function respostaErro(
  erro: string,
  status: number,
) {
  return NextResponse.json(
    { erro },
    { status },
  );
}

function dataIsoValida(valor: string | null) {
  const texto = String(valor || "").trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(texto)
    ? texto
    : "";
}

function dataIsoDoValor(valor: unknown) {
  const texto = String(valor || "").trim();
  const encontrada = texto.match(/\d{4}-\d{2}-\d{2}/);

  return encontrada ? encontrada[0] : "";
}

function intervaloPadrao(periodo: string) {
  const hoje = new Date();

  const formatar = (data: Date) =>
    `${data.getFullYear()}-${String(
      data.getMonth() + 1,
    ).padStart(2, "0")}-${String(
      data.getDate(),
    ).padStart(2, "0")}`;

  if (periodo === "Hoje") {
    const hojeTexto = formatar(hoje);

    return {
      inicio: hojeTexto,
      fim: hojeTexto,
    };
  }

  if (periodo === "Semana") {
    const inicio = new Date(hoje);
    const dia = inicio.getDay();
    const diferenca =
      dia === 0 ? -6 : 1 - dia;

    inicio.setDate(
      inicio.getDate() + diferenca,
    );

    return {
      inicio: formatar(inicio),
      fim: formatar(hoje),
    };
  }

  if (periodo === "Mês") {
    const inicio = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      1,
    );

    const fim = new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      0,
    );

    return {
      inicio: formatar(inicio),
      fim: formatar(fim),
    };
  }

  return {
    inicio: "",
    fim: "",
  };
}

function estaNoPeriodo(
  valorData: unknown,
  dataInicial: string,
  dataFinal: string,
) {
  if (!dataInicial && !dataFinal) {
    return true;
  }

  const data = dataIsoDoValor(valorData);

  if (!data) {
    return false;
  }

  if (dataInicial && data < dataInicial) {
    return false;
  }

  if (dataFinal && data > dataFinal) {
    return false;
  }

  return true;
}

function valorProducaoCompra(
  linha: LinhaProposta,
) {
  const valorMeta =
    numeroSeguro(linha.valor_meta);

  if (valorMeta > 0) {
    return valorMeta;
  }

  const valorContrato =
    numeroSeguro(linha.valor_contrato);

  const percentual =
    numeroSeguro(
      linha.percentual_tabela,
    );

  if (percentual > 0) {
    return (
      valorContrato *
      (percentual / 100)
    );
  }

  return valorContrato;
}

function nomesCorrespondem(
  nomeA: unknown,
  nomeB: unknown,
) {
  const a = normalizarTexto(nomeA);
  const b = normalizarTexto(nomeB);

  if (!a || !b) return false;
  if (a === b) return true;

  const menor =
    a.length <= b.length ? a : b;
  const maior =
    a.length > b.length ? a : b;

  return (
    menor.length >= 5 &&
    maior.includes(menor)
  );
}

function encontrarConsultora(
  consultoras: ConsultoraRanking[],
  id: unknown,
  nome: unknown,
) {
  const idTexto = String(id || "").trim();

  if (idTexto) {
    const porId = consultoras.find(
      (consultora) =>
        consultora.id === idTexto,
    );

    if (porId) {
      return porId;
    }
  }

  return consultoras.find(
    (consultora) =>
      nomesCorrespondem(
        consultora.nome,
        nome,
      ),
  );
}

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
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
    data: perfil,
    error: erroPerfil,
  } = await supabase
    .from("profiles")
    .select(
      "id, nome, perfil, ativo",
    )
    .eq(
      "id",
      dadosAutenticacao.user.id,
    )
    .single();

  if (
    erroPerfil ||
    !perfil ||
    !perfil.ativo
  ) {
    return {
      resposta: respostaErro(
        "Não foi possível localizar seu perfil.",
        403,
      ),
    };
  }

  return {
    supabase,
    perfil: perfil as Perfil,
  };
}

export async function GET(
  request: NextRequest,
) {
  try {
    const autenticacao =
      await autenticar(request);

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const {
      supabase,
      perfil,
    } = autenticacao;

    const url =
      new URL(request.url);

    const periodo =
      url.searchParams.get("periodo") ||
      "Mês";

    const produtoInformado =
      String(
        url.searchParams.get("produto") ||
          "Todos",
      ) as ProdutoRanking;

    const produto: ProdutoRanking =
      [
        "Todos",
        "Compra de Dívida",
        "CLT",
      ].includes(produtoInformado)
        ? produtoInformado
        : "Todos";

    const timeSelecionado =
      String(
        url.searchParams.get("timeId") ||
          "Todos",
      ).trim();

    const padrao =
      intervaloPadrao(periodo);

    const ignorarDatas =
      periodo === "Todos";

    const dataInicial = ignorarDatas
      ? ""
      : dataIsoValida(
          url.searchParams.get(
            "dataInicial",
          ),
        ) || padrao.inicio;

    const dataFinal = ignorarDatas
      ? ""
      : dataIsoValida(
          url.searchParams.get(
            "dataFinal",
          ),
        ) || padrao.fim;

    const {
      data: perfis,
      error: erroPerfis,
    } = await supabase
      .from("profiles")
      .select(
        "id, nome, perfil, ativo, foto_url, time_id",
      )
      .eq("ativo", true);

    if (erroPerfis) {
      return respostaErro(
        `Não foi possível carregar as consultoras: ${erroPerfis.message}`,
        500,
      );
    }

    const consultoras =
      (perfis || [])
        .filter((item) =>
          perfilEhConsultora(
            item.perfil,
          ),
        )
        .map((item) => ({
          id: String(item.id),
          nome: String(
            item.nome || "",
          ).trim(),
          fotoUrl: String(
            item.foto_url || "",
          ),
          timeId:
            item.time_id == null
              ? null
              : String(item.time_id),
        }))
        .filter(
          (item) =>
            item.nome &&
            (
              timeSelecionado === "Todos" ||
              item.timeId === timeSelecionado
            ),
        );

    const agrupado =
      new Map<string, AcumuladoRanking>();

    consultoras.forEach(
      (consultora) => {
        agrupado.set(
          consultora.id,
          {
            id: consultora.id,
            nome: consultora.nome,
            fotoUrl:
              consultora.fotoUrl,
            timeId:
              consultora.timeId,
            contratosCompra: 0,
            contratosClt: 0,
            producaoCompra: 0,
            producaoClt: 0,
          },
        );
      },
    );

    if (produto !== "CLT") {
      let consultaPropostas = supabase
        .from("propostas")
        .select(`
          consultora_id,
          vendedora,
          valor_contrato,
          valor_meta,
          percentual_tabela,
          status,
          data_cadastro,
          data_pagamento
        `)
        .ilike("status", "pago");

      // Filtra no próprio banco para evitar paginação/limite da consulta geral.
      // Compra de Dívida paga entra pelo pagamento; registros históricos sem
      // data_pagamento continuam sendo tratados pelo fallback abaixo.
      if (dataInicial) {
        consultaPropostas = consultaPropostas.gte(
          "data_pagamento",
          dataInicial,
        );
      }

      if (dataFinal) {
        consultaPropostas = consultaPropostas.lte(
          "data_pagamento",
          dataFinal,
        );
      }

      const {
        data: propostas,
        error: erroPropostas,
      } = await consultaPropostas.range(0, 9999);

      if (erroPropostas) {
        return respostaErro(
          `Não foi possível carregar os contratos de Compra de Dívida: ${erroPropostas.message}`,
          500,
        );
      }

      (
        (propostas || []) as
          LinhaProposta[]
      ).forEach((linha) => {
        if (!statusEhPago(linha.status)) {
          return;
        }

        const dataReferencia =
  linha.data_cadastro;

        if (
          !estaNoPeriodo(
            dataReferencia,
            dataInicial,
            dataFinal,
          )
        ) {
          return;
        }

        const consultora =
          encontrarConsultora(
            consultoras,
            linha.consultora_id,
            linha.vendedora,
          );

        if (!consultora) {
          return;
        }

        const atual =
          agrupado.get(
            consultora.id,
          );

        if (!atual) {
          return;
        }

        atual.contratosCompra += 1;
        atual.producaoCompra +=
          valorProducaoCompra(linha);
      });
    }

    if (produto !== "Compra de Dívida") {
      let consultaClt = supabase
        .from("clt_registros")
        .select(`
          consultora_id,
          consultora,
          parcela,
          status,
          criado_em,
          atualizado_em,
          data_pagamento
        `)
        .ilike("status", "pago");

      // O Ranking deve consultar diretamente a mesma competência usada
      // no relatório CLT. Assim não dependemos do limite padrão de linhas
      // de uma consulta geral para depois filtrar em JavaScript.
      if (dataInicial) {
        consultaClt = consultaClt.gte(
          "data_pagamento",
          dataInicial,
        );
      }

      if (dataFinal) {
        consultaClt = consultaClt.lte(
          "data_pagamento",
          dataFinal,
        );
      }

      const {
        data: registrosClt,
        error: erroClt,
      } = await consultaClt.range(0, 9999);

      if (erroClt) {
        return respostaErro(
          `Não foi possível carregar os contratos CLT: ${erroClt.message}`,
          500,
        );
      }

      (
        (registrosClt || []) as
          LinhaClt[]
      ).forEach((linha) => {
        if (!statusEhPago(linha.status)) {
          return;
        }

        const dataReferencia =
         linha.data_pagamento;

        if (
          !estaNoPeriodo(
            dataReferencia,
            dataInicial,
            dataFinal,
          )
        ) {
          return;
        }

        const consultora =
          encontrarConsultora(
            consultoras,
            linha.consultora_id,
            linha.consultora,
          );

        if (!consultora) {
          return;
        }

        const atual =
          agrupado.get(
            consultora.id,
          );

        if (!atual) {
          return;
        }

        atual.contratosClt += 1;
        atual.producaoClt +=
          numeroSeguro(linha.parcela);
      });
    }

    const rankingCompleto =
      Array.from(
        agrupado.values(),
      )
        .map((item) => ({
          ...item,
          contratos:
            item.contratosCompra +
            item.contratosClt,
          producao:
            item.producaoCompra +
            item.producaoClt,
        }))
        .filter(
          (item) =>
            item.contratos > 0 ||
            item.producao > 0,
        )
        .sort((a, b) => {
          if (
            b.producao !==
            a.producao
          ) {
            return (
              b.producao -
              a.producao
            );
          }

          if (
            b.contratos !==
            a.contratos
          ) {
            return (
              b.contratos -
              a.contratos
            );
          }

          return a.nome.localeCompare(
            b.nome,
            "pt-BR",
          );
        });

    const podeVerTodos =
      perfilPodeVerTodos(
        perfil.perfil,
      );

    const usuarioEhConsultora =
      perfilEhConsultora(
        perfil.perfil,
      );

    const ranking =
      rankingCompleto.map(
        (item, indice) => {
          const ehPropria =
            usuarioEhConsultora &&
            item.id === perfil.id;

          const podeVerValores =
            podeVerTodos ||
            ehPropria;

          return {
            posicao: indice + 1,
            id: item.id,
            nome: item.nome,
            fotoUrl: item.fotoUrl,
            timeId: item.timeId,
            contratosCompra:
              item.contratosCompra,
            contratosClt:
              item.contratosClt,
            contratos:
              item.contratos,
            producaoCompra:
              podeVerValores
                ? item.producaoCompra
                : null,
            producaoClt:
              podeVerValores
                ? item.producaoClt
                : null,
            producao:
              podeVerValores
                ? item.producao
                : null,
          };
        },
      );
const contratosPagos = podeVerTodos
  ? rankingCompleto.reduce(
      (total, item) => total + item.contratos,
      0
    )
  : rankingCompleto
      .filter((item) => item.id === perfil.id)
      .reduce(
        (total, item) => total + item.contratos,
        0
      );

const totalConsultoras = podeVerTodos
  ? rankingCompleto.length
  : rankingCompleto.some((item) => item.id === perfil.id)
    ? 1
    : 0;

    return NextResponse.json({
      perfil: {
        id: perfil.id,
        nome: perfil.nome,
        perfil: perfil.perfil,
      },
      periodo: {
        inicio:
          dataInicial || null,
        fim:
          dataFinal || null,
      },
      produto,
      contratosPagos,
consultoras: totalConsultoras,
      ranking,
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao montar o ranking.",
      500,
    );
  }
}