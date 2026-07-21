import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_CLIENTE = [
  "Ativo",
  "Em negociação",
  "Aguardando retorno",
  "Sem interesse",
  "Finalizado",
] as const;

type Perfil = {
  id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
};

type ClienteRecebido = {
  id?: string;
  convenioEstado?: string;
  convenioOrgao?: string;
  produto?: string;
  matricula?: string;
  cargo?: string;
  salario?: number;
  nome?: string;
  cpf?: string;
  nascimento?: string;
  sexo?: string;
  estadoCivil?: string;
  nacionalidade?: string;
  naturalidade?: string;
  rg?: string;
  orgaoEmissor?: string;
  ufEmissor?: string;
  dataEmissaoRg?: string;
  nomeMae?: string;
  nomePai?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numeroEndereco?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  digitoConta?: string;
  tipoConta?: string;
  titularConta?: string;
  consultora?: string;
  status?: string;
  observacoes?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

type LinhaCliente = {
  id: string;
  consultora_id: string | null;
  consultora: string;
  criado_por: string | null;
  convenio_estado: string;
  convenio_orgao: string;
  produto: string;
  matricula: string;
  cargo: string;
  salario: number | string;
  nome: string;
  cpf: string;
  nascimento: string | null;
  sexo: string;
  estado_civil: string;
  nacionalidade: string;
  naturalidade: string;
  rg: string;
  orgao_emissor: string;
  uf_emissor: string;
  data_emissao_rg: string | null;
  nome_mae: string;
  nome_pai: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero_endereco: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  banco: string;
  agencia: string;
  conta: string;
  digito_conta: string;
  tipo_conta: string;
  titular_conta: string;
  status: string;
  observacoes: string;
  criado_em?: string;
  atualizado_em?: string;
};

function respostaErro(erro: string, status: number) {
  return NextResponse.json({ erro }, { status });
}

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function apenasNumeros(valor: unknown) {
  return String(valor || "").replace(/\D/g, "");
}

function numeroSeguro(valor: unknown) {
  const numero = Number(valor || 0);

  return Number.isFinite(numero) ? numero : 0;
}

function uuidValido(valor: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(valor || "").trim(),
  );
}

function idSeguro(valor: unknown) {
  const id = String(valor || "").trim();

  return uuidValido(id) ? id : randomUUID();
}

function dataSegura(valor: unknown) {
  const texto = String(valor || "").trim();

  if (!texto) return null;

  const encontrada = texto.match(/^\d{4}-\d{2}-\d{2}/);

  return encontrada ? encontrada[0] : null;
}

function statusSeguro(valor: unknown) {
  const texto = String(valor || "");

  return STATUS_CLIENTE.includes(texto as (typeof STATUS_CLIENTE)[number])
    ? texto
    : "Ativo";
}

function perfilEhConsultora(perfil: string) {
  return normalizarTexto(perfil).includes("consultor");
}

function perfilPodeAcessar(perfil: string) {
  return [
    "administradora",
    "coordenadora",
    "supervisora",
    "operacional",
    "financeiro",
    "consultora",
  ].includes(normalizarTexto(perfil));
}

function linhaParaCliente(linha: LinhaCliente) {
  return {
    id: String(linha.id),
    convenioEstado: String(linha.convenio_estado || ""),
    convenioOrgao: String(linha.convenio_orgao || ""),
    produto: String(linha.produto || "Compra de Dívida"),
    matricula: String(linha.matricula || ""),
    cargo: String(linha.cargo || ""),
    salario: numeroSeguro(linha.salario),
    senhaPortal: "",
    senhaContracheque: "",
    nome: String(linha.nome || ""),
    cpf: apenasNumeros(linha.cpf),
    nascimento: String(linha.nascimento || ""),
    sexo: String(linha.sexo || ""),
    estadoCivil: String(linha.estado_civil || ""),
    nacionalidade: String(linha.nacionalidade || "Brasileira"),
    naturalidade: String(linha.naturalidade || ""),
    rg: String(linha.rg || ""),
    orgaoEmissor: String(linha.orgao_emissor || ""),
    ufEmissor: String(linha.uf_emissor || ""),
    dataEmissaoRg: String(linha.data_emissao_rg || ""),
    nomeMae: String(linha.nome_mae || ""),
    nomePai: String(linha.nome_pai || ""),
    telefone: apenasNumeros(linha.telefone),
    email: String(linha.email || ""),
    cep: apenasNumeros(linha.cep),
    logradouro: String(linha.logradouro || ""),
    numeroEndereco: String(linha.numero_endereco || ""),
    complemento: String(linha.complemento || ""),
    bairro: String(linha.bairro || ""),
    cidade: String(linha.cidade || ""),
    estado: String(linha.estado || ""),
    banco: String(linha.banco || ""),
    agencia: String(linha.agencia || ""),
    conta: String(linha.conta || ""),
    digitoConta: String(linha.digito_conta || ""),
    tipoConta: String(linha.tipo_conta || "Conta corrente"),
    titularConta: String(linha.titular_conta || ""),
    consultora: String(linha.consultora || ""),
    status: statusSeguro(linha.status),
    observacoes: String(linha.observacoes || ""),
    documentos: [],
    criadoEm: String(linha.criado_em || ""),
    atualizadoEm: String(linha.atualizado_em || ""),
  };
}

async function autenticar(request: NextRequest) {
  const autorizacao = request.headers.get("authorization");

  if (!autorizacao || !autorizacao.startsWith("Bearer ")) {
    return {
      resposta: respostaErro("Você precisa estar autenticada.", 401),
    };
  }

  const token = autorizacao.replace("Bearer ", "").trim();

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

  const { data: dadosAutenticacao, error: erroAutenticacao } =
    await verificador.auth.getUser(token);

  if (erroAutenticacao || !dadosAutenticacao.user) {
    return {
      resposta: respostaErro("Sua sessão não é válida. Entre novamente.", 401),
    };
  }

  const supabase = createAdminClient();

  const { data: perfil, error: erroPerfil } = await supabase
    .from("profiles")
    .select("id, nome, perfil, ativo")
    .eq("id", dadosAutenticacao.user.id)
    .single();

  if (erroPerfil || !perfil) {
    return {
      resposta: respostaErro("Não foi possível localizar seu perfil.", 403),
    };
  }

  const perfilAtual = perfil as Perfil;

  if (!perfilAtual.ativo || !perfilPodeAcessar(perfilAtual.perfil)) {
    return {
      resposta: respostaErro("Seu perfil não possui acesso aos clientes.", 403),
    };
  }

  return {
    supabase,
    perfil: perfilAtual,
  };
}

async function listarConsultoras(
  supabase: ReturnType<typeof createAdminClient>,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome, perfil, ativo");

  if (error) {
    throw new Error("Não foi possível consultar as consultoras.");
  }

  return (data || []).filter((perfil) =>
    perfilEhConsultora(String(perfil.perfil || "")),
  ) as Perfil[];
}

function encontrarConsultora(consultoras: Perfil[], nome: string) {
  const nomeNormalizado = normalizarTexto(nome);

  return consultoras.find(
    (consultora) => normalizarTexto(consultora.nome) === nomeNormalizado,
  );
}

function podeAlterarCliente(perfil: Perfil, linha: LinhaCliente) {
  if (!perfilEhConsultora(perfil.perfil)) {
    return true;
  }

  return (
    linha.consultora_id === perfil.id ||
    linha.criado_por === perfil.id ||
    normalizarTexto(linha.consultora) === normalizarTexto(perfil.nome)
  );
}

async function montarLinha(
  supabase: ReturnType<typeof createAdminClient>,
  perfil: Perfil,
  cliente: ClienteRecebido,
  opcoes?: {
    consultoras?: Perfil[];
    importacao?: boolean;
    atribuirSemConsultora?: boolean;
  },
): Promise<LinhaCliente> {
  const consultoras =
    opcoes?.consultoras || (await listarConsultoras(supabase));

  const nomeInformado = String(cliente.consultora || "").trim();

  const nomeConsultora = perfilEhConsultora(perfil.perfil)
    ? perfil.nome
    : nomeInformado;

  const consultora = nomeConsultora
    ? encontrarConsultora(consultoras, nomeConsultora)
    : undefined;

  if (nomeConsultora && !consultora && !opcoes?.importacao) {
    throw new Error("A consultora selecionada não foi encontrada.");
  }

  if (consultora && !consultora.ativo && !opcoes?.importacao) {
    throw new Error("A consultora selecionada está inativa.");
  }

  // Cadastros antigos podiam usar números ou textos como identificador.
  // A tabela do Supabase exige UUID, então IDs antigos inválidos recebem um UUID novo.
  const id = idSeguro(cliente.id);

  const nome = String(cliente.nome || "").trim();

  if (!nome) {
    throw new Error("Informe o nome do cliente.");
  }

  return {
    id,
    consultora_id: consultora?.id || null,
    consultora: consultora?.nome || nomeConsultora,
    criado_por: perfil.id,
    convenio_estado: String(cliente.convenioEstado || "").trim(),
    convenio_orgao: String(cliente.convenioOrgao || "").trim(),
    produto: String(cliente.produto || "Compra de Dívida").trim(),
    matricula: String(cliente.matricula || "").trim(),
    cargo: String(cliente.cargo || "").trim(),
    salario: numeroSeguro(cliente.salario),
    nome,
    cpf: apenasNumeros(cliente.cpf),
    nascimento: dataSegura(cliente.nascimento),
    sexo: String(cliente.sexo || "").trim(),
    estado_civil: String(cliente.estadoCivil || "").trim(),
    nacionalidade: String(cliente.nacionalidade || "Brasileira").trim(),
    naturalidade: String(cliente.naturalidade || "").trim(),
    rg: String(cliente.rg || "").trim(),
    orgao_emissor: String(cliente.orgaoEmissor || "").trim(),
    uf_emissor: String(cliente.ufEmissor || "").trim(),
    data_emissao_rg: dataSegura(cliente.dataEmissaoRg),
    nome_mae: String(cliente.nomeMae || "").trim(),
    nome_pai: String(cliente.nomePai || "").trim(),
    telefone: apenasNumeros(cliente.telefone),
    email: String(cliente.email || "")
      .trim()
      .toLowerCase(),
    cep: apenasNumeros(cliente.cep),
    logradouro: String(cliente.logradouro || "").trim(),
    numero_endereco: String(cliente.numeroEndereco || "").trim(),
    complemento: String(cliente.complemento || "").trim(),
    bairro: String(cliente.bairro || "").trim(),
    cidade: String(cliente.cidade || "").trim(),
    estado: String(cliente.estado || "")
      .trim()
      .toUpperCase(),
    banco: String(cliente.banco || "").trim(),
    agencia: String(cliente.agencia || "").trim(),
    conta: String(cliente.conta || "").trim(),
    digito_conta: String(cliente.digitoConta || "").trim(),
    tipo_conta: String(cliente.tipoConta || "Conta corrente").trim(),
    titular_conta: String(cliente.titularConta || cliente.nome || "").trim(),
    status: statusSeguro(cliente.status),
    observacoes: String(cliente.observacoes || "").trim(),
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { supabase, perfil } = autenticacao;

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("atualizado_em", {
        ascending: false,
      });

    if (error) {
      return respostaErro(
        `Não foi possível carregar os clientes: ${error.message}`,
        500,
      );
    }

    const linhas = (data || []) as LinhaCliente[];

    const permitidos = perfilEhConsultora(perfil.perfil)
      ? linhas.filter((linha) => podeAlterarCliente(perfil, linha))
      : linhas;

    return NextResponse.json({
      perfil: {
        id: perfil.id,
        nome: perfil.nome,
        perfil: perfil.perfil,
      },
      clientes: permitidos.map(linhaParaCliente),
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao carregar os clientes.",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { supabase, perfil } = autenticacao;

    const dados = (await request.json()) as {
      acao?: string;
      cliente?: ClienteRecebido;
      clientes?: ClienteRecebido[];
      atribuirSemConsultora?: boolean;
    };

    if (dados.acao === "importar_local") {
      const recebidos = Array.isArray(dados.clientes) ? dados.clientes : [];

      if (!recebidos.length) {
        return NextResponse.json({
          importados: 0,
          ignorados: 0,
          mensagem: "Nenhum cliente local para importar.",
        });
      }

      const consultoras = await listarConsultoras(supabase);

      const { data: existentes, error: erroExistentes } = await supabase
        .from("clientes")
        .select("*");

      if (erroExistentes) {
        return respostaErro(
          `Não foi possível verificar os clientes existentes: ${erroExistentes.message}`,
          500,
        );
      }

      const existentesTipados = (existentes || []) as LinhaCliente[];
      const linhas: LinhaCliente[] = [];
      let ignorados = 0;

      for (const cliente of recebidos.slice(0, 3000)) {
        try {
          const nomeAntigo = String(cliente.consultora || "").trim();

          if (perfilEhConsultora(perfil.perfil)) {
            if (
              nomeAntigo &&
              normalizarTexto(nomeAntigo) !== normalizarTexto(perfil.nome)
            ) {
              ignorados += 1;
              continue;
            }

            if (!nomeAntigo && !dados.atribuirSemConsultora) {
              ignorados += 1;
              continue;
            }
          }

          const linha = await montarLinha(supabase, perfil, cliente, {
            consultoras,
            importacao: true,
            atribuirSemConsultora: Boolean(dados.atribuirSemConsultora),
          });

          const cpf = apenasNumeros(linha.cpf);
          const existente = existentesTipados.find((item) => {
            if (item.id === linha.id) return true;

            return Boolean(cpf && apenasNumeros(item.cpf) === cpf);
          });

          if (existente) {
            if (!podeAlterarCliente(perfil, existente)) {
              ignorados += 1;
              continue;
            }

            linha.id = existente.id;
            linha.criado_por = existente.criado_por || perfil.id;
            linha.criado_em = existente.criado_em;
          }

          const chave = cpf || linha.id;
          const indiceRepetido = linhas.findIndex(
            (item) => (apenasNumeros(item.cpf) || item.id) === chave,
          );

          if (indiceRepetido >= 0) {
            linhas[indiceRepetido] = linha;
          } else {
            linhas.push(linha);
          }
        } catch {
          ignorados += 1;
        }
      }

      if (!linhas.length) {
        return NextResponse.json({
          importados: 0,
          ignorados,
          mensagem: "Nenhum cliente válido foi encontrado para importar.",
        });
      }

      // Importa um por vez para que um cadastro antigo com dado inválido
      // não impeça todos os outros clientes de serem sincronizados.
      let importados = 0;
      let primeiroErro = "";

      for (const linha of linhas) {
        const { error } = await supabase.from("clientes").upsert(linha, {
          onConflict: "id",
        });

        if (error) {
          ignorados += 1;
          primeiroErro ||= error.message;
          console.error("Falha ao importar cliente antigo", {
            id: linha.id,
            nome: linha.nome,
            erro: error.message,
          });
          continue;
        }

        importados += 1;
      }

      if (!importados) {
        return respostaErro(
          `Não foi possível importar os clientes antigos${
            primeiroErro ? `: ${primeiroErro}` : "."
          }`,
          500,
        );
      }

      return NextResponse.json({
        importados,
        ignorados,
        mensagem:
          ignorados > 0
            ? `${importados} cliente(s) sincronizado(s). ${ignorados} cadastro(s) precisaram ser ignorados.`
            : "Clientes locais sincronizados com o Supabase.",
      });
    }

    const cliente = dados.cliente;

    if (!cliente) {
      return respostaErro("Os dados do cliente não foram enviados.", 400);
    }

    const linha = await montarLinha(supabase, perfil, cliente);

    if (linha.cpf) {
      const { data: duplicado, error: erroDuplicado } = await supabase
        .from("clientes")
        .select("id")
        .eq("cpf", linha.cpf)
        .limit(1);

      if (erroDuplicado) {
        return respostaErro(
          `Não foi possível verificar o CPF: ${erroDuplicado.message}`,
          500,
        );
      }

      if ((duplicado || []).length) {
        return respostaErro(
          "Já existe um cliente cadastrado com esse CPF.",
          400,
        );
      }
    }

    const { data, error } = await supabase
      .from("clientes")
      .insert(linha)
      .select()
      .single();

    if (error) {
      return respostaErro(
        `Não foi possível cadastrar o cliente: ${error.message}`,
        400,
      );
    }

    return NextResponse.json(
      {
        mensagem: "Cliente cadastrado com sucesso.",
        cliente: linhaParaCliente(data as LinhaCliente),
      },
      {
        status: 201,
      },
    );
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao cadastrar o cliente.",
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { supabase, perfil } = autenticacao;

    const dados = (await request.json()) as {
      cliente?: ClienteRecebido;
    };

    const cliente = dados.cliente;
    const id = String(cliente?.id || "").trim();

    if (!cliente || !id) {
      return respostaErro("O cliente não foi informado.", 400);
    }

    const { data: atual, error: erroAtual } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", id)
      .single();

    if (erroAtual || !atual) {
      return respostaErro("Cliente não encontrado.", 404);
    }

    if (!podeAlterarCliente(perfil, atual as LinhaCliente)) {
      return respostaErro(
        "Você não pode alterar o cliente de outra consultora.",
        403,
      );
    }

    const linha = await montarLinha(supabase, perfil, cliente);
    const atualTipado = atual as LinhaCliente;

    linha.criado_por = atualTipado.criado_por || perfil.id;
    linha.criado_em = atualTipado.criado_em;

    if (linha.cpf) {
      const { data: duplicado, error: erroDuplicado } = await supabase
        .from("clientes")
        .select("id")
        .eq("cpf", linha.cpf)
        .neq("id", id)
        .limit(1);

      if (erroDuplicado) {
        return respostaErro(
          `Não foi possível verificar o CPF: ${erroDuplicado.message}`,
          500,
        );
      }

      if ((duplicado || []).length) {
        return respostaErro(
          "Já existe outro cliente cadastrado com esse CPF.",
          400,
        );
      }
    }

    const { data, error } = await supabase
      .from("clientes")
      .update(linha)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return respostaErro(
        `Não foi possível atualizar o cliente: ${error.message}`,
        400,
      );
    }

    return NextResponse.json({
      mensagem: "Cliente atualizado com sucesso.",
      cliente: linhaParaCliente(data as LinhaCliente),
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao atualizar o cliente.",
      500,
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);

    if ("resposta" in autenticacao) {
      return autenticacao.resposta;
    }

    const { supabase, perfil } = autenticacao;

    const dados = (await request.json()) as {
      id?: string;
    };

    const id = String(dados.id || "").trim();

    if (!id) {
      return respostaErro("O cliente não foi informado.", 400);
    }

    const { data: atual, error: erroAtual } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", id)
      .single();

    if (erroAtual || !atual) {
      return respostaErro("Cliente não encontrado.", 404);
    }

    if (!podeAlterarCliente(perfil, atual as LinhaCliente)) {
      return respostaErro(
        "Você não pode excluir o cliente de outra consultora.",
        403,
      );
    }

    const { error } = await supabase.from("clientes").delete().eq("id", id);

    if (error) {
      return respostaErro(
        `Não foi possível excluir o cliente: ${error.message}`,
        400,
      );
    }

    return NextResponse.json({
      mensagem: "Cliente excluído com sucesso.",
    });
  } catch (erro) {
    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Ocorreu um erro ao excluir o cliente.",
      500,
    );
  }
}