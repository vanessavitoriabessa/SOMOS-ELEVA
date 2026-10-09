import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const META_API_VERSION = "v26.0";

// CA-03 GOVERNO
const META_AD_ACCOUNT_ID = "1316374293278442";

type MetaAction = {
  action_type?: string;
  value?: string;
};

type MetaInsight = {
  campaign_name?: string;
  actions?: MetaAction[];
  date_start?: string;
  date_stop?: string;
};

type MetaError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

type MetaResponse = {
  data?: MetaInsight[];
  error?: MetaError;
  paging?: unknown;
};

function somarLeads(actions?: MetaAction[]) {
  if (!Array.isArray(actions)) {
    return 0;
  }

  /*
   * IMPORTANTE:
   * Não somamos "lead" + "onsite_web_lead" +
   * "offsite_conversion.fb_pixel_lead".
   *
   * No retorno da Meta eles representam o mesmo resultado
   * em classificações diferentes.
   *
   * O Gerenciador de Anúncios está mostrando "Leads no site".
   * Nos testes realizados, "lead" correspondeu exatamente
   * ao resultado exibido no Gerenciador.
   */
  const lead = actions.find(
    (item) => item.action_type === "lead",
  );

  return Number(lead?.value || 0);
}

function validarData(data: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(data);
}

export async function GET(request: NextRequest) {
  try {
    /*
     * O token fica somente no servidor/Vercel.
     * trim() remove espaços ou quebras de linha acidentais
     * que possam ter sido inseridos ao salvar a variável.
     */
    const token = process.env.META_ACCESS_TOKEN?.trim();

    if (!token) {
      console.error(
        "[META] META_ACCESS_TOKEN não configurado.",
      );

      return NextResponse.json(
        {
          sucesso: false,
          erro: "META_ACCESS_TOKEN não configurado.",
          origem: "configuracao",
        },
        {
          status: 500,
        },
      );
    }

    const { searchParams } = new URL(request.url);

    const hoje = new Date().toISOString().slice(0, 10);

    const inicio =
      searchParams.get("inicio") || hoje;

    const fim =
      searchParams.get("fim") || inicio;

    if (!validarData(inicio) || !validarData(fim)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Data inválida. Use o formato AAAA-MM-DD.",
          origem: "parametros",
        },
        {
          status: 400,
        },
      );
    }

    const timeRange = JSON.stringify({
      since: inicio,
      until: fim,
    });

    const campos = [
      "campaign_name",
      "actions",
    ].join(",");

    const endpoint =
      `https://graph.facebook.com/${META_API_VERSION}` +
      `/act_${META_AD_ACCOUNT_ID}/insights`;

    const params = new URLSearchParams({
      level: "campaign",
      fields: campos,
      time_range: timeRange,
      limit: "500",
    });

    /*
     * Enviamos o token no cabeçalho Authorization.
     * Assim ele não fica incluído na URL da requisição.
     */
    const resposta = await fetch(
      `${endpoint}?${params.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const dados =
      (await resposta.json()) as MetaResponse;

    if (!resposta.ok || dados.error) {
      const erroMeta = dados.error;

      /*
       * Nunca registramos o token.
       * Registramos apenas os dados de diagnóstico
       * devolvidos pela própria Meta.
       */
      console.error("[META] Falha na API:", {
        http_status: resposta.status,
        message: erroMeta?.message,
        type: erroMeta?.type,
        code: erroMeta?.code,
        error_subcode: erroMeta?.error_subcode,
        fbtrace_id: erroMeta?.fbtrace_id,
      });

      return NextResponse.json(
        {
          sucesso: false,
          erro:
            erroMeta?.message ||
            "Erro ao consultar a API da Meta.",

          diagnostico: {
            http_status: resposta.status,
            tipo: erroMeta?.type || null,
            codigo: erroMeta?.code || null,
            subcodigo:
              erroMeta?.error_subcode || null,
            fbtrace_id:
              erroMeta?.fbtrace_id || null,
          },
        },
        {
          status:
            resposta.status >= 400
              ? resposta.status
              : 500,
        },
      );
    }

    const campanhas = (dados.data || []).map(
      (campanha) => ({
        campanha:
          campanha.campaign_name ||
          "Campanha sem nome",

        leads: somarLeads(
          campanha.actions,
        ),

        data_inicio:
          campanha.date_start ||
          inicio,

        data_fim:
          campanha.date_stop ||
          fim,
      }),
    );

    const leadsMeta = campanhas.reduce(
      (total, campanha) =>
        total + campanha.leads,
      0,
    );

    return NextResponse.json({
      sucesso: true,

      periodo: {
        inicio,
        fim,
      },

      conta: {
        id: META_AD_ACCOUNT_ID,
        nome: "CA-03 GOVERNO",
      },

      leads_meta: leadsMeta,

      campanhas,
    });
  } catch (erro) {
    console.error(
      "[META] Erro inesperado ao consultar Insights:",
      erro,
    );

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          "Não foi possível consultar os dados da Meta.",
        origem: "servidor",
      },
      {
        status: 500,
      },
    );
  }
}
