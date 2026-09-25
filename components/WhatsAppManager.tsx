"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type WhatsAppItem = {
  id: number;
  nome: string;
  numero: string;
  ativo: boolean;
  identificacao_tipo?: string;
  identificacao?: string;
  numero_tipo?: string;
  numero_info?: string;
  consultor?: string;
    mensagem?: string;
};

type WhatsAppData = {
  sucesso?: boolean;
  numeros: WhatsAppItem[];
  ultimo_id?: number;
  erro?: string;
  mensagem?: string;
};

type Formulario = {
  nome: string;
  numero: string;
  identificacao_tipo: string;
  identificacao: string;
  numero_tipo: string;
  consultor: string;
    mensagem: string;
};

type MonitorResumo = {
  tentativas: number;
  telefones_unicos: number;
  clientes_repetidos: number;
  repeticoes_telefone_lp: number;
  salvos_hyperflow: number;
  unicos_salvos_hyperflow: number;
  repetidos_hyperflow: number;
  total_salvo_hyperflow: number;
  iniciaram_atendimento: number;
  iniciaram_atendimento_percentual: number;
  plano_a: number;
  plano_b: number;
  fallback: number;
  falhas_sem_atendimento: number;
  retrabalhos_pendentes: number;
  rodizio_recuperado: number;
  rodizio_falhou: number;
};

type MonitorEvento = {
  id: number;
  tentativa_id: string;
  criado_em: string;
  telefone: string;
  plano: string | null;
  etapa: string;
  erro: string | null;
  destino_numero: string | null;
  destino_nome: string | null;
  destino_consultor: string | null;
  resultado: string;
  fallback: boolean;
  retrabalho_status: string | null;
  rodizio_recuperado: boolean;
  rodizio_falhou: boolean;
  erro_rodizio: string | null;
};

type MonitorData = {
  sucesso: boolean;
  erro?: string;
  resumo: MonitorResumo;
  eventos: MonitorEvento[];
  falhas: MonitorEvento[];
};

const URL_API = "/api/whatsapps";
const URL_MONITOR = "/api/lp-eventos";

const CONSULTORES = [
  "Ana Carolina",
  "Andressa",
  "Dagna",
  "Erica",
  "Kalyta",
  "Lauandra",
  "Gabriela",
  "Valdenea",
  "Ana Laura",
  "Maria",
  "Raissa",
  "Vinicius",
  "Sthefane",
  "Geral",
];