"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import PremiacaoManagerV3 from "@/components/minha-premiacao/PremiacaoManagerV3";

export default function MinhaPremiacaoPage() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("somos-eleva-logado") !== "sim") {
      router.replace("/login");
    }
  }, [router]);

  return (
    <AppShell
      title="Minha Premiação"
      subtitle="Acompanhe sua carteira, produção, pontos e saques."
    >
      <PremiacaoManagerV3 />
    </AppShell>
  );
}