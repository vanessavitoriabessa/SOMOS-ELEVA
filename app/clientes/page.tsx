"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import ClientesPage from "@/components/clientes/ClientesPage";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("somos-eleva-logado") !== "sim") {
      router.replace("/login");
    }
  }, [router]);

  return (
    <AppShell
      title="Clientes"
      subtitle="Consulte, cadastre e acompanhe os clientes da Eleva."
    >
      <ClientesPage />
    </AppShell>
  );
}