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

type MetaResponse = {
  data?: MetaInsight[];
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
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

export async function GET(request: NextRequest) {
  try {
    const token = process.env.META_ACCESS_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "META_ACCESS_TOKEN não configurado.",
        },
        {
          status: 500,
        },
      );
    }

    const { searchParams } = new URL(request.url);

    const inicio =
      searchParams.get("inicio") ||
      new Date().toISOString().slice(0, 10);

    const fim =
      searchParams.get("fim") ||
      inicio;

    const timeRange = JSON.stringify({
      since: inicio,
      until: fim,
    });

    const campos = [
      "campaign_name",
      "actions",
    ].join(",");

    const url =
      `https://graph.facebook.com/${META_API_VERSION}` +
      `/act_${META_AD_ACCOUNT_ID}/insights` +
      `?level=campaign` +
      `&fields=${encodeURIComponent(campos)}` +
      `&time_range=${encodeURIComponent(timeRange)}` +
      `&limit=500` +
      `&access_token=${encodeURIComponent(token)}`;

    const resposta = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const dados =
      (await resposta.json()) as MetaResponse;

    if (!resposta.ok || dados.error) {
      console.error(
        "Erro da API da Meta:",
        dados.error,
      );

      return NextResponse.json(
        {
          sucesso: false,
          erro:
            dados.error?.message ||
            "Erro ao consultar a API da Meta.",
        },
        {
          status: resposta.status || 500,
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
      "Erro ao consultar Insights da Meta:",
      erro,
    );

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          "Não foi possível consultar os dados da Meta.",
      },
      {
        status: 500,
      },
    );
  }
}