"use client";

/**
 * Inventário da conta (api-hell-on-tap): itens com desgaste e padrão próprios e
 * o que está equipado. Fica num store só (como o do jogo) para o inventário, as
 * telas antes da partida e o próprio jogo verem a mesma coisa; a cada mudança o
 * jogo recebe `hot:inventory` e troca a faca na hora.
 */
import { useSyncExternalStore } from "react";
import { request } from "./auth-api";
import { sendToGame } from "./game-bridge";

export type Rarity = { id: string; label: string; color: string };
export type InventoryItem = {
  id: string;
  key: string;
  name: string;
  category: "knife";
  skin: string;
  rarity: Rarity;
  wear: number;
  wearLabel: string;
  wearShort: string;
  pattern: number;
  equipped: boolean;
  acquiredAt: string;
};
type InventoryResponse = { items: InventoryItem[]; loadout: Record<string, InventoryItem | null> };

/** Faixas de desgaste do CS (a de cima vale até `max`), para a barra do float. */
export const WEAR_TIERS = [
  { max: 0.07, label: "Nova de Fábrica", short: "NF" },
  { max: 0.15, label: "Pouco Usada", short: "PU" },
  { max: 0.38, label: "Testada em Campo", short: "TC" },
  { max: 0.45, label: "Bem Desgastada", short: "BD" },
  { max: 1, label: "Veterana de Guerra", short: "VG" },
] as const;

/** Faca que o jogo entende (null = faca padrão). */
export type KnifeChoice = { id: string; skin: string; label: string; wear: number; pattern: number };
export const knifeChoice = (item: InventoryItem | null | undefined): KnifeChoice | null =>
  item ? { id: item.id, skin: item.skin, label: item.name.split(" | ").pop() ?? item.name, wear: item.wear, pattern: item.pattern } : null;

type State = {
  status: "idle" | "loading" | "ready" | "error";
  items: InventoryItem[];
  equipped: Record<string, string | null>;
  /** prévias com desgaste geradas pelo jogo (id do item -> imagem) */
  previews: Record<string, string>;
  error: string | null;
};
let state: State = { status: "idle", items: [], equipped: {}, previews: {}, error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export function useInventory(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
export const inventoryState = () => state;

/** Manda ao jogo as facas da conta e a equipada, e pede as prévias com desgaste. */
export function syncGame() {
  if (state.status !== "ready") return;
  const knives = state.items.filter((i) => i.category === "knife");
  sendToGame({ type: "hot:inventory", knives: knives.map(knifeChoice), equipped: state.equipped.knife ?? null });
  const missing = knives.filter((i) => !state.previews[i.id]).map(knifeChoice);
  if (missing.length) sendToGame({ type: "hot:previews", items: missing });
}
/** O jogo respondeu com prévias. */
export function addPreviews(images: Record<string, string>) {
  set({ previews: { ...state.previews, ...images } });
}

function apply(data: InventoryResponse) {
  set({
    status: "ready",
    error: null,
    items: data.items,
    equipped: Object.fromEntries(Object.entries(data.loadout).map(([slot, item]) => [slot, item?.id ?? null])),
  });
  syncGame();
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function loadInventory(token: string) {
  if (state.status === "idle" || state.status === "error") set({ status: "loading" });
  try {
    apply(await request<InventoryResponse>("/me/inventory", { headers: auth(token), cache: "no-store" }));
  } catch (err) {
    set({ status: "error", error: err instanceof Error ? err.message : "Não foi possível abrir o inventário." });
  }
}

/** Equipa um item (ou volta à faca padrão com `null`). */
export async function equipKnife(token: string, itemId: string | null) {
  const path = itemId ? `/me/inventory/${itemId}/equip` : "/me/loadout/knife";
  apply(await request<InventoryResponse>(path, { method: itemId ? "POST" : "DELETE", headers: auth(token) }));
}

/** Saiu da conta: esquece tudo. */
export function clearInventory() {
  set({ status: "idle", items: [], equipped: {}, previews: {}, error: null });
}

export const equippedKnife = (s: State = state) => s.items.find((i) => i.id === s.equipped.knife) ?? null;
