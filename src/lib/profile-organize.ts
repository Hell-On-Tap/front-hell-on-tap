"use client";

import { useSyncExternalStore } from "react";

/**
 * Liga/desliga o modo "Organizar" do perfil. O botão fica nas ações do topo e
 * as seções ficam mais abaixo; os dois leem este estado.
 */
let organizing = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setOrganizing(value: boolean) {
  if (organizing === value) return;
  organizing = value;
  listeners.forEach((l) => l());
}

export function useOrganizing() {
  return useSyncExternalStore(
    subscribe,
    () => organizing,
    () => false,
  );
}
