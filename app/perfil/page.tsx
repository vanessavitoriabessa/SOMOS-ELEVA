"use client";
import AppShell from "@/components/AppShell";
import "./perfil.css";

export default function PerfilPage(){
 return(
  <AppShell title="Meu Perfil" subtitle="">
   <div className="perfil-page">
    <section className="perfil-header">
      <img src="/avatar.png" className="avatar" alt="Avatar"/>
      <div>
        <h1>Admin</h1>
        <p>Administradora</p>
        <span>Matrícula: 0001</span>
      </div>
    </section>

    <section className="cards">
      <div className="card"><h3>Produção</h3><strong>R$ 0,00</strong></div>
      <div className="card"><h3>Propostas</h3><strong>0</strong></div>
      <div className="card"><h3>Pagas</h3><strong>0</strong></div>
      <div className="card"><h3>Meta</h3><strong>0%</strong></div>
    </section>

    <div className="placeholder">
      Próximas etapas: gráfico, ranking, últimas propostas e resumo de pontos.
    </div>
   </div>
  </AppShell>
 );
}
