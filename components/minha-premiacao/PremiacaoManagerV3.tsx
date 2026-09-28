"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MinhaPremiacaoV2, {
  MovimentoPremiacao,
  SaquePremiacao,
} from "./MinhaPremiacaoV2";

type PropostaCompra = {
  id: string;
  cliente: string;
  vendedora: string;
  banco?: string;
  tabela?: string;
  tabelaBancoId?: string;
  valorContrato: number;
  valorMeta?: number;
  percentualTabela?: number;
  comissao?: number;
  status: string;
  dataCadastro: string;
  dataPagamento?: string;
  elegivelPremiacao?: boolean;
  pagoForaPrazo?: boolean;
  limitePagamento?: string;
  operacional?: string;
  digitador?: string;
  digitadora?: string;
  responsavelDigitacao?: string;
};

type RegistroClt = {
  id: string;
  nome: string;
  consultora: string;
  valorAprovado?: number;
  parcela: number;
  status: string;
  criadoEm?: string;
  atualizadoEm?: string;
  dataPagamento?: string;
};

type TabelaConfigurada = {
  id: string;
  banco: string;
  nome: string;
  codigo?: string;
  orgaoConvenio?: string;
  percentual: number;
  percentualComissaoBanco: number;
  ativo: boolean;
};


type UsuarioLocal = {
  id?: string;
  nome?: string;
  email?: string;
  matricula?: string;
  perfil?: string;
  cargo?: string;
  chave_pix?: string;
  tipo_chave_pix?: string;
};

type PlanoPremiacao = {
  id: string;
  codigo: string;
  nome: string;
  parametros: Record<string, any>;
  ativo: boolean;
};

type FaixaPremiacao = {
  id: string;
  plano_id: string;
  ordem: number;
  nome_faixa: string;
  valor_min: number;
  valor_max: number | null;
  tipo_recompensa: "PONTOS" | "REAIS" | "PERCENTUAL";
  valor_recompensa: number;
  bonus_reais: number;
  ativo: boolean;
};

type PrevisaoLiberada = {
  id: string;
  usuario_id: string;
  plano_codigo: string;
  pontos_liberados: number;
  valor_reais_liberado: number;
  status: string;
};

function normalizar(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}



function dataLocal(valor?: string) {
  if (!valor) return null;

  const iso = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const brasileira = String(valor).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (brasileira) {
    return new Date(
      Number(brasileira[3]),
      Number(brasileira[2]) - 1,
      Number(brasileira[1]),
    );
  }

  const tentativa = new Date(valor);
  return Number.isNaN(tentativa.getTime()) ? null : tentativa;
}

function chaveMes(data: Date | null) {
  if (!data || Number.isNaN(data.getTime())) return "";
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}



function nomesCorrespondem(a?: string | null, b?: string | null) {
  const na = normalizar(String(a || ""));
  const nb = normalizar(String(b || ""));
  if (!na || !nb) return false;
  if (na === nb) return true;

  const tokensA = na.split(/\s+/).filter(Boolean);
  const tokensB = nb.split(/\s+/).filter(Boolean);
  const comuns = tokensA.filter((token) => token.length >= 3 && tokensB.includes(token));

  // Nome + sobrenome em comum já identifica a consultora com segurança suficiente
  // para compatibilizar cadastros antigos/abreviados.
  if (comuns.length >= 2) return true;

  const menor = na.length <= nb.length ? na : nb;
  const maior = na.length > nb.length ? na : nb;
  return menor.length >= 5 && maior.includes(menor);
}

function competenciaAtual() {
  return chaveMes(new Date());
}

function competenciaCompra(proposta: PropostaCompra) {
  const digitacao = dataLocal(proposta.dataCadastro);
  const pagamento = dataLocal(proposta.dataPagamento);

  if (!pagamento) return digitacao ? chaveMes(digitacao) : "";
  if (!digitacao) return chaveMes(pagamento);

  const limite = new Date(
    digitacao.getFullYear(),
    digitacao.getMonth() + 1,
    19,
    23,
    59,
    59,
  );

  return pagamento <= limite ? chaveMes(digitacao) : chaveMes(pagamento);
}

function producaoValidaCompra(proposta: PropostaCompra) {
  const salvo = Number(proposta.valorMeta || 0);
  if (salvo > 0) return salvo;

  return (
    Number(proposta.valorContrato || 0) *
    (Number(proposta.percentualTabela || 0) / 100)
  );
}

function perfilGestor(perfil: string) {
  const texto = normalizar(perfil);
  return (
    texto.includes("administrador") ||
    texto.includes("administradora") ||
    texto.includes("coordenador") ||
    texto.includes("coordenadora") ||
    texto.includes("diretoria") ||
    texto.includes("diretor") ||
    texto.includes("diretora")
  );
}

function perfilVendas(perfil: string) {
  const texto = normalizar(perfil);
  return (
    texto.includes("consultor") ||
    texto.includes("consultora") ||
    texto.includes("vendedor") ||
    texto.includes("vendedora")
  );
}

function perfilOperacional(perfil: string) {
  return normalizar(perfil).includes("operacional");
}

function perfilCoordenacao(perfil: string) {
  const texto = normalizar(perfil);
  return (
    texto.includes("coordenador") ||
    texto.includes("coordenadora") ||
    texto.includes("coordenacao") ||
    texto.includes("coordenação")
  );
}

function perfilSupervisao(perfil: string) {
  const texto = normalizar(perfil);
  return texto.includes("supervisor") || texto.includes("supervisora");
}

function responsavelOperacional(proposta: PropostaCompra) {
  return (
    proposta.operacional ||
    proposta.digitador ||
    proposta.digitadora ||
    proposta.responsavelDigitacao ||
    ""
  );
}

function primeiroDiaCompetencia(competencia: string) {
  return `${competencia}-01`;
}

function faixaDoPlano(
  plano: PlanoPremiacao | undefined,
  faixas: FaixaPremiacao[],
  producao: number,
) {
  if (!plano) return null;

  return (
    faixas
      .filter(
        (faixa) =>
          faixa.plano_id === plano.id &&
          faixa.ativo &&
          producao >= Number(faixa.valor_min || 0) &&
          (faixa.valor_max === null ||
            producao <= Number(faixa.valor_max || 0)),
      )
      .sort((a, b) => b.ordem - a.ordem)[0] || null
  );
}

function recompensaFaixa(faixa: FaixaPremiacao | null) {
  if (!faixa) return 0;
  return Number(faixa.valor_recompensa || 0) + Number(faixa.bonus_reais || 0);
}


const FAIXAS_COMPRA_FALLBACK = [
  [30000, 39999.99, 400, "FAIXA 1"],
  [40000, 49999.99, 600, "FAIXA 2"],
  [50000, 59999.99, 800, "FAIXA 3"],
  [60000, 69999.99, 1000, "FAIXA 4"],
  [70000, 79999.99, 1300, "FAIXA 5"],
  [80000, 89999.99, 1600, "FAIXA 6"],
  [90000, 109999.99, 2000, "FAIXA 7"],
  [110000, 129999.99, 2500, "FAIXA 8"],
  [130000, 149999.99, 3000, "FAIXA 9"],
  [150000, 169999.99, 3500, "FAIXA 10"],
  [170000, 189999.99, 4000, "FAIXA 11"],
  [190000, 209999.99, 4500, "FAIXA 12"],
  [210000, 229999.99, 5000, "FAIXA 13"],
  [230000, 249999.99, 5500, "FAIXA 14"],
  [250000, 269999.99, 6000, "FAIXA 15"],
  [270000, 289999.99, 6500, "FAIXA 16"],
  [290000, 309999.99, 7000, "FAIXA 17"],
  [310000, 329999.99, 7500, "FAIXA 18"],
  [330000, 349999.99, 8000, "FAIXA 19"],
  [350000, 369999.99, 8500, "FAIXA 20"],
  [370000, 389999.99, 9000, "FAIXA 21"],
  [390000, 409999.99, 9500, "FAIXA 22"],
  [410000, 429999.99, 10000, "FAIXA 23"],
  [430000, 449999.99, 10500, "FAIXA 24"],
  [450000, Number.POSITIVE_INFINITY, 12000, "FAIXA 25"],
] as const;

const FAIXAS_CLT_FALLBACK = [
  [20000, 29999.99, 300, "R$ 20 mil"],
  [30000, 39999.99, 500, "R$ 30 mil"],
  [40000, 49999.99, 700, "R$ 40 mil"],
  [50000, 59999.99, 800, "R$ 50 mil"],
  [60000, 69999.99, 2000, "R$ 60 mil"],
  [70000, 79999.99, 2500, "R$ 70 mil"],
  [80000, 99999.99, 2700, "R$ 80 mil"],
  [100000, 109999.99, 3500, "R$ 100 mil"],
  [110000, 119999.99, 3200, "R$ 110 mil"],
  [120000, 129999.99, 3400, "R$ 120 mil"],
  [130000, 139999.99, 3600, "R$ 130 mil"],
  [140000, 149999.99, 3800, "R$ 140 mil"],
  [150000, Number.POSITIVE_INFINITY, 5000, "R$ 150 mil"],
] as const;

function faixaFallback(
  produto: "COMPRA" | "CLT",
  producao: number,
) {
  const lista =
    produto === "COMPRA" ? FAIXAS_COMPRA_FALLBACK : FAIXAS_CLT_FALLBACK;

  const encontrada = lista.find(
    ([minimo, maximo]) => producao >= minimo && producao <= maximo,
  );

  if (!encontrada) return null;

  return {
    nome_faixa: encontrada[3],
    valor_recompensa: encontrada[2],
    bonus_reais: 0,
  };
}

function premioCltCoordenacao(valorBrutoPago: number) {
  const faixas = [
    [10000000,5000],[9000000,4000],[8000000,3500],[7000000,3000],
    [6000000,2500],[5000000,2000],[4000000,1500],[3000000,1000],
    [2000000,500],[1500000,300],
  ] as const;
  return faixas.find(([min]) => valorBrutoPago >= min)?.[1] || 0;
}

function faixaCompraCoordenacaoFallback(producao: number): FaixaPremiacao | null {
  const faixas = [
    [1000000, Number.POSITIVE_INFINITY, 12000, "META R$ 1 MILHÃO"],
    [900000, 999999.99, 10000, "META R$ 900 MIL"],
    [800000, 899999.99, 9000, "META R$ 800 MIL"],
    [700000, 799999.99, 8000, "META R$ 700 MIL"],
    [600000, 699999.99, 7000, "META R$ 600 MIL"],
    [500000, 599999.99, 5000, "META R$ 500 MIL"],
    [400000, 499999.99, 4000, "META R$ 400 MIL"],
    [350000, 399999.99, 3500, "META R$ 350 MIL"],
    [300000, 349999.99, 3000, "META R$ 300 MIL"],
    [280000, 299999.99, 2800, "META R$ 280 MIL"],
    [260000, 279999.99, 2500, "META R$ 260 MIL"],
    [240000, 259999.99, 2200, "META R$ 240 MIL"],
    [220000, 239999.99, 2000, "META R$ 220 MIL"],
    [200000, 219999.99, 1800, "META R$ 200 MIL"],
    [180000, 199999.99, 1600, "META R$ 180 MIL"],
    [160000, 179999.99, 1400, "META R$ 160 MIL"],
    [140000, 159999.99, 1200, "META R$ 140 MIL"],
    [120000, 139999.99, 1000, "META R$ 120 MIL"],
    [90000, 119999.99, 900, "META R$ 90 MIL"],
    [80000, 89999.99, 800, "META R$ 80 MIL"],
    [70000, 79999.99, 700, "META R$ 70 MIL"],
    [60000, 69999.99, 600, "META R$ 60 MIL"],
    [50000, 59999.99, 500, "META R$ 50 MIL"],
    [40000, 49999.99, 400, "META R$ 40 MIL"],
    [30000, 39999.99, 300, "META R$ 30 MIL"],
  ] as const;
  const f = faixas.find(([min,max]) => producao >= min && producao <= max);
  return f ? {
    id:`fallback-coordenacao-${f[0]}`, plano_id:"fallback-coordenacao", ordem:0,
    nome_faixa:f[3], valor_min:f[0], valor_max:Number.isFinite(f[1])?f[1]:null,
    tipo_recompensa:"PONTOS", valor_recompensa:f[2], bonus_reais:0, ativo:true,
  } : null;
}

function faixaSupervisaoFallback(producao: number) {
  const faixas = [
    [2000000,2500,"META R$ 2 MILHÕES"],[1500000,2000,"META R$ 1,5 MILHÃO"],
    [1200000,1500,"META R$ 1,2 MILHÃO"],[1000000,1200,"META R$ 1 MILHÃO"],
    [800000,800,"META R$ 800 MIL"],[500000,500,"META R$ 500 MIL"],
  ] as const;
  const f=faixas.find(([min])=>producao>=min);
  return f
    ? ({
        id: `fallback-supervisao-${f[0]}`,
        plano_id: "fallback-supervisao",
        ordem: 0,
        nome_faixa: f[2],
        valor_min: f[0],
        valor_max: null,
        tipo_recompensa: "PONTOS",
        valor_recompensa: f[1],
        bonus_reais: 0,
        ativo: true,
      } satisfies FaixaPremiacao)
    : null;
}

function mergePropostasComLocal(api: PropostaCompra[]) {
  let locais: any[] = [];

  try {
    const bruto = JSON.parse(
      localStorage.getItem("somos-eleva-propostas") || "[]",
    );
    locais = Array.isArray(bruto) ? bruto : [];
  } catch {
    locais = [];
  }

  if (!locais.length) return api;

  const porId = new Map(
    locais
      .filter((item) => item && item.id)
      .map((item) => [String(item.id), item]),
  );

  return api.map((proposta) => {
    const local =
      porId.get(String(proposta.id)) ||
      locais.find(
        (item) =>
          normalizar(String(item?.cliente || "")) ===
            normalizar(String(proposta.cliente || "")) &&
          normalizar(String(item?.vendedora || item?.consultora || "")) ===
            normalizar(String(proposta.vendedora || "")),
      );

    if (!local) return proposta;

    return {
      ...proposta,
      tabelaBancoId:
        proposta.tabelaBancoId || String(local.tabelaBancoId || ""),
      banco: proposta.banco || String(local.banco || ""),
      tabela: proposta.tabela || String(local.tabela || ""),
      valorContrato:
        Number(proposta.valorContrato || 0) > 0
          ? Number(proposta.valorContrato)
          : Number(local.valorContrato || 0),
      valorMeta:
        Number(proposta.valorMeta || 0) > 0
          ? Number(proposta.valorMeta)
          : Number(local.valorMeta || 0),
      percentualTabela:
        Number(proposta.percentualTabela || 0) > 0
          ? Number(proposta.percentualTabela)
          : Number(local.percentualTabela || 0),
      comissao:
        Number(proposta.comissao || 0) > 0
          ? Number(proposta.comissao)
          : Number(local.comissao || 0),
      dataCadastro:
        proposta.dataCadastro || String(local.dataCadastro || local.criadoEm || ""),
      dataPagamento:
        proposta.dataPagamento || String(local.dataPagamento || ""),
      vendedora:
        proposta.vendedora || String(local.vendedora || local.consultora || ""),
      status:
        proposta.status || String(local.status || ""),
    };
  });
}


function PremiacaoManagerV3() {
  const supabase = useMemo(() => createClient(), []);

  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [diagnosticoApi, setDiagnosticoApi] = useState("");

  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [propostas, setPropostas] = useState<PropostaCompra[]>([]);
  const [clt, setClt] = useState<RegistroClt[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioLocal[]>([]);
  const [planos, setPlanos] = useState<PlanoPremiacao[]>([]);
  const [faixas, setFaixas] = useState<FaixaPremiacao[]>([]);
  const [tabelasConfiguradas, setTabelasConfiguradas] = useState<TabelaConfigurada[]>([]);
  const [extrato, setExtrato] = useState<any[]>([]);
  const [saques, setSaques] = useState<SaquePremiacao[]>([]);
  const [previsoesLiberadas, setPrevisoesLiberadas] =
    useState<PrevisaoLiberada[]>([]);
  const [custoEmpresaCompetencia, setCustoEmpresaCompetencia] = useState(0);
  const [quantidadeVendedorasAtivas, setQuantidadeVendedorasAtivas] = useState(1);

  const [usuarioLogadoId, setUsuarioLogadoId] = useState("");
  const [nomeLogado, setNomeLogado] = useState("");
  const [perfilLogado, setPerfilLogado] = useState("");
  const [consultoraSelecionada, setConsultoraSelecionada] = useState("");

  const ehGestor = perfilGestor(perfilLogado);

  const carregar = useCallback(async (): Promise<boolean> => {
    setCarregando(true);
    setMensagem("");

    try {
      const { data: sessaoData, error: sessaoErro } =
        await supabase.auth.getSession();

      if (sessaoErro || !sessaoData.session?.access_token) {
        throw new Error("Sua sessão expirou. Entre novamente no sistema.");
      }

      const token = sessaoData.session.access_token;
      const authId = sessaoData.session.user.id;
      setUsuarioLogadoId(authId);

      let listaUsuarios: UsuarioLocal[] = [];
      try {
        const local = JSON.parse(
          localStorage.getItem("somos-eleva-usuarios") || "[]",
        );
        listaUsuarios = Array.isArray(local) ? local : [];
      } catch {
        listaUsuarios = [];
      }
      try {
        const { data: colaboradoresPix, error: erroColaboradoresPix } = await supabase
          .from("rh_colaboradoras")
          .select("id, usuario_id, nome, matricula, email, chave_pix, tipo_chave_pix");

        if (!erroColaboradoresPix && Array.isArray(colaboradoresPix)) {
          const porId = new Map(
            colaboradoresPix.map((c: any) => [String(c.id || ""), c]),
          );
          const porUsuarioId = new Map(
            colaboradoresPix
              .filter((c: any) => c.usuario_id)
              .map((c: any) => [String(c.usuario_id || ""), c]),
          );
          const porNome = new Map(
            colaboradoresPix.map((c: any) => [
              normalizar(String(c.nome || "")),
              c,
            ]),
          );

          listaUsuarios = listaUsuarios.map((local) => {
            const colaboradora =
              porId.get(String(local.id || "")) ||
              porUsuarioId.get(String(local.id || "")) ||
              porNome.get(normalizar(String(local.nome || ""))) ||
              colaboradoresPix.find((c: any) =>
                nomesCorrespondem(String(local.nome || ""), String(c.nome || "")),
              );

            if (!colaboradora) return local;

            return {
              ...local,
              id: String(colaboradora.id || local.id || ""),
              nome: colaboradora.nome || local.nome,
              email: colaboradora.email || local.email,
              matricula: colaboradora.matricula || local.matricula,
              chave_pix: String(colaboradora.chave_pix || "").trim(),
              tipo_chave_pix: String(
                colaboradora.tipo_chave_pix || "PIX",
              ).trim(),
            };
          });

          colaboradoresPix.forEach((colaboradora: any) => {
            const chaveNome = normalizar(String(colaboradora.nome || ""));
            const indice = listaUsuarios.findIndex(
              (u) =>
                normalizar(String(u.nome || "")) === chaveNome ||
                nomesCorrespondem(String(u.nome || ""), String(colaboradora.nome || "")),
            );

            if (indice >= 0) {
              listaUsuarios[indice] = {
                ...listaUsuarios[indice],
                id: String(colaboradora.id || listaUsuarios[indice].id || ""),
                nome: colaboradora.nome || listaUsuarios[indice].nome,
                email: colaboradora.email || listaUsuarios[indice].email,
                matricula:
                  colaboradora.matricula || listaUsuarios[indice].matricula,
                chave_pix: String(colaboradora.chave_pix || "").trim(),
                tipo_chave_pix: String(
                  colaboradora.tipo_chave_pix || "PIX",
                ).trim(),
              };
            } else {
              listaUsuarios.push({
                id: String(colaboradora.id || ""),
                nome: colaboradora.nome || "",
                email: colaboradora.email || "",
                matricula: colaboradora.matricula || "",
                chave_pix: String(colaboradora.chave_pix || "").trim(),
                tipo_chave_pix: String(
                  colaboradora.tipo_chave_pix || "PIX",
                ).trim(),
              });
            }
          });
        }
      } catch {
        // Mantém a lista local caso o cadastro permanente do RH não esteja disponível.
      }

      const nomeVanessa = "Vanessa Vitoria Nunes de Bessa";
      const indiceVanessa = listaUsuarios.findIndex((u) =>
        normalizar(String(u.nome || "")).includes("vanessa")
      );

      if (indiceVanessa >= 0) {
        listaUsuarios[indiceVanessa] = {
          ...listaUsuarios[indiceVanessa],
          nome: nomeVanessa,
          perfil: "Coordenadora",
          cargo: "Coordenadora",
        };
      } else {
        listaUsuarios.push({
          id: "vanessa-coordenadora",
          nome: nomeVanessa,
          perfil: "Coordenadora",
          cargo: "Coordenadora",
        });
      }
      setUsuarios(listaUsuarios);

      const qtdVendedoras = Math.max(
        listaUsuarios.filter((u) => perfilVendas(String(u.perfil || u.cargo || ""))).length,
        1,
      );
      setQuantidadeVendedorasAtivas(qtdVendedoras);

      try {
        const inicioMes = `${competencia}-01`;
        const [anoCusto, mesCusto] = competencia.split("-").map(Number);
        const fimMes = `${competencia}-${String(new Date(anoCusto, mesCusto, 0).getDate()).padStart(2, "0")}`;

        const [
          { data: saidasData },
          { data: despesasFixasData },
          { data: pagamentosFixosData },
          { data: folhasData },
          { data: saquesPagosData },
        ] = await Promise.all([
          supabase.from("movimentos_financeiros").select("id, categoria, valor, data")
            .eq("tipo", "Saída").gte("data", inicioMes).lte("data", fimMes),
          supabase.from("despesas_recorrentes")
            .select("id, valor, inicio_competencia, fim_competencia, ativo"),
          supabase.from("despesas_recorrentes_pagamentos")
            .select("despesa_recorrente_id, movimento_id, competencia, valor_pago")
            .eq("competencia", competencia),
          supabase.from("folha_pagamentos").select("total_mensal, competencia")
            .eq("competencia", competencia),
          supabase.from("pontos_saques")
            .select("valor_reais, pontos_solicitados, status, processado_em")
            .eq("status", "PAGO"),
        ]);

        const pagamentosFixos = Array.isArray(pagamentosFixosData) ? pagamentosFixosData : [];
        const idsFixos = new Set(pagamentosFixos.map((p:any)=>String(p.movimento_id||"")).filter(Boolean));

        const outrasSaidas = (Array.isArray(saidasData) ? saidasData : [])
          .filter((m:any)=>!idsFixos.has(String(m.id||"")))
          .filter((m:any)=>normalizar(String(m.categoria||"")) !== "folha de pagamento")
          .reduce((t:number,m:any)=>t+Number(m.valor||0),0);

        const fixasPrevistas = (Array.isArray(despesasFixasData) ? despesasFixasData : [])
          .filter((d:any)=>d.ativo!==false &&
            competencia>=String(d.inicio_competencia||"") &&
            (!d.fim_competencia || competencia<=String(d.fim_competencia)))
          .reduce((t:number,d:any)=>t+Number(d.valor||0),0);

        const folhaMes = (Array.isArray(folhasData) ? folhasData : [])
          .reduce((t:number,f:any)=>t+Number(f.total_mensal||0),0);

        const premiacoesPagas = (Array.isArray(saquesPagosData) ? saquesPagosData : [])
          .filter((s:any)=>String(s.processado_em||"").slice(0,7)===competencia)
          .reduce((t:number,s:any)=>t+Number(s.valor_reais||s.pontos_solicitados||0),0);

        setCustoEmpresaCompetencia(outrasSaidas + fixasPrevistas + folhaMes + premiacoesPagas);
      } catch {
        setCustoEmpresaCompetencia(0);
      }

      const login = localStorage.getItem("somos-eleva-usuario") || "";
      const matricula =
        localStorage.getItem("somos-eleva-matricula") || login;

      const usuarioLocal =
        listaUsuarios.find((item) => String(item.id || "") === authId) ||
        listaUsuarios.find(
          (item) =>
            String(item.id || "") === login ||
            String(item.matricula || "") === login ||
            String(item.matricula || "") === matricula ||
            normalizar(item.email || "") === normalizar(login),
        );

      const nome =
        usuarioLocal?.nome?.trim() ||
        localStorage.getItem("somos-eleva-nome")?.trim() ||
        "";
      const perfil =
        usuarioLocal?.perfil?.trim() ||
        usuarioLocal?.cargo?.trim() ||
        localStorage.getItem("somos-eleva-cargo")?.trim() ||
        "Consultora";

      setNomeLogado(nome);
      setPerfilLogado(perfil);

      // FONTE ÚNICA: a MESMA /api/propostas usada pela Gestão de Propostas.
      // A Central não reconstrói valores em outra rota.
      const [respostaPropostas, respostaClt] = await Promise.all([
        fetch(`/api/propostas?_=${Date.now()}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(`/api/clt?_=${Date.now()}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      const conteudoPropostas = await respostaPropostas.json();
      const conteudoClt = await respostaClt.json();

      if (!respostaPropostas.ok) {
        throw new Error(
          conteudoPropostas.erro ||
            "Não foi possível carregar as propostas da Gestão de Propostas.",
        );
      }

      if (!respostaClt.ok) {
        throw new Error(
          conteudoClt.erro || "Não foi possível carregar os registros CLT.",
        );
      }

      const propostasApiBrutas = Array.isArray(conteudoPropostas.propostas)
        ? (conteudoPropostas.propostas as PropostaCompra[])
        : [];
      const propostasApi = mergePropostasComLocal(propostasApiBrutas);

      // Mantém exatamente os valores que a Gestão de Propostas recebeu:
      // valorContrato, valorMeta, percentualTabela, comissao, status,
      // dataCadastro e dataPagamento.
      setPropostas(propostasApi);
      setClt(Array.isArray(conteudoClt.registros) ? conteudoClt.registros : []);
      setTabelasConfiguradas([]);

      const [anoComp, mesComp] = competencia.split("-").map(Number);
      const mesProdCompraApi = new Date(anoComp, mesComp - 2, 1);
      const competenciaCompraApi = `${mesProdCompraApi.getFullYear()}-${String(
        mesProdCompraApi.getMonth() + 1,
      ).padStart(2, "0")}`;
      const limiteComp = new Date(anoComp, mesComp - 1, 19, 23, 59, 59);
      const daCompetencia = propostasApi.filter(
        (proposta) =>
          chaveMes(dataLocal(proposta.dataCadastro)) === competenciaCompraApi,
      );
      const pagasNoPrazo = daCompetencia.filter((proposta) => {
        if (normalizar(proposta.status) !== "pago") return false;
        const pagamento = dataLocal(proposta.dataPagamento);
        return Boolean(pagamento && pagamento <= limiteComp);
      });

      setDiagnosticoApi(
        `Fonte Gestão de Propostas / Compra: ${daCompetencia.length} digitada(s) em ${competenciaCompraApi} e ${pagasNoPrazo.length} paga(s) até dia 19 de ${competencia}.`,
      );

      const [
        { data: planosData, error: planosErro },
        { data: faixasData, error: faixasErro },
        { data: extratoData, error: extratoErro },
        { data: saquesData, error: saquesErro },
        { data: previsoesData, error: previsoesErro },
      ] = await Promise.all([
        supabase
          .from("premiacao_planos")
          .select("id, codigo, nome, parametros, ativo")
          .eq("ativo", true),
        supabase
          .from("premiacao_faixas")
          .select(
            "id, plano_id, ordem, nome_faixa, valor_min, valor_max, tipo_recompensa, valor_recompensa, bonus_reais, ativo",
          )
          .eq("ativo", true),
        supabase
          .from("pontos_extrato")
          .select(
            "id, usuario_id, usuario_nome, competencia_id, previsao_id, tipo, origem, descricao, pontos, criado_em",
          )
          .order("criado_em", { ascending: false }),
        supabase
          .from("pontos_saques")
          .select(
            "id, usuario_id, usuario_nome, competencia_id, pontos_solicitados, valor_reais, status, chave_pix, tipo_chave_pix, solicitado_em, processado_em, motivo_recusa",
          )
          .order("solicitado_em", { ascending: false }),
        supabase
          .from("premiacao_previsoes")
          .select(
            "id, usuario_id, plano_codigo, pontos_liberados, valor_reais_liberado, status",
          )
          .eq("status", "LIBERADA"),
      ]);

      if (planosErro) throw new Error(planosErro.message);
      if (faixasErro) throw new Error(faixasErro.message);
      if (extratoErro) throw new Error(extratoErro.message);
      if (saquesErro) throw new Error(saquesErro.message);
      if (previsoesErro) throw new Error(previsoesErro.message);

      setPlanos((planosData || []) as PlanoPremiacao[]);
      setFaixas((faixasData || []) as FaixaPremiacao[]);
      setExtrato(Array.isArray(extratoData) ? extratoData : []);
      setSaques((Array.isArray(saquesData) ? saquesData : []) as SaquePremiacao[]);
      setPrevisoesLiberadas(
        (Array.isArray(previsoesData) ? previsoesData : []) as PrevisaoLiberada[],
      );
      return true;
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar a premiação.",
      );
      return false;
    } finally {
      setCarregando(false);
    }
  }, [supabase, competencia]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const pixPorColaboradora = useMemo(() => {
    const mapa: Record<string, { chave: string; tipo: string }> = {};

    usuarios.forEach((usuario) => {
      const nome = String(usuario.nome || "").trim();
      const chavePix = String(usuario.chave_pix || "").trim();
      if (nome && chavePix) {
        mapa[normalizar(nome)] = {
          chave: chavePix,
          tipo: String(usuario.tipo_chave_pix || "PIX"),
        };
      }
    });

    // Compatibilidade: se ainda não houver PIX permanente, aproveita o último PIX de saque.
    saques.forEach((saque) => {
      const nome = String(saque.usuario_nome || "").trim();
      const chavePix = String(saque.chave_pix || "").trim();
      const chaveNome = normalizar(nome);
      if (nome && chavePix && !mapa[chaveNome]) {
        mapa[chaveNome] = {
          chave: chavePix,
          tipo: String(saque.tipo_chave_pix || "PIX"),
        };
      }
    });

    return mapa;
  }, [usuarios, saques]);

  const nomesConsultoras = useMemo(() => {
    // O RH é a fonte principal de identidade. Produção/CLT podem usar nomes
    // abreviados, mas nunca devem criar uma segunda pessoa na lista.
    const nomesRh = usuarios
      .map((usuario) => String(usuario.nome || "").trim())
      .filter(Boolean);

    const canonico = (nomeBruto: string) => {
      const nome = String(nomeBruto || "").trim();
      if (!nome) return "";

      const exato = nomesRh.find(
        (nomeRh) => normalizar(nomeRh) === normalizar(nome),
      );
      if (exato) return exato;

      const correspondente = nomesRh.find((nomeRh) =>
        nomesCorrespondem(nome, nomeRh),
      );
      return correspondente || nome;
    };

    const mapa = new Map<string, string>();
    const adicionar = (nomeBruto: string) => {
      const nome = canonico(nomeBruto);
      if (!nome) return;

      // Se já existir uma versão abreviada da mesma pessoa, remove e mantém
      // somente o nome canônico/completo vindo do RH.
      for (const [chaveExistente, nomeExistente] of Array.from(mapa.entries())) {
        if (nomesCorrespondem(nomeExistente, nome)) {
          const existenteEhRh = nomesRh.some(
            (nomeRh) => normalizar(nomeRh) === normalizar(nomeExistente),
          );
          const novoEhRh = nomesRh.some(
            (nomeRh) => normalizar(nomeRh) === normalizar(nome),
          );

          if (novoEhRh && !existenteEhRh) {
            mapa.delete(chaveExistente);
            mapa.set(normalizar(nome), nome);
          }
          return;
        }
      }

      mapa.set(normalizar(nome), nome);
    };

    usuarios
      .filter((usuario) => {
        const perfil = usuario.perfil || usuario.cargo || "";
        return (
          perfilVendas(perfil) ||
          perfilOperacional(perfil) ||
          perfilCoordenacao(perfil) ||
          perfilSupervisao(perfil) ||
          normalizar(perfil).includes("qualidade") ||
          normalizar(String(usuario.nome || "")).includes("vinicius") ||
          normalizar(String(usuario.nome || "")).includes("sthefane")
        );
      })
      .forEach((usuario) => adicionar(String(usuario.nome || "")));

    propostas.forEach((proposta) => adicionar(String(proposta.vendedora || "")));
    clt.forEach((registro) => adicionar(String(registro.consultora || "")));

    adicionar("Vanessa Vitoria Nunes de Bessa");

    if (!ehGestor && nomeLogado) {
      return [canonico(nomeLogado) || nomeLogado];
    }

    return [...mapa.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [usuarios, propostas, clt, ehGestor, nomeLogado]);
  useEffect(() => {
    if (!nomeLogado) return;

    if (!ehGestor) {
      setConsultoraSelecionada(nomeLogado);
      return;
    }

    // Para gestor, inicializa a primeira colaboradora apenas uma vez.
    // Não sobrescreve uma seleção feita manualmente no seletor.
    if (!consultoraSelecionada) {
      setConsultoraSelecionada(nomesConsultoras[0] || "");
    }
  }, [
    ehGestor,
    nomeLogado,
    nomesConsultoras,
    consultoraSelecionada,
  ]);

  const usuarioSelecionado = useMemo(() => {
    const nome = ehGestor ? consultoraSelecionada : nomeLogado;
    const chave = normalizar(nome);

    return (
      usuarios.find((usuario) => normalizar(usuario.nome || "") === chave) ||
      usuarios.find((usuario) =>
        nomesCorrespondem(String(usuario.nome || ""), nome),
      ) ||
      (chave.includes("vanessa")
        ? {
            id: "vanessa-coordenadora",
            nome: "Vanessa Vitoria Nunes de Bessa",
            perfil: "Coordenadora",
            cargo: "Coordenadora",
          }
        : null)
    );
  }, [usuarios, ehGestor, consultoraSelecionada, nomeLogado]);

  const usuarioSelecionadoId =
    usuarioSelecionado?.id || (!ehGestor ? usuarioLogadoId : "");

  const usuarioCarteira = useMemo(() => {
    if (!ehGestor) return usuarioSelecionado;

    return (
      usuarios.find((usuario) => String(usuario.id || "") === usuarioLogadoId) ||
      usuarios.find((usuario) =>
        nomesCorrespondem(String(usuario.nome || ""), nomeLogado),
      ) ||
      null
    );
  }, [usuarios, ehGestor, usuarioSelecionado, usuarioLogadoId, nomeLogado]);

  const usuarioCarteiraId = String(
    usuarioCarteira?.id || (!ehGestor ? usuarioSelecionadoId : "")
  );

  const planoCompra = planos.find(
    (plano) => plano.codigo === "CONSULTORA_COMPRA",
  );
  const planoClt = planos.find(
    (plano) => plano.codigo === "CONSULTORA_CLT",
  );
  const planoOperacional = planos.find(
    (plano) => plano.codigo === "OPERACIONAL",
  );
  const planoCoordenacao = planos.find(
    (plano) => plano.codigo === "COORDENACAO_COMPRA",
  );
  const planoSupervisao = planos.find(
    (plano) => plano.codigo === "SUPERVISAO",
  );

  function tabelaDaProposta(proposta: PropostaCompra) {
    const banco = normalizar(proposta.banco || "");
    const nomeProposta = normalizar(proposta.tabela || "");

    const candidatasBanco = tabelasConfiguradas.filter(
      (tabela) =>
        tabela.ativo && normalizar(tabela.banco || "") === banco,
    );

    if (!candidatasBanco.length) return null;

    const exata = candidatasBanco.find(
      (tabela) =>
        normalizar(tabela.nome || "") === nomeProposta ||
        normalizar(tabela.codigo || "") === nomeProposta,
    );
    if (exata) return exata;

    const porPrefixo = candidatasBanco.find((tabela) => {
      const nomeTabela = normalizar(tabela.nome || "");
      return (
        nomeProposta.length >= 6 &&
        (nomeTabela.startsWith(nomeProposta) ||
          nomeProposta.startsWith(nomeTabela))
      );
    });
    if (porPrefixo) return porPrefixo;

    const compactar = (valor: string) =>
      normalizar(valor).replace(/[^a-z0-9]/g, "");

    const chaveProposta = compactar(nomeProposta);
    return (
      candidatasBanco.find((tabela) => {
        const chaveTabela = compactar(tabela.nome || "");
        return (
          chaveProposta.length >= 6 &&
          (chaveTabela.startsWith(chaveProposta) ||
            chaveProposta.startsWith(chaveTabela))
        );
      }) || null
    );
  }

  function pesoProposta(proposta: PropostaCompra) {
    const salvo = Number(proposta.percentualTabela || 0);
    if (salvo > 0) return salvo;

    const tabela = tabelaDaProposta(proposta);
    return Number(tabela?.percentual || 0);
  }

  function valorValidoProposta(proposta: PropostaCompra) {
    // Gestão de Propostas já salva o VALOR FINAL / produção válida em valorMeta.
    const valorMeta = Number(proposta.valorMeta || 0);
    if (valorMeta > 0) return valorMeta;

    const valorContrato = Number(proposta.valorContrato || 0);
    const peso = pesoProposta(proposta);
    return valorContrato > 0 && peso > 0
      ? valorContrato * (peso / 100)
      : 0;
  }

  function comissaoEmpresaProposta(proposta: PropostaCompra) {
    const recebida = Number(proposta.comissao || 0);
    if (recebida > 0) return recebida;

    const tabela = tabelaDaProposta(proposta);
    const percentual = Number(tabela?.percentualComissaoBanco || 0);

    return Number(proposta.valorContrato || 0) * (percentual / 100);
  }

  const perfilSelecionado = String(
    usuarioSelecionado?.perfil || usuarioSelecionado?.cargo || "",
  );
  const nomeSelecionadoNormalizado = normalizar(
    usuarioSelecionado?.nome || consultoraSelecionada || nomeLogado,
  );
  const selecionadoEhVinicius = nomeSelecionadoNormalizado.includes("vinicius");
  const selecionadoEhSupervisao =
    nomeSelecionadoNormalizado.includes("raissa") ||
    perfilSupervisao(perfilSelecionado);
  const selecionadoEhOperacional =
    !selecionadoEhVinicius &&
    !selecionadoEhSupervisao &&
    perfilOperacional(perfilSelecionado);
  const selecionadoEhCoordenacao =
    nomeSelecionadoNormalizado.includes("vanessa") ||
    perfilCoordenacao(perfilSelecionado);

  const resumo = useMemo(() => {
    const nome = ehGestor ? consultoraSelecionada : nomeLogado;
    const chave = normalizar(nome);

    // COMPETÊNCIA DA COMPRA:
    // A competência selecionada na tela é o MÊS DO PAGAMENTO DA PREMIAÇÃO.
    // Ex.: SETEMBRO/2026 => Compra digitada de 01/08 a 31/08 e paga até 19/09.
    const [anoCompetencia, mesCompetencia] = competencia.split("-").map(Number);
    const mesProducaoCompra = new Date(anoCompetencia, mesCompetencia - 2, 1);
    const competenciaCompra = `${mesProducaoCompra.getFullYear()}-${String(
      mesProducaoCompra.getMonth() + 1,
    ).padStart(2, "0")}`;

    const propostasDigitadas = propostas.filter((proposta) => {
      return (
        nomesCorrespondem(String(proposta.vendedora || ""), String(nome || "")) &&
        chaveMes(dataLocal(proposta.dataCadastro)) === competenciaCompra
      );
    });

    const limitePagamentoCompra = new Date(
      anoCompetencia,
      mesCompetencia - 1,
      19,
      23,
      59,
      59,
    );

    const propostasPagas: PropostaCompra[] = propostasDigitadas.filter(
      (proposta) => {
        if (normalizar(proposta.status) !== "pago") return false;

        const pagamento = dataLocal(proposta.dataPagamento);
        if (!pagamento) return false;

        return pagamento <= limitePagamentoCompra;
      },
    );

    const registrosCltPagos = clt.filter((registro) => {
      const data = dataLocal(
        registro.dataPagamento ||
          registro.atualizadoEm ||
          registro.criadoEm,
      );

      return (
        normalizar(registro.status) === "pago" &&
        nomesCorrespondem(String(registro.consultora || ""), String(nome || "")) &&
        chaveMes(data) === competencia
      );
    });

    // RAISSA / SUPERVISÃO ------------------------------------------------
    // A meta da supervisão soma:
    //   parcelas CLT PAGAS da equipe/empresa
    // + produção válida da Compra PAGA da equipe/empresa.
    //
    // Mesmo antes de atingir R$ 500 mil, os valores pagos precisam aparecer
    // normalmente na tela para acompanhar o progresso da meta.
    if (selecionadoEhSupervisao) {
      const propostasEmpresaDigitadas = propostas.filter(
        (proposta) =>
          chaveMes(dataLocal(proposta.dataCadastro)) === competenciaCompra,
      );

      const propostasEmpresaPagas = propostasEmpresaDigitadas.filter(
        (proposta) => {
          if (normalizar(proposta.status) !== "pago") return false;
          const pagamento = dataLocal(proposta.dataPagamento);
          return Boolean(pagamento && pagamento <= limitePagamentoCompra);
        },
      );

      const registrosCltEmpresaPagos = clt.filter((registro) => {
        const data = dataLocal(
          registro.dataPagamento ||
          registro.atualizadoEm ||
          registro.criadoEm,
        );

        return (
          normalizar(registro.status) === "pago" &&
          chaveMes(data) === competencia
        );
      });

      // Compra entra pela produção válida (peso da tabela).
      const producaoCompraEquipe = propostasEmpresaPagas.reduce(
        (total, proposta) => total + valorValidoProposta(proposta),
        0,
      );

      // CLT da supervisão entra pela soma das PARCELAS pagas.
      const producaoCltEquipe = registrosCltEmpresaPagos.reduce(
        (total, registro) => total + Number(registro.parcela || 0),
        0,
      );

      const producaoTotalSupervisao =
        producaoCompraEquipe + producaoCltEquipe;

      const faixaSupervisao =
        faixaDoPlano(planoSupervisao, faixas, producaoTotalSupervisao) ||
        faixaSupervisaoFallback(producaoTotalSupervisao);

      const premioSupervisao = recompensaFaixa(faixaSupervisao);

      const movimentosSupervisao: MovimentoPremiacao[] = [
        ...propostasEmpresaPagas.map((proposta) => ({
          id: `supervisao-compra-${proposta.id}`,
          propostaId: proposta.id,
          produto: "Compra de Dívida" as const,
          cliente: proposta.cliente || "Cliente",
          descricao: proposta.tabela || "Compra de Dívida",
          data: proposta.dataPagamento || proposta.dataCadastro,
          banco: proposta.banco || "",
          tabela: proposta.tabela || "",
          valorContrato: Number(proposta.valorContrato || 0),
          pesoTabela: pesoProposta(proposta),
          producaoValida: valorValidoProposta(proposta),
          comissaoEmpresa: comissaoEmpresaProposta(proposta),
          valorParcelaClt: 0,
        })),
        ...registrosCltEmpresaPagos.map((registro) => ({
          id: `supervisao-clt-${registro.id}`,
          propostaId: registro.id,
          produto: "CLT" as const,
          cliente: registro.nome || "Cliente CLT",
          descricao: "Parcela CLT paga",
          data:
            registro.dataPagamento ||
            registro.atualizadoEm ||
            registro.criadoEm ||
            "",
          banco: "",
          tabela: "",
          valorContrato: 0,
          pesoTabela: 0,
          producaoValida: Number(registro.parcela || 0),
          comissaoEmpresa: 0,
          valorParcelaClt: Number(registro.parcela || 0),
        })),
      ].sort((a, b) => {
        const dataA = dataLocal(a.data)?.getTime() || 0;
        const dataB = dataLocal(b.data)?.getTime() || 0;
        return dataB - dataA;
      });

      const propostasAguardando = propostasEmpresaDigitadas.filter(
        (proposta) => normalizar(proposta.status) !== "pago",
      );

      return {
        nome,
        propostasPagas: propostasEmpresaPagas,
        registrosCltPagos: registrosCltEmpresaPagos,
        movimentos: movimentosSupervisao,

        // Esses dois cards mostram exatamente o que já foi pago em cada produto.
        producaoCompra: producaoCompraEquipe,
        producaoClt: producaoCltEquipe,

        // Aqui mostramos o total que está caminhando para a meta de R$ 500 mil.
        producaoDigitada: producaoTotalSupervisao,
        producaoEmFormacao: propostasAguardando.reduce(
          (total, proposta) =>
            total + Number(proposta.valorContrato || 0),
          0,
        ),
        valorPagoBruto: propostasEmpresaPagas.reduce(
          (total, proposta) =>
            total + Number(proposta.valorContrato || 0),
          0,
        ),
        comissaoEmpresa: 0,
        faixaCompra: faixaSupervisao,
        faixaClt: null,
        pontosCompraPrevistos: premioSupervisao,
        pontosCltPrevistos: 0,
        complementoCompraComClt: 0,
        totalPrevisto: premioSupervisao,

        contratosDigitados:
          propostasEmpresaDigitadas.length + registrosCltEmpresaPagos.length,
        contratosConfirmados:
          propostasEmpresaPagas.length + registrosCltEmpresaPagos.length,
        contratosEmFormacao: propostasAguardando.length,
        contratosForaPrazo: propostasEmpresaDigitadas.filter((proposta) => {
          if (normalizar(proposta.status) !== "pago") return false;
          const pagamento = dataLocal(proposta.dataPagamento);
          return Boolean(pagamento && pagamento > limitePagamentoCompra);
        }).length,
      };
    }

    // VINICIUS ------------------------------------------------------------
    // 1) Vendas próprias seguem exatamente a mesma regra de premiação da Compra
    //    usada pelas consultoras/vendedoras.
    // 2) Soma R$ 5,00 por CADA contrato de Compra pago da empresa na competência.
    // 3) Se a produção válida da empresa atingir R$ 1.000.000, mantém o bônus
    //    de meta configurado (padrão R$ 500,00).
    if (selecionadoEhVinicius) {
      const producaoVendaPropria = propostasPagas.reduce(
        (total, proposta) => total + valorValidoProposta(proposta),
        0,
      );

      const faixaVendaPropria =
        faixaDoPlano(planoCompra, faixas, producaoVendaPropria) ||
        faixaFallback("COMPRA", producaoVendaPropria);

      // Mesma premiação das vendedoras, sem criar uma tabela paralela.
      const premioVendaPropria = recompensaFaixa(faixaVendaPropria as any);

      const propostasEmpresaDigitadas = propostas.filter(
        (proposta) =>
          chaveMes(dataLocal(proposta.dataCadastro)) === competenciaCompra,
      );

      const propostasEmpresaPagas = propostasEmpresaDigitadas.filter(
        (proposta) => {
          if (normalizar(proposta.status) !== "pago") return false;
          const pagamento = dataLocal(proposta.dataPagamento);
          return Boolean(pagamento && pagamento <= limitePagamentoCompra);
        },
      );

      const producaoValidaEmpresa = propostasEmpresaPagas.reduce(
        (total, proposta) => total + valorValidoProposta(proposta),
        0,
      );

      const valorPorContratoPago = 5;
      const premioContratos =
        propostasEmpresaPagas.length * valorPorContratoPago;

      const planoQualidade = planos.find(
        (plano) => plano.codigo === "QUALIDADE",
      );

      const metaEmpresa = Number(
        planoQualidade?.parametros?.meta_empresa || 1000000,
      );
      const bonusMeta = producaoValidaEmpresa >= metaEmpresa
        ? Number(planoQualidade?.parametros?.bonus_meta_reais || 500)
        : 0;

      const totalVinicius =
        premioVendaPropria + premioContratos + bonusMeta;

      const idsVendaPropria = new Set(
        propostasPagas.map((proposta) => String(proposta.id)),
      );

      const movimentosVinicius: MovimentoPremiacao[] =
        propostasEmpresaPagas.map((proposta) => {
          const ehVendaPropria = idsVendaPropria.has(String(proposta.id));

          return {
            id: `vinicius-empresa-${proposta.id}`,
            propostaId: proposta.id,
            produto: "Compra de Dívida" as const,
            cliente: proposta.cliente || "Cliente",
            descricao: ehVendaPropria
              ? `${proposta.tabela || "Compra de Dívida"} • venda própria + R$ 5 contrato pago`
              : `${proposta.tabela || "Compra de Dívida"} • R$ 5 contrato pago da empresa`,
            data: proposta.dataPagamento || proposta.dataCadastro,
            banco: proposta.banco || "",
            tabela: proposta.tabela || "",
            valorContrato: Number(proposta.valorContrato || 0),
            pesoTabela: pesoProposta(proposta),
            producaoValida: valorValidoProposta(proposta),
            comissaoEmpresa: comissaoEmpresaProposta(proposta),
            valorParcelaClt: 0,
          };
        });

      return {
        nome,
        propostasPagas,
        registrosCltPagos: [],
        movimentos: movimentosVinicius,
        // Aqui mostramos a PRODUÇÃO PRÓPRIA do Vinicius, não a produção da empresa.
        producaoCompra: producaoVendaPropria,
        producaoClt: 0,
        producaoDigitada: propostasEmpresaDigitadas.reduce(
          (total, proposta) => total + valorValidoProposta(proposta),
          0,
        ),
        producaoEmFormacao: propostasEmpresaDigitadas
          .filter((proposta) => normalizar(proposta.status) !== "pago")
          .reduce(
            (total, proposta) => total + Number(proposta.valorContrato || 0),
            0,
          ),
        valorPagoBruto: propostasEmpresaPagas.reduce(
          (total, proposta) =>
            total + Number(proposta.valorContrato || 0),
          0,
        ),
        comissaoEmpresa: 0,
        faixaCompra: faixaVendaPropria,
        faixaClt: null,

        // Pontuação/valor a receber:
        // Compra = venda própria (regra da vendedora) + R$ 5 por contrato pago.
        pontosCompraPrevistos: premioVendaPropria + premioContratos,
        // Campo complementar usado para mostrar o bônus de R$ 1 milhão, quando houver.
        pontosCltPrevistos: bonusMeta,
        complementoCompraComClt: 0,
        totalPrevisto: totalVinicius,

        contratosDigitados: propostasEmpresaDigitadas.length,
        contratosConfirmados: propostasEmpresaPagas.length,
        contratosEmFormacao: propostasEmpresaDigitadas.filter(
          (proposta) => normalizar(proposta.status) !== "pago",
        ).length,
        contratosForaPrazo: propostasEmpresaDigitadas.filter((proposta) => {
          if (normalizar(proposta.status) !== "pago") return false;
          const pagamento = dataLocal(proposta.dataPagamento);
          return Boolean(pagamento && pagamento > limitePagamentoCompra);
        }).length,
      };
    }

    if (selecionadoEhOperacional) {
      const digitadasEmpresa = propostas.filter(
        (p) => chaveMes(dataLocal(p.dataCadastro)) === competenciaCompra,
      );
      const pagasEmpresa = digitadasEmpresa.filter((p) => {
        if (normalizar(p.status) !== "pago") return false;
        const pagamento = dataLocal(p.dataPagamento);
        return Boolean(pagamento && pagamento <= limitePagamentoCompra);
      });
      // Sthefane recebe sobre TODOS os contratos pagos de Compra da empresa,
      // independentemente de quem digitou/operou a proposta.
      const contratos = pagasEmpresa;
      const producaoEmpresa = pagasEmpresa.reduce(
        (total, p) => total + valorValidoProposta(p),
        0,
      );
      const valorContrato = Number(
        planoOperacional?.parametros?.valor_por_contrato_pago || 10,
      );
      const valorDigitacoes = contratos.length * valorContrato;
      const bonus =
        producaoEmpresa >= 1000000 ? 500 : producaoEmpresa >= 500000 ? 250 : 0;

      const movimentosOperacional: MovimentoPremiacao[] = contratos.map((p) => ({
        id: `operacional-${p.id}`,
        propostaId: p.id,
        produto: "Compra de Dívida" as const,
        cliente: p.cliente || "Cliente",
        descricao: `${p.tabela || "Compra de Dívida"} • R$ ${valorContrato.toLocaleString("pt-BR")} por contrato pago da empresa`,
        data: p.dataPagamento || p.dataCadastro,
        banco: p.banco || "",
        tabela: p.tabela || "",
        valorContrato: Number(p.valorContrato || 0),
        pesoTabela: pesoProposta(p),
        producaoValida: valorValidoProposta(p),
        comissaoEmpresa: comissaoEmpresaProposta(p),
        valorParcelaClt: 0,
        dataDigitacao: p.dataCadastro || "",
        dataPagamento: p.dataPagamento || "",
        valorBruto: Number(p.valorContrato || 0),
        percentualVendedor: pesoProposta(p),
      }));

      return {
        nome,
        propostasPagas: contratos,
        registrosCltPagos: [],
        movimentos: movimentosOperacional,
        producaoCompra: producaoEmpresa,
        producaoClt: 0,
        producaoDigitada: producaoEmpresa,
        producaoEmFormacao: 0,
        valorPagoBruto: contratos.reduce(
          (total, p) => total + Number(p.valorContrato || 0), 0
        ),
        comissaoEmpresa: 0,
        faixaCompra: producaoEmpresa >= 1000000
          ? { nome_faixa: "META R$ 1 MILHÃO" }
          : producaoEmpresa >= 500000
            ? { nome_faixa: "META R$ 500 MIL" }
            : null,
        faixaClt: null,
        pontosCompraPrevistos: valorDigitacoes + bonus,
        pontosCltPrevistos: 0,
        complementoCompraComClt: 0,
        totalPrevisto: valorDigitacoes + bonus,
        contratosDigitados: contratos.length,
        contratosConfirmados: contratos.length,
        contratosEmFormacao: 0,
        contratosForaPrazo: 0,
      };
    }

    if (selecionadoEhCoordenacao) {
      const digitadasEmpresa = propostas.filter(
        (p) => chaveMes(dataLocal(p.dataCadastro)) === competenciaCompra,
      );
      const pagasEmpresa = digitadasEmpresa.filter((p) => {
        if (normalizar(p.status) !== "pago") return false;
        const pagamento = dataLocal(p.dataPagamento);
        return Boolean(pagamento && pagamento <= limitePagamentoCompra);
      });
      // VANESSA / COORDENAÇÃO:
      // A competência exibida (ex.: setembro/2026) é a competência de pagamento da premiação.
      // A produção-base é o MÊS ANTERIOR (competenciaCompra; ex.: agosto/2026).
      // Para CLT, reproduzir o filtro da tela CLT:
      // status PAGO + dataPagamento dentro do mês de produção + soma de valorAprovado.
      const cltEmpresaPago = clt.filter((r) => {
        const dataPagamento = dataLocal(r.dataPagamento);
        return (
          normalizar(r.status) === "pago" &&
          chaveMes(dataPagamento) === competenciaCompra
        );
      });
      const compraEmpresa = pagasEmpresa.reduce(
        (total, p) => total + valorValidoProposta(p), 0
      );
      // VANESSA / COORDENAÇÃO:
      // CLT entra pelo VALOR BRUTO/LIBERADO das operações CLT PAGAS da empresa
      // na competência. NÃO usar a soma das parcelas.
      const cltBrutoEmpresa = cltEmpresaPago.reduce(
        (total, r) => total + Number(r.valorAprovado || 0),
        0,
      );
      const metaClt = Number(
        planoCoordenacao?.parametros?.meta_clt_empresa || 1500000,
      );
      const bateuMetaClt = cltBrutoEmpresa >= metaClt;
      // Se a empresa bateu R$ 1,5 milhão no CLT, Vanessa NÃO precisa
      // cumprir uma meta mínima de Compra: recebe pela faixa correspondente
      // ao total líquido que a empresa vendeu em Compra.
      // Sem a meta CLT, a Compra só ativa a partir de R$ 260 mil.
      const minimoCompraSemMetaClt = Number(
        planoCoordenacao?.parametros?.compra_minima_sem_meta_clt || 260000,
      );
      const compraHabilitada = bateuMetaClt || compraEmpresa >= minimoCompraSemMetaClt;
      const faixaCoordPlano = compraHabilitada
        ? faixaDoPlano(planoCoordenacao, faixas, compraEmpresa)
        : null;
      const faixaCoordFallback = compraHabilitada && !faixaCoordPlano
        ? faixaCompraCoordenacaoFallback(compraEmpresa)
        : null;
      const faixaCoord: FaixaPremiacao | null =
        faixaCoordPlano || faixaCoordFallback;
      const premioCompraCoord = recompensaFaixa(faixaCoord);
      const bonusClt = premioCltCoordenacao(cltBrutoEmpresa);

      const movimentosCoord: MovimentoPremiacao[] = [
        ...pagasEmpresa.map((p) => ({
          id: `coord-compra-${p.id}`,
          propostaId: p.id,
          produto: "Compra de Dívida" as const,
          cliente: p.cliente || "Cliente",
          descricao: p.tabela || "Compra de Dívida",
          data: p.dataPagamento || p.dataCadastro,
          banco: p.banco || "",
          tabela: p.tabela || "",
          valorContrato: Number(p.valorContrato || 0),
          pesoTabela: pesoProposta(p),
          producaoValida: valorValidoProposta(p),
          comissaoEmpresa: comissaoEmpresaProposta(p),
          valorParcelaClt: 0,
        })),
        ...cltEmpresaPago.map((r) => ({
          id: `coord-clt-${r.id}`,
          propostaId: r.id,
          produto: "CLT" as const,
          cliente: r.nome || "Cliente CLT",
          descricao: "Parcela CLT",
          data: r.dataPagamento || r.atualizadoEm || r.criadoEm || "",
          banco: "",
          tabela: "",
          valorContrato: 0,
          pesoTabela: 0,
          producaoValida: Number(r.valorAprovado || 0),
          comissaoEmpresa: 0,
          valorParcelaClt: Number(r.parcela || 0),
        })),
      ];

      return {
        nome,
        propostasPagas: pagasEmpresa,
        registrosCltPagos: cltEmpresaPago,
        movimentos: movimentosCoord,
        producaoCompra: compraEmpresa,
        producaoClt: cltBrutoEmpresa,
        producaoDigitada: compraEmpresa,
        producaoEmFormacao: 0,
        valorPagoBruto: pagasEmpresa.reduce(
          (total, p) => total + Number(p.valorContrato || 0), 0
        ),
        comissaoEmpresa: 0,
        faixaCompra: faixaCoord,
        faixaClt: bonusClt > 0 ? { nome_faixa: "META CLT COORDENAÇÃO" } : null,
        pontosCompraPrevistos: premioCompraCoord,
        pontosCltPrevistos: bonusClt,
        complementoCompraComClt: 0,
        totalPrevisto: premioCompraCoord + bonusClt,
        contratosDigitados: digitadasEmpresa.length,
        contratosConfirmados: pagasEmpresa.length + cltEmpresaPago.length,
        contratosEmFormacao: 0,
        contratosForaPrazo: 0,
      };
    }

    const producaoCompra = propostasPagas.reduce(
      (total, proposta) => total + valorValidoProposta(proposta),
      0,
    );

    const comissaoEmpresa = propostasPagas.reduce(
      (total, proposta) => total + comissaoEmpresaProposta(proposta),
      0,
    );

    const producaoClt = registrosCltPagos.reduce(
      (total, registro) => total + Number(registro.parcela || 0),
      0,
    );

    const faixaCompra =
      faixaDoPlano(planoCompra, faixas, producaoCompra) ||
      faixaFallback("COMPRA", producaoCompra);
    const faixaClt =
      faixaDoPlano(planoClt, faixas, producaoClt) ||
      faixaFallback("CLT", producaoClt);

    const pontosCompraPrevistos = recompensaFaixa(faixaCompra as any);
    const premioCltBase = recompensaFaixa(faixaClt as any);

    const minimoClt = Number(planoClt?.parametros?.clt_minimo || 20000);
    const limiteCompra = Number(
      planoClt?.parametros?.compra_abaixo_minimo_pontos?.limite_compra ||
        30000,
    );
    const percentualCompraComClt = Number(
      planoClt?.parametros?.compra_abaixo_minimo_pontos
        ?.percentual_premiacao_compra || 1,
    );

    const bateuMetaCompra = producaoCompra >= limiteCompra;
    const bateuMetaClt = producaoClt >= minimoClt;
    const complementoCompraComClt =
      producaoClt > 0 && producaoCompra > 0 && (bateuMetaCompra || bateuMetaClt)
        ? producaoClt * (percentualCompraComClt / 100)
        : 0;

    const pontosCltPrevistos = premioCltBase + complementoCompraComClt;

    const movimentos: MovimentoPremiacao[] = [
      ...propostasPagas.map((proposta) => ({
        id: `compra-${proposta.id}`,
        propostaId: proposta.id,
        produto: "Compra de Dívida" as const,
        cliente: proposta.cliente || "Cliente",
        descricao: proposta.tabela || "Compra de Dívida",
        data: proposta.dataPagamento || proposta.dataCadastro,
        banco: proposta.banco || "",
        tabela: proposta.tabela || "",
        valorContrato: Number(proposta.valorContrato || 0),
        pesoTabela: pesoProposta(proposta),
        producaoValida: valorValidoProposta(proposta),
        comissaoEmpresa: comissaoEmpresaProposta(proposta),
        valorParcelaClt: 0,
        dataDigitacao: proposta.dataCadastro || "",
        dataPagamento: proposta.dataPagamento || "",
        valorBruto: Number(proposta.valorContrato || 0),
        percentualVendedor: pesoProposta(proposta),
      })),
      ...registrosCltPagos.map((registro) => ({
        id: `clt-${registro.id}`,
        propostaId: registro.id,
        produto: "CLT" as const,
        cliente: registro.nome || "Cliente CLT",
        descricao: "Parcela CLT",
        data:
          registro.dataPagamento ||
          registro.atualizadoEm ||
          registro.criadoEm ||
          "",
        banco: "",
        tabela: "",
        valorContrato: 0,
        pesoTabela: 0,
        producaoValida: Number(registro.parcela || 0),
        comissaoEmpresa: 0,
        valorParcelaClt: Number(registro.parcela || 0),
        dataDigitacao: registro.criadoEm || "",
        dataPagamento: registro.dataPagamento || "",
        valorBruto: Number(registro.valorAprovado || 0),
        percentualVendedor: 100,
      })),
    ].sort((a, b) => {
      const dataA = dataLocal(a.data)?.getTime() || 0;
      const dataB = dataLocal(b.data)?.getTime() || 0;
      return dataB - dataA;
    });

    const producaoDigitada = propostasDigitadas.reduce(
      (total, proposta) => total + valorValidoProposta(proposta),
      0,
    );

    const valorPagoBruto = propostasPagas.reduce(
      (total, proposta) => total + Number(proposta.valorContrato || 0),
      0,
    );

    const propostasAguardando = propostasDigitadas.filter(
      (proposta) => normalizar(proposta.status) !== "pago",
    );

    const propostasForaPrazo = propostasDigitadas.filter((proposta) => {
      if (normalizar(proposta.status) !== "pago") return false;

      const pagamento = dataLocal(proposta.dataPagamento);
      return Boolean(pagamento && pagamento > limitePagamentoCompra);
    });

    const producaoEmFormacao = propostasAguardando.reduce(
      (total, proposta) => total + Number(proposta.valorContrato || 0),
      0,
    );

    return {
      nome,
      propostasPagas,
      registrosCltPagos,
      movimentos,
      producaoCompra,
      producaoClt,
      producaoDigitada,
      producaoEmFormacao,
      valorPagoBruto,
      comissaoEmpresa,
      faixaCompra,
      faixaClt,
      pontosCompraPrevistos,
      pontosCltPrevistos,
      complementoCompraComClt,
      totalPrevisto: pontosCompraPrevistos + pontosCltPrevistos,
      contratosDigitados: propostasDigitadas.length,
      contratosConfirmados:
        propostasPagas.length + registrosCltPagos.length,
      contratosEmFormacao: propostasAguardando.length,
      contratosForaPrazo: propostasForaPrazo.length,
    };
  }, [
    ehGestor,
    consultoraSelecionada,
    nomeLogado,
    propostas,
    clt,
    competencia,
    planoCompra,
    planoClt,
    faixas,
    tabelasConfiguradas,
    selecionadoEhVinicius,
    selecionadoEhSupervisao,
    selecionadoEhOperacional,
    selecionadoEhCoordenacao,
    planoOperacional,
    planoCoordenacao,
    planoSupervisao,
  ]);

  const idSaldoAtual = ehGestor ? usuarioCarteiraId : usuarioSelecionadoId;

  const saldoPontos = useMemo(() => {
    if (!idSaldoAtual) return 0;

    return extrato
      .filter((item) => item.usuario_id === idSaldoAtual)
      .reduce((total, item) => {
        const valor = Number(item.pontos || 0);
        if (item.tipo === "DEBITO") return total - Math.abs(valor);
        return total + valor;
      }, 0);
  }, [extrato, idSaldoAtual]);

  const saquesPendentesUsuario = saques.filter(
    (saque) =>
      saque.usuario_id === idSaldoAtual &&
      saque.status === "SOLICITADO",
  );

  const pontosBloqueados = saquesPendentesUsuario.reduce(
    (total, saque) => total + Number(saque.pontos_solicitados || 0),
    0,
  );

  const saldoDisponivelSaque = Math.max(saldoPontos - pontosBloqueados, 0);

  const jaLiberada = useMemo(() => {
    if (!usuarioSelecionadoId) return false;

    const codigos = selecionadoEhVinicius
      ? ["QUALIDADE"]
      : selecionadoEhSupervisao
        ? ["SUPERVISAO"]
        : selecionadoEhOperacional
          ? ["OPERACIONAL"]
          : selecionadoEhCoordenacao
            ? ["COORDENACAO_COMPRA"]
            : ["CONSULTORA_COMPRA", "CONSULTORA_CLT"];

    return previsoesLiberadas.some(
      (item) =>
        item.usuario_id === usuarioSelecionadoId &&
        codigos.includes(item.plano_codigo),
    );
  }, [
    previsoesLiberadas,
    usuarioSelecionadoId,
    selecionadoEhVinicius,
    selecionadoEhSupervisao,
    selecionadoEhOperacional,
    selecionadoEhCoordenacao,
  ]);

  async function garantirCompetencia() {
    const competenciaData = primeiroDiaCompetencia(competencia);

    const { data: existente, error: erroBusca } = await supabase
      .from("premiacao_competencias")
      .select("id")
      .eq("competencia", competenciaData)
      .maybeSingle();

    if (erroBusca) throw new Error(erroBusca.message);
    if (existente?.id) return String(existente.id);

    const [ano, mes] = competencia.split("-").map(Number);
    const dataLimite = new Date(ano, mes, 19);
    const dataLiberacao = new Date(ano, mes, 20);

    const { data: criada, error: erroCriacao } = await supabase
      .from("premiacao_competencias")
      .insert({
        competencia: competenciaData,
        status: "EM_CONFERENCIA",
        data_limite_conferencia: dataLimite.toISOString().slice(0, 10),
        data_prevista_liberacao: dataLiberacao.toISOString().slice(0, 10),
      })
      .select("id")
      .single();

    if (erroCriacao) throw new Error(erroCriacao.message);
    return String(criada.id);
  }

  async function liberarPlano({
    competenciaId,
    usuarioId,
    plano,
    pontosPrevistos,
    pontosLiberados,
    producaoCompra,
    producaoClt,
    detalhes,
    cargoChave = "Consultora",
  }: {
    competenciaId: string;
    usuarioId: string;
    plano: PlanoPremiacao | undefined;
    pontosPrevistos: number;
    pontosLiberados: number;
    producaoCompra: number;
    producaoClt: number;
    detalhes: Record<string, unknown>;
    cargoChave?: string;
  }) {
    if (!plano) return;

    const payload = {
      competencia_id: competenciaId,
      usuario_id: usuarioId,
      usuario_nome: resumo.nome,
      cargo_chave: cargoChave,
      plano_codigo: plano.codigo,
      plano_id: plano.id,
      producao_compra_valida: producaoCompra,
      producao_clt_parcelas: producaoClt,
      producao_total_meta: producaoCompra + producaoClt,
      contratos_pagos: resumo.contratosConfirmados,
      pontos_previstos: pontosPrevistos,
      valor_reais_previsto: pontosPrevistos,
      pontos_liberados: pontosLiberados,
      valor_reais_liberado: pontosLiberados,
      status: "LIBERADA",
      conferido_em: new Date().toISOString(),
      conferido_por: usuarioLogadoId,
      liberado_em: new Date().toISOString(),
      liberado_por: usuarioLogadoId,
      detalhes_calculo: detalhes,
    };

    const { data: previsaoExistente, error: erroExistente } = await supabase
      .from("premiacao_previsoes")
      .select("id, status")
      .eq("competencia_id", competenciaId)
      .eq("usuario_id", usuarioId)
      .eq("plano_codigo", plano.codigo)
      .maybeSingle();

    if (erroExistente) throw new Error(erroExistente.message);

    let previsaoId = String(previsaoExistente?.id || "");

    if (previsaoExistente?.status === "LIBERADA") {
      throw new Error(
        `O plano ${plano.nome} já foi liberado para esta colaboradora nesta competência.`,
      );
    }

    if (previsaoId) {
      const { error } = await supabase
        .from("premiacao_previsoes")
        .update(payload)
        .eq("id", previsaoId);

      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase
        .from("premiacao_previsoes")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      previsaoId = String(data.id);
    }

    if (pontosLiberados > 0) {
      const { error: erroExtrato } = await supabase.from("pontos_extrato").insert({
        usuario_id: usuarioId,
        usuario_nome: resumo.nome,
        competencia_id: competenciaId,
        previsao_id: previsaoId,
        tipo: "CREDITO",
        origem: "PREMIACAO_LIBERADA",
        descricao: `${plano.nome} — ${competencia}`,
        pontos: pontosLiberados,
        lancado_por: usuarioLogadoId,
      });

      if (
        erroExtrato &&
        !String(erroExtrato.message || "").toLowerCase().includes("duplicate")
      ) {
        throw new Error(erroExtrato.message);
      }
    }
  }

  async function liberarPremiacao(
    pontosCompraLiberados: number,
    pontosCltLiberados: number,
  ) {
    if (!ehGestor) return;

    if (!usuarioSelecionadoId) {
      setMensagem(
        "Não encontrei o ID da colaboradora. Atualize o cadastro da Equipe antes de liberar.",
      );
      return;
    }

    if (jaLiberada) {
      setMensagem("Esta premiação já foi liberada nesta competência.");
      return;
    }

    const confirmou = window.confirm(
      `Confirma a liberação de ${(
        pontosCompraLiberados + pontosCltLiberados
      ).toLocaleString("pt-BR")} pontos para ${resumo.nome}?`,
    );

    if (!confirmou) return;

    setProcessando(true);
    setMensagem("");

    try {
      const competenciaId = await garantirCompetencia();

      if (selecionadoEhSupervisao) {
        await liberarPlano({
          competenciaId,
          usuarioId: usuarioSelecionadoId,
          plano: planoSupervisao,
          pontosPrevistos: resumo.totalPrevisto,
          pontosLiberados: Math.max(
            0,
            pontosCompraLiberados + pontosCltLiberados,
          ),
          producaoCompra: resumo.producaoCompra,
          producaoClt: resumo.producaoClt,
          detalhes: {
            regra:
              "Supervisão: parcelas CLT pagas + produção válida da Compra paga; meta mínima R$ 500 mil",
            producao_compra_paga: resumo.producaoCompra,
            parcelas_clt_pagas: resumo.producaoClt,
            producao_total_meta:
              resumo.producaoCompra + resumo.producaoClt,
            faixa: resumo.faixaCompra?.nome_faixa || null,
          },
          cargoChave: "Supervisora",
        });

        setMensagem("Premiação da supervisão conferida e liberada com sucesso.");
        await carregar();
        return;
      }

      if (selecionadoEhVinicius) {
        const planoQualidade = planos.find(
          (plano) => plano.codigo === "QUALIDADE",
        );

        await liberarPlano({
          competenciaId,
          usuarioId: usuarioSelecionadoId,
          plano: planoQualidade,
          pontosPrevistos: resumo.totalPrevisto,
          pontosLiberados: Math.max(
            0,
            pontosCompraLiberados + pontosCltLiberados,
          ),
          producaoCompra: resumo.producaoCompra,
          producaoClt: 0,
          detalhes: {
            regra:
              "Venda própria pela mesma regra das vendedoras + R$ 5 por TODOS os contratos pagos de Compra da empresa, sem meta para o valor por contrato; bônus de meta somente quando aplicável",
            producao_venda_propria: resumo.producaoCompra,
            contratos_venda_propria: resumo.contratosConfirmados,
          },
          cargoChave: "Qualidade",
        });

        setMensagem("Premiação do Vinicius conferida e liberada com sucesso.");
        await carregar();
        return;
      }

      if (selecionadoEhOperacional) {
        await liberarPlano({
          competenciaId,
          usuarioId: usuarioSelecionadoId,
          plano: planoOperacional,
          pontosPrevistos: resumo.totalPrevisto,
          pontosLiberados: Math.max(
            0, pontosCompraLiberados + pontosCltLiberados
          ),
          producaoCompra: resumo.producaoCompra,
          producaoClt: 0,
          detalhes: {
            regra: "R$ 10 por TODOS os contratos pagos de Compra da empresa, sem meta para o valor por contrato + bônus não cumulativo por meta",
            contratos_pagos: resumo.contratosConfirmados,
            producao_empresa: resumo.producaoCompra,
          },
          cargoChave: "Operacional",
        });
        setMensagem("Premiação operacional conferida e liberada com sucesso.");
        await carregar();
        return;
      }

      if (selecionadoEhCoordenacao) {
        await liberarPlano({
          competenciaId,
          usuarioId: usuarioSelecionadoId,
          plano: planoCoordenacao,
          pontosPrevistos: resumo.totalPrevisto,
          pontosLiberados: Math.max(
            0, pontosCompraLiberados + pontosCltLiberados
          ),
          producaoCompra: resumo.producaoCompra,
          producaoClt: resumo.producaoClt,
          detalhes: {
            faixa: resumo.faixaCompra?.nome_faixa || null,
            regra_clt: "R$ 1.500.000 em valor liberado = R$ 300",
            valor_liberado_clt: resumo.producaoClt,
            bonus_clt: resumo.pontosCltPrevistos,
          },
          cargoChave: "Coordenadora",
        });
        setMensagem("Premiação da coordenação conferida e liberada com sucesso.");
        await carregar();
        return;
      }

      await liberarPlano({
        competenciaId,
        usuarioId: usuarioSelecionadoId,
        plano: planoCompra,
        pontosPrevistos: resumo.pontosCompraPrevistos,
        pontosLiberados: Math.max(0, pontosCompraLiberados),
        producaoCompra: resumo.producaoCompra,
        producaoClt: 0,
        detalhes: {
          faixa: resumo.faixaCompra?.nome_faixa || null,
          comissao_empresa: resumo.comissaoEmpresa,
          contratos: resumo.propostasPagas.length,
        },
      });

      await liberarPlano({
        competenciaId,
        usuarioId: usuarioSelecionadoId,
        plano: planoClt,
        pontosPrevistos: resumo.pontosCltPrevistos,
        pontosLiberados: Math.max(0, pontosCltLiberados),
        producaoCompra: resumo.producaoCompra,
        producaoClt: resumo.producaoClt,
        detalhes: {
          faixa: resumo.faixaClt?.nome_faixa || null,
          complemento_compra_1_porcento: resumo.complementoCompraComClt,
          contratos_clt: resumo.registrosCltPagos.length,
        },
      });

      setMensagem("Premiação conferida e liberada com sucesso.");
      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível liberar a premiação.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function salvarPixColaboradora(
    _usuarioId: string,
    tipoPix: string,
    chavePix: string,
  ) {
    if (!ehGestor) {
      throw new Error("Seu perfil não possui permissão para cadastrar PIX.");
    }

    const nomeColaboradoraPix = String(
      resumo.nome || consultoraSelecionada || nomeLogado || ""
    ).trim();

    if (!nomeColaboradoraPix) {
      throw new Error("Não encontrei o nome da colaboradora selecionada.");
    }

    setProcessando(true);
    setMensagem("");

    try {
      const dadosPix = {
        chave_pix: chavePix.trim(),
        tipo_chave_pix: tipoPix,
      };

      // O PIX pertence à ficha permanente da colaboradora no RH.
      // Aqui o NOME é a chave principal, pois a lista da Premiação também
      // contém pessoas vindas das propostas/CLT que podem não ter ID carregado.
      const { data: colaboradoras, error: erroBusca } = await supabase
        .from("rh_colaboradoras")
        .select("id, nome, chave_pix, tipo_chave_pix");

      if (erroBusca) throw new Error(erroBusca.message);

      const registroReal = (colaboradoras || []).find(
        (colaboradora: any) =>
          normalizar(String(colaboradora.nome || "")) ===
            normalizar(nomeColaboradoraPix) ||
          nomesCorrespondem(
            nomeColaboradoraPix,
            String(colaboradora.nome || ""),
          ),
      );

      if (!registroReal?.id) {
        throw new Error(
          `Não encontrei a ficha de RH de ${nomeColaboradoraPix}.`,
        );
      }

      const { data: registroSalvo, error: erroSalvar } = await supabase
        .from("rh_colaboradoras")
        .update(dadosPix)
        .eq("id", registroReal.id)
        .select("id, nome, chave_pix, tipo_chave_pix")
        .single();

      if (erroSalvar) throw new Error(erroSalvar.message);

      setUsuarios((atual) =>
        atual.map((usuario) =>
          normalizar(String(usuario.nome || "")) ===
            normalizar(nomeColaboradoraPix) ||
          nomesCorrespondem(String(usuario.nome || ""), nomeColaboradoraPix)
            ? {
                ...usuario,
                id: String(registroSalvo?.id || usuario.id || ""),
                chave_pix: String(
                  registroSalvo?.chave_pix || chavePix.trim(),
                ),
                tipo_chave_pix: String(
                  registroSalvo?.tipo_chave_pix || tipoPix,
                ),
              }
            : usuario,
        ),
      );

      setMensagem(`PIX de ${nomeColaboradoraPix} salvo permanentemente na ficha do RH.`);
      await carregar();
    } finally {
      setProcessando(false);
    }
  }

  async function solicitarSaque(pontosSolicitados: number, chavePix: string) {
    const usuarioSaqueId = ehGestor ? usuarioCarteiraId : usuarioSelecionadoId;
    if (!usuarioSaqueId) {
      throw new Error("Não encontrei sua carteira de pontos.");
    }

    const quantidade = Math.floor(Number(pontosSolicitados || 0) * 100) / 100;

    if (quantidade <= 0 || quantidade > saldoDisponivelSaque) {
      throw new Error("Informe uma quantidade válida dentro do saldo disponível.");
    }

    // Vincula o saque à competência selecionada. Isso permite que o Financeiro
    // mostre o pagamento no mês correto, inclusive Sthefane e Vinicius.
    const competenciaId = await garantirCompetencia();

    const { error } = await supabase.from("pontos_saques").insert({
      usuario_id: usuarioSaqueId,
      usuario_nome: nomeLogado,
      competencia_id: competenciaId,
      pontos_solicitados: quantidade,
      valor_reais: quantidade,
      status: "SOLICITADO",
      chave_pix: chavePix.trim(),
    });

    if (error) throw new Error(error.message);

    setMensagem("Solicitação de saque enviada para a gestão.");
    await carregar();
  }

  async function processarSaque(
    saqueId: string,
    acao: "PAGO" | "RECUSADO",
  ) {
    if (!ehGestor) return;

    const saque = saques.find((item) => item.id === saqueId);
    if (!saque || saque.status !== "SOLICITADO") return;

    if (acao === "PAGO") {
      const confirmou = window.confirm(
        `Confirma que o PIX de R$ ${Number(
          saque.valor_reais || saque.pontos_solicitados,
        ).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} foi pago para ${saque.usuario_nome}?`,
      );

      if (!confirmou) return;
    }

    setProcessando(true);
    setMensagem("");

    try {
      if (acao === "PAGO") {
        const origem = `SAQUE_PAGO:${saque.id}`;

        const { error: erroDebito } = await supabase.from("pontos_extrato").insert({
          usuario_id: saque.usuario_id,
          usuario_nome: saque.usuario_nome,
          competencia_id: saque.competencia_id || null,
          tipo: "DEBITO",
          origem,
          descricao: `Saque pago — ${saque.usuario_nome}`,
          pontos: Number(saque.pontos_solicitados || 0),
          lancado_por: usuarioLogadoId,
        });

        if (
          erroDebito &&
          !String(erroDebito.message || "").toLowerCase().includes("duplicate")
        ) {
          throw new Error(erroDebito.message);
        }
      }

      const { error: erroStatus } = await supabase
        .from("pontos_saques")
        .update({
          status: acao,
          processado_em: new Date().toISOString(),
          processado_por: usuarioLogadoId,
          motivo_recusa:
            acao === "RECUSADO" ? "Recusado pela gestão." : null,
        })
        .eq("id", saque.id);

      if (erroStatus) throw new Error(erroStatus.message);

      setMensagem(
        acao === "PAGO"
          ? "Saque marcado como pago e pontos baixados."
          : "Solicitação recusada.",
      );
      await carregar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível processar o saque.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function atualizarAgora() {
    setProcessando(true);
    setMensagem("Atualizando dados e recalculando a premiação...");

    try {
      const ok = await carregar();
      if (ok) {
        setMensagem(
          "Atualização concluída. Contratos pagos e pontuação foram recalculados.",
        );
      }
    } finally {
      setProcessando(false);
    }
  }

  if (carregando) {
    return (
      <div className="premio-v3-loading">
        Carregando Central de Premiação...
      </div>
    );
  }

  return (
    <>
      {mensagem && <div className="premio-v3-message">{mensagem}</div>}
      {diagnosticoApi && (
        <div className="premio-v3-message">{diagnosticoApi}</div>
      )}

      <MinhaPremiacaoV2
        nomeUsuario={nomeLogado}
        nomeExibido={resumo.nome || nomeLogado}
        carteiraNome={usuarioCarteira?.nome || nomeLogado}
        perfilUsuario={perfilLogado}
        podeGerenciar={ehGestor}
        nomesConsultoras={nomesConsultoras}
        pixPorColaboradora={pixPorColaboradora}
        consultoraSelecionada={consultoraSelecionada}
        competencia={competencia}
        producaoCompra={resumo.producaoCompra}
        producaoClt={resumo.producaoClt}
        producaoDigitada={resumo.producaoDigitada}
        producaoConfirmada={resumo.producaoCompra + resumo.producaoClt}
        producaoEmFormacao={resumo.producaoEmFormacao}
        valorPagoBruto={resumo.valorPagoBruto}
        contratosDigitados={resumo.contratosDigitados}
        contratosConfirmados={resumo.contratosConfirmados}
        contratosEmFormacao={resumo.contratosEmFormacao}
        contratosForaPrazo={resumo.contratosForaPrazo}
        pontosCompraPrevistos={resumo.pontosCompraPrevistos}
        pontosCltPrevistos={resumo.pontosCltPrevistos}
        pontosTotalPrevisto={resumo.totalPrevisto}
        faixaCompra={resumo.faixaCompra?.nome_faixa || ""}
        faixaClt={resumo.faixaClt?.nome_faixa || ""}
        complementoCompraComClt={resumo.complementoCompraComClt}
        comissaoEmpresa={resumo.comissaoEmpresa}
        custoEmpresaCompetencia={custoEmpresaCompetencia}
        quantidadeVendedorasAtivas={quantidadeVendedorasAtivas}
        movimentos={resumo.movimentos}
        saldoPontos={saldoPontos}
        saldoDisponivelSaque={saldoDisponivelSaque}
        premiacaoJaLiberada={jaLiberada}
        saques={saques}
        extrato={extrato}
        processando={processando}
        onConsultoraChange={setConsultoraSelecionada}
        onCompetenciaChange={setCompetencia}
        onAtualizar={atualizarAgora}
        onLiberarPremiacao={liberarPremiacao}
        onSolicitarSaque={solicitarSaque}
        onProcessarSaque={processarSaque}
        onSalvarPix={salvarPixColaboradora}
      />
    </>
  );
}

export default PremiacaoManagerV3;
