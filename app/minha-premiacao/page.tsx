"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import MinhaPremiacaoV2 from "@/components/minha-premiacao/MinhaPremiacaoV2";

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
      <MinhaPremiacaoV2 />
    </AppShell>
  );
}