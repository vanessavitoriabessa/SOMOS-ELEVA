import type { HTMLAttributes, ReactNode } from "react";
import "./ui.css";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export default function Card({
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div className={`eleva-card ${className}`} {...props}>
      {children}
    </div>
  );
}