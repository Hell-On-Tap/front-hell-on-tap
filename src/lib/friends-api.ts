/**
 * Amigos, bloqueios, presença e lista de jogadores (api-hell-on-tap).
 */
import { API_URL, AuthError, request } from "./auth-api";

export type PlayerCard = { id: string; nickname: string; displayName: string | null; avatarUrl: string | null };
export type Friend = PlayerCard & { online: boolean; lastSeenAt: string | null; since: string };
export type FriendRequest = { id: string; player: PlayerCard; createdAt: string };
export type FriendsList = { friends: Friend[]; incoming: FriendRequest[]; outgoing: FriendRequest[]; blocked: PlayerCard[] };
export type FriendStatus = "self" | "none" | "friends" | "incoming" | "outgoing" | "blocked";
export type PlayerListItem = PlayerCard & { memberSince: string };

/** Avisa menu, lobby e perfil que algo mudou nos amigos. */
export const FRIENDS_CHANGED = "hot:friends-changed";
export const friendsChanged = () => window.dispatchEvent(new Event(FRIENDS_CHANGED));

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const json = (token: string, method: string, body?: unknown) => ({
  method,
  headers: { ...auth(token), "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const myFriends = (token: string) => request<FriendsList>("/me/friends", { headers: auth(token) });
export const friendStatus = (token: string, userId: string) =>
  request<{ status: FriendStatus; requestId?: string }>(`/me/friends/status/${userId}`, { headers: auth(token) });
export const sendFriendRequest = (token: string, nickname: string) =>
  request<{ status: FriendStatus; requestId?: string }>("/me/friends/requests", json(token, "POST", { nickname }));
export const acceptFriend = (token: string, requestId: string) =>
  request<{ status: FriendStatus }>(`/me/friends/requests/${requestId}/accept`, json(token, "POST"));
/** Recusa (recebido) ou cancela (enviado). */
export const dismissFriendRequest = (token: string, requestId: string) =>
  request(`/me/friends/requests/${requestId}`, json(token, "DELETE"));
export const removeFriend = (token: string, userId: string) => request(`/me/friends/${userId}`, json(token, "DELETE"));
export const blockPlayer = (token: string, nickname: string) => request("/me/blocks", json(token, "POST", { nickname }));
export const unblockPlayer = (token: string, userId: string) => request(`/me/blocks/${userId}`, json(token, "DELETE"));
export const heartbeat = (token: string) => request("/me/heartbeat", json(token, "POST"));

/** Jogadores por apelido ou nome (público). */
export async function searchPlayers(search: string, offset = 0) {
  if (!API_URL) throw new AuthError("O servidor ainda não está conectado.");
  const qs = new URLSearchParams({ search, offset: String(offset) });
  return request<{ players: PlayerListItem[]; hasMore: boolean }>(`/profiles?${qs}`, {});
}

/** "visto há 5 min", "visto ontem"... */
export function lastSeenLabel(iso: string | null) {
  if (!iso) return "Nunca entrou";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `Visto há ${Math.max(min, 1)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Visto há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "Visto ontem" : d < 30 ? `Visto há ${d} dias` : `Visto em ${new Date(iso).toLocaleDateString("pt-BR")}`;
}
