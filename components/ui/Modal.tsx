"use client";

import type { ReactNode } from "react";
import Button from "./Button";
import "./ui.css";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export default function Modal({
  open,
  title,
  children,
  onClose,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="eleva-modal-overlay">
      <div className="eleva-modal">
        <div className="eleva-modal-header">
          <h2>{title}</h2>

          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="eleva-modal-content">{children}</div>
      </div>
    </div>
  );
}