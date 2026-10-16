"use client";
// ELEVA | LUCRO POR OPERADOR | 16/10/2026 | ARQUIVO COMPLETO

import { useEffect, useMemo, useRef, useState } from "react";
import type { ResumoCustoPa } from "@/lib/financeiro/custo-pa";

export type PropostaLucroOperador = {
  chave: string;
  propostaId: string;
  produto: "Compra de Dívida" | "CLT";
  cliente: string;
  banco: string;
  tabela: string;
  responsavel: string;
  dataDigitacao: string;
  dataPagamento: string;
  status: string;
  comissao: number | null;
  considerada: boolean;
  motivo: string;
};

export type LinhaLucroOperador = {
  id: string;
  nome: string;
  perfil: string;
  coletivo: boolean;
  lucroBruto: number;
  comissoes: { chave: string; valor: number }[];
  propostas: PropostaLucroOperador[];
  alerta: string;
};

type Props = {
  referencia: string;
  onReferenciaChange: (referencia: string) => void;
  linhas: LinhaLucroOperador[];
  custo: ResumoCustoPa | null;
  carregando: boolean;
  carregandoCusto: boolean;
  erroDados: string | null;
  erroCusto: string | null;
  permitido: boolean;
  processando: boolean;
  onAtualizar: () => void | Promise<void>;
};

const TODOS = "__TODOS_OPERADORES__";
const TAMANHO_PAGINA = 50;
const moeda = (valor: number | null) =>
  valor === null || !Number.isFinite(valor)
    ? "—"
    : valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const textoNormalizado = (valor: string) => valor.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const referenciaValida = (valor: string) => /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(valor);

export function moverMesLucro(referencia: string, deslocamento: number): string {
  if (!referenciaValida(referencia) || !Number.isInteger(deslocamento)) return referencia;
  const [ano, mes] = referencia.split("-").map(Number);
  const indice = ano * 12 + mes - 1 + deslocamento;
  const anoNovo = Math.floor(indice / 12);
  const mesNovo = indice % 12 + 1;
  if (anoNovo < 1000 || anoNovo > 9999) return referencia;
  return `${anoNovo}-${String(mesNovo).padStart(2, "0")}`;
}

const nomeMes = (referencia: string) => {
  if (!referenciaValida(referencia)) return "Referência não informada";
  const [ano, mes] = referencia.split("-").map(Number);
  return new Date(ano, mes - 1, 1, 12).toLocaleDateString("pt-BR", {
    month: "long", year: "numeric",
  });
};

const dataPt = (valor: string) => {
  if (!valor) return "—";
  const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = valor.match(/\d{2}\/\d{2}\/\d{4}/);
  return br ? br[0] : valor;
};

/** Consolida sem somar a mesma proposta novamente em apurações coletivas. */
export function consolidarLucroOperadores(
  linhas: LinhaLucroOperador[],
  custoUnitario: number | null,
  individual: boolean,
) {
  const porProposta = new Map<string, number>();
  let repetidas = 0;
  let erro: string | null = null;
  for (const linha of linhas) {
    if (!Number.isFinite(linha.lucroBruto)) erro = "Comissão inválida na apuração. Confira Minha Premiação.";
    for (const item of linha.comissoes) {
      if (!Number.isFinite(item.valor)) erro = "Uma proposta possui comissão inválida.";
      if (porProposta.has(item.chave)) {
        repetidas += 1;
        if (Math.abs((porProposta.get(item.chave) ?? 0) - item.valor) > 0.000001) {
          erro = "A mesma proposta possui comissões divergentes entre as apurações. Confira antes de usar o total.";
        }
      } else {
        porProposta.set(item.chave, item.valor);
      }
    }
  }
  const soma = individual && linhas.length === 1
    ? linhas[0].lucroBruto
    : [...porProposta.values()].reduce((total, valor) => total + valor, 0);
  const custo = custoUnitario !== null && Number.isFinite(custoUnitario) && custoUnitario >= 0
    ? custoUnitario * linhas.length : null;
  const bruto = erro || !Number.isFinite(soma) ? null : soma;
  return {
    bruto,
    custo,
    liquido: bruto !== null && custo !== null ? bruto - custo : null,
    quantidade: linhas.length,
    repetidas,
    erro,
  };
}

export default function LucroPorOperador(props: Props) {
  const {
    referencia, onReferenciaChange, linhas, custo, carregando, carregandoCusto,
    erroDados, erroCusto, permitido, processando, onAtualizar,
  } = props;
  const [operadorId, setOperadorId] = useState(TODOS);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [buscaProposta, setBuscaProposta] = useState("");
  const [situacao, setSituacao] = useState<"todas" | "consideradas" | "fora">("todas");
  const [pagina, setPagina] = useState(1);
  const dialogo = useRef<HTMLDialogElement | null>(null);

  const temDados = permitido && !carregando && !erroDados && !erroCusto && !carregandoCusto;
  const fonteCustoValida = custo?.referencia === referencia && Number.isFinite(custo.custoPa);
  const custoUnitario = fonteCustoValida && !erroCusto ? custo!.custoPa : null;
  const podeMostrar = temDados && custoUnitario !== null;
  const filtradas = useMemo(() => linhas.filter((linha) =>
    operadorId === TODOS || linha.id === operadorId), [linhas, operadorId]);
  const totais = useMemo(() => consolidarLucroOperadores(
    filtradas, custoUnitario, operadorId !== TODOS,
  ), [filtradas, custoUnitario, operadorId]);
  const detalhe = linhas.find((linha) => linha.id === detalheId) || null;
  // Auditoria do total: a soma precisa fechar com as propostas efetivamente incluídas.
  const conferenciaDetalhe = useMemo(() => {
    if (!detalhe) return null;
    const consideradas = detalhe.propostas.filter((p) => p.considerada);
    const soma = consideradas.reduce((total, p) => total + Number(p.comissao ?? 0), 0);
    const semPagamento = consideradas.filter((p) =>
      !p.dataPagamento || textoNormalizado(p.status) !== "pago");
    const propriasDeOutroResponsavel = !detalhe.coletivo
      ? consideradas.filter((p) => textoNormalizado(p.responsavel) !== textoNormalizado(detalhe.nome))
      : [];
    const diverge = Math.abs(soma - detalhe.lucroBruto) > 0.015;
    return { soma, quantidade: consideradas.length, diverge,
      semPagamento: semPagamento.length, outrosResponsaveis: propriasDeOutroResponsavel.length };
  }, [detalhe]);
  const propostasFiltradas = useMemo(() => {
    const termo = textoNormalizado(buscaProposta);
    return (detalhe?.propostas || []).filter((proposta) => {
      if (situacao === "consideradas" && !proposta.considerada) return false;
      if (situacao === "fora" && proposta.considerada) return false;
      return !termo || textoNormalizado([
        proposta.cliente, proposta.propostaId, proposta.produto, proposta.banco,
        proposta.tabela, proposta.responsavel, proposta.status,
      ].join(" ")).includes(termo);
    });
  }, [detalhe, buscaProposta, situacao]);
  const numeroPaginas = Math.max(1, Math.ceil(propostasFiltradas.length / TAMANHO_PAGINA));
  const paginaAtual = Math.min(pagina, numeroPaginas);
  const propostasDaPagina = propostasFiltradas.slice(
    (paginaAtual - 1) * TAMANHO_PAGINA, paginaAtual * TAMANHO_PAGINA,
  );

  useEffect(() => {
    if (podeMostrar && operadorId !== TODOS && !linhas.some((linha) => linha.id === operadorId)) {
      setOperadorId(TODOS);
    }
  }, [linhas, operadorId, podeMostrar]);

  useEffect(() => { setDetalheId(null); }, [referencia, operadorId]);
  useEffect(() => { setBuscaProposta(""); setSituacao("todas"); setPagina(1); }, [detalheId]);
  useEffect(() => { setPagina(1); }, [buscaProposta, situacao]);
  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    if (detalhe && !elemento.open) elemento.showModal();
    if (!detalhe && elemento.open) elemento.close();
  }, [detalhe]);
  useEffect(() => {
    if (!detalheId) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = anterior; };
  }, [detalheId]);

  const resultadoClasse = (valor: number | null) => valor !== null && valor < 0 ? "negativo" : "positivo";
  const visivel = (valor: number | null) => podeMostrar ? moeda(valor) : "—";
  const mudarReferencia = (valor: string) => { if (referenciaValida(valor)) onReferenciaChange(valor); };
  const esperando = carregando || carregandoCusto;
  const erro = !permitido && !carregando ? "Seu perfil não possui acesso à consulta financeira desta tela."
    : erroDados || erroCusto || (temDados ? totais.erro : null);

  return (
    <div className="lucro-operador-page" aria-busy={esperando}>
      <header className="lucro-cabecalho lucro-box">
        <div className="lucro-titulo">
          <span className="lucro-kicker">CENTRO FINANCEIRO</span>
          <h2>Lucro por Operador</h2>
          <p>Comissão empresa — bruto de Minha Premiação, menos o Custo PA da mesma referência.</p>
        </div>
        <div className="lucro-filtros">
          <label className="lucro-nome-filtro">
            <span>OPERADOR(A)</span>
            <select value={operadorId} onChange={(evento) => setOperadorId(evento.target.value)}>
              <option value={TODOS}>Todos os operadores</option>
              {linhas.map((linha) => <option key={linha.id} value={linha.id}>{linha.nome}</option>)}
            </select>
          </label>
          <div className="lucro-mes-filtro">
            <span>DATA REFERÊNCIA</span>
            <div className="lucro-navegacao-mes">
              <button type="button" title="Mês anterior" aria-label="Mês anterior"
                disabled={referencia === "1000-01"}
                onClick={() => mudarReferencia(moverMesLucro(referencia, -1))}>‹</button>
              <input type="month" aria-label="Data referência" min="1000-01" max="9999-12"
                value={referencia} onChange={(evento) => mudarReferencia(evento.target.value)} />
              <button type="button" title="Próximo mês" aria-label="Próximo mês"
                disabled={referencia === "9999-12"}
                onClick={() => mudarReferencia(moverMesLucro(referencia, 1))}>›</button>
            </div>
          </div>
          <button className="lucro-atualizar" type="button" onClick={() => void onAtualizar()}
            disabled={esperando || processando}>↻ {esperando || processando ? "Atualizando..." : "Atualizar"}</button>
        </div>
      </header>

      <div className="lucro-referencia-info">
        <strong>{nomeMes(referencia)}</strong>
        <span>{operadorId === TODOS ? "Todos os operadores do rateio do Financeiro" : filtradas[0]?.nome || "Operador selecionado"}</span>
        <span>Valores consultados, sem lançamento manual de lucro.</span>
      </div>

      {erro && <div className="lucro-erro" role="alert"><strong>Resultado indisponível.</strong> {erro}</div>}
      {esperando && <div className="lucro-carregando" role="status">Consultando Minha Premiação e Custo por Operador para {nomeMes(referencia)}...</div>}

      <section className="lucro-cards" aria-label="Resultado financeiro por operador">
        <article className="lucro-card lucro-bruto">
          <span>LUCRO POR OPERADOR</span>
          <strong>{visivel(totais.bruto)}</strong>
          <small>Fonte: Minha Premiação · Comissão empresa — bruto</small>
          <footer>{operadorId === TODOS ? "Comissão consolidada dos operadores selecionados" : "Comissão bruta da pessoa selecionada"}</footer>
        </article>
        <article className="lucro-card lucro-custo">
          <span>CUSTO POR OPERADOR</span>
          <strong>{visivel(totais.custo)}</strong>
          <small>Fonte: Financeiro · Custo por Operador–PA</small>
          <footer>{podeMostrar ? `${totais.quantidade} operador(es) × ${moeda(custoUnitario)} na referência` : "Aguardando o custo da referência selecionada"}</footer>
        </article>
        <article className={`lucro-card lucro-liquido ${resultadoClasse(totais.liquido)}`}>
          <span>LUCRO LÍQUIDO POR OPERADOR</span>
          <strong>{visivel(totais.liquido)}</strong>
          <small>Comissão bruta − custo dos operadores</small>
          <footer>{podeMostrar && totais.liquido !== null && totais.liquido < 0 ? "Prejuízo na referência: o resultado não é limitado a zero." : "Custo descontado uma única vez por operador no mês."}</footer>
        </article>
      </section>

      {podeMostrar && totais.repetidas > 0 && (
        <div className="lucro-aviso" role="status">
          Há propostas compartilhadas entre apurações coletivas. No total de <b>Todos</b>, cada proposta
          é somada uma única vez; as linhas individuais preservam o card de Minha Premiação.
        </div>
      )}

      <section className="lucro-box lucro-listagem">
        <div className="lucro-listagem-cabecalho">
          <div><span className="lucro-kicker">CONFERÊNCIA INDIVIDUAL</span><h3>Resultado de cada operador</h3></div>
          <span className="lucro-contador">{podeMostrar ? filtradas.length : "—"} operador(es)</span>
        </div>
        <p className="lucro-explicacao">A lista usa os consultores/vendedores ativos que compõem o rateio do Financeiro.
          O botão Ver propostas mostra as propostas da referência e identifica o que entrou no cálculo.</p>
        <div className="lucro-tabela-rolagem">
          <table className="lucro-tabela">
            <thead><tr><th>Operador(a)</th><th>Lucro por operador</th><th>Custo por operador</th><th>Lucro líquido</th><th>Conferência</th></tr></thead>
            <tbody>
              {!podeMostrar ? <tr><td colSpan={5} className="lucro-vazio">{erro ? "Os valores não serão apresentados como zero enquanto a consulta estiver indisponível." : "Aguardando as duas fontes na mesma referência..."}</td></tr>
                : filtradas.length === 0 ? <tr><td colSpan={5} className="lucro-vazio">Nenhum operador encontrado para este filtro.</td></tr>
                : filtradas.map((linha) => {
                  const liquido = custoUnitario === null ? null : linha.lucroBruto - custoUnitario;
                  const propostasConsideradas = linha.propostas.filter((p) => p.considerada).length;
                  return (
                    <tr key={linha.id}>
                      <td className="lucro-nome"><strong>{linha.nome}</strong><small>{propostasConsideradas} proposta(s) na comissão · {linha.propostas.length} para conferir</small>
                        {linha.alerta && <small className="lucro-alerta-linha">{linha.alerta}</small>}</td>
                      <td>{moeda(linha.lucroBruto)}</td><td>{moeda(custoUnitario)}</td>
                      <td className={resultadoClasse(liquido)}><b>{moeda(liquido)}</b><small>{liquido !== null && liquido < 0 ? "Prejuízo" : "Resultado após Custo PA"}</small></td>
                      <td><button type="button" className="lucro-ver-propostas" onClick={() => setDetalheId(linha.id)}>Ver propostas</button></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="lucro-nota-fonte">
          <b>Mesma apuração de Minha Premiação.</b> Esta tela não calcula uma comissão nova a partir do valor liberado,
          da parcela ou de outra tabela. As propostas CLT podem aparecer na conferência sem somar ao card de
          comissão bruta, conforme a apuração atualmente cadastrada. Os totais são calculados antes do arredondamento.
        </div>
      </section>

      <dialog ref={dialogo} className="lucro-dialogo" aria-labelledby="lucro-detalhe-titulo"
        onCancel={() => setDetalheId(null)} onClose={() => setDetalheId(null)}
        onClick={(evento) => { if (evento.target === evento.currentTarget) setDetalheId(null); }}>
        <div className="lucro-dialogo-conteudo">
          <header className="lucro-dialogo-cabecalho">
            <div><span className="lucro-kicker">PROPOSTAS DO OPERADOR</span><h3 id="lucro-detalhe-titulo">{detalhe?.nome || "Propostas"}</h3><p>{nomeMes(referencia)} · conferência da composição</p></div>
            <button type="button" autoFocus aria-label="Fechar propostas" onClick={() => setDetalheId(null)} className="lucro-fechar">×</button>
          </header>
          {detalhe && <>
            <div className="lucro-detalhe-resumo">
              <div><span>Comissão empresa — bruto</span><b>{podeMostrar ? moeda(detalhe.lucroBruto) : "—"}</b></div>
              <div><span>Custo PA · uma vez no mês</span><b>{podeMostrar ? moeda(custoUnitario) : "—"}</b></div>
              <div><span>Lucro líquido</span><b>{podeMostrar && custoUnitario !== null ? moeda(detalhe.lucroBruto - custoUnitario) : "—"}</b></div>
            </div>
            <p className="lucro-detalhe-nota">Somente propostas com status PAGO, data válida de pagamento e elegíveis à referência compõem a comissão. As outras aparecem para conferência. O Custo PA é descontado uma única vez no mês.</p>
            {conferenciaDetalhe && <div className={conferenciaDetalhe.diverge || conferenciaDetalhe.semPagamento || conferenciaDetalhe.outrosResponsaveis ? "lucro-erro" : "lucro-auditoria-ok"} role="status">
              <strong>Conferência das vendas: {conferenciaDetalhe.quantidade} proposta(s) paga(s) considerada(s) · {moeda(conferenciaDetalhe.soma)}.</strong>
              {conferenciaDetalhe.diverge && <span> Divergência: a soma das propostas não corresponde ao valor do card. Não considere o total validado até corrigir.</span>}
              {conferenciaDetalhe.semPagamento > 0 && <span> {conferenciaDetalhe.semPagamento} proposta(s) sem comprovação de status PAGO e data de pagamento.</span>}
              {conferenciaDetalhe.outrosResponsaveis > 0 && <span> {conferenciaDetalhe.outrosResponsaveis} proposta(s) atribuída(s) a outro nome: confira a responsabilidade.</span>}
              {!conferenciaDetalhe.diverge && !conferenciaDetalhe.semPagamento && !conferenciaDetalhe.outrosResponsaveis && <span> A soma fecha com o valor mostrado, conforme os dados retornados pelo sistema. Isso não substitui a conferência bancária.</span>}
            </div>}
            <div className="lucro-propostas-filtros">
              <label><span>BUSCAR PROPOSTA</span><input type="search" value={buscaProposta}
                onChange={(e) => setBuscaProposta(e.target.value)} placeholder="Cliente, proposta, banco ou tabela..." /></label>
              <label><span>PARTICIPAÇÃO NO CÁLCULO</span><select value={situacao}
                onChange={(e) => setSituacao(e.target.value as "todas" | "consideradas" | "fora")}>
                <option value="todas">Todas as propostas</option><option value="consideradas">Entram na comissão</option><option value="fora">Não entram na comissão</option>
              </select></label>
            </div>
            {esperando ? <div className="lucro-vazio" role="status">Atualizando a conferência...</div> : erro ?
              <div className="lucro-erro" role="alert">Não foi possível atualizar a conferência: {erro}</div> :
              <div className="lucro-tabela-rolagem lucro-tabela-detalhe">
                <table className="lucro-tabela"><thead><tr>
                  <th>Cliente / proposta</th><th>Produto / banco</th><th>Tabela</th><th>Digitação</th><th>Pagamento cliente</th><th>Status</th><th>Comissão da proposta</th><th>Entra no cálculo?</th>
                </tr></thead><tbody>
                  {!propostasDaPagina.length ? <tr><td colSpan={8} className="lucro-vazio">Nenhuma proposta para este filtro.</td></tr> : propostasDaPagina.map((p) => (
                    <tr key={p.chave}>
                      <td className="lucro-cliente"><strong>{p.cliente || "Cliente não informado"}</strong><small>{p.propostaId}</small>{detalhe.coletivo && <small>Responsável: {p.responsavel}</small>}</td>
                      <td>{p.produto}<small>{p.banco || "Banco não informado"}</small></td>
                      <td className="lucro-texto-longo">{p.tabela || "Sem tabela informada"}</td>
                      <td>{dataPt(p.dataDigitacao)}</td><td>{dataPt(p.dataPagamento)}</td><td>{p.status || "Não informado"}</td>
                      <td>{moeda(p.comissao)}{!p.considerada && <small>Não somada ao resultado</small>}</td>
                      <td className="lucro-motivo"><span className={p.considerada ? "lucro-badge-sim" : "lucro-badge-nao"}>{p.considerada ? "Sim" : "Não"}</span><small>{p.motivo}</small></td>
                    </tr>
                  ))}
                </tbody></table>
              </div>}
            <footer className="lucro-paginacao">
              <span>{propostasFiltradas.length} proposta(s) · página {paginaAtual} de {numeroPaginas}</span>
              <div><button type="button" disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)}>Anterior</button>
                <button type="button" disabled={paginaAtual >= numeroPaginas} onClick={() => setPagina(paginaAtual + 1)}>Próxima</button></div>
            </footer>
          </>}
        </div>
      </dialog>

      <style jsx>{`
        .lucro-operador-page { display:grid;grid-template-columns:minmax(0,1fr);min-width:0;gap:18px;color:#13325b;font-family:inherit; }
        .lucro-operador-page * { box-sizing:border-box; }
        .lucro-box { min-width:0;background:#fff;border:1px solid #dce5f2;border-radius:18px;padding:24px; }
        .lucro-cabecalho { display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:22px; }
        .lucro-titulo { min-width:0;flex:1 1 310px; }
        .lucro-kicker { display:block;font-size:11px;font-weight:900;letter-spacing:.11em;color:#1764e9; }
        .lucro-titulo h2 { font-size:28px;line-height:1.15;margin:8px 0; }
        .lucro-titulo p { color:#687c96;font-size:13px;line-height:1.6;margin:0;max-width:620px; }
        .lucro-filtros { display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap; }
        .lucro-filtros label,.lucro-mes-filtro,.lucro-propostas-filtros label { display:grid;gap:7px; }
        .lucro-filtros label>span,.lucro-mes-filtro>span,.lucro-propostas-filtros label>span { font-size:10px;font-weight:900;letter-spacing:.04em; }
        .lucro-filtros select,.lucro-filtros input,.lucro-propostas-filtros input,.lucro-propostas-filtros select { height:44px;border:1px solid #cbd9ed;border-radius:10px;background:#fff;color:#193b68;font-family:inherit;font-size:13px;padding:0 12px;max-width:100%; }
        .lucro-nome-filtro select { width:260px; }
        .lucro-navegacao-mes { display:flex;gap:6px; }
        .lucro-navegacao-mes input { width:174px; }
        .lucro-operador-page button { font-family:inherit;cursor:pointer; }
        .lucro-navegacao-mes button { width:34px;height:44px;border:1px solid #cbd9ed;border-radius:10px;background:#fff;color:#1764e9;font-size:24px; }
        .lucro-atualizar { background:#1764e9;color:white;border:0;border-radius:10px;padding:0 18px;height:44px;font-weight:800; }
        .lucro-operador-page button:disabled { opacity:.5;cursor:not-allowed; }
        .lucro-operador-page button:focus-visible,.lucro-operador-page select:focus-visible,.lucro-operador-page input:focus-visible { outline:3px solid #ff9b50;outline-offset:2px; }
        .lucro-referencia-info { display:flex;gap:10px 18px;align-items:center;flex-wrap:wrap;font-size:12px;padding:0 3px;color:#607696; }
        .lucro-referencia-info strong { color:#163761;text-transform:capitalize; }
        .lucro-cards { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px; }
        .lucro-card { background:#fff;border:1px solid #dbe6f7;border-top:4px solid #2371f1;border-radius:16px;padding:23px;min-width:0;box-shadow:0 4px 14px rgba(19,50,91,.035); }
        .lucro-card>span { display:block;font-size:11px;letter-spacing:.045em;font-weight:900;line-height:1.5; }
        .lucro-card>strong { display:block;font-size:clamp(24px,2.1vw,34px);margin:12px 0;line-height:1.15;overflow-wrap:anywhere; }
        .lucro-card>small { display:block;font-size:11px;color:#617692;line-height:1.55; }
        .lucro-card>footer { margin-top:16px;padding-top:12px;border-top:1px solid #e3eaf4;font-size:11px;color:#687d96;line-height:1.5; }
        .lucro-custo { border-top-color:#f38d2c;background:#fffaf4; }
        .lucro-liquido.positivo { border-top-color:#149665;background:#f4fcf8; }
        .lucro-liquido.negativo { border-top-color:#d73946;background:#fff7f7; }
        .positivo>strong,td.positivo>b { color:#078353; }
        .negativo>strong,td.negativo>b { color:#c92b3d; }
        .lucro-listagem-cabecalho { display:flex;justify-content:space-between;align-items:center;gap:18px; }
        .lucro-listagem h3 { margin:7px 0;font-size:23px; }
        .lucro-contador { padding:9px 13px;background:#edf4ff;border-radius:10px;font-size:12px;font-weight:800;color:#1764e9;white-space:nowrap; }
        .lucro-explicacao { font-size:12px;color:#687d96;line-height:1.6;margin:5px 0 20px; }
        .lucro-tabela-rolagem { width:100%;overflow:auto; }
        .lucro-tabela { border-collapse:collapse;width:100%;min-width:860px; }
        .lucro-tabela th { font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:#6a7e9b;background:#f7f9fd;text-align:left;padding:14px 12px;border-bottom:1px solid #dce5f2;white-space:normal; }
        .lucro-tabela td { padding:17px 12px;border-bottom:1px solid #e9eef6;font-size:14px;vertical-align:middle; }
        .lucro-tabela td:not(:first-child) { font-variant-numeric:tabular-nums; }
        .lucro-tabela small { display:block;font-size:11px;color:#6c809d;line-height:1.5;font-weight:400;margin-top:5px;white-space:normal; }
        .lucro-nome { min-width:250px;max-width:360px; }
        .lucro-nome>strong { display:block;font-size:16px;line-height:1.4;white-space:normal;overflow-wrap:anywhere; }
        .lucro-tabela .lucro-alerta-linha { color:#a56514; }
        .lucro-ver-propostas { white-space:nowrap;border:1px solid #bfd3f4;background:#eff5ff;color:#125adb;border-radius:9px;min-height:38px;padding:0 12px;font-size:12px;font-weight:800; }
        .lucro-ver-propostas:hover { background:#1764e9;color:#fff; }
        .lucro-nota-fonte { font-size:11px;line-height:1.7;color:#6b7e97;background:#f7f9fc;border-radius:10px;padding:14px;margin-top:16px; }
        .lucro-erro,.lucro-aviso,.lucro-carregando { border-radius:12px;padding:14px 18px;font-size:13px;line-height:1.6; }
        .lucro-erro { color:#982d3b;background:#fff2f3;border:1px solid #f0c6cc; }
        .lucro-aviso { color:#8c5919;background:#fff8e8;border:1px solid #f1d7aa; }
        .lucro-carregando { color:#1955a8;background:#eef5ff;border:1px solid #cfe0fa; }
        .lucro-vazio { padding:32px!important;text-align:center;color:#72839a;font-size:13px; }
        .lucro-dialogo { position:fixed;inset:0;margin:auto;box-sizing:border-box;border:1px solid #dce5f2;border-radius:18px;padding:0;width:min(1150px,calc(100vw - 40px));max-width:calc(100vw - 40px);height:min(790px,calc(100dvh - 40px));max-height:calc(100dvh - 40px);overflow:hidden;color:#13325b;background:#fff;box-shadow:0 24px 100px rgba(10,33,71,.25); }
        .lucro-dialogo::backdrop { background:rgba(8,27,60,.55); }
        .lucro-auditoria-ok { color:#165c3a;background:#eff9f2;border:1px solid #ccebd8;border-radius:10px;padding:10px 14px;font-size:12px;line-height:1.45; }
        .lucro-auditoria-ok span,.lucro-erro span { display:block;margin-top:3px; }
        .lucro-dialogo .lucro-detalhe-resumo,.lucro-dialogo .lucro-detalhe-nota,.lucro-dialogo .lucro-propostas-filtros { flex:0 0 auto; }
        .lucro-dialogo-conteudo { display:flex;flex-direction:column;box-sizing:border-box;height:100%;min-height:0;overflow:hidden;padding:20px; }
        .lucro-dialogo-cabecalho { flex:0 0 auto;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:18px;border-bottom:1px solid #e4ebf6; }
        .lucro-dialogo-cabecalho h3 { margin:7px 0;font-size:25px;overflow-wrap:anywhere; }
        .lucro-dialogo-cabecalho p { margin:0;font-size:13px;color:#6b809c;text-transform:capitalize; }
        .lucro-fechar { flex:0 0 36px;height:36px;font-size:24px;border:0;border-radius:10px;background:#eef3fa;color:#173c6c; }
        .lucro-detalhe-resumo { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0 12px; }
        .lucro-detalhe-resumo>div { padding:14px;background:#f6f9fe;border:1px solid #e0e8f5;border-radius:12px; }
        .lucro-detalhe-resumo span { display:block;font-size:11px;color:#697e99; }
        .lucro-detalhe-resumo b { display:block;margin-top:7px;font-size:22px; }
        .lucro-detalhe-nota { font-size:12px;line-height:1.6;color:#6a7e98; }
        .lucro-propostas-filtros { display:flex;gap:16px;flex-wrap:wrap;margin:18px 0; }
        .lucro-propostas-filtros label:first-child { flex:1 1 280px; }
        .lucro-propostas-filtros label:last-child { flex:0 1 235px; }
        .lucro-tabela-detalhe { flex:1 1 auto;min-height:130px;max-height:none;overflow:auto;overscroll-behavior:contain; }
        .lucro-tabela-detalhe table { min-width:1100px; }
        .lucro-tabela-detalhe th { position:sticky;top:0;z-index:1; }
        .lucro-tabela-detalhe td { font-size:12px;padding:12px 10px;vertical-align:top; }
        .lucro-cliente { min-width:185px;max-width:270px;overflow-wrap:anywhere; }
        .lucro-cliente>strong { font-size:13px; }
        .lucro-texto-longo { min-width:100px;max-width:210px;overflow-wrap:anywhere; }
        .lucro-motivo { min-width:150px;max-width:245px; }
        .lucro-badge-sim,.lucro-badge-nao { display:inline-block;border-radius:6px;padding:4px 9px;font-size:10px;font-weight:800; }
        .lucro-badge-sim { color:#087843;background:#e8f8ed; }
        .lucro-badge-nao { color:#8b631f;background:#fff4db; }
        .lucro-paginacao { flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:18px;font-size:12px;color:#677d99; }
        .lucro-paginacao>div { display:flex;gap:8px; }
        .lucro-paginacao button { border:1px solid #cddbf0;border-radius:8px;background:#fff;color:#155ee3;padding:9px 13px;font-weight:700; }
        @media(max-width:1000px) { .lucro-cards { gap:10px; }.lucro-card { padding:17px; }.lucro-card>strong { font-size:25px; } }
        @media(max-width:720px) {
          .lucro-cards,.lucro-detalhe-resumo { grid-template-columns:1fr; }
          .lucro-box,.lucro-dialogo-conteudo { padding:12px; }
          .lucro-dialogo { width:calc(100vw - 16px);max-width:calc(100vw - 16px);height:calc(100dvh - 16px);max-height:calc(100dvh - 16px);border-radius:12px; }
          .lucro-dialogo-cabecalho h3 { font-size:20px; }
          .lucro-detalhe-resumo { gap:6px;margin:10px 0; }
          .lucro-detalhe-resumo b { font-size:18px; }
          .lucro-filtros,.lucro-filtros label,.lucro-nome-filtro select { width:100%; }
          .lucro-mes-filtro { flex:1; }.lucro-navegacao-mes input { flex:1;min-width:130px;width:100%; }
          .lucro-listagem-cabecalho { align-items:flex-start; }.lucro-listagem h3 { font-size:20px; }
          .lucro-paginacao { flex-direction:column;align-items:flex-start; }
        }
      `}</style>
    </div>
  );
}