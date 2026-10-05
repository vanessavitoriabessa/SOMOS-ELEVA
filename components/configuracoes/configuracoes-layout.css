"use client";

import "./configuracoes-layout.css";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  menu: ReactNode;
  submenu?: ReactNode;
};

export default function ConfiguracoesLayout({
  children,
  menu,
  submenu,
}: Props) {
  return (
    <div className="cfg">

      <div className="cfg-header">

        <div>

          <span className="cfg-small">
            CENTRAL DO SISTEMA
          </span>

          <h1>
            Configurações
          </h1>

          <p>
            Gerencie bancos, tabelas, equipes, permissões e parâmetros do sistema.
          </p>

        </div>

      </div>

      <div className="cfg-menu">

        {menu}

      </div>

      {submenu && (

        <div className="cfg-submenu">

          {submenu}

        </div>

      )}

      <div className="cfg-content">

        {children}

      </div>

    </div>
  );
}