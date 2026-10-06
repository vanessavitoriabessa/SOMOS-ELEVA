"use client";

type Grupo =
  | "geral"
  | "comercial"
  | "pessoas"
  | "financeiro"
  | "sistema";

type Props = {
  grupo: Grupo;
  onChange: (grupo: Grupo) => void;
};

export default function SettingsTopNavigation({
  grupo,
  onChange,
}: Props) {
  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => onChange("geral")}>Geral</button>
      <button onClick={() => onChange("comercial")}>Comercial</button>
      <button onClick={() => onChange("pessoas")}>Pessoas</button>
      <button onClick={() => onChange("financeiro")}>Financeiro</button>
      <button onClick={() => onChange("sistema")}>Sistema</button>
    </div>
  );
}