/**
 * Espelho no front das regras de hierarquia da API (a API é quem decide; isto
 * só esconde botões que dariam erro).
 */
import type { Clan, ClanMember, ClanPermission, ClanRole, ClanViewer } from "./clan-api";

export const can = (viewer: ClanViewer | null, perm: ClanPermission) => !!viewer?.permissions.includes(perm);

/** O cargo está abaixo do cargo de quem vê? (o dono alcança todos) */
export function canManageRole(viewer: ClanViewer | null, role: ClanRole) {
  if (!viewer) return false;
  return viewer.isOwner || (viewer.rank !== null && viewer.rank < role.position);
}

/** O membro está abaixo de quem vê? Ninguém mexe no dono. */
export function canManageMember(viewer: ClanViewer | null, clan: Clan, member: ClanMember) {
  if (!viewer || member.isOwner) return false;
  if (viewer.isOwner) return true;
  const role = clan.roles.find((r) => r.id === member.roleId);
  return !!role && viewer.rank !== null && viewer.rank < role.position;
}

/** Tem alguma permissão de gestão? (mostra o botão "Gerenciar") */
export const canManageAnything = (viewer: ClanViewer | null) => !!viewer && (viewer.isOwner || viewer.permissions.length > 0);

/** Avisa o menu que os convites mudaram (para atualizar o contador). */
export const notifyInvitesChanged = () => window.dispatchEvent(new Event("hot:invites-changed"));
