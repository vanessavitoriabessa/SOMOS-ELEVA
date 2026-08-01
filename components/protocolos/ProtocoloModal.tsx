"use client";

import { FormEvent, useState } from "react";
import type {
  Protocolo,
  StatusProtocolo,
} from "./types";

type Props = {
  protocolo: Protocolo | null;
  onFechar: () => void;
  onSalvar: (protocolo: Protocolo) => void;
};

const statusDisponiveis: StatusProtocolo[] = [
  "Protocolo cadastrado",
  "Aguardando boleto",
  "Aguardando liberação de margem",
  "Boleto recebido",
  "Proposta digitada",
  "Pago",
  "Desaverbação de margem",
  "Cancelado da compra",
  "Cancelado",
  "Finalizado",
];

const vazio: Protocolo = {
  id: "",
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
  numeroProtocolo: "",
  dataLigacao: "",
  dataLimite: "",
  matricula: "",
  senhaPortal: "",
  governo: "",
  status: "Protocolo cadastrado",
  vendedor: "",
  margem: 0,
  ligouBancoHoje: false,
};

export default function ProtocoloModal({
  protocolo,
  onFechar,
  onSalvar,
}: Props) {
  const [form, setForm] = useState<Protocolo>(
    protocolo || vazio
  );

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    onSalvar({
      ...form,
      id: form.id || crypto.randomUUID(),
      margem: Number(form.margem || 0),
    });
  }

  return (
    <div className="protocolo-modal-backdrop" onMouseDown={onFechar}>
      <form
        className="protocolo-modal"
        onSubmit={enviar}
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <header>
          <div>
            <span>
              {protocolo ? "EDITAR PROTOCOLO" : "NOVO PROTOCOLO"}
            </span>
            <h2>
              {protocolo
                ? "Atualizar acompanhamento"
                : "Cadastrar protocolo"}
            </h2>
          </div>

          <button type="button" onClick={onFechar}>
            ×
          </button>
        </header>

        <div className="protocolo-form-grid">
          <label>
            Nome
            <input
              required
              value={form.nome}
              onChange={(evento) =>
                setForm({ ...form, nome: evento.target.value })
              }
            />
          </label>

          <label>
            CPF
            <input
              required
              value={form.cpf}
              onChange={(evento) =>
                setForm({ ...form, cpf: evento.target.value })
              }
            />
          </label>

          <label>
            Telefone
            <input
              value={form.telefone}
              onChange={(evento) =>
                setForm({
                  ...form,
                  telefone: evento.target.value,
                })
              }
            />
          </label>

          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(evento) =>
                setForm({ ...form, email: evento.target.value })
              }
            />
          </label>

          <label>
            Protocolo
            <input
              value={form.numeroProtocolo}
              onChange={(evento) =>
                setForm({
                  ...form,
                  numeroProtocolo: evento.target.value,
                })
              }
            />
          </label>

          <label>
            Data da ligação
            <input
              type="date"
              value={form.dataLigacao}
              onChange={(evento) =>
                setForm({
                  ...form,
                  dataLigacao: evento.target.value,
                })
              }
            />
          </label>

          <label>
            Data de 15 dias
            <input
              type="date"
              value={form.dataLimite}
              onChange={(evento) =>
                setForm({
                  ...form,
                  dataLimite: evento.target.value,
                })
              }
            />
          </label>

          <label>
            Matrícula
            <input
              value={form.matricula}
              onChange={(evento) =>
                setForm({
                  ...form,
                  matricula: evento.target.value,
                })
              }
            />
          </label>

          <label>
            Senha do portal
            <input
              value={form.senhaPortal}
              onChange={(evento) =>
                setForm({
                  ...form,
                  senhaPortal: evento.target.value,
                })
              }
            />
          </label>

          <label>
            Governo
            <input
              value={form.governo}
              onChange={(evento) =>
                setForm({
                  ...form,
                  governo: evento.target.value,
                })
              }
            />
          </label>

          <label>
            Status
            <select
              value={form.status}
              onChange={(evento) =>
                setForm({
                  ...form,
                  status: evento.target.value as StatusProtocolo,
                })
              }
            >
              {statusDisponiveis.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>

          <label>
            Vendedora
            <input
              value={form.vendedor}
              onChange={(evento) =>
                setForm({
                  ...form,
                  vendedor: evento.target.value,
                })
              }
            />
          </label>

          <label>
            Margem
            <input
              type="number"
              step="0.01"
              value={form.margem}
              onChange={(evento) =>
                setForm({
                  ...form,
                  margem: Number(evento.target.value),
                })
              }
            />
          </label>

          <label className="protocolo-checkbox">
            <input
              type="checkbox"
              checked={form.ligouBancoHoje}
              onChange={(evento) =>
                setForm({
                  ...form,
                  ligouBancoHoje: evento.target.checked,
                })
              }
            />
            Ligou para o banco hoje?
          </label>
        </div>

        <footer>
          <button
            type="button"
            className="cancelar"
            onClick={onFechar}
          >
            Cancelar
          </button>

          <button type="submit" className="salvar">
            Salvar protocolo
          </button>
        </footer>
      </form>
    </div>
  );
}