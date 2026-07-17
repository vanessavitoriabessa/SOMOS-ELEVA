"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import DashboardClient from "@/components/DashboardClient";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("somos-eleva-logado") !== "sim") {
      router.replace("/login");
    }
  }, [router]);

  return (
    <AppShell title="Dashboard" subtitle="">
      <DashboardClient />
    </AppShell>
  );
}
