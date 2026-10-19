import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIXO = "eleva:v1";

function chaveCredenciais() {
  const segredo =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";

  if (!segredo) {
    throw new Error(
      "A chave de serviço do Supabase não está configurada para proteger as credenciais.",
    );
  }

  return createHash("sha256")
    .update(`somos-eleva-credenciais:v1:${segredo}`)
    .digest();
}

export function criptografarCredencial(valor: unknown) {
  const texto = String(valor ?? "");
  if (!texto) return "";

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", chaveCredenciais(), iv);
  const cifrado = Buffer.concat([
    cipher.update(texto, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    PREFIXO,
    iv.toString("base64url"),
    tag.toString("base64url"),
    cifrado.toString("base64url"),
  ].join(":");
}

export function descriptografarCredencial(valor: unknown) {
  const texto = String(valor ?? "");
  if (!texto) return "";

  // Compatibilidade com algum valor antigo que tenha sido salvo antes
  // da criptografia desta correção.
  if (!texto.startsWith(`${PREFIXO}:`)) return texto;

  try {
    const [, , ivBase64, tagBase64, cifradoBase64] = texto.split(":");
    if (!ivBase64 || !tagBase64 || !cifradoBase64) return "";

    const decipher = createDecipheriv(
      "aes-256-gcm",
      chaveCredenciais(),
      Buffer.from(ivBase64, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagBase64, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(cifradoBase64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}
