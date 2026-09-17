import { NextRequest, NextResponse } from "next/server";

const URL_API =
  "https://elevapromotora.com.br/landing-whatsapp-teste/api-whatsapps.php";

export const dynamic = "force-dynamic";

/*
|--------------------------------------------------------------------------
| GET
| Ler a lista atual de WhatsApps
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    const resposta = await fetch(`${URL_API}?t=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const texto = await resposta.text();

    let dados;

    try {
      dados = JSON.parse(texto);
    } catch {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "O servidor dos WhatsApps retornou uma resposta inválida.",
        },
        { status: 502 },
      );
    }

    if (!resposta.ok) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            dados?.erro ||
            "Não foi possível carregar a lista de WhatsApps.",
        },
        { status: resposta.status },
      );
    }

    return NextResponse.json(dados, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Erro GET /api/whatsapps:", error);

    return NextResponse.json(
      {
        sucesso: false,
        erro: "Não foi possível comunicar com o servidor dos WhatsApps.",
      },
      { status: 500 },
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
| Encaminhar alterações para o servidor da landing
|--------------------------------------------------------------------------
|
| Ações aceitas pelo PHP:
|
| incluir
| editar
| status
| excluir
|
|--------------------------------------------------------------------------
*/

export async function POST(request: NextRequest) {
  try {
    const entrada = await request.json();

    if (!entrada || typeof entrada !== "object") {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Dados da operação inválidos.",
        },
        { status: 400 },
      );
    }

    const acao = String(entrada.acao || "").trim();

    const acoesPermitidas = [
      "incluir",
      "editar",
      "status",
      "excluir",
    ];

    if (!acoesPermitidas.includes(acao)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Ação inválida.",
        },
        { status: 400 },
      );
    }

    const resposta = await fetch(URL_API, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(entrada),
    });

    const texto = await resposta.text();

    let dados;

    try {
      dados = JSON.parse(texto);
    } catch {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "O servidor dos WhatsApps retornou uma resposta inválida.",
        },
        { status: 502 },
      );
    }

    if (!resposta.ok || dados?.sucesso === false) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            dados?.erro ||
            "Não foi possível concluir a alteração.",
        },
        {
          status:
            resposta.status >= 400
              ? resposta.status
              : 500,
        },
      );
    }

    return NextResponse.json(dados, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Erro POST /api/whatsapps:", error);

    return NextResponse.json(
      {
        sucesso: false,
        erro: "Não foi possível comunicar com o servidor dos WhatsApps.",
      },
      { status: 500 },
    );
  }
}