import type { Metadata } from "next";
import "./globals.css";
import SeedInitializer from "@/components/SeedInitializer";

export const metadata: Metadata = {
  title: "SOMOS ELEVA",
  description: "CRM da Eleva Promotora de Crédito",
  icons: {
    icon: "/icon-eleva.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <SeedInitializer />
        {children}
      </body>
    </html>
  );
}