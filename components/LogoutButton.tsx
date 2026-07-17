"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  function sair() {
    localStorage.removeItem("somos-eleva-logado");
    localStorage.removeItem("somos-eleva-usuario");
    router.replace("/login");
  }

  return <button type="button" onClick={sair}>Sair</button>;
}
