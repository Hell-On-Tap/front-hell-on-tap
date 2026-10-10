"use client";

import { useSession } from "@/lib/session";

/** Mostra só para quem NÃO está logado (some enquanto a sessão é conferida). */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  return useSession().status === "guest" ? <>{children}</> : null;
}

/** Mostra só para quem está logado. */
export function AuthedOnly({ children }: { children: React.ReactNode }) {
  return useSession().status === "authed" ? <>{children}</> : null;
}

/** Apelido de quem está logado. */
export function Nickname() {
  return <>{useSession().user?.nickname}</>;
}

/** "Jogar": logado vai para o lobby (escolha do modo); sem conta abre o login. */
export function PlayLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const { status } = useSession();
  return (
    <a href={status === "authed" ? "/lobby" : "#entrar"} className={className}>
      {children}
    </a>
  );
}
