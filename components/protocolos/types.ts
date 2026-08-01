export type StatusProtocolo =
  | "Protocolo cadastrado"
  | "Aguardando boleto"
  | "Aguardando liberação de margem"
  | "Boleto recebido"
  | "Proposta digitada"
  | "Pago"
  | "Desaverbação de margem"
  | "Cancelado da compra"
  | "Cancelado"
  | "Finalizado";

export type Protocolo = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  numeroProtocolo: string;
  dataLigacao: string;
  dataLimite: string;
  matricula: string;
  senhaPortal: string;
  governo: string;
  status: StatusProtocolo;
  vendedor: string;
  margem: number;
  ligouBancoHoje: boolean;
};