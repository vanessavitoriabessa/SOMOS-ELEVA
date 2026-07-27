"use client";

import { useEffect, useMemo, useState } from "react";

type Produto = "Compra de Dívida" | "CLT";

type FaixaPremiacaoConfig = {
  id: string;
  produto: Produto;
  meta: number;
  percentual: number;
  premioFixo: number;
  ativa: boolean;
};

type BonusOperacional = {
  id: string;
  metaEmpresa: number;
  valorBonus: number;
};

type RegraOperacional = {
  id: string;
  nome: string;
  produto: "Compra de Dívida";
  valorPorContrato: number;
  bonus: BonusOperacional[];
  bonusCumulativo: boolean;
  ativo: boolean;
};

type RegraCoordenacao = {
  percentualAbaixoMeta: number;
  percentualAcimaMeta: number;
  metaEquipe: number;
  salarioFixo: number;
  ativa: boolean;
};

type RegraCompetencia = {
  diaLimitePagamento: number;
  criterioBase: "digitacao";
};

type RegraSaque = {
  valorMinimo: number;
  permitirParcial: boolean;
  pixObrigatorio: boolean;
  aprovacaoManual: boolean;
};

export type RegrasPremiacao = {
  versao: number;
  atualizadoEm: string;
  metaMinimaCompra: number;
  metaMinimaClt: number;
  faixas: FaixaPremiacaoConfig[];
  coordenacao: RegraCoordenacao;
  operacionais: RegraOperacional[];
  competencia: RegraCompetencia;
  saque: RegraSaque;
};

const STORAGE_KEY = "somos-eleva-regras-premiacao";

const FAIXAS_COMPRA_PADRAO = [
  [30000, 1.5], [40000, 2], [50000, 2.05], [60000, 2.1],
  [70000, 2.3], [80000, 2.5], [90000, 2.7], [100000, 3],
  [110000, 3], [120000, 3.05], [130000, 3.05], [140000, 3.1],
  [150000, 3.1], [160000, 3.15], [180000, 3.2], [200000, 3.25],
  [220000, 3.3], [240000, 3.35], [260000, 3.4], [280000, 3.45],
  [300000, 3.5], [320000, 3.55], [340000, 3.6], [360000, 3.65],
  [380000, 3.7], [400000, 3.75], [420000, 3.8], [440000, 3.85],
  [460000, 3.9], [480000, 3.95], [500000, 4],
] as const;

const FAIXAS_CLT_PADRAO = [
  [30000, 300], [40000, 400], [50000, 600], [60000, 800],
  [70000, 2000], [80000, 2500], [90000, 2700], [100000, 3500],
  [110000, 3200], [120000, 3400], [130000, 3600], [140000, 3800],
  [150000, 5000],
] as const;

function criarId(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function regrasPremiacaoPadrao(): RegrasPremiacao {
  return {
    versao: 1,
    atualizadoEm: new Date().toISOString(),
    metaMinimaCompra: 30000,
    metaMinimaClt: 30000,
    faixas: [
      ...FAIXAS_COMPRA_PADRAO.map(([meta, percentual], index) => ({
        id: `compra-${index + 1}`,
        produto: "Compra de Dívida" as const,
        meta,
        percentual,
        premioFixo: 0,
        ativa: true,
      })),
      ...FAIXAS_CLT_PADRAO.map(([meta, premioFixo], index) => ({
        id: `clt-${index + 1}`,
        produto: "CLT" as const,
        meta,
        percentual: 0,
        premioFixo,
        ativa: true,
      })),
    ],
    coordenacao: {
      percentualAbaixoMeta: 1,
      percentualAcimaMeta: 2,
      metaEquipe: 300000,
      salarioFixo: 0,
      ativa: true,
    },
    operacionais: [
      {
        id: "operacional-vinicius",
        nome: "Vinicius",
        produto: "Compra de Dívida",
        valorPorContrato: 10,
        bonus: [{ id: "vinicius-1m", metaEmpresa: 1000000, valorBonus: 500 }],
        bonusCumulativo: false,
        ativo: true,
      },
      {
        id: "operacional-sthefane",
        nome: "Sthefane",
        produto: "Compra de Dívida",
        valorPorContrato: 10,
        bonus: [
          { id: "sthefane-500k", metaEmpresa: 500000, valorBonus: 250 },
          { id: "sthefane-1m", metaEmpresa: 1000000, valorBonus: 500 },
        ],
        bonusCumulativo: false,
        ativo: true,
      },
    ],
    competencia: {
      diaLimitePagamento: 19,
      criterioBase: "digitacao",
    },
    saque: {
      valorMinimo: 100,
      permitirParcial: true,
      pixObrigatorio: true,
      aprovacaoManual: true,
    },
  };
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function numero(valor: string) {
  const limpo = String(valor ?? "").replace(/\./g, "").replace(",", ".");
  const convertido = Number(limpo);
  return Number.isFinite(convertido) ? convertido : 0;
}

function perfilEhAdministracao(perfil: string) {
  const texto = String(perfil || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return texto.includes("administrador") || texto.includes("administradora") || texto === "admin";
}

export function carregarRegrasPremiacao(): RegrasPremiacao {
  if (typeof window === "undefined") return regrasPremiacaoPadrao();
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (!salvo) return regrasPremiacaoPadrao();
    const parsed = JSON.parse(salvo) as Partial<RegrasPremiacao>;
    return { ...regrasPremiacaoPadrao(), ...parsed } as RegrasPremiacao;
  } catch {
    return regrasPremiacaoPadrao();
  }
}

export default function RegrasPremiacaoManager() {
  const [regras, setRegras] = useState<RegrasPremiacao>(regrasPremiacaoPadrao());
  const [aba, setAba] = useState<"compra" | "clt" | "coordenacao" | "operacionais" | "competencia" | "saques">("compra");
  const [carregado, setCarregado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [perfil, setPerfil] = useState("");

  useEffect(() => {
    setRegras(carregarRegrasPremiacao());
    setPerfil(localStorage.getItem("somos-eleva-cargo") || localStorage.getItem("somos-eleva-perfil") || "");
    setCarregado(true);
  }, []);

  const faixasCompra = useMemo(
    () => regras.faixas.filter((item) => item.produto === "Compra de Dívida").sort((a, b) => a.meta - b.meta),
    [regras.faixas]
  );

  const faixasClt = useMemo(
    () => regras.faixas.filter((item) => item.produto === "CLT").sort((a, b) => a.meta - b.meta),
    [regras.faixas]
  );

  function salvar() {
    const atualizado: RegrasPremiacao = {
      ...regras,
      versao: (regras.versao || 0) + 1,
      atualizadoEm: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizado));
    setRegras(atualizado);
    setMensagem("Regras salvas com sucesso.");
    window.setTimeout(() => setMensagem(""), 3000);
  }

  function restaurarPadrao() {
    if (!window.confirm("Restaurar todas as regras para o padrão atual da Eleva?")) return;
    const padrao = regrasPremiacaoPadrao();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(padrao));
    setRegras(padrao);
    setMensagem("Regras padrão restauradas.");
  }

  function atualizarFaixa(id: string, campo: keyof FaixaPremiacaoConfig, valor: string | boolean) {
    setRegras((atual) => ({
      ...atual,
      faixas: atual.faixas.map((faixa) =>
        faixa.id === id
          ? { ...faixa, [campo]: typeof valor === "boolean" ? valor : numero(valor) }
          : faixa
      ),
    }));
  }

  function adicionarFaixa(produto: Produto) {
    setRegras((atual) => ({
      ...atual,
      faixas: [
        ...atual.faixas,
        {
          id: criarId(produto === "CLT" ? "clt" : "compra"),
          produto,
          meta: 0,
          percentual: 0,
          premioFixo: 0,
          ativa: true,
        },
      ],
    }));
  }

  function excluirFaixa(id: string) {
    setRegras((atual) => ({ ...atual, faixas: atual.faixas.filter((faixa) => faixa.id !== id) }));
  }

  function atualizarOperacional(id: string, campo: keyof RegraOperacional, valor: string | boolean) {
    setRegras((atual) => ({
      ...atual,
      operacionais: atual.operacionais.map((op) =>
        op.id === id
          ? { ...op, [campo]: typeof valor === "boolean" ? valor : campo === "valorPorContrato" ? numero(valor) : valor }
          : op
      ),
    }));
  }

  function atualizarBonus(operacionalId: string, bonusId: string, campo: keyof BonusOperacional, valor: string) {
    setRegras((atual) => ({
      ...atual,
      operacionais: atual.operacionais.map((op) =>
        op.id === operacionalId
          ? { ...op, bonus: op.bonus.map((b) => (b.id === bonusId ? { ...b, [campo]: numero(valor) } : b)) }
          : op
      ),
    }));
  }

  function adicionarOperacional() {
    setRegras((atual) => ({
      ...atual,
      operacionais: [
        ...atual.operacionais,
        {
          id: criarId("operacional"),
          nome: "Novo operacional",
          produto: "Compra de Dívida",
          valorPorContrato: 10,
          bonus: [],
          bonusCumulativo: false,
          ativo: true,
        },
      ],
    }));
  }

  function adicionarBonus(operacionalId: string) {
    setRegras((atual) => ({
      ...atual,
      operacionais: atual.operacionais.map((op) =>
        op.id === operacionalId
          ? { ...op, bonus: [...op.bonus, { id: criarId("bonus"), metaEmpresa: 0, valorBonus: 0 }] }
          : op
      ),
    }));
  }

  if (!carregado) return null;

  if (!perfilEhAdministracao(perfil)) {
    return (
      <section style={styles.bloqueio}>
        <h2>Acesso restrito</h2>
        <p>Somente a Administradora pode alterar as regras da premiação.</p>
      </section>
    );
  }

  const tabs = [
    ["compra", "Compra de Dívida"], ["clt", "CLT"], ["coordenacao", "Coordenação"],
    ["operacionais", "Operacionais"], ["competencia", "Competência"], ["saques", "Saques"],
  ] as const;

  return (
    <main style={styles.pagina}>
      <header style={styles.cabecalho}>
        <div>
          <span style={styles.selo}>CONFIGURAÇÕES</span>
          <h1 style={styles.titulo}>Regras da Premiação</h1>
          <p style={styles.subtitulo}>Configure metas, faixas, operacionais, competência e saques sem alterar o código.</p>
        </div>
        <div style={styles.acoesTopo}>
          <button type="button" onClick={restaurarPadrao} style={styles.botaoSecundario}>Restaurar padrão</button>
          <button type="button" onClick={salvar} style={styles.botaoPrimario}>Salvar alterações</button>
        </div>
      </header>

      {mensagem && <div style={styles.sucesso}>{mensagem}</div>}

      <nav style={styles.abas}>
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setAba(id)} style={{ ...styles.aba, ...(aba === id ? styles.abaAtiva : {}) }}>{label}</button>
        ))}
      </nav>

      {aba === "compra" && (
        <section style={styles.card}>
          <div style={styles.cardTituloLinha}>
            <div><h2 style={styles.cardTitulo}>Faixas — Compra de Dívida</h2><p style={styles.textoApoio}>A comissão é calculada pelo percentual da maior faixa atingida.</p></div>
            <button type="button" onClick={() => adicionarFaixa("Compra de Dívida")} style={styles.botaoAdicionar}>+ Nova faixa</button>
          </div>
          <label style={styles.campoCompacto}>Meta mínima<input value={regras.metaMinimaCompra} onChange={(e) => setRegras({ ...regras, metaMinimaCompra: numero(e.target.value) })} style={styles.input} /></label>
          <TabelaFaixas faixas={faixasCompra} atualizar={atualizarFaixa} excluir={excluirFaixa} tipo="percentual" />
        </section>
      )}

      {aba === "clt" && (
        <section style={styles.card}>
          <div style={styles.cardTituloLinha}>
            <div><h2 style={styles.cardTitulo}>Faixas — CLT</h2><p style={styles.textoApoio}>Premiação fixa conforme a maior faixa de produção atingida.</p></div>
            <button type="button" onClick={() => adicionarFaixa("CLT")} style={styles.botaoAdicionar}>+ Nova faixa</button>
          </div>
          <label style={styles.campoCompacto}>Meta mínima<input value={regras.metaMinimaClt} onChange={(e) => setRegras({ ...regras, metaMinimaClt: numero(e.target.value) })} style={styles.input} /></label>
          <TabelaFaixas faixas={faixasClt} atualizar={atualizarFaixa} excluir={excluirFaixa} tipo="fixo" />
        </section>
      )}

      {aba === "coordenacao" && (
        <section style={styles.card}>
          <h2 style={styles.cardTitulo}>Regra da Coordenadora</h2>
          <div style={styles.gradeCampos}>
            <Campo label="Meta da equipe" valor={regras.coordenacao.metaEquipe} onChange={(v) => setRegras({ ...regras, coordenacao: { ...regras.coordenacao, metaEquipe: numero(v) } })} />
            <Campo label="% abaixo da meta" valor={regras.coordenacao.percentualAbaixoMeta} onChange={(v) => setRegras({ ...regras, coordenacao: { ...regras.coordenacao, percentualAbaixoMeta: numero(v) } })} />
            <Campo label="% a partir da meta" valor={regras.coordenacao.percentualAcimaMeta} onChange={(v) => setRegras({ ...regras, coordenacao: { ...regras.coordenacao, percentualAcimaMeta: numero(v) } })} />
            <Campo label="Salário fixo (informativo)" valor={regras.coordenacao.salarioFixo} onChange={(v) => setRegras({ ...regras, coordenacao: { ...regras.coordenacao, salarioFixo: numero(v) } })} />
          </div>
          <Toggle label="Regra ativa" checked={regras.coordenacao.ativa} onChange={(v) => setRegras({ ...regras, coordenacao: { ...regras.coordenacao, ativa: v } })} />
        </section>
      )}

      {aba === "operacionais" && (
        <section style={styles.card}>
          <div style={styles.cardTituloLinha}><div><h2 style={styles.cardTitulo}>Operacionais</h2><p style={styles.textoApoio}>Somente contratos pagos de Compra de Dívida entram no cálculo.</p></div><button type="button" onClick={adicionarOperacional} style={styles.botaoAdicionar}>+ Cadastrar operacional</button></div>
          <div style={styles.listaOperacionais}>
            {regras.operacionais.map((op) => (
              <article key={op.id} style={styles.operacionalCard}>
                <div style={styles.gradeCampos}>
                  <label style={styles.label}>Nome<input value={op.nome} onChange={(e) => atualizarOperacional(op.id, "nome", e.target.value)} style={styles.input} /></label>
                  <Campo label="Valor por contrato pago" valor={op.valorPorContrato} onChange={(v) => atualizarOperacional(op.id, "valorPorContrato", v)} />
                </div>
                <div style={styles.linhaToggles}>
                  <Toggle label="Ativo" checked={op.ativo} onChange={(v) => atualizarOperacional(op.id, "ativo", v)} />
                  <Toggle label="Bônus cumulativos" checked={op.bonusCumulativo} onChange={(v) => atualizarOperacional(op.id, "bonusCumulativo", v)} />
                </div>
                <div style={styles.bonusTituloLinha}><strong>Bônus por produção da empresa</strong><button type="button" onClick={() => adicionarBonus(op.id)} style={styles.botaoMini}>+ Bônus</button></div>
                {op.bonus.length === 0 && <p style={styles.textoApoio}>Nenhum bônus cadastrado.</p>}
                {op.bonus.map((bonus) => (
                  <div key={bonus.id} style={styles.linhaBonus}>
                    <Campo label="Meta da empresa" valor={bonus.metaEmpresa} onChange={(v) => atualizarBonus(op.id, bonus.id, "metaEmpresa", v)} />
                    <Campo label="Valor do bônus" valor={bonus.valorBonus} onChange={(v) => atualizarBonus(op.id, bonus.id, "valorBonus", v)} />
                    <button type="button" onClick={() => setRegras((atual) => ({ ...atual, operacionais: atual.operacionais.map((item) => item.id === op.id ? { ...item, bonus: item.bonus.filter((b) => b.id !== bonus.id) } : item) }))} style={styles.botaoExcluir}>Excluir</button>
                  </div>
                ))}
                <div style={styles.resumoOperacional}>{moeda(op.valorPorContrato)} por contrato • {op.bonusCumulativo ? "bônus cumulativos" : "considera somente o maior bônus atingido"}</div>
              </article>
            ))}
          </div>
        </section>
      )}

      {aba === "competencia" && (
        <section style={styles.card}>
          <h2 style={styles.cardTitulo}>Regra da Competência</h2>
          <div style={styles.aviso}>Produção pertence ao mês da digitação. Pagamentos até o dia limite do mês seguinte permanecem na competência original. Depois disso, passam para o mês do pagamento.</div>
          <div style={styles.gradeCampos}>
            <Campo label="Dia limite do mês seguinte" valor={regras.competencia.diaLimitePagamento} onChange={(v) => setRegras({ ...regras, competencia: { ...regras.competencia, diaLimitePagamento: Math.min(28, Math.max(1, numero(v))) } })} />
            <label style={styles.label}>Critério base<select value={regras.competencia.criterioBase} disabled style={styles.input}><option value="digitacao">Data de digitação</option></select></label>
          </div>
        </section>
      )}

      {aba === "saques" && (
        <section style={styles.card}>
          <h2 style={styles.cardTitulo}>Solicitações de Saque</h2>
          <div style={styles.gradeCampos}><Campo label="Valor mínimo" valor={regras.saque.valorMinimo} onChange={(v) => setRegras({ ...regras, saque: { ...regras.saque, valorMinimo: numero(v) } })} /></div>
          <div style={styles.linhaToggles}>
            <Toggle label="Permitir saque parcial" checked={regras.saque.permitirParcial} onChange={(v) => setRegras({ ...regras, saque: { ...regras.saque, permitirParcial: v } })} />
            <Toggle label="PIX obrigatório" checked={regras.saque.pixObrigatorio} onChange={(v) => setRegras({ ...regras, saque: { ...regras.saque, pixObrigatorio: v } })} />
            <Toggle label="Aprovação manual" checked={regras.saque.aprovacaoManual} onChange={(v) => setRegras({ ...regras, saque: { ...regras.saque, aprovacaoManual: v } })} />
          </div>
        </section>
      )}

      <footer style={styles.rodape}>Versão {regras.versao} • Última atualização: {new Date(regras.atualizadoEm).toLocaleString("pt-BR")}</footer>
    </main>
  );
}

function Campo({ label, valor, onChange }: { label: string; valor: number; onChange: (valor: string) => void }) {
  return <label style={styles.label}>{label}<input inputMode="decimal" value={valor} onChange={(e) => onChange(e.target.value)} style={styles.input} /></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (valor: boolean) => void }) {
  return <label style={styles.toggleLinha}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}

function TabelaFaixas({ faixas, atualizar, excluir, tipo }: {
  faixas: FaixaPremiacaoConfig[];
  atualizar: (id: string, campo: keyof FaixaPremiacaoConfig, valor: string | boolean) => void;
  excluir: (id: string) => void;
  tipo: "percentual" | "fixo";
}) {
  return (
    <div style={styles.tabelaWrap}>
      <table style={styles.tabela}>
        <thead><tr><th style={styles.th}>Produção mínima</th><th style={styles.th}>{tipo === "percentual" ? "Percentual" : "Prêmio fixo"}</th><th style={styles.th}>Ativa</th><th style={styles.th}></th></tr></thead>
        <tbody>{faixas.map((faixa) => <tr key={faixa.id}>
          <td style={styles.td}><input value={faixa.meta} onChange={(e) => atualizar(faixa.id, "meta", e.target.value)} style={styles.inputTabela} /></td>
          <td style={styles.td}><input value={tipo === "percentual" ? faixa.percentual : faixa.premioFixo} onChange={(e) => atualizar(faixa.id, tipo === "percentual" ? "percentual" : "premioFixo", e.target.value)} style={styles.inputTabela} /></td>
          <td style={styles.td}><input type="checkbox" checked={faixa.ativa} onChange={(e) => atualizar(faixa.id, "ativa", e.target.checked)} /></td>
          <td style={styles.td}><button type="button" onClick={() => excluir(faixa.id)} style={styles.botaoExcluir}>Excluir</button></td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pagina: { padding: 28, maxWidth: 1280, margin: "0 auto", color: "#172033" },
  cabecalho: { display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", marginBottom: 22 },
  selo: { fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: "#7c3aed" },
  titulo: { fontSize: 30, lineHeight: 1.1, margin: "7px 0 8px" },
  subtitulo: { margin: 0, color: "#64748b" },
  acoesTopo: { display: "flex", gap: 10, flexWrap: "wrap" },
  botaoPrimario: { border: 0, borderRadius: 10, padding: "11px 17px", background: "#7c3aed", color: "white", fontWeight: 750, cursor: "pointer" },
  botaoSecundario: { border: "1px solid #d8dee9", borderRadius: 10, padding: "11px 17px", background: "white", color: "#334155", fontWeight: 700, cursor: "pointer" },
  sucesso: { marginBottom: 16, padding: "12px 15px", borderRadius: 10, background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", fontWeight: 700 },
  abas: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 },
  aba: { border: "1px solid #e2e8f0", borderRadius: 999, padding: "9px 14px", background: "white", cursor: "pointer", color: "#475569", fontWeight: 650 },
  abaAtiva: { background: "#ede9fe", borderColor: "#c4b5fd", color: "#6d28d9" },
  card: { background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: 22, boxShadow: "0 8px 30px rgba(15,23,42,.05)" },
  cardTituloLinha: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16 },
  cardTitulo: { fontSize: 20, margin: "0 0 5px" },
  textoApoio: { margin: 0, color: "#64748b", fontSize: 14 },
  botaoAdicionar: { border: 0, borderRadius: 9, padding: "10px 14px", background: "#f1f5f9", color: "#334155", fontWeight: 750, cursor: "pointer" },
  campoCompacto: { display: "grid", gap: 6, maxWidth: 260, fontSize: 13, fontWeight: 700, marginBottom: 18 },
  gradeCampos: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 14 },
  label: { display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" },
  input: { width: "100%", boxSizing: "border-box", border: "1px solid #d8dee9", borderRadius: 9, padding: "10px 11px", fontSize: 14, background: "white" },
  tabelaWrap: { overflowX: "auto" },
  tabela: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "11px 9px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: .5 },
  td: { padding: 8, borderBottom: "1px solid #f1f5f9" },
  inputTabela: { width: "100%", minWidth: 120, boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 10px" },
  botaoExcluir: { border: 0, borderRadius: 8, padding: "8px 10px", background: "#fff1f2", color: "#be123c", fontWeight: 700, cursor: "pointer" },
  toggleLinha: { display: "flex", alignItems: "center", gap: 8, fontWeight: 650, color: "#334155" },
  linhaToggles: { display: "flex", flexWrap: "wrap", gap: 22, marginTop: 18 },
  listaOperacionais: { display: "grid", gap: 16 },
  operacionalCard: { border: "1px solid #e2e8f0", borderRadius: 13, padding: 17, background: "#fcfcfd" },
  bonusTituloLinha: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 },
  botaoMini: { border: "1px solid #d8dee9", borderRadius: 8, padding: "7px 10px", background: "white", cursor: "pointer", fontWeight: 700 },
  linhaBonus: { display: "grid", gridTemplateColumns: "repeat(2,minmax(180px,1fr)) auto", gap: 12, alignItems: "end", marginBottom: 10 },
  resumoOperacional: { marginTop: 14, borderRadius: 9, padding: 11, background: "#f5f3ff", color: "#6d28d9", fontSize: 13, fontWeight: 700 },
  aviso: { padding: 14, borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", lineHeight: 1.5 },
  rodape: { marginTop: 14, textAlign: "right", color: "#94a3b8", fontSize: 12 },
  bloqueio: { maxWidth: 620, margin: "60px auto", padding: 28, border: "1px solid #fecaca", borderRadius: 14, background: "#fff7f7", color: "#991b1b" },
};