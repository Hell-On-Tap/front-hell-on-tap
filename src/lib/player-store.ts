"use client";

import { useSyncExternalStore } from "react";

/**
 * Estado do player de música compartilhado entre o player e o menu:
 * - "open": player visível;
 * - "hidden": player escondido, música continua (ícone do menu);
 * - "closed": player fechado e música pausada (X do player).
 * A escolha fica salva no navegador e vale em todas as páginas.
 */
export type PlayerMode = "open" | "hidden" | "closed";

const KEY = "hot:player";
let mode: PlayerMode | null = null;
let playing = false;
const listeners = new Set<() => void>();

function readMode(): PlayerMode {
  if (mode) return mode;
  try {
    const saved = localStorage.getItem(KEY);
    mode = saved === "hidden" || saved === "closed" ? saved : "open";
  } catch {
    mode = "open";
  }
  return mode;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPlayerMode() {
  return readMode();
}

export function setPlayerMode(next: PlayerMode) {
  mode = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* sem armazenamento: vale só nesta página */
  }
  emit();
}

export function setPlayerPlaying(next: boolean) {
  if (playing === next) return;
  playing = next;
  emit();
}

export function usePlayerMode() {
  return useSyncExternalStore(subscribe, readMode, () => "open" as PlayerMode);
}

export function usePlayerPlaying() {
  return useSyncExternalStore(subscribe, () => playing, () => false);
}

/**
 * Partida aberta (/jogar): o som é do jogo, então o player some e pausa e os
 * botões flutuantes saem da frente. A página do jogo liga e desliga isto.
 */
let gameActive = false;
const gameListeners = new Set<() => void>();

export function setGameActive(value: boolean) {
  if (gameActive === value) return;
  gameActive = value;
  gameListeners.forEach((l) => l());
}

export function useGameActive() {
  return useSyncExternalStore(
    (listener) => {
      gameListeners.add(listener);
      return () => gameListeners.delete(listener);
    },
    () => gameActive,
    () => false,
  );
}
