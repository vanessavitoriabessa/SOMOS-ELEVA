import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PropostaDb = {
  id: string;
  cliente: string | null;
  vendedora: string | null;
  banco: string | null;
  tabela: string | null;
  percentual_tabela: number | string | null;
  valor_contrato: number | string | null;
  valor_meta: number | string | null;
  comissao: number | string | null;
  status: string | null;
  data_cadastro: string | null;
  data_pagamento: string | null;
};

type BaixaDb = {
  proposta_id: string | null;
  cliente: string | null;
  consultora: string | null;
  banco: string | null;
  tabela: string | null;
  valor_operacao: number | string | null;
  valor_liquido: number | string | null;
  data_pagamento_proposta: string | null;
  comissao_prevista: number | string | null;
  status: string | null;
};

type RegraDb = {
  id: string;
  banco: string | null;
  nome: string | null;
  codigo: string | null;
  orgao_convenio: string | null;
  percentual: number | string | null;
  percentual_comissao_banco: number | string | null;
  ativo: boolean | null;
};

function respostaErro(erro: string, status = 400) {
  return NextResponse.json({ erro }, { status });
}

function normalizar(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function compactar(valor: unknown) {
  return normalizar(valor).replace(/[^A-Z0-9]/g, "");
}

function numero(valor: unknown) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;

  const texto = String(valor ?? "").trim();
  if (!texto) return 0;

  let limpo = texto.replace(/[R$\s]/g, "");

  if (limpo.includes(",") && limpo.includes(".")) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else if (limpo.includes(",")) {
    limpo = limpo.replace(",", ".");
  }

  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

function dataIso(valor: unknown) {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  return texto.slice(0, 10);
}

function periodoCompetencia(competencia: string) {
  const match = competencia.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  if (mes < 1 || mes > 12) return null;

  const ultimoDia = new Date(ano, mes, 0).getDate();
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(
    ultimoDia,
  ).padStart(2, "0")}`;

  let proxAno = ano;
  let proxMes = mes + 1;
  if (proxMes === 13) {
    proxMes = 1;
    proxAno += 1;
  }

  return {
    inicio,
    fim,
    limitePagamento: `${proxAno}-${String(proxMes).padStart(2, "0")}-19`,
  };
}

function codigoNoTexto(valor: unknown) {
  const texto = normalizar(valor);
  const achados = texto.match(/\b(\d{3})\b/g);
  return achados?.[achados.length - 1] || "";
}

function encontrarRegra(
  bancoValor: unknown,
  tabelaValor: unknown,
  regras: RegraDb[],
) {
  const banco = normalizar(bancoValor);
  const tabela = normalizar(tabelaValor);
  const tabelaCompacta = compactar(tabelaValor);
  const codigoTabela = codigoNoTexto(tabelaValor);

  const candidatas = regras.filter(
    (regra) =>
      regra.ativo !== false &&
      (!banco || normalizar(regra.banco) === banco),
  );

  const exata = candidatas.find(
    (regra) => normalizar(regra.nome) === tabela,
  );
  if (exata) return exata;

  if (codigoTabela) {
    const porCodigo = candidatas.find(
      (regra) => normalizar(regra.codigo) === codigoTabela,
    );
    if (porCodigo) return porCodigo;
  }

  const porPrefixo = candidatas.find((regra) => {
    const nome = normalizar(regra.nome);
    return (
      tabela.length >= 6 &&
      (nome.startsWith(tabela) || tabela.startsWith(nome))
    );
  });
  if (porPrefixo) return porPrefixo;

  return (
    candidatas.find((regra) => {
      const nome = compactar(regra.nome);
      return (
        tabelaCompacta.length >= 6 &&
        (nome.startsWith(tabelaCompacta) ||
          tabelaCompacta.startsWith(nome))
      );
    }) || null
  );
}

async function autenticar(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return { resposta: respostaErro("Você precisa estar autenticada.", 401) };
  }

  const token = authorization.slice(7).trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { resposta: respostaErro("Supabase não configurado.", 500) };
  }

  const verificador = createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const {
    data: { user },
    error,
  } = await verificador.auth.getUser(token);

  if (error || !user) {
    return { resposta: respostaErro("Sua sessão não é válida.", 401) };
  }

  return { supabase: createAdminClient() };
}

export async function GET(request: NextRequest) {
  try {
    const autenticacao = await autenticar(request);
    if ("resposta" in autenticacao) return autenticacao.resposta;

    const competencia =
      request.nextUrl.searchParams.get("competencia") || "";
    const periodo = periodoCompetencia(competencia);

    if (!periodo) {
      return respostaErro("Competência inválida. Use AAAA-MM.");
    }

    const { supabase } = autenticacao;

    // A competência nasce pela DATA DE DIGITAÇÃO.
    const { data: propostasData, error: propostasErro } = await supabase
      .from("propostas")
      .select(
        "id, cliente, vendedora, banco, tabela, percentual_tabela, valor_contrato, valor_meta, comissao, status, data_cadastro, data_pagamento",
      )
      .gte("data_cadastro", periodo.inicio)
      .lte("data_cadastro", periodo.fim)
      .order("data_cadastro", { ascending: true })
      .range(0, 9999);

    if (propostasErro) {
      return respostaErro(
        `Erro ao carregar propostas: ${propostasErro.message}`,
        500,
      );
    }

    const propostas = (propostasData || []) as PropostaDb[];
    const ids = propostas.map((p) => p.id).filter(Boolean);

    /*
     * A Gestão de Propostas já usa baixas_pagamentos como fonte dos contratos pagos.
     * Aqui carregamos TODAS as baixas até o dia 19 do mês seguinte.
     * Depois ligamos pelo proposta_id e, para registros antigos, também usamos
     * cliente + consultora como fallback.
     */
    let baixas: BaixaDb[] = [];

    const { data: baixasData, error: baixasErro } = await supabase
      .from("baixas_pagamentos")
      .select(
        "proposta_id, cliente, consultora, banco, tabela, valor_operacao, valor_liquido, data_pagamento_proposta, comissao_prevista, status",
      )
      .lte("data_pagamento_proposta", periodo.limitePagamento)
      .range(0, 9999);

    if (baixasErro) {
      return respostaErro(
        `Erro ao carregar contratos pagos: ${baixasErro.message}`,
        500,
      );
    }

    baixas = (baixasData || []) as BaixaDb[];

    const { data: regrasData, error: regrasErro } = await supabase
      .from("config_tabelas")
      .select(
        "id, banco, nome, codigo, orgao_convenio, percentual, percentual_comissao_banco, ativo",
      )
      .eq("ativo", true)
      .range(0, 9999);

    if (regrasErro) {
      return respostaErro(
        `Erro ao carregar tabelas configuradas: ${regrasErro.message}`,
        500,
      );
    }

    const regras = (regrasData || []) as RegraDb[];
    const baixaPorId = new Map<string, BaixaDb>();
    const baixaPorClienteConsultora = new Map<string, BaixaDb[]>();

    for (const baixa of baixas) {
      if (baixa.proposta_id) {
        baixaPorId.set(String(baixa.proposta_id), baixa);
      }

      const chaveNome =
        `${normalizar(baixa.cliente)}|${normalizar(baixa.consultora)}`;

      if (normalizar(baixa.cliente)) {
        const lista = baixaPorClienteConsultora.get(chaveNome) || [];
        lista.push(baixa);
        baixaPorClienteConsultora.set(chaveNome, lista);
      }
    }

    const resultado = propostas
      .filter(
        (proposta) =>
          !["CANCELADA", "CANCELADO"].includes(normalizar(proposta.status)),
      )
      .map((proposta) => {
        const chaveFallback =
          `${normalizar(proposta.cliente)}|${normalizar(proposta.vendedora)}`;

        const baixaPorNome =
          baixaPorClienteConsultora.get(chaveFallback)?.find((item) => {
            const data = dataIso(item.data_pagamento_proposta);
            return Boolean(data) && data <= periodo.limitePagamento;
          });

        const baixa =
          baixaPorId.get(String(proposta.id)) ||
          baixaPorNome;

        const statusPago =
          normalizar(proposta.status) === "PAGO" || Boolean(baixa);

        const dataPagamento =
          dataIso(baixa?.data_pagamento_proposta) ||
          dataIso(proposta.data_pagamento);

        const pagoNoPrazo =
          statusPago &&
          Boolean(dataPagamento) &&
          dataPagamento <= periodo.limitePagamento;

        const pagoForaPrazo =
          statusPago &&
          Boolean(dataPagamento) &&
          dataPagamento > periodo.limitePagamento;

        // Contrato PAGO: a baixa é a fonte prioritária dos valores.
        const valorContrato =
          numero(baixa?.valor_operacao) > 0
            ? numero(baixa?.valor_operacao)
            : numero(proposta.valor_contrato);

        const banco = String(baixa?.banco || proposta.banco || "");
        const tabela = String(baixa?.tabela || proposta.tabela || "");
        const regra = encontrarRegra(banco, tabela, regras);

        const pesoTabela =
          numero(regra?.percentual) > 0
            ? numero(regra?.percentual)
            : numero(proposta.percentual_tabela);

        // Mesma lógica visual da Gestão de Propostas:
        // VALOR FINAL = valor bruto x % PRODUÇÃO.
        const valorMeta =
          valorContrato > 0 && pesoTabela > 0
            ? valorContrato * (pesoTabela / 100)
            : numero(baixa?.valor_liquido) > 0
              ? numero(baixa?.valor_liquido)
              : numero(proposta.valor_meta);

        const percentualComissao =
          numero(regra?.percentual_comissao_banco);

        // COMISSÃO EMPRESA = valor bruto x % comissão do banco.
        const comissao =
          valorContrato > 0 && percentualComissao > 0
            ? valorContrato * (percentualComissao / 100)
            : numero(baixa?.comissao_prevista) > 0
              ? numero(baixa?.comissao_prevista)
              : numero(proposta.comissao);

        return {
          id: String(proposta.id),
          cliente: String(baixa?.cliente || proposta.cliente || ""),
          vendedora: String(
            baixa?.consultora || proposta.vendedora || "",
          ),
          banco,
          tabela,
          valorContrato: Number(valorContrato.toFixed(2)),
          valorMeta: Number(valorMeta.toFixed(2)),
          percentualTabela: Number(pesoTabela.toFixed(4)),
          comissao: Number(comissao.toFixed(2)),
          status: statusPago ? "PAGO" : String(proposta.status || ""),
          dataCadastro: dataIso(proposta.data_cadastro),
          dataPagamento,
          elegivelPremiacao: pagoNoPrazo,
          pagoForaPrazo,
          limitePagamento: periodo.limitePagamento,
          encontrouBaixa: Boolean(baixa),
          fontePagamento: baixa ? "baixas_pagamentos" : "propostas",
        };
      });

    const pagasNoPrazo = resultado.filter(
      (item) => item.elegivelPremiacao === true,
    );

    const aguardando = resultado.filter(
      (item) => normalizar(item.status) !== "PAGO",
    );

    const foraPrazo = resultado.filter(
      (item) => item.pagoForaPrazo === true,
    );

    return NextResponse.json(
      {
        competencia,
        inicio: periodo.inicio,
        fim: periodo.fim,
        limitePagamento: periodo.limitePagamento,
        propostas: resultado,
        resumo: {
          digitadas: resultado.length,
          pagasNoPrazo: pagasNoPrazo.length,
          aguardando: aguardando.length,
          foraPrazo: foraPrazo.length,
          baixasCarregadas: baixas.length,
          propostasComBaixa: resultado.filter((item) => item.encontrouBaixa).length,
          valorPagoBruto: Number(
            pagasNoPrazo
              .reduce((soma, item) => soma + item.valorContrato, 0)
              .toFixed(2),
          ),
          producaoValida: Number(
            pagasNoPrazo
              .reduce((soma, item) => soma + item.valorMeta, 0)
              .toFixed(2),
          ),
          comissaoEmpresa: Number(
            pagasNoPrazo
              .reduce((soma, item) => soma + item.comissao, 0)
              .toFixed(2),
          ),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return respostaErro(
      error instanceof Error ? error.message : "Erro inesperado.",
      500,
    );
  }
}
