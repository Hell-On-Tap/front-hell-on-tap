import type { Metadata } from "next";
import Lobby from "@/components/lobby/Lobby";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Lobby | Hell on Tap",
  description: "Escolha o modo, veja seus amigos, clãs, jogadores e o placar.",
};

// Página de quem está logado: jogar, inventário, amigos, clãs, jogadores e placar.
export default function LobbyPage() {
  return (
    <>
      <SiteHeader />
      <Lobby />
    </>
  );
}
