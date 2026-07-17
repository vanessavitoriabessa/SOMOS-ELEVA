"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import "./clt.css";

type StatusClt =
  | "Novo lead"
  | "Em análise"
  | "Aguardando documentos"
  | "Digitado"
  | "Aprovado"
  | "Pago"
  | "Recusado";

type RegistroClt = {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  valorAprovado: number;
  parcela: number;
  banco: string;
  consultora: string;
  status: StatusClt;
  criadoEm: string;
  atualizadoEm: string;
};

type FormularioClt = {
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  valorAprovado: string;
  parcela: string;
  banco: string;
  consultora: string;
  status: StatusClt;
};

const STATUS: StatusClt[] = [
  "Novo lead",
  "Em análise",
  "Aguardando documentos",
  "Digitado",
  "Aprovado",
  "Pago",
  "Recusado",
];

function formularioVazio(): FormularioClt {
  return {
    nome: "",
    cpf: "",
    dataNascimento: "",
    telefone: "",
    valorAprovado: "",
    parcela: "",
    banco: "",
    consultora: "",
    status: "Novo lead",
  };
}

function apenasNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarCpf(valor: string) {
  const digitos = apenasNumeros(valor).slice(
    0,
    11
  );

  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(
      /^(\d{3})\.(\d{3})(\d)/,
      "$1.$2.$3"
    )
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatarTelefone(valor: string) {
  const digitos = apenasNumeros(valor).slice(
    0,
    11
  );

  if (digitos.length <= 10) {
    return digitos
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digitos
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function numero(valor: string) {
  const limpo = valor
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const convertido = Number(limpo);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function formatarData(data: string) {
  if (!data) {
    return "Não informada";
  }

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function normalizarRegistro(
  item: Partial<RegistroClt> &
    Record<string, unknown>
): RegistroClt {
  return {
    id: String(
      item.id || crypto.randomUUID()
    ),
    nome: String(item.nome || ""),
    cpf: apenasNumeros(
      String(item.cpf || "")
    ),
    dataNascimento: String(
      item.dataNascimento ||
        item.nascimento ||
        ""
    ),
    telefone: apenasNumeros(
      String(item.telefone || "")
    ),
    valorAprovado: Number(
      item.valorAprovado || 0
    ),
    parcela: Number(item.parcela || 0),
    banco: String(item.banco || ""),
    consultora: String(
      item.consultora || ""
    ),
    status: STATUS.includes(
      item.status as StatusClt
    )
      ? (item.status as StatusClt)
      : "Novo lead",
    criadoEm: String(item.criadoEm || ""),
    atualizadoEm: String(
      item.atualizadoEm || ""
    ),
  };
}

export default function CltManager() {
  const [registros, setRegistros] =
    useState<RegistroClt[]>([]);

  const [form, setForm] =
    useState<FormularioClt>(
      formularioVazio()
    );

  const [busca, setBusca] = useState("");

  const [filtroStatus, setFiltroStatus] =
    useState("Todos");

  const [editandoId, setEditandoId] =
    useState<string | null>(null);

  const [mensagem, setMensagem] =
    useState("");

  useEffect(() => {
    try {
      const salvos = JSON.parse(
        localStorage.getItem(
          "somos-eleva-clt"
        ) || "[]"
      );

      const listaNormalizada =
        Array.isArray(salvos)
          ? salvos.map(normalizarRegistro)
          : [];

      setRegistros(listaNormalizada);

      localStorage.setItem(
        "somos-eleva-clt",
        JSON.stringify(listaNormalizada)
      );
    } catch {
      setRegistros([]);
    }
  }, []);

  function persistir(
    lista: RegistroClt[]
  ) {
    setRegistros(lista);

    localStorage.setItem(
      "somos-eleva-clt",
      JSON.stringify(lista)
    );
  }

  const filtrados = useMemo(() => {
    const termo = busca
      .trim()
      .toLowerCase();

    const numerico =
      apenasNumeros(busca);

    return registros.filter((item) => {
      const statusOk =
        filtroStatus === "Todos" ||
        item.status === filtroStatus;

      const buscaOk =
        !termo ||
        item.nome
          .toLowerCase()
          .includes(termo) ||
        item.cpf.includes(numerico) ||
        item.telefone.includes(
          numerico
        ) ||
        item.consultora
          .toLowerCase()
          .includes(termo) ||
        item.banco
          .toLowerCase()
          .includes(termo);

      return statusOk && buscaOk;
    });
  }, [
    registros,
    busca,
    filtroStatus,
  ]);

  const resumo = useMemo(
    () => ({
      total: registros.length,
      analise: registros.filter(
        (item) =>
          item.status === "Em análise"
      ).length,
      aprovados: registros.filter(
        (item) =>
          item.status === "Aprovado"
      ).length,
      pagos: registros.filter(
        (item) => item.status === "Pago"
      ).length,
      valorPago: registros
        .filter(
          (item) =>
            item.status === "Pago"
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.valorAprovado || 0
            ),
          0
        ),
    }),
    [registros]
  );

  function salvar(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMensagem("");

    if (!form.nome.trim()) {
      setMensagem(
        "Informe o nome completo."
      );
      return;
    }

    const cpf =
      apenasNumeros(form.cpf);

    if (cpf.length !== 11) {
      setMensagem(
        "O CPF precisa ter 11 números."
      );
      return;
    }

    if (!form.dataNascimento) {
      setMensagem(
        "Informe a data de nascimento."
      );
      return;
    }

    const telefone =
      apenasNumeros(form.telefone);

    if (
      telefone.length < 10 ||
      telefone.length > 11
    ) {
      setMensagem(
        "Informe um número de telefone válido."
      );
      return;
    }

    const valorAprovado = numero(
      form.valorAprovado
    );

    if (valorAprovado <= 0) {
      setMensagem(
        "Informe o valor aprovado."
      );
      return;
    }

    const parcela = numero(form.parcela);

    if (parcela <= 0) {
      setMensagem(
        "Informe o valor da parcela."
      );
      return;
    }

    if (!form.banco.trim()) {
      setMensagem("Informe o banco.");
      return;
    }

    if (!form.consultora.trim()) {
      setMensagem(
        "Informe a consultora."
      );
      return;
    }

    const duplicado = registros.some(
      (item) =>
        item.id !== editandoId &&
        item.cpf === cpf
    );

    if (duplicado) {
      setMensagem(
        "Já existe um registro CLT com esse CPF."
      );
      return;
    }

    const agora =
      new Date().toLocaleString(
        "pt-BR"
      );

    const antigo = registros.find(
      (item) =>
        item.id === editandoId
    );

    const registro: RegistroClt = {
      id:
        editandoId ||
        crypto.randomUUID(),
      nome: form.nome.trim(),
      cpf,
      dataNascimento:
        form.dataNascimento,
      telefone,
      valorAprovado,
      parcela,
      banco: form.banco.trim(),
      consultora:
        form.consultora.trim(),
      status: form.status,
      criadoEm:
        antigo?.criadoEm || agora,
      atualizadoEm: agora,
    };

    const lista = editandoId
      ? registros.map((item) =>
          item.id === editandoId
            ? registro
            : item
        )
      : [registro, ...registros];

    const estavaEditando =
      Boolean(editandoId);

    persistir(lista);
    setForm(formularioVazio());
    setEditandoId(null);

    setMensagem(
      estavaEditando
        ? "Registro atualizado com sucesso."
        : "Cliente CLT cadastrado com sucesso."
    );
  }

  function editar(item: RegistroClt) {
    setEditandoId(item.id);

    setForm({
      nome: item.nome,
      cpf: formatarCpf(item.cpf),
      dataNascimento:
        item.dataNascimento || "",
      telefone: formatarTelefone(
        item.telefone
      ),
      valorAprovado:
        item.valorAprovado
          ? item.valorAprovado
              .toFixed(2)
              .replace(".", ",")
          : "",
      parcela: item.parcela
        ? item.parcela
            .toFixed(2)
            .replace(".", ",")
        : "",
      banco: item.banco,
      consultora: item.consultora,
      status: item.status,
    });

    setMensagem(
      "Editando registro selecionado."
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function excluir(id: string) {
    if (
      !window.confirm(
        "Deseja excluir este registro CLT?"
      )
    ) {
      return;
    }

    persistir(
      registros.filter(
        (item) => item.id !== id
      )
    );

    if (editandoId === id) {
      setEditandoId(null);
      setForm(formularioVazio());
      setMensagem("");
    }
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(formularioVazio());
    setMensagem("");
  }

  return (
    <div className="clt-page">
      <section className="clt-summary">
        <article>
          <span>Total de registros</span>
          <strong>{resumo.total}</strong>
        </article>

        <article>
          <span>Em análise</span>
          <strong>
            {resumo.analise}
          </strong>
        </article>

        <article>
          <span>Aprovados</span>
          <strong>
            {resumo.aprovados}
          </strong>
        </article>

        <article>
          <span>Pagos</span>
          <strong>{resumo.pagos}</strong>
        </article>

        <article className="clt-highlight">
          <span>Valor pago</span>
          <strong>
            {moeda(resumo.valorPago)}
          </strong>
        </article>
      </section>

      <section className="clt-layout">
        <form
          className="clt-card"
          onSubmit={salvar}
        >
          <div className="clt-heading">
            <div>
              <span>
                {editandoId
                  ? "EDITAR REGISTRO"
                  : "NOVO CLIENTE CLT"}
              </span>

              <h2>
                {editandoId
                  ? "Atualizar análise"
                  : "Cadastrar análise"}
              </h2>

              <p>
                Cadastre os dados essenciais da
                operação CLT.
              </p>
            </div>

            <b>CLT</b>
          </div>

          <div className="clt-form-grid">
            <label>
              Nome completo

              <input
                value={form.nome}
                onChange={(event) =>
                  setForm({
                    ...form,
                    nome:
                      event.target.value,
                  })
                }
                placeholder="Nome do cliente"
              />
            </label>

            <label>
              CPF

              <input
                value={form.cpf}
                onChange={(event) =>
                  setForm({
                    ...form,
                    cpf: formatarCpf(
                      event.target.value
                    ),
                  })
                }
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </label>

            <label>
              Data de nascimento

              <input
                type="date"
                value={
                  form.dataNascimento
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    dataNascimento:
                      event.target.value,
                  })
                }
              />
            </label>

            <label>
              Número de telefone

              <input
                value={form.telefone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    telefone:
                      formatarTelefone(
                        event.target.value
                      ),
                  })
                }
                placeholder="(62) 99999-9999"
                inputMode="numeric"
              />
            </label>

            <label>
              Valor aprovado

              <input
                value={
                  form.valorAprovado
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    valorAprovado:
                      event.target.value,
                  })
                }
                placeholder="Ex.: 8.500,00"
                inputMode="decimal"
              />
            </label>

            <label>
              Parcela

              <input
                value={form.parcela}
                onChange={(event) =>
                  setForm({
                    ...form,
                    parcela:
                      event.target.value,
                  })
                }
                placeholder="Ex.: 450,00"
                inputMode="decimal"
              />
            </label>

            <label>
              Banco

              <input
                value={form.banco}
                onChange={(event) =>
                  setForm({
                    ...form,
                    banco:
                      event.target.value,
                  })
                }
                placeholder="Ex.: C6"
              />
            </label>

            <label>
              Consultora

              <input
                value={form.consultora}
                onChange={(event) =>
                  setForm({
                    ...form,
                    consultora:
                      event.target.value,
                  })
                }
                placeholder="Nome da consultora"
              />
            </label>

            <label>
              Status

              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status:
                      event.target
                        .value as StatusClt,
                  })
                }
              >
                {STATUS.map((status) => (
                  <option key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {mensagem && (
            <div className="clt-message">
              {mensagem}
            </div>
          )}

          <div className="clt-actions">
            {editandoId && (
              <button
                type="button"
                className="cancel"
                onClick={cancelarEdicao}
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              className="save"
            >
              {editandoId
                ? "Atualizar registro"
                : "Salvar registro"}
            </button>
          </div>
        </form>

        <section className="clt-card">
          <div className="clt-list-heading">
            <div>
              <span>CARTEIRA CLT</span>
              <h2>Clientes e análises</h2>
            </div>

            <b>{filtrados.length}</b>
          </div>

          <div className="clt-filters">
            <input
              value={busca}
              onChange={(event) =>
                setBusca(event.target.value)
              }
              placeholder="Pesquisar cliente, CPF, telefone, banco ou consultora"
            />

            <select
              value={filtroStatus}
              onChange={(event) =>
                setFiltroStatus(
                  event.target.value
                )
              }
            >
              <option>Todos</option>

              {STATUS.map((status) => (
                <option key={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {filtrados.length === 0 ? (
            <div className="clt-empty">
              <div>▣</div>

              <strong>
                Nenhum registro CLT
              </strong>

              <p>
                Cadastre o primeiro cliente.
              </p>
            </div>
          ) : (
            <div className="clt-list">
              {filtrados.map((item) => (
                <article key={item.id}>
                  <div className="clt-item-top">
                    <div>
                      <strong>
                        {item.nome}
                      </strong>

                      <span>
                        {item.cpf
                          ? formatarCpf(
                              item.cpf
                            )
                          : "CPF não informado"}{" "}
                        • Nascimento:{" "}
                        {formatarData(
                          item.dataNascimento
                        )}
                      </span>
                    </div>

                    <span
                      className={`clt-status status-${item.status
                        .toLowerCase()
                        .replace(/\s/g, "-")
                        .normalize("NFD")
                        .replace(
                          /[\u0300-\u036f]/g,
                          ""
                        )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="clt-values">
                    <div>
                      <small>
                        Telefone
                      </small>

                      <b>
                        {item.telefone
                          ? formatarTelefone(
                              item.telefone
                            )
                          : "Não informado"}
                      </b>
                    </div>

                    <div>
                      <small>
                        Valor aprovado
                      </small>

                      <b>
                        {moeda(
                          item.valorAprovado
                        )}
                      </b>
                    </div>

                    <div>
                      <small>Parcela</small>

                      <b>
                        {moeda(
                          item.parcela
                        )}
                      </b>
                    </div>

                    <div>
                      <small>Banco</small>

                      <b>
                        {item.banco ||
                          "Não informado"}
                      </b>
                    </div>
                  </div>

                  <footer>
                    <span>
                      {item.consultora ||
                        "Sem consultora"}{" "}
                      • Atualizado em{" "}
                      {item.atualizadoEm}
                    </span>

                    <div>
                      <button
                        onClick={() =>
                          editar(item)
                        }
                      >
                        Editar
                      </button>

                      <button
                        className="delete"
                        onClick={() =>
                          excluir(item.id)
                        }
                      >
                        Excluir
                      </button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="clt-help">
        <strong>Cadastro CLT:</strong>

        <span>
          acompanhe cada cliente pelo status da
          análise e pelo valor aprovado.
        </span>
      </section>
    </div>
  );
}
