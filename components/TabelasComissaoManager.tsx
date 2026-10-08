"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TipoTabela = "clt" | "compra";

type LinhaComissao = {
  id: string;
  metaParcelasPagas?: string;
  valorPremiacao?: string;
  destaque?: string;
  faixa?: string;
  valorBase?: string;
};

type TabelaComissao = {
  id: string;
  titulo: string;
  tipo: TipoTabela;
  linhas: LinhaComissao[];
};

type GrupoComissao = {
  id: string;
  titulo: string;
  subtitulo: string;
  tipoGrupo: "coordenacao" | "supervisao" | "vendedoras";
  tabelas: TabelaComissao[];
};

const CHAVE_STORAGE = "somos-eleva-tabelas-comissao-v2";

const linha = (dados: Omit<LinhaComissao, "id">): LinhaComissao => ({
  id: crypto.randomUUID(),
  ...dados,
});

const compraCoordenacao = [
  ["FAIXA 1", "30.000 a 39.999 Pontos", "300 Pontos"],
  ["FAIXA 2", "40.000 a 49.999 Pontos", "400 Pontos"],
  ["FAIXA 3", "50.000 a 59.999 Pontos", "500 Pontos"],
  ["FAIXA 4", "60.000 a 69.999 Pontos", "600 Pontos"],
  ["FAIXA 5", "70.000 a 79.999 Pontos", "700 Pontos"],
  ["FAIXA 6", "80.000 a 89.999 Pontos", "800 Pontos"],
  ["FAIXA 7", "90.000 a 119.999 Pontos", "900 Pontos"],
  ["FAIXA 8", "120.000 a 139.999 Pontos", "1.000 Pontos"],
  ["FAIXA 9", "140.000 a 159.999 Pontos", "1.200 Pontos"],
  ["FAIXA 10", "160.000 a 179.999 Pontos", "1.400 Pontos"],
  ["FAIXA 11", "180.000 a 199.999 Pontos", "1.600 Pontos"],
  ["FAIXA 12", "200.000 a 219.999 Pontos", "1.800 Pontos"],
  ["FAIXA 13", "220.000 a 239.999 Pontos", "2.000 Pontos"],
  ["FAIXA 14", "240.000 a 259.999 Pontos", "2.200 Pontos"],
  ["FAIXA 15", "260.000 a 279.999 Pontos", "2.500 Pontos"],
  ["FAIXA 16", "280.000 a 299.999 Pontos", "2.800 Pontos"],
  ["FAIXA 17", "300.000 a 349.999 Pontos", "3.000 Pontos"],
  ["FAIXA 18", "350.000 a 399.999 Pontos", "3.500 Pontos"],
  ["FAIXA 23", "400.000 a 499.999 Pontos", "4.000 Pontos"],
  ["FAIXA 28", "500.000 a 599.999 Pontos", "5.000 Pontos"],
  ["FAIXA 33", "600.000 a 699.999 Pontos", "7.000 Pontos"],
  ["FAIXA 38", "700.000 a 799.999 Pontos", "8.000 Pontos"],
  ["FAIXA 43", "800.000 a 899.999 Pontos", "9.000 Pontos"],
  ["FAIXA 48", "900.000 a 999.999 Pontos", "10.000 Pontos"],
  ["FAIXA 53", "1.000.000 Pontos", "12.000 Pontos"],
];

const compraConsultor = [
  ["FAIXA1", "30 mil a R$ 39.999", "400 Pontos"],
  ["FAIXA2", "40 mil a R$ 49.999", "600 Pontos"],
  ["FAIXA3", "50 mil a R$ 59.999", "800 Pontos"],
  ["FAIXA4", "60 mil a R$ 69.999", "1000 Pontos"],
  ["FAIXA5", "70 mil a R$ 79.999", "1300 Pontos"],
  ["FAIXA6", "80 mil a R$ 89.999", "1600 Pontos"],
  ["FAIXA7", "90 mil a R$ 109.999", "2000 Pontos"],
  ["FAIXA8", "110 mil a R$ 129.999", "2500 Pontos"],
  ["FAIXA9", "130 mil a R$ 149.999", "3000 Pontos"],
  ["FAIXA10", "150 mil a R$ 169.999", "3500 Pontos"],
  ["FAIXA11", "170 mil a R$ 189.999", "4000 Pontos"],
  ["FAIXA12", "190 mil a R$ 209.999", "4500 Pontos"],
  ["FAIXA13", "210 mil a R$ 229.999", "5000 Pontos"],
  ["FAIXA14", "230 mil a R$ 249.999", "5500 Pontos"],
  ["FAIXA15", "250 mil a R$ 269.999", "6000 Pontos"],
  ["FAIXA16", "270 mil a R$ 289.999", "6500 Pontos"],
  ["FAIXA17", "290 mil a R$ 309.999", "7000 Pontos"],
  ["FAIXA18", "310 mil a R$ 329.999", "7500 Pontos"],
  ["FAIXA19", "330 mil a R$ 349.999", "8000 Pontos"],
  ["FAIXA20", "350 mil a R$ 369.999", "8500 Pontos"],
  ["FAIXA21", "370 mil a R$ 389.999", "9000 Pontos"],
  ["FAIXA22", "390 mil a R$ 409.999", "9500 Pontos"],
  ["FAIXA23", "410 mil a R$ 429.999", "10000 Pontos"],
  ["FAIXA24", "430 mil a R$ 449.999", "10500 Pontos"],
  ["FAIXA25", "450 mil", "12000 Pontos"],
];

const cltConsultor = [
  ["20.000", "R$ 150,00", "Meta retenção"],
  ["30.000", "R$ 400,00", ""],
  ["40.000", "R$ 600,00", ""],
  ["50.000", "R$ 800,00", ""],
  ["60.000", "R$ 2.000,00", "Salto de prêmio"],
  ["70.000", "R$ 2.500,00", "Salto de prêmio"],
  ["80.000 até 99.999", "R$ 2.600,00 + R$ 500,00 de bônus", "Total com Bônus R$ 3.100,00"],
  ["100.000", "R$ 4.000,00 + R$ 500,00 de bônus", "Meta forte R$ 4.500,00"],
  ["110.000", "R$ 4.700,00", ""],
  ["120.000", "R$ 4.800,00", ""],
  ["130.000", "R$ 4.900,00", ""],
  ["140.000", "R$ 5.000,00", ""],
  ["150.000", "R$ 5.000,00 + R$ 1.000,00 bônus", "Super meta R$ 6.000,00"],
];

const cltCoordenacao = [
  ["250.000", "R$ 400,00", ""],
  ["300.000", "R$ 1000,00", ""],
  ["350.000", "R$ 2.000,00", ""],
  ["400.000", "R$ 2.500,00", ""],
  ["500.000", "R$ 3.000,00", ""],
  ["600.000", "R$ 4.000 + R$ 500,00 de bônus", "Meta forte R$ 4.500,00"],
  ["700.000", "R$ 4.000,00 + R$ 1.000,00 de bônus", "Super meta R$ 5.000,00"],
];

const compraSupervisao = [
  ["FAIXA 28", "Meta mínima 500 mil", "500 Pontos"],
  ["FAIXA 43", "Meta intermediária 800 mil", "800 Pontos"],
  ["FAIXA 53", "Meta 1 Milhão", "1200 Pontos"],
  ["FAIXA 43", "Meta 1.200 MM", "1500 Pontos"],
  ["FAIXA 48", "Meta 1.500 MM", "2000 Pontos"],
  ["FAIXA 53", "Meta 2 Milhões", "2500 Pontos"],
];

const cltSupervisao = [
  ["250.000", "R$ 200,00", ""],
  ["300.000", "R$ 500,00", ""],
  ["350.000", "R$ 1.000,00", ""],
  ["400.000", "R$ 1.250,00", ""],
  ["500.000", "R$ 2.000,00", ""],
  ["600.000", "R$ 3.000 + R$ 500,00 de bônus", "Meta forte R$ 3.500,00"],
  ["700.000", "R$ 3.000,00 + R$ 1.000,00 de bônus", "Super meta R$ 4.000,00"],
];

const linhasCompra = (dados: string[][]) =>
  dados.map(([faixa, valorBase, valorPremiacao]) =>
    linha({ faixa, valorBase, valorPremiacao })
  );

const linhasClt = (dados: string[][]) =>
  dados.map(([metaParcelasPagas, valorPremiacao, destaque]) =>
    linha({ metaParcelasPagas, valorPremiacao, destaque })
  );

function modelosIniciais(): GrupoComissao[] {
  return [
    {
      id: "grupo-coordenacao",
      titulo: "Comissão COORDENAÇÃO",
      subtitulo: "Planos de comissão para coordenação em Compra de Dívida e CLT.",
      tipoGrupo: "coordenacao",
      tabelas: [
        {
          id: "coordenacao-compra-divida",
          titulo: "Comissão COMPRA DÍVIDA COORDENAÇÃO",
          tipo: "compra",
          linhas: linhasCompra(compraCoordenacao),
        },
        {
          id: "coordenacao-clt",
          titulo: "Comissão CLT COORDENAÇÃO",
          tipo: "clt",
          linhas: linhasClt(cltCoordenacao),
        },
      ],
    },
    {
      id: "grupo-supervisao",
      titulo: "PREMIAÇÃO SUPERVISÃO",
      subtitulo: "Planos de premiação para supervisão em Compra de Dívida e CLT.",
      tipoGrupo: "supervisao",
      tabelas: [
        {
          id: "supervisao-compra-divida",
          titulo: "Comissão COMPRA DÍVIDA SUPERVISÃO",
          tipo: "compra",
          linhas: linhasCompra(compraSupervisao),
        },
        {
          id: "supervisao-clt",
          titulo: "Comissão CLT SUPERVISÃO",
          tipo: "clt",
          linhas: linhasClt(cltSupervisao),
        },
      ],
    },
    {
      id: "grupo-vendedoras",
      titulo: "Comissões Vendedoras",
      subtitulo: "Tabelas de comissão das vendedoras por produto e fornecedor.",
      tipoGrupo: "vendedoras",
      tabelas: [
        {
          id: "comissao-3rn-clt",
          titulo: "Comissão 3RN - CLT",
          tipo: "clt",
          linhas: linhasClt(cltConsultor),
        },
        {
          id: "comissao-c6-3rn-clt",
          titulo: "Comissão C6-parceiro3RN - CLT",
          tipo: "clt",
          linhas: linhasClt(cltConsultor),
        },
        {
          id: "comissao-neo-compra",
          titulo: "Comissão Neo - COMPRA DÍVIDA",
          tipo: "compra",
          linhas: linhasCompra(compraConsultor),
        },
        {
          id: "comissao-futuro-finanbank-compra",
          titulo: "Comissão Futuro-finanbank - COMPRA DÍVIDA",
          tipo: "compra",
          linhas: linhasCompra(compraConsultor),
        },
        {
          id: "comissao-amigoz-finanbank-compra",
          titulo: "Comissão amigoz-finanbank - COMPRA DÍVIDA",
          tipo: "compra",
          linhas: linhasCompra(compraConsultor),
        },
      ],
    },
  ];
}

const criarLinhaVazia = (tipo: TipoTabela): LinhaComissao =>
  tipo === "clt"
    ? linha({ metaParcelasPagas: "", valorPremiacao: "", destaque: "" })
    : linha({ faixa: "", valorBase: "", valorPremiacao: "" });


type DestinoImportacao = {
  grupoId: string;
  tabelaId: string;
  tipo: TipoTabela;
};

function dividirLinhaArquivo(linhaTexto: string, separador: string) {
  const partes: string[] = [];
  let atual = "";
  let aspas = false;

  for (let i = 0; i < linhaTexto.length; i++) {
    const caractere = linhaTexto[i];

    if (caractere === '"') {
      aspas = !aspas;
      continue;
    }

    if (caractere === separador && !aspas) {
      partes.push(atual.trim());
      atual = "";
      continue;
    }

    atual += caractere;
  }

  partes.push(atual.trim());

  return partes;
}

function detectarSeparador(primeiraLinha: string) {
  if (primeiraLinha.includes("\t")) return "\t";

  const pontoVirgula = (primeiraLinha.match(/;/g) || []).length;
  const virgula = (primeiraLinha.match(/,/g) || []).length;

  return pontoVirgula >= virgula ? ";" : ",";
}

function normalizarCabecalho(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function localizarColuna(cabecalhos: string[], termos: string[]) {
  return cabecalhos.findIndex((cabecalho) => {
    const normalizado = normalizarCabecalho(cabecalho);

    return termos.some((termo) => normalizado.includes(termo));
  });
}

function converterArquivoEmLinhas(conteudo: string, tipo: TipoTabela) {
  const texto = conteudo.trim();

  if (!texto) return [];

  try {
    const json = JSON.parse(texto);
    const lista = Array.isArray(json) ? json : json?.linhas;

    if (Array.isArray(lista)) {
      return lista.map((item: any) =>
        tipo === "clt"
          ? linha({
              metaParcelasPagas:
                item.metaParcelasPagas || item.meta || item.producao || "",
              valorPremiacao:
                item.valorPremiacao || item.premiacao || item.pontuacao || "",
              destaque: item.destaque || "",
            })
          : linha({
              faixa: item.faixa || "",
              valorBase: item.valorBase || item.base || item.producao || "",
              valorPremiacao:
                item.valorPremiacao || item.premiacao || item.pontuacao || "",
            })
      );
    }
  } catch {
    // Continua para CSV/TXT.
  }

  const linhasTexto = texto
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!linhasTexto.length) return [];

  const separador = detectarSeparador(linhasTexto[0]);
  const tabela = linhasTexto.map((item) => dividirLinhaArquivo(item, separador));
  const primeira = tabela[0].map(normalizarCabecalho);
  const temCabecalho =
    primeira.some((item) => item.includes("faixa")) ||
    primeira.some((item) => item.includes("meta")) ||
    primeira.some((item) => item.includes("premi")) ||
    primeira.some((item) => item.includes("base")) ||
    primeira.some((item) => item.includes("destaque"));

  const cabecalhos = temCabecalho ? tabela[0] : [];
  const dados = temCabecalho ? tabela.slice(1) : tabela;

  const iFaixa = temCabecalho ? localizarColuna(cabecalhos, ["faixa"]) : 0;
  const iBase = temCabecalho
    ? localizarColuna(cabecalhos, ["valor base", "base", "producao", "produção"])
    : 1;
  const iPremiacao = temCabecalho
    ? localizarColuna(cabecalhos, ["premiacao", "premiação", "pontuacao", "pontuação", "comissao", "comissão"])
    : 2;
  const iMeta = temCabecalho
    ? localizarColuna(cabecalhos, ["meta", "parcelas", "averbada"])
    : 0;
  const iDestaque = temCabecalho ? localizarColuna(cabecalhos, ["destaque"]) : 2;

  return dados
    .map((colunas) => {
      if (tipo === "clt") {
        return linha({
          metaParcelasPagas: colunas[iMeta >= 0 ? iMeta : 0] || "",
          valorPremiacao: colunas[iPremiacao >= 0 ? iPremiacao : 1] || "",
          destaque: colunas[iDestaque >= 0 ? iDestaque : 2] || "",
        });
      }

      return linha({
        faixa: colunas[iFaixa >= 0 ? iFaixa : 0] || "",
        valorBase: colunas[iBase >= 0 ? iBase : 1] || "",
        valorPremiacao: colunas[iPremiacao >= 0 ? iPremiacao : 2] || "",
      });
    })
    .filter((item) =>
      tipo === "clt"
        ? item.metaParcelasPagas || item.valorPremiacao || item.destaque
        : item.faixa || item.valorBase || item.valorPremiacao
    );
}

export default function TabelasComissaoManager() {
  const [grupos, setGrupos] = useState<GrupoComissao[]>(modelosIniciais);
  const [filtro, setFiltro] = useState<"todas" | "coordenacao" | "supervisao" | "vendedoras">("todas");
  const [abaPorGrupo, setAbaPorGrupo] = useState<Record<string, string>>({
    "grupo-coordenacao": "coordenacao-compra-divida",
    "grupo-supervisao": "supervisao-compra-divida",
    "grupo-vendedoras": "comissao-3rn-clt",
  });
  const [editando, setEditando] = useState<{
    grupoId: string;
    tabelaId: string;
    linhaId: string;
  } | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [destinoImportacao, setDestinoImportacao] =
    useState<DestinoImportacao | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);

      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length) {
          setGrupos(parsed);
        }
      }
    } catch {
      setGrupos(modelosIniciais());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(grupos));
  }, [grupos]);

  const gruposFiltrados = useMemo(() => {
    if (filtro === "todas") return grupos;
    return grupos.filter((grupo) => grupo.tipoGrupo === filtro);
  }, [grupos, filtro]);

  function restaurarPadrao() {
    if (!window.confirm("Deseja restaurar os valores preenchidos com base nos prints enviados?")) {
      return;
    }

    localStorage.removeItem(CHAVE_STORAGE);
    setGrupos(modelosIniciais());
    setMensagem("Tabelas restauradas com os valores dos prints.");
  }

  function alterarCampo(
    grupoId: string,
    tabelaId: string,
    linhaId: string,
    campo: keyof LinhaComissao,
    valor: string
  ) {
    setGrupos((atuais) =>
      atuais.map((grupo) =>
        grupo.id !== grupoId
          ? grupo
          : {
              ...grupo,
              tabelas: grupo.tabelas.map((tabela) =>
                tabela.id !== tabelaId
                  ? tabela
                  : {
                      ...tabela,
                      linhas: tabela.linhas.map((linhaItem) =>
                        linhaItem.id === linhaId
                          ? { ...linhaItem, [campo]: valor }
                          : linhaItem
                      ),
                    }
              ),
            }
      )
    );
  }

  function adicionarLinha(grupoId: string, tabelaId: string) {
    setGrupos((atuais) =>
      atuais.map((grupo) =>
        grupo.id !== grupoId
          ? grupo
          : {
              ...grupo,
              tabelas: grupo.tabelas.map((tabela) =>
                tabela.id !== tabelaId
                  ? tabela
                  : {
                      ...tabela,
                      linhas: [...tabela.linhas, criarLinhaVazia(tabela.tipo)],
                    }
              ),
            }
      )
    );
    setMensagem("Nova faixa adicionada.");
  }

  function excluirLinha(grupoId: string, tabelaId: string, linhaId: string) {
    setGrupos((atuais) =>
      atuais.map((grupo) =>
        grupo.id !== grupoId
          ? grupo
          : {
              ...grupo,
              tabelas: grupo.tabelas.map((tabela) =>
                tabela.id !== tabelaId
                  ? tabela
                  : {
                      ...tabela,
                      linhas:
                        tabela.linhas.length > 1
                          ? tabela.linhas.filter((linhaItem) => linhaItem.id !== linhaId)
                          : tabela.linhas,
                    }
              ),
            }
      )
    );
  }

  function alternarEdicao(grupoId: string, tabelaId: string, linhaId: string) {
    const ativo =
      editando?.grupoId === grupoId &&
      editando?.tabelaId === tabelaId &&
      editando?.linhaId === linhaId;

    if (ativo) {
      setEditando(null);
      setMensagem("Linha salva com sucesso.");
      return;
    }

    setEditando({ grupoId, tabelaId, linhaId });
  }

  function estaEditando(grupoId: string, tabelaId: string, linhaId: string) {
    return (
      editando?.grupoId === grupoId &&
      editando?.tabelaId === tabelaId &&
      editando?.linhaId === linhaId
    );
  }

  function abrirImportacaoArquivo(grupoId: string, tabelaId: string, tipo: TipoTabela) {
    setDestinoImportacao({ grupoId, tabelaId, tipo });
    inputArquivoRef.current?.click();
  }

  async function importarArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";

    if (!arquivo || !destinoImportacao) return;

    const nome = arquivo.name.toLowerCase();

    if (nome.endsWith(".xlsx") || nome.endsWith(".xls") || nome.endsWith(".pdf")) {
      setMensagem("Para importar por arquivo nesta tela, use CSV, TXT ou JSON. Se estiver no Excel, salve como CSV.");
      return;
    }

    const conteudo = await arquivo.text();
    const linhasImportadas = converterArquivoEmLinhas(
      conteudo,
      destinoImportacao.tipo
    );

    if (!linhasImportadas.length) {
      setMensagem("Não encontrei linhas válidas no arquivo enviado.");
      return;
    }

    const substituir = window.confirm(
      "Deseja substituir a tabela atual pelo arquivo?\\n\\nOK = substituir tudo\\nCancelar = adicionar ao final"
    );

    setGrupos((atuais) =>
      atuais.map((grupo) =>
        grupo.id !== destinoImportacao.grupoId
          ? grupo
          : {
              ...grupo,
              tabelas: grupo.tabelas.map((tabela) =>
                tabela.id !== destinoImportacao.tabelaId
                  ? tabela
                  : {
                      ...tabela,
                      linhas: substituir
                        ? linhasImportadas
                        : [...tabela.linhas, ...linhasImportadas],
                    }
              ),
            }
      )
    );

    setMensagem(
      `${linhasImportadas.length} linha(s) importada(s) com sucesso.`
    );
  }

  function baixarModeloArquivo(tabela: TabelaComissao) {
    const cabecalho =
      tabela.tipo === "clt"
        ? "META PARCELAS PAGAS;VALOR PREMIAÇÃO;DESTAQUE\\n"
        : "FAIXA;VALOR BASE;VALOR PREMIAÇÃO\\n";

    const exemplo =
      tabela.tipo === "clt"
        ? "20.000;R$ 150,00;Meta retenção\\n"
        : "FAIXA 1;30 mil a R$ 39.999;400 Pontos\\n";

    const blob = new Blob([cabecalho + exemplo], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${tabela.id}-modelo.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderCelula(
    grupoId: string,
    tabela: TabelaComissao,
    linhaItem: LinhaComissao,
    campo: keyof LinhaComissao,
    placeholder: string
  ) {
    const ativo = estaEditando(grupoId, tabela.id, linhaItem.id);
    const primaria = campo === "faixa" || campo === "metaParcelasPagas";
    const destaque = campo === "valorPremiacao";
    const valor = String(linhaItem[campo] || "");

    if (!ativo) {
      return (
        <span
          style={{
            display: "inline-flex",
            minHeight: 34,
            alignItems: "center",
            color: "#08285a",
            fontSize: primaria ? 18 : destaque ? 17 : 14,
            fontWeight: primaria || destaque ? 950 : 800,
            lineHeight: 1.25,
          }}
        >
          {valor || "A preencher"}
        </span>
      );
    }

    return (
      <input
        value={valor}
        onChange={(evento) =>
          alterarCampo(grupoId, tabela.id, linhaItem.id, campo, evento.target.value)
        }
        placeholder={placeholder}
        style={{
          width: "100%",
          minHeight: 42,
          border: "1px solid #bfd0eb",
          borderRadius: 11,
          color: "#08285a",
          padding: "0 12px",
          fontSize: 14,
          fontWeight: 900,
        }}
      />
    );
  }

  const botaoEditar = {
    minHeight: 36,
    border: "1px solid #f0cb72",
    borderRadius: 10,
    background: "#fff7df",
    color: "#8a5b00",
    padding: "0 13px",
    fontSize: 12,
    fontWeight: 950,
    cursor: "pointer",
  } as const;

  const botaoSalvar = {
    ...botaoEditar,
    border: "1px solid #0e9f5b",
    background: "#e8f8ee",
    color: "#08783b",
  } as const;

  const botaoExcluir = {
    minHeight: 36,
    border: "1px solid #f1b9b7",
    borderRadius: 10,
    background: "#fff1f0",
    color: "#c93630",
    padding: "0 13px",
    fontSize: 12,
    fontWeight: 950,
    cursor: "pointer",
  } as const;

  const botaoAzul = {
    minHeight: 40,
    border: "1px solid #155eef",
    borderRadius: 11,
    background: "#155eef",
    color: "#ffffff",
    padding: "0 14px",
    fontSize: 12,
    fontWeight: 950,
    cursor: "pointer",
  } as const;

  const botaoSecundario = {
    ...botaoAzul,
    border: "1px solid #cfdbeb",
    background: "#ffffff",
    color: "#155eef",
  } as const;

  function renderTabela(grupo: GrupoComissao, tabela: TabelaComissao) {
    return (
      <div className="tc-table-box" key={tabela.id}>
        <header className="tc-table-title">
          <div>
            <h4>{tabela.titulo.toUpperCase()}</h4>
          </div>

          <div className="tc-table-actions">
            <button
              type="button"
              style={botaoSecundario}
              onClick={() => baixarModeloArquivo(tabela)}
            >
              Baixar modelo
            </button>
            <button
              type="button"
              style={botaoSecundario}
              onClick={() => abrirImportacaoArquivo(grupo.id, tabela.id, tabela.tipo)}
            >
              Importar arquivo
            </button>
            <button
              type="button"
              style={botaoAzul}
              onClick={() => adicionarLinha(grupo.id, tabela.id)}
            >
              + Adicionar faixa
            </button>
          </div>
        </header>

        <div className="tc-table-wrap">
          <table>
            <thead>
              <tr>
                {tabela.tipo === "clt" ? (
                  <>
                    <th>Meta parcelas pagas</th>
                    <th>Valor premiação</th>
                    <th>Destaque</th>
                    <th>Ação</th>
                  </>
                ) : (
                  <>
                    <th>Faixa</th>
                    <th>Valor base</th>
                    <th>Valor premiação</th>
                    <th>Ação</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {tabela.linhas.map((linhaItem, indice) => (
                <tr key={linhaItem.id} className={indice % 2 === 0 ? "zebra" : ""}>
                  {tabela.tipo === "clt" ? (
                    <>
                      <td>{renderCelula(grupo.id, tabela, linhaItem, "metaParcelasPagas", "Ex.: 20.000")}</td>
                      <td>{renderCelula(grupo.id, tabela, linhaItem, "valorPremiacao", "Ex.: R$ 300,00")}</td>
                      <td>{renderCelula(grupo.id, tabela, linhaItem, "destaque", "Ex.: Meta forte")}</td>
                    </>
                  ) : (
                    <>
                      <td>{renderCelula(grupo.id, tabela, linhaItem, "faixa", "Ex.: FAIXA 1")}</td>
                      <td>{renderCelula(grupo.id, tabela, linhaItem, "valorBase", "Ex.: 30 mil a R$ 39.999")}</td>
                      <td>{renderCelula(grupo.id, tabela, linhaItem, "valorPremiacao", "Ex.: 400 Pontos")}</td>
                    </>
                  )}

                  <td>
                    <div className="tc-row-actions">
                      <button
                        type="button"
                        style={
                          estaEditando(grupo.id, tabela.id, linhaItem.id)
                            ? botaoSalvar
                            : botaoEditar
                        }
                        onClick={() => alternarEdicao(grupo.id, tabela.id, linhaItem.id)}
                      >
                        {estaEditando(grupo.id, tabela.id, linhaItem.id)
                          ? "SALVAR"
                          : "EDITAR"}
                      </button>

                      <button
                        type="button"
                        style={botaoExcluir}
                        onClick={() => excluirLinha(grupo.id, tabela.id, linhaItem.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="tc-page">
      <input
        ref={inputArquivoRef}
        type="file"
        accept=".csv,.txt,.json"
        style={{ display: "none" }}
        onChange={importarArquivo}
      />

      <style jsx>{`
        .tc-page {
          display: grid;
          gap: 18px;
          color: #102d57;
        }

        .tc-hero,
        .tc-card {
          border: 1px solid #dce6f4;
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 12px 30px rgba(15, 42, 86, 0.055);
        }

        .tc-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 18px;
          padding: 28px 30px;
        }

        .tc-eyebrow,
        .tc-card-head span,
        .tc-table-title span {
          color: #155eef;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .tc-card-head span {
          font-size: 12px;
        }

        .tc-hero h2 {
          margin: 7px 0 6px;
          font-size: 33px;
          line-height: 1.08;
          letter-spacing: -0.045em;
        }

        .tc-hero p,
        .tc-card-head p {
          margin: 0;
          color: #64758d;
          font-size: 13px;
          line-height: 1.55;
        }

        .tc-actions,
        .tc-filter,
        .tc-tabs,
        .tc-row-actions,
        .tc-table-actions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .tc-actions {
          justify-content: flex-end;
        }

        .tc-filter {
          padding: 8px;
          border: 1px solid #dce6f4;
          border-radius: 16px;
          background: #f8fbff;
        }

        .tc-filter button,
        .tc-tabs button {
          min-height: 40px;
          border: 1px solid #d5e0ee;
          border-radius: 12px;
          background: #ffffff;
          color: #155eef;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .tc-filter button.active,
        .tc-tabs button.active {
          border-color: #155eef;
          background: #155eef;
          color: #ffffff;
          box-shadow: 0 8px 18px rgba(21, 94, 239, 0.14);
        }

        .tc-grid {
          display: grid;
          gap: 18px;
        }

        .tc-card {
          overflow: hidden;
        }

        .tc-card-head {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
          padding: 24px 26px;
          border-bottom: 1px solid #edf1f6;
        }

        .tc-card-head h3 {
          margin: 5px 0 6px;
          font-size: 30px;
          line-height: 1.1;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: -0.03em;
        }

        .tc-badge {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          border-radius: 999px;
          background: #eef4ff;
          color: #155eef;
          padding: 0 13px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .tc-tabs {
          padding: 14px 24px;
          border-bottom: 1px solid #edf1f6;
          background: #fbfdff;
        }

        .tc-card-body {
          display: grid;
          gap: 14px;
          padding: 20px 24px 26px;
        }

        .tc-table-box {
          border: 1px solid #dce6f4;
          border-radius: 18px;
          overflow: hidden;
          background: #fff;
        }

        .tc-table-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 20px 22px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border-bottom: 1px solid #edf1f6;
        }

        .tc-table-title h4 {
          margin: 0;
          font-size: 22px;
          line-height: 1.15;
          letter-spacing: -0.02em;
          font-weight: 950;
          text-transform: uppercase;
          color: #08285a;
        }

        .tc-table-actions {
          justify-content: flex-end;
        }

        .tc-table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 880px;
        }

        th {
          padding: 14px 16px;
          background: #eef3fb;
          color: #5b6a82;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.07em;
          text-align: left;
          text-transform: uppercase;
          border-bottom: 1px solid #dce6f4;
        }

        td {
          padding: 15px 16px;
          border-bottom: 1px solid #edf1f6;
          color: #102d57;
          font-size: 14px;
          font-weight: 850;
          vertical-align: middle;
        }

        tr.zebra td {
          background: #f8fbff;
        }

        tbody tr:hover td {
          background: #eef5ff;
        }

        .tc-row-actions {
          justify-content: flex-end;
          min-width: 170px;
        }

        .tc-message {
          border: 1px solid #cfe0ff;
          border-radius: 14px;
          background: #edf5ff;
          color: #164384;
          padding: 13px 15px;
          font-size: 13px;
          font-weight: 850;
        }

        @media (max-width: 900px) {
          .tc-hero,
          .tc-card-head,
          .tc-table-title {
            flex-direction: column;
            align-items: flex-start;
          }

          .tc-actions,
          .tc-table-actions {
            justify-content: flex-start;
          }
        }
      `}</style>

      <section className="tc-hero">
        <div>
          <span className="tc-eyebrow">Central de comissões</span>
          <h2>Tabelas Comissão</h2>
          <p>
            Configure as regras de comissão por cargo, produto, fornecedor e faixa
            de produção.
          </p>
        </div>

        <div className="tc-actions">
          <button type="button" style={botaoSecundario} onClick={restaurarPadrao}>
            Restaurar valores dos prints
          </button>
          <button
            type="button"
            style={botaoAzul}
            onClick={() => setMensagem("As tabelas ficam salvas automaticamente.")}
          >
            Salvar alterações
          </button>
        </div>
      </section>

      {mensagem && <div className="tc-message">{mensagem}</div>}

      <div className="tc-filter">
        <button
          type="button"
          className={filtro === "todas" ? "active" : ""}
          onClick={() => setFiltro("todas")}
        >
          Todas
        </button>
        <button
          type="button"
          className={filtro === "coordenacao" ? "active" : ""}
          onClick={() => setFiltro("coordenacao")}
        >
          Coordenação
        </button>
        <button
          type="button"
          className={filtro === "supervisao" ? "active" : ""}
          onClick={() => setFiltro("supervisao")}
        >
          Supervisão
        </button>
        <button
          type="button"
          className={filtro === "vendedoras" ? "active" : ""}
          onClick={() => setFiltro("vendedoras")}
        >
          Vendedoras
        </button>
      </div>

      <section className="tc-grid">
        {gruposFiltrados.map((grupo) => {
          const tabelaAtivaId = abaPorGrupo[grupo.id] || grupo.tabelas[0]?.id;
          const tabelaAtiva =
            grupo.tabelas.find((tabela) => tabela.id === tabelaAtivaId) ||
            grupo.tabelas[0];

          return (
            <article className="tc-card" key={grupo.id}>
              <header className="tc-card-head">
                <div>
                  <span>{grupo.tipoGrupo.toUpperCase()}</span>
                  <h3>{grupo.titulo}</h3>
                  <p>{grupo.subtitulo}</p>
                </div>

                <strong className="tc-badge">
                  {grupo.tabelas.length} tabela(s)
                </strong>
              </header>

              <nav className="tc-tabs">
                {grupo.tabelas.map((tabela) => (
                  <button
                    type="button"
                    key={tabela.id}
                    className={tabelaAtivaId === tabela.id ? "active" : ""}
                    onClick={() =>
                      setAbaPorGrupo((atual) => ({
                        ...atual,
                        [grupo.id]: tabela.id,
                      }))
                    }
                  >
                    {tabela.titulo.toUpperCase()}
                  </button>
                ))}
              </nav>

              <div className="tc-card-body">
                {tabelaAtiva && renderTabela(grupo, tabelaAtiva)}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
