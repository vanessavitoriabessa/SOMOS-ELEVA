"use client";

import {
  ChangeEvent,
  DragEvent,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type UploadImagemPremioProps = {
  nomePremio: string;
  imagemUrl: string;
  onChange: (novaUrl: string) => void;
  onErro?: (mensagem: string) => void;
  onSucesso?: (mensagem: string) => void;
};

const STORAGE_BUCKET = "premios-loja";

function nomeArquivoSeguro(valor: string) {
  return String(valor || "premio")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function UploadImagemPremio({
  nomePremio,
  imagemUrl,
  onChange,
  onErro,
  onSucesso,
}: UploadImagemPremioProps) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  async function enviarImagem(arquivo: File) {
    onErro?.("");

    if (!arquivo.type.startsWith("image/")) {
      onErro?.("Escolha um arquivo de imagem.");
      return;
    }

    if (arquivo.size > 8 * 1024 * 1024) {
      onErro?.("A imagem deve ter no máximo 8 MB.");
      return;
    }

    setEnviando(true);

    try {
      const extensao =
        arquivo.name.split(".").pop()?.toLowerCase() || "jpg";

      const nomeBase =
        nomeArquivoSeguro(nomePremio || arquivo.name) || "premio";

      const caminho = `${Date.now()}-${nomeBase}.${extensao}`;

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(caminho, arquivo, {
          cacheControl: "3600",
          upsert: false,
          contentType: arquivo.type,
        });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(caminho);

      onChange(data.publicUrl);
      onSucesso?.("Imagem enviada com sucesso.");
    } catch (error) {
      console.error(error);

      onErro?.(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a imagem."
      );
    } finally {
      setEnviando(false);
      setArrastando(false);
    }
  }

  function escolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];

    if (arquivo) {
      void enviarImagem(arquivo);
    }

    evento.target.value = "";
  }

  function soltarArquivo(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setArrastando(false);

    const arquivo = evento.dataTransfer.files?.[0];

    if (arquivo) {
      void enviarImagem(arquivo);
    }
  }

  return (
    <div className="upload-premio-bloco">
      <span className="upload-premio-titulo">
        Imagem do prêmio
      </span>

      <div
        className={`upload-premio-area ${
          arrastando ? "arrastando" : ""
        }`}
        onDragOver={(evento) => {
          evento.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltarArquivo}
      >
        {imagemUrl ? (
          <div className="upload-premio-preview">
            <div className="upload-premio-imagem">
              <img
                src={imagemUrl}
                alt="Pré-visualização do prêmio"
              />
            </div>

            <div className="upload-premio-acoes">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={enviando}
              >
                {enviando ? "Enviando..." : "Trocar imagem"}
              </button>

              <button
                type="button"
                className="remover"
                onClick={() => onChange("")}
                disabled={enviando}
              >
                Remover imagem
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="upload-premio-vazio"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
          >
            <strong>
              {enviando
                ? "Enviando imagem..."
                : "Clique para escolher uma imagem"}
            </strong>

            <span>
              ou arraste o arquivo para esta área
            </span>

            <small>
              JPG, PNG ou WEBP — até 8 MB
            </small>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/webp"
          onChange={escolherArquivo}
        />
      </div>
    </div>
  );
}