"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  AbaLoja,
  FormPremio,
  PedidoLoja,
  PremioLoja,
} from "./tipos";
import { FORM_PREMIO_VAZIO } from "./tipos";

type UseLojaPremiosProps = {
  saldoPontos: number;
  nomeUsuario: string;
  perfilUsuario: string;
  podeGerenciar: boolean;
};

function normalizar(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function useLojaPremios({
  saldoPontos,
  nomeUsuario,
  perfilUsuario,
  podeGerenciar,
}: UseLojaPremiosProps) {
  const supabase = useMemo(() => createClient(), []);

  const [premios, setPremios] = useState<PremioLoja[]>([]);
  const [pedidos, setPedidos] = useState<PedidoLoja[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [carrinho, setCarrinho] = useState<string[]>([]);

  const [aba, setAba] = useState<AbaLoja>("catalogo");
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todos");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [formulario, setFormulario] =
    useState<FormPremio>(FORM_PREMIO_VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    try {
      const favoritosSalvos = JSON.parse(
        localStorage.getItem("somos-eleva-loja-favoritos") || "[]"
      );

      const carrinhoSalvo = JSON.parse(
        localStorage.getItem("somos-eleva-loja-carrinho") || "[]"
      );

      setFavoritos(
        Array.isArray(favoritosSalvos) ? favoritosSalvos : []
      );

      setCarrinho(
        Array.isArray(carrinhoSalvo) ? carrinhoSalvo : []
      );
    } catch {
      setFavoritos([]);
      setCarrinho([]);
    }
  }, []);

  function salvarFavoritos(ids: string[]) {
    setFavoritos(ids);

    localStorage.setItem(
      "somos-eleva-loja-favoritos",
      JSON.stringify(ids)
    );
  }

  function salvarCarrinho(ids: string[]) {
    setCarrinho(ids);

    localStorage.setItem(
      "somos-eleva-loja-carrinho",
      JSON.stringify(ids)
    );
  }

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
      const [
        { data: premiosData, error: premiosError },
        { data: pedidosData, error: pedidosError },
      ] = await Promise.all([
        supabase
          .from("premios_loja")
          .select(
            "id, nome, categoria, descricao, imagem_url, pontos, estoque, ativo, destaque, ordem, criado_em"
          )
          .order("ordem", { ascending: true })
          .order("criado_em", { ascending: false }),

        supabase
          .from("pedidos_loja")
          .select(
            "id, consultora, nome_premio, imagem_url, quantidade, pontos_unitarios, pontos_total, status, observacao, criado_em"
          )
          .order("criado_em", { ascending: false }),
      ]);

      if (premiosError) {
        throw premiosError;
      }

      if (pedidosError) {
        throw pedidosError;
      }

      setPremios((premiosData ?? []) as PremioLoja[]);

      const listaPedidos = (pedidosData ?? []) as PedidoLoja[];

      setPedidos(
        podeGerenciar
          ? listaPedidos
          : listaPedidos.filter(
              (pedido) =>
                normalizar(pedido.consultora) ===
                normalizar(nomeUsuario)
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
      if (!podeGerenciar && !premio.ativo) {
        return false;
      }

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

  const premiosFavoritos = useMemo(
    () =>
      premios.filter((premio) =>
        favoritos.includes(premio.id)
      ),
    [premios, favoritos]
  );

  const itensCarrinho = useMemo(
    () =>
      premios.filter((premio) =>
        carrinho.includes(premio.id)
      ),
    [premios, carrinho]
  );

  const totalCarrinho = useMemo(
    () =>
      itensCarrinho.reduce(
        (total, premio) =>
          total + Number(premio.pontos || 0),
        0
      ),
    [itensCarrinho]
  );

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
        conteudo.erro ||
          "Não foi possível concluir a operação."
      );
    }

    return conteudo;
  }

  async function criarPedido(premio: PremioLoja) {
    await chamarApi("POST", {
      acao: "criar_pedido",
      premioId: premio.id,
      saldoInformado: saldoPontos,
      nomeUsuario,
      perfilUsuario,
    });
  }

  async function resgatar(premio: PremioLoja) {
    setErro("");
    setMensagem("");

    if (premio.estoque <= 0) {
      setErro("Este prêmio está sem estoque.");
      return;
    }

    if (saldoPontos < Number(premio.pontos || 0)) {
      setErro("Saldo de pontos insuficiente.");
      return;
    }

    const confirmou = window.confirm(
      `Deseja solicitar o resgate de ${premio.nome}?`
    );

    if (!confirmou) {
      return;
    }

    try {
      await criarPedido(premio);

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

  function alternarFavorito(id: string) {
    const novosFavoritos = favoritos.includes(id)
      ? favoritos.filter((item) => item !== id)
      : [...favoritos, id];

    salvarFavoritos(novosFavoritos);
  }

  function adicionarAoCarrinho(id: string) {
    if (carrinho.includes(id)) {
      setAba("carrinho");
      return;
    }

    salvarCarrinho([...carrinho, id]);
    setMensagem("Produto adicionado ao carrinho.");
  }

  function removerDoCarrinho(id: string) {
    salvarCarrinho(
      carrinho.filter((item) => item !== id)
    );
  }

  async function confirmarCarrinho() {
    setErro("");
    setMensagem("");

    if (itensCarrinho.length === 0) {
      setErro("O carrinho está vazio.");
      return;
    }

    if (totalCarrinho > saldoPontos) {
      setErro("Saldo de pontos insuficiente.");
      return;
    }

    const produtoSemEstoque = itensCarrinho.find(
      (premio) => premio.estoque <= 0
    );

    if (produtoSemEstoque) {
      setErro(`${produtoSemEstoque.nome} está sem estoque.`);
      return;
    }

    const confirmou = window.confirm(
      "Deseja confirmar os resgates do carrinho?"
    );

    if (!confirmou) {
      return;
    }

    try {
      for (const premio of itensCarrinho) {
        await criarPedido(premio);
      }

      salvarCarrinho([]);
      setMensagem("Pedidos enviados com sucesso.");
      setAba("resgates");

      window.dispatchEvent(
        new Event("loja-premios-pedidos-atualizados")
      );

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar o carrinho."
      );
    }
  }

  function abrirNovoPremio() {
    setFormulario(FORM_PREMIO_VAZIO);
    setModalAberto(true);
    setErro("");
    setMensagem("");
  }

  function abrirEdicao(premio: PremioLoja) {
    setFormulario({
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

  function fecharModal() {
    setModalAberto(false);
    setErro("");
    setMensagem("");
  }

  async function salvarPremio(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    setSalvando(true);
    setErro("");
    setMensagem("");

    try {
      if (!formulario.imagem_url) {
        throw new Error("Envie uma imagem para o prêmio.");
      }

      await chamarApi(formulario.id ? "PATCH" : "POST", {
        acao: formulario.id
          ? "atualizar_premio"
          : "criar_premio",

        premio: {
          id: formulario.id,
          nome: formulario.nome.trim(),
          categoria: formulario.categoria.trim(),
          descricao: formulario.descricao.trim(),
          imagem_url: formulario.imagem_url.trim(),
          pontos: Number(formulario.pontos || 0),
          estoque: Number(formulario.estoque || 0),
          ativo: formulario.ativo,
          destaque: formulario.destaque,
          ordem: Number(formulario.ordem || 0),
        },
      });

      setModalAberto(false);

      setMensagem(
        formulario.id
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
    pedido: PedidoLoja,
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

  return {
    aba,
    setAba,

    premios,
    pedidos,
    favoritos,
    carrinho,

    busca,
    setBusca,

    categoria,
    setCategoria,
    categorias,

    premiosFiltrados,
    premiosFavoritos,
    itensCarrinho,
    totalCarrinho,

    carregando,
    erro,
    mensagem,

    modalAberto,
    formulario,
    setFormulario,
    salvando,

    carregar,
    resgatar,
    alternarFavorito,
    adicionarAoCarrinho,
    removerDoCarrinho,
    confirmarCarrinho,

    abrirNovoPremio,
    abrirEdicao,
    fecharModal,
    salvarPremio,
    atualizarStatusPedido,
  };
}