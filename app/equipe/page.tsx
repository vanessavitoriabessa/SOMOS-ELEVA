"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import UserManager from "@/components/UserManager";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("somos-eleva-logado") !== "sim") {
      router.replace("/login");
    }
  }, [router]);

  return (
    <AppShell
      title="Equipe"
      subtitle="Cadastre, edite e acompanhe os usuários da empresa."
    >
      <UserManager />
    </AppShell>
  );
}