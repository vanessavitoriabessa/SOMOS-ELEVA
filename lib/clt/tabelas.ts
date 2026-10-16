/** Metadados públicos para identificar tabelas CLT. Não inclui comissões. */
export type TabelaCltOpcao = {
  id: string;
  banco: string;
  nome: string;
  codigo: string;
  /** Campo legado: usado por tabelas antigas de prazo exato. */
  prazo: number | null;
  prazoInicial: number | null;
  prazoFinal: number | null;
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
  prazoInicial: number | null,
  prazoFinal: number | null,
  prazoContrato: unknown,
): boolean {
  const prazo = Number(prazoContrato);
  if (!Number.isInteger(prazo) || prazo <= 0) return false;

  // Sem faixa cadastrada = tabela sem restrição de prazo.
  if (prazoInicial === null && prazoFinal === null) return true;

  // Compatibilidade defensiva caso exista somente um dos limites em dado antigo.
  const inicio = prazoInicial ?? prazoFinal;
  const fim = prazoFinal ?? prazoInicial;
  if (inicio === null || fim === null) return true;

  return prazo >= inicio && prazo <= fim;
}

export function tabelaCltPublica(item: Record<string, unknown>): TabelaCltOpcao {
  const prazo = Number(item.prazo);
  const prazoLegado = Number.isInteger(prazo) && prazo > 0 ? prazo : null;

  const inicioNumero = Number(
    item.prazo_inicial ?? item.prazoInicial ?? prazoLegado,
  );
  const finalNumero = Number(
    item.prazo_final ?? item.prazoFinal ?? prazoLegado,
  );

  const prazoInicial =
    Number.isInteger(inicioNumero) && inicioNumero > 0 ? inicioNumero : null;
  const prazoFinal =
    Number.isInteger(finalNumero) && finalNumero > 0 ? finalNumero : null;

  return {
    id: String(item.id ?? ""),
    banco: String(item.banco ?? "").trim(),
    nome: String(item.nome ?? "").trim(),
    codigo: String(item.codigo ?? "").trim(),
    prazo: prazoLegado,
    prazoInicial,
    prazoFinal,
    orgaoConvenio: String(item.orgao_convenio ?? item.orgaoConvenio ?? ""),
    ativo: item.ativo === true,
  };
}

export function rotuloPrazoTabelaClt(tabela: Pick<TabelaCltOpcao, "prazo" | "prazoInicial" | "prazoFinal">): string {
  const inicio = tabela.prazoInicial ?? tabela.prazo;
  const fim = tabela.prazoFinal ?? tabela.prazo;

  if (inicio === null && fim === null) return "Prazo livre";
  if (inicio !== null && fim !== null && inicio === fim) return `${inicio} meses`;
  return `${inicio ?? fim} a ${fim ?? inicio} meses`;
}

export function rotuloTabelaClt(tabela: TabelaCltOpcao): string {
  return [
    tabela.nome || "Tabela sem nome",
    tabela.codigo ? `Código ${tabela.codigo}` : "",
    rotuloPrazoTabelaClt(tabela),
  ].filter(Boolean).join(" • ");
}
