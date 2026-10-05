"use client";

export default function SettingsHome() {
  return (
    <div className="settings-home">

      <div className="settings-home-header">

        <span>CENTRAL DO SISTEMA</span>

        <h1 style={{ color: "red", fontSize: 60 }}>
  TESTE TAY 123456
</h1>

        <p>
          Escolha um módulo abaixo para começar a configuração do sistema.
        </p>

      </div>

      <div className="settings-home-cards">

        <button className="settings-home-card">
          <div className="emoji">🏦</div>

          <strong>Comercial</strong>

          <span>
            Bancos, Órgãos, Tabelas, Status e Metas.
          </span>
        </button>

        <button className="settings-home-card">
          <div className="emoji">👥</div>

          <strong>Pessoas</strong>

          <span>
            Equipes, Perfis e Permissões.
          </span>
        </button>

        <button className="settings-home-card">
          <div className="emoji">💰</div>

          <strong>Financeiro</strong>

          <span>
            Cadastros financeiros e premiações.
          </span>
        </button>

        <button className="settings-home-card">
          <div className="emoji">⚙️</div>

          <strong>Sistema</strong>

          <span>
            Preferências e configurações gerais.
          </span>
        </button>

        <button className="settings-home-card">
          <div className="emoji">📊</div>

          <strong>Relatórios</strong>

          <span>
            Auditoria e indicadores do sistema.
          </span>
        </button>

      </div>

    </div>
  );
}