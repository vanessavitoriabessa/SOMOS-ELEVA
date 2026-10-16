"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { createClient } from "@/lib/supabase/client";

import {
  calcularCustoPa,
  carregarDadosCustoPa,
  CHAVE_AVISO_CUSTO_PA,
  referenciaCustoPaValida,
  type CalculoCustoPa,
  type DadosCustoPa,
  type ResumoCustoPa,
} from "./custo-pa";

type Estado = {
  referencia: string;
  carregando: boolean;
  erro: string | null;
  dados: DadosCustoPa | null;
  calculo: CalculoCustoPa | null;
  consultadoEm: string | null;
};

const estadoVazio: Estado = {
  referencia: "",
  carregando: false,
  erro: null,
  dados: null,
  calculo: null,
  consultadoEm: null,
};

/** Nenhum mês fixo, cache persistente de valores ou acréscimo da premiação. */
export function useCustoPaFinanceiro(
  cliente: ReturnType<typeof createClient>,
  referencia: string,
  habilitado = true,
) {
  const [estado, setEstado] = useState<Estado>(estadoVazio);
  const sequencia = useRef(0);
  const cancelamento = useRef<AbortController | null>(null);

  const atualizar = useCallback(async (): Promise<boolean> => {
    const numeroConsulta = ++sequencia.current;

    cancelamento.current?.abort();

    if (!habilitado) {
      setEstado(estadoVazio);
      return false;
    }

    if (!referenciaCustoPaValida(referencia)) {
      setEstado({
        ...estadoVazio,
        referencia,
        erro: "Selecione um mês e ano de referência válidos.",
      });

      return false;
    }

    const controller = new AbortController();
    cancelamento.current = controller;

    let expirou = false;

    const limite = window.setTimeout(() => {
      expirou = true;
      controller.abort();
    }, 45000);

    setEstado((anterior) => ({
      ...(anterior.referencia === referencia
        ? anterior
        : estadoVazio),
      referencia,
      carregando: true,
      erro: null,
    }));

    try {
      const { data, error } = await cliente.auth.getSession();

      if (error || !data.session?.access_token) {
        throw new Error(
          "Sua sessão expirou. Entre novamente no sistema.",
        );
      }

      const dados = await carregarDadosCustoPa(
        cliente,
        controller.signal,
      );

      if (numeroConsulta !== sequencia.current) {
        return false;
      }

      if (controller.signal.aborted) {
        throw new Error("Consulta do Custo PA cancelada.");
      }

      const calculo = calcularCustoPa(dados, referencia);

      if (!calculo.qtd) {
        throw new Error(
          "Não há operadores ativos disponíveis para calcular o Custo PA.",
        );
      }

      setEstado({
        referencia,
        carregando: false,
        erro: null,
        dados,
        calculo,
        consultadoEm: new Date().toISOString(),
      });

      return true;
    } catch (erro) {
      if (numeroConsulta !== sequencia.current) {
        return false;
      }

      setEstado({
        ...estadoVazio,
        referencia,
        erro: expirou
          ? "A consulta do Custo PA demorou demais. Tente atualizar novamente."
          : erro instanceof Error
            ? erro.message
            : "Custo PA indisponível para esta referência.",
      });

      return false;
    } finally {
      window.clearTimeout(limite);

      if (cancelamento.current === controller) {
        cancelamento.current = null;
      }
    }
  }, [cliente, referencia, habilitado]);

  useEffect(() => {
    void atualizar();

    if (!habilitado) return;

    const aoRetornar = () => {
      if (
        document.visibilityState !== "hidden" &&
        !cancelamento.current
      ) {
        void atualizar();
      }
    };

    const aoReceberAviso = (evento: StorageEvent) => {
      if (evento.key === CHAVE_AVISO_CUSTO_PA) {
        void atualizar();
      }
    };

    const intervalo = window.setInterval(aoRetornar, 60000);

    window.addEventListener("focus", aoRetornar);
    document.addEventListener("visibilitychange", aoRetornar);
    window.addEventListener("storage", aoReceberAviso);

    return () => {
      // Impede retorno antigo de sobrescrever o novo mês.
      ++sequencia.current;

      cancelamento.current?.abort();
      cancelamento.current = null;

      window.clearInterval(intervalo);

      window.removeEventListener("focus", aoRetornar);
      document.removeEventListener(
        "visibilitychange",
        aoRetornar,
      );
      window.removeEventListener("storage", aoReceberAviso);
    };
  }, [atualizar, habilitado]);

  // Já oculta o mês anterior no render, antes mesmo de o próximo efeito executar.
  const atual =
    habilitado && estado.referencia === referencia
      ? estado
      : estadoVazio;

  const resumo = useMemo<ResumoCustoPa | null>(() => {
    if (
      !atual.calculo ||
      !atual.consultadoEm ||
      atual.erro
    ) {
      return null;
    }

    return {
      referencia: atual.calculo.referencia,
      custoPa: atual.calculo.unit,
      custoTotal: atual.calculo.total,
      quantidadeOperadores: atual.calculo.qtd,
      consultadoEm: atual.consultadoEm,
    };
  }, [
    atual.calculo,
    atual.consultadoEm,
    atual.erro,
  ]);

  return {
    dados: atual.dados,
    calculo: atual.calculo,
    resumo,
    erro: atual.erro,
    carregando:
      habilitado &&
      (estado.referencia !== referencia || atual.carregando),
    atualizar,
  };
}