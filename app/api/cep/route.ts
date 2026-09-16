import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cep = String(
      request.nextUrl.searchParams.get("cep") || ""
    ).replace(/\D/g, "");

    if (cep.length !== 8) {
      return NextResponse.json(
        { erro: "Informe um CEP válido com 8 números." },
        { status: 400 }
      );
    }

    const resposta = await fetch(
      `https://viacep.com.br/ws/${cep}/json/`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!resposta.ok) {
      return NextResponse.json(
        { erro: "Não foi possível consultar o CEP." },
        { status: 502 }
      );
    }

    const dados = await resposta.json();

    if (dados.erro) {
      return NextResponse.json(
        { erro: "CEP não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      cep: String(dados.cep || ""),
      endereco: String(dados.logradouro || ""),
      complemento: String(dados.complemento || ""),
      bairro: String(dados.bairro || ""),
      cidade: String(dados.localidade || ""),
      uf: String(dados.uf || ""),
    });
  } catch (error) {
    console.error("Erro ao consultar CEP:", error);

    return NextResponse.json(
      { erro: "Erro interno ao consultar o CEP." },
      { status: 500 }
    );
  }
}