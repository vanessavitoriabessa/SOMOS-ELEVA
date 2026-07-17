"use client";

import { useEffect } from "react";
import { seedData } from "@/lib/seed-data";

const VERSION_KEY = "somos-eleva-seed-version-v8";

export default function SeedInitializer() {
  useEffect(() => {
    const currentVersion = localStorage.getItem(VERSION_KEY);

    if (currentVersion !== seedData.version) {
      // V8 intentionally loads the spreadsheet as the official initial database.
      localStorage.setItem(
        "somos-eleva-propostas",
        JSON.stringify(seedData.proposals)
      );
      localStorage.setItem(
        "somos-eleva-clientes",
        JSON.stringify(seedData.clients)
      );
      localStorage.setItem(
        "somos-eleva-clt",
        JSON.stringify(seedData.clt)
      );
      localStorage.setItem(
        "somos-eleva-configuracoes",
        JSON.stringify(seedData.settings)
      );
      localStorage.setItem(VERSION_KEY, seedData.version);
      window.location.reload();
    }
  }, []);

  return null;
}
