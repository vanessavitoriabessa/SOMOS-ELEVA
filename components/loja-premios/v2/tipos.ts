export type PremioLoja = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  imagem_url: string;
  pontos: number;
  estoque: number;
  ativo: boolean;
  destaque: boolean;
  ordem: number;
  criado_em?: string;
};

export type PedidoLoja = {
  id: string;
  consultora: string;
  nome_premio: string;
  imagem_url: string;
  quantidade: number;
  pontos_unitarios: number;
  pontos_total: number;
  status: string;
  observacao: string;
  criado_em: string;
};

export type FormPremio = {
  id?: string;
  nome: string;
  categoria: string;
  descricao: string;
  imagem_url: string;
  pontos: string;
  estoque: string;
  ativo: boolean;
  destaque: boolean;
  ordem: string;
};

export type AbaLoja =
  | "catalogo"
  | "favoritos"
  | "carrinho"
  | "resgates"
  | "admin";

export const FORM_PREMIO_VAZIO: FormPremio = {
  nome: "",
  categoria: "Tecnologia",
  descricao: "",
  imagem_url: "",
  pontos: "",
  estoque: "1",
  ativo: true,
  destaque: false,
  ordem: "0",
};