import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Perfil = {
  id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
};

function respostaErro(erro: string, status: number) {
  return NextResponse.json({ erro }, { status });
}

function apenasNumeros(valor: unknown) {
  return String(valor || "").replace(/\D/g, "");
}

function normalizarPerfil(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function podeAcessar(perfil: string) {
  return [
    "administradora",
    "coordenadora",
    "supervisora",
    "operacional",
    "consultora",
    "financeiro",
  ].includes(normalizarPerfil(perfil));
}

function perfilEhConsultora(perfil: string) {
  return normalizarPerfil(perfil) === "consultora";
}

function nomesCorrespondem(nomeA: unknown, nomeB: unknown) {
  return normalizarPerfil(nomeA) === normalizarPerfil(nomeB);
}

function podeVerTodosOsProtocolos(perfil: string) {
  return [
    "administradora",
    "operacional",
    "coordenadora",
    "supervisora",
  ].includes(normalizarPerfil(perfil));
}

function protocoloPertenceAoPerfil(
  protocolo: {
    consultora_id?: string | null;
    consultora?: string | null;
  },
  perfil: Perfil,
) {
  return (
    protocolo.consultora_id === perfil.id ||
    nomesCorrespondem(protocolo.consultora, perfil.nome)
  );
}

async function autenticar(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      resposta: respostaErro("Você precisa estar autenticada.", 401),
    };
  }

  const token = authorization.replace("Bearer ", "").trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    return {
      resposta: respostaErro(
        "A conexão com o Supabase não foi configurada.",
        500,
      ),
    };
  }

  const verificador = createSupabaseClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await verificador.auth.getUser(token);

  if (error || !data.user) {
    return {
      resposta: respostaErro("Sua sessão não é válida. Entre novamente.", 401),
    };
  }

  const supabase = createAdminClient();

  const { data: perfil, error: erroPerfil } = await supabase
    .from("profiles")
    .select("id, nome, perfil, ativo")
    .eq("id", data.user.id)
    .maybeSingle();

  if (erroPerfil || !perfil) {
    return {
      resposta: respostaErro("Não foi possível localizar seu perfil.", 403),
    };
  }

  const perfilAtual = perfil as Perfil;

  if (!perfilAtual.ativo || !podeAcessar(perfilAtual.perfil)) {
    return {
      resposta: respostaErro("Seu perfil não possui acesso aos protocolos.", 403),
    };
  }

  return {
    supabase,
    perfil: perfilAtual,
    userId: data.user.id,
  };
}

export async function GET(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);
    if ("resposta" in autenticacao) return autenticacao.resposta;

    const { supabase, perfil } = autenticacao;

    const { data: protocolos, error } = await supabase
      .from("protocolos")
      .select("*")
      .order("atualizado_em", { ascending: false });

    if (error) {
      return respostaErro(
        `Não foi possível carregar os protocolos: ${error.message}`,
        500,
      );
    }

    const protocolosPermitidos = perfilEhConsultora(perfil.perfil)
      ? (protocolos || []).filter((item) =>
          protocoloPertenceAoPerfil(item, perfil),
        )
      : podeVerTodosOsProtocolos(perfil.perfil)
        ? protocolos || []
        : [];

    const ids = protocolosPermitidos.map((item) => item.id);

    const { data: historico, error: erroHistorico } = ids.length
      ? await supabase
          .from("protocolo_historico")
          .select("*")
          .in("protocolo_id", ids)
          .order("criado_em", { ascending: false })
      : { data: [], error: null };

    if (erroHistorico) {
      return respostaErro(
        `Não foi possível carregar o histórico: ${erroHistorico.message}`,
        500,
      );
    }

    return NextResponse.json({
      perfil: {
        id: perfil.id,
        nome: perfil.nome,
        perfil: perfil.perfil,
      },
      protocolos: protocolosPermitidos,
      historico: historico || [],
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao carregar os protocolos.",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);
    if ("resposta" in autenticacao) return autenticacao.resposta;

    const { supabase, perfil, userId } = autenticacao;
    const dados = await request.json();

    if (dados.acao === "registrar_historico") {
      const protocoloId = String(dados.protocoloId || "").trim();
      const descricao = String(dados.descricao || "").trim();

      if (!protocoloId || !descricao) {
        return respostaErro(
          "Informe o protocolo e a descrição do contato.",
          400,
        );
      }

      const { data: protocoloAtual, error: erroProtocoloAtual } =
        await supabase
          .from("protocolos")
          .select("id, consultora_id, consultora")
          .eq("id", protocoloId)
          .single();

      if (erroProtocoloAtual || !protocoloAtual) {
        return respostaErro("Protocolo não encontrado.", 404);
      }

      if (
        perfilEhConsultora(perfil.perfil) &&
        !protocoloPertenceAoPerfil(protocoloAtual, perfil)
      ) {
        return respostaErro(
          "Você não pode registrar contato em protocolo de outra consultora.",
          403,
        );
      }

      const { data, error } = await supabase
        .from("protocolo_historico")
        .insert({
          protocolo_id: protocoloId,
          tipo: String(dados.tipo || "LIGAÇÃO"),
          descricao,
          numero_protocolo: String(dados.numeroProtocolo || ""),
          data_contato:
            String(dados.dataContato || "").slice(0, 10) ||
            new Date().toISOString().slice(0, 10),
          registrado_por: userId,
          registrado_por_nome: perfil.nome,
        })
        .select()
        .single();

      if (error) {
        return respostaErro(
          `Não foi possível registrar o contato: ${error.message}`,
          400,
        );
      }

      await supabase
        .from("protocolos")
        .update({
          ultima_ligacao:
            String(dados.dataContato || "").slice(0, 10) ||
            new Date().toISOString().slice(0, 10),
          proxima_ligacao: dados.proximaLigacao || null,
          segundo_protocolo: String(dados.numeroProtocolo || ""),
          status: String(dados.status || "EM ACOMPANHAMENTO"),
        })
        .eq("id", protocoloId);

      return NextResponse.json({
        mensagem: "Contato registrado com sucesso.",
        historico: data,
      });
    }

    const protocolo = dados.protocolo || {};
    const numeroProtocolo = String(protocolo.numeroProtocolo || "").trim();

    if (!String(protocolo.nome || "").trim()) {
      return respostaErro("Informe o nome do cliente.", 400);
    }

    if (!numeroProtocolo) {
      return respostaErro("Informe o número do protocolo.", 400);
    }

    const { data: duplicado } = await supabase
      .from("protocolos")
      .select("id")
      .eq("numero_protocolo", numeroProtocolo)
      .limit(1);

    if ((duplicado || []).length) {
      return respostaErro(
        "Já existe um protocolo cadastrado com esse número.",
        400,
      );
    }

    const consultoraEhUsuarioAtual = perfilEhConsultora(perfil.perfil);

    const linha = {
      cliente_id: protocolo.clienteId || null,
      nome: String(protocolo.nome || "").trim(),
      cpf: apenasNumeros(protocolo.cpf),
      telefone: String(protocolo.telefone || "").trim(),
      email: String(protocolo.email || "").trim().toLowerCase(),
      numero_protocolo: numeroProtocolo,
      segundo_protocolo: "",
      data_ligacao:
        String(protocolo.dataLigacao || "").slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
      matricula: String(protocolo.matricula || "").trim(),
      senha_portal: String(protocolo.senhaPortal || "").trim(),
      governo: String(protocolo.governo || "").trim(),
      margem: Number(protocolo.margem || 0),
      consultora_id: consultoraEhUsuarioAtual
        ? perfil.id
        : protocolo.consultoraId || null,
      consultora: consultoraEhUsuarioAtual
        ? perfil.nome
        : String(protocolo.consultora || "").trim(),
      status: String(protocolo.status || "AG. BOLETO"),
      observacao: String(protocolo.observacao || "").trim(),
      criado_por: userId,
    };

    const { data, error } = await supabase
      .from("protocolos")
      .insert(linha)
      .select()
      .single();

    if (error) {
      return respostaErro(
        `Não foi possível cadastrar o protocolo: ${error.message}`,
        400,
      );
    }

    await supabase.from("protocolo_historico").insert({
      protocolo_id: data.id,
      tipo: "CADASTRO",
      descricao: "Protocolo cadastrado no sistema.",
      numero_protocolo: numeroProtocolo,
      data_contato: linha.data_ligacao,
      registrado_por: userId,
      registrado_por_nome: perfil.nome,
    });

    return NextResponse.json(
      {
        mensagem: "Protocolo cadastrado com sucesso.",
        protocolo: data,
      },
      { status: 201 },
    );
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao cadastrar o protocolo.",
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);
    if ("resposta" in autenticacao) return autenticacao.resposta;

    const { supabase, perfil, userId } = autenticacao;
    const dados = await request.json();
    const protocolo = dados.protocolo || {};
    const id = String(protocolo.id || "").trim();

    if (!id) return respostaErro("O protocolo não foi informado.", 400);

    const { data: protocoloAtual, error: erroProtocoloAtual } =
      await supabase
        .from("protocolos")
        .select("*")
        .eq("id", id)
        .single();

    if (erroProtocoloAtual || !protocoloAtual) {
      return respostaErro("Protocolo não encontrado.", 404);
    }

    if (
      perfilEhConsultora(perfil.perfil) &&
      !protocoloPertenceAoPerfil(protocoloAtual, perfil)
    ) {
      return respostaErro(
        "Você não pode alterar protocolo de outra consultora.",
        403,
      );
    }

    const consultoraEhUsuarioAtual = perfilEhConsultora(perfil.perfil);

    const atualizacao: Record<string, unknown> = {
      nome: String(protocolo.nome || "").trim(),
      cpf: apenasNumeros(protocolo.cpf),
      telefone: String(protocolo.telefone || "").trim(),
      email: String(protocolo.email || "").trim().toLowerCase(),
      numero_protocolo: String(protocolo.numeroProtocolo || "").trim(),
      segundo_protocolo: String(protocolo.segundoProtocolo || "").trim(),
      data_ligacao: String(protocolo.dataLigacao || "").slice(0, 10),
      ultima_ligacao: protocolo.ultimaLigacao || null,
      proxima_ligacao: protocolo.proximaLigacao || null,
      matricula: String(protocolo.matricula || "").trim(),
      senha_portal: String(protocolo.senhaPortal || "").trim(),
      governo: String(protocolo.governo || "").trim(),
      margem: Number(protocolo.margem || 0),
      consultora_id: consultoraEhUsuarioAtual
        ? perfil.id
        : protocolo.consultoraId || null,
      consultora: consultoraEhUsuarioAtual
        ? perfil.nome
        : String(protocolo.consultora || "").trim(),
      status: String(protocolo.status || "AG. BOLETO"),
      observacao: String(protocolo.observacao || "").trim(),
    };

    if (protocolo.status === "BOLETO RECEBIDO") {
      atualizacao.boleto_recebido_em = new Date().toISOString();
    }

    if (protocolo.status === "FINALIZADO") {
      atualizacao.finalizado_em = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("protocolos")
      .update(atualizacao)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return respostaErro(
        `Não foi possível atualizar o protocolo: ${error.message}`,
        400,
      );
    }

    await supabase.from("protocolo_historico").insert({
      protocolo_id: id,
      tipo: "ALTERAÇÃO DE STATUS",
      descricao: `Protocolo atualizado para ${data.status}.`,
      numero_protocolo: data.numero_protocolo,
      data_contato: new Date().toISOString().slice(0, 10),
      registrado_por: userId,
      registrado_por_nome: perfil.nome,
    });

    return NextResponse.json({
      mensagem: "Protocolo atualizado com sucesso.",
      protocolo: data,
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao atualizar o protocolo.",
      500,
    );
  }
}