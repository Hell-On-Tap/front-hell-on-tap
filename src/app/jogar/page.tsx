import type { Metadata } from "next";
import { Suspense } from "react";
import GameFrame from "@/components/game/GameFrame";

export const metadata: Metadata = {
  title: "Jogar | Hell on Tap",
  description: "Partida de Hell on Tap: mata-mata online ou treino com bots.",
};

// Jogo em tela cheia dentro do site. /jogar?modo=online|bots[&sala=CODIGO]
export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <GameFrame />
    </Suspense>
  );
}
