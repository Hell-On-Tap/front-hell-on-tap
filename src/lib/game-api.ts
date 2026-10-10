/**
 * Salas do mata-mata online (servidor do jogo, 500mldoom, em /api).
 * O site lista, cria e configura as salas; o jogo só abre quando a partida começa.
 */
import { AuthError } from "./auth-api";
import { gameUrl } from "./game-url";

export type Privacy = "public" | "friends" | "private";

export type GameRoom = {
  code: string;
  name: string;
  privacy: Privacy;
  maxPlayers: number;
  players: number;
  names: string[];
  started: boolean;
  owner: string;
  mine: boolean;
};

export type GameInvite = {
  id: string;
  room: string;
  roomName: string;
  from: { id: string; name: string };
  createdAt: number;
  players: number;
  maxPlayers: number;
  started: boolean;
};

export type RoomSettings = { name: string; privacy: Privacy; maxPlayers: number };

export const PRIVACY: Record<Privacy, { label: string; hint: string }> = {
  public: { label: "Pública", hint: "Aparece para todo mundo na lista de salas." },
  friends: { label: "Só amigos", hint: "Só seus amigos veem e entram (ou quem você convidar)." },
  private: { label: "Privada", hint: "Fora da lista. Entra só quem tiver o link ou o código." },
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;

/** Avisa a lista de salas e os convites que algo mudou. */
export const ROOMS_CHANGED = "hot:rooms-changed";

async function call<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${await gameUrl()}/api${path}`, {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new AuthError("O servidor do jogo não respondeu. Tente de novo em instantes.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new AuthError(data?.message || "Algo deu errado. Tente de novo.", res.status);
  return data as T;
}

const body = (method: string, value?: unknown): RequestInit => ({
  method,
  body: value === undefined ? undefined : JSON.stringify(value),
});

export const listRooms = (token: string | null) => call<{ rooms: GameRoom[]; maxPlayers: number }>("/rooms", token);
export const getRoom = (token: string | null, code: string) => call<GameRoom>(`/rooms/${code}`, token);
export const createRoom = (token: string, settings: RoomSettings) => call<GameRoom>("/rooms", token, body("POST", settings));
export const updateRoom = (token: string, code: string, settings: Partial<RoomSettings>) =>
  call<GameRoom>(`/rooms/${code}`, token, body("PATCH", settings));
export const inviteToRoom = (token: string, code: string, userId: string) =>
  call<{ id: string }>(`/rooms/${code}/invites`, token, body("POST", { to: userId }));
export const myGameInvites = (token: string) => call<{ invites: GameInvite[] }>("/me/invites", token);
export const dismissGameInvite = (token: string, id: string) => call(`/me/invites/${id}`, token, body("DELETE"));

/** Personagem escolhido da última vez (vai junto ao abrir o jogo). */
export const SKIN_KEY = "hot:skin";
export function savedSkin(): string | undefined {
  try {
    return localStorage.getItem(SKIN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
export function storeSkin(skin: string) {
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch {
    /* sem armazenamento: só não lembra */
  }
}
