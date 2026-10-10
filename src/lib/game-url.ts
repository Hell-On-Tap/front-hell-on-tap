"use client";

import { useEffect, useState } from "react";
import { API_URL } from "./auth-api";
import { GAME_URL } from "./home-data";

/**
 * Endereço do servidor do jogo. Vem da API (`GET /config`, variável GAME_URL do
 * back), então dá para trocar sem refazer o build do site. Sem API ou sem a
 * variável lá, usa NEXT_PUBLIC_GAME_URL.
 */
let resolved: string | null = null;
let pending: Promise<string> | null = null;

export function gameUrl(): Promise<string> {
  if (resolved) return Promise.resolve(resolved);
  pending ??= (async () => {
    let url = GAME_URL;
    if (API_URL) {
      try {
        const res = await fetch(`${API_URL.replace(/\/+$/, "")}/config`, { cache: "no-store" });
        const data = res.ok ? await res.json() : null;
        if (typeof data?.gameUrl === "string" && /^https?:\/\//.test(data.gameUrl)) url = data.gameUrl.replace(/\/+$/, "");
      } catch {
        /* API fora do ar: fica com o endereço do .env do site */
      }
    }
    resolved = url;
    return url;
  })();
  return pending;
}

/** O endereço do jogo (null enquanto pergunta à API). */
export function useGameUrl(): string | null {
  const [url, setUrl] = useState<string | null>(resolved);
  useEffect(() => {
    let cancelled = false;
    gameUrl().then((u) => !cancelled && setUrl(u));
    return () => {
      cancelled = true;
    };
  }, []);
  return url;
}
