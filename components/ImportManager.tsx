"use client";

import { ChangeEvent, useMemo, useState } from "react";
import "./dados-importados.css";

type LinhaImportada = Record<string, string>;

type Cliente = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  cidade: string;
  estado: string;
  banco: string;
  produto: string;
  consultora: string;
  status: string;
  observacoes: string;
  criadoEm: string;
  atualizadoEm: string;
};

type Proposta = {
  id: string;
  cliente: string;
  cpf: string;
  telefone: string;
  vendedora: string;
  banco: string;
  tabela: string;
  valorContrato: number;
  percentualTabela: number;
  comissao: number;
  status: string;
  dataCadastro: string;
  dataPagamento: string;
  observacao: string;
};

function normalizarTexto(valor: string) {
  return (valor || "").trim();
}

function apenasNumeros(valor: string) {
  return (valor || "").replace(/\D/g, "");
}

function numero(valor: string) {
  const limpo = (valor || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const convertido = Number(limpo);
  return Number.isFinite(convertido) ? convertido : 0;
}

function detectarSeparador(texto: string) {
  const primeiraLinha = texto.split(/\r?\n/)[0] || "";
  const contagem = {
    ";": (primeiraLinha.match(/;/g) || []).length,
    ",": (primeiraLinha.match(/,/g) || []).length,
    "\t": (primeiraLinha.match(/\t/g) || []).length,
  };

  return Object.entries(contagem).sort((a, b) => b[1] - a[1])[0][0];
}

function quebrarLinha(linha: string, separador: string) {
  const resultado: string[] = [];
  let atual = "";
  let emAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const caractere = linha[i];

    if (caractere === '"') {
      if (emAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        emAspas = !emAspas;
      }
      continue;
    }

    if (caractere === separador && !emAspas) {
      resultado.push(atual.trim());
      atual = "";
      continue;
    }

    atual += caractere;
  }

  resultado.push(atual.trim());
  return resultado;
}

function parsearCsv(texto: string) {
  const separador = detectarSeparador(texto);
  const linhas = texto
    .split(/\r?\n/)
    .filter((linha) => linha.trim().length > 0);

  if (linhas.length < 2) return [];

  const cabecalhos = quebrarLinha(linhas[0], separador).map((item) =>
    item
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
  );

  return linhas.slice(1).map((linha) => {
    const valores = quebrarLinha(linha, separador);
    const registro: LinhaImportada = {};

    cabecalhos.forEach((cabecalho, indice) => {
      registro[cabecalho] = valores[indice] || "";
    });

    return registro;
  });
}

function buscarCampo(linha: LinhaImportada, opcoes: string[]) {
  for (const opcao of opcoes) {
    if (linha[opcao] !== undefined) return linha[opcao];
  }
  return "";
}

export default function ImportManager() {
  const [arquivoNome, setArquivoNome] = useState("");
  const [linhas, setLinhas] = useState<LinhaImportada[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [destino, setDestino] = useState<"Clientes" | "Propostas">("Clientes");

  const colunas = useMemo(
    () => (linhas.length ? Object.keys(linhas[0]) : []),
    [linhas]
  );

  async function selecionarArquivo(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    setMensagem("");

    if (!arquivo) return;

    if (!arquivo.name.toLowerCase().endsWith(".csv")) {
      setMensagem("Nesta primeira versão, envie um arquivo CSV.");
      event.target.value = "";
      return;
    }

    const texto = await arquivo.text();
    const dados = parsearCsv(texto);

    if (!dados.length) {
      setMensagem("Não foi possível encontrar linhas válidas no arquivo.");
      return;
    }

    setArquivoNome(arquivo.name);
    setLinhas(dados);
    setMensagem(`${dados.length} linha(s) carregada(s) para conferência.`);
  }

  function limpar() {
    setArquivoNome("");
    setLinhas([]);
    setMensagem("");
  }

  function importarClientes() {
    const existentes: Cliente[] = JSON.parse(
      localStorage.getItem("somos-eleva-clientes") || "[]"
    );

    const cpfsExistentes = new Set(
      existentes.map((item) => apenasNumeros(item.cpf)).filter(Boolean)
    );

    let adicionados = 0;
    let ignorados = 0;

    const novos: Cliente[] = [];

    linhas.forEach((linha) => {
      const nome = normalizarTexto(
        buscarCampo(linha, ["nome", "cliente", "nome_completo"])
      );
      const cpf = apenasNumeros(
        buscarCampo(linha, ["cpf", "documento"])
      );

      if (!nome || (cpf && cpfsExistentes.has(cpf))) {
        ignorados++;
        return;
      }

      if (cpf) cpfsExistentes.add(cpf);

      novos.push({
        id: crypto.randomUUID(),
        nome,
        cpf,
        telefone: apenasNumeros(
          buscarCampo(linha, ["telefone", "celular", "whatsapp"])
        ),
        email: normalizarTexto(buscarCampo(linha, ["email", "e_mail"])),
        cidade: normalizarTexto(buscarCampo(linha, ["cidade"])),
        estado: normalizarTexto(buscarCampo(linha, ["estado", "uf"])).toUpperCase(),
        banco: normalizarTexto(buscarCampo(linha, ["banco"])),
        produto:
          normalizarTexto(buscarCampo(linha, ["produto"])) || "Compra de Dívida",
        consultora: normalizarTexto(
          buscarCampo(linha, ["consultora", "vendedora", "responsavel"])
        ),
        status: normalizarTexto(buscarCampo(linha, ["status"])) || "Ativo",
        observacoes: normalizarTexto(
          buscarCampo(linha, ["observacoes", "observacao"])
        ),
        criadoEm: new Date().toLocaleString("pt-BR"),
        atualizadoEm: new Date().toLocaleString("pt-BR"),
      });

      adicionados++;
    });

    localStorage.setItem(
      "somos-eleva-clientes",
      JSON.stringify([...novos, ...existentes])
    );

    setMensagem(
      `${adicionados} cliente(s) importado(s). ${ignorados} linha(s) ignorada(s).`
    );
  }

  function importarPropostas() {
    const existentes: Proposta[] = JSON.parse(
      localStorage.getItem("somos-eleva-propostas") || "[]"
    );

    let adicionados = 0;
    let ignorados = 0;

    const novas: Proposta[] = [];

    linhas.forEach((linha) => {
      const cliente = normalizarTexto(
        buscarCampo(linha, ["cliente", "nome", "nome_completo"])
      );
      const valorContrato = numero(
        buscarCampo(linha, [
          "valor_contrato",
          "valor_do_contrato",
          "valor",
          "valor_total",
        ])
      );

      if (!cliente || valorContrato <= 0) {
        ignorados++;
        return;
      }

      const percentual = numero(
        buscarCampo(linha, [
          "percentual",
          "percentual_tabela",
          "porcentagem",
        ])
      );

      const status =
        normalizarTexto(buscarCampo(linha, ["status"])) || "Solicitado";

      novas.push({
        id: crypto.randomUUID(),
        cliente,
        cpf: apenasNumeros(buscarCampo(linha, ["cpf", "documento"])),
        telefone: apenasNumeros(
          buscarCampo(linha, ["telefone", "celular", "whatsapp"])
        ),
        vendedora: normalizarTexto(
          buscarCampo(linha, ["vendedora", "consultora", "responsavel"])
        ),
        banco: normalizarTexto(buscarCampo(linha, ["banco"])),
        tabela: normalizarTexto(buscarCampo(linha, ["tabela"])),
        valorContrato,
        percentualTabela: percentual,
        comissao:
          status.toLowerCase() === "pago"
            ? valorContrato * (percentual / 100)
            : 0,
        status,
        dataCadastro:
          normalizarTexto(
            buscarCampo(linha, ["data_cadastro", "data", "criado_em"])
          ) || new Date().toLocaleString("pt-BR"),
        dataPagamento:
          normalizarTexto(
            buscarCampo(linha, ["data_pagamento", "pago_em"])
          ) || "",
        observacao: normalizarTexto(
          buscarCampo(linha, ["observacao", "observacoes"])
        ),
      });

      adicionados++;
    });

    localStorage.setItem(
      "somos-eleva-propostas",
      JSON.stringify([...novas, ...existentes])
    );

    setMensagem(
      `${adicionados} proposta(s) importada(s). ${ignorados} linha(s) ignorada(s).`
    );
  }

  function confirmarImportacao() {
    if (!linhas.length) {
      setMensagem("Selecione um arquivo antes de importar.");
      return;
    }

    if (destino === "Clientes") {
      importarClientes();
    } else {
      importarPropostas();
    }
  }

  return (
    <div className="import-page">
      <section className="import-summary">
        <article>
          <span>Arquivo selecionado</span>
          <strong>{arquivoNome || "Nenhum"}</strong>
        </article>
        <article>
          <span>Linhas encontradas</span>
          <strong>{linhas.length}</strong>
        </article>
        <article>
          <span>Colunas encontradas</span>
          <strong>{colunas.length}</strong>
        </article>
        <article className="import-highlight">
          <span>Destino</span>
          <strong>{destino}</strong>
        </article>
      </section>

      <section className="import-card">
        <div className="import-heading">
          <div>
            <span>IMPORTAÇÃO DE PLANILHA</span>
            <h2>Enviar arquivo CSV</h2>
            <p>
              Carregue a planilha, confira a prévia e escolha para onde os dados
              serão enviados.
            </p>
          </div>
          <b>⇩</b>
        </div>

        <div className="import-controls">
          <label className="file-box">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={selecionarArquivo}
            />
            <span>Selecionar arquivo CSV</span>
            <small>{arquivoNome || "Nenhum arquivo escolhido"}</small>
          </label>

          <label>
            Importar para
            <select
              value={destino}
              onChange={(event) =>
                setDestino(event.target.value as "Clientes" | "Propostas")
              }
            >
              <option>Clientes</option>
              <option>Propostas</option>
            </select>
          </label>

          <button className="import-button" onClick={confirmarImportacao}>
            Confirmar importação
          </button>

          <button className="clear-button" onClick={limpar}>
            Limpar
          </button>
        </div>

        {mensagem && <div className="import-message">{mensagem}</div>}
      </section>

      <section className="import-card">
        <div className="import-list-heading">
          <div>
            <span>PRÉVIA DOS DADOS</span>
            <h2>Conferência antes de importar</h2>
          </div>
          <b>{Math.min(linhas.length, 20)}</b>
        </div>

        {!linhas.length ? (
          <div className="import-empty">
            <div>▤</div>
            <strong>Nenhum arquivo carregado</strong>
            <p>Selecione um CSV para visualizar as primeiras linhas.</p>
          </div>
        ) : (
          <div className="import-table-wrap">
            <table className="import-table">
              <thead>
                <tr>
                  {colunas.map((coluna) => (
                    <th key={coluna}>{coluna.replace(/_/g, " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.slice(0, 20).map((linha, indice) => (
                  <tr key={indice}>
                    {colunas.map((coluna) => (
                      <td key={coluna}>{linha[coluna] || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="import-card import-instructions">
        <div>
          <span>COLUNAS ACEITAS PARA CLIENTES</span>
          <p>
            nome, cpf, telefone, email, cidade, estado ou uf, banco, produto,
            consultora ou vendedora, status e observações.
          </p>
        </div>

        <div>
          <span>COLUNAS ACEITAS PARA PROPOSTAS</span>
          <p>
            cliente, cpf, telefone, vendedora, banco, tabela, valor_contrato,
            percentual, status, data_pagamento e observação.
          </p>
        </div>
      </section>

      <section className="import-warning">
        <strong>Importante:</strong>
        <span>
          salve sua planilha do Excel no formato CSV antes de enviar. Esta versão
          importa até milhares de linhas, mas exibe somente as primeiras 20 na
          prévia.
        </span>
      </section>
    </div>
  );
}
