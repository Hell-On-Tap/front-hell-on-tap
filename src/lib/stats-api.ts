/**
 * Abates, mortes, headshots e tempo de jogo (api-hell-on-tap). Contam só as
 * partidas online; o treino com bots não entra. Separados por modo.
 */
import { API_URL, AuthError, request } from "./auth-api";

export type StatsMode = "deathmatch" | "competitive";
export type ModeStats = { kills: number; deaths: number; headshots: number; playSeconds: number };
export type LeaderRow = ModeStats & { id: string; nickname: string; displayName: string | null; avatarUrl: string | null };

export const STATS_MODES: { id: StatsMode; label: string; soon?: boolean }[] = [
  { id: "deathmatch", label: "Mata-mata" },
  { id: "competitive", label: "5x5", soon: true },
];

function ensureApi() {
  if (!API_URL) throw new AuthError("O servidor ainda não está conectado.");
}

export async function profileStats(nickname: string) {
  ensureApi();
  return request<{ modes: Record<StatsMode, ModeStats> }>(`/profiles/${encodeURIComponent(nickname)}/stats`, { cache: "no-store" });
}

export async function leaderboard(mode: StatsMode, limit = 50) {
  ensureApi();
  return request<{ mode: StatsMode; players: LeaderRow[] }>(`/stats/leaderboard?mode=${mode}&limit=${limit}`, { cache: "no-store" });
}

/** Abates por morte (com 2 casas). Sem mortes, é o próprio número de abates. */
export const kd = (s: ModeStats) => (s.deaths ? s.kills / s.deaths : s.kills).toFixed(2).replace(".", ",");
/** Porcentagem de abates com headshot. */
export const hsRate = (s: ModeStats) => (s.kills ? `${Math.round((s.headshots / s.kills) * 100)}%` : "—");
/** "12 h 05 min", "45 min", "menos de 1 min". */
export function playTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return seconds > 0 ? "menos de 1 min" : "0 h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}
/** Horas com uma casa ("12,5"), para números grandes. */
export const hours = (seconds: number) => (seconds / 3600).toFixed(1).replace(".", ",");
