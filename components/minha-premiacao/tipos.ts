export type MovimentoPremiacao = {
  id: string;
  tipo: "entrada" | "saida" | "bonus" | "resgate";
  titulo: string;
  descricao: string;
  data: string;
  valor: number;
  pontos?: number;
  status: string;
};

export type ResumoCarteira = {
  nomeUsuario: string;
  competencia: string;

  saldoDisponivel: number;
  pontosDisponiveis: number;

  entradasMes: number;
  saidasMes: number;
  valorEmFormacao: number;

  producaoAtual: number;
  metaIndividual: number;
  percentualMeta: number;
  valorFaltanteMeta: number;

  posicaoRanking: number | null;
  totalConsultoras: number;

  contaAtiva: boolean;
};

export type DadosMinhaPremiacao = {
  resumo: ResumoCarteira;
  movimentos: MovimentoPremiacao[];
  producaoPorPeriodo: {
    dia: string;
    valor: number;
  }[];
};