/**
 * Perfil público e edição do próprio perfil (api-hell-on-tap /profiles).
 * As funções de leitura servem no servidor (página pública) e no navegador.
 */
import { API_URL, AuthError, request } from "./auth-api";

/** Seções do perfil que o dono ordena e oculta (mesma lista da API). */
export const PROFILE_SECTIONS = {
  // a ordem aqui é a ordem padrão (igual à da API)
  clans: { label: "Clãs", hint: "Os clãs de que você faz parte e o seu cargo em cada um." },
  stats: { label: "Estatísticas", hint: "Partidas, frags, mortes e headshots." },
} as const;
export type ProfileSectionId = keyof typeof PROFILE_SECTIONS;
export type ProfileSection = { id: ProfileSectionId; visible: boolean };

/** Completa o layout: seção nova (ainda sem escolha) entra no fim, visível. */
export function normalizeLayout(layout: ProfileSection[] | undefined): ProfileSection[] {
  const known = Object.keys(PROFILE_SECTIONS) as ProfileSectionId[];
  const result = (layout ?? []).filter((s, i, all) => known.includes(s.id) && all.findIndex((o) => o.id === s.id) === i);
  for (const id of known) if (!result.some((s) => s.id === id)) result.push({ id, visible: true });
  return result;
}

export type Profile = {
  id: string;
  nickname: string;
  displayName: string | null;
  bio: string | null;
  /** caminhos relativos à API; use imageUrl() para montar o endereço */
  avatarUrl: string | null;
  bannerUrl: string | null;
  memberSince: string;
  /** seções na ordem escolhida pelo dono; visible=false = oculta para todos */
  layout: ProfileSection[];
};

export type MyProfile = Profile & { email: string };
export type ImageKind = "avatar" | "banner";

/** Endereço completo de uma imagem do perfil (ou null). */
export function imageUrl(path: string | null) {
  return path && API_URL ? `${API_URL}${path}` : null;
}

/** Perfil público por apelido. null = não existe. Lança AuthError se a API estiver fora. */
export async function fetchProfile(nickname: string): Promise<Profile | null> {
  if (!API_URL) throw new AuthError("O servidor ainda não está conectado.");
  let res: Response;
  try {
    res = await fetch(`${API_URL}/profiles/${encodeURIComponent(nickname)}`, { cache: "no-store" });
  } catch {
    throw new AuthError("Não foi possível falar com o servidor.");
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new AuthError("Não foi possível carregar o perfil.", res.status);
  return res.json();
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export function updateProfile(
  token: string,
  changes: { nickname?: string; displayName?: string; bio?: string; layout?: ProfileSection[] },
) {
  return request<MyProfile>("/profiles/me", {
    method: "PATCH",
    headers: { ...auth(token), "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
}

export function uploadImage(token: string, kind: ImageKind, image: Blob) {
  const form = new FormData();
  form.append("file", image, `${kind}.${image.type.split("/")[1] ?? "img"}`);
  return request<MyProfile>(`/profiles/me/${kind}`, { method: "PUT", headers: auth(token), body: form });
}

export function removeImage(token: string, kind: ImageKind) {
  return request<MyProfile>(`/profiles/me/${kind}`, { method: "DELETE", headers: auth(token) });
}
