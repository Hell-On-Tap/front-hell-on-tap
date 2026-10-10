"use client";

import { useSyncExternalStore } from "react";

/**
 * Ponte com o jogo, que fica carregado num iframe só (GameHost, no layout) desde
 * o login: entrar e sair de salas não recarrega nada. A página /jogar mostra o
 * iframe e manda comandos (`hot:play`, `hot:start`, `hot:skin`, `hot:leave`);
 * as mensagens do jogo chegam aqui e são repassadas a quem estiver ouvindo.
 */
export type Skin = { id: string; label: string; image: string };
export type GamePhase = "off" | "loading" | "ready" | "failed";
export type GameState = {
  phase: GamePhase;
  /** progresso do carregamento (texturas e personagens) */
  done: number;
  total: number;
  skins: Skin[];
  /** skins da faca (prévias vindas do jogo) */
  knives: Skin[];
  /** o iframe está na tela (partida aberta) */
  visible: boolean;
};
export type GameMessage = { type: string } & Record<string, unknown>;

let state: GameState = { phase: "off", done: 0, total: 0, skins: [], knives: [], visible: false };
const listeners = new Set<() => void>();
const messageListeners = new Set<(message: GameMessage) => void>();
let target: { window: Window; origin: string } | null = null;
let reloadHandler: (() => void) | null = null;

export function updateGame(patch: Partial<GameState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useGameState(): GameState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}
export const gameState = () => state;

/** GameHost registra o iframe (null quando sai da conta). */
export function attachGame(window: Window | null, origin = "") {
  target = window ? { window, origin } : null;
}
export function onGameReload(handler: (() => void) | null) {
  reloadHandler = handler;
}
/** Recarrega o jogo (depois de uma falha). */
export function reloadGame() {
  reloadHandler?.();
}

/** Manda um comando ao jogo (só para a origem do jogo). */
export function sendToGame(message: GameMessage) {
  target?.window.postMessage(message, target.origin);
}

/** GameHost repassa cada mensagem do jogo. */
export function emitGameMessage(message: GameMessage) {
  messageListeners.forEach((l) => l(message));
}
export function onGameMessage(listener: (message: GameMessage) => void) {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
  };
}

/** Mostra ou esconde o jogo (a página /jogar liga ao abrir a partida). */
export function showGame(visible: boolean) {
  if (state.visible !== visible) updateGame({ visible });
}
