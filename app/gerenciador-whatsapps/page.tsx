"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import WhatsAppManager from "@/components/WhatsAppManager";

export default function Page() {
  const router = useRouter();

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
      <WhatsAppManager />
    </AppShell>
  );
}