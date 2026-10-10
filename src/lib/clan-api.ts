/**
 * Clãs (api-hell-on-tap /clans e /me). Leitura pública funciona no servidor e
 * no navegador; o resto exige o token de quem está logado.
 */
import { API_URL, AuthError, request } from "./auth-api";

export type ClanPermission = "invite" | "approve" | "kick" | "manage_roles" | "edit_clan";
export type JoinPolicy = "invite" | "request" | "open";

export const PERMISSION_LABELS: Record<ClanPermission, { label: string; hint: string }> = {
  invite: { label: "Convidar jogadores", hint: "Convidar pelo apelido e cancelar convites." },
  approve: { label: "Aprovar pedidos", hint: "Aceitar ou recusar pedidos de entrada." },
  kick: { label: "Expulsar membros", hint: "Só de cargos abaixo do seu." },
  manage_roles: { label: "Gerenciar cargos", hint: "Criar, editar e ordenar cargos e trocar o cargo de membros abaixo do seu." },
  edit_clan: { label: "Editar o clã", hint: "Nome, tag, descrição, logo, banner e forma de entrada." },
};
export const PERMISSIONS = Object.keys(PERMISSION_LABELS) as ClanPermission[];

export const JOIN_POLICY_LABELS: Record<JoinPolicy, { label: string; hint: string }> = {
  invite: { label: "Só por convite", hint: "Entra quem for convidado por alguém do clã." },
  request: { label: "Por pedido", hint: "Qualquer um pede para entrar e o clã aprova." },
  open: { label: "Aberto", hint: "Qualquer jogador entra direto." },
};

export type ClanSummary = {
  id: string;
  tag: string;
  name: string;
  joinPolicy: JoinPolicy;
  logoUrl: string | null;
  memberCount: number;
};

export type ClanRole = {
  id: string;
  name: string;
  color: string;
  position: number;
  isDefault: boolean;
  permissions: ClanPermission[];
};

export type ClanMember = {
  userId: string;
  nickname: string;
  displayName: string | null;
  avatarUrl: string | null;
  roleId: string;
  isOwner: boolean;
  joinedAt: string;
};

export type Clan = ClanSummary & {
  description: string | null;
  bannerUrl: string | null;
  createdAt: string;
  ownerId: string;
  roles: ClanRole[];
  members: ClanMember[];
};

export type ClanViewer = {
  isMember: boolean;
  isOwner: boolean;
  roleId: string | null;
  /** -1 = dono; senão a posição do cargo (0 = topo); null = não é membro */
  rank: number | null;
  permissions: ClanPermission[];
  pending: { id: string; kind: "invite" | "request" } | null;
};

export type MyClan = ClanSummary & { role: { name: string; color: string }; isOwner: boolean; permissions: ClanPermission[] };
export type ProfileClan = ClanSummary & { role: { name: string; color: string }; isOwner: boolean };
export type ReceivedInvite = { id: string; createdAt: string; invitedBy: string | null; clan: ClanSummary };
export type PendingEntry = {
  id: string;
  kind: "invite" | "request";
  createdAt: string;
  user: { id: string; nickname: string };
  invitedBy: string | null;
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const json = (token: string, method: string, body?: unknown): RequestInit => ({
  method,
  headers: { ...auth(token), "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const tagPath = (tag: string) => `/clans/${encodeURIComponent(tag)}`;

/** Clã público por tag. null = não existe. */
export async function fetchClan(tag: string): Promise<Clan | null> {
  if (!API_URL) throw new AuthError("O servidor ainda não está conectado.");
  let res: Response;
  try {
    res = await fetch(`${API_URL}${tagPath(tag)}`, { cache: "no-store" });
  } catch {
    throw new AuthError("Não foi possível falar com o servidor.");
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new AuthError("Não foi possível carregar o clã.", res.status);
  return res.json();
}

export const searchClans = (search = "") =>
  request<ClanSummary[]>(`/clans?search=${encodeURIComponent(search)}`, { method: "GET" });
export const clansOfProfile = (nickname: string) =>
  request<ProfileClan[]>(`/profiles/${encodeURIComponent(nickname)}/clans`, { method: "GET", cache: "no-store" });

export const myClans = (token: string) => request<MyClan[]>("/me/clans", { headers: auth(token) });
export const myInvites = (token: string) => request<ReceivedInvite[]>("/me/clan-invites", { headers: auth(token) });
export const acceptInvite = (token: string, id: string) =>
  request<{ status: "joined"; tag: string }>(`/me/clan-invites/${id}/accept`, json(token, "POST"));
export const declineInvite = (token: string, id: string) => request(`/me/clan-invites/${id}`, json(token, "DELETE"));

export const createClan = (token: string, body: { name: string; tag: string; description?: string; joinPolicy: JoinPolicy }) =>
  request<Clan>("/clans", json(token, "POST", body));
export const clanViewer = (token: string, tag: string) => request<ClanViewer>(`${tagPath(tag)}/me`, { headers: auth(token) });
export const updateClan = (
  token: string,
  tag: string,
  body: Partial<{ name: string; tag: string; description: string; joinPolicy: JoinPolicy }>,
) => request<Clan>(tagPath(tag), json(token, "PATCH", body));
export const deleteClan = (token: string, tag: string) => request(tagPath(tag), json(token, "DELETE"));
export const transferClan = (token: string, tag: string, userId: string) =>
  request<Clan>(`${tagPath(tag)}/transfer`, json(token, "POST", { userId }));

export function uploadClanImage(token: string, tag: string, kind: "logo" | "banner", image: Blob) {
  const form = new FormData();
  form.append("file", image, `${kind}.${image.type.split("/")[1] ?? "img"}`);
  return request<Clan>(`${tagPath(tag)}/images/${kind}`, { method: "PUT", headers: auth(token), body: form });
}
export const removeClanImage = (token: string, tag: string, kind: "logo" | "banner") =>
  request<Clan>(`${tagPath(tag)}/images/${kind}`, json(token, "DELETE"));

export const joinClan = (token: string, tag: string) =>
  request<{ status: "joined" | "requested" }>(`${tagPath(tag)}/join`, json(token, "POST"));
export const leaveClan = (token: string, tag: string) => request(`${tagPath(tag)}/leave`, json(token, "POST"));

export const inviteToClan = (token: string, tag: string, nickname: string) =>
  request<{ status: "invited" | "joined" }>(`${tagPath(tag)}/invites`, json(token, "POST", { nickname }));
export const pendingOfClan = (token: string, tag: string) =>
  request<PendingEntry[]>(`${tagPath(tag)}/invites`, { headers: auth(token) });
export const approveRequest = (token: string, tag: string, id: string) =>
  request(`${tagPath(tag)}/invites/${id}/approve`, json(token, "POST"));
export const cancelPending = (token: string, tag: string, id: string) =>
  request(`${tagPath(tag)}/invites/${id}`, json(token, "DELETE"));

export const setMemberRole = (token: string, tag: string, userId: string, roleId: string) =>
  request<Clan>(`${tagPath(tag)}/members/${userId}`, json(token, "PATCH", { roleId }));
export const kickMember = (token: string, tag: string, userId: string) =>
  request(`${tagPath(tag)}/members/${userId}`, json(token, "DELETE"));

export const createRole = (token: string, tag: string, body: { name: string; color: string; permissions: ClanPermission[] }) =>
  request<Clan>(`${tagPath(tag)}/roles`, json(token, "POST", body));
export const updateRole = (
  token: string,
  tag: string,
  roleId: string,
  body: Partial<{ name: string; color: string; permissions: ClanPermission[]; isDefault: boolean }>,
) => request<Clan>(`${tagPath(tag)}/roles/${roleId}`, json(token, "PATCH", body));
export const moveRole = (token: string, tag: string, roleId: string, direction: "up" | "down") =>
  request<Clan>(`${tagPath(tag)}/roles/${roleId}/move`, json(token, "POST", { direction }));
export const deleteRole = (token: string, tag: string, roleId: string) =>
  request<Clan>(`${tagPath(tag)}/roles/${roleId}`, json(token, "DELETE"));
