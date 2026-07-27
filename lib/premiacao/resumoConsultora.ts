import { calcularPremiacaoCompra } from "./premiacaoService";

export type ResumoConsultora = {
  nome: string;

  pontosCompra: number;
  pontosClt: number;
  pontosTotal: number;

  premioCompra: number;
  premioClt: number;
  premioTotal: number;

  faixa: any;

  movimentos: any[];
};

export function montarResumoConsultora({
  nome,
  propostas,
  registrosClt,
  competencia,
  saques,
  competenciaCompra,
  valorValidoCompra,
  chaveMes,
  normalizarTexto,
  converterData,
}: any): ResumoConsultora {

  const chave = normalizarTexto(nome);

  const propostasDaConsultora = propostas.filter((proposta:any)=>{

    return (
      proposta.status==="Pago" &&
      normalizarTexto(proposta.vendedora)===chave &&
      competenciaCompra(proposta)===competencia
    );

  });

  const cltDaConsultora = registrosClt.filter((registro:any)=>{

    const data=converterData(
      registro.dataPagamento ||
      registro.atualizadoEm ||
      registro.criadoEm
    );

    return(
      registro.status==="Pago" &&
      normalizarTexto(registro.consultora)===chave &&
      data &&
      chaveMes(data)===competencia
    );

  });

  const pontosCompraBrutos=
    propostasDaConsultora.reduce(
      (t:number,p:any)=>
        t+valorValidoCompra(p),
      0
    );

  const pontosCltBrutos=
    cltDaConsultora.reduce(
      (t:number,c:any)=>
        t+Number(c.parcela||0),
      0
    );

  const saquesPagos=
    saques.filter(
      (s:any)=>

        s.status==="Pago" &&
        s.competencia===competencia &&
        normalizarTexto(s.consultora)===chave

    );

  const pontosCompraPagos=
    saquesPagos.reduce(
      (t:number,s:any)=>
        t+Number(s.pontosCompra||0),
      0
    );

  const pontosCltPagos=
    saquesPagos.reduce(
      (t:number,s:any)=>
        t+Number(s.pontosClt||0),
      0
    );

  const pontosCompra=Math.max(
      pontosCompraBrutos-
      pontosCompraPagos,
      0
  );

  const pontosClt=Math.max(
      pontosCltBrutos-
      pontosCltPagos,
      0
  );

  const resultado=
      calcularPremiacaoCompra(
          pontosCompra
      );

  const premioCompra=
      resultado.premio;

  const premioClt=
      resultado.atingiuMetaMinima
          ? pontosClt*0.01
          :0;

  return{

      nome,

      pontosCompra,

      pontosClt,

      pontosTotal:
          pontosCompra+
          pontosClt,

      premioCompra,

      premioClt,

      premioTotal:
          premioCompra+
          premioClt,

      faixa:
          resultado.faixa,

      movimentos:[]

  };

}