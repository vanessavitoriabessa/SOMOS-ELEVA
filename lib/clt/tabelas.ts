/** Metadados públicos para identificar tabelas CLT. Não inclui comissões. */
export type TabelaCltOpcao = {
  id: string;
  banco: string;
  nome: string;
  codigo: string;
  prazo: number | null;
  orgaoConvenio: string;
  ativo: boolean;
};

export function normalizarBancoClt(valor: unknown): string {
  const chave = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^banco\s+/, "")
    .replace(/[^a-z0-9]/g, "");

  // São variantes de nome do MESMO banco; C6 nunca é tratado como 3RN.
  if (["c6", "c6bank", "c6parceiro3rn"].includes(chave)) return "c6";
  if (["3rn", "3rncapital"].includes(chave)) return "3rn";
  return chave;
}

export function bancosCltCorrespondem(a: unknown, b: unknown): boolean {
  const banco = normalizarBancoClt(a);
  return Boolean(banco) && banco === normalizarBancoClt(b);
}

export function ehTabelaClt(orgao: unknown): boolean {
  return String(orgao ?? "")
    .trim()
    .toUpperCase()
    .split(/[,;|/]+/)
    .some((parte) => parte.trim() === "CLT");
}

export function prazoTabelaCompativel(
  prazoTabela: number | null,
  prazoContrato: unknown,
): boolean {
  const prazo = Number(prazoContrato);
  if (!Number.isInteger(prazo) || prazo <= 0) return false;
  return prazoTabela === null || prazoTabela === prazo;
}

export function tabelaCltPublica(item: Record<string, unknown>): TabelaCltOpcao {
  const prazo = Number(item.prazo);
  return {
    id: String(item.id ?? ""),
    banco: String(item.banco ?? "").trim(),
    nome: String(item.nome ?? "").trim(),
    codigo: String(item.codigo ?? "").trim(),
    prazo: Number.isInteger(prazo) && prazo > 0 ? prazo : null,
    orgaoConvenio: String(item.orgao_convenio ?? item.orgaoConvenio ?? ""),
    ativo: item.ativo === true,
  };
}

export function rotuloTabelaClt(tabela: TabelaCltOpcao): string {
  return [
    tabela.nome || "Tabela sem nome",
    tabela.codigo ? `Código ${tabela.codigo}` : "",
    tabela.prazo ? `${tabela.prazo} meses` : "Prazo livre",
  ].filter(Boolean).join(" • ");
}