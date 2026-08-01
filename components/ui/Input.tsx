import type { InputHTMLAttributes } from "react";
import "./ui.css";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export default function Input({
  label,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id || props.name;

  return (
    <div className="eleva-input-group">
      {label && (
        <label className="eleva-label" htmlFor={inputId}>
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={[
          "eleva-input",
          error ? "eleva-input-error" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />

      {error && <p className="eleva-field-error">{error}</p>}
    </div>
  );
}