"use client";

import { useState } from "react";

import "./configuracoes.css";

import SettingsTopNavigation from "./SettingsTopNavigation";

import SettingsHome from "./SettingsHome";
import ComercialPanel from "./ComercialPanel";
import PessoasPanel from "./PessoasPanel";
import FinanceiroPanel from "./FinanceiroPanel";
import SistemaPanel from "./SistemaPanel";

export type Grupo =
  | "geral"
  | "comercial"
  | "pessoas"
  | "financeiro"
  | "sistema";

export default function SettingsManager() {

  const [grupo, setGrupo] = useState<Grupo>("geral");

  return (

    <div className="settings-page">

      <SettingsTopNavigation
        grupo={grupo}
        onChange={setGrupo}
      />

      {grupo === "geral" && (
        <SettingsHome />
      )}

      {grupo === "comercial" && (
        <ComercialPanel />
      )}

      {grupo === "pessoas" && (
        <PessoasPanel />
      )}

      {grupo === "financeiro" && (
        <FinanceiroPanel />
      )}

      {grupo === "sistema" && (
        <SistemaPanel />
      )}

    </div>

  );

}