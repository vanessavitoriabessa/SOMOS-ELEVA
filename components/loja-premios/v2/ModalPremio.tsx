"use client";

import { FormEvent } from "react";
import UploadImagemPremio from "./UploadImagemPremio";
import type { FormPremio } from "./tipos";

type ModalPremioProps = {
  aberto: boolean;
  formulario: FormPremio;
  salvando: boolean;
  erro: string;
  mensagem: string;
  onChange: (novoFormulario: FormPremio) => void;
  onFechar: () => void;
  onSalvar: (evento: FormEvent<HTMLFormElement>) => void;
};

export default function ModalPremio({
  aberto,
  formulario,
  salvando,
  erro,
  mensagem,
  onChange,
  onFechar,
  onSalvar,
}: ModalPremioProps) {
  if (!aberto) return null;

  function alterarCampo<K extends keyof FormPremio>(
    campo: K,
    valor: FormPremio[K]
  ) {
    onChange({
      ...formulario,
      [campo]: valor,
    });
  }

  return (
    <div className="modal-premio-fundo">
      <form className="modal-premio" onSubmit={onSalvar}>
        <div className="modal-premio-topo">
          <div>
            <span>ADMINISTRAÇÃO DA LOJA</span>

            <h3>
              {formulario.id
                ? "Editar prêmio"
                : "Cadastrar prêmio"}
            </h3>
          </div>

          <button
            type="button"
            className="modal-premio-fechar"
            onClick={onFechar}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {erro && (
          <div className="modal-premio-alerta erro">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="modal-premio-alerta sucesso">
            {mensagem}
          </div>
        )}

        <UploadImagemPremio
          nomePremio={formulario.nome}
          imagemUrl={formulario.imagem_url}
          onChange={(novaUrl) =>
            alterarCampo("imagem_url", novaUrl)
          }
        />

        <div className="modal-premio-grid">
          <label>
            Nome do prêmio

            <input
              required
              value={formulario.nome}
              onChange={(evento) =>
                alterarCampo("nome", evento.target.value)
              }
            />
          </label>

          <label>
            Categoria

            <input
              required
              value={formulario.categoria}
              onChange={(evento) =>
                alterarCampo("categoria", evento.target.value)
              }
            />
          </label>

          <label className="campo-largo">
            Descrição

            <textarea
              value={formulario.descricao}
              onChange={(evento) =>
                alterarCampo("descricao", evento.target.value)
              }
            />
          </label>

          <label>
            Pontos necessários

            <input
              type="number"
              min="0"
              required
              value={formulario.pontos}
              onChange={(evento) =>
                alterarCampo("pontos", evento.target.value)
              }
            />
          </label>

          <label>
            Estoque

            <input
              type="number"
              min="0"
              required
              value={formulario.estoque}
              onChange={(evento) =>
                alterarCampo("estoque", evento.target.value)
              }
            />
          </label>

          <label>
            Ordem de exibição

            <input
              type="number"
              value={formulario.ordem}
              onChange={(evento) =>
                alterarCampo("ordem", evento.target.value)
              }
            />
          </label>

          <div className="modal-premio-checks">
            <label>
              <input
                type="checkbox"
                checked={formulario.ativo}
                onChange={(evento) =>
                  alterarCampo("ativo", evento.target.checked)
                }
              />

              Prêmio ativo
            </label>

            <label>
              <input
                type="checkbox"
                checked={formulario.destaque}
                onChange={(evento) =>
                  alterarCampo(
                    "destaque",
                    evento.target.checked
                  )
                }
              />

              Mostrar como destaque
            </label>
          </div>
        </div>

        <div className="modal-premio-acoes">
          <button
            type="button"
            className="cancelar"
            onClick={onFechar}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="salvar"
            disabled={
              salvando || !formulario.imagem_url
            }
          >
            {salvando ? "Salvando..." : "Salvar prêmio"}
          </button>
        </div>
      </form>
    </div>
  );
}