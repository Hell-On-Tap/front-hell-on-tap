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
  /** mapa da sala (servidores antigos não mandam: fy_snow) */
  map?: string;
  /** modo (servidores antigos não mandam: mata-mata) */
  mode?: GameMode;
  /** 5x5: regras e placar */
  rules?: MatchRules;
  score?: { t: number; ct: number; round: number };
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

export type GameMode = "deathmatch" | "competitive";
export const MODES: Record<GameMode, { label: string; hint: string }> = {
  deathmatch: { label: "Mata-mata", hint: "Todos contra todos, renasce em 2,5 s, qualquer arma." },
  competitive: { label: "Casual 5v5", hint: "Dois times, uma vida por rodada, economia, granadas e C4." },
};

/** Regras do 5x5 que o dono escolhe (tempos em segundos, dinheiro em $). Iguais às do servidor do jogo. */
export type MatchRules = {
  maxRounds: number;
  startMoney: number;
  maxMoney: number;
  freezeTime: number;
  roundTime: number;
  buyTime: number;
  c4Timer: number;
  friendlyFire: boolean;
  killReward: number;
  winReward: number;
  bombReward: number;
  lossBonus: number;
  lossBonusStep: number;
  lossBonusMax: number;
};
export const DEFAULT_RULES: MatchRules = {
  maxRounds: 30, startMoney: 800, maxMoney: 16000, freezeTime: 10, roundTime: 115, buyTime: 20, c4Timer: 35,
  friendlyFire: true, killReward: 300, winReward: 3250, bombReward: 3500, lossBonus: 1400, lossBonusStep: 500, lossBonusMax: 3400,
};
/** Limites aceitos pelo servidor do jogo (match.ts → RULE_LIMITS). */
export const RULE_LIMITS: Record<Exclude<keyof MatchRules, "friendlyFire">, [number, number]> = {
  maxRounds: [1, 60], startMoney: [0, 65535], maxMoney: [800, 65535], freezeTime: [0, 60], roundTime: [30, 3600], buyTime: [0, 3600],
  c4Timer: [10, 90], killReward: [0, 5000], winReward: [0, 20000], bombReward: [0, 20000], lossBonus: [0, 20000], lossBonusStep: [0, 5000],
  lossBonusMax: [0, 20000],
};

export type RoomSettings = { name: string; privacy: Privacy; maxPlayers: number; map: string; mode: GameMode; rules: MatchRules };

export type GameMap = { id: string; name: string; hint: string };

/**
 * Mapas conhecidos (descrição e vista de cima em /public/maps). A lista de verdade vem
 * do servidor do jogo (`listMaps`): qualquer .bsp do CS 1.6 posto na pasta maps/ dele
 * aparece, mesmo sem descrição ou prévia aqui.
 */
export const MAPS: GameMap[] = [
  { id: "fy_snow", name: "Snow", hint: "Arena pequena e aberta: tiroteio o tempo todo." },
  { id: "de_dust", name: "Dust", hint: "Clássico do CS 1.6: rampas, túnel e caixas." },
  { id: "de_inferno", name: "Inferno", hint: "Vila do CS 1.6: becos, escadas e pátios." },
];
const PREVIEWS = new Set(MAPS.map((m) => m.id));
export const DEFAULT_MAP = "fy_snow";
let known: GameMap[] = MAPS;
export const mapInfo = (id?: string): GameMap =>
  known.find((m) => m.id === id) ?? (id ? { id, name: id, hint: "" } : MAPS[0]);
/** Vista de cima (só dos mapas conhecidos); null = sem imagem. */
export const mapPreview = (id?: string) => (id && PREVIEWS.has(id) ? `/maps/${id}.png` : null);

/** Mapas que o servidor do jogo tem (cai na lista conhecida se ele não responder). */
export async function listMaps(): Promise<GameMap[]> {
  try {
    const { maps } = await call<{ maps: { id: string; name: string }[] }>("/maps", null);
    if (Array.isArray(maps) && maps.length) {
      known = maps.map((m) => ({ id: m.id, name: m.name, hint: MAPS.find((k) => k.id === m.id)?.hint ?? "Mapa do CS 1.6." }));
    }
  } catch {
    /* servidor fora do ar: lista conhecida */
  }
  return known;
}

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
export const createRoom = (token: string, settings: Omit<RoomSettings, "rules"> & { rules?: MatchRules }) =>
  call<GameRoom>("/rooms", token, body("POST", settings));
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
