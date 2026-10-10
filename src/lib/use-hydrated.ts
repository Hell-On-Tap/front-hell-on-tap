"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * false no HTML do servidor e durante a hidratação; true depois.
 * Use em componentes que dependem da sessão e ficam dentro de um <Suspense>
 * transmitido aos poucos: sem isso, se a sessão já tiver sido conferida quando
 * esse trecho chega, o navegador desenha algo diferente do HTML do servidor.
 */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
