"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthError } from "@/lib/auth-api";
import {
  approveRequest,
  cancelPending,
  clanViewer,
  createRole,
  deleteClan,
  deleteRole,
  fetchClan,
  inviteToClan,
  JOIN_POLICY_LABELS,
  kickMember,
  moveRole,
  pendingOfClan,
  PERMISSION_LABELS,
  PERMISSIONS,
  removeClanImage,
  setMemberRole,
  transferClan,
  updateClan,
  updateRole,
  uploadClanImage,
  type Clan,
  type ClanPermission,
  type ClanViewer,
  type JoinPolicy,
  type PendingEntry,
} from "@/lib/clan-api";
import { can, canManageMember, canManageRole } from "@/lib/clan-rules";
import { imageUrl } from "@/lib/profile-api";
import { useSession } from "@/lib/session";
import fieldStyles from "../auth/AuthDialog.module.css";
import ImageCropper from "../media/ImageCropper";
import styles from "./ClanManage.module.css";

type Tab = "members" | "invites" | "roles" | "settings";
const errorText = (err: unknown, fallback = "Algo deu errado. Tente de novo.") =>
  err instanceof AuthError ? err.message : fallback;

export default function ClanManage({ tag }: { tag: string }) {
  const router = useRouter();
  const { status, token } = useSession();
  const [clan, setClan] = useState<Clan | null>(null);
  const [viewer, setViewer] = useState<ClanViewer | null>(null);
  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [tab, setTab] = useState<Tab>("members");
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [c, v] = await Promise.all([fetchClan(tag), clanViewer(token, tag)]);
      if (!c) {
        setLoadError("Clã não encontrado.");
        return;
      }
      setClan(c);
      setViewer(v);
      if (can(v, "invite") || can(v, "approve")) setPending(await pendingOfClan(token, c.tag));
    } catch (err) {
      setLoadError(errorText(err, "Não foi possível carregar o clã."));
    }
  }, [token, tag]);

  useEffect(() => {
    // carrega fora do corpo do efeito (o estado muda só quando a API responde)
    void Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  /** Roda uma ação, mostra o resultado e recarrega o que mudou. */
  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      const result = await fn();
      setToast({ text: ok });
      if (result && typeof result === "object" && "roles" in result) setClan(result as Clan);
      await load();
      router.refresh();
      return true;
    } catch (err) {
      setToast({ text: errorText(err), error: true });
      return false;
    }
  }

  if (status === "guest") {
    return (
      <main className={styles.page}>
        <p className={styles.notice}>
          <a href="#entrar">Entre na sua conta</a> para gerenciar o clã.
        </p>
      </main>
    );
  }
  if (loadError) {
    return (
      <main className={styles.page}>
        <p className={styles.notice}>{loadError}</p>
      </main>
    );
  }
  if (!clan || !viewer || !token) {
    return (
      <main className={styles.page}>
        <p className={styles.notice}>Carregando…</p>
      </main>
    );
  }
  if (!viewer.isMember || !(viewer.isOwner || viewer.permissions.length)) {
    return (
      <main className={styles.page}>
        <p className={styles.notice}>
          Você não tem permissão para gerenciar este clã. <Link href={`/clan/${clan.tag}`}>Voltar para o clã</Link>
        </p>
      </main>
    );
  }

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "members", label: "Membros", show: true },
    { id: "invites", label: "Convites", show: can(viewer, "invite") || can(viewer, "approve") },
    { id: "roles", label: "Cargos", show: can(viewer, "manage_roles") },
    { id: "settings", label: "Clã", show: can(viewer, "edit_clan") || viewer.isOwner },
  ];
  const requests = pending.filter((p) => p.kind === "request");

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <Link href={`/clan/${encodeURIComponent(clan.tag)}`} className={styles.back}>
          ← [{clan.tag}] {clan.name}
        </Link>
        <h1 className={styles.title}>Gerenciar clã</h1>
      </header>

      <nav className={styles.tabs} role="tablist" aria-label="Seções">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={styles.tab}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === "invites" && requests.length > 0 && <span className={styles.badge}>{requests.length}</span>}
            </button>
          ))}
      </nav>

      <p className={styles.toast} data-show={!!toast} data-error={toast?.error ?? false} role="status" aria-live="polite">
        {toast?.text}
      </p>

      {tab === "members" && <MembersTab clan={clan} viewer={viewer} token={token} run={run} />}
      {tab === "invites" && <InvitesTab clan={clan} viewer={viewer} token={token} pending={pending} run={run} />}
      {tab === "roles" && <RolesTab clan={clan} viewer={viewer} token={token} run={run} />}
      {tab === "settings" && (
        <SettingsTab
          clan={clan}
          viewer={viewer}
          token={token}
          run={run}
          onTagChange={(t) => router.replace(`/clan/${encodeURIComponent(t)}/gerenciar`)}
          onDeleted={() => router.push("/clans")}
        />
      )}
    </main>
  );
}

type TabProps = {
  clan: Clan;
  viewer: ClanViewer;
  token: string;
  run: (fn: () => Promise<unknown>, ok: string) => Promise<boolean>;
};

// ---------------------------------------------------------------------------
// Membros
// ---------------------------------------------------------------------------

function MembersTab({ clan, viewer, token, run }: TabProps) {
  return (
    <section className={styles.section}>
      <ul className={styles.rows}>
        {clan.members.map((m) => {
          const role = clan.roles.find((r) => r.id === m.roleId);
          const manageable = canManageMember(viewer, clan, m);
          const selfOwner = viewer.isOwner && m.isOwner;
          const canChangeRole = can(viewer, "manage_roles") && (manageable || selfOwner);
          const avatar = imageUrl(m.avatarUrl);
          return (
            <li key={m.userId} className={styles.row}>
              <span className={styles.avatar}>
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" />
                ) : (
                  <span aria-hidden="true">{m.nickname.charAt(0).toUpperCase()}</span>
                )}
              </span>
              <span className={styles.rowMain}>
                <strong>{m.displayName ?? m.nickname}</strong>
                <small>
                  @{m.nickname}
                  {m.isOwner && " · dono"}
                </small>
              </span>
              {canChangeRole ? (
                <select
                  className={styles.select}
                  value={m.roleId}
                  aria-label={`Cargo de ${m.nickname}`}
                  onChange={(e) => run(() => setMemberRole(token, clan.tag, m.userId, e.target.value), `Cargo de ${m.nickname} atualizado.`)}
                >
                  {clan.roles
                    .filter((r) => r.id === m.roleId || canManageRole(viewer, r))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              ) : (
                <span className={styles.rolePill} style={{ "--role": role?.color } as React.CSSProperties}>
                  {role?.name}
                </span>
              )}
              {can(viewer, "kick") && manageable && (
                <button
                  type="button"
                  className={styles.danger}
                  onClick={() =>
                    window.confirm(`Expulsar ${m.nickname} do clã?`) &&
                    run(() => kickMember(token, clan.tag, m.userId), `${m.nickname} foi expulso.`)
                  }
                >
                  Expulsar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Convites e pedidos
// ---------------------------------------------------------------------------

function InvitesTab({ clan, viewer, token, pending, run }: TabProps & { pending: PendingEntry[] }) {
  const [nickname, setNickname] = useState("");
  const requests = pending.filter((p) => p.kind === "request");
  const invites = pending.filter((p) => p.kind === "invite");

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const nick = nickname.trim();
    if (!nick) return;
    if (await run(() => inviteToClan(token, clan.tag, nick), `Convite enviado para ${nick}.`)) setNickname("");
  }

  return (
    <section className={styles.section}>
      {can(viewer, "invite") && (
        <form className={styles.inline} onSubmit={invite}>
          <label htmlFor="invite-nick">Convidar jogador</label>
          <div className={styles.inlineRow}>
            <input
              id="invite-nick"
              className={fieldStyles.input}
              placeholder="Apelido do jogador"
              value={nickname}
              maxLength={16}
              autoComplete="off"
              onChange={(e) => setNickname(e.target.value)}
            />
            <button type="submit" className={styles.primary}>
              Convidar
            </button>
          </div>
          <p className={fieldStyles.hint}>O jogador vê o convite em Clãs e aceita ou recusa.</p>
        </form>
      )}

      {can(viewer, "approve") && (
        <>
          <h2 className={styles.subTitle}>Pedidos de entrada</h2>
          {requests.length ? (
            <ul className={styles.rows}>
              {requests.map((p) => (
                <li key={p.id} className={styles.row}>
                  <span className={styles.rowMain}>
                    <Link href={`/perfil/${encodeURIComponent(p.user.nickname)}`}>
                      <strong>{p.user.nickname}</strong>
                    </Link>
                    <small>pediu para entrar</small>
                  </span>
                  <button type="button" className={styles.primarySmall} onClick={() => run(() => approveRequest(token, clan.tag, p.id), `${p.user.nickname} entrou no clã.`)}>
                    Aprovar
                  </button>
                  <button type="button" className={styles.linkBtn} onClick={() => run(() => cancelPending(token, clan.tag, p.id), "Pedido recusado.")}>
                    Recusar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>
              {clan.joinPolicy === "request" ? "Nenhum pedido no momento." : "O clã não aceita pedidos agora (forma de entrada: " + JOIN_POLICY_LABELS[clan.joinPolicy].label.toLowerCase() + ")."}
            </p>
          )}
        </>
      )}

      {can(viewer, "invite") && (
        <>
          <h2 className={styles.subTitle}>Convites enviados</h2>
          {invites.length ? (
            <ul className={styles.rows}>
              {invites.map((p) => (
                <li key={p.id} className={styles.row}>
                  <span className={styles.rowMain}>
                    <strong>{p.user.nickname}</strong>
                    <small>{p.invitedBy ? `convidado por ${p.invitedBy}` : "convidado"}</small>
                  </span>
                  <button type="button" className={styles.linkBtn} onClick={() => run(() => cancelPending(token, clan.tag, p.id), "Convite cancelado.")}>
                    Cancelar convite
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Nenhum convite pendente.</p>
          )}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Cargos
// ---------------------------------------------------------------------------

type RoleDraft = { name: string; color: string; permissions: ClanPermission[]; isDefault: boolean };

function RolesTab({ clan, viewer, token, run }: TabProps) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const roles = [...clan.roles].sort((a, b) => a.position - b.position);

  return (
    <section className={styles.section}>
      <p className={styles.muted}>
        A ordem é a hierarquia: quem gerencia cargos só mexe nos cargos e membros abaixo do próprio cargo.
      </p>
      <ol className={styles.rows}>
        {roles.map((role, i) => {
          const manageable = canManageRole(viewer, role);
          const above = roles[i - 1];
          const below = roles[i + 1];
          const count = clan.members.filter((m) => m.roleId === role.id).length;
          return (
            <li key={role.id} className={styles.roleItem}>
              <div className={styles.row}>
                <span className={styles.swatch} style={{ background: role.color }} aria-hidden="true" />
                <span className={styles.rowMain}>
                  <strong>
                    {role.name}
                    {role.isDefault && <span className={styles.tag}>padrão</span>}
                  </strong>
                  <small>
                    {count} {count === 1 ? "membro" : "membros"} ·{" "}
                    {role.permissions.length ? role.permissions.map((p) => PERMISSION_LABELS[p].label.toLowerCase()).join(", ") : "sem permissões"}
                  </small>
                </span>
                {manageable && (
                  <span className={styles.roleTools}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label={`Subir ${role.name}`}
                      disabled={!above || !canManageRole(viewer, above)}
                      onClick={() => run(() => moveRole(token, clan.tag, role.id, "up"), "Ordem atualizada.")}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label={`Descer ${role.name}`}
                      disabled={!below}
                      onClick={() => run(() => moveRole(token, clan.tag, role.id, "down"), "Ordem atualizada.")}
                    >
                      ▼
                    </button>
                    <button type="button" className={styles.linkBtn} onClick={() => setEditing(editing === role.id ? null : role.id)}>
                      Editar
                    </button>
                    {!role.isDefault && (
                      <button
                        type="button"
                        className={styles.danger}
                        onClick={() =>
                          window.confirm(`Apagar o cargo ${role.name}? Quem tem ele passa para o cargo padrão.`) &&
                          run(() => deleteRole(token, clan.tag, role.id), "Cargo apagado.")
                        }
                      >
                        Apagar
                      </button>
                    )}
                  </span>
                )}
              </div>
              {editing === role.id && (
                <RoleEditor
                  viewer={viewer}
                  initial={{ name: role.name, color: role.color, permissions: role.permissions, isDefault: role.isDefault }}
                  canSetDefault={!role.isDefault}
                  onCancel={() => setEditing(null)}
                  onSave={async (d) => {
                    const ok = await run(
                      () =>
                        updateRole(token, clan.tag, role.id, {
                          name: d.name,
                          color: d.color,
                          permissions: d.permissions,
                          ...(d.isDefault && !role.isDefault ? { isDefault: true } : {}),
                        }),
                      "Cargo salvo.",
                    );
                    if (ok) setEditing(null);
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>

      {editing === "new" ? (
        <RoleEditor
          viewer={viewer}
          initial={{ name: "", color: "#3399ff", permissions: [], isDefault: false }}
          canSetDefault={false}
          onCancel={() => setEditing(null)}
          onSave={async (d) => {
            const ok = await run(() => createRole(token, clan.tag, { name: d.name, color: d.color, permissions: d.permissions }), "Cargo criado.");
            if (ok) setEditing(null);
          }}
        />
      ) : (
        <button type="button" className={styles.primary} onClick={() => setEditing("new")}>
          Novo cargo
        </button>
      )}
    </section>
  );
}

function RoleEditor({
  viewer,
  initial,
  canSetDefault,
  onSave,
  onCancel,
}: {
  viewer: ClanViewer;
  initial: RoleDraft;
  canSetDefault: boolean;
  onSave: (draft: RoleDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");

  function toggle(p: ClanPermission) {
    setDraft((d) => ({ ...d, permissions: d.permissions.includes(p) ? d.permissions.filter((x) => x !== p) : [...d.permissions, p] }));
  }

  return (
    <form
      className={styles.editor}
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.name.trim() || draft.name.trim().length > 24) {
          setError("O nome do cargo deve ter de 1 a 24 caracteres.");
          return;
        }
        onSave({ ...draft, name: draft.name.trim() });
      }}
    >
      <div className={styles.editorRow}>
        <label className={styles.grow}>
          <span>Nome do cargo</span>
          <input className={fieldStyles.input} value={draft.name} maxLength={24} autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label>
          <span>Cor</span>
          <input type="color" className={styles.color} value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
        </label>
      </div>
      {error && <p className={fieldStyles.error}>{error}</p>}
      <fieldset className={styles.perms}>
        <legend>Permissões</legend>
        {PERMISSIONS.map((p) => {
          // ninguém (exceto o dono) dá permissões que não tem
          const locked = !viewer.isOwner && !viewer.permissions.includes(p);
          return (
            <label key={p} className={styles.perm} data-locked={locked}>
              <input type="checkbox" checked={draft.permissions.includes(p)} disabled={locked} onChange={() => toggle(p)} />
              <span>
                <strong>{PERMISSION_LABELS[p].label}</strong>
                <small>{locked ? "Você não tem essa permissão, então não pode dá-la." : PERMISSION_LABELS[p].hint}</small>
              </span>
            </label>
          );
        })}
      </fieldset>
      {canSetDefault && (
        <label className={styles.perm}>
          <input type="checkbox" checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} />
          <span>
            <strong>Cargo de quem entra</strong>
            <small>Novos membros recebem este cargo.</small>
          </span>
        </label>
      )}
      <div className={styles.editorFooter}>
        <button type="button" className={styles.linkBtn} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={styles.primary}>
          Salvar cargo
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Configurações do clã
// ---------------------------------------------------------------------------

function SettingsTab({
  clan,
  viewer,
  token,
  run,
  onTagChange,
  onDeleted,
}: TabProps & { onTagChange: (tag: string) => void; onDeleted: () => void }) {
  const [name, setName] = useState(clan.name);
  const [tag, setTag] = useState(clan.tag);
  const [description, setDescription] = useState(clan.description ?? "");
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>(clan.joinPolicy);
  const [newOwner, setNewOwner] = useState("");
  const [confirmTag, setConfirmTag] = useState("");
  const [imageError, setImageError] = useState("");
  const [cropping, setCropping] = useState<{ kind: "logo" | "banner"; file: File } | null>(null);
  const canEdit = can(viewer, "edit_clan");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const changes: Parameters<typeof updateClan>[2] = {};
    if (name.trim() !== clan.name) changes.name = name.trim();
    if (tag.trim() !== clan.tag) changes.tag = tag.trim();
    if (description.trim() !== (clan.description ?? "")) changes.description = description.trim();
    if (joinPolicy !== clan.joinPolicy) changes.joinPolicy = joinPolicy;
    if (!Object.keys(changes).length) return;
    const ok = await run(() => updateClan(token, clan.tag, changes), "Clã atualizado.");
    if (ok && changes.tag) onTagChange(changes.tag);
  }

  function pickImage(kind: "logo" | "banner", input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    setImageError("");
    setCropping({ kind, file });
  }

  async function uploadCropped(kind: "logo" | "banner", blob: Blob) {
    setCropping(null);
    try {
      await run(() => uploadClanImage(token, clan.tag, kind, blob), kind === "logo" ? "Logo atualizado." : "Banner atualizado.");
    } catch (err) {
      setImageError((err as Error).message);
    }
  }

  const logo = imageUrl(clan.logoUrl);
  const banner = imageUrl(clan.bannerUrl);

  return (
    <section className={styles.section}>
      {canEdit && (
        <>
          <div className={styles.media}>
            <div className={styles.mediaBanner}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner ?? "/background.png"} alt="" className={banner ? undefined : styles.dim} />
              <div className={styles.mediaButtons}>
                <label className={styles.mediaBtn}>
                  Trocar banner
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => pickImage("banner", e.currentTarget)} />
                </label>
                {banner && (
                  <button type="button" className={styles.mediaBtn} onClick={() => run(() => removeClanImage(token, clan.tag, "banner"), "Banner removido.")}>
                    Remover
                  </button>
                )}
              </div>
            </div>
            <div className={styles.mediaLogoRow}>
              <span className={styles.mediaLogo}>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" />
                ) : (
                  <span aria-hidden="true">{clan.tag}</span>
                )}
              </span>
              <label className={styles.mediaBtn}>
                Trocar logo
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => pickImage("logo", e.currentTarget)} />
              </label>
              {logo && (
                <button type="button" className={styles.mediaBtn} onClick={() => run(() => removeClanImage(token, clan.tag, "logo"), "Logo removido.")}>
                  Remover
                </button>
              )}
            </div>
            {imageError && <p className={fieldStyles.error}>{imageError}</p>}
          </div>

          {cropping && (
            <ImageCropper
              key={`${cropping.kind}-${cropping.file.name}-${cropping.file.lastModified}`}
              file={cropping.file}
              width={cropping.kind === "logo" ? 400 : 1500}
              height={cropping.kind === "logo" ? 400 : 500}
              title={cropping.kind === "logo" ? "Enquadrar logo" : "Enquadrar banner"}
              onCancel={() => setCropping(null)}
              onConfirm={({ blob }) => uploadCropped(cropping.kind, blob)}
            />
          )}

          <form className={styles.form} onSubmit={save}>
            <label>
              <span>Nome</span>
              <input className={fieldStyles.input} value={name} maxLength={32} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span>Tag</span>
              <input className={fieldStyles.input} value={tag} maxLength={5} onChange={(e) => setTag(e.target.value)} />
              <small>Mudar a tag muda o endereço do clã (/clan/{tag.trim() || "TAG"}).</small>
            </label>
            <label>
              <span>Descrição</span>
              <textarea
                className={`${fieldStyles.input} ${styles.textarea}`}
                value={description}
                maxLength={500}
                rows={4}
                onChange={(e) => setDescription(e.target.value)}
              />
              <small>{description.trim().length}/500</small>
            </label>
            <fieldset className={styles.perms}>
              <legend>Como novos jogadores entram</legend>
              {(Object.keys(JOIN_POLICY_LABELS) as JoinPolicy[]).map((p) => (
                <label key={p} className={styles.perm}>
                  <input type="radio" name="policy" checked={joinPolicy === p} onChange={() => setJoinPolicy(p)} />
                  <span>
                    <strong>{JOIN_POLICY_LABELS[p].label}</strong>
                    <small>{JOIN_POLICY_LABELS[p].hint}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <div>
              <button type="submit" className={styles.primary}>
                Salvar alterações
              </button>
            </div>
          </form>
        </>
      )}

      {viewer.isOwner && (
        <div className={styles.dangerZone}>
          <h2 className={styles.subTitle}>Liderança</h2>
          <div className={styles.inlineRow}>
            <select className={styles.select} value={newOwner} onChange={(e) => setNewOwner(e.target.value)} aria-label="Novo dono">
              <option value="">Escolha um membro…</option>
              {clan.members
                .filter((m) => !m.isOwner)
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.nickname}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className={styles.danger}
              disabled={!newOwner}
              onClick={() =>
                window.confirm("Passar a liderança? Você continua no clã, mas deixa de ser o dono.") &&
                run(() => transferClan(token, clan.tag, newOwner), "Liderança transferida.")
              }
            >
              Passar liderança
            </button>
          </div>

          <h2 className={styles.subTitle}>Apagar clã</h2>
          <p className={styles.muted}>Apaga o clã, os cargos e os convites. Não dá para desfazer. Digite a tag para confirmar.</p>
          <div className={styles.inlineRow}>
            <input className={fieldStyles.input} placeholder={clan.tag} value={confirmTag} onChange={(e) => setConfirmTag(e.target.value)} aria-label="Confirme a tag do clã" />
            <button
              type="button"
              className={styles.danger}
              disabled={confirmTag.trim().toLowerCase() !== clan.tag.toLowerCase()}
              onClick={async () => {
                if (await run(() => deleteClan(token, clan.tag), "Clã apagado.")) onDeleted();
              }}
            >
              Apagar clã
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
