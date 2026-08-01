"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import "./catalogo-premios.css";

type Premio = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  imagem_url: string;
  pontos: number;
  estoque: number;
  ativo: boolean;
  destaque: boolean;
  ordem: number;
};

type Pedido = {
  id: string;
  consultora: string;
  nome_premio: string;
  imagem_url: string;
  quantidade: number;
  pontos_unitarios: number;
  pontos_total: number;
  status: string;
  observacao: string;
  criado_em: string;
};

type Props = {
  modo: "catalogo" | "resgates";
  saldoPontos: number;
  nomeUsuario: string;
  perfilUsuario: string;
  podeGerenciar: boolean;
};

type FormPremio = {
  id?: string;
  nome: string;
  categoria: string;
  descricao: string;
  imagem_url: string;
  pontos: string;
  estoque: string;
  ativo: boolean;
  destaque: boolean;
  ordem: string;
};

const FORM_VAZIO: FormPremio = {
  nome: "",
  categoria: "Tecnologia",
  descricao: "",
  imagem_url: "",
  pontos: "",
  estoque: "1",
  ativo: true,
  destaque: false,
  ordem: "0",
};

function normalizar(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function pontos(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function dataBr(valor: string) {
  if (!valor) return "—";

  return new Date(valor).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function CatalogoPremios({
  modo,
  saldoPontos,
  nomeUsuario,
  perfilUsuario,
  podeGerenciar,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const inputImagemRef = useRef<HTMLInputElement | null>(null);

  const [premios, setPremios] = useState<Premio[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [formPremio, setFormPremio] = useState<FormPremio>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [arrastandoImagem, setArrastandoImagem] = useState(false);

  const obterToken = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error("Sua sessão expirou. Entre novamente no sistema.");
    }

    return data.session.access_token;
  }, [supabase]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const [{ data: premiosData, error: premiosError }, { data: pedidosData, error: pedidosError }] =
        await Promise.all([
          supabase
            .from("premios_loja")
            .select("id, nome, categoria, descricao, imagem_url, pontos, estoque, ativo, destaque, ordem")
            .order("ordem", { ascending: true })
            .order("criado_em", { ascending: false }),
          supabase
            .from("pedidos_loja")
            .select("id, consultora, nome_premio, imagem_url, quantidade, pontos_unitarios, pontos_total, status, observacao, criado_em")
            .order("criado_em", { ascending: false }),
        ]);

      if (premiosError) throw premiosError;
      if (pedidosError) throw pedidosError;

      setPremios((premiosData ?? []) as Premio[]);

      const listaPedidos = (pedidosData ?? []) as Pedido[];

      setPedidos(
        podeGerenciar
          ? listaPedidos
          : listaPedidos.filter(
              (pedido) =>
                normalizar(pedido.consultora) === normalizar(nomeUsuario)
            )
      );
    } catch (error) {
      console.error(error);
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a Loja de Prêmios."
      );
    } finally {
      setCarregando(false);
    }
  }, [supabase, podeGerenciar, nomeUsuario]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const categorias = useMemo(() => {
    return [
      "Todos",
      ...Array.from(
        new Set(
          premios
            .filter((premio) => premio.ativo || podeGerenciar)
            .map((premio) => premio.categoria || "Outros")
        )
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    ];
  }, [premios, podeGerenciar]);

  const premiosFiltrados = useMemo(() => {
    const termo = normalizar(busca);

    return premios.filter((premio) => {
      if (!podeGerenciar && !premio.ativo) return false;

      const passaCategoria =
        categoria === "Todos" || premio.categoria === categoria;

      const passaBusca =
        !termo ||
        normalizar(
          `${premio.nome} ${premio.categoria} ${premio.descricao}`
        ).includes(termo);

      return passaCategoria && passaBusca;
    });
  }, [premios, busca, categoria, podeGerenciar]);

  async function chamarApi(
    method: "POST" | "PATCH",
    body: Record<string, unknown>
  ) {
    const token = await obterToken();

    const resposta = await fetch("/api/loja-premios", {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const conteudo = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        conteudo.erro || "Não foi possível concluir a operação."
      );
    }

    return conteudo;
  }

  async function resgatar(premio: Premio) {
    setErro("");
    setMensagem("");

    if (premio.estoque <= 0) {
      setErro("Este prêmio está sem estoque.");
      return;
    }

    if (saldoPontos < Number(premio.pontos || 0)) {
      setErro(
        `Faltam ${pontos(
          Number(premio.pontos || 0) - saldoPontos
        )} pontos para resgatar ${premio.nome}.`
      );
      return;
    }

    const confirmou = window.confirm(
      `Deseja solicitar o resgate de ${premio.nome} por ${pontos(
        premio.pontos
      )} pontos?`
    );

    if (!confirmou) return;

    try {
      await chamarApi("POST", {
        acao: "criar_pedido",
        premioId: premio.id,
        saldoInformado: saldoPontos,
        nomeUsuario,
        perfilUsuario,
      });

      setMensagem(
        "Pedido enviado. Os pontos serão descontados quando a gestão aprovar."
      );

      window.dispatchEvent(
        new Event("loja-premios-pedidos-atualizados")
      );

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível solicitar o prêmio."
      );
    }
  }

  function abrirNovoPremio() {
    setFormPremio(FORM_VAZIO);
    setModalAberto(true);
    setErro("");
    setMensagem("");
  }

  function abrirEdicao(premio: Premio) {
    setFormPremio({
      id: premio.id,
      nome: premio.nome,
      categoria: premio.categoria,
      descricao: premio.descricao,
      imagem_url: premio.imagem_url,
      pontos: String(premio.pontos),
      estoque: String(premio.estoque),
      ativo: premio.ativo,
      destaque: premio.destaque,
      ordem: String(premio.ordem),
    });

    setModalAberto(true);
    setErro("");
    setMensagem("");
  }

  function nomeArquivoSeguro(valor: string) {
    return normalizar(valor)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  async function enviarImagem(arquivo: File) {
    setErro("");
    setMensagem("");

    if (!arquivo.type.startsWith("image/")) {
      setErro("Escolha um arquivo de imagem JPG, PNG ou WEBP.");
      return;
    }

    if (arquivo.size > 8 * 1024 * 1024) {
      setErro("A imagem deve ter no máximo 8 MB.");
      return;
    }

    setEnviandoImagem(true);

    try {
      const extensao =
        arquivo.name.split(".").pop()?.toLowerCase() || "jpg";

      const nomeBase =
        nomeArquivoSeguro(formPremio.nome || arquivo.name) || "premio";

      const caminho = `${Date.now()}-${nomeBase}.${extensao}`;

      const { error: uploadError } = await supabase.storage
        .from("premios-loja")
        .upload(caminho, arquivo, {
          cacheControl: "3600",
          upsert: false,
          contentType: arquivo.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("premios-loja")
        .getPublicUrl(caminho);

      setFormPremio((atual) => ({
        ...atual,
        imagem_url: data.publicUrl,
      }));

      setMensagem("Imagem enviada com sucesso.");
    } catch (error) {
      console.error(error);
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a imagem."
      );
    } finally {
      setEnviandoImagem(false);
      setArrastandoImagem(false);
    }
  }

  function selecionarImagem(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];

    if (arquivo) {
      void enviarImagem(arquivo);
    }

    evento.target.value = "";
  }

  function soltarImagem(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setArrastandoImagem(false);

    const arquivo = evento.dataTransfer.files?.[0];

    if (arquivo) {
      void enviarImagem(arquivo);
    }
  }

  async function salvarPremio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setSalvando(true);
    setErro("");
    setMensagem("");

    try {
      if (!formPremio.imagem_url) {
        throw new Error("Escolha uma imagem para o prêmio.");
      }

      await chamarApi(formPremio.id ? "PATCH" : "POST", {
        acao: formPremio.id ? "atualizar_premio" : "criar_premio",
        premio: {
          id: formPremio.id,
          nome: formPremio.nome.trim(),
          categoria: formPremio.categoria.trim(),
          descricao: formPremio.descricao.trim(),
          imagem_url: formPremio.imagem_url.trim(),
          pontos: Number(formPremio.pontos || 0),
          estoque: Number(formPremio.estoque || 0),
          ativo: formPremio.ativo,
          destaque: formPremio.destaque,
          ordem: Number(formPremio.ordem || 0),
        },
      });

      setModalAberto(false);
      setMensagem(
        formPremio.id
          ? "Prêmio atualizado com sucesso."
          : "Prêmio cadastrado com sucesso."
      );

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o prêmio."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarStatusPedido(
    pedido: Pedido,
    status: string
  ) {
    setErro("");
    setMensagem("");

    try {
      await chamarApi("PATCH", {
        acao: "atualizar_pedido",
        pedidoId: pedido.id,
        status,
      });

      setMensagem("Status do pedido atualizado.");

      window.dispatchEvent(
        new Event("loja-premios-pedidos-atualizados")
      );

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o pedido."
      );
    }
  }

  return (
    <div className="catalogo-page">
      <section className="catalogo-hero">
        <div>
          <span>LOJA DE PRÊMIOS ELEVA</span>
          <h2>
            {modo === "catalogo"
              ? "Escolha seu próximo prêmio"
              : podeGerenciar
                ? "Pedidos e resgates"
                : "Meus resgates"}
          </h2>
          <p>
            Troque seus pontos por experiências e produtos selecionados pela Eleva.
          </p>
        </div>

        <div className="catalogo-saldo">
          <small>Saldo disponível</small>
          <strong>{pontos(saldoPontos)}</strong>
          <span>pontos</span>
        </div>
      </section>

      {erro && <div className="catalogo-alerta erro">{erro}</div>}
      {mensagem && (
        <div className="catalogo-alerta sucesso">{mensagem}</div>
      )}

      {modo === "catalogo" ? (
        <>
          <section className="catalogo-toolbar">
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar prêmio..."
            />

            <div className="catalogo-categorias">
              {categorias.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={categoria === item ? "ativo" : ""}
                  onClick={() => setCategoria(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {podeGerenciar && (
              <button
                type="button"
                className="catalogo-novo"
                onClick={abrirNovoPremio}
              >
                + Novo prêmio
              </button>
            )}
          </section>

          {carregando ? (
            <div className="catalogo-vazio">Carregando prêmios...</div>
          ) : premiosFiltrados.length === 0 ? (
            <div className="catalogo-vazio">
              Nenhum prêmio encontrado.
            </div>
          ) : (
            <section className="catalogo-grid">
              {premiosFiltrados.map((premio) => {
                const pontosFaltantes = Math.max(
                  Number(premio.pontos || 0) - saldoPontos,
                  0
                );

                const podeResgatar =
                  premio.ativo &&
                  premio.estoque > 0 &&
                  saldoPontos >= Number(premio.pontos || 0);

                return (
                  <article className="premio-card" key={premio.id}>
                    <div className="premio-imagem">
                      {premio.destaque && (
                        <span className="premio-destaque">
                          Destaque
                        </span>
                      )}

                      <img
                        src={premio.imagem_url || "/icon-eleva.png"}
                        alt={premio.nome}
                      />
                    </div>

                    <div className="premio-conteudo">
                      <span className="premio-categoria">
                        {premio.categoria}
                      </span>

                      <h3>{premio.nome}</h3>

                      <p>{premio.descricao}</p>

                      <div className="premio-info">
                        <strong>{pontos(premio.pontos)} pts</strong>
                        <span>
                          {premio.estoque > 0
                            ? `${premio.estoque} disponível(is)`
                            : "Esgotado"}
                        </span>
                      </div>

                      {!podeGerenciar ? (
                        <button
                          type="button"
                          className="premio-resgatar"
                          disabled={!podeResgatar}
                          onClick={() => void resgatar(premio)}
                        >
                          {premio.estoque <= 0
                            ? "Esgotado"
                            : pontosFaltantes > 0
                              ? `Faltam ${pontos(pontosFaltantes)} pts`
                              : "Resgatar prêmio"}
                        </button>
                      ) : (
                        <div className="premio-admin-acoes">
                          <button
                            type="button"
                            onClick={() => abrirEdicao(premio)}
                          >
                            Editar
                          </button>

                          <span
                            className={
                              premio.ativo ? "ativo" : "inativo"
                            }
                          >
                            {premio.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      ) : (
        <section className="pedidos-painel">
          <div className="pedidos-cabecalho">
            <div>
              <span>HISTÓRICO</span>
              <h3>
                {podeGerenciar
                  ? "Todos os pedidos"
                  : "Meus pedidos"}
              </h3>
            </div>

            <strong>{pedidos.length}</strong>
          </div>

          {carregando ? (
            <div className="catalogo-vazio">Carregando pedidos...</div>
          ) : pedidos.length === 0 ? (
            <div className="catalogo-vazio">
              Nenhum resgate solicitado.
            </div>
          ) : (
            <div className="pedidos-lista">
              {pedidos.map((pedido) => (
                <article key={pedido.id}>
                  <img
                    src={pedido.imagem_url || "/icon-eleva.png"}
                    alt={pedido.nome_premio}
                  />

                  <div>
                    <strong>{pedido.nome_premio}</strong>
                    <span>
                      {podeGerenciar
                        ? pedido.consultora
                        : "Solicitado por você"}
                    </span>
                    <small>{dataBr(pedido.criado_em)}</small>
                  </div>

                  <div className="pedido-pontos">
                    <strong>{pontos(pedido.pontos_total)} pts</strong>
                    <span>{pedido.status}</span>
                  </div>

                  {podeGerenciar && (
                    <select
                      value={pedido.status}
                      onChange={(event) =>
                        void atualizarStatusPedido(
                          pedido,
                          event.target.value
                        )
                      }
                    >
                      <option value="SOLICITADO">Solicitado</option>
                      <option value="APROVADO">Aprovado</option>
                      <option value="EM PREPARAÇÃO">
                        Em preparação
                      </option>
                      <option value="ENTREGUE">Entregue</option>
                      <option value="RECUSADO">Recusado</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {modalAberto && podeGerenciar && (
        <div className="catalogo-modal-fundo">
          <form
            className="catalogo-modal"
            onSubmit={salvarPremio}
          >
            <div className="catalogo-modal-topo">
              <div>
                <span>ADMINISTRAÇÃO DA LOJA</span>
                <h3>
                  {formPremio.id
                    ? "Editar prêmio"
                    : "Cadastrar prêmio"}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setModalAberto(false)}
              >
                ×
              </button>
            </div>

            <div className="catalogo-form-grid">
              <label>
                Nome do prêmio
                <input
                  required
                  value={formPremio.nome}
                  onChange={(event) =>
                    setFormPremio((atual) => ({
                      ...atual,
                      nome: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Categoria
                <input
                  required
                  value={formPremio.categoria}
                  onChange={(event) =>
                    setFormPremio((atual) => ({
                      ...atual,
                      categoria: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="catalogo-campo-largo">
                Descrição
                <textarea
                  value={formPremio.descricao}
                  onChange={(event) =>
                    setFormPremio((atual) => ({
                      ...atual,
                      descricao: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="catalogo-campo-largo catalogo-upload-bloco">
                <span className="catalogo-upload-titulo">
                  Imagem do prêmio
                </span>

                <div
                  className={`catalogo-upload-area ${
                    arrastandoImagem ? "arrastando" : ""
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setArrastandoImagem(true);
                  }}
                  onDragLeave={() => setArrastandoImagem(false)}
                  onDrop={soltarImagem}
                >
                  {formPremio.imagem_url ? (
                    <div className="catalogo-upload-preview">
                      <img
                        src={formPremio.imagem_url}
                        alt="Pré-visualização do prêmio"
                      />

                      <div className="catalogo-upload-acoes">
                        <button
                          type="button"
                          onClick={() => inputImagemRef.current?.click()}
                          disabled={enviandoImagem}
                        >
                          {enviandoImagem
                            ? "Enviando..."
                            : "Trocar imagem"}
                        </button>

                        <button
                          type="button"
                          className="remover"
                          onClick={() =>
                            setFormPremio((atual) => ({
                              ...atual,
                              imagem_url: "",
                            }))
                          }
                          disabled={enviandoImagem}
                        >
                          Remover imagem
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="catalogo-upload-vazio"
                      onClick={() => inputImagemRef.current?.click()}
                      disabled={enviandoImagem}
                    >
                      <strong>
                        {enviandoImagem
                          ? "Enviando imagem..."
                          : "Clique para escolher a imagem"}
                      </strong>

                      <span>ou arraste o arquivo para esta área</span>
                      <small>JPG, PNG ou WEBP — até 8 MB</small>
                    </button>
                  )}

                  <input
                    ref={inputImagemRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={selecionarImagem}
                    hidden
                  />
                </div>
              </div>

              <label>
                Pontos necessários
                <input
                  type="number"
                  min="0"
                  required
                  value={formPremio.pontos}
                  onChange={(event) =>
                    setFormPremio((atual) => ({
                      ...atual,
                      pontos: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Estoque
                <input
                  type="number"
                  min="0"
                  required
                  value={formPremio.estoque}
                  onChange={(event) =>
                    setFormPremio((atual) => ({
                      ...atual,
                      estoque: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Ordem de exibição
                <input
                  type="number"
                  value={formPremio.ordem}
                  onChange={(event) =>
                    setFormPremio((atual) => ({
                      ...atual,
                      ordem: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="catalogo-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={formPremio.ativo}
                    onChange={(event) =>
                      setFormPremio((atual) => ({
                        ...atual,
                        ativo: event.target.checked,
                      }))
                    }
                  />
                  Prêmio ativo
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={formPremio.destaque}
                    onChange={(event) =>
                      setFormPremio((atual) => ({
                        ...atual,
                        destaque: event.target.checked,
                      }))
                    }
                  />
                  Mostrar como destaque
                </label>
              </div>
            </div>

            <div className="catalogo-modal-acoes">
              <button
                type="button"
                className="cancelar"
                onClick={() => setModalAberto(false)}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="salvar"
                disabled={salvando || enviandoImagem || !formPremio.imagem_url}
              >
                {salvando ? "Salvando..." : "Salvar prêmio"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}