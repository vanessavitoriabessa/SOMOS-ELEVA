"use client";

type Props = {
  modulo:
    | "sistema"
    | "comercial"
    | "pessoas"
    | "financeiro"
    | "relatorios";

  onChange: (
    modulo:
      | "sistema"
      | "comercial"
      | "pessoas"
      | "financeiro"
      | "relatorios"
  ) => void;
};

const itens = [
  {
    id: "sistema",
    titulo: "Sistema",
    emoji: "⚙️",
  },
  {
    id: "comercial",
    titulo: "Comercial",
    emoji: "🏦",
  },
  {
    id: "pessoas",
    titulo: "Pessoas",
    emoji: "👥",
  },
  {
    id: "financeiro",
    titulo: "Financeiro",
    emoji: "💰",
  },
  {
    id: "relatorios",
    titulo: "Relatórios",
    emoji: "📊",
  },
];

export default function ConfiguracoesMenu({
  modulo,
  onChange,
}: Props) {
  return (
    <>

      {itens.map((item) => (

        <button
          key={item.id}
          className={
            modulo === item.id
              ? "config-menu-active"
              : "config-menu-button"
          }
          onClick={() =>
            onChange(item.id as any)
          }
        >

          <span>{item.emoji}</span>

          {item.titulo}

        </button>

      ))}

    </>
  );
}