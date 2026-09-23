"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import WhatsAppManager from "@/components/WhatsAppManager";

export default function Page() {
  const router = useRouter();
  const [aba, setAba] = useState<"gerenciador" | "historico">("gerenciador");

  useEffect(() => {
    if (localStorage.getItem("somos-eleva-logado") !== "sim") {
      router.replace("/login");
    }
  }, [router]);

  return (
    <AppShell
      title="Gerenciador de WhatsApps"
      subtitle="Controle os números utilizados no tráfego pago da ELEVA PROMOTORA DE CRÉDITO."
    >
      <div style={{ display: "grid", gap: 18 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            padding: 6,
            background: "#ffffff",
            border: "1px solid #dbe5f5",
            borderRadius: 14,
            width: "fit-content",
          }}
        >
          <button
            type="button"
            onClick={() => setAba("gerenciador")}
            style={{
              padding: "11px 16px",
              border: 0,
              borderRadius: 9,
              background: aba === "gerenciador" ? "#155eef" : "#f3f6fb",
              color: aba === "gerenciador" ? "#ffffff" : "#344054",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            GERENCIADOR DE WHATSAPPS
          </button>

          <button
            type="button"
            onClick={() => setAba("historico")}
            style={{
              padding: "11px 16px",
              border: 0,
              borderRadius: 9,
              background: aba === "historico" ? "#155eef" : "#f3f6fb",
              color: aba === "historico" ? "#ffffff" : "#344054",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            HISTÓRICO DE ATENDIMENTOS
          </button>
        </div>

        <WhatsAppManager modo={aba} />
      </div>
    </AppShell>
  );
}
