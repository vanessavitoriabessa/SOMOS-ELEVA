"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./nova-proposta-modal.css";

type ClienteProposta = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  consultora: string;
  banco?: string;
};

type Banco = {
  id: string;
  nome: string;
};

type TabelaBanco = {
  id: string;
  bancoId: string;
  nome: string;
  percentual: number;
};

type FormularioProposta = {
  bancoOrigemId: string;
  bancoAtualId: string;
  tabelaBancoId: string;
  valorContrato: string;
  parcela: string;
  percentualTabela: string;
  dataCadastro: string;
  observacao: string;
};

type NovaPropostaModalProps = {
  cliente: ClienteProposta;
  accessToken: string;
  onFechar: () => void;
  onCadastrada: () => Promise<void> | void;
};

function apenasNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarCpf(valor: string) {
  const digitos = apenasNumeros(valor).slice(0, 11);

  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatarTelefone(valor: string) {
  const digitos = apenasNumeros(valor).slice(0, 11);

  if (digitos.length <= 10) {
    return digitos
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digitos
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function converterNumero(valor: string) {
  const convertido = Number(
    valor
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );

  return Number.isFinite(convertido) ? convertido : 0;
}

function formatarValorDigitado(valor: string) {
  const somenteNumeros = apenasNumeros(valor);

  if (!somenteNumeros) return "";

  const numero = Number(somenteNumeros) / 100;

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function criarFormularioVazio(): FormularioProposta {
  return {
    bancoOrigemId: "",
    bancoAtualId: "",
    tabelaBancoId: "",
    valorContrato: "",
    parcela: "",
    percentualTabela: "",
    dataCadastro: new Date().toISOString().slice(0, 10),
    observacao: "",
  };
}

export default function NovaPropostaModal({
  cliente,
  accessToken,
  onFechar,
  onCadastrada,
}: NovaPropostaModalProps) {
  const [form, setForm] =
    useState<FormularioProposta>(criarFormularioVazio());

  const [bancos, setBancos] = useState<Banco[]>([]);
  const [tabelas, setTabelas] = useState<TabelaBanco[]>([]);
  const [carregandoBancos, setCarregandoBancos] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const tabelasDoBancoAtual = useMemo(() => {
    if (!form.bancoAtualId) return [];

    return tabelas.filter(
      (tabela) => tabela.bancoId === form.bancoAtualId
    );
  }, [form.bancoAtualId, tabelas]);

  const bancoOrigemSelecionado = useMemo(() => {
    return bancos.find(
      (banco) => banco.id === form.bancoOrigemId
    );
  }, [bancos, form.bancoOrigemId]);

  const bancoAtualSelecionado = useMemo(() => {
    return bancos.find(
      (banco) => banco.id === form.bancoAtualId
    );
  }, [bancos, form.bancoAtualId]);

  const tabelaSelecionada = useMemo(() => {
    return tabelas.find(
      (tabela) => tabela.id === form.tabelaBancoId
    );
  }, [tabelas, form.tabelaBancoId]);

  useEffect(() => {
    async function carregarBancos() {
      setCarregandoBancos(true);
      setMensagem("");

      try {
        const resposta = await fetch("/api/bancos", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        const conteudo = (await resposta.json()) as {
          bancos?: Banco[];
          tabelas?: TabelaBanco[];
          erro?: string;
        };

        if (!resposta.ok) {
          throw new Error(
            conteudo.erro ||
              "Não foi possível carregar bancos e tabelas."
          );
        }

        setBancos(
          Array.isArray(conteudo.bancos)
            ? conteudo.bancos
            : []
        );

        setTabelas(
          Array.isArray(conteudo.tabelas)
            ? conteudo.tabelas
            : []
        );
      } catch (erro) {
        setBancos([]);
        setTabelas([]);

        setMensagem(
          erro instanceof Error
            ? erro.message
            : "Não foi possível carregar bancos e tabelas."
        );
      } finally {
        setCarregandoBancos(false);
      }
    }

    void carregarBancos();
  }, [accessToken]);

  function alterarBancoAtual(bancoAtualId: string) {
    setForm((atual) => ({
      ...atual,
      bancoAtualId,
      tabelaBancoId: "",
      percentualTabela: "",
    }));
  }

  function alterarTabela(tabelaBancoId: string) {
    const tabela = tabelas.find(
      (item) => item.id === tabelaBancoId
    );

    setForm((atual) => ({
      ...atual,
      tabelaBancoId,
      percentualTabela: tabela
        ? String(tabela.percentual).replace(".", ",")
        : "",
    }));
  }

  async function salvarProposta(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMensagem("");

    if (!form.bancoOrigemId) {
      setMensagem("Selecione o banco de origem.");
      return;
    }

    if (!form.bancoAtualId) {
      setMensagem("Selecione o banco atual.");
      return;
    }

    if (!form.tabelaBancoId || !tabelaSelecionada) {
      setMensagem("Selecione a tabela da proposta.");
      return;
    }

    const valorContrato = converterNumero(
      form.valorContrato
    );

    const parcela = converterNumero(form.parcela);

    const percentualTabela = converterNumero(
      form.percentualTabela
    );

    if (valorContrato <= 0) {
      setMensagem(
        "Informe um valor de contrato válido."
      );
      return;
    }

    if (!form.dataCadastro) {
      setMensagem("Informe a data de cadastro.");
      return;
    }

    const proposta = {
      id: crypto.randomUUID(),
      clienteId: cliente.id,
      cliente: cliente.nome,
      cpf: apenasNumeros(cliente.cpf),
      telefone: apenasNumeros(cliente.telefone),
      vendedora: cliente.consultora,

      banco: bancoAtualSelecionado?.nome || "",
      bancoOrigemId: form.bancoOrigemId,
      bancoAtualId: form.bancoAtualId,
      tabelaBancoId: form.tabelaBancoId,
      tabela: tabelaSelecionada.nome,

      valorContrato,
      parcela,
      percentualTabela,
      valorMeta:
        valorContrato * (percentualTabela / 100),

      comissao: 0,
      premiacao: 0,
      status: "Solicitado",
      dataCadastro: form.dataCadastro,
      dataPagamento: "",
      observacao: form.observacao.trim(),

      bancoOrigem:
        bancoOrigemSelecionado?.nome || "",
      bancoAtual:
        bancoAtualSelecionado?.nome || "",
    };

    setSalvando(true);

    try {
      const resposta = await fetch("/api/propostas", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposta,
        }),
      });

      const conteudo = (await resposta.json()) as {
        erro?: string;
        mensagem?: string;
      };

      if (!resposta.ok) {
        throw new Error(
          conteudo.erro ||
            "Não foi possível cadastrar a proposta."
        );
      }

      await onCadastrada();
      onFechar();
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível cadastrar a proposta."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="nova-proposta-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Nova proposta"
    >
      <form
        className="nova-proposta-modal"
        onSubmit={salvarProposta}
      >
        <header className="nova-proposta-header">
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

        <section className="nova-proposta-section">
          <div className="nova-proposta-section-title">
            <span>01</span>

            <div>
              <strong>Dados do cliente</strong>
              <small>
                Informações vinculadas automaticamente.
              </small>
            </div>
          </div>

          <div className="nova-proposta-grid">
            <label>
              Cliente

              <input
                value={cliente.nome}
                readOnly
              />
            </label>

            <label>
              CPF

              <input
                value={formatarCpf(cliente.cpf)}
                readOnly
              />
            </label>

            <label>
              Consultora

              <input
                value={cliente.consultora}
                readOnly
              />
            </label>

            <label>
              Telefone

              <input
                value={formatarTelefone(
                  cliente.telefone
                )}
                readOnly
              />
            </label>
          </div>
        </section>

        <section className="nova-proposta-section">
          <div className="nova-proposta-section-title">
            <span>02</span>

            <div>
              <strong>Dados da proposta</strong>
              <small>
                Bancos, tabela e valores financeiros.
              </small>
            </div>
          </div>

          {carregandoBancos ? (
            <div className="nova-proposta-loading">
              Carregando bancos e tabelas...
            </div>
          ) : (
            <div className="nova-proposta-grid">
              <label>
                Banco de origem

                <select
                  value={form.bancoOrigemId}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      bancoOrigemId:
                        event.target.value,
                    }))
                  }
                >
                  <option value="">
                    Selecione o banco de origem
                  </option>

                  {bancos.map((banco) => (
                    <option
                      key={banco.id}
                      value={banco.id}
                    >
                      {banco.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Banco atual

                <select
                  value={form.bancoAtualId}
                  onChange={(event) =>
                    alterarBancoAtual(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Selecione o banco atual
                  </option>

                  {bancos.map((banco) => (
                    <option
                      key={banco.id}
                      value={banco.id}
                    >
                      {banco.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tabela

                <select
                  value={form.tabelaBancoId}
                  onChange={(event) =>
                    alterarTabela(
                      event.target.value
                    )
                  }
                  disabled={!form.bancoAtualId}
                >
                  <option value="">
                    {form.bancoAtualId
                      ? "Selecione a tabela"
                      : "Selecione primeiro o banco atual"}
                  </option>

                  {tabelasDoBancoAtual.map(
                    (tabela) => (
                      <option
                        key={tabela.id}
                        value={tabela.id}
                      >
                        {tabela.nome}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Percentual da tabela

                <div className="nova-proposta-percentual">
                  <input
                    value={form.percentualTabela}
                    readOnly
                    placeholder="Automático"
                  />

                  <span>%</span>
                </div>
              </label>

              <label>
                Valor do contrato

                <div className="nova-proposta-dinheiro">
                  <span>R$</span>

                  <input
                    value={form.valorContrato}
                    onChange={(event) =>
                      setForm((atual) => ({
                        ...atual,
                        valorContrato:
                          formatarValorDigitado(
                            event.target.value
                          ),
                      }))
                    }
                    placeholder="0,00"
                    inputMode="numeric"
                  />
                </div>
              </label>

              <label>
                Valor da parcela

                <div className="nova-proposta-dinheiro">
                  <span>R$</span>

                  <input
                    value={form.parcela}
                    onChange={(event) =>
                      setForm((atual) => ({
                        ...atual,
                        parcela:
                          formatarValorDigitado(
                            event.target.value
                          ),
                      }))
                    }
                    placeholder="0,00"
                    inputMode="numeric"
                  />
                </div>
              </label>

              <label>
                Data de cadastro

                <input
                  type="date"
                  value={form.dataCadastro}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      dataCadastro:
                        event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          )}
        </section>

        <section className="nova-proposta-section">
          <div className="nova-proposta-section-title">
            <span>03</span>

            <div>
              <strong>Observação</strong>
              <small>
                Informações adicionais da proposta.
              </small>
            </div>
          </div>

          <label className="nova-proposta-observacao">
            Observação

            <textarea
              value={form.observacao}
              onChange={(event) =>
                setForm((atual) => ({
                  ...atual,
                  observacao: event.target.value,
                }))
              }
              placeholder="Informações adicionais da proposta"
            />
          </label>
        </section>

        {mensagem && (
          <div className="nova-proposta-mensagem">
            {mensagem}
          </div>
        )}

        <footer className="nova-proposta-actions">
          <button
            type="button"
            className="cancelar"
            onClick={onFechar}
            disabled={salvando}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="salvar"
            disabled={
              salvando || carregandoBancos
            }
          >
            {salvando
              ? "Cadastrando..."
              : "Cadastrar proposta"}
          </button>
        </footer>
      </form>
    </div>
  );
}