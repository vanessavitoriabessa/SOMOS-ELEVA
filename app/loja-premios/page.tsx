"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import LojaPremiosManager from "@/components/LojaPremiosManager";

export default function LojaPremiosPage() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("somos-eleva-logado") !== "sim") {
      router.replace("/login");
    }
  }, [router]);

  return (
    <AppShell
      title="Loja de Prêmios"
      subtitle="Escolha produtos, acompanhe resgates e gerencie o catálogo."
    >
      <LojaPremiosManager area="loja" />
    </AppShell>
  );
}