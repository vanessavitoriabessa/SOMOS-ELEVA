export function normalizarPerfil(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function podeGerenciarLoja(perfil: string) {
  const texto = normalizarPerfil(perfil);

  return (
    texto.includes("administrador") ||
    texto.includes("administradora") ||
    texto.includes("coordenador") ||
    texto.includes("coordenadora")
  );
}

export function podeComprarNaLoja(perfil: string) {
  const texto = normalizarPerfil(perfil);

  return (
    texto.includes("consultor") ||
    texto.includes("consultora") ||
    texto.includes("vendedor") ||
    texto.includes("vendedora") ||
    texto.includes("operacional")
  );
}