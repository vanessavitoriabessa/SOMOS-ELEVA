import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const META_AD_ACCOUNT_ID = "1316374293278442";
const META_API_VERSION = "v26.0";

export async function GET(request: NextRequest) {
  try {
    const token = process.env.META_ADS_ACCESS_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "META_ADS_ACCESS_TOKEN não configurado.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    const inicio = searchParams.get("inicio");
    const fim = searchParams.get("fim");

    if (!inicio || !fim) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Informe inicio e fim no formato YYYY-MM-DD.",
        },
        { status: 400 }
      );
    }

    const timeRange = JSON.stringify({
      since: inicio,
      until: fim,
    });

    const params = new URLSearchParams({
      fields: "campaign_name,actions",
      level: "campaign",
      time_range: timeRange,
      limit: "500",
      access_token: token,
    });

    const url =
      `https://graph.facebook.com/${META_API_VERSION}/` +
      `act_${META_AD_ACCOUNT_ID}/insights?${params.toString()}`;

    const resposta = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const dados = await resposta.json();

    if (!resposta.ok || dados.error) {
      console.error("Erro Meta Ads:", dados);

      return NextResponse.json(
        {
          sucesso: false,
          erro: "Não foi possível consultar os leads da Meta.",
          detalhe: dados?.error?.message ?? null,
        },
        { status: 500 }
      );
    }

    const campanhas = (dados.data ?? []).map((campanha: any) => {
      const actions = Array.isArray(campanha.actions)
        ? campanha.actions
        : [];

      const lead = actions.find(
        (acao: any) =>
          acao.action_type === "offsite_conversion.fb_pixel_lead"
      );

      return {
        campanha: campanha.campaign_name ?? "",
        leads: Number(lead?.value ?? 0),
      };
    });

    const leadsMeta = campanhas.reduce(
      (total: number, campanha: { leads: number }) =>
        total + campanha.leads,
      0
    );

    return NextResponse.json({
      sucesso: true,
      periodo: {
        inicio,
        fim,
      },
      leads_meta: leadsMeta,
      campanhas,
    });
  } catch (erro) {
    console.error("Erro ao consultar Meta Ads:", erro);

    return NextResponse.json(
      {
        sucesso: false,
        erro: "Erro interno ao consultar a Meta.",
      },
      { status: 500 }
    );
  }
}