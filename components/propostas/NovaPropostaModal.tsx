"use client";

import "./nova-proposta-modal.css";

type ClienteNovaProposta = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  consultora: string;
  banco: string;
};

type NovaPropostaModalProps = {
  cliente: ClienteNovaProposta;
  accessToken: string;
  onFechar: () => void;
  onCadastrada: () => void | Promise<void>;
};

export default function NovaPropostaModal({
  cliente,
  onFechar,
}: NovaPropostaModalProps) {
  return (
    <div
      className="nova-proposta-overlay"
      onClick={onFechar}
    >
      <section
        className="nova-proposta-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <header className="nova-proposta-cabecalho">
          <div>
            <span>NOVA PROPOSTA</span>
            <h2>{cliente.nome}</h2>
          </div>

          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="nova-proposta-conteudo">
          <p>
            O formulário da nova proposta será carregado aqui.
          </p>
        </div>
      </section>
    </div>
  );
}